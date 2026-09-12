# Security Best-Practices Review

## Executive summary

The UI/UX changes preserve the existing authentication and API contracts. Compose now uses environment-backed credentials, and the production-like image is reduced to runtime dependencies and a non-root process. The development session fallback must never be used in production, and the existing Multer dependency warning remains pending remediation.

## High

### SEC-001 — Plaintext database and SMTP credentials in Compose (mitigated)

The original Compose configuration contained database, session, and SMTP credentials at `docker-compose.yml:10`, `docker-compose.yml:13`, and `docker-compose.yml:16-17`. The active file now references environment variables instead. Any values previously committed still need rotation because repository history may retain them.

Mitigation: move values to an untracked `.env`/deployment secret store, rotate every value already committed, and keep only variable references in Compose. Do not reuse these values in production.

The production-like compose file also avoids publishing database and phpMyAdmin ports. Values previously committed still need rotation because repository history may retain them.

### SEC-002 — Development session secret fallback

`src/app.js:32-36` correctly throws when `NODE_ENV=production` and `SESSION_SECRET` is missing, but the fallback string is predictable for development. Ensure production deployments always set both `NODE_ENV=production` and a high-entropy secret.

## Medium

### SEC-003 — Public database and phpMyAdmin ports

The development Compose file still exposes database/admin tooling for local workflows. The new `docker-compose.production.yml` does not publish either database or phpMyAdmin; only the app is bound to localhost for smoke testing.

## Review notes

- Existing parameterized SQL, login/role middleware and Helmet remain in place.
- New `/api/team` write operations use admin middleware and parameterized queries.
- New UI adapters contain no executable scripts, hooks, remote installers or secrets.
- The Docker image uses `npm ci --omit=dev` and runs as the non-root `node` user.
- Docker build reports `multer@1.4.5-lts.2` as deprecated with a high-severity vulnerability. `npm audit --omit=dev` could not reach the npm advisory endpoint in this environment, so upgrade/remediation should happen before public production deployment.
- No credential rotation was performed automatically because that requires deployment-owner coordination.
