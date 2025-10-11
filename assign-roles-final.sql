-- VCHome Hospital - Assign User Roles (FINAL VERSION)
-- Updated: 2025-10-11 with correct User IDs
-- User IDs verified from current auth.users

-- Step 1: Fix duplicates first
WITH ranked_roles AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (
    SELECT id FROM ranked_roles WHERE rn > 1
);

-- Step 2: Add unique constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_roles_user_id_key'
    ) THEN
        ALTER TABLE public.user_roles
        ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Step 3: Assign roles with CORRECT User IDs
-- Admin account (admin@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('85ae0066-5d72-4fc4-8e7e-3c9ebbccc988', 'admin', '85ae0066-5d72-4fc4-8e7e-3c9ebbccc988')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role;

-- Staff account (staff@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('69513f5e-6d7d-4f9d-ac2b-d0177598c445', 'healthcare_staff', '69513f5e-6d7d-4f9d-ac2b-d0177598c445')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role;

-- Nurse account (nurse@vchome.local) - using 'nurse' role
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('31c44d5f-64e1-4ff3-88d9-e9cf5b4aae31', 'nurse', '31c44d5f-64e1-4ff3-88d9-e9cf5b4aae31')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role;

-- Step 4: Verify roles were assigned
SELECT
    u.email,
    ur.role,
    ur.created_at,
    public.is_healthcare_staff(u.id) as can_access_staff_portal,
    public.has_role(u.id, 'admin') as is_admin
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email IN ('admin@vchome.local', 'staff@vchome.local', 'nurse@vchome.local')
ORDER BY ur.created_at DESC;
