-- ตรวจสอบว่า function send_line_notification ถูกอัพเดทแล้ว
-- รันใน Supabase SQL Editor

-- 1. ตรวจสอบว่าใช้ column ที่ถูกต้อง
SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%patient_phone,%' THEN '❌ STILL USING patient_phone column'
    WHEN prosrc LIKE '%sent_to,%' THEN '✅ OK - using sent_to column'
    ELSE '⚠️ UNKNOWN'
  END AS column_status,
  CASE
    WHEN prosrc LIKE '%FROM patients %' OR prosrc LIKE '%FROM patients%' THEN '❌ STILL USING patients table'
    WHEN prosrc LIKE '%FROM patient_registrations%' THEN '✅ OK - using patient_registrations table'
    ELSE '⚠️ UNKNOWN'
  END AS table_status
FROM pg_proc
WHERE proname = 'send_line_notification';

-- 2. ดู source code เพื่อยืนยัน
SELECT substring(prosrc from 1 for 800) AS function_source
FROM pg_proc
WHERE proname = 'send_line_notification';
