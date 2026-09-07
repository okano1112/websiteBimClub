function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  const message = process.env.NODE_ENV === 'production'
    ? 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    : (err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');

  res.status(500).json({ success: false, message });
}

module.exports = errorHandler;
