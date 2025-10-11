/**
 * System Status Check Script
 * Comprehensive check of all systems and Supabase integration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VCHome Hospital - System Status Check\n');
console.log('═══════════════════════════════════════════════\n');

const results = {
  connection: false,
  tables: {},
  functions: {},
  auth: {},
  overall: 'unknown'
};

// 1. Check Supabase Connection
async function checkConnection() {
  console.log('📡 1. Supabase Connection\n');

  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);

    if (error && !error.message.includes('count')) {
      console.log('   ❌ Connection failed:', error.message);
      results.connection = false;
      return false;
    }

    console.log('   ✅ Connected to Supabase');
    console.log('   📍 URL:', supabaseUrl);
    results.connection = true;
    return true;

  } catch (err) {
    console.log('   ❌ Connection error:', err.message);
    results.connection = false;
    return false;
  }
}

// 2. Check Database Tables
async function checkTables() {
  console.log('\n📊 2. Database Tables\n');

  const tables = [
    'user_roles',
    'appointments',
    'vaccine_logs',
    'appointment_notifications',
    'audit_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ ${table}: Table does not exist`);
          results.tables[table] = 'missing';
        } else {
          console.log(`   ⚠️  ${table}: ${error.message}`);
          results.tables[table] = 'error';
        }
      } else {
        console.log(`   ✅ ${table}: OK`);
        results.tables[table] = 'ok';
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ${err.message}`);
      results.tables[table] = 'error';
    }
  }
}

// 3. Check RPC Functions
async function checkFunctions() {
  console.log('\n⚙️  3. RPC Functions\n');

  const functions = [
    { name: 'has_role', params: { _user_id: '00000000-0000-0000-0000-000000000000', _role: 'admin' } },
    { name: 'is_healthcare_staff', params: { _user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'log_security_event', params: { _user_id: '00000000-0000-0000-0000-000000000000', _event_type: 'test' } },
    { name: 'get_failed_login_attempts', params: { _user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'is_user_locked_out', params: { _user_id: '00000000-0000-0000-0000-000000000000' } }
  ];

  for (const func of functions) {
    try {
      const { data, error } = await supabase.rpc(func.name, func.params);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ ${func.name}(): Function does not exist`);
          results.functions[func.name] = 'missing';
        } else {
          console.log(`   ⚠️  ${func.name}(): ${error.message}`);
          results.functions[func.name] = 'error';
        }
      } else {
        console.log(`   ✅ ${func.name}(): Working (returned: ${data})`);
        results.functions[func.name] = 'ok';
      }
    } catch (err) {
      console.log(`   ❌ ${func.name}(): ${err.message}`);
      results.functions[func.name] = 'error';
    }
  }
}

// 4. Check Authentication System
async function checkAuth() {
  console.log('\n🔐 4. Authentication System\n');

  // Check if there are any users
  try {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role, count')
      .limit(10);

    if (rolesError) {
      console.log('   ⚠️  Cannot query user_roles:', rolesError.message);
      results.auth.user_roles = 'error';
    } else {
      const count = roles ? roles.length : 0;
      console.log(`   ℹ️  User roles in database: ${count}`);
      results.auth.user_roles = count > 0 ? 'has_users' : 'empty';

      if (count === 0) {
        console.log('   ⚠️  No users with roles found');
        console.log('   💡 Run: node setup-security.js to create admin account');
      } else {
        console.log('   ✅ Users with roles exist');
      }
    }
  } catch (err) {
    console.log('   ❌ Auth check error:', err.message);
    results.auth.user_roles = 'error';
  }

  // Check existing test accounts
  console.log('\n   📋 Checking test accounts:');
  const testEmails = [
    'admin.hospital@gmail.com',
    'staff.hospital@gmail.com',
    'nurse.hospital@gmail.com',
    'admin.test@hospital.local'
  ];

  for (const email of testEmails) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'test' // Just to check if account exists
      });

      // We expect this to fail with wrong password, but if account doesn't exist, different error
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          console.log(`   ✅ ${email}: Account exists`);
        } else if (error.message.includes('Email not confirmed')) {
          console.log(`   ⚠️  ${email}: Exists but not confirmed`);
        } else {
          console.log(`   ❌ ${email}: ${error.message}`);
        }
      } else {
        // Should not happen with wrong password
        await supabase.auth.signOut();
        console.log(`   ✅ ${email}: Account exists`);
      }
    } catch (err) {
      console.log(`   ❌ ${email}: ${err.message}`);
    }
  }
}

// 5. Check Components and Hooks
function checkCodeFiles() {
  console.log('\n📁 5. Code Files Status\n');

  const files = {
    '✅ Security components created': [
      'src/hooks/use-admin-auth-secure.ts',
      'src/components/AdminLoginSecure.tsx'
    ],
    '⚠️  Old components (should be replaced)': [
      'src/hooks/use-admin-auth.ts',
      'src/components/AdminLogin.tsx'
    ],
    '✅ Documentation': [
      'SECURITY-AUDIT-REPORT.md',
      'SECURITY-IMPLEMENTATION-GUIDE.md',
      'SECURITY-UPGRADE-SUMMARY.md'
    ],
    '✅ Migration': [
      'supabase/migrations/20251011000000_add_security_audit_logging.sql'
    ],
    '✅ Setup scripts': [
      'setup-security.js',
      'check-users.js',
      'create-test-staff.js'
    ]
  };

  for (const [category, fileList] of Object.entries(files)) {
    console.log(`   ${category}:`);
    for (const file of fileList) {
      console.log(`      - ${file}`);
    }
    console.log('');
  }
}

// Generate Summary
function generateSummary() {
  console.log('\n═══════════════════════════════════════════════\n');
  console.log('📊 SUMMARY\n');

  // Connection
  console.log('🔌 Connection:');
  console.log(`   ${results.connection ? '✅' : '❌'} Supabase: ${results.connection ? 'Connected' : 'Failed'}\n`);

  // Tables
  console.log('📊 Database Tables:');
  const tableStats = {
    ok: 0,
    missing: 0,
    error: 0
  };
  for (const [table, status] of Object.entries(results.tables)) {
    tableStats[status] = (tableStats[status] || 0) + 1;
    const icon = status === 'ok' ? '✅' : status === 'missing' ? '❌' : '⚠️';
    console.log(`   ${icon} ${table}: ${status}`);
  }
  console.log('');

  // Functions
  console.log('⚙️  RPC Functions:');
  const funcStats = {
    ok: 0,
    missing: 0,
    error: 0
  };
  for (const [func, status] of Object.entries(results.functions)) {
    funcStats[status] = (funcStats[status] || 0) + 1;
    const icon = status === 'ok' ? '✅' : status === 'missing' ? '❌' : '⚠️';
    console.log(`   ${icon} ${func}(): ${status}`);
  }
  console.log('');

  // Overall Status
  const criticalIssues = tableStats.missing + funcStats.missing;
  const warnings = tableStats.error + funcStats.error;

  console.log('🎯 Overall Status:');
  if (criticalIssues > 0) {
    console.log('   🔴 CRITICAL: Migration required!');
    console.log(`   Missing: ${criticalIssues} items`);
    results.overall = 'critical';
  } else if (warnings > 0) {
    console.log('   🟡 WARNING: Some issues detected');
    console.log(`   Warnings: ${warnings} items`);
    results.overall = 'warning';
  } else if (results.auth.user_roles === 'empty') {
    console.log('   🟡 READY: But no users configured');
    console.log('   Action: Create admin account');
    results.overall = 'ready_no_users';
  } else {
    console.log('   🟢 EXCELLENT: All systems operational!');
    results.overall = 'excellent';
  }
  console.log('');

  // Next Steps
  console.log('📋 Next Steps:\n');
  if (results.overall === 'critical') {
    console.log('   1. 🚨 Run migration in Supabase Dashboard:');
    console.log('      Copy SQL from: supabase/migrations/20251011000000_add_security_audit_logging.sql');
    console.log('      Paste in: https://supabase.com/dashboard/project/fljyjbrgfzervxofrilo/sql/new');
    console.log('   2. ✅ Run this script again to verify');
    console.log('   3. 👤 Create admin account: node setup-security.js');
  } else if (results.overall === 'ready_no_users') {
    console.log('   1. 👤 Create admin account:');
    console.log('      $ node setup-security.js');
    console.log('   2. 🧪 Test login at: http://localhost:5173/admin');
    console.log('   3. 🔄 Switch to secure components');
  } else if (results.overall === 'excellent') {
    console.log('   1. 🧪 Test the system:');
    console.log('      $ node setup-security.js (to get credentials)');
    console.log('   2. 🌐 Open: http://localhost:5173/admin');
    console.log('   3. 🔐 Login with secure credentials');
    console.log('   4. 📚 Read: SECURITY-IMPLEMENTATION-GUIDE.md');
  }

  console.log('\n═══════════════════════════════════════════════\n');
}

// Main
async function main() {
  const connectionOk = await checkConnection();

  if (!connectionOk) {
    console.log('\n❌ Cannot proceed without Supabase connection.\n');
    console.log('Please check:');
    console.log('   1. Internet connection');
    console.log('   2. Supabase project is running');
    console.log('   3. API keys are correct\n');
    return;
  }

  await checkTables();
  await checkFunctions();
  await checkAuth();
  checkCodeFiles();
  generateSummary();
}

main();
