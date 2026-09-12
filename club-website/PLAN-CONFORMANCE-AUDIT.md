# ตรวจความครบถ้วนเทียบแผน — 2026-09-12

> อัปเดตล่าสุด 2026-09-12: UI ครบ 37 HTML entry points และ Projects/tagging, Positions, OTP, server pagination มี implementation พร้อม local DB/browser evidence แล้ว ดู [UI-AND-FEATURES-ACCEPTANCE.md](UI-AND-FEATURES-ACCEPTANCE.md) เป็นสถานะล่าสุดสำหรับรายการเหล่านี้ รายงานก่อนหน้าด้านล่างเป็นประวัติ; Phase 12/full production acceptance ยังไม่ปิด


> Follow-up implementation: CMS cover preservation (F01 core), Profile portfolio privacy/owner projects (F03 core), Achievement team/year escaping (F04 fields), and PDF realpath/outbound controls (F05) have been patched with 54 passing tests. Tests include handler simulations, not live DB integration; full gallery workflow and acceptance matrices remain pending. Home now has a visible redesign with five-width overflow checks. Findings below remain the audit baseline; this note does not close the remaining phases. See latest CONTROLLED-CHANGELOG.md entry.

## ข้อสรุป

**ยังไม่ครบตาม CONTROLLED-DEVELOPMENT-PLAN.md และยังปิด Phase 12 ไม่ได้** ไม่ใช่เหลือเพียงทดสอบ browser/performance: มี implementation ที่ขาดและ bug ที่ยังอยู่ใน Phase ก่อนหน้า รายงาน COMPLETE เดิมใน handoff/changelog ไม่ถือเป็นหลักฐานตรวจรับ ให้ใช้รายงานนี้ประกอบและแก้สถานะก่อนส่งมอบ

ขอบเขตรอบนี้: อ่าน master prompt, แผน, handoff, QA matrix, changelog และ source ของ feature หลัก เทียบกับ acceptance criteria; รัน npm test ใหม่ผ่าน 46/46 ไม่รัน migration/เปลี่ยนข้อมูล และไม่อ้างว่าตรวจหน้าจอครบทุกหน้าในรอบนี้ ผล Docker/login/PDF เดิมเป็นหลักฐานจากรอบก่อน ไม่ใช่การรันซ้ำวันนี้ทุกกรณี

## สถานะราย Phase

| Phase | ผลเทียบแผน | สิ่งที่ทำแล้ว / สิ่งที่ยังต้องปิด |
| --- | --- | --- |
| 0 Audit | มีเอกสาร baseline | ต้อง refresh findings/สถานะตาม source ปัจจุบัน; source audit ไม่เท่ากับ full functional QA |
| 1 Developer guide | ส่วนเอกสารมีแล้ว | มีแผน/architecture/inventory; Developer Guide comments สำหรับ feature ใหม่ยังไม่ครบชุดที่แผนระบุ |
| 2 Images | PARTIAL — implementation หลักมี | มี sharp decode/limits/random names/partial cleanup; ยังไม่มีหลักฐาน save→reload, mixed batch, orientation, responsive preview และ Protected Card comparison ครบ; GIF ถูกปฏิเสธทุก image endpoint ต้องระบุผลต่อ Feed ให้ชัดตาม D01 |
| 3 Positions | PARTIAL | มี catalog API และ selector ใน Honor; ไม่พบ UI จัดการ catalog/reorder ตาม use case; honors ยังเรียงด้วย h.display_order ไม่ใช่ catalog order; inactive assignment ยังไม่มี guard ที่เห็นใน write route; featured ยังใช้ regex |
| 4 Projects | INCOMPLETE | มี canonical schema/API/read adapter แต่ legacy CRUD ยังเขียน portfolio_projects; ไม่พบ tagging UI/selector และ frontend consumer ของ involved_projects; ยังไม่ cutover เป็น source เดียว |
| 5 Profile | FOUNDATION / PARTIAL | มีหน้า/API/metadata/posts/relations; projects อ่านเฉพาะ project_members ไม่รวม owner; privacy ของ Portfolio ไม่ถูกนำมาใช้ก่อนคืน summary/skills; activities/awards/edit integrations และ privacy matrix ยังไม่ครบ |
| 6 Registration | PARTIAL | Binding/confirm/minimum password แก้แล้ว; register ไม่มี OTP panel; crypto/hash/atomic OTP/attempts/cooldown และ SMTP failure recovery ยังไม่ครบ; ยังส่ง SMTP ระหว่าง transaction |
| 7 Remove statistics | งานหลักเสร็จ มี smoke เดิม | ยังไม่มีภาพเทียบ viewport ทุกขนาดตาม acceptance |
| 8 Navbar | งานหลักเสร็จ มี smoke เดิม | ยังไม่มี mobile/long-name/keyboard matrix ครบ |
| 9 UI/UX | PARTIAL | เพิ่ม scoped spacing/reduced-motion หลายหน้าแล้ว; ไม่ใช่หลักฐานว่า 320px/200% text/contrast/focus/Protected Cards ผ่านทั้งหมด |
| 10 Functional fixes | FAIL / PARTIAL | CMS image loss ยังเกิดจาก request ของ UI จริง; Achievement escape ไม่ครบ; activity empty/error/date และทุกหน้า matrix ยังไม่ครบ |
| 11 Admin | PARTIAL | Live dashboard/role guards/password policy มีแล้ว; user/member list ยังโหลดทั้งหมดและ paginate client; รายงานเดิมที่บอกจะทำ server pagination ยังไม่มี implementation; optional RBAC/log/export/settings แยก deferred ได้ แต่ไม่ทำให้ required list workflow เสร็จ |
| 12 Release QA | INCOMPLETE | มี 46 tests, HTTP smoke, role negatives, PDF service smoke; ยังขาด successful CRUD fixtures, privacy/data integrity, responsive/a11y, browser versions, performance, restore rehearsal, dependency/release evidence |

## Findings ที่ต้องแก้ก่อนตรวจรับ

### F01 — สูง: CMS แก้ข้อความยังทำรูปอื่นหาย (P10.3)

หลักฐาน: `public/js/admin-cms.js:102,245,253` ส่ง imageUrl เดิมแม้ไม่ได้เลือกไฟล์ใหม่; `src/routes/cmsContent.js:57,233` จึงถือว่า imageProvided=true แล้ว DELETE รูปทั้งชุดและ INSERT รูปแรกกลับหนึ่งรูป

ตัวอย่างจาก control flow: ผลงานมี 3 รูป → เปิด edit → แก้ชื่ออย่างเดียว → request มี imageUrl ของรูปแรก → เหลือ 1 รูป นี่เป็นข้อสรุปจาก source ไม่ได้ทดลองลบข้อมูลจริง ต้องทดสอบด้วย fixture หลายรูปและแก้ API/UI ให้ preserve รายการเดิม รวม explicit remove IDs/ownership ตามแผน

### F02 — สูง: โครงการสอง source ยังไม่ตัดระบบ (P4.2/P4.4)

หลักฐาน: `src/routes/portfolios.js:580,609` ยัง INSERT/DELETE portfolio_projects ขณะที่ projects API ใช้ projects/project_members คนละชุด ไม่พบ frontend อ้าง involved_projects หรือ /api/projects ในการค้นครั้งนี้

ผล: สร้างงานผ่าน Portfolio ไม่ได้กลายเป็น canonical project โดยอัตโนมัติ งานร่วมยังไม่เชื่อมครบ Profile/Portfolio/CV/PDF และ Admin ยังไม่มี workflow tag ผ่าน UI ต้องทำ adapter/mapping/cutover และ fixture A/B/admin ตามแผน

### F03 — สูง: Profile privacy ไม่แยกจาก Portfolio ครบ (P5.2/P5.4)

หลักฐาน: `src/routes/profiles.js` SELECT portfolio.is_public แต่คืน headline/summary/skills โดยไม่ตรวจค่านั้น; default profile ที่ไม่มี metadata เป็น public; GET ใช้ session role โดยไม่ refresh current DB state และ project query เริ่มจาก project_members เท่านั้น

ต้องทดสอบกรณี Profile public + Portfolio private, banned/deleted/stale session และ owner project ที่ไม่ได้ใส่ owner ซ้ำใน member relation ก่อนประกาศว่าข้อมูล private ไม่รั่ว

### F04 — สูง: Achievement hardening ไม่ครบ (P10.5)

หลักฐาน: `public/js/achievement-dynamic.js:67,68` ยัง interpolate team_size/project_year ลง innerHTML โดยไม่ escape; title/description/caption ถูก escape แล้วแต่ไม่ครอบคลุมทุก field จึงยังอ้างปิด XSS ทั้ง renderer ไม่ได้ ต้องใช้ payload ทดสอบ stored HTML และตรวจ carousel controls กับภาพ 0/1/2 รูปด้วย

### F05 — สูง: PDF containment เป็นเพียง lexical path check (P4.1/B15)

หลักฐาน: `src/services/pdfRenderer.js` ใช้ path.resolve/path.relative แต่ไม่ตรวจ realpath/symlink; ยังมี file:// fallback และไม่มี network request allowlist/interception ก่อน setContent

PDF buffer 112,820 bytes พิสูจน์ว่า service สร้าง PDF ได้เท่านั้น ไม่พิสูจน์ API owner/privacy, Thai font, ภาพ, รูปแบบ, symlink/outbound safety หรือผลลัพธ์ทุก template ต้องแยกชื่อผลเป็น PDF service generation smoke

### F06 — สูง: Registration/OTP ยังไม่ครบ (P6.3–P6.5)

หลักฐาน: register.js ซ่อน form หลังสำเร็จและไม่มี verify/resend UI; auth.js ใช้ Math.random สร้าง OTP เก็บ token ตรงใน DB, SELECT แล้ว UPDATE verify แยก, sendMail ก่อน transaction commit; auth limiter ยังครอบ /auth/me ใน routes/index.js

การ login ด้วย seeded is_verified=1 ไม่ได้ทดสอบ Register→OTP→Login ต้องใช้ mail sink และ pending fixtures ตรวจ expiry/resend/reuse/race/session invalidation แยก ขอบเขต CSRF/CSP ที่มี gate ให้บันทึกยังเปิดอยู่ ไม่ถือว่า implement แล้ว

### F07 — กลาง: Positions ordering/leader/management ไม่ตรง acceptance (P3)

หลักฐาน: honors.js ORDER BY h.display_order; honor.js:10 ใช้ Boolean(is_leader) OR legacy regex ทำให้ metadata false ไม่ยับยั้งคำว่า “รองประธาน” ที่ match “ประธาน”; positions มี POST/PUT API แต่ไม่พบหน้าจัดการ catalog หรือ reorder workflow

ต้องแก้ fallback เฉพาะข้อมูลไม่มี metadata, catalog ordering, inactive assignment และให้ admin เพิ่ม/rename/deactivate/order โดยไม่แก้ code

### F08 — กลาง: Phase 11 pagination และ error recovery ยังไม่ทำครบ

หลักฐาน: admin-users.js เรียก /api/admin/users แล้ว filter/slice ทั้งชุด; admin-members.js ทำแบบเดียวกัน; admin-users route GET ไม่มี LIMIT/pagination branch; dashboard.js ไม่มี catch network rejection และ error branch ยังทิ้ง loading stats

ต้องทำ bounded query + stable ordering + legacy compatibility และทดสอบ stale responses/empty page/retry ความสามารถนี้ไม่ต้องอ้างว่าติด migration เสมอไป เพราะใช้ schema เดิมได้

### F09 — กลาง: Activities ไม่ครบ date/empty/failure acceptance (P10.2)

หลักฐาน: renderUpcoming ใช้ new Date()/local midnight ตามเครื่องผู้ชม ไม่กำหนด Asia/Bangkok; fetch render อยู่ในเงื่อนไขข้อมูลไม่ว่าง; catch console.error อย่างเดียว ไม่ใช่ retry/error UI ต้องตรวจ all-day end convention และ cleanup demo เมื่อ API empty ด้วย

### F10 — กลาง: QA seeder collision และ environment guard

scripts/seed-test-accounts.js ป้องกันเฉพาะ NODE_ENV=production ไม่ยืนยัน DB local; ON DUPLICATE KEY UPDATE ทำงานเมื่อชน username หรือ email และแก้ password/role โดยไม่ตรวจว่าเป็นคู่ QA identity เดิม ต้องไม่รันซ้ำกับ target อื่นก่อนเพิ่ม identity collision check และ explicit local opt-in; ไม่มีการเปลี่ยนบัญชีใดใน audit นี้

## คุณภาพหลักฐานทดสอบและเอกสาร

- npm test รอบตรวจนี้ผ่าน 46/46 จริง แต่ Phase 3/4/5/6/10/11 tests หลายข้ออ่าน source แล้ว assert regex ไม่มี HTTP request/DB write/readback จึงไม่พิสูจน์ transaction rollback, preservation หรือ permission ทุก endpoint แผน P10/P12 ระบุชัดว่าห้ามใช้ static assertions แทน behavior tests
- QA-RESULTS ไม่มี console/network capture หรือภาพเทียบที่ยืนยันว่าไม่มี uncaught error/404; AX tree และ HTTP 200 พิสูจน์เพียงบางส่วน ไม่เพียงพอสำหรับ claim ดังกล่าว
- Handoff มี Phase 9 ซ้ำหลายแถว และท้ายตารางยังบอก 3–12 PLANNED/NOT STARTED ขัดกับแถว COMPLETE
- QA-RESULTS ระบุ successful mutation ยังไม่ทำ จึงยังไม่ใช่ full system QA แม้ login/read/negative checks ผ่าน
- ผู้ใช้อนุมัติ Docker local และบัญชี QA แล้ว: CRUD ด้วย fixture, responsive, performance และ restore ลงฐานแยกไม่ควรถูกบอกว่าต้องรอ staging URL โดยอัตโนมัติ; browser ที่ไม่มีให้ระบุ unavailable ตามจริง
- ไม่คำนวณเปอร์เซ็นต์ความสำเร็จ เพราะ acceptance แต่ละข้อมีน้ำหนักต่างกัน และยังไม่มีผลครบทุกหน้า

## ลำดับปิดงานที่เสนอ

1. แก้ CMS preservation + behavior fixture หลายรูป; Profile privacy; Achievement unescaped fields และ PDF resource boundaries
2. ปิด P3 catalog/ordering, P4 canonical adapter/tag UI/renderer, P5 ownership/privacy integrations
3. ปิด P6 OTP/mail/recovery/session cases และ P10 remaining-page matrix
4. ปิด P11 server pagination/recovery โดยแยก optional governance ชัดเจน
5. รัน local disposable successful CRUD และ readback/cleanup, full role/privacy matrix, PDF route+visual, responsive/a11y/performance, backup restore isolated DB และ dependency checks
6. อัปเดต handoff/release checklist จากผลจริง แล้วจึงตรวจรับ Phase 12; ไม่มี Phase 13 ในแผนเดิม

รอบตรวจนี้เพิ่มรายงานและหมายเหตุสถานะเท่านั้น ไม่แก้ runtime/source behavior หรือ DB เพื่อกลบ findings
