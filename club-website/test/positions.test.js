const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('Phase 3 migration adds catalog and nullable verified links without removing legacy fields', () => {
    const migration = fs.readFileSync(path.join(root, 'database/controlled-p03-alumni-positions.sql'), 'utf8');
    assert.match(migration, /CREATE TABLE IF NOT EXISTS positions/);
    assert.match(migration, /ADD COLUMN position_id INT NULL/);
    assert.match(migration, /ADD COLUMN user_id INT NULL/);
    assert.match(migration, /ON DELETE SET NULL/);
});

test('positions API is mounted and honor API exposes verified assignment fields', () => {
    const index = fs.readFileSync(path.join(root, 'src/routes/index.js'), 'utf8');
    const honors = fs.readFileSync(path.join(root, 'src/routes/honors.js'), 'utf8');
    assert.match(index, /router\.use\('\/positions', require\('\.\/positions'\)\)/);
    assert.match(honors, /position_id/);
    assert.match(honors, /user_id/);
    assert.match(honors, /hasDuplicateAssignment/);
});
