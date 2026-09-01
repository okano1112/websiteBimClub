const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/admin/users
router.get('/', requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, email, full_name, role, is_banned, deleted_at, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' });
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
        const userId = req.params.id;
        const { isBanned } = req.body;
        
        // Prevent admin from banning themselves
        if (parseInt(userId) === req.session.user.id) {
            return res.status(403).json({ success: false, message: 'ไม่สามารถแบนตัวเองได้' });
        }
        
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
        const userId = req.params.id;
        
        // Prevent admin from deleting themselves
        if (parseInt(userId) === req.session.user.id) {
            return res.status(403).json({ success: false, message: 'ไม่สามารถลบบัญชีตัวเองได้' });
        }
        
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
