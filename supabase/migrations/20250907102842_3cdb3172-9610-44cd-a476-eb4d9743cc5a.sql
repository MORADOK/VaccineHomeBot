-- แก้ไขฟังก์ชัน on_appointment_completed เพื่อให้หมายเหตุมีข้อมูลที่มีประโยชน์
CREATE OR REPLACE FUNCTION public.on_appointment_completed()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_patient_id   text := NEW.patient_id_number;
  v_line_user_id text := NEW.line_user_id;
  v_vac_type_raw text := NEW.vaccine_type;
  vtype          text := lower(btrim(NEW.vaccine_type));

  -- schedule
  vs_id               uuid;
  vs_name             text;
  vs_total_doses      integer;
  vs_intervals_raw    jsonb;
  vs_booster_required boolean;
  vs_booster_interval integer;

  -- helpers
  dose_count         integer := 0;     -- #โดส completed แล้ว (รวมโดสนี้)
  arr                jsonb   := '[]'::jsonb;
  arr_len            integer := 0;
  mode_detected      text    := 'unknown';
  next_interval_days integer := NULL;
  curr_offset        integer := NULL;
  next_offset        integer := NULL;
  future_exists      boolean := false;
  next_dt            timestamptz;
  note_text          text    := '';
BEGIN
  -- ทำเฉพาะเมื่อเป็น INSERT ที่ NEW.status='completed'
  -- หรือ UPDATE ที่เพิ่ง "เปลี่ยน" เป็น completed
  IF NOT (
        (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND COALESCE(OLD.status,'') <> 'completed')
     ) THEN
    RETURN NEW;
  END IF;

  -- อ่าน schedule (เทียบทั้ง vaccine_type และ vaccine_name, ตัดช่องว่าง + lowercase)
  SELECT vs.id, vs.vaccine_name, vs.total_doses, vs.dose_intervals,
         COALESCE(vs.booster_required,false), vs.booster_interval
    INTO vs_id, vs_name, vs_total_doses, vs_intervals_raw, vs_booster_required, vs_booster_interval
  FROM public.vaccine_schedules vs
  WHERE COALESCE(vs.active,true)
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

  -- นับโดส completed แล้ว (รวมโดสนี้) ถึงวัน/เวลานี้
  SELECT COUNT(*)::int
    INTO dose_count
  FROM public.appointments a2
  WHERE (a2.patient_id_number = v_patient_id OR a2.line_user_id = v_line_user_id)
    AND lower(btrim(a2.vaccine_type)) = vtype
    AND a2.status = 'completed'
    AND a2.appointment_date <= NEW.appointment_date;

  -- กันซ้ำ: ถ้ามีนัดอนาคตที่ยังไม่เสร็จ → ข้าม
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a3
    WHERE (a3.patient_id_number = v_patient_id OR a3.line_user_id = v_line_user_id)
      AND lower(btrim(a3.vaccine_type)) = vtype
      AND a3.status IN ('scheduled','pending')
      AND a3.appointment_date > NEW.appointment_date
  ) INTO future_exists;

  IF future_exists THEN
    RAISE NOTICE '[on_appointment_completed] Future appt already exists → skip.';
    RETURN NEW;
  END IF;

  -- เตรียม array intervals
  IF vs_intervals_raw IS NOT NULL THEN
    IF jsonb_typeof(vs_intervals_raw) = 'array' THEN
      arr := vs_intervals_raw;
    ELSIF jsonb_typeof(vs_intervals_raw) = 'object' AND (vs_intervals_raw ? 'dose_intervals') THEN
      arr := vs_intervals_raw->'dose_intervals';
    END IF;
  END IF;
  IF jsonb_typeof(arr) = 'array' THEN
    arr_len := jsonb_array_length(arr);
  END IF;

  -- ยังไม่ครบคอร์ส → คำนวณโดสถัดไป
  IF vs_total_doses IS NOT NULL AND dose_count < vs_total_doses THEN
    -- absolute: length == total_doses ⇒ ใช้ delta (offset[next] - offset[curr])
    IF arr_len = vs_total_doses THEN
      mode_detected := 'absolute';
      IF (dose_count - 1) BETWEEN 0 AND arr_len-1 THEN
        BEGIN curr_offset := NULLIF(arr->>(dose_count - 1),'')::int; EXCEPTION WHEN others THEN curr_offset := NULL; END;
      END IF;
      IF dose_count BETWEEN 0 AND arr_len-1 THEN
        BEGIN next_offset := NULLIF(arr->>dose_count,'')::int;       EXCEPTION WHEN others THEN next_offset := NULL; END;
      END IF;
      IF curr_offset IS NOT NULL AND next_offset IS NOT NULL THEN
        next_interval_days := next_offset - curr_offset;
      END IF;
    END IF;

    -- relative: length == total_doses - 1 ⇒ ใช้อินเด็กซ์ (dose_count - 1)
    IF next_interval_days IS NULL AND arr_len = vs_total_doses - 1 THEN
      mode_detected := 'relative';
      IF (dose_count - 1) BETWEEN 0 AND arr_len-1 THEN
        BEGIN next_interval_days := NULLIF(arr->>(dose_count - 1),'')::int; EXCEPTION WHEN others THEN next_interval_days := NULL; END;
      END IF;
    END IF;

    RAISE NOTICE '[on_appointment_completed] schedule=%, dose_count=%, total=%, arr_len=%, mode=%, next_days=%',
      vs_id, dose_count, vs_total_doses, arr_len, mode_detected, next_interval_days;

    -- ไม่ได้ช่วงวัน หรือได้ค่า <= 0 → ไม่สร้าง
    IF next_interval_days IS NULL OR next_interval_days <= 0 THEN
      RAISE NOTICE '[on_appointment_completed] Invalid/empty interval → skip.';
      RETURN NEW;
    END IF;

    next_dt := NEW.appointment_date + make_interval(days => next_interval_days);

    -- สร้างหมายเหตุที่มีข้อมูลมีประโยชน์
    IF dose_count = 1 THEN
      note_text := format('เข็ม %s/%s - %s (ต่อเนื่องจากเข็มแรกเมื่อ %s)', 
                         dose_count + 1, 
                         vs_total_doses,
                         COALESCE(vs_name, v_vac_type_raw),
                         to_char(NEW.appointment_date, 'DD/MM/YYYY'));
    ELSE
      note_text := format('เข็ม %s/%s - %s (ต่อเนื่องจากเข็มที่ %s เมื่อ %s)', 
                         dose_count + 1, 
                         vs_total_doses,
                         COALESCE(vs_name, v_vac_type_raw),
                         dose_count,
                         to_char(NEW.appointment_date, 'DD/MM/YYYY'));
    END IF;

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
      v_vac_type_raw, -- เก็บตามข้อความที่ผู้ใช้ส่งมาเดิม
      'scheduled',
      next_dt,
      NOW(),
      NOW(),
      note_text
    );

    RAISE NOTICE '[on_appointment_completed] Created next appt at %', next_dt;
    RETURN NEW;
  END IF;

  -- ครบคอร์สแล้ว → พิจารณา booster
  IF (vs_total_doses IS NOT NULL AND dose_count >= vs_total_doses)
     AND vs_booster_required IS TRUE
     AND vs_booster_interval IS NOT NULL
  THEN
    next_dt := NEW.appointment_date + make_interval(days => vs_booster_interval);
    
    note_text := format('เข็มเสริม - %s (ครบคอร์ส %s เข็มเมื่อ %s)', 
                       COALESCE(vs_name, v_vac_type_raw),
                       vs_total_doses,
                       to_char(NEW.appointment_date, 'DD/MM/YYYY'));

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
$function$