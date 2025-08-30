-- Security Fix: Remove insecure privilege escalation function
DROP FUNCTION IF EXISTS public.make_user_admin;

-- Security Fix: Tighten RLS policies on notification_jobs
-- Remove overly permissive policies
DROP POLICY IF EXISTS "jobs_service_select" ON public.notification_jobs;
DROP POLICY IF EXISTS "jobs_service_update" ON public.notification_jobs;

-- Add restrictive staff-only policies for notification_jobs
CREATE POLICY "Healthcare staff can select notification jobs" 
ON public.notification_jobs 
FOR SELECT 
USING (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can update notification jobs" 
ON public.notification_jobs 
FOR UPDATE 
USING (is_healthcare_staff(auth.uid()));

-- Security Fix: Add search_path to SECURITY DEFINER functions for safety
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_healthcare_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'healthcare_staff')
  )
$$;

-- Security Fix: Add admin guard to admin_make_user_admin function  
CREATE OR REPLACE FUNCTION public.admin_make_user_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can grant admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only administrators can grant admin role';
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_user_id, 'admin', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;