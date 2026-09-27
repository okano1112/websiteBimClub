# Production hardening — implementation and operations

20 September 2026. This is an implementation batch, not a declaration that every item in the readiness audit is closed.

## Implemented

- Node 24 Docker runtime; ffprobe/ffmpeg video inspection and MariaDB CLI for operations. Multer 2.4.0 and Nodemailer 9.1.1 security patch in lockfile.
- Password reset tokens stored as SHA-256 digests and consumed by one conditional SQL UPDATE, including expiration/account checks. Password changes invalidate server-side credential stamps across existing sessions; public user responses never include the stamp/password hash. Applies to user, reset-link and admin password changes.
- Browser API writes require the exact configured APP_URL origin (Origin or Referer) and reject cross-site Fetch Metadata. Same-origin frontend needs no token/header changes. CLI/integration callers must supply Origin; CORS is not enabled.
- Video quarantine outside public/uploads, bounded ffprobe validation, server-selected extensions and random filenames, cleanup on rejection. Active/unrecognized upload extensions cannot be served. These checks validate container/stream metadata, not a complete decode of every frame or a malware scan.
- CSP enabled with object/form/frame restrictions; **existing inline scripts/styles remain permitted** pending migration. This is not a strict nonce-based CSP yet.
- Production startup requires HTTPS APP_URL, non-root DB user and required secrets. Dedicated account provisioning tool grants DML only; sessions schema migration runs using separate administrator/migration credentials before deployment.
- Request IDs and structured request/error logs omit bodies, cookies, authorization and query strings. These are operational logs, not a complete durable business audit trail.
- Graceful shutdown/draining, liveness/readiness endpoints, bounded DB waiting queue, bounded PDF/video processing, production restart policy.
- Admin navigation removes reports/settings mockups from operational menus, adds Personnel and Resume/CV, clarifies labels and fixes keyboard drawer containment. Dashboard replaces the fake recent-activity heading and clarifies counts; deleted accounts are excluded from the user count.
- CI definition runs unit tests, dependency audit, Docker build and isolated MariaDB/browser/video/PDF/backup integration checks. Hosted CI execution is not claimed until the workflow actually runs after push.
- Encrypted logical DB + uploads backup and an isolated restore-drill tool; no automatic schedule/offsite archive/PITR is configured yet.

## Compatibility changes to communicate before release

1. Existing sessions without credential stamps will be signed out on their next API request. All sessions for an account become invalid after its password changes, including the session that initiated the change. Sign in again afterward.
2. Password reset links issued before this release must be requested again because stored token format changes. No password data migration is required.
3. Exact APP_URL must match browser origin, including scheme/port. Development default is http://localhost:3000; using 127.0.0.1 requires setting APP_URL accordingly.
4. Legacy HTML/SVG/unknown extensions under uploads no longer render. Existing recognized media remains available; this release does not certify old uploaded files or retrofit private-file permissions.
5. Production no longer auto-creates the sessions table or accepts root DB credentials. Run migration/provisioning first. Existing root credentials must not be silently reused for the app.
6. Prototype Reports/Settings URLs still exist and retain MOCKUP labeling; they are removed from the operating sidebar, not implemented as real features.

## Deployment sequence

- Keep the previous app image and a verified backup; use staging first. Do not rerun database/schema.sql on an existing DB: it is destructive initial setup only.
- The new migration directory is only for operational additions in this batch. It does not replace or automatically reconcile historical controlled migrations; verify their schema state separately.
- Supply migration credentials through the execution environment, then run `node scripts/ops/migrate.cjs` to list work and `node scripts/ops/migrate.cjs --apply` to apply. The runner uses a database lock/checksum ledger and idempotent one-statement DDL; it does not promise transactional rollback of DDL.
- Run `node scripts/ops/provision-app-user.cjs` to preview. For `--apply`, supply DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD for a **new** app account and DB_ADMIN_USER/DB_ADMIN_PASSWORD for its creator. Existing account conflicts fail; credentials/grants are not overwritten automatically.
- Supply the app account to production compose; DB_ROOT_PASSWORD is a separate secret for the database service. For existing database volumes, changing these environment variables does not rotate the server's existing root password.
- Build the image, run isolated verification, deploy in staging, check domain/TLS/cookies/email and production grants before switching traffic. The repository work did not deploy to a production host.
- Rollback code only if schema-compatible. Session-table migration is additive. Returning to an old binary reintroduces its token/session behavior; invalidate outstanding reset links and require re-login rather than attempting to convert hashed tokens back. Never restore the whole DB just to roll back the app while losing newer writes.

## Backup and restore drill

`backup.cjs` requires `--writes-paused`: stop all app/worker writers first and keep them paused through copying DB and uploads. It is a quiesced logical snapshot, **not PITR or a zero-downtime backup**. Configure backups to encrypted off-host storage and continuous binlog archiving separately once hosting and retention are known.

Provide DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, UPLOADS_DIR, BACKUP_OUTPUT and BACKUP_KEY_BASE64 through an operations secret environment. The key must be 32 cryptographically random bytes encoded as base64. Keep the key separately from the archive and back it up securely; losing the key makes recovery impossible. Do not paste it into command history or commit it.

Run: `node scripts/ops/backup.cjs --writes-paused`. Output is authenticated AES-256-GCM ciphertext with restrictive file permissions; temporary plaintext is stored in a private temporary directory and removed in finally. A killed process can leave temporary plaintext behind: use encrypted operations disks and controlled temp cleanup. Do not put output under public/uploads or Docker build context.

Restore drill: pre-create a **fresh empty** database named `bimclub_restore_<suffix>` and supply that name/credentials, BACKUP_INPUT, the same BACKUP_KEY_BASE64 and a new RESTORE_UPLOADS_DIR. Run `node scripts/ops/restore-drill.cjs`. The tool verifies archive authentication before executing SQL and refuses a nonempty database or existing output directory. It is intentionally not an automatic production restore tool. On partial failure, inspect and remove only the isolated drill target before retrying.

After restore, compare row counts, ownership/FKs, media bytes and application flows. Store measured duration and last recovered write timestamp. Do not declare RPO/RTO met just because the tool exited zero. Rotation/offsite copy/key escrow/alerts remain deployment tasks.

## Remaining gates from the audit

- Hosting-dependent: real TLS/proxy/SMTP, offsite scheduled backups/binlog PITR, external alert delivery and monitoring dashboards, failover/HA and measured RPO/RTO.
- Product/enterprise choices: Admin MFA enrollment/recovery vs university SSO; permissions/approvals, immutable business audit trail, retention/privacy workflows, organization/tenant scope. Awaiting owner requirements; email OTP is not MFA.
- Further implementation: media ownership/lifecycle and private downloads, durable jobs/outbox/retries, distributed quotas/rate limits, strict CSP without inline allowances, comprehensive load/soak and cross-browser accessibility checks.
- Local app has not been switched to this image; verification uses its own database/network. Existing production-like services/data are not modified by QA.

No claim that every enterprise item is implemented, or that local integration tests constitute production certification.

## Verification recorded

- Host unit/source/mock suite: 66/66 pass.
- Node 24 Docker build: pass; isolated MariaDB integration: atomic reset race (one success, one rejection), both old sessions rejected, valid/spoofed video, public active-file rejection, Admin keyboard containment and real Chromium PDF pass.
- Encrypted logical backup restored into a separate empty database: source/restored user counts match and media bytes match. Migration applied twice without duplicate work. Dedicated app grants allow SELECT and deny CREATE TABLE.
- npm production dependency audit after compatible lockfile fixes: zero reported vulnerabilities at time of check. This does not cover OS/image vulnerabilities or unknown vulnerabilities.
- No production deployment or production restore was performed.

### Final local verification — 21 September 2026

- Rebuilt `bimclub:production-hardening` from the latest application source successfully.
- Ran `QA_IMAGE=bimclub:production-hardening sh scripts/qa/run-hardening.sh` end to end against a newly initialized, disposable MariaDB database: exit code 0. The harness cleaned its containers, anonymous database volume, network and temporary credentials afterward.
- Added actual `server.js` startup/readiness and SIGTERM verification to the reusable harness. Both `/livez` and `/healthz` returned success; stopping the server exited with code 0 within the Docker stop deadline.
- Re-ran unit tests: 66 passed, zero failed. `git diff --check` passed.
- Existing local application containers were not restarted or switched to the new image. Hosted CI, production traffic and production recovery remain unverified.
