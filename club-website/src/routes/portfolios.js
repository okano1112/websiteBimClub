const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const requireLogin = require('../../middleware/requireLogin');
const { generatePdf } = require('../services/pdfRenderer');

let columnsChecked = false;
async function ensurePhase8Columns() {
    if (columnsChecked) return;
    try {
        const [cols] = await db.query('SHOW COLUMNS FROM portfolios');
        const colNames = cols.map(c => c.Field);
        if (!colNames.includes('target_role')) {
            await db.query('ALTER TABLE portfolios ADD COLUMN target_role VARCHAR(150) DEFAULT NULL AFTER headline');
        }
        if (!colNames.includes('career_objective')) {
            await db.query('ALTER TABLE portfolios ADD COLUMN career_objective TEXT DEFAULT NULL AFTER summary');
        }
        if (!colNames.includes('extra_sections')) {
            await db.query('ALTER TABLE portfolios ADD COLUMN extra_sections JSON DEFAULT NULL AFTER skills');
        }
        if (!colNames.includes('portfolio_settings')) {
            await db.query('ALTER TABLE portfolios ADD COLUMN portfolio_settings JSON DEFAULT NULL');
        }
        if (!colNames.includes('cv_settings')) {
            await db.query('ALTER TABLE portfolios ADD COLUMN cv_settings JSON DEFAULT NULL');
        }
        columnsChecked = true;
    } catch (e) {
        console.warn('Auto-migration check for phase 8 columns:', e.message);
    }
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

function buildDocumentPayload(portfolio, user, overrides = {}) {
    const docType = overrides.docType || overrides.type || 'portfolio';
    const savedSettings = docType === 'cv' 
        ? parseJsonSafe(portfolio.cv_settings, {})
        : parseJsonSafe(portfolio.portfolio_settings, {});

    const extraSections = parseJsonSafe(portfolio.extra_sections, {
        internships: [],
        awards: [],
        activities: [],
        languages: [],
        publications: [],
        volunteer: [],
        references: [],
        sectionStates: {}
    });

    const settings = {
        docType: docType,
        template: overrides.template || savedSettings.template || (docType === 'cv' ? 'cv-a4-standard' : 'maroon-editorial'),
        pageSize: overrides.pageSize || savedSettings.pageSize || 'a4',
        orientation: overrides.orientation || savedSettings.orientation || 'portrait',
        theme: {
            primary: overrides.theme?.primary || savedSettings.theme?.primary || '#012240',
            secondary: overrides.theme?.secondary || savedSettings.theme?.secondary || '#AD0F0F',
            bg: overrides.theme?.bg || savedSettings.theme?.bg || 'white',
            textColor: overrides.theme?.textColor || savedSettings.theme?.textColor,
            accentColor: overrides.theme?.accentColor || savedSettings.theme?.accentColor
        },
        branding: {
            showSoeLogo: overrides.branding?.showSoeLogo ?? savedSettings.branding?.showSoeLogo ?? true,
            showBimClubLogo: overrides.branding?.showBimClubLogo ?? savedSettings.branding?.showBimClubLogo ?? true,
            soeLogoUrl: overrides.branding?.soeLogoUrl || savedSettings.branding?.soeLogoUrl || '',
            bimClubLogoUrl: overrides.branding?.bimClubLogoUrl || savedSettings.branding?.bimClubLogoUrl || '',
            footerStyle: overrides.branding?.footerStyle || savedSettings.branding?.footerStyle || 'footer-bar',
            scope: overrides.branding?.scope || savedSettings.branding?.scope || 'all',
            logoSize: overrides.branding?.logoSize || savedSettings.branding?.logoSize || 'medium',
            institutionText: overrides.branding?.institutionText || savedSettings.branding?.institutionText || 'BimClub Official Accredited • Faculty of Engineering'
        },
        hiddenSections: overrides.hiddenSections || savedSettings.hiddenSections || [],
        language: overrides.language || savedSettings.language || 'th'
    };

    return {
        profile: {
            fullName: user.full_name || user.fullName || 'สมาชิก BimClub',
            headline: portfolio.headline || '',
            targetRole: portfolio.target_role || '',
            summary: portfolio.summary || '',
            careerObjective: portfolio.career_objective || '',
            avatarUrl: user.avatar_url || '',
            email: user.email || '',
            phone: user.phone || '',
            websiteUrl: portfolio.website_url || '',
            customLinks: extraSections.custom_contacts || []
        },
        skills: parseJsonSafe(portfolio.skills, []),
        experiences: portfolio.experiences || [],
        education: portfolio.education || [],
        projects: portfolio.projects || [],
        certificates: portfolio.certificates || { system: [], manual: [] },
        extraSections: extraSections,
        settings: settings
    };
}

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
        
        const [projects] = await db.query(
            'SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY created_at DESC',
            [portfolio.id]
        );
        
        portfolio.user_profile = user;
        portfolio.full_name = user.full_name;
        portfolio.user_avatar = user.avatar_url;
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects;
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
        const [projects] = await db.query(
            'SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY created_at DESC',
            [portfolio.id]
        );
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects;
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
        const [projects] = await db.query(
            'SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY created_at DESC',
            [portfolio.id]
        );

        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects;
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
        
        const [projects] = await db.query(
            'SELECT * FROM portfolio_projects WHERE portfolio_id = ? ORDER BY created_at DESC',
            [portfolio.id]
        );
        
        portfolio.experiences = experiences;
        portfolio.education = education;
        portfolio.projects = projects;
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
