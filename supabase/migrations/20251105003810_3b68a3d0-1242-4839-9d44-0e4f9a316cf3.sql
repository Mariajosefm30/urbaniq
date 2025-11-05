-- Update amenities table schema
ALTER TABLE public.amenities DROP COLUMN IF EXISTS location;
ALTER TABLE public.amenities DROP COLUMN IF EXISTS available;
ALTER TABLE public.amenities ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE public.amenities ADD COLUMN IF NOT EXISTS open_time TIME;
ALTER TABLE public.amenities ADD COLUMN IF NOT EXISTS close_time TIME;
ALTER TABLE public.amenities ADD COLUMN IF NOT EXISTS slot_minutes INTEGER DEFAULT 60;
ALTER TABLE public.amenities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Update amenity_bookings table schema
ALTER TABLE public.amenity_bookings DROP COLUMN IF EXISTS booking_date;
ALTER TABLE public.amenity_bookings DROP COLUMN IF EXISTS start_time;
ALTER TABLE public.amenity_bookings DROP COLUMN IF EXISTS end_time;
ALTER TABLE public.amenity_bookings DROP COLUMN IF EXISTS notes;
ALTER TABLE public.amenity_bookings ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.amenity_bookings ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.amenity_bookings ADD COLUMN IF NOT EXISTS building_id UUID REFERENCES public.buildings(id);

-- Create index for overlap checking
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_overlap 
ON public.amenity_bookings(amenity_id, starts_at, ends_at);

-- Function to check booking overlaps
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.amenity_bookings
    WHERE amenity_id = NEW.amenity_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'confirmed'
      AND (
        (NEW.starts_at >= starts_at AND NEW.starts_at < ends_at) OR
        (NEW.ends_at > starts_at AND NEW.ends_at <= ends_at) OR
        (NEW.starts_at <= starts_at AND NEW.ends_at >= ends_at)
      )
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for overlap prevention
DROP TRIGGER IF EXISTS prevent_booking_overlap ON public.amenity_bookings;
CREATE TRIGGER prevent_booking_overlap
  BEFORE INSERT OR UPDATE ON public.amenity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_overlap();

-- RLS Policies for amenities
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view amenities in their building" ON public.amenities;
CREATE POLICY "Users can view amenities in their building"
  ON public.amenities FOR SELECT
  TO authenticated
  USING (
    building_id IN (
      SELECT building_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can create amenities" ON public.amenities;
CREATE POLICY "Managers can create amenities"
  ON public.amenities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
      AND building_id = amenities.building_id
    )
  );

DROP POLICY IF EXISTS "Managers can update amenities" ON public.amenities;
CREATE POLICY "Managers can update amenities"
  ON public.amenities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
      AND building_id = amenities.building_id
    )
  );

-- RLS Policies for amenity_bookings
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bookings in their building" ON public.amenity_bookings;
CREATE POLICY "Users can view bookings in their building"
  ON public.amenity_bookings FOR SELECT
  TO authenticated
  USING (
    building_id IN (
      SELECT building_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.amenity_bookings;
CREATE POLICY "Users can create their own bookings"
  ON public.amenity_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    building_id IN (
      SELECT building_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.amenity_bookings;
CREATE POLICY "Users can update their own bookings"
  ON public.amenity_bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Managers can manage all bookings" ON public.amenity_bookings;
CREATE POLICY "Managers can manage all bookings"
  ON public.amenity_bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
      AND building_id = amenity_bookings.building_id
    )
  );