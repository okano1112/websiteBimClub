const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('Phase 4 migration defines canonical projects, member relation, and legacy mapping', () => {
    const sql = fs.readFileSync(path.join(root, 'database/controlled-p04-project-collaborators.sql'), 'utf8');
    assert.match(sql, /CREATE TABLE IF NOT EXISTS projects/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS project_members/);
    assert.match(sql, /PRIMARY KEY \(project_id, user_id\)/);
    assert.match(sql, /project_legacy_links/);
    assert.match(sql, /Deterministic backfill/);
    assert.match(sql, /FROM portfolio_projects pp/);
});

test('Project API keeps public visibility and admin-only collaborator writes explicit', () => {
    const route = fs.readFileSync(path.join(root, 'src/routes/projects.js'), 'utf8');
    const usersRoute = fs.readFileSync(path.join(root, 'src/routes/admin-users.js'), 'utf8');
    const index = fs.readFileSync(path.join(root, 'src/routes/index.js'), 'utf8');
    assert.match(index, /router\.use\('\/projects', require\('\.\/projects'\)\)/);
    assert.match(route, /p\.is_public = 1 AND p\.deleted_at IS NULL/);
    assert.match(route, /router\.put\('\/:id\/collaborators', requireLogin, requireAdmin/);
    assert.match(route, /project_members/);
    assert.match(usersRoute, /router\.get\('\/search', requireAdmin/);
    assert.match(usersRoute, /LIMIT 20/);
});

test('Portfolio routes no longer issue ALTER TABLE during requests', () => {
    const route = fs.readFileSync(path.join(root, 'src/routes/portfolios.js'), 'utf8');
    assert.doesNotMatch(route, /ALTER TABLE portfolios/);
});

test('Portfolio keeps owned and involved collections and canonical IDs explicit', () => {
    const route = fs.readFileSync(path.join(root, 'src/routes/portfolios.js'), 'utf8');
    const service = fs.readFileSync(path.join(root, 'src/services/projectData.js'), 'utf8');
    assert.match(route, /portfolio\.involved_projects/);
    assert.match(route, /portfolio\.projects = projects\.filter/);
    assert.match(service, /canonical_project_id: row\.id/);
    assert.match(route, /INSERT INTO project_legacy_links/);
});
