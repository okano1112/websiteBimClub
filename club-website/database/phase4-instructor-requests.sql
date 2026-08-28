-- Phase 4: คำขอสิทธิ์อาจารย์
-- ใช้กับฐานข้อมูลที่สร้างไว้แล้วโดยไม่ต้อง DROP ตาราง

CREATE TABLE IF NOT EXISTS instructor_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  faculty VARCHAR(200) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_instructor_requests_status (status, created_at),
  INDEX idx_instructor_requests_user (user_id, status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
