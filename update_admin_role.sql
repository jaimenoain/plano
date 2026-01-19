
-- Update tester user to have admin role
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tester@cineforum.eu'
);
