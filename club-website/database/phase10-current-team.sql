-- Additive migration: active BimClub team by year.
CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  nickname VARCHAR(50) DEFAULT NULL,
  role VARCHAR(150) DEFAULT NULL,
  team_year VARCHAR(20) NOT NULL,
  bio TEXT DEFAULT NULL,
  profile_image VARCHAR(255) DEFAULT NULL,
  display_order INT DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_team_year_public (team_year, is_published, display_order)
);

-- Generation 1 / starting year 2024. No role or personal data is inferred.
INSERT INTO team_members (full_name, role, team_year, display_order)
SELECT names.full_name, NULL, '2024', names.display_order
FROM (
  SELECT 'นายศุภกิตติ์ เจริญสุข' AS full_name, 1 AS display_order UNION ALL
  SELECT 'นายสมชาย ตอล', 2 UNION ALL
  SELECT 'นายไกรศร วิเชียรสาร', 3 UNION ALL
  SELECT 'นายพชรพล ศรีคงแก้ว', 4 UNION ALL
  SELECT 'นายกฤษกร เทพชัย', 5 UNION ALL
  SELECT 'นายพีระพงศ์ ชัยเพ็ชร', 6 UNION ALL
  SELECT 'นางสาวนิชกาณต์ เลื่อนลอย', 7 UNION ALL
  SELECT 'นางสาวพิชญา ชัยวิเศษ', 8 UNION ALL
  SELECT 'นายกริชติพัฒน์ ถนัดค้า', 9 UNION ALL
  SELECT 'นางสาวศศิวิมล เรืองนิล', 10 UNION ALL
  SELECT 'ศุภวิชญ์ แถลงกัณฑ์', 11 UNION ALL
  SELECT 'กฤตัชญ์ ศรีวรรณะ', 12
) names
WHERE NOT EXISTS (SELECT 1 FROM team_members WHERE team_year = '2024');
