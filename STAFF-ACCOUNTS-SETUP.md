# 👥 Staff Accounts Setup Guide

**Date:** 11 October 2025
**Project:** VCHome Hospital Vaccine Management System

---

## 📋 Account Information

### Recommended Accounts to Create:

| Account | Email | Password | Role | Purpose |
|---------|-------|----------|------|---------|
| Admin | `admin@vchome.local` | `VCHome2024!` | admin | Full system access |
| Staff | `staff@vchome.local` | `VCHome2024!` | healthcare_staff | Regular staff access |
| Nurse | `nurse@vchome.local` | `VCHome2024!` | healthcare_staff | Nursing staff access |

---

## 🔧 Step-by-Step Setup

### Step 1: Create Users in Supabase Dashboard

1. **Go to:** https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/auth/users

2. **Click "Add user"** (green button on top right)

3. **For each account, fill in:**
   - **Email:** (from table above)
   - **Password:** `VCHome2024!`
   - **✅ IMPORTANT:** Check "Auto Confirm User" checkbox
   - Click "Create user"

4. **After creating each user:**
   - Click on the user to view details
   - **Copy the User ID** (UUID format like: `123e4567-e89b-12d3-a456-426614174000`)
   - Save it somewhere (you'll need it for Step 2)

---

### Step 2: Assign Roles via SQL

After creating all 3 accounts and copying their User IDs:

1. **Go to:** https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/sql/new

2. **Paste and modify this SQL:**

```sql
-- ============================================
-- VCHome Hospital - Assign User Roles
-- ============================================

-- INSTRUCTIONS:
-- 1. Replace YOUR_ADMIN_USER_ID with the actual User ID from admin@vchome.local
-- 2. Replace YOUR_STAFF_USER_ID with the actual User ID from staff@vchome.local
-- 3. Replace YOUR_NURSE_USER_ID with the actual User ID from nurse@vchome.local
-- 4. Run this SQL

-- Admin Account (full access)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('YOUR_ADMIN_USER_ID', 'admin', 'YOUR_ADMIN_USER_ID')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Staff Account (healthcare staff)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('YOUR_STAFF_USER_ID', 'healthcare_staff', 'YOUR_STAFF_USER_ID')
ON CONFLICT (user_id) DO UPDATE SET role = 'healthcare_staff';

-- Nurse Account (healthcare staff)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('YOUR_NURSE_USER_ID', 'healthcare_staff', 'YOUR_NURSE_USER_ID')
ON CONFLICT (user_id) DO UPDATE SET role = 'healthcare_staff';

-- Verify the roles were assigned
SELECT
    ur.user_id,
    u.email,
    ur.role,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.created_at DESC;
```

3. **Click "Run"** or press `Ctrl + Enter`

4. **Check the results:**
   - You should see 3 rows returned
   - Verify emails and roles are correct

---

### Step 3: Verify Setup

Run this verification script:

```bash
cd D:\MainProjectVaccineHome\VaccineHomeBot
node check-auth-users.js
```

Expected output:
```
✅ Found 3 valid account(s):

1. Email: admin@vchome.local
   Password: VCHome2024!
   User ID: [UUID]
   Role: admin

2. Email: staff@vchome.local
   Password: VCHome2024!
   User ID: [UUID]
   Role: healthcare_staff

3. Email: nurse@vchome.local
   Password: VCHome2024!
   User ID: [UUID]
   Role: healthcare_staff
```

---

### Step 4: Test Login

1. **Open Staff Portal:**
   ```
   http://localhost:5173/staff-portal
   ```

2. **Try logging in with:**
   - Email: `staff@vchome.local`
   - Password: `VCHome2024!`

3. **Expected Result:**
   - ✅ Login successful
   - ✅ Can access Staff Portal
   - ✅ Can see "ระบบแจ้งเตือนอัตโนมัติ" (Auto Notification System)
   - ✅ Can manage appointments

---

## 🔍 Troubleshooting

### Issue: "Invalid login credentials"

**Possible causes:**
1. Account not created properly
2. Email not confirmed (check "Auto Confirm User" was checked)
3. Wrong password

**Solution:**
- Go back to Supabase Auth Users page
- Click on the user
- Click "Send password recovery" to reset password
- Or delete and recreate the user

---

### Issue: "Access denied" after login

**Possible causes:**
1. Role not assigned in user_roles table
2. RPC functions not working

**Solution:**
```bash
# Check if roles exist
node check-users.js

# Check RPC functions
node check-system-status.js
```

If no roles found, re-run the SQL from Step 2.

---

### Issue: Can login but can't access Staff Portal

**Possible causes:**
1. Not assigned healthcare_staff or admin role
2. RLS policy blocking access

**Solution:**
Run this SQL to check roles:
```sql
SELECT
    u.email,
    ur.role,
    public.is_healthcare_staff(u.id) as is_staff,
    public.has_role(u.id, 'admin') as is_admin
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('admin@vchome.local', 'staff@vchome.local', 'nurse@vchome.local');
```

Expected results:
- `is_staff` should be `true` for all
- `is_admin` should be `true` only for admin@vchome.local

---

## 📊 Quick Reference

### Available Roles:

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all features + admin panel |
| `healthcare_staff` | Access to Staff Portal, manage patients, appointments, vaccines |
| `doctor` | Healthcare staff + additional medical features |
| `nurse` | Healthcare staff with nursing focus |

### RPC Functions:

- `is_healthcare_staff(user_id)` - Returns true if user has healthcare role
- `has_role(user_id, role)` - Returns true if user has specific role

---

## 🎯 After Setup Complete

Once all accounts are created and roles assigned, you can:

1. ✅ Test Staff Portal login
2. ✅ Test Auto Notification System
3. ✅ Create test appointments
4. ✅ Test notification sending
5. ✅ Monitor audit logs

---

## 📝 SQL Template with Comments

For easy copy-paste, here's the SQL with more detailed comments:

```sql
-- ============================================
-- STEP 1: Verify user exists
-- ============================================
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'admin@vchome.local';
-- Copy the 'id' value from result

-- ============================================
-- STEP 2: Insert role for admin
-- ============================================
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (
    '[PASTE_ADMIN_USER_ID_HERE]',  -- Replace with actual UUID
    'admin',
    '[PASTE_ADMIN_USER_ID_HERE]'   -- Same UUID
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ============================================
-- STEP 3: Verify staff user
-- ============================================
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'staff@vchome.local';
-- Copy the 'id' value

-- ============================================
-- STEP 4: Insert role for staff
-- ============================================
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (
    '[PASTE_STAFF_USER_ID_HERE]',
    'healthcare_staff',
    '[PASTE_STAFF_USER_ID_HERE]'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'healthcare_staff';

-- ============================================
-- STEP 5: Verify nurse user
-- ============================================
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'nurse@vchome.local';
-- Copy the 'id' value

-- ============================================
-- STEP 6: Insert role for nurse
-- ============================================
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (
    '[PASTE_NURSE_USER_ID_HERE]',
    'healthcare_staff',
    '[PASTE_NURSE_USER_ID_HERE]'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'healthcare_staff';

-- ============================================
-- STEP 7: Verify all roles were assigned
-- ============================================
SELECT
    u.email,
    ur.role,
    ur.created_at,
    public.is_healthcare_staff(u.id) as can_access_staff_portal,
    public.has_role(u.id, 'admin') as is_admin
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('admin@vchome.local', 'staff@vchome.local', 'nurse@vchome.local')
ORDER BY ur.created_at DESC;
```

---

**Created:** 11 October 2025
**Last Updated:** 11 October 2025
**Status:** Ready for use ✅
