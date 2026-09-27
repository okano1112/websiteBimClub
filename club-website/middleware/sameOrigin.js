// Browser writes must come from this application's configured origin, including multipart uploads.
module.exports = function sameOrigin(expectedOrigin) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    let origin = req.get('Origin');
    if (!origin && req.get('Referer')) {
      try { origin = new URL(req.get('Referer')).origin; } catch { origin = 'null'; }
    }
    if (req.get('Sec-Fetch-Site') === 'cross-site' || origin !== expectedOrigin) {
      return res.status(403).json({ success: false, message: 'ไม่อนุญาตคำขอจากแหล่งที่มานี้' });
    }
    next();
  };
};
