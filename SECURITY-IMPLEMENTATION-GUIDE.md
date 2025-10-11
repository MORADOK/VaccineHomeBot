# 🛡️ คู่มือการนำระบบความปลอดภัยไปใช้

**เอกสารนี้อธิบายวิธีการอัปเกรดระบบล็อกอินจากเวอร์ชันเดิม (ไม่ปลอดภัย) ไปเป็นเวอร์ชันใหม่ (ปลอดภัย)**

---

## 📋 สารบัญ

1. [ภาพรวมการเปลี่ยนแปลง](#ภาพรวมการเปลี่ยนแปลง)
2. [ขั้นตอนการติดตั้ง](#ขั้นตอนการติดตั้ง)
3. [การย้ายข้อมูล](#การย้ายข้อมูล)
4. [การทดสอบ](#การทดสอบ)
5. [การ Rollback](#การ-rollback)
6. [Best Practices](#best-practices)

---

## 🔄 ภาพรวมการเปลี่ยนแปลง

### สิ่งที่เปลี่ยนแปลง

| ฟีเจอร์ | เดิม (Old) | ใหม่ (New) | ประโยชน์ |
|---------|-----------|-----------|----------|
| **Credentials** | Hardcoded ในโค้ด | เก็บใน Supabase Auth | ลบช่องโหว่ด้านความปลอดภัย |
| **Password** | Plain text comparison | Supabase hashing | รหัสผ่านถูก hash อย่างปลอดภัย |
| **Session** | localStorage เท่านั้น | Supabase session + token refresh | Auto-logout เมื่อ timeout |
| **Rate Limiting** | ไม่มี | มี (5 ครั้ง/15 นาที) | ป้องกัน brute force |
| **Audit Logging** | ไม่มี | มี | ติดตามการเข้าใช้งาน |
| **Role Check** | Client-side | Database + RLS | ป้องกันการปลอมแปลง |

### ไฟล์ที่สร้างใหม่

```
src/
├── hooks/
│   └── use-admin-auth-secure.ts         ✅ ใหม่: Hook ที่ปลอดภัย
├── components/
│   └── AdminLoginSecure.tsx              ✅ ใหม่: Login component ที่ปลอดภัย
supabase/
└── migrations/
    └── 20251011000000_add_security_audit_logging.sql  ✅ ใหม่: Audit logging
```

### ไฟล์ที่ต้องแก้ไข (ถ้าใช้เวอร์ชันใหม่)

```
src/
├── pages/
│   └── Index.tsx                         📝 เปลี่ยน import
└── App.tsx                               📝 อาจต้องปรับ routing
```

---

## 📥 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: รัน Migration ใน Supabase

1. เปิด Supabase Dashboard → SQL Editor
2. คัดลอกและรันไฟล์ migration:

```bash
# หรือใช้ Supabase CLI
supabase migration up
```

Migration จะสร้าง:
- ✅ ตาราง `audit_logs`
- ✅ Function `log_security_event()`
- ✅ Function `is_user_locked_out()`
- ✅ Function `update_last_login()`
- ✅ View `recent_security_events`

### ขั้นตอนที่ 2: สร้างบัญชี Admin ใน Supabase

#### วิธีที่ 1: ผ่าน Supabase Dashboard

1. ไปที่ **Authentication** → **Users**
2. คลิก **Add User**
3. กรอกข้อมูล:
   ```
   Email: admin@yourdomain.com
   Password: YourSecurePassword123!
   Auto Confirm User: ✅
   ```
4. คลิก **Create User**
5. คัดลอก User ID
6. ไปที่ **SQL Editor** และรัน:
   ```sql
   -- เพิ่ม role admin
   INSERT INTO public.user_roles (user_id, role, created_by)
   VALUES ('USER_ID_ที่คัดลอก', 'admin', 'USER_ID_ที่คัดลอก');
   ```

#### วิธีที่ 2: ผ่าน Script

```javascript
// create-admin.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // ⚠️ ใช้ service_role key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  // 1. สร้าง user
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: 'admin@yourdomain.com',
    password: 'YourSecurePassword123!',
    email_confirm: true
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // 2. เพิ่ม role
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: user.user.id,
      role: 'admin',
      created_by: user.user.id
    });

  if (roleError) {
    console.error('Role error:', roleError);
    return;
  }

  console.log('✅ Admin created:', user.user.email);
}

createAdmin();
```

### ขั้นตอนที่ 3: อัปเดตโค้ด

#### 3.1 ใช้เวอร์ชันใหม่ (Recommended)

แก้ไขไฟล์ที่ import `use-admin-auth`:

```typescript
// เดิม
import { useAdminAuth } from '@/hooks/use-admin-auth';

// ใหม่
import { useAdminAuth } from '@/hooks/use-admin-auth-secure';
```

แก้ไขไฟล์ที่ใช้ `AdminLogin`:

```typescript
// เดิม
import { AdminLogin } from '@/components/AdminLogin';

// ใหม่
import { AdminLoginSecure as AdminLogin } from '@/components/AdminLoginSecure';
```

#### 3.2 หรือเปลี่ยนชื่อไฟล์

```bash
# Backup old files
mv src/hooks/use-admin-auth.ts src/hooks/use-admin-auth.old.ts
mv src/components/AdminLogin.tsx src/components/AdminLogin.old.tsx

# Use new files
mv src/hooks/use-admin-auth-secure.ts src/hooks/use-admin-auth.ts
mv src/components/AdminLoginSecure.tsx src/components/AdminLogin.tsx
```

### ขั้นตอนที่ 4: ลบ Hardcoded Passwords

⚠️ **สำคัญ!** ลบไฟล์เก่าที่มี hardcoded passwords:

```bash
rm src/hooks/use-admin-auth.old.ts
rm src/components/AdminLogin.old.tsx
```

และลบจาก Git history (ถ้าต้องการ):

```bash
# ⚠️ ระวัง! คำสั่งนี้จะเขียนประวัติ Git ใหม่
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/hooks/use-admin-auth.old.ts" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

---

## 🔄 การย้ายข้อมูล

### สำหรับผู้ใช้ที่มีอยู่แล้ว

ถ้าคุณมีผู้ใช้ที่ล็อกอินด้วยระบบเดิม (localStorage):

1. ผู้ใช้จะถูก logout อัตโนมัติ
2. ต้องล็อกอินใหม่ด้วย Supabase credentials
3. ตรวจสอบว่ามี role ใน `user_roles` table

### Migration Script สำหรับ Existing Users

```sql
-- หาผู้ใช้ที่ยังไม่มี role
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;

-- เพิ่ม role ให้ผู้ใช้ที่เลือก
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT
  u.id,
  'healthcare_staff',  -- หรือ 'admin' ตามที่ต้องการ
  u.id
FROM auth.users u
WHERE u.email IN (
  'staff1@example.com',
  'staff2@example.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 🧪 การทดสอบ

### Test Case 1: ล็อกอินสำเร็จ

```bash
1. เปิด http://localhost:5173/admin
2. กรอก email + password ที่ถูกต้อง
3. ✅ ควรเข้าระบบได้
4. ตรวจสอบ audit_logs:
   SELECT * FROM audit_logs WHERE event_type = 'login_success' ORDER BY created_at DESC LIMIT 5;
```

### Test Case 2: รหัสผ่านผิด

```bash
1. กรอกรหัสผ่านผิด 3 ครั้ง
2. ✅ ควรแสดงข้อความ "เหลืออีก 2 ครั้ง"
3. ตรวจสอบ audit_logs:
   SELECT * FROM audit_logs WHERE event_type = 'login_failed';
```

### Test Case 3: Account Lockout

```bash
1. กรอกรหัสผ่านผิด 5 ครั้ง
2. ✅ ควรถูก lock 15 นาที
3. ✅ แสดงข้อความ "บัญชีถูกล็อค"
4. ลองล็อกอินด้วยรหัสผ่านถูก
5. ✅ ควรไม่สามารถล็อกอินได้
```

### Test Case 4: ไม่มี Role

```bash
1. สร้าง user ใหม่โดยไม่เพิ่ม role
2. ลองล็อกอิน
3. ✅ ควรแสดง "Access denied. Admin privileges required."
```

### Test Case 5: Session Timeout

```bash
1. ล็อกอินสำเร็จ
2. รอ 1 ชั่วโมง (หรือตามที่ตั้งค่า Supabase)
3. Refresh หน้า
4. ✅ ควร logout อัตโนมัติ
```

---

## ⏮️ การ Rollback

หากเกิดปัญหา สามารถกลับไปใช้เวอร์ชันเดิมได้:

### วิธีที่ 1: Git Revert

```bash
git revert HEAD
npm run dev
```

### วิธีที่ 2: Manual Rollback

```bash
# กู้คืนไฟล์เก่า
git checkout HEAD~1 -- src/hooks/use-admin-auth.ts
git checkout HEAD~1 -- src/components/AdminLogin.tsx

# Restart dev server
npm run dev
```

### วิธีที่ 3: ใช้ทั้งสองแบบพร้อมกัน

เก็บทั้ง old และ new versions:

```typescript
// .env.local
VITE_USE_SECURE_AUTH=false  // false = ใช้แบบเดิม, true = ใช้แบบใหม่

// src/hooks/use-admin-auth.ts
export { useAdminAuth } from import.meta.env.VITE_USE_SECURE_AUTH
  ? './use-admin-auth-secure'
  : './use-admin-auth-legacy';
```

---

## ✅ Best Practices

### 1. Password Policy

```typescript
// กำหนด password requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true
};
```

### 2. Environment Variables

```env
# .env.production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# ⚠️ NEVER commit these:
# SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 3. Regular Security Audits

```sql
-- ดู failed login attempts
SELECT
  user_id,
  COUNT(*) as attempts,
  MAX(created_at) as last_attempt
FROM audit_logs
WHERE event_type = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING COUNT(*) > 3
ORDER BY attempts DESC;

-- ดู unusual activity
SELECT *
FROM recent_security_events
WHERE event_type IN ('permission_denied', 'unauthorized_access')
ORDER BY created_at DESC
LIMIT 50;
```

### 4. Monitoring

สร้าง dashboard สำหรับ security metrics:

```typescript
// SecurityDashboard.tsx
const { data: stats } = await supabase.rpc('get_security_stats');

console.log('Total logins:', stats.total_logins);
console.log('Failed logins:', stats.failed_logins);
console.log('Lockouts:', stats.lockouts);
```

### 5. Backup Strategy

```bash
# Backup Supabase data daily
npx supabase db dump > backup-$(date +%Y%m%d).sql

# Keep backups for 30 days
find backups/ -name "backup-*.sql" -mtime +30 -delete
```

---

## 📞 ติดต่อและสนับสนุน

หากพบปัญหาหรือมีคำถาม:

1. ตรวจสอบ `SECURITY-AUDIT-REPORT.md`
2. ดู Supabase logs
3. ตรวจสอบ `audit_logs` table
4. ติดต่อทีมพัฒนา

---

## 📚 Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

**สร้างโดย:** Claude Code Security Team
**วันที่:** 11 ตุลาคม 2025
**เวอร์ชัน:** 2.0.0

✅ ระบบพร้อมใช้งานแล้ว - ปลอดภัย มั่นคง ตรวจสอบได้!
