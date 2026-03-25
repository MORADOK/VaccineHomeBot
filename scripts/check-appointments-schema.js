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

async function checkSchema() {
  try {
    console.log('📋 ตรวจสอบ schema ของตาราง appointments...\n');

    // ดึงข้อมูล 1 แถว
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('✅ Columns ที่มีในตาราง appointments:\n');
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col}`);
      });

      console.log('\n📊 ตัวอย่างข้อมูล:\n');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  ตาราง appointments ว่างเปล่า');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
