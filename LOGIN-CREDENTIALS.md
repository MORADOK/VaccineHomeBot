# 🔐 VCHome Hospital - Login Credentials

**สร้างเมื่อ:** 11 ตุลาคม 2025
**สถานะ:** ✅ พร้อมใช้งาน

---

## 👥 Test Accounts

### 1. Admin Account
```
Email:    admin@vchome.local
Password: VCHome2024!
Role:     admin
User ID:  85ae0066-5d72-4fc4-8e7e-3c9ebbccc988
```

**สิทธิ์:**
- ✅ เข้าถึง Staff Portal
- ✅ เข้าถึง Admin Panel
- ✅ จัดการ Appointments
- ✅ จัดการ Vaccines
- ✅ จัดการ Notifications
- ✅ ดู Audit Logs
- ✅ จัดการ User Roles

---

### 2. Staff Account
```
Email:    staff@vchome.local
Password: VCHome2024!
Role:     healthcare_staff
User ID:  69513f5e-6d7d-4f9d-ac2b-d0177598c445
```

**สิทธิ์:**
- ✅ เข้าถึง Staff Portal
- ✅ จัดการ Appointments
- ✅ จัดการ Vaccines
- ✅ จัดการ Notifications
- ❌ ไม่สามารถเข้าถึง Admin Panel
- ❌ ไม่สามารถจัดการ User Roles

---

### 3. Nurse Account
```
Email:    nurse@vchome.local
Password: VCHome2024!
Role:     nurse
User ID:  31c44d5f-64e1-4ff3-88d9-e9cf5b4aae31
```

**สิทธิ์:**
- ✅ เข้าถึง Staff Portal
- ✅ จัดการ Appointments
- ✅ จัดการ Vaccines
- ✅ จัดการ Notifications
- ❌ ไม่สามารถเข้าถึง Admin Panel
- ❌ ไม่สามารถจัดการ User Roles

---

## 🧪 วิธีทดสอบ

### Test 1: ทดสอบ Login

1. **เปิด Staff Portal:**
   ```
   http://localhost:5173/staff-portal
   ```

2. **Login ด้วย Staff Account:**
   - Email: `staff@vchome.local`
   - Password: `VCHome2024!`

3. **ผลที่คาดหวัง:**
   - ✅ Login สำเร็จ
   - ✅ เห็นหน้า Staff Portal
   - ✅ แสดงชื่อผู้ใช้มุมขวาบน
   - ✅ เห็นเมนู: Appointments, Vaccines, Notifications, etc.

---

### Test 2: ทดสอบ Permissions

1. **Login ด้วย Nurse Account**
2. **ลองเข้าถึงฟีเจอร์ต่างๆ:**
   - ✅ ดู Appointments List
   - ✅ สร้าง Appointment ใหม่
   - ✅ แก้ไข Appointment
   - ✅ ดู Vaccine Logs
   - ✅ ส่ง Notifications

3. **ลองเข้า Admin Panel (ถ้ามี):**
   - ❌ ควร Access Denied

---

### Test 3: ทดสอบ Notification System

1. **Login ด้วย Admin Account**
2. **ไปที่แท็บ "ตั้งค่า" (Settings)**
3. **หาส่วน "ระบบแจ้งเตือนอัตโนมัติ"**
4. **คลิก "เรียกใช้ระบบแจ้งเตือน"**
5. **ผลที่คาดหวัง:**
   - ✅ ระบบทำงานโดยไม่มี Auth Error
   - ✅ แสดงสถิติการแจ้งเตือน

---

### Test 4: ทดสอบ Logout และ Login ใหม่

1. **Logout จาก Staff Portal**
2. **Login ด้วย Admin Account**
3. **ผลที่คาดหวัง:**
   - ✅ Login สำเร็จ
   - ✅ เห็นฟีเจอร์เพิ่มเติมสำหรับ Admin

---

## 📊 Role Comparison

| Feature | Admin | Staff | Nurse |
|---------|-------|-------|-------|
| View Appointments | ✅ | ✅ | ✅ |
| Create Appointments | ✅ | ✅ | ✅ |
| Edit Appointments | ✅ | ✅ | ✅ |
| Delete Appointments | ✅ | ❌ | ❌ |
| View Vaccines | ✅ | ✅ | ✅ |
| Administer Vaccines | ✅ | ✅ | ✅ |
| Send Notifications | ✅ | ✅ | ✅ |
| View Audit Logs | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Admin Panel | ✅ | ❌ | ❌ |

---

## 🔧 Troubleshooting

### ปัญหา: "Invalid login credentials"

**สาเหตุ:**
- รหัสผ่านผิด
- Account ถูกลบ
- Email confirmation required

**วิธีแก้:**
1. ตรวจสอบว่า email และ password ถูกต้อง
2. ลองรัน: `node get-user-ids.js` เพื่อดูว่า accounts ยังมีอยู่
3. ถ้าไม่มี ให้สร้าง accounts ใหม่ใน Supabase Dashboard

---

### ปัญหา: "Access denied" หลัง Login

**สาเหตุ:**
- Role ไม่ถูก assign
- RPC function ไม่ทำงาน

**วิธีแก้:**
```sql
-- ตรวจสอบ roles
SELECT u.email, ur.role
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id;

-- ตรวจสอบ function
SELECT public.is_healthcare_staff('YOUR_USER_ID');
```

---

### ปัญหา: "Session expired"

**สาเหตุ:**
- Session หมดอายุ (1 ชั่วโมง)

**วิธีแก้:**
- Logout แล้ว Login ใหม่

---

## 🎯 Next Steps After Testing

เมื่อทดสอบทั้งหมดผ่านแล้ว:

1. ✅ ระบบ Login ใช้งานได้
2. ✅ ระบบ Roles ใช้งานได้
3. ✅ ระบบ Permissions ใช้งานได้
4. ✅ พร้อม Deploy Production

---

## 📝 สำหรับ Production

**อย่าลืม:**

1. **เปลี่ยนรหัสผ่าน:**
   - ❌ อย่าใช้ `VCHome2024!` ใน Production
   - ✅ ใช้รหัสผ่านที่ซับซ้อนกว่า

2. **สร้าง Real Accounts:**
   - สร้าง accounts ด้วย email จริง
   - Assign roles ตามตำแหน่งงานจริง

3. **ตั้งค่า Email Confirmation:**
   - เปิด email confirmation ใน Supabase
   - ผู้ใช้ต้องยืนยัน email ก่อนใช้งาน

4. **Monitor Audit Logs:**
   - ตรวจสอบ login attempts
   - ดู failed logins
   - ตรวจสอบ security events

---

**Last Updated:** 11 October 2025
**Status:** ✅ All systems operational
