-- Move the supplied Generation 1 roster into the public Hall of Fame.
-- This migration is additive and idempotent: the original team_members rows
-- remain available for rollback and audit history.
INSERT INTO honors
  (name, nickname, generation, position, profile_image, achievement, description, current_position, joined_year, display_order, is_published)
SELECT names.full_name, NULL, 'รุ่น 1', NULL, NULL, NULL, NULL, 'ศิษย์เก่ารุ่นที่ 1', '2024', names.display_order, 1
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
WHERE NOT EXISTS (
  SELECT 1 FROM honors existing
  WHERE existing.name = names.full_name AND existing.joined_year = '2024'
);
