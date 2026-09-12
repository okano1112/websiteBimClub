/* Local QA account seeder. Never run against production. */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed QA accounts while NODE_ENV=production');
}

const accounts = [
  { key: 'member', username: 'qa_member', email: 'qa.member@bimclub.local', fullName: 'QA Member', role: 'user' },
  { key: 'instructor', username: 'qa_instructor', email: 'qa.instructor@bimclub.local', fullName: 'QA Instructor', role: 'instructor' },
  { key: 'admin', username: 'qa_admin', email: 'qa.admin@bimclub.local', fullName: 'QA Admin', role: 'admin' }
];

const generatedPasswords = new Map();
function passwordFor(key) {
  const envName = `QA_${key.toUpperCase()}_PASSWORD`;
  const value = process.env[envName];
  if (value && value.length >= 8) return value;
  if (!generatedPasswords.has(key)) generatedPasswords.set(key, `QA-${key}-${crypto.randomBytes(12).toString('base64url')}`);
  return generatedPasswords.get(key);
}

async function main() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const account of accounts) {
      const passwordHash = await bcrypt.hash(passwordFor(account.key), 12);
      await connection.query(
        `INSERT INTO users (username, email, password, full_name, role, is_verified)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE password = VALUES(password), full_name = VALUES(full_name), role = VALUES(role), is_verified = 1, deleted_at = NULL, is_banned = 0`,
        [account.username, account.email, passwordHash, account.fullName, account.role]
      );
    }
    await connection.commit();
    console.log('QA accounts ready (local only):');
    for (const account of accounts) console.log(`${account.role}\t${account.email}\t${passwordFor(account.key)}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await db.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
