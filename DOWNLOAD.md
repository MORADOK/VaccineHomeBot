# 📥 ดาวน์โหลด VCHome Hospital Desktop App

## 🏥 **VCHome Hospital Management System**
ระบบจัดการโรงพยาบาลและวัคซีนแบบครบวงจร

---

## 🌐 **ดาวน์โหลดจาก Web App**

เข้าสู่หน้าดาวน์โหลดจากแอปพลิเคชันของเรา:
- **[🔗 หน้าดาวน์โหลดหลัก](https://moradok.github.io/VaccineHomeBot/#/download)**
- หรือใช้เมนู "ดาวน์โหลด Desktop App" จากหน้าหลัก

---

## 💻 **ดาวน์โหลดสำหรับ Desktop**

### **🪟 Windows (แนะนำ)**
- **[📦 VCHome Hospital Installer (.exe)](https://github.com/MORADOK/VaccineHomeBot/releases/latest/download/VCHome-Hospital-Setup-1.0.0.exe)**
  - ติดตั้งแบบปกติ พร้อม shortcuts
  - อัพเดทอัตโนมัติ
  - ขนาด: ~150 MB

- **[🎒 Portable Version (.exe)](https://github.com/MORADOK/VaccineHomeBot/releases/latest/download/VCHome-Hospital-Portable.exe)**
  - ไม่ต้องติดตั้ง รันได้เลย
  - เหมาะสำหรับ USB drive
  - ขนาด: ~150 MB

### **🍎 macOS**
- **[📦 VCHome Hospital (.dmg)](https://github.com/MORADOK/VaccineHomeBot/releases/latest/download/VCHome-Hospital-1.0.0.dmg)**
  - สำหรับ macOS 10.15 ขึ้นไป
  - Intel และ Apple Silicon
  - ขนาด: ~150 MB

### **🐧 Linux**
- **[📦 AppImage (.AppImage)](https://github.com/MORADOK/VaccineHomeBot/releases/latest/download/VCHome-Hospital-1.0.0.AppImage)**
  - รันได้ทุก Linux distribution
  - ไม่ต้องติดตั้ง
  - ขนาด: ~150 MB

- **[📦 Debian Package (.deb)](https://github.com/MORADOK/VaccineHomeBot/releases/latest/download/VCHome-Hospital-1.0.0.deb)**
  - สำหรับ Ubuntu/Debian
  - ติดตั้งผ่าน package manager
  - ขนาด: ~150 MB

---

## 🌐 **เข้าใช้ผ่าน Web Browser**

### **🔗 Web Application (GitHub Pages):**
- **[🌐 VCHome Hospital Web App](https://moradok.github.io/VaccineHomeBot/)**
  - ใช้งานผ่าน browser ได้เลย
  - ไม่ต้องติดตั้งอะไร
  - รองรับ mobile และ tablet
  - อัพเดทอัตโนมัติจาก GitHub

---

## 📋 **ความต้องการระบบ**

### **💻 Desktop App:**
- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 10.15 Catalina ขึ้นไป
- **Linux**: Ubuntu 18.04 ขึ้นไป หรือ equivalent
- **RAM**: 4GB ขั้นต่ำ, 8GB แนะนำ
- **Storage**: 500MB พื้นที่ว่าง
- **Internet**: จำเป็นสำหรับ sync ข้อมูล

### **🌐 Web App:**
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Internet**: จำเป็นสำหรับการใช้งาน
- **JavaScript**: ต้องเปิดใช้งาน

---

## 🚀 **วิธีติดตั้ง**

### **Windows:**
1. ดาวน์โหลด `.exe` installer
2. คลิกขวา → "Run as administrator"
3. ทำตาม wizard การติดตั้ง
4. เปิดใช้งานจาก Start Menu

### **macOS:**
1. ดาวน์โหลด `.dmg` file
2. เปิดไฟล์และลาก app ไปที่ Applications
3. เปิดใช้งานจาก Launchpad
4. อนุญาต "Open anyway" หากมี security warning

### **Linux:**
```bash
# AppImage
chmod +x VCHome-Hospital-1.0.0.AppImage
./VCHome-Hospital-1.0.0.AppImage

# Debian/Ubuntu
sudo dpkg -i VCHome-Hospital-1.0.0.deb
sudo apt-get install -f  # หากมี dependency issues
```

---

## 🔐 **ความปลอดภัย**

### **✅ การตรวจสอบ:**
- ไฟล์ทั้งหมดผ่านการ scan virus แล้ว
- Code signing certificate (Windows/macOS)
- Open source - ตรวจสอบ source code ได้

### **🛡️ Privacy:**
- ข้อมูลเก็บบน Supabase (encrypted)
- ไม่มีการเก็บข้อมูลส่วนตัวโดยไม่ได้รับอนุญาต
- ใช้ HTTPS เท่านั้น

---

## 📞 **ติดต่อสนับสนุน**

### **🆘 หากมีปัญหา:**
- **GitHub Issues**: [Report Bug](https://github.com/MORADOK/VaccineHomeBot/issues)
- **Email**: support@vchomehospital.com
- **Documentation**: [User Guide](https://github.com/MORADOK/VaccineHomeBot/wiki)

### **💡 Feature Requests:**
- [Request New Feature](https://github.com/MORADOK/VaccineHomeBot/issues/new?template=feature_request.md)

---

## 📊 **เวอร์ชันปัจจุบัน: v1.0.0**

### **🆕 Features:**
- ✅ ระบบจัดการผู้ป่วยและวัคซีน
- ✅ การจองคิวออนไลน์
- ✅ ระบบแจ้งเตือนอัตโนมัติ
- ✅ รายงานและสถิติ
- ✅ การจัดการ domain แบบ custom
- ✅ Desktop app โหมดสะอาด (ไม่มี console)

### **🔄 Auto-Update:**
Desktop app จะตรวจสอบและอัพเดทอัตโนมัติเมื่อมีเวอร์ชันใหม่

---

**🏥 VCHome Hospital - ระบบจัดการโรงพยาบาลที่ทันสมัย**