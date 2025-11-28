-- Fix Rabies Vaccine dose_intervals in vaccine_schedules table
--
-- Problem: Current dose_intervals [3,4,7,14] represents intervals between consecutive doses
-- Correct: Should be [3,7,14,28] representing intervals from first dose
--
-- Created: 2025-11-28
-- Author: VCHome Hospital Development Team

-- Display current data before update
SELECT
    vaccine_name,
    vaccine_type,
    total_doses,
    dose_intervals as current_intervals,
    active,
    updated_at
FROM vaccine_schedules
WHERE vaccine_type = 'rabies';

-- Update rabies vaccine dose_intervals to correct values
UPDATE vaccine_schedules
SET
    dose_intervals = '[3,7,14,28]',
    updated_at = NOW()
WHERE vaccine_type = 'rabies';

-- Verify the update
SELECT
    vaccine_name,
    vaccine_type,
    total_doses,
    dose_intervals as updated_intervals,
    active,
    updated_at
FROM vaccine_schedules
WHERE vaccine_type = 'rabies';

-- Expected result:
-- vaccine_name: วัคซีนพิษสุนัขบ้า
-- vaccine_type: rabies
-- total_doses: 5
-- dose_intervals: [3,7,14,28]
--
-- Dose schedule:
-- Dose 1: Day 0 (baseline)
-- Dose 2: Day 0 + 3 = Day 3
-- Dose 3: Day 0 + 7 = Day 7
-- Dose 4: Day 0 + 14 = Day 14
-- Dose 5: Day 0 + 28 = Day 28
