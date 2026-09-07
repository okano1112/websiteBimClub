document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;
    let currentSkills = [];

    // Elements
    const basicInfoForm = document.getElementById('basicInfoForm');
    const headline = document.getElementById('headline');
    const summary = document.getElementById('summary');
    const websiteUrl = document.getElementById('websiteUrl');
    const isPublic = document.getElementById('isPublic');
    const statusIndicatorBadge = document.getElementById('statusIndicatorBadge');
    const shareLinkContainer = document.getElementById('shareLinkContainer');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const shareLinkAnchor = document.getElementById('shareLinkAnchor');
    const btnCopyShareLink = document.getElementById('btnCopyShareLink');
    const btnTopShowcasePreview = document.getElementById('btnTopShowcasePreview');

    const skillsContainer = document.getElementById('skillsContainer');
    const newSkill = document.getElementById('newSkill');
    const btnAddSkill = document.getElementById('btnAddSkill');

    const expList = document.getElementById('expList');
    const addExpForm = document.getElementById('addExpForm');

    const eduList = document.getElementById('eduList');
    const addEduForm = document.getElementById('addEduForm');

    const projectList = document.getElementById('projectList');
    const addProjectForm = document.getElementById('addProjectForm');

    const certList = document.getElementById('certList');
    const addCertForm = document.getElementById('addCertForm');

    // 1. Check Auth
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = 'login.html';
            return;
        }
        const meData = await res.json();
        currentUser = meData.user || meData;
    } catch (err) {
        window.location.href = 'login.html';
        return;
    }

    // Set top showcase preview link
    const uid = currentUser.id || currentUser.user_id;
    if (btnTopShowcasePreview && uid) {
        btnTopShowcasePreview.href = `/page/portfolio-public.html?id=${uid}`;
    }

    // 2. Fetch Data
    const loadPortfolio = async () => {
        try {
            const res = await fetch('/api/portfolios/me');
            if (res.ok) {
                const data = await res.json();
                const port = data.portfolio || data;
                headline.value = port.headline || '';
                summary.value = port.summary || '';
                websiteUrl.value = port.website_url || port.websiteUrl || '';
                isPublic.checked = Boolean(port.is_public ?? port.isPublic);
                currentSkills = port.skills ? (typeof port.skills === 'string' ? JSON.parse(port.skills) : port.skills) : [];

                renderSkills();
                updateShareLink();
                renderExp(port.experiences || []);
                renderEdu(port.education || []);
                renderProjects(port.projects || []);
                if (port.certificates) renderCertificates(port.certificates);
            }
        } catch (err) {
            console.error('Failed to load portfolio', err);
        }
    };

    // 3. Render functions
    const updateShareLink = () => {
        if (!currentUser) return;
        const targetUid = currentUser.id || currentUser.user_id;
        const url = `${window.location.origin}/page/portfolio-public.html?id=${targetUid}`;
        
        if (btnTopShowcasePreview) {
            btnTopShowcasePreview.href = url;
        }

        if (isPublic.checked) {
            if (statusIndicatorBadge) {
                statusIndicatorBadge.className = 'status-indicator-badge public';
                statusIndicatorBadge.innerHTML = '<span>●</span> <span>สถานะ: เผยแพร่สาธารณะ (Public)</span>';
            }
            if (shareLinkContainer) shareLinkContainer.style.display = 'block';
            if (shareLinkInput) shareLinkInput.value = url;
            if (shareLinkAnchor) shareLinkAnchor.href = url;
        } else {
            if (statusIndicatorBadge) {
                statusIndicatorBadge.className = 'status-indicator-badge private';
                statusIndicatorBadge.innerHTML = '<span>●</span> <span>สถานะ: ซ่อนเป็นส่วนตัว (Private)</span>';
            }
            if (shareLinkContainer) shareLinkContainer.style.display = 'none';
        }
    };

    const renderSkills = () => {
        skillsContainer.innerHTML = '';
        if (currentSkills.length === 0) {
            skillsContainer.innerHTML = '<span style="color:var(--slate-400);font-size:0.9rem;padding:4px 0;">ยังไม่มีการระบุทักษะ เลือกเพิ่มจากทักษะแนะนำด้านล่างได้เลย</span>';
            return;
        }

        currentSkills.forEach((skill, idx) => {
            const tag = document.createElement('div');
            tag.className = 'skill-tag';
            tag.innerHTML = `<span>${escapeHtml(skill)}</span> <button type="button" data-idx="${idx}" title="ลบทักษะนี้">&times;</button>`;
            skillsContainer.appendChild(tag);
        });

        // Remove skill
        skillsContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = e.currentTarget.getAttribute('data-idx');
                currentSkills.splice(idx, 1);
                await saveBasicInfo(null, false);
                renderSkills();
                showToast('ลบทักษะเรียบร้อย');
            });
        });
    };

    const renderExp = (experiences) => {
        expList.innerHTML = '';
        if (!experiences || experiences.length === 0) {
            expList.innerHTML = '<p style="color:var(--slate-400);font-size:0.92rem;margin:0 0 14px;">ยังไม่มีข้อมูลประสบการณ์ทำงาน</p>';
            return;
        }

        experiences.forEach(exp => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.innerHTML = `
                <h4>${escapeHtml(exp.position)} - ${escapeHtml(exp.company)}</h4>
                <p>ช่วงเวลา: ${escapeHtml(exp.start_date)} ถึง ${escapeHtml(exp.end_date || 'ปัจจุบัน')}</p>
                ${exp.description ? `<div class="desc">${escapeHtml(exp.description)}</div>` : ''}
                <button type="button" class="btn-delete" data-id="${exp.id}">ลบ</button>
            `;
            expList.appendChild(card);
        });

        expList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('คุณต้องการลบประวัติการทำงานนี้ใช่หรือไม่?')) {
                    const res = await fetch(`/api/portfolios/me/experiences/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('ลบประสบการณ์ทำงานเรียบร้อย');
                        loadPortfolio();
                    }
                }
            });
        });
    };

    const renderEdu = (education) => {
        eduList.innerHTML = '';
        if (!education || education.length === 0) {
            eduList.innerHTML = '<p style="color:var(--slate-400);font-size:0.92rem;margin:0 0 14px;">ยังไม่มีข้อมูลประวัติการศึกษา</p>';
            return;
        }

        education.forEach(edu => {
            const card = document.createElement('div');
            card.className = 'list-card';
            const yearStr = edu.graduation_year || edu.end_year || '-';
            card.innerHTML = `
                <h4>${escapeHtml(edu.degree)} - ${escapeHtml(edu.institution)}</h4>
                <p>สาขาวิชา: ${escapeHtml(edu.field_of_study || '-')} (ปีที่สำเร็จ: ${escapeHtml(String(yearStr))})</p>
                <button type="button" class="btn-delete" data-id="${edu.id}">ลบ</button>
            `;
            eduList.appendChild(card);
        });

        eduList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('คุณต้องการลบประวัติการศึกษานี้ใช่หรือไม่?')) {
                    const res = await fetch(`/api/portfolios/me/education/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('ลบประวัติการศึกษาเรียบร้อย');
                        loadPortfolio();
                    }
                }
            });
        });
    };

    const renderProjects = (projects) => {
        if (!projectList) return;
        projectList.innerHTML = '';
        if (!projects || projects.length === 0) {
            projectList.innerHTML = '<p style="color:var(--slate-400);font-size:0.92rem;margin:0 0 14px;">ยังไม่มีข้อมูลผลงานที่จัดแสดง</p>';
            return;
        }

        projects.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.innerHTML = `
                ${proj.image_url ? `<img src="${escapeHtml(proj.image_url)}" style="width:110px; height:75px; object-fit:cover; float:left; margin-right:16px; border-radius:8px; border:1px solid var(--slate-200);">` : ''}
                <h4>${escapeHtml(proj.title)}</h4>
                <div class="desc">${escapeHtml(proj.description || '')}</div>
                ${proj.project_url ? `<a href="${escapeHtml(proj.project_url)}" target="_blank" style="font-size:0.88rem; color:var(--maroon-700); font-weight:600; display:inline-block; margin-top:6px;">ดูผลงาน ↗</a><br>` : ''}
                <button type="button" class="btn-delete" style="margin-top:10px;" data-id="${proj.id}">ลบผลงาน</button>
                <div style="clear:both;"></div>
            `;
            projectList.appendChild(card);
        });

        projectList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('คุณต้องการลบผลงานนี้ใช่หรือไม่?')) {
                    const res = await fetch(`/api/portfolios/me/projects/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('ลบผลงานเรียบร้อย');
                        loadPortfolio();
                    }
                }
            });
        });
    };

    const renderCertificates = (certificates) => {
        if (!certList) return;
        certList.innerHTML = '';

        const hasSystem = certificates.system && certificates.system.length > 0;
        const hasManual = certificates.manual && certificates.manual.length > 0;

        if (!hasSystem && !hasManual) {
            certList.innerHTML = '<p style="color:var(--slate-400);font-size:0.92rem;margin:0 0 14px;">ยังไม่มีข้อมูลใบรับรอง</p>';
            return;
        }

        // System Certs
        if (hasSystem) {
            certList.innerHTML += '<div style="font-size:0.95rem; font-weight:700; color:var(--maroon-900); margin:4px 0 10px;">🏆 ใบรับรองจากระบบ BimClub (Verified)</div>';
            certificates.system.forEach(cert => {
                const card = document.createElement('div');
                card.className = 'system-cert-card';
                card.style.marginBottom = '12px';
                card.innerHTML = `
                    <span class="system-cert-badge">✓ BimClub Certified</span>
                    <h4 style="margin:4px 0 6px;color:var(--maroon-950);font-size:1.05rem;">${escapeHtml(cert.course_title)}</h4>
                    <p style="margin:0 0 4px;font-size:0.88rem;color:var(--slate-600);">
                        รหัสอ้างอิง: <strong style="font-family:monospace;color:var(--maroon-700);">${escapeHtml(cert.certificate_code)}</strong> | 
                        วันที่อนุมัติ: ${new Date(cert.issued_at).toLocaleDateString('th-TH')}
                    </p>
                    <a href="/api/courses/certificate-by-code/${encodeURIComponent(cert.certificate_code)}" target="_blank" style="font-size:0.85rem;color:var(--maroon-700);font-weight:600;">เปิดดูใบเซอร์ระบบ ↗</a>
                `;
                certList.appendChild(card);
            });
        }

        // Manual Certs
        if (hasManual) {
            certList.innerHTML += `<div style="font-size:0.95rem; font-weight:700; color:var(--maroon-900); margin:${hasSystem ? '20px' : '4px'} 0 10px;">📜 ใบรับรองและการฝึกอบรมอื่น ๆ</div>`;
            certificates.manual.forEach(cert => {
                const card = document.createElement('div');
                card.className = 'list-card';
                card.innerHTML = `
                    <h4>${escapeHtml(cert.title)}</h4>
                    <p>ผู้ออกให้: ${escapeHtml(cert.issuer)} | วันที่ได้รับ: ${new Date(cert.issue_date).toLocaleDateString('th-TH')}</p>
                    ${cert.credential_url ? `<a href="${escapeHtml(cert.credential_url)}" target="_blank" style="font-size:0.88rem; color:var(--maroon-700); font-weight:600;">ดูหลักฐานใบรับรอง ↗</a><br>` : ''}
                    <button type="button" class="btn-delete" style="margin-top:8px;" data-id="${cert.id}">ลบ</button>
                `;
                certList.appendChild(card);
            });
        }

        certList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('คุณต้องการลบใบรับรองนี้ใช่หรือไม่?')) {
                    const res = await fetch(`/api/portfolios/me/certificates/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('ลบใบรับรองเรียบร้อย');
                        loadPortfolio();
                    }
                }
            });
        });
    };

    // 4. Save functions
    const saveBasicInfo = async (e, showNotification = true) => {
        if (e) e.preventDefault();
        const payload = {
            headline: headline.value,
            summary: summary.value,
            websiteUrl: websiteUrl.value,
            website_url: websiteUrl.value,
            isPublic: isPublic.checked,
            is_public: isPublic.checked,
            skills: currentSkills
        };

        try {
            const res = await fetch('/api/portfolios/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok && showNotification) {
                showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
            }
        } catch (err) {
            console.error(err);
            if (showNotification) alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    // Listeners
    basicInfoForm.addEventListener('submit', (e) => saveBasicInfo(e, true));

    isPublic.addEventListener('change', async () => {
        updateShareLink();
        await saveBasicInfo(null, false);
        showToast(isPublic.checked ? 'เปิดเผยแพร่พอร์ตโฟลิโอเป็นสาธารณะแล้ว' : 'ซ่อนพอร์ตโฟลิโอเป็นส่วนตัวแล้ว');
    });

    if (btnCopyShareLink) {
        btnCopyShareLink.addEventListener('click', async () => {
            if (shareLinkInput && shareLinkInput.value) {
                if (navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(shareLinkInput.value);
                        showToast('คัดลอกลิงก์พอร์ตโฟลิโอเรียบร้อยแล้ว');
                        return;
                    } catch (e) {}
                }
                prompt('คัดลอกลิงก์ด้านล่างนี้ได้เลย:', shareLinkInput.value);
            }
        });
    }

    // Add Skill
    const handleAddSkill = async () => {
        const val = newSkill.value.trim();
        if (val && !currentSkills.includes(val)) {
            currentSkills.push(val);
            newSkill.value = '';
            await saveBasicInfo(null, false);
            renderSkills();
            showToast(`เพิ่มทักษะ "${val}" เรียบร้อย`);
        }
    };

    btnAddSkill.addEventListener('click', handleAddSkill);

    newSkill.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSkill();
        }
    });

    // Preset Skills Click
    document.querySelectorAll('.preset-tag').forEach(tag => {
        tag.addEventListener('click', async () => {
            const skillName = tag.getAttribute('data-skill');
            if (skillName && !currentSkills.includes(skillName)) {
                currentSkills.push(skillName);
                await saveBasicInfo(null, false);
                renderSkills();
                showToast(`เพิ่มทักษะ "${skillName}" เรียบร้อย`);
            }
        });
    });

    // Add Experience
    addExpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = addExpForm.querySelector('button[type="submit"]');
        btn.textContent = 'กำลังบันทึก...';
        btn.disabled = true;

        const payload = {
            company: document.getElementById('expCompany').value,
            position: document.getElementById('expPosition').value,
            startDate: document.getElementById('expStartDate').value,
            start_date: document.getElementById('expStartDate').value,
            endDate: document.getElementById('expEndDate').value || null,
            end_date: document.getElementById('expEndDate').value || null,
            description: document.getElementById('expDescription').value
        };

        const res = await fetch('/api/portfolios/me/experiences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        btn.textContent = 'บันทึกและเพิ่มประสบการณ์';
        btn.disabled = false;

        if (res.ok) {
            addExpForm.reset();
            showToast('เพิ่มประสบการณ์ทำงานเรียบร้อย');
            loadPortfolio();
        }
    });

    // Add Education
    addEduForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = addEduForm.querySelector('button[type="submit"]');
        btn.textContent = 'กำลังบันทึก...';
        btn.disabled = true;

        const payload = {
            institution: document.getElementById('eduInstitution').value,
            degree: document.getElementById('eduDegree').value,
            fieldOfStudy: document.getElementById('eduField').value,
            field_of_study: document.getElementById('eduField').value,
            endYear: document.getElementById('eduYear').value,
            graduation_year: document.getElementById('eduYear').value
        };

        const res = await fetch('/api/portfolios/me/education', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        btn.textContent = 'บันทึกและเพิ่มการศึกษา';
        btn.disabled = false;

        if (res.ok) {
            addEduForm.reset();
            showToast('เพิ่มประวัติการศึกษาเรียบร้อย');
            loadPortfolio();
        }
    });

    // Add Project
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = addProjectForm.querySelector('button[type="submit"]');
            btn.textContent = 'กำลังอัปโหลด...';
            btn.disabled = true;

            let imageUrl = '';
            const fileInput = document.getElementById('projImage');
            if (fileInput.files.length > 0) {
                try {
                    const fd = new FormData();
                    fd.append('images', fileInput.files[0]);
                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                    const uploadData = await uploadRes.json();
                    if (uploadData.success && uploadData.urls && uploadData.urls.length > 0) {
                        imageUrl = uploadData.urls[0];
                    }
                } catch (upErr) {
                    console.error('Upload error:', upErr);
                }
            }

            const payload = {
                title: document.getElementById('projTitle').value,
                projectUrl: document.getElementById('projUrl').value,
                description: document.getElementById('projDescription').value,
                imageUrl: imageUrl
            };

            const res = await fetch('/api/portfolios/me/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            btn.textContent = 'บันทึกและเพิ่มผลงาน';
            btn.disabled = false;

            if (res.ok) {
                addProjectForm.reset();
                showToast('เพิ่มผลงานโครงการเรียบร้อย');
                loadPortfolio();
            }
        });
    }

    // Add Certificate
    if (addCertForm) {
        addCertForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = addCertForm.querySelector('button[type="submit"]');
            btn.textContent = 'กำลังบันทึก...';
            btn.disabled = true;

            const payload = {
                title: document.getElementById('certTitle').value,
                issuer: document.getElementById('certIssuer').value,
                issueDate: document.getElementById('certDate').value,
                credentialUrl: document.getElementById('certUrl').value
            };

            const res = await fetch('/api/portfolios/me/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            btn.textContent = 'บันทึกและเพิ่มใบรับรอง';
            btn.disabled = false;

            if (res.ok) {
                addCertForm.reset();
                showToast('เพิ่มใบรับรองเรียบร้อย');
                loadPortfolio();
            }
        });
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(msg) {
        const existing = document.querySelector('.toast-msg');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `<span>✓</span> <span>${escapeHtml(msg)}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 2800);
    }

    // Init
    loadPortfolio();
});

