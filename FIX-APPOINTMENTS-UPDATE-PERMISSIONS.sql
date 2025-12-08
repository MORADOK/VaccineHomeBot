-- Fix: อนุญาตให้ UPDATE สถานะนัดหมายได้ (สำหรับคอนเฟิร์มย้อนหลัง)
-- รันใน Supabase SQL Editor

-- 1. ลบ policies เก่าที่เกี่ยวกับ appointments
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON appointments;

-- สำหรับ anon users (ผู้ใช้ทั่วไป)
DROP POLICY IF EXISTS "Enable read access for anon users" ON appointments;
DROP POLICY IF EXISTS "Enable insert access for anon users" ON appointments;
DROP POLICY IF EXISTS "Enable update access for anon users" ON appointments;
DROP POLICY IF EXISTS "Enable delete access for anon users" ON appointments;

-- 2. เปิดใช้งาน RLS (ถ้ายังไม่ได้เปิด)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 3. สร้าง policies ใหม่ที่อนุญาตให้ทำงานได้ทั้งหมด

-- สำหรับ anon role (ไม่ต้อง login)
CREATE POLICY "Enable full read access for anon users"
ON appointments FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable full insert for anon users"
ON appointments FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Enable full update for anon users"
ON appointments FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable full delete for anon users"
ON appointments FOR DELETE
TO anon
USING (true);

-- สำหรับ authenticated role (login แล้ว)
CREATE POLICY "Enable full read access for authenticated users"
ON appointments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable full insert for authenticated users"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable full update for authenticated users"
ON appointments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable full delete for authenticated users"
ON appointments FOR DELETE
TO authenticated
USING (true);

-- 4. ให้สิทธิ์ GRANT ทั้งหมด
GRANT ALL ON appointments TO anon;
GRANT ALL ON appointments TO authenticated;

-- 5. ตรวจสอบว่า policies ถูกสร้างแล้ว
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- 6. ทดสอบ UPDATE
-- SELECT appointment_id, status FROM appointments LIMIT 5;
-- UPDATE appointments SET status = 'completed' WHERE appointment_id = 'YOUR_APPOINTMENT_ID';
