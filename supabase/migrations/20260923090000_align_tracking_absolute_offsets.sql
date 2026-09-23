-- Align patient_vaccine_tracking with the authoritative appointment rule.
-- dose_intervals contains ABSOLUTE day offsets from dose 1.
-- This replaces the legacy latest-dose + interval calculation.

CREATE OR REPLACE FUNCTION public.auto_create_vaccine_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  schedule_record record;
  tracking_record record;
  v_patient_key text := COALESCE(NEW.patient_id_number, NEW.line_user_id);
  v_current_dose integer;
  v_first_dose_date date;
  v_next_due date;
  v_offset integer;
  v_arr jsonb := '[]'::jsonb;
  v_arr_len integer := 0;
BEGIN
  IF NOT (
       (TG_OP = 'INSERT' AND NEW.status = 'completed')
    OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed')
  ) THEN
    RETURN NEW;
  END IF;

  IF v_patient_key IS NULL THEN RETURN NEW; END IF;

  SELECT vs.* INTO schedule_record
  FROM public.vaccine_schedules vs
  WHERE COALESCE(vs.active, true)
    AND (lower(btrim(vs.vaccine_type)) = lower(btrim(NEW.vaccine_type))
      OR lower(btrim(vs.vaccine_name)) = lower(btrim(NEW.vaccine_type)))
  ORDER BY vs.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NEW; END IF;

  IF jsonb_typeof(schedule_record.dose_intervals) = 'array' THEN
    v_arr := schedule_record.dose_intervals;
  ELSIF jsonb_typeof(schedule_record.dose_intervals) = 'object'
        AND schedule_record.dose_intervals ? 'dose_intervals' THEN
    v_arr := schedule_record.dose_intervals->'dose_intervals';
  END IF;
  IF jsonb_typeof(v_arr) = 'array' THEN v_arr_len := jsonb_array_length(v_arr); END IF;

  -- Prefer explicit dose_number. Legacy rows fall back to completed-dose count.
  IF NEW.dose_number IS NOT NULL THEN
    v_current_dose := NEW.dose_number;
  ELSE
    SELECT COUNT(*)::int INTO v_current_dose
    FROM public.appointments a
    WHERE COALESCE(a.patient_id_number, a.line_user_id) = v_patient_key
      AND lower(btrim(a.vaccine_type)) = lower(btrim(NEW.vaccine_type))
      AND a.status = 'completed'
      AND a.appointment_date <= NEW.appointment_date;
  END IF;

  IF v_current_dose = 1 THEN
    v_first_dose_date := NEW.appointment_date;
  ELSE
    SELECT a.appointment_date INTO v_first_dose_date
    FROM public.appointments a
    WHERE COALESCE(a.patient_id_number, a.line_user_id) = v_patient_key
      AND lower(btrim(a.vaccine_type)) = lower(btrim(NEW.vaccine_type))
      AND a.status = 'completed'
      AND (a.dose_number = 1 OR a.dose_number IS NULL)
      AND a.appointment_date <= NEW.appointment_date
    ORDER BY CASE WHEN a.dose_number = 1 THEN 0 ELSE 1 END, a.appointment_date ASC
    LIMIT 1;
  END IF;

  v_next_due := NULL;
  IF v_current_dose < schedule_record.total_doses
     AND v_first_dose_date IS NOT NULL
     AND (v_current_dose - 1) >= 0
     AND (v_current_dose - 1) < v_arr_len THEN
    BEGIN
      v_offset := NULLIF(v_arr->>(v_current_dose - 1), '')::integer;
    EXCEPTION WHEN others THEN
      v_offset := NULL;
    END;
    IF v_offset IS NOT NULL AND v_offset > 0 THEN
      v_next_due := v_first_dose_date + v_offset;
    END IF;
  END IF;

  SELECT * INTO tracking_record
  FROM public.patient_vaccine_tracking pvt
  WHERE pvt.patient_id = v_patient_key
    AND pvt.vaccine_schedule_id = schedule_record.id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.patient_vaccine_tracking
    SET patient_name = COALESCE(NEW.patient_name, patient_name),
        current_dose = v_current_dose,
        total_doses = schedule_record.total_doses,
        last_dose_date = NEW.appointment_date,
        next_dose_due = v_next_due,
        completion_status = CASE WHEN v_current_dose >= schedule_record.total_doses THEN 'completed' ELSE 'in_progress' END,
        line_user_id = COALESCE(NEW.line_user_id, line_user_id),
        updated_at = now()
    WHERE id = tracking_record.id;
  ELSE
    INSERT INTO public.patient_vaccine_tracking (
      patient_id, patient_name, vaccine_schedule_id, current_dose, total_doses,
      last_dose_date, next_dose_due, completion_status, line_user_id
    ) VALUES (
      v_patient_key, NEW.patient_name, schedule_record.id, v_current_dose,
      schedule_record.total_doses, NEW.appointment_date, v_next_due,
      CASE WHEN v_current_dose >= schedule_record.total_doses THEN 'completed' ELSE 'in_progress' END,
      NEW.line_user_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_auto_create_vaccine_tracking ON public.appointments;
CREATE TRIGGER trigger_auto_create_vaccine_tracking
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_vaccine_tracking();

-- Repair existing tracking rows from completed appointment history.
-- Explicit dose_number is preferred. For legacy rows, completed count is used.
WITH active_schedules AS (
  SELECT DISTINCT ON (lower(btrim(vaccine_type))) *
  FROM public.vaccine_schedules
  WHERE COALESCE(active, true)
  ORDER BY lower(btrim(vaccine_type)), updated_at DESC
), history AS (
  SELECT
    COALESCE(a.patient_id_number, a.line_user_id) AS patient_key,
    lower(btrim(a.vaccine_type)) AS vaccine_key,
    MAX(a.patient_name) AS patient_name,
    MAX(a.line_user_id) AS line_user_id,
    MIN(a.appointment_date) AS legacy_first_date,
    MIN(a.appointment_date) FILTER (WHERE a.dose_number = 1) AS explicit_first_date,
    MAX(a.appointment_date) AS last_dose_date,
    COUNT(*)::int AS completed_count,
    MAX(a.dose_number) AS max_dose_number
  FROM public.appointments a
  WHERE a.status = 'completed'
    AND COALESCE(a.patient_id_number, a.line_user_id) IS NOT NULL
  GROUP BY 1,2
), calc AS (
  SELECT h.*, vs.id AS schedule_id, vs.total_doses,
    CASE WHEN jsonb_typeof(vs.dose_intervals)='array' THEN vs.dose_intervals
         WHEN jsonb_typeof(vs.dose_intervals)='object' THEN vs.dose_intervals->'dose_intervals'
         ELSE '[]'::jsonb END AS intervals,
    COALESCE(h.max_dose_number, h.completed_count) AS current_dose,
    COALESCE(h.explicit_first_date, h.legacy_first_date) AS first_dose_date
  FROM history h JOIN active_schedules vs ON lower(btrim(vs.vaccine_type)) = h.vaccine_key
), repaired AS (
  SELECT c.*,
    CASE
      WHEN c.current_dose >= c.total_doses THEN NULL
      WHEN jsonb_typeof(c.intervals)='array'
       AND jsonb_array_length(c.intervals) > c.current_dose - 1
       AND NULLIF(c.intervals->>(c.current_dose - 1),'')::int > 0
      THEN c.first_dose_date + (NULLIF(c.intervals->>(c.current_dose - 1),'')::int)
      ELSE NULL
    END AS expected_next_due
  FROM calc c
)
UPDATE public.patient_vaccine_tracking pvt
SET current_dose = r.current_dose,
    total_doses = r.total_doses,
    last_dose_date = r.last_dose_date,
    next_dose_due = r.expected_next_due,
    completion_status = CASE WHEN r.current_dose >= r.total_doses THEN 'completed' ELSE 'in_progress' END,
    line_user_id = COALESCE(r.line_user_id, pvt.line_user_id),
    updated_at = now()
FROM repaired r
WHERE pvt.patient_id = r.patient_key
  AND pvt.vaccine_schedule_id = r.schedule_id;
