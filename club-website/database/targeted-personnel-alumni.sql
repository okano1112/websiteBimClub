-- Retain legacy personnel rows as archival links. The existing honors row is authoritative after transfer.
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS alumni_honor_id INT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_alumni_honor ON team_members(alumni_honor_id);
