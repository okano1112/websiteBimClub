const express = require('express');
const db = require('../../config/database');
const requireAdmin = require('../../middleware/requireAdmin');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
    try {
        const [[users], [courses], [activities], [achievements], [requests], [posts]] = await Promise.all([
            db.query('SELECT COUNT(*) AS total, SUM(is_verified = 0 AND deleted_at IS NULL) AS unverified FROM users'),
            db.query('SELECT COUNT(*) AS total, SUM(is_published = 1) AS published FROM courses'),
            db.query('SELECT COUNT(*) AS total FROM activities'),
            db.query('SELECT COUNT(*) AS total FROM achievements'),
            db.query("SELECT COUNT(*) AS pending FROM instructor_requests WHERE status = 'pending'"),
            db.query('SELECT COUNT(*) AS total FROM posts')
        ]);
        res.json({ success: true, metrics: {
            users: Number(users[0].total) || 0,
            unverifiedUsers: Number(users[0].unverified) || 0,
            courses: Number(courses[0].total) || 0,
            publishedCourses: Number(courses[0].published) || 0,
            activities: Number(activities[0].total) || 0,
            achievements: Number(achievements[0].total) || 0,
            pendingInstructorRequests: Number(requests[0].pending) || 0,
            posts: Number(posts[0].total) || 0
        }});
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'ไม่สามารถโหลดสถิติระบบได้' });
    }
});

module.exports = router;
