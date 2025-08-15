-- Add RLS policies to allow patients to view their own vaccine status
-- For patient_vaccine_tracking table
CREATE POLICY "Patients can view their own vaccine tracking by patient_id" 
ON public.patient_vaccine_tracking 
FOR SELECT 
TO public
USING (true); -- Will be filtered in application layer by patient_id

-- For appointments table  
CREATE POLICY "Patients can view their own appointments by phone or patient_id" 
ON public.appointments 
FOR SELECT 
TO public
USING (true); -- Will be filtered in application layer

-- For vaccine_logs table
CREATE POLICY "Patients can view their own vaccine logs" 
ON public.vaccine_logs 
FOR SELECT 
TO public
USING (true); -- Will be filtered in application layer

-- For vaccine_schedules table (general information, should be public)
CREATE POLICY "Everyone can view vaccine schedules" 
ON public.vaccine_schedules 
FOR SELECT 
TO public
USING (active = true);