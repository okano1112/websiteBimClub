-- Phase 2: เพิ่มเบอร์โทรศัพท์สำหรับหน้าแก้ไขโปรไฟล์
-- ใช้กับฐานข้อมูลที่สร้างไว้แล้วโดยไม่ต้อง DROP ตาราง

ALTER TABLE users
  ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER full_name;
