-- Fix: แก้ไข functions ที่เหลือทั้งหมดที่ใช้ pr.phone และ pr.full_name
-- Error: column pr.phone does not exist
-- รันใน Supabase SQL Editor

-- ============================================================
-- ขั้นตอนที่ 1: ดู source code ของ functions ที่มีปัญหา
-- ============================================================

-- 1.1 ดู enqueue_appointment_notifications
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'enqueue_appointment_notifications';

-- 1.2 ดู hydrate_appointment_contacts
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'hydrate_appointment_contacts';

-- ============================================================
-- ขั้นตอนที่ 2: แก้ไข functions
-- ============================================================

-- คัดลอกผลลัพธ์จากข้อ 1.1 และ 1.2 มาให้ผม
-- แล้วผมจะสร้าง SQL แก้ไขให้

-- ============================================================
-- ขั้นตอนที่ 3: วิธีแก้ชั่วคราว - ปิด triggers
-- ============================================================

-- ถ้าต้องการใช้งานโปรแกรมก่อน สามารถปิด triggers ชั่วคราวได้:

-- ดู triggers ทั้งหมดบน appointments
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;

-- ปิด trigger เฉพาะตัวที่เรียก functions มีปัญหา:
-- (ต้องรู้ชื่อ trigger ก่อน - จาก query ด้านบน)

-- ตัวอย่าง:
-- ALTER TABLE appointments DISABLE TRIGGER <trigger_name>;

-- หรือปิดทั้งหมด (ไม่แนะนำ เพราะจะไม่มี notification):
-- ALTER TABLE appointments DISABLE TRIGGER ALL;

-- ============================================================
-- ขั้นตอนที่ 4: วิธีแก้แบบถาวร
-- ============================================================

-- กรุณา COPY ผลลัพธ์จากขั้นตอนที่ 1 มาให้ผม
-- ผมจะสร้าง CREATE OR REPLACE FUNCTION ที่ถูกต้องให้
