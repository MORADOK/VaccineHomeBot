-- Fix all remaining functions search path security issues
CREATE OR REPLACE FUNCTION public.calculate_next_dose_date(_patient_tracking_id uuid)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_contraindications(_vaccine_schedule_id uuid, _patient_conditions jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.make_user_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_user_id, 'admin', _user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;