-- Create vaccine schedules table for comprehensive tracking
CREATE TABLE public.vaccine_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaccine_name text NOT NULL,
  vaccine_type text NOT NULL,
  total_doses integer NOT NULL DEFAULT 1,
  dose_intervals jsonb NOT NULL DEFAULT '[]'::jsonb, -- [21, 60] days between doses
  age_restrictions jsonb DEFAULT '{}'::jsonb, -- {"min_age": 6, "max_age": null}
  contraindications jsonb DEFAULT '[]'::jsonb, -- ["pregnancy", "immunocompromised"]
  indications jsonb DEFAULT '[]'::jsonb, -- ["healthcare_worker", "elderly", "chronic_disease"]
  side_effects jsonb DEFAULT '[]'::jsonb, -- ["fever", "pain", "swelling"]
  efficacy_duration integer DEFAULT 365, -- days of protection
  booster_required boolean DEFAULT false,
  booster_interval integer DEFAULT 365, -- days until booster needed
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create patient vaccine tracking table
CREATE TABLE public.patient_vaccine_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id text NOT NULL, -- LINE user ID or internal patient ID
  patient_name text NOT NULL,
  vaccine_schedule_id uuid REFERENCES public.vaccine_schedules(id),
  current_dose integer NOT NULL DEFAULT 1,
  total_doses integer NOT NULL,
  last_dose_date date,
  next_dose_due date,
  completion_status text DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'completed', 'overdue', 'cancelled')),
  auto_reminder_enabled boolean DEFAULT true,
  reminder_days_before integer DEFAULT 1,
  contraindication_checked boolean DEFAULT false,
  contraindication_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create notification schedule table
CREATE TABLE public.notification_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_tracking_id uuid REFERENCES public.patient_vaccine_tracking(id),
  notification_type text NOT NULL CHECK (notification_type IN ('reminder', 'due', 'overdue', 'booster')),
  scheduled_date date NOT NULL,
  sent boolean DEFAULT false,
  sent_at timestamp with time zone,
  message_content text,
  line_user_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vaccine_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_vaccine_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vaccine_schedules
CREATE POLICY "Healthcare staff can view vaccine schedules" 
ON public.vaccine_schedules 
FOR SELECT 
USING (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can insert vaccine schedules" 
ON public.vaccine_schedules 
FOR INSERT 
WITH CHECK (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can update vaccine schedules" 
ON public.vaccine_schedules 
FOR UPDATE 
USING (is_healthcare_staff(auth.uid()));

-- Create RLS policies for patient_vaccine_tracking
CREATE POLICY "Healthcare staff can view patient tracking" 
ON public.patient_vaccine_tracking 
FOR SELECT 
USING (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can insert patient tracking" 
ON public.patient_vaccine_tracking 
FOR INSERT 
WITH CHECK (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can update patient tracking" 
ON public.patient_vaccine_tracking 
FOR UPDATE 
USING (is_healthcare_staff(auth.uid()));

-- Create RLS policies for notification_schedules
CREATE POLICY "Healthcare staff can view notifications" 
ON public.notification_schedules 
FOR SELECT 
USING (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can insert notifications" 
ON public.notification_schedules 
FOR INSERT 
WITH CHECK (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can update notifications" 
ON public.notification_schedules 
FOR UPDATE 
USING (is_healthcare_staff(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_patient_vaccine_tracking_patient_id ON public.patient_vaccine_tracking(patient_id);
CREATE INDEX idx_patient_vaccine_tracking_next_due ON public.patient_vaccine_tracking(next_dose_due);
CREATE INDEX idx_notification_schedules_scheduled_date ON public.notification_schedules(scheduled_date);
CREATE INDEX idx_notification_schedules_sent ON public.notification_schedules(sent, scheduled_date);

-- Create triggers for updated_at
CREATE TRIGGER update_vaccine_schedules_updated_at
BEFORE UPDATE ON public.vaccine_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_vaccine_tracking_updated_at
BEFORE UPDATE ON public.patient_vaccine_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default vaccine schedules
INSERT INTO public.vaccine_schedules (vaccine_name, vaccine_type, total_doses, dose_intervals, age_restrictions, contraindications, indications, side_effects, efficacy_duration, booster_required, booster_interval) VALUES
-- COVID-19 vaccines
('Pfizer-BioNTech COVID-19', 'covid', 2, '[21]', '{"min_age": 12}', '["severe_allergic_reaction", "myocarditis_history"]', '["general_population", "healthcare_worker", "elderly", "chronic_disease"]', '["pain_at_injection", "fatigue", "headache", "muscle_pain", "fever"]', 180, true, 365),

('Moderna COVID-19', 'covid', 2, '[28]', '{"min_age": 18}', '["severe_allergic_reaction", "myocarditis_history"]', '["general_population", "healthcare_worker", "elderly", "chronic_disease"]', '["pain_at_injection", "fatigue", "headache", "muscle_pain", "fever"]', 180, true, 365),

-- Influenza vaccines
('Influenza Quadrivalent', 'flu', 1, '[]', '{"min_age": 6}', '["severe_allergic_reaction", "guillain_barre_syndrome"]', '["general_population", "healthcare_worker", "elderly", "chronic_disease", "pregnant_women"]', '["pain_at_injection", "low_grade_fever", "muscle_aches"]', 365, true, 365),

-- Hepatitis B
('Hepatitis B Vaccine', 'hepatitis_b', 3, '[30, 150]', '{"min_age": 0}', '["severe_allergic_reaction"]', '["healthcare_worker", "high_risk_exposure", "newborns"]', '["pain_at_injection", "fatigue", "fever"]', 7300, false, null),

-- HPV vaccines
('HPV 9-valent', 'hpv', 2, '[60]', '{"min_age": 9, "max_age": 45}', '["pregnancy", "severe_allergic_reaction"]', '["adolescents", "young_adults"]', '["pain_at_injection", "swelling", "redness", "dizziness"]', 3650, false, null),

-- Pneumococcal
('Pneumococcal Conjugate (PCV13)', 'pneumococcal', 4, '[30, 30, 335]', '{"min_age": 0, "max_age": 24}', '["severe_allergic_reaction"]', '["infants", "children_under_2"]', '["pain_at_injection", "fever", "irritability"]', 1825, false, null),

-- Tetanus-Diphtheria
('Tetanus-Diphtheria (Td)', 'tetanus_diphtheria', 1, '[]', '{"min_age": 7}', '["severe_allergic_reaction"]', '["general_population"]', '["pain_at_injection", "swelling", "fever"]', 3650, true, 3650);

-- Function to calculate next dose date
CREATE OR REPLACE FUNCTION public.calculate_next_dose_date(
  _patient_tracking_id uuid
) RETURNS date AS $$
DECLARE
  tracking_record RECORD;
  schedule_record RECORD;
  next_date date;
  interval_days integer;
BEGIN
  -- Get patient tracking record
  SELECT * INTO tracking_record 
  FROM public.patient_vaccine_tracking 
  WHERE id = _patient_tracking_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get vaccine schedule
  SELECT * INTO schedule_record 
  FROM public.vaccine_schedules 
  WHERE id = tracking_record.vaccine_schedule_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- If completed, no next dose
  IF tracking_record.current_dose >= tracking_record.total_doses THEN
    RETURN NULL;
  END IF;
  
  -- Calculate next dose date
  IF tracking_record.last_dose_date IS NOT NULL THEN
    -- Get interval for current dose
    interval_days := (schedule_record.dose_intervals->>(tracking_record.current_dose - 1))::integer;
    next_date := tracking_record.last_dose_date + interval_days;
  ELSE
    -- First dose can be scheduled immediately
    next_date := CURRENT_DATE;
  END IF;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check contraindications
CREATE OR REPLACE FUNCTION public.check_contraindications(
  _vaccine_schedule_id uuid,
  _patient_conditions jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
  schedule_record RECORD;
  contraindications jsonb;
  found_contraindications jsonb := '[]'::jsonb;
  condition text;
BEGIN
  -- Get vaccine schedule
  SELECT * INTO schedule_record 
  FROM public.vaccine_schedules 
  WHERE id = _vaccine_schedule_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Vaccine schedule not found"}'::jsonb;
  END IF;
  
  contraindications := schedule_record.contraindications;
  
  -- Check each contraindication against patient conditions
  FOR condition IN SELECT jsonb_array_elements_text(contraindications)
  LOOP
    IF _patient_conditions ? condition THEN
      found_contraindications := found_contraindications || jsonb_build_array(condition);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'has_contraindications', jsonb_array_length(found_contraindications) > 0,
    'contraindications', found_contraindications,
    'vaccine_contraindications', contraindications
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;