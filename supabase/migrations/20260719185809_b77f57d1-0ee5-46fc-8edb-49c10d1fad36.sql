GRANT SELECT ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;

GRANT SELECT ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;

GRANT SELECT ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;