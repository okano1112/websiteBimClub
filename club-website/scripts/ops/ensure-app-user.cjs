const mysql = require('mysql2/promise');
const { validateRuntime } = require('../../config/runtime');

(async () => {
  validateRuntime();
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_ROOT_PASSWORD } = process.env;
  if (!DB_ROOT_PASSWORD) throw Error('DB_ROOT_PASSWORD is required');
  if (!/^[A-Za-z0-9_]+$/.test(DB_NAME) || !/^[A-Za-z0-9_]+$/.test(DB_USER)) throw Error('Invalid database or app user name');
  const db = await mysql.createConnection({ host: DB_HOST, port: Number(DB_PORT || 3306), user: 'root', password: DB_ROOT_PASSWORD });
  try {
    const [users] = await db.query("SELECT User FROM mysql.user WHERE User = ? AND Host = '%'", [DB_USER]);
    if (users.length === 0) {
      await db.query(`CREATE USER ${mysql.escape(DB_USER)}@'%' IDENTIFIED BY ${mysql.escape(DB_PASSWORD)}`);
      await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${mysql.escapeId(DB_NAME)}.* TO ${mysql.escape(DB_USER)}@'%'`);
      console.log('Created restricted application database user');
    } else {
      console.log('Application database user already exists; credentials and grants were not changed');
    }
    const app = await mysql.createConnection({ host: DB_HOST, port: Number(DB_PORT || 3306), user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
    try {
      await app.query('SELECT 1 FROM users LIMIT 1');
      await app.query('SELECT 1 FROM sessions LIMIT 1');
    } finally { await app.end(); }
  } finally { await db.end(); }
})().catch(error => { console.error('Database bootstrap failed:', error.code || error.message); process.exitCode = 1; });
