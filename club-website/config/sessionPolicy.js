function positiveInteger(value, fallback, max) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) throw new Error('Invalid session/proxy configuration');
  return parsed;
}
function sessionPolicy(env = process.env) {
  const idleMs = positiveInteger(env.SESSION_IDLE_HOURS, 24, 168) * 3600000;
  const absoluteMs = positiveInteger(env.SESSION_MAX_DAYS, 7, 30) * 86400000;
  if (absoluteMs < idleMs) throw new Error('Session maximum must cover idle timeout');
  return { idleMs, absoluteMs, proxyHops: positiveInteger(env.TRUST_PROXY_HOPS, 1, 3) };
}
module.exports = sessionPolicy;
