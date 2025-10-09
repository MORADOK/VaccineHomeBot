// VCHome Hospital Registration Configuration
window.VCHomeConfig = {
  // Supabase Configuration
  supabase: {
    url: 'https://your-supabase-project.supabase.co',
    anonKey: 'your-supabase-anon-key'
  },
  
  // LINE LIFF Configuration
  liff: {
    id: '2007612128-o39NWw7Y'
  },
  
  // Hospital Information
  hospital: {
    name: 'โรงพยาบาลโฮม',
    nameEn: 'VCHome Hospital',
    phone: '02-xxx-xxxx',
    address: 'ที่อยู่โรงพยาบาลโฮม',
    website: 'https://moradok.github.io/VaccineHomeBot/'
  },
  
  // Registration Settings
  registration: {
    source: 'line_liff',
    autoGenerateId: true,
    requireConsent: true,
    phoneValidation: {
      pattern: /^0[689][0-9]{8}$/,
      message: 'กรุณาใช้เบอร์มือถือไทย (08x, 09x, 06x)'
    }
  },
  
  // Notification Settings
  notifications: {
    enableLineNotification: true,
    successMessage: 'ลงทะเบียนสำเร็จ เจ้าหน้าที่จะติดต่อกลับเพื่อนัดหมายภายใน 24 ชม.',
    duplicateMessage: 'เบอร์โทรศัพท์นี้ได้ลงทะเบียนแล้ว หากต้องการแก้ไขข้อมูล กรุณาติดต่อเจ้าหน้าที่'
  },
  
  // API Endpoints
  endpoints: {
    registration: '/functions/v1/patient-registration',
    patientLookup: '/rest/v1/patient_registrations',
    lineNotification: '/functions/v1/send-line-message'
  },
  
  // Feature Flags
  features: {
    enableDuplicateCheck: true,
    enableLineIntegration: true,
    enableAutoNotification: true,
    enableDataValidation: true
  }
};

// Helper Functions
window.VCHomeHelpers = {
  // Phone number utilities
  normalizePhone: (phone) => {
    const digits = String(phone || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('66')) return '0' + digits.slice(2);
    return digits;
  },
  
  formatPhone: (phone) => {
    const normalized = window.VCHomeHelpers.normalizePhone(phone);
    return /^0[689][0-9]{8}$/.test(normalized)
      ? normalized.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')
      : phone;
  },
  
  validatePhone: (phone) => {
    const normalized = window.VCHomeHelpers.normalizePhone(phone);
    return window.VCHomeConfig.registration.phoneValidation.pattern.test(normalized);
  },
  
  // Registration ID generator
  generateRegistrationId: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `REG-${timestamp}-${random}`;
  },
  
  // Date utilities
  formatThaiDate: (date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },
  
  // Supabase client initialization
  initSupabase: () => {
    const config = window.VCHomeConfig.supabase;
    return window.supabase.createClient(config.url, config.anonKey);
  }
};

// Enhanced CONFIG for new services
window.CONFIG = {
  // Supabase Configuration
  SUPABASE: {
    URL: window.VCHomeConfig.supabase.url,
    ANON_KEY: window.VCHomeConfig.supabase.anonKey
  },
  
  // LINE LIFF Configuration
  LIFF: {
    ID: window.VCHomeConfig.liff.id
  },
  
  // Hospital Information
  HOSPITAL: {
    NAME: window.VCHomeConfig.hospital.name,
    PHONE: window.VCHomeConfig.hospital.phone,
    ADDRESS: window.VCHomeConfig.hospital.address
  },
  
  // Features
  FEATURES: {
    LINE_NOTIFICATION: window.VCHomeConfig.features.enableLineIntegration,
    DUPLICATE_CHECK: window.VCHomeConfig.features.enableDuplicateCheck,
    AUTO_UPDATE: true
  },
  
  // Messages
  MESSAGES: {
    SUCCESS: {
      REGISTRATION: '🏥 ลงทะเบียนโรงพยาบาลโฮมสำเร็จ!',
      UPDATE: '✅ อัพเดทข้อมูลสำเร็จ!'
    },
    ERROR: {
      NETWORK: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
      VALIDATION: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      DUPLICATE: 'หมายเลขโทรศัพท์นี้ได้ลงทะเบียนแล้ว'
    }
  }
};

// Configuration Validator
window.ConfigValidator = {
  validate() {
    const issues = [];
    
    // ตรวจสอบ Supabase config
    if (!window.CONFIG?.SUPABASE?.URL || window.CONFIG.SUPABASE.URL.includes('your-project')) {
      issues.push('Supabase URL ยังไม่ได้ตั้งค่า - กรุณาอัพเดทใน config.js');
    }
    
    if (!window.CONFIG?.SUPABASE?.ANON_KEY || window.CONFIG.SUPABASE.ANON_KEY.includes('your-anon-key')) {
      issues.push('Supabase Anon Key ยังไม่ได้ตั้งค่า - กรุณาอัพเดทใน config.js');
    }
    
    // ตรวจสอบ LIFF config
    if (!window.CONFIG?.LIFF?.ID) {
      issues.push('LIFF ID ยังไม่ได้ตั้งค่า - กรุณาอัพเดทใน config.js');
    }
    
    // ตรวจสอบ Hospital info
    if (!window.CONFIG?.HOSPITAL?.NAME) {
      issues.push('ข้อมูลโรงพยาบาลไม่ครบถ้วน');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues,
      summary: issues.length === 0 ? 
        '✅ Configuration ถูกต้องครบถ้วน' : 
        `❌ พบปัญหา ${issues.length} รายการ`
    };
  },
  
  // ตรวจสอบการเชื่อมต่อ
  async testConnections() {
    const results = {
      supabase: { status: 'unknown', message: '' },
      liff: { status: 'unknown', message: '' }
    };
    
    // ทดสอบ Supabase
    try {
      if (window.CONFIG?.SUPABASE?.URL && !window.CONFIG.SUPABASE.URL.includes('your-project')) {
        const response = await fetch(`${window.CONFIG.SUPABASE.URL}/rest/v1/`, {
          headers: {
            'apikey': window.CONFIG.SUPABASE.ANON_KEY
          }
        });
        
        results.supabase.status = response.ok ? 'success' : 'error';
        results.supabase.message = response.ok ? 
          'เชื่อมต่อ Supabase สำเร็จ' : 
          `HTTP ${response.status}: ${response.statusText}`;
      } else {
        results.supabase.status = 'warning';
        results.supabase.message = 'Supabase URL ยังไม่ได้ตั้งค่า';
      }
    } catch (error) {
      results.supabase.status = 'error';
      results.supabase.message = `เชื่อมต่อ Supabase ไม่สำเร็จ: ${error.message}`;
    }
    
    // ทดสอบ LIFF
    try {
      if (typeof liff !== 'undefined') {
        results.liff.status = 'success';
        results.liff.message = 'LIFF SDK โหลดสำเร็จ';
      } else {
        results.liff.status = 'warning';
        results.liff.message = 'LIFF SDK ไม่พร้อมใช้งาน';
      }
    } catch (error) {
      results.liff.status = 'error';
      results.liff.message = `LIFF Error: ${error.message}`;
    }
    
    return results;
  }
};