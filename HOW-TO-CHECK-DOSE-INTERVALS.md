# วิธีเช็คและจัดการระยะห่างนัด (Dose Intervals)

## ภาพรวม

ระยะห่างนัด (dose intervals) เก็บอยู่ใน**ฐานข้อมูล Supabase** ในตาราง `vaccine_schedules`

## วิธีเช็คระยะห่างนัด

### 1. ผ่าน Supabase Dashboard (แนะนำ)

**ขั้นตอน:**

1. **เข้า Supabase Dashboard**
   - ไปที่: https://supabase.com/dashboard
   - เลือกโปรเจค VCHome Hospital

2. **เปิด Table Editor**
   - คลิกที่ "Table Editor" ในเมนูด้านซ้าย
   - เลือกตาราง `vaccine_schedules`

3. **ดูข้อมูลวัคซีน**
   
   คอลัมน์ที่สำคัญ:
   ```
   - id: รหัสวัคซีน (UUID)
   - vaccine_type: รหัสวัคซีน (เช่น COVID19, INFLUENZA)
   - vaccine_name: ชื่อวัคซีน (เช่น วัคซีนโควิด-19)
   - total_doses: จำนวนเข็มทั้งหมด (เช่น 3)
   - dose_intervals: ระยะห่างระหว่างเข็ม (JSON Array)
   - active: สถานะใช้งาน (true/false)
   ```

4. **ดูระยะห่างนัด (dose_intervals)**
   
   ตัวอย่าง:
   ```json
   [7, 21]
   ```
   
   หมายความว่า:
   - เข็มที่ 1 → 2: ห่าง 7 วัน
   - เข็มที่ 2 → 3: ห่าง 21 วัน

### 2. ผ่านแอปพลิเคชัน

**ขั้นตอน:**

1. **เข้าสู่ระบบในฐานะ Admin**
   - เปิดแอปพลิเคชัน
   - Login ด้วยบัญชี Admin

2. **ไปที่หน้า "การตั้งค่าวัคซีน"**
   - คลิกเมนู "Settings" หรือ "การตั้งค่า"
   - เลือก "Vaccine Settings" หรือ "การตั้งค่าวัคซีน"

3. **ดูรายการวัคซีน**
   - จะเห็นรายการวัคซีนทั้งหมด
   - แต่ละวัคซีนจะแสดง:
     - ชื่อวัคซีน
     - รหัสวัคซีน
     - จำนวนเข็ม
     - สถานะ (ใช้งาน/ปิดใช้งาน)

**หมายเหตุ**: ในหน้านี้ยังไม่แสดง dose_intervals โดยตรง ต้องเช็คผ่าน Supabase Dashboard

### 3. ผ่าน SQL Query

**ขั้นตอน:**

1. **เข้า Supabase Dashboard**
2. **เปิด SQL Editor**
   - คลิกที่ "SQL Editor" ในเมนูด้านซ้าย

3. **รัน Query**

```sql
-- ดูวัคซีนทั้งหมดพร้อมระยะห่างนัด
SELECT 
  vaccine_type,
  vaccine_name,
  total_doses,
  dose_intervals,
  active
FROM vaccine_schedules
ORDER BY vaccine_name;
```

**ผลลัพธ์ตัวอย่าง:**
```
vaccine_type | vaccine_name        | total_doses | dose_intervals | active
-------------|---------------------|-------------|----------------|-------
COVID19      | วัคซีนโควิด-19      | 3           | [7, 21]        | true
INFLUENZA    | วัคซีนไข้หวัดใหญ่   | 2           | [30]           | true
HPV          | วัคซีน HPV          | 3           | [60, 180]      | true
```

### 4. ผ่าน Developer Tools (Console)

**ขั้นตอน:**

1. **เปิดแอปพลิเคชัน**
2. **เปิด Developer Tools** (F12)
3. **ไปที่ Console Tab**
4. **รัน JavaScript**

```javascript
// ดึงข้อมูลวัคซีนทั้งหมด
const { data, error } = await supabase
  .from('vaccine_schedules')
  .select('*')
  .eq('active', true);

console.table(data);
```

**ผลลัพธ์:**
```
┌─────────┬──────────────┬─────────────────────┬─────────────┬─────────────────┐
│ (index) │ vaccine_type │ vaccine_name        │ total_doses │ dose_intervals  │
├─────────┼──────────────┼─────────────────────┼─────────────┼─────────────────┤
│    0    │  'COVID19'   │ 'วัคซีนโควิด-19'    │      3      │    [7, 21]      │
│    1    │ 'INFLUENZA'  │ 'วัคซีนไข้หวัดใหญ่' │      2      │      [30]       │
└─────────┴──────────────┴─────────────────────┴─────────────┴─────────────────┘
```

## โครงสร้างข้อมูล dose_intervals

### รูปแบบ

```json
[interval1, interval2, interval3, ...]
```

- **Array of Numbers**: เก็บเป็น JSON Array
- **หน่วย**: วัน (days)
- **จำนวน**: `total_doses - 1` (เพราะเข็มแรกไม่มีระยะห่าง)

### ตัวอย่าง

#### วัคซีน 2 เข็ม
```json
{
  "vaccine_name": "วัคซีนไข้หวัดใหญ่",
  "total_doses": 2,
  "dose_intervals": [30]
}
```

**การคำนวณ:**
- เข็มที่ 1: วันที่ 1 มกราคม (ฐาน)
- เข็มที่ 2: วันที่ 1 มกราคม + 30 วัน = 31 มกราคม

#### วัคซีน 3 เข็ม
```json
{
  "vaccine_name": "วัคซีนโควิด-19",
  "total_doses": 3,
  "dose_intervals": [7, 21]
}
```

**การคำนวณ:**
- เข็มที่ 1: วันที่ 1 มกราคม (ฐาน)
- เข็มที่ 2: วันที่ 1 มกราคม + 7 วัน = 8 มกราคม
- เข็มที่ 3: วันที่ 1 มกราคม + (7+21) วัน = 29 มกราคม

#### วัคซีน 4 เข็ม
```json
{
  "vaccine_name": "วัคซีน HPV",
  "total_doses": 4,
  "dose_intervals": [60, 60, 180]
}
```

**การคำนวณ:**
- เข็มที่ 1: วันที่ 1 มกราคม (ฐาน)
- เข็มที่ 2: วันที่ 1 มกราคม + 60 วัน = 2 มีนาคม
- เข็มที่ 3: วันที่ 1 มกราคม + (60+60) วัน = 2 พฤษภาคม
- เข็มที่ 4: วันที่ 1 มกราคม + (60+60+180) วัน = 30 กรกฎาคม

## วิธีแก้ไขระยะห่างนัด

### 1. ผ่าน Supabase Dashboard

**ขั้นตอน:**

1. **เข้า Table Editor**
   - เลือกตาราง `vaccine_schedules`

2. **คลิก Edit** บนแถวที่ต้องการแก้ไข

3. **แก้ไข dose_intervals**
   ```json
   [7, 21]  // เปลี่ยนเป็นค่าที่ต้องการ
   ```

4. **คลิก Save**

### 2. ผ่าน SQL Query

```sql
-- แก้ไขระยะห่างนัดของวัคซีนโควิด-19
UPDATE vaccine_schedules
SET 
  dose_intervals = '[7, 21]',
  updated_at = NOW()
WHERE vaccine_type = 'COVID19';
```

### 3. ผ่าน API (สำหรับนักพัฒนา)

```javascript
// แก้ไขระยะห่างนัด
const { data, error } = await supabase
  .from('vaccine_schedules')
  .update({ 
    dose_intervals: [7, 21],
    updated_at: new Date().toISOString()
  })
  .eq('vaccine_type', 'COVID19');
```

## การเพิ่มวัคซีนใหม่

### ผ่านแอปพลิเคชัน

1. **ไปที่หน้า "การตั้งค่าวัคซีน"**
2. **คลิก "เพิ่มวัคซีน"**
3. **กรอกข้อมูล:**
   - รหัสวัคซีน (vaccine_type)
   - ชื่อวัคซีน (vaccine_name)
   - จำนวนเข็ม (total_doses)
4. **คลิก "บันทึก"**

**หมายเหตุ**: ต้องเพิ่ม dose_intervals ผ่าน Supabase Dashboard ภายหลัง

### ผ่าน SQL Query

```sql
-- เพิ่มวัคซีนใหม่พร้อมระยะห่างนัด
INSERT INTO vaccine_schedules (
  vaccine_type,
  vaccine_name,
  total_doses,
  dose_intervals,
  active
) VALUES (
  'HEPATITIS_B',
  'วัคซีนตับอักเสบบี',
  3,
  '[30, 150]',  -- เข็มที่ 1→2 ห่าง 30 วัน, เข็มที่ 2→3 ห่าง 150 วัน
  true
);
```

## การตรวจสอบความถูกต้อง

### เช็คว่า dose_intervals ถูกต้อง

```sql
-- ตรวจสอบว่า dose_intervals มีจำนวนถูกต้อง
SELECT 
  vaccine_name,
  total_doses,
  dose_intervals,
  jsonb_array_length(dose_intervals::jsonb) as interval_count,
  CASE 
    WHEN jsonb_array_length(dose_intervals::jsonb) = total_doses - 1 
    THEN '✅ ถูกต้อง'
    ELSE '❌ ไม่ถูกต้อง'
  END as status
FROM vaccine_schedules;
```

**ผลลัพธ์ตัวอย่าง:**
```
vaccine_name        | total_doses | dose_intervals | interval_count | status
--------------------|-------------|----------------|----------------|------------
วัคซีนโควิด-19      | 3           | [7, 21]        | 2              | ✅ ถูกต้อง
วัคซีนไข้หวัดใหญ่   | 2           | [30]           | 1              | ✅ ถูกต้อง
วัคซีน HPV          | 4           | [60, 60]       | 2              | ❌ ไม่ถูกต้อง (ควรมี 3)
```

## ตัวอย่างระยะห่างนัดทั่วไป

### วัคซีนโควิด-19
```json
{
  "total_doses": 3,
  "dose_intervals": [21, 90]
}
```
- เข็มที่ 1 → 2: 21 วัน (3 สัปดาห์)
- เข็มที่ 2 → 3: 90 วัน (3 เดือน)

### วัคซีนไข้หวัดใหญ่
```json
{
  "total_doses": 2,
  "dose_intervals": [28]
}
```
- เข็มที่ 1 → 2: 28 วัน (4 สัปดาห์)

### วัคซีน HPV
```json
{
  "total_doses": 3,
  "dose_intervals": [60, 180]
}
```
- เข็มที่ 1 → 2: 60 วัน (2 เดือน)
- เข็มที่ 2 → 3: 180 วัน (6 เดือน)

### วัคซีนตับอักเสบบี
```json
{
  "total_doses": 3,
  "dose_intervals": [30, 150]
}
```
- เข็มที่ 1 → 2: 30 วัน (1 เดือน)
- เข็มที่ 2 → 3: 150 วัน (5 เดือน)

## คำถามที่พบบ่อย

### Q: ทำไมต้องเก็บเป็น Array?
A: เพราะแต่ละช่วงระหว่างเข็มอาจไม่เท่ากัน เช่น เข็มที่ 1→2 ห่าง 7 วัน แต่เข็มที่ 2→3 ห่าง 21 วัน

### Q: ถ้าต้องการเปลี่ยนระยะห่างนัด จะกระทบกับนัดเดิมไหม?
A: ไม่กระทบ เพราะนัดเดิมบันทึกวันที่ไว้แล้ว การเปลี่ยนจะมีผลกับนัดใหม่ที่สร้างหลังจากนี้เท่านั้น

### Q: ถ้าระยะห่างไม่ถูกต้อง จะเกิดอะไรขึ้น?
A: วันนัดที่คำนวณจะผิด ควรตรวจสอบและแก้ไขให้ถูกต้อง

### Q: สามารถใช้ระยะห่างเป็นเดือนได้ไหม?
A: ไม่ได้ ต้องแปลงเป็นวันก่อน เช่น 1 เดือน ≈ 30 วัน, 3 เดือน ≈ 90 วัน

### Q: ถ้าต้องการให้ระยะห่างยืดหยุ่น (เช่น 21-28 วัน) ทำอย่างไร?
A: ใช้ค่ากลาง (เช่น 24 วัน) และให้แพทย์ปรับตามความเหมาะสม

## สรุป

**ระยะห่างนัดเก็บที่:**
- 📍 ตาราง: `vaccine_schedules`
- 📍 คอลัมน์: `dose_intervals`
- 📍 รูปแบบ: JSON Array `[interval1, interval2, ...]`
- 📍 หน่วย: วัน (days)

**วิธีเช็ค:**
1. ✅ Supabase Dashboard → Table Editor (แนะนำ)
2. ✅ SQL Query
3. ✅ Developer Console

**วิธีแก้ไข:**
1. ✅ Supabase Dashboard → Edit
2. ✅ SQL UPDATE
3. ✅ API Call

---

**เอกสารนี้สร้างเมื่อ**: 17 พฤศจิกายน 2025  
**เวอร์ชัน**: 1.0.0  
**ผู้ดูแล**: VCHome Hospital Development Team
