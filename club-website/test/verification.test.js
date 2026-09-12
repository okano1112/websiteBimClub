const test = require('node:test');
const assert = require('node:assert/strict');
const { issue, matches, OTP_TTL_MS } = require('../src/services/verification');
test('OTP has six digits, stores only an email-bound digest, and expires in ten minutes', () => {
 const before = Date.now(); const token = issue('test@example.test');
 assert.match(token.code, /^\d{6}$/); assert.match(token.hash,/^[a-f0-9]{64}$/);
 assert.notEqual(token.code, token.hash); assert.ok(matches('test@example.test',token.code,token.hash));
 assert.equal(matches('other@example.test',token.code,token.hash),false);
 assert.equal(matches('test@example.test','invalid',token.hash),false);
 assert.equal(matches('test@example.test',token.code,token.code),false);
 assert.ok(token.expires.getTime() >= before + OTP_TTL_MS);
});
