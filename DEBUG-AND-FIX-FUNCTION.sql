-- Debug และแก้ไข send_line_notification แบบละเอียด
-- รันใน Supabase SQL Editor

-- 1. ดูว่ามี function ซ้ำหรือไม่ (หลายเวอร์ชัน)
SELECT
  proname,
  pronargs AS num_arguments,
  proargtypes,
  oid
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 2. ดู source code ปัจจุบัน
SELECT prosrc AS current_source
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 3. ลบทุกเวอร์ชันของ function
DROP FUNCTION IF EXISTS public.send_line_notification() CASCADE;
DROP FUNCTION IF EXISTS public.send_line_notification CASCADE;

-- 4. Commit เพื่อให้แน่ใจว่าถูกลบ
COMMIT;

-- 5. ตรวจสอบว่าถูกลบจริง
SELECT COUNT(*) as remaining_functions
FROM pg_proc
WHERE proname = 'send_line_notification';
-- ต้องได้ 0

-- 6. สร้าง function ใหม่ที่ถูกต้อง 100%
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
  -- ใช้ sent_to แทน patient_phone
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
$$;

-- 7. สร้าง trigger ใหม่
CREATE TRIGGER send_line_notification_on_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_line_notification();

-- 8. ตรวจสอบผลลัพธ์
SELECT
  proname AS function_name,
  prosrc AS source_code
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 9. ตรวจสอบว่าใช้ sent_to จริงหรือไม่
SELECT
  proname,
  CASE
    WHEN prosrc LIKE '%sent_to,%' THEN '✅ CORRECT - using sent_to'
    WHEN prosrc LIKE '%patient_phone,%' THEN '❌ WRONG - still using patient_phone'
    ELSE '⚠️ UNKNOWN'
  END AS verification
FROM pg_proc
WHERE proname = 'send_line_notification';
