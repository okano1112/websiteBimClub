const db = require('../config/database');
const { currentCredential } = require('../src/services/credentialSession');
module.exports = async function sessionCredential(req, res, next) {
  if (!req.session?.user?.id) return next();
  try {
    const [[user]] = await db.query('SELECT id, username, email, full_name, age, phone, recovery_phone, avatar_url, role, password, is_banned, deleted_at, is_verified FROM users WHERE id = ?', [req.session.user.id]);
    if (user && !user.is_banned && !user.deleted_at && user.is_verified && currentCredential(req.session.credentialStamp, user.password)) {
      req.currentUser = require('./requireRole').normalizeUser(user);
      req.session.user = req.currentUser;
      return next();
    }
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('connect.sid');
      res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบใหม่ เซสชันหมดอายุหรือข้อมูลบัญชีเปลี่ยนแปลง' });
    });
  } catch (error) { next(error); }
};
