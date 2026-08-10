DROP POLICY IF EXISTS charges_owner_select ON public.charges;
CREATE POLICY charges_owner_select ON public.charges
  FOR SELECT TO authenticated
  USING (
    unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.unit_id = charges.unit_id
        AND m.resident_type = 'owner'
        AND m.revoked_at IS NULL
    )
  );

DROP POLICY IF EXISTS charges_owner_upload_proof ON public.charges;
CREATE POLICY charges_owner_upload_proof ON public.charges
  FOR UPDATE TO authenticated
  USING (
    unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.unit_id = charges.unit_id
        AND m.resident_type = 'owner'
        AND m.revoked_at IS NULL
    )
  )
  WITH CHECK (
    unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.unit_id = charges.unit_id
        AND m.resident_type = 'owner'
        AND m.revoked_at IS NULL
    )
  );