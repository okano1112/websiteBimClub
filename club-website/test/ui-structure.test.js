const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('Current Team is a separate public surface and API route', () => {
    assert.match(fs.readFileSync(path.join(root, 'src/routes/index.js'), 'utf8'), /router\.use\('\/team'/);
    assert.ok(fs.existsSync(path.join(root, 'public/page/team.html')));
    assert.ok(fs.existsSync(path.join(root, 'database/phase10-current-team.sql')));
});

test('Personnel is reached from About and the global chatbot uses a brand asset', () => {
    const navbar = fs.readFileSync(path.join(root, 'public/js/navbar-component.js'), 'utf8');
    const about = fs.readFileSync(path.join(root, 'public/page/about.html'), 'utf8');
    const auth = fs.readFileSync(path.join(root, 'public/js/auth.js'), 'utf8');
    assert.doesNotMatch(navbar, /team\.html/);
    assert.match(about, /personnelGrid/);
    assert.match(auth, /ai-chatbot-btn[\s\S]*logobranding\/logobim\.png/);
    assert.doesNotMatch(auth, /ai-chatbot-btn[\s\S]*>BimClub</);
});

test('Hall of Fame adds namespaced year navigation around existing cards', () => {
    const page = fs.readFileSync(path.join(root, 'public/page/honor.html'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'public/js/honor.js'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'public/css/honor.css'), 'utf8');
    assert.match(page, /hofYearNavigation/);
    assert.match(page, /hofYearSelect/);
    assert.match(script, /hof-year-section/);
    assert.match(script, /history\.replaceState/);
    assert.match(css, /\.hof-year-navigation/);
});

test('UI source does not contain emoji glyphs', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}]/u;
    const files = [];
    for (const directory of ['public/page', 'public/js', 'public/css', 'src']) {
        const walk = (current) => fs.readdirSync(path.join(root, current), { withFileTypes: true }).forEach((entry) => {
            const relative = path.join(current, entry.name);
            if (entry.isDirectory()) return walk(relative);
            if (/\.(html|js|css)$/.test(entry.name)) files.push(relative);
        });
        walk(directory);
    }
    const offenders = files.filter((file) => emoji.test(fs.readFileSync(path.join(root, file), 'utf8')));
    assert.deepEqual(offenders, []);
});
