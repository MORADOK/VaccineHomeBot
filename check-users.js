/**
 * Script to check users and their roles in Supabase
 * This will help verify the staff login system
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('🔍 Checking Supabase users and roles...\n');

  try {
    // Get all user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('❌ Error fetching user_roles:', rolesError.message);
      return;
    }

    if (!roles || roles.length === 0) {
      console.log('⚠️  No users found in user_roles table');
      console.log('📝 You may need to create users first\n');
      return;
    }

    console.log(`✅ Found ${roles.length} user role(s):\n`);

    for (const role of roles) {
      console.log('─────────────────────────────────────');
      console.log(`User ID: ${role.user_id}`);
      console.log(`Role: ${role.role}`);
      console.log(`Created: ${new Date(role.created_at).toLocaleString('th-TH')}`);

      // Try to get user details (might not work with anon key)
      console.log('');
    }

    console.log('─────────────────────────────────────\n');

    // Summary
    const adminCount = roles.filter(r => r.role === 'admin').length;
    const staffCount = roles.filter(r => r.role === 'healthcare_staff').length;
    const patientCount = roles.filter(r => r.role === 'patient').length;

    console.log('📊 Summary:');
    console.log(`   👑 Admins: ${adminCount}`);
    console.log(`   👩‍⚕️ Healthcare Staff: ${staffCount}`);
    console.log(`   👤 Patients: ${patientCount}`);
    console.log(`   📌 Total: ${roles.length}\n`);

    // Test RPC functions
    console.log('🧪 Testing RPC functions...\n');

    if (roles.length > 0) {
      const testUserId = roles[0].user_id;

      // Test has_role
      const { data: hasRole, error: hasRoleError } = await supabase
        .rpc('has_role', { _user_id: testUserId, _role: roles[0].role });

      if (hasRoleError) {
        console.log(`❌ has_role() error: ${hasRoleError.message}`);
      } else {
        console.log(`✅ has_role() works: ${hasRole}`);
      }

      // Test is_healthcare_staff
      const { data: isStaff, error: isStaffError } = await supabase
        .rpc('is_healthcare_staff', { _user_id: testUserId });

      if (isStaffError) {
        console.log(`❌ is_healthcare_staff() error: ${isStaffError.message}`);
      } else {
        console.log(`✅ is_healthcare_staff() works: ${isStaff}`);
      }
    }

    console.log('\n✨ Check complete!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkUsers();
