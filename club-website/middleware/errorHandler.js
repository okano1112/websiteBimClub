function errorHandler(err, req, res, next) {
  console.error(JSON.stringify({event:'request_error',requestId:req.id,code:err.code || 'INTERNAL_ERROR'}));
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, message: 'รูปแบบ JSON ไม่ถูกต้อง' });
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'ข้อมูลคำขอมีขนาดใหญ่เกินกำหนด' });
  if (err.status === 503) { res.set('Retry-After', '5'); return res.status(503).json({success:false,message:'ระบบกำลังประมวลผล กรุณาลองใหม่ภายหลัง'}); }
  if (err instanceof Error && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'ไฟล์มีขนาดใหญ่เกินกำหนด' });
  }
  if (err instanceof Error && ['INVALID_VIDEO', 'IMAGE_TOO_LARGE', 'INVALID_IMAGE', 'UNSUPPORTED_IMAGE', 'INVALID_IMAGE_DIMENSIONS', 'IMAGE_TOO_MANY_PIXELS'].includes(err.code)) {
    return res.status(400).json({ success: false, message: err.message });
  }
  const message = process.env.NODE_ENV === 'production'
    ? 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    : (err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');

  res.status(500).json({ success: false, message });
}

module.exports = errorHandler;
