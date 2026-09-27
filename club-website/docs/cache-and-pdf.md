# Cache and PDF operation

## Cache policy

- Public HTML, CSS, JS, and shared assets use `Cache-Control: public, no-cache` with ETag and Last-Modified. Browsers can reuse their stored copy after validation (304). Existing URLs are not content-hashed, so they must not use long-lived immutable caching.
- Static files are served before session middleware, avoiding session database reads for those requests.
- API responses (including PDF exports), uploads, health endpoints, and fallback responses use `private, no-store`. CDN-specific no-store headers are included.
- Uploads retain their existing public URL access model; no-store does not add authorization.
- On Cloudflare, bypass cache for `/api/*` and `/uploads/*`. Do not configure Cache Everything or Edge TTL rules that override the origin policy. Respect origin cache headers for static assets. Purge any older cached responses once when deploying this policy.
- This reduces repeated transfers and session work. It deliberately does not provide long-lived edge caching for unversioned files. A content-hashed asset pipeline can enable that in a future change.

## PDF lifecycle

- One concurrent PDF render per Node process. Additional requests receive 503 with `Retry-After: 5`; no unbounded in-memory queue.
- Browser launch has a 15-second timeout. Rendering after launch has a 30-second deadline, including font loading and PDF output. Cleanup waits at most two seconds before force-killing Chromium.
- Both successful and failed jobs close the browser and release the work slot. Each job has its own browser for isolation.
- Binary output is normalized to Buffer before Express sends it. Unexpected internal errors are not exposed to clients; timeouts return 504.
- Existing local image restrictions and network allowlist remain in force. Google Fonts may be requested; Docker also installs Thai fallback fonts.

## Verification

Run `node --test` from `club-website`. The cache test opens an ephemeral localhost HTTP server and checks 304 reuse, updated content, session bypass, and no-store policies. PDF tests cover binary output, failures, overload, timeout, cleanup, and slot reuse.

A real headless Chrome smoke test on the development Mac generated a valid one-page A4 PDF with readable Thai text. Deployment verification must still exercise the actual API with MariaDB and test Chromium/fonts inside the Oracle ARM64 Docker image. Cloudflare rules must also be checked on the deployed hostname; local tests cannot validate dashboard overrides.
