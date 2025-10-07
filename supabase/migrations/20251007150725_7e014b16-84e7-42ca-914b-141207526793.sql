
-- Fix profile names for test accounts
UPDATE profiles SET name = 'Manager Test', full_name = 'Manager Test' WHERE email = 'manager@test.com';
UPDATE profiles SET name = 'Resident Test', full_name = 'Resident Test' WHERE email = 'resident@test.com';
