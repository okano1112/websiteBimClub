// Explicit one-time initial administrator creation. Never put passwords in argv or source.
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { validateRuntime } = require('../../config/runtime');

(async () => {
  validateRuntime();
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_NAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw Error('ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_NAME and a password of at least 12 characters are required');
  }
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });
  try {
    await db.beginTransaction();
    const [[count]] = await db.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
    if (Number(count.n) !== 0) throw Error('An administrator already exists');
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, full_name, role, is_verified) VALUES (?, ?, ?, ?, ?, 1)',
      [ADMIN_USERNAME.trim(), ADMIN_EMAIL.trim().toLowerCase(), await bcrypt.hash(ADMIN_PASSWORD, 12), ADMIN_NAME.trim(), 'admin']
    );
    await db.query('INSERT INTO portfolios (user_id) VALUES (?)', [result.insertId]);
    await db.commit();
    console.log('Initial administrator created');
  } catch (error) { await db.rollback(); throw error; }
  finally { await db.end(); }
})().catch(error => { console.error('Admin creation failed:', error.code || error.message); process.exitCode = 1; });
