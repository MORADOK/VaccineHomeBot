-- VCHome Hospital - Fix Duplicates and Assign Roles
-- Generated: 2025-10-11
-- This SQL fixes duplicate user_id entries and assigns roles

-- Step 1: Find and display duplicates (for information)
SELECT user_id, COUNT(*) as count
FROM public.user_roles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Step 2: Delete ALL existing roles (clean slate)
-- We'll keep only the most recent entry for each user
DELETE FROM public.user_roles a
WHERE a.id NOT IN (
    SELECT MAX(id)
    FROM public.user_roles
    GROUP BY user_id
);

-- Step 3: Now add the unique constraint
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- Step 4: Delete any existing roles for our 3 new users
DELETE FROM public.user_roles
WHERE user_id IN (
    '0ed35930-cd4a-4d4c-ade9-8279c0d2cb09',
    'ef3b40d8-3289-4b81-8a34-d0c740a106e9',
    'b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf'
);

-- Step 5: Insert roles for our 3 accounts
-- Admin account (admin@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('0ed35930-cd4a-4d4c-ade9-8279c0d2cb09', 'admin', '0ed35930-cd4a-4d4c-ade9-8279c0d2cb09');

-- Staff account (staff@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('ef3b40d8-3289-4b81-8a34-d0c740a106e9', 'healthcare_staff', 'ef3b40d8-3289-4b81-8a34-d0c740a106e9');

-- Nurse account (nurse@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf', 'healthcare_staff', 'b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf');

-- Step 6: Verify final result
SELECT
    u.email,
    ur.role,
    ur.created_at,
    public.is_healthcare_staff(u.id) as can_access_staff_portal,
    public.has_role(u.id, 'admin') as is_admin
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.created_at DESC;
