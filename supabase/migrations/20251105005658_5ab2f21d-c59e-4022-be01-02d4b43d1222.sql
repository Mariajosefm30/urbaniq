-- Create amenity waitlist table
CREATE TABLE IF NOT EXISTS public.amenity_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time_start TIME NOT NULL,
  requested_time_end TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_waitlist_amenity_date ON public.amenity_waitlist(amenity_id, requested_date, status);
CREATE INDEX idx_waitlist_user ON public.amenity_waitlist(user_id, status);

-- Enable RLS
ALTER TABLE public.amenity_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own waitlist entries"
  ON public.amenity_waitlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create waitlist entries"
  ON public.amenity_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    building_id IN (SELECT building_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own waitlist entries"
  ON public.amenity_waitlist FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers can view building waitlists"
  ON public.amenity_waitlist FOR SELECT
  TO authenticated
  USING (
    building_id IN (
      SELECT building_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Function to check and notify waitlist
CREATE OR REPLACE FUNCTION notify_waitlist_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  waitlist_entry RECORD;
BEGIN
  -- Only process if booking was cancelled
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    -- Find matching waitlist entries for this amenity and time slot
    SELECT * INTO waitlist_entry
    FROM public.amenity_waitlist
    WHERE amenity_id = NEW.amenity_id
      AND requested_date = DATE(NEW.starts_at)
      AND status = 'waiting'
      AND (
        (requested_time_start::time >= NEW.starts_at::time AND requested_time_start::time < NEW.ends_at::time) OR
        (requested_time_end::time > NEW.starts_at::time AND requested_time_end::time <= NEW.ends_at::time) OR
        (requested_time_start::time <= NEW.starts_at::time AND requested_time_end::time >= NEW.ends_at::time)
      )
    ORDER BY created_at ASC
    LIMIT 1;

    -- If found, mark as notified and trigger notification
    IF waitlist_entry.id IS NOT NULL THEN
      UPDATE public.amenity_waitlist
      SET status = 'notified',
          notified_at = NOW(),
          updated_at = NOW()
      WHERE id = waitlist_entry.id;
      
      -- Insert into a notifications queue table (we'll process this via edge function)
      INSERT INTO public.waitlist_notifications (
        waitlist_id,
        user_id,
        amenity_id,
        booking_id,
        created_at
      ) VALUES (
        waitlist_entry.id,
        waitlist_entry.user_id,
        waitlist_entry.amenity_id,
        NEW.id,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create notifications queue table
CREATE TABLE IF NOT EXISTS public.waitlist_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID NOT NULL REFERENCES public.amenity_waitlist(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.amenity_bookings(id) ON DELETE CASCADE,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.waitlist_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can manage notifications"
  ON public.waitlist_notifications FOR ALL
  TO authenticated
  USING (false);

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_waitlist ON public.amenity_bookings;
CREATE TRIGGER trigger_notify_waitlist
  AFTER UPDATE ON public.amenity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_waitlist_on_cancellation();

-- Function to clean up expired waitlist entries
CREATE OR REPLACE FUNCTION cleanup_expired_waitlist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.amenity_waitlist
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'waiting'
    AND requested_date < CURRENT_DATE;
END;
$$;