# 1. Product Readiness

**READY FOR LIMITED PILOT** — เพียงพอสำหรับกลุ่มนักศึกษาขนาดเล็กที่มีผู้ดูแลและบัญชีพร้อมใช้งาน ยังไม่ใช่การรับรอง production ทั้งระบบ

- **REQUIRED BEFORE PILOT:** แก้ Portfolio/Preview/Save/Public/PDF และจัดประเภทบุคลากรให้ถูกต้อง (แก้ในรอบนี้); ก่อนนำขึ้นเครื่องอื่นต้องใช้ migration ที่เกี่ยวข้องและตรวจข้อมูลปลายทาง ก่อนเปิดสมัครด้วยตนเองต้องยืนยันการส่ง OTP เข้า inbox จริง และก่อนใช้ข้อมูลจริงต้องมี backup/restore ที่ตรวจสอบได้
- **RECOMMENDED SOON:** ทดลองงานจริงกับนักศึกษาและ Instructor กลุ่มเล็ก เก็บปัญหาการกรอก/ดาวน์โหลด; ตรวจ Safari และอุปกรณ์ที่กลุ่มทดลองใช้จริง
- **NOT NECESSARY YET:** เพิ่ม chat, notifications, AI, gamification หรือ analytics เพื่อให้เปิด pilot ได้

รายการปัจจุบันมีสมาชิก/บทบาทและ Admin, community/posts, courses, activities, achievements, personnel/alumni, projects, Portfolio/CV, public portfolio, PDF และ uploads แล้ว การประเมินความครบของฟีเจอร์อ้างอิง source/เอกสารสถานะเดิม (`DEVELOPMENT-HANDOFF.md`, `UI-AND-FEATURES-ACCEPTANCE.md`); ไม่ได้นำผลทดสอบเก่าของระบบอื่นมาอ้างว่าเพิ่งทดสอบผ่าน

# 2. Portfolio Root Causes

- Event input เรียก renderer แต่ไม่ได้เก็บค่าปัจจุบันเข้าร่าง จึงอ่าน `portfolioData` เก่า; สลับหมวดทิ้งค่า และบางปุ่มบันทึกทันทีขณะที่บางปุ่มไม่บันทึก
- `fullName` ถูกอ่านแต่ไม่ส่งไป users/profile; phone ไม่ถูกบันทึก
- Editor, Public และ PDF มี mapping แยกกัน ทั้ง alias และ settings ต่างกัน; PDF อ่านฐานข้อมูลก่อนข้อมูลร่างถูกบันทึก
- บางแม่แบบเลือก headline หรือ targetRole เพียงอย่างเดียว ข้าม objective/เว็บไซต์/รูปภาพ/ลิงก์ใบรับรอง และชื่อหมวด visibility ไม่ตรงกัน
- กระดาษล็อกความสูงและ `overflow:hidden` ตัดเนื้อหายาว; PDF ไม่รองรับ SVG โลโก้เดิมตามนโยบาย raster ที่มีอยู่
- ช่องประสบการณ์ส่ง `YYYY-MM` ไป SQL DATE โดยไม่เติมวัน ทำให้ Save ล้มเหลว

# 3. Portfolio Changes

**Input → `syncFormDraftToState` → local draft → Preview (debounce 200 ms).** การเพิ่ม/ลบรายการ การเปลี่ยนหมวด และ settings อยู่ในร่างจนกด Save; การอัปโหลดส่งไฟล์ครั้งเดียว ไม่ส่งคำขอบันทึกต่ออักษร

**Save → existing profile API + collection APIs + Portfolio API → DB → shared `PortfolioModel.documentPayload` → reload/public/PDF.** ชื่อ โทรศัพท์และ avatar อยู่ใน users; เนื้อหา/settings อยู่ใน portfolios และตารางรายการเดิม ปุ่มดาวน์โหลดบันทึกให้สำเร็จก่อนสร้าง PDF ถ้า API ล้มเหลวจะแจ้งบันทึกไม่ครบและเก็บร่างไว้ให้ลองใหม่ โดยเก็บ ID รายการที่สร้างสำเร็จเพื่อไม่สร้างซ้ำ

ไฟล์เปลี่ยน (relative to `club-website/`):

| กลุ่ม | ไฟล์และหน้าที่ |
|---|---|
| State/mapping | `public/js/portfolio-model.js` (ใหม่), `portfolio.js`: ร่าง, mapping, Save, retry, upload guard, settings Preview |
| Render/PDF | `public/js/portfolio-templates.js`, `src/services/pdfRenderer.js`: fields ครบ, visibility, pagination, fonts; `../assets/img/logobranding/soe-logo.png` เป็น raster จาก SVG เดิม |
| Shared consumers | `public/js/cv.js`, `public/page/portfolio.html`, `portfolio-public.html`, `cv.html`, `cv-public.html`, `src/routes/portfolios.js` |
| Alumni | `src/routes/team.js`, `src/services/alumniTransfer.js` (ใหม่), `database/targeted-personnel-alumni.sql` (ใหม่), `public/js/admin-personnel.js`, `public/page/admin-personnel.html`, `about.html` |
| QA | `test/portfolio-model.test.js`, `scripts/qa/targeted-portfolio.cjs`, `targeted-pdf.cjs`, `validate-targeted-pdfs.py`, `transfer-alumni.cjs` (ใหม่) |

# 4. Portfolio Test Results

| ข้อมูล/พฤติกรรม | ผลและหลักฐาน |
|---|---|
| fullName, phone, website | PASS — พิมพ์, Preview, profile API, reload, public, PDF |
| targetRole, headline, summary, careerObjective | PASS — มี `BIM Club Developer` ก่อน Save; ข้อความไทย/หลายบรรทัด/ข้อความยาวถึงท้ายปรากฏใน output |
| skills | PASS — ร่างและ Save/reload/public; PDF ทดสอบ 45 ทักษะ |
| experiences, education | PASS — ทุกช่องกรอกถูกเก็บ, reload/public/PDF; วันแสดงเป็นเดือน/ปีตามภาษา |
| projects, project URL/description/image/public flag | PASS — ร่าง, upload, Save, reload, public, PDF |
| internships, awards, activities | PASS — ทุกช่องในฟอร์ม Save/reload/public/PDF |
| certificates, languages, publications | PASS — รวม credential URL, issuer/date, language level, publisher/year |
| volunteer, references, custom contacts | PASS — ทุกช่องในฟอร์ม Save/reload/public/PDF |
| Profile photo | PASS — อัปโหลดจริง, เก็บ users, reload/public; มีภาพในแม่แบบ Portfolio ทั้ง 6 |
| Template/colors/background | PASS — UI เลือก Navy/สี/cream แล้ว Save; PDF ครบ 6 แม่แบบ |
| Page size/orientation/language | PASS — Letter/landscape/English ถูกเก็บและใช้ปุ่มดาวน์โหลดจริง; PDF fixtures เพิ่ม A4 และ A3 landscape |
| Visibility | PASS — alias about/objective ถูกต้อง; ซ่อน summary แล้ว Preview ไม่แสดงและ DB เก็บค่า |
| Branding | PASS — ข้อความสถาบัน Preview ก่อน Save, show logo/size/scope เก็บได้; โลโก้ระบบปรากฏใน PDF; PARTIAL — ไม่ได้ทดสอบทุก combination หรืออัปโหลดโลโก้ทดแทนทั้งสองช่องผ่าน UI |
| Save failure/retry | PASS — จำลองเฉพาะ Portfolio PUT ล้มเหลวหนึ่งครั้ง แล้ว retry สำเร็จ ไม่มี child row ซ้ำ |
| Public isolation | PASS — ก่อน Save หน้า public ยังเป็นค่าเดิม; หลัง Save อ่านข้อมูลที่เก็บแล้ว |
| PDF/Thai | PASS — extraction ตรวจเนื้อหา/ขอบ/หน้าว่าง และ render ตรวจภาพภาษาไทย; การเรียงวรรณยุกต์ใน extracted text ไม่เท่ากับ Unicode ต้นฉบับทุกจุด จึงใช้ภาพยืนยันอักษรไทยด้วย |

ข้อแตกต่างที่ตั้งใจ: email เป็นข้อมูลบัญชีแบบ read-only; private projects ไม่ออกสู่ public; หมวดซ่อนยังเก็บใน DB; Minimal แสดง headline อังกฤษเป็นตัวพิมพ์ใหญ่; CV ATS เป็นข้อความไม่มีภาพ; การแบ่งหน้าจริงของ PDF แตกต่างจากกระดาษต่อเนื่องใน Preview ได้ แต่เนื้อหาตรงกัน

# 5. Alumni Migration

ระบุ 12 รายการจาก `team_members` ปี 2024 ตาม display order และจับคู่ `honors` ด้วยชื่อ+ปี พบว่ามี Alumni ทั้ง 12 อยู่แล้วจาก seed เดิม จึงใช้ ID เดิม เพิ่ม `alumni_honor_id` เป็นลิงก์ archive และเปลี่ยน query ให้ Current Personnel ไม่อ่านรายการที่ย้ายแล้ว

- **12/12 ออกจาก Current Personnel และ 12/12 อยู่ใน Alumni; เพิ่มรายการซ้ำ 0**
- เก็บ source rows ไว้เป็น archive; ชื่อ/ลำดับและ metadata เดิมไม่ถูกลบ รูปที่มีอยู่ใน honors คงเดิม ไม่มี hard-coded รายชื่อชุดใหม่
- Admin Personnel มีปุ่มย้าย และลิงก์ไป Admin Alumni เดิม หลังย้ายให้จัดการข้อมูลที่ `honors` เป็นหลัก
- ทดสอบปุ่มย้ายด้วย fixture: ชื่อเล่น/ตำแหน่ง/bio/รูป/ลำดับคงครบ; ย้ายซ้ำได้ honor ID เดิม
- รัน migration ซ้ำใน Docker local: `moved:0, verifiedAlumni:12, duplicatesAdded:0`
- เปลี่ยนเฉพาะฐาน local ที่ได้รับอนุญาต ไม่ได้ย้ายข้อมูล production

# 6. Tests Added / Executed

**EXECUTED AND PASSED**

- `node --test test/portfolio-model.test.js test/portfolio-cv.test.js test/pdf-resources.test.js` — **14/14** รวม shared mapping, scalar sync, 6 Portfolio/5 CV templates, visibility และ regression ของ PDF resource policy เดิม
- `BIMCLUB_QA_LOCAL=1 node /tmp/targeted-portfolio.cjs` ใน `bimclub_app` — Puppeteer/Chromium, real API/DB, temporary account, ทั้ง 12 collections, upload, 390px public page, save retry, settings, ปุ่ม download จริง, guest PDF, CV target-role Preview และ Admin move; ลบ fixtures หลังจบ
- `BIMCLUB_QA_LOCAL=1 node /tmp/targeted-pdf.cjs` — PDFs ของ Portfolio 6 แบบ, CV ATS และ optional-empty
- `validate-targeted-pdfs.py /tmp/bimclub-targeted` ด้วย bundled Python/pdfplumber — ผ่าน **10 PDF / 37 หน้า** (owner/public, 6 Portfolio templates, CV ATS, empty): ตรวจข้อความสำคัญและทุก free-text collection field, 45 skills, หลายหน้า, ไม่มีหน้าว่าง/ตัวอักษรนอก bounds; `pdftoppm` ใช้ render ตรวจภาพ
- `BIMCLUB_QA_LOCAL=1 node /tmp/transfer-alumni.cjs` — local migration และ rerun idempotency
- `node --check` ทั้ง 13 JS/CJS ที่เปลี่ยน/เพิ่ม; `git diff --check`

**EXECUTED AND FAILED → FIXED:** Save เดือนลง DATE; QA คลิกแม่แบบก่อน animation drawer จบ (แก้การรอใน test); ตรวจพบข้อมูล/รูปที่แม่แบบข้ามและแก้พร้อม regression checks

**STATICALLY VERIFIED:** โครงสร้างฟีเจอร์สำหรับ pilot, endpoint ownership เดิม, mapping ของ settings/hidden sections และไม่มีสำเนารายชื่อ Alumni ใหม่

**NOT TESTED:** ระบบอื่นทั้งชุด, SMTP delivery จริง, backup restore จริง, production, Safari/Firefox, ทุก combination ของ branding/settings

# 7. Remaining Issues

- Save ใช้หลาย endpoint เดิม จึงไม่ใช่ transaction เดียวครอบ users/ทุกตาราง; failure อาจบันทึกบางส่วนแล้ว ต้อง retry ตามข้อความที่แสดง (ทดสอบแล้ว) ร่างอยู่ใน memory และมี before-unload warning ไม่ใช่ offline draft storage
- ก่อน deploy code นี้ต้องมีคอลัมน์ `team_members.alumni_honor_id` และตรวจ mapping ข้อมูลปลายทาง; script ที่ให้เป็น local-only โดยตั้งใจ ยังไม่มี production migration execution
- หาก pilot ให้สมัครเอง OTP inbox delivery ยังต้องทดสอบจริง; ก่อนรับข้อมูลจริงต้องยืนยัน backup/restore
- ผล PDF เป็นชุดข้อมูลทดสอบที่ระบุ ไม่ได้อ้างว่ารองรับทุกความยาว/ทุก font/device หรือรับรอง accessibility ทั้งระบบ

# 8. Final Recommendation

เริ่ม **limited student pilot แบบมีผู้ดูแลและบัญชีพร้อมใช้** ได้จากฟีเจอร์ปัจจุบัน หลังนำ migration/code ไปยังสภาพแวดล้อม pilot และตรวจการสำรองข้อมูล ไม่ต้องเพิ่มฟีเจอร์ใหม่ก่อนทดลอง หากจะเปิดสมัครเองหรือ deploy production ให้ปิดข้อยืนยัน OTP/restore/environment ข้างต้นก่อน
