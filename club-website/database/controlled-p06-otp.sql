-- Additive, repeatable MariaDB migration. Existing unverified accounts can request a new OTP.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verify_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verify_sent_at DATETIME DEFAULT NULL;
