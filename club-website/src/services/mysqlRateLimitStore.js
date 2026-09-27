const { createHash } = require('node:crypto');
// Shared counters survive restarts and apply across app replicas. Keys contain no raw IPs.
class MysqlRateLimitStore {
  constructor(db) { this.db = db; this.localKeys = false; this.operations = 0; }
  init(options) { this.windowMs = options.windowMs; }
  key(value) { return createHash('sha256').update(`auth:${value}`).digest('hex'); }
  async increment(key) {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`INSERT INTO auth_rate_limits (rate_key, hits, expires_at)
        VALUES (?, 1, FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) + ?)
        ON DUPLICATE KEY UPDATE
          hits = IF(expires_at <= FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000), 1, hits + 1),
          expires_at = IF(expires_at <= FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000), FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) + ?, expires_at)`,
        [this.key(key), this.windowMs, this.windowMs]);
      const [[row]] = await conn.query('SELECT hits, expires_at FROM auth_rate_limits WHERE rate_key = ?', [this.key(key)]);
      await conn.commit();
      if (++this.operations % 100 === 0) {
        // Bounded housekeeping; deletion failure must not undo a committed hit.
        this.db.query('DELETE FROM auth_rate_limits WHERE expires_at < FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) LIMIT 1000').catch(() => {});
      }
      return { totalHits: Number(row.hits), resetTime: new Date(Number(row.expires_at)) };
    } catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  }
  async decrement(key) { await this.db.query('UPDATE auth_rate_limits SET hits = GREATEST(0, hits - 1) WHERE rate_key = ?', [this.key(key)]); }
  async resetKey(key) { await this.db.query('DELETE FROM auth_rate_limits WHERE rate_key = ?', [this.key(key)]); }
}
module.exports = MysqlRateLimitStore;
