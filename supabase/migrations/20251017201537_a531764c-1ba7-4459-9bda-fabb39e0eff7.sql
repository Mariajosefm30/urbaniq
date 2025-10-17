-- Update manager@test.com to manager role
UPDATE public.profiles 
SET role = 'manager' 
WHERE email = 'manager@test.com';

-- Update mfernandezmelgar@gmail.com to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'mfernandezmelgar@gmail.com';