-- Fix: แก้ไข notification_type ให้ใช้ค่าที่ถูกต้อง
-- Error: violates check constraint - ต้องใช้หนึ่งใน: reminder, confirmation, cancellation, rescheduled
-- เปลี่ยน 'appointment_created' → 'confirmation'
-- รันใน Supabase SQL Editor

-- 1. ลบ function และ trigger เก่า
DROP TRIGGER IF EXISTS send_line_notification_on_appointment ON appointments CASCADE;
DROP FUNCTION IF EXISTS public.send_line_notification() CASCADE;

-- 2. สร้าง function ใหม่ที่ใช้ notification_type ที่ถูกต้อง
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

  -- **FIX: ใช้ 'confirmation' แทน 'appointment_created'**
  -- notification_type ต้องเป็น: reminder, confirmation, cancellation, rescheduled
  INSERT INTO appointment_notifications (
    appointment_id,
    sent_to,
    line_user_id,
    notification_type,
    status
  ) VALUES (
    NEW.id,
    COALESCE(patient_phone, NEW.patient_phone),
    patient_line_id,
    'confirmation',  -- เปลี่ยนจาก 'appointment_created' เป็น 'confirmation'
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
    WHEN prosrc LIKE '%''confirmation''%' THEN '✅ CORRECT - using confirmation'
    WHEN prosrc LIKE '%''appointment_created''%' THEN '❌ WRONG - using appointment_created'
    ELSE '⚠️ UNKNOWN'
  END AS notification_type_check
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 5. ตรวจสอบ trigger
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'send_line_notification_on_appointment';
