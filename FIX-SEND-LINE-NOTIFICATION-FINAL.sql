-- Fix: แก้ไข send_line_notification function ให้ใช้ columns ที่ถูกต้อง
-- Error: column "patient_phone" does not exist in appointment_notifications
-- เปลี่ยน patient_phone → sent_to
-- รันใน Supabase SQL Editor

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

  -- **FIX: ใช้ sent_to แทน patient_phone**
  -- บันทึก log สำหรับการส่ง notification
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

-- ตรวจสอบว่า function ถูกอัพเดทแล้ว
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%patient_phone,%' THEN '❌ STILL USING patient_phone column'
    WHEN prosrc LIKE '%sent_to,%' THEN '✅ OK - using sent_to column'
    ELSE '⚠️ UNKNOWN'
  END AS column_status
FROM pg_proc
WHERE proname = 'send_line_notification';
