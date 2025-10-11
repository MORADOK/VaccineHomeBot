-- VCHome Hospital - Assign User Roles
-- Generated: 2025-10-11
-- Run this SQL in Supabase SQL Editor

-- Admin account (admin@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('0ed35930-cd4a-4d4c-ade9-8279c0d2cb09', 'admin', '0ed35930-cd4a-4d4c-ade9-8279c0d2cb09')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Staff account (staff@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('ef3b40d8-3289-4b81-8a34-d0c740a106e9', 'healthcare_staff', 'ef3b40d8-3289-4b81-8a34-d0c740a106e9')
ON CONFLICT (user_id) DO UPDATE SET role = 'healthcare_staff';

-- Nurse account (nurse@vchome.local)
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf', 'healthcare_staff', 'b77dd27d-d4ba-4a26-b710-3c1e2e7f26cf')
ON CONFLICT (user_id) DO UPDATE SET role = 'healthcare_staff';

-- Verify roles were assigned
SELECT
    u.email,
    ur.role,
    ur.created_at,
    public.is_healthcare_staff(u.id) as can_access_staff_portal,
    public.has_role(u.id, 'admin') as is_admin
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY ur.created_at DESC;
