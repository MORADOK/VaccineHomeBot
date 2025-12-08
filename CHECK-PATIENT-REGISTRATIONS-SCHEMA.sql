-- ตรวจสอบ Schema ของตาราง patient_registrations
-- รันใน Supabase SQL Editor เพื่อดูชื่อ column จริง

-- ดูโครงสร้างตาราง
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'patient_registrations'
ORDER BY ordinal_position;

-- ดูข้อมูลตัวอย่าง 1 แถว
SELECT * FROM patient_registrations LIMIT 1;

-- นับจำนวนข้อมูล
SELECT COUNT(*) as total_records FROM patient_registrations;
