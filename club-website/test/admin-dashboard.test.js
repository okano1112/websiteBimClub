const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('admin dashboard uses a protected real metrics endpoint', () => {
    const route = fs.readFileSync(path.join(root, 'src/routes/admin-dashboard.js'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'public/page/admin-dashboard.html'), 'utf8');
    const js = fs.readFileSync(path.join(root, 'public/js/admin-dashboard.js'), 'utf8');
    assert.match(route, /requireAdmin/);
    assert.match(route, /COUNT\(\*\)/);
    assert.match(page, /dashboardStats/);
    assert.doesNotMatch(page, /MOCKUP/);
    assert.match(js, /\/api\/admin\/dashboard/);
    assert.doesNotMatch(js, /BimClubAdminMockData/);
});

test('admin password reset keeps the shared eight-character policy', () => {
    const route = fs.readFileSync(path.join(root, 'src/routes/admin-users.js'), 'utf8');
    const page = fs.readFileSync(path.join(root, 'public/page/admin-users.html'), 'utf8');
    assert.match(route, /newPassword\.length < 8/);
    assert.match(page, /minlength="8"/);
});
