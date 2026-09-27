const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path');
const root = path.join(__dirname, '..');
const { parseRegistration } = require('../src/services/registrationData');
test('Registration UI binds matching fields and enforces confirmation/minimum length', () => {
  const html = fs.readFileSync(path.join(root, 'public/page/register.html'), 'utf8'); const js = fs.readFileSync(path.join(root, 'public/js/register.js'), 'utf8');
  assert.match(html, /id="regUsername"/); assert.match(html, /id="regConfirmPassword"/); assert.match(html, /minlength="8"/); assert.match(html, /register\.js/); assert.match(js, /regConfirmPassword/); assert.match(js, /password\.length < 8/);
});
test('Auth route uses normalized email and one password minimum across register/reset', () => {
  const route = fs.readFileSync(path.join(root, 'src/routes/auth.js'), 'utf8');
  assert.match(route, /parseRegistration\(req\.body\)/);
  assert.match(route, /INSERT INTO member_profiles/);
  assert.match(route, /is_public\)\s*VALUES[\s\S]*0\)/);
});

test('Registration validates and normalizes member information without granting a role', () => {
  const base = { username: 'bim_student', email: ' STUDENT@EXAMPLE.COM ', fullName: 'นักศึกษา ตัวอย่าง', phone: '081-234-5678', memberType: 'member', password: 'long enough password' };
  const parsed = parseRegistration(base);
  assert.equal(parsed.value.email, 'student@example.com');
  assert.equal(parsed.value.phone, '081-234-5678');
  assert.equal(parsed.value.memberType, 'member');
  assert.equal(parseRegistration({ ...base, phone: '' }).value.phone, '');
  for (const patch of [{ memberType: 'instructor' }, { memberType: 'admin' }, { phone: '123' }, { username: 'bad name' }, { graduationYear: '2024' }, { password: 'short' }]) {
    assert.ok(parseRegistration({ ...base, ...patch }).error);
  }
  assert.equal(parseRegistration({ ...base, memberType: 'alumni', graduationYear: '2024' }).value.graduationYear, '2024');
});

test('Registration saves account, portfolio and private member profile together', async () => {
  const db = require('../config/database');
  const mailer = require('../config/mailer');
  const previousConnection = db.getConnection;
  const previousMail = mailer.sendMail;
  const calls = [];
  let committed = false;
  db.getConnection = async () => ({
    beginTransaction: async () => calls.push('BEGIN'),
    query: async (sql, params) => { calls.push({ sql, params }); return [{ insertId: 42 }]; },
    commit: async () => { committed = true; },
    rollback: async () => { throw new Error('Unexpected rollback'); },
    release: () => {}
  });
  mailer.sendMail = async () => ({ success: true });
  try {
    delete require.cache[require.resolve('../src/routes/auth')];
    const router = require('../src/routes/auth');
    const handler = router.stack.find(layer => layer.route?.path === '/register').route.stack[0].handle;
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ body: { username: 'new_member', email: ' MEMBER@EXAMPLE.COM ', fullName: 'สมาชิก ทดสอบ', phone: '0812345678', memberType: 'alumni', department: 'วิศวกรรมศาสตร์', program: 'โยธา', generation: 'รุ่นที่ 3', graduationYear: '2024', password: 'safe password for test' } }, response);
    assert.equal(response.statusCode, 201);
    assert.equal(committed, true);
    assert.equal(calls[0], 'BEGIN');
    assert.deepEqual(calls.filter(call => call.sql).map(call => call.sql.match(/INSERT INTO (\w+)/)[1]), ['users', 'portfolios', 'member_profiles']);
    assert.equal(calls[1].params[1], 'member@example.com');
    assert.equal(calls[3].params[0], 42);
    assert.equal(calls[3].params[3], 'alumni');
    assert.match(calls[3].sql, /is_public\)\s*VALUES[\s\S]*0\)/);
  } finally {
    db.getConnection = previousConnection;
    mailer.sendMail = previousMail;
    delete require.cache[require.resolve('../src/routes/auth')];
  }
});
