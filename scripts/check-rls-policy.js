import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SERVICE_ROLE_KEY ไม่พบ');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicy() {
  try {
    console.log('🔍 ตรวจสอบ RLS Policy ของตาราง appointments...\n');

    // ใช้ SQL query เพื่อดึง RLS policies
    const { data, error } = await supabase.rpc('get_policies', {
      table_name: 'appointments'
    }).catch(() => {
      console.log('⚠️  RPC function ไม่พบ ลองใช้ SQL query แทน...\n');
      return { data: null, error: 'RPC not found' };
    });

    if (data) {
      console.log('📋 RLS Policies:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('ℹ️  ไม่สามารถดึง RLS policies ผ่าน RPC');
      console.log('💡 ให้ตรวจสอบใน Supabase Dashboard:');
      console.log('   1. ไปที่ Authentication → Policies');
      console.log('   2. เลือกตาราง "appointments"');
      console.log('   3. ดูว่ามี policy ไหนใช้ alias "pr" ที่ไม่ถูกต้อง\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRLSPolicy();
