const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');

async function fetchCertificates(userId, portfolioId) {
    const [systemCerts] = await db.query(
        `SELECT cert.id, cert.certificate_code, cert.issued_via, cert.issued_at, c.title AS course_title
         FROM certificates cert
         JOIN courses c ON c.id = cert.course_id
         WHERE cert.user_id = ?
         ORDER BY cert.issued_at DESC`,
        [userId]
    );
    
    let manualCerts = [];
    if (portfolioId) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM portfolio_certificates WHERE portfolio_id = ? ORDER BY issue_date DESC',
                [portfolioId]
            );
            manualCerts = rows;
        } catch (e) {
            console.warn('portfolio_certificates table might not exist yet', e.message);
        }
    }
    
    return { system: systemCerts, manual: manualCerts };
}

async function ensurePortfolio(userId) {
    let [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
    if (portfolios.length === 0) {
        await db.query('INSERT IGNORE INTO portfolios (user_id) VALUES (?)', [userId]);
        [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
    }
    return portfolios[0];
}

// GET /me
router.get('/me', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const portfolio = await ensurePortfolio(userId);
        
        const [experiences] = await db.query(
            'SELECT * FROM portfolio_experiences WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        
        const [eduRows] = await db.query(
            'SELECT * FROM portfolio_education WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        const education = eduRows.map((edu) => ({
            ...edu,
            graduation_year: edu.end_year,
            graduationYear: edu.end_year,
            fieldOfStudy: edu.field_of_study
        }));
        
        const [projects] = await db.query(
            'SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY created_at DESC',
            [portfolio.id]
        );
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects;
        portfolio.certificates = await fetchCertificates(userId, portfolio.id);
        
        res.json({ success: true, portfolio, ...portfolio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพอร์ตโฟลิโอ' });
    }
});

// PUT /me
router.put('/me', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const { headline, summary, skills } = req.body;
        const websiteUrl = req.body.websiteUrl ?? req.body.website_url ?? null;
        const isPublicRaw = req.body.isPublic ?? req.body.is_public;
        const isPublic = isPublicRaw === true || isPublicRaw === 1 || isPublicRaw === '1' || isPublicRaw === 'true';
        
        let skillsJson = '[]';
        if (skills) {
            skillsJson = typeof skills === 'string' ? skills : JSON.stringify(skills);
        }
        
        await ensurePortfolio(userId);

        await db.query(
            'UPDATE portfolios SET headline=?, summary=?, skills=?, website_url=?, is_public=? WHERE user_id=?',
            [headline || null, summary || null, skillsJson, websiteUrl, isPublic ? 1 : 0, userId]
        );
        
        const [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
        const portfolio = portfolios[0];
        res.json({ success: true, portfolio, ...portfolio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตพอร์ตโฟลิโอ' });
    }
});

// POST /me/experiences
router.post('/me/experiences', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const { company, position, description } = req.body;
        const startDate = req.body.startDate || req.body.start_date || null;
        const endDate = req.body.endDate || req.body.end_date || null;
        
        const portfolio = await ensurePortfolio(userId);
        
        const [result] = await db.query(
            'INSERT INTO portfolio_experiences (portfolio_id, company, position, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)',
            [portfolio.id, company, position, startDate, endDate, description || null]
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
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
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
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const { institution, degree } = req.body;
        const fieldOfStudy = req.body.fieldOfStudy || req.body.field_of_study || null;
        const startYear = req.body.startYear || req.body.start_year || null;
        const endYear = req.body.endYear || req.body.end_year || req.body.graduationYear || req.body.graduation_year || null;
        
        const portfolio = await ensurePortfolio(userId);
        
        const [result] = await db.query(
            'INSERT INTO portfolio_education (portfolio_id, institution, degree, field_of_study, start_year, end_year) VALUES (?, ?, ?, ?, ?, ?)',
            [portfolio.id, institution, degree, fieldOfStudy, startYear ? Number(startYear) : null, endYear ? Number(endYear) : null]
        );
        
        const [newEdu] = await db.query('SELECT * FROM portfolio_education WHERE id = ?', [result.insertId]);
        const edu = {
            ...newEdu[0],
            graduation_year: newEdu[0].end_year,
            graduationYear: newEdu[0].end_year,
            fieldOfStudy: newEdu[0].field_of_study
        };
        res.status(201).json({ success: true, education: edu });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มประวัติการศึกษา' });
    }
});

// DELETE /me/education/:id
router.delete('/me/education/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
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

// POST /me/projects
router.post('/me/projects', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const { title, description } = req.body;
        const imageUrl = req.body.imageUrl || req.body.image_url || null;
        const projectUrl = req.body.projectUrl || req.body.project_url || null;
        
        const portfolio = await ensurePortfolio(userId);
        
        const [result] = await db.query(
            'INSERT INTO portfolio_projects (portfolio_id, title, description, image_url, project_url) VALUES (?, ?, ?, ?, ?)',
            [portfolio.id, title, description || null, imageUrl, projectUrl]
        );
        
        const [newProj] = await db.query('SELECT * FROM portfolio_projects WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, project: newProj[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มผลงานส่วนตัว' });
    }
});

// DELETE /me/projects/:id
router.delete('/me/projects/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const projId = req.params.id;
        
        const [projs] = await db.query(
            `SELECT pp.id FROM portfolio_projects pp 
            JOIN portfolios p ON pp.portfolio_id = p.id 
            WHERE pp.id = ? AND p.user_id = ?`,
            [projId, userId]
        );
        
        if (projs.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผลงานนี้' });
        }
        
        await db.query('DELETE FROM portfolio_projects WHERE id = ?', [projId]);
        res.json({ success: true, message: 'ลบผลงานสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบผลงานส่วนตัว' });
    }
});

// GET /public/:userId
router.get('/public/:userId', async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.currentUser ? req.currentUser.id : (req.session?.user?.id || null);
        const isOwner = Boolean(currentUserId && String(currentUserId) === String(targetUserId));
        
        const [portfolios] = await db.query(
            `SELECT p.*, u.full_name, u.full_name AS user_name, u.avatar_url, u.avatar_url AS user_avatar
            FROM portfolios p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.user_id = ? AND (p.is_public = 1 OR ? = 1)`,
            [targetUserId, isOwner ? 1 : 0]
        );
        
        if (portfolios.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบพอร์ตโฟลิโอนี้ หรือยังไม่เปิดเป็นสาธารณะ' });
        }
        
        const portfolio = portfolios[0];
        portfolio.is_owner = isOwner;
        
        const [experiences] = await db.query(
            'SELECT * FROM portfolio_experiences WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        
        const [eduRows] = await db.query(
            'SELECT * FROM portfolio_education WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        const education = eduRows.map((edu) => ({
            ...edu,
            graduation_year: edu.end_year,
            graduationYear: edu.end_year,
            fieldOfStudy: edu.field_of_study
        }));
        
        const [projects] = await db.query(
            'SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY created_at DESC',
            [portfolio.id]
        );
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects;
        portfolio.certificates = await fetchCertificates(targetUserId, portfolio.id);
        
        res.json({ success: true, portfolio, ...portfolio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพอร์ตโฟลิโอ' });
    }
});

// POST /me/certificates
router.post('/me/certificates', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const { title, issuer } = req.body;
        const issueDate = req.body.issueDate || req.body.issue_date || null;
        const credentialUrl = req.body.credentialUrl || req.body.credential_url || null;
        
        const portfolio = await ensurePortfolio(userId);
        
        const [result] = await db.query(
            'INSERT INTO portfolio_certificates (portfolio_id, title, issuer, issue_date, credential_url) VALUES (?, ?, ?, ?, ?)',
            [portfolio.id, title, issuer, issueDate, credentialUrl]
        );
        
        const [newCert] = await db.query('SELECT * FROM portfolio_certificates WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, certificate: newCert[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มใบรับรอง' });
    }
});

// DELETE /me/certificates/:id
router.delete('/me/certificates/:id', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const certId = req.params.id;
        
        const [certs] = await db.query(
            `SELECT pc.id FROM portfolio_certificates pc 
            JOIN portfolios p ON pc.portfolio_id = p.id 
            WHERE pc.id = ? AND p.user_id = ?`,
            [certId, userId]
        );
        
        if (certs.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบใบรับรองนี้' });
        }
        
        await db.query('DELETE FROM portfolio_certificates WHERE id = ?', [certId]);
        res.json({ success: true, message: 'ลบใบรับรองสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบใบรับรอง' });
    }
});

module.exports = router;
