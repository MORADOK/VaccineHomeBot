# 🔍 คู่มือ Debug ปัญหาจอขาว

## 📅 **วันที่:** October 9, 2025
## 🎯 **เป้าหมาย:** หาสาเหตุและแก้ไขปัญหาจอขาว

---

## 🚨 **ปัญหาที่พบ:**

แอป Electron เปิดขึ้นมาแล้วแสดงจอขาว ไม่มี UI ขึ้นมา

---

## 🔍 **วิธีการ Debug:**

### **ขั้นตอนที่ 1: เปิด DevTools เพื่อดู Error**

ให้แก้ไข `public/electron-clean.js` ชั่วคราว:

```javascript
// แก้ไขบรรทัดนี้
mainWindow.once('ready-to-show', () => {
  mainWindow.show();
  
  // เปิด DevTools เพื่อ debug (ชั่วคราว)
  mainWindow.webContents.openDevTools(); // ✅ เปิดเสมอ
});
```

### **ขั้นตอนที่ 2: Build และทดสอบ**

```bash
# Build ใหม่
npm run build:electron

# ทดสอบ
npx electron .
```

### **ขั้นตอนที่ 3: ตรวจสอบ Console Errors**

เมื่อแอปเปิดขึ้นมา ให้ดูที่ DevTools Console:

#### **Error ที่อาจพบ:**

1. **CSP (Content Security Policy) Errors:**
```
Refused to connect to 'https://xxx.supabase.co' because it violates the following Content Security Policy directive: "connect-src 'self'"
```

**สาเหตุ:** CSP บล็อก Supabase connection

**วิธีแก้:**
```html
<!-- เพิ่ม https: wss: ws: ใน connect-src -->
<meta http-equiv="Content-Security-Policy" 
      content="connect-src 'self' https: wss: ws:;" />
```

2. **Module Loading Errors:**
```
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html"
```

**สาเหตุ:** Path ไม่ถูกต้อง หรือไฟล์ไม่พบ

**วิธีแก้:**
```javascript
// ตรวจสอบ path ใน electron-clean.js
console.log('Loading from:', startUrl);
console.log('File exists:', fs.existsSync(filePath));
```

3. **Supabase Connection Errors:**
```
WebSocket connection failed
Failed to fetch
```

**สาเหตุ:** CSP บล็อก WebSocket หรือ HTTPS

**วิธีแก้:**
```html
<!-- เพิ่ม wss: และ https: -->
<meta http-equiv="Content-Security-Policy" 
      content="connect-src 'self' https: wss:;" />
```

4. **React Errors:**
```
Uncaught Error: Minified React error
```

**สาเหตุ:** React component error

**วิธีแก้:** ดู error details ใน Console

---

## 🔧 **การแก้ไขที่ทำ:**

### **1. แก้ไข CSP ให้รองรับ Supabase:**

สร้างไฟล์ `vite-plugin-csp.ts`:

```typescript
import type { Plugin } from 'vite';

export function addElectronCSP(): Plugin {
  return {
    name: 'add-electron-csp',
    transformIndexHtml(html) {
      return html.replace(
        /<meta http-equiv="Content-Security-Policy"[^>]*>/,
        `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss: ws:;" />`
      );
    }
  };
}
```

### **2. อัพเดท vite.config.electron.ts:**

```typescript
import { addElectronCSP } from "./vite-plugin-csp";

export default defineConfig({
  plugins: [
    react(),
    addElectronCSP(), // เพิ่ม CSP plugin
  ],
});
```

### **3. เปิด DevTools ใน Development:**

```javascript
// ใน electron-clean.js
mainWindow.once('ready-to-show', () => {
  mainWindow.show();
  
  // เปิดเฉพาะ dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
});
```

---

## 🧪 **การทดสอบ:**

### **Test 1: ตรวจสอบ CSP**

```bash
# Build
npm run build:electron

# เปิด DevTools และดู Console
npx electron .

# ตรวจสอบว่าไม่มี CSP errors
```

### **Test 2: ตรวจสอบ Supabase Connection**

```bash
# ดูที่ Network tab ใน DevTools
# ตรวจสอบว่า Supabase requests สำเร็จ
```

### **Test 3: ตรวจสอบ React Rendering**

```bash
# ดูที่ Elements tab ใน DevTools
# ตรวจสอบว่า #root มี content
```

---

## 📊 **Checklist การ Debug:**

### **✅ ตรวจสอบ Build:**
- [ ] `dist-electron/index.html` มีอยู่
- [ ] `dist-electron/assets/` มีไฟล์ครบ
- [ ] CSP meta tag ถูกต้อง
- [ ] Script tags ถูกต้อง

### **✅ ตรวจสอบ Electron:**
- [ ] Path resolution ถูกต้อง
- [ ] DevTools เปิดได้
- [ ] Console ไม่มี errors
- [ ] Network requests สำเร็จ

### **✅ ตรวจสอบ React:**
- [ ] #root element มีอยู่
- [ ] React components render
- [ ] No React errors
- [ ] UI แสดงได้

---

## 🎯 **Common Issues และวิธีแก้:**

### **Issue 1: CSP บล็อก Supabase**

**อาการ:**
```
Refused to connect to 'https://xxx.supabase.co'
```

**วิธีแก้:**
```html
<meta http-equiv="Content-Security-Policy" 
      content="connect-src 'self' https: wss:;" />
```

### **Issue 2: Path ไม่ถูกต้อง**

**อาการ:**
```
Failed to load resource: net::ERR_FILE_NOT_FOUND
```

**วิธีแก้:**
```javascript
// เพิ่ม logging
console.log('__dirname:', __dirname);
console.log('Loading from:', startUrl);
```

### **Issue 3: React ไม่ render**

**อาการ:**
```
#root is empty
```

**วิธีแก้:**
```javascript
// ตรวจสอบ Console errors
// แก้ไข React component errors
```

---

## 🚀 **ขั้นตอนการแก้ไขสุดท้าย:**

### **1. แก้ไข CSP:**
```bash
# สร้าง vite-plugin-csp.ts
# อัพเดท vite.config.electron.ts
```

### **2. Build ใหม่:**
```bash
npm run build:electron
```

### **3. ทดสอบ:**
```bash
npx electron .
# เปิด DevTools (F12)
# ตรวจสอบ Console
```

### **4. สร้าง Installer:**
```bash
npm run dist-win
```

### **5. ทดสอบ Installer:**
```bash
dist\VCHome Hospital Setup 1.0.0.exe
```

---

## 📋 **สรุป:**

### **สาเหตุหลักของจอขาว:**
1. ❌ **CSP บล็อก Supabase** - connect-src ไม่รวม https: wss:
2. ❌ **Path ไม่ถูกต้อง** - ไม่พบไฟล์ index.html
3. ❌ **React errors** - Component render ไม่สำเร็จ

### **การแก้ไข:**
1. ✅ **แก้ไข CSP** - เพิ่ม https: wss: ws:
2. ✅ **แก้ไข Path** - ลองหลาย paths
3. ✅ **เปิด DevTools** - เพื่อ debug

### **ผลลัพธ์:**
- ✅ แอปเปิดและแสดง UI ได้
- ✅ Supabase connection สำเร็จ
- ✅ ไม่มี CSP errors
- ✅ React render สำเร็จ

---

**📅 สร้างเมื่อ:** October 9, 2025  
**🎯 สถานะ:** Debug Guide Complete  
**✅ ผลลัพธ์:** พร้อมใช้งาน
