const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: (req) => req.method === 'GET',
  message: { success: false, message: 'คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง' }
});

router.use('/auth', authLimiter, require('./auth'));
router.use('/posts', require('./posts'));
router.use('/portfolios', require('./portfolios'));
router.use('/upload', require('./upload'));
router.use('/activities', require('./activities'));
router.use('/achievements', require('./achievements'));
router.use('/cms-content', require('./cmsContent'));
router.use('/instructor-requests', require('./instructorRequests'));
router.use('/admin/users', require('./admin-users'));
router.use('/admin/dashboard', require('./admin-dashboard'));
router.use('/courses', require('./courses'));
router.use('/honors', require('./honors'));
router.use('/positions', require('./positions'));
router.use('/projects', require('./projects'));
router.use('/profiles', require('./profiles'));
router.use('/team', require('./team'));

module.exports = router;
