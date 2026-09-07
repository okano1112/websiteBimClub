const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeVideoUrl } = require('../src/utils/video');

test('normalizes a YouTube watch URL', () => {
  assert.equal(
    normalizeVideoUrl('https://www.youtube.com/watch?v=M7lc1UVf-VE'),
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'
  );
});

test('normalizes youtu.be, Shorts, and iframe formats', () => {
  const expected = 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE';
  assert.equal(normalizeVideoUrl('https://youtu.be/M7lc1UVf-VE?t=10'), expected);
  assert.equal(normalizeVideoUrl('https://youtube.com/shorts/M7lc1UVf-VE'), expected);
  assert.equal(normalizeVideoUrl('<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE"></iframe>'), expected);
});

test('keeps uploaded videos and rejects non-YouTube URLs', () => {
  assert.equal(normalizeVideoUrl('/uploads/videos/lesson.mp4'), '/uploads/videos/lesson.mp4');
  assert.equal(
    normalizeVideoUrl('https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'),
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'
  );
  assert.equal(normalizeVideoUrl('https://example.com/video.mp4'), null);
});
