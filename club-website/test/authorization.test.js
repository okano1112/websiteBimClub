const test = require('node:test');
const assert = require('node:assert/strict');
const databasePath = require.resolve('../config/database');
const requireRolePath = require.resolve('../middleware/requireRole');

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

function loadMiddleware(userRow, allowedRole) {
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: { query: async () => [userRow ? [userRow] : []] }
  };
  delete require.cache[requireRolePath];
  return require('../middleware/requireRole')(allowedRole);
}

function verifiedUser(overrides = {}) {
  return {
    id: 7,
    username: 'permission-test',
    email: 'permission-test@example.test',
    full_name: 'Permission Test',
    phone: null,
    avatar_url: null,
    role: 'user',
    is_verified: 1,
    is_banned: 0,
    deleted_at: null,
    ...overrides
  };
}

async function execute(middleware, sessionUser = { id: 7 }) {
  let nextCalled = false;
  let destroyed = false;
  const request = { session: { user: sessionUser, destroy: (callback) => { destroyed = true; callback?.(); } } };
  const response = createResponse();
  await middleware(request, response, () => { nextCalled = true; });
  return { request, response, nextCalled, destroyed };
}

test('unauthenticated user receives 401', async () => {
  const middleware = loadMiddleware(null, 'admin');
  const response = createResponse();
  let nextCalled = false;
  await middleware({ session: {} }, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('admin can access admin-only middleware', async () => {
  const result = await execute(loadMiddleware(verifiedUser({ role: 'admin' }), 'admin'));
  assert.equal(result.nextCalled, true);
  assert.equal(result.request.currentUser.role, 'admin');
});

test('instructor can access instructor middleware', async () => {
  const result = await execute(loadMiddleware(verifiedUser({ role: 'instructor' }), 'instructor'));
  assert.equal(result.nextCalled, true);
});

test('normal user cannot access admin middleware', async () => {
  const result = await execute(loadMiddleware(verifiedUser({ role: 'user' }), 'admin'));
  assert.equal(result.response.statusCode, 403);
  assert.equal(result.nextCalled, false);
});

test('banned session is invalidated', async () => {
  const result = await execute(loadMiddleware(verifiedUser({ is_banned: 1 }), 'user'));
  assert.equal(result.response.statusCode, 403);
  assert.equal(result.destroyed, true);
  assert.equal(result.nextCalled, false);
});

test('soft-deleted session is invalidated', async () => {
  const result = await execute(loadMiddleware(verifiedUser({ deleted_at: new Date() }), 'user'));
  assert.equal(result.response.statusCode, 403);
  assert.equal(result.destroyed, true);
  assert.equal(result.nextCalled, false);
});

test('unverified session is invalidated', async () => {
  const result = await execute(loadMiddleware(verifiedUser({ is_verified: 0 }), 'user'));
  assert.equal(result.response.statusCode, 403);
  assert.equal(result.destroyed, true);
  assert.equal(result.nextCalled, false);
});

test.after(() => {
  delete require.cache[requireRolePath];
  delete require.cache[databasePath];
});
