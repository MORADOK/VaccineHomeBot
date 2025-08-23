-- Add unique constraint for patient_id and vaccine_schedule_id
ALTER TABLE public.patient_vaccine_tracking 
ADD CONSTRAINT patient_vaccine_tracking_patient_vaccine_unique 
UNIQUE (patient_id, vaccine_schedule_id);

-- Create function to auto-create patient vaccine tracking after appointment completion
CREATE OR REPLACE FUNCTION public.auto_create_vaccine_tracking()
RETURNS TRIGGER AS $$
DECLARE
  tracking_record record;
  schedule_record record;
  dose_count integer;
BEGIN
  -- Only process when appointment is marked as completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get vaccine schedule info
    SELECT vs.* INTO schedule_record
    FROM public.vaccine_schedules vs
    WHERE lower(vs.vaccine_type) = lower(NEW.vaccine_type) 
    AND vs.active = true
    LIMIT 1;
    
    IF FOUND THEN
      -- Count existing doses for this patient and vaccine type
      SELECT COUNT(*) INTO dose_count
      FROM public.appointments a2
      WHERE (a2.patient_id_number = NEW.patient_id_number OR a2.line_user_id = NEW.line_user_id)
      AND lower(a2.vaccine_type) = lower(NEW.vaccine_type)
      AND a2.status = 'completed'
      AND a2.appointment_date <= NEW.appointment_date;

      -- Upsert tracking record
      INSERT INTO public.patient_vaccine_tracking (
        patient_id,
        patient_name,
        vaccine_schedule_id,
        current_dose,
        total_doses,
        last_dose_date,
        next_dose_due,
        completion_status
      ) VALUES (
        COALESCE(NEW.patient_id_number, NEW.line_user_id),
        NEW.patient_name,
        schedule_record.id,
        dose_count,
        schedule_record.total_doses,
        NEW.appointment_date,
        CASE 
          WHEN dose_count >= schedule_record.total_doses THEN NULL
          ELSE NEW.appointment_date + COALESCE(
            (schedule_record.dose_intervals->>LEAST((dose_count)::text, (array_length(schedule_record.dose_intervals::jsonb, 1) - 1)::text))::integer, 
            30
          )
        END,
        CASE 
          WHEN dose_count >= schedule_record.total_doses THEN 'completed'
          ELSE 'in_progress'
        END
      )
      ON CONFLICT (patient_id, vaccine_schedule_id) DO UPDATE SET
        current_dose = EXCLUDED.current_dose,
        last_dose_date = EXCLUDED.last_dose_date,
        next_dose_due = EXCLUDED.next_dose_due,
        completion_status = EXCLUDED.completion_status,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS trigger_auto_create_vaccine_tracking ON public.appointments;
CREATE TRIGGER trigger_auto_create_vaccine_tracking
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_vaccine_tracking();