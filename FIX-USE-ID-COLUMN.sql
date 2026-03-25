-- Fix: ใช้ NEW.id แทน NEW.appointment_id
-- Error: column "appointment_id" is of type uuid but expression is of type text
-- เพราะ primary key จริงคือ "id" ไม่ใช่ "appointment_id"
-- รันใน Supabase SQL Editor

-- 1. ลบ function และ trigger เก่า
DROP TRIGGER IF EXISTS send_line_notification_on_appointment ON appointments CASCADE;
DROP FUNCTION IF EXISTS public.send_line_notification() CASCADE;

-- 2. สร้าง function ใหม่ที่ใช้ NEW.id (uuid) แทน NEW.appointment_id (text)
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

  -- **FIX: ใช้ NEW.id แทน NEW.appointment_id**
  -- NEW.id เป็น uuid (primary key)
  -- NEW.appointment_id เป็น text
  INSERT INTO appointment_notifications (
    appointment_id,
    sent_to,
    line_user_id,
    notification_type,
    status
  ) VALUES (
    NEW.id,  -- ใช้ id แทน appointment_id
    COALESCE(patient_phone, NEW.patient_phone),
    patient_line_id,
    'appointment_created',
    'pending'
  );

  RETURN NEW;
END;
$$;

-- 3. สร้าง trigger ใหม่
CREATE TRIGGER send_line_notification_on_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_line_notification();

-- 4. ตรวจสอบว่า function ถูกสร้างแล้ว
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%NEW.id,%' THEN '✅ CORRECT - using NEW.id'
    WHEN prosrc LIKE '%NEW.appointment_id,%' THEN '❌ WRONG - using NEW.appointment_id'
    ELSE '⚠️ UNKNOWN'
  END AS column_check
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 5. ตรวจสอบ trigger
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'send_line_notification_on_appointment';
