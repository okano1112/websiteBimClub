const crypto = require('crypto');
// Stored only in the server-side session, never in the public user payload.
function credentialStamp(passwordHash) {
  return crypto.createHash('sha256').update(passwordHash).digest('hex');
}
function currentCredential(stamp, passwordHash) {
  if (typeof stamp !== 'string' || !/^[a-f0-9]{64}$/.test(stamp) || typeof passwordHash !== 'string') return false;
  return crypto.timingSafeEqual(Buffer.from(stamp), Buffer.from(credentialStamp(passwordHash)));
}
module.exports = { credentialStamp, currentCredential };
