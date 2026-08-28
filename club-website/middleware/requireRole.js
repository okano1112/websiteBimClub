const db = require('../config/database');

const ROLE_LABELS = {
    user: 'ผู้ใช้ทั่วไป',
    instructor: 'อาจารย์',
    admin: 'ผู้ดูแลระบบ'
};

function normalizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        full_name: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        avatar_url: user.avatar_url,
        role: user.role || 'user',
        roleLabel: ROLE_LABELS[user.role] || ROLE_LABELS.user
    };
}

async function loadCurrentUser(req, res) {
    if (!req.session || !req.session.user || !req.session.user.id) {
        res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        return null;
    }

    const [users] = await db.query(
        'SELECT id, username, email, full_name, phone, avatar_url, role, is_verified FROM users WHERE id = ?',
        [req.session.user.id]
    );

    if (users.length === 0) {
        req.session.destroy(() => {});
        res.status(401).json({ success: false, message: 'ไม่พบบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่' });
        return null;
    }

    const user = users[0];
    if (!user.is_verified) {
        req.session.destroy(() => {});
        res.status(403).json({ success: false, message: 'กรุณายืนยันอีเมลก่อนใช้งานระบบ' });
        return null;
    }

    const normalizedUser = normalizeUser(user);
    req.currentUser = normalizedUser;
    req.session.user = normalizedUser;
    return normalizedUser;
}

function requireRole(allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return async (req, res, next) => {
        try {
            const user = await loadCurrentUser(req, res);
            if (!user) return;

            if (user.role === 'admin' || roles.includes(user.role)) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
        }
    };
}

requireRole.loadCurrentUser = loadCurrentUser;
requireRole.normalizeUser = normalizeUser;
requireRole.ROLE_LABELS = ROLE_LABELS;

module.exports = requireRole;
