const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const { normalizeUser } = require('../../middleware/requireRole');

const PHONE_PATTERN = /^[0-9+\-\s()]{8,30}$/;

function syncSession(req, user) {
  const normalized = normalizeUser(user);
  req.currentUser = normalized;
  req.session.user = normalized;
  return normalized;
}

function me(req, res) {
  res.json({ success: true, user: req.currentUser });
}

async function updateProfile(req, res, next) {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const phone = String(req.body.phone || '').trim();
    const avatarUrl = String(req.body.avatarUrl || '').trim();
    const rawAge = String(req.body.age ?? '').trim();
    const age = rawAge === '' ? null : Number(rawAge);

    if (!fullName) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-นามสกุล' });
    }
    if (fullName.length > 100) {
      return res.status(400).json({ success: false, message: 'ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร' });
    }
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 120)) {
      return res.status(400).json({ success: false, message: 'อายุต้องเป็นจำนวนเต็มระหว่าง 0–120 ปี' });
    }
    if (phone && !PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ success: false, message: 'รูปแบบเบอร์โทรไม่ถูกต้อง' });
    }
    if (avatarUrl && !avatarUrl.startsWith('/uploads/')) {
      return res.status(400).json({ success: false, message: 'รูปโปรไฟล์ต้องเป็นไฟล์ที่อัปโหลดผ่านระบบเท่านั้น' });
    }

    const user = await User.updateProfile(req.currentUser.id, {
      fullName,
      age,
      phone: phone || null,
      avatarUrl: avatarUrl || null
    });

    res.json({
      success: true,
      message: 'บันทึกข้อมูลโปรไฟล์สำเร็จ',
      user: syncSession(req, user)
    });
  } catch (error) {
    next(error);
  }
}

async function updateRecoveryPhone(req, res, next) {
  try {
    const recoveryPhone = String(req.body.recoveryPhone || '').trim();
    if (recoveryPhone && !PHONE_PATTERN.test(recoveryPhone)) {
      return res.status(400).json({ success: false, message: 'รูปแบบเบอร์โทรศัพท์สำรองไม่ถูกต้อง' });
    }

    const user = await User.updateRecoveryPhone(req.currentUser.id, recoveryPhone || null);
    res.json({
      success: true,
      message: recoveryPhone ? 'บันทึกเบอร์โทรศัพท์สำรองสำเร็จ' : 'ลบเบอร์โทรศัพท์สำรองแล้ว',
      user: syncSession(req, user)
    });
  } catch (error) {
    next(error);
  }
}

async function updatePassword(req, res, next) {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน' });
    }

    const user = await User.findCredentialsById(req.currentUser.id);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updatePassword(user.id, passwordHash);
    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (error) {
    next(error);
  }
}

module.exports = { me, updatePassword, updateProfile, updateRecoveryPhone };
