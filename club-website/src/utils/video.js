function normalizeVideoUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/uploads/videos/')) return raw;

  const match = raw.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^\s"']*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (!match) return null;
  return `https://www.youtube-nocookie.com/embed/${match[1]}`;
}

module.exports = { normalizeVideoUrl };
