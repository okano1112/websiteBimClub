# Data, Admin, sessions and load balancing review

## Implemented

- Admin account name, phone and role are saved in one request and transaction. Role transitions lock active administrator rows in a consistent order, recheck the acting administrator, reject self-demotion and prevent losing the last active administrator. Inactive accounts cannot be promoted to administrator.
- Ban flags must be real booleans. Ban/delete writes refuse accounts promoted to admin concurrently. Password reset and restore validate IDs and existence.
- User lists are always paginated (default 20, maximum 100). Honor account assignment uses the bounded, verified-member search endpoint instead of downloading every account.
- Admin writes disable repeated submission, and expired-session responses redirect to login. Search is debounced; existing sequence protection prevents stale results overwriting newer ones.
- Profile updates preserve omitted fields and visibility. New profiles default to private; ambiguous publish values are rejected. Portfolio JSON shapes, lengths, booleans and website schemes are validated before writes.
- Post and image writes now use transactions. Malformed JSON returns 400; oversized bodies return 413. YouTube iframe API hosts are explicitly allowed by CSP.
- Fresh account checks run once per authenticated API request and are reused by authorization middleware. Password changes, account suspension/deletion and role changes still take effect on subsequent requests.

## Session policy

Default inactivity timeout is 24 hours; the cookie rolls on requests through session middleware. The absolute login lifetime is 7 days. Static file requests bypass sessions. `SESSION_IDLE_HOURS` and `SESSION_MAX_DAYS` configure these values. Legacy sessions without the new login timestamp require one new login after deployment.

All app instances share MariaDB sessions and the same `SESSION_SECRET`. No sticky sessions are required. Cookies remain HttpOnly, SameSite=Lax and Secure in production. Do not expose application ports directly to the internet; hop-based proxy trust assumes exactly the documented path.

Application DB pool: 10 connections and a queue of 100 per replica. Session DB pool: 5 connections and a queue of 100 per replica. Two replicas therefore allow up to 30 pooled connections, plus administration/maintenance clients. These are limits, not a measured user capacity.

## Required migration BEFORE upgrading an existing database

Apply `database/migrations/003-auth-rate-limits.sql` using the existing migration procedure and a database administrator. It adds only a shared counter table. New empty databases receive it via generated `schema.production.sql`. The app DB user needs SELECT/INSERT/UPDATE/DELETE on that table (the deployment account already grants DML across the application database).

Auth rate limits now share counters across replicas and restarts. The existing 50 requests per IP per 15 minutes is retained. Large groups behind one NAT may share this limit; tune only from observed usage. Store failures fail closed. Keys are hashed; no raw IP or account data is stored in this table. Bounded cleanup runs every 100 increments per process. Readiness checks verify the new table is accessible.

## Optional two-replica deployment on ONE Oracle VM

Requires Docker Compose 2.24.4+ and the existing production environment configuration:

```sh
docker compose -f docker-compose.production.yml -f docker-compose.loadbalanced.yml up -d --build
```

Topology: Cloudflare -> host cloudflared -> `127.0.0.1:3000` HAProxy -> two private app replicas -> shared MariaDB and shared uploads volume. The overlay removes the app's fixed name and host port, sets proxy hops to 2, and adds a least-connections gateway with health checks. It normalizes proxy headers for this trusted Cloudflare-only ingress. No public database port is published.

The direct deployment (without the overlay) uses proxy hops 1. Do not point cloudflared directly at app replicas when using the overlay. All users must arrive through Cloudflare; arbitrary local clients with network access to the gateway are trusted by this topology. APP_URL must match the external HTTPS origin.

Each app allows one concurrent PDF render, so two replicas can run two PDFs. Uploaded files are shared because the replicas run on one Docker host. This is not multi-VM storage or high availability: the VM, gateway and MariaDB remain single points of failure. Backups must exist outside the VM. Additional replicas can increase RAM use and database contention; they do not create more Oracle CPU capacity.

To return to one instance, use the base Compose file, scale app to one, and remove the gateway service before reclaiming its host port. Keep the shared database/uploads volumes and additive migration. Existing sessions may require login if reverting the session policy.

## Verification and limits

- Automated tests cover authorization, data validation, atomic update rollback, session-cookie renewal, cross-instance logout and absolute expiry using a shared test store; the production store remains MariaDB.
- Rate-limit tests cover the custom store contract and rollback using a database double. They do not prove real MariaDB concurrency.
- Browser QA uses synthetic API fixtures for Admin save and member lookup; it does not modify live accounts.
- Both Compose files pass `docker compose config --quiet` with placeholder environment values.
- Docker daemon is unavailable on the development machine. Real MariaDB transactions, HAProxy configuration startup/failover, Oracle ARM64 images, Cloudflare forwarding and production load capacity remain deployment verification gates. Do not describe this as an end-to-end production pass or guaranteed support for a particular number of concurrent users.

This review addressed the inspected account/admin/profile/portfolio/post/session paths and existing automated route coverage. It is not a proof that every possible payload or operation in the application is correct. Remaining broader improvements include durable administrator audit history and measured load tests of login, course/quiz writes and PDF generation against an isolated production-like database.
