-- Phase 5: profile privacy and optional member metadata.
CREATE TABLE IF NOT EXISTS member_profiles (
  user_id INT PRIMARY KEY,
  cover_url VARCHAR(500) NULL,
  department VARCHAR(150) NULL,
  program VARCHAR(150) NULL,
  member_type ENUM('member','alumni','instructor') NOT NULL DEFAULT 'member',
  graduation_year VARCHAR(10) NULL,
  generation VARCHAR(50) NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
