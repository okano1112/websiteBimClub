const express = require('express');
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');
const { loadCurrentUser } = require('../../middleware/requireRole');
const router = express.Router();
const idOf = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const text = (value, max) => String(value || '').trim().slice(0, max);
const viewerId = (req) => Number(req.currentUser?.id || req.session?.user?.id || 0);

async function readProfile(userId, privateView) {
    const [users] = await db.query('SELECT id, username, full_name, avatar_url, role, created_at FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    if (!users.length) return null;
    const [meta] = await db.query('SELECT * FROM member_profiles WHERE user_id = ?', [userId]);
    const profileMeta = meta[0] || { is_public: 1 };
    if (!privateView && !profileMeta.is_public) return { private: true };
    const [portfolios] = await db.query('SELECT headline, summary, skills, is_public FROM portfolios WHERE user_id = ?', [userId]);
    const portfolio = privateView || Number(portfolios[0]?.is_public) === 1 ? (portfolios[0] || {}) : {};
    let honors = [];
    try {
        [honors] = await db.query('SELECT honors.id, honors.generation, honors.joined_year, honors.position, honors.position_id, positions.position_name_th, positions.is_leader FROM honors LEFT JOIN positions ON positions.id = honors.position_id WHERE honors.user_id = ? AND honors.is_published = 1 ORDER BY honors.joined_year DESC, honors.display_order ASC', [userId]);
    } catch (error) {
        if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_FIELD_ERROR') console.warn('Profile honors metadata unavailable:', error.message);
        try { [honors] = await db.query('SELECT id, generation, joined_year, position FROM honors WHERE user_id = ? AND is_published = 1 ORDER BY joined_year DESC, display_order ASC', [userId]); } catch (fallbackError) { if (fallbackError.code !== 'ER_NO_SUCH_TABLE' && fallbackError.code !== 'ER_BAD_FIELD_ERROR') console.warn('Profile honors unavailable:', fallbackError.message); }
    }
    const [posts] = await db.query('SELECT id, content, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
    let projects = [];
    try {
        [projects] = await db.query(`SELECT p.id, p.title, p.description, p.image_url, p.project_url, p.is_public, pm.role_in_project
          FROM projects p LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
          WHERE (p.owner_user_id = ? OR pm.user_id = ?) AND p.is_public = 1 AND p.deleted_at IS NULL ORDER BY p.created_at DESC, p.id DESC LIMIT 20`, [userId, userId, userId]);
    } catch (error) { if (error.code !== 'ER_NO_SUCH_TABLE') console.warn('Profile projects unavailable:', error.message); }
    return {
        user: { id: users[0].id, username: users[0].username, fullName: users[0].full_name, avatarUrl: users[0].avatar_url, role: users[0].role },
        profile: { coverUrl: profileMeta.cover_url || '', department: profileMeta.department || '', program: profileMeta.program || '', memberType: profileMeta.member_type || 'member', graduationYear: profileMeta.graduation_year || '', generation: profileMeta.generation || '', isPublic: Boolean(profileMeta.is_public) },
        portfolio: { headline: portfolio.headline || '', summary: portfolio.summary || '', skills: portfolio.skills || [] }, honors, projects, posts
    };
}

router.get('/:userId', async (req, res) => {
    const userId = idOf(req.params.userId); if (!userId) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
    try {
        let currentUser = null;
        if (req.session?.user?.id) {
            currentUser = await loadCurrentUser(req, res);
            if (!currentUser) return;
        }
        const result = await readProfile(userId, Number(currentUser?.id) === userId || currentUser?.role === 'admin');
        if (!result || result.private) return res.status(404).json({ success: false, message: 'ไม่พบโปรไฟล์' });
        res.json({ success: true, ...result });
    }
    catch (error) { console.error(error); res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดโปรไฟล์' }); }
});

function updateProfile(asAdmin) {
    return async (req, res) => {
        const id = asAdmin ? idOf(req.params.userId) : viewerId(req);
        if (asAdmin && req.currentUser?.role !== 'admin') return res.status(403).json({ success: false, message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
        if (!id) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        try {
            const [[user]] = await db.query('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [id]);
            if (!user) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
            await require('../services/profileUpdate').saveProfile(db, id, req.body);
            res.json({ success: true, profile: await readProfile(id, true) });
        } catch (error) {
            res.status(error.status === 400 ? 400 : 500).json({ success: false, message: error.status === 400 ? error.message : 'บันทึกโปรไฟล์ไม่สำเร็จ' });
        }
    };
}
router.put('/me', requireLogin, updateProfile(false));
router.put('/:userId', requireLogin, updateProfile(true));
module.exports = router;
