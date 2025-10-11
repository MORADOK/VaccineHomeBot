/**
 * Test Login Functionality
 * Test if login works directly via Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing Login Functionality\n');
console.log('═══════════════════════════════════════════════\n');

const testAccounts = [
  { email: 'staff@vchome.local', password: 'VCHome2024!', name: 'Staff' },
  { email: 'admin@vchome.local', password: 'VCHome2024!', name: 'Admin' },
  { email: 'nurse@vchome.local', password: 'VCHome2024!', name: 'Nurse' }
];

async function testLogin(email, password, name) {
  console.log(`\n🔐 Testing ${name} (${email})...`);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log(`   ❌ Login FAILED`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.status || 'N/A'}`);
      return false;
    }

    if (data?.user) {
      console.log(`   ✅ Login SUCCESS`);
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Email Confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);

      // Check role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (roleError) {
        console.log(`   ⚠️  Role check failed: ${roleError.message}`);
      } else if (roleData) {
        console.log(`   👤 Role: ${roleData.role}`);

        // Check if healthcare staff
        const { data: isStaff, error: staffError } = await supabase
          .rpc('is_healthcare_staff', { _user_id: data.user.id });

        if (staffError) {
          console.log(`   ⚠️  Healthcare staff check failed: ${staffError.message}`);
        } else {
          console.log(`   🏥 Can access Staff Portal: ${isStaff ? 'YES' : 'NO'}`);
        }
      } else {
        console.log(`   ⚠️  No role assigned`);
      }

      // Sign out
      await supabase.auth.signOut();
      return true;
    }

    console.log(`   ❌ No user data returned`);
    return false;

  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
    return false;
  }
}

async function main() {
  let successCount = 0;
  let failCount = 0;

  for (const account of testAccounts) {
    const success = await testLogin(account.email, account.password, account.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════════════\n');
  console.log('📊 SUMMARY\n');
  console.log(`✅ Success: ${successCount}/3`);
  console.log(`❌ Failed: ${failCount}/3\n`);

  if (successCount === 3) {
    console.log('🎉 All accounts can login!');
    console.log('\n📝 Next steps:');
    console.log('   1. Open browser console (F12)');
    console.log('   2. Check for JavaScript errors');
    console.log('   3. Check Network tab for failed requests');
    console.log('   4. Make sure you\'re on the correct page: /auth\n');
  } else if (successCount === 0) {
    console.log('❌ No accounts can login!');
    console.log('\n📝 Possible issues:');
    console.log('   1. Supabase connection problem');
    console.log('   2. Accounts not properly created');
    console.log('   3. Password incorrect\n');
  } else {
    console.log('⚠️  Some accounts work, some don\'t');
    console.log('\n📝 Check the failed accounts above\n');
  }

  console.log('═══════════════════════════════════════════════\n');
}

main();
