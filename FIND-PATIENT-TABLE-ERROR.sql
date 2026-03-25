-- ค้นหา functions/triggers ที่ใช้ตาราง "patient" (ผิด) แทน "patients" (ถูก)
-- Error: relation "patient" does not exist
-- รันใน Supabase SQL Editor

-- 1. ค้นหา functions ทั้งหมดที่อ้างอิง "patient" table
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%from patient %' OR prosrc LIKE '%FROM patient %'
         OR prosrc LIKE '%join patient %' OR prosrc LIKE '%JOIN patient %'
         OR prosrc LIKE '%from public.patient %' OR prosrc LIKE '%FROM public.patient %' THEN 'FOUND WRONG TABLE: patient'
    ELSE 'OK'
  END AS patient_table_status
FROM pg_proc
WHERE prosrc LIKE '%patient%'
  AND (prosrc LIKE '%from patient %' OR prosrc LIKE '%FROM patient %'
       OR prosrc LIKE '%join patient %' OR prosrc LIKE '%JOIN patient %'
       OR prosrc LIKE '%from public.patient %' OR prosrc LIKE '%FROM public.patient %')
ORDER BY proname;

-- 2. แสดง source code ของ functions ที่มีปัญหา
SELECT
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE prosrc LIKE '%patient%'
  AND (prosrc LIKE '%from patient %' OR prosrc LIKE '%FROM patient %'
       OR prosrc LIKE '%join patient %' OR prosrc LIKE '%JOIN patient %'
       OR prosrc LIKE '%from public.patient %' OR prosrc LIKE '%FROM public.patient %')
ORDER BY proname;

-- 3. ตรวจสอบว่ามีตารางชื่ออะไรที่เกี่ยวกับ patient
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%patient%'
ORDER BY table_name;

-- 4. ดู triggers ทั้งหมดบน appointments
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;
