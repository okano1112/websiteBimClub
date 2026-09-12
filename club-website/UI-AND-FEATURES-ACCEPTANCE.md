# UI และฟังก์ชันที่ปิดช่องว่าง — 2026-09-12

เอกสารนี้เป็นสถานะล่าสุดของคำขอ UI ทุกหน้า + Projects/tagging, Positions, OTP และ pagination ใช้แทนข้อค้นพบที่ระบุว่ายังไม่มี implementation ของรายการเหล่านี้ใน audit เดิม ไม่ได้ปิด Phase 12 หรือรับรอง production readiness

## สิ่งที่เปลี่ยน

| ส่วน | ผลลัพธ์ |
| --- | --- |
| UI 37 HTML entry points | ใช้ `public/css/apple-ui.css` ร่วมกัน: navigation ขาว, พื้นเทาอ่อน, typography/spacing, controls และ focus; hero หน้า public, About story, auth, workspace, document toolbars; คง card markup เดิม |
| Public document mobile | `document-viewer-fit.js` ย่อ iframe ตามความกว้างกระดาษเดิม โดยไม่แก้ CSS กระดาษหรือ PDF geometry |
| Positions | หน้า `admin-positions.html`: เพิ่ม/แก้ชื่อ TH/EN, ลำดับเลข, leader flag, active flag; Honor เรียง catalog order, รองรับผู้นำหลายคน, ไม่ให้ assign ตำแหน่ง inactive ใหม่แต่แก้ historical row ที่ใช้ตำแหน่งเดิมได้ |
| Projects/tagging | หน้า `admin-projects.html`: ค้นหา/แบ่งหน้า/แก้/เผยแพร่; Admin-only tagging ผ่าน bounded selector, debounce/abort, keyboard, remove และ role in project; owner/admin write guard, owner excluded from collaborators, active-account/duplicate checks |
| Canonical cutover | New writes ใช้ `projects`; ตาราง `portfolio_projects` เก็บเป็น archive; legacy POST/DELETE ใช้ `project_legacy_links`, คืน legacy `id` และ `canonical_project_id` แยกกัน; `portfolio.projects` owned-only, `involved_projects` แยก แล้วรวมใน renderer; private tagged work ไม่เผยต่อ collaborator |
| CV | Standard/Letter/ATS เดิมไม่ได้ render Projects แม้ได้รับ payload จึงเพิ่ม text entries โดยใช้ typography เดิม; CV ทั้ง 5 template แสดง Projects และเคารพ hiddenSections |
| OTP | crypto code 6 หลัก, email-bound SHA-256 digest, อายุ 10 นาที, 5 attempts/code, 60 วินาที resend cooldown, IP auth POST limiter, atomic one-use verification; commit บัญชีก่อนส่งเมล, delivery failure กลับมาขอรหัสได้; panel/refresh/paste/error/loading; login resolve verification email หลังตรวจ password สำเร็จ |
| Admin pagination | Users/Members ใช้ server `q,role,status,page,limit,sort`, limit cap 100, stable ID tie-break, clamped page/empty result, scope members ไม่รวม admin; request ไม่มี query คง legacy array contract; stale responses ไม่ทับผลใหม่ |

เมนูระบบของ Admin มี **Projects** และ **Positions** แล้ว การเพิ่มผลงานของสมาชิกทำใน Portfolio > ผลงานและโครงการเด่น และเลือกเผยแพร่รายผลงานได้

## ฐานข้อมูล local

- ตรวจพบ Docker database ที่แอปใช้งานจริงไม่มี `positions` และ honors links จึงใช้ `controlled-p03-alumni-positions.sql` หลังยืนยัน schema ที่ขาด ไม่มีการลบหรือจับคู่ประวัติบุคคลโดยเดา
- เพิ่ม `verify_attempts`, `verify_sent_at` ตาม `controlled-p06-otp.sql`
- ตั้ง AUTO_INCREMENT บน legacy mapping ตาม `controlled-p04-project-cutover.sql`
- ตรวจ/backfill legacy projects ที่ยังไม่มี mapping ใน transaction: **0 แถวที่ขาด** ในฐานนี้ จึงไม่มีข้อมูลเดิมถูกสร้างซ้ำ
- Production ไม่ได้ถูกแก้ไข และไม่มี deploy/commit/dependency install จากงานชุดนี้

สำหรับฐานอื่น: backup ตามแผนเดิม → ตรวจ schema → ใช้ P3 ถ้ายังไม่มี → P4 schema/backfill → P4 cutover → P6 OTP ก่อน deploy routes ชุดนี้ ห้ามย้อน code ไปเขียนตาราง legacy โดยตรง เพราะผลงานใหม่อยู่ canonical แล้ว; เก็บ additive schema และ mapping ไว้ในการ rollback และทดสอบ reverse adapter ก่อนถ้าจำเป็น

## หลักฐานทดสอบ

- `npm test`: **56/56 ผ่าน**; รวม OTP digest policy และ Projects visibility ใน CV ทุก template มีทั้ง unit/behavior และ static tests เดิม จึงไม่ใช้เลขรวมแทน E2E
- `scripts/qa/gaps-integration.cjs`: **55 HTTP/route checks ผ่าน** กับ MariaDB local จริงและ in-memory mailer; มี fixture roles, page boundaries/filters, IDs สองชุดที่ต่างกันจริง, denied mutations, private/collaborator visibility, inactive Positions, OTP failure/cooldown/wrong/expired/reused/concurrent verify, verified login และ duplicate registration
- Public CV PDF route ของผู้ร่วมงาน: HTTP 200, `%PDF-`, **111,137 bytes**; PDF fixture อยู่ใน `output/playwright/apple-ui-final/tagged-cv-test.pdf` เป็น smoke ไม่ใช่ full pagination/print acceptance
- `scripts/qa/gaps-browser.cjs`: Chromium, temporary accounts, real UI login/Positions create-edit-deactivate/Projects edit-publish/keyboard tagging/server pagination; guest Profile + Portfolio + CV แสดงงานที่แท็ก (ตรวจ iframe จริง); OTP panel/refresh/success ใช้ HTTP responses จำลองเพื่อไม่ส่งเมลจริง; ตรวจ 320px และไม่มี uncaught page errors
- Browser sweep: **37 entry points × 390/1440px = 74 visits**, styled shell ทุกปลายทาง, ไม่มี outer-document horizontal overflow หรือ pageerror; Team และ admin-activity/achievement เป็น redirect เดิม; request-instructor ถูกตรวจเพิ่มเติมด้วย member เพราะ Admin ถูก redirect ตามสิทธิ์
- Sweep ของ profile/document ที่ไม่มี ID ตรวจ empty states; populated tagged-user pages มีการทดสอบแยกข้างต้น ส่วน course ที่ไม่มี ID ยังไม่ได้แทน full enrolled-course workflow
- Honor carousel และ admin tables มี intentional internal scrolling ไม่นับเป็น outer-page overflow
- ภาพและผล sweep: `output/playwright/apple-ui-final/` โดยเฉพาะ `results-complete.json`, `about-390.png`, `positions-workflow-mobile.png`, `tagging-workflow-mobile.png`, `pagination-workflow-mobile.png`, `otp-panel-mobile.png`, `cv-public-populated-mobile.png`
- QA scripts ใช้ opt-in `BIMCLUB_QA_LOCAL=1` และห้าม production; ทดสอบผ่าน real routes/DB โดยสร้าง fixture แล้วลบเฉพาะ fixture ใน finally ไม่ส่งอีเมลออกภายนอก

## ข้อจำกัดที่ยังไม่อ้างว่าผ่าน

- ยังไม่ได้ส่ง OTP ผ่าน SMTP จริงหรือยืนยัน inbox delivery; ทดสอบ mail-success/failure ด้วย mailer จำลอง ข้อความ failure/recovery มี implementation แล้ว
- ไม่ใช่ full Safari/Firefox/Edge, 200% zoom, contrast audit, concurrency/load/performance, restore rehearsal หรือ production readiness
- ประเด็นอื่นใน audit เช่น gallery manager ทั้งชุด, seed identity collision hardening และ acceptance matrices ที่ไม่เกี่ยวกับคำขอรอบนี้ยังต้องติดตามต่อ ไม่ได้ปิดอัตโนมัติเพราะ UI/4 workflows นี้ผ่าน
