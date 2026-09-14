-- Fix reschedule_appointment_reminders trigger function
-- Problem: Cannot call trigger function directly with PERFORM
-- Solution: Inline the reminder scheduling logic

CREATE OR REPLACE FUNCTION public.reschedule_appointment_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reminder_1day timestamptz;
  reminder_8hrs timestamptz;
  appointment_datetime timestamptz;
BEGIN
  -- Remove old scheduled reminders if appointment date/time changed
  IF OLD.appointment_date != NEW.appointment_date OR OLD.appointment_time != NEW.appointment_time THEN
    DELETE FROM public.notification_jobs
    WHERE appointment_id = NEW.appointment_id
    AND kind = 'appointment_reminder'
    AND status = 'pending';

    -- Schedule new reminders if still scheduled (inline logic instead of calling trigger function)
    IF NEW.status = 'scheduled' AND (NEW.line_user_id IS NOT NULL OR NEW.patient_phone IS NOT NULL) THEN

      -- Calculate appointment datetime (default to 09:00 if no time specified)
      appointment_datetime := NEW.appointment_date + COALESCE(NEW.appointment_time, time '09:00');

      -- Calculate reminder times
      reminder_1day := appointment_datetime - interval '1 day';
      reminder_8hrs := appointment_datetime - interval '8 hours';

      -- Only schedule if reminder times are in the future
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
                      'กรุณามาตรงเวลา',
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

      IF reminder_8hrs > NOW() THEN
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
            'message', '⏰ แจ้งเตือนการนัดหมาย' || chr(10) ||
                      'อีก 8 ชั่วโมงคุณมีนัดฉีดวัคซีน' || chr(10) ||
                      'วัคซีน: ' || COALESCE(NEW.vaccine_name, NEW.vaccine_type) || chr(10) ||
                      'วันที่: ' || to_char(NEW.appointment_date, 'DD Mon YYYY') ||
                      COALESCE(' เวลา ' || to_char(NEW.appointment_time, 'HH24:MI'), '') || chr(10) ||
                      '📍 โรงพยาบาลโฮม' || chr(10) ||
                      'เตรียมตัวมาพร้อม',
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
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_reschedule_appointment_reminders ON public.appointments;
CREATE TRIGGER trigger_reschedule_appointment_reminders
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.reschedule_appointment_reminders();
