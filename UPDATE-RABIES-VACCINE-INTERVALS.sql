-- ==================================================================================
-- Update Rabies Vaccine dose_intervals in vaccine_schedules table
--
-- Purpose: Fix rabies vaccine intervals to use cumulative method (from first dose)
--
-- Background:
-- - Old value: [3,4,7,14] - represented intervals between consecutive doses (WRONG)
-- - New value: [3,7,14,28] - represents intervals from first dose (CORRECT)
--
-- Calculation Method:
-- dose_intervals stores the number of days from the FIRST dose, not between doses.
-- Example for rabies vaccine with [3,7,14,28]:
--   Dose 1: Day 0 (baseline)
--   Dose 2: Day 0 + 3 = Day 3
--   Dose 3: Day 0 + 7 = Day 7
--   Dose 4: Day 0 + 14 = Day 14
--   Dose 5: Day 0 + 28 = Day 28
--
-- Created: 2025-03-25
-- Author: VCHome Hospital Development Team
-- ==================================================================================

-- Step 1: Display current data before update
SELECT
    id,
    vaccine_name,
    vaccine_type,
    total_doses,
    dose_intervals as current_intervals,
    active,
    updated_at
FROM vaccine_schedules
WHERE vaccine_type = 'rabies';

-- Step 2: Update rabies vaccine dose_intervals to correct cumulative values
UPDATE vaccine_schedules
SET
    dose_intervals = '[3,7,14,28]'::jsonb,
    updated_at = NOW()
WHERE vaccine_type = 'rabies';

-- Step 3: Verify the update was successful
SELECT
    id,
    vaccine_name,
    vaccine_type,
    total_doses,
    dose_intervals as updated_intervals,
    active,
    updated_at
FROM vaccine_schedules
WHERE vaccine_type = 'rabies';

-- Step 4: Display all vaccine schedules to verify consistency
SELECT
    vaccine_name,
    vaccine_type,
    total_doses,
    dose_intervals,
    active
FROM vaccine_schedules
ORDER BY vaccine_name;

-- ==================================================================================
-- Expected Results:
-- ==================================================================================
-- Rabies vaccine should now have:
-- - vaccine_name: วัคซีนพิษสุนัขบ้า
-- - vaccine_type: rabies
-- - total_doses: 5
-- - dose_intervals: [3,7,14,28]
--
-- Dose schedule interpretation:
-- - Dose 1: Day 0 (first dose - baseline)
-- - Dose 2: Day 3 (3 days from first dose)
-- - Dose 3: Day 7 (7 days from first dose)
-- - Dose 4: Day 14 (14 days from first dose)
-- - Dose 5: Day 28 (28 days from first dose)
-- ==================================================================================

-- Additional verification: Check other vaccines use the same cumulative method
-- All vaccines should store intervals from first dose, not between consecutive doses
