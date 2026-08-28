-- Phase 1: เพิ่ม role instructor ให้ระบบผู้ใช้เดิม
-- ใช้กับฐานข้อมูลที่สร้างไว้แล้วโดยไม่ต้อง DROP ตาราง

ALTER TABLE users
  MODIFY role ENUM('user','instructor','admin') DEFAULT 'user';
