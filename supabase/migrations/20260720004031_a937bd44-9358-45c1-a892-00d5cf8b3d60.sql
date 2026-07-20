
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS yape_phone text,
  ADD COLUMN IF NOT EXISTS plin_phone text,
  ADD COLUMN IF NOT EXISTS qr_image_url text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_holder text;

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS vehicle_plate text,
  ADD COLUMN IF NOT EXISTS needs_parking boolean NOT NULL DEFAULT false;

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'en_revision';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'rechazado';

ALTER TABLE public.charges
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PEN',
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS operation_code text,
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

DROP POLICY IF EXISTS charges_owner_upload_proof ON public.charges;
CREATE POLICY charges_owner_upload_proof ON public.charges
  FOR UPDATE TO authenticated
  USING (
    unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.unit_id = charges.unit_id
        AND m.resident_type = 'owner'
    )
  )
  WITH CHECK (
    unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.unit_id = charges.unit_id
        AND m.resident_type = 'owner'
    )
  );

-- QR bucket policies (path prefix = building_id)
DROP POLICY IF EXISTS "building_qr_read" ON storage.objects;
CREATE POLICY "building_qr_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'building-qr'
    AND public.has_any_building_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "building_qr_board_write" ON storage.objects;
CREATE POLICY "building_qr_board_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'building-qr'
    AND public.is_board_or_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "building_qr_board_update" ON storage.objects;
CREATE POLICY "building_qr_board_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'building-qr'
    AND public.is_board_or_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "building_qr_board_delete" ON storage.objects;
CREATE POLICY "building_qr_board_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'building-qr'
    AND public.is_board_or_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- Payment receipts (path prefix = building_id)
DROP POLICY IF EXISTS "payment_receipts_owner_insert" ON storage.objects;
CREATE POLICY "payment_receipts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND public.has_any_building_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "payment_receipts_read" ON storage.objects;
CREATE POLICY "payment_receipts_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.has_any_building_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
