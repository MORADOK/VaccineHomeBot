-- Add initial admin users for staff portal access
-- This migration adds demo admin users to the user_roles table

-- First, let's create a function to safely add admin users
CREATE OR REPLACE FUNCTION public.add_initial_admin_user(_email text, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    _user_id uuid;
BEGIN
    -- Find user by email in auth.users
    SELECT id INTO _user_id 
    FROM auth.users 
    WHERE email = _email;
    
    -- If user exists, add role
    IF _user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role, created_by)
        VALUES (_user_id, _role, _user_id)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Added role % for user %', _role, _email;
    ELSE
        RAISE NOTICE 'User % not found in auth.users', _email;
    END IF;
END;
$function$;

-- Add admin roles for common admin emails
-- These will only work if the users actually exist in auth.users
SELECT public.add_initial_admin_user('admin@vchomehospital.co.th', 'admin');
SELECT public.add_initial_admin_user('superadmin@vchomehospital.co.th', 'admin');

-- Create a function to automatically assign roles based on email domain
CREATE OR REPLACE FUNCTION public.auto_assign_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    -- Auto-assign roles based on email domain
    IF NEW.email LIKE '%@vchomehospital.co.th' THEN
        -- Hospital staff get healthcare_staff role
        INSERT INTO public.user_roles (user_id, role, created_by)
        VALUES (NEW.id, 'healthcare_staff', NEW.id)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- If it's admin email, also give admin role
        IF NEW.email IN ('admin@vchomehospital.co.th', 'superadmin@vchomehospital.co.th') THEN
            INSERT INTO public.user_roles (user_id, role, created_by)
            VALUES (NEW.id, 'admin', NEW.id)
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    ELSE
        -- Other users get patient role
        INSERT INTO public.user_roles (user_id, role, created_by)
        VALUES (NEW.id, 'patient', NEW.id)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger to auto-assign roles on user signup
DROP TRIGGER IF EXISTS auto_assign_role_trigger ON auth.users;
CREATE TRIGGER auto_assign_role_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_role_on_signup();

-- Create a function for admins to manually assign roles
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_email text, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    _user_id uuid;
    _admin_id uuid := auth.uid();
BEGIN
    -- Check if current user is admin
    IF NOT public.has_role(_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Access denied: Only administrators can assign roles';
    END IF;
    
    -- Find user by email
    SELECT id INTO _user_id 
    FROM auth.users 
    WHERE email = _user_email;
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', _user_email;
    END IF;
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, _role, _admin_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Assigned role % to user %', _role, _user_email;
END;
$function$;

-- Create a view to easily see all users and their roles
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT 
    u.id,
    u.email,
    u.created_at as user_created_at,
    u.last_sign_in_at,
    COALESCE(
        array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL),
        ARRAY[]::app_role[]
    ) as roles,
    CASE 
        WHEN 'admin' = ANY(array_agg(ur.role)) THEN true
        ELSE false
    END as is_admin,
    CASE 
        WHEN 'admin' = ANY(array_agg(ur.role)) OR 'healthcare_staff' = ANY(array_agg(ur.role)) THEN true
        ELSE false
    END as is_healthcare_staff
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at
ORDER BY u.created_at DESC;

-- Grant access to the view for healthcare staff
GRANT SELECT ON public.users_with_roles TO authenticated;

-- Create RPC function to get users with roles (since views might not be in types)
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
    id uuid,
    email text,
    user_created_at timestamptz,
    last_sign_in_at timestamptz,
    roles app_role[],
    is_admin boolean,
    is_healthcare_staff boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
    SELECT 
        u.id,
        u.email::text,
        u.created_at as user_created_at,
        u.last_sign_in_at,
        COALESCE(
            array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL),
            ARRAY[]::app_role[]
        ) as roles,
        CASE 
            WHEN 'admin' = ANY(array_agg(ur.role)) THEN true
            ELSE false
        END as is_admin,
        CASE 
            WHEN 'admin' = ANY(array_agg(ur.role)) OR 'healthcare_staff' = ANY(array_agg(ur.role)) THEN true
            ELSE false
        END as is_healthcare_staff
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE public.is_healthcare_staff(auth.uid()) -- Only healthcare staff can see this
    GROUP BY u.id, u.email, u.created_at, u.last_sign_in_at
    ORDER BY u.created_at DESC;
$function$;

COMMENT ON MIGRATION IS 'Add initial admin users and auto role assignment system';