# Phase 12 — Full system QA results

> อัปเดตล่าสุด 2026-09-12: UI ครบ 37 HTML entry points และ Projects/tagging, Positions, OTP, server pagination มี implementation พร้อม local DB/browser evidence แล้ว ดู [UI-AND-FEATURES-ACCEPTANCE.md](UI-AND-FEATURES-ACCEPTANCE.md) เป็นสถานะล่าสุดสำหรับรายการเหล่านี้ รายงานก่อนหน้าด้านล่างเป็นประวัติ; Phase 12/full production acceptance ยังไม่ปิด


> ตรวจทาน 2026-09-12: รายงานนี้เก็บผลบางส่วนจากรอบก่อน ไม่ใช่ full acceptance หลักฐาน PDF เป็น service generation smoke; AX snapshots ไม่พิสูจน์ console/network หรือ responsive ครบ ดู [PLAN-CONFORMANCE-AUDIT.md](PLAN-CONFORMANCE-AUDIT.md) สำหรับ implementation gaps และการแก้สถานะ COMPLETE เดิม ต้องปิดงานก่อนหน้าด้วย ไม่ใช่รอ staging อย่างเดียว

Date: 2026-09-12
Environment: Docker Compose local (`bimclub_app`, MariaDB 10.11), Chromium in-app browser

## Functional smoke

- `npm test`: **46/46 passed**.
- JavaScript syntax checks for changed route and browser files: passed.
- `git diff --check`: passed.
- Docker readiness: `GET /healthz` returned `200` with `{"status":"ok","database":"ok"}`.
- Public HTTP smoke returned `200` for Home, About, Activities, Achievement, Honor, Courses, Feed, Portfolio public, CV public, Login, Register, and Admin Dashboard HTML shells.
- Guest authorization checks returned `401` for `/api/admin/dashboard`, `/api/admin/users`, and `/api/cms-content/activities`.
- Local QA account seed created three verified accounts with generated passwords. Login returned `200` for member, instructor, and admin; the admin dashboard returned `403` for member/instructor and `200` for admin.
- Authenticated API matrix: all three roles received `200` from `/api/auth/me` and public posts; member/instructor received `403` from `/api/admin/dashboard`, admin received `200`; instructor course management returned `200`, member course management/create returned `403`; invalid CMS create returned `400` without writing data.

## Browser smoke

Chromium accessibility snapshots completed for Courses, Feed, and Portfolio public pages. Navigation, headings, empty/data states, footer, and login links were present. Feed rendered database posts and expected guest like/comment prompts. Portfolio public rendered the safe invalid-link state.

## Regression and security checks

- Existing authorization, upload validation, registration, profile, projects, positions, honors, video URL, and renderer tests remain green.
- Phase 10 coverage verifies CMS image preservation, achievement escaping/URL allowlist, PDF path containment, activity date handling, and personnel update/delete behavior.
- No new asset 404 or uncaught browser error was observed in the smoke snapshots.

## Limitations / deferred evidence

- Successful destructive/content mutations were intentionally not executed; permission and validation paths were tested without creating or deleting content.
- PDF E2E rerun after Docker resumed succeeded: Chromium generated an A4 PDF buffer of 112,820 bytes from a test payload.
- Cross-browser Safari, Edge, and Firefox runs were unavailable in this session.
- Responsive viewport matrix, PDF Chromium end-to-end generation, load/concurrency measurements, restore rehearsal, and production dependency audit are not claimed complete.
- Optional Phase 11 governance features (granular RBAC, audit log, exports, persisted system settings) remain deferred.

## Release status

**PARTIAL / not ready for production publish.** Core source, local runtime, authenticated permission checks, and PDF generation pass; cross-browser/responsive/performance/restore evidence still requires an approved staging run.
