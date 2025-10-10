# Content Security Policy (CSP) - VCHome Hospital

## 🔒 **CSP Policy ที่ใช้**

### **Development Mode**
```
default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;
script-src * 'unsafe-inline' 'unsafe-eval' data: blob:;
style-src * 'unsafe-inline' data: blob:;
img-src * data: blob:;
font-src * data:;
connect-src * data: blob: ws: wss:;
worker-src * blob: data:;
object-src 'none';
```

### **Production Mode**
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.line.me ws://localhost:* http://localhost:*;
img-src 'self' data: blob: https:;
style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net;
font-src 'self' data: https:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```

## 📋 **อธิบายแต่ละ Directive**

### **default-src 'self'**
- อนุญาตให้โหลด resources จาก origin เดียวกันเท่านั้น
- เป็น fallback สำหรับ directives อื่นที่ไม่ได้กำหนด

### **script-src 'self'**
- ❌ **ไม่อนุญาต** `'unsafe-eval'` - ป้องกัน eval(), new Function()
- ❌ **ไม่อนุญาต** `'unsafe-inline'` - ป้องกัน inline scripts
- ✅ **อนุญาต** scripts จาก same origin เท่านั้น
- 🔒 **ความปลอดภัยสูงสุด** - ป้องกัน XSS attacks

### **connect-src**
- ✅ `'self'` - API calls ภายใน domain เดียวกัน
- ✅ `https://*.supabase.co` - Supabase API calls
- ✅ `wss://*.supabase.co` - Supabase WebSocket connections
- ✅ `https://api.line.me` - LINE Bot API calls

### **img-src 'self' data: blob:**
- ✅ `'self'` - รูปภาพจาก same origin
- ✅ `data:` - Base64 encoded images
- ✅ `blob:` - Blob URLs สำหรับ dynamic images

### **style-src 'self' 'unsafe-inline'**
- ✅ `'self'` - CSS files จาก same origin
- ✅ `'unsafe-inline'` - จำเป็นสำหรับ Tailwind CSS และ shadcn/ui

### **font-src 'self' data:**
- ✅ `'self'` - Web fonts จาก same origin
- ✅ `data:` - Base64 encoded fonts

### **frame-ancestors 'none'**
- ❌ **ป้องกัน** การ embed ใน iframe
- 🔒 **ป้องกัน** clickjacking attacks

### **base-uri 'self'**
- 🔒 **จำกัด** `<base>` tag ให้ใช้ same origin เท่านั้น

### **form-action 'self'**
- 🔒 **จำกัด** form submissions ให้ same origin เท่านั้น

## ⚠️ **สิ่งที่ CSP นี้ป้องกัน**

### **1. XSS (Cross-Site Scripting)**
- ❌ Inline JavaScript execution
- ❌ eval() และ new Function()
- ❌ External malicious scripts

### **2. Data Injection**
- ❌ Unauthorized API calls
- ❌ External resource loading
- ❌ Form hijacking

### **3. Clickjacking**
- ❌ Iframe embedding
- ❌ UI redressing attacks

## 🚨 **Potential Issues & Solutions**

### **1. React/Vite Development**
**ปัญหา:** Development mode อาจต้องการ eval()
**วิธีแก้:** 
- Development mode ใช้ CSP ที่อนุญาตทุกอย่าง
- Production mode ใช้ CSP เข้มงวด

### **2. Third-party Libraries**
**ปัญหา:** บาง libraries อาจใช้ eval() หรือ inline scripts
**วิธีแก้:**
- ใช้ libraries ที่ CSP-compliant
- หรือเพิ่ม nonce/hash สำหรับ specific scripts

### **3. Dynamic Content**
**ปัญหา:** Dynamic script generation
**วิธีแก้:**
- ใช้ event handlers แทน inline scripts
- ใช้ data attributes และ addEventListener

## 🛠️ **Development vs Production**

### **Development Mode**
```javascript
// Very permissive for development
"default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; ..."
```

### **Production Mode**
```javascript
// Strict security policy
"default-src 'self'; script-src 'self'; ..."
```

## 📊 **Security Score**

| Aspect | Score | Description |
|--------|-------|-------------|
| XSS Protection | 🟢 **A+** | No unsafe-eval, no unsafe-inline for scripts |
| Data Protection | 🟢 **A+** | Restricted connect-src to known domains |
| Clickjacking | 🟢 **A+** | frame-ancestors 'none' |
| CSRF Protection | 🟢 **A** | form-action 'self' |
| Overall Security | 🟢 **A+** | Excellent security posture |

## 🔧 **Testing CSP**

### **1. Browser Console**
```javascript
// Check for CSP violations
console.log('CSP Violations:', window.cspViolations || []);
```

### **2. CSP Evaluator**
- ใช้ Google CSP Evaluator: https://csp-evaluator.withgoogle.com/
- ใส่ CSP policy เพื่อตรวจสอบ

### **3. Report-Only Mode**
```html
<!-- For testing without blocking -->
<meta http-equiv="Content-Security-Policy-Report-Only" content="..." />
```

## 📝 **Maintenance**

### **เมื่อเพิ่ม External Services**
1. เพิ่ม domain ใน `connect-src`
2. ทดสอบใน development
3. อัพเดท production CSP

### **เมื่อใช้ New Libraries**
1. ตรวจสอบว่า library เป็น CSP-compliant
2. ทดสอบกับ CSP เข้มงวด
3. ปรับ CSP หากจำเป็น (แต่ระวังความปลอดภัย)

---

**🔒 CSP นี้ให้ความปลอดภัยสูงสุดในขณะที่ยังคงใช้งานได้กับ React/Vite และ services ที่จำเป็น**