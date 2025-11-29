/**
 * สคริปต์อัพเดตวันนัดทั้งหมดตามการคำนวณใหม่
 * (นับจากเข็มแรก ไม่สะสม)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('🔧 สคริปต์อัพเดตวันนัดทั้งหมด\n');
console.log('⚠️  คำเตือน: สคริปต์นี้จะอัพเดตวันนัดทั้งหมดในฐานข้อมูล');
console.log('⚠️  กรุณาสำรองข้อมูลก่อนใช้งาน\n');

async function recalculateAppointments() {
  try {
    // 1. ดึงข้อมูลวัคซีน
    console.log('📊 กำลังดึงข้อมูลวัคซีน...');
    const { data: vaccineSchedules, error: schedError } = await supabase
      .from('vaccine_schedules')
      .select('*')
      .eq('active', true);

    if (schedError) throw schedError;

    console.log(`✅ พบวัคซีน ${vaccineSchedules.length} ประเภท\n`);

    // 2. ดึงข้อมูลนัดทั้งหมด
    console.log('📅 กำลังดึงข้อมูลนัดทั้งหมด...');
    const { data: allAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('*')
      .order('patient_id_number', { ascending: true })
      .order('appointment_date', { ascending: true });

    if (apptError) throw apptError;

    console.log(`✅ พบนัดทั้งหมด ${allAppointments.length} รายการ\n`);

    // 3. จัดกลุ่มตามผู้ป่วยและวัคซีน
    const patientVaccineMap = new Map();

    for (const appt of allAppointments) {
      const patientKey = appt.patient_id_number || appt.line_user_id;
      const key = `${patientKey}-${appt.vaccine_type}`;

      if (!patientVaccineMap.has(key)) {
        patientVaccineMap.set(key, []);
      }
      patientVaccineMap.get(key).push(appt);
    }

    console.log(`👥 พบผู้ป่วย ${patientVaccineMap.size} คน (แยกตามวัคซีน)\n`);

    // 4. คำนวณวันนัดใหม่
    const appointmentsToUpdate = [];
    let totalToUpdate = 0;

    for (const [key, appointments] of patientVaccineMap.entries()) {
      const [patientId, vaccineType] = key.split('-');
      
      // หาวัคซีน schedule
      const schedule = vaccineSchedules.find(vs => 
        vs.vaccine_type.toLowerCase() === vaccineType.toLowerCase()
      );

      if (!schedule) continue;

      const intervals = Array.isArray(schedule.dose_intervals)
        ? schedule.dose_intervals
        : JSON.parse(schedule.dose_intervals?.toString() || '[]');

      // หาเข็มแรก
      const firstDoseAppt = appointments.reduce((earliest, current) => 
        new Date(current.appointment_date) < new Date(earliest.appointment_date) ? current : earliest
      );

      const firstDoseDate = new Date(firstDoseAppt.appointment_date);

      // คำนวณวันนัดใหม่สำหรับแต่ละเข็ม
      for (let i = 0; i < appointments.length; i++) {
        const appt = appointments[i];
        const doseNumber = i + 1;
        const intervalDays = i === 0 ? 0 : (intervals[i - 1] || 0);

        // คำนวณวันนัดใหม่
        const newDate = new Date(firstDoseDate.getTime());
        newDate.setDate(firstDoseDate.getDate() + intervalDays);
        const newDateStr = newDate.toISOString().split('T')[0];

        // ตรวจสอบว่าต้องอัพเดตหรือไม่
        if (appt.appointment_date !== newDateStr) {
          appointmentsToUpdate.push({
            id: appt.id,
            patient_name: appt.patient_name,
            vaccine_type: vaccineType,
            dose_number: doseNumber,
            old_date: appt.appointment_date,
            new_date: newDateStr
          });
          totalToUpdate++;
        }
      }
    }

    console.log(`📋 พบนัดที่ต้องอัพเดต: ${totalToUpdate} รายการ\n`);

    if (totalToUpdate === 0) {
      console.log('✅ วันนัดทั้งหมดถูกต้องแล้ว ไม่ต้องอัพเดต\n');
      rl.close();
      return;
    }

    // 5. แสดงรายการที่จะอัพเดต
    console.log('📝 รายการที่จะอัพเดต:\n');
    appointmentsToUpdate.slice(0, 10).forEach((appt, index) => {
      console.log(`${index + 1}. ${appt.patient_name} - ${appt.vaccine_type} โดสที่ ${appt.dose_number}`);
      console.log(`   จาก: ${appt.old_date} → เป็น: ${appt.new_date}`);
    });

    if (appointmentsToUpdate.length > 10) {
      console.log(`\n... และอีก ${appointmentsToUpdate.length - 10} รายการ\n`);
    } else {
      console.log('');
    }

    // 6. ขอยืนยัน
    const answer = await question('คุณต้องการอัพเดตนัดเหล่านี้หรือไม่? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ ยกเลิกการอัพเดต');
      rl.close();
      return;
    }

    console.log('\n🔧 เริ่มอัพเดตนัด...\n');

    let successCount = 0;
    let failCount = 0;

    for (const appt of appointmentsToUpdate) {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ 
            appointment_date: appt.new_date,
            notes: `[อัพเดตอัตโนมัติ] คำนวณจากเข็มแรก + ระยะห่าง (เดิม: ${appt.old_date})`
          })
          .eq('id', appt.id);

        if (error) throw error;

        console.log(`✅ ${appt.patient_name} - โดสที่ ${appt.dose_number}: ${appt.old_date} → ${appt.new_date}`);
        successCount++;
      } catch (error) {
        console.log(`❌ ไม่สามารถอัพเดต: ${appt.patient_name} - โดสที่ ${appt.dose_number}`);
        console.log(`   Error: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n');
    console.log('='.repeat(100));
    console.log('\n📊 สรุปผลการอัพเดต\n');
    console.log(`✅ อัพเดตสำเร็จ: ${successCount} รายการ`);
    console.log(`❌ อัพเดตไม่สำเร็จ: ${failCount} รายการ`);
    console.log(`📊 ทั้งหมด: ${appointmentsToUpdate.length} รายการ`);
    console.log('\n✅ เสร็จสิ้น\n');

    rl.close();
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    rl.close();
    process.exit(1);
  }
}

// เรียกใช้งาน
recalculateAppointments();
