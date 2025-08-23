-- Create function to auto-create patient vaccine tracking after appointment completion
CREATE OR REPLACE FUNCTION public.auto_create_vaccine_tracking()
RETURNS TRIGGER AS $$
DECLARE
  tracking_record record;
  schedule_record record;
  next_due_date date;
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

      -- Check if tracking record exists
      SELECT * INTO tracking_record
      FROM public.patient_vaccine_tracking pvt
      WHERE pvt.patient_id = COALESCE(NEW.patient_id_number, NEW.line_user_id)
      AND pvt.vaccine_schedule_id = schedule_record.id;
      
      IF FOUND THEN
        -- Update existing tracking record
        UPDATE public.patient_vaccine_tracking 
        SET 
          current_dose = dose_count,
          last_dose_date = NEW.appointment_date,
          next_dose_due = CASE 
            WHEN dose_count >= total_doses THEN NULL
            ELSE NEW.appointment_date + COALESCE(
              (schedule_record.dose_intervals->>((dose_count - 1)::text))::integer, 
              30
            )
          END,
          completion_status = CASE 
            WHEN dose_count >= total_doses THEN 'completed'
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
          dose_count,
          schedule_record.total_doses,
          NEW.appointment_date,
          CASE 
            WHEN dose_count >= schedule_record.total_doses THEN NULL
            ELSE NEW.appointment_date + COALESCE(
              (schedule_record.dose_intervals->>(0::text))::integer, 
              30
            )
          END,
          CASE 
            WHEN dose_count >= schedule_record.total_doses THEN 'completed'
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

-- Manually create tracking records from existing completed appointments
DO $$
DECLARE
  r RECORD;
  tracking_id UUID;
  dose_count INTEGER;
  schedule_rec RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT
      COALESCE(a.patient_id_number, a.line_user_id) as patient_id,
      a.patient_name,
      lower(a.vaccine_type) as vaccine_type
    FROM public.appointments a
    WHERE a.status = 'completed'
  LOOP
    -- Get vaccine schedule
    SELECT * INTO schedule_rec
    FROM public.vaccine_schedules vs
    WHERE lower(vs.vaccine_type) = r.vaccine_type AND vs.active = true
    LIMIT 1;
    
    IF FOUND THEN
      -- Count doses for this patient and vaccine
      SELECT COUNT(*) INTO dose_count
      FROM public.appointments a2
      WHERE (a2.patient_id_number = r.patient_id OR a2.line_user_id = r.patient_id)
      AND lower(a2.vaccine_type) = r.vaccine_type
      AND a2.status = 'completed';
      
      -- Insert or update tracking record
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
        r.patient_id,
        r.patient_name,
        schedule_rec.id,
        dose_count,
        schedule_rec.total_doses,
        (SELECT MAX(appointment_date) 
         FROM public.appointments a3 
         WHERE (a3.patient_id_number = r.patient_id OR a3.line_user_id = r.patient_id)
         AND lower(a3.vaccine_type) = r.vaccine_type 
         AND a3.status = 'completed'),
        CASE 
          WHEN dose_count >= schedule_rec.total_doses THEN NULL
          ELSE (SELECT MAX(appointment_date) 
                FROM public.appointments a3 
                WHERE (a3.patient_id_number = r.patient_id OR a3.line_user_id = r.patient_id)
                AND lower(a3.vaccine_type) = r.vaccine_type 
                AND a3.status = 'completed') + 
               COALESCE((schedule_rec.dose_intervals->>((dose_count - 1)::text))::integer, 30)
        END,
        CASE 
          WHEN dose_count >= schedule_rec.total_doses THEN 'completed'
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
  END LOOP;
END $$;