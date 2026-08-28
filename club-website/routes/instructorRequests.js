const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireLogin = require('../middleware/requireLogin');
const requireAdmin = require('../middleware/requireAdmin');

const STATUSES = ['pending', 'approved', 'rejected'];

function cleanText(value) {
    return String(value || '').trim();
}

function validateRequestPayload(req, res) {
    const faculty = cleanText(req.body.faculty);
    const fullName = cleanText(req.body.fullName || req.body.full_name);
    const phone = cleanText(req.body.phone);

    if (!faculty || !fullName || !phone) {
        res.status(400).json({ success: false, message: 'กรุณากรอก คณะ, ชื่อ และเบอร์โทรให้ครบถ้วน' });
        return null;
    }

    if (faculty.length > 200 || fullName.length > 100) {
        res.status(400).json({ success: false, message: 'ข้อมูลยาวเกินไป กรุณาย่อข้อความ' });
        return null;
    }

    if (!/^[0-9+\-\s()]{8,30}$/.test(phone)) {
        res.status(400).json({ success: false, message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' });
        return null;
    }

    return { faculty, fullName, phone };
}

function mapRequest(row) {
    return {
        id: row.id,
        userId: row.user_id,
        faculty: row.faculty,
        fullName: row.full_name,
        phone: row.phone,
        status: row.status,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewerName: row.reviewer_name || null,
        user: {
            id: row.user_id,
            username: row.username,
            email: row.email,
            avatarUrl: row.avatar_url,
            role: row.role
        }
    };
}

const SELECT_REQUESTS = `
    SELECT
        r.id, r.user_id, r.faculty, r.full_name, r.phone, r.status,
        r.reviewed_by, r.reviewed_at, r.created_at,
        u.username, u.email, u.avatar_url, u.role,
        reviewer.full_name AS reviewer_name
    FROM instructor_requests r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
`;

router.get('/me', requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query(
            `${SELECT_REQUESTS} WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 1`,
            [req.currentUser.id]
        );

        res.json({
            success: true,
            request: rows[0] ? mapRequest(rows[0]) : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงคำขอ' });
    }
});

router.post('/', requireLogin, async (req, res) => {
    try {
        if (req.currentUser.role === 'instructor') {
            return res.status(400).json({ success: false, message: 'บัญชีนี้เป็นอาจารย์อยู่แล้ว' });
        }

        if (req.currentUser.role === 'admin') {
            return res.status(400).json({ success: false, message: 'ผู้ดูแลระบบไม่ต้องขอสิทธิ์อาจารย์' });
        }

        const payload = validateRequestPayload(req, res);
        if (!payload) return;

        const [pending] = await db.query(
            `SELECT id FROM instructor_requests
             WHERE user_id = ? AND status = 'pending'
             LIMIT 1`,
            [req.currentUser.id]
        );

        if (pending.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'คุณมีคำขอที่รอการอนุมัติอยู่แล้ว'
            });
        }

        const [result] = await db.query(
            `INSERT INTO instructor_requests (user_id, faculty, full_name, phone, status)
             VALUES (?, ?, ?, ?, 'pending')`,
            [req.currentUser.id, payload.faculty, payload.fullName, payload.phone]
        );

        const [rows] = await db.query(
            `${SELECT_REQUESTS} WHERE r.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'ส่งคำขอสิทธิ์อาจารย์แล้ว รอผู้ดูแลระบบตรวจสอบ',
            request: mapRequest(rows[0])
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งคำขอ' });
    }
});

router.get('/', requireAdmin, async (req, res) => {
    try {
        const status = STATUSES.includes(req.query.status) ? req.query.status : 'pending';
        const [rows] = await db.query(
            `${SELECT_REQUESTS} WHERE r.status = ? ORDER BY r.created_at DESC`,
            [status]
        );

        const [counts] = await db.query(
            `SELECT status, COUNT(*) AS total
             FROM instructor_requests
             GROUP BY status`
        );

        const summary = { pending: 0, approved: 0, rejected: 0 };
        counts.forEach((row) => {
            summary[row.status] = Number(row.total);
        });

        res.json({
            success: true,
            status,
            summary,
            requests: rows.map(mapRequest)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการคำขอ' });
    }
});

async function reviewRequest(req, res, nextStatus) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: 'รหัสคำขอไม่ถูกต้อง' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT id, user_id, status FROM instructor_requests WHERE id = ? FOR UPDATE',
            [id]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอที่ต้องการ' });
        }

        const request = rows[0];
        if (request.status !== 'pending') {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'คำขอนี้ถูกดำเนินการไปแล้ว' });
        }

        await connection.query(
            `UPDATE instructor_requests
             SET status = ?, reviewed_by = ?, reviewed_at = NOW()
             WHERE id = ?`,
            [nextStatus, req.currentUser.id, id]
        );

        if (nextStatus === 'approved') {
            await connection.query(
                `UPDATE users SET role = 'instructor' WHERE id = ? AND role = 'user'`,
                [request.user_id]
            );
        }

        await connection.commit();

        const [updated] = await db.query(`${SELECT_REQUESTS} WHERE r.id = ?`, [id]);
        const message = nextStatus === 'approved'
            ? 'อนุมัติคำขอแล้ว ผู้ใช้เป็นอาจารย์ทันที'
            : 'ปฏิเสธคำขอแล้ว';

        res.json({
            success: true,
            message,
            request: mapRequest(updated[0])
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดำเนินการคำขอ' });
    } finally {
        connection.release();
    }
}

router.post('/:id/approve', requireAdmin, async (req, res) => {
    await reviewRequest(req, res, 'approved');
});

router.post('/:id/reject', requireAdmin, async (req, res) => {
    await reviewRequest(req, res, 'rejected');
});

module.exports = router;
