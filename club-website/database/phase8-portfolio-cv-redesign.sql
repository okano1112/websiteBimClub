-- Phase 8: ปรับปรุงโครงสร้างพอร์ตโฟลิโอและซีวี (Portfolio & CV Redesign)
-- เพิ่มคอลัมน์สำหรับเป้าหมายงาน, วัตถุประสงค์, ข้อมูลหมวดหมู่เพิ่มเติม 18 หมวด, และการตั้งค่าแม่แบบ/ธีม

ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS target_role VARCHAR(150) DEFAULT NULL AFTER headline,
  ADD COLUMN IF NOT EXISTS career_objective TEXT DEFAULT NULL AFTER summary,
  ADD COLUMN IF NOT EXISTS extra_sections JSON DEFAULT NULL AFTER skills,
  ADD COLUMN IF NOT EXISTS portfolio_settings JSON DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cv_settings JSON DEFAULT NULL;
