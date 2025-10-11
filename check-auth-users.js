/**
 * Check Auth Users
 * Check what users actually exist in Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('👥 VCHome Hospital - Check Auth Users\n');
console.log('═══════════════════════════════════════════════\n');

// Test emails
const testEmails = [
  'admin.hospital@gmail.com',
  'staff.hospital@gmail.com',
  'nurse.hospital@gmail.com',
  'admin.test@hospital.local',
  'admin@vchomehospital.co.th'
];

// Possible passwords
const possiblePasswords = [
  'VCHome2024!',
  'AdminSecure123!',
  'admin123',
  'VCHome123!',
  'Hospital2024!'
];

console.log('🔍 Method 1: Trying to sign in with different passwords...\n');

async function tryLogin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (data?.user) {
      console.log(`   ✅ SUCCESS: ${email} / ${password}`);
      console.log(`      User ID: ${data.user.id}`);
      console.log(`      Email Confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);

      // Sign out
      await supabase.auth.signOut();
      return { userId: data.user.id, password };
    }

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return null; // Wrong password or user doesn't exist
      } else if (error.message.includes('Email not confirmed')) {
        console.log(`   ⚠️  ${email}: Account exists but email not confirmed`);
        return null;
      } else {
        console.log(`   ⚠️  ${email}: ${error.message}`);
        return null;
      }
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return null;
  }
}

async function main() {
  const validAccounts = [];

  for (const email of testEmails) {
    console.log(`\n📧 Testing ${email}...`);

    let found = false;
    for (const password of possiblePasswords) {
      const result = await tryLogin(email, password);
      if (result) {
        validAccounts.push({ email, password, userId: result.userId });
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`   ❌ No valid password found for ${email}`);
      console.log(`      Account may not exist or needs email confirmation`);
    }
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════\n');
  console.log('📊 SUMMARY\n');

  if (validAccounts.length === 0) {
    console.log('❌ No valid accounts found!\n');
    console.log('📝 This means either:');
    console.log('   1. Accounts were not created successfully');
    console.log('   2. Email confirmation is required');
    console.log('   3. Different passwords were used\n');

    console.log('💡 Solutions:\n');
    console.log('Option 1: Create accounts in Supabase Dashboard');
    console.log('   URL: https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/auth/users');
    console.log('   Click "Add user" → Create with email and password\n');

    console.log('Option 2: Check if email confirmation is disabled');
    console.log('   URL: https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/auth/settings');
    console.log('   Under "Auth" → Disable "Enable email confirmations"\n');

  } else {
    console.log(`✅ Found ${validAccounts.length} valid account(s):\n`);

    validAccounts.forEach((acc, i) => {
      console.log(`${i+1}. Email: ${acc.email}`);
      console.log(`   Password: ${acc.password}`);
      console.log(`   User ID: ${acc.userId}`);
      console.log('');
    });

    console.log('📝 Now you need to assign roles to these accounts.\n');
    console.log('Run this SQL in Supabase Dashboard:\n');
    console.log('```sql');
    validAccounts.forEach(acc => {
      console.log(`-- ${acc.email}`);
      console.log(`INSERT INTO public.user_roles (user_id, role, created_by)`);
      console.log(`VALUES ('${acc.userId}', 'healthcare_staff', '${acc.userId}');`);
      console.log('');
    });
    console.log('```\n');
    console.log('For admin users, change role to "admin" instead of "healthcare_staff".\n');
  }

  console.log('═══════════════════════════════════════════════\n');
}

main();
