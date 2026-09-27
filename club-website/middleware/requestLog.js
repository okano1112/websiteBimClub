const { randomUUID } = require('node:crypto');
module.exports = (req, res, next) => {
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  const started = process.hrtime.bigint();
  res.once('finish', () => {
    // Never log query strings, cookies, authorization, bodies or raw URLs (reset tokens).
    console.log(JSON.stringify({ time:new Date().toISOString(), event:'http', requestId:req.id, method:req.method, route:req.route?.path || 'unmatched-or-static', status:res.statusCode, durationMs:Number(process.hrtime.bigint()-started)/1e6 }));
  });
  next();
};
