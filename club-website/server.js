const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const db = require('./config/database');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security Middleware: Helmet (with config to allow existing inline scripts/styles if needed, 
// but starting with default and disabling CSP for simplicity first as this is an existing app)
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Middleware เพื่ออ่านข้อมูล JSON และ URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ตั้งค่า Session Store ใน MySQL
const sessionStoreOptions = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'club_database',
    clearExpired: true,
    checkExpirationInterval: 900000, // ตรวจทุก 15 นาที
    expiration: 86400000 // 1 วัน
};

const sessionStore = new MySQLStore(sessionStoreOptions);

app.use(session({
    secret: process.env.SESSION_SECRET || (() => { if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required in production!'); return 'bimclub-secret-key-12345'; })(),
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24
    }
}));

// ให้บริการไฟล์ Static
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// ติดตั้ง API Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { success: false, message: 'คำขอมากเกินไป กรุณาลองใหม่ในภายหลัง' }
});
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/portfolios', require('./routes/portfolios'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/cms-content', require('./routes/cmsContent'));
app.use('/api/instructor-requests', require('./routes/instructorRequests'));
app.use('/api/admin/users', require('./routes/admin-users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/honors', require('./routes/honors'));

// Middleware จัดการข้อผิดพลาด
app.use((err, req, res, next) => {
    console.error(err.stack);
    const message = process.env.NODE_ENV === 'production' 
        ? 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
        : (err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');
    res.status(500).json({ success: false, message });
});

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
