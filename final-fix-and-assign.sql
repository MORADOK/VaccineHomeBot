-- VCHome Hospital - Final Fix and Assign Roles
-- Generated: 2025-10-11
-- This SQL fixes duplicates using ROW_NUMBER and assigns roles

-- Step 1: Show current duplicates (for information)
SELECT user_id, COUNT(*) as duplicate_count
FROM public.user_roles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Step 2: Remove duplicates, keeping only the most recent entry
WITH ranked_roles AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (
    SELECT id FROM ranked_roles WHERE rn > 1
);

-- Step 3: Add unique constraint (if not exists)
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

-- Step 4: Upsert roles for our 3 accounts (insert or update)
-- Admin account (admin@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('0ed35930-cd4a-4d4c-ade9-8279c0d2cb09', 'admin', '0ed35930-cd4a-4d4c-ade9-8279c0d2cb09')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = NOW();

-- Staff account (staff@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('ef3b40d8-3289-4b81-8a34-d0c740a106e9', 'healthcare_staff', 'ef3b40d8-3289-4b81-8a34-d0c740a106e9')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = NOW();

-- Nurse account (nurse@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf', 'healthcare_staff', 'b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = NOW();

-- Step 5: Verify final result
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
