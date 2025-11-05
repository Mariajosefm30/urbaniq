-- Fix function search path security issue
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.amenity_bookings
    WHERE amenity_id = NEW.amenity_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'confirmed'
      AND (
        (NEW.starts_at >= starts_at AND NEW.starts_at < ends_at) OR
        (NEW.ends_at > starts_at AND NEW.ends_at <= ends_at) OR
        (NEW.starts_at <= starts_at AND NEW.ends_at >= ends_at)
      )
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked';
  END IF;
  RETURN NEW;
END;
$$;