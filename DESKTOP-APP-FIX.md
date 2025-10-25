# 🔧 แก้ไขปัญหา Desktop App ใช้งานไม่ได้

## ❌ ปัญหาที่เกิดขึ้น

```
Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY
```

Desktop app ติดตั้งแล้วเปิดใช้งานไม่ได้ เพราะไม่พบ environment variables (Supabase configuration)

---

## 🔍 สาเหตุ

1. **Desktop app ไม่สามารถอ่านไฟล์ `.env` ได้** - เพราะมันเป็น built app ที่ถูก package แล้ว
2. **Environment variables ต้องถูก embed ตอน build time** - ไม่ใช่ runtime
3. **vite.config.electron.ts เดิมไม่มีการ define env variables**

---

## ✅ การแก้ไขที่ทำไปแล้ว

แก้ไขไฟล์ `vite.config.electron.ts`:
- ✅ เพิ่ม `loadEnv()` เพื่อโหลด environment variables จาก `.env`
- ✅ เพิ่ม `define` section เพื่อ embed variables ลงในโค้ด
- ✅ กำหนดให้ใช้ `VITE_SUPABASE_PUBLISHABLE_KEY` เป็น `VITE_SUPABASE_ANON_KEY`

---

## 🚀 วิธีแก้ไขและ Build ใหม่

### ขั้นตอนที่ 1: ตรวจสอบไฟล์ `.env`

ให้แน่ใจว่ามีไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจค และมีข้อมูลครบ:

```env
VITE_SUPABASE_PROJECT_ID=fljyjbrgfzervxofrilo
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://fljyjbrgfzervxofrilo.supabase.co
VITE_WEBHOOK_URL=https://primary-production-787bd.up.railway.app/webhook/Webhook-Vaccine
```

⚠️ **สำคัญ:** ต้องใช้ชื่อ `VITE_SUPABASE_PUBLISHABLE_KEY` (ไม่ใช่ `VITE_SUPABASE_ANON_KEY`)

---

### ขั้นตอนที่ 2: ลบ Build เก่าทิ้ง

```bash
# Windows
rmdir /s /q dist-electron

# macOS/Linux
rm -rf dist-electron
```

---

### ขั้นตอนที่ 3: Build Desktop App ใหม่

```bash
npm run build:electron
```

**คำสั่งนี้จะ:**
1. โหลด environment variables จาก `.env`
2. Build React app พร้อม embed env variables
3. สร้างไฟล์ใน `dist-electron/` folder

---

### ขั้นตอนที่ 4: ทดสอบก่อน Package (แนะนำ)

ทดสอบ Electron app ก่อนสร้าง installer:

```bash
npm run electron-prod
```

หรือ

```bash
cross-env NODE_ENV=production electron .
```

**ตรวจสอบ:**
- ✅ App เปิดขึ้นมาได้
- ✅ ไม่มี error ใน Console (กด F12)
- ✅ ล็อกอินได้
- ✅ ระบบทำงานปกติ

---

### ขั้นตอนที่ 5: สร้าง Installer/Package

หลังจากทดสอบแล้วไม่มีปัญหา ให้สร้าง installer:

#### Windows:
```bash
npm run dist-win
```

ไฟล์ที่ได้:
- `dist/VCHome Hospital Setup.exe` - Installer (NSIS)
- `dist/VCHome-Hospital-Portable.exe` - Portable version

#### macOS:
```bash
npm run dist-mac
```

ไฟล์ที่ได้:
- `dist/VCHome Hospital.dmg`

#### Linux:
```bash
npm run dist-linux
```

ไฟล์ที่ได้:
- `dist/VCHome-Hospital-x.x.x.AppImage`
- `dist/vchome-hospital-desktop_x.x.x_amd64.deb`

---

## 🧪 การทดสอบหลัง Build

1. **ติดตั้งจากไฟล์ installer ที่สร้างใหม่**
2. **เปิด Desktop app**
3. **กด F12 เพื่อเปิด DevTools**
4. **ตรวจสอบ Console** - ต้องไม่มี error เกี่ยวกับ Supabase
5. **ทดสอบล็อกอิน** - ต้องล็อกอินได้ปกติ
6. **ทดสอบฟีเจอร์ต่างๆ**

---

## ⚠️ ข้อควรระวัง

### 1. ห้ามใช้ `npm run build` สำหรับ Desktop App

```bash
# ❌ ผิด - สำหรับ Web
npm run build

# ✅ ถูก - สำหรับ Desktop
npm run build:electron
```

### 2. ห้าม commit ไฟล์ `.env` ลง Git

ไฟล์ `.env` มี sensitive data (API keys) ต้องเก็บเป็นความลับ

แก้ไข `.gitignore` ให้มีบรรทัดนี้:
```
.env
.env.local
.env.production
```

### 3. ตรวจสอบ Environment Variables ก่อน Build

ก่อน build ทุกครั้ง ให้ run:

```bash
# Windows
type .env

# macOS/Linux
cat .env
```

ตรวจสอบว่ามีค่าครบทุกตัวแปร

---

## 🔄 ถ้ายังใช้งานไม่ได้

### วิธีที่ 1: ตรวจสอบใน DevTools

1. เปิด app → กด F12
2. ไปที่ Console tab
3. พิมพ์:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```
4. ต้องเห็นค่าที่ถูกต้อง ไม่ใช่ `undefined`

### วิธีที่ 2: Build ใหม่ทั้งหมด

```bash
# ลบทั้งหมด
rm -rf node_modules dist dist-electron

# ติดตั้งใหม่
npm install

# Build ใหม่
npm run build:electron

# ทดสอบ
npm run electron-prod
```

### วิธีที่ 3: ตรวจสอบ Supabase Client

ตรวจสอบไฟล์ `src/integrations/supabase/client.ts`:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}
```

---

## 📝 Summary

**ปัญหาเดิม:**
- Desktop app ไม่มี environment variables → Error

**วิธีแก้:**
1. ✅ แก้ไข `vite.config.electron.ts` ให้ embed env variables
2. ✅ Build ใหม่ด้วย `npm run build:electron`
3. ✅ Package ด้วย `npm run dist-win` (หรือ dist-mac/dist-linux)

**ผลลัพธ์:**
- Desktop app ที่สร้างใหม่จะมี environment variables ถูก embed ไว้
- ไม่ต้องมีไฟล์ `.env` ตอน runtime
- App ทำงานได้ปกติหลังติดตั้ง

---

## 📚 คำสั่งที่ควรจำ

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run build:electron` | Build สำหรับ desktop app |
| `npm run electron-prod` | ทดสอบ desktop app (production mode) |
| `npm run dist-win` | สร้าง Windows installer |
| `npm run dist-mac` | สร้าง macOS .dmg |
| `npm run dist-linux` | สร้าง Linux AppImage + .deb |

---

**หมายเหตุ:** หากต้องการความช่วยเหลือเพิ่มเติม ดูที่ `DEPLOYMENT.md` หรือ `DESKTOP-APP-README.md`
