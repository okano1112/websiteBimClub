const express = require('express');
const router = express.Router();
const db = require('../config/database');
const requireLogin = require('../middleware/requireLogin');

async function fetchCertificates(userId) {
    const [rows] = await db.query(
        `SELECT cert.id, cert.certificate_code, cert.issued_via, cert.issued_at, c.title AS course_title
         FROM certificates cert
         JOIN courses c ON c.id = cert.course_id
         WHERE cert.user_id = ?
         ORDER BY cert.issued_at DESC`,
        [userId]
    );
    return rows;
}

// GET /me
router.get('/me', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
        
        if (portfolios.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบพอร์ตโฟลิโอ' });
        }
        
        const portfolio = portfolios[0];
        
        const [experiences] = await db.query(
            'SELECT * FROM portfolio_experiences WHERE portfolio_id = ? ORDER BY display_order',
            [portfolio.id]
        );
        
        const [education] = await db.query(
            'SELECT * FROM portfolio_education WHERE portfolio_id = ? ORDER BY display_order',
            [portfolio.id]
        );
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.certificates = await fetchCertificates(userId);
        
        res.json({ success: true, portfolio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพอร์ตโฟลิโอ' });
    }
});

// PUT /me
router.put('/me', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { headline, summary, skills, websiteUrl, isPublic } = req.body;
        
        let skillsJson = '[]';
        if (skills) {
            skillsJson = typeof skills === 'string' ? skills : JSON.stringify(skills);
        }
        
        await db.query(
            'UPDATE portfolios SET headline=?, summary=?, skills=?, website_url=?, is_public=? WHERE user_id=?',
            [headline, summary, skillsJson, websiteUrl, isPublic ? 1 : 0, userId]
        );
        
        const [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
        res.json({ success: true, portfolio: portfolios[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตพอร์ตโฟลิโอ' });
    }
});

// POST /me/experiences
router.post('/me/experiences', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { company, position, startDate, endDate, description } = req.body;
        
        const [portfolios] = await db.query('SELECT id FROM portfolios WHERE user_id = ?', [userId]);
        const portfolioId = portfolios[0].id;
        
        const [result] = await db.query(
            'INSERT INTO portfolio_experiences (portfolio_id, company, position, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)',
            [portfolioId, company, position, startDate, endDate, description]
        );
        
        const [newExp] = await db.query('SELECT * FROM portfolio_experiences WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, experience: newExp[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มประสบการณ์' });
    }
});

// DELETE /me/experiences/:id
router.delete('/me/experiences/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const expId = req.params.id;
        
        const [exps] = await db.query(
            `SELECT pe.id FROM portfolio_experiences pe 
            JOIN portfolios p ON pe.portfolio_id = p.id 
            WHERE pe.id = ? AND p.user_id = ?`,
            [expId, userId]
        );
        
        if (exps.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบประสบการณ์นี้' });
        }
        
        await db.query('DELETE FROM portfolio_experiences WHERE id = ?', [expId]);
        res.json({ success: true, message: 'ลบประสบการณ์สำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบประสบการณ์' });
    }
});

// POST /me/education
router.post('/me/education', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { institution, degree, fieldOfStudy, startYear, endYear } = req.body;
        
        const [portfolios] = await db.query('SELECT id FROM portfolios WHERE user_id = ?', [userId]);
        const portfolioId = portfolios[0].id;
        
        const [result] = await db.query(
            'INSERT INTO portfolio_education (portfolio_id, institution, degree, field_of_study, start_year, end_year) VALUES (?, ?, ?, ?, ?, ?)',
            [portfolioId, institution, degree, fieldOfStudy, startYear, endYear]
        );
        
        const [newEdu] = await db.query('SELECT * FROM portfolio_education WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, education: newEdu[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มประวัติการศึกษา' });
    }
});

// DELETE /me/education/:id
router.delete('/me/education/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const eduId = req.params.id;
        
        const [edus] = await db.query(
            `SELECT pe.id FROM portfolio_education pe 
            JOIN portfolios p ON pe.portfolio_id = p.id 
            WHERE pe.id = ? AND p.user_id = ?`,
            [eduId, userId]
        );
        
        if (edus.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบประวัติการศึกษานี้' });
        }
        
        await db.query('DELETE FROM portfolio_education WHERE id = ?', [eduId]);
        res.json({ success: true, message: 'ลบประวัติการศึกษาสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบประวัติการศึกษา' });
    }
});

// GET /public/:userId
router.get('/public/:userId', async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        
        const [portfolios] = await db.query(
            `SELECT p.*, u.full_name, u.full_name AS user_name, u.avatar_url, u.avatar_url AS user_avatar
            FROM portfolios p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.user_id = ? AND p.is_public = 1`,
            [targetUserId]
        );
        
        if (portfolios.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบพอร์ตโฟลิโอนี้ หรือยังไม่เปิดเป็นสาธารณะ' });
        }
        
        const portfolio = portfolios[0];
        
        const [experiences] = await db.query(
            'SELECT * FROM portfolio_experiences WHERE portfolio_id = ? ORDER BY display_order',
            [portfolio.id]
        );
        
        const [education] = await db.query(
            'SELECT * FROM portfolio_education WHERE portfolio_id = ? ORDER BY display_order',
            [portfolio.id]
        );
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.certificates = await fetchCertificates(targetUserId);
        
        res.json({ success: true, portfolio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพอร์ตโฟลิโอ' });
    }
});

module.exports = router;
