CREATE TABLE IF NOT EXISTS honors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  nickname VARCHAR(50),
  generation VARCHAR(50),
  position VARCHAR(150),
  profile_image VARCHAR(255),
  achievement TEXT,
  description TEXT,
  current_position VARCHAR(150),
  joined_year VARCHAR(50),
  display_order INT DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
