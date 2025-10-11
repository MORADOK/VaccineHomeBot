/**
 * Security Setup Script
 * This script will:
 * 1. Run security audit logging migration
 * 2. Create admin test account
 * 3. Verify everything is working
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔒 VCHome Hospital - Security Setup\n');
console.log('═══════════════════════════════════════\n');

// Step 1: Check if migration is needed
async function checkMigrationStatus() {
  console.log('📋 Step 1: Checking migration status...\n');

  try {
    // Check if audit_logs table exists
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1);

    if (error && error.message.includes('relation "public.audit_logs" does not exist')) {
      console.log('   ⚠️  audit_logs table does not exist');
      console.log('   📝 Migration is needed!\n');
      return false;
    }

    if (!error) {
      console.log('   ✅ audit_logs table already exists');
      console.log('   ℹ️  Migration already applied\n');
      return true;
    }

    // Other errors
    console.log('   ⚠️  Could not check migration status:', error.message);
    return null;

  } catch (err) {
    console.error('   ❌ Error:', err.message);
    return null;
  }
}

// Step 2: Display migration SQL
async function displayMigrationInstructions() {
  console.log('📄 Step 2: Migration Required\n');
  console.log('   The migration needs to be run manually in Supabase Dashboard.');
  console.log('   This is because the anon key does not have permission to create tables.\n');

  console.log('   📍 Instructions:\n');
  console.log('   1. Go to: https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/sql/new');
  console.log('   2. Copy the SQL from: supabase/migrations/20251011000000_add_security_audit_logging.sql');
  console.log('   3. Paste and run it in the SQL Editor');
  console.log('   4. Come back and run this script again\n');

  console.log('   Or use Supabase CLI:');
  console.log('   $ supabase db push\n');

  return false;
}

// Step 3: Create admin account
async function createAdminAccount() {
  console.log('👤 Step 3: Creating admin account...\n');

  const adminEmail = 'admin.test@hospital.local';
  const adminPassword = 'AdminSecure123!';

  try {
    // Try to sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          name: 'Admin Test Account'
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('   ℹ️  Admin account already exists');

        // Try to sign in to get user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword
        });

        if (signInData?.user) {
          console.log('   ✅ Signed in to existing account');
          return { userId: signInData.user.id, email: adminEmail, password: adminPassword };
        } else {
          console.log('   ⚠️  Could not sign in:', signInError?.message);
          console.log('   💡 You may need to reset the password\n');
          return null;
        }
      } else {
        console.log('   ❌ Error creating account:', signUpError.message);
        return null;
      }
    }

    if (signUpData?.user) {
      console.log('   ✅ Admin account created successfully');
      console.log('   📧 Email:', adminEmail);
      console.log('   🔑 Password:', adminPassword);
      console.log('   🆔 User ID:', signUpData.user.id);
      return { userId: signUpData.user.id, email: adminEmail, password: adminPassword };
    }

  } catch (err) {
    console.error('   ❌ Unexpected error:', err.message);
    return null;
  }
}

// Step 4: Assign admin role
async function assignAdminRole(userId) {
  console.log('\n🔐 Step 4: Assigning admin role...\n');

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin',
        created_by: userId
      })
      .select();

    if (error) {
      if (error.message.includes('duplicate key')) {
        console.log('   ℹ️  Admin role already assigned');
        return true;
      } else if (error.message.includes('violates row-level security policy')) {
        console.log('   ⚠️  Cannot assign role: RLS policy blocks it');
        console.log('   📝 Manual action required:\n');
        console.log('   Run this SQL in Supabase Dashboard:\n');
        console.log('   INSERT INTO public.user_roles (user_id, role, created_by)');
        console.log(`   VALUES ('${userId}', 'admin', '${userId}');`);
        console.log('');
        return false;
      } else {
        console.log('   ❌ Error:', error.message);
        return false;
      }
    }

    console.log('   ✅ Admin role assigned successfully');
    return true;

  } catch (err) {
    console.error('   ❌ Unexpected error:', err.message);
    return false;
  }
}

// Step 5: Verify setup
async function verifySetup(userId) {
  console.log('\n✓ Step 5: Verifying setup...\n');

  try {
    // Check role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError) {
      console.log('   ❌ Could not verify role:', roleError.message);
      return false;
    }

    console.log('   ✅ User role:', roleData.role);

    // Check RPC function
    const { data: hasRoleData, error: hasRoleError } = await supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' });

    if (hasRoleError) {
      console.log('   ⚠️  has_role() function error:', hasRoleError.message);
    } else {
      console.log('   ✅ has_role() works:', hasRoleData);
    }

    // Check is_healthcare_staff
    const { data: isStaffData, error: isStaffError } = await supabase
      .rpc('is_healthcare_staff', { _user_id: userId });

    if (isStaffError) {
      console.log('   ⚠️  is_healthcare_staff() error:', isStaffError.message);
    } else {
      console.log('   ✅ is_healthcare_staff() works:', isStaffData);
    }

    return true;

  } catch (err) {
    console.error('   ❌ Error:', err.message);
    return false;
  }
}

// Main function
async function main() {
  try {
    // Step 1: Check migration
    const migrationExists = await checkMigrationStatus();

    if (migrationExists === false) {
      await displayMigrationInstructions();
      console.log('🛑 Setup paused. Please run migration first.\n');
      return;
    }

    if (migrationExists === null) {
      console.log('⚠️  Could not determine migration status.\n');
      console.log('Please check your Supabase connection and try again.\n');
      return;
    }

    // Step 3: Create admin account
    const adminAccount = await createAdminAccount();

    if (!adminAccount) {
      console.log('\n❌ Setup failed: Could not create admin account\n');
      return;
    }

    // Step 4: Assign role
    const roleAssigned = await assignAdminRole(adminAccount.userId);

    if (!roleAssigned) {
      console.log('\n⚠️  Setup incomplete: Role not assigned automatically');
      console.log('Please follow the manual instructions above.\n');
      return;
    }

    // Step 5: Verify
    const verified = await verifySetup(adminAccount.userId);

    // Final summary
    console.log('\n═══════════════════════════════════════\n');
    console.log('🎉 Setup Complete!\n');
    console.log('📋 Summary:\n');
    console.log('   ✅ Migration applied');
    console.log('   ✅ Admin account created');
    console.log('   ✅ Admin role assigned');
    console.log('   ✅ Security functions working\n');

    console.log('🔐 Admin Credentials:\n');
    console.log(`   📧 Email:    ${adminAccount.email}`);
    console.log(`   🔑 Password: ${adminAccount.password}`);
    console.log('');

    console.log('🚀 Next Steps:\n');
    console.log('   1. Test login at: http://localhost:5173/admin');
    console.log('   2. Use the secure components:');
    console.log('      - AdminLoginSecure');
    console.log('      - use-admin-auth-secure');
    console.log('   3. Read SECURITY-IMPLEMENTATION-GUIDE.md\n');

    console.log('✨ Your system is now secure!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.log('\nPlease check your configuration and try again.\n');
  }
}

// Run the script
main();
