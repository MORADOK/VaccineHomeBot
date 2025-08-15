-- Add admin and healthcare_staff roles to the user
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES 
  ('9e395222-a463-4c6f-9cbf-a7d45c976637', 'admin', '9e395222-a463-4c6f-9cbf-a7d45c976637'),
  ('9e395222-a463-4c6f-9cbf-a7d45c976637', 'healthcare_staff', '9e395222-a463-4c6f-9cbf-a7d45c976637')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create trigger to auto-assign admin role for ottodokmember@gmail.com on signup
CREATE OR REPLACE TRIGGER auto_assign_admin_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();