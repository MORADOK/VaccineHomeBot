# Edge Function Troubleshooting Guide

## 🔍 ปัญหาปัจจุบัน
Edge Function `send-line-message` return 500 error แม้ว่า client code จะแก้ไขแล้ว

## 📋 Checklist การตรวจสอบ

### 1. ตรวจสอบ Edge Function Logs (สำคัญที่สุด!)

**ขั้นตอน:**
1. เข้า Supabase Dashboard: https://supabase.com/dashboard
2. เลือก Project: `vaccinehomebot`
3. ไปที่ **Edge Functions** → **send-line-message**
4. คลิก **Logs** tab
5. ดู error message ล่าสุด

**สิ่งที่ต้องมองหา:**
```
❌ Supabase configuration not found
❌ LINE Channel Access Token not configured
❌ Authentication error
❌ Role check error
❌ LINE API Error: 400/401/403
```

---

### 2. ตรวจสอบ Environment Variables

**ที่ตั้ง:** Dashboard → Edge Functions → send-line-message → **Settings**

**ต้องมีทั้งหมด:**
```bash
SUPABASE_URL=https://fljyjbrgfzervxofrilo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LINE_CHANNEL_ACCESS_TOKEN=<your_line_token>  # ⚠️ สำคัญ!
```

**วิธีตรวจสอบ:**
```bash
# ไปที่ Settings tab ของ Edge Function
# ถ้าไม่มีให้เพิ่มเข้าไป
```

---

### 3. ตรวจสอบ Database Function `is_healthcare_staff`

**รัน Query นี้ใน SQL Editor:**
```sql
-- ตรวจสอบว่า function มีอยู่หรือไม่
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'is_healthcare_staff';

-- ทดสอบ function (แทน USER_ID ด้วย UUID จริง)
SELECT is_healthcare_staff('YOUR_USER_ID_HERE');
```

**ถ้าไม่มี function** → ต้อง apply migration:
```bash
# ไฟล์: supabase/migrations/20250815172240_de764275-31e5-41d2-8f82-a5a51d0aee4d.sql
# มี function นี้อยู่แล้ว
```

---

### 4. ตรวจสอบ User Roles

**รัน Query นี้:**
```sql
-- ดู users ทั้งหมดและ roles
SELECT
  u.id,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;
```

**ถ้า user ไม่มี role** → เพิ่มเข้าไป:
```sql
-- หา user_id จาก email
SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';

-- เพิ่ม role
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'healthcare_staff')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 🔧 วิธีแก้ปัญหาที่เป็นไปได้

### แก้ปัญหา #1: LINE_CHANNEL_ACCESS_TOKEN ไม่มี

**วิธีแก้:**
1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Channel → **Messaging API**
3. คัดลอก **Channel Access Token (long-lived)**
4. เพิ่มใน Supabase Edge Function Settings:
   ```
   LINE_CHANNEL_ACCESS_TOKEN=<token_ที่คัดลอก>
   ```
5. **Save** และ **Redeploy** Edge Function

---

### แก้ปัญหา #2: Edge Function ไม่รับ Auth Header

**สาเหตุ:** `supabase.functions.invoke()` อาจไม่ส่ง Bearer token

**วิธีแก้:**
Edge Function code มีการตรวจสอบ auth header แล้ว (line 34-40)

แต่ถ้ายัง error ให้ตรวจสอบว่า client มี session:
```typescript
// ใน NextAppointments.tsx (แก้แล้ว line 346)
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session); // ต้องไม่ null
```

---

### แก้ปัญหา #3: Function `is_healthcare_staff` ไม่ทำงาน

**วิธีแก้:** แก้ Edge Function ให้ handle error ดีขึ้น

ถ้าต้องการ **ปิดการตรวจสอบ role ชั่วคราว** (เพื่อ debug):

**แก้ไฟล์:** `supabase/functions/send-line-message/index.ts`

**ค้นหา:** (line 54-62)
```typescript
// Check if user is healthcare staff
const { data: isStaff, error: roleError } = await supabase.rpc("is_healthcare_staff", { _user_id: user.id });
if (roleError || !isStaff) {
  console.error("Role check error:", roleError);
  return new Response(
    JSON.stringify({ error: "Access denied: Healthcare staff role required" }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

**แทนที่ด้วย:** (เพื่อ skip role check)
```typescript
// Check if user is healthcare staff (TEMPORARILY DISABLED FOR DEBUG)
const { data: isStaff, error: roleError } = await supabase.rpc("is_healthcare_staff", { _user_id: user.id });
if (roleError) {
  console.warn("Role check error (proceeding anyway):", roleError);
}
// Temporarily allow all authenticated users
// if (!isStaff) { ... }
```

---

## 🎯 แนวทางแก้ปัญหาแบบ Step-by-Step

### ขั้นที่ 1: ดู Logs
```
Dashboard → Edge Functions → send-line-message → Logs
```
→ จดบันทึก error message

### ขั้นที่ 2: แก้ตาม Error
- **"LINE Channel Access Token not configured"** → เพิ่ม env var
- **"Authentication error"** → ตรวจสอบ user login
- **"Role check error"** → ตรวจสอบ database function + user_roles
- **"LINE API Error: 401"** → Token หมดอายุ/ไม่ถูกต้อง

### ขั้นที่ 3: Redeploy Edge Function
หลังแก้ env vars หรือ code:
```bash
# ใน Supabase Dashboard
Edge Functions → send-line-message → Redeploy
```

หรือใช้ CLI:
```bash
supabase functions deploy send-line-message
```

---

## 📞 ต้องการความช่วยเหลือเพิ่มเติม?

บอก **error message จาก Logs** มาให้ดู จะได้แก้ตรงจุดเลย
