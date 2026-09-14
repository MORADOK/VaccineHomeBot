-- Harden vaccine series scheduling.
-- Adds explicit dose_number so a new vaccine course can restart at dose 1
-- without being mixed with historical completed appointments.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS dose_number integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_dose_number_positive'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_dose_number_positive
      CHECK (dose_number IS NULL OR dose_number > 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.on_appointment_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_patient_id         text := NEW.patient_id_number;
  v_line_user_id       text := NEW.line_user_id;
  v_vac_type_raw       text := NEW.vaccine_type;
  vtype                text := lower(btrim(NEW.vaccine_type));

  vs_id                uuid;
  vs_name              text;
  vs_total_doses       integer;
  vs_intervals_raw     jsonb;
  vs_booster_required  boolean;
  vs_booster_interval  integer;

  arr                  jsonb := '[]'::jsonb;
  arr_len              integer := 0;
  v_current_dose       integer := NULL;
  offset_index         integer := NULL;
  days_from_first      integer := NULL;
  first_dose_date      date := NULL;
  future_exists        boolean := false;
  next_dt              date;
  note_text            text := '';
BEGIN
  IF NOT (
        (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT
    vs.id,
    vs.vaccine_name,
    vs.total_doses,
    vs.dose_intervals,
    COALESCE(vs.booster_required, false),
    vs.booster_interval
  INTO
    vs_id,
    vs_name,
    vs_total_doses,
    vs_intervals_raw,
    vs_booster_required,
    vs_booster_interval
  FROM public.vaccine_schedules vs
  WHERE COALESCE(vs.active, true)
    AND (
         lower(btrim(vs.vaccine_type)) = vtype
      OR lower(btrim(vs.vaccine_name)) = vtype
    )
  ORDER BY vs.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE '[on_appointment_completed] No active schedule for type/name=%', vtype;
    RETURN NEW;
  END IF;

  IF vs_intervals_raw IS NOT NULL THEN
    IF jsonb_typeof(vs_intervals_raw) = 'array' THEN
      arr := vs_intervals_raw;
    ELSIF jsonb_typeof(vs_intervals_raw) = 'object'
          AND (vs_intervals_raw ? 'dose_intervals') THEN
      arr := vs_intervals_raw->'dose_intervals';
    END IF;
  END IF;

  IF jsonb_typeof(arr) = 'array' THEN
    arr_len := jsonb_array_length(arr);
  END IF;

  -- Preferred path: use the explicit dose number selected/assigned by staff.
  IF NEW.dose_number IS NOT NULL THEN
    v_current_dose := NEW.dose_number;

    IF v_current_dose = 1 THEN
      first_dose_date := NEW.appointment_date;
    ELSE
      SELECT a.appointment_date
      INTO first_dose_date
      FROM public.appointments a
      WHERE a.id <> NEW.id
        AND (
             (v_patient_id IS NOT NULL AND a.patient_id_number = v_patient_id)
          OR (v_line_user_id IS NOT NULL AND a.line_user_id = v_line_user_id)
        )
        AND lower(btrim(a.vaccine_type)) = vtype
        AND a.status = 'completed'
        AND a.dose_number = 1
        AND a.appointment_date <= NEW.appointment_date
      ORDER BY a.appointment_date DESC, a.created_at DESC
      LIMIT 1;
    END IF;
  ELSE
    -- Legacy fallback for old rows that do not yet have dose_number.
    SELECT COUNT(*)::int, MIN(a.appointment_date)
    INTO v_current_dose, first_dose_date
    FROM public.appointments a
    WHERE (
          (v_patient_id IS NOT NULL AND a.patient_id_number = v_patient_id)
       OR (v_line_user_id IS NOT NULL AND a.line_user_id = v_line_user_id)
    )
      AND lower(btrim(a.vaccine_type)) = vtype
      AND a.status = 'completed'
      AND a.appointment_date <= NEW.appointment_date;
  END IF;

  IF first_dose_date IS NULL THEN
    RAISE NOTICE '[on_appointment_completed] Series start (dose 1) not found -> skip.';
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a3
    WHERE a3.id <> NEW.id
      AND (
            (v_patient_id IS NOT NULL AND a3.patient_id_number = v_patient_id)
         OR (v_line_user_id IS NOT NULL AND a3.line_user_id = v_line_user_id)
      )
      AND lower(btrim(a3.vaccine_type)) = vtype
      AND a3.status IN ('scheduled','pending')
      AND (
        a3.dose_number IS NULL
        OR a3.dose_number = v_current_dose + 1
      )
  ) INTO future_exists;

  IF future_exists THEN
    RAISE NOTICE '[on_appointment_completed] Active next appointment already exists -> skip.';
    RETURN NEW;
  END IF;

  IF vs_total_doses IS NOT NULL AND v_current_dose < vs_total_doses THEN
    offset_index := v_current_dose - 1;

    IF offset_index < 0 OR offset_index >= arr_len THEN
      RAISE NOTICE '[on_appointment_completed] Missing absolute offset index=% arr_len=% -> skip.',
        offset_index, arr_len;
      RETURN NEW;
    END IF;

    BEGIN
      days_from_first := NULLIF(arr->>offset_index, '')::int;
    EXCEPTION WHEN others THEN
      days_from_first := NULL;
    END;

    IF days_from_first IS NULL OR days_from_first <= 0 THEN
      RAISE NOTICE '[on_appointment_completed] Invalid absolute offset index=% value=% -> skip.',
        offset_index, days_from_first;
      RETURN NEW;
    END IF;

    next_dt := first_dose_date + days_from_first;

    note_text := format(
      'นัดเข็มที่ %s จาก %s เข็ม - %s (เข็มแรก %s + %s วัน ตาม dose_intervals)',
      v_current_dose + 1,
      vs_total_doses,
      COALESCE(vs_name, v_vac_type_raw),
      to_char(first_dose_date, 'DD/MM/YYYY'),
      days_from_first
    );

    INSERT INTO public.appointments (
      patient_name,
      patient_phone,
      patient_id_number,
      line_user_id,
      vaccine_type,
      vaccine_name,
      vaccine_schedule_id,
      dose_number,
      status,
      scheduled_by,
      appointment_date,
      appointment_time,
      created_at,
      updated_at,
      notes
    )
    VALUES (
      NEW.patient_name,
      NEW.patient_phone,
      v_patient_id,
      v_line_user_id,
      v_vac_type_raw,
      COALESCE(vs_name, NEW.vaccine_name),
      vs_id,
      v_current_dose + 1,
      'scheduled',
      'auto_trigger',
      next_dt,
      NEW.appointment_time,
      NOW(),
      NOW(),
      note_text
    );

    RETURN NEW;
  END IF;

  IF vs_total_doses IS NOT NULL
     AND v_current_dose >= vs_total_doses
     AND vs_booster_required IS TRUE
     AND vs_booster_interval IS NOT NULL
     AND vs_booster_interval > 0
  THEN
    next_dt := NEW.appointment_date + vs_booster_interval;

    INSERT INTO public.appointments (
      patient_name,
      patient_phone,
      patient_id_number,
      line_user_id,
      vaccine_type,
      vaccine_name,
      vaccine_schedule_id,
      dose_number,
      status,
      scheduled_by,
      appointment_date,
      appointment_time,
      created_at,
      updated_at,
      notes
    )
    VALUES (
      NEW.patient_name,
      NEW.patient_phone,
      v_patient_id,
      v_line_user_id,
      v_vac_type_raw,
      COALESCE(vs_name, NEW.vaccine_name),
      vs_id,
      v_current_dose + 1,
      'scheduled',
      'auto_trigger',
      next_dt,
      NEW.appointment_time,
      NOW(),
      NOW(),
      format('เข็มเสริม - %s', COALESCE(vs_name, v_vac_type_raw))
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_on_appointment_completed ON public.appointments;
DROP TRIGGER IF EXISTS trg_on_appointment_completed ON public.appointments;

CREATE TRIGGER tr_on_appointment_completed
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_appointment_completed();
