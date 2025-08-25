-- Fix the trigger function to correctly calculate next_dose_due using dose_intervals array
DROP TRIGGER IF EXISTS auto_create_vaccine_tracking_trigger ON appointments;
DROP FUNCTION IF EXISTS auto_create_vaccine_tracking();

CREATE OR REPLACE FUNCTION public.auto_create_vaccine_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tracking_record record;
  schedule_record record;
  dose_count integer;
  next_interval integer;
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

      -- Calculate next interval correctly using zero-based indexing
      -- dose_count is the number of completed doses, so for next dose we need interval at index (dose_count-1)
      next_interval := NULL;
      IF dose_count < schedule_record.total_doses THEN
        -- Get the interval for the NEXT dose (zero-based indexing)
        -- After dose 1, we need interval[0] for dose 2
        -- After dose 2, we need interval[1] for dose 3, etc.
        next_interval := (schedule_record.dose_intervals->>((dose_count-1)::text))::integer;
      END IF;

      -- Upsert tracking record with correct next_dose_due calculation
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
          WHEN next_interval IS NOT NULL THEN NEW.appointment_date + next_interval
          ELSE NULL
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
$function$;

-- Recreate the trigger
CREATE TRIGGER auto_create_vaccine_tracking_trigger
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_vaccine_tracking();

-- Fix existing incorrect data by recalculating next_dose_due for all incomplete tracking records
UPDATE patient_vaccine_tracking pvt
SET next_dose_due = CASE 
  WHEN pvt.current_dose >= pvt.total_doses THEN NULL
  WHEN vs.dose_intervals IS NOT NULL AND jsonb_array_length(vs.dose_intervals) > (pvt.current_dose - 1) THEN 
    pvt.last_dose_date + (vs.dose_intervals->>((pvt.current_dose-1)::text))::integer
  ELSE NULL
END,
completion_status = CASE 
  WHEN pvt.current_dose >= pvt.total_doses THEN 'completed'
  ELSE 'in_progress'
END,
updated_at = now()
FROM vaccine_schedules vs
WHERE pvt.vaccine_schedule_id = vs.id
AND pvt.completion_status = 'in_progress';