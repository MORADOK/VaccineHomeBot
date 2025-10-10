# 🏥 VCHome Hospital Management System v1.0.0

ระบบบริหารจัดการคลินิกวัคซีนแบบครบวงจร พร้อมใช้งานทั้งแบบ Web และ Desktop Application

## ✨ ฟีเจอร์หลัก

### 🎯 สำหรับผู้ป่วย
- ✅ ลงทะเบียนผู้ป่วยและนัดหมาย
- ✅ ตรวจสอบประวัติการฉีดวัคซีน
- ✅ รับการแจ้งเตือนผ่าน LINE Bot
- ✅ เข้าถึงข้อมูลผ่าน LINE LIFF

### 👨‍⚕️ สำหรับเจ้าหน้าที่
- ✅ จัดการข้อมูลผู้ป่วยและนัดหมาย
- ✅ ระบบแจ้งเตือนอัตโนมัติ
- ✅ Dashboard สำหรับติดตามสถานะ
- ✅ จัดการโดเมนและการตั้งค่า

### 🔧 ฟีเจอร์เทคนิค
- 🚀 Build optimized (Bundle 574KB + vendor chunks)
- 📱 Responsive design
- 🔒 Supabase backend
- 🌐 Domain management system
- 📊 Google Sheets integration

---

## 📥 ดาวน์โหลด

เลือก 1 ใน 2 แบบ:

### 🔹 VCHome-Hospital-Setup-1.0.0.exe (545 MB)
**ตัวติดตั้งแบบเต็ม** (แนะนำ)
- มี Wizard ติดตั้ง
- สร้าง shortcut อัตโนมัติ
- รองรับ Windows x64 และ x86
- ถอนการติดตั้งได้ง่าย

**ดาวน์โหลด:** `dist/VCHome Hospital Setup 1.0.0.exe`

### 🔹 VCHome-Hospital-Portable.exe (184 MB)
**แบบ Portable** (ไม่ต้องติดตั้ง)
- รันได้เลย ไม่ต้อง install
- พกพาได้ (USB drive)
- ไม่ต้องใช้ admin rights
- เหมาะสำหรับทดลองใช้

**ดาวน์โหลด:** `dist/VCHome-Hospital-Portable.exe`

---

## 💻 ความต้องการของระบบ

- **OS**: Windows 10/11 (64-bit หรือ 32-bit)
- **RAM**: 4 GB ขึ้นไป (แนะนำ 8 GB)
- **พื้นที่**: 1 GB ว่าง
- **อินเทอร์เน็ต**: จำเป็นสำหรับเชื่อมต่อ Supabase

---

## 🚀 วิธีติดตั้ง

### สำหรับ Setup.exe:
1. ดาวน์โหลด **VCHome-Hospital-Setup-1.0.0.exe**
2. ดับเบิ้ลคลิกไฟล์
3. ถ้า Windows Defender แจ้งเตือน คลิก "More info" → "Run anyway"
4. ทำตาม Wizard: Next → เลือกตำแหน่ง → Install
5. รอติดตั้งเสร็จ (1-2 นาที)
6. เปิดใช้จาก Desktop หรือ Start Menu

### สำหรับ Portable.exe:
1. ดาวน์โหลด **VCHome-Hospital-Portable.exe**
2. วางไฟล์ที่ต้องการ (Desktop/USB/Folder ใดก็ได้)
3. ดับเบิ้ลคลิกเพื่อเปิด
4. ใช้งานได้เลย!

---

## 📚 เอกสารประกอบ

- [README.md](https://github.com/MORADOK/VaccineHomeBot/blob/main/README.md) - คู่มือเริ่มต้น
- [CLAUDE.md](https://github.com/MORADOK/VaccineHomeBot/blob/main/CLAUDE.md) - เอกสารสำหรับนักพัฒนา
- [DESKTOP-APP-README.md](https://github.com/MORADOK/VaccineHomeBot/blob/main/DESKTOP-APP-README.md) - คู่มือ Desktop App
- [DEPLOYMENT-GUIDE.md](https://github.com/MORADOK/VaccineHomeBot/blob/main/DEPLOYMENT-GUIDE.md) - คู่มือการติดตั้งและใช้งาน

---

## 🔄 อัพเดท

### สำหรับผู้ใช้:
- ติดตั้งเวอร์ชันใหม่ทับเวอร์ชันเก่าได้เลย
- ข้อมูลจะไม่สูญหาย

### สำหรับนักพัฒนา:
```bash
npm install
npm run build
npm run dist-win
```

---

## 🐛 พบปัญหา?

- 🔗 [เปิด Issue](https://github.com/MORADOK/VaccineHomeBot/issues)
- 📧 ติดต่อทีมพัฒนา

---

## 📝 Technical Details

- **Electron**: 38.2.2
- **React**: 18.3.1
- **TypeScript**: 5.5.3
- **Vite**: 5.4.20
- **Supabase**: 2.54.0
- **Bundle Size**: 574 KB (main) + vendor chunks

---

## ⚠️ หมายเหตุ

- โปรแกรมนี้ใช้สำหรับสถานพยาบาลเท่านั้น
- จำเป็นต้องมี Supabase credentials
- ข้อมูลผู้ป่วยจัดเก็บบน Supabase cloud

---

**🎉 ขอบคุณที่ใช้ VCHome Hospital Management System!**

🤖 Built with [Claude Code](https://claude.com/claude-code)

Copyright © 2024 VCHome Hospital. All rights reserved.
