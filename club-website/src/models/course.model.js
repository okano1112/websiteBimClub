const db = require('../../config/database');

async function findPublished() {
  const [rows] = await db.query(
    `SELECT c.*, u.full_name AS instructor_name
     FROM courses c
     JOIN users u ON u.id = c.instructor_id
     WHERE c.is_published = 1
     ORDER BY c.created_at DESC`
  );
  return rows;
}

async function create({ instructorId, title, description, isPublished }) {
  const [result] = await db.query(
    `INSERT INTO courses (instructor_id, title, description, pass_score, is_published)
     VALUES (?, ?, ?, 70, ?)`,
    [instructorId, title, description || null, isPublished ? 1 : 0]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await db.query(
    `SELECT c.*, u.full_name AS instructor_name
     FROM courses c
     JOIN users u ON u.id = c.instructor_id
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { create, findById, findPublished };
