-- ตรวจสอบ check constraint ของ notification_type
-- Error: violates check constraint "appointment_notifications_notification_type_check"
-- รันใน Supabase SQL Editor

-- 1. ดู check constraint ทั้งหมดของตาราง appointment_notifications
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'appointment_notifications'::regclass
  AND contype = 'c';

-- 2. ดู enum values ถ้า notification_type เป็น enum
SELECT
  t.typname AS enum_name,
  e.enumlabel AS allowed_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%notification%'
ORDER BY t.typname, e.enumsortorder;

-- 3. ดู column type ของ notification_type
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointment_notifications'
  AND column_name = 'notification_type';

-- 4. ดู sample data ที่มีอยู่
SELECT DISTINCT notification_type
FROM appointment_notifications
LIMIT 10;
