-- ตรวจสอบตารางทั้งหมดที่เกี่ยวกับ patient
-- Error: relation "patients" does not exist
-- รันใน Supabase SQL Editor

-- 1. ดูตารางทั้งหมดที่มีคำว่า "patient" ในชื่อ
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%patient%'
ORDER BY table_name;

-- 2. ดู columns ของแต่ละตาราง patient*
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE '%patient%'
ORDER BY table_name, ordinal_position;

-- 3. เช็คว่า patient_registrations มี columns อะไรบ้าง
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patient_registrations'
ORDER BY ordinal_position;

-- 4. นับจำนวน records ในแต่ละตาราง
SELECT 'patient_registrations' as table_name, COUNT(*) as record_count FROM patient_registrations;
