const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireAdmin = require('../middleware/requireAdmin');

const SECTIONS = {
    activities: {
        label: 'กิจกรรม',
        itemKey: 'activity',
        listKey: 'activities'
    },
    achievements: {
        label: 'ผลงาน',
        itemKey: 'achievement',
        listKey: 'achievements'
    }
};

function getSection(req, res) {
    const section = SECTIONS[req.params.section];
    if (!section) {
        res.status(404).json({ success: false, message: 'ไม่พบประเภทเนื้อหาที่ต้องการจัดการ' });
        return null;
    }
    return section;
}

function cleanText(value) {
    return String(value || '').trim();
}

function validatePayload(req, res) {
    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const imageUrl = cleanText(req.body.imageUrl || req.body.image_url);

    if (!title) {
        res.status(400).json({ success: false, message: 'กรุณากรอกหัวข้อ' });
        return null;
    }

    if (!description) {
        res.status(400).json({ success: false, message: 'กรุณากรอกรายละเอียด' });
        return null;
    }

    if (imageUrl && !imageUrl.startsWith('/uploads/') && !imageUrl.startsWith('../../../assets/')) {
        res.status(400).json({ success: false, message: 'รูปภาพต้องเป็นไฟล์ที่อัปโหลดผ่านระบบหรือรูปภาพเดิมของเว็บไซต์' });
        return null;
    }

    return { title, description, imageUrl: imageUrl || null };
}

async function fetchActivities() {
    const [rows] = await db.query(
        `SELECT id, title, description, image_url, created_at
         FROM activities
         ORDER BY created_at DESC`
    );
    return rows;
}

async function fetchAchievements() {
    const [rows] = await db.query(
        `SELECT a.id, a.title, a.description, ai.image_url, a.created_at
         FROM achievements a
         LEFT JOIN achievement_images ai
           ON ai.id = (
             SELECT id FROM achievement_images
             WHERE achievement_id = a.id
             ORDER BY display_order ASC, id ASC
             LIMIT 1
           )
         ORDER BY a.created_at DESC`
    );
    return rows;
}

async function fetchItem(sectionName, id) {
    if (sectionName === 'activities') {
        const [rows] = await db.query(
            'SELECT id, title, description, image_url, created_at FROM activities WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    const [rows] = await db.query(
        `SELECT a.id, a.title, a.description, ai.image_url, a.created_at
         FROM achievements a
         LEFT JOIN achievement_images ai
           ON ai.id = (
             SELECT id FROM achievement_images
             WHERE achievement_id = a.id
             ORDER BY display_order ASC, id ASC
             LIMIT 1
           )
         WHERE a.id = ?`,
        [id]
    );
    return rows[0];
}

router.get('/:section', requireAdmin, async (req, res) => {
    try {
        const section = getSection(req, res);
        if (!section) return;

        const items = req.params.section === 'activities'
            ? await fetchActivities()
            : await fetchAchievements();

        res.json({ success: true, [section.listKey]: items, items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

router.post('/:section', requireAdmin, async (req, res) => {
    try {
        const section = getSection(req, res);
        if (!section) return;

        const payload = validatePayload(req, res);
        if (!payload) return;

        if (req.params.section === 'activities') {
            const [result] = await db.query(
                `INSERT INTO activities (title, description, event_date, participants, image_url)
                 VALUES (?, ?, '', 0, ?)`,
                [payload.title, payload.description, payload.imageUrl]
            );
            const item = await fetchItem(req.params.section, result.insertId);
            return res.status(201).json({
                success: true,
                message: `เพิ่ม${section.label}สำเร็จ`,
                [section.itemKey]: item,
                item
            });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.query(
                `INSERT INTO achievements (title, category, description, team_size, project_year)
                 VALUES (?, 'ผลงาน', ?, '', YEAR(CURDATE()))`,
                [payload.title, payload.description]
            );

            if (payload.imageUrl) {
                await connection.query(
                    `INSERT INTO achievement_images (achievement_id, image_url, caption, display_order)
                     VALUES (?, ?, '', 0)`,
                    [result.insertId, payload.imageUrl]
                );
            }

            await connection.commit();
            const item = await fetchItem(req.params.section, result.insertId);
            return res.status(201).json({
                success: true,
                message: `เพิ่ม${section.label}สำเร็จ`,
                [section.itemKey]: item,
                item
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' });
    }
});

router.put('/:section/:id', requireAdmin, async (req, res) => {
    try {
        const section = getSection(req, res);
        if (!section) return;

        const payload = validatePayload(req, res);
        if (!payload) return;

        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'รหัสข้อมูลไม่ถูกต้อง' });
        }

        if (req.params.section === 'activities') {
            const [result] = await db.query(
                'UPDATE activities SET title = ?, description = ?, image_url = ? WHERE id = ?',
                [payload.title, payload.description, payload.imageUrl, id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'ไม่พบกิจกรรมที่ต้องการแก้ไข' });
            }
            const item = await fetchItem(req.params.section, id);
            return res.json({
                success: true,
                message: `แก้ไข${section.label}สำเร็จ`,
                [section.itemKey]: item,
                item
            });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.query(
                'UPDATE achievements SET title = ?, description = ? WHERE id = ?',
                [payload.title, payload.description, id]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'ไม่พบผลงานที่ต้องการแก้ไข' });
            }

            await connection.query('DELETE FROM achievement_images WHERE achievement_id = ?', [id]);
            if (payload.imageUrl) {
                await connection.query(
                    `INSERT INTO achievement_images (achievement_id, image_url, caption, display_order)
                     VALUES (?, ?, '', 0)`,
                    [id, payload.imageUrl]
                );
            }

            await connection.commit();
            const item = await fetchItem(req.params.section, id);
            return res.json({
                success: true,
                message: `แก้ไข${section.label}สำเร็จ`,
                [section.itemKey]: item,
                item
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
    }
});

router.delete('/:section/:id', requireAdmin, async (req, res) => {
    try {
        const section = getSection(req, res);
        if (!section) return;

        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ success: false, message: 'รหัสข้อมูลไม่ถูกต้อง' });
        }

        const table = req.params.section === 'activities' ? 'activities' : 'achievements';
        const [result] = await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: `ไม่พบ${section.label}ที่ต้องการลบ` });
        }

        res.json({ success: true, message: `ลบ${section.label}สำเร็จ` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
});

module.exports = router;
