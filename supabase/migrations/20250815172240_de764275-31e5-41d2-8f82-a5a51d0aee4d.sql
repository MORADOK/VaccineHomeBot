-- Create user roles system for healthcare staff access control

-- 1. Create an enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'healthcare_staff', 'patient');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to check if user is healthcare staff (admin or healthcare_staff)
CREATE OR REPLACE FUNCTION public.is_healthcare_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'healthcare_staff')
  )
$$;

-- 5. Drop existing overly permissive policies on appointments table
DROP POLICY IF EXISTS "Anyone can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.appointments;  
DROP POLICY IF EXISTS "Anyone can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can delete appointments" ON public.appointments;

-- 6. Create secure RLS policies for appointments table
-- Only healthcare staff can view appointments
CREATE POLICY "Healthcare staff can view appointments" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));

-- Only healthcare staff can insert appointments
CREATE POLICY "Healthcare staff can insert appointments" 
ON public.appointments 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_healthcare_staff(auth.uid()));

-- Only healthcare staff can update appointments
CREATE POLICY "Healthcare staff can update appointments" 
ON public.appointments 
FOR UPDATE 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));

-- Only admins can delete appointments
CREATE POLICY "Admins can delete appointments" 
ON public.appointments 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Create RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Update appointment_notifications table policies to be more secure
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.appointment_notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.appointment_notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.appointment_notifications;

-- Only healthcare staff can manage notifications
CREATE POLICY "Healthcare staff can view notifications" 
ON public.appointment_notifications 
FOR SELECT 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can insert notifications" 
ON public.appointment_notifications 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can update notifications" 
ON public.appointment_notifications 
FOR UPDATE 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));

-- 9. Update vaccine_logs table policies to be more secure
DROP POLICY IF EXISTS "Anyone can view vaccine logs" ON public.vaccine_logs;
DROP POLICY IF EXISTS "Anyone can insert vaccine logs" ON public.vaccine_logs;
DROP POLICY IF EXISTS "Anyone can update vaccine logs" ON public.vaccine_logs;

-- Only healthcare staff can manage vaccine logs
CREATE POLICY "Healthcare staff can view vaccine logs" 
ON public.vaccine_logs 
FOR SELECT 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can insert vaccine logs" 
ON public.vaccine_logs 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can update vaccine logs" 
ON public.vaccine_logs 
FOR UPDATE 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));

-- 10. Create a function to initialize admin user (for development/setup)
CREATE OR REPLACE FUNCTION public.make_user_admin(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_user_id, 'admin', _user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;