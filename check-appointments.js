/**
 * Script to verify appointment calculations
 * This script checks if the calculated dates match vaccine_schedules
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppointments() {
  console.log('🔍 กำลังตรวจสอบวันนัดในระบบ...\n');

  try {
    // 1. Get all vaccine schedules
    const { data: schedules, error: scheduleError } = await supabase
      .from('vaccine_schedules')
      .select('*')
      .eq('active', true);

    if (scheduleError) throw scheduleError;

    console.log('💉 ตารางวัคซีนในระบบ:');
    schedules.forEach(s => {
      const intervals = Array.isArray(s.dose_intervals) ? s.dose_intervals : JSON.parse(s.dose_intervals);
      console.log(`   - ${s.vaccine_name} (${s.vaccine_type}): ${s.total_doses} เข็ม, ช่วงห่าง: ${intervals.join(', ')} วัน`);
    });
    console.log('');

    // 2. Get all completed appointments
    const { data: completed, error: completedError } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'completed')
      .order('appointment_date', { ascending: true });

    if (completedError) throw completedError;

    console.log(`✅ การฉีดที่เสร็จสิ้น: ${completed.length} รายการ\n`);

    // 3. Get all scheduled appointments
    const { data: scheduled, error: scheduledError } = await supabase
      .from('appointments')
      .select('*')
      .in('status', ['scheduled', 'pending'])
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .order('appointment_date', { ascending: true });

    if (scheduledError) throw scheduledError;

    console.log(`📅 นัดที่มีอยู่: ${scheduled.length} รายการ\n`);

    // 4. Group by patient and vaccine type
    const patientVaccineMap = new Map();

    for (const appt of completed) {
      const patientKey = appt.patient_id_number || appt.line_user_id;
      const key = `${patientKey}-${appt.vaccine_type}`;

      if (!patientVaccineMap.has(key)) {
        const patientDoses = completed.filter(a => {
          const aPatientKey = a.patient_id_number || a.line_user_id;
          return aPatientKey === patientKey && a.vaccine_type === appt.vaccine_type;
        });

        const firstDose = patientDoses.reduce((earliest, current) =>
          new Date(current.appointment_date) < new Date(earliest.appointment_date) ? current : earliest
        );

        const lastDose = patientDoses.reduce((latest, current) =>
          new Date(current.appointment_date) > new Date(latest.appointment_date) ? current : latest
        );

        patientVaccineMap.set(key, {
          patient_name: appt.patient_name,
          patient_id: patientKey,
          vaccine_type: appt.vaccine_type,
          doses_received: patientDoses.length,
          first_dose_date: firstDose.appointment_date,
          last_dose_date: lastDose.appointment_date,
          all_doses: patientDoses.map(d => ({
            date: d.appointment_date,
            notes: d.notes
          })).sort((a, b) => new Date(a.date) - new Date(b.date))
        });
      }
    }

    console.log('=' .repeat(100));
    console.log('📊 การตรวจสอบความถูกต้องของวันนัด');
    console.log('='.repeat(100));
    console.log('');

    // 5. Check each patient
    for (const [key, patient] of patientVaccineMap) {
      const schedule = schedules.find(s => s.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase());

      if (!schedule) {
        console.log(`⚠️  ${patient.patient_name} - ${patient.vaccine_type}: ไม่พบตารางวัคซีนในระบบ`);
        continue;
      }

      console.log(`\n👤 ${patient.patient_name} (ID: ${patient.patient_id})`);
      console.log(`   วัคซีน: ${schedule.vaccine_name} (${patient.vaccine_type})`);
      console.log(`   จำนวนเข็มที่ฉีดแล้ว: ${patient.doses_received}/${schedule.total_doses}`);
      console.log('');

      // Parse intervals
      const intervals = Array.isArray(schedule.dose_intervals) ?
        schedule.dose_intervals :
        JSON.parse(schedule.dose_intervals);

      // Display actual doses
      console.log('   📅 ประวัติการฉีดจริง:');
      patient.all_doses.forEach((dose, index) => {
        const doseDate = new Date(dose.date);
        console.log(`      เข็มที่ ${index + 1}: ${doseDate.toLocaleDateString('th-TH')} (${dose.date})`);
      });
      console.log('');

      // Calculate expected dates from vaccine_schedules
      console.log('   🎯 วันที่คำนวนจาก vaccine_schedules:');
      const firstDoseDate = new Date(patient.first_dose_date);
      console.log(`      เข็มที่ 1: ${firstDoseDate.toLocaleDateString('th-TH')} (${patient.first_dose_date}) [เข็มแรก]`);

      let cumulativeDays = 0;
      for (let i = 0; i < schedule.total_doses - 1; i++) {
        const intervalDays = intervals[i] || 0;
        cumulativeDays += intervalDays;

        const calculatedDate = new Date(firstDoseDate);
        calculatedDate.setDate(calculatedDate.getDate() + cumulativeDays);
        const calculatedDateStr = calculatedDate.toISOString().split('T')[0];

        // Compare with actual dose if exists
        const actualDose = patient.all_doses[i + 1];
        let status = '';
        if (actualDose) {
          const actualDate = actualDose.date;
          if (actualDate === calculatedDateStr) {
            status = '✅ ตรง';
          } else {
            const daysDiff = Math.round((new Date(actualDate) - calculatedDate) / (1000 * 60 * 60 * 24));
            status = `⚠️  ไม่ตรง (จริง: ${actualDate}, ห่าง: ${daysDiff > 0 ? '+' : ''}${daysDiff} วัน)`;
          }
        } else {
          status = '⏰ ยังไม่ฉีด';
        }

        console.log(`      เข็มที่ ${i + 2}: ${calculatedDate.toLocaleDateString('th-TH')} (${calculatedDateStr}) [+${intervalDays} วัน จากเข็มที่ ${i + 1}] ${status}`);
      }

      // Check if completed
      if (patient.doses_received >= schedule.total_doses) {
        console.log(`\n   ✅ ฉีดครบแล้ว (${patient.doses_received}/${schedule.total_doses} เข็ม)`);
      } else {
        // Calculate next dose
        cumulativeDays = 0;
        for (let i = 0; i < patient.doses_received; i++) {
          cumulativeDays += intervals[i] || 0;
        }

        const nextDoseDate = new Date(firstDoseDate);
        nextDoseDate.setDate(nextDoseDate.getDate() + cumulativeDays);
        const nextDoseDateStr = nextDoseDate.toISOString().split('T')[0];

        console.log(`\n   📌 นัดเข็มถัดไป (เข็มที่ ${patient.doses_received + 1}): ${nextDoseDate.toLocaleDateString('th-TH')} (${nextDoseDateStr})`);

        // Check if appointment exists
        const existingAppt = scheduled.find(a => {
          const aPatientKey = a.patient_id_number || a.line_user_id;
          return aPatientKey === patient.patient_id && a.vaccine_type === patient.vaccine_type;
        });

        if (existingAppt) {
          if (existingAppt.appointment_date === nextDoseDateStr) {
            console.log(`   ✅ มีนัดในระบบแล้ว (ตรงกับการคำนวน): ${existingAppt.appointment_date}`);
          } else {
            const daysDiff = Math.round((new Date(existingAppt.appointment_date) - nextDoseDate) / (1000 * 60 * 60 * 24));
            console.log(`   ⚠️  มีนัดในระบบ แต่ไม่ตรงกับการคำนวน:`);
            console.log(`      - นัดในระบบ: ${existingAppt.appointment_date}`);
            console.log(`      - ควรเป็น: ${nextDoseDateStr}`);
            console.log(`      - ห่างกัน: ${daysDiff > 0 ? '+' : ''}${daysDiff} วัน`);
          }
        } else {
          console.log(`   ⚠️  ยังไม่มีนัดในระบบ (ควรสร้างนัดในวันที่ ${nextDoseDateStr})`);
        }
      }

      console.log('   ' + '-'.repeat(96));
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ การตรวจสอบเสร็จสิ้น');
    console.log('='.repeat(100));

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// Run the check
checkAppointments();
