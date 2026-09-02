const fs = require('fs');
let content = fs.readFileSync('public/page/portfolio-public.html', 'utf8');

const certCode = `
                let certHtml = '';
                if (port.certificates && (port.certificates.system.length > 0 || port.certificates.manual.length > 0)) {
                    if (port.certificates.system.length > 0) {
                        certHtml += '<h4 style="margin-bottom:10px; color:#ad0f0f;">ใบรับรองจากระบบ (BimClub)</h4>';
                        certHtml += port.certificates.system.map(cert => \`
                            <div class="resume-item">
                                <div class="resume-item-title">\${cert.course_title}</div>
                                <div class="resume-item-date">รหัสอ้างอิง: \${cert.certificate_code} | วันที่: \${new Date(cert.issued_at).toLocaleDateString('th-TH')}</div>
                            </div>
                        \`).join('');
                    }
                    if (port.certificates.manual.length > 0) {
                        certHtml += '<h4 style="margin-top:20px; margin-bottom:10px; color:#ad0f0f;">ใบรับรองอื่นๆ</h4>';
                        certHtml += port.certificates.manual.map(cert => \`
                            <div class="resume-item">
                                <div class="resume-item-title">\${cert.title}</div>
                                <div class="resume-item-subtitle">\${cert.issuer}</div>
                                <div class="resume-item-date">วันที่: \${new Date(cert.issue_date).toLocaleDateString('th-TH')}</div>
                                \${cert.credential_url ? \`<a href="\${cert.credential_url}" target="_blank" style="font-size:0.9rem; color:#ad0f0f; display:inline-block; margin-top:4px;">ลิงก์ใบรับรอง</a>\` : ''}
                            </div>
                        \`).join('');
                    }
                } else {
                    certHtml = '<p style="color:#9ca3af;font-size:0.9rem">ไม่มีข้อมูล</p>';
                }
`;

content = content.replace('let projHtml = \'\';', certCode + '\n                let projHtml = \'\';');
content = content.replace('<!-- Projects -->', '');

const certRender = `
                            <div class="resume-section">
                                <h2 class="resume-section-title">ใบรับรอง (Certificates)</h2>
                                \${certHtml}
                            </div>
`;

content = content.replace('<div class="resume-section">\n                                <h2 class="resume-section-title">ผลงานส่วนตัว</h2>', certRender + '\n                            <div class="resume-section">\n                                <h2 class="resume-section-title">ผลงานส่วนตัว</h2>');

fs.writeFileSync('public/page/portfolio-public.html', content, 'utf8');
