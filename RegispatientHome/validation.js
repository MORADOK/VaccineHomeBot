// Data Validation for VCHome Hospital Patient Registration
class ValidationService {
  constructor() {
    this.rules = {
      patientName: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[ก-๙a-zA-Z\s\-\.]+$/
      },
      phoneNumber: {
        required: true,
        pattern: /^0[689]\d{8}$/  // Thai mobile numbers: 08x, 09x, 06x (10 digits)
      }
    };
  }

  // ตรวจสอบชื่อผู้ป่วย
  validatePatientName(name) {
    const errors = [];
    
    if (!name || name.trim() === '') {
      errors.push('กรุณากรอกชื่อ-นามสกุล');
      return { isValid: false, errors };
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length < this.rules.patientName.minLength) {
      errors.push(`ชื่อต้องมีอย่างน้อย ${this.rules.patientName.minLength} ตัวอักษร`);
    }
    
    if (trimmedName.length > this.rules.patientName.maxLength) {
      errors.push(`ชื่อต้องไม่เกิน ${this.rules.patientName.maxLength} ตัวอักษร`);
    }
    
    if (!this.rules.patientName.pattern.test(trimmedName)) {
      errors.push('ชื่อสามารถใช้ได้เฉพาะตัวอักษรไทย อังกฤษ เว้นวรรค เครื่องหมาย - และ . เท่านั้น');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: trimmedName
    };
  }

  // ตรวจสอบหมายเลขโทรศัพท์
  validatePhoneNumber(phone) {
    const errors = [];
    
    if (!phone || phone.trim() === '') {
      errors.push('กรุณากรอกหมายเลขโทรศัพท์');
      return { isValid: false, errors };
    }

    // ทำความสะอาดหมายเลขโทรศัพท์ (เก็บเฉพาะตัวเลข)
    const cleanPhone = phone.replace(/[^\d]/g, '');
    
    // แปลงรูปแบบต่างๆ ให้เป็นมาตรฐาน
    let standardPhone = cleanPhone;
    
    // แปลง +66xxxxxxxxx หรือ 66xxxxxxxxx เป็น 0xxxxxxxxx
    if (cleanPhone.startsWith('66') && cleanPhone.length === 11) {
      standardPhone = '0' + cleanPhone.substring(2);
    } else if (cleanPhone.length === 9 && /^[689]/.test(cleanPhone)) {
      // กรณีที่ใส่แค่ 9 หลัก (ไม่มี 0 ข้างหน้า)
      standardPhone = '0' + cleanPhone;
    }
    
    // ตรวจสอบรูปแบบด้วยข้อความที่เป็นมิตร
    if (!this.rules.phoneNumber.pattern.test(standardPhone)) {
      const errorMessage = this.getPhoneErrorMessage(phone, standardPhone);
      errors.push(errorMessage);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: standardPhone,
      originalInput: phone,
      cleanedInput: cleanPhone
    };
  }

  // สร้าง error message ที่เป็นมิตรสำหรับเบอร์โทรศัพท์
  getPhoneErrorMessage(originalPhone, standardPhone) {
    if (!originalPhone || originalPhone.trim() === '') {
      return 'กรุณากรอกหมายเลขโทรศัพท์';
    }
    
    if (standardPhone.length < 9) {
      return 'เบอร์โทรศัพท์ยังไม่ครบ กรุณากรอกให้ครบ 10 หลัก';
    }
    
    if (standardPhone.length > 10) {
      return 'เบอร์โทรศัพท์ยาวเกินไป กรุณากรอกเพียง 10 หลัก';
    }
    
    if (standardPhone.length !== 10) {
      return 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก';
    }
    
    if (!standardPhone.startsWith('0')) {
      return 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0';
    }
    
    if (standardPhone.startsWith('07')) {
      return 'กรุณาใช้เบอร์มือถือ (08, 09, 06) ไม่ใช่เบอร์บ้าน';
    }
    
    if (!/^0[689]/.test(standardPhone)) {
      return 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 08, 09, หรือ 06';
    }
    
    return 'กรุณาตรวจสอบเบอร์โทรศัพท์ให้ถูกต้อง';
  }

  // ตรวจสอบข้อมูลทั้งหมด
  validateRegistrationData(data) {
    const nameValidation = this.validatePatientName(data.patientName);
    const phoneValidation = this.validatePhoneNumber(data.phoneNumber);
    
    const allErrors = [
      ...nameValidation.errors,
      ...phoneValidation.errors
    ];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedData: {
        patientName: nameValidation.sanitized,
        phoneNumber: phoneValidation.sanitized,
        lineUserId: data.lineUserId
      }
    };
  }

  // ตรวจสอบ LINE User ID
  validateLineUserId(userId) {
    if (!userId || typeof userId !== 'string') {
      return {
        isValid: false,
        errors: ['LINE User ID ไม่ถูกต้อง']
      };
    }

    if (!userId.startsWith('U') || userId.length !== 33) {
      return {
        isValid: false,
        errors: ['รูปแบบ LINE User ID ไม่ถูกต้อง']
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  // สร้างข้อความแสดงข้อผิดพลาด
  formatErrors(errors) {
    if (errors.length === 0) return '';
    
    if (errors.length === 1) {
      return errors[0];
    }
    
    return '• ' + errors.join('\\n• ');
  }

  // ตรวจสอบความปลอดภัยของข้อมูล
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // ลบ HTML/Script characters
      .replace(/\s+/g, ' '); // แปลง multiple spaces เป็น single space
  }

  // ตรวจสอบ Rate Limiting (ป้องกันการส่งข้อมูลซ้ำๆ)
  checkRateLimit(userId) {
    const key = `rate_limit_${userId}`;
    const now = Date.now();
    const lastSubmission = localStorage.getItem(key);
    
    if (lastSubmission) {
      const timeDiff = now - parseInt(lastSubmission);
      const minInterval = 30000; // 30 วินาที
      
      if (timeDiff < minInterval) {
        return {
          allowed: false,
          remainingTime: Math.ceil((minInterval - timeDiff) / 1000)
        };
      }
    }
    
    localStorage.setItem(key, now.toString());
    return { allowed: true };
  }
}

// Export for use
window.ValidationService = ValidationService;