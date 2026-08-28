const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { sendMail } = require('../config/mailer');
const requireLogin = require('../middleware/requireLogin');
const { normalizeUser } = require('../middleware/requireRole');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ============================================================
// POST /register — สมัครสมาชิก + ส่งอีเมลยืนยัน
// ============================================================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, fullName } = req.body;

        if (!username || !email || !password || !fullName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้งานหรืออีเมลนี้มีในระบบแล้ว' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // สร้าง verify token
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ชั่วโมง

        const [result] = await db.query(
            `INSERT INTO users (username, email, password, full_name, is_verified, verify_token, verify_token_expires) 
             VALUES (?, ?, ?, ?, 0, ?, ?)`,
            [username, email, hashedPassword, fullName, verifyToken, verifyExpires]
        );

        const userId = result.insertId;

        await db.query('INSERT INTO portfolios (user_id) VALUES (?)', [userId]);

        // ส่งอีเมลยืนยัน
        const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${verifyToken}`;
        await sendMail(
            email,
            'ยืนยันอีเมลสำหรับบัญชี BimClub',
            `
            <div style="font-family: 'Noto Sans Thai', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #ad0f0f;">BimClub</h1>
                </div>
                <h2>สวัสดี ${fullName} 👋</h2>
                <p>ขอบคุณที่สมัครสมาชิก BimClub! กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyUrl}" 
                       style="background: #ad0f0f; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                       ยืนยันอีเมล
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง</p>
                <p style="color: #999; font-size: 12px;">หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยอีเมลนี้</p>
            </div>
            `
        );

        res.status(201).json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
    }
});

// ============================================================
// GET /verify-email?token=xxx — ยืนยันอีเมล
// ============================================================
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.send(verifyResultPage(false, 'ไม่พบ token ยืนยัน'));
        }

        const [users] = await db.query(
            'SELECT id, verify_token_expires FROM users WHERE verify_token = ? AND is_verified = 0',
            [token]
        );

        if (users.length === 0) {
            return res.send(verifyResultPage(false, 'ลิงก์ยืนยันไม่ถูกต้อง หรือบัญชีนี้ได้รับการยืนยันแล้ว'));
        }

        const user = users[0];

        // ตรวจ token หมดอายุ
        if (new Date() > new Date(user.verify_token_expires)) {
            return res.send(verifyResultPage(false, 'ลิงก์ยืนยันหมดอายุแล้ว กรุณาขอส่งอีเมลยืนยันอีกครั้ง'));
        }

        // ยืนยันสำเร็จ
        await db.query(
            'UPDATE users SET is_verified = 1, verify_token = NULL, verify_token_expires = NULL WHERE id = ?',
            [user.id]
        );

        return res.send(verifyResultPage(true, 'ยืนยันอีเมลสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว'));
    } catch (error) {
        console.error(error);
        return res.send(verifyResultPage(false, 'เกิดข้อผิดพลาด กรุณาลองใหม่'));
    }
});

// ============================================================
// POST /resend-verify — ส่งอีเมลยืนยันซ้ำ
// ============================================================
router.post('/resend-verify', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });
        }

        const [users] = await db.query(
            'SELECT id, full_name, is_verified FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // ไม่บอกว่าไม่มีอีเมลนี้ เพื่อความปลอดภัย
            return res.json({ success: true, message: 'หากอีเมลนี้มีอยู่ในระบบ จะได้รับอีเมลยืนยันใหม่' });
        }

        const user = users[0];

        if (user.is_verified) {
            return res.json({ success: true, message: 'บัญชีนี้ได้รับการยืนยันแล้ว สามารถเข้าสู่ระบบได้เลย' });
        }

        // สร้าง token ใหม่
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.query(
            'UPDATE users SET verify_token = ?, verify_token_expires = ? WHERE id = ?',
            [verifyToken, verifyExpires, user.id]
        );

        const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${verifyToken}`;
        await sendMail(
            email,
            'ยืนยันอีเมลสำหรับบัญชี BimClub (ส่งซ้ำ)',
            `
            <div style="font-family: 'Noto Sans Thai', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #ad0f0f; text-align:center;">BimClub</h1>
                <h2>สวัสดี ${user.full_name} 👋</h2>
                <p>นี่คืออีเมลยืนยันที่ส่งซ้ำ กรุณากดปุ่มด้านล่าง</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyUrl}" 
                       style="background: #ad0f0f; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ยืนยันอีเมล
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง</p>
            </div>
            `
        );

        res.json({ success: true, message: 'ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// ============================================================
// POST /login — เข้าสู่ระบบ (ต้องยืนยันอีเมลก่อน)
// ============================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ตรวจสอบการยืนยันอีเมล
        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                needVerify: true,
                message: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ ตรวจสอบกล่องจดหมายของคุณ'
            });
        }

        req.session.user = normalizeUser(user);

        res.json({ success: true, user: req.session.user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }
});

// ============================================================
// POST /logout — ออกจากระบบ
// ============================================================
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการออกจากระบบ' });
        }
        res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
    });
});

// ============================================================
// GET /me — ดึงข้อมูลผู้ใช้ปัจจุบัน
// ============================================================
router.get('/me', requireLogin, (req, res) => {
    res.json({ success: true, user: req.currentUser });
});

// ============================================================
// PUT /profile — แก้ไขข้อมูลโปรไฟล์
// ============================================================
router.put('/profile', requireLogin, async (req, res) => {
    try {
        const { fullName, phone, avatarUrl } = req.body;
        const trimmedFullName = String(fullName || '').trim();
        const trimmedPhone = String(phone || '').trim();
        const trimmedAvatarUrl = String(avatarUrl || '').trim();

        if (!trimmedFullName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-นามสกุล' });
        }

        if (trimmedPhone && !/^[0-9+\-\s()]{8,30}$/.test(trimmedPhone)) {
            return res.status(400).json({ success: false, message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' });
        }

        if (trimmedAvatarUrl && !trimmedAvatarUrl.startsWith('/uploads/')) {
            return res.status(400).json({ success: false, message: 'รูปโปรไฟล์ต้องเป็นไฟล์ที่อัปโหลดผ่านระบบเท่านั้น' });
        }

        await db.query(
            'UPDATE users SET full_name = ?, phone = ?, avatar_url = ? WHERE id = ?',
            [trimmedFullName, trimmedPhone || null, trimmedAvatarUrl || null, req.currentUser.id]
        );

        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.currentUser.id]);
        req.session.user = normalizeUser(users[0]);

        res.json({
            success: true,
            message: 'บันทึกข้อมูลโปรไฟล์สำเร็จ',
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกโปรไฟล์' });
    }
});

// ============================================================
// POST /forgot-password — ขอลิงก์รีเซ็ตรหัสผ่าน
// ============================================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });
        }

        const [users] = await db.query('SELECT id, full_name FROM users WHERE email = ?', [email]);

        // ไม่บอกว่าไม่พบอีเมล เพื่อป้องกัน email enumeration
        if (users.length === 0) {
            return res.json({ success: true, message: 'หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับลิงก์กู้คืนรหัสผ่าน' });
        }

        const user = users[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง

        await db.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, resetExpires, user.id]
        );

        const resetUrl = `${APP_URL}/page/reset-password.html?token=${resetToken}`;
        await sendMail(
            email,
            'กู้คืนรหัสผ่าน BimClub',
            `
            <div style="font-family: 'Noto Sans Thai', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #ad0f0f; text-align:center;">BimClub</h1>
                <h2>สวัสดี ${user.full_name} 👋</h2>
                <p>เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background: #ad0f0f; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ตั้งรหัสผ่านใหม่
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">ลิงก์นี้จะหมดอายุภายใน 1 ชั่วโมง</p>
                <p style="color: #999; font-size: 12px;">หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้</p>
            </div>
            `
        );

        res.json({ success: true, message: 'หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับลิงก์กู้คืนรหัสผ่าน' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// ============================================================
// POST /reset-password — รีเซ็ตรหัสผ่านด้วย token
// ============================================================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        const [users] = await db.query(
            'SELECT id, reset_token_expires FROM users WHERE reset_token = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'ลิงก์กู้คืนไม่ถูกต้อง หรือถูกใช้ไปแล้ว' });
        }

        const user = users[0];

        if (new Date() > new Date(user.reset_token_expires)) {
            return res.status(400).json({ success: false, message: 'ลิงก์กู้คืนหมดอายุแล้ว กรุณาขอลิงก์ใหม่' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ! สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// ============================================================
// PUT /change-password — เปลี่ยนรหัสผ่านขณะล็อกอิน
// ============================================================
router.put('/change-password', requireLogin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.session.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        }

        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.user.id]);

        res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});


// ============================================================
// Helper: สร้างหน้า HTML แสดงผลยืนยันอีเมล
// ============================================================
function verifyResultPage(success, message) {
    const color = success ? '#16a34a' : '#dc2626';
    const icon = success ? '✅' : '❌';
    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ยืนยันอีเมล - BimClub</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Noto Sans Thai', sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { background: #fff; border-radius: 16px; padding: 40px; text-align: center; max-width: 450px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
            .icon { font-size: 60px; margin-bottom: 16px; }
            h1 { color: ${color}; margin-bottom: 12px; font-size: 1.4rem; }
            p { color: #666; margin-bottom: 24px; }
            a { display: inline-block; padding: 12px 24px; background: #ad0f0f; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">${icon}</div>
            <h1>${message}</h1>
            <p>${success ? 'บัญชีของคุณพร้อมใช้งานแล้ว' : 'กรุณาลองใหม่อีกครั้ง'}</p>
            <a href="/page/login.html">ไปหน้าเข้าสู่ระบบ</a>
        </div>
    </body>
    </html>
    `;
}

module.exports = router;
