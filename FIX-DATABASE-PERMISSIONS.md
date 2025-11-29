# แก้ไขปัญหา Permission ในฐานข้อมูล

## ปัญหา

```
❌ Error: permission denied for table appointments
```

## สาเหตุ

Supabase API key ที่ใช้ไม่มีสิทธิ์ในการอัพเดตตาราง `appointments`

## วิธีแก้ไข

### วิธีที่ 1: ใช้ Supabase Dashboard (แนะนำ)

**ขั้นตอน:**

1. **เข้า Supabase Dashboard**
   - ไปที่: https://supabase.com/dashboard
   - เลือกโปรเจค VCHome Hospital

2. **เปิด SQL Editor**
   - คลิก "SQL Editor" ในเมนูด้านซ้าย

3. **รัน SQL Query เพื่ออัพเดตวันนัด**

```sql
-- อัพเดตวันนัดทั้งหมดตามการคำนวณใหม่
-- (นับจากเข็มแรก ไม่สะสม)

WITH vaccine_data AS (
  SELECT 
    vs.id,
    vs.vaccine_type,
    vs.dose_intervals,
    vs.total_doses
  FROM vaccine_schedules vs
  WHERE vs.active = true
),
patient_vaccines AS (
  SELECT 
    a.patient_id_number,
    a.vaccine_type,
    MIN(a.appointment_date) as first_dose_date,
    ROW_NUMBER() OVER (PARTITION BY a.patient_id_number, a.vaccine_type ORDER BY a.appointment_date) as dose_number
  FROM appointments a
  WHERE a.status IN ('completed', 'scheduled', 'pending')
  GROUP BY a.patient_id_number, a.vaccine_type, a.appointment_date
)
UPDATE appointments a
SET 
  appointment_date = (
    SELECT 
      (pv.first_dose_date::date + 
       CASE 
         WHEN pv.dose_number = 1 THEN 0
         ELSE (vd.dose_intervals::jsonb->(pv.dose_number-2))::text::integer
       END * INTERVAL '1 day')::date
    FROM patient_vaccines pv
    JOIN vaccine_data vd ON vd.vaccine_type = pv.vaccine_type
    WHERE pv.patient_id_number = a.patient_id_number
      AND pv.vaccine_type = a.vaccine_type
      AND pv.dose_number = (
        SELECT ROW_NUMBER() OVER (PARTITION BY a2.patient_id_number, a2.vaccine_type ORDER BY a2.appointment_date)
        FROM appointments a2
        WHERE a2.patient_id_number = a.patient_id_number
          AND a2.vaccine_type = a.vaccine_type
          AND a2.id = a.id
      )
  ),
  notes = CONCAT('[อัพเดตอัตโนมัติ] คำนวณจากเข็มแรก + ระยะห่าง (เดิม: ', appointment_date, ')')
WHERE a.status IN ('completed', 'scheduled', 'pending');
```

4. **ตรวจสอบผลลัพธ์**
   - ดูจำนวนแถวที่ถูกอัพเดต
   - ตรวจสอบตาราง appointments

### วิธีที่ 2: ใช้ Supabase UI (ง่ายที่สุด)

**ขั้นตอน:**

1. **เข้า Supabase Dashboard**
2. **ไปที่ Table Editor → appointments**
3. **แก้ไขแต่ละแถวด้วยตนเอง**
   - คลิก Edit บนแถวที่ต้องการ
   - เปลี่ยน appointment_date
   - Save

**ข้อเสีย**: ช้า ถ้ามีนัดเยอะ

### วิธีที่ 3: ใช้ Supabase API Key ที่มีสิทธิ์มากขึ้น

**ขั้นตอน:**

1. **เข้า Supabase Dashboard**
2. **ไปที่ Settings → API**
3. **ดูว่า API Key ที่ใช้มีสิทธิ์หรือไม่**
   - ต้องมี `SELECT`, `UPDATE` บนตาราง appointments

4. **ถ้าไม่มี ให้สร้าง API Key ใหม่**
   - ไปที่ Settings → API → Create new API key
   - เลือก Scope ที่เหมาะสม
   - Copy key ใหม่

5. **อัพเดต .env**
   ```env
   VITE_SUPABASE_ANON_KEY=your_new_key_here
   ```

6. **รันสคริปต์อีกครั้ง**
   ```bash
   npm run recalculate-appointments
   ```

## ตัวอย่าง SQL Query ที่ง่ายกว่า

ถ้า SQL query ข้างบนซับซ้อนเกินไป ให้ใช้วิธีนี้:

```sql
-- 1. ดึงข้อมูลวัคซีน
SELECT * FROM vaccine_schedules WHERE active = true;

-- 2. ดึงข้อมูลนัดทั้งหมด
SELECT * FROM appointments ORDER BY patient_id_number, vaccine_type, appointment_date;

-- 3. คำนวณและอัพเดตด้วยตนเอง
-- (ใช้ Excel หรือ Python เพื่อคำนวณ)

-- 4. อัพเดตแต่ละแถว
UPDATE appointments 
SET appointment_date = '2025-01-08'
WHERE id = 'appointment_id_here';
```

## ตรวจสอบผลลัพธ์

หลังจากอัพเดต ให้ตรวจสอบ:

```sql
-- ดูตัวอย่างนัดที่อัพเดต
SELECT 
  patient_name,
  vaccine_type,
  appointment_date,
  notes
FROM appointments
WHERE notes LIKE '%อัพเดตอัตโนมัติ%'
LIMIT 10;
```

## ยกเลิกการอัพเดต

ถ้าต้องการยกเลิก:

```sql
-- ดูข้อมูลเดิมจาก notes
SELECT 
  id,
  appointment_date,
  notes
FROM appointments
WHERE notes LIKE '%อัพเดตอัตโนมัติ%';

-- ยกเลิกการอัพเดต (ต้องทำด้วยตนเอง)
-- ใช้ข้อมูลเดิมจาก notes column
```

## สรุป

**ตัวเลือก:**
1. ✅ **SQL Query** - เร็ว แต่ต้องเข้า Supabase Dashboard
2. ✅ **UI Manual** - ง่าย แต่ช้า
3. ✅ **API Key ใหม่** - ต้องสร้าง key ใหม่

**แนะนำ**: ใช้ SQL Query ผ่าน Supabase Dashboard

---

**เอกสารนี้สร้างเมื่อ**: 17 พฤศจิกายน 2025  
**เวอร์ชัน**: 1.0.0
