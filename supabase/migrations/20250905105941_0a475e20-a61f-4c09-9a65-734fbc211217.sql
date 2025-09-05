-- Update the existing auto_assign_admin_role function to give healthcare_staff role to all new users
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Give healthcare_staff role to ALL new users by default
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (NEW.id, 'healthcare_staff', NEW.id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Check if the user's email is the admin email for admin privileges
  IF NEW.email = 'ottodokmember@gmail.com' THEN
    -- Insert admin role for the admin user
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (NEW.id, 'admin', NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Also create a function to manually assign healthcare_staff role to existing users who don't have it
CREATE OR REPLACE FUNCTION public.assign_healthcare_staff_to_existing_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert healthcare_staff role for all users who don't already have any role
  INSERT INTO public.user_roles (user_id, role, created_by)
  SELECT 
    au.id,
    'healthcare_staff'::app_role,
    au.id
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON au.id = ur.user_id
  WHERE ur.user_id IS NULL
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

-- Run the function to assign roles to existing users
SELECT public.assign_healthcare_staff_to_existing_users();