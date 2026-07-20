
-- 1) CHARGE REMINDERS
CREATE TABLE public.charge_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  sent_by uuid NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.charge_reminders TO authenticated;
GRANT ALL ON public.charge_reminders TO service_role;
ALTER TABLE public.charge_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders read by payments admin/manager or unit owner"
ON public.charge_reminders FOR SELECT TO authenticated
USING (
  public.can_manage_area(auth.uid(), building_id, 'payments')
  OR EXISTS (
    SELECT 1 FROM public.charges c
    JOIN public.memberships m
      ON m.building_id = c.building_id AND m.unit_id = c.unit_id
    WHERE c.id = charge_reminders.charge_id
      AND m.user_id = auth.uid()
      AND m.resident_type = 'owner'
      AND m.revoked_at IS NULL
  )
);

CREATE POLICY "reminders insert by payments admin/manager"
ON public.charge_reminders FOR INSERT TO authenticated
WITH CHECK (
  sent_by = auth.uid()
  AND public.can_manage_area(auth.uid(), building_id, 'payments')
);

-- 2) TICKET STATUS HISTORY
CREATE TABLE public.ticket_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_status_history TO authenticated;
GRANT ALL ON public.ticket_status_history TO service_role;
ALTER TABLE public.ticket_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket history readable by ticket viewers"
ON public.ticket_status_history FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tickets t
  WHERE t.id = ticket_status_history.ticket_id
    AND (
      public.can_manage_area(auth.uid(), t.building_id, 'maintenance')
      OR t.created_by = auth.uid()
      OR (t.unit_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.building_id = t.building_id
          AND m.unit_id = t.unit_id
          AND m.revoked_at IS NULL
      ))
    )
));

CREATE OR REPLACE FUNCTION public.log_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_status_history(ticket_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ticket_status_history(ticket_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ticket_status_history ON public.tickets;
CREATE TRIGGER trg_ticket_status_history
AFTER INSERT OR UPDATE OF status ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_status_change();

-- 3) POLLS
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  multi boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls read by building members"
ON public.polls FOR SELECT TO authenticated
USING (public.has_any_building_access(auth.uid(), building_id));

CREATE POLICY "polls insert by feed admin/manager"
ON public.polls FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.can_manage_area(auth.uid(), building_id, 'feed')
);

CREATE POLICY "polls update by feed admin/manager"
ON public.polls FOR UPDATE TO authenticated
USING (public.can_manage_area(auth.uid(), building_id, 'feed'))
WITH CHECK (public.can_manage_area(auth.uid(), building_id, 'feed'));

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL,
  option_indexes int[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, unit_id)
);
GRANT SELECT, INSERT ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll votes readable by building members"
ON public.poll_votes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.polls p
  WHERE p.id = poll_votes.poll_id
    AND public.has_any_building_access(auth.uid(), p.building_id)
));

CREATE POLICY "poll votes: owners only, one per unit, poll open"
ON public.poll_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.polls p
    WHERE p.id = poll_votes.poll_id
      AND p.closed_at IS NULL
      AND (p.closes_at IS NULL OR p.closes_at > now())
      AND EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.building_id = p.building_id
          AND m.unit_id = poll_votes.unit_id
          AND m.resident_type = 'owner'
          AND m.revoked_at IS NULL
      )
  )
);

-- 4) Update tier feature map: add polls to Growth+
CREATE OR REPLACE FUNCTION public.building_has_feature(_building_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (SELECT tier FROM public.buildings WHERE id = _building_id)
    WHEN 'starter' THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic'])
    WHEN 'growth'  THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic','tickets_states','payments_reminders','analytics_realtime','manager_role','polls','visits_log'])
    WHEN 'pro'     THEN _feature = ANY (ARRAY['feed','tickets_basic','guests','payments_tracking','analytics_basic','tickets_states','payments_reminders','analytics_realtime','amenities','roles_by_area','payments_reconciliation','analytics_advanced','manager_role','polls','visits_log'])
    WHEN 'developer' THEN true
    ELSE false END;
$$;

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.charges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.charge_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_status_history;
