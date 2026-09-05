const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireLogin = require('../middleware/requireLogin');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/honors - ดึงข้อมูลเกียรติยศทั้งหมด (เฉพาะที่เผยแพร่) สำหรับหน้า Public
router.get('/', async (req, res) => {
    try {
        const [honors] = await db.query('SELECT * FROM honors WHERE is_published = 1 ORDER BY display_order ASC, created_at DESC');
        res.json({ success: true, honors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเกียรติยศ' });
    }
});

// GET /api/honors/admin - ดึงข้อมูลทั้งหมด สำหรับ Admin
router.get('/admin', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [honors] = await db.query('SELECT * FROM honors ORDER BY display_order ASC, created_at DESC');
        res.json({ success: true, honors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

// GET /api/honors/:id - ดึงข้อมูลรายบุคคล
router.get('/:id', async (req, res) => {
    try {
        const [honors] = await db.query('SELECT * FROM honors WHERE id = ?', [req.params.id]);
        if (honors.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
        }
        // ถ้าผู้ใช้ทั่วไปเรียกดู ต้องเช็คว่าเปิดเผยแพร่หรือไม่
        if (!req.session?.user || req.session.user.role !== 'admin') {
            if (honors[0].is_published === 0) {
                return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
            }
        }
        res.json({ success: true, honor: honors[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/honors - เพิ่มข้อมูล
router.post('/', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { name, nickname, generation, position, profile_image, achievement, description, current_position, joined_year, display_order, is_published } = req.body;
        if (!String(name || '').trim()) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ' });
        if (profile_image && !String(profile_image).startsWith('/uploads/')) {
            return res.status(400).json({ success: false, message: 'รูปภาพต้องอัปโหลดผ่านระบบเท่านั้น' });
        }
        const [result] = await db.query(
            `INSERT INTO honors (name, nickname, generation, position, profile_image, achievement, description, current_position, joined_year, display_order, is_published) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, nickname || null, generation || null, position || null, profile_image || null, achievement || null, description || null, current_position || null, joined_year || null, display_order || 0, is_published !== undefined ? is_published : 1]
        );
        const [newHonor] = await db.query('SELECT * FROM honors WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, honor: newHonor[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' });
    }
});

// PUT /api/honors/:id - แก้ไขข้อมูล
router.put('/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { name, nickname, generation, position, profile_image, achievement, description, current_position, joined_year, display_order, is_published } = req.body;
        if (!String(name || '').trim()) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ' });
        if (profile_image && !String(profile_image).startsWith('/uploads/')) {
            return res.status(400).json({ success: false, message: 'รูปภาพต้องอัปโหลดผ่านระบบเท่านั้น' });
        }
        await db.query(
            `UPDATE honors SET name=?, nickname=?, generation=?, position=?, profile_image=?, achievement=?, description=?, current_position=?, joined_year=?, display_order=?, is_published=? WHERE id=?`,
            [name, nickname || null, generation || null, position || null, profile_image || null, achievement || null, description || null, current_position || null, joined_year || null, display_order || 0, is_published !== undefined ? is_published : 1, req.params.id]
        );
        res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
    }
});

// DELETE /api/honors/:id - ลบข้อมูล
router.delete('/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM honors WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
});

module.exports = router;
