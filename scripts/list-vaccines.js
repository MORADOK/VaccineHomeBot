/**
 * สคริปต์แสดงรายชื่อวัคซีนทั้งหมดในระบบ
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please make sure .env file exists with:');
  console.error('  VITE_SUPABASE_URL=your_url');
  console.error('  VITE_SUPABASE_ANON_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 กำลังดึงรายชื่อวัคซีนจากฐานข้อมูล...\n');

async function listVaccines() {
  try {
    const { data: vaccines, error } = await supabase
      .from('vaccine_schedules')
      .select('*')
      .order('vaccine_name');

    if (error) throw error;

    if (!vaccines || vaccines.length === 0) {
      console.log('❌ ไม่พบวัคซีนในระบบ\n');
      return;
    }

    console.log(`📊 พบวัคซีนทั้งหมด ${vaccines.length} ประเภท\n`);
    console.log('='.repeat(120));
    console.log('\n');

    vaccines.forEach((vaccine, index) => {
      const intervals = Array.isArray(vaccine.dose_intervals)
        ? vaccine.dose_intervals
        : JSON.parse(vaccine.dose_intervals?.toString() || '[]');

      console.log(`${index + 1}. ${vaccine.vaccine_name}`);
      console.log(`   รหัส: ${vaccine.vaccine_type}`);
      console.log(`   จำนวนเข็ม: ${vaccine.total_doses} เข็ม`);
      console.log(`   ระยะห่าง: ${JSON.stringify(intervals)} วัน`);
      console.log(`   สถานะ: ${vaccine.active ? '✅ ใช้งาน' : '❌ ปิดใช้งาน'}`);
      
      // แสดงตารางนัด
      if (intervals.length > 0) {
        console.log(`   ตารางนัด:`);
        console.log(`     - เข็มที่ 1: วันที่ 0 (ฐาน)`);
        
        let cumulative = 0;
        for (let i = 0; i < intervals.length; i++) {
          cumulative += intervals[i];
          console.log(`     - เข็มที่ ${i + 2}: วันที่ ${cumulative} (+${intervals[i]} วัน)`);
        }
      }
      
      console.log(`   สร้างเมื่อ: ${new Date(vaccine.created_at).toLocaleString('th-TH')}`);
      console.log(`   อัพเดตล่าสุด: ${new Date(vaccine.updated_at).toLocaleString('th-TH')}`);
      console.log('');
    });

    console.log('='.repeat(120));
    console.log('\n');

    // สรุป
    const activeCount = vaccines.filter(v => v.active).length;
    const inactiveCount = vaccines.filter(v => !v.active).length;

    console.log('📈 สรุป:');
    console.log(`   - วัคซีนทั้งหมด: ${vaccines.length} ประเภท`);
    console.log(`   - ใช้งาน: ${activeCount} ประเภท`);
    console.log(`   - ปิดใช้งาน: ${inactiveCount} ประเภท`);
    console.log('\n');

    // สร้างตาราง
    console.log('📋 ตารางสรุป:\n');
    console.table(vaccines.map(v => ({
      'ชื่อวัคซีน': v.vaccine_name,
      'รหัส': v.vaccine_type,
      'จำนวนเข็ม': v.total_doses,
      'ระยะห่าง': JSON.stringify(v.dose_intervals),
      'สถานะ': v.active ? 'ใช้งาน' : 'ปิดใช้งาน'
    })));

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

// เรียกใช้งาน
listVaccines();
