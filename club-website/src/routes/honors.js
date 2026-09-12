const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');
const requireAdmin = require('../../middleware/requireAdmin');

const parseOptionalId = (value) => value === undefined || value === null || value === '' ? null : (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null);
const selectHonor = `SELECT h.*, p.position_name_th, p.position_name_en, p.is_leader, p.sort_order AS position_order,
    u.username AS linked_username, u.full_name AS linked_full_name
    FROM honors h LEFT JOIN positions p ON p.id = h.position_id LEFT JOIN users u ON u.id = h.user_id`;

async function hasDuplicateAssignment(userId, joinedYear, excludeId = null) {
    if (!userId || !String(joinedYear || '').trim()) return false;
    const params = [userId, String(joinedYear).trim()];
    let sql = 'SELECT id FROM honors WHERE user_id = ? AND joined_year = ?';
    if (excludeId) { sql += ' AND id <> ?'; params.push(excludeId); }
    const [rows] = await db.query(sql, params);
    return rows.length > 0;
}

// GET /api/honors - ดึงข้อมูลเกียรติยศทั้งหมด (เฉพาะที่เผยแพร่) สำหรับหน้า Public
router.get('/', async (req, res) => {
    try {
        const [honors] = await db.query(`${selectHonor} WHERE h.is_published = 1 ORDER BY COALESCE(p.sort_order, 2147483647) ASC, h.display_order ASC, h.id ASC`);
        res.json({ success: true, honors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลเกียรติยศ' });
    }
});

// GET /api/honors/admin - ดึงข้อมูลทั้งหมด สำหรับ Admin
router.get('/admin', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [honors] = await db.query(`${selectHonor} ORDER BY COALESCE(p.sort_order, 2147483647) ASC, h.display_order ASC, h.id ASC`);
        res.json({ success: true, honors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

// GET /api/honors/:id - ดึงข้อมูลรายบุคคล
router.get('/:id', async (req, res) => {
    try {
        const [honors] = await db.query(`${selectHonor} WHERE h.id = ?`, [req.params.id]);
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
        const { name, nickname, generation, position, position_id, user_id, profile_image, achievement, description, current_position, joined_year, display_order, is_published } = req.body;
        if (!String(name || '').trim()) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ' });
        if (position_id !== undefined && position_id !== null && position_id !== '' && !parseOptionalId(position_id)) return res.status(400).json({ success: false, message: 'ตำแหน่งไม่ถูกต้อง' });
        if (user_id !== undefined && user_id !== null && user_id !== '' && !parseOptionalId(user_id)) return res.status(400).json({ success: false, message: 'บัญชีผู้ใช้ไม่ถูกต้อง' });
        if (parseOptionalId(position_id)) {
            const [[catalog]] = await db.query('SELECT id, active FROM positions WHERE id = ?', [position_id]);
            let retained = false;
            if (req.params.id) {
                const [[previous]] = await db.query('SELECT position_id FROM honors WHERE id = ?', [req.params.id]);
                retained = Number(previous?.position_id) === Number(position_id);
            }
            if (!catalog || (!catalog.active && !retained)) return res.status(400).json({ success: false, message: 'ตำแหน่งนี้ไม่เปิดให้เลือก กรุณาเลือกตำแหน่งที่ใช้งานอยู่' });
        }
        if (await hasDuplicateAssignment(parseOptionalId(user_id), joined_year)) return res.status(409).json({ success: false, message: 'บุคคลนี้มีตำแหน่งในปีนี้แล้ว' });
        if (profile_image && !String(profile_image).startsWith('/uploads/')) {
            return res.status(400).json({ success: false, message: 'รูปภาพต้องอัปโหลดผ่านระบบเท่านั้น' });
        }
        const [result] = await db.query(
            `INSERT INTO honors (name, nickname, generation, position, position_id, user_id, profile_image, achievement, description, current_position, joined_year, display_order, is_published)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, nickname || null, generation || null, position || null, parseOptionalId(position_id), parseOptionalId(user_id), profile_image || null, achievement || null, description || null, current_position || null, joined_year || null, display_order || 0, is_published !== undefined ? is_published : 1]
        );
        const [newHonor] = await db.query(`${selectHonor} WHERE h.id = ?`, [result.insertId]);
        res.status(201).json({ success: true, honor: newHonor[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' });
    }
});

// PUT /api/honors/:id - แก้ไขข้อมูล
router.put('/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { name, nickname, generation, position, position_id, user_id, profile_image, achievement, description, current_position, joined_year, display_order, is_published } = req.body;
        if (!String(name || '').trim()) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ' });
        if (position_id !== undefined && position_id !== null && position_id !== '' && !parseOptionalId(position_id)) return res.status(400).json({ success: false, message: 'ตำแหน่งไม่ถูกต้อง' });
        if (user_id !== undefined && user_id !== null && user_id !== '' && !parseOptionalId(user_id)) return res.status(400).json({ success: false, message: 'บัญชีผู้ใช้ไม่ถูกต้อง' });
        if (parseOptionalId(position_id)) {
            const [[catalog]] = await db.query('SELECT id, active FROM positions WHERE id = ?', [position_id]);
            let retained = false;
            if (req.params.id) {
                const [[previous]] = await db.query('SELECT position_id FROM honors WHERE id = ?', [req.params.id]);
                retained = Number(previous?.position_id) === Number(position_id);
            }
            if (!catalog || (!catalog.active && !retained)) return res.status(400).json({ success: false, message: 'ตำแหน่งนี้ไม่เปิดให้เลือก กรุณาเลือกตำแหน่งที่ใช้งานอยู่' });
        }
        if (await hasDuplicateAssignment(parseOptionalId(user_id), joined_year, req.params.id)) return res.status(409).json({ success: false, message: 'บุคคลนี้มีตำแหน่งในปีนี้แล้ว' });
        if (profile_image && !String(profile_image).startsWith('/uploads/')) {
            return res.status(400).json({ success: false, message: 'รูปภาพต้องอัปโหลดผ่านระบบเท่านั้น' });
        }
        await db.query(
            `UPDATE honors SET name=?, nickname=?, generation=?, position=?, position_id=?, user_id=?, profile_image=?, achievement=?, description=?, current_position=?, joined_year=?, display_order=?, is_published=? WHERE id=?`,
            [name, nickname || null, generation || null, position || null, parseOptionalId(position_id), parseOptionalId(user_id), profile_image || null, achievement || null, description || null, current_position || null, joined_year || null, display_order || 0, is_published !== undefined ? is_published : 1, req.params.id]
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
