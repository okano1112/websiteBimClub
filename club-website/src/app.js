require('../config/runtime').validateRuntime();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');

const apiRouter = require('./routes');
const errorHandler = require('../middleware/errorHandler');
const db = require('../config/database');

const app = express();
const sessionPolicy = require('../config/sessionPolicy')();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', sessionPolicy.proxyHops);
}

app.use(require('../middleware/requestLog'));
// Existing inline scripts remain allowed until migrated; object/frame/form containment is enforced.
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://www.youtube.com', 'https://s.ytimg.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  mediaSrc: ["'self'", 'blob:'], frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
  objectSrc: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'self'"],
  upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
} } }));
// Public files bypass session lookup. All remaining responses are non-cacheable.
app.use(require('../middleware/staticFiles')());
app.use(require('../middleware/cachePolicy').privateNoStore);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  if (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) return res.status(400).json({ success: false, message: 'ข้อมูลคำขอต้องเป็นออบเจ็กต์' });
  req.body ||= {};
  next();
});

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'club_database',
  createDatabaseTable: process.env.NODE_ENV !== 'production',
  connectionLimit: 5,
  queueLimit: 100,
  connectTimeout: 10000,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: sessionPolicy.idleMs
});

app.use(session(require('../config/sessionOptions')(sessionStore)));

app.locals.draining = false;
app.locals.closeResources = () => Promise.all([sessionStore.close(), db.end()]);
app.get('/livez', (req, res) => res.json({ status: 'alive' }));

// Readiness endpoint used by Docker/orchestrators. It verifies the app can
// reach its database instead of treating a static HTML response as healthy.
app.get('/healthz', async (req, res) => {
  if (app.locals.draining) return res.status(503).json({ status: 'draining' });
  try {
    await db.query({ sql: 'SELECT rate_key FROM auth_rate_limits LIMIT 0', timeout: 5000 });
    res.status(200).json({ status: 'ok', database: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'unavailable', database: 'error' });
  }
});

app.use('/api', require('../middleware/sameOrigin')(new URL(process.env.APP_URL || 'http://localhost:3000').origin));
app.use('/api', require('../middleware/sessionLifetime')());
app.use('/api', require('../middleware/sessionCredential'));
app.use('/api', apiRouter);
app.use(errorHandler);

module.exports = app;
