const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');

const apiRouter = require('./routes');
const errorHandler = require('../middleware/errorHandler');
const db = require('../config/database');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'club_database',
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000
});

app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is required in production!');
    }
    return 'bimclub-secret-key-12345';
  })(),
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

// Readiness endpoint used by Docker/orchestrators. It verifies the app can
// reach its database instead of treating a static HTML response as healthy.
app.get('/healthz', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', database: 'error' });
  }
});

app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

app.use('/api', apiRouter);
app.use(errorHandler);

module.exports = app;
