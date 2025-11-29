# Scripts สำหรับจัดการข้อมูลวัคซีน

## ภาพรวม

โฟลเดอร์นี้ประกอบด้วยสคริปต์ต่างๆ สำหรับจัดการและตรวจสอบข้อมูลในระบบ

## สคริปต์ที่มี

### 1. verify-appointment-dates.js
**วัตถุประสงค์**: ตรวจสอบความถูกต้องของวันนัดวัคซีนในฐานข้อมูล

**การใช้งาน**:
```bash
npm run verify-appointments
```

**ผลลัพธ์**:
- แสดงรายการนัดทั้งหมดและสถานะความถูกต้อง
- สร้างไฟล์รายงาน `appointment-verification-report.json`
- แสดงสถิติความถูกต้อง

**เมื่อไหร่ควรใช้**:
- หลังจาก migrate ข้อมูลจากระบบเก่า
- เมื่อเปลี่ยนแปลง vaccine_schedules
- ตรวจสอบเป็นระยะ (ทุก 1-3 เดือน)

---

### 2. fix-appointment-dates.js
**วัตถุประสงค์**: แก้ไขวันนัดที่คำนวณผิดให้ถูกต้อง

**การใช้งาน**:
```bash
npm run fix-appointments
```

**ข้อกำหนด**:
- ต้องรัน `verify-appointment-dates.js` ก่อน
- ต้องมีไฟล์ `appointment-verification-report.json`

**คำเตือน**:
⚠️ สคริปต์นี้จะแก้ไขข้อมูลในฐานข้อมูล กรุณาสำรองข้อมูลก่อน!

**ผลลัพธ์**:
- แก้ไขวันนัดในฐานข้อมูล
- เพิ่มหมายเหตุว่าแก้ไขอัตโนมัติ
- แสดงสถิติการแก้ไข

---

### 3. verify-publish-setup.js
**วัตถุประสงค์**: ตรวจสอบการตั้งค่าสำหรับการ publish desktop app

**การใช้งาน**:
```bash
npm run verify-publish
```

**ตรวจสอบ**:
- GitHub token
- package.json configuration
- Build tools
- Network connectivity

---

## การตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์ root:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# GitHub (สำหรับ publishing)
GH_TOKEN=your_github_token
```

## หลักการคำนวณวันนัด

สคริปต์ทั้งหมดใช้หลักการเดียวกัน:

```
เข็มที่ 1: วันที่ 1 มกราคม (ฐาน)
เข็มที่ 2: วันที่ 1 มกราคม + 7 วัน = 8 มกราคม
เข็มที่ 3: วันที่ 1 มกราคม + (7+21) วัน = 29 มกราคม
```

**หลักการ**:
- ✅ คำนวณจากเข็มแรกเสมอ
- ✅ ใช้ระยะห่างสะสม (cumulative intervals)
- ❌ ไม่นับต่อจากเข็มล่าสุด

## ขั้นตอนการใช้งานทั่วไป

### 1. ตรวจสอบนัด
```bash
npm run verify-appointments
```

### 2. ดูรายงาน
```bash
cat appointment-verification-report.json
```

### 3. สำรองข้อมูล (ถ้าจะแก้ไข)
```sql
CREATE TABLE appointments_backup AS 
SELECT * FROM appointments;
```

### 4. แก้ไขนัด (ถ้าต้องการ)
```bash
npm run fix-appointments
```

### 5. ตรวจสอบอีกครั้ง
```bash
npm run verify-appointments
```

## การพัฒนาสคริปต์ใหม่

### โครงสร้างพื้นฐาน

```javascript
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function myScript() {
  try {
    // Your logic here
    console.log('✅ สำเร็จ');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

myScript();
```

### เพิ่มสคริปต์ใน package.json

```json
{
  "scripts": {
    "my-script": "node scripts/my-script.js"
  }
}
```

## Best Practices

### 1. การจัดการ Errors
```javascript
try {
  // Your code
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
```

### 2. การแสดงผล
```javascript
console.log('✅ Success');
console.log('❌ Error');
console.log('⚠️  Warning');
console.log('📊 Info');
console.log('🔍 Debug');
```

### 3. การยืนยันจากผู้ใช้
```javascript
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const answer = await question('Continue? (yes/no): ');
if (answer.toLowerCase() !== 'yes') {
  process.exit(0);
}
```

### 4. การสร้างรายงาน
```javascript
const report = {
  timestamp: new Date().toISOString(),
  summary: { /* ... */ },
  details: [ /* ... */ ]
};

const fs = await import('fs');
fs.writeFileSync('report.json', JSON.stringify(report, null, 2));
```

## การ Debug

### เปิด Verbose Logging
```javascript
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('🔍 Debug info:', data);
}
```

### รันด้วย Debug Mode
```bash
DEBUG=true npm run verify-appointments
```

## การทดสอบ

### ทดสอบกับข้อมูลจำลอง
```javascript
// ใช้ test database
const supabaseUrl = process.env.TEST_SUPABASE_URL || supabaseUrl;
```

### Dry Run Mode
```javascript
const DRY_RUN = process.env.DRY_RUN === 'true';

if (DRY_RUN) {
  console.log('🔍 Dry run - ไม่แก้ไขข้อมูลจริง');
  // Don't actually update database
}
```

## เอกสารเพิ่มเติม

- [APPOINTMENT-VERIFICATION-GUIDE.md](../APPOINTMENT-VERIFICATION-GUIDE.md) - คู่มือการตรวจสอบและแก้ไขนัด
- [VACCINE-CALCULATION-LOGIC.md](../VACCINE-CALCULATION-LOGIC.md) - หลักการคำนวณวันนัด

## การติดต่อ

หากพบปัญหาหรือมีคำถาม:
- ตรวจสอบ logs ใน console
- ดูไฟล์รายงานที่สร้างขึ้น
- ติดต่อทีมพัฒนา

---

**เอกสารนี้สร้างเมื่อ**: 17 พฤศจิกายน 2025  
**เวอร์ชัน**: 1.0.0
