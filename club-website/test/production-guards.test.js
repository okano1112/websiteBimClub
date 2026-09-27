const test = require('node:test'), assert = require('node:assert/strict');
const { credentialStamp, currentCredential } = require('../src/services/credentialSession');
const sameOrigin = require('../middleware/sameOrigin');
test('Password changes revoke old credential stamps; legacy or malformed sessions fail closed', () => {
  const stamp = credentialStamp('old-password-hash');
  assert.equal(currentCredential(stamp, 'old-password-hash'), true);
  for (const value of [undefined, 'bad', stamp]) assert.equal(currentCredential(value, 'new-password-hash'), false);
});
test('Origin guard permits browser writes only from configured origin, including multipart', () => {
  function check(method, headers) { let passed = false, status; sameOrigin('https://club.example')({method, get:k=>headers[k]}, {status:c=>{status=c;return {json(){}};}}, ()=>{passed=true;});return {passed,status}; }
  assert.equal(check('POST', {Origin:'https://club.example'}).passed,true);
  assert.equal(check('POST', {Referer:'https://club.example/page/settings.html'}).passed,true);
  for (const headers of [{}, {Origin:'null'}, {Origin:'https://evil.example'}, {Origin:'https://club.example','Sec-Fetch-Site':'cross-site'}]) assert.equal(check('POST',headers).status,403);
  assert.equal(check('GET',{}).passed,true);
});
test('Production rejects missing secrets, root access and non-HTTPS origins', () => {
  const {validateRuntime}=require('../config/runtime');
  const env={NODE_ENV:'production',SESSION_SECRET:'x'.repeat(40),DB_HOST:'db',DB_USER:'app',DB_PASSWORD:'fixture',DB_NAME:'fixture',APP_URL:'https://club.example',SMTP_HOST:'smtp.example',SMTP_USER:'noreply@example.com',SMTP_PASS:'fixture'};
  assert.doesNotThrow(()=>validateRuntime(env));
  for(const patch of [{DB_USER:'root'},{APP_URL:'http://club.example'},{SESSION_SECRET:'short'},{DB_HOST:''},{SMTP_HOST:''}])assert.throws(()=>validateRuntime({...env,...patch}));
});
test('Heavy work releases its slot on success and failure and rejects overload', async () => {
  const limited=require('../src/services/workLimit')(1);let release;
  const running=limited(()=>new Promise(resolve=>{release=resolve;}));
  await assert.rejects(limited(()=>42),e=>e.status===503);release();await running;
  await assert.rejects(limited(()=>{throw Error('fixture');}));assert.equal(await limited(()=>42),42);
});
