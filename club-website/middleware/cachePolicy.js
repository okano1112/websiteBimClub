// Stable asset URLs must revalidate after deployments; do not mark them immutable.
function revalidate(res) {
  res.setHeader('Cache-Control', 'public, no-cache');
}
function privateNoStore(req, res, next) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
  next();
}
module.exports = { revalidate, privateNoStore };
