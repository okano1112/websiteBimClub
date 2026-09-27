function validateRuntime(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  for (const key of ['SESSION_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'APP_URL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) {
    if (!env[key]) throw new Error(`Production requires ${key}`);
  }
  const origin = new URL(env.APP_URL);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_URL must be an HTTPS origin');
  if (env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  if (env.DB_USER === 'root') throw new Error('Production requires a non-root database user');
}
module.exports = { validateRuntime };
