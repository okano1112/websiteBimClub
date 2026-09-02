const fs = require('fs');

let content = fs.readFileSync('public/page/portfolio.html', 'utf8');

const certSection = `
        <div class="portfolio-section">
            <h2 class="section-title">ใบรับรอง (Certificates)</h2>
            <div class="list-container" id="certList">
                <p style="color:var(--text-muted); font-size:0.9rem;">กำลังโหลด...</p>
            </div>
            
            <form id="addCertForm" class="add-form" style="margin-top:20px; padding:15px; background:#f8fafc; border-radius:6px; border:1px solid var(--border-color);">
                <h4 style="margin-bottom:15px;">เพิ่มใบรับรองใหม่ (อื่นๆ)</h4>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">ชื่อใบรับรอง *</label>
                        <input type="text" id="certTitle" class="form-control" required>
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">ผู้ออกให้ (Issuer) *</label>
                        <input type="text" id="certIssuer" class="form-control" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group flex-1">
                        <label class="form-label">วันที่ออก *</label>
                        <input type="date" id="certDate" class="form-control" required>
                    </div>
                    <div class="form-group flex-1">
                        <label class="form-label">ลิงก์อ้างอิง (ถ้ามี)</label>
                        <input type="url" id="certUrl" class="form-control">
                    </div>
                </div>
                <button type="submit" class="btn btn-outline" style="width:100%;">เพิ่มใบรับรอง</button>
            </form>
        </div>
`;

// Insert it right after the projects section
content = content.replace('<!-- Projects -->', certSection + '\n        <!-- Projects -->');
fs.writeFileSync('public/page/portfolio.html', content, 'utf8');
