const app = require('./src/app');
const server = app.listen(process.env.PORT || 3000, () => console.log(JSON.stringify({event:'started'})));
let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true; app.locals.draining = true;
  console.log(JSON.stringify({event:'shutdown',signal}));
  const deadline = setTimeout(() => process.exit(1), 25000);
  deadline.unref();
  server.close(async error => {
    try { await app.locals.closeResources(); clearTimeout(deadline); process.exit(error ? 1 : 0); }
    catch { process.exit(1); }
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
