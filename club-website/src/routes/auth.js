const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const { sendMail } = require('../../config/mailer');
const requireLogin = require('../../middleware/requireLogin');
const { normalizeUser } = require('../../middleware/requireRole');
const accountController = require('../controllers/account.controller');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const verification = require('../services/verification');

// Registration commits the account before attempting delivery. A delivery failure is recoverable by resend.
router.post('/register', async (req, res) => {
    if (['username', 'email', 'password', 'fullName'].some(key => typeof req.body?.[key] !== 'string')) return res.status(400).json({ success: false, message: 'รูปแบบข้อมูลสมัครสมาชิกไม่ถูกต้อง' });
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const fullName = String(req.body.fullName || '').trim();
    if (!username || username.length > 50 || !fullName || fullName.length > 100 || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและอีเมลให้ถูกต้อง' });
    if (password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์' });
    let conn;
    const token = verification.issue(email);
    try {
        const passwordHash = await bcrypt.hash(password, 12);
        conn = await db.getConnection();
        await conn.beginTransaction();
        const [result] = await conn.query(`INSERT INTO users (username, email, password, full_name, is_verified, verify_token, verify_token_expires, verify_sent_at, verify_attempts) VALUES (?, ?, ?, ?, 0, ?, ?, NOW(), 0)`, [username, email, passwordHash, fullName, token.hash, token.expires]);
        await conn.query('INSERT INTO portfolios (user_id) VALUES (?)', [result.insertId]);
        await conn.commit();
    } catch (error) {
        if (conn) await conn.rollback();
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'ชื่อผู้ใช้หรืออีเมลนี้มีบัญชีแล้ว หากยังไม่ยืนยัน ให้ขอรหัสใหม่ด้านล่าง' });
        console.error('Registration failed:', error.code);
        return res.status(500).json({ success: false, message: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่' });
    } finally { if (conn) conn.release(); }
    let deliveryPending = false;
    try { await sendMail(email, 'ยืนยันอีเมล BimClub', verification.emailHtml(token.code)); }
    catch { deliveryPending = true; }
    res.status(201).json({ success: true, requiresVerification: true, deliveryPending, retryAfter: 60, message: deliveryPending ? 'สร้างบัญชีแล้ว แต่ส่งอีเมลไม่สำเร็จ กรุณาขอรหัสใหม่ในอีก 60 วินาที' : 'ส่งรหัสยืนยันแล้ว กรุณาตรวจสอบอีเมลและโฟลเดอร์สแปม' });
});

router.post('/verify-otp', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    if (!email || !/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัส 6 หลัก' });
    let conn;
    try {
        conn = await db.getConnection(); await conn.beginTransaction();
        const [[user]] = await conn.query('SELECT id, verify_token, verify_token_expires, verify_attempts FROM users WHERE email = ? AND is_verified = 0 AND deleted_at IS NULL AND is_banned = 0 FOR UPDATE', [email]);
        if (!user || !user.verify_token_expires || new Date(user.verify_token_expires) <= new Date() || user.verify_attempts >= verification.OTP_MAX_ATTEMPTS) {
            await conn.rollback(); return res.status(400).json({ success: false, message: 'รหัสหมดอายุ ใช้ไปแล้ว หรือครบจำนวนครั้ง กรุณาขอรหัสใหม่' });
        }
        if (!verification.matches(email, otp, user.verify_token)) {
            await conn.query('UPDATE users SET verify_attempts = verify_attempts + 1 WHERE id = ?', [user.id]);
            await conn.commit(); return res.status(400).json({ success: false, message: 'รหัสไม่ถูกต้อง กรุณาตรวจสอบอีเมลล่าสุด (ลองได้สูงสุด 5 ครั้งต่อรหัส)' });
        }
        await conn.query('UPDATE users SET is_verified = 1, verify_token = NULL, verify_token_expires = NULL, verify_attempts = 0 WHERE id = ?', [user.id]);
        await conn.commit(); res.json({ success: true, message: 'ยืนยันอีเมลสำเร็จ เข้าสู่ระบบได้แล้ว' });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error('Verification failed:', error.code); res.status(500).json({ success: false, message: 'ยืนยันไม่สำเร็จ กรุณาลองใหม่' });
    } finally { if (conn) conn.release(); }
});

router.post('/resend-verify', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || email.length > 100) return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });
    let conn, token;
    try {
        conn = await db.getConnection(); await conn.beginTransaction();
        const [[user]] = await conn.query('SELECT id, verify_sent_at FROM users WHERE email = ? AND is_verified = 0 AND deleted_at IS NULL AND is_banned = 0 FOR UPDATE', [email]);
        if (!user) { await conn.rollback(); return res.json({ success: true, retryAfter: 60, message: 'หากบัญชีนี้ยังไม่ยืนยัน ระบบจะส่งรหัสไปที่อีเมล' }); }
        const remaining = Math.ceil((new Date(user.verify_sent_at).getTime() + verification.OTP_COOLDOWN_MS - Date.now()) / 1000);
        if (remaining > 0) { await conn.rollback(); res.set('Retry-After', String(remaining)); return res.status(429).json({ success: false, retryAfter: remaining, message: `กรุณารอ ${remaining} วินาทีก่อนขอรหัสใหม่` }); }
        token = verification.issue(email);
        await conn.query('UPDATE users SET verify_token = ?, verify_token_expires = ?, verify_sent_at = NOW(), verify_attempts = 0 WHERE id = ?', [token.hash, token.expires, user.id]);
        await conn.commit();
    } catch (error) {
        if (conn) await conn.rollback(); console.error('Resend failed:', error.code);
        return res.status(500).json({ success: false, message: 'ขอรหัสใหม่ไม่สำเร็จ' });
    } finally { if (conn) conn.release(); }
    try {
        await sendMail(email, 'รหัสยืนยัน BimClub ใหม่', verification.emailHtml(token.code));
        res.json({ success: true, retryAfter: 60, message: 'ส่งรหัสใหม่แล้ว รหัสก่อนหน้านี้ใช้ไม่ได้อีก' });
    } catch { res.status(503).json({ success: false, retryAfter: 60, message: 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ในอีก 60 วินาที' }); }
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

        const [users] = await db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        if (user.deleted_at) {
            return res.status(403).json({ success: false, message: 'บัญชีนี้ถูกระงับการใช้งานหรือถูกลบไปแล้ว' });
        }

        if (user.is_banned) {
            return res.status(403).json({ success: false, message: 'บัญชีนี้ถูกแบนโดยผู้ดูแลระบบ' });
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
                verificationEmail: user.email,
                message: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ ตรวจสอบกล่องจดหมายของคุณ'
            });
        }

        await new Promise((resolve, reject) => {
            req.session.regenerate((error) => error ? reject(error) : resolve());
        });
        req.session.user = normalizeUser(user);
        await new Promise((resolve, reject) => {
            req.session.save((error) => error ? reject(error) : resolve());
        });

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
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
    });
});

// ============================================================
// GET /me — ดึงข้อมูลผู้ใช้ปัจจุบัน
// ============================================================
router.get('/me', requireLogin, accountController.me);

// ============================================================
// PUT /profile — แก้ไขข้อมูลโปรไฟล์
// ============================================================
router.put('/profile', requireLogin, accountController.updateProfile);
router.put('/password', requireLogin, accountController.updatePassword);
router.put('/recovery-phone', requireLogin, accountController.updateRecoveryPhone);

// ============================================================
// POST /forgot-password — ขอลิงก์รีเซ็ตรหัสผ่าน
// ============================================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมล' });
        }
        
        // ถ้าล็อกอินอยู่แล้ว ต้องใช้อีเมลตัวเองเท่านั้น
        if (req.session && req.session.user) {
            if (req.session.user.email !== email) {
                return res.status(403).json({ success: false, message: 'คุณสามารถเปลี่ยนรหัสผ่านได้เฉพาะบัญชีที่กำลังเข้าสู่ระบบเท่านั้น' });
            }
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
                <h2>สวัสดี ${user.full_name}</h2>
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

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
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
