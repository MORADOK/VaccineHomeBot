-- ========================================
-- FIX ALL FUNCTIONS: แก้ไข pr.phone และ pr.full_name
-- ========================================
-- รันไฟล์นี้ใน Supabase SQL Editor
-- แก้ปัญหา: column pr.phone does not exist
--
-- เปลี่ยนแปลง:
-- ❌ pr.phone → ✅ pr.phone_number
-- ❌ pr.full_name → ✅ pr.patient_name
-- ========================================

-- ========================================
-- Function 1: enqueue_appointment_notifications
-- ========================================

CREATE OR REPLACE FUNCTION public.enqueue_appointment_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  vname     text;
  alt_text  text;
  next_appt_text text;
  v_channel text;
  v_phone   text;
  v_line    text;
  dose_count integer := 0;
  is_first_dose boolean := false;
  next_appointment record;
begin
  -- Only process completed appointments
  IF NEW.status != 'completed' OR (OLD.status IS NOT NULL AND OLD.status = 'completed') THEN
    RETURN NEW;
  END IF;

  -- ชื่อวัคซีนจาก master
  select vs.vaccine_name
    into vname
  from public.vaccine_schedules vs
  where lower(vs.vaccine_type) = lower(coalesce(new.vaccine_type,''))
    and vs.active is true
  limit 1;

  -- Count completed doses for this patient and vaccine type to determine if this is first dose
  SELECT COUNT(*) INTO dose_count
  FROM public.appointments a2
  WHERE (a2.patient_id_number = NEW.patient_id_number OR a2.line_user_id = NEW.line_user_id)
  AND lower(a2.vaccine_type) = lower(NEW.vaccine_type)
  AND a2.status = 'completed'
  AND a2.appointment_date <= NEW.appointment_date;

  is_first_dose := (dose_count = 1);

  -- Check if there's a next appointment already scheduled
  SELECT a.appointment_date, a.appointment_time, a.vaccine_name
  INTO next_appointment
  FROM public.appointments a
  WHERE (a.patient_id_number = NEW.patient_id_number OR a.line_user_id = NEW.line_user_id)
  AND lower(a.vaccine_type) = lower(NEW.vaccine_type)
  AND a.status IN ('scheduled', 'pending')
  AND a.appointment_date > NEW.appointment_date
  ORDER BY a.appointment_date ASC
  LIMIT 1;

  -- Create appropriate message based on whether this is first dose and if there's a next appointment
  if next_appointment.appointment_date IS NOT NULL then
    -- There's a next appointment scheduled
    next_appt_text := chr(10) || chr(10) || '📅 นัดครั้งถัดไป:' || chr(10) ||
                     'วันที่: ' || to_char(next_appointment.appointment_date, 'DD Mon YYYY') ||
                     coalesce(' เวลา ' || to_char(next_appointment.appointment_time, 'HH24:MI'), '') || chr(10) ||
                     '📍 โรงพยาบาลโฮม' || chr(10) ||
                     'ระบบจะแจ้งเตือนก่อนวันนัด';
  else
    -- No next appointment yet
    next_appt_text := chr(10) || chr(10) || '⏳ กำลังจัดเตรียมนัดครั้งถัดไป' || chr(10) ||
                     'ระบบจะแจ้งเตือนเมื่อมีการนัดเข็มถัดไป';
  end if;

  if is_first_dose then
    alt_text := '✅ บันทึกการฉีดวัคซีนเข็มแรกเสร็จสิ้น' || chr(10) ||
                'วัคซีน: ' || coalesce(vname, new.vaccine_type, 'วัคซีน') || chr(10) ||
                'วันที่ฉีด: ' || to_char(new.appointment_date, 'DD Mon YYYY') ||
                coalesce(' เวลา ' || to_char(new.appointment_time, 'HH24:MI'), '') || chr(10) ||
                '📍 โรงพยาบาลโฮม' ||
                next_appt_text;
  else
    alt_text := '✅ บันทึกการฉีดวัคซีนเสร็จสิ้น' || chr(10) ||
                'วัคซีน: ' || coalesce(vname, new.vaccine_type, 'วัคซีน') || chr(10) ||
                'โดสที่: ' || dose_count::text || chr(10) ||
                'วันที่ฉีด: ' || to_char(new.appointment_date, 'DD Mon YYYY') ||
                coalesce(' เวลา ' || to_char(new.appointment_time, 'HH24:MI'), '') || chr(10) ||
                '📍 โรงพยาบาลโฮม' ||
                next_appt_text;
  end if;

  -- **FIX: ใช้ phone_number และ patient_name แทน phone และ full_name**
  if coalesce(new.line_user_id,'') = '' or coalesce(new.patient_phone,'') = '' then
    select pr.phone_number, pr.line_user_id
      into v_phone, v_line
    from public.patient_registrations pr
    where (pr.registration_id = new.patient_id_number)
       or (new.patient_phone is not null and pr.phone_number = new.patient_phone)
       or (new.line_user_id  is not null and pr.line_user_id = new.line_user_id)
       or (new.patient_name  is not null and pr.patient_name ilike new.patient_name)
    limit 1;
  end if;

  -- ตัดสินว่าจะส่งช่องไหน
  if coalesce(new.line_user_id, v_line, '') <> '' then
    v_channel := 'line';

    -- Insert immediate completion notification
    insert into public.notification_jobs (
      idempotency_key, kind, channel, line_user_id, appointment_id, schedule_at, payload
    )
    values (
      coalesce(new.line_user_id, v_line) || '|' || new.appointment_id || '|completion_confirm',
      case when is_first_dose then 'first_dose_complete' else 'dose_complete' end,
      v_channel,
      coalesce(new.line_user_id, v_line),
      new.appointment_id,
      now() + interval '2 minutes', -- Send after 2 minutes to ensure next appointment is created
      jsonb_build_object(
        'userId', coalesce(new.line_user_id, v_line),
        'type', 'completion_with_next_appointment',
        'message', alt_text,
        'isFirstDose', is_first_dose,
        'hasNextAppointment', (next_appointment.appointment_date IS NOT NULL),
        'templateData', jsonb_build_object(
          'patientName', coalesce(new.patient_name,'ผู้ป่วย'),
          'vaccineName', coalesce(vname, new.vaccine_type, 'วัคซีน'),
          'vaccineType', new.vaccine_type,
          'completedDate', new.appointment_date,
          'completedTime', new.appointment_time,
          'doseNumber', dose_count,
          'isFirstDose', is_first_dose,
          'nextAppointmentDate', next_appointment.appointment_date,
          'nextAppointmentTime', next_appointment.appointment_time,
          'detailUrl', '<<PUT-DETAIL-URL-HERE>>',
          'mapQuery',  'โรงพยาบาลโฮม'
        )
      )
    )
    on conflict (idempotency_key) do nothing;

  elsif coalesce(new.patient_phone, v_phone, '') <> '' then
    -- SMS fallback
    v_channel := 'sms';

    insert into public.notification_jobs (
      idempotency_key, kind, channel, line_user_id, appointment_id, schedule_at, payload
    )
    values (
      coalesce(new.patient_phone, v_phone) || '|' || new.appointment_id || '|completion_confirm',
      case when is_first_dose then 'first_dose_complete' else 'dose_complete' end,
      v_channel,
      null,
      new.appointment_id,
      now() + interval '2 minutes',
      jsonb_build_object(
        'phone', coalesce(new.patient_phone, v_phone),
        'message', alt_text,
        'patientName', coalesce(new.patient_name,'ผู้ป่วย'),
        'isFirstDose', is_first_dose,
        'doseNumber', dose_count,
        'hasNextAppointment', (next_appointment.appointment_date IS NOT NULL)
      )
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return new;
end $function$;

-- ========================================
-- Function 2: hydrate_appointment_contacts
-- ========================================

CREATE OR REPLACE FUNCTION public.hydrate_appointment_contacts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
begin
  -- **FIX: ใช้ phone_number และ patient_name แทน phone และ full_name**
  -- พยายามหาโดยเรียงลำดับความเชื่อมั่น: id_number > phone > line_user_id > name
  select pr.phone_number,
         pr.line_user_id,
         pr.patient_name as name
  into r
  from public.patient_registrations pr
  where (NEW.patient_id_number is not null and pr.registration_id = NEW.patient_id_number)
     or (NEW.patient_phone     is not null and pr.phone_number    = NEW.patient_phone)
     or (NEW.line_user_id      is not null and pr.line_user_id    = NEW.line_user_id)
     or (NEW.patient_name      is not null and pr.patient_name ilike NEW.patient_name)
  order by
    (case
       when NEW.patient_id_number is not null and pr.registration_id = NEW.patient_id_number then 4
       when NEW.patient_phone     is not null and pr.phone_number    = NEW.patient_phone     then 3
       when NEW.line_user_id      is not null and pr.line_user_id    = NEW.line_user_id      then 2
       else 1
     end) desc
  limit 1;

  if r is not null then
    NEW.patient_phone := coalesce(NEW.patient_phone, r.phone_number);
    NEW.line_user_id  := coalesce(NEW.line_user_id,  r.line_user_id);
    NEW.patient_name  := coalesce(NEW.patient_name,  r.name);
  end if;

  return NEW;
end $function$;

-- ========================================
-- ตรวจสอบว่า functions ถูกอัพเดทเรียบร้อย
-- ========================================

SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%pr.phone %' OR prosrc LIKE '%pr.phone)%' OR prosrc LIKE '%pr.phone,%' THEN '❌ STILL HAS OLD pr.phone'
    ELSE '✅ OK - using pr.phone_number'
  END AS phone_status,
  CASE
    WHEN prosrc LIKE '%pr.full_name%' THEN '❌ STILL HAS OLD pr.full_name'
    ELSE '✅ OK - using pr.patient_name'
  END AS name_status
FROM pg_proc
WHERE proname IN ('enqueue_appointment_notifications', 'hydrate_appointment_contacts', 'notify_completion_with_next_appointment')
ORDER BY proname;
