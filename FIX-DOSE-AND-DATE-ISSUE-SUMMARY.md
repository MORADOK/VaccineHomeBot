# 🔧 สรุปการแก้ไขปัญหาโดสและวันนัดไม่ตรง

**วันที่:** 25 มีนาคม 2026
**ปัญหา:** ฉีดโดสแรกแต่ขึ้นว่าฉีดโดส 2 และไปแล้ว / วันที่นัดไม่ตรงกับที่คำนวน

---

## 📋 ปัญหาที่พบ

### ปัญหาที่ 1: วันนัดคำนวณผิด ❌
**ตำแหน่ง:** `EditPatientAppointment.tsx` (บรรทัด 124-136)

**สาเหตุ:**
- โค้ดเดิมบวกค่า `dose_intervals` ซ้ำอีก แม้ว่า `dose_intervals` จะเป็น **cumulative** อยู่แล้ว
- ตัวอย่าง: วัคซีนพิษสุนัขบ้า `[3,7,14,28]`
  - เข็มที่ 3 ควรห่างจากเข็มแรก **7 วัน** (ใช้ `intervals[2] = 14` โดยตรง)
  - แต่โค้ดเดิมบวก `3 + 7 + 14 = 24 วัน` (ผิด!)

**แก้ไข:**
```typescript
// ❌ BEFORE
let totalDaysFromFirstDose = 0;
for (let i = 0; i < currentDoseCount; i++) {
  totalDaysFromFirstDose += intervals[i];  // ผิด!
}

// ✅ AFTER
const intervalDays = intervals[currentDoseCount - 1] || 0;  // ถูกต้อง!
```

**สถานะ:** ✅ **แก้ไขเรียบร้อยแล้ว**

---

### ปัญหาที่ 2: โดสแสดงผิด (ฉีดเข็มแรก แต่ขึ้นว่าฉีดเข็ม 2) ⚠️
**สาเหตุที่เป็นไปได้:**

#### สาเหตุ A: ข้อมูลในฐานข้อมูล `appointments` ซ้ำซ้อน
- มีการบันทึก `status = 'completed'` **ซ้ำ** สำหรับวันเดียวกัน
- ทำให้ `completedDoses.length = 2` (แต่จริงๆ ฉีดแค่ 1 ครั้ง)
- ส่งผลให้:
  - `current_dose = 2` (แสดงว่าฉีดแล้ว 2 เข็ม)
  - แสดงว่า "ต้องการเข็มที่ 3" (ผิด! ควรเป็นเข็มที่ 2)

#### สาเหตุ B: Logic การนับโดสผิด
- โค้ดนับจำนวน `completed` appointments
- ถ้า logic นับผิด หรือมีข้อมูลไม่สอดคล้อง จะทำให้โดสแสดงผิด

**สถานะ:** ⚠️ **ต้องตรวจสอบฐานข้อมูล**

---

## ✅ การแก้ไขที่ทำแล้ว

### 1. แก้ไขโค้ด `EditPatientAppointment.tsx`
**ไฟล์:** `src/components/EditPatientAppointment.tsx`

**การเปลี่ยนแปลง:**
- บรรทัด 124-142: แก้ไข logic การคำนวณวันนัด
- ใช้ค่า `intervals[currentDoseCount - 1]` โดยตรง แทนการบวกซ้ำ
- เพิ่ม comment อธิบายว่า `dose_intervals` เป็น cumulative

**ผลลัพธ์:**
- วันนัดคำนวณถูกต้องตามมาตรฐาน
- แสดง log ที่ชัดเจนขึ้นสำหรับ debugging

### 2. สร้างเอกสารประกอบ

#### 📄 `DIAGNOSE-DOSE-COUNT-ISSUE.md`
- อธิบายปัญหาทั้ง 2 ข้อ
- วิธีตรวจสอบข้อมูลซ้ำซ้อน
- วิธีแก้ไขข้อมูลในฐานข้อมูล
- วิธีป้องกันปัญหาในอนาคต

#### 📄 `CHECK-DUPLICATE-APPOINTMENTS.sql`
- SQL script สำหรับตรวจสอบข้อมูลซ้ำซ้อน
- แบ่งเป็น 5 ส่วน:
  1. ตรวจสอบข้อมูล
  2. สถิติทั่วไป
  3. แก้ไขข้อมูลซ้ำซ้อน
  4. ป้องกันข้อมูลซ้ำในอนาคต
  5. ตรวจสอบผลลัพธ์หลังแก้ไข

---

## 🎯 ขั้นตอนการแก้ไขที่เหลือ

### ขั้นตอนที่ 1: ตรวจสอบฐานข้อมูล ⚠️ **สำคัญที่สุด**

รัน SQL script เพื่อตรวจสอบข้อมูลซ้ำ:

```bash
# เชื่อมต่อ Supabase และรันสคริปต์
psql $DATABASE_URL -f CHECK-DUPLICATE-APPOINTMENTS.sql
```

หรือรันผ่าน Supabase SQL Editor:

1. เข้า Supabase Dashboard → SQL Editor
2. Copy คำสั่ง SQL จาก `CHECK-DUPLICATE-APPOINTMENTS.sql`
3. รันส่วนที่ 1.1 และ 1.2 เพื่อตรวจสอบข้อมูลซ้ำ

**ผลลัพธ์ที่คาดหวัง:**
- ✅ **ถ้าว่างเปล่า:** ไม่มีข้อมูลซ้ำ ปัญหาอาจเกิดจาก logic อื่น
- ❌ **ถ้ามีผลลัพธ์:** พบข้อมูลซ้ำซ้อน ต้องแก้ไขต่อ

---

### ขั้นตอนที่ 2: แก้ไขข้อมูลซ้ำ (ถ้าพบ)

ถ้าพบข้อมูลซ้ำจาก SQL ข้างบน ให้:

#### วิธีที่ 1: เปลี่ยน status เป็น `cancelled` (แนะนำ - ปลอดภัยกว่า)

```sql
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
RETURNING id, patient_name, vaccine_type, appointment_date;
```

#### วิธีที่ 2: ลบข้อมูลซ้ำทิ้ง (อันตราย - ควร backup ก่อน)

```sql
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
```

---

### ขั้นตอนที่ 3: ตรวจสอบผลลัพธ์

หลังแก้ไขข้อมูล ให้รัน SQL นี้เพื่อตรวจสอบอีกครั้ง:

```sql
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
```

**ผลลัพธ์ที่ถูกต้อง:** ว่างเปล่า (ไม่มีข้อมูลซ้ำ) ✅

---

### ขั้นตอนที่ 4: ป้องกันปัญหาในอนาคต

เพิ่ม **unique constraint** เพื่อป้องกันข้อมูลซ้ำ:

```sql
ALTER TABLE appointments
ADD CONSTRAINT unique_patient_vaccine_date_status
UNIQUE (patient_id_number, vaccine_type, appointment_date, status);
```

**หมายเหตุ:**
- รันคำสั่งนี้ได้ก็ต่อเมื่อแก้ไขข้อมูลซ้ำเรียบร้อยแล้ว
- ถ้ายังมีข้อมูลซ้ำอยู่ คำสั่งนี้จะ error

---

### ขั้นตอนที่ 5: ทดสอบระบบ

1. เข้าหน้า **NextAppointments** (นัดครั้งถัดไป)
2. คลิก "รีเฟรช" เพื่อโหลดข้อมูลใหม่
3. ตรวจสอบว่า:
   - โดสแสดงถูกต้อง (ฉีด 1 เข็ม = แสดงว่า "ต้องการเข็มที่ 2")
   - วันนัดถูกต้องตามตาราง
4. คลิก "ดูตารางนัดครบทุกโดส" เพื่อตรวจสอบวันนัดทุกโดส

**ตัวอย่างที่ถูกต้อง (วัคซีนพิษสุนัขบ้า):**

| โดสที่ | วันนัด (ถ้าเข็มแรก = 1 ม.ค.) | ระยะห่างจากเข็มแรก |
|--------|------------------------------|---------------------|
| 1      | 1 มกราคม                      | 0 วัน               |
| 2      | 4 มกราคม                      | 3 วัน ✅            |
| 3      | 8 มกราคม                      | 7 วัน ✅            |
| 4      | 15 มกราคม                     | 14 วัน ✅           |
| 5      | 29 มกราคม                     | 28 วัน ✅           |

---

## 📊 สรุปการเปลี่ยนแปลง

### ไฟล์ที่แก้ไข
1. ✅ `src/components/EditPatientAppointment.tsx` - แก้ไข logic การคำนวณวันนัด

### ไฟล์ที่สร้างใหม่
1. ✅ `DIAGNOSE-DOSE-COUNT-ISSUE.md` - เอกสารอธิบายปัญหา
2. ✅ `CHECK-DUPLICATE-APPOINTMENTS.sql` - SQL script ตรวจสอบข้อมูล
3. ✅ `FIX-DOSE-AND-DATE-ISSUE-SUMMARY.md` - เอกสารสรุปนี้

### งานที่ต้องทำต่อ
1. ⚠️ รัน SQL เพื่อตรวจสอบข้อมูลซ้ำซ้อนในฐานข้อมูล
2. ⚠️ แก้ไขข้อมูลซ้ำ (ถ้ามี)
3. ⚠️ เพิ่ม unique constraint
4. ⚠️ ทดสอบระบบ

---

## ⚠️ คำเตือน

1. **Backup ข้อมูลก่อนแก้ไข**
   - ก่อนรัน SQL ที่แก้ไขข้อมูล ควร export ข้อมูลออกมาเก็บไว้ก่อน
   - ใช้ Supabase Dashboard → Table Editor → Export เป็น CSV

2. **ตรวจสอบให้แน่ใจก่อนลบข้อมูล**
   - ดูข้อมูลที่จะลบให้ชัดเจนก่อน
   - แนะนำให้ใช้ `UPDATE ... SET status = 'cancelled'` แทนการ `DELETE`

3. **อัพเดทฐานข้อมูล vaccine_schedules**
   - อย่าลืมรัน `UPDATE-RABIES-VACCINE-INTERVALS.sql` เพื่อแก้ไข `dose_intervals`
   - จาก `[3,4,7,14]` เป็น `[3,7,14,28]`

---

## 🎉 ผลลัพธ์ที่คาดหวัง

หลังแก้ไขเสร็จสมบูรณ์:

✅ วันนัดคำนวณถูกต้องตามมาตรฐาน WHO
✅ โดสแสดงถูกต้อง (ฉีด 1 เข็ม = แสดง "ต้องการเข็มที่ 2")
✅ ไม่มีข้อมูลซ้ำซ้อนในฐานข้อมูล
✅ ระบบป้องกันการสร้างข้อมูลซ้ำในอนาคต
✅ ตารางนัดครบทุกโดสแสดงผลถูกต้อง

---

**ผู้จัดทำ:** Claude Code AI Assistant
**วันที่:** 25 มีนาคม 2026
**เวอร์ชัน:** v1.0.21
**สถานะ:** รอตรวจสอบฐานข้อมูล Supabase
