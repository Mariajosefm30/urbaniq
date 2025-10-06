-- 1) Backfill profiles for all existing users (defaults to resident)
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'resident'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2) Set the manager role for manager@test.com (if exists)
UPDATE public.profiles
SET role = 'manager'
WHERE email = 'manager@test.com';