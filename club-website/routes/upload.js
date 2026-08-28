const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const requireLogin = require('../middleware/requireLogin');
const requireAdmin = require('../middleware/requireAdmin');
const requireInstructor = require('../middleware/requireInstructor');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const videosDir = path.join(uploadsDir, 'videos');
fs.mkdirSync(videosDir, { recursive: true });

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพเท่านั้น'), false);
    }
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// POST /api/upload  AND  POST /api/upload/images  (ทั้งสอง path ใช้งานได้)
const handleUpload = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'กรุณาเลือกรูปภาพ' });
    }
    const urls = req.files.map(file => '/uploads/' + file.filename);
    res.json({ success: true, urls });
};

router.post('/', requireLogin, upload.array('images', 10), handleUpload);
router.post('/images', requireLogin, upload.array('images', 10), handleUpload);
router.post('/cms', requireAdmin, upload.array('images', 1), handleUpload);

const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, videosDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const videoFilter = (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('อนุญาตเฉพาะไฟล์วิดีโอ MP4, WebM หรือ OGG'), false);
    }
};

const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: { fileSize: 200 * 1024 * 1024 }
});

router.post('/video', requireInstructor, uploadVideo.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์วิดีโอ' });
    }
    res.json({ success: true, url: '/uploads/videos/' + req.file.filename });
});

module.exports = router;
