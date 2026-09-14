const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');
const { loadCurrentUser } = require('../../middleware/requireRole');
const { generatePdf } = require('../services/pdfRenderer');
const { documentProjects, projectFields } = require('../services/projectData');

/**
 * BIM CLUB — PORTFOLIO SCHEMA READINESS
 * PURPOSE: Keep request handlers free of hidden DDL side effects.
 * DATA SOURCE: portfolios columns provisioned by controlled migrations.
 * DO NOT MODIFY: portfolio response compatibility or PDF templates.
 * DEPENDENCIES: controlled-p04-project-collaborators.sql; portfolio/CV tests.
 */
async function ensurePhase8Columns() {
    // Compatibility hook for existing call sites. Schema changes belong in migrations.
    return undefined;
}

async function fetchCertificates(userId, portfolioId) {
    let systemCerts = [];
    try {
        const [rows] = await db.query(
            `SELECT cert.id, cert.certificate_code, cert.issued_via, cert.issued_at, c.title AS course_title
             FROM certificates cert
             JOIN courses c ON c.id = cert.course_id
             WHERE cert.user_id = ?
             ORDER BY cert.issued_at DESC`,
            [userId]
        );
        systemCerts = rows;
    } catch (e) {
        console.warn('certificates query error:', e.message);
    }
    
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
    await ensurePhase8Columns();
    let [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
    if (portfolios.length === 0) {
        await db.query('INSERT IGNORE INTO portfolios (user_id) VALUES (?)', [userId]);
        [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
    }
    return portfolios[0];
}

function parseJsonSafe(val, fallback) {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return fallback;
    }
}

const { documentPayload: buildDocumentPayload } = require('../../public/js/portfolio-model');

// GET /me
router.get('/me', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const portfolio = await ensurePortfolio(userId);

        const [users] = await db.query('SELECT id, full_name, email, phone, avatar_url FROM users WHERE id = ?', [userId]);
        const user = users[0] || {};
        
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
        
        const projects = await documentProjects(userId, true);
        
        portfolio.user_profile = user;
        portfolio.full_name = user.full_name;
        portfolio.user_avatar = user.avatar_url;
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects.filter(project => Number(project.owner_user_id) === Number(portfolio.user_id));
        portfolio.involved_projects = projects.filter(project => Number(project.owner_user_id) !== Number(portfolio.user_id));
        portfolio.certificates = await fetchCertificates(userId, portfolio.id);
        
        // Parse JSON fields
        portfolio.skills = parseJsonSafe(portfolio.skills, []);
        portfolio.extra_sections = parseJsonSafe(portfolio.extra_sections, {});
        portfolio.portfolio_settings = parseJsonSafe(portfolio.portfolio_settings, {});
        portfolio.cv_settings = parseJsonSafe(portfolio.cv_settings, {});

        res.json({ success: true, portfolio, ...portfolio });
    } catch (error) {
        console.error('Error fetching /api/portfolios/me:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพอร์ตโฟลิโอ' });
    }
});

// PUT /me
router.put('/me', requireLogin, async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        await ensurePortfolio(userId);

        const headline = req.body.headline ?? null;
        const targetRole = req.body.targetRole ?? req.body.target_role ?? null;
        const summary = req.body.summary ?? null;
        const careerObjective = req.body.careerObjective ?? req.body.career_objective ?? null;
        const websiteUrl = req.body.websiteUrl ?? req.body.website_url ?? null;
        const isPublicRaw = req.body.isPublic ?? req.body.is_public;
        const isPublic = isPublicRaw === true || isPublicRaw === 1 || isPublicRaw === '1' || isPublicRaw === 'true';

        let skillsJson = '[]';
        if (req.body.skills !== undefined) {
            skillsJson = typeof req.body.skills === 'string' ? req.body.skills : JSON.stringify(req.body.skills);
        }

        let extraSectionsJson = null;
        if (req.body.extraSections !== undefined || req.body.extra_sections !== undefined) {
            const raw = req.body.extraSections !== undefined ? req.body.extraSections : req.body.extra_sections;
            extraSectionsJson = typeof raw === 'string' ? raw : JSON.stringify(raw);
        }

        let portfolioSettingsJson = null;
        if (req.body.portfolioSettings !== undefined || req.body.portfolio_settings !== undefined) {
            const raw = req.body.portfolioSettings !== undefined ? req.body.portfolioSettings : req.body.portfolio_settings;
            portfolioSettingsJson = typeof raw === 'string' ? raw : JSON.stringify(raw);
        }

        let cvSettingsJson = null;
        if (req.body.cvSettings !== undefined || req.body.cv_settings !== undefined) {
            const raw = req.body.cvSettings !== undefined ? req.body.cvSettings : req.body.cv_settings;
            cvSettingsJson = typeof raw === 'string' ? raw : JSON.stringify(raw);
        }

        // Build dynamic update query based on provided fields
        const updateParts = [];
        const updateValues = [];

        if (req.body.headline !== undefined) { updateParts.push('headline=?'); updateValues.push(headline); }
        if (targetRole !== null || req.body.targetRole !== undefined || req.body.target_role !== undefined) { updateParts.push('target_role=?'); updateValues.push(targetRole); }
        if (req.body.summary !== undefined) { updateParts.push('summary=?'); updateValues.push(summary); }
        if (careerObjective !== null || req.body.careerObjective !== undefined || req.body.career_objective !== undefined) { updateParts.push('career_objective=?'); updateValues.push(careerObjective); }
        if (req.body.skills !== undefined) { updateParts.push('skills=?'); updateValues.push(skillsJson); }
        if (extraSectionsJson !== null) { updateParts.push('extra_sections=?'); updateValues.push(extraSectionsJson); }
        if (portfolioSettingsJson !== null) { updateParts.push('portfolio_settings=?'); updateValues.push(portfolioSettingsJson); }
        if (cvSettingsJson !== null) { updateParts.push('cv_settings=?'); updateValues.push(cvSettingsJson); }
        if (req.body.websiteUrl !== undefined || req.body.website_url !== undefined) { updateParts.push('website_url=?'); updateValues.push(websiteUrl); }
        if (isPublicRaw !== undefined) { updateParts.push('is_public=?'); updateValues.push(isPublic ? 1 : 0); }

        if (updateParts.length > 0) {
            updateValues.push(userId);
            await db.query(`UPDATE portfolios SET ${updateParts.join(', ')} WHERE user_id=?`, updateValues);
        }

        const [portfolios] = await db.query('SELECT * FROM portfolios WHERE user_id = ?', [userId]);
        const portfolio = portfolios[0] || {};
        
        portfolio.skills = parseJsonSafe(portfolio.skills, []);
        portfolio.extra_sections = parseJsonSafe(portfolio.extra_sections, {});
        portfolio.portfolio_settings = parseJsonSafe(portfolio.portfolio_settings, {});
        portfolio.cv_settings = parseJsonSafe(portfolio.cv_settings, {});

        res.json({ success: true, portfolio, ...portfolio });
    } catch (error) {
        console.error('Error updating portfolio:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตพอร์ตโฟลิโอ' });
    }
});

// POST & GET /me/export/pdf (Download PDF for authenticated owner)
const handlePdfExportMe = async (req, res) => {
    try {
        const userId = req.currentUser ? req.currentUser.id : req.session.user.id;
        const portfolio = await ensurePortfolio(userId);

        const [users] = await db.query('SELECT id, full_name, email, phone, avatar_url FROM users WHERE id = ?', [userId]);
        const user = users[0] || {};

        const [experiences] = await db.query(
            'SELECT * FROM portfolio_experiences WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        const [education] = await db.query(
            'SELECT * FROM portfolio_education WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        const projects = await documentProjects(userId, true);
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects.filter(project => Number(project.owner_user_id) === Number(portfolio.user_id));
        portfolio.involved_projects = projects.filter(project => Number(project.owner_user_id) !== Number(portfolio.user_id));
        portfolio.certificates = await fetchCertificates(userId, portfolio.id);

        const overrides = req.method === 'POST' ? req.body : req.query;
        const payload = buildDocumentPayload(portfolio, user, overrides);

        const pdfBuffer = await generatePdf(payload);

        const cleanName = (user.full_name || 'user').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
        const docName = payload.settings.docType === 'cv' ? 'CV' : 'Portfolio';
        const filename = `${cleanName}_${docName}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Export PDF error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ' + err.message });
    }
};

router.post('/me/export/pdf', requireLogin, handlePdfExportMe);
router.get('/me/export/pdf', requireLogin, handlePdfExportMe);

// GET /public/:userId/export/pdf (Download PDF from public profile)
router.get('/public/:userId/export/pdf', async (req, res) => {
    try {
        if (req.session?.user?.id && !await loadCurrentUser(req, res)) return;
        const targetUserId = req.params.userId;
        const currentUserId = req.currentUser ? req.currentUser.id : (req.session?.user?.id || null);
        const isOwner = Boolean(currentUserId && String(currentUserId) === String(targetUserId));

        const [portfolios] = await db.query(
            `SELECT p.*, u.full_name, u.email, u.phone, u.avatar_url
             FROM portfolios p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ? AND (p.is_public = 1 OR ? = 1)`,
            [targetUserId, isOwner ? 1 : 0]
        );

        if (portfolios.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบพอร์ตโฟลิโอนี้ หรือยังไม่เปิดเผยแพร่เป็นสาธารณะ' });
        }

        const portfolio = portfolios[0];
        const user = {
            id: portfolio.user_id,
            full_name: portfolio.full_name,
            email: portfolio.email,
            phone: portfolio.phone,
            avatar_url: portfolio.avatar_url
        };

        const [experiences] = await db.query(
            'SELECT * FROM portfolio_experiences WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        const [education] = await db.query(
            'SELECT * FROM portfolio_education WHERE portfolio_id = ? ORDER BY display_order ASC, id ASC',
            [portfolio.id]
        );
        const projects = await documentProjects(targetUserId, isOwner);

        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects.filter(project => Number(project.owner_user_id) === Number(portfolio.user_id));
        portfolio.involved_projects = projects.filter(project => Number(project.owner_user_id) !== Number(portfolio.user_id));
        portfolio.certificates = await fetchCertificates(targetUserId, portfolio.id);

        const overrides = req.query || {};
        const payload = buildDocumentPayload(portfolio, user, overrides);

        const pdfBuffer = await generatePdf(payload);

        const cleanName = (user.full_name || 'user').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
        const docName = payload.settings.docType === 'cv' ? 'CV' : 'Portfolio';
        const filename = `${cleanName}_${docName}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Public PDF Export error:', err);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF' });
    }
});

// GET /public/:userId
router.get('/public/:userId', async (req, res) => {
    try {
        await ensurePhase8Columns();
        if (req.session?.user?.id && !await loadCurrentUser(req, res)) return;
        const targetUserId = req.params.userId;
        const currentUserId = req.currentUser ? req.currentUser.id : (req.session?.user?.id || null);
        const isOwner = Boolean(currentUserId && String(currentUserId) === String(targetUserId));
        
        const [portfolios] = await db.query(
            `SELECT p.*, u.full_name, u.full_name AS user_name, u.avatar_url, u.avatar_url AS user_avatar, u.email, u.phone
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
        
        const projects = await documentProjects(targetUserId, isOwner);
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects.filter(project => Number(project.owner_user_id) === Number(portfolio.user_id));
        portfolio.involved_projects = projects.filter(project => Number(project.owner_user_id) !== Number(portfolio.user_id));
        portfolio.certificates = await fetchCertificates(targetUserId, portfolio.id);
        
        portfolio.skills = parseJsonSafe(portfolio.skills, []);
        portfolio.extra_sections = parseJsonSafe(portfolio.extra_sections, {});
        portfolio.portfolio_settings = parseJsonSafe(portfolio.portfolio_settings, {});
        portfolio.cv_settings = parseJsonSafe(portfolio.cv_settings, {});

        res.json({ success: true, portfolio, ...portfolio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพอร์ตโฟลิโอ' });
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
// Stable legacy IDs remain mapped to canonical projects; the legacy table is an archive.
router.post('/me/projects', requireLogin, async (req, res) => {
    let conn;
    try {
        const userId = req.currentUser.id;
        const portfolio = await ensurePortfolio(userId);
        let fields; try { fields = projectFields({ ...req.body, is_public: req.body.is_public ?? !!portfolio.is_public }); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
        conn = await db.getConnection(); await conn.beginTransaction();
        const [result] = await conn.query('INSERT INTO projects (owner_user_id, title, description, image_url, project_url, is_public) VALUES (?, ?, ?, ?, ?, ?)', [userId, fields.title, fields.description, fields.image_url, fields.project_url, fields.is_public]);
        const [link] = await conn.query('INSERT INTO project_legacy_links (project_id) VALUES (?)', [result.insertId]);
        await conn.commit();
        res.status(201).json({ success: true, project: { id: link.insertId, canonical_project_id: result.insertId, ...fields } });
    } catch (error) { if (conn) await conn.rollback(); console.error(error); res.status(500).json({ success: false, message: 'เพิ่มผลงานไม่สำเร็จ' }); }
    finally { if (conn) conn.release(); }
});

// Old bookmarked clients retain legacy-ID delete semantics through the mapping table.
router.delete('/me/projects/:id', requireLogin, async (req, res) => {
    try {
        const [result] = await db.query(`UPDATE projects p JOIN project_legacy_links l ON l.project_id = p.id
          SET p.deleted_at = CURRENT_TIMESTAMP WHERE l.legacy_portfolio_project_id = ? AND p.owner_user_id = ? AND p.deleted_at IS NULL`, [req.params.id, req.currentUser.id]);
        if (!result.affectedRows) return res.status(404).json({ success: false, message: 'ไม่พบผลงานนี้' });
        res.json({ success: true, message: 'ซ่อนผลงานแล้ว' });
    } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'ซ่อนผลงานไม่สำเร็จ' }); }
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
