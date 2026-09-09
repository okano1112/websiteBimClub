/**
 * BimClub Portfolio & CV Template Renderer
 * Supports:
 * - 6 Portfolio Templates: maroon-editorial, navy-professional, modern-grid, minimal-a4, a3-landscape-showcase, institutional-bimclub
 * - 5 CV Templates: cv-a4-standard, cv-a4-ats, cv-letter-standard, cv-a4-landscape-creative, cv-a3-presentation
 * - Paper sizes: A4, A3, Letter (Portrait / Landscape)
 * - Dynamic themes (Primary #012240, Secondary #AD0F0F, backgrounds, contrast check)
 * - Institutional branding (SOE bottom-left, BimClub bottom-right, customizable)
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PortfolioTemplates = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {

    // Helper: Escape HTML
    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Format Date Range
    function formatDateRange(start, end, isCurrent, lang) {
        if (!start) return '';
        const isThai = lang !== 'en';
        const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        function formatPart(s) {
            if (!s) return '';
            if (s instanceof Date) {
                s = s.toISOString().substring(0, 10);
            }
            const parts = String(s).split('-');
            if (parts.length >= 2) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                if (isThai) {
                    return `${monthsTh[m] || parts[1]} ${y + 543}`;
                } else {
                    return `${monthsEn[m] || parts[1]} ${y}`;
                }
            }
            return s;
        }

        const sStr = formatPart(start);
        if (isCurrent || !end) {
            return `${sStr} - ${isThai ? 'ปัจจุบัน' : 'Present'}`;
        }
        const eStr = formatPart(end);
        return `${sStr} - ${eStr}`;
    }

    // Color contrast calculation (WCAG 2.1)
    function hexToRgb(hex) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function getLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getContrastRatio(hex1, hex2) {
        try {
            const rgb1 = hexToRgb(hex1);
            const rgb2 = hexToRgb(hex2);
            const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
            const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            return (brightest + 0.05) / (darkest + 0.05);
        } catch (e) {
            return 21; // fallback
        }
    }

    // Paper dimensions
    const PAPER_SIZES = {
        a4: { portrait: { w: '210mm', h: '297mm' }, landscape: { w: '297mm', h: '210mm' } },
        a3: { portrait: { w: '297mm', h: '420mm' }, landscape: { w: '420mm', h: '297mm' } },
        letter: { portrait: { w: '8.5in', h: '11in' }, landscape: { w: '11in', h: '8.5in' } }
    };

    // Background themes
    const BG_THEMES = {
        white: { bg: '#FFFFFF', cardBg: '#F8FAFC', text: '#0F172A', mutedText: '#475569', border: '#E2E8F0' },
        cream: { bg: '#FDFBF7', cardBg: '#F5EFE6', text: '#292524', mutedText: '#57534E', border: '#E7DFD5' },
        light_gray: { bg: '#F8FAFC', cardBg: '#FFFFFF', text: '#0F172A', mutedText: '#64748B', border: '#E2E8F0' },
        dark: { bg: '#0A0F1D', cardBg: '#131B2E', text: '#F8FAFC', mutedText: '#94A3B8', border: '#1E293B' }
    };

    /**
     * Render Branding Footer/Header
     */
    function renderBranding(branding, theme, position, isCover) {
        if (!branding || branding.footerStyle === 'hidden') return '';
        if (branding.scope === 'cover-only' && !isCover) return '';
        if (branding.scope === 'cover-footer' && !isCover && position !== 'footer') return '';

        const soeUrl = branding.soeLogoUrl || '/assets/img/logobranding/soe-logo.svg';
        const bimUrl = branding.bimClubLogoUrl || '/assets/img/logobranding/logobim.png';
        const showSoe = branding.showSoeLogo !== false;
        const showBim = branding.showBimClubLogo !== false;
        const instText = branding.institutionText || 'BimClub Official Accredited • Faculty of Engineering';

        let heightPx = 36;
        if (branding.logoSize === 'small') heightPx = 26;
        if (branding.logoSize === 'large') heightPx = 48;

        const styleType = branding.footerStyle || 'footer-bar';

        let barStyle = '';
        if (styleType === 'footer-bar') {
            barStyle = `background: ${theme.primary}12; border-top: 1.5px solid ${theme.primary}33;`;
        } else if (styleType === 'top-bar') {
            barStyle = `background: ${theme.primary}; color: #FFFFFF; border-bottom: 2px solid ${theme.secondary};`;
        } else {
            // transparent
            barStyle = 'background: transparent;';
        }

        return `
        <div class="doc-branding-bar doc-branding-${position} doc-branding-${styleType}" style="${barStyle}">
            <div class="branding-col branding-left">
                ${showSoe ? `<img src="${esc(soeUrl)}" alt="SOE Logo" class="branding-logo soe-logo" style="height: ${heightPx}px; object-fit: contain;">` : ''}
            </div>
            <div class="branding-col branding-center">
                <span class="branding-text" style="font-size: 11px; opacity: 0.85; font-weight: 500;">${esc(instText)}</span>
            </div>
            <div class="branding-col branding-right">
                ${showBim ? `<img src="${esc(bimUrl)}" alt="BimClub Logo" class="branding-logo bim-logo" style="height: ${heightPx}px; object-fit: contain;">` : ''}
            </div>
        </div>
        `;
    }

    /**
     * Master CSS styles for documents & templates
     */
    function getDocumentStyles(payload) {
        const settings = payload.settings || {};
        const sizeKey = settings.pageSize || 'a4';
        const orient = settings.orientation || 'portrait';
        const dim = (PAPER_SIZES[sizeKey] && PAPER_SIZES[sizeKey][orient]) || PAPER_SIZES.a4.portrait;
        
        const theme = settings.theme || {};
        const primary = theme.primary || '#012240';
        const secondary = theme.secondary || '#AD0F0F';
        const bgType = theme.bg || 'white';
        const bgConf = BG_THEMES[bgType] || BG_THEMES.white;
        const textColor = theme.textColor || bgConf.text;
        const accent = theme.accentColor || secondary;

        return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Thai:wght@300;400;500;600;700;800&display=swap');

            @page {
                size: ${dim.w} ${dim.h};
                margin: 0;
            }

            :root {
                --doc-w: ${dim.w};
                --doc-h: ${dim.h};
                --theme-primary: ${primary};
                --theme-secondary: ${secondary};
                --theme-accent: ${accent};
                --theme-bg: ${bgConf.bg};
                --theme-card-bg: ${bgConf.cardBg};
                --theme-text: ${textColor};
                --theme-muted: ${bgConf.mutedText};
                --theme-border: ${bgConf.border};
            }

            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            body.doc-body {
                margin: 0;
                padding: 0;
                background-color: #E2E8F0;
                font-family: 'Noto Sans Thai', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                color: var(--theme-text);
                -webkit-font-smoothing: antialiased;
            }

            .doc-page {
                width: var(--doc-w);
                height: var(--doc-h);
                min-height: var(--doc-h);
                background-color: var(--theme-bg);
                position: relative;
                margin: 0 auto 20px auto;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                display: block;
                page-break-after: always;
                break-after: page;
                overflow: hidden;
            }

            @media print {
                body.doc-body {
                    background: transparent;
                }
                .doc-page {
                    margin: 0;
                    box-shadow: none;
                    width: 100% !important;
                    min-height: var(--doc-h) !important;
                    height: var(--doc-h) !important;
                    page-break-after: always;
                    break-after: page;
                }
            }

            .doc-page-content {
                min-height: 100%;
                padding: 36px 44px;
                padding-bottom: 82px !important;
            }

            /* Branding Bar */
            .doc-branding-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 44px;
                gap: 16px;
                position: absolute;
                left: 0;
                right: 0;
                z-index: 5;
                min-height: 56px;
            }
            .doc-branding-footer { bottom: 0; }
            .doc-branding-top { top: 0; }
            .doc-branding-top + .doc-page-content { padding-top: 82px !important; }
            .branding-col {
                display: flex;
                align-items: center;
            }
            .branding-left { justify-content: flex-start; }
            .branding-center { justify-content: center; text-align: center; }
            .branding-right { justify-content: flex-end; }

            /* Universal Sections */
            .section-title-wrap {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 24px 0 14px 0;
                border-bottom: 2px solid var(--theme-primary);
                padding-bottom: 6px;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .section-title-wrap h2 {
                font-size: 17px;
                font-weight: 700;
                color: var(--theme-primary);
                margin: 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .section-title-badge {
                font-size: 10px;
                padding: 2px 8px;
                background: var(--theme-secondary);
                color: #FFFFFF;
                border-radius: 999px;
                font-weight: 600;
            }

            /* Items list */
            .entry-item {
                margin-bottom: 14px;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .entry-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 8px;
            }
            .entry-role {
                font-size: 14px;
                font-weight: 700;
                color: var(--theme-text);
            }
            .entry-date {
                font-size: 11px;
                font-weight: 600;
                color: var(--theme-secondary);
                white-space: nowrap;
            }
            .entry-company {
                font-size: 12.5px;
                font-weight: 600;
                color: var(--theme-muted);
                margin-bottom: 4px;
            }
            .entry-desc {
                font-size: 12px;
                color: var(--theme-text);
                line-height: 1.55;
                margin: 0;
                opacity: 0.9;
            }

            /* Skills Pills */
            .skills-wrap {
                display: flex;
                flex-wrap: wrap;
                gap: 7px;
                margin-top: 6px;
            }
            .skill-badge {
                font-size: 11.5px;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 6px;
                background: var(--theme-card-bg);
                color: var(--theme-primary);
                border: 1px solid var(--theme-border);
            }

            /* Projects Grid */
            .projects-doc-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-top: 10px;
            }
            .project-doc-card {
                background: var(--theme-card-bg);
                border: 1px solid var(--theme-border);
                border-radius: 8px;
                overflow: hidden;
                page-break-inside: avoid;
                break-inside: avoid;
                display: flex;
                flex-direction: column;
            }
            .project-doc-img {
                width: 100%;
                height: 120px;
                object-fit: cover;
                background: #01224010;
            }
            .project-doc-body {
                padding: 12px;
                flex: 1;
            }
            .project-doc-title {
                font-size: 13.5px;
                font-weight: 700;
                color: var(--theme-primary);
                margin: 0 0 4px 0;
            }
            .project-doc-desc {
                font-size: 11.5px;
                color: var(--theme-muted);
                line-height: 1.45;
                margin: 0;
            }

            /* Certificates Official */
            .certs-doc-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-top: 8px;
            }
            .cert-doc-card {
                padding: 10px 12px;
                border-radius: 6px;
                border-left: 3px solid var(--theme-secondary);
                background: var(--theme-card-bg);
                font-size: 11.5px;
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .cert-doc-title {
                font-weight: 700;
                font-size: 12.5px;
                color: var(--theme-text);
                margin-bottom: 2px;
            }
            .cert-doc-issuer {
                color: var(--theme-secondary);
                font-weight: 600;
                font-size: 11px;
            }

            /* ATS Template specific reset */
            .ats-document {
                font-family: 'Times New Roman', 'Noto Sans Thai', serif !important;
                color: #000000 !important;
            }
            .ats-document .doc-page {
                background: #FFFFFF !important;
            }
            .ats-document .section-title-wrap {
                border-bottom: 1.5px solid #000000 !important;
            }
            .ats-document .section-title-wrap h2 {
                color: #000000 !important;
                font-family: inherit !important;
            }
            .ats-document .skill-badge {
                border: none !important;
                background: none !important;
                padding: 0 !important;
                color: #000000 !important;
            }
            .ats-document .skill-badge::after {
                content: " • ";
            }
            .ats-document .skill-badge:last-child::after {
                content: "";
            }

            /* Maroon Editorial Specific */
            .maroon-cover-hero {
                background: linear-gradient(135deg, var(--theme-primary) 0%, #031424 50%, var(--theme-secondary) 100%);
                color: #FFFFFF;
                padding: 48px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 480px;
                border-radius: 12px;
                position: relative;
                overflow: hidden;
            }
            .maroon-cover-hero::after {
                content: "";
                position: absolute;
                right: -60px;
                top: -60px;
                width: 240px;
                height: 240px;
                background: radial-gradient(circle, var(--theme-secondary) 0%, transparent 70%);
                opacity: 0.35;
                pointer-events: none;
            }
            .maroon-cover-tag {
                display: inline-block;
                padding: 4px 12px;
                background: rgba(255,255,255,0.15);
                border-left: 3px solid var(--theme-secondary);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin-bottom: 16px;
                backdrop-filter: blur(4px);
            }
            .maroon-cover-name {
                font-size: 34px;
                font-weight: 800;
                line-height: 1.15;
                margin: 0 0 8px 0;
            }
            .maroon-cover-role {
                font-size: 18px;
                font-weight: 500;
                color: #CBD5E1;
                margin: 0 0 20px 0;
            }
            .maroon-cover-contacts {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                font-size: 12px;
                color: #E2E8F0;
                border-top: 1px solid rgba(255,255,255,0.2);
                padding-top: 16px;
            }

            /* A3 Landscape specific */
            .a3-landscape-content {
                display: grid;
                grid-template-columns: 320px 1fr;
                gap: 28px;
            }
            .a3-showcase-gallery {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
            }
        </style>
        `;
    }

    /**
     * Check if section is visible / not hidden
     */
    function isSectionVisible(payload, sectionKey) {
        const settings = payload.settings || {};
        const hiddenList = settings.hiddenSections || [];
        if (hiddenList.includes(sectionKey)) return false;

        const extra = payload.extraSections || {};
        const states = extra.sectionStates || {};
        if (states[sectionKey] === 'hidden') return false;

        return true;
    }

    /**
     * Common Section Renderers
     */
    function renderSectionTitle(title, enTitle, badge, lang) {
        const displayTitle = lang === 'en' ? (enTitle || title) : title;
        return `
        <div class="section-title-wrap">
            <h2>${esc(displayTitle)}</h2>
            ${badge ? `<span class="section-title-badge">${esc(badge)}</span>` : ''}
        </div>
        `;
    }

    function renderAboutMe(payload, lang) {
        if (!isSectionVisible(payload, 'about')) return '';
        const summary = payload.profile && payload.profile.summary;
        if (!summary) return '';
        return `
        <div class="doc-section doc-section-about">
            ${renderSectionTitle('ข้อมูลสังเขป / สรุปประวัติ', 'About Me / Professional Summary', null, lang)}
            <p class="entry-desc" style="font-size: 12.5px; line-height: 1.6;">${esc(summary).replace(/\n/g, '<br>')}</p>
        </div>
        `;
    }

    function renderCareerObjective(payload, lang) {
        if (!isSectionVisible(payload, 'objective')) return '';
        const obj = (payload.profile && payload.profile.careerObjective) || (payload.career_objective);
        if (!obj) return '';
        return `
        <div class="doc-section doc-section-objective">
            ${renderSectionTitle('เป้าหมายทางวิชาชีพ', 'Career Objective', null, lang)}
            <p class="entry-desc" style="font-size: 12.5px; line-height: 1.6;">${esc(obj).replace(/\n/g, '<br>')}</p>
        </div>
        `;
    }

    function renderSkills(payload, lang) {
        if (!isSectionVisible(payload, 'skills')) return '';
        let skills = payload.skills || [];
        if (typeof skills === 'string') {
            try { skills = JSON.parse(skills); } catch(e) { skills = []; }
        }
        if (!skills || skills.length === 0) return '';

        return `
        <div class="doc-section doc-section-skills">
            ${renderSectionTitle('ทักษะและความเชี่ยวชาญ', 'Skills & Competencies', `${skills.length}`, lang)}
            <div class="skills-wrap">
                ${skills.map(s => `<span class="skill-badge">${esc(s)}</span>`).join('')}
            </div>
        </div>
        `;
    }

    function renderExperiences(payload, lang) {
        if (!isSectionVisible(payload, 'experiences')) return '';
        const exps = payload.experiences || [];
        if (!exps || exps.length === 0) return '';

        return `
        <div class="doc-section doc-section-exp">
            ${renderSectionTitle('ประสบการณ์การทำงาน', 'Work Experience', null, lang)}
            ${exps.map(exp => `
                <div class="entry-item">
                    <div class="entry-header">
                        <span class="entry-role">${esc(exp.position)}</span>
                        <span class="entry-date">${formatDateRange(exp.start_date || exp.startDate, exp.end_date || exp.endDate, !exp.end_date && !exp.endDate, lang)}</span>
                    </div>
                    <div class="entry-company">${esc(exp.company)}</div>
                    ${exp.description ? `<p class="entry-desc">${esc(exp.description).replace(/\n/g, '<br>')}</p>` : ''}
                </div>
            `).join('')}
        </div>
        `;
    }

    function renderEducation(payload, lang) {
        if (!isSectionVisible(payload, 'education')) return '';
        const edus = payload.education || [];
        if (!edus || edus.length === 0) return '';

        return `
        <div class="doc-section doc-section-edu">
            ${renderSectionTitle('ประวัติการศึกษา', 'Education', null, lang)}
            ${edus.map(edu => {
                const year = edu.graduation_year || edu.end_year || edu.endYear || '';
                return `
                <div class="entry-item">
                    <div class="entry-header">
                        <span class="entry-role">${esc(edu.degree || edu.institution)}</span>
                        <span class="entry-date">${year ? `${lang === 'en' ? 'Class of ' : 'ปี '}${year}` : ''}</span>
                    </div>
                    <div class="entry-company">${esc(edu.institution)} ${edu.field_of_study || edu.fieldOfStudy ? `• ${esc(edu.field_of_study || edu.fieldOfStudy)}` : ''}</div>
                </div>
                `;
            }).join('')}
        </div>
        `;
    }

    function renderProjects(payload, lang) {
        if (!isSectionVisible(payload, 'projects')) return '';
        const projs = payload.projects || [];
        if (!projs || projs.length === 0) return '';

        return `
        <div class="doc-section doc-section-projects">
            ${renderSectionTitle('ผลงานและโครงการเด่น', 'Featured Projects', `${projs.length}`, lang)}
            <div class="projects-doc-grid">
                ${projs.map(proj => `
                    <div class="project-doc-card">
                        ${proj.image_url || proj.imageUrl ? `<img src="${esc(proj.image_url || proj.imageUrl)}" alt="${esc(proj.title)}" class="project-doc-img">` : ''}
                        <div class="project-doc-body">
                            <h3 class="project-doc-title">${esc(proj.title)}</h3>
                            <p class="project-doc-desc">${esc(proj.description || '').replace(/\n/g, '<br>')}</p>
                            ${proj.project_url || proj.projectUrl ? `<div style="margin-top:6px; font-size:10.5px; font-weight:600; color:var(--theme-secondary);">${esc(proj.project_url || proj.projectUrl)}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    }

    function renderCertificates(payload, lang) {
        if (!isSectionVisible(payload, 'certificates')) return '';
        const certs = payload.certificates || { system: [], manual: [] };
        const system = certs.system || [];
        const manual = certs.manual || [];
        if (system.length === 0 && manual.length === 0) return '';

        return `
        <div class="doc-section doc-section-certs">
            ${renderSectionTitle('ใบรับรองและวุฒิบัตรมาตรฐาน', 'Certifications & Credentials', null, lang)}
            <div class="certs-doc-grid">
                ${system.map(sc => `
                    <div class="cert-doc-card" style="border-left-color: #012240;">
                        <div class="cert-doc-title">✓ ${esc(sc.course_title || 'BimClub Certified')}</div>
                        <div class="cert-doc-issuer">BimClub Verified • Code: ${esc(sc.certificate_code || '-')}</div>
                    </div>
                `).join('')}
                ${manual.map(mc => `
                    <div class="cert-doc-card">
                        <div class="cert-doc-title">${esc(mc.title)}</div>
                        <div class="cert-doc-issuer">${esc(mc.issuer)} • ${mc.issue_date ? (mc.issue_date instanceof Date ? mc.issue_date.toISOString().substring(0,10) : String(mc.issue_date).substring(0,10)) : ''}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
    }

    function renderExtraSections(payload, lang) {
        const extra = payload.extraSections || {};
        let html = '';

        // Internships
        if (isSectionVisible(payload, 'internships') && extra.internships && extra.internships.length > 0) {
            html += `
            <div class="doc-section doc-section-internships">
                ${renderSectionTitle('ประสบการณ์ฝึกงาน / สหกิจศึกษา', 'Internships & Co-op', null, lang)}
                ${extra.internships.map(item => `
                    <div class="entry-item">
                        <div class="entry-header">
                            <span class="entry-role">${esc(item.role || item.position)}</span>
                            <span class="entry-date">${esc(item.period || item.date)}</span>
                        </div>
                        <div class="entry-company">${esc(item.company || item.organization)}</div>
                        ${item.description ? `<p class="entry-desc">${esc(item.description)}</p>` : ''}
                    </div>
                `).join('')}
            </div>`;
        }

        // Awards
        if (isSectionVisible(payload, 'awards') && extra.awards && extra.awards.length > 0) {
            html += `
            <div class="doc-section doc-section-awards">
                ${renderSectionTitle('รางวัลและความสำเร็จ', 'Honors & Awards', null, lang)}
                ${extra.awards.map(item => `
                    <div class="entry-item">
                        <div class="entry-header">
                            <span class="entry-role">${esc(item.title)}</span>
                            <span class="entry-date">${esc(item.year || '')}</span>
                        </div>
                        <div class="entry-company">${esc(item.issuer || '')}</div>
                        ${item.description ? `<p class="entry-desc">${esc(item.description)}</p>` : ''}
                    </div>
                `).join('')}
            </div>`;
        }

        // Activities
        if (isSectionVisible(payload, 'activities') && extra.activities && extra.activities.length > 0) {
            html += `
            <div class="doc-section doc-section-activities">
                ${renderSectionTitle('กิจกรรมและการเป็นผู้นำ', 'Activities & Leadership', null, lang)}
                ${extra.activities.map(item => `
                    <div class="entry-item">
                        <div class="entry-header">
                            <span class="entry-role">${esc(item.title)}</span>
                            <span class="entry-date">${esc(item.year || '')}</span>
                        </div>
                        <div class="entry-company">${esc(item.role || '')}</div>
                        ${item.description ? `<p class="entry-desc">${esc(item.description)}</p>` : ''}
                    </div>
                `).join('')}
            </div>`;
        }

        // Languages
        if (isSectionVisible(payload, 'languages') && extra.languages && extra.languages.length > 0) {
            html += `
            <div class="doc-section doc-section-languages">
                ${renderSectionTitle('ทักษะด้านภาษา', 'Languages', null, lang)}
                <div class="skills-wrap">
                    ${extra.languages.map(item => `
                        <span class="skill-badge" style="background:var(--theme-primary)10; color:var(--theme-primary);">
                            <strong>${esc(item.language)}</strong>: ${esc(item.level)}
                        </span>
                    `).join('')}
                </div>
            </div>`;
        }

        // Publications
        if (isSectionVisible(payload, 'publications') && extra.publications && extra.publications.length > 0) {
            html += `
            <div class="doc-section doc-section-publications">
                ${renderSectionTitle('งานวิจัยและบทความตีพิมพ์', 'Publications & Research', null, lang)}
                ${extra.publications.map(item => `
                    <div class="entry-item">
                        <div class="entry-header">
                            <span class="entry-role">${esc(item.title)}</span>
                            <span class="entry-date">${esc(item.year || '')}</span>
                        </div>
                        <div class="entry-company">${esc(item.publisher || '')} ${item.url ? `• <a href="${esc(item.url)}" target="_blank">${esc(item.url)}</a>` : ''}</div>
                        ${item.description ? `<p class="entry-desc">${esc(item.description)}</p>` : ''}
                    </div>
                `).join('')}
            </div>`;
        }

        // Volunteer
        if (isSectionVisible(payload, 'volunteer') && extra.volunteer && extra.volunteer.length > 0) {
            html += `
            <div class="doc-section doc-section-volunteer">
                ${renderSectionTitle('งานจิตอาสาและกิจกรรมเพื่อสังคม', 'Volunteer Experience', null, lang)}
                ${extra.volunteer.map(item => `
                    <div class="entry-item">
                        <div class="entry-header">
                            <span class="entry-role">${esc(item.role)}</span>
                            <span class="entry-date">${esc(item.period || '')}</span>
                        </div>
                        <div class="entry-company">${esc(item.organization || '')}</div>
                        ${item.description ? `<p class="entry-desc">${esc(item.description)}</p>` : ''}
                    </div>
                `).join('')}
            </div>`;
        }

        // References
        if (isSectionVisible(payload, 'references') && extra.references && extra.references.length > 0) {
            html += `
            <div class="doc-section doc-section-references">
                ${renderSectionTitle('บุคคลอ้างอิง', 'References', null, lang)}
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px;">
                    ${extra.references.map(item => `
                        <div class="entry-item" style="background:var(--theme-card-bg); padding:10px; border-radius:6px; border:1px solid var(--theme-border);">
                            <div class="entry-role">${esc(item.name)}</div>
                            <div class="entry-company">${esc(item.title || '')} • ${esc(item.organization || '')}</div>
                            <div class="entry-desc" style="font-size:11px; margin-top:4px;">${esc(item.contact || '')}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        return html;
    }

    /**
     * TEMPLATE 1: Maroon Editorial (Portfolio)
     */
    function renderMaroonEditorial(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = payload.settings?.branding || {};
        const theme = payload.settings?.theme || {};

        return `
        <!-- Page 1: Editorial Cover -->
        <div class="doc-page">
            <div class="doc-page-content" style="display:flex; flex-direction:column; justify-content:center;">
                <div class="maroon-cover-hero">
                    <span class="maroon-cover-tag">PROFESSIONAL PORTFOLIO</span>
                    <h1 class="maroon-cover-name">${esc(profile.fullName || 'ชื่อ นามสกุล')}</h1>
                    <div class="maroon-cover-role">${esc(profile.targetRole || profile.headline || 'BIM Engineer & Computational Designer')}</div>
                    
                    <div class="maroon-cover-contacts">
                        ${profile.email ? `<span>✉ ${esc(profile.email)}</span>` : ''}
                        ${profile.phone ? `<span>✆ ${esc(profile.phone)}</span>` : ''}
                        ${profile.websiteUrl ? `<span>🌐 ${esc(profile.websiteUrl)}</span>` : ''}
                    </div>
                </div>

                <div style="margin-top: 32px;">
                    ${renderAboutMe(payload, lang)}
                    ${renderCareerObjective(payload, lang)}
                    ${renderSkills(payload, lang)}
                </div>
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>

        <!-- Page 2: Experience & Projects -->
        <div class="doc-page">
            <div class="doc-page-content">
                ${renderExperiences(payload, lang)}
                ${renderEducation(payload, lang)}
                ${renderProjects(payload, lang)}
                ${renderCertificates(payload, lang)}
                ${renderExtraSections(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', false)}
        </div>
        `;
    }

    /**
     * TEMPLATE 2: Navy Professional (Portfolio)
     */
    function renderNavyProfessional(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = payload.settings?.branding || {};
        const theme = payload.settings?.theme || {};

        return `
        <div class="doc-page">
            <div class="doc-page-content">
                <div style="display: flex; gap: 24px; align-items: center; border-bottom: 3px solid var(--theme-primary); padding-bottom: 24px; margin-bottom: 20px;">
                    ${profile.avatarUrl ? `<img src="${esc(profile.avatarUrl)}" alt="Avatar" style="width: 100px; height: 100px; border-radius: 12px; object-fit: cover; border: 2px solid var(--theme-primary);">` : ''}
                    <div style="flex: 1;">
                        <span style="font-size: 11px; font-weight: 700; color: var(--theme-secondary); letter-spacing: 1px;">PROFESSIONAL DOSSIER</span>
                        <h1 style="font-size: 28px; font-weight: 800; color: var(--theme-primary); margin: 4px 0;">${esc(profile.fullName)}</h1>
                        <div style="font-size: 15px; font-weight: 600; color: var(--theme-muted);">${esc(profile.targetRole || profile.headline)}</div>
                        <div style="display: flex; gap: 14px; font-size: 11.5px; margin-top: 8px; color: var(--theme-text);">
                            ${profile.email ? `<span>✉ ${esc(profile.email)}</span>` : ''}
                            ${profile.phone ? `<span>✆ ${esc(profile.phone)}</span>` : ''}
                            ${profile.websiteUrl ? `<span>🌐 ${esc(profile.websiteUrl)}</span>` : ''}
                        </div>
                    </div>
                </div>

                ${renderAboutMe(payload, lang)}
                ${renderSkills(payload, lang)}
                ${renderExperiences(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>

        <div class="doc-page">
            <div class="doc-page-content">
                ${renderEducation(payload, lang)}
                ${renderProjects(payload, lang)}
                ${renderCertificates(payload, lang)}
                ${renderExtraSections(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', false)}
        </div>
        `;
    }

    /**
     * TEMPLATE 3: Modern Grid (Portfolio)
     */
    function renderModernGrid(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = payload.settings?.branding || {};
        const theme = payload.settings?.theme || {};

        return `
        <div class="doc-page">
            <div class="doc-page-content">
                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:24px; margin-bottom:24px; align-items:center;">
                    <div>
                        <h1 style="font-size: 26px; font-weight: 800; color: var(--theme-primary); margin: 0 0 6px 0;">${esc(profile.fullName)}</h1>
                        <div style="font-size: 14px; font-weight: 600; color: var(--theme-secondary);">${esc(profile.targetRole || profile.headline)}</div>
                        <div style="margin-top:10px; font-size:11px; color:var(--theme-muted); line-height:1.6;">
                            ${profile.email ? `<div>✉ ${esc(profile.email)}</div>` : ''}
                            ${profile.phone ? `<div>✆ ${esc(profile.phone)}</div>` : ''}
                        </div>
                    </div>
                    <div style="background:var(--theme-card-bg); padding:16px; border-radius:8px; border:1px solid var(--theme-border);">
                        ${renderAboutMe(payload, lang)}
                    </div>
                </div>

                ${renderSkills(payload, lang)}
                ${renderProjects(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>

        <div class="doc-page">
            <div class="doc-page-content">
                ${renderExperiences(payload, lang)}
                ${renderEducation(payload, lang)}
                ${renderCertificates(payload, lang)}
                ${renderExtraSections(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', false)}
        </div>
        `;
    }

    /**
     * TEMPLATE 4: Minimal A4 (Portfolio)
     */
    function renderMinimalA4(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = payload.settings?.branding || {};
        const theme = payload.settings?.theme || {};

        return `
        <div class="doc-page" style="padding-top: 20px;">
            <div class="doc-page-content" style="padding: 24px 50px;">
                <div style="text-align: center; margin-bottom: 28px; border-bottom: 1px solid var(--theme-border); padding-bottom: 20px;">
                    <h1 style="font-size: 26px; font-weight: 700; color: var(--theme-primary); margin: 0 0 6px 0; letter-spacing: 0.5px;">${esc(profile.fullName)}</h1>
                    <div style="font-size: 13.5px; font-weight: 500; color: var(--theme-muted); text-transform: uppercase; letter-spacing: 1px;">${esc(profile.targetRole || profile.headline)}</div>
                    <div style="display:flex; justify-content:center; gap:16px; font-size:11.5px; color:var(--theme-muted); margin-top:8px;">
                        ${profile.email ? `<span>${esc(profile.email)}</span>` : ''}
                        ${profile.phone ? `<span>• ${esc(profile.phone)}</span>` : ''}
                        ${profile.websiteUrl ? `<span>• ${esc(profile.websiteUrl)}</span>` : ''}
                    </div>
                </div>

                ${renderAboutMe(payload, lang)}
                ${renderSkills(payload, lang)}
                ${renderExperiences(payload, lang)}
                ${renderEducation(payload, lang)}
                ${renderProjects(payload, lang)}
                ${renderCertificates(payload, lang)}
                ${renderExtraSections(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>
        `;
    }

    /**
     * TEMPLATE 5: A3 Landscape Showcase (Portfolio)
     */
    function renderA3LandscapeShowcase(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = payload.settings?.branding || {};
        const theme = payload.settings?.theme || {};

        return `
        <div class="doc-page">
            <div class="doc-page-content" style="padding: 40px 60px;">
                <div class="a3-landscape-content">
                    <!-- Left column: Bio & Overview -->
                    <div style="background:var(--theme-card-bg); padding:28px; border-radius:12px; border:1px solid var(--theme-border);">
                        ${profile.avatarUrl ? `<img src="${esc(profile.avatarUrl)}" alt="Avatar" style="width:120px; height:120px; border-radius:12px; object-fit:cover; margin-bottom:16px;">` : ''}
                        <h1 style="font-size: 28px; font-weight: 800; color: var(--theme-primary); margin: 0 0 6px 0;">${esc(profile.fullName)}</h1>
                        <div style="font-size: 15px; font-weight: 600; color: var(--theme-secondary); margin-bottom:16px;">${esc(profile.targetRole || profile.headline)}</div>
                        
                        <div style="font-size:12px; color:var(--theme-muted); margin-bottom:20px; line-height:1.7;">
                            ${profile.email ? `<div>✉ ${esc(profile.email)}</div>` : ''}
                            ${profile.phone ? `<div>✆ ${esc(profile.phone)}</div>` : ''}
                            ${profile.websiteUrl ? `<div>🌐 ${esc(profile.websiteUrl)}</div>` : ''}
                        </div>

                        ${renderAboutMe(payload, lang)}
                        ${renderSkills(payload, lang)}
                        ${renderCertificates(payload, lang)}
                    </div>

                    <!-- Right column: Large Showcase & Timeline -->
                    <div>
                        ${renderProjects(payload, lang)}
                        ${renderExperiences(payload, lang)}
                        ${renderEducation(payload, lang)}
                        ${renderExtraSections(payload, lang)}
                    </div>
                </div>
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>
        `;
    }

    /**
     * TEMPLATE 6: Institutional BimClub (Portfolio)
     */
    function renderInstitutionalBimClub(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = Object.assign({}, payload.settings?.branding || {}, {
            showSoeLogo: true,
            showBimClubLogo: true,
            footerStyle: 'footer-bar'
        });
        const theme = payload.settings?.theme || {};

        return `
        <div class="doc-page">
            ${renderBranding(branding, theme, 'top', true)}
            <div class="doc-page-content" style="padding: 28px 48px;">
                <div style="background: ${theme.primary || '#012240'}08; border: 1.5px solid ${theme.primary || '#012240'}33; border-radius: 8px; padding: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 11px; font-weight: 700; color: var(--theme-secondary); text-transform: uppercase;">FACULTY ACCREDITED PORTFOLIO</span>
                        <h1 style="font-size: 26px; font-weight: 800; color: var(--theme-primary); margin: 4px 0;">${esc(profile.fullName)}</h1>
                        <div style="font-size: 14px; font-weight: 600; color: var(--theme-muted);">${esc(profile.targetRole || profile.headline)}</div>
                    </div>
                    <div style="text-align: right; font-size: 11.5px; color: var(--theme-muted);">
                        ${profile.email ? `<div>${esc(profile.email)}</div>` : ''}
                        ${profile.phone ? `<div>${esc(profile.phone)}</div>` : ''}
                        <div style="margin-top: 4px; font-weight: 700; color: var(--theme-primary);">BimClub Official Member</div>
                    </div>
                </div>

                ${renderAboutMe(payload, lang)}
                ${renderSkills(payload, lang)}
                ${renderExperiences(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>

        <div class="doc-page">
            <div class="doc-page-content" style="padding: 32px 48px;">
                ${renderEducation(payload, lang)}
                ${renderProjects(payload, lang)}
                ${renderCertificates(payload, lang)}
                ${renderExtraSections(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', false)}
        </div>
        `;
    }

    /**
     * CV TEMPLATE 1: cv-a4-standard (A4 Portrait Default)
     */
    function renderCvA4Standard(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = payload.settings?.branding || {};
        const theme = payload.settings?.theme || {};

        return `
        <div class="doc-page">
            <div class="doc-page-content" style="padding: 32px 42px;">
                <div style="border-bottom: 2px solid var(--theme-primary); padding-bottom: 16px; margin-bottom: 18px; display:flex; justify-content:space-between; align-items:flex-end;">
                    <div>
                        <h1 style="font-size: 26px; font-weight: 800; color: var(--theme-primary); margin: 0 0 4px 0;">${esc(profile.fullName)}</h1>
                        <div style="font-size: 14px; font-weight: 600; color: var(--theme-secondary);">${esc(profile.targetRole || profile.headline || 'Curriculum Vitae')}</div>
                    </div>
                    <div style="text-align: right; font-size: 11px; color: var(--theme-muted); line-height: 1.5;">
                        ${profile.email ? `<div>${esc(profile.email)}</div>` : ''}
                        ${profile.phone ? `<div>${esc(profile.phone)}</div>` : ''}
                        ${profile.websiteUrl ? `<div>${esc(profile.websiteUrl)}</div>` : ''}
                    </div>
                </div>

                ${renderCareerObjective(payload, lang) || renderAboutMe(payload, lang)}
                ${renderEducation(payload, lang)}
                ${renderExperiences(payload, lang)}
                ${renderSkills(payload, lang)}
                ${renderCertificates(payload, lang)}
                ${renderExtraSections(payload, lang)}
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>
        `;
    }

    /**
     * CV TEMPLATE 2: cv-a4-ats (ATS-Safe Single Column, Pure Text-First)
     */
    function renderCvA4Ats(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};

        // ATS requires plain single column, standard system fonts, zero fancy graphics/bars
        return `
        <div class="doc-page ats-document" style="padding: 36px 44px; font-family: 'Inter', 'Noto Sans Thai', sans-serif;">
            <div style="text-align: center; border-bottom: 1.5px solid #000000; padding-bottom: 14px; margin-bottom: 16px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #000000; margin: 0 0 4px 0; text-transform: uppercase;">${esc(profile.fullName)}</h1>
                <div style="font-size: 13px; font-weight: 600; color: #333333;">${esc(profile.targetRole || profile.headline)}</div>
                <div style="font-size: 11px; color: #444444; margin-top: 6px;">
                    ${profile.email ? `Email: ${esc(profile.email)} | ` : ''}
                    ${profile.phone ? `Phone: ${esc(profile.phone)} | ` : ''}
                    ${profile.websiteUrl ? `Website: ${esc(profile.websiteUrl)}` : ''}
                </div>
            </div>

            ${renderCareerObjective(payload, lang) || renderAboutMe(payload, lang)}
            ${renderExperiences(payload, lang)}
            ${renderEducation(payload, lang)}
            ${renderSkills(payload, lang)}
            ${renderCertificates(payload, lang)}
            ${renderExtraSections(payload, lang)}
        </div>
        `;
    }

    /**
     * CV TEMPLATE 3: cv-letter-standard (US Letter Format)
     */
    function renderCvLetterStandard(payload) {
        return renderCvA4Standard(payload); // reuses layout with Letter paper sizing in CSS
    }

    /**
     * CV TEMPLATE 4: cv-a4-landscape-creative (Creative Horizontal Layout)
     */
    function renderCvA4LandscapeCreative(payload) {
        const lang = payload.settings?.language || 'th';
        const profile = payload.profile || {};
        const branding = payload.settings?.branding || {};
        const theme = payload.settings?.theme || {};

        return `
        <div class="doc-page">
            <div class="doc-page-content" style="padding: 30px 48px;">
                <div style="display:grid; grid-template-columns: 240px 1fr 1fr; gap: 24px;">
                    <!-- Column 1: Info & Skills -->
                    <div style="border-right: 1.5px solid var(--theme-border); padding-right: 20px;">
                        <h1 style="font-size: 22px; font-weight: 800; color: var(--theme-primary); margin: 0 0 4px 0;">${esc(profile.fullName)}</h1>
                        <div style="font-size: 13px; font-weight: 600; color: var(--theme-secondary); margin-bottom: 14px;">${esc(profile.targetRole || profile.headline)}</div>
                        <div style="font-size: 11px; color: var(--theme-muted); margin-bottom: 20px; line-height: 1.6;">
                            ${profile.email ? `<div>✉ ${esc(profile.email)}</div>` : ''}
                            ${profile.phone ? `<div>✆ ${esc(profile.phone)}</div>` : ''}
                            ${profile.websiteUrl ? `<div>🌐 ${esc(profile.websiteUrl)}</div>` : ''}
                        </div>
                        ${renderSkills(payload, lang)}
                        ${renderCertificates(payload, lang)}
                    </div>

                    <!-- Column 2: Work Experience -->
                    <div>
                        ${renderCareerObjective(payload, lang) || renderAboutMe(payload, lang)}
                        ${renderExperiences(payload, lang)}
                    </div>

                    <!-- Column 3: Education & Projects/Extras -->
                    <div>
                        ${renderEducation(payload, lang)}
                        ${renderProjects(payload, lang)}
                        ${renderExtraSections(payload, lang)}
                    </div>
                </div>
            </div>
            ${renderBranding(branding, theme, 'footer', true)}
        </div>
        `;
    }

    /**
     * CV TEMPLATE 5: cv-a3-presentation (A3 Large Presentation Format)
     */
    function renderCvA3Presentation(payload) {
        return renderA3LandscapeShowcase(payload);
    }

    /**
     * Master Render Function
     */
    function renderDocument(payload) {
        const settings = payload.settings || {};
        const docType = settings.docType || 'portfolio';
        const template = settings.template || (docType === 'cv' ? 'cv-a4-standard' : 'maroon-editorial');

        let bodyHtml = '';

        if (docType === 'cv') {
            switch (template) {
                case 'cv-a4-ats':
                    bodyHtml = renderCvA4Ats(payload);
                    break;
                case 'cv-letter-standard':
                    bodyHtml = renderCvLetterStandard(payload);
                    break;
                case 'cv-a4-landscape-creative':
                    bodyHtml = renderCvA4LandscapeCreative(payload);
                    break;
                case 'cv-a3-presentation':
                    bodyHtml = renderCvA3Presentation(payload);
                    break;
                case 'cv-a4-standard':
                default:
                    bodyHtml = renderCvA4Standard(payload);
                    break;
            }
        } else {
            // Portfolio
            switch (template) {
                case 'navy-professional':
                    bodyHtml = renderNavyProfessional(payload);
                    break;
                case 'modern-grid':
                    bodyHtml = renderModernGrid(payload);
                    break;
                case 'minimal-a4':
                    bodyHtml = renderMinimalA4(payload);
                    break;
                case 'a3-landscape-showcase':
                    bodyHtml = renderA3LandscapeShowcase(payload);
                    break;
                case 'institutional-bimclub':
                    bodyHtml = renderInstitutionalBimClub(payload);
                    break;
                case 'maroon-editorial':
                default:
                    bodyHtml = renderMaroonEditorial(payload);
                    break;
            }
        }

        const styles = getDocumentStyles(payload);

        return `
        <!DOCTYPE html>
        <html lang="${payload.settings?.language === 'en' ? 'en' : 'th'}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${esc(payload.profile?.fullName || 'BimClub Document')} - ${docType.toUpperCase()}</title>
            ${styles}
        </head>
        <body class="doc-body">
            ${bodyHtml}
        </body>
        </html>
        `;
    }

    return {
        renderDocument: renderDocument,
        getDocumentStyles: getDocumentStyles,
        getContrastRatio: getContrastRatio,
        PAPER_SIZES: PAPER_SIZES,
        BG_THEMES: BG_THEMES
    };
}));
