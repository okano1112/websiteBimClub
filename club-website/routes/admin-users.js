const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const requireAdmin = require('../middleware/requireAdmin');
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
        const [users] = await db.query(
            `SELECT id, username, email, full_name, phone, avatar_url, role,
                    is_verified, is_banned, deleted_at, created_at
             FROM users ORDER BY created_at DESC`
        );
        res.json({ success: true, users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
    }
});

// PUT /api/admin/users/:id/role
router.put('/:id/role', requireAdmin, async (req, res) => {
    try {
        const userId = parseUserId(req.params.id);
        const role = String(req.body.role || '').trim();

        if (!userId) {
            return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        }
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: 'Role ไม่ถูกต้อง' });
        }
        if (userId === Number(req.currentUser.id)) {
            return res.status(403).json({ success: false, message: 'ไม่สามารถเปลี่ยน Role ของบัญชีตัวเองได้' });
        }

        const target = await fetchUser(userId);
        if (!target) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        res.json({
            success: true,
            message: 'เปลี่ยน Role สำเร็จ',
            user: await fetchUser(userId)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยน Role' });
    }
});

// PUT /api/admin/users/:id/profile
router.put('/:id/profile', requireAdmin, async (req, res) => {
    try {
        const userId = parseUserId(req.params.id);
        const fullName = String(req.body.fullName || req.body.full_name || '').trim();
        const phone = String(req.body.phone || '').trim();

        if (!userId) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        if (!fullName || fullName.length > 100) {
            return res.status(400).json({ success: false, message: 'ชื่อ-นามสกุลต้องมีความยาวไม่เกิน 100 ตัวอักษร' });
        }
        if (phone && !/^[0-9+\-\s()]{8,30}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' });
        }
        if (!await fetchUser(userId)) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

        await db.query('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [fullName, phone || null, userId]);
        res.json({ success: true, message: 'บันทึกข้อมูลผู้ใช้สำเร็จ', user: await fetchUser(userId) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้' });
    }
});

// PUT /api/admin/users/:id/password
router.put('/:id/password', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
        
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
        if (!userId) return res.status(400).json({ success: false, message: 'รหัสผู้ใช้ไม่ถูกต้อง' });
        
        // Prevent admin from banning themselves
        if (userId === Number(req.currentUser.id)) {
            return res.status(403).json({ success: false, message: 'ไม่สามารถแบนตัวเองได้' });
        }
        const target = await fetchUser(userId);
        if (!target) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        if (target.role === 'admin') return res.status(403).json({ success: false, message: 'ต้องเปลี่ยน Role ของผู้ดูแลก่อนระงับบัญชี' });
        
        await db.query('UPDATE users SET is_banned = ? WHERE id = ?', [isBanned ? 1 : 0, userId]);
        
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
        
        await db.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
        
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
        const userId = req.params.id;
        
        await db.query('UPDATE users SET deleted_at = NULL WHERE id = ?', [userId]);
        
        res.json({ success: true, message: 'กู้คืนผู้ใช้สำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการกู้คืนผู้ใช้' });
    }
});

module.exports = router;
