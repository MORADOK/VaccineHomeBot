# 🚀 Deploy Edge Function to Supabase

## ✅ แก้ไขเสร็จแล้ว

ไฟล์: `supabase/functions/send-line-message/index.ts`
- ลบ `cornerRadius: "8px"` ออกจาก image component (2 จุด)
- LINE API จะยอมรับ Flex Message แล้ว

---

## 📦 ขั้นตอน Deploy

### **วิธีที่ 1: ใช้ Supabase CLI (แนะนำ)**

```bash
# 1. ตรวจสอบว่าติดตั้ง Supabase CLI แล้วหรือยัง
supabase --version

# ถ้ายังไม่มีให้ติดตั้ง:
# Windows (PowerShell):
# scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
# scoop install supabase

# macOS:
# brew install supabase/tap/supabase

# Linux:
# npm install -g supabase

# 2. Login เข้า Supabase
supabase login

# 3. Link project
supabase link --project-ref fljyjbrgfzervxofrilo

# 4. Deploy Edge Function
supabase functions deploy send-line-message

# 5. ตรวจสอบว่า deploy สำเร็จ
supabase functions list
```

---

### **วิธีที่ 2: ผ่าน Supabase Dashboard (ถ้าไม่มี CLI)**

**ขั้นตอน:**

1. **เข้า Supabase Dashboard**
   - ไปที่: https://supabase.com/dashboard
   - เลือก Project: `vaccinehomebot`

2. **ไปที่ Edge Functions**
   - คลิกเมนู **Edge Functions** ด้านซ้าย
   - คลิกที่ `send-line-message` function

3. **อัพเดท Code**
   - คลิก **Edit** หรือ **Deploy new version**
   - วางโค้ดใหม่จากไฟล์ `supabase/functions/send-line-message/index.ts`
   - หรือ Upload ไฟล์ทั้งโฟลเดอร์

4. **Deploy**
   - คลิกปุ่ม **Deploy**
   - รอสักครู่จนกว่าจะเสร็จ

5. **ตรวจสอบ**
   - ไปที่ **Logs** tab
   - ดูว่า deploy สำเร็จหรือไม่

---

### **วิธีที่ 3: ใช้ Git Push (ถ้าตั้งค่า CI/CD ไว้)**

```bash
# 1. Commit changes
git add supabase/functions/send-line-message/index.ts
git commit -m "Fix: Remove unsupported cornerRadius from LINE Flex Message"

# 2. Push to repository
git push origin main

# 3. GitHub Actions จะ deploy อัตโนมัติ (ถ้าตั้งค่าไว้)
```

---

## 🧪 ทดสอบหลัง Deploy

### **1. ทดสอบผ่าน Dashboard**

```
Dashboard → Edge Functions → send-line-message → Test
```

**ส่ง JSON ทดสอบ:**
```json
{
  "userId": "YOUR_LINE_USER_ID",
  "message": "ทดสอบระบบ"
}
```

### **2. ทดสอบจากแอป**

1. เข้าหน้า **นัดครั้งถัดไป**
2. กดปุ่ม **แจ้งเตือน**
3. ตรวจสอบว่าส่งสำเร็จโดยไม่มี error 500

---

## 🔍 ตรวจสอบ Logs

หลัง Deploy แล้ว ตรวจสอบ logs:

```
Dashboard → Edge Functions → send-line-message → Logs
```

**สิ่งที่ต้องเห็น:**
```
✅ Sending LINE message to: U123456...
✅ LINE message sent successfully: {...}
```

**ถ้ายัง error:**
- ตรวจสอบว่า deploy ไปจริงหรือยัง (ดู version number)
- ดู error message ใหม่

---

## ⚠️ หมายเหตุ

- **Environment Variables** จะคงอยู่เหมือนเดิม (ไม่ต้องตั้งใหม่)
- **LINE_CHANNEL_ACCESS_TOKEN** ต้องมีอยู่แล้วก่อน deploy
- หลัง deploy อาจต้องรอ 1-2 นาทีเพื่อให้ function พร้อมใช้งาน

---

## ✅ Checklist

- [ ] แก้ไขไฟล์ `send-line-message/index.ts` แล้ว
- [ ] Deploy ไปยัง Supabase แล้ว
- [ ] ตรวจสอบ logs ว่าไม่มี error
- [ ] ทดสอบส่งข้อความสำเร็จ
- [ ] ลบไฟล์นี้ออกเมื่อแก้เสร็จแล้ว

---

## 🎯 ขั้นตอนถัดไป

หลัง Deploy เสร็จแล้ว:
1. ทดสอบส่งข้อความใน LINE
2. ตรวจสอบว่าได้รับข้อความในรูปแบบ Flex Message
3. ถ้าสำเร็จ → เสร็จสิ้น! 🎉
