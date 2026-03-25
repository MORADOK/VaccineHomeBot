-- ==================================================================================
-- สคริปต์ตรวจสอบและแก้ไขปัญหาการนับโดสและวันนัดที่ไม่ตรง
-- ==================================================================================
-- วันที่: 25 มีนาคม 2026
-- วัตถุประสงค์: ตรวจสอบข้อมูล appointments ที่มีการบันทึกซ้ำซ้อน
-- ==================================================================================

-- ====================
-- ส่วนที่ 1: ตรวจสอบข้อมูล
-- ====================

-- 1.1 หาผู้ป่วยที่มีการบันทึก "ฉีดแล้ว" (completed) ซ้ำซ้อน
SELECT
    patient_id_number,
    patient_name,
    vaccine_type,
    COUNT(*) as completed_count,
    STRING_AGG(appointment_date::text, ', ' ORDER BY appointment_date) as all_dates,
    STRING_AGG(id::text, ', ') as all_ids
FROM appointments
WHERE status = 'completed'
GROUP BY patient_id_number, patient_name, vaccine_type
HAVING COUNT(*) > 1
ORDER BY patient_name, vaccine_type;

-- คำอธิบาย:
-- - ถ้าผลลัพธ์แสดงผู้ป่วย = มีข้อมูลซ้ำซ้อน
-- - ถ้า all_dates มีวันที่เดียวกันซ้ำกัน = ต้องลบข้อมูลซ้ำ
-- - ถ้า all_dates เป็นคนละวัน = ปกติ (ฉีดหลายเข็มจริงๆ)

\echo ''
\echo '==================================='
\echo 'หมายเหตุ: ถ้าผลลัพธ์ว่างเปล่า = ไม่มีข้อมูลซ้ำซ้อน (ดี!)'
\echo 'ถ้ามีผลลัพธ์ = ตรวจสอบต่อด้วยคำสั่งถัดไป'
\echo '==================================='
\echo ''

-- 1.2 หาการบันทึกซ้ำในวันเดียวกัน (ปัญหาร้ายแรง!)
SELECT
    patient_id_number,
    patient_name,
    vaccine_type,
    appointment_date,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as duplicate_ids,
    STRING_AGG(created_at::text, ', ' ORDER BY created_at) as created_times
FROM appointments
WHERE status = 'completed'
GROUP BY patient_id_number, patient_name, vaccine_type, appointment_date
HAVING COUNT(*) > 1
ORDER BY patient_name, vaccine_type, appointment_date;

-- คำอธิบาย:
-- - ถ้าผลลัพธ์แสดงผู้ป่วย = มีการบันทึก "ฉีดแล้ว" ซ้ำในวันเดียวกัน
-- - นี่คือปัญหาที่ทำให้โดสแสดงผิด!

\echo ''
\echo '==================================='
\echo 'หมายเหตุ: ถ้าผลลัพธ์ว่างเปล่า = ไม่มีการบันทึกซ้ำในวันเดียวกัน'
\echo 'ถ้ามีผลลัพธ์ = นี่คือสาเหตุที่ทำให้โดสแสดงผิด!'
\echo '==================================='
\echo ''

-- 1.3 ดูข้อมูลทั้งหมดของผู้ป่วยที่มีปัญหา (เปลี่ยน patient_id_number ตามผลลัพธ์ข้างบน)
-- ⚠️ ต้องแก้ไข WHERE clause ให้ตรงกับผู้ป่วยที่มีปัญหาจริง
/*
SELECT
    id,
    patient_id_number,
    patient_name,
    vaccine_type,
    appointment_date,
    status,
    notes,
    created_at,
    updated_at
FROM appointments
WHERE patient_id_number = 'PATIENT_ID_HERE'  -- ⚠️ แก้ไขที่นี่
  AND vaccine_type = 'VACCINE_TYPE_HERE'     -- ⚠️ แก้ไขที่นี่
ORDER BY appointment_date, created_at;
*/

-- ====================
-- ส่วนที่ 2: สถิติทั่วไป
-- ====================

-- 2.1 สรุปข้อมูลนัดทั้งหมด
SELECT
    status,
    COUNT(*) as count
FROM appointments
GROUP BY status
ORDER BY status;

\echo ''
\echo '==================================='
\echo 'สถิติการนัดทั้งหมด'
\echo '==================================='
\echo ''

-- 2.2 สรุปวัคซีนแต่ละประเภท
SELECT
    vaccine_type,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
FROM appointments
GROUP BY vaccine_type
ORDER BY total_appointments DESC;

\echo ''
\echo '==================================='
\echo 'สถิติการนัดแยกตามวัคซีน'
\echo '==================================='
\echo ''

-- 2.3 หาผู้ป่วยที่ฉีดวัคซีนพิษสุนัขบ้า
SELECT
    patient_id_number,
    patient_name,
    COUNT(*) as rabies_doses,
    STRING_AGG(appointment_date::text, ', ' ORDER BY appointment_date) as dates
FROM appointments
WHERE vaccine_type = 'rabies'
  AND status = 'completed'
GROUP BY patient_id_number, patient_name
ORDER BY rabies_doses DESC, patient_name;

\echo ''
\echo '==================================='
\echo 'ผู้ป่วยที่ฉีดวัคซีนพิษสุนัขบ้า'
\echo '==================================='
\echo ''

-- ====================
-- ส่วนที่ 3: แก้ไขข้อมูลซ้ำซ้อน
-- ====================

-- ⚠️ ระวัง! อย่ารันคำสั่งนี้ก่อนตรวจสอบให้แน่ใจ
-- ⚠️ ควร backup ข้อมูลก่อน

-- 3.1 ลบข้อมูลซ้ำซ้อน (เก็บเฉพาะแถวแรก)
/*
WITH duplicates AS (
  SELECT
    id,
    patient_id_number,
    vaccine_type,
    appointment_date,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY patient_id_number, vaccine_type, appointment_date, status
      ORDER BY created_at ASC
    ) as rn
  FROM appointments
  WHERE status = 'completed'
)
DELETE FROM appointments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
)
RETURNING id, patient_name, vaccine_type, appointment_date;
*/

-- คำอธิบาย:
-- - คำสั่งนี้จะลบข้อมูลซ้ำซ้อนทั้งหมด
-- - เก็บเฉพาะแถวที่สร้างก่อน (created_at เก่าที่สุด)
-- - RETURNING จะแสดงข้อมูลที่ถูกลบ

\echo ''
\echo '==================================='
\echo 'คำสั่งลบข้อมูลซ้ำถูก comment ไว้'
\echo 'ต้องตรวจสอบให้แน่ใจก่อนรัน!'
\echo '==================================='
\echo ''

-- 3.2 วิธีที่ปลอดภัยกว่า: เปลี่ยน status เป็น cancelled แทนการลบ
/*
WITH duplicates AS (
  SELECT
    id,
    patient_id_number,
    vaccine_type,
    appointment_date,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY patient_id_number, vaccine_type, appointment_date, status
      ORDER BY created_at ASC
    ) as rn
  FROM appointments
  WHERE status = 'completed'
)
UPDATE appointments
SET
    status = 'cancelled',
    notes = COALESCE(notes, '') || ' (ยกเลิกเนื่องจากข้อมูลซ้ำซ้อน - แก้ไขเมื่อ ' || NOW()::date || ')'
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
)
RETURNING id, patient_name, vaccine_type, appointment_date, notes;
*/

-- ====================
-- ส่วนที่ 4: ป้องกันข้อมูลซ้ำในอนาคต
-- ====================

-- 4.1 เพิ่ม unique constraint (ถ้ายังไม่มี)
-- ⚠️ รันได้ก็ต่อเมื่อแก้ไขข้อมูลซ้ำเรียบร้อยแล้ว

/*
ALTER TABLE appointments
ADD CONSTRAINT unique_patient_vaccine_date_status
UNIQUE (patient_id_number, vaccine_type, appointment_date, status);
*/

-- คำอธิบาย:
-- - Constraint นี้จะป้องกันไม่ให้มีการบันทึกซ้ำในวันเดียวกันกับ status เดียวกัน
-- - ถ้ามีข้อมูลซ้ำอยู่แล้ว คำสั่งนี้จะ error ต้องลบข้อมูลซ้ำก่อน

\echo ''
\echo '==================================='
\echo 'คำสั่ง ALTER TABLE ถูก comment ไว้'
\echo 'รันได้หลังจากลบข้อมูลซ้ำเรียบร้อยแล้วเท่านั้น!'
\echo '==================================='
\echo ''

-- ====================
-- ส่วนที่ 5: ตรวจสอบผลลัพธ์หลังแก้ไข
-- ====================

-- 5.1 ตรวจสอบอีกครั้งว่ายังมีข้อมูลซ้ำหรือไม่
/*
SELECT
    patient_id_number,
    patient_name,
    vaccine_type,
    appointment_date,
    COUNT(*) as count
FROM appointments
WHERE status = 'completed'
GROUP BY patient_id_number, patient_name, vaccine_type, appointment_date
HAVING COUNT(*) > 1;
*/

-- ถ้าผลลัพธ์ว่างเปล่า = แก้ไขสำเร็จ! ✅

\echo ''
\echo '==================================='
\echo 'สิ้นสุดสคริปต์ตรวจสอบ'
\echo 'อย่าลืม backup ข้อมูลก่อนแก้ไข!'
\echo '==================================='
\echo ''

-- ==================================================================================
-- วิธีใช้งาน:
-- ==================================================================================
-- 1. รันส่วนที่ 1 เพื่อตรวจสอบข้อมูลซ้ำซ้อน
-- 2. ถ้าพบข้อมูลซ้ำ ให้ uncomment และรันส่วนที่ 3.2 (เปลี่ยน status เป็น cancelled)
-- 3. ตรวจสอบผลลัพธ์ด้วยส่วนที่ 5.1
-- 4. ถ้าแก้ไขเรียบร้อยแล้ว ให้ uncomment และรันส่วนที่ 4.1 (เพิ่ม constraint)
-- ==================================================================================
