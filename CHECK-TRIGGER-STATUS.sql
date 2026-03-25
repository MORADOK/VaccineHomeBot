-- ตรวจสอบว่า trigger และ function ถูกอัพเดทหรือยัง
-- รันใน Supabase SQL Editor

-- 1. ตรวจสอบ function send_line_notification ว่ายังใช้ pr.phone หรือไม่
SELECT
  proname AS function_name,
  prosrc AS source_code
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 2. ตรวจสอบ triggers ทั้งหมดที่เกี่ยวกับ appointments
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;

-- 3. ตรวจสอบว่ามี function อื่นที่ใช้ pr.phone อยู่ไหม
SELECT
  proname AS function_name,
  prosrc AS source_code
FROM pg_proc
WHERE prosrc LIKE '%pr.phone%'
   OR prosrc LIKE '%pr.full_name%';

-- 4. ถ้ายังมี function ที่ใช้ pr.phone ให้ลบและสร้างใหม่
-- DROP FUNCTION IF EXISTS <function_name>();
