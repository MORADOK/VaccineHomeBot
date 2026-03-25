-- Fix: แก้ไข column name ใน triggers/functions จาก pr.phone เป็น pr.phone_number
-- Error: column pr.phone does not exist (error code 42703)
-- รันใน Supabase SQL Editor

-- ค้นหา functions ที่ใช้ pr.phone
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc LIKE '%pr.phone%'
ORDER BY proname;

-- ลบ trigger และ function เก่า (ถ้ามี)
DROP TRIGGER IF EXISTS send_line_notification_on_appointment ON appointments;
DROP FUNCTION IF EXISTS send_line_notification();

-- สร้าง function ใหม่ที่ใช้ phone_number แทน phone
CREATE OR REPLACE FUNCTION send_line_notification()
RETURNS TRIGGER AS $$
DECLARE
  patient_phone text;
  patient_line_id text;
BEGIN
  -- ดึงข้อมูลผู้ป่วยจากตาราง patients โดยใช้ phone_number แทน phone
  SELECT pr.phone_number, pr.line_user_id
  INTO patient_phone, patient_line_id
  FROM patients pr
  WHERE pr.patient_id = NEW.patient_id
     OR (NEW.patient_phone IS NOT NULL AND pr.phone_number = NEW.patient_phone);

  -- บันทึก log สำหรับการส่ง notification
  INSERT INTO appointment_notifications (
    appointment_id,
    patient_phone,
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
$$ LANGUAGE plpgsql;

-- สร้าง trigger ใหม่
CREATE TRIGGER send_line_notification_on_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_line_notification();

-- ตรวจสอบว่า trigger ถูกสร้างแล้ว
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'send_line_notification_on_appointment';

-- ตรวจสอบว่า function ถูกสร้างแล้ว
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'send_line_notification';
