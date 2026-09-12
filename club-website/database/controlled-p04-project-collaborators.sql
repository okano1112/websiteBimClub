-- Phase 4: canonical projects and collaborator tagging.
-- Apply only to an isolated test database after backup/restore verification.
ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS target_role VARCHAR(150) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS career_objective TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extra_sections JSON DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portfolio_settings JSON DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cv_settings JSON DEFAULT NULL;

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  project_url VARCHAR(500),
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_projects_owner (owner_user_id),
  INDEX idx_projects_public (is_public, deleted_at, created_at)
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role_in_project VARCHAR(150) NULL,
  added_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id),
  INDEX idx_project_members_user (user_id, project_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS project_legacy_links (
  legacy_portfolio_project_id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL UNIQUE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Deterministic backfill: one canonical row and link per legacy row.
-- Run after the DDL above on an isolated test database, then verify counts and fields.
DROP PROCEDURE IF EXISTS backfill_bimclub_projects;
DELIMITER $$
CREATE PROCEDURE backfill_bimclub_projects()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE legacyId INT;
  DECLARE ownerId INT;
  DECLARE projectTitle VARCHAR(255);
  DECLARE projectDescription TEXT;
  DECLARE projectImage VARCHAR(500);
  DECLARE projectUrl VARCHAR(500);
  DECLARE projectCreated TIMESTAMP;
  DECLARE projectPublic TINYINT;
  DECLARE cur CURSOR FOR
    SELECT pp.id, p.user_id, pp.title, pp.description, pp.image_url, pp.project_url, pp.created_at, COALESCE(p.is_public, 0)
    FROM portfolio_projects pp JOIN portfolios p ON p.id = pp.portfolio_id
    LEFT JOIN project_legacy_links l ON l.legacy_portfolio_project_id = pp.id
    WHERE l.legacy_portfolio_project_id IS NULL ORDER BY pp.id;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO legacyId, ownerId, projectTitle, projectDescription, projectImage, projectUrl, projectCreated, projectPublic;
    IF done THEN LEAVE read_loop; END IF;
    INSERT INTO projects (owner_user_id, title, description, image_url, project_url, is_public, created_at, updated_at)
      VALUES (ownerId, projectTitle, projectDescription, projectImage, projectUrl, projectPublic, projectCreated, projectCreated);
    INSERT INTO project_legacy_links (legacy_portfolio_project_id, project_id)
      VALUES (legacyId, LAST_INSERT_ID());
  END LOOP;
  CLOSE cur;
END$$
DELIMITER ;
CALL backfill_bimclub_projects();
DROP PROCEDURE IF EXISTS backfill_bimclub_projects;
