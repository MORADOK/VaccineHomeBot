# 🏥 VCHome Hospital - Patient Registration System

## 📋 **Overview**
ระบบลงทะเบียนผู้ป่วยสำหรับวัคซีน ที่เชื่อมต่อกับ LINE LIFF และ VCHome Hospital Management System

---

## 🔧 **Configuration**

### **1. Supabase Setup:**
```javascript
// แก้ไขใน config.js
const SUPABASE_URL = 'https://your-supabase-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```

### **2. LINE LIFF Setup:**
```javascript
// แก้ไขใน config.js
const LIFF_ID = 'your-liff-id';
```

---

## 🚀 **Integration with VCHome Hospital**

### **Backend Integration:**
1. **Supabase Edge Function**: `/functions/v1/patient-registration`
2. **Direct Database**: Fallback to direct Supabase insert
3. **LINE Notifications**: Auto-send confirmation via LINE

### **Database Schema:**
```sql
-- Uses existing patient_registrations table
INSERT INTO patient_registrations (
  registration_id,
  full_name,
  phone,
  hospital,
  source,
  line_user_id
) VALUES (
  'REG-1234567890-ABCDE',
  'ชื่อผู้ป่วย',
  '0812345678',
  'โรงพยาบาลโฮม',
  'line_liff',
  'LINE_USER_ID'
);
```

---

## 📱 **Features**

### **✅ Current Features:**
- **LINE LIFF Integration** - เชื่อมต่อกับ LINE
- **Phone Validation** - ตรวจสอบเบอร์มือถือไทย
- **Duplicate Check** - ตรวจสอบการลงทะเบียนซ้ำ
- **Auto Registration ID** - สร้างรหัสอัตโนมัติ
- **Success Notification** - แจ้งเตือนผ่าน LINE
- **Responsive Design** - รองรับมือถือ

### **🔄 Data Flow:**
```
LINE LIFF → Registration Form → Supabase → VCHome Hospital → Staff Portal
```

---

## 🛠️ **Installation**

### **1. Copy Files:**
```bash
# Copy to VCHome Hospital project
cp -r RegispatientHome/ public/registration/
```

### **2. Update Configuration:**
```javascript
// Edit RegispatientHome/config.js
const SUPABASE_URL = 'your-actual-supabase-url';
const SUPABASE_ANON_KEY = 'your-actual-anon-key';
```

### **3. Deploy Supabase Function:**
```bash
# Deploy edge function
supabase functions deploy patient-registration
```

### **4. Test Integration:**
```bash
# Test locally
npm run dev
# Visit: http://localhost:5173/registration/
```

---

## 🔗 **URLs**

### **Development:**
```
http://localhost:5173/registration/
```

### **Production:**
```
https://moradok.github.io/VaccineHomeBot/registration/
```

### **LINE LIFF:**
```
https://liff.line.me/2007612128-o39NWw7Y
```

---

## 📊 **Data Integration**

### **Patient Data Mapping:**
```javascript
// RegispatientHome → VCHome Hospital
{
  "patientName": "ชื่อผู้ป่วย",      // → full_name
  "phoneNumber": "0812345678",      // → phone
  "lineUserId": "LINE_USER_ID"      // → line_user_id
}
```

### **Registration Flow:**
1. **User fills form** in LINE LIFF
2. **Data validated** client-side
3. **Sent to Supabase** via Edge Function
4. **Stored in database** with auto-generated ID
5. **LINE notification** sent to user
6. **Staff notified** in Staff Portal

---

## 🔐 **Security**

### **Data Protection:**
- ✅ **HTTPS Only** - All communications encrypted
- ✅ **Input Validation** - Client and server-side validation
- ✅ **CORS Protection** - Restricted origins
- ✅ **Rate Limiting** - Prevent spam registrations

### **Privacy Compliance:**
- ✅ **Consent Required** - User must agree to data usage
- ✅ **Data Minimization** - Only collect necessary data
- ✅ **Secure Storage** - Supabase RLS policies
- ✅ **Access Control** - Staff-only access to patient data

---

## 🧪 **Testing**

### **Test Registration:**
```javascript
// Test payload
{
  "action": "register",
  "patientName": "ทดสอบ ระบบ",
  "phoneNumber": "0812345678",
  "lineUserId": "test-line-user-id"
}
```

### **Expected Response:**
```javascript
{
  "success": true,
  "message": "ลงทะเบียนสำเร็จ...",
  "data": {
    "registrationId": "REG-1234567890-ABCDE",
    "patientName": "ทดสอบ ระบบ",
    "phoneNumber": "0812345678"
  }
}
```

---

## 📞 **Support**

### **Integration Issues:**
- Check Supabase connection
- Verify LIFF ID configuration
- Test Edge Function deployment

### **Common Problems:**
1. **CORS Errors**: Add domain to Supabase CORS settings
2. **LIFF Login**: Check LIFF ID and domain whitelist
3. **Database Errors**: Verify RLS policies and permissions

---

**🎉 Ready to integrate with VCHome Hospital Management System!**