const express = require('express');
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');
const requireAdmin = require('../../middleware/requireAdmin');

const router = express.Router();
const { transferToAlumni } = require('../services/alumniTransfer');

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function clean(value) { return String(value || '').trim(); }

function validatePayload(body) {
    const fullName = clean(body.full_name || body.fullName);
    const role = clean(body.role);
    const teamYear = clean(body.team_year || body.teamYear);
    const profileImage = clean(body.profile_image || body.profileImage);
    if (!fullName || !teamYear) return { error: 'กรุณากรอกชื่อและปีทีมงาน' };
    if (profileImage && !profileImage.startsWith('/uploads/')) return { error: 'รูปภาพต้องอัปโหลดผ่านระบบเท่านั้น' };
    return {
        fullName,
        nickname: clean(body.nickname) || null,
        role: role || null,
        teamYear,
        bio: clean(body.bio) || null,
        profileImage: profileImage || null,
        displayOrder: Number.isInteger(Number(body.display_order)) ? Number(body.display_order) : 0,
        isPublished: body.is_published === undefined ? 1 : (body.is_published ? 1 : 0)
    };
}

router.get('/', async (req, res) => {
    try {
        const year = clean(req.query.year);
        const params = [];
        let sql = 'SELECT * FROM team_members WHERE is_published = 1 AND alumni_honor_id IS NULL';
        if (year) { sql += ' AND team_year = ?'; params.push(year); }
        sql += ' ORDER BY team_year DESC, display_order ASC, id ASC';
        const [members] = await db.query(sql, params);
        const team = members.map((member) => ({ ...member, generation: member.team_year === '2024' ? '1' : null }));
        res.json({ success: true, team, years: [...new Set(team.map((member) => member.team_year))] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลทีมงาน' });
    }
});

router.get('/admin', requireLogin, requireAdmin, async (req, res) => {
    const [members] = await db.query('SELECT * FROM team_members WHERE alumni_honor_id IS NULL ORDER BY team_year DESC, display_order ASC, id ASC');
    res.json({ success: true, team: members });
});

router.post('/', requireLogin, requireAdmin, async (req, res) => {
    try {
        const payload = validatePayload(req.body);
        if (payload.error) return res.status(400).json({ success: false, message: payload.error });
        const [result] = await db.query(
            `INSERT INTO team_members (full_name, nickname, role, team_year, bio, profile_image, display_order, is_published)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [payload.fullName, payload.nickname, payload.role, payload.teamYear, payload.bio, payload.profileImage, payload.displayOrder, payload.isPublished]
        );
        const [rows] = await db.query('SELECT * FROM team_members WHERE id = ? AND alumni_honor_id IS NULL', [result.insertId]);
        res.status(201).json({ success: true, member: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มทีมงาน' });
    }
});

router.post('/:id/alumni', requireLogin, requireAdmin, async (req,res) => {
    const id=parseId(req.params.id);if(!id)return res.status(400).json({success:false,message:'รหัสไม่ถูกต้อง'});
    let conn;
    try {conn=await db.getConnection();await conn.beginTransaction();const honorId=await transferToAlumni(conn,id);await conn.commit();res.json({success:true,honorId});}
    catch(error){if(conn)await conn.rollback();res.status(409).json({success:false,message:error.message});}
    finally{conn?.release();}
});

router.put('/:id', requireLogin, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'รหัสทีมงานไม่ถูกต้อง' });
    try {
        const [existingRows] = await db.query('SELECT * FROM team_members WHERE id = ? AND alumni_honor_id IS NULL', [id]);
        if (!existingRows.length) return res.status(404).json({ success: false, message: 'ไม่พบทีมงาน' });
        const existing = existingRows[0];
        const merged = { ...existing, ...req.body };
        const payload = validatePayload(merged);
        if (payload.error) return res.status(400).json({ success: false, message: payload.error });
        const [result] = await db.query(
            `UPDATE team_members SET full_name=?, nickname=?, role=?, team_year=?, bio=?, profile_image=?, display_order=?, is_published=? WHERE id=?`,
            [payload.fullName, payload.nickname, payload.role, payload.teamYear, payload.bio, payload.profileImage, payload.displayOrder, payload.isPublished, id]
        );
        res.json({ success: true, message: 'อัปเดตทีมงานสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขทีมงาน' });
    }
});

router.delete('/:id', requireLogin, requireAdmin, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'รหัสทีมงานไม่ถูกต้อง' });
    await db.query('DELETE FROM team_members WHERE id = ? AND alumni_honor_id IS NULL', [id]);
    res.json({ success: true, message: 'ลบทีมงานสำเร็จ' });
});

module.exports = router;
