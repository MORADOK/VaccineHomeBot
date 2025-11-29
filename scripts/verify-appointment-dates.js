/**
 * สคริปต์ตรวจสอบความถูกต้องของวันนัดในฐานข้อมูล
 * ตรวจสอบว่าวันนัดคำนวณจากเข็มแรก + ระยะห่างสะสมถูกต้องหรือไม่
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 เริ่มตรวจสอบความถูกต้องของวันนัดในฐานข้อมูล...\n');

async function verifyAppointmentDates() {
  try {
    // 1. ดึงข้อมูล vaccine schedules
    const { data: vaccineSchedules, error: schedError } = await supabase
      .from('vaccine_schedules')
      .select('*')
      .eq('active', true);

    if (schedError) throw schedError;

    console.log(`📊 พบวัคซีน ${vaccineSchedules.length} ประเภท\n`);

    // 2. ดึงข้อมูลนัดทั้งหมด
    const { data: allAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('*')
      .order('patient_id_number', { ascending: true })
      .order('appointment_date', { ascending: true });

    if (apptError) throw apptError;

    console.log(`📅 พบนัดทั้งหมด ${allAppointments.length} รายการ\n`);

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
    console.log('='.repeat(100));
    console.log('\n');

    // 4. ตรวจสอบแต่ละผู้ป่วย
    let totalChecked = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    const incorrectAppointments = [];

    for (const [key, appointments] of patientVaccineMap.entries()) {
      const [patientId, vaccineType] = key.split('-');
      const completedAppointments = appointments.filter(a => a.status === 'completed');
      const scheduledAppointments = appointments.filter(a => ['scheduled', 'pending'].includes(a.status));

      if (completedAppointments.length === 0) continue; // ข้ามถ้ายังไม่มีการฉีดเลย

      // หา vaccine schedule
      const schedule = vaccineSchedules.find(vs => 
        vs.vaccine_type.toLowerCase() === vaccineType.toLowerCase()
      );

      if (!schedule) {
        console.log(`⚠️  ไม่พบข้อมูลวัคซีน: ${vaccineType}`);
        continue;
      }

      const intervals = Array.isArray(schedule.dose_intervals)
        ? schedule.dose_intervals
        : JSON.parse(schedule.dose_intervals?.toString() || '[]');

      // หาวันที่ฉีดเข็มแรก
      const firstDose = completedAppointments.reduce((earliest, current) => 
        new Date(current.appointment_date) < new Date(earliest.appointment_date) ? current : earliest
      );

      const firstDoseDate = new Date(firstDose.appointment_date);

      console.log(`\n👤 ผู้ป่วย: ${firstDose.patient_name || patientId}`);
      console.log(`💉 วัคซีน: ${schedule.vaccine_name} (${vaccineType})`);
      console.log(`📅 เข็มแรก: ${firstDoseDate.toISOString().split('T')[0]}`);
      console.log(`✅ ฉีดแล้ว: ${completedAppointments.length}/${schedule.total_doses} เข็ม`);
      console.log(`📆 นัดที่มี: ${scheduledAppointments.length} นัด`);
      console.log('');

      // ตรวจสอบแต่ละโดส
      let cumulativeDays = 0;

      for (let i = 0; i < schedule.total_doses; i++) {
        const doseNumber = i + 1;
        const intervalDays = i === 0 ? 0 : (intervals[i - 1] || 0);

        if (i > 0) {
          cumulativeDays += intervalDays;
        }

        // คำนวณวันที่ที่ควรจะเป็น
        const expectedDate = new Date(firstDoseDate);
        expectedDate.setDate(expectedDate.getDate() + cumulativeDays);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];

        // หานัดจริงสำหรับโดสนี้
        const actualAppointment = appointments.find((a, idx) => {
          // หาโดยลำดับ (โดสที่ 1 = นัดแรก, โดสที่ 2 = นัดที่สอง, ...)
          const sortedAppointments = [...appointments].sort((x, y) => 
            new Date(x.appointment_date).getTime() - new Date(y.appointment_date).getTime()
          );
          return sortedAppointments[i]?.id === a.id;
        });

        if (actualAppointment) {
          totalChecked++;
          const actualDateStr = actualAppointment.appointment_date;
          const isCorrect = actualDateStr === expectedDateStr;

          if (isCorrect) {
            totalCorrect++;
            console.log(`  ✅ โดสที่ ${doseNumber}: ${actualDateStr} (ถูกต้อง) [${actualAppointment.status}]`);
          } else {
            totalIncorrect++;
            const daysDiff = Math.round((new Date(actualDateStr) - expectedDate) / (1000 * 60 * 60 * 24));
            console.log(`  ❌ โดสที่ ${doseNumber}: ${actualDateStr} (ควรเป็น ${expectedDateStr}) [ต่าง ${daysDiff} วัน] [${actualAppointment.status}]`);
            
            incorrectAppointments.push({
              patient_name: actualAppointment.patient_name,
              patient_id: patientId,
              vaccine_type: vaccineType,
              dose_number: doseNumber,
              actual_date: actualDateStr,
              expected_date: expectedDateStr,
              difference_days: daysDiff,
              status: actualAppointment.status,
              appointment_id: actualAppointment.id
            });
          }
        } else if (i < completedAppointments.length + scheduledAppointments.length) {
          console.log(`  ⏳ โดสที่ ${doseNumber}: ควรเป็น ${expectedDateStr} (ยังไม่มีนัด)`);
        }
      }
    }

    // 5. สรุปผลการตรวจสอบ
    console.log('\n');
    console.log('='.repeat(100));
    console.log('\n📊 สรุปผลการตรวจสอบ\n');
    console.log(`✅ นัดที่ถูกต้อง: ${totalCorrect} รายการ (${((totalCorrect/totalChecked)*100).toFixed(1)}%)`);
    console.log(`❌ นัดที่ไม่ถูกต้อง: ${totalIncorrect} รายการ (${((totalIncorrect/totalChecked)*100).toFixed(1)}%)`);
    console.log(`📊 ตรวจสอบทั้งหมด: ${totalChecked} รายการ`);

    // 6. แสดงรายการนัดที่ไม่ถูกต้อง
    if (incorrectAppointments.length > 0) {
      console.log('\n');
      console.log('='.repeat(100));
      console.log('\n❌ รายการนัดที่ไม่ถูกต้อง:\n');
      
      incorrectAppointments.forEach((appt, index) => {
        console.log(`${index + 1}. ${appt.patient_name} (${appt.patient_id})`);
        console.log(`   วัคซีน: ${appt.vaccine_type} - โดสที่ ${appt.dose_number}`);
        console.log(`   วันที่จริง: ${appt.actual_date}`);
        console.log(`   วันที่ควรเป็น: ${appt.expected_date}`);
        console.log(`   ต่างกัน: ${appt.difference_days} วัน`);
        console.log(`   สถานะ: ${appt.status}`);
        console.log(`   ID: ${appt.appointment_id}`);
        console.log('');
      });

      // 7. สร้างไฟล์รายงาน
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          total_checked: totalChecked,
          total_correct: totalCorrect,
          total_incorrect: totalIncorrect,
          accuracy_percentage: ((totalCorrect/totalChecked)*100).toFixed(1)
        },
        incorrect_appointments: incorrectAppointments
      };

      const fs = await import('fs');
      const reportPath = 'appointment-verification-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 บันทึกรายงานไว้ที่: ${reportPath}`);
    }

    console.log('\n✅ ตรวจสอบเสร็จสิ้น\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

// เรียกใช้งาน
verifyAppointmentDates();
