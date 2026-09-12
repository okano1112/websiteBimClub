const express = require('express');
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');
const requireAdmin = require('../../middleware/requireAdmin');

const router = express.Router();
const clean = (value) => String(value || '').trim();
const parseId = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

router.get('/', async (req, res) => {
    try {
        const [positions] = await db.query(
            'SELECT id, position_name_th, position_name_en, sort_order, is_leader FROM positions WHERE active = 1 ORDER BY sort_order ASC, position_name_th ASC'
        );
        res.json({ success: true, positions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงตำแหน่ง' });
    }
});

router.get('/admin', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [positions] = await db.query('SELECT * FROM positions ORDER BY sort_order ASC, position_name_th ASC');
        res.json({ success: true, positions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงตำแหน่ง' });
    }
});

router.post('/', requireLogin, requireAdmin, async (req, res) => {
    const nameTh = clean(req.body.position_name_th || req.body.positionNameTh);
    if (!nameTh || nameTh.length > 150) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อตำแหน่งภาษาไทยไม่เกิน 150 ตัวอักษร' });
    if (['is_leader', 'active'].some(key => req.body[key] !== undefined && ![true, false, 0, 1].includes(req.body[key]))) return res.status(400).json({ success: false, message: 'สถานะตำแหน่งไม่ถูกต้อง' });
    if (!Number.isInteger(Number(req.body.sort_order ?? 0)) || Number(req.body.sort_order || 0) < 0 || Number(req.body.sort_order || 0) > 100000 || clean(req.body.position_name_en || req.body.positionNameEn).length > 150) return res.status(400).json({ success: false, message: 'ลำดับหรือชื่อภาษาอังกฤษไม่ถูกต้อง' });
    try {
        const [result] = await db.query(
            'INSERT INTO positions (position_name_th, position_name_en, sort_order, is_leader, active) VALUES (?, ?, ?, ?, ?)',
            [nameTh, clean(req.body.position_name_en || req.body.positionNameEn) || null, Number(req.body.sort_order) || 0, req.body.is_leader ? 1 : 0, req.body.active === undefined ? 1 : (req.body.active ? 1 : 0)]
        );
        const [rows] = await db.query('SELECT * FROM positions WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, position: rows[0] });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'มีตำแหน่งนี้แล้ว' });
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มตำแหน่ง' });
    }
});

router.put('/:id', requireLogin, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id);
    const nameTh = clean(req.body.position_name_th || req.body.positionNameTh);
    if (!id || !nameTh || nameTh.length > 150) return res.status(400).json({ success: false, message: 'ข้อมูลตำแหน่งไม่ถูกต้อง' });
    if (['is_leader', 'active'].some(key => req.body[key] !== undefined && ![true, false, 0, 1].includes(req.body[key]))) return res.status(400).json({ success: false, message: 'สถานะตำแหน่งไม่ถูกต้อง' });
    if (!Number.isInteger(Number(req.body.sort_order ?? 0)) || Number(req.body.sort_order || 0) < 0 || Number(req.body.sort_order || 0) > 100000 || clean(req.body.position_name_en || req.body.positionNameEn).length > 150) return res.status(400).json({ success: false, message: 'ลำดับหรือชื่อภาษาอังกฤษไม่ถูกต้อง' });
    try {
        const [result] = await db.query(
            'UPDATE positions SET position_name_th=?, position_name_en=?, sort_order=?, is_leader=?, active=? WHERE id=?',
            [nameTh, clean(req.body.position_name_en || req.body.positionNameEn) || null, Number(req.body.sort_order) || 0, req.body.is_leader ? 1 : 0, req.body.active === undefined ? 1 : (req.body.active ? 1 : 0), id]
        );
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'ไม่พบตำแหน่ง' });
        res.json({ success: true, message: 'อัปเดตตำแหน่งสำเร็จ' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'มีตำแหน่งนี้แล้ว' });
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขตำแหน่ง' });
    }
});

module.exports = router;
