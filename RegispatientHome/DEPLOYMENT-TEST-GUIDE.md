# 🚀 VCHome Registration System - Deployment & Testing Guide

## 📋 **Quick Start Checklist**

### **✅ Pre-deployment Checklist:**
- [ ] Supabase project created
- [ ] Database tables exist (`patient_registrations`, `activity_logs`)
- [ ] Supabase Edge Functions deployed
- [ ] LINE LIFF app configured
- [ ] Configuration files updated

---

## 🔧 **Configuration Setup**

### **1. Update config.js**
```javascript
// Edit RegispatientHome/config.js
window.VCHomeConfig = {
  supabase: {
    url: 'https://YOUR-PROJECT.supabase.co',
    anonKey: 'YOUR-ANON-KEY'
  },
  liff: {
    id: 'YOUR-LIFF-ID'
  }
};
```

### **2. Environment Variables (.env)**
```bash
# Copy .env.example to .env and update:
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR-ANON-KEY
LIFF_ID=YOUR-LIFF-ID
```

---

## 🗄️ **Database Setup**

### **Required Tables:**

#### **patient_registrations**
```sql
CREATE TABLE patient_registrations (
  id SERIAL PRIMARY KEY,
  registration_id VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  hospital VARCHAR(255) DEFAULT 'โรงพยาบาลโฮม',
  source VARCHAR(50) DEFAULT 'line_liff',
  line_user_id VARCHAR(100),
  registration_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_patient_phone ON patient_registrations(phone);
CREATE INDEX idx_patient_line_id ON patient_registrations(line_user_id);
CREATE INDEX idx_patient_registration_id ON patient_registrations(registration_id);
```

#### **activity_logs** (Optional)
```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  activity_type VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'line_liff'
);

CREATE INDEX idx_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_user ON activity_logs(user_id);
```

---

## 🔗 **Supabase Edge Functions**

### **Deploy patient-registration function:**
```bash
# In your Supabase project
supabase functions deploy patient-registration
```

### **Function Code (supabase/functions/patient-registration/index.ts):**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, patientName, phoneNumber, lineUserId } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'register') {
      const registrationId = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      
      const { data, error } = await supabaseClient
        .from('patient_registrations')
        .insert([{
          registration_id: registrationId,
          full_name: patientName,
          phone: phoneNumber,
          hospital: 'โรงพยาบาลโฮม',
          source: 'line_liff',
          line_user_id: lineUserId
        }])
        .select()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'ลงทะเบียนสำเร็จ เจ้าหน้าที่จะติดต่อกลับเพื่อนัดหมายภายใน 24 ชม.',
          data: data[0]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

---

## 📱 **LINE LIFF Setup**

### **1. Create LIFF App:**
1. Go to LINE Developers Console
2. Create new LIFF app
3. Set endpoint URL: `https://your-domain.com/RegispatientHome/`
4. Copy LIFF ID

### **2. Update Configuration:**
```javascript
// In config.js
liff: {
  id: 'YOUR-LIFF-ID-HERE'
}
```

---

## 🧪 **Testing Instructions**

### **1. Local Testing:**
```bash
# Serve files locally
python -m http.server 8000
# or
npx serve .

# Open in browser:
http://localhost:8000/RegispatientHome/
```

### **2. Test Suite:**
```bash
# Open test suite:
http://localhost:8000/RegispatientHome/test.html
```

### **3. Manual Testing Steps:**

#### **Basic Functionality:**
1. ✅ **Load Page**: Page loads without errors
2. ✅ **Form Validation**: Try invalid phone numbers
3. ✅ **Registration**: Submit valid data
4. ✅ **Duplicate Check**: Try same phone number twice
5. ✅ **LINE Integration**: Test in LINE app

#### **Error Scenarios:**
1. ❌ **Network Error**: Disconnect internet
2. ❌ **Invalid Data**: Submit empty form
3. ❌ **Database Error**: Use wrong Supabase config

---

## 🔍 **Debugging Guide**

### **Common Issues:**

#### **1. CORS Errors**
```
Error: CORS policy blocked
```
**Solution:** Add your domain to Supabase CORS settings

#### **2. LIFF Not Working**
```
Error: LIFF init failed
```
**Solution:** Check LIFF ID and domain whitelist

#### **3. Database Connection Failed**
```
Error: Failed to fetch
```
**Solution:** Verify Supabase URL and API key

#### **4. Validation Errors**
```
Error: Phone validation failed
```
**Solution:** Check phone number format (Thai mobile)

### **Debug Tools:**

#### **Browser Console:**
```javascript
// Check services
console.log(window.SupabaseClient);
console.log(window.ValidationService);
console.log(window.UIComponents);

// Test validation
const validator = new ValidationService();
console.log(validator.validatePhoneNumber('0812345678'));
```

#### **Network Tab:**
- Check API calls to Supabase
- Verify request/response data
- Look for CORS errors

---

## 📊 **Performance Monitoring**

### **Key Metrics:**
- Page load time
- Form submission time
- Database response time
- Error rates

### **Monitoring Tools:**
```javascript
// Add to index.html for basic monitoring
console.time('page-load');
window.addEventListener('load', () => {
  console.timeEnd('page-load');
});
```

---

## 🚀 **Deployment Options**

### **1. GitHub Pages**
```bash
# Push to GitHub and enable Pages
git add .
git commit -m "Deploy VCHome Registration"
git push origin main
```

### **2. Netlify**
```bash
# Drag and drop RegispatientHome folder
# Or connect GitHub repo
```

### **3. Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **4. Custom Server**
```bash
# Upload files to web server
# Ensure HTTPS is enabled
# Configure domain in LINE LIFF
```

---

## ✅ **Post-Deployment Checklist**

- [ ] All files uploaded correctly
- [ ] HTTPS enabled
- [ ] Configuration updated with production values
- [ ] LIFF endpoint URL updated
- [ ] Database permissions configured
- [ ] Test registration flow
- [ ] Monitor error logs
- [ ] Backup database

---

## 📞 **Support & Troubleshooting**

### **Quick Fixes:**
1. **Clear browser cache** if changes don't appear
2. **Check console logs** for JavaScript errors
3. **Verify network requests** in DevTools
4. **Test in incognito mode** to avoid cache issues

### **Contact Information:**
- Technical Issues: Check console logs first
- Database Issues: Verify Supabase configuration
- LINE Issues: Check LIFF settings

---

**🎉 Your VCHome Registration System is ready to go!**

Remember to:
- Test thoroughly before going live
- Monitor for errors after deployment
- Keep backups of your configuration
- Update documentation as needed