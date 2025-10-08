-- Add image_url column to maintenance_tickets table
ALTER TABLE public.maintenance_tickets 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for ticket images (public buckets require different approach)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'ticket-images', 
    'ticket-images', 
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN others THEN
    -- If column 'public' doesn't exist, try without it
    INSERT INTO storage.buckets (id, name)
    VALUES ('ticket-images', 'ticket-images')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Allow authenticated users to upload their own ticket images
CREATE POLICY "Users can upload ticket images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view ticket images
CREATE POLICY "Users can view ticket images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-images');

-- Allow users to delete their own ticket images
CREATE POLICY "Users can delete their own ticket images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);