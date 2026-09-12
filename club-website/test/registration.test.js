const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path');
const root = path.join(__dirname, '..');
test('Registration UI binds matching fields and enforces confirmation/minimum length', () => {
  const html = fs.readFileSync(path.join(root, 'public/page/register.html'), 'utf8'); const js = fs.readFileSync(path.join(root, 'public/js/register.js'), 'utf8');
  assert.match(html, /id="regUsername"/); assert.match(html, /id="regConfirmPassword"/); assert.match(html, /minlength="8"/); assert.match(html, /register\.js/); assert.match(js, /regConfirmPassword/); assert.match(js, /password\.length < 8/);
});
test('Auth route uses normalized email and one password minimum across register/reset', () => {
  const route = fs.readFileSync(path.join(root, 'src/routes/auth.js'), 'utf8'); assert.match(route, /toLowerCase\(\)/); assert.doesNotMatch(route, /password\.length < 6/); assert.match(route, /password\.length < 8/);
});
