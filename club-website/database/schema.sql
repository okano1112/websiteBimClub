-- สร้างตารางสำหรับระบบ Social Feed + Portfolio
-- รันไฟล์นี้ใน phpMyAdmin หรือ MySQL CLI

DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS course_quiz_attempts;
DROP TABLE IF EXISTS course_quiz_questions;
DROP TABLE IF EXISTS course_video_stops;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS post_comments;
DROP TABLE IF EXISTS portfolio_education;
DROP TABLE IF EXISTS portfolio_experiences;
DROP TABLE IF EXISTS portfolios;
DROP TABLE IF EXISTS post_images;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS instructor_requests;
DROP TABLE IF EXISTS achievement_images;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(30) DEFAULT NULL,
  avatar_url VARCHAR(255) DEFAULT NULL,
  role ENUM('user','instructor','admin') DEFAULT 'user',
  is_verified TINYINT(1) DEFAULT 0,
  verify_token VARCHAR(255) DEFAULT NULL,
  verify_token_expires DATETIME DEFAULT NULL,
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expires DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE instructor_requests (
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

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE post_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE post_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE post_likes (
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instructor_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(255) DEFAULT NULL,
  video_url VARCHAR(255) DEFAULT NULL,
  pass_score INT DEFAULT 70,
  is_published TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE course_video_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  time_seconds INT NOT NULL,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_index INT NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE course_quiz_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  question TEXT NOT NULL,
  options JSON NOT NULL,
  correct_index INT NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE course_quiz_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  score INT NOT NULL,
  passed TINYINT(1) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  certificate_code VARCHAR(64) NOT NULL UNIQUE,
  issued_via ENUM('quiz_pass','admin_bypass') NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_course_cert (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE portfolios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  headline VARCHAR(200),
  summary TEXT,
  skills JSON DEFAULT ('[]'),
  website_url VARCHAR(255),
  is_public TINYINT(1) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE portfolio_experiences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  company VARCHAR(150) NOT NULL,
  position VARCHAR(150) NOT NULL,
  start_date DATE,
  end_date DATE,
  description TEXT,
  display_order INT DEFAULT 0,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE portfolio_education (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  institution VARCHAR(200) NOT NULL,
  degree VARCHAR(100),
  field_of_study VARCHAR(150),
  start_year INT,
  end_year INT,
  display_order INT DEFAULT 0,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- สร้างตารางกิจกรรม (Activities)
CREATE TABLE activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date VARCHAR(100),
  participants INT DEFAULT 0,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้างตารางผลงาน (Achievements)
CREATE TABLE achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  team_size VARCHAR(100),
  project_year VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- รูปภาพของผลงานแต่ละชิ้น (สำหรับ 3D Carousel)
CREATE TABLE achievement_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  achievement_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  caption VARCHAR(255),
  display_order INT DEFAULT 0,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);


-- ============================
-- Seed Data
-- ============================

-- admin user (password: admin123) — is_verified=1 เพราะเป็น admin เริ่มต้น
INSERT INTO users (username, email, password, full_name, role, is_verified) VALUES
('admin', 'admin@bimclub.com', '$2b$12$khHjurP7dWF8xZcS9QwLbOl9ZTu3C59KOeqRVPKtCC75HIpZFvxIi', 'แอดมิน BimClub', 'admin', 1);

-- สร้าง portfolio ว่างให้ admin
INSERT INTO portfolios (user_id) VALUES (1);

-- โพสต์ตัวอย่าง
INSERT INTO posts (author_id, content) VALUES
(1, 'ยินดีต้อนรับสู่ BimClub! ชมรมที่จะพาคุณก้าวสู่โลกของ Building Information Modeling'),
(1, 'เปิดรับสมัครสมาชิกใหม่แล้ววันนี้ มาร่วมเรียนรู้ BIM ไปด้วยกัน'),
(1, 'กิจกรรม Workshop Revit เบื้องต้น สำหรับสมาชิกใหม่ เร็วๆ นี้!');

-- Seed ตัวอย่างสำหรับ Activity
INSERT INTO activities (title, description, event_date, participants, image_url) VALUES
('BIM Workshop ครั้งที่ 1', 'อบรมการใช้งาน Revit เบื้องต้น', 'มกราคม 2026', 50, '../../../assets/img/swiperimg/bimActivity.jpg');

-- Seed ตัวอย่างสำหรับ Achievement
INSERT INTO achievements (title, category, description, team_size, project_year) VALUES
('อาคารพาณิชย์จำลอง', 'Architecture', 'ออกแบบและจำลองอาคารพาณิชย์ 5 ชั้น', 'ทีม 5 คน', '2026');

INSERT INTO achievement_images (achievement_id, image_url, caption, display_order) VALUES
(1, '../../../assets/img/swiperimg/bimActivity.jpg', 'ภาพรวมโมเดล 3D', 0),
(1, '../../../assets/img/swiperimg/bimActivity2.jpg', 'แปลนชั้น 1', 1);
