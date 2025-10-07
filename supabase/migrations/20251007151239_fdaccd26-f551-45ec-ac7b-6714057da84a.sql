
-- Fix infinite recursion in user_roles policies
DROP POLICY IF EXISTS "Managers can manage roles" ON public.user_roles;

-- Create corrected policy using has_role function
CREATE POLICY "Managers can manage roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'manager')) 
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Remove duplicate policy
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create function to auto-assign resident role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, name, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  
  -- Assign default resident role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'resident');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
