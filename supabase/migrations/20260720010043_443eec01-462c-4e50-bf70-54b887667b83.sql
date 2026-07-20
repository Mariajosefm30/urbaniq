
-- 1) Add "security" to role enum
ALTER TYPE public.app_role_v2 ADD VALUE IF NOT EXISTS 'security';

-- 2) Ticket closed_at column + trigger to track resolution time
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_ticket_closed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('closed','resolved') AND (OLD.status IS NULL OR OLD.status NOT IN ('closed','resolved')) THEN
    NEW.closed_at = now();
  ELSIF NEW.status NOT IN ('closed','resolved') THEN
    NEW.closed_at = NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ticket_closed_at ON public.tickets;
CREATE TRIGGER trg_ticket_closed_at
BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_closed_at();

-- 3) Post comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_comments_select" ON public.post_comments FOR SELECT TO authenticated
  USING (public.has_any_building_access(auth.uid(), building_id));
CREATE POLICY "post_comments_insert" ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.has_any_building_access(auth.uid(), building_id));
CREATE POLICY "post_comments_delete" ON public.post_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_board_or_admin(auth.uid(), building_id));

-- 4) Ticket comments
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_comments TO authenticated;
GRANT ALL ON public.ticket_comments TO service_role;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket_comments_select" ON public.ticket_comments FOR SELECT TO authenticated
  USING (
    public.is_board_or_admin(auth.uid(), building_id)
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.unit_id = public.current_user_unit(building_id)
    )
  );
CREATE POLICY "ticket_comments_insert" ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND (
      public.is_board_or_admin(auth.uid(), building_id)
      OR EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_id AND t.unit_id = public.current_user_unit(building_id)
      )
    )
  );
CREATE POLICY "ticket_comments_delete" ON public.ticket_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_board_or_admin(auth.uid(), building_id));

-- 5) Notify host (owner/tenant) when a visit is marked as arrived
CREATE OR REPLACE FUNCTION public.notify_host_on_visit_arrival()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'arrived' AND (OLD.status IS DISTINCT FROM 'arrived') THEN
    INSERT INTO public.notifications (user_id, building_id, kind, payload)
    VALUES (
      NEW.host_id, NEW.building_id, 'visit_arrived',
      jsonb_build_object('visit_id', NEW.id, 'guest_name', NEW.guest_name, 'arrived_at', now())
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_visit_arrival ON public.visits;
CREATE TRIGGER trg_notify_visit_arrival
AFTER UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.notify_host_on_visit_arrival();

-- 6) Security role: allow view + status update of visits in their building
-- Using role::text to avoid referencing new enum value in same migration
CREATE POLICY "visits_security_select" ON public.visits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.building_id = visits.building_id AND m.role::text = 'security'
    )
  );
CREATE POLICY "visits_security_update" ON public.visits FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.building_id = visits.building_id AND m.role::text = 'security'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.building_id = visits.building_id AND m.role::text = 'security'
    )
  );
