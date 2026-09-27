const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const requireAdmin = require('../../middleware/requireAdmin');
const { parseUpdate, updateAdminUser } = require('../services/adminUserUpdate');
const ALLOWED_ROLES = ['user', 'instructor', 'admin'];

function parseUserId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function fetchUser(id) {
    const [users] = await db.query(
        `SELECT id, username, email, full_name, phone, avatar_url, role,
                is_verified, is_banned, deleted_at, created_at
         FROM users WHERE id = ?`,
        [id]
    );
    return users[0] || null;
}

// GET /api/admin/users
router.get('/', requireAdmin, async (req, res) => {
    try {
        const paginated = true;
        const pageRequested = Math.max(1, Math.floor(Number.isFinite(Number(req.query.page)) ? Number(req.query.page) || 1 : 1));
        const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 20)));
        const conditions = [], params = [];
        const q = String(req.query.q || '').trim().slice(0, 100);
        if (q) { conditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)'); params.push(...Array(3).fill(`%${q}%`)); }
        if (req.query.scope === 'members') conditions.push("role <> 'admin'");
        if (ALLOWED_ROLES.includes(req.query.role)) { conditions.push('role = ?'); params.push(req.query.role); }
        const statuses = {
            deleted: 'deleted_at IS NOT NULL', banned: 'deleted_at IS NULL AND is_banned = 1',
            unverified: 'deleted_at IS NULL AND is_banned = 0 AND is_verified = 0',
            active: 'deleted_at IS NULL AND is_banned = 0 AND is_verified = 1'
        };
        if (Object.hasOwn(statuses, req.query.status)) conditions.push(statuses[req.query.status]);
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const sortOrders = { name: "COALESCE(NULLIF(full_name, ''), username) ASC, id ASC", role: 'role ASC, id ASC' };
        const order = Object.hasOwn(sortOrders, req.query.sort) ? sortOrders[req.query.sort] : 'created_at DESC, id DESC';
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
        const pages = Math.max(1, Math.ceil(Number(total) / limit));
        const page = Math.min(pageRequested, pages);
        const [users] = await db.query(
            `SELECT id, username, email, full_name, phone, avatar_url, role,
                    is_verified, is_banned, deleted_at, created_at
             FROM users ${where} ORDER BY ${order}${paginated ? ' LIMIT ? OFFSET ?' : ''}`,
            paginated ? [...params, limit, (page - 1) * limit] : params
        );
        res.json({ success: true, users, ...(paginated ? { pagination: { page, limit, total: Number(total), pages } } : {}) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
});

// Bounded selector endpoint for Admin collaborator tagging; never returns credentials or recovery data.
router.get('/search', requireAdmin, async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (!q) return res.json({ success: true, users: [] });
    try {
        const [users] = await db.query(
            `SELECT id, full_name, username, avatar_url FROM users
             WHERE deleted_at IS NULL AND is_banned = 0 AND is_verified = 1 AND (full_name LIKE ? OR username LIKE ?)
             ORDER BY full_name ASC LIMIT 20`, [`%${q}%`, `%${q}%`]
        );
        res.json({ success: true, users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'ค้นหาสมาชิกไม่สำเร็จ' });
    }
});

function editUser(profile) {
    return async (req, res) => {
        try {
            const id = parseUserId(req.params.id);
            if (!id) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
            const value = parseUpdate(req.body, profile);
            await updateAdminUser(db, req.currentUser.id, id, value);
            res.json({ success: true, message: 'บันทึกข้อมูลผู้ใช้งานสำเร็จ', user: await fetchUser(id) });
        } catch (error) {
            const status = [400, 403, 404, 409].includes(error.status) ? error.status : 500;
            res.status(status).json({ success: false, message: status === 500 ? 'บันทึกข้อมูลผู้ใช้ไม่สำเร็จ' : error.message });
        }
    };
}
router.put('/:id/role', requireAdmin, editUser(false));
router.put('/:id/profile', requireAdmin, editUser(true));

// PUT /api/admin/users/:id/password
router.put('/:id/password', requireAdmin, async (req, res) => {
    try {
        const userId = parseUserId(req.params.id);
        if (!userId) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        if (!await fetchUser(userId)) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        const { newPassword } = req.body;
        
        if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashedPassword, userId]);
        
        res.json({ success: true, message: 'อัปเดตรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตรหัสผ่าน' });
    }
});

// PUT /api/admin/users/:id/ban
router.put('/:id/ban', requireAdmin, async (req, res) => {
    try {
        const userId = parseUserId(req.params.id);
        const { isBanned } = req.body;
        if (typeof isBanned !== 'boolean') return res.status(400).json({ success: false, message: 'สถานะระงับบัญชีต้องเป็น true หรือ false' });
        if (!userId) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        
        // Prevent admin from banning themselves
        if (userId === Number(req.currentUser.id)) {
            return res.status(403).json({ success: false, message: 'ไม่สามารถแบนตัวเองได้' });
        }
        const target = await fetchUser(userId);
        if (!target) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        if (target.role === 'admin') return res.status(403).json({ success: false, message: 'ต้องเปลี่ยน Role ของผู้ดูแลก่อนระงับบัญชี' });
        
        const [result] = await db.query("UPDATE users SET is_banned = ? WHERE id = ? AND role <> 'admin'", [isBanned ? 1 : 0, userId]);
        if (!result.affectedRows) return res.status(409).json({ success: false, message: 'ข้อมูลบัญชีเปลี่ยนแปลง กรุณาโหลดหน้าใหม่' });
        
        res.json({ success: true, message: isBanned ? 'แบนผู้ใช้สำเร็จ' : 'ปลดแบนผู้ใช้สำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการจัดการแบน' });
    }
});

// DELETE /api/admin/users/:id
// Soft delete user
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseUserId(req.params.id);
        if (!userId) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        
        // Prevent admin from deleting themselves
        if (userId === Number(req.currentUser.id)) {
            return res.status(403).json({ success: false, message: 'ไม่สามารถลบบัญชีตัวเองได้' });
        }
        const target = await fetchUser(userId);
        if (!target) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        if (target.role === 'admin') return res.status(403).json({ success: false, message: 'ต้องเปลี่ยน Role ของผู้ดูแลก่อนลบบัญชี' });
        
        const [result] = await db.query("UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND role <> 'admin'", [userId]);
        if (!result.affectedRows) return res.status(409).json({ success: false, message: 'ข้อมูลบัญชีเปลี่ยนแปลง กรุณาโหลดหน้าใหม่' });
        
        res.json({ success: true, message: 'ลบผู้ใช้สำเร็จ (Soft Delete)' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบผู้ใช้' });
    }
});

// PUT /api/admin/users/:id/restore
// Restore soft deleted user
router.put('/:id/restore', requireAdmin, async (req, res) => {
    try {
        const userId = parseUserId(req.params.id);
        if (!userId) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        if (!await fetchUser(userId)) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        
        await db.query('UPDATE users SET deleted_at = NULL WHERE id = ?', [userId]);
        
        res.json({ success: true, message: 'กู้คืนผู้ใช้สำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการกู้คืนผู้ใช้' });
    }
});

module.exports = router;
