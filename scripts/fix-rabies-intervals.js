/**
 * Fix Rabies Vaccine dose_intervals in vaccine_schedules table
 *
 * Problem: Current dose_intervals [3,4,7,14] represents intervals between consecutive doses
 * Correct: Should be [3,7,14,28] representing intervals from first dose
 *
 * Created: 2025-11-28
 * Author: VCHome Hospital Development Team
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixRabiesIntervals() {
  console.log('🔧 Starting Rabies vaccine dose_intervals fix...\n');

  try {
    // 1. Display current data
    console.log('📊 Current data:');
    const { data: beforeData, error: beforeError } = await supabase
      .from('vaccine_schedules')
      .select('vaccine_name, vaccine_type, total_doses, dose_intervals, active, updated_at')
      .eq('vaccine_type', 'rabies')
      .single();

    if (beforeError) {
      console.error('❌ Error fetching current data:', beforeError);
      throw beforeError;
    }

    console.log('   - vaccine_name:', beforeData.vaccine_name);
    console.log('   - vaccine_type:', beforeData.vaccine_type);
    console.log('   - total_doses:', beforeData.total_doses);
    console.log('   - dose_intervals:', JSON.stringify(beforeData.dose_intervals));
    console.log('   - active:', beforeData.active);
    console.log('   - updated_at:', beforeData.updated_at);
    console.log('');

    // 2. Update to correct intervals
    console.log('🔄 Updating dose_intervals to [3,7,14,28]...');
    const { error: updateError } = await supabase
      .from('vaccine_schedules')
      .update({
        dose_intervals: [3, 7, 14, 28]
      })
      .eq('vaccine_type', 'rabies');

    if (updateError) {
      console.error('❌ Error updating data:', updateError);
      throw updateError;
    }

    console.log('✅ Update successful!\n');

    // 3. Verify the update
    console.log('✅ Verification - Updated data:');
    const { data: afterData, error: afterError } = await supabase
      .from('vaccine_schedules')
      .select('vaccine_name, vaccine_type, total_doses, dose_intervals, active, updated_at')
      .eq('vaccine_type', 'rabies')
      .single();

    if (afterError) {
      console.error('❌ Error fetching updated data:', afterError);
      throw afterError;
    }

    console.log('   - vaccine_name:', afterData.vaccine_name);
    console.log('   - vaccine_type:', afterData.vaccine_type);
    console.log('   - total_doses:', afterData.total_doses);
    console.log('   - dose_intervals:', JSON.stringify(afterData.dose_intervals));
    console.log('   - active:', afterData.active);
    console.log('   - updated_at:', afterData.updated_at);
    console.log('');

    // 4. Display dose schedule
    console.log('📅 Corrected Dose Schedule:');
    console.log('   Dose 1: Day 0 (baseline)');
    console.log('   Dose 2: Day 0 + 3 = Day 3');
    console.log('   Dose 3: Day 0 + 7 = Day 7');
    console.log('   Dose 4: Day 0 + 14 = Day 14');
    console.log('   Dose 5: Day 0 + 28 = Day 28');
    console.log('');

    console.log('🎉 Fix completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the fix
fixRabiesIntervals();
