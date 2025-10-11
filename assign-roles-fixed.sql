-- VCHome Hospital - Assign User Roles (Fixed)
-- Generated: 2025-10-11
-- Run this SQL in Supabase SQL Editor

-- Step 1: Add unique constraint if not exists
DO $$
BEGIN
    -- Check if constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_roles_user_id_key'
    ) THEN
        ALTER TABLE public.user_roles
        ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Step 2: Delete any existing roles for these users (to avoid duplicates)
DELETE FROM public.user_roles
WHERE user_id IN (
    '0ed35930-cd4a-4d4c-ade9-8279c0d2cb09',
    'ef3b40d8-3289-4b81-8a34-d0c740a106e9',
    'b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf'
);

-- Step 3: Insert roles
-- Admin account (admin@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('0ed35930-cd4a-4d4c-ade9-8279c0d2cb09', 'admin', '0ed35930-cd4a-4d4c-ade9-8279c0d2cb09');

-- Staff account (staff@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('ef3b40d8-3289-4b81-8a34-d0c740a106e9', 'healthcare_staff', 'ef3b40d8-3289-4b81-8a34-d0c740a106e9');

-- Nurse account (nurse@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf', 'healthcare_staff', 'b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf');

-- Step 4: Verify roles were assigned
SELECT
    u.email,
    ur.role,
    ur.created_at,
    public.is_healthcare_staff(u.id) as can_access_staff_portal,
    public.has_role(u.id, 'admin') as is_admin
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.created_at DESC;
