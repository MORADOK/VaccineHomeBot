-- Fix: แก้ไข send_line_notification function
-- เปลี่ยน FROM patients → FROM patient_registrations
-- เปลี่ยน pr.patient_id → pr.registration_id (เพราะ patient_registrations ไม่มี patient_id)
-- รันใน Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.send_line_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  patient_phone text;
  patient_line_id text;
BEGIN
  -- **FIX: ใช้ patient_registrations แทน patients**
  -- ดึงข้อมูลผู้ป่วยจากตาราง patient_registrations
  SELECT pr.phone_number, pr.line_user_id
  INTO patient_phone, patient_line_id
  FROM patient_registrations pr
  WHERE pr.registration_id = NEW.patient_id_number
     OR (NEW.patient_phone IS NOT NULL AND pr.phone_number = NEW.patient_phone)
     OR (NEW.line_user_id IS NOT NULL AND pr.line_user_id = NEW.line_user_id);

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
$function$;

-- ตรวจสอบว่า function ถูกอัพเดทแล้ว
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%FROM patients%' OR prosrc LIKE '%from patients%' THEN '❌ STILL USING patients'
    WHEN prosrc LIKE '%FROM patient_registrations%' OR prosrc LIKE '%from patient_registrations%' THEN '✅ OK - using patient_registrations'
    ELSE '⚠️ UNKNOWN'
  END AS table_status
FROM pg_proc
WHERE proname = 'send_line_notification';
