/**
 * สคริปต์แก้ไขวันนัดที่คำนวณผิด
 * คำนวณวันนัดใหม่จากเข็มแรก + ระยะห่างสะสม
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('🔧 สคริปต์แก้ไขวันนัดที่คำนวณผิด\n');
console.log('⚠️  คำเตือน: สคริปต์นี้จะแก้ไขข้อมูลในฐานข้อมูล');
console.log('⚠️  กรุณาสำรองข้อมูลก่อนใช้งาน\n');

async function fixAppointmentDates() {
  try {
    // อ่านรายงานจากไฟล์
    const fs = await import('fs');
    const reportPath = 'appointment-verification-report.json';
    
    if (!fs.existsSync(reportPath)) {
      console.log('❌ ไม่พบไฟล์รายงาน appointment-verification-report.json');
      console.log('💡 กรุณารันสคริปต์ verify-appointment-dates.js ก่อน');
      process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const incorrectAppointments = report.incorrect_appointments;

    if (incorrectAppointments.length === 0) {
      console.log('✅ ไม่พบนัดที่ต้องแก้ไข');
      process.exit(0);
    }

    console.log(`พบนัดที่ต้องแก้ไข: ${incorrectAppointments.length} รายการ\n`);

    // แสดงรายการที่จะแก้ไข
    incorrectAppointments.forEach((appt, index) => {
      console.log(`${index + 1}. ${appt.patient_name} - ${appt.vaccine_type} โดสที่ ${appt.dose_number}`);
      console.log(`   จาก: ${appt.actual_date} → เป็น: ${appt.expected_date} (${appt.status})`);
    });

    console.log('');
    const answer = await question('คุณต้องการแก้ไขนัดเหล่านี้หรือไม่? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ ยกเลิกการแก้ไข');
      rl.close();
      process.exit(0);
    }

    console.log('\n🔧 เริ่มแก้ไขนัด...\n');

    let successCount = 0;
    let failCount = 0;

    for (const appt of incorrectAppointments) {
      try {
        // อัพเดทวันนัด
        const { error } = await supabase
          .from('appointments')
          .update({ 
            appointment_date: appt.expected_date,
            notes: `[แก้ไขอัตโนมัติ] คำนวณจากเข็มแรก + ระยะห่างสะสม (เดิม: ${appt.actual_date})`
          })
          .eq('id', appt.appointment_id);

        if (error) throw error;

        console.log(`✅ แก้ไข: ${appt.patient_name} - โดสที่ ${appt.dose_number} (${appt.actual_date} → ${appt.expected_date})`);
        successCount++;
      } catch (error) {
        console.log(`❌ ไม่สามารถแก้ไข: ${appt.patient_name} - โดสที่ ${appt.dose_number}`);
        console.log(`   Error: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n');
    console.log('='.repeat(100));
    console.log('\n📊 สรุปผลการแก้ไข\n');
    console.log(`✅ แก้ไขสำเร็จ: ${successCount} รายการ`);
    console.log(`❌ แก้ไขไม่สำเร็จ: ${failCount} รายการ`);
    console.log(`📊 ทั้งหมด: ${incorrectAppointments.length} รายการ`);
    console.log('\n✅ เสร็จสิ้น\n');

    rl.close();
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    rl.close();
    process.exit(1);
  }
}

// เรียกใช้งาน
fixAppointmentDates();
