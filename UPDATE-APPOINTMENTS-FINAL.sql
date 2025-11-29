-- ============================================================================
-- SQL Query - อัพเดตวันนัดทั้งหมด (ไม่ต้องปิด trigger)
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

-- ขั้นตอนที่ 3: อัพเดตวันนัดทั้งหมด (วิธีที่ง่ายที่สุด)
-- ไม่ต้องปิด trigger เพราะใช้ UPDATE ธรรมชาติ

UPDATE appointments a
SET 
  appointment_date = (
    SELECT 
      CASE 
        WHEN dose_num = 1 THEN first_dose_date
        ELSE (first_dose_date::date + 
              (json_extract_path_text(vs.dose_intervals::json, (dose_num-2)::text)::integer) * INTERVAL '1 day')::date
      END
    FROM (
      SELECT 
        ROW_NUMBER() OVER (PARTITION BY patient_id_number, vaccine_type ORDER BY appointment_date) as dose_num,
        MIN(appointment_date) OVER (PARTITION BY patient_id_number, vaccine_type) as first_dose_date
      FROM appointments a2
      WHERE a2.id = a.id
        AND a2.status IN ('completed', 'scheduled', 'pending')
    ) sub
    CROSS JOIN vaccine_schedules vs
    WHERE vs.vaccine_type = a.vaccine_type
  ),
  notes = CONCAT('[อัพเดตอัตโนมัติ] คำนวณจากเข็มแรก + ระยะห่าง (เดิม: ', appointment_date, ')')
WHERE a.status IN ('completed', 'scheduled', 'pending')
  AND a.appointment_date != (
    SELECT 
      CASE 
        WHEN dose_num = 1 THEN first_dose_date
        ELSE (first_dose_date::date + 
              (json_extract_path_text(vs.dose_intervals::json, (dose_num-2)::text)::integer) * INTERVAL '1 day')::date
      END
    FROM (
      SELECT 
        ROW_NUMBER() OVER (PARTITION BY patient_id_number, vaccine_type ORDER BY appointment_date) as dose_num,
        MIN(appointment_date) OVER (PARTITION BY patient_id_number, vaccine_type) as first_dose_date
      FROM appointments a2
      WHERE a2.id = a.id
        AND a2.status IN ('completed', 'scheduled', 'pending')
    ) sub
    CROSS JOIN vaccine_schedules vs
    WHERE vs.vaccine_type = a.vaccine_type
  );

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
-- - ขั้นตอนที่ 4-5: ใช้สำหรับตรวจสอบผลลัพธ์หลังอัพเดต
-- ============================================================================
