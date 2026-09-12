# BIM Club — แผนลงมือทำครบ Phase 1–12

วันที่อ้างอิง: 2026-09-10 · สถานะ: แผนสำหรับตรวจรับและส่งต่อ ยังไม่ใช่การอนุมัติ implementation ทุก Phase

## 0. อ่านก่อนใช้แผน

คำขอล่าสุดอนุมัติให้วางแผนล่วงหน้าทุก Phase เพื่อเปลี่ยนไปใช้โมเดลอื่น ผู้ใช้ยังไม่ได้ยกเลิก Phase gate ใน Master Development Prompt ดังนั้นการเตรียมแผนครบไม่ใช่สิทธิ์เริ่มแก้ทุกระบบพร้อมกัน

- ทำตาม `AUDIT → PLAN → CONFIRM → IMPLEMENT → TEST → REPORT → CONFIRM NEXT PHASE`.
- Phase 0 ตรวจ source แล้ว; Phase 1 ที่อนุมัติเป็นเอกสาร/คู่มือนักพัฒนา ยังไม่ได้อนุมัติ runtime refactor.
- ข้อเสนอในเอกสารนี้เป็น **proposed** จนกว่าจะมีคำตอบบันทึกใน [decision log](DEVELOPMENT-HANDOFF.md#decision-log).
- ชื่อไฟล์ใหม่ทั้งหมดที่มีคำว่า “เสนอสร้าง” ยังไม่มีใน runtime; อย่าอ้างว่า feature เหล่านั้นทำแล้ว.
- Path ในเอกสารนี้อ้างจาก `club-website/` เว้นแต่ระบุ `../assets/` หรือ repository root.
- เลข `phase*.sql` เดิมเป็นประวัติอีกชุด ไม่ตรงกับ Phase ในแผนนี้ ห้ามใช้เลข Phase อย่างเดียวตัดสินว่า migration รันแล้ว.
- แผนเก่า `UI-UX-REFACTOR-PLAN.md`, `KONG-MIGRATION-PLAN.md`, `../PORTFOLIO_CV_REDESIGN_PLAN.md` เป็นบริบทเดิม ไม่อนุญาตให้เปลี่ยน framework หรือ Protected Cards.
- อ่านคู่กับ [คู่มือส่งต่อ](DEVELOPMENT-HANDOFF.md), [รายการทุกหน้าและ QA](PAGE-INVENTORY-AND-QA.md), [Architecture](ARCHITECTURE.md) และ `AGENTS.md`.

## 1. สถานะจริงและเงื่อนไขที่ต้องรักษา

Stack: Express 5/CommonJS, static HTML/CSS/JavaScript, MySQL driver `mysql2`, MariaDB 10.11 ใน Compose, bcrypt, MySQL session store, Nodemailer, Multer, Puppeteer. Frontend ไม่มี build step ใน package scripts.

| แหล่งข้อมูลปัจจุบัน | ผู้ใช้ข้อมูล | ข้อจำกัดที่ตรวจพบ |
| --- | --- | --- |
| `users` | Auth, Settings, Admin, Portfolio, Posts, Courses | `role` หมายถึงสิทธิ์ user/instructor/admin ไม่ใช่ตำแหน่งชมรม |
| `honors` | Alumni/Hall of Fame, Admin Honor | มี position เป็นข้อความ, year/generation/order; ยังไม่มี FK ไป users |
| `team_members` | About Personnel, Admin Personnel | แยกจาก honors; role เป็นข้อความ; generation ปี 2024 ถูกคำนวณพิเศษใน public route |
| `portfolio_projects` → `portfolios` → `users` | Portfolio/CV | โครงการเป็นของ portfolio หนึ่งรายการ ยังไม่มี collaborator |
| `achievements` + `achievement_images` | Club Highlights/CMS | หลายรูปได้ แต่ CMS edit ปัจจุบันแทนรูปทั้งชุดด้วยรูปเดียว |
| `posts` + images/comments/likes | Home, Feed, Member Works, Admin | เป็น social post ไม่ใช่ project record |
| `activities` | Cards, Calendar, Timeline, CMS | `start_date/end_date` อยู่ใน migration แยก แต่ไม่อยู่ใน CREATE TABLE หลัก |
| `courses` และตารางคำถาม/attempts/certificates | Course player, Admin, Portfolio/CV | ต้องรักษาคะแนน/สิทธิ์/ใบรับรองระหว่างแก้ Profile |

Baseline วันที่ตรวจ: `node --test` ผ่าน 23 tests; syntax check ผ่าน JavaScript runtime 58 ไฟล์ใน Phase 0. นี่ไม่ใช่ live DB/browser coverage. Working tree มีงานเดิมจำนวนมาก ต้องเทียบกับ pre-task snapshot ไม่ใช่ถือว่า diff จาก HEAD ทั้งหมดเป็นของงานนี้.

### Protected Components

| ชุดที่ต้องคงเดิม | จุดสร้าง/สไตล์ |
| --- | --- |
| Home activity cards/Swiper | `public/index.html`, `public/css/main.css` และ stylesheet ที่หน้านั้นโหลด |
| Activity cards | `public/js/activity-dynamic.js`, `public/page/activity.html`, `public/css/activity.css` |
| Alumni featured/regular/compact cards และ carousel | `public/js/honor.js`, `public/css/honor.css` |
| Achievement cards/3D modal | `public/js/achievement-dynamic.js`, `public/page/achievement.html`, `public/css/achievement.css` |
| Feed post/comment cards | `public/js/feed.js`, `public/css/feed.css` |
| Course cards/editor cards | `public/js/courses.js`, `public/js/manage-courses.js`, `public/js/course-player.js`, `public/css/courses.css` |
| Portfolio/CV templates, preview และ public cards | `public/js/portfolio-templates.js`, `public/js/portfolio.js`, `public/js/cv.js`, `public/page/portfolio-public.html`, `public/page/cv-public.html`, CSS portfolio/cv ทั้งชุด |
| Personnel/Admin/form cards ที่มีอยู่ | `public/page/about.html`, `public/css/about.css`, `public/css/admin.css`, HTML/JS ของแต่ละฟอร์ม |

รายการนี้เป็นตัวช่วยค้นหา ไม่ใช่ข้อยกเว้นให้แก้การ์ดที่ตกหล่น: **การ์ดเดิมทุกใบอยู่ในขอบเขตป้องกัน**. ห้ามเปลี่ยน structure/CSS/animation/hover/type/image ratio/border/shadow/responsive เพื่อทำ feature ใหม่. Bug ที่เกี่ยวข้องต้องแสดง evidence และขอ scope เฉพาะ; เมื่อแก้การอ่านข้อมูลให้รักษา markup เดิมและเปรียบเทียบภาพ.

### ข้อผิดพลาดเดิมที่ต้องไม่ถูกลืม

| ID | หลักฐาน/สาเหตุ | แผนจัดการ |
| --- | --- | --- |
| B01 | `register.html` ไม่โหลด `register.js`; ID ไม่ตรง; ไม่มี OTP UI | P6.1–P6.3 |
| B02 | Honor preview สูงอย่างเดียว, `.d-none !important` ขัดกับ inline display; `.profile-img-preview` ไม่มี style | P2.1 |
| B03 | อ้าง `assets/img/default-avatar.png` แต่ไม่มีไฟล์; honor onerror อาจวนซ้ำ | P2.1 |
| B04 | Upload เชื่อ MIME/นามสกุลจาก client; ยังไม่ตรวจ bytes/pixel dimensions | P2.2 |
| B05 | `ensurePhase8Columns()` มี DDL ระหว่าง GET/ensurePortfolio | P4.1 ก่อน integration และ migration |
| B06 | `schema.sql` มี DROP/seed; date columns ของ activities ไม่ครบเทียบ route | P10 activity/database setup; ห้ามใช้ schema ทับ DB เดิม |
| B07 | `cmsContent.js` PUT achievement ลบ image rows ทั้งชุด | P10 CMS safety; ห้ามลอง edit ข้อมูลจริงก่อนแก้ |
| B08 | Personnel form ไม่ส่งรูป/สถานะ/nickname; update default อาจล้างค่า/เปิดเผยแพร่ | P10 personnel safety |
| B09 | `honor.js` หา president จาก regex ชื่อตำแหน่ง | P3.3 ใช้ sort_order + metadata |
| B10 | Home href `../public/page/achievement.html` ผิด static root | P10 Home |
| B11 | `achievement.css` มี `.card-` ค้าง; content renderer ใช้ HTML interpolation กับข้อมูลบาง field โดยไม่ escape | P10 Achievement; ขอ exception เฉพาะ bug ของ protected renderer |
| B12 | `renderUpcoming()` เลือกรายการที่มีวันที่ 5 รายการแรก ไม่เทียบอนาคต | P10 Activities |
| B13 | Dashboard/Reports/System Settings ยังเป็น MOCKUP | P11; ต้องคง label จนเชื่อม backend สำเร็จ |
| B14 | ไม่มี CSP ที่ app (ตั้ง false), ไม่พบ CSRF token/origin middleware; password policy 6/8 ไม่ตรงกัน | P6 security; CSP แยกจาก UI regression, ไม่เปิด strict CSP โดยไม่ตรวจ inline scripts |
| B15 | PDF renderer ประกอบ local path จาก URL โดยไม่ตรวจ containment และเปิด Chromium รับ resource URLs | P4.1/P5.3 ตรวจ path, URL, outbound requests ก่อนเพิ่มช่องรับสื่อ |

Security entries เป็น source findings; exploit และ deployment configuration ยังไม่ได้ยืนยัน ห้ามสร้างข้อความว่า production ถูกโจมตีแล้ว. หากต้องเร่งแก้ก่อน Phase ที่กำหนด ให้เสนอ hotfix ที่แยก feature และรออนุมัติการเปลี่ยนลำดับ.

## 2. Decision gates และข้อเสนอหลัก

ไม่จำเป็นต้องถามทั้งหมดในคราวเดียว ให้ถามเฉพาะก่อนเริ่มส่วนที่พึ่งคำตอบ ขณะรอสามารถเตรียม read-only evidence ได้.

| Gate | ต้องตัดสินใจก่อน | ข้อเสนอเริ่มต้น (ยังไม่อนุมัติ) | ผลกระทบ/ทางเลือก |
| --- | --- | --- | --- |
| D01 | P2 upload pipeline | **อนุมัติแล้ว: A** — รูป profile JPG/PNG/WebP, 5 MiB, ไม่เพิ่ม crop UI ในรอบแรก, ใช้ `sharp` ตรวจ bytes/decode และ 20MP | GIF ของ Feed ไม่ผ่าน image endpoint ตาม scope A; ต้องตัดสินใจแยกหากต้องการคง GIF |
| D02 | P3 data model | **อนุมัติแล้ว:** คนหนึ่งคนมีหนึ่งตำแหน่งต่อปี; ตำแหน่งเดียวกันมีหลายคนได้; เพิ่ม position catalog และ nullable `position_id/user_id` ใน honors | หากเปลี่ยน cardinality ภายหลังต้องทำ migration แยก |
| D03 | P3 year/link | เก็บปี ค.ศ. เป็นค่ามาตรฐานใหม่; generation แยก; Admin เชื่อมบัญชีด้วย ID | ข้อมูลเก่าที่เป็นข้อความยังคงไว้; ห้ามจับคู่ชื่ออัตโนมัติ |
| D04 | P4 project model | canonical projects + project_members; migrate portfolio projects ก่อน; achievements/posts ยังแยก | ต้องยืนยันว่าจะรวม Club Highlights เป็น Project หรือแค่ลิงก์ไป Project |
| D05 | P4 tagging/privacy | Admin เป็นผู้ tag; owner ยังคงแก้เนื้อหา; collaborator ดูงานที่เผยแพร่และถอดตัวเองได้เมื่ออนุมัติ | ถ้าต้องยินยอมก่อนแสดง เพิ่ม pending/accepted flow; ไม่แอบเพิ่ม notification |
| D06 | P5 Profile | หน้าใหม่ /page/profile.html?userId=…; ข้อมูลติดต่อไม่เผยแพร่โดยปริยาย | ต้องยืนยัน public fields, Member/Alumni type, profile visibility และ activity participation |
| D07 | P6 Register | **อนุมัติตามข้อเสนอ:** คง username/fullName/email contract; เพิ่ม confirm password; minimum password 8 ตัวอักษร; phone/type ยัง optional | ยืนยัน OTP ก่อน login ต่อไป |
| D08 | P8 Navbar | **อนุมัติตามคำแนะนำ:** `[LOGO] BimClub`; ใช้ link เดียวครอบแบรนด์ | คง Home href และเมนูเดิม |
| D09 | P9 ทุกหน้า | เลือก concept ก่อนแก้หน้านั้น; A Editorial, B Section-led, C Community | ไม่มีอนุมัติแบบเหมารวม และไม่เปลี่ยน card |
| D10 | P11 Admin | ใช้ role เดิม; เปลี่ยน dashboard metric เป็นจริงก่อน | granular RBAC, audit log, soft-delete content, CMS เว็บไซต์ ต้องอนุมัติแยก |
| D11 | ก่อน DB test/migration | DB ทดสอบแยกชื่อ/volume, ไม่มีข้อมูลจริง, mail sink | ไม่ใช้ `.env` หรือ DB production อัตโนมัติ; ระบุ target/backup/restore |
| D12 | ก่อน publish | ปิด/แทน demo seed และ bootstrap admin ด้วยวิธีที่ผู้ใช้อนุมัติ | ไม่ลบข้อมูลเก่าหรือ rotate credential ของระบบจริงเอง |

## 3. กติกา migration ที่ใช้ทุก Phase

1. แสดง current schema จาก source และยืนยัน metadata ของ DB เป้าหมายเมื่อได้รับสิทธิ์; แยก source schema ออกจาก deployed schema.
2. สร้าง draft ชื่อ `database/controlled-pNN-description.sql` หลังอนุมัติ scope; ห้ามชน migration เดิม. แสดง proposed schema, mappings, indexes, FK และผลกับ query/response.
3. ตรวจ snapshot/backup และทดลอง restore บน DB แยกก่อน. อย่ารัน `schema.sql` เพื่อ “แก้ missing column”.
4. Additive ก่อน: nullable columns/ตารางใหม่, backfill แบบ deterministic, unique source ID mapping, ตรวจ count/NULL/orphans/duplicate ก่อนสลับการอ่าน.
5. DDL ของ MySQL/MariaDB อาจ implicit commit: ไม่อ้างว่า transaction เดียว rollback DDL ได้ทั้งหมด; แยก DDL กับ transactional DML.
6. รัน migration ซ้ำต้องไม่ duplicate; อย่าใช้ชื่อคนหรือชื่อ project เป็น dedup key.
7. Compatibility ต้องครอบคลุม old URL, IDs, JSON aliases และ owner checks. ระบุ cutover และหลีกเลี่ยง dual write ที่ไม่มีจุดยุติ.
8. Rollback default: ย้อน code ของ feature และเก็บ additive data ไว้. หลังมีข้อมูลใหม่ ห้าม DROP เพื่อ rollback; ทำ restore/export เฉพาะ target ที่อนุมัติ.
9. ห้ามแก้ schema จาก request handler. Migration เรียกโดย operator แยกจาก API.

## 4. Phase 1 — Developer guide และ refactor ที่จำเป็น

**สถานะ:** งานเอกสารอนุมัติแล้ว; runtime refactor ยังต้องเสนอแยก.

**ไฟล์:** `ARCHITECTURE.md` (เพิ่มคำอธิบายสถานะจริง รักษาประวัติ), เอกสารแผน/คู่มือ/QA/changelog ชุดนี้. ไม่ย้าย source files.

**วิธีทำ:**

- P1.1 ทำแผนที่หน้า → JS → API → data และ asset URL mapping; แยกของจริง/Mockup/สิ่งที่เสนอ.
- P1.2 บันทึก Protected Components, pre-existing dirty tree, known bugs และ test gaps.
- P1.3 ให้ทุก feature ใหม่มี Developer Guide comment: Purpose, Modify here, Data source, Images, Dependencies, Do not modify, How to add. เพิ่มเมื่อแตะไฟล์ใน Phase ของมัน ไม่เปิดทุกไฟล์มาเพิ่ม comment ตอนนี้.
- P1.4 Refactor backlog ที่แนะนำ: แยก validation/upload service ใน P2; position query/controller ใน P3; canonical project query ใน P4; auth validation ใน P6; CMS shared data access ใน P10. ไม่สร้าง generic framework หรือยุบ helper ที่ชื่อเหมือนแต่ semantics ต่างกัน.
- P1.5 ไฟล์ที่ยาว เช่น `portfolio.js`, `portfolio-templates.js`, `courses.js` ไม่แยกเพียงเพราะยาว ให้เปลี่ยนเฉพาะ use case ที่มี tests รองรับ.

**ผ่านเมื่อ:** ทุก Phase มี files/steps/gates/tests/rollback; inventory ครบ 34 HTML เดิม; links เอกสารถูกต้อง; baseline tests ผ่าน; runtime hash ไม่เปลี่ยน.

**Before → After:** ความรู้กระจายในเอกสาร/โค้ด → มีจุดเริ่มต้นและ work packets ที่ตรวจรับได้. **Rollback:** ย้อนเฉพาะเอกสารที่เพิ่มในงานนี้ ไม่คืน ARCHITECTURE ทั้งไฟล์จาก HEAD เพราะมีงานเดิม.

## 5. Phase 2 — Profile image system

**ก่อนเริ่ม:** ยืนยัน D01 และ scope preview/upload; บันทึกภาพ Admin Honor/Settings/Alumni/Feed/Course ด้วย test fixtures ที่ไม่มีข้อมูลส่วนบุคคล.

**แก้:** `public/page/admin-honor.html`, `public/js/admin-honor.js`, `public/css/admin.css`, `public/js/settings.js`, `public/css/settings.css` เฉพาะที่จำเป็น, `src/routes/upload.js`, `middleware/errorHandler.js`. `public/js/honor.js` เฉพาะ fallback bug ที่อนุมัติ. เสนอสร้าง `src/services/imageUpload.js`, `test/upload.test.js`; ถ้าใช้ shared browser helper ให้เสนอ `public/js/image-preview.js` และโหลดก่อน consumer.

**P2.1 Preview/fallback**

1. แยก thumbnail ตารางกับ form preview; ตั้ง class เฉพาะ `.admin-profile-preview`/`.admin-profile-thumbnail` กำหนด width/height หรือ aspect ratio 1:1, overflow hidden, img cover/center. Settings มีกรอบ 84×84 อยู่แล้ว ให้ reuse.
2. เลิกผสม `d-none` กับ `style.display`: ใช้ hidden หรือ class toggle แบบเดียวทั้ง reset/select/edit. ไม่แก้ global `.d-none`.
3. รูปไม่ถูกขยายตาม natural size ของไฟล์; ข้อความ/ปุ่มรอบรูปยัง reflow ที่ 320px.
4. fallback เป็น initials/neutral placeholder ใน DOM หรือ asset ใหม่ที่อนุมัติ; error handler ทำงานครั้งเดียวและไม่ตั้ง src ไปไฟล์ที่ไม่มีซ้ำ. แก้ missing default avatar ตรง consumer ที่จำเป็นโดยคงขนาดการ์ด.
5. Select → local preview → confirm/save → upload → persist URL; cancel ไม่แก้ DB. จัดการ object URL revoke เมื่อเปลี่ยน/ยกเลิกและป้องกัน selection race.

**P2.2 Upload validation**

1. คง `POST /api/upload`, `/images`, `/cms`, `/video`, field `images`, response `{success, urls}` และ auth middleware เดิม. Profile mode เพิ่มแบบ optional เท่านั้นและต้องตรวจ server-side.
2. ตรวจ bytes ด้วย decoder, MIME, extension consistency, byte size, pixel dimensions ก่อนย้ายไฟล์เข้า public uploads. ข้อเสนอ 5 MiB/ภาพ, ไม่เกิน 20 megapixels; ต้องยืนยันข้อจำกัดและ dependency ก่อนติดตั้ง. ตรวจจริงตาม capabilities ของ decoder ไม่ใช้ `accept` หรือ signature เพียงอย่างเดียวอ้างว่าปลอดภัยครบ.
3. สร้างชื่อด้วย crypto random ID และ extension จากชนิดที่ตรวจแล้ว; staging อยู่นอก public root; cleanup rejected/partial batch. Server reject HTML/SVG ที่ปลอม MIME, corrupt images, path separators, double extension และภาพ decompression ขนาดเกิน.
4. Photo output normalize orientation; ถ้า re-encode เก็บหลักการรักษาคุณภาพ/metadata ให้ชัด. ห้าม crop รูปจริงถ้ายังไม่อนุมัติ crop UI.
5. Profile ไม่รับ GIF ตามข้อเสนอ แต่ Feed เดิมรองรับ GIF: คงเส้นทางเดิมหรือแสดงผลกระทบก่อนเปลี่ยน. ไม่เปลี่ยน video pipeline โดยแฝงใน image fix.
6. ใช้ HTTP 400/413/415 ที่เหมาะสม พร้อม error message; client ตรวจ response.ok, loading/failure, retry; ไม่แสดง success หลัง upload ล้มเหลว.
7. การเปลี่ยนรูปห้ามลบไฟล์เก่าทันที เพราะอาจถูกใช้ร่วมกัน; file lifecycle/ownership ที่ต้องมีตารางให้เสนอ migration ก่อน.

**ผ่านเมื่อ:** ภาพ portrait/landscape/square แสดงกรอบเท่ากัน; broken/empty image ไม่ error loop; Save→reload คงรูป; cancel คงของเดิม; invalid files ไม่ถูกเสิร์ฟ; guest upload 401, non-admin CMS 403; Feed GIF และ Course upload ที่ไม่ได้เปลี่ยนยังทำงาน.

**ทดสอบ:** `test/upload.test.js` เป็น proposed test; binary fixtures ใช้ข้อมูลทดสอบ; ทดสอบหลายไฟล์รวม valid+invalid และ cleanup, size boundary, rotated JPEG, WebP, duplicate clicks. Browser ที่ 320/390/768/1440; Protected Card screenshot comparison.

**Rollback:** ย้อน UI patch ได้แยกจาก upload hardening; ไม่แนะนำย้อนเปิดรับไฟล์อันตราย ให้แก้เฉพาะ regression โดยคง validation; เก็บไฟล์เดิมทั้งหมด. **DB:** ไม่จำเป็นสำหรับ preview; metadata/ownership table ต้องผ่าน gate ใหม่.

## 6. Phase 3 — Alumni positions

**ก่อนเริ่ม:** D02/D03; แสดง roster model และตัวอย่างปีหลายรุ่น; D02 อนุมัติแล้วตามกติกาหนึ่งตำแหน่งต่อคนต่อปี.

**แก้:** `src/routes/honors.js`, `src/routes/index.js`, `public/js/admin-honor.js`, `public/page/admin-honor.html`, `public/js/honor.js` เฉพาะ data selection. เสนอสร้าง `src/routes/positions.js`, `src/models/position.model.js`, `public/page/admin-positions.html`, `public/js/admin-positions.js`, migration `controlled-p03-alumni-positions.sql`, `test/positions.test.js`.

**Proposed schema (เมื่อยืนยันหนึ่งตำแหน่งต่อ roster entry):**

- `positions`: id PK, position_name_th VARCHAR(150), position_name_en VARCHAR(150) nullable, sort_order INT, is_leader BOOLEAN, active BOOLEAN, timestamps.
- เพิ่ม `honors.position_id` nullable FK→positions; `honors.user_id` nullable FK→users ON DELETE SET NULL; เก็บ position string/year/generation/display_order เดิมเพื่อ compatibility และข้อมูลที่ยังไม่ map.
- ไม่สร้าง users ให้ศิษย์เก่าอัตโนมัติ; person ที่ไม่มีบัญชียังอยู่ได้. ถ้าต้องหลายตำแหน่งต่อ roster row ใช้ assignment table หลังอนุมัติ schema ใหม่ ไม่เก็บ comma-separated IDs.
- `users.role` ไม่เปลี่ยน และ `team_members.role` ไม่ถูกย้ายเงียบ ๆ; สิทธิ์บัญชีและตำแหน่งแต่ละ domain แยกความหมาย.

**P3.1 Catalog:** Admin เพิ่ม/แก้/เปิดปิด positions; sort_order เป็นหลัก, id tie-breaker; ป้องกันลบ position ที่ถูกใช้อยู่ด้วย deactivate. Rename ทำให้ display อัปเดตจาก JOIN ไม่ copy label ไปทุก record.

**P3.2 Assignment:** Admin selector ค้นหาตำแหน่ง/บัญชี; assign position/year/generation ให้ honors ผ่าน ID; active=false ห้าม assign ใหม่ แต่ประวัติยังอ่านได้. Map legacy label หลังผู้ใช้รับรอง mapping เท่านั้น; unmatched คง legacy text และแสดงในรายการต้องตรวจ.

**P3.3 Display:** API JOIN คืน `position` label ให้ client เก่าและเพิ่ม `position_id/sort_order/is_leader`; ORDER ภายในปีด้วย catalog sort_order แล้ว honors.display_order/id. Client เลือก featured จาก is_leader metadata หลังเรียงแล้ว ไม่ใช้ regex ชื่อ; กรณี leader หลายคนให้ใช้คำตอบเรื่องจำนวน featured ก่อนแก้. คงโครงสร้าง renderCard/renderFeatured/CSS.

**P3.4 Reorder:** เริ่มปุ่มขึ้น/ลงหรือช่องลำดับ; drag & drop เป็น optional พร้อม keyboard alternative. เสนอ `PUT /api/positions/order` รับ orderedIds, ตรวจ set ไม่มีซ้ำ/หลุด, transaction; route ต้องอยู่ก่อน `/:id`.

**ผ่านเมื่อ:** เพิ่มตำแหน่งใหม่โดยไม่แก้ code, rename/assign/reorder persist, ผู้นำอยู่ลำดับที่กำหนด, ปี/รุ่นเก่าไม่หาย, unlinked alumni อ่านได้, active=false ไม่ทำให้ประวัติหาย. ผู้ใช้ทั่วไปแก้ไม่ได้.

**ทดสอบ:** proposed `test/positions.test.js`: 401/403, invalid FK, inactive assignment, same sort tie, partial reorder, atomic rollback, ไม่ให้ text “รองประธาน” ถูกเลือกด้วย regex. UI screenshot เดิมยังตรง.

**Rollback:** คง legacy columns จนผ่าน migration audit; export mapping ก่อนสลับอ่าน. ถ้าย้อน client รุ่นเก่า อาจเห็น legacy label เก่า ให้บอกข้อจำกัดนี้และใช้ compatibility API ต่อจนตัดสินใจ ไม่ dual-write แบบไม่มีกำหนด.

## 7. Phase 4 — Project collaborator tagging

**ก่อนเริ่ม:** D04/D05/D11 **อนุมัติตามข้อเสนอแนะแล้ว**: เริ่มจาก `portfolio_projects`, แยก achievements/posts, Admin เป็นผู้ tag, งานเผยแพร่เท่านั้นที่ collaborator เห็น, และใช้ฐานข้อมูลทดสอบแยก.

**แก้:** `src/routes/portfolios.js`, `src/routes/index.js`, `public/js/portfolio.js`, `public/page/portfolio.html`; เพิ่ม read integration ใน `public/js/cv.js`, public portfolio/CV HTML และ payload builder โดยคง templates. เสนอสร้าง `src/routes/projects.js`, `src/models/project.model.js`, `src/services/project.service.js`, `public/page/admin-projects.html`, `public/js/admin-projects.js`, `public/js/member-selector.js`, `test/project-collaborators.test.js`, `database/controlled-p04-project-collaborators.sql`.

**P4.1 Prerequisite safety (ยืนยันใน scope P4):**

- ย้าย `ensurePhase8Columns` ออกจาก request path ไป migration; missing schema ต้องแจ้ง setup error ที่ชัดเจน. GET ไม่ ALTER/INSERT โดยแฝง; `ensurePortfolio` creation ย้ายไป register/provision explicit flow หลังตรวจผู้ใช้เก่า.
- PDF resource resolution: normalize/decode URL, enforce resolved path อยู่ใต้ allowed directory รวม symlink checks; ปฏิเสธ traversal/file URLs. จำกัด network resources ด้วย allowlist; test ใช้ temporary fixture/sentinel ไม่อ่าน secrets. Validate CSS theme values และ URL scheme ก่อน renderer; escape HTML ไม่เท่ากับ URL/CSS validation.
- หากต้องเปลี่ยน public PDF export policy/rate limit ให้เสนอผลต่อผู้ใช้เดิมและตรวจ ownership/public visibility.

**Proposed schema:**

| ตาราง | Fields / invariants |
| --- | --- |
| `projects` | id PK, owner_user_id FK users, title, description, image_url, project_url, is_public default false, deleted_at nullable, created_at, updated_at |
| `project_members` | project_id FK, user_id FK, role_in_project nullable, added_by FK, created_at; PK(project_id,user_id); index(user_id,project_id) |
| `project_legacy_links` | legacy_portfolio_project_id PK/AUTO_INCREMENT, project_id UNIQUE; insert legacy IDs เดิมตรงตัวก่อน แล้วตั้ง sequence สูงกว่า MAX เดิมสำหรับรายการใหม่; เก็บ mapping แบบ deterministic ไม่ผูกชื่อ |

Owner ไม่ต้องอยู่ใน project_members ซ้ำ; query รวม owner OR member แล้ว deduplicate by canonical project ID. User deletion ใช้ soft-delete เดิม; ห้ามตั้ง cascade ที่ทำให้ project หายเพียงเพราะ contributor หาย.

**P4.2 Migration/cutover:**

1. อ่าน legacy rows บน test DB, map owner จาก portfolio.user_id; visibility เริ่มจาก portfolio.is_public แต่ต้องอนุมัติการตีความ visibility ก่อน.
2. Backfill หนึ่ง canonical project ต่อ legacy id โดย unique mapping; count และ field equality ทุก record; ไม่ dedup ชื่อที่เหมือนกันโดยอัตโนมัติ.
3. Legacy endpoints `/api/portfolios/me/projects` ต้องเป็น adapter เขียน canonical source หลัง cutover; คง response `project.id` สำหรับ consumer เก่าด้วย mapping และเพิ่ม `canonical_project_id` อย่างชัดเจน. โครงการใหม่ผ่าน legacy adapter ต้องมี stable legacy-compatible ID ด้วย ไม่ใช้เลขจากตารางคนละชุดปนกัน.
4. หลังตัดระบบให้ legacy table เป็น snapshot/archive ไม่ใช่ source ที่อัปเดตคู่ตลอดไป. ห้ามลบทิ้งจน migration/rollback ผ่าน.
5. Response เดิม `portfolio.projects` คงงานที่เป็นเจ้าของเพื่อไม่ให้ปุ่ม delete เก่าไปลบงานที่ถูก tag. เพิ่ม `involved_projects` แยก; client ใหม่แสดงรายการร่วมและ renderer payload รวมงานเผยแพร่โดย canonical ID. ทุก update/delete ฝั่ง server ต้องใช้ owner guard.

**P4.3 New API contract (proposed):**

- `GET /api/projects?memberId=…&page=1&limit=20`: public เห็นเฉพาะเผยแพร่และไม่ deleted; pagination stable `(created_at,id)`, limit cap 50.
- `GET /api/projects/:id`: visibility guard; private ที่ไม่มีสิทธิ์ 404; อย่าเปิดผ่าน old adapter.
- `POST /api/projects`, `PUT /api/projects/:id`: owner/admin ตามสิทธิ์ที่อนุมัติ; ไม่มี userId จาก body มาทับ owner.
- `DELETE /api/projects/:id`: owner/admin เท่านั้น, soft-delete ตาม schema ที่อนุมัติ; ลบจาก public/Profile/Portfolio queries โดยไม่ลบ relation/ไฟล์ร่วมทันที. Legacy DELETE adapter ต้องใช้ guard และ canonical target เดียวกัน; restore endpoint เพิ่มเมื่อ workflow ได้รับอนุมัติ.
- `PUT /api/projects/:id/collaborators`: Admin-only ตาม brief, `{members:[{userId,roleInProject}]}`; validate IDs/active accounts/duplicates/bounds ก่อน transaction แทน relation set ทั้งชุด; ไม่ copy project record.
- `GET /api/admin/users/search?q=…&page=…&limit=…`: Admin-only, parameterized query, limit cap 20; คืน id/display name/avatar/ข้อมูลแยกบุคคลที่จำเป็น ไม่คืน password/token/recovery data.
- ถ้าสมาชิกมีสิทธิ์ tag ภายหลัง ให้สร้าง search ที่ลดข้อมูลและตรวจสิทธิ์ต่างหาก ไม่เปิด Admin API ให้สมาชิก.

New endpoints ใช้ envelope `{success:true, project}` หรือ `{success:true, projects, pagination:{page,limit,total}}`; mutation failure `{success:false,message}` พร้อม HTTP status 400 invalid input, 401 unauthenticated, 403 forbidden action, 404 missing/private, 409 conflict. Legacy envelopes/status ไม่เปลี่ยนตามชุดใหม่โดยไม่ตรวจ contract. จัด static paths (`/me`, `/search`) ก่อน `/:id` และตรวจ positive integer IDs ทุกจุด.

**P4.4 Selector:** debounce ~250ms, AbortController ป้องกัน stale response, loading/empty/error, chips remove, keyboard arrow/Enter/Escape, aria combobox/listbox, ป้องกันเลือกซ้ำ. server เป็นคนตัดสิน valid member.

**ผ่านเมื่อ:** Tag B ในงานของ A → B เห็นงานร่วมจาก relation เดียว; เอา B ออก → หาย; เปลี่ยนชื่อ B → แสดงชื่อใหม่; count project ไม่เพิ่มเมื่อ tag; private project ไม่รั่วใน Profile/Portfolio/API/PDF; legacy owned project CRUD ยังใช้ IDs เดิม.

**ทดสอบ:** proposed integration tests seed A/B/admin/guest/disabled user, duplicate tagging idempotence, invalid member causes no partial write, concurrent edits (version/updated_at conflict ถ้าจำเป็น), remove tag, malicious IDs, pagination และ query ที่ไม่เพิ่มทีละสมาชิกแบบ N+1. PDF/template tests เดิมต้องผ่าน.

**Rollback:** มี mapping export และ reverse projection ของงาน canonical ใหม่ไป legacy format ก่อนย้อน reader; ห้าม drop canonical rows ที่มีงานใหม่. Legacy app แสดง collaborator ไม่ได้ ให้ระบุเป็น limitation และเก็บ relation ไว้จน forward fix.

## 8. Phase 5 — New Profile page

**ก่อนเริ่ม:** D06; เลือก UX 2–3 concepts ก่อนสร้าง; P3/P4 พร้อมและผ่าน tests. ต้องอนุมัติ activity participation/visibility schema ก่อนเพิ่ม tab ที่ต้องใช้ข้อมูลนั้น.

**เสนอสร้าง:** `public/page/profile.html`, `public/js/profile.js`, `public/css/profile.css`, `src/routes/profiles.js`, `src/models/profile.model.js`, `src/services/profile.service.js`, `test/profiles.test.js`, `database/controlled-p05-profiles.sql`. **แก้:** routes index, `public/js/auth.js` เพิ่มลิงก์หน้าใหม่, Settings/account controller/model เฉพาะ field ที่อนุมัติ, Posts filter หรือ reuse query, Portfolio payload integration.

**Data ownership:**

- `users` เป็น source ชื่อ/avatar/contact; `portfolios` เป็น source summary/about และ skills ที่มีอยู่แล้ว. หน้า Profile เรียก service เดียวกัน ไม่สร้างสำเนา summary/skills อีกชุด.
- เสนอ `member_profiles(user_id PK/FK, cover_url, department, program, member_type, graduation_year, generation, is_public, timestamps)` เฉพาะ field ที่ไม่มี source เดิมและได้รับอนุมัติ. ถ้า year/generation ผูกบทบาทรายปีให้แสดงจาก honors; field graduation เป็นคนละความหมาย ต้องไม่สับสน.
- Projects อ่าน owner+project_members จาก P4; Posts อ่าน posts.author_id; Achievements ใช้ใบรับรองระบบ/manual awards ที่มีใน portfolio.extra_sections ไม่แต่ง achievement ใหม่.
- Activities tab: ต้องมี relation ที่พิสูจน์การเข้าร่วม. เสนอ `activity_members(activity_id,user_id,status,added_by,created_at)` หลังยืนยันว่า Admin หรือสมาชิกบันทึก/ยืนยัน ห้ามถือว่าเห็นกิจกรรมเท่ากับเข้าร่วม. หากยังไม่อนุมัติ ให้แสดงข้อจำกัดในรายงานและอย่าอ้างว่า Phase 5 ครบทุก feature.

**P5.1 Layout:** Cover → avatar/name → position/year/program → owner Edit → About/Projects/Portfolio/Activities/Posts/Achievements. ใช้ namespace `.member-profile-*`; ปุ่ม/การ์ดใหม่ไม่ใช้ selector ที่ไปทับ Alumni cards; mobile tab wrap/scroll ที่เข้าถึงได้.

**P5.2 API:** เสนอ `GET /api/profiles/:userId` คืนเฉพาะ allowlisted public fields; owner/admin ได้ private fields ผ่าน authenticated route ที่ตรวจ current DB state. `PUT /api/profiles/me` แก้ของตน; `PUT /api/profiles/:userId` Admin-only. Validate length/type/URL และไม่รับ role/is_verified/owner_id จาก profile body. public guest ไม่ได้ email/phone/recoveryPhone โดยปริยาย.

**P5.3 Editing:** ใช้ upload ที่ผ่าน P2 สำหรับ cover/avatar; existing Settings และ Profile ต้องเรียก update service ร่วมเพื่อไม่ให้ค่าทับกัน. Cover ratio ต่างจาก avatar; crop/reposition ต้องมีปุ่ม confirm/reset ถ้าอนุมัติ. เพิ่ม project/post ผ่าน APIs เดิมที่ถูกต้อง; เมื่อเพิ่มจาก Profile ต้อง persist และ reload ได้. ใช้ parameterized author filtering ของ posts ไม่โหลดทั้งระบบมา filter client.

**P5.4 Permissions:** owner แก้ได้, Admin แก้ข้อมูลที่อนุมัติทั้งหมด, collaborator tag ไม่ได้สิทธิ์แก้ Profile/Project, instructor ไม่ได้สิทธิ์ Admin โดยปริยาย. Profile privacy, Portfolio privacy และ Project privacy เป็นคนละ gate; service ต้อง filter ที่ server และ PDF ด้วย. ไม่ใช้การซ่อน tab เป็น authorization.

**ผ่านเมื่อ:** guest/owner/other/admin เห็นและแก้ข้อมูลตาม matrix, refresh คงค่า, XSS payload แสดงเป็นข้อความ, malformed userId 400/404, empty/error/loading ครบ, project ที่ untag/private หายตามสิทธิ์, กิจกรรม/โพสต์/รางวัลอ้าง source จริง, Alumni cards คงเดิม.

**ทดสอบ:** proposed `test/profiles.test.js` รวม cross-user PUT, mass assignment, public field leak, privacy combinations, ban/delete หลัง session ถูกสร้าง, no duplicate project. Browser keyboard/mobile/long Thai name, broken cover, upload failure และ Save retry.

**Rollback:** ถอนลิงก์หน้าใหม่และย้อน service changes ของ Phase นี้; เก็บ profile table/ข้อมูลใหม่, ไม่ย้อน shared user data ไป snapshot เก่าโดยไม่อนุมัติ.

## 9. Phase 6 — Registration and account security

**ก่อนเริ่ม:** D07/D11; ยืนยัน password policy, phone/member type, OTP expiry/retry; ใช้ SMTP test sink ไม่ส่งอีเมลจริงระหว่าง tests.

**แก้:** `public/page/register.html`, `public/js/register.js`, `public/page/login.html`, `public/js/login.js`, `public/page/forget.html`, `public/page/reset-password.html`, `public/css/auth-layout.css`, `src/routes/auth.js`, `src/routes/index.js`, `src/controllers/account.controller.js`, `src/models/user.model.js`, `src/routes/admin-users.js` (password policy เท่านั้น), `config/mailer.js` เฉพาะแยกส่ง mail. เสนอสร้าง `src/services/registration.service.js`, `src/utils/accountValidation.js`, `test/registration.test.js`, `test/account-security.test.js`; migration ถ้าต้องเพิ่ม OTP attempts/version hash.

**P6.1 Form binding:** เลือก ID ชุด `regUsername/regEmail/regFullName/regPassword` จาก HTML เป็นหลัก; ทำ JS ให้ตรง แล้วโหลด register.js หลัง DOM. error IDs ใช้ `registerError/registerSuccess`; เพิ่ม confirm password และ show/hide, labels for/id, autocomplete, field errors ผ่าน aria-describedby/live region. form submit ต้อง preventDefault, disable ระหว่างส่งและคืนสถานะใน finally.

**P6.2 Register API:** คง `{username,email,password,fullName}`; validate type ก่อน `.length`, trim names/email, ขอบเขต length ตรง DB, email normalization ต้องยืนยัน case/uniqueness ไม่แก้ email เก่าเงียบ ๆ. bcrypt cost เดิม 12; policy เดียวทุก register/reset/change/admin reset. ข้อเสนอ minimum 8 + reject input เกิน byte limit ที่ bcrypt ใช้ เพื่อไม่ truncate เงียบ ๆ; tests multibyte password.

**P6.3 OTP:** สร้าง token ด้วย crypto, เก็บ hash + expiry + attempts ตาม migration ที่อนุมัติ; verify atomic/one-use, resend invalidates previous token, cooldown, limit per account+IP. เสนอ OTP panel ใน register page ใช้ `POST /api/auth/verify-otp` และ `/resend-verify`; email ที่ใช้ login แบบ username ต้อง resolve อย่างปลอดภัย ไม่ส่ง username เป็น email โดยเดา. ยืนยันแล้วไป Login จากนั้น Profile; ไม่ยกเลิก is_verified guard เพื่อให้ flow ผ่าน.

**P6.4 Transaction/mail:** getConnection อยู่ใน try/finally, rollback เฉพาะ active transaction, release ครั้งเดียว. User+Portfolio insert เป็น transaction. ไม่ถือ DB transaction ระหว่าง network SMTP; บัญชี pending ที่ commit แล้วส่ง mail ไม่สำเร็จต้องมี resend/recovery UX ไม่รายงานสำเร็จว่าผู้ใช้ได้รับเมล. ถ้าต้อง guaranteed delivery ให้เสนอ outbox table แยก ไม่เพิ่มโดยอัตโนมัติ.

**P6.5 Security:**

- Duplicate username/email ใช้ DB unique constraints รองรับ concurrent requests; คืน error ที่ใช้ได้และไม่เผย stack.
- รักษา session regenerate หลัง login, httpOnly/sameSite/secure ตาม environment, logout destroy+clear cookie. Reset/change password ต้องทดสอบ old session invalidation; ถ้าจะใช้ users.session_version/session lookup ต้องเสนอ migration และ update middleware/session normalization ครบ.
- แยก auth limiter จาก `/auth/me` ที่โหลดทุกหน้า เพื่อไม่ lock navigation จากการเปิดหลาย tab. thresholds เป็น config ที่อนุมัติและทดสอบ.
- ตรวจ CSRF สำหรับ session-backed mutations รวม multipart upload: แนะนำ token endpoint/header และ server validation พร้อม origin checks ตาม trusted APP_URL. เพิ่ม client helper เฉพาะหลัง scope ครบทุก consumer; ไม่ปล่อยช่อง upload เป็นข้อยกเว้นโดยไม่มีเหตุผล.
- Reset token ใช้ crypto, expiry, hash storage, atomic consume และ invalidate หลังใช้/เปลี่ยนรหัส. ไม่ log token/password/SMTP body.
- CSP ต้อง inventory inline handlers/scripts, Swiper/FullCalendar/fonts/PDF preview ก่อน; แยก report-only policy review กับ enforcement. ห้ามปิด UI เพื่อทำให้ CSP test ผ่าน.

ถ้าอนุมัติ CSRF ข้ามระบบ ให้จัด P6.5 เป็น packet ที่เสนอ file list เพิ่มอย่างชัดเจน: `src/app.js`, `src/routes/index.js`, เสนอ `middleware/requireCsrf.js`, `public/js/api-client.js`, และ HTML/JS ที่ส่ง POST/PUT/DELETE ทั้งหมดจาก API inventory (รวม inline reset/forget/public PDF, upload, posts, courses, CMS, team, honors, portfolios และ Admin). โหลด token/client ก่อน consumer และทดสอบทุก write flow; ขอบเขตนี้ยังไม่ใช่ implicit permission ให้แก้ไฟล์นอกรายการ P6 เดิม. หากผู้ใช้ไม่อนุมัติ ให้บันทึก security gap และไม่อ้างว่าปิดประเด็น CSRF แล้ว.

**ผ่านเมื่อ:** Register → pending account+portfolio → OTP verify → login → Profile ทำงานจริง; refresh ไม่หาย; mail failure/resend/expired/wrong/reused OTP มีข้อความตรง; duplicate concurrency ไม่มีบัญชีซ้ำ; password ไม่ plaintext; unauthorized changes fail server-side.

**ทดสอบ:** proposed tests กับ fake mailer + disposable DB, mismatched passwords, empty/invalid types, SQL/XSS payload, leading/trailing whitespace, duplicate email race, max length, OTP expired/reused/concurrent verify, CSRF absent/wrong/cross-origin, rate limit/reset window, secure logout และ stale sessions. Browser mobile keyboard/tab order/loading/retry.

**Rollback:** UI changes แยกจาก credential hardening; เก็บ hash/version migrations; ถ้าระบบเก่าอ่าน token hash ไม่ได้ ใช้ forward fix/resend migration policy ไม่เปลี่ยนกลับเก็บ token อ่อนแอหรือคืน plaintext.

## 10. Phase 7 — Remove statistics instance

**แก้:** `public/page/activity.html` section `.stats-section` ที่มี 20+/150+/10+/5+ และ inline observer เฉพาะสถิติ; `public/css/activity.css` เฉพาะ selectors ที่ไม่มี consumer อื่นหลังค้นทั่ว repo.

**ขั้นตอน:** ค้น class/ข้อความทุกไฟล์ก่อน → บันทึกภาพระยะ section ข้างเคียง → ลบ instance → ลบ observer เฉพาะของมัน (อย่าลบ reveal observer ส่วนอื่น) → ตรวจ spacing และ console. ไม่ลบ Admin metrics หรือเลขที่อยู่ในเนื้อหาคนละส่วน.

**ผ่านเมื่อ:** สถิติ 4 ตัวหายเฉพาะ Activity, ไม่มีช่องว่างค้าง, Swiper/calendar/timeline และการ์ดไม่เปลี่ยน. Static search + browser 320/390/768/1440 เพียงพอ ไม่ต้องสร้าง test ที่ตรวจแค่ว่า string หาย.

**DB:** ไม่มี. **Rollback:** คืน markup/observer/styles จาก pre-phase patch เฉพาะ instance.

## 11. Phase 8 — Navbar brand text

**ก่อนเริ่ม:** แสดง A `BimClub [LOGO]` และ B `[LOGO] BimClub` ที่ขนาด desktop/mobile ให้เลือก; แนะนำ B เพราะเริ่มจาก link/logo wrapper เดิมได้.

**แก้:** `public/js/navbar-component.js`, `public/css/navbar.css` เฉพาะ `.logo`/brand text. คง logo URL และ Home href เดิม; ใช้หนึ่ง link ครอบรูป+ชื่อ ไม่ซ้อน link.

**ขั้นตอน:** ตรวจ flex space ที่ 320/375/390/768/900/1024/1440; reserve width ชื่อ, shrink ที่ wrapper, ไม่ซ่อน menu system/avatar; accessible name ไม่อ่าน BimClub ซ้ำจาก img alt+text; หน้าแรก/หน้า page ใช้ component เดียว.

**ผ่านเมื่อ:** คำ BimClub อยู่ข้าง logo ตามที่เลือก, กดกลับ Home ได้ทุกหน้า, hamburger/dropdown/login/profile/system sidebar ทำงาน, ชื่อผู้ใช้ยาวไม่ดัน navbar ล้น. รูปการ์ดและ typography นอก navbar ไม่เปลี่ยน.

**DB:** ไม่มี. **Rollback:** ย้อน patch สองไฟล์เฉพาะ brand slot.

## 12. Phase 9 — Apple-inspired UX/UI ทีละหน้า

**ก่อนเริ่มแต่ละหน้า:** ส่ง Current Problem, User Goal, Information Hierarchy, Proposed UX/Interaction, Mobile, Accessibility และ concepts A/B/C พร้อมข้อดีข้อเสีย จากนั้นรอคำตอบ. ดูรายหน้าที่ [UI/QA matrix](PAGE-INVENTORY-AND-QA.md).

**Concepts:** A Editorial = ภาพจริง+ตัวอักษร+เรื่องราว เหมาะ public story แต่ใช้พื้นที่มาก; B Section-led = หัวข้อ/กลุ่มงานชัด เหมาะ form/admin แต่มีอารมณ์ชุมชนน้อย; C Community = คนและผลงานนำ เหมาะ Profile/Home แต่ต้องจัด density ให้ดี. ไม่ copy Apple และไม่ยกเลิก Protected Cards.

**P9.1 Shared system:** ตรวจ computed values ก่อนแก้ tokens; `global.css` ใช้ burgundy/Noto Sans Thai เดิม ขณะที่บางหน้าโหลด font อื่น. ใช้ font ที่มีจริงใน target ไม่ติดตั้งเพิ่มตามคำแนะนำ skill โดยไม่ตรวจ. เสนอ scoped new tokens เช่น `--bc-surface/ink/space-*` สำหรับพื้นที่ใหม่ก่อน ไม่เปลี่ยน legacy `--primary-color` ทั้งเว็บโดยอัตโนมัติ.

**P9.2 Pilot:** แนะนำ Activities รอบนอกการ์ด (hero, heading, calendar container, upcoming layout, empty/error). แก้ `public/page/activity.html`, `public/css/activity.css`, JS เฉพาะ interaction ที่อนุมัติ. Logic upcoming/calendar bugs เป็น P10 เว้นแต่ขอรวม scope ชัดเจน.

**P9.3 Expansion order:** About → Home → Achievement → Honor surrounding navigation → Profile → member forms/editor → Admin. แต่ละหน้าต้องผ่าน approval/checkpoint; ไม่แก้ทั้งหมดใน PR เดียว. ไฟล์ target ระบุใน inventory.

**P9.4 Motion:** IntersectionObserver บน section wrapper, opacity/translate ระยะน้อย, CSS transition; content visible ถ้า JS/observer ไม่ทำงาน. reduced-motion ปิด reveal/scroll smooth และ autoplay ที่อนุมัติ; หากต้องเปลี่ยน card animation ต้องขอ exception ก่อน. ไม่มี animation ที่ซ่อนข้อมูลถาวร/หน่วงการกรอก.

**P9.5 Controls:** default/hover/active/focus/disabled/loading สำหรับปุ่ม, error/success ที่ไม่ใช้สีอย่างเดียว, label เชื่อม input; ตาราง/เมนู/dialog ใช้ keyboard. Label wrapping แบบครอบ input ถือเป็น implicit association ที่ถูกต้อง ไม่เปลี่ยนเพราะ scanner ไม่พบ for อย่างเดียว.

**ผ่านเมื่อ:** approved concept ตรงกับภาพจริง, Thai text 200% ไม่ตัด, 320–desktop ไม่ล้น, contrast วัดจริงตาม role (body 4.5:1/large text 3:1), keyboard focus คืนตำแหน่ง, reduced-motion ครบ scope, card screenshots คงเดิม.

**เอกสาร:** update `DESIGN_SYSTEM.md` ด้วยค่าที่ implement จริง ไม่ใส่ proposed เป็น approved. **Rollback:** page-specific patches ก่อน shared tokens; ห้ามคืนทั้ง CSS ไฟล์จาก HEAD.

## 13. Phase 10 — Page-by-page functional audit และแก้ bug ที่อนุมัติ

**ก่อนเริ่ม:** refresh inventory เปรียบเทียบกับ 34 หน้าเดิม + หน้าใหม่ P3–P5; เปิดทีละหน้า, ใช้ fixtures เดียวกับ baseline, รายงาน 2–3 คำถามเฉพาะหน้าจาก matrix หลังพบ evidence จริง. คำถามใน matrix เป็นร่างล่วงหน้า ไม่ใช่ผล browser audit.

**P10.1 Home/link:** แก้ B10 ไป `/page/achievement.html` หรือ relative path ที่ตรง deployment; ตรวจ footer/navbar links/anchors ทุกหน้า โดย URL อ้างจาก static root ไม่ใช่ filesystem.

**P10.2 Activities:**

- ตรวจ `start_date/end_date` ใน target DB; additive migration และ clean-install definition ให้ตรง route หลังอนุมัติ DB. รักษา display `event_date` ที่เป็นข้อความเดิม.
- แก้ upcoming ให้ใช้ valid date เปรียบเทียบวันนี้ Asia/Bangkok และ sort ascending; ongoing/ไม่มีวันที่ต้องถามนิยามก่อน ห้าม Date.parse ข้อความไทยแบบเดา.
- date-only ไม่แปลง UTC จนเลื่อนวัน; ตรวจ end_date inclusive ของข้อมูลเทียบ FullCalendar all-day exclusive end ก่อนปรับ.
- empty API result ต้องล้าง static/demo cards และแสดง empty state; API failure แสดง retry ไม่ค้างเป็นข้อมูลตัวอย่าง; ตรวจ Swiper destroy/init ซ้ำ.

**P10.3 CMS loss prevention:** `src/routes/cmsContent.js`, `public/js/admin-cms.js`, `public/page/admin-cms.html`.

- อ่านรูปทั้งหมดเมื่อ edit; request ที่ไม่ส่งรายการรูปต้องคงเดิม. explicit remove/replace ใช้ field ใหม่ที่อนุมัติและ validate IDs belong to achievement.
- Transaction insert/update/order/remove เฉพาะรูปที่เลือก; update title อย่างเดียวต้องไม่ลด image row count. อย่าลบไฟล์บน disk เพราะการลบ row.
- จัด data-access shared กับ `activities.js/achievements.js` หลังเขียน contract tests สองทางเข้า; preserve fields และ status เดิม ไม่ลบ endpoint เก่า.

**P10.4 Personnel loss prevention:** `src/routes/team.js`, `public/js/admin-personnel.js`, `public/page/admin-personnel.html`.

- แยก create defaults จาก update; load existing row แล้วเปลี่ยนเฉพาะ field ที่ส่งมา; omitted nickname/profile/is_published คงเดิม, explicit null จึง clear เมื่อได้รับอนุญาต.
- เพิ่ม loading/finally/error handling และ response.ok ก่อนแสดง “ลบแล้ว”; fields กับ sort/year ต้องตรงกัน public/admin.
- ยืนยัน generation rule: เลิก hard-code ปี 2024 เมื่อมี source รุ่นที่อนุมัติ แต่ไม่แต่งรุ่นคนอื่น; test unedited fields preserved.

**P10.5 Achievement renderer:** อนุมัติ exception สำหรับ B11 ก่อน; escape text/use DOM textContent, validate media URL scheme, null description ไม่เรียก substring จนพัง; CSS `.card-` แก้เฉพาะ selector ที่ผิดโดยไม่ redesign. Test stored HTML payload ใน test DB เท่านั้น.

**P10.6 Remaining pages:** course player/editor permissions/answers/certificates, PDF preview/public/owner, feed/comment/delete, auth, redirects, modals, search/filter/upload; ตาม matrix ทุกแถว. พบ bug ใหม่จัด work packet และ approval ตามผลกระทบ ไม่เหมารวมว่าการ audit อนุญาต rewrite.

**ผ่านเมื่อ:** ทุกหน้าได้ status PASS/FAIL/BLOCKED พร้อม evidence, ก่อน→หลังของ bug แต่ละข้อ, ข้อจำกัด browser/DB ระบุ, ไม่มี mock ที่อ้างว่าใช้งานจริง. Tests เพิ่มเมื่อพิสูจน์ behavior/permission/data preservation ไม่ใช้ regex source แทน behavior tests.

**Rollback:** แยก patch ต่อหน้า/bug; migration ใช้กติกาส่วน 3; โดยเฉพาะรูปที่ถูกลบก่อนหน้านี้ต้อง recovery จาก backup ที่มีจริง ไม่อ้างว่ากู้ได้จากโค้ดใหม่.

## 14. Phase 11 — Admin experience

**ก่อนเริ่ม:** D10/D12; ให้ผู้ใช้เลือกประโยชน์ที่จะ implement. แนะนำ real dashboard + จัดเมนู + search/filter/sort/pagination ก่อน granular roles/logs.

**Files:** `public/js/system-sidebar-component.js`, `public/page/admin-dashboard.html`, `public/js/admin-dashboard.js`, `public/js/admin-members.js`, `public/js/admin-users.js`, `src/routes/admin-users.js`, `public/css/admin.css`; หน้า Admin แต่ละ domain ตาม packet. เสนอสร้าง `src/routes/admin-dashboard.js`, `src/services/adminDashboard.service.js`, `test/admin-dashboard.test.js`; `/api/admin/dashboard` admin-only.

**IA proposed:** Content (Activities/Projects/Portfolio links/Highlights), People (Members/Alumni/Personnel/Positions), Learning (Courses/Instructor Requests), Account (Users/Permissions), Website (เฉพาะส่วนที่มี CRUD จริง). อย่าเพิ่ม Hero/Navigation/Pages menu ที่ไม่มี backend แล้วใช้ alert แทน.

**P11.1 Real metrics:** ใช้ query จาก domain เดียว; pending instructor requests ≠ pending memberships. new registrations ใช้ created_at ช่วงเวลาที่ระบุ; incomplete profiles ต้องประกาศ required-field definition; “broken images” ต้องตรวจจริงแบบ bounded job ไม่ fetch arbitrary URL ทุกครั้ง; recent admin changes ต้องมี audit log ที่อนุมัติจึงแสดง. ลบ MOCKUP badge ของแต่ละ widget หลัง integration ผ่านเท่านั้น.

**P11.2 Lists:** server-side pagination/filter/sort หลังข้อมูลมาก; เสนอ query `q,role,status,page,limit,sort` limit cap 100 และ allowlist sort columns. คง `users` response array ที่ consumer เดิมใช้; ถ้าคำขอไม่ส่ง pagination ต้องรักษา legacy behavior หรือทำ versioned route ที่ตกลงแล้ว. `admin-members.js` ไม่โหลดทุกคนแล้ว paginate client เมื่อเปิดใช้ API ใหม่; ไม่ให้ role/type/position คนละความหมายปนกัน.

**P11.3 Safe delete:** users มี soft-delete/restore อยู่แล้วให้ reuse; content ต้องเสนอ deleted_at/filter/restore cascade policy ก่อนเพิ่ม. Confirm แสดงผลต่อ Project/Profile/Portfolio/tag; cancel ไม่เขียน; delete error ต้องไม่แสดง success; ลบ entity ไม่ใช่ลบ shared uploaded file.

**P11.4 Optional RBAC:** คง enum role เดิมเป็น default. ถ้าอนุมัติ Super/Content/Member/Editor ให้เพิ่ม role-permission model พร้อม migration/backfill admin เดิม/last-admin guard และตรวจทุก API; UI menu visibility ไม่แทน server guard. Test matrix deny-by-default และการเปลี่ยน role มีผลกับ session เดิม.

**P11.5 Optional audit log:** ถ้าอนุมัติ เสนอ `admin_audit_events(id,actor_id,action,entity_type,entity_id,before_json,after_json,created_at)` บันทึกใน transaction เดียวกับ mutation; redact password/token/PII ที่ไม่จำเป็น, จำกัดผู้ดู/retention, ป้องกัน user เขียน audit event เอง. ไม่ใส่ historical events ปลอมเพื่อให้ dashboard มีข้อมูล.

**P11.6 Reports/Settings:** ทำ real exports ที่อนุมัติ (CSV escape formula injection และ permission) หรือคง MOCKUP/ซ่อนทางเข้าตามคำตอบ. System Settings ต้องมี allowlisted config fields, validation และ persistence จริง; ห้ามเปิดแก้ secrets/DB config ผ่านฟอร์มเดิมโดยอัตโนมัติ.

**ผ่านเมื่อ:** ผู้ดูแลทำ use case ที่เลือกครบโดยไม่แก้ code; metrics ตรง query definition, sorting/pagination stable, CRUD failure มี recovery, role guard ครบ. Optional features ที่ไม่อนุมัติระบุ deferred ไม่อ้างว่าทำแล้ว.

**Rollback:** ย้อนแต่ละ module/menu; เก็บ log/additive schema, ไม่ย้อน roles จนทำให้ lockout; มีบัญชีทดสอบ admin recovery ที่ได้รับอนุมัติ ไม่ใช้ seed credentials เป็นทางออก.

## 15. Phase 12 — Full system QA / Release readiness

**ก่อนเริ่ม:** required functionality ทุก Phase ต้อง complete และ decisions ไม่มี blocker; รวบรวม baseline/after evidence จากแต่ละ packet ไม่เริ่ม QA ใหม่จากศูนย์.

1. **Functional:** guest/member/collaborator/owner/instructor/admin; register/OTP/reset/login/logout; upload/preview/save; positions; tagging/profile; all CRUD; feeds; courses/quizzes/certs; Portfolio/CV public/private/PDF.
2. **Regression/data:** counts/IDs/source mappings/FKs ก่อนและหลัง migration; protected card screenshots; old deep links/redirects/API keys; existing account/course assets; missing optional fields/null/long Thai names.
3. **Responsive:** 320,375,390,768,1024,1440 px และ desktop ที่ผู้ใช้ใช้; viewport heights 700/800; overflow, menus, modal scroll, forms, table scrolling, 200% text zoom.
4. **Browsers:** Chrome, Safari, Edge, Firefox ถ้ามี; Playwright WebKit ไม่เท่ากับ Safari จริง, Chromium ไม่ใช่หลักฐานว่า Edge จริงผ่าน. ระบุ version และ unavailable ไม่ติดป้าย PASS.
5. **A11y:** keyboard-only, focus visible/restore/trap เมื่อ modal, semantics, labels explicit หรือ implicit ที่ถูกต้อง, contrast measured, alt, aria error/live, reduced motion, touch target.
6. **Performance:** วัด pages จริงพร้อม dataset/viewport/cache state; image dimensions/lazy-loading, requests, JS/CSS costs, API query count, pagination, PDF concurrency. ภาพ hero ปัจจุบันราว 700KB เป็น candidate ไม่ใช่เหตุให้บีบอัดทุก asset โดยไม่ตรวจภาพ.
7. **Security:** spoofed uploads/path traversal/URL injection/XSS/SQL parameters/CSRF/session invalidation/IDOR/mass assignment/rate limiting; scoped security tests ใน environment ทดสอบเท่านั้น.
8. **Console/network:** แยก error เดิม, error ใหม่, expected 401 สำหรับ guest `/auth/me`, expected 4xx ใน negative tests, external CDN failure. ไม่มี uncaught error/asset 404/broken image/failed request ที่เกิดจาก patch ใหม่ใน happy paths; ห้ามซ่อน console เพื่อลดตัวเลข.
9. **Dependencies/deploy:** ตรวจ lockfile กับ manifest และ runtime import จริง (root multer 2 ต่างจาก app multer 1); audit dependency ณ วัน implement ด้วยแหล่งปัจจุบันก่อนเสนอ upgrade. ไม่มี framework/build script ใหม่. Docker start/health/PDF fonts ทดสอบเฉพาะ target ที่อนุมัติ.
10. **Release:** ไม่ deploy อัตโนมัติ. ส่ง build/runtime instructions, migration order, verified backup/restore, known issues, rollback และขออนุมัติ publish แยก.

**เสนอสร้าง:** `QA-RESULTS.md` เมื่อมีผลจริง (ไม่สร้าง PASS ล่วงหน้า), test files ของ feature ตามด้านบน, fixtures และภาพใน output ที่ไม่ปนข้อมูลส่วนบุคคล.

**ผ่านเมื่อ:** required cases ผ่านพร้อมหลักฐานและไม่มี required blocker; optional deferred ได้รับการยอมรับ; ไม่มี claim ว่า test ผ่านเพียงเพราะ syntax หรือ static assertion ผ่าน. **Rollback:** เป็น per-feature release rollback ที่ซ้อมแล้วและรักษาข้อมูลใหม่; ห้าม reset repository/DB ทั้งชุด.

## 16. รูปแบบ work packet และรายงานทุก Phase

แต่ละ packet ต้องเล็กพอให้จบตรวจได้ในหนึ่งงาน เช่น P2.1 preview และ P2.2 upload แยก review แต่ยังเป็น Phase 2. ไม่เริ่ม Phase ใหม่เพียงเพราะโมเดลมี context เหลือ.

```text
PACKET ID / PHASE:
USER APPROVAL / DECISION IDs:
PROBLEM + SOURCE EVIDENCE:
EXACT FILES TO EDIT / CREATE:
BEHAVIOR BEFORE → AFTER:
IMPLEMENTATION STEPS:
API / DATA / PERMISSION INVARIANTS:
ACCEPTANCE CASES (input → expected result):
TEST COMMANDS / ENVIRONMENT:
ACTUAL RESULT / EVIDENCE PATH:
FILES MODIFIED / CREATED / DELETED:
DATABASE CHANGES:
UX / SECURITY / REGRESSION CHECK:
KNOWN ISSUES / BLOCKERS:
ROLLBACK:
NEXT PACKET / NEXT PHASE (not started):
```

บันทึกคำตอบผู้ใช้ให้ตรงความหมาย, tests failure ห้ามเปลี่ยน expected เพื่อให้ผ่านโดยไม่พิสูจน์ bug, งานที่ติด DB/browser ให้ status BLOCKED/PARTIAL พร้อมเหตุผลจริง. จบ Phase ใช้ checkpoint ตาม Master Prompt และรอคำตอบก่อนต่อ.
