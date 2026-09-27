const express = require('express');
const path = require('node:path');
const { revalidate, privateNoStore } = require('./cachePolicy');

module.exports = function staticFiles(root = path.resolve(__dirname, '..')) {
  const router = express.Router();
  const options = { etag: true, lastModified: true, setHeaders: revalidate };
  router.use(express.static(path.join(root, 'public'), options));
  router.use('/assets', express.static(path.join(root, '../assets'), options));
  router.use('/uploads', privateNoStore, (req, res, next) => {
    // Preserve the existing upload allowlist; uploaded documents are not CDN assets.
    if (!/\.(?:jpe?g|png|webp|gif|mp4|webm|ogg|mov)$/i.test(req.path)) return res.sendStatus(404);
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  }, express.static(path.join(root, 'uploads'), { cacheControl: false, etag: false, lastModified: false }));
  return router;
};
