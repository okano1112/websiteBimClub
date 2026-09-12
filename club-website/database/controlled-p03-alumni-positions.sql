-- Phase 3: controlled alumni position catalog and verified account links.
-- Additive migration. Run once after the current honors table exists.
CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_name_th VARCHAR(150) NOT NULL,
  position_name_en VARCHAR(150) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_leader TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_positions_name_th (position_name_th)
);

ALTER TABLE honors
  ADD COLUMN position_id INT NULL,
  ADD COLUMN user_id INT NULL,
  ADD CONSTRAINT fk_honors_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_honors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_honors_position_id ON honors(position_id);
CREATE INDEX idx_honors_user_id ON honors(user_id);
