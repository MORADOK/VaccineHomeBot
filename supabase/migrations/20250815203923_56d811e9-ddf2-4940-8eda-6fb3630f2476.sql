-- Fix critical security vulnerability: Remove overly permissive public access to patient data
-- Drop the existing insecure policies that allow public access to all patient data

DROP POLICY IF EXISTS "Patients can view their own appointments by phone or patient_id" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view their own vaccine logs" ON public.vaccine_logs;  
DROP POLICY IF EXISTS "Patients can view their own vaccine tracking by patient_id" ON public.patient_vaccine_tracking;

-- Create secure policies that require authentication
-- Only authenticated healthcare staff can view patient data directly
-- Public access will be handled through a secure Edge Function

CREATE POLICY "Only healthcare staff can view appointments" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (is_healthcare_staff(auth.uid()));

CREATE POLICY "Only healthcare staff can view vaccine logs" 
ON public.vaccine_logs 
FOR SELECT 
TO authenticated
USING (is_healthcare_staff(auth.uid()));

CREATE POLICY "Only healthcare staff can view patient vaccine tracking" 
ON public.patient_vaccine_tracking 
FOR SELECT 
TO authenticated
USING (is_healthcare_staff(auth.uid()));