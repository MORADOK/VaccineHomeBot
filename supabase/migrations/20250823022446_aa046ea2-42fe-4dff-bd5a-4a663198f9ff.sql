-- Create function to auto-create patient vaccine tracking after appointment completion
CREATE OR REPLACE FUNCTION public.auto_create_vaccine_tracking()
RETURNS TRIGGER AS $$
DECLARE
  tracking_record record;
  schedule_record record;
  next_due_date date;
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
      -- Check if tracking record exists
      SELECT * INTO tracking_record
      FROM public.patient_vaccine_tracking pvt
      WHERE pvt.patient_id = COALESCE(NEW.patient_id_number, NEW.line_user_id)
      AND pvt.vaccine_schedule_id = schedule_record.id;
      
      IF FOUND THEN
        -- Update existing tracking record
        UPDATE public.patient_vaccine_tracking 
        SET 
          current_dose = current_dose + 1,
          last_dose_date = NEW.appointment_date,
          next_dose_due = CASE 
            WHEN current_dose + 1 >= total_doses THEN NULL
            ELSE NEW.appointment_date + COALESCE(
              (schedule_record.dose_intervals->>(current_dose))::integer, 
              30
            )
          END,
          completion_status = CASE 
            WHEN current_dose + 1 >= total_doses THEN 'completed'
            ELSE 'in_progress'
          END,
          updated_at = now()
        WHERE id = tracking_record.id;
      ELSE
        -- Create new tracking record
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
          1,
          schedule_record.total_doses,
          NEW.appointment_date,
          CASE 
            WHEN 1 >= schedule_record.total_doses THEN NULL
            ELSE NEW.appointment_date + COALESCE(
              (schedule_record.dose_intervals->>0)::integer, 
              30
            )
          END,
          CASE 
            WHEN 1 >= schedule_record.total_doses THEN 'completed'
            ELSE 'in_progress'
          END
        );
      END IF;
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

-- Backfill existing completed appointments to create tracking records
INSERT INTO public.patient_vaccine_tracking (
  patient_id,
  patient_name,
  vaccine_schedule_id,
  current_dose,
  total_doses,
  last_dose_date,
  next_dose_due,
  completion_status
)
SELECT DISTINCT ON (COALESCE(a.patient_id_number, a.line_user_id), vs.id)
  COALESCE(a.patient_id_number, a.line_user_id),
  a.patient_name,
  vs.id,
  COUNT(*) OVER (PARTITION BY COALESCE(a.patient_id_number, a.line_user_id), vs.id),
  vs.total_doses,
  MAX(a.appointment_date) OVER (PARTITION BY COALESCE(a.patient_id_number, a.line_user_id), vs.id),
  CASE 
    WHEN COUNT(*) OVER (PARTITION BY COALESCE(a.patient_id_number, a.line_user_id), vs.id) >= vs.total_doses 
    THEN NULL
    ELSE MAX(a.appointment_date) OVER (PARTITION BY COALESCE(a.patient_id_number, a.line_user_id), vs.id) + 
         COALESCE((vs.dose_intervals->>(COUNT(*) OVER (PARTITION BY COALESCE(a.patient_id_number, a.line_user_id), vs.id) - 1))::integer, 30)
  END,
  CASE 
    WHEN COUNT(*) OVER (PARTITION BY COALESCE(a.patient_id_number, a.line_user_id), vs.id) >= vs.total_doses 
    THEN 'completed'
    ELSE 'in_progress'
  END
FROM public.appointments a
JOIN public.vaccine_schedules vs ON lower(vs.vaccine_type) = lower(a.vaccine_type) AND vs.active = true
WHERE a.status = 'completed'
ON CONFLICT (patient_id, vaccine_schedule_id) DO NOTHING;