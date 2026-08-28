const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireLogin = require('../middleware/requireLogin');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/achievements
router.get('/', async (req, res) => {
    try {
        const [achievements] = await db.query('SELECT * FROM achievements ORDER BY created_at DESC');
        for (let ach of achievements) {
            const [images] = await db.query('SELECT * FROM achievement_images WHERE achievement_id = ? ORDER BY display_order', [ach.id]);
            ach.images = images;
        }
        res.json({ success: true, achievements });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผลงาน' });
    }
});

// POST /api/achievements
router.post('/', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { title, category, description, team_size, project_year, imageUrls } = req.body; // imageUrls is array of objects {url, caption}
        const [result] = await db.query(
            'INSERT INTO achievements (title, category, description, team_size, project_year) VALUES (?, ?, ?, ?, ?)',
            [title, category, description, team_size, project_year]
        );
        const achId = result.insertId;
        
        if (imageUrls && imageUrls.length > 0) {
            for (let i = 0; i < imageUrls.length; i++) {
                await db.query(
                    'INSERT INTO achievement_images (achievement_id, image_url, caption, display_order) VALUES (?, ?, ?, ?)',
                    [achId, imageUrls[i].url || imageUrls[i], imageUrls[i].caption || '', i]
                );
            }
        }
        res.status(201).json({ success: true, message: 'เพิ่มผลงานสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มผลงาน' });
    }
});

// DELETE /api/achievements/:id
router.delete('/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM achievements WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'ลบผลงานสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบผลงาน' });
    }
});

module.exports = router;
