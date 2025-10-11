/**
 * Script to create test staff accounts in Supabase
 * This will create demo users for testing the staff login system
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestStaff() {
  console.log('👷 Creating test staff accounts...\n');

  const testAccounts = [
    {
      email: 'admin.hospital@gmail.com',
      password: 'admin123456',
      role: 'admin',
      name: 'ผู้ดูแลระบบ'
    },
    {
      email: 'staff.hospital@gmail.com',
      password: 'staff123456',
      role: 'healthcare_staff',
      name: 'เจ้าหน้าที่'
    },
    {
      email: 'nurse.hospital@gmail.com',
      password: 'nurse123456',
      role: 'healthcare_staff',
      name: 'พยาบาล'
    }
  ];

  console.log('📝 Accounts to create:');
  testAccounts.forEach(acc => {
    console.log(`   - ${acc.email} (${acc.role})`);
  });
  console.log('');

  for (const account of testAccounts) {
    console.log(`\n🔐 Creating: ${account.email}...`);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            name: account.name
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`   ⚠️  User already exists: ${account.email}`);

          // Try to sign in to get the user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: account.email,
            password: account.password
          });

          if (signInData?.user) {
            console.log(`   ✅ Signed in existing user`);
            await assignRole(signInData.user.id, account.role);
          } else {
            console.log(`   ❌ Could not sign in: ${signInError?.message}`);
          }
        } else {
          console.log(`   ❌ Error: ${authError.message}`);
        }
        continue;
      }

      if (authData?.user) {
        console.log(`   ✅ User created: ${authData.user.id}`);
        await assignRole(authData.user.id, account.role);
      }

    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error.message}`);
    }
  }

  console.log('\n✨ Done!\n');
  console.log('📋 Test accounts created. You can now log in with:');
  testAccounts.forEach(acc => {
    console.log(`   📧 ${acc.email}`);
    console.log(`   🔑 ${acc.password}`);
    console.log('');
  });
}

async function assignRole(userId, role) {
  try {
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        created_by: userId
      });

    if (error) {
      if (error.message.includes('duplicate key')) {
        console.log(`   ℹ️  Role already assigned`);
      } else {
        console.log(`   ⚠️  Could not assign role: ${error.message}`);
      }
    } else {
      console.log(`   ✅ Role assigned: ${role}`);
    }
  } catch (error) {
    console.log(`   ❌ Error assigning role: ${error.message}`);
  }
}

// Run the script
createTestStaff();
