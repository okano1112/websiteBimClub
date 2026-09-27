CREATE TABLE IF NOT EXISTS auth_rate_limits (
    rate_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    hits INT UNSIGNED NOT NULL DEFAULT 0,
    expires_at BIGINT UNSIGNED NOT NULL,
    INDEX idx_auth_rate_limit_expiry (expires_at)
) ENGINE=InnoDB;
