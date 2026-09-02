import re

with open('routes/auth.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Register logic
register_token_pattern = r"const verifyToken = crypto\.randomBytes\(32\)\.toString\('hex'\);"
register_token_repl = "const verifyToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP"
content = re.sub(register_token_pattern, register_token_repl, content, count=1)

# Modify email content in Register
email_html_pattern = r'<a href="\$\{verifyUrl\}".*?>.*?ยืนยันอีเมล.*?</a>'
email_html_repl = '<h2 style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; letter-spacing: 5px; font-size: 24px; color: #ad0f0f;">${verifyToken}</h2>'
# Wait, we need to remove verifyUrl and use verifyToken
content = re.sub(r'const verifyUrl =.*?;', '', content, count=1)
content = re.sub(r'<p>ขอบคุณที่สมัครสมาชิก BimClub! กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ</p>\s*<div style="text-align: center; margin: 30px 0;">\s*<a href="\$\{verifyUrl\}".*?>.*?ยืนยันอีเมล.*?</a>\s*</div>', 
                 '<p>ขอบคุณที่สมัครสมาชิก BimClub! รหัส OTP สำหรับยืนยันอีเมลของคุณคือ:</p>\n                <div style="text-align: center; margin: 30px 0;">\n                    <h2 style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; letter-spacing: 5px; font-size: 24px; color: #ad0f0f;">${verifyToken}</h2>\n                </div>', content, flags=re.DOTALL)

# 2. Resend logic
resend_token_pattern = r"const verifyToken = crypto\.randomBytes\(32\)\.toString\('hex'\);"
content = re.sub(resend_token_pattern, register_token_repl, content, count=1)
content = re.sub(r'const verifyUrl =.*?;', '', content, count=1)
content = re.sub(r'<p>นี่คืออีเมลยืนยันที่ส่งซ้ำ กรุณากดปุ่มด้านล่าง</p>\s*<div style="text-align: center; margin: 30px 0;">\s*<a href="\$\{verifyUrl\}".*?>.*?ยืนยันอีเมล.*?</a>\s*</div>',
                 '<p>นี่คือรหัส OTP ใหม่สำหรับการยืนยันอีเมลของคุณ:</p>\n                <div style="text-align: center; margin: 30px 0;">\n                    <h2 style="background: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; letter-spacing: 5px; font-size: 24px; color: #ad0f0f;">${verifyToken}</h2>\n                </div>', content, flags=re.DOTALL)

# 3. Modify verify route
verify_get_pattern = r"// ============================================================\n// GET /verify-email\?token=xxx — ยืนยันอีเมล\n// ============================================================\nrouter\.get\('/verify-email', async \(req, res\) => \{[\s\S]*?return res\.send\(verifyResultPage\(false, 'เกิดข้อผิดพลาด กรุณาลองใหม่'\)\);\n    \}\n\}\);"

verify_post_code = """// ============================================================
// POST /verify-otp — ยืนยัน OTP
// ============================================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัส OTP' });
        }

        const [users] = await db.query(
            'SELECT id, verify_token_expires FROM users WHERE email = ? AND verify_token = ? AND is_verified = 0',
            [email, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง หรือบัญชีนี้ได้รับการยืนยันแล้ว' });
        }

        const user = users[0];

        // ตรวจ token หมดอายุ
        if (new Date() > new Date(user.verify_token_expires)) {
            return res.status(400).json({ success: false, message: 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' });
        }

        // ยืนยันสำเร็จ
        await db.query(
            'UPDATE users SET is_verified = 1, verify_token = NULL, verify_token_expires = NULL WHERE id = ?',
            [user.id]
        );

        res.json({ success: true, message: 'ยืนยันอีเมลสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    }
});"""

content = re.sub(verify_get_pattern, verify_post_code, content)

with open('routes/auth.js', 'w', encoding='utf-8') as f:
    f.write(content)
