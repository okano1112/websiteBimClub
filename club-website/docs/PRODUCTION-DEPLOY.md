# Production deploy runbook

This repository supplies a production Docker Compose stack for a single VM. It is intended for a **new empty database**. The application stores account/content/session records in MariaDB and uploaded images in a Docker volume. Existing uploaded course videos remain playable, but new course video input accepts only YouTube URLs.

## Before first start

1. Use a VM with persistent disk, Docker Engine and Compose. Keep inbound MariaDB and app ports private. Put HTTPS in front of the app, for example Cloudflare Tunnel pointing to the host's `127.0.0.1:3000`. Set `APP_URL` to the exact browser origin.
2. Copy `production.env.example` to `.env` on the VM and replace every placeholder. Use different random values for `DB_PASSWORD`, `DB_ROOT_PASSWORD` and `SESSION_SECRET`. Supply working SMTP credentials for verification and password reset. Never commit `.env`.
3. Verify `database/schema.production.sql` matches the generator: run `node scripts/ops/build-production-schema.cjs` and inspect `git diff -- database/schema.production.sql`. The production schema has no sample administrator, sample content or `DROP TABLE`.
4. Run `docker compose -f docker-compose.production.yml config --quiet`, then `docker compose -f docker-compose.production.yml up -d --build`. Compose initializes a new DB, creates a restricted app user, then starts the app. Check `docker compose -f docker-compose.production.yml ps` and `curl -fsS http://127.0.0.1:3000/healthz`.
5. Create the first admin once, using `docker compose -f docker-compose.production.yml run --rm -e ADMIN_EMAIL -e ADMIN_USERNAME -e ADMIN_NAME -e ADMIN_PASSWORD app node scripts/ops/create-admin.cjs`. Set those four variables in the invoking shell without putting the password in command arguments or a tracked file. The command refuses to run if an admin already exists.
6. Verify HTTPS, secure session cookie, registration email/OTP, login/logout, password reset, image upload after container restart, course YouTube playback, PDF export and admin permissions on the real origin.

## Existing database or upgrade

Do not run `database/schema.sql` or `database/schema.production.sql` against a database containing user data. The former contains `DROP TABLE` and development seed users. Back up the database **and** uploads first, then inspect the existing schema and apply the historical controlled migrations needed for that specific database. `scripts/ops/migrate.cjs` covers only `database/migrations/`, currently the production sessions table; it does not reconcile every historical phase. Test the migration and restore on an isolated copy before switching traffic. Keep the previous image for code rollback.

## Backups and operations

`scripts/ops/backup.cjs` creates an encrypted database plus uploads archive when all writers are stopped; `scripts/ops/restore-drill.cjs` tests restoring into a fresh database. Configure a **scheduled** backup on the VM, copy encrypted archives off the VM, retain the encryption key separately, monitor failures and disk use, and run restore drills. These host/account-specific jobs are required before accepting real user data; the Compose stack alone does not schedule or store offsite backups. Define the retention and recovery targets before launch.

The SMTP provider, DNS name, Cloudflare account/tunnel, VM, secrets and offsite backup target are deployment inputs. No live cloud resources are created by this repository.
