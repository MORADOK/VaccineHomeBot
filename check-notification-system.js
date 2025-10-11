/**
 * Notification System Check Script
 * ตรวจสอบระบบแจ้งเตือนอัตโนมัติว่าทำงานหรือไม่
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fljyjbrgfzervxofrilo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('📱 VCHome Hospital - Notification System Check\n');
console.log('═══════════════════════════════════════════════\n');

const results = {
  database: {},
  functions: {},
  appointments: {},
  overall: 'unknown'
};

// 1. Check Database Tables
async function checkDatabaseTables() {
  console.log('📊 1. Database Tables Check\n');

  const tables = [
    { name: 'appointments', description: 'ตารางนัดหมาย' },
    { name: 'appointment_notifications', description: 'ตารางการแจ้งเตือน' },
    { name: 'notification_jobs', description: 'คิวงานแจ้งเตือน' }
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ ${table.name}: ตารางไม่มีอยู่`);
          results.database[table.name] = 'missing';
        } else if (error.message.includes('permission denied')) {
          console.log(`   ⚠️  ${table.name}: ไม่มีสิทธิ์เข้าถึง (${table.description})`);
          results.database[table.name] = 'permission_denied';
        } else {
          console.log(`   ⚠️  ${table.name}: ${error.message}`);
          results.database[table.name] = 'error';
        }
      } else {
        console.log(`   ✅ ${table.name}: พร้อมใช้งาน (${table.description})`);
        results.database[table.name] = 'ok';
      }
    } catch (err) {
      console.log(`   ❌ ${table.name}: ${err.message}`);
      results.database[table.name] = 'error';
    }
  }
  console.log('');
}

// 2. Check Appointments
async function checkAppointments() {
  console.log('📅 2. Appointments Check\n');

  try {
    // Check tomorrow's appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: tomorrowAppts, error: tomorrowError } = await supabase
      .from('appointments')
      .select('*')
      .eq('appointment_date', tomorrowStr)
      .eq('status', 'scheduled');

    if (tomorrowError) {
      console.log(`   ⚠️  นัดหมายพรุ่งนี้: ${tomorrowError.message}`);
      results.appointments.tomorrow = 'error';
    } else {
      const count = tomorrowAppts?.length || 0;
      console.log(`   ${count > 0 ? '✅' : 'ℹ️ '} นัดหมายพรุ่งนี้: ${count} รายการ`);
      results.appointments.tomorrow = { count, data: tomorrowAppts };
    }

    // Check overdue appointments
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueAppts, error: overdueError } = await supabase
      .from('appointments')
      .select('*')
      .lt('appointment_date', today)
      .eq('status', 'scheduled');

    if (overdueError) {
      console.log(`   ⚠️  นัดเกินกำหนด: ${overdueError.message}`);
      results.appointments.overdue = 'error';
    } else {
      const count = overdueAppts?.length || 0;
      console.log(`   ${count > 0 ? '⚠️ ' : '✅'} นัดเกินกำหนด: ${count} รายการ`);
      results.appointments.overdue = { count, data: overdueAppts };

      if (count > 0) {
        console.log(`      💡 มีการนัดที่เกินกำหนด ควรส่งการแจ้งเตือน`);
      }
    }

    // Check recent appointments
    const { data: recentAppts, error: recentError } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.log(`   ⚠️  นัดหมายล่าสุด: ${recentError.message}`);
      results.appointments.recent = 'error';
    } else {
      const count = recentAppts?.length || 0;
      console.log(`   ℹ️  นัดหมายล่าสุด: ${count} รายการ`);
      results.appointments.recent = { count };
    }

  } catch (err) {
    console.log(`   ❌ Error checking appointments: ${err.message}`);
  }
  console.log('');
}

// 3. Check Notification History
async function checkNotificationHistory() {
  console.log('📬 3. Notification History\n');

  try {
    const { data: notifications, error } = await supabase
      .from('appointment_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`   ❌ ไม่สามารถดึงประวัติการแจ้งเตือนได้: ${error.message}`);
      results.notifications = 'error';
      return;
    }

    const total = notifications?.length || 0;
    console.log(`   📊 การแจ้งเตือนทั้งหมด (20 รายการล่าสุด): ${total}`);

    if (total === 0) {
      console.log(`   ⚠️  ยังไม่เคยมีการแจ้งเตือน`);
      console.log(`   💡 ลองรันคำสั่ง: node test-notification.js`);
      results.notifications = 'empty';
      return;
    }

    // นับตามสถานะ
    const sent = notifications.filter(n => n.status === 'sent').length;
    const failed = notifications.filter(n => n.status === 'failed').length;
    const pending = notifications.filter(n => n.status === 'pending').length;

    console.log(`   ✅ ส่งสำเร็จ: ${sent} รายการ`);
    if (failed > 0) {
      console.log(`   ❌ ล้มเหลว: ${failed} รายการ`);
    }
    if (pending > 0) {
      console.log(`   ⏳ รอดำเนินการ: ${pending} รายการ`);
    }

    // นับตามประเภท
    const reminder = notifications.filter(n => n.notification_type === 'reminder').length;
    const overdue = notifications.filter(n => n.notification_type === 'overdue').length;

    console.log(`   📝 ประเภท:`);
    console.log(`      - แจ้งเตือนล่วงหน้า: ${reminder} รายการ`);
    console.log(`      - แจ้งเตือนเกินกำหนด: ${overdue} รายการ`);

    // แสดง 3 รายการล่าสุด
    console.log(`\n   📋 การแจ้งเตือนล่าสุด:`);
    notifications.slice(0, 3).forEach((notif, i) => {
      const date = new Date(notif.created_at).toLocaleString('th-TH');
      const statusIcon = notif.status === 'sent' ? '✅' : notif.status === 'failed' ? '❌' : '⏳';
      console.log(`      ${i+1}. ${statusIcon} ${notif.notification_type} → ${notif.sent_to}`);
      console.log(`         เมื่อ: ${date}`);
    });

    results.notifications = { total, sent, failed, pending, reminder, overdue };

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    results.notifications = 'error';
  }
  console.log('');
}

// 4. Check Supabase Functions
async function checkSupabaseFunctions() {
  console.log('⚙️  4. Supabase Edge Functions\n');

  try {
    // Test manual-notification-trigger function
    console.log('   🧪 ทดสอบฟังก์ชัน manual-notification-trigger...');

    const { data, error } = await supabase.functions.invoke('manual-notification-trigger', {
      body: { test: true, dryRun: true }
    });

    if (error) {
      if (error.message.includes('FunctionsRelayError') || error.message.includes('Not Found')) {
        console.log(`   ❌ ฟังก์ชันไม่พบ: manual-notification-trigger`);
        console.log(`      💡 ฟังก์ชันอาจยังไม่ได้ deploy หรือชื่อไม่ถูกต้อง`);
        results.functions.notification = 'not_found';
      } else {
        console.log(`   ⚠️  ฟังก์ชันมีปัญหา: ${error.message}`);
        results.functions.notification = 'error';
      }
    } else {
      console.log(`   ✅ ฟังก์ชัน manual-notification-trigger ทำงานได้`);
      if (data) {
        console.log(`      📊 ผลลัพธ์:`, JSON.stringify(data, null, 2).split('\n').map((line, i) => i === 0 ? line : `      ${line}`).join('\n'));
      }
      results.functions.notification = 'ok';
    }

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    results.functions.notification = 'error';
  }
  console.log('');
}

// 5. Check LINE Integration
async function checkLineIntegration() {
  console.log('📱 5. LINE Bot Integration\n');

  try {
    // Check webhook URL from .env
    const webhookUrl = process.env.VITE_WEBHOOK_URL;

    if (webhookUrl) {
      console.log(`   ℹ️  Webhook URL: ${webhookUrl}`);
      results.line = { configured: true, url: webhookUrl };
    } else {
      console.log(`   ⚠️  ไม่พบ VITE_WEBHOOK_URL ใน .env`);
      results.line = { configured: false };
    }

    // Note: ไม่สามารถทดสอบ LINE API ได้จริงจาก client-side
    console.log(`   💡 การทดสอบ LINE API ต้องทำผ่าน Edge Function`);

  } catch (err) {
    console.log(`   ⚠️  Error: ${err.message}`);
  }
  console.log('');
}

// 6. Generate Summary
function generateSummary() {
  console.log('═══════════════════════════════════════════════\n');
  console.log('📊 SUMMARY - ระบบแจ้งเตือนอัตโนมัติ\n');

  // Database Status
  const dbOk = Object.values(results.database).filter(v => v === 'ok').length;
  const dbTotal = Object.keys(results.database).length;
  console.log(`📊 Database: ${dbOk}/${dbTotal} tables OK`);

  // Appointments
  if (results.appointments.tomorrow && typeof results.appointments.tomorrow === 'object') {
    const count = results.appointments.tomorrow.count;
    console.log(`📅 Appointments: ${count} นัดพรุ่งนี้`);
  }
  if (results.appointments.overdue && typeof results.appointments.overdue === 'object') {
    const count = results.appointments.overdue.count;
    if (count > 0) {
      console.log(`⚠️  Overdue: ${count} นัดเกินกำหนด`);
    }
  }

  // Notifications
  if (results.notifications && typeof results.notifications === 'object') {
    console.log(`📬 Notifications: ${results.notifications.sent}/${results.notifications.total} sent`);
  } else if (results.notifications === 'empty') {
    console.log(`📬 Notifications: ยังไม่มีการแจ้งเตือน`);
  }

  // Functions
  if (results.functions.notification === 'ok') {
    console.log(`⚙️  Functions: ✅ ทำงานได้`);
  } else if (results.functions.notification === 'not_found') {
    console.log(`⚙️  Functions: ❌ ไม่พบฟังก์ชัน`);
  }

  console.log('');

  // Overall Status
  const criticalIssues =
    (results.database.appointments === 'missing' ? 1 : 0) +
    (results.database.appointment_notifications === 'missing' ? 1 : 0) +
    (results.functions.notification === 'not_found' ? 1 : 0);

  console.log('🎯 Overall Status:\n');

  if (criticalIssues > 0) {
    console.log('   🔴 CRITICAL: ระบบไม่สามารถทำงานได้');
    console.log(`   Missing: ${criticalIssues} components\n`);
    results.overall = 'critical';
  } else if (results.functions.notification === 'error') {
    console.log('   🟡 WARNING: ระบบมีปัญหาบางส่วน');
    console.log('   Edge Function มีปัญหา\n');
    results.overall = 'warning';
  } else if (results.notifications === 'empty') {
    console.log('   🟢 READY: ระบบพร้อมใช้งาน');
    console.log('   แต่ยังไม่เคยมีการแจ้งเตือน\n');
    results.overall = 'ready_unused';
  } else if (results.notifications && typeof results.notifications === 'object' && results.notifications.sent > 0) {
    console.log('   🟢 EXCELLENT: ระบบทำงานปกติ!');
    console.log(`   มีการแจ้งเตือน ${results.notifications.sent} รายการแล้ว\n`);
    results.overall = 'excellent';
  } else {
    console.log('   🟢 GOOD: ระบบพร้อมใช้งาน\n');
    results.overall = 'good';
  }

  // Next Steps
  console.log('📋 Next Steps:\n');

  if (results.overall === 'critical') {
    if (results.functions.notification === 'not_found') {
      console.log('   1. 🚨 Deploy Edge Function:');
      console.log('      $ cd supabase/functions');
      console.log('      $ supabase functions deploy manual-notification-trigger');
    }
    if (results.database.appointments === 'missing') {
      console.log('   2. 📊 Run migrations to create tables');
    }
  } else if (results.overall === 'ready_unused') {
    console.log('   1. 🧪 ทดสอบส่งการแจ้งเตือน:');
    console.log('      - เปิดหน้า Staff Portal');
    console.log('      - ไปที่แท็บ "ตั้งค่า"');
    console.log('      - คลิก "เรียกใช้ระบบแจ้งเตือน"');
    console.log('');
    console.log('   2. ✅ สร้างนัดหมายทดสอบ:');
    console.log('      - สร้างนัดหมายสำหรับพรุ่งนี้');
    console.log('      - รอระบบส่งการแจ้งเตือนอัตโนมัติ');
  } else if (results.overall === 'excellent') {
    console.log('   ✅ ระบบทำงานปกติ!');
    console.log('   📊 ติดตามสถิติได้ที่ Staff Portal → ตั้งค่า');
  }

  console.log('\n═══════════════════════════════════════════════\n');
}

// Main
async function main() {
  try {
    await checkDatabaseTables();
    await checkAppointments();
    await checkNotificationHistory();
    await checkSupabaseFunctions();
    await checkLineIntegration();
    generateSummary();
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

main();
