-- Fix: บังคับอัพเดท send_line_notification function
-- ลบแล้วสร้างใหม่เพื่อให้แน่ใจว่าถูกแทนที่
-- รันใน Supabase SQL Editor

-- 1. ลบ function เก่าทิ้ง
DROP FUNCTION IF EXISTS public.send_line_notification() CASCADE;

-- 2. สร้าง function ใหม่ที่ถูกต้อง
CREATE OR REPLACE FUNCTION public.send_line_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  patient_phone text;
  patient_line_id text;
BEGIN
  -- ดึงข้อมูลผู้ป่วยจากตาราง patient_registrations
  SELECT pr.phone_number, pr.line_user_id
  INTO patient_phone, patient_line_id
  FROM patient_registrations pr
  WHERE pr.registration_id = NEW.patient_id_number
     OR (NEW.patient_phone IS NOT NULL AND pr.phone_number = NEW.patient_phone)
     OR (NEW.line_user_id IS NOT NULL AND pr.line_user_id = NEW.line_user_id);

  -- บันทึก log สำหรับการส่ง notification (ใช้ sent_to แทน patient_phone)
  INSERT INTO appointment_notifications (
    appointment_id,
    sent_to,
    line_user_id,
    notification_type,
    status
  ) VALUES (
    NEW.appointment_id,
    COALESCE(patient_phone, NEW.patient_phone),
    patient_line_id,
    'appointment_created',
    'pending'
  );

  RETURN NEW;
END;
$function$;

-- 3. สร้าง trigger ใหม่ (ถ้าถูกลบไปตอน CASCADE)
DROP TRIGGER IF EXISTS send_line_notification_on_appointment ON appointments;

CREATE TRIGGER send_line_notification_on_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_line_notification();

-- 4. ตรวจสอบว่า function ถูกสร้างใหม่แล้ว
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 5. ตรวจสอบ trigger
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'send_line_notification_on_appointment';
