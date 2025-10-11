/**
 * Get User IDs from Supabase Auth
 * This script helps you get the User IDs you just created
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Getting User IDs for Role Assignment\n');
console.log('═══════════════════════════════════════════════\n');

const emails = [
  'admin@vchome.local',
  'staff@vchome.local',
  'nurse@vchome.local'
];

const testPassword = 'VCHome2024!';

async function getUserId(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (data?.user) {
      await supabase.auth.signOut();
      return data.user.id;
    }

    return null;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('📧 Attempting to get User IDs...\n');

  const userIds = {};
  let foundCount = 0;

  for (const email of emails) {
    const userId = await getUserId(email, testPassword);

    if (userId) {
      userIds[email] = userId;
      foundCount++;
      console.log(`✅ ${email}`);
      console.log(`   User ID: ${userId}\n`);
    } else {
      console.log(`❌ ${email}: Account not found or wrong password\n`);
    }
  }

  console.log('═══════════════════════════════════════════════\n');

  if (foundCount === 0) {
    console.log('❌ No accounts found!\n');
    console.log('Please create the accounts first in Supabase Dashboard:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/auth/users');
    console.log('2. Click "Add user"');
    console.log('3. Create accounts with:');
    console.log('   - admin@vchome.local / VCHome2024!');
    console.log('   - staff@vchome.local / VCHome2024!');
    console.log('   - nurse@vchome.local / VCHome2024!');
    console.log('4. Check "Auto Confirm User"');
    console.log('5. Run this script again\n');
    return;
  }

  console.log(`✅ Found ${foundCount}/3 accounts\n`);
  console.log('📝 Copy and run this SQL in Supabase SQL Editor:\n');
  console.log('═══════════════════════════════════════════════\n');
  console.log('```sql');
  console.log('-- VCHome Hospital - Assign User Roles\n');

  if (userIds['admin@vchome.local']) {
    console.log('-- Admin account');
    console.log('INSERT INTO public.user_roles (user_id, role, created_by)');
    console.log(`VALUES ('${userIds['admin@vchome.local']}', 'admin', '${userIds['admin@vchome.local']}')}`);
    console.log('ON CONFLICT (user_id) DO UPDATE SET role = \'admin\';\n');
  }

  if (userIds['staff@vchome.local']) {
    console.log('-- Staff account');
    console.log('INSERT INTO public.user_roles (user_id, role, created_by)');
    console.log(`VALUES ('${userIds['staff@vchome.local']}', 'healthcare_staff', '${userIds['staff@vchome.local']}')}`);
    console.log('ON CONFLICT (user_id) DO UPDATE SET role = \'healthcare_staff\';\n');
  }

  if (userIds['nurse@vchome.local']) {
    console.log('-- Nurse account');
    console.log('INSERT INTO public.user_roles (user_id, role, created_by)');
    console.log(`VALUES ('${userIds['nurse@vchome.local']}', 'healthcare_staff', '${userIds['nurse@vchome.local']}')}`);
    console.log('ON CONFLICT (user_id) DO UPDATE SET role = \'healthcare_staff\';\n');
  }

  console.log('-- Verify roles were assigned');
  console.log('SELECT u.email, ur.role');
  console.log('FROM public.user_roles ur');
  console.log('JOIN auth.users u ON u.id = ur.user_id;');
  console.log('```\n');
  console.log('═══════════════════════════════════════════════\n');

  if (foundCount < 3) {
    console.log(`⚠️  Warning: Only ${foundCount}/3 accounts found\n`);
    console.log('Missing accounts:');
    emails.forEach(email => {
      if (!userIds[email]) {
        console.log(`   - ${email}`);
      }
    });
    console.log('\nPlease create the missing accounts in Supabase Dashboard.\n');
  } else {
    console.log('✅ All 3 accounts found!\n');
    console.log('Next steps:');
    console.log('1. Copy the SQL above');
    console.log('2. Go to: https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/sql/new');
    console.log('3. Paste and run the SQL');
    console.log('4. Test login at: http://localhost:5173/staff-portal\n');
  }
}

main();
