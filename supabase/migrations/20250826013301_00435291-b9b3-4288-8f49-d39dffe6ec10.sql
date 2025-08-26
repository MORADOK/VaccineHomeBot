-- Update the on_appointment_completed trigger to improve first-dose notification messaging
-- This addresses requirement 9: ปรับข้อความเตือนคนไข้กรณีฉีดเข็มแรกว่านี่คือเข็มแรกไม่ใช่แจ้งนัดหมายฉีด

DROP TRIGGER IF EXISTS enqueue_appointment_notifications_trigger ON appointments;
DROP FUNCTION IF EXISTS enqueue_appointment_notifications();

CREATE OR REPLACE FUNCTION public.enqueue_appointment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  vname     text;
  alt_text  text;
  v_channel text;
  v_phone   text;
  v_line    text;
  dose_count integer := 0;
  is_first_dose boolean := false;
begin
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

  -- Create appropriate message based on whether this is first dose or follow-up appointment
  if is_first_dose then
    alt_text := '✅ บันทึกการฉีดวัคซีนเข็มแรกเสร็จสิ้น' || chr(10) ||
                'วัคซีน: ' || coalesce(vname, new.vaccine_type, 'วัคซีน') || chr(10) ||
                'วันที่: ' || to_char(new.appointment_date, 'DD Mon YYYY') ||
                coalesce(' เวลา '||to_char(new.appointment_time, 'HH24:MI'), '') || chr(10) ||
                '📍 โรงพยาบาลโฮม' || chr(10) || chr(10) ||
                'ระบบจะแจ้งเตือนเมื่อถึงเวลานัดเข็มถัดไป';
  else
    alt_text := '📅 นัดหมายฉีดวัคซีนครั้งถัดไป' || chr(10) ||
                'วัคซีน: ' || coalesce(vname, new.vaccine_type, 'วัคซีน') || chr(10) ||
                'วันที่: ' || to_char(new.appointment_date, 'DD Mon YYYY') ||
                coalesce(' เวลา '||to_char(new.appointment_time, 'HH24:MI'), '') || chr(10) ||
                '📍 โรงพยาบาลโฮม';
  end if;

  -- Fallback: เผื่อ BEFORE ไม่เจอ ให้ลองดูทะเบียนอีกครั้งเพื่อใช้กับ notification
  if coalesce(new.line_user_id,'') = '' or coalesce(new.patient_phone,'') = '' then
    select pr.phone, pr.line_user_id
      into v_phone, v_line
    from public.patient_registrations pr
    where (pr.registration_id = new.patient_id_number)
       or (new.patient_phone is not null and pr.phone = new.patient_phone)
       or (new.line_user_id  is not null and pr.line_user_id = new.line_user_id)
       or (new.patient_name  is not null and pr.full_name ilike new.patient_name)
    limit 1;
  end if;

  -- ตัดสินว่าจะส่งช่องไหน
  if coalesce(new.line_user_id, v_line, '') <> '' then
    v_channel := 'line';

    insert into public.notification_jobs (
      idempotency_key, kind, channel, line_user_id, appointment_id, schedule_at, payload
    )
    values (
      coalesce(new.line_user_id, v_line) || '|' || new.appointment_id || '|confirm',
      case when is_first_dose then 'first_dose_complete' else 'confirm' end,
      v_channel,
      coalesce(new.line_user_id, v_line),
      new.appointment_id,
      now() + interval '1 minute',
      jsonb_build_object(
        'userId', coalesce(new.line_user_id, v_line),
        'type', 'template',
        'message', alt_text,
        'isFirstDose', is_first_dose,
        'templateData', jsonb_build_object(
          'patientName', coalesce(new.patient_name,'ผู้ป่วย'),
          'vaccineName', coalesce(vname, new.vaccine_type, 'วัคซีน'),
          'vaccineType', new.vaccine_type,
          'appointmentDate', new.appointment_date,
          'appointmentTime', new.appointment_time,
          'doseNumber', dose_count,
          'isFirstDose', is_first_dose,
          'detailUrl', '<<PUT-DETAIL-URL-HERE>>',
          'mapQuery',  'โรงพยาบาลโฮม'
        )
      )
    )
    on conflict (idempotency_key) do nothing;

  elsif coalesce(new.patient_phone, v_phone, '') <> '' then
    -- ไม่มี LINE แต่มีเบอร์: คุณจะ "คิว SMS" หรือ "ข้าม" ก็เลือกได้
    v_channel := 'sms';

    insert into public.notification_jobs (
      idempotency_key, kind, channel, line_user_id, appointment_id, schedule_at, payload
    )
    values (
      coalesce(new.patient_phone, v_phone) || '|' || new.appointment_id || '|confirm',
      case when is_first_dose then 'first_dose_complete' else 'confirm' end,
      v_channel,
      null,
      new.appointment_id,
      now() + interval '1 minute',
      jsonb_build_object(
        'phone', coalesce(new.patient_phone, v_phone),
        'message', alt_text,
        'patientName', coalesce(new.patient_name,'ผู้ป่วย'),
        'isFirstDose', is_first_dose,
        'doseNumber', dose_count
      )
    )
    on conflict (idempotency_key) do nothing;
  else
    -- ไม่รู้จะติดต่อทางไหน → ข้าม หรือบันทึกเป็น channel='none'
    insert into public.notification_jobs (
      idempotency_key, kind, channel, line_user_id, appointment_id, schedule_at, payload
    ) values (
      new.appointment_id || '|none|confirm',
      case when is_first_dose then 'first_dose_complete' else 'confirm' end,
      'none',
      null,
      new.appointment_id,
      now(),
      jsonb_build_object('reason','no-contact-info', 'isFirstDose', is_first_dose)
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return new;
end $function$;

-- Recreate the trigger
CREATE TRIGGER enqueue_appointment_notifications_trigger
    AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION enqueue_appointment_notifications();