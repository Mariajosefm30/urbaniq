CREATE OR REPLACE FUNCTION public.shares_building_with(_other_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships me
    JOIN public.memberships them ON them.building_id = me.building_id
    WHERE me.user_id = auth.uid()
      AND them.user_id = _other_user
      AND me.revoked_at IS NULL
      AND them.revoked_at IS NULL
  );
$$;

DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;

CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_shared_building_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.shares_building_with(profiles.id));

CREATE POLICY "profiles_platform_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));