/**
 * Assign Roles to Test Accounts
 * This script assigns roles to the existing test accounts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔐 VCHome Hospital - Assign Roles to Test Accounts\n');
console.log('═══════════════════════════════════════════════\n');

// Test accounts to assign roles
const testAccounts = [
  { email: 'admin.hospital@gmail.com', password: 'VCHome2024!', role: 'admin' },
  { email: 'staff.hospital@gmail.com', password: 'VCHome2024!', role: 'healthcare_staff' },
  { email: 'nurse.hospital@gmail.com', password: 'VCHome2024!', role: 'healthcare_staff' },
  { email: 'admin.test@hospital.local', password: 'AdminSecure123!', role: 'admin' }
];

async function getUserIdByEmail(email, password) {
  try {
    // Try to sign in to get user ID
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log(`   ⚠️  Could not sign in as ${email}: ${error.message}`);
      return null;
    }

    if (data?.user) {
      console.log(`   ✅ Signed in as ${email}`);
      console.log(`      User ID: ${data.user.id}`);

      // Sign out
      await supabase.auth.signOut();

      return data.user.id;
    }

    return null;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return null;
  }
}

async function assignRole(userId, role, email) {
  try {
    console.log(`\n   📝 Assigning role "${role}" to ${email}...`);

    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        created_by: userId
      })
      .select();

    if (error) {
      if (error.message.includes('duplicate key')) {
        console.log(`   ℹ️  Role already assigned to ${email}`);
        return true;
      } else if (error.message.includes('violates row-level security policy')) {
        console.log(`   ⚠️  Cannot assign role: RLS policy blocks it`);
        console.log(`   📝 You need to run this SQL in Supabase Dashboard:\n`);
        console.log(`   INSERT INTO public.user_roles (user_id, role, created_by)`);
        console.log(`   VALUES ('${userId}', '${role}', '${userId}');`);
        console.log('');
        return false;
      } else {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
      }
    }

    console.log(`   ✅ Role "${role}" assigned successfully!`);
    return true;

  } catch (err) {
    console.log(`   ❌ Unexpected error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('📋 Step 1: Getting user IDs from test accounts...\n');

  const userRoles = [];

  for (const account of testAccounts) {
    console.log(`\n🔍 Processing ${account.email}...`);
    const userId = await getUserIdByEmail(account.email, account.password);

    if (userId) {
      userRoles.push({ userId, role: account.role, email: account.email });
    }
  }

  if (userRoles.length === 0) {
    console.log('\n❌ No users found! Make sure accounts exist and passwords are correct.\n');
    return;
  }

  console.log(`\n\n📋 Step 2: Assigning roles to ${userRoles.length} users...\n`);

  let successCount = 0;
  let failCount = 0;
  const sqlStatements = [];

  for (const { userId, role, email } of userRoles) {
    const success = await assignRole(userId, role, email);
    if (success) {
      successCount++;
    } else {
      failCount++;
      sqlStatements.push(`INSERT INTO public.user_roles (user_id, role, created_by) VALUES ('${userId}', '${role}', '${userId}');`);
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('📊 SUMMARY\n');
  console.log(`✅ Success: ${successCount} roles assigned`);
  console.log(`❌ Failed: ${failCount} roles need manual assignment\n`);

  if (sqlStatements.length > 0) {
    console.log('📝 Manual SQL Commands Needed:\n');
    console.log('Run these commands in Supabase Dashboard → SQL Editor:\n');
    console.log('```sql');
    sqlStatements.forEach(sql => console.log(sql));
    console.log('```\n');
    console.log('URL: https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/sql/new\n');
  } else {
    console.log('🎉 All roles assigned successfully!\n');
    console.log('🧪 Next steps:');
    console.log('   1. Test login at: http://localhost:5173/staff-portal');
    console.log('   2. Use one of these accounts:');
    testAccounts.forEach(acc => {
      console.log(`      - ${acc.email} (${acc.role})`);
    });
    console.log('\n');
  }

  console.log('═══════════════════════════════════════════════\n');
}

main();
