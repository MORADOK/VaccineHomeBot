-- ============================================================================
-- SQL Query - อัพเดตวันนัดทั้งหมด (ปิด trigger)
-- ============================================================================

-- ขั้นตอนที่ 1: ดูข้อมูลวัคซีนทั้งหมด
SELECT 
  vaccine_type,
  vaccine_name,
  total_doses,
  dose_intervals
FROM vaccine_schedules
WHERE active = true
ORDER BY vaccine_name;

-- ============================================================================

-- ขั้นตอนที่ 2: ดูตัวอย่างนัดที่จะอัพเดต (ก่อนอัพเดต)
SELECT 
  a.id,
  a.patient_name,
  a.patient_id_number,
  a.vaccine_type,
  a.appointment_date,
  a.status,
  ROW_NUMBER() OVER (PARTITION BY a.patient_id_number, a.vaccine_type ORDER BY a.appointment_date) as dose_number
FROM appointments a
WHERE a.status IN ('completed', 'scheduled', 'pending')
ORDER BY a.patient_id_number, a.vaccine_type, a.appointment_date
LIMIT 20;

-- ============================================================================

-- ขั้นตอนที่ 3: อัพเดตวันนัดทั้งหมด (ปิด trigger ก่อน)

-- 3.1 ปิด trigger ทั้งหมด
ALTER TABLE appointments DISABLE TRIGGER ALL;

-- 3.2 อัพเดตวันนัด
WITH first_doses AS (
  SELECT 
    patient_id_number,
    vaccine_type,
    MIN(appointment_date) as first_dose_date
  FROM appointments
  WHERE status IN ('completed', 'scheduled', 'pending')
  GROUP BY patient_id_number, vaccine_type
),
appointment_with_dose_number AS (
  SELECT 
    a.id,
    a.patient_id_number,
    a.vaccine_type,
    a.appointment_date,
    fd.first_dose_date,
    ROW_NUMBER() OVER (PARTITION BY a.patient_id_number, a.vaccine_type ORDER BY a.appointment_date) as dose_number
  FROM appointments a
  JOIN first_doses fd ON fd.patient_id_number = a.patient_id_number 
                     AND fd.vaccine_type = a.vaccine_type
  WHERE a.status IN ('completed', 'scheduled', 'pending')
),
calculated_dates AS (
  SELECT 
    adn.id,
    adn.patient_id_number,
    adn.vaccine_type,
    adn.dose_number,
    adn.appointment_date as old_date,
    adn.first_dose_date,
    vs.dose_intervals,
    CASE 
      WHEN adn.dose_number = 1 THEN adn.first_dose_date
      ELSE (adn.first_dose_date::date + 
            (json_extract_path_text(vs.dose_intervals::json, (adn.dose_number-2)::text)::integer) * INTERVAL '1 day')::date
    END as new_date
  FROM appointment_with_dose_number adn
  JOIN vaccine_schedules vs ON vs.vaccine_type = adn.vaccine_type
)
UPDATE appointments a
SET 
  appointment_date = cd.new_date,
  notes = CONCAT('[อัพเดตอัตโนมัติ] คำนวณจากเข็มแรก + ระยะห่าง (เดิม: ', cd.old_date, ')')
FROM calculated_dates cd
WHERE a.id = cd.id
  AND cd.old_date != cd.new_date;

-- 3.3 เปิด trigger กลับ
ALTER TABLE appointments ENABLE TRIGGER ALL;

-- ============================================================================

-- ขั้นตอนที่ 4: ตรวจสอบผลลัพธ์ (หลังอัพเดต)
SELECT 
  a.patient_name,
  a.vaccine_type,
  a.appointment_date,
  a.notes,
  ROW_NUMBER() OVER (PARTITION BY a.patient_id_number, a.vaccine_type ORDER BY a.appointment_date) as dose_number
FROM appointments a
WHERE a.notes LIKE '%อัพเดตอัตโนมัติ%'
ORDER BY a.patient_id_number, a.vaccine_type, a.appointment_date
LIMIT 20;

-- ============================================================================

-- ขั้นตอนที่ 5: สรุปจำนวนที่อัพเดต
SELECT 
  COUNT(*) as total_updated
FROM appointments
WHERE notes LIKE '%อัพเดตอัตโนมัติ%';

-- ============================================================================
-- หมายเหตุ:
-- - ขั้นตอนที่ 1-2: ใช้สำหรับตรวจสอบข้อมูลก่อนอัพเดต
-- - ขั้นตอนที่ 3: คำสั่งอัพเดตหลัก (รันเพียงครั้งเดียว!)
--   - 3.1: ปิด trigger เพื่อหลีกเลี่ยงข้อผิดพลาด
--   - 3.2: อัพเดตวันนัด
--   - 3.3: เปิด trigger กลับ
-- - ขั้นตอนที่ 4-5: ใช้สำหรับตรวจสอบผลลัพธ์หลังอัพเดต
-- ============================================================================
