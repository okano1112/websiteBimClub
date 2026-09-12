/** OTP policy shared by registration and verification routes.
 * Never return/log the raw code; only the mailer receives it. Routes own the row-lock transaction.
 * Migration: controlled-p06-otp.sql. QA: verification.test.js and gaps-integration.cjs.
 */
const crypto = require('crypto');
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const digest = (email, code) => crypto.createHash('sha256').update(`${email}:${code}`).digest('hex');
function issue(email) {
  const code = String(crypto.randomInt(100000, 1000000));
  return { code, hash: digest(email, code), expires: new Date(Date.now() + OTP_TTL_MS) };
}
function matches(email, code, stored) {
  const expected = digest(email, code);
  return typeof stored === 'string' && stored.length === expected.length && crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(expected));
}
function emailHtml(code) {
  return `<h1>BimClub</h1><p>รหัสยืนยันอีเมลของคุณ</p><h2>${code}</h2><p>รหัสนี้ใช้ได้ครั้งเดียวและหมดอายุใน 10 นาที หากไม่ได้สมัครสมาชิก โปรดเพิกเฉยต่ออีเมลนี้</p>`;
}
module.exports = { issue, matches, emailHtml, OTP_TTL_MS, OTP_COOLDOWN_MS, OTP_MAX_ATTEMPTS };
