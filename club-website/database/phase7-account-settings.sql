-- Phase 7: ข้อมูลโปรไฟล์และเบอร์โทรศัพท์สำรอง
-- สำหรับฐานข้อมูลเดิม ให้รันไฟล์นี้เพียงครั้งเดียว

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS age TINYINT UNSIGNED DEFAULT NULL AFTER full_name,
  ADD COLUMN IF NOT EXISTS recovery_phone VARCHAR(30) DEFAULT NULL AFTER phone;
