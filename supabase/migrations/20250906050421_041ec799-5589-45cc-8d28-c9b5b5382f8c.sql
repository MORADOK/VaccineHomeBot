-- Update the appointment reminder scheduling to include same-day 8:00 AM reminder
-- and adjust timing logic
CREATE OR REPLACE FUNCTION public.schedule_appointment_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reminder_1day timestamptz;
  reminder_8hrs timestamptz;
  reminder_same_day timestamptz;
  appointment_datetime timestamptz;
BEGIN
  -- Only schedule reminders for scheduled appointments with contact info
  IF NEW.status = 'scheduled' AND (NEW.line_user_id IS NOT NULL OR NEW.patient_phone IS NOT NULL) THEN
    
    -- Calculate appointment datetime (default to 09:00 if no time specified)
    appointment_datetime := NEW.appointment_date + COALESCE(NEW.appointment_time, time '09:00');
    
    -- Calculate reminder times
    reminder_1day := (NEW.appointment_date - interval '1 day') + time '08:00'; -- 1 day before at 8:00 AM
    reminder_8hrs := appointment_datetime - interval '8 hours'; -- 8 hours before appointment
    reminder_same_day := NEW.appointment_date + time '08:00'; -- Same day at 8:00 AM
    
    -- Schedule 1-day before reminder at 8:00 AM
    IF reminder_1day > NOW() THEN
      INSERT INTO public.notification_jobs (
        idempotency_key,
        kind,
        channel,
        line_user_id,
        appointment_id,
        schedule_at,
        payload
      ) VALUES (
        NEW.appointment_id || '|reminder_1day',
        'appointment_reminder',
        CASE WHEN NEW.line_user_id IS NOT NULL THEN 'line' ELSE 'sms' END,
        NEW.line_user_id,
        NEW.appointment_id,
        reminder_1day,
        jsonb_build_object(
          'userId', NEW.line_user_id,
          'phone', NEW.patient_phone,
          'type', 'template',
          'reminderType', '1day',
          'message', '🔔 แจ้งเตือนการนัดหมาย' || chr(10) || 
                    'พรุ่งนี้คุณมีนัดฉีดวัคซีน' || chr(10) ||
                    'วัคซีน: ' || COALESCE(NEW.vaccine_name, NEW.vaccine_type) || chr(10) ||
                    'วันที่: ' || to_char(NEW.appointment_date, 'DD Mon YYYY') || 
                    COALESCE(' เวลา ' || to_char(NEW.appointment_time, 'HH24:MI'), '') || chr(10) ||
                    '📍 โรงพยาบาลโฮม' || chr(10) ||
                    'กรุณาเตรียมตัวให้พร้อม',
          'templateData', jsonb_build_object(
            'patientName', NEW.patient_name,
            'vaccineName', COALESCE(NEW.vaccine_name, NEW.vaccine_type),
            'appointmentDate', NEW.appointment_date,
            'appointmentTime', NEW.appointment_time,
            'reminderType', '1day'
          )
        )
      ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
    
    -- Schedule 8-hours before reminder (for preparation)
    IF reminder_8hrs > NOW() AND reminder_8hrs != reminder_same_day THEN
      INSERT INTO public.notification_jobs (
        idempotency_key,
        kind,
        channel,
        line_user_id,
        appointment_id,
        schedule_at,
        payload
      ) VALUES (
        NEW.appointment_id || '|reminder_8hrs',
        'appointment_reminder',
        CASE WHEN NEW.line_user_id IS NOT NULL THEN 'line' ELSE 'sms' END,
        NEW.line_user_id,
        NEW.appointment_id,
        reminder_8hrs,
        jsonb_build_object(
          'userId', NEW.line_user_id,
          'phone', NEW.patient_phone,
          'type', 'template',
          'reminderType', '8hrs',
          'message', '⏰ เตรียมความพร้อม' || chr(10) || 
                    'อีก 8 ชั่วโมงคุณมีนัดฉีดวัคซีน' || chr(10) ||
                    'วัคซีน: ' || COALESCE(NEW.vaccine_name, NEW.vaccine_type) || chr(10) ||
                    'วันที่: ' || to_char(NEW.appointment_date, 'DD Mon YYYY') || 
                    COALESCE(' เวลา ' || to_char(NEW.appointment_time, 'HH24:MI'), '') || chr(10) ||
                    '📍 โรงพยาบาลโฮม' || chr(10) ||
                    'กรุณาเตรียมตัวให้พร้อม',
          'templateData', jsonb_build_object(
            'patientName', NEW.patient_name,
            'vaccineName', COALESCE(NEW.vaccine_name, NEW.vaccine_type),
            'appointmentDate', NEW.appointment_date,
            'appointmentTime', NEW.appointment_time,
            'reminderType', '8hrs'
          )
        )
      ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
    
    -- Schedule same-day reminder at 8:00 AM (only once per day)
    IF reminder_same_day > NOW() THEN
      INSERT INTO public.notification_jobs (
        idempotency_key,
        kind,
        channel,
        line_user_id,
        appointment_id,
        schedule_at,
        payload
      ) VALUES (
        NEW.appointment_id || '|reminder_same_day',
        'appointment_reminder',
        CASE WHEN NEW.line_user_id IS NOT NULL THEN 'line' ELSE 'sms' END,
        NEW.line_user_id,
        NEW.appointment_id,
        reminder_same_day,
        jsonb_build_object(
          'userId', NEW.line_user_id,
          'phone', NEW.patient_phone,
          'type', 'template',
          'reminderType', 'same_day',
          'message', '📅 วันนัดหมายฉีดวัคซีน' || chr(10) || 
                    'วันนี้คุณมีนัดฉีดวัคซีน' || chr(10) ||
                    'วัคซีน: ' || COALESCE(NEW.vaccine_name, NEW.vaccine_type) || chr(10) ||
                    'วันที่: ' || to_char(NEW.appointment_date, 'DD Mon YYYY') || 
                    COALESCE(' เวลา ' || to_char(NEW.appointment_time, 'HH24:MI'), '') || chr(10) ||
                    '📍 โรงพยาบาลโฮม' || chr(10) ||
                    'ขอให้เดินทางมาตรงเวลา',
          'templateData', jsonb_build_object(
            'patientName', NEW.patient_name,
            'vaccineName', COALESCE(NEW.vaccine_name, NEW.vaccine_type),
            'appointmentDate', NEW.appointment_date,
            'appointmentTime', NEW.appointment_time,
            'reminderType', 'same_day'
          )
        )
      ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update CRON job to run every hour instead of every 15 minutes
-- First, remove the existing job
SELECT cron.unschedule('process-notifications');

-- Schedule to run every hour at the 5-minute mark (to avoid peak times)
SELECT cron.schedule(
  'process-notifications',
  '5 * * * *', -- every hour at 5 minutes past
  $$
  SELECT
    net.http_post(
        url:='https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/notification-processor',
        headers:='{"Content-Type": "application/json", "cron-secret": "' || current_setting('app.settings.cron_secret', true) || '"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);