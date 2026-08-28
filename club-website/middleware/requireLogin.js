const { loadCurrentUser } = require('./requireRole');

module.exports = async (req, res, next) => {
    try {
        const user = await loadCurrentUser(req, res);
        if (!user) return;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้' });
    }
};
