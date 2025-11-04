-- Create amenities table
CREATE TABLE public.amenities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  capacity INTEGER,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create amenity bookings table
CREATE TABLE public.amenity_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amenity_id UUID REFERENCES public.amenities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create news feed table
CREATE TABLE public.feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Amenities policies
CREATE POLICY "Users can view amenities in their building"
ON public.amenities FOR SELECT
USING (
  building_id IN (
    SELECT building_id FROM public.units WHERE resident_user_id = auth.uid()
    UNION
    SELECT b.id FROM public.buildings b
    INNER JOIN public.profiles p ON p.org_id = b.org_id
    WHERE p.id = auth.uid() AND p.role = 'manager'
  )
);

CREATE POLICY "Managers can manage amenities"
ON public.amenities FOR ALL
USING (
  building_id IN (
    SELECT b.id FROM public.buildings b
    INNER JOIN public.profiles p ON p.org_id = b.org_id
    WHERE p.id = auth.uid() AND p.role = 'manager'
  )
);

-- Amenity bookings policies
CREATE POLICY "Users can view their own bookings"
ON public.amenity_bookings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings"
ON public.amenity_bookings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bookings"
ON public.amenity_bookings FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Managers can view all bookings for their buildings"
ON public.amenity_bookings FOR SELECT
USING (
  amenity_id IN (
    SELECT a.id FROM public.amenities a
    INNER JOIN public.buildings b ON a.building_id = b.id
    INNER JOIN public.profiles p ON p.org_id = b.org_id
    WHERE p.id = auth.uid() AND p.role = 'manager'
  )
);

-- Feed posts policies
CREATE POLICY "Users can view posts in their building"
ON public.feed_posts FOR SELECT
USING (
  building_id IN (
    SELECT building_id FROM public.units WHERE resident_user_id = auth.uid()
    UNION
    SELECT b.id FROM public.buildings b
    INNER JOIN public.profiles p ON p.org_id = b.org_id
    WHERE p.id = auth.uid() AND p.role = 'manager'
  )
);

CREATE POLICY "Authenticated users can create posts"
ON public.feed_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts"
ON public.feed_posts FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts"
ON public.feed_posts FOR DELETE
USING (auth.uid() = author_id);

-- Triggers for updated_at
CREATE TRIGGER update_amenities_updated_at
BEFORE UPDATE ON public.amenities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_amenity_bookings_updated_at
BEFORE UPDATE ON public.amenity_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feed_posts_updated_at
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();