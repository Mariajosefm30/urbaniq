-- Step 1: Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Drop all policies that depend on profiles.role
DROP POLICY IF EXISTS "Residents can view their own tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Managers can update all tickets" ON public.maintenance_tickets;
DROP POLICY IF EXISTS "Residents can view their own guests" ON public.guests;
DROP POLICY IF EXISTS "Managers can update all guests" ON public.guests;
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
DROP POLICY IF EXISTS "Managers can insert messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Managers can insert unit messages" ON public.unit_messages;

-- Step 3: Drop the insecure role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- Step 4: Recreate policies using the secure has_role function
-- Tickets policies (using reporter_id not resident_id)
CREATE POLICY "Reporters can view their own tickets" ON public.maintenance_tickets
FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update all tickets" ON public.maintenance_tickets
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Guests policies
CREATE POLICY "Hosts can view their own guests" ON public.guests
FOR SELECT TO authenticated
USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update all guests" ON public.guests
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Ticket messages policies
CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_tickets t
    WHERE t.id = ticket_id
    AND (t.reporter_id = auth.uid() OR public.has_role(auth.uid(), 'manager'))
  )
);

CREATE POLICY "Managers can insert messages" ON public.ticket_messages
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Unit messages policies  
CREATE POLICY "Managers can insert unit messages" ON public.unit_messages
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Step 5: Update the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, name, unit)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'unit'
  );
  
  -- Insert role into user_roles (default to 'resident')
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'resident')
  );
  
  RETURN NEW;
END;
$$;