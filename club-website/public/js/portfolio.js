document.addEventListener('DOMContentLoaded', async () => {
    let currentUser = null;
    let currentSkills = [];

    // Elements
    const basicInfoForm = document.getElementById('basicInfoForm');
    const headline = document.getElementById('headline');
    const summary = document.getElementById('summary');
    const websiteUrl = document.getElementById('websiteUrl');
    const isPublic = document.getElementById('isPublic');
    const shareLinkContainer = document.getElementById('shareLinkContainer');
    const shareLink = document.getElementById('shareLink');
    
    const skillsContainer = document.getElementById('skillsContainer');
    const newSkill = document.getElementById('newSkill');
    const btnAddSkill = document.getElementById('btnAddSkill');

    const expList = document.getElementById('expList');
    const addExpForm = document.getElementById('addExpForm');

    const eduList = document.getElementById('eduList');
    const addEduForm = document.getElementById('addEduForm');

    // 1. Check Auth
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = await res.json();
    } catch (err) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Fetch Data
    const loadPortfolio = async () => {
        try {
            const res = await fetch('/api/portfolios/me');
            if (res.ok) {
                const data = await res.json();
                headline.value = data.headline || '';
                summary.value = data.summary || '';
                websiteUrl.value = data.website_url || '';
                isPublic.checked = data.is_public || false;
                currentSkills = data.skills ? (typeof data.skills === 'string' ? JSON.parse(data.skills) : data.skills) : [];
                
                renderSkills();
                updateShareLink();
                renderExp(data.experiences || []);
                renderEdu(data.education || []);
                if (typeof renderProjects !== 'undefined') renderProjects(data.projects || []);
            }
        } catch (err) {
            console.error('Failed to load portfolio', err);
        }
    };

    // 3. Render functions
    const updateShareLink = () => {
        if (isPublic.checked) {
            const url = `${window.location.origin}/page/portfolio-public.html?id=${currentUser.id || currentUser.user_id}`;
            shareLink.href = url;
            shareLink.textContent = url;
            shareLinkContainer.style.display = 'block';
        } else {
            shareLinkContainer.style.display = 'none';
        }
    };

    const renderSkills = () => {
        skillsContainer.innerHTML = '';
        currentSkills.forEach((skill, idx) => {
            const tag = document.createElement('div');
            tag.className = 'skill-tag';
            tag.innerHTML = `<span>${skill}</span> <button type="button" data-idx="${idx}">&times;</button>`;
            skillsContainer.appendChild(tag);
        });
        
        // Remove skill
        skillsContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = e.target.getAttribute('data-idx');
                currentSkills.splice(idx, 1);
                await saveBasicInfo();
                renderSkills();
            });
        });
    };

    const renderExp = (experiences) => {
        expList.innerHTML = '';
        experiences.forEach(exp => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.innerHTML = `
                <h4>${exp.position} - ${exp.company}</h4>
                <p>${exp.start_date} ถึง ${exp.end_date || 'ปัจจุบัน'}</p>
                <div class="desc">${exp.description || ''}</div>
                <button type="button" class="btn-delete" data-id="${exp.id}">ลบ</button>
            `;
            expList.appendChild(card);
        });
        
        expList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if(confirm('ต้องการลบประสบการณ์นี้?')) {
                    await fetch(`/api/portfolios/me/experiences/${id}`, { method: 'DELETE' });
                    loadPortfolio();
                }
            });
        });
    };

    const renderEdu = (education) => {
        eduList.innerHTML = '';
        education.forEach(edu => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.innerHTML = `
                <h4>${edu.degree} - ${edu.institution}</h4>
                <p>สาขา: ${edu.field_of_study} (ปีที่จบ: ${edu.graduation_year})</p>
                <button type="button" class="btn-delete" data-id="${edu.id}">ลบ</button>
            `;
            eduList.appendChild(card);
        });

        eduList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if(confirm('ต้องการลบประวัติการศึกษานี้?')) {
                    await fetch(`/api/portfolios/me/education/${id}`, { method: 'DELETE' });
                    loadPortfolio();
                }
            });
        });
    };

    const renderProjects = (projects) => {
        const projectList = document.getElementById('projectList');
        if (!projectList) return;
        projectList.innerHTML = '';
        projects.forEach(proj => {
            const card = document.createElement('div');
            card.className = 'list-card';
            card.innerHTML = `
                ${proj.image_url ? `<img src="${proj.image_url}" style="width:100px; height:70px; object-fit:cover; float:left; margin-right:15px; border-radius:6px;">` : ''}
                <h4>${proj.title}</h4>
                <div class="desc">${proj.description || ''}</div>
                ${proj.project_url ? `<a href="${proj.project_url}" target="_blank" style="font-size:0.85rem; color:#ad0f0f;">ดูลิงก์ผลงาน</a><br>` : ''}
                <button type="button" class="btn-delete" style="margin-top:10px;" data-id="${proj.id}">ลบผลงาน</button>
                <div style="clear:both;"></div>
            `;
            projectList.appendChild(card);
        });

        projectList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if(confirm('ต้องการลบผลงานนี้?')) {
                    await fetch(`/api/portfolios/me/projects/${id}`, { method: 'DELETE' });
                    loadPortfolio();
                }
            });
        });
    };

    // 4. Save functions
    const saveBasicInfo = async (e) => {
        if(e) e.preventDefault();
        const payload = {
            headline: headline.value,
            summary: summary.value,
            website_url: websiteUrl.value,
            is_public: isPublic.checked,
            skills: currentSkills // Backend should handle JSON parsing/stringifying
        };
        
        try {
            await fetch('/api/portfolios/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(e) alert('บันทึกข้อมูลเรียบร้อย');
        } catch(err) {
            console.error(err);
            if(e) alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    // Listeners
    basicInfoForm.addEventListener('submit', saveBasicInfo);
    isPublic.addEventListener('change', updateShareLink);
    
    btnAddSkill.addEventListener('click', async () => {
        const val = newSkill.value.trim();
        if(val && !currentSkills.includes(val)) {
            currentSkills.push(val);
            newSkill.value = '';
            await saveBasicInfo();
            renderSkills();
        }
    });

    addExpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            company: document.getElementById('expCompany').value,
            position: document.getElementById('expPosition').value,
            start_date: document.getElementById('expStartDate').value,
            end_date: document.getElementById('expEndDate').value,
            description: document.getElementById('expDescription').value
        };
        await fetch('/api/portfolios/me/experiences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        addExpForm.reset();
        loadPortfolio();
    });

    addEduForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            institution: document.getElementById('eduInstitution').value,
            degree: document.getElementById('eduDegree').value,
            field_of_study: document.getElementById('eduField').value,
            graduation_year: document.getElementById('eduYear').value
        };
        await fetch('/api/portfolios/me/education', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        addEduForm.reset();
        loadPortfolio();
    });

    

    const renderCertificates = (certificates) => {
        const certList = document.getElementById('certList');
        if (!certList) return;
        certList.innerHTML = '';
        
        // System Certs
        if (certificates.system && certificates.system.length > 0) {
            certList.innerHTML += '<h4 style="margin-top:10px; margin-bottom:10px; color:#ad0f0f;">ใบรับรองจากระบบ (BimClub)</h4>';
            certificates.system.forEach(cert => {
                const card = document.createElement('div');
                card.className = 'list-card';
                card.innerHTML = `
                    <h4>${cert.course_title}</h4>
                    <p>รหัสอ้างอิง: ${cert.certificate_code} | วันที่: ${new Date(cert.issued_at).toLocaleDateString('th-TH')}</p>
                `;
                certList.appendChild(card);
            });
        }
        
        // Manual Certs
        if (certificates.manual && certificates.manual.length > 0) {
            certList.innerHTML += '<h4 style="margin-top:20px; margin-bottom:10px; color:#ad0f0f;">ใบรับรองอื่นๆ</h4>';
            certificates.manual.forEach(cert => {
                const card = document.createElement('div');
                card.className = 'list-card';
                card.innerHTML = `
                    <h4>${cert.title}</h4>
                    <p>ผู้ออกให้: ${cert.issuer} | วันที่: ${new Date(cert.issue_date).toLocaleDateString('th-TH')}</p>
                    ${cert.credential_url ? `<a href="${cert.credential_url}" target="_blank" style="font-size:0.85rem; color:#ad0f0f;">ลิงก์ใบรับรอง</a><br>` : ''}
                    <button type="button" class="btn-delete" style="margin-top:10px;" data-id="${cert.id}">ลบ</button>
                `;
                certList.appendChild(card);
            });
        }

        certList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if(confirm('ต้องการลบใบรับรองนี้?')) {
                    await fetch(`/api/portfolios/me/certificates/${id}`, { method: 'DELETE' });
                    loadPortfolio();
                }
            });
        });
    };

    const addProjectForm = document.getElementById('addProjectForm');
    if (addProjectForm) {
        addProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'กำลังอัปโหลด...';
            btn.disabled = true;

            let imageUrl = '';
            const fileInput = document.getElementById('projImage');
            if (fileInput.files.length > 0) {
                const fd = new FormData();
                fd.append('images', fileInput.files[0]);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.urls.length > 0) {
                    imageUrl = uploadData.urls[0];
                }
            }

            const payload = {
                title: document.getElementById('projTitle').value,
                projectUrl: document.getElementById('projUrl').value,
                description: document.getElementById('projDescription').value,
                imageUrl: imageUrl
            };

            await fetch('/api/portfolios/me/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            btn.textContent = 'เพิ่มผลงาน';
            btn.disabled = false;
            addProjectForm.reset();
            loadPortfolio();
        });
    }

    
    const addCertForm = document.getElementById('addCertForm');
    if (addCertForm) {
        addCertForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'กำลังบันทึก...';
            btn.disabled = true;

            const payload = {
                title: document.getElementById('certTitle').value,
                issuer: document.getElementById('certIssuer').value,
                issueDate: document.getElementById('certDate').value,
                credentialUrl: document.getElementById('certUrl').value
            };

            await fetch('/api/portfolios/me/certificates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            btn.textContent = 'เพิ่มใบรับรอง';
            btn.disabled = false;
            addCertForm.reset();
            loadPortfolio();
        });
    }

    // Init
    loadPortfolio();
});
