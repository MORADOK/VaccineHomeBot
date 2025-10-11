# 🔒 รายงานการตรวจสอบความปลอดภัยระบบล็อกอินพนักงาน

**วันที่:** 11 ตุลาคม 2025
**ระบบ:** VCHome Hospital Vaccine Management System
**ผู้ตรวจสอบ:** Claude Code Security Audit

---

## 🚨 ช่องโหว่ที่พบ (Critical Issues)

### 1. **Hardcoded Credentials in Source Code**
**ระดับความรุนแรง:** 🔴 CRITICAL

**ที่ตั้ง:** `src/hooks/use-admin-auth.ts:49-62`

```typescript
const ADMIN_USERS = [
  {
    email: 'admin@vchomehospital.co.th',
    password: 'admin123',  // ⚠️ รหัสผ่านอยู่ใน source code!
    role: 'admin',
    permissions: ADMIN_PERMISSIONS
  },
  {
    email: 'superadmin@vchomehospital.co.th',
    password: 'superadmin123',  // ⚠️ รหัสผ่านอยู่ใน source code!
    role: 'superadmin',
    permissions: SUPER_ADMIN_PERMISSIONS
  }
];
```

**ผลกระทบ:**
- ❌ รหัสผ่านถูกเก็บใน Git repository
- ❌ ทุกคนที่เข้าถึง source code เห็นรหัสผ่าน
- ❌ ไม่สามารถเปลี่ยนรหัสผ่านได้โดยไม่แก้โค้ด
- ❌ ถ้า deploy บน GitHub Pages = รหัสผ่านเปิดเผยต่อสาธารณะ

**ความเสี่ยง:**
- ผู้ไม่หวังดีสามารถเข้าถึงระบบ admin ได้
- ข้อมูลผู้ป่วยอาจรั่วไหล
- ระบบถูกบุกรุกและแก้ไขข้อมูล

---

### 2. **Password Comparison in Plain Text**
**ระดับความรุนแรง:** 🔴 CRITICAL

**ที่ตั้ง:** `src/hooks/use-admin-auth.ts:174-176`

```typescript
const adminUser = ADMIN_USERS.find(
  u => u.email === email && u.password === password  // ⚠️ เปรียบเทียบ plain text!
);
```

**ผลกระทบ:**
- ❌ รหัสผ่านไม่ได้ถูก hash
- ❌ ถ้ามีคนดัก network traffic อาจเห็นรหัสผ่าน
- ❌ ไม่มี rate limiting = brute force attack ได้ง่าย

---

### 3. **Client-Side Only Authentication**
**ระดับความรุนแรง:** 🟠 HIGH

**ที่ตั้ง:** `src/hooks/use-admin-auth.ts:145-208`

**ปัญหา:**
- ❌ การตรวจสอบทำฝั่ง client เท่านั้น
- ❌ ผู้ใช้สามารถแก้ localStorage เพื่อปลอมเป็น admin ได้
- ❌ ไม่มี server-side validation

**วิธีโจมตี:**
```javascript
// ผู้ไม่หวังดีสามารถทำแบบนี้ได้:
localStorage.setItem('admin_user', JSON.stringify({
  id: 'fake_admin',
  email: 'hacker@evil.com',
  role: 'superadmin',
  permissions: SUPER_ADMIN_PERMISSIONS,
  isAdmin: true,
  isSuperAdmin: true
}));
// รีโหลดหน้า → เข้าระบบเป็น admin ได้!
```

---

### 4. **Exposed API Keys in .env**
**ระดับความรุนแรง:** 🟡 MEDIUM

**ที่ตั้ง:** `.env:2-3`

```env
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://fljyjbrgfzervxofrilo.supabase.co"
```

**ปัญหา:**
- ⚠️ นี่คือ public/anon key ซึ่งปกติควรเปิดเผยได้
- ⚠️ แต่ต้องตรวจสอบว่า RLS policies ตั้งค่าถูกต้อง
- ⚠️ ถ้า RLS ไม่ดี = ผู้โจมตีอ่านข้อมูลผู้ป่วยได้

---

### 5. **Weak Password Policy**
**ระดับความรุนแรง:** 🟡 MEDIUM

**ปัญหา:**
- ❌ `admin123` และ `superadmin123` เป็นรหัสผ่านที่เดาง่าย
- ❌ ไม่มีข้อกำหนดความยาวขั้นต่ำ
- ❌ ไม่มีการบังคับใช้ตัวพิมพ์ใหญ่/เล็ก/ตัวเลข/อักขระพิเศษ
- ❌ ไม่มี password expiration

---

### 6. **No Rate Limiting**
**ระดับความรุนแรง:** 🟡 MEDIUM

**ปัญหา:**
- ❌ สามารถลองรหัสผ่านได้ไม่จำกัดครั้ง
- ❌ เสี่ยงต่อ brute force attacks
- ❌ ไม่มี CAPTCHA หรือการ lock account

---

### 7. **Session Storage in localStorage**
**ระดับความรุนแรง:** 🟡 MEDIUM

**ที่ตั้ง:** `src/hooks/use-admin-auth.ts:102, 168, 192`

```typescript
localStorage.setItem('admin_user', JSON.stringify(adminUser));
```

**ปัญหา:**
- ⚠️ localStorage ไม่มี expiration
- ⚠️ ผู้ใช้ล็อกอินค้างไว้ตลอดกาล
- ⚠️ ถ้าใช้คอมพิวเตอร์สาธารณะ = session รั่วไหล
- ⚠️ XSS attacks สามารถขโมย token ได้

---

### 8. **No Audit Logging**
**ระดับความรุนแรง:** 🟢 LOW

**ปัญหา:**
- ❌ ไม่มีการบันทึก login attempts
- ❌ ไม่รู้ว่าใครเข้าระบบเมื่อไร
- ❌ ไม่สามารถ trace security incidents ได้

---

## 📊 สรุปช่องโหว่

| ระดับ | จำนวน | รายการ |
|-------|-------|--------|
| 🔴 Critical | 3 | Hardcoded passwords, Plain text comparison, Client-side auth |
| 🟠 High | 0 | - |
| 🟡 Medium | 4 | Exposed keys, Weak passwords, No rate limiting, localStorage |
| 🟢 Low | 1 | No audit logging |
| **รวม** | **8** | **ช่องโหว่ทั้งหมด** |

---

## ✅ แนวทางแก้ไข (Recommendations)

### Priority 1: Critical Fixes

#### 1.1 ลบ Hardcoded Credentials
```typescript
// ❌ ห้ามทำ
const ADMIN_USERS = [
  { email: 'admin@...', password: 'admin123' }
];

// ✅ ควรทำ
// ใช้ Supabase Auth เต็มรูปแบบ
// ไม่เก็บรหัสผ่านในโค้ดเลย
```

#### 1.2 ใช้ Server-Side Authentication
```typescript
// ✅ ใช้ Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// ตรวจสอบ role ที่ server-side
const { data: role } = await supabase
  .rpc('is_healthcare_staff', { _user_id: data.user.id });
```

#### 1.3 เพิ่ม Server-Side Validation
```sql
-- ใช้ RLS policies ใน Supabase
CREATE POLICY "Only staff can access"
ON appointments
FOR ALL
TO authenticated
USING (public.is_healthcare_staff(auth.uid()));
```

---

### Priority 2: Security Enhancements

#### 2.1 Password Policy
```typescript
// เพิ่ม validation
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
```

#### 2.2 Rate Limiting
```typescript
// ใช้ package เช่น rate-limiter-flexible
const rateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
});
```

#### 2.3 Session Management
```typescript
// ใช้ httpOnly cookies แทน localStorage
// หรือใช้ Supabase session management
const { data: { session } } = await supabase.auth.getSession();
```

#### 2.4 Audit Logging
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Priority 3: Best Practices

1. **Enable 2FA** - เปิดใช้ Two-Factor Authentication
2. **HTTPS Only** - บังคับใช้ HTTPS ทุกการเชื่อมต่อ
3. **CSP Headers** - ตั้งค่า Content Security Policy
4. **Regular Security Audits** - ตรวจสอบความปลอดภัยเป็นประจำ
5. **Dependency Updates** - อัปเดต dependencies เป็นประจำ

---

## 🛠️ Implementation Plan

### Phase 1: Immediate Actions (Do Now!)
1. ✅ ลบ hardcoded passwords
2. ✅ สร้าง secure admin accounts ใน Supabase
3. ✅ ปรับปรุงระบบ authentication ให้ใช้ Supabase เท่านั้น

### Phase 2: Short-term (This Week)
1. ⏳ เพิ่ม password policy
2. ⏳ เพิ่ม rate limiting
3. ⏳ ปรับปรุง session management

### Phase 3: Long-term (This Month)
1. 📋 เพิ่ม 2FA
2. 📋 สร้างระบบ audit logging
3. 📋 Security testing & penetration testing

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/)

---

**หมายเหตุ:** รายงานนี้สร้างขึ้นเพื่อปรับปรุงความปลอดภัยของระบบ ไม่ได้มีเจตนาตำหนิ แต่เพื่อช่วยให้ระบบปลอดภัยยิ่งขึ้น 🛡️
