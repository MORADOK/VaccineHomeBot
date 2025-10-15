# 🚨 Critical Fixes Report - รพ.โฮม

## 🔍 ปัญหาที่พบ

### 1. Missing Logo Images (404 Errors)
```
Failed to load resource: /images/hospital-logo.png 404
Failed to load resource: /images/home-hospital-logo.png 404
```
**สาเหตุ:** Base path ไม่ถูกต้องสำหรับ GitHub Pages

### 2. Supabase Function Error (500)
```
fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message: 500
```
**สาเหตุ:** Logo URL ใน LINE message ใช้ domain ที่ไม่มีจริง

### 3. Staff Portal 404
```
staff-portal: Failed to load resource: 404
```
**สาเหตุ:** Routing issue หรือ deployment problem

## ✅ การแก้ไขที่ทำแล้ว

### 1. แก้ไข Logo Components
**ไฟล์:** `src/components/Logo.tsx`, `src/components/HospitalLogo.tsx`

**ปัญหา:** Path ไม่รวม base URL สำหรับ GitHub Pages
```typescript
// เก่า
src="/images/hospital-logo.png"

// ใหม่
src={basePath + "images/hospital-logo.png"}
```

**การปรับปรุง:**
- ใช้ `import.meta.env.BASE_URL` สำหรับ base path
- เพิ่ม fallback mechanism ที่ดีขึ้น
- รองรับ GitHub Pages path `/VaccineHomeBot/`

### 2. ปรับปรุง Error Handling
```typescript
const baseUrl = import.meta.env.BASE_URL || '/'
const basePath = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
```

## 🔧 การแก้ไขที่ต้องทำต่อ

### 1. แก้ไข Supabase Function URLs
**ไฟล์:** `supabase/functions/send-line-message/index.ts`

**ปัญหา:** 
```typescript
url: "https://your-domain.com/lovable-uploads/..."
```

**แก้ไข:**
```typescript
url: "https://moradok.github.io/VaccineHomeBot/lovable-uploads/..."
```

**หรือใช้ environment variable:**
```typescript
const LOGO_BASE_URL = Deno.env.get('LOGO_BASE_URL') || 'https://moradok.github.io/VaccineHomeBot'
url: `${LOGO_BASE_URL}/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png`
```

### 2. ตรวจสอบ LINE Channel Access Token
```bash
# ใน Supabase Dashboard > Edge Functions > Environment Variables
LINE_CHANNEL_ACCESS_TOKEN=your_actual_token
```

### 3. แก้ไข auto-vaccine-notifications function
**ไฟล์:** `supabase/functions/auto-vaccine-notifications/index.ts`

**ปัญหาเดียวกัน:**
```typescript
url: "https://your-domain.com/lovable-uploads/..."
```

## 🚀 ขั้นตอนการแก้ไข

### Step 1: แก้ไข Supabase Functions
```bash
# แก้ไขไฟล์ทั้งสอง
supabase/functions/send-line-message/index.ts
supabase/functions/auto-vaccine-notifications/index.ts

# เปลี่ยน
"https://your-domain.com/lovable-uploads/"
# เป็น
"https://moradok.github.io/VaccineHomeBot/lovable-uploads/"
```

### Step 2: Deploy Supabase Functions
```bash
supabase functions deploy send-line-message
supabase functions deploy auto-vaccine-notifications
```

### Step 3: ตั้งค่า Environment Variables
```bash
# ใน Supabase Dashboard
LOGO_BASE_URL=https://moradok.github.io/VaccineHomeBot
LINE_CHANNEL_ACCESS_TOKEN=your_actual_token
```

### Step 4: Build และ Deploy ใหม่
```bash
npm run build
git add .
git commit -m "Fix: Logo paths and Supabase function URLs"
git push origin main
```

## 📋 Checklist

- [x] แก้ไข Logo.tsx component
- [x] แก้ไข HospitalLogo.tsx component  
- [ ] แก้ไข send-line-message function URLs
- [ ] แก้ไข auto-vaccine-notifications function URLs
- [ ] Deploy Supabase functions
- [ ] ตั้งค่า environment variables
- [ ] Build และ deploy ใหม่
- [ ] ทดสอบ logo loading
- [ ] ทดสอบ LINE notifications

## 🔍 การทดสอบหลังแก้ไข

### 1. ทดสอบ Logo Loading
```javascript
// ใน Browser Console
document.querySelectorAll('img').forEach(img => {
  console.log(img.src, img.complete ? 'OK' : 'FAILED')
})
```

### 2. ทดสอบ Supabase Functions
```bash
curl -X POST https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","message":"test"}'
```

### 3. ทดสอบ Routes
```
✅ https://moradok.github.io/VaccineHomeBot/
✅ https://moradok.github.io/VaccineHomeBot/staff-portal
✅ https://moradok.github.io/VaccineHomeBot/patient-portal
```

## 📝 หมายเหตุสำคัญ

1. **GitHub Pages Base Path:** ต้องใช้ `/VaccineHomeBot/` prefix
2. **Supabase Functions:** ต้อง deploy แยกจาก main app
3. **Environment Variables:** ตั้งค่าใน Supabase Dashboard
4. **Cache:** อาจต้อง clear browser cache หลังแก้ไข

## ✨ ผลลัพธ์ที่คาดหวัง

หลังแก้ไขทั้งหมด:
- ✅ โลโก้แสดงผลถูกต้องทุกหน้า
- ✅ LINE notifications ทำงานปกติ
- ✅ ไม่มี 404 errors ใน console
- ✅ Staff portal เข้าถึงได้
- ✅ Supabase functions ทำงานปกติ