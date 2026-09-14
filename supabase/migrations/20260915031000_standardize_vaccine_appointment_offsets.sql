-- Standardize vaccine follow-up appointment calculation.
-- Authoritative rule:
--   dose_intervals stores ABSOLUTE day offsets from the first completed dose.
--   next dose N date = first dose date + dose_intervals[N - 2]
--
-- Examples:
--   rabies [3,7,14,28] -> dose 2/3/4/5 on day 3/7/14/28 from dose 1
--   tetanus [28,168]   -> dose 2/3 on day 28/168 from dose 1

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

  dose_count           integer := 0;
  arr                  jsonb := '[]'::jsonb;
  arr_len              integer := 0;
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

  SELECT COUNT(*)::int, MIN(a2.appointment_date)
  INTO dose_count, first_dose_date
  FROM public.appointments a2
  WHERE (
        (v_patient_id IS NOT NULL AND a2.patient_id_number = v_patient_id)
     OR (v_line_user_id IS NOT NULL AND a2.line_user_id = v_line_user_id)
  )
    AND lower(btrim(a2.vaccine_type)) = vtype
    AND a2.status = 'completed'
    AND a2.appointment_date <= NEW.appointment_date;

  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a3
    WHERE (
          (v_patient_id IS NOT NULL AND a3.patient_id_number = v_patient_id)
       OR (v_line_user_id IS NOT NULL AND a3.line_user_id = v_line_user_id)
    )
      AND lower(btrim(a3.vaccine_type)) = vtype
      AND a3.status IN ('scheduled','pending')
      AND a3.appointment_date > NEW.appointment_date
  ) INTO future_exists;

  IF future_exists THEN
    RAISE NOTICE '[on_appointment_completed] Future appointment already exists -> skip.';
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

  IF vs_total_doses IS NOT NULL AND dose_count < vs_total_doses THEN
    -- After N completed doses, schedule dose N+1 with offset index N-1.
    offset_index := dose_count - 1;

    IF first_dose_date IS NULL THEN
      RAISE NOTICE '[on_appointment_completed] First dose date not found -> skip.';
      RETURN NEW;
    END IF;

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
      'เข็ม %s/%s - %s (คำนวณจากเข็มแรก %s + %s วัน ตาม dose_intervals)',
      dose_count + 1,
      vs_total_doses,
      COALESCE(vs_name, v_vac_type_raw),
      to_char(first_dose_date, 'DD/MM/YYYY'),
      days_from_first
    );

    INSERT INTO public.appointments (
      patient_id_number,
      line_user_id,
      vaccine_type,
      status,
      appointment_date,
      created_at,
      updated_at,
      notes
    )
    VALUES (
      v_patient_id,
      v_line_user_id,
      v_vac_type_raw,
      'scheduled',
      next_dt,
      NOW(),
      NOW(),
      note_text
    );

    RAISE NOTICE '[on_appointment_completed] Created next appointment: first=% offset=% next=%',
      first_dose_date, days_from_first, next_dt;

    RETURN NEW;
  END IF;

  -- Booster remains relative to the date the primary series was completed.
  IF vs_total_doses IS NOT NULL
     AND dose_count >= vs_total_doses
     AND vs_booster_required IS TRUE
     AND vs_booster_interval IS NOT NULL
     AND vs_booster_interval > 0
  THEN
    next_dt := NEW.appointment_date + vs_booster_interval;

    note_text := format(
      'เข็มเสริม - %s (ครบคอร์ส %s เข็มเมื่อ %s)',
      COALESCE(vs_name, v_vac_type_raw),
      vs_total_doses,
      to_char(NEW.appointment_date, 'DD/MM/YYYY')
    );

    INSERT INTO public.appointments (
      patient_id_number,
      line_user_id,
      vaccine_type,
      status,
      appointment_date,
      created_at,
      updated_at,
      notes
    )
    VALUES (
      v_patient_id,
      v_line_user_id,
      v_vac_type_raw,
      'scheduled',
      next_dt,
      NOW(),
      NOW(),
      note_text
    );

    RAISE NOTICE '[on_appointment_completed] Created booster at %', next_dt;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_on_appointment_completed ON public.appointments;
CREATE TRIGGER tr_on_appointment_completed
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_appointment_completed();
