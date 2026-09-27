const roles = ['user', 'instructor', 'admin'];
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function parseUpdate(body, profile) {
  if (!body || typeof body !== 'object') fail(400, 'รูปแบบข้อมูลไม่ถูกต้อง');
  const value = {};
  if (profile) {
    const name = body.fullName ?? body.full_name;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) fail(400, 'ชื่อ-นามสกุลต้องมีความยาว 1–100 ตัวอักษร');
    if (body.phone != null && typeof body.phone !== 'string') fail(400, 'รูปแบบเบอร์โทรไม่ถูกต้อง');
    const phone = (body.phone || '').trim();
    const digits = phone.replace(/\D/g, '');
    if (phone && (!/^\+?[0-9()\s-]{8,30}$/.test(phone) || digits.length < 8 || digits.length > 15)) fail(400, 'รูปแบบเบอร์โทรไม่ถูกต้อง');
    value.fullName = name.trim(); value.phone = phone || null;
  }
  if (!profile || Object.hasOwn(body, 'role')) {
    if (typeof body.role !== 'string' || !roles.includes(body.role)) fail(400, 'Role ไม่ถูกต้อง');
    value.role = body.role;
  }
  return value;
}
async function updateAdminUser(db, actorId, targetId, value) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // A consistent lock order serializes concurrent administrator changes.
    const [admins] = await conn.query("SELECT id FROM users WHERE role = 'admin' AND is_verified = 1 AND is_banned = 0 AND deleted_at IS NULL ORDER BY id FOR UPDATE");
    if (!admins.some(user => Number(user.id) === Number(actorId))) fail(403, 'สิทธิ์ผู้ดูแลเปลี่ยนแปลง กรุณาโหลดหน้าใหม่');
    const [[target]] = await conn.query('SELECT id, role, is_banned, is_verified, deleted_at FROM users WHERE id = ? FOR UPDATE', [targetId]);
    if (!target) fail(404, 'ไม่พบผู้ใช้');
    if (value.role === 'admin' && (target.is_banned || target.deleted_at || !target.is_verified)) fail(409, 'บัญชีต้องยืนยันอีเมลและใช้งานได้ก่อนเป็นผู้ดูแล');
    if (value.role && value.role !== target.role) {
      if (Number(actorId) === Number(targetId)) fail(403, 'ไม่สามารถเปลี่ยน Role ของบัญชีตัวเองได้');
      if (target.role === 'admin' && value.role !== 'admin' && admins.length <= 1) fail(409, 'ต้องมีผู้ดูแลที่ใช้งานได้อย่างน้อยหนึ่งคน');
    }
    const fields = [], params = [];
    if (Object.hasOwn(value, 'fullName')) { fields.push('full_name = ?', 'phone = ?'); params.push(value.fullName, value.phone); }
    if (value.role) { fields.push('role = ?'); params.push(value.role); }
    await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, [...params, targetId]);
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}
module.exports = { parseUpdate, updateAdminUser };
