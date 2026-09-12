-- Preserve legacy identifiers for clients while new writes use canonical projects.
-- Run once after backfill; MariaDB preserves existing IDs and advances AUTO_INCREMENT.
ALTER TABLE project_legacy_links MODIFY legacy_portfolio_project_id INT NOT NULL AUTO_INCREMENT;
