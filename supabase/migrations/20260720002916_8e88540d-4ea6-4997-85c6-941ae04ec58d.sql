-- One membership per (user, building)
DELETE FROM public.memberships a USING public.memberships b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.building_id = b.building_id;

CREATE UNIQUE INDEX IF NOT EXISTS memberships_user_building_unique
  ON public.memberships (user_id, building_id)
  WHERE building_id IS NOT NULL;

-- One pending invite per (email, building)
CREATE UNIQUE INDEX IF NOT EXISTS invites_email_building_pending_unique
  ON public.invites (lower(email), building_id)
  WHERE accepted_at IS NULL;