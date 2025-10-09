// Enhanced Supabase Client for VCHome Hospital Patient Registration
class SupabaseClient {
  constructor() {
    // ใช้ configuration จาก config.js หรือ environment variables
    this.supabaseUrl = window.CONFIG?.SUPABASE?.URL || 'https://your-project.supabase.co';
    this.supabaseKey = window.CONFIG?.SUPABASE?.ANON_KEY || 'your-anon-key';
    this.apiUrl = `${this.supabaseUrl}/rest/v1`;
    this.functionsUrl = `${this.supabaseUrl}/functions/v1`;
    
    console.log('🏥 Supabase Client initialized:', {
      url: this.supabaseUrl,
      hasKey: !!this.supabaseKey,
      timestamp: new Date().toISOString()
    });
  }

  // สร้างผู้ป่วยใหม่
  async createPatient(patientData) {
    try {
      console.log('📝 Creating patient:', patientData);
      
      // สร้าง registration ID แบบเดียวกับระบบหลัก
      const registrationId = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const payload = {
        registration_id: registrationId,
        full_name: patientData.patientName,
        phone: patientData.phoneNumber,
        hospital: window.CONFIG?.HOSPITAL?.NAME || 'โรงพยาบาลโฮม',
        source: 'line_liff',
        line_user_id: patientData.lineUserId,
        registration_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const response = await fetch(`${this.apiUrl}/patient_registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Supabase error:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Patient created successfully:', result);
      
      return {
        success: true,
        data: result[0] || result,
        registrationId: registrationId
      };
    } catch (error) {
      console.error('❌ Error creating patient:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ตรวจสอบผู้ป่วยที่มีอยู่แล้ว
  async checkExistingPatient(phoneNumber, lineUserId) {
    try {
      console.log('🔍 Checking existing patient:', { phoneNumber, lineUserId });
      
      let query = `${this.apiUrl}/patient_registrations?`;
      
      if (phoneNumber) {
        query += `phone=eq.${encodeURIComponent(phoneNumber)}&`;
      }
      if (lineUserId) {
        query += `line_user_id=eq.${encodeURIComponent(lineUserId)}&`;
      }
      
      query = query.slice(0, -1); // ลบ & ตัวสุดท้าย

      const response = await fetch(query, {
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Existing patient check result:', result);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('❌ Error checking existing patient:', error);
      return null;
    }
  }

  // อัพเดทข้อมูลผู้ป่วย
  async updatePatient(registrationId, updates) {
    try {
      console.log('📝 Updating patient:', { registrationId, updates });
      
      const payload = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(`${this.apiUrl}/patient_registrations?registration_id=eq.${registrationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Patient updated successfully:', result);
      
      return {
        success: true,
        data: result[0] || result
      };
    } catch (error) {
      console.error('❌ Error updating patient:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ส่ง LINE notification ผ่าน Supabase Edge Function
  async sendLineNotification(lineUserId, message) {
    try {
      console.log('📱 Sending LINE notification:', { lineUserId, message });
      
      const response = await fetch(`${this.functionsUrl}/send-line-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`
        },
        body: JSON.stringify({
          userId: lineUserId,
          message: message
        })
      });

      const result = response.ok;
      console.log(result ? '✅ LINE notification sent' : '❌ LINE notification failed');
      
      return result;
    } catch (error) {
      console.error('❌ Error sending LINE notification:', error);
      return false;
    }
  }

  // บันทึก log การใช้งาน
  async logActivity(activity) {
    try {
      const logData = {
        activity_type: activity.type,
        user_id: activity.userId,
        details: activity.details,
        timestamp: new Date().toISOString(),
        source: 'line_liff'
      };

      await fetch(`${this.apiUrl}/activity_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        },
        body: JSON.stringify(logData)
      });

      console.log('📊 Activity logged:', logData);
    } catch (error) {
      console.error('❌ Error logging activity:', error);
    }
  }

  // ตรวจสอบสถานะการเชื่อมต่อ
  async healthCheck() {
    try {
      const response = await fetch(`${this.apiUrl}/patient_registrations?limit=1`, {
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        }
      });

      return {
        status: response.ok ? 'healthy' : 'error',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export for use
window.SupabaseClient = SupabaseClient;