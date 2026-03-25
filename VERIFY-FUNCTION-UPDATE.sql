-- ตรวจสอบว่า function ถูกอัพเดทจริงหรือไม่
-- รันใน Supabase SQL Editor

-- 1. ดู source code ของ function ปัจจุบัน
SELECT
  proname AS function_name,
  prosrc AS current_source_code
FROM pg_proc
WHERE proname = 'notify_completion_with_next_appointment';

-- 2. เช็คว่ายังมีคำว่า 'pr.phone' (ไม่ใช่ pr.phone_number) อยู่ไหม
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%pr.phone %' OR prosrc LIKE '%pr.phone)%' OR prosrc LIKE '%pr.phone,%' THEN 'FOUND OLD pr.phone (NEED TO FIX)'
    ELSE 'OK - using pr.phone_number'
  END AS status,
  CASE
    WHEN prosrc LIKE '%pr.full_name%' THEN 'FOUND OLD pr.full_name (NEED TO FIX)'
    ELSE 'OK - using pr.patient_name'
  END AS name_status
FROM pg_proc
WHERE proname = 'notify_completion_with_next_appointment';

-- 3. ดู triggers ทั้งหมดที่ใช้ function นี้
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%notify_completion_with_next_appointment%';

-- 4. ดู functions อื่นที่อาจมีปัญหา
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%pr.phone %' OR prosrc LIKE '%pr.phone)%' OR prosrc LIKE '%pr.phone,%' THEN 'HAS OLD pr.phone'
    ELSE 'OK'
  END AS phone_status
FROM pg_proc
WHERE prosrc LIKE '%patient_registrations%'
  AND (prosrc LIKE '%pr.phone%' OR prosrc LIKE '%pr.full_name%')
ORDER BY proname;
