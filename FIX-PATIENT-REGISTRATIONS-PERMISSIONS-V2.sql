-- Fix patient_registrations table permissions V2
-- Problem: App doesn't use Supabase Auth, all users are 'anon' role
-- Solution: Grant full access to anon role (not just SELECT+INSERT)
--
-- Created: 2025-11-28
-- Author: VCHome Hospital Development Team

-- Step 1: Drop existing anon policies (limited permissions)
DROP POLICY IF EXISTS "Enable read access for anon users" ON patient_registrations;
DROP POLICY IF EXISTS "Enable insert for anon users" ON patient_registrations;

-- Step 2: Create new comprehensive anon policies (full CRUD)

-- Policy 1: Allow SELECT (read) for anon users
CREATE POLICY "Enable full read access for anon users"
ON patient_registrations
FOR SELECT
TO anon
USING (true);

-- Policy 2: Allow INSERT for anon users
CREATE POLICY "Enable full insert for anon users"
ON patient_registrations
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy 3: Allow UPDATE for anon users
CREATE POLICY "Enable full update for anon users"
ON patient_registrations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Policy 4: Allow DELETE for anon users
CREATE POLICY "Enable full delete for anon users"
ON patient_registrations
FOR DELETE
TO anon
USING (true);

-- Step 3: Grant ALL permissions to anon role (not just SELECT+INSERT)
GRANT ALL ON patient_registrations TO anon;

-- Step 4: Verify the policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'patient_registrations'
ORDER BY roles, cmd;

-- Expected result:
-- - 4 policies for anon (SELECT, INSERT, UPDATE, DELETE)
-- - 4 policies for authenticated (SELECT, INSERT, UPDATE, DELETE)
-- - anon role has ALL permissions
-- - App can now read/write patient_registrations without authentication

-- Step 5: Test query
SELECT COUNT(*) as total_registrations FROM patient_registrations;
