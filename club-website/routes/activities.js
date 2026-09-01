const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireLogin = require('../middleware/requireLogin');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/activities
router.get('/', async (req, res) => {
    try {
        const [activities] = await db.query('SELECT * FROM activities ORDER BY created_at DESC');
        res.json({ success: true, activities });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม' });
    }
});

// POST /api/activities
router.post('/', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { title, description, event_date, start_date, end_date, participants, image_url } = req.body;
        const [result] = await db.query(
            'INSERT INTO activities (title, description, event_date, start_date, end_date, participants, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, event_date, start_date || null, end_date || null, participants || 0, image_url]
        );
        const [newActivity] = await db.query('SELECT * FROM activities WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, activity: newActivity[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มกิจกรรม' });
    }
});

// PUT /api/activities/:id
router.put('/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { title, description, event_date, start_date, end_date, participants, image_url } = req.body;
        await db.query(
            'UPDATE activities SET title=?, description=?, event_date=?, start_date=?, end_date=?, participants=?, image_url=? WHERE id=?',
            [title, description, event_date, start_date || null, end_date || null, participants, image_url, req.params.id]
        );
        res.json({ success: true, message: 'อัปเดตกิจกรรมสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขกิจกรรม' });
    }
});

// DELETE /api/activities/:id
router.delete('/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM activities WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบกิจกรรมสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบกิจกรรม' });
    }
});

module.exports = router;
