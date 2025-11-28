-- Fix patient_registrations table permissions
-- Problem: permission denied for table patient_registrations
-- Solution: Enable RLS and create proper policies
--
-- Created: 2025-11-28
-- Author: VCHome Hospital Development Team

-- Step 1: Check if table exists and current RLS status
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'patient_registrations';

-- Step 2: Enable Row Level Security (RLS) on patient_registrations table
ALTER TABLE patient_registrations ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if any) to start fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON patient_registrations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON patient_registrations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON patient_registrations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON patient_registrations;

-- Step 4: Create new RLS policies

-- Policy 1: Allow SELECT (read) for authenticated users
CREATE POLICY "Enable read access for authenticated users"
ON patient_registrations
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow SELECT (read) for anonymous users (for public registration)
CREATE POLICY "Enable read access for anon users"
ON patient_registrations
FOR SELECT
TO anon
USING (true);

-- Policy 3: Allow INSERT for authenticated users
CREATE POLICY "Enable insert for authenticated users"
ON patient_registrations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 4: Allow INSERT for anonymous users (for public registration)
CREATE POLICY "Enable insert for anon users"
ON patient_registrations
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy 5: Allow UPDATE for authenticated users only
CREATE POLICY "Enable update for authenticated users"
ON patient_registrations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 6: Allow DELETE for authenticated users only
CREATE POLICY "Enable delete for authenticated users"
ON patient_registrations
FOR DELETE
TO authenticated
USING (true);

-- Step 5: Grant necessary permissions to roles
GRANT SELECT, INSERT ON patient_registrations TO anon;
GRANT ALL ON patient_registrations TO authenticated;
GRANT ALL ON patient_registrations TO service_role;

-- Step 6: Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'patient_registrations'
ORDER BY policyname;

-- Step 7: Test query to verify access
SELECT COUNT(*) as total_registrations FROM patient_registrations;

-- Expected result:
-- - RLS is enabled
-- - 6 policies created (2 for SELECT, 2 for INSERT, 1 for UPDATE, 1 for DELETE)
-- - Authenticated users can read/write
-- - Anonymous users can read and register (INSERT)
-- - Count query returns successfully
