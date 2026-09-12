const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  validateImageBuffer
} = require('../src/services/imageUpload');

test('accepts a real PNG and returns decoded dimensions', async () => {
  const image = await sharp({
    create: { width: 12, height: 8, channels: 4, background: { r: 173, g: 15, b: 15, alpha: 1 } }
  }).png().toBuffer();
  const info = await validateImageBuffer(image, 'image/png');
  assert.deepEqual({ format: info.format, width: info.width, height: info.height }, {
    format: 'png', width: 12, height: 8
  });
  assert.equal(info.extension, '.png');
});

test('rejects MIME spoofing even when bytes decode as another format', async () => {
  const image = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#ffffff' }
  }).png().toBuffer();
  await assert.rejects(
    validateImageBuffer(image, 'image/jpeg'),
    error => error.code === 'UNSUPPORTED_IMAGE'
  );
});

test('rejects corrupt and oversized buffers before writing', async () => {
  await assert.rejects(
    validateImageBuffer(Buffer.from('not-an-image'), 'image/png'),
    error => error.code === 'INVALID_IMAGE'
  );
  await assert.rejects(
    validateImageBuffer(Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image/png'),
    error => error.code === 'IMAGE_TOO_LARGE'
  );
});

test('exports the selected Phase 2 limits', () => {
  assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024);
  assert.equal(MAX_IMAGE_PIXELS, 20_000_000);
});
