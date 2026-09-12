function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  if (err instanceof Error && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'ไฟล์มีขนาดใหญ่เกินกำหนด' });
  }
  if (err instanceof Error && ['IMAGE_TOO_LARGE', 'INVALID_IMAGE', 'UNSUPPORTED_IMAGE', 'INVALID_IMAGE_DIMENSIONS', 'IMAGE_TOO_MANY_PIXELS'].includes(err.code)) {
    return res.status(400).json({ success: false, message: err.message });
  }
  const message = process.env.NODE_ENV === 'production'
    ? 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    : (err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');

  res.status(500).json({ success: false, message });
}

module.exports = errorHandler;
