-- ตรวจสอบ type ของ appointment_id ในตาราง appointments
-- รันใน Supabase SQL Editor

-- 1. ดู data type ของ appointment_id ในตาราง appointments
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointments'
  AND column_name IN ('appointment_id', 'id')
ORDER BY ordinal_position;

-- 2. ดู data type ของ appointment_id ในตาราง appointment_notifications
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'appointment_notifications'
  AND column_name = 'appointment_id'
ORDER BY ordinal_position;

-- 3. ตรวจสอบ sample data
SELECT
  appointment_id,
  pg_typeof(appointment_id) as appointment_id_type,
  id,
  pg_typeof(id) as id_type
FROM appointments
LIMIT 3;

-- 4. ตรวจสอบว่า appointments มี primary key ชื่ออะไร
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'appointments'
  AND tc.constraint_type = 'PRIMARY KEY';
