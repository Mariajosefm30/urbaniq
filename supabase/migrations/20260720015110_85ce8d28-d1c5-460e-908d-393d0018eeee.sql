
-- 1. Schema additions
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS areas text[] NOT NULL DEFAULT '{}';

-- Valid areas constraint
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_areas_valid;
ALTER TABLE public.memberships ADD CONSTRAINT memberships_areas_valid
  CHECK (areas <@ ARRAY['maintenance','guests','payments','feed']::text[]);

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_areas_valid;
ALTER TABLE public.invites ADD CONSTRAINT invites_areas_valid
  CHECK (areas <@ ARRAY['maintenance','guests','payments','feed']::text[]);

-- 2. Helper functions
-- Redefine: is_board_or_admin = admin_board or platform_admin ONLY (managers no longer full-access)
CREATE OR REPLACE FUNCTION public.is_board_or_admin(_uid uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _uid
      AND building_id = _building_id
      AND role = 'admin_board'
      AND revoked_at IS NULL
  ) OR public.is_platform_admin(_uid);
$$;

-- has_building_role: honor revoked_at
CREATE OR REPLACE FUNCTION public.has_building_role(_uid uuid, _building_id uuid, _role app_role_v2)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _uid AND building_id = _building_id AND role = _role AND revoked_at IS NULL
  ) OR public.is_platform_admin(_uid);
$$;

-- has_any_building_access: honor revoked_at
CREATE OR REPLACE FUNCTION public.has_any_building_access(_uid uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _uid AND building_id = _building_id AND revoked_at IS NULL
  ) OR public.is_platform_admin(_uid);
$$;

-- New: can_manage_area
CREATE OR REPLACE FUNCTION public.can_manage_area(_uid uuid, _building_id uuid, _area text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_board_or_admin(_uid, _building_id)
    OR EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = _uid
        AND building_id = _building_id
        AND role = 'manager'
        AND revoked_at IS NULL
        AND _area = ANY(areas)
    );
$$;

-- 3. Seat cap enforcement for admin_board
CREATE OR REPLACE FUNCTION public.enforce_admin_board_seat_cap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b_tier text;
  cap int;
  current_count int;
BEGIN
  IF NEW.role <> 'admin_board' OR NEW.building_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.role = 'admin_board' AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    RETURN NEW; -- revoking, no need to check
  END IF;
  IF NEW.revoked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT tier::text INTO b_tier FROM public.buildings WHERE id = NEW.building_id;
  cap := CASE b_tier
    WHEN 'starter' THEN 1
    WHEN 'growth' THEN 3
    WHEN 'pro' THEN 10
    WHEN 'developer' THEN 999
    ELSE 1
  END;

  SELECT count(*) INTO current_count
  FROM public.memberships
  WHERE building_id = NEW.building_id
    AND role = 'admin_board'
    AND revoked_at IS NULL
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id);

  IF current_count >= cap THEN
    RAISE EXCEPTION 'Admin board seat cap reached for this building (max %). Upgrade tier or revoke an existing admin.', cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS memberships_seat_cap ON public.memberships;
CREATE TRIGGER memberships_seat_cap
  BEFORE INSERT OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_board_seat_cap();

-- Also block invites that would exceed the cap (count active admin_board memberships + non-accepted admin_board invites)
CREATE OR REPLACE FUNCTION public.enforce_admin_board_invite_cap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b_tier text;
  cap int;
  current_count int;
BEGIN
  IF NEW.role <> 'admin_board' OR NEW.building_id IS NULL OR NEW.accepted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT tier::text INTO b_tier FROM public.buildings WHERE id = NEW.building_id;
  cap := CASE b_tier
    WHEN 'starter' THEN 1
    WHEN 'growth' THEN 3
    WHEN 'pro' THEN 10
    WHEN 'developer' THEN 999
    ELSE 1
  END;
  SELECT
    (SELECT count(*) FROM public.memberships
      WHERE building_id = NEW.building_id AND role = 'admin_board' AND revoked_at IS NULL)
    + (SELECT count(*) FROM public.invites
      WHERE building_id = NEW.building_id AND role = 'admin_board' AND accepted_at IS NULL
        AND expires_at > now() AND (TG_OP <> 'UPDATE' OR id <> NEW.id))
  INTO current_count;

  IF current_count >= cap THEN
    RAISE EXCEPTION 'Admin board seat cap reached for this building (max %). Cannot create another admin invite.', cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invites_admin_seat_cap ON public.invites;
CREATE TRIGGER invites_admin_seat_cap
  BEFORE INSERT OR UPDATE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_board_invite_cap();

-- 4. Extend handle_new_user_v2 to carry areas
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE inv RECORD;
BEGIN
  FOR inv IN
    SELECT * FROM public.invites
    WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL AND expires_at > now()
    ORDER BY created_at ASC
  LOOP
    INSERT INTO public.memberships (user_id, building_id, role, unit_id, resident_name, phone, resident_type, areas)
    VALUES (NEW.id, inv.building_id, inv.role, inv.unit_id, inv.resident_name, inv.phone, inv.resident_type, COALESCE(inv.areas, '{}'::text[]))
    ON CONFLICT DO NOTHING;
    UPDATE public.invites SET accepted_at = now() WHERE id = inv.id;
  END LOOP;
  RETURN NEW;
END;
$$;

-- 5. RLS: replace board-only ALL policies with admin_board full + manager area-scoped
-- TICKETS
DROP POLICY IF EXISTS tickets_board_all ON public.tickets;
CREATE POLICY tickets_admin_all ON public.tickets FOR ALL
  USING (public.is_board_or_admin(auth.uid(), building_id))
  WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY tickets_manager_maintenance_all ON public.tickets FOR ALL
  USING (public.can_manage_area(auth.uid(), building_id, 'maintenance'))
  WITH CHECK (public.can_manage_area(auth.uid(), building_id, 'maintenance'));

-- TICKET COMMENTS
DROP POLICY IF EXISTS ticket_comments_select ON public.ticket_comments;
DROP POLICY IF EXISTS ticket_comments_insert ON public.ticket_comments;
DROP POLICY IF EXISTS ticket_comments_delete ON public.ticket_comments;
CREATE POLICY ticket_comments_select ON public.ticket_comments FOR SELECT
  USING (
    public.can_manage_area(auth.uid(), building_id, 'maintenance')
    OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_comments.ticket_id AND t.unit_id = public.current_user_unit(t.building_id))
  );
CREATE POLICY ticket_comments_insert ON public.ticket_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND (
      public.can_manage_area(auth.uid(), building_id, 'maintenance')
      OR EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_comments.ticket_id AND t.unit_id = public.current_user_unit(t.building_id))
    )
  );
CREATE POLICY ticket_comments_delete ON public.ticket_comments FOR DELETE
  USING (auth.uid() = author_id OR public.can_manage_area(auth.uid(), building_id, 'maintenance'));

-- CHARGES: admin only (already admin) + manager payments area
DROP POLICY IF EXISTS charges_board_all ON public.charges;
CREATE POLICY charges_admin_all ON public.charges FOR ALL
  USING (public.is_board_or_admin(auth.uid(), building_id))
  WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY charges_manager_payments_all ON public.charges FOR ALL
  USING (public.can_manage_area(auth.uid(), building_id, 'payments'))
  WITH CHECK (public.can_manage_area(auth.uid(), building_id, 'payments'));

-- VISITS
DROP POLICY IF EXISTS visits_board_all ON public.visits;
CREATE POLICY visits_admin_all ON public.visits FOR ALL
  USING (public.is_board_or_admin(auth.uid(), building_id))
  WITH CHECK (public.is_board_or_admin(auth.uid(), building_id));
CREATE POLICY visits_manager_guests_all ON public.visits FOR ALL
  USING (public.can_manage_area(auth.uid(), building_id, 'guests'))
  WITH CHECK (public.can_manage_area(auth.uid(), building_id, 'guests'));

-- POSTS
DROP POLICY IF EXISTS posts_board_update ON public.posts;
DROP POLICY IF EXISTS posts_author_or_board_delete ON public.posts;
CREATE POLICY posts_admin_or_feed_update ON public.posts FOR UPDATE
  USING (public.is_board_or_admin(auth.uid(), building_id) OR public.can_manage_area(auth.uid(), building_id, 'feed'))
  WITH CHECK (public.is_board_or_admin(auth.uid(), building_id) OR public.can_manage_area(auth.uid(), building_id, 'feed'));
CREATE POLICY posts_author_or_admin_delete ON public.posts FOR DELETE
  USING (author_id = auth.uid() OR public.is_board_or_admin(auth.uid(), building_id) OR public.can_manage_area(auth.uid(), building_id, 'feed'));

-- POST COMMENTS delete: allow feed manager
DROP POLICY IF EXISTS post_comments_delete ON public.post_comments;
CREATE POLICY post_comments_delete ON public.post_comments FOR DELETE
  USING (auth.uid() = author_id OR public.is_board_or_admin(auth.uid(), building_id) OR public.can_manage_area(auth.uid(), building_id, 'feed'));

-- 6. building_has_feature: expose 'manager_role' on growth+
CREATE OR REPLACE FUNCTION public.building_has_feature(_building_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE (SELECT tier FROM public.buildings WHERE id = _building_id)
    WHEN 'starter' THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic'])
    WHEN 'growth'  THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic','tickets_states','payments_reminders','analytics_realtime','manager_role'])
    WHEN 'pro'     THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic','tickets_states','payments_reminders','analytics_realtime','amenities','roles_by_area','payments_reconciliation','analytics_advanced','manager_role'])
    WHEN 'developer' THEN true
    ELSE false END;
$$;
