const express = require('express');
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');
const requireAdmin = require('../../middleware/requireAdmin');
const { loadCurrentUser } = require('../../middleware/requireRole');
const { projectFields } = require('../services/projectData');

const router = express.Router();
const idOf = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const text = (value, max = 255) => String(value || '').trim().slice(0, max);
const currentUserId = (req) => Number(req.currentUser?.id || req.session?.user?.id);

const projectSelect = `SELECT p.*, u.full_name AS owner_name
  FROM projects p JOIN users u ON u.id = p.owner_user_id`;

router.get('/', async (req, res) => {
    try {
        const memberId = req.query.memberId ? idOf(req.query.memberId) : null;
        const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
        const limit = Math.min(50, Math.max(1, Math.floor(Number(req.query.limit) || 20)));
        const params = [];
        let where = 'p.is_public = 1 AND p.deleted_at IS NULL';
        if (req.query.memberId && !memberId) return res.status(400).json({ success: false, message: 'memberId ไม่ถูกต้อง' });
        if (memberId) { where += ' AND (p.owner_user_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))'; params.push(memberId, memberId); }
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM projects p WHERE ${where}`, params);
        const [projects] = await db.query(`${projectSelect} WHERE ${where} ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
        res.json({ success: true, projects, pagination: { page, limit, total: Number(total) } });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงผลงาน' }); }
});

router.get('/admin', requireLogin, requireAdmin, async (req, res) => {
    try {
        const limit = 20, requested = Math.max(1, Math.floor(Number(req.query.page) || 1));
        const q = `%${String(req.query.q || '').trim().slice(0, 100)}%`;
        const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM projects WHERE deleted_at IS NULL AND title LIKE ?', [q]);
        const pages = Math.max(1, Math.ceil(Number(total) / limit)), page = Math.min(requested, pages);
        const [projects] = await db.query(`${projectSelect} WHERE p.deleted_at IS NULL AND p.title LIKE ? ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`, [q, limit, (page - 1) * limit]);
        res.json({ success: true, projects, pagination: { page, pages, total: Number(total), limit } });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'โหลดผลงานไม่สำเร็จ' }); }
});

router.get('/:id', async (req, res) => {
    const id = idOf(req.params.id); if (!id) return res.status(400).json({ success: false, message: 'รหัสผลงานไม่ถูกต้อง' });
    try {
        const viewer = req.session?.user ? await loadCurrentUser(req, res) : null;
        if (req.session?.user && !viewer) return;
        if (res.headersSent) return;
        const [rows] = await db.query(`${projectSelect} WHERE p.id = ? AND p.deleted_at IS NULL AND (p.is_public = 1 OR p.owner_user_id = ? OR ? = 1)`, [id, viewer?.id || 0, viewer?.role === 'admin' ? 1 : 0]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'ไม่พบผลงาน' });
        const [members] = await db.query('SELECT pm.user_id, pm.role_in_project, u.full_name, u.username, u.avatar_url FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ? AND u.deleted_at IS NULL', [id]);
        res.json({ success: true, project: { ...rows[0], members } });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงผลงาน' }); }
});

router.post('/', requireLogin, async (req, res) => {
    let fields; try { fields = projectFields(req.body); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    try {
        const [result] = await db.query('INSERT INTO projects (owner_user_id, title, description, image_url, project_url, is_public) VALUES (?, ?, ?, ?, ?, ?)', [currentUserId(req), fields.title, fields.description, fields.image_url, fields.project_url, fields.is_public]);
        res.status(201).json({ success: true, project: { id: result.insertId, owner_user_id: currentUserId(req), ...fields } });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'เพิ่มผลงานไม่สำเร็จ' }); }
});

router.put('/:id', requireLogin, async (req, res) => {
    const id = idOf(req.params.id); if (!id) return res.status(400).json({ success: false, message: 'รหัสผลงานไม่ถูกต้อง' });
    try {
        const [[previous]] = await db.query('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL AND (owner_user_id = ? OR ? = 1)', [id, currentUserId(req), req.currentUser.role === 'admin' ? 1 : 0]);
        if (!previous) return res.status(404).json({ success: false, message: 'ไม่พบผลงานหรือไม่มีสิทธิ์' });
        let fields; try { fields = projectFields(req.body, previous); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
        await db.query('UPDATE projects SET title=?, description=?, image_url=?, project_url=?, is_public=? WHERE id=? AND deleted_at IS NULL', [fields.title, fields.description, fields.image_url, fields.project_url, fields.is_public, id]);
        res.json({ success: true, message: 'อัปเดตผลงานสำเร็จ' });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'แก้ไขผลงานไม่สำเร็จ' }); }
});

router.put('/:id/collaborators', requireLogin, requireAdmin, async (req, res) => {
    const id = idOf(req.params.id); const members = Array.isArray(req.body.members) ? req.body.members : null;
    if (!id || !members || members.length > 50) return res.status(400).json({ success: false, message: 'รายการผู้ร่วมงานไม่ถูกต้อง' });
    const normalized = members.map(m => ({ userId: idOf(m.userId), role: text(m.roleInProject, 150) || null }));
    if (normalized.some(m => !m.userId) || new Set(normalized.map(m => m.userId)).size !== normalized.length) return res.status(400).json({ success: false, message: 'มีบัญชีผู้ใช้ซ้ำหรือไม่ถูกต้อง' });
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [project] = await conn.query('SELECT id, owner_user_id FROM projects WHERE id = ? AND deleted_at IS NULL FOR UPDATE', [id]);
        if (!project.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'ไม่พบผลงาน' }); }
        if (normalized.some(m => m.userId === Number(project[0].owner_user_id))) { await conn.rollback(); return res.status(400).json({ success: false, message: 'เจ้าของผลงานอยู่ในรายการอยู่แล้ว' }); }
        if (normalized.length) { const [users] = await conn.query(`SELECT id FROM users WHERE deleted_at IS NULL AND is_banned = 0 AND is_verified = 1 AND id IN (${normalized.map(() => '?').join(',')})`, normalized.map(m => m.userId)); if (users.length !== normalized.length) { await conn.rollback(); return res.status(400).json({ success: false, message: 'มีบัญชีที่ใช้งานไม่ได้' }); } }
        await conn.query('DELETE FROM project_members WHERE project_id = ?', [id]);
        for (const member of normalized) await conn.query('INSERT INTO project_members (project_id, user_id, role_in_project, added_by) VALUES (?, ?, ?, ?)', [id, member.userId, member.role, currentUserId(req)]);
        await conn.commit(); res.json({ success: true, members: normalized });
    } catch (error) { await conn.rollback(); console.error(error); res.status(500).json({ success: false, message: 'บันทึกผู้ร่วมงานไม่สำเร็จ' }); } finally { conn.release(); }
});

router.delete('/:id', requireLogin, async (req, res) => {
    const id = idOf(req.params.id); if (!id) return res.status(400).json({ success: false, message: 'รหัสผลงานไม่ถูกต้อง' });
    const [result] = await db.query('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND (owner_user_id = ? OR ? = 1) AND deleted_at IS NULL', [id, currentUserId(req), req.currentUser.role === 'admin' ? 1 : 0]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'ไม่พบผลงานหรือไม่มีสิทธิ์' });
    res.json({ success: true, message: 'ซ่อนผลงานสำเร็จ' });
});

module.exports = router;
