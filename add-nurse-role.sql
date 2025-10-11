-- VCHome Hospital - Add Nurse Role to ENUM
-- Generated: 2025-10-11
-- This SQL adds 'nurse' and 'doctor' roles to the app_role ENUM

-- Step 1: Check current ENUM values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype
ORDER BY enumsortorder;

-- Step 2: Add 'doctor' role to ENUM (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'doctor'
        AND enumtypid = 'public.app_role'::regtype
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'doctor';
    END IF;
END $$;

-- Step 3: Add 'nurse' role to ENUM (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'nurse'
        AND enumtypid = 'public.app_role'::regtype
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'nurse';
    END IF;
END $$;

-- Step 4: Update is_healthcare_staff function to include doctor and nurse
CREATE OR REPLACE FUNCTION public.is_healthcare_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'healthcare_staff', 'doctor', 'nurse')
  )
$$;

-- Step 5: Verify new ENUM values
SELECT enumlabel as available_roles
FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype
ORDER BY enumsortorder;

-- Success message
SELECT 'Nurse and Doctor roles added successfully!' as status;
