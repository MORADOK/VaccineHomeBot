# 🔍 การตรวจสอบปัญหาการแสดงโดสและวันที่นัด

**วันที่:** 25 มีนาคม 2026
**ปัญหา:** ฉีดโดสแรกแต่ระบบขึ้นว่าฉีดโดส 2 และไปแล้ว / วันที่ไม่ตรงที่คำนวน

---

## 🐛 ปัญหาที่พบและแก้ไขแล้ว

### 1. ✅ EditPatientAppointment.tsx (บรรทัด 124-136) - **แก้ไขแล้ว**

**ปัญหา:** คำนวณวันนัดผิด เพราะบวกค่า cumulative ซ้ำอีก

```typescript
// ❌ BEFORE (ผิด)
let totalDaysFromFirstDose = 0;
for (let i = 0; i < currentDoseCount; i++) {
  totalDaysFromFirstDose += intervals[i];  // 3+7+14 = 24 (ผิด!)
}
```

**แก้ไข:**
```typescript
// ✅ AFTER (ถูกต้อง)
const intervalDays = intervals[currentDoseCount - 1] || 0;  // เข็มที่ 3 = intervals[2] = 14
```

---

## ⚠️ ปัญหาที่อาจเกิดขึ้น

### 2. ข้อมูลในฐานข้อมูล `appointments` table

**อาการ:** ฉีดเข็มแรก แต่ขึ้นว่าฉีดโดส 2 แล้ว

**สาเหตุที่เป็นไปได้:**

#### สาเหตุที่ 1: มี `status = 'completed'` ซ้ำซ้อน
```sql
-- ตัวอย่างข้อมูลผิดพลาด
SELECT * FROM appointments
WHERE patient_id_number = 'P001'
  AND vaccine_type = 'rabies'
  AND status = 'completed';

-- ถ้าผลลัพธ์แสดง 2 แถว แต่จริงๆ ฉีดแค่ 1 ครั้ง
-- = มีข้อมูลซ้ำซ้อน!
```

#### สาเหตุที่ 2: การนับโดสผิด
```typescript
// NextAppointments.tsx บรรทัด 79-84
const completedDoses = completedAppointments.filter(a => {
  const aPatientKey = a.patient_id_number || a.line_user_id;
  return (aPatientKey === patientKey) &&
         a.vaccine_type === appt.vaccine_type &&
         a.status === 'completed';
});
```

**ถ้า `completedDoses.length = 2`** แต่จริงๆ ฉีดแค่ 1 ครั้ง:
- แสดงว่ามีข้อมูลใน `appointments` table ที่ `status = 'completed'` **ซ้ำซ้อน**

---

## 🔧 วิธีตรวจสอบและแก้ไข

### ขั้นตอนที่ 1: รัน SQL เพื่อหาข้อมูลซ้ำซ้อน

```sql
-- หาผู้ป่วยที่มีการฉีดซ้ำซ้อน
SELECT
    patient_id_number,
    patient_name,
    vaccine_type,
    COUNT(*) as dose_count,
    STRING_AGG(appointment_date::text, ', ' ORDER BY appointment_date) as all_dates,
    STRING_AGG(id::text, ', ') as all_ids
FROM appointments
WHERE status = 'completed'
GROUP BY patient_id_number, patient_name, vaccine_type
HAVING COUNT(*) > 1
ORDER BY patient_name, vaccine_type;
```

**คำอธิบาย:**
- หา patient ที่มี `completed` appointments มากกว่า 1 ครั้ง
- แสดงวันที่ทั้งหมดที่บันทึกว่า "ฉีดแล้ว"
- ถ้ามีวันที่ซ้ำกัน = ข้อมูลซ้ำซ้อน

---

### ขั้นตอนที่ 2: ตรวจสอบข้อมูลเฉพาะผู้ป่วยที่มีปัญหา

```sql
-- แทน 'P001' และ 'rabies' ด้วยข้อมูลจริงของผู้ป่วย
SELECT
    id,
    patient_name,
    vaccine_type,
    appointment_date,
    status,
    notes,
    created_at
FROM appointments
WHERE patient_id_number = 'P001'  -- เปลี่ยนเป็น ID ของผู้ป่วย
  AND vaccine_type = 'rabies'     -- เปลี่ยนเป็นประเภทวัคซีน
ORDER BY appointment_date, created_at;
```

**สิ่งที่ต้องตรวจสอบ:**
1. มีกี่แถวที่ `status = 'completed'`?
2. วันที่ `appointment_date` ซ้ำกันหรือไม่?
3. วันที่ `created_at` เป็นอย่างไร? (ถ้าสร้างพร้อมกัน = อาจเป็น bug การสร้างนัดซ้ำ)

---

### ขั้นตอนที่ 3: ลบข้อมูลซ้ำซ้อน (ถ้ามี)

```sql
-- ⚠️ ระวัง! ต้องตรวจสอบให้แน่ใจก่อนรัน

-- ลบข้อมูลซ้ำ (เก็บเฉพาะ ID ที่เล็กที่สุด)
WITH duplicates AS (
  SELECT
    id,
    patient_id_number,
    vaccine_type,
    appointment_date,
    ROW_NUMBER() OVER (
      PARTITION BY patient_id_number, vaccine_type, appointment_date
      ORDER BY created_at ASC
    ) as rn
  FROM appointments
  WHERE status = 'completed'
)
DELETE FROM appointments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

**คำเตือน:**
- รันคำสั่งนี้ก็ต่อเมื่อตรวจสอบแล้วว่ามีข้อมูลซ้ำจริงๆ
- ควร backup ข้อมูลก่อน
- ถ้าไม่แน่ใจ ให้ใช้ `UPDATE` เป็น `status = 'cancelled'` แทน

---

### ขั้นตอนที่ 4: ป้องกันการสร้างนัดซ้ำ

แก้ไข `NextAppointments.tsx` เพิ่ม unique constraint check:

```typescript
// เพิ่ม constraint ใน scheduleAppointment function
const { data: duplicateCheck } = await supabase
  .from('appointments')
  .select('*')
  .eq('patient_id_number', patientTracking.patient_id)
  .eq('vaccine_type', patientTracking.vaccine_type)
  .eq('appointment_date', patientTracking.next_dose_due)
  .neq('status', 'cancelled');

if (duplicateCheck && duplicateCheck.length > 0) {
  console.log('⚠️ พบนัดซ้ำในวันเดียวกัน - ยกเลิกการสร้าง');
  return;
}
```

---

## 📊 ตัวอย่างการอ่านผลลัพธ์

### กรณีปกติ (ถูกต้อง)
```
patient_id_number | patient_name | vaccine_type | dose_count | all_dates
P001             | นายทดสอบ     | rabies       | 1          | 2026-03-01
```
✅ ผู้ป่วยนี้ฉีดวัคซีนพิษสุนัขบ้า 1 ครั้ง ในวันที่ 1 มีนาคม

---

### กรณีมีปัญหา (ข้อมูลซ้ำ)
```
patient_id_number | patient_name | vaccine_type | dose_count | all_dates
P001             | นายทดสอบ     | rabies       | 2          | 2026-03-01, 2026-03-01
```
❌ ผู้ป่วยนี้มีบันทึก "ฉีดแล้ว" 2 ครั้ง ในวันเดียวกัน = ข้อมูลซ้ำซ้อน!

**ผลกระทบ:**
- `current_dose = 2` (แต่ควรเป็น 1)
- แสดงว่า "ต้องการเข็มที่ 3" (แต่ควรเป็น "ต้องการเข็มที่ 2")
- วันนัดคำนวณผิด (ใช้ interval สำหรับเข็มที่ 3 แทนที่จะเป็นเข็มที่ 2)

---

## 🎯 การแก้ไขปัญหาถาวร

### 1. เพิ่ม Unique Constraint ใน Supabase

```sql
-- เพิ่ม unique constraint เพื่อป้องกันข้อมูลซ้ำ
ALTER TABLE appointments
ADD CONSTRAINT unique_patient_vaccine_date
UNIQUE (patient_id_number, vaccine_type, appointment_date, status);
```

### 2. ตรวจสอบก่อนบันทึก `status = 'completed'`

แก้ไข component ที่ใช้ mark appointment เป็น completed:

```typescript
// ก่อน update status เป็น 'completed'
const { data: alreadyCompleted } = await supabase
  .from('appointments')
  .select('*')
  .eq('patient_id_number', patientId)
  .eq('vaccine_type', vaccineType)
  .eq('appointment_date', appointmentDate)
  .eq('status', 'completed');

if (alreadyCompleted && alreadyCompleted.length > 0) {
  // แจ้งเตือนว่ามีการบันทึกแล้ว
  return;
}
```

---

## 📝 สรุป

**ปัญหาหลัก 2 ข้อ:**
1. ✅ **แก้ไขแล้ว:** การคำนวณวันนัดใน EditPatientAppointment.tsx (บวก cumulative ซ้ำ)
2. ⚠️ **ต้องตรวจสอบ:** ข้อมูล `appointments` table มีการบันทึก `completed` ซ้ำซ้อนหรือไม่

**วิธีแก้:**
1. รัน SQL ตรวจสอบข้อมูลซ้ำซ้อน (ขั้นตอนที่ 1)
2. ลบข้อมูลซ้ำ (ถ้ามี)
3. เพิ่ม constraint ป้องกันข้อมูลซ้ำในอนาคต

---

**ผู้จัดทำ:** Claude Code AI Assistant
**วันที่:** 25 มีนาคม 2026
