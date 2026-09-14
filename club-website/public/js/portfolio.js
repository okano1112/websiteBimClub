/**
 * BimClub Guided Portfolio Editor Controller
 * Complete 18-section guided flow, live preview, themes, templates, and real PDF export
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Current User & State
    let currentUser = null;
    let portfolioData = {};
    let activeSectionIndex = 0;
    let previewDebounceTimer = null;

    // 18 Guided Section Definitions
    const SECTIONS = [
        { id: 'personal_info', name: 'ข้อมูลส่วนตัวและการติดต่อ', helper: 'ชื่อ-นามสกุล อีเมล เบอร์โทรศัพท์ และที่อยู่ติดต่อ' },
        { id: 'profile_photo', name: 'รูปถ่ายประจำตัว', helper: 'อัปโหลดรูปภาพโปรไฟล์วิชาชีพที่คมชัดและเหมาะสม' },
        { id: 'name_headline_role', name: 'ตำแหน่งและเป้าหมายวิชาชีพ', helper: 'ระบุหัวข้อวิชาชีพและตำแหน่งงานที่ต้องการสมัคร (Target Role)' },
        { id: 'about_me', name: 'เกี่ยวกับฉัน / ข้อมูลสังเขป', helper: 'สรุปภาพรวมประสบการณ์ จุดเด่น และความเชี่ยวชาญเฉพาะทาง' },
        { id: 'career_objective', name: 'เป้าหมายทางอาชีพ (Objective)', helper: 'เป้าหมายและสิ่งที่คุณต้องการสร้างสรรค์ในสายงานวิชาชีพ' },
        { id: 'skills', name: 'ทักษะและโปรแกรมคอมพิวเตอร์', helper: 'ทักษะด้าน BIM, สถาปัตยกรรม, วิศวกรรม, หรือการเขียนโปรแกรม' },
        { id: 'experiences', name: 'ประสบการณ์การทำงาน', helper: 'ประวัติการทำงานในบริษัทหรือองค์กร พร้อมหน้าที่ความรับผิดชอบ' },
        { id: 'internships', name: 'ประสบการณ์ฝึกงาน / สหกิจศึกษา', helper: 'การฝึกงานในโครงการจริงเพื่อเสริมสร้างทักษะวิชาชีพ' },
        { id: 'projects', name: 'ผลงานและโครงการเด่น', helper: 'แบบจำลอง BIM ภาพงานสถาปัตย์ หรือผลงานวิศวกรรมชิ้นสำคัญ' },
        { id: 'education', name: 'ประวัติการศึกษา', helper: 'ระดับการศึกษา มหาวิทยาลัย สาขาวิชา และปีที่สำเร็จการศึกษา' },
        { id: 'certificates', name: 'ใบรับรองและวุฒิบัตร', helper: 'ใบรับรองจากระบบ BimClub และใบรับรองมาตรฐานวิชาชีพอื่น ๆ' },
        { id: 'awards', name: 'รางวัลและความสำเร็จ', helper: 'รางวัลจากการแข่งขันทางวิชาการ หรือผลงานที่ได้รับการยอมรับ' },
        { id: 'activities', name: 'กิจกรรมและการเป็นผู้นำ', helper: 'กิจกรรมชมรม กิจกรรมมหาวิทยาลัย และบทบาทการเป็นผู้นำ' },
        { id: 'languages', name: 'ทักษะทางภาษา', helper: 'ภาษาที่สามารถสื่อสารได้และระดับความเชี่ยวชาญ' },
        { id: 'publications', name: 'งานวิจัยและบทความตีพิมพ์', helper: 'เอกสารวิชาการ งานวิจัย หรือบทความเผยแพร่ทางเทคโนโลยี' },
        { id: 'volunteer', name: 'งานจิตอาสาและสังคม', helper: 'กิจกรรมบำเพ็ญประโยชน์ หรือกิจกรรมช่วยเหลือสังคม' },
        { id: 'references', name: 'บุคคลอ้างอิง', helper: 'อาจารย์ที่ปรึกษา หรือหัวหน้างานที่สามารถรับรองการทำงานได้' },
        { id: 'contact_links', name: 'ลิงก์และช่องทางติดต่อภายนอก', helper: 'LinkedIn, GitHub, เว็บไซต์ส่วนตัว หรือลิงก์แฟ้มงานออนไลน์' }
    ];

    // Default Portfolio Settings
    let currentSettings = {
        docType: 'portfolio',
        template: 'maroon-editorial',
        pageSize: 'a4',
        orientation: 'portrait',
        theme: {
            primary: '#012240',
            secondary: '#AD0F0F',
            bg: 'white',
            textColor: '#0F172A',
            accentColor: '#AD0F0F'
        },
        branding: {
            showSoeLogo: true,
            showBimClubLogo: true,
            soeLogoUrl: '',
            bimClubLogoUrl: '',
            footerStyle: 'footer-bar',
            scope: 'all',
            logoSize: 'medium',
            institutionText: 'BimClub Official Accredited • Faculty of Engineering'
        },
        hiddenSections: [],
        language: 'th'
    };

    // DOM Elements
    const sectionNavList = document.getElementById('sectionNavList');
    const currentSectionTitle = document.getElementById('currentSectionTitle');
    const currentSectionHelperText = document.getElementById('currentSectionHelperText');
    const currentSectionStatusBadge = document.getElementById('currentSectionStatusBadge');
    const activeFormContainer = document.getElementById('activeFormContainer');
    const progressBarFill = document.getElementById('progressBarFill');
    const completionPercentText = document.getElementById('completionPercentText');
    const docPreviewIframe = document.getElementById('docPreviewIframe');
    const autoSaveIndicator = document.getElementById('autoSaveIndicator');
    const isPublicCheckbox = document.getElementById('isPublicCheckbox');
    const publicStatusBadge = document.getElementById('publicStatusBadge');
    const btnShowcaseLink = document.getElementById('btnShowcaseLink');
    const btnDownloadPdf = document.getElementById('btnDownloadPdf');

    // Settings Drawer Elements
    const settingsModal = document.getElementById('settingsModal');
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const btnApplySettings = document.getElementById('btnApplySettings');
    const selectPageSize = document.getElementById('selectPageSize');
    const selectOrientation = document.getElementById('selectOrientation');
    const colorPickerPrimary = document.getElementById('colorPickerPrimary');
    const colorPickerSecondary = document.getElementById('colorPickerSecondary');
    const btnSwapColors = document.getElementById('btnSwapColors');
    const selectBgTheme = document.getElementById('selectBgTheme');
    const selectLanguage = document.getElementById('selectLanguage');
    const contrastFeedback = document.getElementById('contrastFeedback');
    const checkShowSoeLogo = document.getElementById('checkShowSoeLogo');
    const checkShowBimLogo = document.getElementById('checkShowBimLogo');
    const selectFooterStyle = document.getElementById('selectFooterStyle');
    const inputInstitutionText = document.getElementById('inputInstitutionText');
    const inputSoeLogo = document.getElementById('inputSoeLogo');
    const inputBimLogo = document.getElementById('inputBimLogo');
    const soeLogoStatus = document.getElementById('soeLogoStatus');
    const bimLogoStatus = document.getElementById('bimLogoStatus');
    const selectLogoSize = document.getElementById('selectLogoSize');
    const selectBrandingScope = document.getElementById('selectBrandingScope');

    // 1. Check Auth
    try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
            window.location.href = 'login.html';
            return;
        }
        const meData = await authRes.json();
        currentUser = meData.user || meData;
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Load Portfolio Data
    async function loadPortfolioData() {
        try {
            const res = await fetch('/api/portfolios/me');
            if (res.ok) {
                const data = await res.json();
                portfolioData = PortfolioModel.clone(data.portfolio || data);
                portfolioData.user_profile ||= {...currentUser};
                savedPortfolio = PortfolioModel.clone(portfolioData);

                // Sync settings
                if (portfolioData.portfolio_settings && Object.keys(portfolioData.portfolio_settings).length > 0) {
                    currentSettings = Object.assign(currentSettings, portfolioData.portfolio_settings);
                }

                // Public checkbox
                const isPub = Boolean(portfolioData.is_public ?? portfolioData.isPublic);
                isPublicCheckbox.checked = isPub;
                updatePublicBadge(isPub);

                const uid = currentUser.id || currentUser.user_id;
                if (btnShowcaseLink && uid) {
                    btnShowcaseLink.href = `/page/portfolio-public.html?id=${uid}`;
                }

                // Sync Settings UI
                syncSettingsUiFromState();

                // Render navigation and active section
                renderSectionNav();
                renderActiveSectionForm();
                updateLivePreview();
            }
        } catch (err) {
            console.error('Failed to load portfolio:', err);
        }
    }

    // Update public badge UI
    function updatePublicBadge(isPublic) {
        if (isPublic) {
            publicStatusBadge.className = 'status-badge public';
            publicStatusBadge.textContent = 'เผยแพร่สาธารณะ';
        } else {
            publicStatusBadge.className = 'status-badge private';
            publicStatusBadge.textContent = 'ซ่อนเป็นส่วนตัว';
        }
    }

    // Compute status of a section
    function computeSectionStatus(secId) {
        if (currentSettings.hiddenSections && currentSettings.hiddenSections.includes(secId)) {
            return 'hidden';
        }

        const extra = portfolioData.extra_sections || {};
        const user = portfolioData.user_profile || currentUser || {};

        switch (secId) {
            case 'personal_info':
                return (user.full_name && (user.email || user.phone)) ? 'complete' : (user.full_name ? 'in_progress' : 'not_started');
            case 'profile_photo':
                return user.avatar_url ? 'complete' : 'not_started';
            case 'name_headline_role':
                return (portfolioData.headline && portfolioData.target_role) ? 'complete' : (portfolioData.headline || portfolioData.target_role ? 'in_progress' : 'not_started');
            case 'about_me':
                return portfolioData.summary ? 'complete' : 'not_started';
            case 'career_objective':
                return portfolioData.career_objective ? 'complete' : 'not_started';
            case 'skills':
                const skills = portfolioData.skills || [];
                return skills.length >= 3 ? 'complete' : (skills.length > 0 ? 'in_progress' : 'not_started');
            case 'experiences':
                const exps = portfolioData.experiences || [];
                return exps.length > 0 ? 'complete' : 'not_started';
            case 'internships':
                return (extra.internships && extra.internships.length > 0) ? 'complete' : 'not_started';
            case 'projects':
                const projs = [...(portfolioData.projects || []), ...(portfolioData.involved_projects || [])];
                return projs.length > 0 ? 'complete' : 'not_started';
            case 'education':
                const edus = portfolioData.education || [];
                return edus.length > 0 ? 'complete' : 'not_started';
            case 'certificates':
                const certs = portfolioData.certificates || { system: [], manual: [] };
                return (certs.system?.length > 0 || certs.manual?.length > 0) ? 'complete' : 'not_started';
            case 'awards':
                return (extra.awards && extra.awards.length > 0) ? 'complete' : 'not_started';
            case 'activities':
                return (extra.activities && extra.activities.length > 0) ? 'complete' : 'not_started';
            case 'languages':
                return (extra.languages && extra.languages.length > 0) ? 'complete' : 'not_started';
            case 'publications':
                return (extra.publications && extra.publications.length > 0) ? 'complete' : 'not_started';
            case 'volunteer':
                return (extra.volunteer && extra.volunteer.length > 0) ? 'complete' : 'not_started';
            case 'references':
                return (extra.references && extra.references.length > 0) ? 'complete' : 'not_started';
            case 'contact_links':
                return (portfolioData.website_url || (extra.custom_contacts && extra.custom_contacts.length > 0)) ? 'complete' : 'not_started';
            default:
                return 'not_started';
        }
    }

    // Render Navigation List
    function renderSectionNav() {
        sectionNavList.innerHTML = '';
        let completedCount = 0;
        const total = SECTIONS.length;

        SECTIONS.forEach((sec, idx) => {
            const status = computeSectionStatus(sec.id);
            if (status === 'complete') completedCount++;

            const li = document.createElement('li');
            li.className = `nav-section-item ${idx === activeSectionIndex ? 'active' : ''} ${status === 'hidden' ? 'is-hidden' : ''}`;
            
            const isHidden = status === 'hidden';
            const eyeIcon = isHidden ? 'แสดง' : 'ซ่อน';

            li.innerHTML = `
                <div class="nav-item-left">
                    <span class="nav-item-state ${status}" title="สถานะ: ${status}"></span>
                    <span class="nav-item-name">${idx + 1}. ${escapeHtml(sec.name)}</span>
                </div>
                <button type="button" class="btn-toggle-eye" data-sec="${sec.id}" title="${isHidden ? 'แสดงหมวดนี้' : 'ซ่อนหมวดนี้ออกจากเอกสาร'}">
                    ${eyeIcon}
                </button>
            `;

            li.querySelector('.nav-item-left').addEventListener('click', () => {
                syncFormDraftToState();
                activeSectionIndex = idx;
                renderSectionNav();
                renderActiveSectionForm();
            });

            li.querySelector('.btn-toggle-eye').addEventListener('click', async (e) => {
                e.stopPropagation();
                toggleSectionVisibility(sec.id);
            });

            sectionNavList.appendChild(li);
        });

        const percent = Math.round((completedCount / total) * 100);
        progressBarFill.style.width = `${percent}%`;
        completionPercentText.textContent = `${percent}%`;
    }

    // Toggle Section Visibility
    async function toggleSectionVisibility(secId) {
        if (!currentSettings.hiddenSections) currentSettings.hiddenSections = [];
        const idx = currentSettings.hiddenSections.indexOf(secId);
        if (idx > -1) {
            currentSettings.hiddenSections.splice(idx, 1);
            showToast(`แสดงหมวด "${SECTIONS.find(s=>s.id===secId)?.name}" ในเอกสารแล้ว`);
        } else {
            currentSettings.hiddenSections.push(secId);
            showToast(`ซ่อนหมวด "${SECTIONS.find(s=>s.id===secId)?.name}" ออกจากเอกสารแล้ว`);
        }
        syncFormDraftToState();
        renderSectionNav();
        renderActiveSectionForm();
        updateLivePreview();
        markDirty();
    }

    // Render Active Section Form
    function renderActiveSectionForm() {
        const sec = SECTIONS[activeSectionIndex];
        if (!sec) return;

        currentSectionTitle.textContent = `${activeSectionIndex + 1}. ${sec.name}`;
        currentSectionHelperText.textContent = sec.helper;

        const status = computeSectionStatus(sec.id);
        const statusMap = {
            complete: { label: '✓ กรอกสมบูรณ์', class: 'public' },
            in_progress: { label: '● ดำเนินการบางส่วน', class: 'private' },
            not_started: { label: '○ ยังไม่ได้เริ่ม', class: 'private' },
            hidden: { label: 'ซ่อนจากการแสดงผล', class: 'private' }
        };
        const st = statusMap[status] || statusMap.not_started;
        currentSectionStatusBadge.className = `status-badge ${st.class}`;
        currentSectionStatusBadge.textContent = st.label;

        const user = portfolioData.user_profile || currentUser || {};
        const extra = portfolioData.extra_sections || {};

        let formHtml = '';

        switch (sec.id) {
            case 'personal_info':
                formHtml = `
                    <div class="form-row">
                        <div class="form-group">
                            <label>ชื่อ-นามสกุล (Full Name)</label>
                            <input type="text" id="inpFullName" value="${escapeHtml(user.full_name || '')}" placeholder="เช่น นายสถาปัตย์ วิศวกรรม">
                        </div>
                        <div class="form-group">
                            <label>อีเมล (Email)</label>
                            <input type="text" id="inpEmail" readonly aria-label="อีเมลบัญชี (แก้ไขจากระบบบัญชี)" value="${escapeHtml(user.email || '')}" placeholder="เช่น somchai@example.com">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>เบอร์โทรศัพท์ (Phone)</label>
                            <input type="text" id="inpPhone" value="${escapeHtml(user.phone || '')}" placeholder="เช่น 081-234-5678">
                        </div>
                        <div class="form-group">
                            <label>เว็บไซต์ส่วนตัว (Website / Portfolio URL)</label>
                            <input type="url" id="inpWebsiteUrl" value="${escapeHtml(portfolioData.website_url || '')}" placeholder="https://yourportfolio.com">
                        </div>
                    </div>
                `;
                break;

            case 'profile_photo':
                formHtml = `
                    <div style="display:flex; gap:20px; align-items:center;">
                        <div id="avatarPreviewBox" style="width:100px; height:100px; border-radius:12px; background:#E2E8F0; display:flex; align-items:center; justify-content:center; overflow:hidden; border:2px solid var(--editor-navy);">
                            ${user.avatar_url ? `<img src="${escapeHtml(user.avatar_url)}" style="width:100%; height:100%; object-fit:cover;">` : '<span class="avatar-placeholder-label">ไม่มีรูป</span>'}
                        </div>
                        <div style="flex:1;">
                            <label style="font-weight:600; font-size:0.9rem; display:block; margin-bottom:6px;">อัปโหลดรูปโปรไฟล์ใหม่</label>
                            <input type="file" id="inpAvatarFile" accept="image/*">
                            <p style="font-size:0.8rem; color:var(--editor-text-muted); margin:6px 0 0 0;">แนะนำรูปหน้าตรง สุภาพ ความละเอียดขั้นต่ำ 400x400 พิกเซล (PNG, JPG, WebP)</p>
                        </div>
                    </div>
                `;
                break;

            case 'name_headline_role':
                formHtml = `
                    <div class="form-group">
                        <label>เป้าหมายตำแหน่งงาน (Target Role)</label>
                        <input type="text" id="inpTargetRole" value="${escapeHtml(portfolioData.target_role || '')}" placeholder="เช่น Senior BIM Coordinator / Computational Specialist">
                        <span style="font-size:0.78rem; color:var(--editor-text-muted);">ตำแหน่งที่คุณต้องการสมัครหรือมุ่งหวังในพอร์ตโฟลิโอนี้</span>
                    </div>
                    <div class="form-group">
                        <label>หัวข้อวิชาชีพ / คำโปรย (Headline)</label>
                        <input type="text" id="inpHeadline" value="${escapeHtml(portfolioData.headline || '')}" placeholder="เช่น สถาปนิกและผู้เชี่ยวชาญด้านแบบจำลองสารสนเทศอาคาร (BIM) ประสบการณ์ 4 ปี">
                    </div>
                `;
                break;

            case 'about_me':
                formHtml = `
                    <div class="form-group">
                        <label>สรุปประวัติและความเชี่ยวชาญ (Executive Summary)</label>
                        <textarea id="inpSummary" rows="6" placeholder="เล่าภาพรวม ประสบการณ์ และความสนใจด้านวิชาชีพของคุณอย่างกระชับและน่าสนใจ...">${escapeHtml(portfolioData.summary || '')}</textarea>
                    </div>
                `;
                break;

            case 'career_objective':
                formHtml = `
                    <div class="form-group">
                        <label>วัตถุประสงค์และเป้าหมายทางอาชีพ (Career Objective)</label>
                        <textarea id="inpCareerObjective" rows="5" placeholder="อธิบายเป้าหมายในสายอาชีพ สิ่งที่ต้องการสร้างคุณค่าให้แก่องค์กร หรือความเชี่ยวชาญที่ต้องการมุ่งเน้น...">${escapeHtml(portfolioData.career_objective || '')}</textarea>
                    </div>
                `;
                break;

            case 'skills':
                const skills = portfolioData.skills || [];
                formHtml = `
                    <label style="font-weight:600; font-size:0.88rem; display:block; margin-bottom:8px;">รายการทักษะที่บันทึกไว้ (${skills.length})</label>
                    <div class="skills-box" id="editorSkillsContainer">
                        ${skills.map((s, idx) => `
                            <span class="skill-pill">
                                <span>${escapeHtml(s)}</span>
                                <button type="button" class="btn-remove-skill" data-idx="${idx}">&times;</button>
                            </span>
                        `).join('')}
                    </div>
                    <div style="display:flex; gap:8px; margin-bottom:12px;">
                        <input type="text" id="inpNewSkill" placeholder="พิมพ์ทักษะ เช่น Autodesk Revit, Dynamo..." style="flex:1;">
                        <button type="button" class="btn-action primary" id="btnAddSkillBtn">+ เพิ่มทักษะ</button>
                    </div>
                    <label style="font-size:0.8rem; font-weight:600; color:var(--editor-text-muted);">ทักษะแนะนำสำหรับสายงาน BIM & Engineering (คลิกเพื่อเพิ่มด่วน):</label>
                    <div class="preset-skills-wrapper">
                        <button type="button" class="preset-chip" data-skill="Autodesk Revit">+ Revit</button>
                        <button type="button" class="preset-chip" data-skill="Navisworks">+ Navisworks</button>
                        <button type="button" class="preset-chip" data-skill="Dynamo BIM">+ Dynamo</button>
                        <button type="button" class="preset-chip" data-skill="BIM 360 / ACC">+ BIM 360</button>
                        <button type="button" class="preset-chip" data-skill="Clash Detection">+ Clash Detection</button>
                        <button type="button" class="preset-chip" data-skill="AutoCAD">+ AutoCAD</button>
                        <button type="button" class="preset-chip" data-skill="Rhino + Grasshopper">+ Grasshopper</button>
                        <button type="button" class="preset-chip" data-skill="Python for BIM">+ Python</button>
                        <button type="button" class="preset-chip" data-skill="Scan-to-BIM">+ Scan-to-BIM</button>
                    </div>
                `;
                break;

            case 'experiences':
                const exps = portfolioData.experiences || [];
                formHtml = `
                    <div class="items-list-container">
                        ${exps.map(exp => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="exp" data-id="${exp.id}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(exp.position)} - ${escapeHtml(exp.company)}</div>
                                <div class="item-entry-subtitle">ช่วงเวลา: ${escapeHtml(exp.start_date || '')} ถึง ${escapeHtml(exp.end_date || 'ปัจจุบัน')}</div>
                                ${exp.description ? `<p class="item-entry-desc">${escapeHtml(exp.description)}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มประวัติการทำงาน</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>บริษัท / องค์กร</label>
                                <input type="text" id="inpExpCompany" placeholder="เช่น บจก. วิศวกรรมและสถาปัตย์">
                            </div>
                            <div class="form-group">
                                <label>ตำแหน่ง</label>
                                <input type="text" id="inpExpPosition" placeholder="เช่น BIM Specialist">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>วันที่เริ่มงาน</label>
                                <input type="month" id="inpExpStart">
                            </div>
                            <div class="form-group">
                                <label>วันที่สิ้นสุด (เว้นว่างหากทำถึงปัจจุบัน)</label>
                                <input type="month" id="inpExpEnd">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>รายละเอียดหน้าที่ความรับผิดชอบ</label>
                            <textarea id="inpExpDesc" rows="3" placeholder="อธิบายหน้าที่ความรับผิดชอบและผลงานเด่น..."></textarea>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddExpSubmit">+ บันทึกประวัติการทำงาน</button>
                    </div>
                `;
                break;

            case 'internships':
                const internships = extra.internships || [];
                formHtml = `
                    <div class="items-list-container">
                        ${internships.map((item, i) => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="internship" data-idx="${i}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(item.role)} - ${escapeHtml(item.company)}</div>
                                <div class="item-entry-subtitle">ช่วงเวลา: ${escapeHtml(item.period)}</div>
                                ${item.description ? `<p class="item-entry-desc">${escapeHtml(item.description)}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มประสบการณ์ฝึกงาน / สหกิจศึกษา</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>หน่วยงาน / บริษัท</label>
                                <input type="text" id="inpInternCompany" placeholder="เช่น บริษัท ก่อสร้างนวัตกรรม จำกัด">
                            </div>
                            <div class="form-group">
                                <label>ตำแหน่ง / บทบาท</label>
                                <input type="text" id="inpInternRole" placeholder="เช่น BIM Trainee">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>ช่วงเวลา</label>
                            <input type="text" id="inpInternPeriod" placeholder="เช่น มิ.ย. 2566 - ต.ค. 2566">
                        </div>
                        <div class="form-group">
                            <label>รายละเอียดงานที่ได้รับมอบหมาย</label>
                            <textarea id="inpInternDesc" rows="3" placeholder="หน้าที่และทักษะที่ได้พัฒนา..."></textarea>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddInternSubmit">+ บันทึกการฝึกงาน</button>
                    </div>
                `;
                break;

            case 'projects':
                const projs = [...(portfolioData.projects || []), ...(portfolioData.involved_projects || [])];
                formHtml = `
                    <div class="items-list-container">
                        ${projs.map(proj => `
                            <div class="item-entry-card" style="display:flex; gap:16px; align-items:flex-start;">
                                ${proj.image_url ? `<img src="${escapeHtml(proj.image_url)}" style="width:100px; height:70px; object-fit:cover; border-radius:6px; border:1px solid var(--editor-border);">` : ''}
                                <div style="flex:1;">
                                    ${Number(proj.can_edit) === 1 ? `<button type="button" class="btn-project-visibility" data-id="${proj.canonical_project_id || proj.id}" data-public="${Number(proj.is_public)}">${proj.is_public ? 'เปลี่ยนเป็นส่วนตัว' : 'เผยแพร่ผลงาน'}</button><button type="button" class="btn-item-delete" data-type="project" data-id="${proj.canonical_project_id || proj.id}">ลบ</button>` : '<span>ผลงานที่ร่วมทำ</span>'}
                                    <div class="item-entry-title">${escapeHtml(proj.title)}</div>
                                    ${proj.description ? `<p class="item-entry-desc">${escapeHtml(proj.description)}</p>` : ''}
                                    ${proj.project_url ? `<a href="${escapeHtml(proj.project_url)}" target="_blank" style="font-size:0.8rem; color:var(--editor-maroon); font-weight:600;">เปิดลิงก์โครงการ ↗</a>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มผลงานใหม่</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ชื่อโครงการ / ผลงาน</label>
                                <label><input type="checkbox" id="inpProjPublic"> เผยแพร่ผลงานนี้ในโปรไฟล์สาธารณะ</label><input type="text" id="inpProjTitle" placeholder="เช่น โมเดล BIM โรงพยาบาล 15 ชั้น">
                            </div>
                            <div class="form-group">
                                <label>ลิงก์โครงการภายนอก (ถ้ามี)</label>
                                <input type="url" id="inpProjUrl" placeholder="https://...">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>รายละเอียดและซอฟต์แวร์ที่ใช้</label>
                            <textarea id="inpProjDesc" rows="3" placeholder="อธิบายจุดเด่น การสร้างโมเดล การประสานงานแบบ..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>รูปภาพผลงาน (PNG, JPG, WebP)</label>
                            <input type="file" id="inpProjImage" accept="image/*">
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddProjSubmit">+ บันทึกผลงาน</button>
                    </div>
                `;
                break;

            case 'education':
                const edus = portfolioData.education || [];
                formHtml = `
                    <div class="items-list-container">
                        ${edus.map(edu => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="edu" data-id="${edu.id}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(edu.degree)} - ${escapeHtml(edu.institution)}</div>
                                <div class="item-entry-subtitle">สาขาวิชา: ${escapeHtml(edu.field_of_study || '-')} (ปีที่สำเร็จ: ${escapeHtml(String(edu.graduation_year || edu.end_year || '-'))})</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มประวัติการศึกษา</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>สถาบันการศึกษา / มหาวิทยาลัย</label>
                                <input type="text" id="inpEduInstitution" placeholder="เช่น มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี">
                            </div>
                            <div class="form-group">
                                <label>วุฒิการศึกษา</label>
                                <input type="text" id="inpEduDegree" placeholder="เช่น วิศวกรรมศาสตรบัณฑิต (วศ.บ.)">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>สาขาวิชา</label>
                                <input type="text" id="inpEduField" placeholder="เช่น วิศวกรรมโยธา, สถาปัตยกรรม">
                            </div>
                            <div class="form-group">
                                <label>ปีที่สำเร็จการศึกษา (ค.ศ.)</label>
                                <input type="number" id="inpEduYear" placeholder="เช่น 2024">
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddEduSubmit">+ บันทึกการศึกษา</button>
                    </div>
                `;
                break;

            case 'certificates':
                const certs = portfolioData.certificates || { system: [], manual: [] };
                const sysCerts = certs.system || [];
                const manCerts = certs.manual || [];
                formHtml = `
                    ${sysCerts.length > 0 ? `
                        <label style="font-weight:700; color:var(--editor-navy); font-size:0.9rem; margin-bottom:8px; display:block;">ใบรับรองจากระบบ BimClub (Verified Credential)</label>
                        <div class="items-list-container">
                            ${sysCerts.map(sc => `
                                <div class="item-entry-card" style="border-left:4px solid var(--editor-navy);">
                                    <div class="item-entry-title">✓ ${escapeHtml(sc.course_title)}</div>
                                    <div class="item-entry-subtitle">รหัสอ้างอิง: ${escapeHtml(sc.certificate_code)} | วันที่อนุมัติ: ${new Date(sc.issued_at).toLocaleDateString('th-TH')}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <label style="font-weight:700; color:var(--editor-navy); font-size:0.9rem; margin:16px 0 8px 0; display:block;">ใบรับรองอื่น ๆ (${manCerts.length})</label>
                    <div class="items-list-container">
                        ${manCerts.map(mc => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="cert" data-id="${mc.id}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(mc.title)}</div>
                                <div class="item-entry-subtitle">ผู้ออกให้: ${escapeHtml(mc.issuer)} | วันที่: ${mc.issue_date ? new Date(mc.issue_date).toLocaleDateString('th-TH') : '-'}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มใบรับรองหรือวุฒิบัตร</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ชื่อใบรับรอง</label>
                                <input type="text" id="inpCertTitle" placeholder="เช่น Autodesk Certified Professional">
                            </div>
                            <div class="form-group">
                                <label>สถาบันผู้ออก</label>
                                <input type="text" id="inpCertIssuer" placeholder="เช่น Autodesk, สภาวิศวกร">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>วันที่ได้รับ</label>
                                <input type="date" id="inpCertDate">
                            </div>
                            <div class="form-group">
                                <label>ลิงก์ตรวจสอบใบรับรอง (ถ้ามี)</label>
                                <input type="url" id="inpCertUrl" placeholder="https://...">
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddCertSubmit">+ บันทึกใบรับรอง</button>
                    </div>
                `;
                break;

            case 'awards':
                const awards = extra.awards || [];
                formHtml = `
                    <div class="items-list-container">
                        ${awards.map((a, i) => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="award" data-idx="${i}">ลบ</button>
                                    <div class="item-entry-title">${escapeHtml(a.title)}</div>
                                <div class="item-entry-subtitle">ผู้ออกรางวัล: ${escapeHtml(a.issuer || '')} (${escapeHtml(a.year || '')})</div>
                                ${a.description ? `<p class="item-entry-desc">${escapeHtml(a.description)}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มรางวัลและความสำเร็จ</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ชื่อรางวัล / การแข่งขัน</label>
                                <input type="text" id="inpAwardTitle" placeholder="เช่น รางวัลชนะเลิศการประกวดแบบจำลอง BIM">
                            </div>
                            <div class="form-group">
                                <label>หน่วยงานหรือองค์กรผู้มอบรางวัล</label>
                                <input type="text" id="inpAwardIssuer" placeholder="เช่น คณะวิศวกรรมศาสตร์, วสท.">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ปีที่ได้รับ (พ.ศ. หรือ ค.ศ.)</label>
                                <input type="text" id="inpAwardYear" placeholder="เช่น 2024">
                            </div>
                            <div class="form-group">
                                <label>รายละเอียดเพิ่มเติม</label>
                                <input type="text" id="inpAwardDesc" placeholder="คำอธิบายสั้น ๆ เกี่ยวกับผลงานที่ได้รับรางวัล">
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddAwardSubmit">+ บันทึกรางวัล</button>
                    </div>
                `;
                break;

            case 'activities':
                const activities = extra.activities || [];
                formHtml = `
                    <div class="items-list-container">
                        ${activities.map((act, i) => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="activity" data-idx="${i}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(act.title)}</div>
                                <div class="item-entry-subtitle">บทบาท: ${escapeHtml(act.role || '')} (${escapeHtml(act.year || '')})</div>
                                ${act.description ? `<p class="item-entry-desc">${escapeHtml(act.description)}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มกิจกรรมและบทบาทผู้นำ</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ชื่อกิจกรรม / โครงการ</label>
                                <input type="text" id="inpActTitle" placeholder="เช่น การจัดอบรม BIM Hackathon">
                            </div>
                            <div class="form-group">
                                <label>บทบาทหน้าที่</label>
                                <input type="text" id="inpActRole" placeholder="เช่น ประธานฝ่ายวิชาการ / หัวหน้าทีม">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>ช่วงเวลา / ปี</label>
                            <input type="text" id="inpActYear" placeholder="เช่น 2023 - 2024">
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddActSubmit">+ บันทึกกิจกรรม</button>
                    </div>
                `;
                break;

            case 'languages':
                const languages = extra.languages || [];
                formHtml = `
                    <div class="items-list-container">
                        ${languages.map((lang, i) => `
                            <div class="item-entry-card" style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong>${escapeHtml(lang.language)}</strong>: ${escapeHtml(lang.level)}
                                </div>
                                <button type="button" class="btn-item-delete" data-type="language" data-idx="${i}" style="position:static;">ลบ</button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มทักษะทางภาษา</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ภาษา</label>
                                <input type="text" id="inpLangName" placeholder="เช่น ภาษาอังกฤษ, ภาษาญี่ปุ่น">
                            </div>
                            <div class="form-group">
                                <label>ระดับความสามารถ</label>
                                <select id="inpLangLevel">
                                    <option value="Native">เจ้าของภาษา (Native)</option>
                                    <option value="Fluent / Professional">คล่องแคล่วระดับวิชาชีพ (Fluent)</option>
                                    <option value="Intermediate">ระดับปานกลาง (Intermediate)</option>
                                    <option value="Basic">ระดับพื้นฐาน (Basic)</option>
                                </select>
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddLangSubmit">+ บันทึกภาษา</button>
                    </div>
                `;
                break;

            case 'publications':
                const publications = extra.publications || [];
                formHtml = `
                    <div class="items-list-container">
                        ${publications.map((p, i) => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="publication" data-idx="${i}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(p.title)}</div>
                                <div class="item-entry-subtitle">${escapeHtml(p.publisher || '')} (${escapeHtml(p.year || '')})</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มงานวิจัย / บทความตีพิมพ์</h4>
                        <div class="form-group">
                            <label>ชื่อบทความ / ชื่องานวิจัย</label>
                            <input type="text" id="inpPubTitle" placeholder="เช่น การประยุกต์ใช้แบบจำลองสารสนเทศอาคารเพื่อการอนุรักษ์พลังงาน">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>วารสาร / งานประชุมวิชาการ</label>
                                <input type="text" id="inpPubPublisher" placeholder="เช่น วารสารวิจัยวิศวกรรมศาสตร์">
                            </div>
                            <div class="form-group">
                                <label>ปีที่ตีพิมพ์</label>
                                <input type="text" id="inpPubYear" placeholder="เช่น 2024">
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddPubSubmit">+ บันทึกงานตีพิมพ์</button>
                    </div>
                `;
                break;

            case 'volunteer':
                const volunteer = extra.volunteer || [];
                formHtml = `
                    <div class="items-list-container">
                        ${volunteer.map((v, i) => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="volunteer" data-idx="${i}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(v.role)}</div>
                                <div class="item-entry-subtitle">${escapeHtml(v.organization || '')} (${escapeHtml(v.period || '')})</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มงานจิตอาสา</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>บทบาท</label>
                                <input type="text" id="inpVolRole" placeholder="เช่น วิทยากรสอนเขียนแบบคอมพิวเตอร์">
                            </div>
                            <div class="form-group">
                                <label>องค์กร / มูลนิธิ</label>
                                <input type="text" id="inpVolOrg" placeholder="เช่น ค่ายอาสาพัฒนาชนบท">
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddVolSubmit">+ บันทึกงานจิตอาสา</button>
                    </div>
                `;
                break;

            case 'references':
                const refs = extra.references || [];
                formHtml = `
                    <div class="items-list-container">
                        ${refs.map((r, i) => `
                            <div class="item-entry-card">
                                <button type="button" class="btn-item-delete" data-type="reference" data-idx="${i}">ลบ</button>
                                <div class="item-entry-title">${escapeHtml(r.name)}</div>
                                <div class="item-entry-subtitle">${escapeHtml(r.title || '')} • ${escapeHtml(r.organization || '')}</div>
                                <div style="font-size:0.8rem; color:var(--editor-text-muted);">${escapeHtml(r.contact || '')}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มบุคคลอ้างอิง</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ชื่อ-นามสกุล</label>
                                <input type="text" id="inpRefName" placeholder="เช่น ผศ.ดร. นันทิพัฒน์ วิจารณ์วิศวกรรม">
                            </div>
                            <div class="form-group">
                                <label>ตำแหน่ง / ความสัมพันธ์</label>
                                <input type="text" id="inpRefTitle" placeholder="เช่น อาจารย์ที่ปรึกษาวิทยานิพนธ์">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>หน่วยงาน / บริษัท</label>
                                <input type="text" id="inpRefOrg" placeholder="เช่น ภาควิชาวิศวกรรมโยธา มจธ.">
                            </div>
                            <div class="form-group">
                                <label>ข้อมูลติดต่อ (อีเมล / โทรศัพท์)</label>
                                <input type="text" id="inpRefContact" placeholder="เช่น advisor@kmutt.ac.th, 02-470-xxxx">
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddRefSubmit">+ บันทึกบุคคลอ้างอิง</button>
                    </div>
                `;
                break;

            case 'contact_links':
                const links = extra.custom_contacts || [];
                formHtml = `
                    <div class="form-group">
                        <label>เว็บไซต์หลัก (Website URL)</label>
                        <input type="url" id="inpWebsiteLink" value="${escapeHtml(portfolioData.website_url || '')}" placeholder="https://yourportfolio.com">
                    </div>
                    <label style="font-weight:600; font-size:0.88rem; display:block; margin:16px 0 8px 0;">ลิงก์และเครือข่ายวิชาชีพเพิ่มเติม (${links.length})</label>
                    <div class="items-list-container">
                        ${links.map((link, i) => `
                            <div class="item-entry-card" style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong>${escapeHtml(link.label)}</strong>: <a href="${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url)}</a>
                                </div>
                                <button type="button" class="btn-item-delete" data-type="custom_contact" data-idx="${i}" style="position:static;">ลบ</button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="background:#F8FAFC; border:1px dashed var(--editor-border); padding:16px; border-radius:8px;">
                        <h4 style="margin:0 0 12px 0; font-size:0.95rem; color:var(--editor-navy);">+ เพิ่มลิงก์ใหม่</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>ชื่อลิงก์ / แพลตฟอร์ม</label>
                                <input type="text" id="inpLinkTitle" placeholder="เช่น LinkedIn, GitHub, Behance">
                            </div>
                            <div class="form-group">
                                <label>URL</label>
                                <input type="url" id="inpLinkUrl" placeholder="https://...">
                            </div>
                        </div>
                        <button type="button" class="btn-action primary" id="btnAddLinkSubmit">+ บันทึกช่องทางติดต่อ</button>
                    </div>
                `;
                break;

            default:
                formHtml = '<p>กำลังโหลดฟอร์ม...</p>';
        }

        activeFormContainer.innerHTML = formHtml;
        attachFormEventListeners(sec.id);
    }

    const pendingRows = {};
    let pendingSkill = '', temporaryId = -1, savedPortfolio = {}, saving = false, dirty = false, uploadCount = 0;
    const collectionKey = () => SECTIONS[activeSectionIndex].id === 'contact_links' ? 'custom_contacts' : SECTIONS[activeSectionIndex].id;
    function markDirty() { dirty = true; autoSaveIndicator.textContent = 'ฉบับร่าง — ยังไม่ได้บันทึก'; }
    function syncFormDraftToState() {
        PortfolioModel.syncFormDraftToState(portfolioData, activeFormContainer);
        const key = collectionKey(), config = PortfolioModel.collections[key];
        if (config) {
            const row = { ...pendingRows[key] };
            for (const [field,id] of Object.entries(config.fields)) { const input = document.getElementById(id); if (input) row[field] = input.type === 'checkbox' ? input.checked : input.value; }
            if (row.image_url || Object.entries(config.fields).some(([field,id]) => { const input = document.getElementById(id); return input && input.type !== 'checkbox' && String(row[field] || '').trim() && (input.tagName !== 'SELECT' || input.value !== input.options[0]?.value); })) pendingRows[key] = row;
            else delete pendingRows[key];
        }
        const skill = document.getElementById('inpNewSkill'); if (skill) pendingSkill = skill.value;
    }
    function appendPending(key) {
        const row = pendingRows[key], config = PortfolioModel.collections[key];
        if (!row) return;
        if (config.required.some(field => !String(row[field] || '').trim())) throw new Error('กรุณากรอกข้อมูลรายการใหม่ให้ครบ: ' + key);
        PortfolioModel.list(portfolioData,key).push(config.extra ? {...row} : {...row,id:temporaryId--,can_edit:1});
        delete pendingRows[key];
    }
    async function api(url, method, body) {
        const response = await fetch(url, {method, headers:{'Content-Type':'application/json'}, ...(body !== undefined ? {body:JSON.stringify(body)} : {})});
        const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || 'บันทึกไม่สำเร็จ'); return data;
    }
    async function uploadDraftImage(input, receive) {
        if (!input.files?.length) return;
        const form = new FormData(); form.append('images',input.files[0]);uploadCount++;
        try { const response = await fetch('/api/upload',{method:'POST',body:form}); const result = await response.json(); if (!response.ok || !result.urls?.[0]) throw new Error(result.message || 'อัปโหลดไม่สำเร็จ'); receive(result.urls[0]); markDirty(); updateLivePreview(); }
        catch(error) { showToast(error.message); } finally { uploadCount--; input.value = ''; }
    }
    function attachFormEventListeners() {
        const key = collectionKey(), config = PortfolioModel.collections[key];
        if (config && pendingRows[key]) for (const [field,id] of Object.entries(config.fields)) { const input = document.getElementById(id); if (input) { if (input.type === 'checkbox') input.checked = !!pendingRows[key][field]; else input.value = pendingRows[key][field] || ''; } }
        const avatar = document.getElementById('inpAvatarFile');
        avatar?.addEventListener('change',()=>uploadDraftImage(avatar,url=>{portfolioData.user_profile.avatar_url=url; renderActiveSectionForm();}));
        const projectImage = document.getElementById('inpProjImage');
        projectImage?.addEventListener('change',()=>uploadDraftImage(projectImage,url=>{syncFormDraftToState(); (pendingRows.projects ||= {}).image_url=url;}));
        const skillInput = document.getElementById('inpNewSkill'); if (skillInput) skillInput.value = pendingSkill;
        function addSkill(value) { if (value.trim() && !(portfolioData.skills ||= []).includes(value.trim())) portfolioData.skills.push(value.trim()); pendingSkill=''; markDirty(); renderActiveSectionForm(); updateLivePreview(); }
        document.getElementById('btnAddSkillBtn')?.addEventListener('click',()=>addSkill(skillInput.value));
        skillInput?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addSkill(skillInput.value);}});
        document.querySelectorAll('.preset-chip').forEach(button=>button.addEventListener('click',()=>addSkill(button.dataset.skill)));
        document.querySelectorAll('.btn-remove-skill').forEach(button=>button.addEventListener('click',()=>{portfolioData.skills.splice(Number(button.dataset.idx),1);markDirty();renderActiveSectionForm();updateLivePreview();}));
        if (config) { const add = document.getElementById(config.button); if (add) { add.textContent = '+ เพิ่มรายการในฉบับร่าง'; add.addEventListener('click',()=>{try{syncFormDraftToState();appendPending(key);markDirty();renderActiveSectionForm();updateLivePreview();}catch(error){showToast(error.message);}}); } }
        document.querySelectorAll('.btn-project-visibility').forEach(button=>button.addEventListener('click',()=>{const row = portfolioData.projects.find(item=>Number(item.canonical_project_id || item.id)===Number(button.dataset.id));if(row){row.is_public=!row.is_public;markDirty();renderActiveSectionForm();updateLivePreview();}}));
        const types = {exp:'experiences',edu:'education',project:'projects',cert:'certificates',internship:'internships',award:'awards',activity:'activities',language:'languages',publication:'publications',volunteer:'volunteer',reference:'references',custom_contact:'custom_contacts'};
        document.querySelectorAll('.btn-item-delete').forEach(button=>button.addEventListener('click',()=>{const type=types[button.dataset.type];if(!type)return;const rows=PortfolioModel.list(portfolioData,type);const index=button.dataset.idx !== undefined ? Number(button.dataset.idx) : rows.findIndex(row=>Number(type==='projects' ? row.canonical_project_id || row.id : row.id)===Number(button.dataset.id));if(index>=0){rows.splice(index,1);markDirty();renderActiveSectionForm();updateLivePreview();}}));
        activeFormContainer.querySelectorAll('input,textarea,select').forEach(input=>{if(input.type==='file')return; for(const event of ['input','change']) input.addEventListener(event,()=>{syncFormDraftToState();markDirty();queueLivePreviewUpdate();});});
    }
    // Explicit save reuses the existing user/profile and collection APIs. Retry keeps IDs already created.
    async function saveCurrentSectionData(showNotification = true) {
        if(saving)return false;
        if(uploadCount){showToast('กรุณารออัปโหลดรูปภาพให้เสร็จก่อนบันทึก');return false;}
        saving=true; document.getElementById('btnSaveCurrentSection').disabled=true;
        const locked = [activeFormContainer, sectionNavList, settingsModal, isPublicCheckbox];
        locked.forEach(element => element.inert = true);
        try {
            syncFormDraftToState();
            for(const key of Object.keys(pendingRows)) appendPending(key);
            if(pendingSkill.trim() && !portfolioData.skills.includes(pendingSkill.trim())) portfolioData.skills.push(pendingSkill.trim()); pendingSkill='';
            renderActiveSectionForm(); // Clear committed row inputs so a failed request can be retried without duplicate rows.
            autoSaveIndicator.textContent='กำลังบันทึก...';
            const user=portfolioData.user_profile;
            if (!user.full_name?.trim()) throw new Error('กรุณากรอกชื่อ-นามสกุล');
            const result=await api('/api/auth/profile','PUT',{fullName:user.full_name.trim(),phone:user.phone || '',avatarUrl:user.avatar_url || '',age:currentUser.age ?? ''});
            currentUser=result.user; portfolioData.user_profile={...user,...result.user};
            for(const [key,config] of Object.entries(PortfolioModel.collections)) {
                if(config.extra)continue;
                const rows=PortfolioModel.list(portfolioData,key), previous=PortfolioModel.list(savedPortfolio,key);
                for(let index=0;index<rows.length;index++) {
                    const row=rows[index];
                    if(row.id < 0) {
                        const created=await api(`/api/portfolios/me/${config.path}`,'POST',{...row,startDate:row.start_date ? row.start_date + (row.start_date.length === 7 ? '-01' : '') : null,endDate:row.end_date ? row.end_date + (row.end_date.length === 7 ? '-01' : '') : null,fieldOfStudy:row.field_of_study,endYear:row.end_year,issueDate:row.issue_date,credentialUrl:row.credential_url});
                        rows[index]={...row,...created[config.response],can_edit:1}; previous.push(PortfolioModel.clone(rows[index]));
                    } else if(key==='projects') {
                        const old=previous.find(item=>item.id===row.id);
                        if(old && !!old.is_public !== !!row.is_public){await api(`/api/projects/${row.canonical_project_id || row.id}`,'PUT',{is_public:!!row.is_public});old.is_public=row.is_public;}
                    }
                }
                for(const old of [...previous]) if(!rows.some(row=>row.id===old.id)) {
                    await api(key==='projects' ? `/api/projects/${old.canonical_project_id || old.id}` : `/api/portfolios/me/${config.path}/${old.id}`,'DELETE');previous.splice(previous.findIndex(row=>row.id===old.id),1);
                }
            }
            await api('/api/portfolios/me','PUT',PortfolioModel.saveFields(portfolioData,currentSettings));
            savedPortfolio=PortfolioModel.clone(portfolioData); dirty=false;
            autoSaveIndicator.textContent='บันทึกครบแล้ว';
            renderSectionNav();renderActiveSectionForm();updateLivePreview();
            if(showNotification)showToast('บันทึกข้อมูลครบแล้ว');return true;
        } catch(error) { autoSaveIndicator.textContent='บันทึกไม่ครบ — ฉบับร่างยังอยู่ กรุณาลองใหม่';showToast(error.message);return false; }
        finally {saving=false;locked.forEach(element => element.inert = false);document.getElementById('btnSaveCurrentSection').disabled=false;}
    }
    async function savePortfolioSettings() { return saveCurrentSectionData(); }
    function buildCurrentPayload() {
        const draft=PortfolioModel.clone(portfolioData);
        for(const [key,row] of Object.entries(pendingRows)) PortfolioModel.list(draft,key).push({...row,id:undefined});
        if(pendingSkill.trim() && !draft.skills.includes(pendingSkill.trim())) draft.skills.push(pendingSkill.trim());
        return PortfolioModel.documentPayload(draft,currentUser,currentSettings);
    }

    // Debounced Live Preview Update
    function queueLivePreviewUpdate() {
        clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(() => {
            syncFormDraftToState(); updateLivePreview();
        }, 200);
    }

    // Update Live Preview Iframe
    function updateLivePreview() {
        if (!docPreviewIframe) return;
        syncFormDraftToState();
        const payload = buildCurrentPayload();
        const html = PortfolioTemplates.renderDocument(payload);
        docPreviewIframe.srcdoc = html;
    }

    // PDF Direct Export Handler
    async function handlePdfDownload() {
        try {
            btnDownloadPdf.disabled = true;
            btnDownloadPdf.innerHTML = '<span>⏳</span> <span>กำลังสร้าง PDF...</span>';

            if (!await saveCurrentSectionData(false)) throw new Error('กรุณาบันทึกข้อมูลให้ครบก่อนดาวน์โหลด');
            const res = await fetch('/api/portfolios/me/export/pdf?type=portfolio');

            if (!res.ok) {
                throw new Error('Server error');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const userName = (currentUser.full_name || 'Portfolio').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_');
            a.download = `${userName}_Portfolio.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!');
        } catch (err) {
            console.error('PDF download error:', err);
            alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF กรุณาลองใหม่อีกครั้ง');
        } finally {
            btnDownloadPdf.disabled = false;
            btnDownloadPdf.innerHTML = '<span>บันทึกและดาวน์โหลด PDF</span>';
        }
    }

    // Settings UI Sync
    function syncSettingsUiFromState() {
        selectPageSize.value = currentSettings.pageSize || 'a4';
        selectOrientation.value = currentSettings.orientation || 'portrait';
        selectLanguage.value = currentSettings.language || 'th';
        
        const theme = currentSettings.theme || {};
        colorPickerPrimary.value = theme.primary || '#012240';
        colorPickerSecondary.value = theme.secondary || '#AD0F0F';
        selectBgTheme.value = theme.bg || 'white';

        const branding = currentSettings.branding || {};
        checkShowSoeLogo.checked = branding.showSoeLogo !== false;
        checkShowBimLogo.checked = branding.showBimClubLogo !== false;
        selectFooterStyle.value = branding.footerStyle || 'footer-bar';
        inputInstitutionText.value = branding.institutionText ?? 'BimClub Official Accredited • Faculty of Engineering';
        selectLogoSize.value = branding.logoSize || 'medium';
        selectBrandingScope.value = branding.scope || 'all';
        soeLogoStatus.textContent = branding.soeLogoUrl ? 'ใช้โลโก้ที่อัปโหลดไว้แล้ว' : 'ใช้โลโก้เริ่มต้นของระบบ';
        bimLogoStatus.textContent = branding.bimClubLogoUrl ? 'ใช้โลโก้ที่อัปโหลดไว้แล้ว' : 'ใช้โลโก้เริ่มต้นของระบบ';

        // Select active template card
        document.querySelectorAll('#portfolioTemplateGrid .template-card').forEach(card => {
            const tpl = card.getAttribute('data-template');
            card.classList.toggle('active', tpl === currentSettings.template);
        });

        checkContrast();
    }

    // Check WCAG Contrast Ratio
    function checkContrast() {
        const p = colorPickerPrimary.value;
        const bgVal = selectBgTheme.value;
        const bgMap = { white: '#FFFFFF', cream: '#FDFBF7', light_gray: '#F8FAFC', dark: '#0A0F1D' };
        const bgHex = bgMap[bgVal] || '#FFFFFF';

        const ratio = PortfolioTemplates.getContrastRatio(p, bgHex);
        if (ratio >= 4.5) {
            contrastFeedback.className = 'contrast-alert-box pass';
            contrastFeedback.innerHTML = `<span>✓</span> <span>ระดับคอนทราสต์ (${ratio.toFixed(1)}:1) ผ่านเกณฑ์มาตรฐาน WCAG AA</span>`;
        } else {
            contrastFeedback.className = 'contrast-alert-box fail';
            contrastFeedback.innerHTML = `<span>⚠️</span> <span>ระดับคอนทราสต์ (${ratio.toFixed(1)}:1) ค่อนข้างต่ำ อาจทำให้อ่านยาก แนะนำปรับสีให้เข้มขึ้น</span>`;
        }
    }

    // Toast notification
    function showToast(msg) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `<span>✓</span> <span>${escapeHtml(msg)}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2800);
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Top & Footer Button Listeners
    document.getElementById('btnSaveCurrentSection').addEventListener('click', () => saveCurrentSectionData(true));
    btnDownloadPdf.addEventListener('click', handlePdfDownload);

    // Section Prev / Next
    document.getElementById('btnPrevSection').addEventListener('click', async () => {
        if (!saving && activeSectionIndex > 0) {
            syncFormDraftToState();
            activeSectionIndex--;
            renderSectionNav();
            renderActiveSectionForm();
        }
    });

    document.getElementById('btnNextSection').addEventListener('click', async () => {
        if (!saving && activeSectionIndex < SECTIONS.length - 1) {
            syncFormDraftToState();
            activeSectionIndex++;
            renderSectionNav();
            renderActiveSectionForm();
        }
    });

    // Public toggle
    isPublicCheckbox.addEventListener('change', async () => {
        const isPub = isPublicCheckbox.checked;
        portfolioData.is_public = isPub; markDirty();
        updatePublicBadge(isPub);
        showToast(isPub ? 'จะเปิดเผยแพร่เมื่อกดบันทึก' : 'จะซ่อนเมื่อกดบันทึก');
    });

    function syncSettingsDraftToState() {
        currentSettings.pageSize = selectPageSize.value;
        currentSettings.orientation = selectOrientation.value;
        currentSettings.language = selectLanguage.value;
        Object.assign(currentSettings.theme, {primary:colorPickerPrimary.value, secondary:colorPickerSecondary.value, bg:selectBgTheme.value, textColor:PortfolioTemplates.BG_THEMES[selectBgTheme.value].text, accentColor:colorPickerSecondary.value});
        Object.assign(currentSettings.branding, {showSoeLogo:checkShowSoeLogo.checked, showBimClubLogo:checkShowBimLogo.checked, footerStyle:selectFooterStyle.value, institutionText:inputInstitutionText.value, logoSize:selectLogoSize.value, scope:selectBrandingScope.value});
    }
    for (const event of ['input','change']) settingsModal.addEventListener(event, () => {syncSettingsDraftToState();markDirty();checkContrast();queueLivePreviewUpdate();});
    // Settings Modal
    btnOpenSettings.addEventListener('click', () => {
        syncSettingsUiFromState();
        settingsModal.style.display = 'flex';
    });
    btnCloseSettings.addEventListener('click', () => { settingsModal.style.display = 'none'; });
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.style.display = 'none';
    });

    // Template selection click
    document.querySelectorAll('#portfolioTemplateGrid .template-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('#portfolioTemplateGrid .template-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            currentSettings.template = card.getAttribute('data-template'); markDirty();
            updateLivePreview();
        });
    });

    // Swap changes the same local settings draft as the individual controls.
    btnSwapColors.addEventListener('click', () => {
        const primary = colorPickerPrimary.value;
        colorPickerPrimary.value = colorPickerSecondary.value;
        colorPickerSecondary.value = primary;
        syncSettingsDraftToState();markDirty();checkContrast();updateLivePreview();
    });

    // Apply Settings
    btnApplySettings.addEventListener('click', async () => {
        syncSettingsDraftToState();
        markDirty();
        if (!await savePortfolioSettings()) return;
        updateLivePreview();
        settingsModal.style.display = 'none';
        showToast('บันทึกการตั้งค่าธีมและแม่แบบเรียบร้อย');
    });

    async function uploadBrandingLogo(input, key, statusNode, label) {
        if (!input?.files?.length) return;
        const file = input.files[0];
        const formData = new FormData();
        formData.append('images', file);uploadCount++;
        statusNode.textContent = `กำลังอัปโหลด${label}...`;
        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok || !result.success || !result.urls?.[0]) {
                throw new Error(result.message || 'Upload failed');
            }
            currentSettings.branding[key] = result.urls[0];markDirty();
            statusNode.textContent = 'อัปโหลดแล้ว — กดบันทึกการตั้งค่าเพื่อใช้งาน';
            updateLivePreview();
        } catch (error) {
            console.error('Branding logo upload error:', error);
            statusNode.textContent = 'อัปโหลดไม่สำเร็จ กรุณาเลือกไฟล์รูปภาพไม่เกิน 5MB';
        } finally {
            uploadCount--;input.value = '';
        }
    }

    inputSoeLogo?.addEventListener('change', () => uploadBrandingLogo(inputSoeLogo, 'soeLogoUrl', soeLogoStatus, 'โลโก้ SOE'));
    inputBimLogo?.addEventListener('change', () => uploadBrandingLogo(inputBimLogo, 'bimClubLogoUrl', bimLogoStatus, 'โลโก้ BimClub'));

    // Preview zoom controls
    document.getElementById('btnZoomFit')?.addEventListener('click', () => {
        docPreviewIframe.style.transform = 'scale(0.85)';
        docPreviewIframe.style.transformOrigin = 'top center';
    });
    document.getElementById('btnZoom100')?.addEventListener('click', () => {
        docPreviewIframe.style.transform = 'scale(1)';
        docPreviewIframe.style.transformOrigin = 'top center';
    });
    document.getElementById('btnRefreshPreview')?.addEventListener('click', () => {
        updateLivePreview();
    });

    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
    // Initialize
    loadPortfolioData();
});
