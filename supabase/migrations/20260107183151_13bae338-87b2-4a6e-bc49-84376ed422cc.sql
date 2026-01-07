-- Drop the old foreign key constraint
ALTER TABLE public.amenities DROP CONSTRAINT IF EXISTS amenities_building_id_fkey;

-- Add new foreign key constraint referencing buildings_new
ALTER TABLE public.amenities 
ADD CONSTRAINT amenities_building_id_fkey 
FOREIGN KEY (building_id) REFERENCES public.buildings_new(id) ON DELETE CASCADE;