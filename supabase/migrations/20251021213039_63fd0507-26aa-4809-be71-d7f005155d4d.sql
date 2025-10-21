-- Add receipt_url column to payments table
ALTER TABLE public.payments 
ADD COLUMN receipt_url TEXT;

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name) 
VALUES ('payment-receipts', 'payment-receipts');

-- Allow managers to upload receipts
CREATE POLICY "Managers can upload payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'manager'
  )
);

-- Allow managers to view payment receipts
CREATE POLICY "Managers can view payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'manager'
  )
);

-- Allow residents to view their payment receipts
CREATE POLICY "Residents can view their payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'resident'
  )
);