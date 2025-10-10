-- Fix Patient Medical Records Security: Clean up and consolidate RLS policies on appointments table

-- First, drop all existing policies on appointments table
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Healthcare staff can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Healthcare staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Healthcare staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Only healthcare staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_admin_only" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_staff_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_staff_only" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_staff_admin" ON public.appointments;

-- Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner (prevents superuser bypass)
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;

-- Create clean, comprehensive policies using the is_healthcare_staff function

-- SELECT: Only authenticated healthcare staff can view appointments
CREATE POLICY "appointments_select_healthcare_staff_only" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));

-- INSERT: Only authenticated healthcare staff can create appointments
CREATE POLICY "appointments_insert_healthcare_staff_only" 
ON public.appointments 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_healthcare_staff(auth.uid()));

-- UPDATE: Only authenticated healthcare staff can update appointments
CREATE POLICY "appointments_update_healthcare_staff_only" 
ON public.appointments 
FOR UPDATE 
TO authenticated
USING (public.is_healthcare_staff(auth.uid()))
WITH CHECK (public.is_healthcare_staff(auth.uid()));

-- DELETE: Only authenticated admin users can delete appointments
CREATE POLICY "appointments_delete_admin_only" 
ON public.appointments 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));