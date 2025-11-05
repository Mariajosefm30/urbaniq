-- Add foreign key relationship from amenity_bookings to profiles
ALTER TABLE public.amenity_bookings 
DROP CONSTRAINT IF EXISTS amenity_bookings_user_id_fkey;

ALTER TABLE public.amenity_bookings
ADD CONSTRAINT amenity_bookings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;