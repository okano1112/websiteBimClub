const fs = require('fs');

let content = fs.readFileSync('public/js/portfolio.js', 'utf8');

// Insert renderCertificates and its listener
const renderCertificatesCode = `

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
                card.innerHTML = \`
                    <h4>\${cert.course_title}</h4>
                    <p>รหัสอ้างอิง: \${cert.certificate_code} | วันที่: \${new Date(cert.issued_at).toLocaleDateString('th-TH')}</p>
                \`;
                certList.appendChild(card);
            });
        }
        
        // Manual Certs
        if (certificates.manual && certificates.manual.length > 0) {
            certList.innerHTML += '<h4 style="margin-top:20px; margin-bottom:10px; color:#ad0f0f;">ใบรับรองอื่นๆ</h4>';
            certificates.manual.forEach(cert => {
                const card = document.createElement('div');
                card.className = 'list-card';
                card.innerHTML = \`
                    <h4>\${cert.title}</h4>
                    <p>ผู้ออกให้: \${cert.issuer} | วันที่: \${new Date(cert.issue_date).toLocaleDateString('th-TH')}</p>
                    \${cert.credential_url ? \`<a href="\${cert.credential_url}" target="_blank" style="font-size:0.85rem; color:#ad0f0f;">ลิงก์ใบรับรอง</a><br>\` : ''}
                    <button type="button" class="btn-delete" style="margin-top:10px;" data-id="\${cert.id}">ลบ</button>
                \`;
                certList.appendChild(card);
            });
        }

        certList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if(confirm('ต้องการลบใบรับรองนี้?')) {
                    await fetch(\`/api/portfolios/me/certificates/\${id}\`, { method: 'DELETE' });
                    loadPortfolio();
                }
            });
        });
    };
`;

// Insert the call to renderCertificates inside loadPortfolio
content = content.replace(
    'renderProjects(data.portfolio.projects || []);',
    'renderProjects(data.portfolio.projects || []);\n                if (data.portfolio.certificates) renderCertificates(data.portfolio.certificates);'
);

content = content.replace('const addProjectForm = document.getElementById(\'addProjectForm\');', renderCertificatesCode + '\n    const addProjectForm = document.getElementById(\'addProjectForm\');');

const addCertListener = `
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
`;

content = content.replace('// Init', addCertListener + '\n    // Init');
fs.writeFileSync('public/js/portfolio.js', content, 'utf8');
