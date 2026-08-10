DROP POLICY IF EXISTS "Managers can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Managers can view payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Residents can view their payment receipts" ON storage.objects;

DROP POLICY IF EXISTS "payment_receipts_read" ON storage.objects;
CREATE POLICY "payment_receipts_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.can_manage_area(auth.uid(), ((storage.foldername(name))[1])::uuid, 'payments')
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.unit_id = ((storage.foldername(name))[2])::uuid
          AND m.resident_type = 'owner'
          AND m.revoked_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "payment_receipts_owner_insert" ON storage.objects;
CREATE POLICY "payment_receipts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (
      public.can_manage_area(auth.uid(), ((storage.foldername(name))[1])::uuid, 'payments')
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.unit_id = ((storage.foldername(name))[2])::uuid
          AND m.resident_type = 'owner'
          AND m.revoked_at IS NULL
      )
    )
  );