-- ค้นหา functions ที่ใช้ตาราง "patients" ที่ไม่มีอยู่
-- Error: relation "patients" does not exist
-- รันใน Supabase SQL Editor

-- 1. ค้นหา functions ที่อ้างถึง "patients" table (ตารางที่ไม่มี)
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%from patients%' OR prosrc LIKE '%FROM patients%'
         OR prosrc LIKE '%join patients%' OR prosrc LIKE '%JOIN patients%'
         OR prosrc LIKE '%public.patients%' THEN '❌ USES WRONG TABLE: patients'
    ELSE '✅ OK'
  END AS table_status
FROM pg_proc
WHERE prosrc LIKE '%patients%'
  AND (prosrc LIKE '%from patients%' OR prosrc LIKE '%FROM patients%'
       OR prosrc LIKE '%join patients%' OR prosrc LIKE '%JOIN patients%'
       OR prosrc LIKE '%public.patients%')
ORDER BY proname;

-- 2. แสดง source code ของ functions ที่มีปัญหา
SELECT
  proname AS function_name,
  substring(prosrc from 1 for 500) AS first_500_chars
FROM pg_proc
WHERE prosrc LIKE '%from patients%'
   OR prosrc LIKE '%FROM patients%'
   OR prosrc LIKE '%public.patients%'
ORDER BY proname;
