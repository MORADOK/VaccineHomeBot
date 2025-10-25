# คู่มือการ Deploy โปรแกรม VCHome Hospital

## 🎯 ภาพรวม

โปรแกรมนี้สามารถ deploy ได้ 3 แบบ:
1. **Web Server** (Vercel, Netlify, Railway) - สำหรับการใช้งานผ่านเว็บ
2. **GitHub Pages** - สำหรับ demo หรือ documentation
3. **Desktop App** - สำหรับใช้งานแบบ offline

---

## 📦 การ Build

### 1. Build สำหรับ Web Server (แนะนำ)
```bash
npm run build
# หรือ
npm run build:web
```
- ใช้ base path: `/` (root)
- เหมาะกับ: Vercel, Netlify, Railway, VPS
- ไฟล์จะอยู่ใน folder `dist/`

### 2. Build สำหรับ GitHub Pages
```bash
npm run build:github
```
- ใช้ base path: `/VaccineHomeBot/`
- เหมาะกับ: GitHub Pages deployment

### 3. Build สำหรับ Development/Testing
```bash
npm run build:dev
```
- ไม่มี minification
- เก็บ sourcemaps
- เหมาะกับ: การทดสอบ

---

## 🌐 Deploy บน Web Server (ฟรี)

### ตัวเลือกที่ 1: Vercel (แนะนำ) ⭐

**ข้อดี:**
- Deploy ฟรีไม่จำกัด
- SSL/HTTPS อัตโนมัติ
- CDN ทั่วโลก
- Deploy อัตโนมัติจาก GitHub

**วิธี Deploy:**

1. ติดตั้ง Vercel CLI:
```bash
npm install -g vercel
```

2. Login และ Deploy:
```bash
vercel login
vercel
```

3. ตอบคำถาม:
- Set up and deploy? → Yes
- Which scope? → เลือก account ของคุณ
- Link to existing project? → No
- Project name? → vaccinehomebot (หรือชื่อที่ต้องการ)
- Directory? → `./`
- Build command? → `npm run build`
- Output directory? → `dist`

4. รอให้ deploy เสร็จ → คุณจะได้ URL เช่น `https://vaccinehomebot.vercel.app`

**Deploy ผ่าน GitHub (อัตโนมัติ):**
1. Push code ไป GitHub
2. เข้า https://vercel.com
3. Import repository
4. Vercel จะ deploy อัตโนมัติทุกครั้งที่ push

**Environment Variables:**
- ไปที่ Project Settings → Environment Variables
- เพิ่ม:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_WEBHOOK_URL`

---

### ตัวเลือกที่ 2: Netlify

**วิธี Deploy:**

1. ติดตั้ง Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login และ Deploy:
```bash
netlify login
netlify deploy --prod
```

3. เลือก:
- Build command: `npm run build`
- Publish directory: `dist`

**Deploy ผ่าน Web Interface:**
1. ไปที่ https://app.netlify.com
2. Drag & Drop folder `dist/` หลัง build
3. หรือ connect กับ GitHub repository

**Environment Variables:**
- Site Settings → Build & Deploy → Environment
- เพิ่มตัวแปรเดียวกับใน `.env`

---

### ตัวเลือกที่ 3: Railway

**วิธี Deploy:**

1. ติดตั้ง Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login และสร้าง project:
```bash
railway login
railway init
```

3. Deploy:
```bash
railway up
```

**Deploy ผ่าน Web:**
1. ไปที่ https://railway.app
2. New Project → Deploy from GitHub
3. เลือก repository
4. Railway จะอ่าน `railway.json` และ deploy อัตโนมัติ

**ตั้งค่า Environment Variables:**
- Project → Variables
- เพิ่มตัวแปรจาก `.env`

---

## 🔧 การตั้งค่า Environment Variables

สำหรับทุก platform คุณต้องตั้งค่าตัวแปรเหล่านี้:

```env
VITE_SUPABASE_PROJECT_ID=fljyjbrgfzervxofrilo
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://fljyjbrgfzervxofrilo.supabase.co
VITE_WEBHOOK_URL=https://primary-production-787bd.up.railway.app/webhook/Webhook-Vaccine
```

⚠️ **สำคัญ:** ห้ามเปิดเผย API keys ใน public repository!

---

## 🧪 ทดสอบหลัง Build

### 1. ทดสอบ Local (แนะนำก่อน deploy)
```bash
npm run build
npm run preview
```
เปิดเบราว์เซอร์ไปที่ http://localhost:4173

### 2. ตรวจสอบ Features
- ✅ เข้าหน้าแรกได้
- ✅ กดล็อกอินพนักงานได้ (ไม่ error 404)
- ✅ ระบบนัดหมายทำงาน
- ✅ เชื่อมต่อ Supabase ได้
- ✅ LINE Bot integration (ถ้ามี)

---

## 📊 เปรียบเทียบ Hosting Platforms

| Platform | ฟรี | SSL | CDN | Auto Deploy | ราคา (เสียเงิน) |
|----------|-----|-----|-----|-------------|----------------|
| **Vercel** | ✅ | ✅ | ✅ | ✅ | $20/เดือน (Pro) |
| **Netlify** | ✅ | ✅ | ✅ | ✅ | $19/เดือน (Pro) |
| **Railway** | ⚠️ $5 credit/เดือน | ✅ | ❌ | ✅ | จ่ายตามใช้ |
| **GitHub Pages** | ✅ | ✅ | ✅ | ✅ | ฟรี (public repo) |

**คำแนะนำ:**
- สำหรับโปรเจค production → **Vercel** หรือ **Netlify**
- สำหรับ demo/testing → **GitHub Pages**
- ต้องการ backend/database → **Railway**

---

## 🚀 Quick Start (Deploy ใน 5 นาที)

### วิธีที่เร็วที่สุด - Vercel

```bash
# 1. Build project
npm run build

# 2. ติดตั้ง Vercel (ครั้งเดียว)
npm install -g vercel

# 3. Deploy!
vercel --prod

# 4. ตั้งค่า environment variables ใน Vercel dashboard
# 5. เสร็จสิ้น! คุณจะได้ URL เช่น https://vaccinehomebot.vercel.app
```

---

## ❓ แก้ไขปัญหา

### ปัญหา: หลัง deploy กดล็อกอินแล้ว error 404

**สาเหตุ:** base path ไม่ถูกต้อง

**แก้ไข:**
1. ตรวจสอบว่า build ด้วยคำสั่งไหน:
   - `npm run build` → base path = `/` ✅
   - `npm run build:github` → base path = `/VaccineHomeBot/` ❌ (ใช้เฉพาะ GitHub Pages)

2. ถ้ายัง error ให้ตรวจสอบ platform configuration:
   - **Vercel:** ตรวจสอบ `vercel.json` มี rewrites ถูกต้อง
   - **Netlify:** ตรวจสอบ `netlify.toml` มี redirects
   - **Railway:** ตรวจสอบใช้ `serve -s` (single page app mode)

### ปัญหา: Supabase connection error

**แก้ไข:**
1. ตรวจสอบ environment variables ใน platform dashboard
2. ตรวจสอบ Supabase URL และ API Key ถูกต้อง
3. ตรวจสอบ CORS settings ใน Supabase

### ปัญหา: Build failed

**แก้ไข:**
```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install

# ลอง build อีกครั้ง
npm run build
```

---

## 📚 เอกสารเพิ่มเติม

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Railway Documentation](https://docs.railway.app)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

---

## 🔐 Security Checklist

ก่อน deploy production:

- [ ] ตั้งค่า environment variables ถูกต้อง
- [ ] ไม่มี API keys ใน code
- [ ] Enable HTTPS/SSL
- [ ] ตั้งค่า CORS ใน Supabase
- [ ] ทดสอบ authentication flow
- [ ] Enable CSP (Content Security Policy)
- [ ] ตรวจสอบ rate limiting

---

**หมายเหตุ:** ถ้าต้องการความช่วยเหลือเพิ่มเติม สามารถดูที่ `DEPLOYMENT-GUIDE.md` (Thai) หรือถามทีมพัฒนา
