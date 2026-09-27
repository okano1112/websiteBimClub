const sessionPolicy = require('./sessionPolicy');
module.exports = function sessionOptions(store, env = process.env) {
  if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in production');
  return {
    secret: env.SESSION_SECRET || 'bimclub-secret-key-12345',
    store, resave: false, rolling: true, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge: sessionPolicy(env).idleMs }
  };
};
