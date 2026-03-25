-- ============================================================================
-- แก้ไข RLS Policy ของตาราง appointments
-- ============================================================================
-- ปัญหา: column pr.phone does not exist (error code 42703)
-- สาเหตุ: RLS Policy ใช้ alias "pr" ที่ไม่ถูกต้อง

-- ขั้นตอนที่ 1: ดูรายการ policies ทั้งหมด
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- ============================================================================

-- ขั้นตอนที่ 2: ปิด RLS ชั่วคราว (เพื่อให้ UPDATE ทำงาน)
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- ขั้นตอนที่ 3: ทดสอบการอัพเดต
UPDATE appointments 
SET status = 'completed'
WHERE id = 'test-id'
LIMIT 1;

-- ขั้นตอนที่ 4: เปิด RLS กลับ
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ============================================================================

-- ขั้นตอนที่ 5: ลบ policy ที่มีปัญหา (ถ้ามี)
-- DROP POLICY IF EXISTS "policy_name" ON appointments;

-- ============================================================================

-- ขั้นตอนที่ 6: สร้าง policy ใหม่ที่ถูกต้อง (ถ้าจำเป็น)
-- CREATE POLICY "allow_update_appointments" ON appointments
-- FOR UPDATE
-- USING (true)
-- WITH CHECK (true);

-- ============================================================================
-- หมายเหตุ:
-- - ถ้า RLS ปิดแล้ว ให้ข้ามขั้นตอนที่ 2 และ 4
-- - ถ้ายังมี error หลังจากปิด RLS ให้ตรวจสอบ database permissions
-- ============================================================================
