# 🚀 VCHome Hospital - Deployment Guide

## 📋 **Overview**
คู่มือการแจกจ่ายและติดตั้ง VCHome Hospital Desktop App และ Web Application

---

## 🖥️ **Desktop Application Deployment**

### **Automatic Build & Release (GitHub Actions)**

#### **1. สร้าง Release ใหม่:**
```bash
# วิธี 1: ใช้ Git Tags
git tag v1.0.0
git push origin v1.0.0

# วิธี 2: ใช้ GitHub Actions Manual Trigger
# ไปที่ GitHub → Actions → "Build and Release Desktop App" → Run workflow
```

#### **2. ผลลัพธ์ที่ได้:**
- **Windows**: `VCHome-Hospital-Setup-1.0.0.exe` (Installer)
- **Windows**: `VCHome-Hospital-Portable.exe` (Portable)
- **macOS**: `VCHome-Hospital-1.0.0.dmg`
- **Linux**: `VCHome-Hospital-1.0.0.AppImage`

### **Manual Build (Local)**

#### **Windows:**
```bash
npm install
npm run build
npm run dist-win
```

#### **macOS:**
```bash
npm install
npm run build
npm run dist-mac
```

#### **Linux:**
```bash
npm install
npm run build
npm run dist-linux
```

---

## 🌐 **Web Application Deployment**

### **GitHub Pages (Free)**

#### **1. เปิดใช้งาน GitHub Pages:**
1. ไปที่ Repository Settings
2. เลือก Pages → Source: GitHub Actions
3. Push code ขึ้น main branch

#### **2. URL ที่ได้:**
```
https://[username].github.io/VaccineHomeBot
```

### **Vercel (Recommended)**

#### **1. เชื่อมต่อ GitHub:**
1. สมัคร [Vercel](https://vercel.com)
2. Import GitHub Repository
3. ตั้งค่า Environment Variables

#### **2. Environment Variables:**
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### **Netlify (Alternative)**

#### **1. Deploy Command:**
```bash
# Build Command
npm run build

# Publish Directory
dist
```

---

## 🗄️ **Database Setup (Supabase)**

### **1. สร้าง Supabase Project:**
1. ไปที่ [Supabase](https://supabase.com)
2. สร้าง New Project
3. รัน SQL migrations:

```sql
-- Domain Configurations
CREATE TABLE domain_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  dns_records JSONB,
  ssl_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domain Monitoring
CREATE TABLE domain_monitoring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID REFERENCES domain_configurations(id),
  check_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. RLS Policies:**
```sql
-- Enable RLS
ALTER TABLE domain_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_monitoring ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON domain_configurations FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON domain_monitoring FOR SELECT USING (true);
```

---

## 🔐 **Security Configuration**

### **Environment Variables:**
```bash
# Production
VITE_APP_ENVIRONMENT=production
VITE_ADMIN_PASSWORD_MIN_LENGTH=12
VITE_SESSION_TIMEOUT=1800000

# Development
VITE_APP_ENVIRONMENT=development
VITE_ADMIN_PASSWORD_MIN_LENGTH=6
VITE_SESSION_TIMEOUT=3600000
```

### **Domain Security:**
- ใช้ HTTPS เท่านั้น
- ตั้งค่า CORS policies
- เปิดใช้งาน Content Security Policy (CSP)

---

## 📦 **Distribution Methods**

### **1. Direct Download (GitHub Releases)**
- ผู้ใช้ดาวน์โหลดจาก GitHub Releases
- ติดตั้งด้วยตนเอง
- เหมาะสำหรับ IT-savvy users

### **2. Auto-Update System**
```javascript
// electron-updater configuration
"build": {
  "publish": {
    "provider": "github",
    "owner": "MORADOK",
    "repo": "VaccineHomeBot"
  }
}
```

### **3. Enterprise Distribution**
- สร้าง MSI installer สำหรับ Windows
- ใช้ Group Policy deployment
- Corporate app store

---

## 🎯 **User Access Methods**

### **1. Web Application:**
```
https://vchomehospital.vercel.app
```

### **2. Desktop Application:**
- ดาวน์โหลดจาก GitHub Releases
- ติดตั้งบนเครื่องผู้ใช้
- ใช้งานแบบ offline ได้

### **3. Mobile Access:**
- เข้าใช้ผ่าน web browser
- PWA support (ติดตั้งเป็น app ได้)
- LINE LIFF integration

---

## 🔄 **Update Process**

### **Automatic Updates:**
1. Push code ขึ้น GitHub
2. GitHub Actions build ใหม่
3. สร้าง release ใหม่
4. Desktop app ตรวจสอบ update อัตโนมัติ

### **Manual Updates:**
1. ดาวน์โหลด version ใหม่
2. ติดตั้งทับของเก่า
3. ข้อมูลจะถูกเก็บไว้

---

## 📊 **Monitoring & Analytics**

### **Application Monitoring:**
- Vercel Analytics (web)
- Sentry error tracking
- Supabase database monitoring

### **User Analytics:**
- Google Analytics
- Usage statistics
- Performance metrics

---

## 🆘 **Support & Troubleshooting**

### **Common Issues:**
1. **Database Connection**: ตรวจสอบ Supabase credentials
2. **Domain Issues**: ใช้ DNS troubleshooting tools
3. **Desktop App**: ตรวจสอบ Windows Defender/Antivirus

### **Support Channels:**
- GitHub Issues
- Email support
- Documentation wiki

---

## ✅ **Deployment Checklist**

### **Pre-Deployment:**
- [ ] ทดสอบ build ใน local environment
- [ ] ตั้งค่า environment variables
- [ ] ทดสอบ database connections
- [ ] ตรวจสอบ security settings

### **Deployment:**
- [ ] Push code ขึ้น GitHub
- [ ] รัน GitHub Actions
- [ ] ทดสอบ web application
- [ ] ทดสอบ desktop application
- [ ] ตรวจสอบ auto-update system

### **Post-Deployment:**
- [ ] Monitor error logs
- [ ] ตรวจสอบ performance metrics
- [ ] รวบรวม user feedback
- [ ] วางแผน updates ถัดไป

---

**🎉 VCHome Hospital พร้อมแจกจ่ายแล้ว!**