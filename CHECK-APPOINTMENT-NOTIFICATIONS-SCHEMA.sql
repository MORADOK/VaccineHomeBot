-- ตรวจสอบ schema ของตาราง appointment_notifications
-- Error: column "patient_phone" does not exist
-- รันใน Supabase SQL Editor

-- 1. ดู columns ทั้งหมดของตาราง appointment_notifications
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointment_notifications'
ORDER BY ordinal_position;

-- 2. ตรวจสอบว่ามีตารางนี้หรือไม่
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%notification%'
ORDER BY table_name;

-- 3. ถ้ามีตาราง notification_jobs ให้ดู schema
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notification_jobs'
ORDER BY ordinal_position;
