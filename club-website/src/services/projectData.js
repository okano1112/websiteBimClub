/** Canonical project input and document adapter.
 * Authoritative storage: projects + project_members; legacy IDs only label old API responses.
 * Collaborators see public work, owners can include their own private work in private documents.
 * Dependencies: controlled-p04 migrations; scripts/qa/gaps-integration.cjs and CV renderer tests.
 */
const db = require('../../config/database');
function projectFields(body, previous = {}) {
  const pick = (name, alias) => body[name] !== undefined ? body[name] : alias && body[alias] !== undefined ? body[alias] : previous[name];
  const title = String(pick('title') || '').trim();
  const description = String(pick('description') || '').trim();
  const image = String(pick('image_url', 'imageUrl') || '').trim();
  const url = String(pick('project_url', 'projectUrl') || '').trim();
  if (!title || title.length > 255 || description.length > 5000 || image.length > 500 || url.length > 500) throw new Error('กรุณาตรวจสอบชื่อและความยาวข้อมูลผลงาน');
  if (image && (!/^\/uploads\/[a-zA-Z0-9_./-]+$/.test(image) || image.includes('..'))) throw new Error('กรุณาอัปโหลดรูปผ่านระบบ');
  if (url) { let parsed; try { parsed = new URL(url); } catch { throw new Error('ลิงก์ผลงานไม่ถูกต้อง'); } if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('ลิงก์ผลงานต้องเป็น HTTP หรือ HTTPS'); }
  const visibility = pick('is_public');
  if (visibility !== undefined && ![true, false, 0, 1].includes(visibility)) throw new Error('สถานะเผยแพร่ไม่ถูกต้อง');
  return { title, description: description || null, image_url: image || null, project_url: url || null, is_public: visibility ? 1 : 0 };
}
async function documentProjects(userId, privateOwner = false) {
  const [rows] = await db.query(`SELECT p.*, pm.role_in_project, l.legacy_portfolio_project_id,
      (p.owner_user_id = ?) AS can_edit, u.full_name AS owner_name
    FROM projects p JOIN users u ON u.id = p.owner_user_id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN project_legacy_links l ON l.project_id = p.id
    WHERE p.deleted_at IS NULL AND (p.owner_user_id = ? OR pm.user_id = ?)
      AND (p.is_public = 1 OR (p.owner_user_id = ? AND ? = 1))
    ORDER BY p.created_at DESC, p.id DESC`, [userId, userId, userId, userId, userId, privateOwner ? 1 : 0]);
  return rows.map(row => ({ ...row, id: row.legacy_portfolio_project_id || row.id, canonical_project_id: row.id }));
}
module.exports = { projectFields, documentProjects };
