-- Fix: แก้ไข type mismatch ของ appointment_id
-- Error: column "appointment_id" is of type uuid but expression is of type text
-- รันใน Supabase SQL Editor

-- 1. ตรวจสอบ type ของ columns
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointments'
  AND column_name IN ('appointment_id', 'id')
ORDER BY table_name, column_name;

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointment_notifications'
  AND column_name = 'appointment_id'
ORDER BY table_name, column_name;

-- 2. ดู source code ของ send_line_notification
SELECT prosrc
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 3. แก้ไข function โดย cast NEW.appointment_id เป็น uuid
DROP FUNCTION IF EXISTS public.send_line_notification() CASCADE;

CREATE FUNCTION public.send_line_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
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

  -- บันทึก log สำหรับการส่ง notification
  -- **FIX: แปลง appointment_id เป็น uuid ถ้าจำเป็น**
  INSERT INTO appointment_notifications (
    appointment_id,
    sent_to,
    line_user_id,
    notification_type,
    status
  ) VALUES (
    CASE
      WHEN pg_typeof(NEW.appointment_id) = 'uuid'::regtype THEN NEW.appointment_id
      ELSE NEW.appointment_id::uuid
    END,
    COALESCE(patient_phone, NEW.patient_phone),
    patient_line_id,
    'appointment_created',
    'pending'
  );

  RETURN NEW;
END;
$$;

-- 4. สร้าง trigger ใหม่
CREATE TRIGGER send_line_notification_on_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_line_notification();

-- 5. ตรวจสอบว่า function ถูกสร้างแล้ว
SELECT
  proname AS function_name,
  'Created successfully' AS status
FROM pg_proc
WHERE proname = 'send_line_notification';
