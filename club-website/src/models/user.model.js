const db = require('../../config/database');

const PUBLIC_COLUMNS = `id, username, email, full_name, age, phone, recovery_phone,
  avatar_url, role, is_verified, is_banned, deleted_at`;

async function findPublicById(id) {
  const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function findCredentialsById(id) {
  const [rows] = await db.query('SELECT id, password FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function updateProfile(id, { fullName, age, phone, avatarUrl }) {
  await db.query(
    'UPDATE users SET full_name = ?, age = ?, phone = ?, avatar_url = ? WHERE id = ?',
    [fullName, age, phone, avatarUrl, id]
  );
  return findPublicById(id);
}

async function updateRecoveryPhone(id, recoveryPhone) {
  await db.query('UPDATE users SET recovery_phone = ? WHERE id = ?', [recoveryPhone, id]);
  return findPublicById(id);
}

async function updatePassword(id, passwordHash) {
  await db.query(
    `UPDATE users
     SET password = ?, reset_token = NULL, reset_token_expires = NULL
     WHERE id = ?`,
    [passwordHash, id]
  );
}

module.exports = {
  findCredentialsById,
  findPublicById,
  updatePassword,
  updateProfile,
  updateRecoveryPhone
};
