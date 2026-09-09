/**
 * BimClub CV Editor Controller
 * Manages separate CV settings, templates (Standard, ATS-safe, Letter, Creative, A3), live preview, and direct PDF generation
 */

document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;
    let portfolioData = {};
    let cvSettings = {
        docType: 'cv',
        template: 'cv-a4-standard',
        pageSize: 'a4',
        orientation: 'portrait',
        theme: {
            primary: '#012240',
            secondary: '#AD0F0F',
            bg: 'white',
            textColor: '#0F172A'
        },
        branding: {
            showSoeLogo: true,
            showBimClubLogo: true,
            footerStyle: 'footer-bar'
        },
        hiddenSections: [],
        language: 'th'
    };

    // DOM Elements
    const selectCvTemplate = document.getElementById('selectCvTemplate');
    const atsBadgeIndicator = document.getElementById('atsBadgeIndicator');
    const cvTargetRole = document.getElementById('cvTargetRole');
    const cvLanguageSelect = document.getElementById('cvLanguageSelect');
    const cvObjectiveText = document.getElementById('cvObjectiveText');
    const cvSyncedDataSummary = document.getElementById('cvSyncedDataSummary');
    const cvPreviewIframe = document.getElementById('cvPreviewIframe');
    const btnDownloadCvPdf = document.getElementById('btnDownloadCvPdf');
    const btnSaveCvData = document.getElementById('btnSaveCvData');

    // Checklist Elements
    const chkCvObjective = document.getElementById('chkCvObjective');
    const chkCvAbout = document.getElementById('chkCvAbout');
    const chkCvEdu = document.getElementById('chkCvEdu');
    const chkCvExp = document.getElementById('chkCvExp');
    const chkCvIntern = document.getElementById('chkCvIntern');
    const chkCvProjects = document.getElementById('chkCvProjects');
    const chkCvSkills = document.getElementById('chkCvSkills');
    const chkCvCerts = document.getElementById('chkCvCerts');
    const chkCvAwards = document.getElementById('chkCvAwards');
    const chkCvActivities = document.getElementById('chkCvActivities');
    const chkCvLanguages = document.getElementById('chkCvLanguages');
    const chkCvReferences = document.getElementById('chkCvReferences');

    // Settings Modal
    const cvSettingsModal = document.getElementById('cvSettingsModal');
    const btnOpenCvSettings = document.getElementById('btnOpenCvSettings');
    const btnCloseCvSettings = document.getElementById('btnCloseCvSettings');
    const btnApplyCvSettings = document.getElementById('btnApplyCvSettings');
    const selectCvPageSize = document.getElementById('selectCvPageSize');
    const selectCvOrientation = document.getElementById('selectCvOrientation');
    const cvColorPrimary = document.getElementById('cvColorPrimary');
    const cvColorSecondary = document.getElementById('cvColorSecondary');

    // 1. Auth Check
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = 'login.html';
            return;
        }
        const meData = await res.json();
        currentUser = meData.user || meData;
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Load Portfolio & CV Data
    async function loadCvData() {
        try {
            const res = await fetch('/api/portfolios/me');
            if (res.ok) {
                const data = await res.json();
                portfolioData = data.portfolio || data;

                if (portfolioData.cv_settings && Object.keys(portfolioData.cv_settings).length > 0) {
                    cvSettings = Object.assign(cvSettings, portfolioData.cv_settings);
                }

                // Initial inputs
                cvTargetRole.value = portfolioData.target_role || '';
                cvObjectiveText.value = portfolioData.career_objective || portfolioData.summary || '';
                selectCvTemplate.value = cvSettings.template || 'cv-a4-standard';
                cvLanguageSelect.value = cvSettings.language || 'th';
                applyTemplateGeometryDefaults(selectCvTemplate.value);

                // Checklists
                const hidden = cvSettings.hiddenSections || [];
                chkCvObjective.checked = !hidden.includes('objective');
                chkCvAbout.checked = !hidden.includes('about');
                chkCvEdu.checked = !hidden.includes('education');
                chkCvExp.checked = !hidden.includes('experiences');
                chkCvIntern.checked = !hidden.includes('internships');
                chkCvProjects.checked = !hidden.includes('projects');
                chkCvSkills.checked = !hidden.includes('skills');
                chkCvCerts.checked = !hidden.includes('certificates');
                chkCvAwards.checked = !hidden.includes('awards');
                chkCvActivities.checked = !hidden.includes('activities');
                chkCvLanguages.checked = !hidden.includes('languages');
                chkCvReferences.checked = !hidden.includes('references');

                updateAtsBadge();
                renderSyncedSummary();
                updateCvPreview();
            }
        } catch (err) {
            console.error('Failed to load CV data:', err);
        }
    }

    // Render Synced Profile Data Summary
    function renderSyncedSummary() {
        const skills = portfolioData.skills || [];
        const exps = portfolioData.experiences || [];
        const edus = portfolioData.education || [];
        const certs = portfolioData.certificates || { system: [], manual: [] };
        const projs = portfolioData.projects || [];

        cvSyncedDataSummary.innerHTML = `
            <div><strong>• ประวัติการทำงาน:</strong> ${exps.length} รายการ</div>
            <div><strong>• ประวัติการศึกษา:</strong> ${edus.length} สถาบัน</div>
            <div><strong>• ทักษะความเชี่ยวชาญ:</strong> ${skills.length} ทักษะ (${skills.slice(0,4).join(', ')}${skills.length > 4 ? '...' : ''})</div>
            <div><strong>• ผลงานเด่น:</strong> ${projs.length} โครงการ</div>
            <div><strong>• ใบรับรองและวุฒิบัตร:</strong> ${(certs.system?.length || 0) + (certs.manual?.length || 0)} รายการ</div>
        `;
    }

    // Update ATS Badge Indicator
    function updateAtsBadge() {
        const tpl = selectCvTemplate.value;
        if (tpl === 'cv-a4-ats') {
            atsBadgeIndicator.className = 'ats-badge-pill';
            atsBadgeIndicator.innerHTML = '<span>✓</span> <span>ATS Safe (ระบบคัดกรองอัตโนมัติ)</span>';
        } else if (tpl === 'cv-a3-presentation') {
            atsBadgeIndicator.className = 'ats-badge-pill warning';
            atsBadgeIndicator.innerHTML = '<span>⚠️</span> <span>A3 Presentation (ไม่แนะนำสำหรับส่งงาน)</span>';
        } else if (tpl === 'cv-a4-landscape-creative') {
            atsBadgeIndicator.className = 'ats-badge-pill warning';
            atsBadgeIndicator.innerHTML = '<span>🎨</span> <span>Creative Horizontal</span>';
        } else {
            atsBadgeIndicator.className = 'ats-badge-pill';
            atsBadgeIndicator.innerHTML = '<span>✓</span> <span>Professional Standard</span>';
        }
    }

    // Keep a named CV layout aligned with its real-world paper geometry.
    // Users may still override the geometry afterward from the settings drawer.
    function applyTemplateGeometryDefaults(template) {
        const defaults = {
            'cv-a4-standard': { pageSize: 'a4', orientation: 'portrait' },
            'cv-a4-ats': { pageSize: 'a4', orientation: 'portrait' },
            'cv-letter-standard': { pageSize: 'letter', orientation: 'portrait' },
            'cv-a4-landscape-creative': { pageSize: 'a4', orientation: 'landscape' },
            'cv-a3-presentation': { pageSize: 'a3', orientation: 'landscape' }
        };
        const geometry = defaults[template];
        if (!geometry) return;
        cvSettings.pageSize = geometry.pageSize;
        cvSettings.orientation = geometry.orientation;
        if (selectCvPageSize) selectCvPageSize.value = geometry.pageSize;
        if (selectCvOrientation) selectCvOrientation.value = geometry.orientation;
    }

    // Collect Hidden Sections from Checklist
    function collectHiddenSections() {
        const hidden = [];
        if (!chkCvObjective.checked) hidden.push('objective');
        if (!chkCvAbout.checked) hidden.push('about');
        if (!chkCvEdu.checked) hidden.push('education');
        if (!chkCvExp.checked) hidden.push('experiences');
        if (!chkCvIntern.checked) hidden.push('internships');
        if (!chkCvProjects.checked) hidden.push('projects');
        if (!chkCvSkills.checked) hidden.push('skills');
        if (!chkCvCerts.checked) hidden.push('certificates');
        if (!chkCvAwards.checked) hidden.push('awards');
        if (!chkCvActivities.checked) hidden.push('activities');
        if (!chkCvLanguages.checked) hidden.push('languages');
        if (!chkCvReferences.checked) hidden.push('references');
        return hidden;
    }

    // Build Current CV Payload
    function buildCvPayload() {
        const user = portfolioData.user_profile || currentUser || {};
        cvSettings.hiddenSections = collectHiddenSections();
        cvSettings.template = selectCvTemplate.value;
        cvSettings.language = cvLanguageSelect.value;

        return {
            profile: {
                fullName: user.full_name || 'สมาชิก BimClub',
                headline: portfolioData.headline || '',
                targetRole: cvTargetRole.value.trim() || portfolioData.target_role || '',
                summary: portfolioData.summary || '',
                careerObjective: cvObjectiveText.value.trim() || portfolioData.career_objective || '',
                avatarUrl: user.avatar_url || '',
                email: user.email || '',
                phone: user.phone || '',
                websiteUrl: portfolioData.website_url || '',
                customLinks: portfolioData.extra_sections?.custom_contacts || []
            },
            skills: portfolioData.skills || [],
            experiences: portfolioData.experiences || [],
            education: portfolioData.education || [],
            projects: portfolioData.projects || [],
            certificates: portfolioData.certificates || { system: [], manual: [] },
            extraSections: portfolioData.extra_sections || {},
            settings: cvSettings
        };
    }

    // Update Live Preview
    function updateCvPreview() {
        if (!cvPreviewIframe) return;
        const payload = buildCvPayload();
        const html = PortfolioTemplates.renderDocument(payload);
        cvPreviewIframe.srcdoc = html;
    }

    // Save CV Data & Settings
    async function saveCvData(showNotification = true) {
        cvSettings.hiddenSections = collectHiddenSections();
        cvSettings.template = selectCvTemplate.value;
        cvSettings.language = cvLanguageSelect.value;

        const payload = {
            targetRole: cvTargetRole.value.trim(),
            careerObjective: cvObjectiveText.value.trim(),
            cvSettings: cvSettings
        };

        try {
            const res = await fetch('/api/portfolios/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok && showNotification) {
                showToast('บันทึกการตั้งค่า CV เรียบร้อยแล้ว');
            }
        } catch (e) {
            console.error('Save CV error:', e);
        }
    }

    // Download CV PDF
    async function handleDownloadCvPdf() {
        try {
            btnDownloadCvPdf.disabled = true;
            btnDownloadCvPdf.innerHTML = '<span>⏳</span> <span>กำลังสร้าง PDF...</span>';

            const payload = {
                type: 'cv',
                template: selectCvTemplate.value,
                pageSize: cvSettings.pageSize || 'a4',
                orientation: cvSettings.orientation || 'portrait',
                theme: cvSettings.theme,
                branding: cvSettings.branding,
                language: cvLanguageSelect.value,
                hiddenSections: collectHiddenSections()
            };

            const res = await fetch('/api/portfolios/me/export/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Server error');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const userName = (currentUser.full_name || 'CV').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_');
            a.download = `${userName}_CV.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showToast('ดาวน์โหลด CV (PDF) สำเร็จ!');
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
        } finally {
            btnDownloadCvPdf.disabled = false;
            btnDownloadCvPdf.innerHTML = '<span>📥</span> <span>ดาวน์โหลด CV (PDF)</span>';
        }
    }

    // Toast
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
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Listeners
    selectCvTemplate.addEventListener('change', () => {
        applyTemplateGeometryDefaults(selectCvTemplate.value);
        updateAtsBadge();
        updateCvPreview();
        saveCvData(false);
    });

    cvLanguageSelect.addEventListener('change', () => {
        updateCvPreview();
        saveCvData(false);
    });

    [cvTargetRole, cvObjectiveText].forEach(inp => {
        inp.addEventListener('input', () => {
            updateCvPreview();
        });
    });

    // Checkbox items
    document.querySelectorAll('#cvSectionChecklist input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', () => {
            updateCvPreview();
            saveCvData(false);
        });
    });

    btnSaveCvData.addEventListener('click', () => saveCvData(true));
    btnDownloadCvPdf.addEventListener('click', handleDownloadCvPdf);
    document.getElementById('btnRefreshCvPreview')?.addEventListener('click', updateCvPreview);

    // Settings Modal
    btnOpenCvSettings.addEventListener('click', () => {
        selectCvPageSize.value = cvSettings.pageSize || 'a4';
        selectCvOrientation.value = cvSettings.orientation || 'portrait';
        cvColorPrimary.value = cvSettings.theme?.primary || '#012240';
        cvColorSecondary.value = cvSettings.theme?.secondary || '#AD0F0F';
        cvSettingsModal.style.display = 'flex';
    });

    btnCloseCvSettings.addEventListener('click', () => { cvSettingsModal.style.display = 'none'; });
    cvSettingsModal.addEventListener('click', (e) => {
        if (e.target === cvSettingsModal) cvSettingsModal.style.display = 'none';
    });

    btnApplyCvSettings.addEventListener('click', async () => {
        cvSettings.pageSize = selectCvPageSize.value;
        cvSettings.orientation = selectCvOrientation.value;
        cvSettings.theme.primary = cvColorPrimary.value;
        cvSettings.theme.secondary = cvColorSecondary.value;
        await saveCvData(true);
        updateCvPreview();
        cvSettingsModal.style.display = 'none';
    });

    // Init
    loadCvData();
});
