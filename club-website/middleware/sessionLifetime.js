const sessionPolicy = require('../config/sessionPolicy');
module.exports = function sessionLifetime(policy = sessionPolicy(), now = Date.now) {
  return (req, res, next) => {
    if (!req.session?.user?.id) return next();
    const issued = req.session.authenticatedAt;
    const remaining = Number.isFinite(issued) ? issued + policy.absoluteMs - now() : 0;
    // Legacy sessions without a login timestamp must authenticate again.
    if (remaining <= 0) return req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('connect.sid', { path: '/' });
      res.status(401).json({ success: false, message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    });
    req.session.cookie.maxAge = Math.min(policy.idleMs, remaining);
    next();
  };
};
