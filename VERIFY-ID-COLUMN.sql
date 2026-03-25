-- ตรวจสอบว่า function ใช้ NEW.id แล้ว
-- รันใน Supabase SQL Editor

SELECT
  proname AS function_name,
  CASE
    WHEN prosrc LIKE '%NEW.id,%' OR prosrc LIKE '%NEW.id)%' THEN '✅ CORRECT - using NEW.id'
    WHEN prosrc LIKE '%NEW.appointment_id,%' OR prosrc LIKE '%NEW.appointment_id)%' THEN '❌ WRONG - using NEW.appointment_id'
    ELSE '⚠️ UNKNOWN'
  END AS column_check
FROM pg_proc
WHERE proname = 'send_line_notification';
