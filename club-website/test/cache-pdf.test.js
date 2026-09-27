const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
// Raw HTTP preserves conditional headers without fetch adding Cache-Control: no-cache.
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    require('node:http').get(url, options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: { get: name => res.headers[name] }, text: async () => Buffer.concat(chunks).toString() }));
      res.on('error', reject);
    }).on('error', reject);
  });
}
const { createPdfRenderer } = require('../src/services/pdfRenderer');

test('Static revalidation sees updates and bypasses session; private responses never cache', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bim-cache-'));
  const root = path.join(dir, 'app');
  for (const folder of ['public', 'uploads']) fs.mkdirSync(path.join(root, folder), { recursive: true });
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(root, 'public/app.js'), 'version one');
  fs.writeFileSync(path.join(root, 'public/index.html'), '<h1>Home</h1>');
  fs.writeFileSync(path.join(root, 'uploads/photo.png'), 'fixture');
  fs.writeFileSync(path.join(dir, 'assets/style.css'), 'body {}');
  const app = express();
  let sessionCalls = 0;
  app.use(require('../middleware/staticFiles')(root));
  app.use(require('../middleware/cachePolicy').privateNoStore);
  app.use((req, res, next) => { sessionCalls++; next(); });
  app.get('/api/private', (req, res) => res.json({ value: 'private' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await request(base + '/app.js');
    assert.equal(response.headers.get('cache-control'), 'public, no-cache');
    const etag = response.headers.get('etag');
    assert.ok(etag);
    assert.equal((await request(base + '/app.js', { headers: { 'If-None-Match': etag } })).status, 304);
    fs.writeFileSync(path.join(root, 'public/app.js'), 'version two has changed');
    const updated = await request(base + '/app.js', { headers: { 'If-None-Match': etag } });
    assert.equal(updated.status, 200);
    assert.equal(await updated.text(), 'version two has changed');
    for (const url of ['/', '/assets/style.css']) assert.equal((await request(base + url)).headers.get('cache-control'), 'public, no-cache');
    assert.equal(sessionCalls, 0);
    for (const url of ['/uploads/photo.png', '/uploads/blocked.html', '/api/private', '/missing.js']) {
      const res = await request(base + url);
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.equal(res.headers.get('cloudflare-cdn-cache-control'), 'no-store');
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
function fixture(overrides = {}) {
  let closed = 0;
  const page = {
    setDefaultTimeout() {}, setJavaScriptEnabled: async () => {}, setRequestInterception: async () => {},
    on() {}, emulateMediaType: async () => {}, setContent: async () => {}, evaluate: async () => {},
    pdf: async () => new Uint8Array(Buffer.from('%PDF-fixture')), ...overrides
  };
  return { launch: async () => ({ newPage: async () => page, close: async () => { closed++; }, process: () => null }), closed: () => closed };
}
const payload = { profile: { fullName: 'Test' }, settings: { template: 'cv-c2', docType: 'cv' } };
test('PDF returns binary Buffer and closes Chromium on success and failure', async () => {
  const good = fixture();
  const bytes = await createPdfRenderer(good)(payload);
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.equal(good.closed(), 1);
  const bad = fixture({ pdf: async () => { throw new Error('render failed'); } });
  await assert.rejects(createPdfRenderer(bad)(payload), /render failed/);
  assert.equal(bad.closed(), 1);
});
test('PDF rejects overload, times out stuck work, closes browser, and releases slot', async () => {
  let stuck = true;
  const f = fixture({ evaluate: () => stuck ? new Promise(() => {}) : Promise.resolve() });
  const generate = createPdfRenderer({ ...f, timeoutMs: 40 });
  const first = generate(payload);
  await assert.rejects(generate(payload), error => error.status === 503);
  await assert.rejects(first, error => error.status === 504);
  assert.equal(f.closed(), 1);
  stuck = false;
  assert.ok(Buffer.isBuffer(await generate(payload)));
  assert.equal(f.closed(), 2);
});
