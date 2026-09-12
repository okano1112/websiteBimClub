# BIM Club — Controlled Development changelog


## 2026-09-12 — Apple-inspired shared UI + functional gap closure

Implemented the shared UI across 37 entry points, Positions management, canonical Projects cutover and Admin collaborator tagging, OTP verification/recovery, and server-side Users/Members pagination. Real browser verification found missing project sections in Standard/Letter/ATS CV templates and mobile document clipping; added existing-style text sections and outer iframe fitting. Added database migrations for OTP state and legacy project ID sequencing; applied the missing P3 Positions migration to the running local database without deleting old honors.

Evidence: 56 passing Node tests; 55 live DB/route checks with a fake mailer; browser workflows with disposable roles; 74 page/viewport visits; public tagged CV PDF HTTP 200/%PDF. See [UI-AND-FEATURES-ACCEPTANCE.md](UI-AND-FEATURES-ACCEPTANCE.md) for exact scope, fixtures, migrations and limitations. Real SMTP delivery and full Phase 12 acceptance are not claimed. No deployment or commit.

## 2026-09-12 — Review corrections / visible Home redesign

- Home now has a visible editorial/Apple-inspired composition: white navigation, large Thai hero, gray/white rhythm, real route CTAs, section headings and a closing membership action. Protected card markup unchanged; wrapper grid corrected for 320px overflow.
- CMS UI omits unchanged cover input and resets pending file on edit selection. CMS PUT changes only the cover row, preserving other gallery row IDs/captions/order. An explicit null removes only that cover. The UI explains cover semantics; full gallery ID selection/removal remains future work.
- Profile GET refreshes authenticated viewer state and respects independent Portfolio visibility; project query includes owned public projects as well as collaborations.
- Achievement team/year fields now escape HTML.
- PDF local images check realpath containment/decoded traversal, remove file:// fallback, and limit requests to raster data and existing Google Fonts HTTPS hosts. Script execution disabled; explicit theme colors must be six-digit hex. External remote image URLs are blocked in server PDFs; use local uploaded images for this path.
- Added handler-level behavior tests using simulated DB responses/state (not live SQL integration) plus PDF symlink/network policy tests. Suite passes 54/54. PDF service smoke passes with %PDF- signature and 94,664 bytes. Chromium Home overflow checks pass five widths; no pageerror observed.
- Remaining audit work is not closed by this packet: canonical project cutover/tagging UI, positions workflow, OTP, list pagination, broader design expansion and full QA remain pending.


## 2026-09-12 — ตรวจทานความครบถ้วนตามแผน

รายงาน COMPLETE เดิมเป็นสถานะ packet และหลายจุดไม่ผ่าน acceptance ของ Phase เต็ม พบ CMS image loss ผ่าน UI ยังอยู่, canonical project cutover ขาด, Profile privacy และ Achievement escaping ไม่ครบ รวมถึง OTP และ pagination ที่ยังไม่ได้ทำ ดู [PLAN-CONFORMANCE-AUDIT.md](PLAN-CONFORMANCE-AUDIT.md) สำหรับหลักฐานและสถานะที่แก้ไขล่าสุด npm test รอบตรวจผ่าน 46/46 แต่มี static assertions จำนวนมาก จึงไม่ใช้แทน behavioral QA รอบนี้ไม่แก้ runtime หรือ DB

## Phase 0 — Source audit (2026-09-10)

STATUS: Source audit complete; live DB/browser QA not performed.

- ADDED / CHANGED / FIXED: ไม่มี runtime หรือเอกสารที่เขียนในรอบ Phase 0; ส่งผลตรวจใน task.
- FILES MODIFIED / CREATED / DELETED: ไม่มี.
- DATABASE CHANGES: ไม่มี; ไม่เรียก migration หรือ API ที่อาจ auto-migrate.
- TESTS: Node test suite 23/23 ผ่าน; JavaScript syntax 58/58 ผ่าน; literal HTML target scan พบ Home link ไป /public/page/achievement.html ไม่มี target; default-avatar asset ที่อ้างไม่พบ.
- KNOWN ISSUES: รายการ B01–B15 อยู่ใน CONTROLLED-DEVELOPMENT-PLAN.md; security findings เป็น source evidence ไม่ใช่ผล exploit production.
- ROLLBACK: ไม่มี mutation ที่ต้องย้อน.

## Phase 1 — Developer documentation + all-phase planning (2026-09-10)

STATUS: Documentation scope complete; validation passed. Runtime refactor not started.

### ADDED

- แผน Phase 1–12 ที่ระบุ files/steps/proposed contracts/schema decisions/acceptance/tests/rollback และ dependencies.
- Page inventory 34 หน้าเดิม + 5 proposed/conditional pages พร้อมสองคำถามเฉพาะหน้าและ checks.
- Developer handoff: data/API/asset ownership, resume prompt, approval log, stop rules, test evidence limits และ next exact action.
- Changelog แยกงานนี้จากประวัติ Phase/migrations เดิม.

### CHANGED

- เพิ่ม current-state supplement ด้านบน ARCHITECTURE.md; รักษาเนื้อหาก่อนหน้าที่มีงานของผู้ใช้อยู่แล้ว.

### FIXED

- แก้ความกำกวมในเอกสาร: current vs proposed, permission role vs club position, mock vs real, source tests vs live QA, schema bootstrap vs safe migration.
- ไม่มี application bug fix ใน Phase นี้; known bugs ถูกจัดเข้างานที่จะรออนุมัติตามลำดับ.

### FILES MODIFIED

- ARCHITECTURE.md

### FILES CREATED

- CONTROLLED-DEVELOPMENT-PLAN.md
- PAGE-INVENTORY-AND-QA.md
- DEVELOPMENT-HANDOFF.md
- CONTROLLED-CHANGELOG.md

### FILES DELETED / DATABASE CHANGES

- ไม่มี.

### BEFORE / AFTER

- Before: ผล audit อยู่ใน task, เอกสารเก่ามีทั้งประวัติ/คำแนะนำ setup, ไม่มี implementation packets ครบ 12 Phase.
- After: มีเอกสารเริ่มงานชุดเดียวที่ลิงก์กัน พร้อมข้อเสนอที่ยังรอยืนยัน, source ownership, criteria และคำถามรายหน้า; code/runtime คง baseline.

### TESTS / REGRESSION / UX / SECURITY

- PASS: local Markdown links 14 targets ตรวจพบไฟล์ครบ; inventory ครบ 34 HTML เดิม ไม่มีตกหล่น; Phase headings ครบ 1–12.
- PASS: scoped git diff whitespace check ของ ARCHITECTURE.md; Markdown ใหม่ตรวจ trailing whitespace ไม่พบ.
- PASS: `node --test` รันหลังเขียนเอกสาร ผ่าน 23/23, fail 0, skip 0 (2026-09-10).
- PASS: SHA-256 เปรียบเทียบ runtime source/config/schema/tests/package/deployment files กับ pre-edit baseline 140 ไฟล์ — changed 0, removed 0.
- ไม่ทำ browser retest หรือ live DB writes สำหรับงานเอกสารนี้; ภาพ UI ไม่มี Before/After ใหม่.
- Skills ด้าน design ใช้กำหนด scoped visual checks/Protected Components และ concept gates ในแผน ไม่ใช้เปลี่ยน UI.

### KNOWN ISSUES

- D01–D12 ยังรอคำตอบก่อน feature ที่เกี่ยวข้อง; optional features ไม่ได้รับอนุมัติอัตโนมัติ.
- Existing worktree มีงานผู้ใช้ค้างจำนวนมาก; Git diff จาก HEAD ไม่ใช่รายการงานของ Phase นี้ทั้งหมด.
- แผนช่วยให้ตรวจงานโมเดลอื่นได้ แต่ไม่รับประกันความสามารถของโมเดลต่างรุ่นเท่ากัน.

### ROLLBACK

- ย้อนเฉพาะ supplement ที่เพิ่มบน ARCHITECTURE.md และเอกสารใหม่สี่ไฟล์ของงานนี้ หลังตรวจว่าไม่มีงานใหม่เข้ามาซ้อน.
- ไม่ใช้ git reset/checkout ทั้งไฟล์ ARCHITECTURE.md เพราะมี pre-existing edits.
- ไม่ต้อง rollback runtime หรือฐานข้อมูล.

### NEXT PHASE

- Phase 2 Profile Image System — รออนุมัติ scope และ D01; เริ่ม P2.1 preview/fallback แล้ว P2.2 upload pipeline ตาม approved work packets.

## Phase 2 — Profile image system, packet P2.1 + P2.2 (2026-09-10)

STATUS: Implemented under decision D01 = A; tests complete; Phase 2 gate reached.

### ADDED

- `src/services/imageUpload.js`: byte-level decode validation via sharp, MIME/format agreement, 5 MiB byte limit, 20MP pixel limit, cryptographically random validated filenames, and exclusive file creation.
- `test/image-upload.test.js`: valid PNG, MIME spoof, corrupt/oversized input, and limits tests.
- `sharp` runtime dependency and lockfile entries.

### CHANGED

- `src/routes/upload.js`: image routes use Multer memory storage; files are validated before persistence and partial batches are cleaned up. GIF is no longer accepted by image endpoints under D01; video route remains separate and unchanged.
- `middleware/errorHandler.js`: image validation errors return 400 and Multer size errors return 413.
- `public/page/admin-honor.html`, `public/js/admin-honor.js`, `public/css/admin.css`: explicit image accept list, `hidden` preview state, fixed 1:1 preview/thumbnail treatment, safe alt text, and actionable upload error.
- `public/js/honor.js`: missing image uses an accessible placeholder; broken images do not loop to a nonexistent asset.
- `public/js/settings.js`: broken avatar falls back to initials once.

### FIXED

- Profile preview no longer relies on a `d-none`/inline-style conflict.
- Removed references to nonexistent `default-avatar.png` from the active Honor rendering path.
- Uploaded image extensions now derive from decoded format, not a client-controlled original filename.

### FILES MODIFIED

- `package.json`, `package-lock.json`, `src/routes/upload.js`, `middleware/errorHandler.js`, `public/page/admin-honor.html`, `public/js/admin-honor.js`, `public/css/admin.css`, `public/js/honor.js`, `public/js/settings.js`.

### FILES CREATED

- `src/services/imageUpload.js`, `test/image-upload.test.js`.

### DATABASE CHANGES / FILES DELETED

- ไม่มี.

### TESTS

- Actual result: `node --test` passed **27/27**, fail 0, skip 0.
- Actual result: changed JavaScript `node --check` passed for all 5 files.
- Actual result: `git diff --check` passed.
- `node --check` on changed JavaScript files.
- `git diff --check`.

### KNOWN ISSUES / LIMITATIONS

- D01 does not include crop/reposition UI; preview uses center crop through `object-fit: cover`.
- Feed clients still advertise GIF in their browser accept attribute, but server image routes now reject GIF with a clear 400 response; preserving GIF support requires a separate decision or broader D01 scope.

## Phase 3 — Alumni position catalog and verified account links

STATUS: Implemented under decision D02; tests complete; live DB/browser QA not run.

- Added additive migration `database/controlled-p03-alumni-positions.sql` and matching fresh-install schema definitions for `positions`, `honors.position_id`, and nullable verified `honors.user_id`.
- Added `GET /api/positions`, admin listing, and protected create/update endpoints. Position labels include leader metadata for public rendering.
- Extended Honor API and Admin form to select a catalog position and manually verified member account. Legacy `honors.position` text remains available and no name-based auto-matching is performed.
- Application validation rejects a second assignment for the same verified user and year, while allowing multiple people to hold the same position.
- Added `test/positions.test.js`; full suite passes 29/29.

Rollback: do not run the migration until reviewed; after migration, revert application files first. Removing the new columns/table requires a separate approved destructive migration and is intentionally not included.

## Phase 4 — Project collaborator tagging foundation

STATUS: Implemented under D04/D05/D11 recommendations; automated tests complete; test database migration and browser QA not run.

- Added `database/controlled-p04-project-collaborators.sql` for isolated test DB use. It provisions phase 8 portfolio columns, canonical `projects`, `project_members`, and deterministic `project_legacy_links` without dropping legacy tables.
- Added `/api/projects` public pagination/detail, authenticated owner create/update/soft-delete, Admin-only collaborator replacement, and bounded Admin member search.
- Public queries require `is_public = 1` and `deleted_at IS NULL`; owner is not duplicated in `project_members`; collaborator updates validate active users, duplicates, and transaction atomicity.
- Removed request-time `ALTER TABLE` behavior from portfolio routes; the compatibility hook now has no DDL side effect and the migration owns schema readiness.
- Legacy `/api/portfolios/me/projects` remains intact until a test-DB backfill and compatibility cutover are verified.
- The migration now includes a deterministic cursor-based one-to-one backfill from `portfolio_projects`, preserving legacy IDs in `project_legacy_links`; it is intentionally unrun until an isolated test DB is available.
- Added a compatibility-safe `involved_projects` read adapter to Portfolio. Missing canonical tables fall back to an empty list, while legacy owned projects and IDs remain unchanged.
- Ran the Phase 4 migration on the isolated `club-website_db_data_local` volume after creating a backup in `/private/tmp`; the test database had zero legacy project rows, so backfill counts were 0/0 and no user data moved. Rebuilt the app image to include the approved `sharp` dependency; `/healthz` and `GET /api/projects` returned 200.
- Browser read-only QA opened `portfolio-public.html` successfully and confirmed the safe empty-state message for a missing user id. Direct API navigation was blocked by the in-app browser client, so API smoke evidence remains from container-side HTTP checks.

Rollback: keep legacy portfolio project rows as source until migration audit/backfill succeeds. Revert the new route and hook independently; do not drop canonical tables or legacy data.

## Phase 5 — Profile foundation

STATUS: P5.1/P5.2 implemented on isolated test DB; browser read-only smoke passed; activity participation remains intentionally unmodeled.

- Added `member_profiles` migration and `/api/profiles/:userId`, `PUT /api/profiles/me`, and Admin-only `PUT /api/profiles/:userId`.
- Public responses use an allowlist and omit contact/recovery fields. Privacy is enforced server-side; owner/admin may read private profile metadata.
- Added namespaced Profile page/CSS/JS with safe empty, error, missing-avatar, project, and post states. Project data is read from canonical published collaborator relations; Posts are filtered by `author_id` server-side.
- Phase 5 migration was applied to the isolated local DB; Profile API returned 200 for the seeded admin account. Browser QA confirmed the rendered profile and empty states.

Limitations: no activity-members table was added, no automatic profile data copy was created, and Portfolio/Alumni card structures remain unchanged. Full privacy matrix and mobile visual QA remain to be expanded in the next packet.

## Phase 6 — Registration and account password baseline

STATUS: Registration baseline implemented under D07 recommendation; tests complete; SMTP/real email flow not exercised.

- Fixed registration JS/HTML field mismatch by binding `regUsername`, `regEmail`, `regFullName`, `regPassword`, and `regConfirmPassword` and loading the script explicitly.
- Added client and server confirmation/minimum checks with an 8-character password policy; normalized registration email to lowercase.
- Applied the same 8-character minimum to password reset and Admin password UI while preserving existing OTP/reset contracts.
- Added `test/registration.test.js`; full suite passes 37/37.

Limitations: live SMTP sink, OTP expiry/rate-limit behavior, and real registration submission were not executed. No credentials or real email were used.

## Phase 7 — Remove statistics instance

STATUS: Complete; no DB changes.

- Removed the four unsupported Activity statistics (`20+`, `150+`, `10+`, `5+`) and their dedicated IntersectionObserver.
- Removed only the unused `.stats-section` styles and responsive rules; carousel, timeline observer, calendar, upcoming activities, and existing cards remain.
- Static search found no remaining statistics selectors in the Activity page/CSS. Browser read-only QA confirmed the Activity page renders hero, featured activity, timeline, calendar, upcoming section, and CTA without the statistics block.
- Live DB/browser upload test, real file cleanup observation, and image decoder behavior on every deployment OS are not verified in this packet.
- `npm install` reported one high severity audit finding, but `npm audit --omit=dev` could not reach the registry in this environment; dependency remediation is not claimed complete and must be reviewed before release.

### ROLLBACK

- Revert only the Phase 2 packet files and dependency lock changes after checking for later edits; do not restore the whole repository or delete existing uploads.
- Keep any already persisted validated files; no DB rollback is required.

## Phase 8 — Navbar brand text

STATUS: Complete under D08 recommendation; browser read-only QA passed.

- Updated the shared navbar brand to `[logo] BimClub` using one accessible Home link.
- Removed duplicate logo alt announcement by making the decorative image aria-hidden and providing a single `BimClub หน้าหลัก` accessible name.
- Preserved logo URL, Home destination, menus, auth controls, system sidebar, and non-navbar typography.

## Phase 9 — Activities Editorial pilot

STATUS: Pilot complete; Protected Activity Cards and interaction structure preserved.

- Added page-scoped `activity-page` tokens and rhythm for hero-adjacent sections, headings, timeline, and calendar spacing.
- Added reduced-motion handling scoped to Activities so reveal/transition behavior is minimized for users who request it.
- No global tokens, card selectors, carousel markup, calendar logic, or timeline data were changed.
- Browser read-only QA confirmed Activities still renders featured activity, timeline, calendar, upcoming section, CTA, and navigation after the pilot.

### Phase 9 — About Editorial extension

STATUS: Pilot extension complete; browser read-only QA passed.

- Added page-scoped `about-page` rhythm tokens for personnel, timeline, CTA, and section heading hierarchy.
- Added reduced-motion handling scoped to About.
- Preserved existing personnel/team cards, images, timeline content, and CTA behavior.

### Phase 9 — Home Editorial extension

STATUS: Pilot extension complete; browser read-only QA passed.

- Added page-scoped `home-page` rhythm tokens for carousel, information blocks, and community feed spacing.
- Added reduced-motion handling scoped to Home.
- Preserved Hero carousel slides, achievement link, community feed rendering, and all existing navigation/cards.
- Browser QA confirmed carousel, info blocks, feed, footer, and navigation remain visible.

### Phase 9 — Achievement, Honor, Profile, Member forms, and Admin extension

STATUS: Remaining page extension complete; browser smoke passed on public Achievement/Honor and source checks passed for authenticated/editor/admin surfaces.

- Added page-scoped rhythm tokens and reduced-motion support for Achievement, Honor, Portfolio editor, Settings, and Admin Dashboard.
- Added scroll-margin for Honor year sections and spacing for editorial section headers without touching Alumni card rendering.
- Preserved form controls, template cards, admin cards, data loaders, and permission behavior.
- Browser QA confirmed Achievement and Honor public pages render navigation, headings, content states, and footer after the extension.

## Phase 10 — Functional bug-fix packets

STATUS: Packet 1 complete; remaining audit items stay pending for separate reviewed packets.

- Fixed Home achievement link to use the deployment-relative `page/achievement.html` path.
- Fixed Activities upcoming list to accept only valid `start_date` values, compare against today, sort ascending, and show an empty state when no dated event exists; legacy `event_date` display remains unchanged.
- Fixed Personnel updates to merge omitted fields with the existing row, preventing accidental clearing of nickname/profile/publication values; delete UI now checks HTTP/response success before reporting completion.
- Added `test/phase10-bugs.test.js`; full suite passes 40/40.

- CMS achievement/activity updates now preserve existing images when `imageUrl` is omitted; explicit image values still replace/remove metadata transactionally without deleting files from disk.
- Hardened the public Achievement renderer against unsafe image URLs, HTML interpolation, and null descriptions; removed the truncated `.card-` CSS selector.
- Added PDF local-resource containment checks to prevent traversal outside the configured assets/uploads roots.
- Added regression coverage for the above; full suite passes 44/44.

Remaining evidence limits: authenticated Course/Feed/Admin flows and end-to-end Chromium PDF rendering require credentials and a live browser session; they were source-audited only.

## Phase 11 — Admin experience, Packet 1

STATUS: Core admin experience packet complete; optional governance/reporting capabilities remain explicitly deferred.

- Added admin-only `GET /api/admin/dashboard` with live counts for users, verification backlog, courses/publication, activities, achievements, instructor requests, and community posts.
- Replaced the Admin Dashboard mock data dependency and MOCKUP badge with database-backed rendering and an explicit API error state.
- Aligned Admin password update validation and copy with the shared eight-character policy.
- Added regression coverage; full suite passes 46/46.

Deferred: server-side user list pagination/filtering, audit log, granular RBAC, exports, and persisted system settings require separate decisions and migrations.

## Phase 12 — Full system QA

STATUS: Partial QA evidence captured; release publish remains blocked until staging-only evidence is available.

- Recorded 46/46 automated tests, syntax/diff checks, Docker health, public page HTTP smoke, guest API authorization checks, and Chromium accessibility snapshots.
- Added [QA-RESULTS.md](QA-RESULTS.md) with exact evidence and limitations.
- Authenticated mutation flows, cross-browser/responsive matrix, PDF end-to-end rendering, performance, restore rehearsal, and production dependency audit are explicitly unclaimed.
- After Docker was resumed, PDF E2E generated a 112,820-byte Chromium PDF successfully; cross-browser/responsive/performance/restore evidence remains pending.
