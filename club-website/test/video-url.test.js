const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeVideoUrl } = require('../src/utils/video');

test('normalizes a YouTube watch URL', () => {
  assert.equal(
    normalizeVideoUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE'),
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'
  );
});

test('normalizes youtu.be, Shorts, and embed URLs', () => {
  const expected = 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE';
  assert.equal(normalizeVideoUrl('https://youtu.be/M7lc1UVf-VE?t=10'), expected);
  assert.equal(normalizeVideoUrl('https://youtube.com/shorts/M7lc1UVf-VE'), expected);
  assert.equal(normalizeVideoUrl('https://www.youtube.com/embed/M7lc1UVf-VE'), expected);
});

test('accepts only exact HTTPS YouTube hosts and URLs', () => {
  assert.equal(normalizeVideoUrl('/uploads/videos/lesson.mp4'), null);
  assert.equal(
    normalizeVideoUrl('https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'),
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'
  );
  assert.equal(normalizeVideoUrl('https://example.com/video.mp4'), null);
  assert.equal(normalizeVideoUrl('https://youtube.com.evil.test/watch?v=M7lc1UVf-VE'), null);
  assert.equal(normalizeVideoUrl('https://evil.test/?next=https://youtube.com/watch?v=M7lc1UVf-VE'), null);
  assert.equal(normalizeVideoUrl('<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE"></iframe>'), null);
  assert.equal(normalizeVideoUrl('http://www.youtube.com/watch?v=M7lc1UVf-VE'), null);
});
