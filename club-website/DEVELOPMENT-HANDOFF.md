# BIM Club — เริ่มงานต่อจากไฟล์นี้

> อัปเดตล่าสุด 2026-09-12: UI ครบ 37 HTML entry points และ Projects/tagging, Positions, OTP, server pagination มี implementation พร้อม local DB/browser evidence แล้ว ดู [UI-AND-FEATURES-ACCEPTANCE.md](UI-AND-FEATURES-ACCEPTANCE.md) เป็นสถานะล่าสุดสำหรับรายการเหล่านี้ รายงานก่อนหน้าด้านล่างเป็นประวัติ; Phase 12/full production acceptance ยังไม่ปิด


> สถานะตรวจทาน 2026-09-12: ข้อความ COMPLETE ในตารางประวัติด้านล่างหลาย Phase เกินหลักฐานจริง ให้ใช้ [PLAN-CONFORMANCE-AUDIT.md](PLAN-CONFORMANCE-AUDIT.md) เป็นข้อแก้ไขล่าสุด: P3–6, P9–11 ยัง PARTIAL/INCOMPLETE และ P12 ยังไม่ผ่าน acceptance ผู้ใช้อนุมัติใช้ Docker local/QA accounts แล้ว ไม่ต้องขอ staging URL ซ้ำสำหรับงานทดสอบที่ทำแยก fixture ได้

วันที่ส่งต่อ: 2026-09-10. เอกสารนี้มีไว้ให้ผู้พัฒนาหรือโมเดลถัดไปทำงานต่อได้โดยไม่ตีความแผนใหม่เอง.

## สถานะและอำนาจที่ได้รับ

- Phase 0: ตรวจ source/inventory และ tests แล้ว ไม่ใช่ full browser/live DB audit.
- Phase 1: อนุมัติงานเอกสาร/Developer Guide; ผู้ใช้ขยายให้วางแผนล่วงหน้าทั้ง 12 Phase ก่อนลดโมเดล.
- Runtime implementation: ยังไม่เริ่มในงานชุดนี้. ไม่มี migration, dependency install, account creation, mail send, deployment หรือ commit จากงานนี้.
- Phase 2–12: **PLANNED / WAITING FOR PHASE APPROVAL**. การเปลี่ยนโมเดลไม่ใช่การอนุมัติข้าม gate.
- เป้าหมายคุณภาพคงเดิม แต่ไม่มีเอกสารใดรับประกันว่าโมเดลต่างรุ่นมีความสามารถเท่ากันทุกประการ ต้องใช้ acceptance/evidence/stop rules เป็นเครื่องควบคุม.

## ลำดับอ่าน

1. `AGENTS.md` และคำสั่งผู้ใช้ล่าสุดใน task.
2. [Architecture ปัจจุบัน](ARCHITECTURE.md) โดยเริ่มส่วน Controlled Development ที่ต้นไฟล์; เนื้อหาประวัติด้านล่างไม่ใช่ผลทดสอบใหม่.
3. [Master implementation plan](CONTROLLED-DEVELOPMENT-PLAN.md) ส่วน guardrails/decision gates และ Phase ที่ได้รับอนุมัติ.
4. [Page inventory + QA](PAGE-INVENTORY-AND-QA.md) เฉพาะหน้าในงาน และ test matrix ร่วม.
5. [Changelog](CONTROLLED-CHANGELOG.md), decision log ด้านล่าง และ source files ของ packet.
6. Skills ที่เกี่ยวข้องตาม AGENTS; อ่านในโมเดล/งานปัจจุบันก่อนใช้. Skill/plan เก่าไม่ override คำขอรักษาการ์ดหรือ Phase gate.

Master Prompt ต้นฉบับอยู่ใน attachment ของ task วันที่เริ่มงาน; กติกาหลักถูกถ่ายทอดไว้ในแผนแล้ว อย่าพึ่ง absolute attachment path เป็น runtime dependency.

## Resume prompt — ผู้ใช้คัดลอกให้โมเดลถัดไปได้

> อ่าน AGENTS.md, DEVELOPMENT-HANDOFF.md, CONTROLLED-DEVELOPMENT-PLAN.md และ PAGE-INVENTORY-AND-QA.md ก่อนทำงาน ตรวจ git status และไฟล์จริงของ Phase ที่ฉันอนุมัติ รักษางานเดิมทั้งหมด ใช้ acceptance cases ในแผนเป็นข้อกำหนด ห้ามเปลี่ยน Protected Cards/API/schema โดยไม่มี scope ที่อนุมัติ ห้ามเดาคำตอบใน decision log และห้ามรัน schema.sql ทับฐานข้อมูลเดิม ทำทีละ packet ทดสอบ behavior จริงพร้อมผลที่ตรวจสอบได้ แล้วสรุปก่อนขออนุมัติ Phase ถัดไป หาก source ไม่ตรงแผนให้รายงานจุดต่างและปรับแผนก่อนแก้ ไม่ลดการทดสอบหรือเพิ่ม mock เพื่อให้ดูเสร็จ เริ่มจากการระบุ Phase ล่าสุดที่ได้รับอนุมัติ; ถ้ายังไม่มีอนุมัติ runtime ให้เสนอ Phase 2 ตามแผนและรอคำตอบ

ผู้ใช้สามารถต่อท้ายข้อความนี้ด้วย “อนุมัติ Phase 2 ตาม scope …” เมื่อได้เลือกข้อจำกัดอัปโหลด/วิธีประมวลผลภาพแล้ว. อย่าเติมข้อความอนุมัติให้ผู้ใช้เอง.

## Decision log

| ID | วันที่ | คำตอบ/ขอบเขตที่ยืนยันแล้ว | สถานะ |
| --- | --- | --- | --- |
| AUTH-01 | 2026-09-10 | ผู้ใช้ “เริ่มเลยครับ” หลังเสนอ Phase 1 เอกสาร/คู่มือ/แผน refactor | อนุมัติเฉพาะ scope ที่เสนอ |
| AUTH-02 | 2026-09-10 | ผู้ใช้ให้วางแผนล่วงหน้าครบทุก Phase ก่อนลดโมเดล | อนุมัติเอกสารแผนทั้งระบบ |
| D01 | 2026-09-10 | ผู้ใช้เลือก A: JPG/JPEG/PNG/WebP, 5 MiB, 20MP, decode/bytes validation, ไม่ทำ crop UI รอบแรก | APPROVED; Phase 2 ใช้ `sharp` |
| D02 | 2026-09-11 | คนหนึ่งคนมีหนึ่งตำแหน่งต่อปี; ตำแหน่งเดียวกันมีหลายคนได้ | APPROVED; ใช้ nullable `honors.position_id/user_id` |
| D03–D12 | — | ข้อเสนออยู่ใน master plan; ยังไม่มีคำตอบเรื่อง implementation choices | PENDING |

เมื่อได้คำตอบให้เพิ่มแถวแยกแต่ละ Dxx พร้อมข้อความสรุปที่ตรงกับผู้ใช้/วันที่/ผลต่อ files & tests; ไม่ถือ “ข้อเสนอแนะนำ” เป็นคำตอบ. ถ้าตอบ “ทำต่อ” ให้ใช้ default ที่เสนอใน checkpoint ล่าสุดเท่านั้น ไม่ขยายไปอนุมัติทั้ง 12 Phase.

## แผนที่แก้งานสำหรับ Junior Developer

| ต้องการแก้ | จุดเริ่ม / data | รูปอยู่ไหน / เพิ่มรายการอย่างไร | ใครได้รับผล |
| --- | --- | --- | --- |
| Navbar/Footer/เมนูบัญชี | public/js/navbar-component.js, footer-component.js, auth.js, system-sidebar-component.js; CSS navbar/global/sidebar | logo `/assets/img/logobranding/logobim.png`; link ใหม่ต้องมีปลายทางจริง | public/member/admin ทุกหน้าที่โหลด component |
| Account profile | public/page/settings.html → js/settings.js → src/routes/auth.js → controllers/account.controller.js → models/user.model.js → users | อัปโหลดผ่าน /api/upload แล้วบันทึก avatar_url; ไม่แก้ DB ตรงจาก browser | Navbar, Feed, Portfolio/CV, Profile ใหม่ |
| Alumni | page/honor.html → js/honor.js → routes/honors.js → honors | Admin Honor; profile_image เก็บ URL, บัญชี users ยังไม่เชื่อมจน P3 | year navigation, cards, detail modal |
| Personnel | page/about.html inline JS → routes/team.js → team_members; Admin Personnel | ฟอร์มปัจจุบันยังไม่รองรับรูป/สถานะครบ; รอแก้ omitted fields bug ก่อนใช้แก้รายการจริง | About, legacy team redirect |
| Activities | page/activity.html + js/activity-dynamic.js → routes/activities.js หรือ cmsContent.js → activities | Admin CMS หรือ inline Admin UI; URLs จาก upload/asset เดิม | calendar, cards, timeline, upcoming |
| Club Highlights | page/achievement.html + js/achievement-dynamic.js → routes/achievements.js / cmsContent.js | achievement_images หลายรูป; CMS ปัจจุบันมี bug แทนรูปทั้งชุด | cards, 3D carousel, CMS |
| Member posts | js/feed.js / admin.js → routes/posts.js → posts/images/comments/likes | composer อัปโหลดแล้วส่ง imageUrls; เพิ่มรายการผ่าน API ที่ตรวจ login | Home, Feed, Member Works, Profile ใหม่ |
| Portfolio/CV | page/portfolio*.html, cv*.html → js/portfolio.js, cv.js → routes/portfolios.js | projects/certificates/experiences/education แยกตาราง; settings/extra_sections JSON; รูปเป็น URL | shared document payload, preview, public, PDF |
| PDF layout | js/portfolio-templates.js ใช้ทั้ง browser และ services/pdfRenderer.js | renderer resolve /assets,/uploads; อย่าเปลี่ยน path policy โดยไม่ security tests | Portfolio+CV ทุก template และ export |
| Courses | routes/courses.js + controllers/course.controller.js + models/course.model.js; js/course-* และ manage-courses.js | thumbnail upload, video /uploads/videos หรือ normalized YouTube URL | published list, learner/editor, questions/certs/portfolio |
| Admin users | js/admin-users.js, admin-members.js → routes/admin-users.js → users | API profile ไม่ใช่ position catalog; user roles อยู่ middleware/requireRole.js | auth, all protected routes, role-based navigation |

### Images และ URL mapping

- `public/` เสิร์ฟเป็น `/`: `public/page/activity.html` จึงเป็น `/page/activity.html`, ไม่ใช่ `/public/page/activity.html`.
- `../assets/` ของ repo เสิร์ฟที่ `/assets/`; folders ปัจจุบันมี img/about, achievement, hornor-hero (สะกดตามของเดิม), logobranding, swiperimg, fonts และ videos. ห้ามย้าย folder ให้ตรงตัวอย่างใน Master Prompt โดยไม่มี migration plan.
- `uploads/` เสิร์ฟ `/uploads/`; วิดีโออยู่ `/uploads/videos/`. คง path/filename ของไฟล์เดิม; ไม่อ่าน personal uploads เพื่อหา test fixtures.
- ไม่มี `assets/img/default-avatar.png` ใน audit baseline; P2 ต้องแก้ fallback ที่ใช้อยู่ ห้ามอ้างว่ามี placeholder แล้ว.
- รูปใหม่จากข้อมูลจริงให้ผ่าน uploader/API ของ domain; ไม่ใส่ sample profiles/projects ใน production UI. การแสดงชื่อ real seed ที่ผู้ใช้ให้มาก่อนไม่ใช่สิทธิ์แต่ง biography/position เพิ่ม.
- Static asset ใหม่ต้องมีชื่ออธิบายชนิด/รายการ ไม่ใส่ข้อมูลส่วนบุคคลเกินจำเป็นในชื่อ; ไม่สร้าง dependency ต่อ absolute path ของเครื่องนักพัฒนา.

### Where not to edit

- อย่าแก้ `.card`, `.card-body`, `.card-name`, shared CSS tokens หรือ template renderer เพื่อแก้รูป preview ใน Admin.
- อย่าแก้ `users.role` เพื่อเพิ่มตำแหน่ง President/Committee; position ≠ permission.
- อย่า duplicate Project ลง Profile/Portfolio/Post เพื่อให้ tag ดูทำงาน; ใช้ relation ที่อนุมัติใน P4.
- อย่าเปิด `.env`, DB records หรือ raw uploads เพียงเพื่อเขียนเอกสาร/ทำ visual audit.
- ห้าม import `src/app.js` ใน unit test แล้วคาดว่าไม่มี side effects: app สร้าง MySQL session store และ upload route สร้าง directory. อ่าน imports ก่อนใช้; ใช้ stubs/disposable integration target.

## API inventory ปัจจุบัน (ก่อนเพิ่ม Phase ใหม่)

ดู mount ที่ `src/routes/index.js` และ method/guard ที่ route file จริงก่อนแก้เสมอ. ตารางนี้ไม่ใช่ OpenAPI contract ใหม่.

| Base / route file | Methods/paths ปัจจุบัน | สิทธิ์/ข้อควรระวัง |
| --- | --- | --- |
| /api/auth · auth.js | POST register, verify-otp, resend-verify, login, logout, forgot-password, reset-password; GET me; PUT profile, password, recovery-phone | me/profile ใช้ current DB user; rate limiter ครอบทั้ง auth; frontend registration ไม่ต่อครบ |
| /api/upload · upload.js | POST /, /images, /cms, /video | login/admin/instructor ตาม route; photos 5 MiB, videos 200 MiB; อย่าลด upload validation เป็น frontend-only |
| /api/posts · posts.js | GET /; POST /; PUT/DELETE /:id; POST /:id/comments; DELETE /:id/comments/:commentId; POST/DELETE /:id/likes | list public; mutations require login; ownership/moderation ที่ handler |
| /api/portfolios · portfolios.js | GET/PUT /me; GET/POST /me/export/pdf; GET /public/:userId และ /export/pdf; POST /me/experiences,education,projects,certificates; DELETE nested /:id | owner/public checks; GET บางเส้นทางมี auto DDL/ensure record ต้องแก้ก่อนเรียกบน DB จริงโดยอ้างว่า read-only |
| /api/activities · activities.js | GET/POST /; PUT/DELETE /:id | GET public, writes admin; date columns ต้องมี migration |
| /api/achievements · achievements.js | GET/POST /; DELETE /:id | public read; writes admin; image list multi-row |
| /api/cms-content · cmsContent.js | GET/POST /:section; PUT/DELETE /:section/:id | admin-only, section allowlist activities/achievements; multi-image edit bug |
| /api/honors · honors.js | GET /, /admin, /:id; POST /; PUT/DELETE /:id | list published; /admin+writes guarded; detail unpublished check ใช้ session role ต้องประเมิน stale session |
| /api/team · team.js | GET /, /admin; POST /; PUT/DELETE /:id | published public list; admin writes; current update defaults อาจล้าง omitted fields |
| /api/admin/users · admin-users.js | GET /; PUT /:id/role,profile,password,ban,restore; DELETE /:id | admin-only; DELETE เป็น soft delete |
| /api/instructor-requests · instructorRequests.js | GET /me; POST /; GET /; POST /:id/approve,reject | requester/current user; admin review; transaction/row lock ที่ approval |
| /api/courses · courses.js | GET /,/manage,/certificate-by-code/:code,/:id/editor,/:id,/:id/preview; POST /; PUT/DELETE /:id; POST /:id/stops/:stopId/answer,/:id/quiz/submit,/:id/admin-grant-certificate,/:id/comments; DELETE /:id/comments/:commentId; POST/DELETE /:id/likes | public published list/preview; login learner; instructor owner/editor; admin grant; ตรวจ handler จริง ไม่อนุมานจาก path |
| /healthz · src/app.js | GET | query SELECT 1; database readiness ไม่ใช่ functional QA |

Response aliases เช่น fullName/full_name, avatarUrl/avatar_url และ portfolio nested+spread เป็น compatibility ปัจจุบัน อย่าลบเพียงเพราะซ้ำโดยไม่ inventory consumers/tests.

## ขั้นตอนเริ่ม packet โดยไม่ทำงานเดิมเสีย

1. อ่าน `git status --short`, `git diff -- <target files>`. งานเดิมเป็นของผู้ใช้; snapshot/hash current files ก่อนแก้ ไม่ถือ HEAD เป็น baseline ที่สะอาด.
2. จับคู่ problem กับ source anchor เช่น `ensurePhase8Columns`, `renderPreview`, `renderGrid`, `validatePayload`; line numbers เปลี่ยนได้ อย่า blind patch จากเลขบรรทัด.
3. ระบุ exact files/invariants และตรวจ decision gate; ถ้าชื่อไฟล์/contract เปลี่ยน ให้ปรับแผนตาม evidence ก่อน.
4. เขียน/เรียก behavior test ที่เหมาะสมก่อนแก้ risk logic; ใช้ test fixtures ไม่ใช่ real users.
5. แก้ smallest coherent slice ด้วย apply_patch; ไม่ mass rename/refactor. เพิ่ม Developer Guide comment เฉพาะไฟล์สำคัญที่แตะตาม template ด้านล่าง.
6. ทดสอบ actual changed behavior, diff review, syntax ตามภาษา, UI/data persistence/security ตาม scope. ห้าม claim E2E จาก unit test.
7. update changelog, decision log, state/evidence; stop ที่ Phase gate หลังจบ Phase.

### Comment ที่ต้องเพิ่มเมื่อ implement feature

```text
BIM CLUB — <FEATURE>
PURPOSE: เหตุผลที่มีส่วนนี้
MODIFY HERE: entry point/helper ที่แก้ behavior
DATA SOURCE: table/service/API ที่เป็นเจ้าของข้อมูล
IMAGES: upload/asset source และข้อจำกัด
DO NOT MODIFY: Protected Component หรือ contract ที่ต้องรักษา
ADD AN ITEM: API/Admin flow ที่ใช้เพิ่มรายการ
DEPENDENCIES: หน้าที่ได้รับผล + tests ที่ต้องรัน
```

### Test commands และขอบเขตหลักฐาน

รันจาก `club-website/` หลังอ่าน test source แล้ว:

```sh
node --test
node --test test/authorization.test.js
node --test test/portfolio-cv.test.js
node --check src/routes/upload.js
git diff --check
```

`node --test` ปัจจุบันมี 23 tests: authorization 7, personnel seed 2, portfolio/CV rendering 7, UI source structure 4, video URL 3. ใช้ DB stub ใน authorization, ไม่มี registration/upload/live CRUD/browser coverage. Proposed tests ใน master plan ยังไม่มีไฟล์ ห้ามเรียกก่อนสร้างแล้วรายงาน missing file ว่า feature fail.

- ไม่ต้องรัน syntax ทั้ง repo ซ้ำสำหรับเอกสารล้วน; validate markdown links/inventory และ runtime unchanged เหมาะสมกว่า.
- `npm start`/Docker/import app อาจเปิด session store/DB หรือ initialize schema; ต้อง resolve test target ก่อน ไม่ใช้ production config โดยปริยาย.
- เมื่อทดสอบ migration ต้องใช้ DB แยกและตรวจ restore; DDL ไม่รับประกัน rollback ด้วย transaction.
- Browser read-only/fixtures แยกจาก real content; ต้องขอสิทธิ์ก่อนส่ง mail/สร้างบัญชีจริง/deploy.
- ข้อมูล dependency version ในแผนเป็น baseline ไม่ใช่คำรับรอง security advisories ล่าสุด; verify ณ วันจะ upgrade.

## Stop rules เมื่อ source หรือข้อกำหนดไม่ชัด

- หยุดส่วนที่พึ่งคำตอบถ้า cardinality/visibility/ownership/retention/data mapping ยังไม่ยืนยัน; ทำ read-only checks ที่เป็นอิสระต่อได้.
- ห้ามยอมรับ schema destructive หรือเลือก production DB เพียงเพราะเข้าถึงได้.
- หาก fix ต้องเปลี่ยน card CSS/structure/animation ให้รายงาน bug evidence และ scope exception ก่อน.
- หาก test fail อย่าลด assertion, ข้าม test หรือแก้เป็น mock success เพื่อส่งงาน.
- หากพบผลต่างจากแผน ให้บันทึก drift: source ปัจจุบัน, ข้อสมมติเดิม, ผลกระทบ, proposed update; ไม่ silently choose architecture ใหม่.
- ไม่มี browser/DB/dependency ที่ต้องใช้ = บันทึก BLOCKED สำหรับหลักฐานนั้น ไม่อ้าง complete. ปัญหาการอนุมัติของ tool ต้องรายงานตามเหตุผลจริง.
- หาก context ใกล้หมด ให้บันทึก packet/file changes/tests/next exact action ก่อนส่งต่อ ไม่เริ่ม Phase ใหม่.

## State สำหรับงานถัดไป

| Phase | สถานะตอนส่งต่อ | งานถัดไป |
| --- | --- | --- |
| 0 | SOURCE AUDIT COMPLETE; live QA not run | refresh เฉพาะ source ที่เปลี่ยนหลัง audit |
| 1 | DOCUMENTATION SCOPE COMPLETE เมื่อ validation ใน changelog ผ่าน | runtime refactor ถูกจัดไว้ตาม feature ในแผน ยังไม่เริ่ม |
| 2 | COMPLETE (P2.1 + P2.2); live DB/browser QA not run | อ่าน Phase 2 changelog |
| 3 | COMPLETE (P3.1 + P3.2); live DB/browser QA not run | อ่าน Phase 3 changelog; ก่อน Phase 4 ต้องยืนยัน D03 |
| 4 | COMPLETE (P4.1 + P4.3 read adapter); isolated DB migration and page QA passed | อ่าน Phase 4 changelog; production cutover ยังไม่ทำ |
| 5 | FOUNDATION COMPLETE (P5.1 + P5.2); isolated migration/API/browser smoke passed | อ่าน Phase 5 changelog; activity relation and full privacy matrix remain pending |
| 6 | BASELINE COMPLETE (registration field binding + password policy); tests passed | อ่าน Phase 6 changelog; SMTP/OTP live flow not exercised |
| 7 | COMPLETE; stats instance removed and browser page QA passed | อ่าน Phase 7 changelog |
| 8 | COMPLETE; logo-first brand and accessible Home link verified in browser | Phase 9 requires per-page concept approval; continue with planned pilot |
| 9 | PILOT COMPLETE; Activities Editorial spacing and reduced motion verified | Continue page-by-page only within approved scoped pilots |
| 9 | EXTENDED; About Editorial spacing and reduced motion verified | Continue page-by-page only within approved scoped pilots |
| 9 | EXTENDED; Home Editorial spacing and reduced motion verified | Continue page-by-page only within approved scoped pilots |
| 9 | COMPLETE; all planned page groups have scoped rhythm/reduced-motion extensions and public smoke QA | Phase 10 follows planned bug-fix packet |
| 10 | COMPLETE for source/test scope; CMS image preservation, Achievement renderer hardening, PDF containment, and Packet 1 fixes pass 44/44 tests | Authenticated Course/Feed/Admin and end-to-end PDF browser evidence remain unexecuted without credentials/live session |
| 11 | COMPLETE for core admin experience; Admin Dashboard uses protected live metrics, password policy is aligned, and tests pass 46/46 | User pagination/filtering, audit log, granular RBAC, exports, and persisted settings remain explicitly deferred optional work |
| 12 | PARTIAL QA complete; local tests/runtime/API guest checks and Chromium public smoke recorded in QA-RESULTS.md | Authenticated mutation flows, cross-browser/responsive matrix, PDF E2E, performance, restore rehearsal, and production audit require approved staging evidence |
| 3–12 | PLANNED / NOT STARTED | ทำตามลำดับ/decision gates หลัง Phase ก่อนหน้าผ่าน |

ไม่ใช้ state table นี้แทนสถานะจริงใน task หากผู้ใช้อนุมัติ/เปลี่ยนแผนใหม่ ต้องอัปเดตตามคำตอบล่าสุด.
