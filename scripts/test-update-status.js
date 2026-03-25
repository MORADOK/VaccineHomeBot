import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdateStatus() {
  try {
    console.log('🧪 ทดสอบการอัพเดตสถานะ...\n');

    // ดึงข้อมูลนัดหมาย 1 รายการ
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);

    if (fetchError) throw fetchError;

    if (!appointments || appointments.length === 0) {
      console.log('⚠️  ไม่มีข้อมูลนัดหมาย');
      return;
    }

    const appointment = appointments[0];
    console.log('📋 นัดหมายที่พบ:');
    console.log(`  ID: ${appointment.id}`);
    console.log(`  Appointment ID: ${appointment.appointment_id}`);
    console.log(`  Patient: ${appointment.patient_name}`);
    console.log(`  Status: ${appointment.status}\n`);

    // ทดสอบการอัพเดตสถานะ
    console.log('🔄 กำลังอัพเดตสถานะเป็น "completed"...\n');

    const { data: updateData, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment.id)
      .select();

    if (updateError) {
      console.error('❌ Error:', updateError);
      console.error('   Message:', updateError.message);
      console.error('   Details:', updateError.details);
      console.error('   Hint:', updateError.hint);
      return;
    }

    console.log('✅ อัพเดตสำเร็จ!');
    console.log('📊 ข้อมูลหลังอัพเดต:');
    console.log(JSON.stringify(updateData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUpdateStatus();
