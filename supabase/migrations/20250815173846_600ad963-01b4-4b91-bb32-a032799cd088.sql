-- Add admin role for the specific email
-- This will run after the user registers with this email
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user's email is the admin email
  IF NEW.email = 'ottodokmember@gmail.com' THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (NEW.id, 'admin', NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also insert healthcare_staff role since admin should have both
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (NEW.id, 'healthcare_staff', NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-assign admin role
DROP TRIGGER IF EXISTS auto_assign_admin_role_trigger ON auth.users;
CREATE TRIGGER auto_assign_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();