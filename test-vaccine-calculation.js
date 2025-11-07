/**
 * Test Script for Vaccine Calculation System
 * 
 * This script tests the vaccine calculation logic to ensure
 * it correctly calculates next dose dates based on vaccine_schedules
 */

// Test data from vaccine_schedules_rows (1).csv
const vaccineSchedules = [
  {
    vaccine_name: 'วัคซีนพิษสุนัขบ้า',
    vaccine_type: 'rabies',
    total_doses: 5,
    dose_intervals: [3, 4, 7, 14]
  },
  {
    vaccine_name: 'วัคซีนไข้หวัดใหญ่',
    vaccine_type: 'flu',
    total_doses: 2,
    dose_intervals: [365]
  },
  {
    vaccine_name: 'วัคซีนป้องกันบาดทะยัก',
    vaccine_type: 'tetanus',
    total_doses: 3,
    dose_intervals: [28, 168]
  },
  {
    vaccine_name: 'วัคซีนงูสวัด',
    vaccine_type: 'shingles',
    total_doses: 2,
    dose_intervals: [84]
  },
  {
    vaccine_name: 'วัคซีนปอดอักเสบ',
    vaccine_type: 'pneumonia',
    total_doses: 2,
    dose_intervals: [56]
  },
  {
    vaccine_name: 'วัคซีนไวรัสตับอักเสบบี',
    vaccine_type: 'hep_b',
    total_doses: 3,
    dose_intervals: [28, 140]
  },
  {
    vaccine_name: 'วัคซีนป้องกันมะเร็งปากมดลูก',
    vaccine_type: 'hpv',
    total_doses: 3,
    dose_intervals: [28, 140]
  },
  {
    vaccine_name: 'วัคซีนอีสุกอีใส',
    vaccine_type: 'chickenpox',
    total_doses: 2,
    dose_intervals: [28]
  }
];

/**
 * Calculate next dose date using the correct algorithm
 * @param {string} firstDoseDate - Date of first dose (YYYY-MM-DD)
 * @param {number[]} intervals - Array of intervals between doses
 * @param {number} currentDose - Current dose number (0-indexed)
 * @returns {string} Next dose date (YYYY-MM-DD)
 */
function calculateNextDoseDate(firstDoseDate, intervals, currentDose) {
  const baseDate = new Date(firstDoseDate);
  
  // Calculate cumulative days from first dose
  let totalDays = 0;
  for (let i = 0; i < currentDose; i++) {
    totalDays += intervals[i] || 0;
  }
  
  // Add cumulative days to first dose date
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + totalDays);
  
  return nextDate.toISOString().split('T')[0];
}

/**
 * Format date to Thai format
 */
function formatThaiDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Run tests for all vaccines
 */
function runTests() {
  console.log('🧪 เริ่มทดสอบระบบการคำนวณวัคซีน\n');
  console.log('=' .repeat(80));
  
  const firstDoseDate = '2024-01-01'; // วันที่ฉีดเข็มแรก
  
  vaccineSchedules.forEach((vaccine, index) => {
    console.log(`\n${index + 1}. ${vaccine.vaccine_name} (${vaccine.vaccine_type})`);
    console.log('-'.repeat(80));
    console.log(`   จำนวนเข็มทั้งหมด: ${vaccine.total_doses} เข็ม`);
    console.log(`   ระยะห่างระหว่างเข็ม: [${vaccine.dose_intervals.join(', ')}] วัน`);
    console.log('');
    
    // Calculate all doses
    console.log(`   เข็มที่ 1: ${formatThaiDate(firstDoseDate)} (${firstDoseDate}) [เข็มแรก]`);
    
    for (let dose = 1; dose < vaccine.total_doses; dose++) {
      const nextDate = calculateNextDoseDate(firstDoseDate, vaccine.dose_intervals, dose);
      
      // Calculate cumulative days
      let cumulativeDays = 0;
      for (let i = 0; i < dose; i++) {
        cumulativeDays += vaccine.dose_intervals[i] || 0;
      }
      
      console.log(`   เข็มที่ ${dose + 1}: ${formatThaiDate(nextDate)} (${nextDate}) [+${cumulativeDays} วันจากเข็มแรก]`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ ทดสอบเสร็จสิ้น\n');
}

/**
 * Test specific scenario
 */
function testScenario(vaccineName, firstDoseDate, currentDoseNumber) {
  const vaccine = vaccineSchedules.find(v => v.vaccine_name === vaccineName);
  if (!vaccine) {
    console.error(`❌ ไม่พบวัคซีน: ${vaccineName}`);
    return;
  }
  
  console.log(`\n🎯 ทดสอบสถานการณ์: ${vaccine.vaccine_name}`);
  console.log(`   - วันที่ฉีดเข็มแรก: ${firstDoseDate}`);
  console.log(`   - ฉีดไปแล้ว: ${currentDoseNumber} เข็ม`);
  console.log(`   - ต้องการคำนวณเข็มที่: ${currentDoseNumber + 1}`);
  
  const nextDate = calculateNextDoseDate(firstDoseDate, vaccine.dose_intervals, currentDoseNumber);
  
  // Calculate cumulative days
  let cumulativeDays = 0;
  for (let i = 0; i < currentDoseNumber; i++) {
    cumulativeDays += vaccine.dose_intervals[i] || 0;
  }
  
  console.log(`   ✅ วันนัดเข็มถัดไป: ${formatThaiDate(nextDate)} (${nextDate})`);
  console.log(`   📊 รวมระยะห่าง: ${cumulativeDays} วัน`);
}

// Run all tests
runTests();

// Test specific scenarios
console.log('\n📋 ทดสอบสถานการณ์เฉพาะ:');
console.log('='.repeat(80));

testScenario('วัคซีนพิษสุนัขบ้า', '2024-01-01', 1); // ฉีดเข็มที่ 1 แล้ว ต้องการนัดเข็มที่ 2
testScenario('วัคซีนพิษสุนัขบ้า', '2024-01-01', 2); // ฉีดเข็มที่ 2 แล้ว ต้องการนัดเข็มที่ 3
testScenario('วัคซีนป้องกันมะเร็งปากมดลูก', '2024-01-01', 1); // HPV เข็มที่ 2
testScenario('วัคซีนป้องกันมะเร็งปากมดลูก', '2024-01-01', 2); // HPV เข็มที่ 3

console.log('\n' + '='.repeat(80));
console.log('🎉 การทดสอบเสร็จสมบูรณ์!\n');
