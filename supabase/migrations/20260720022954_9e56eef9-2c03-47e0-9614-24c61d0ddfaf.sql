ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'waiting';

CREATE OR REPLACE FUNCTION public.log_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_status_history (ticket_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status::text, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.ticket_status_history (ticket_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ticket_status_change ON public.tickets;
CREATE TRIGGER trg_log_ticket_status_change
AFTER INSERT OR UPDATE OF status ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_status_change();