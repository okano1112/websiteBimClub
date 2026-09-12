# BIM Club — Page inventory, UX decisions และ QA

> อัปเดตล่าสุด 2026-09-12: UI ครบ 37 HTML entry points และ Projects/tagging, Positions, OTP, server pagination มี implementation พร้อม local DB/browser evidence แล้ว ดู [UI-AND-FEATURES-ACCEPTANCE.md](UI-AND-FEATURES-ACCEPTANCE.md) เป็นสถานะล่าสุดสำหรับรายการเหล่านี้ รายงานก่อนหน้าด้านล่างเป็นประวัติ; Phase 12/full production acceptance ยังไม่ปิด


วันที่: 2026-09-10 · มี HTML เดิม 34 ไฟล์ (รวม redirect). ตารางนี้มาจาก source; ยังไม่ใช่ผล browser test ทุกหน้า.

ใช้คู่กับ [แผนทุก Phase](CONTROLLED-DEVELOPMENT-PLAN.md). Path อ้างจาก `club-website/`; ชื่อหน้าในตารางอยู่ใต้ `public/page/` ยกเว้น `public/index.html`. JS/CSS shorthand `js/foo.js` หมายถึง `public/js/foo.js`.

## วิธีใช้ก่อนปรับแต่ละหน้า

1. เปิด source ของหน้า, JS, CSS ที่โหลดจริง และ API ที่ใช้; เช็ก approved scope/known bugs ก่อนใช้ตาราง.
2. บันทึกสถานะ guest/owner/admin ตามจริง พร้อม screenshot ที่ไม่มีข้อมูลส่วนบุคคล. หน้า public HTML โหลดได้ ไม่ได้หมายความว่า API ไม่ต้องตรวจสิทธิ์.
3. รายงาน Current Problem → User Goal → Information Hierarchy → Proposed UX/Interaction → Mobile → Accessibility.
4. เสนอ 2–3 concepts และรอคำตอบก่อน redesign. ข้อเสนอเริ่มต้นด้านล่างไม่ใช่ approved design.
5. ถาม 2 คำถามเฉพาะหน้าด้านล่างเมื่อถึงหน้านั้น ปรับตามสิ่งที่ browser audit พบ ไม่ถามซ้ำเรื่องที่ผู้ใช้ตอบแล้ว.
6. ตรวจ data changes ใน test DB เท่านั้น; บันทึก PASS/FAIL/BLOCKED และหลักฐานจริงใน QA-RESULTS.md เมื่อรันทดสอบ ไม่ pre-fill ว่าผ่าน.

## หน้าสาธารณะ/ชุมชน (9)

| หน้าเดิม | แก้ที่ไหน / data | เป้าหมายและ checks เฉพาะหน้า | คำถามก่อนพัฒนา |
| --- | --- | --- | --- |
| `public/index.html` | inline JS, js/feed.js, css/main.css, css/feed.css; posts API และ static content | Home ต้องพาไปกิจกรรม/ผลงาน/สมัคร; แก้ broken achievement href ใน P10; ตรวจ Swiper, composer เมื่อ login, duplicate feed calls และ card baseline; แนะนำ C Community | 1. หลัง Hero ต้องการนำกิจกรรมหรือโพสต์สมาชิกขึ้นก่อน? 2. Feed หน้าแรกควรมี load more หรือพาไป feed.html เมื่อเกิน 30 โพสต์? |
| `about.html` | inline personnel fetch, css/about.css; /api/team | Personnel แสดง null fields อย่างซื่อสัตย์, ปี/รุ่นถูก, ภาพ fallback, anchor personnelTitle; แนะนำ A Editorial | 1. ต้องการเลือกทีมตามปีหรือแสดงทีมล่าสุดก่อน? 2. บุคลากรที่เชื่อมบัญชีแล้วควรมีลิงก์ Profile ในส่วนใดโดยคงการ์ดเดิม? |
| `activity.html` | js/activity-dynamic.js, inline calendar/observer, css/activity.css; /api/activities | Swiper/calendar/date range/upcoming/empty/error และ removed stats; ตรวจ source date vs display date; แนะนำ B Section-led | 1. Upcoming รวมกิจกรรมที่กำลังจัดอยู่ด้วยหรือไม่? 2. รายการไม่มีวันที่มาตรฐานควรอยู่ในข่าวอย่างเดียวหรือให้ Admin ระบุวันที่ก่อนลงปฏิทิน? |
| `achievement.html` | js/achievement-dynamic.js, inline carousel/member works, css/achievement.css; /api/achievements,/api/posts | Club Highlights แยก Member Works; carousel หลายรูป, null text/XSS, keyboard เปิด/ปิด, CSS typo B11; แนะนำ A Editorial | 1. Club Highlights ควรเชื่อม canonical Project หรือคงเป็นผลงานองค์กรแยก? 2. Member Works ควรเลือกเฉพาะโพสต์ที่เป็นผลงานหรือแสดงโพสต์ทั่วไปตามระบบเดิม? |
| `honor.html` | js/honor.js, css/honor.css; /api/honors | year filter/query URL, featured selection by metadata, modal focus, carousel/view all; protected cards; แนะนำ B รอบการ์ด | 1. หนึ่งปีมีผู้นำที่ต้อง featured ได้มากกว่าหนึ่งคนหรือไม่? 2. เมื่อเปิดหน้าครั้งแรกให้แสดงทุกปีหรือปีล่าสุด? |
| `courses.html` | js/courses.js, css/courses.css; GET /api/courses | published list, empty/error, thumbnail, title/link/course access; แนะนำ B | 1. หน้าแนะนำคอร์สควรมีตัวกรองผู้สอนหรือระดับก่อน? 2. ผู้เยี่ยมชมควรเปิด preview คอร์สก่อนถูกขอ Login หรือไม่? |
| `feed.html` | js/feed.js, css/feed.css; posts/comments/likes APIs | create/upload/post/like/comment/delete, guest CTA, long content, pagination; แนะนำ C | 1. ต้องการ load more เพื่ออ่านโพสต์เกิน 30 รายการหรือไม่? 2. ปุ่มแก้โพสต์ควรเพิ่มในหน้า Feed จาก PUT API ที่มีอยู่หรือใช้หน้าจัดการเดิม? |
| `team.html` | meta refresh + location.replace ไป /page/about.html#personnelTitle | คง compatibility redirect, JS disabled fallback, anchor landing ไม่ซ่อนใต้ sticky navbar; ไม่มี redesign | 1. คง redirect นี้สำหรับลิงก์เก่าหรือให้แสดงข้อความพร้อมลิงก์ก่อน? 2. หากมี year query เก่า ต้องส่งต่อไปตัวกรอง Personnel หรือไม่? |
| `timeline.html` | css/timeline.css, static placeholder | legacy timeline ยังมี mock copy; inventory incoming links ก่อนตัดสินใจ; แนะนำ A เมื่อมีข้อมูลจริง | 1. Timeline ควรใช้ Activities เป็น source หรือมีประวัติชมรมแยก? 2. ถ้ายังไม่มีข้อมูลจริง ให้คงหน้าแจ้งสถานะหรือ redirect ไปกิจกรรม? |

## บัญชีสมาชิก/Portfolio/การเรียน (13)

| หน้าเดิม | แก้ที่ไหน / data | เป้าหมายและ checks เฉพาะหน้า | คำถามก่อนพัฒนา |
| --- | --- | --- | --- |
| `register.html` | js/register.js ยังไม่โหลด, css/auth-layout.css; /api/auth/register,/verify-otp,/resend-verify | ID binding, submit/save, confirm password, OTP/retry, labels/loading; แนะนำ B | 1. คง username เป็น required ตาม contract เดิมหรือเปลี่ยนเป็นสร้างอัตโนมัติภายหลัง? 2. เบอร์โทรและประเภทสมาชิกต้องเก็บตอนสมัครหรือเติมหลังยืนยันอีเมล? |
| `login.html` | js/login.js, css/auth-layout.css; /api/auth/login,/resend-verify | username/email, needVerify, error visibility, role redirect (instructor ปัจจุบันไป CMS ที่ admin-only), loading; แนะนำ B | 1. ผู้สอนควรไป Manage Courses และสมาชิกไป Profile หลัง login หรือไม่? 2. บัญชียังไม่ยืนยันควรเปิด OTP ในหน้าเดิมหรือพาไป register verification panel? |
| `forget.html` | inline script, css/auth-layout.css; /api/auth/forgot-password | generic success, validation, mail failure/retry, no token leak; แนะนำ B | 1. ผู้ใช้ login อยู่ควรเห็นอีเมลตนเองแบบอ่านอย่างเดียวหรือกรอกได้? 2. ต้องการลิงก์กลับหน้า Login หลังขอ reset หรือคงให้ขอซ้ำหลัง cooldown? |
| `reset-password.html` | inline script, css/auth-layout.css; /api/auth/reset-password | invalid/expired/used token, confirm password, same policy, old session behavior; แนะนำ B | 1. หลัง reset ต้อง logout ทุกอุปกรณ์หรือไม่? 2. Token หมดอายุควรมีปุ่มขอใหม่ที่พาไป forget.html ทันทีหรือไม่? |
| `settings.html` | js/settings.js, css/settings.css; /api/auth/me,/profile,/password,/recovery-phone,/upload | 84×84 avatar, Save/reload, current-password, recovery data private; แนะนำ B | 1. หลังมี Profile page จะให้ Settings คงแก้ข้อมูลส่วนตัวหรือเป็นบัญชี/ความปลอดภัยเป็นหลัก? 2. เบอร์สำรองใช้ติดต่อเท่านั้นหรือมี recovery flow ที่ต้องพัฒนาเพิ่ม? |
| `portfolio.html` | js/portfolio.js, js/portfolio-templates.js, css/portfolio.css; /api/portfolios/me และ nested writes/export | save/public toggle/live preview/owned vs involved project/delete/unsaved state; protected templates; แนะนำ B | 1. งานที่ถูก tag ควรเลือกว่าจะใส่ใน Portfolio หรือแสดงอัตโนมัติทุกงานที่เผยแพร่? 2. ต้องการให้สมาชิกจัดลำดับงานร่วมในเอกสารโดยเก็บเพียง ID references หรือไม่? |
| `portfolio-public.html` | inline script, js/portfolio-templates.js, css/portfolio-public.css; /api/portfolios/public/:userId,/export/pdf | is_public/owner guard, contact fields, invalid user, document resource URLs, duplicated data render; แนะนำ A รอบเอกสาร | 1. ข้อมูลติดต่อใดอนุญาตให้แสดงสาธารณะ? 2. ให้ผู้เยี่ยมชมดาวน์โหลด PDF สาธารณะต่อไปหรือจำกัดเฉพาะเจ้าของ? |
| `cv.html` | js/cv.js, js/portfolio-templates.js, css/cv.css+portfolio.css; portfolios API | shared source vs CV-specific settings, page geometry, template switch, Save/export; แนะนำ B | 1. งานร่วมควรเข้า CV อัตโนมัติหรือผู้ใช้เลือกเฉพาะงาน? 2. ต้องการคงรูปใน CV visual templates และไม่แสดงใน ATS ตามเดิมหรือไม่? |
| `cv-public.html` | inline script, js/portfolio-templates.js, css/portfolio-public.css; public portfolio/PDF | public visibility, stale token/session, Letter/A4 layout, hidden sections and PII; แนะนำ B | 1. CV public ใช้ privacy เดียวกับ Portfolio ต่อไปหรือแยก? 2. การซ่อน section ใน editor ต้องซ่อนใน public/PDF ด้วยทุก template หรือไม่? |
| `request-instructor.html` | js/request-instructor.js, css/instructor-requests.css; /api/instructor-requests/me, POST / | pending duplicate/approved/rejected, labels, correct role, server guard; แนะนำ B | 1. คำขอถูกปฏิเสธควรสมัครซ้ำได้ทันทีหรือรอแก้ข้อมูลก่อน? 2. ต้องการเหตุผลปฏิเสธจาก Admin ซึ่งต้องเพิ่ม field หรือคงสถานะอย่างเดียว? |
| `manage-courses.html` | js/manage-courses.js, css/courses.css+admin.css; /api/courses/manage, POST /courses | teacher sees own/admin all, create validation, filter/sort, published/draft; แนะนำ B | 1. คอร์สใหม่ default เผยแพร่หรือ draft? 2. ตัวกรองสถานะควรจำค่าเมื่อกลับจาก editor หรือไม่? |
| `course-editor.html` | js/course-editor.js, css/courses.css; /api/courses/:id/editor, PUT/DELETE, /upload/video | owner+admin only, video/thumbnail, quiz/stop validation, atomic replace, unsaved changes; แนะนำ B | 1. เปลี่ยนข้อสอบหลังมี attempts ต้องรักษาประวัติข้อสอบเดิมหรือยอมรับผลอ้างอิง snapshot? 2. ลบวิดีโอที่แชร์หลายคอร์สควรเอาเฉพาะ link ออกตามเดิมหรือมีหน้า media manager แยก? |
| `course.html` | js/course-player.js, css/courses.css; course/stops/quiz/certificate/comments/likes | no answer leak, published guard, video provider, server score, certificate idempotency, resume preference; แนะนำ B | 1. จุดหยุดคำถามเป็นทางเลือกผู้เรียนตาม localStorage เดิมหรือบังคับ? 2. สอบซ้ำได้ไม่จำกัดหรือมีข้อกำหนดจำนวนครั้งที่ต้องเพิ่ม? |

## Admin (12)

| หน้าเดิม | แก้ที่ไหน / data | เป้าหมายและ checks เฉพาะหน้า | คำถามก่อนพัฒนา |
| --- | --- | --- | --- |
| `admin.html` | js/admin.js, css/admin.css; /api/posts | moderation/edit/delete/image ownership, pagination/error, confirm affects Feed; แนะนำ B | 1. Admin แก้เนื้อหาโพสต์สมาชิกได้หรือควรจำกัดเฉพาะซ่อน/ลบ? 2. ต้องการแยกประเภทโพสต์ผลงานจากโพสต์ทั่วไปในรายการหรือไม่? |
| `admin-cms.html` | js/admin-cms.js, css/admin-cms.css+admin.css; /api/cms-content/:section,/upload/cms | activities/achievements tabs, multi-image preservation, save failure, wrong section/id; แนะนำ B | 1. แก้รูป Achievement ต้องเลือกหลายรูป/จัดลำดับได้ใน CMS นี้หรือแยก gallery editor? 2. ต้องเพิ่มวันที่เริ่ม/จบกิจกรรมใน CMS เดียวกับปฏิทินหรือไม่? |
| `admin-activity.html` | redirect ไป admin-cms.html?section=activities | exact query, bookmark/back, no redirect loop; ไม่มี redesign | 1. คง URL นี้รองรับ bookmark เดิมหรือไม่? 2. หลัง redirect ต้อง focus หัวข้อจัดการกิจกรรมเพื่อ keyboard หรือไม่? |
| `admin-achievement.html` | redirect ไป admin-cms.html?section=achievements | exact query, no default wrong tab, accessible fallback link; ไม่มี redesign | 1. คง URL นี้เมื่อเพิ่ม Admin Projects หรือยังชี้ Club Highlights ตามเดิม? 2. ต้องให้หน้า CMS แยกคำว่า Club Highlights จาก Projects ชัดเจนเพียงใด? |
| `admin-dashboard.html` | js/admin-dashboard.js, js/mock/admin-mock-data.js, css/admin.css | MOCKUP→real metrics เฉพาะที่อนุมัติ, admin guard, definition/time window; แนะนำ B | 1. งานเร่งด่วนใดควรนำหน้า: คำขอผู้สอนหรือโปรไฟล์ไม่ครบ? 2. ข้อมูลกิจกรรม Admin ล่าสุดต้องเปิดใช้ audit log หรือซ่อนส่วนนี้ก่อน? |
| `admin-members.html` | js/admin-members.js, css/admin.css; /api/admin/users | excludes admin currently, search/role/status/page 8, read-only details; แนะนำ B | 1. “สมาชิก” รวมผู้สอนในหน้านี้ต่อไปหรือแยกตามประเภทสมาชิกใหม่? 2. ต้องการ filter รุ่น/ตำแหน่งจาก roster ที่เชื่อมบัญชีแล้วหรือไม่? |
| `admin-users.html` | js/admin-users.js, css/admin.css; /api/admin/users, role/profile/password/ban/delete/restore | real role guards, self/last-admin safety, soft-delete, password reset invalidation; แนะนำ B | 1. ให้ Admin ตั้ง password ให้ผู้ใช้โดยตรงหรือส่ง reset invitation? 2. ต้องการป้องกันการลดสิทธิ์ Admin คนสุดท้ายพร้อมกันด้วย transaction หรือไม่? |
| `admin-honor.html` | js/admin-honor.js, css/admin.css; /api/honors/admin, honors writes, upload | preview fixed size, positions/year/publish, assignment and historical data; แนะนำ B | 1. รายชื่อศิษย์เก่าที่ไม่มีบัญชีควรคงไว้โดยไม่บังคับสร้างบัญชีหรือไม่? 2. ต้องการค้นชื่อแล้วผูกบัญชีด้วย Admin ยืนยันทีละคนหรือมีไฟล์ mapping ที่รับรองแล้ว? |
| `admin-personnel.html` | js/admin-personnel.js, css/admin.css; /api/team/admin,writes | omitted fields preservation, publish state, generations, failed delete feedback; แนะนำ B | 1. ต้องเพิ่มช่องรูปและเปิด/ปิดเผยแพร่ในฟอร์มหรือคงค่าเดิมเมื่อไม่ได้แก้? 2. ปีทีมงานสัมพันธ์กับรุ่นแบบใดนอกจากปี 2024 ที่ code กำหนดไว้? |
| `admin-instructor-requests.html` | js/admin-instructor-requests.js, css/instructor-requests.css; /api/instructor-requests, approve/reject | status filter/count, double approve concurrency, role change, unauthorized request; แนะนำ B | 1. การ approve ต้องมีผู้อนุมัติหนึ่งคนหรือหลายคน? 2. ต้องส่งอีเมลผลการพิจารณาหรือแสดงสถานะในบัญชีอย่างเดียว? |
| `admin-reports.html` | js/admin-reports.js, mock data, css/admin.css | MOCKUP sorting/export preview ยังไม่มีไฟล์จริง, query definition, CSV safety เมื่ออนุมัติ; แนะนำ B | 1. รายงานชุดแรกต้องเป็นสมาชิกหรือคอร์ส และช่วงเวลาใด? 2. Export อนุญาตให้มี email/phone หรือใช้ยอดรวมไม่ระบุตัวบุคคล? |
| `admin-system-settings.html` | js/admin-system-settings.js, mock data, css/admin.css | save ยังไม่ persist; restrict allowlist และ keep mock label; แนะนำ B | 1. ค่าใดที่ผู้ดูแลจำเป็นต้องเปลี่ยนจริงโดยไม่แก้ code? 2. ถ้ายังไม่มี backend ให้ซ่อนเมนูนี้หรือคงหน้า MOCKUP ที่ระบุชัด? |

รวม 9 + 13 + 12 = **34 หน้าเดิม**. Header/footer/navbar และ system sidebar ใช้ร่วมกัน ต้องตรวจบน Home, public page, form, editor และ Admin อย่างน้อยอย่างละหนึ่งหน้าเมื่อเปลี่ยน shared source.

## หน้าใหม่ที่เสนอ (ยังไม่มีใน baseline)

| หน้าใหม่ | Phase / files | Checks และคำถามก่อนสร้าง |
| --- | --- | --- |
| `profile.html` | P5; profile.js/profile.css + profiles API | owner/other/admin/private/public, all tabs grounded in data; ต้องเลือก public fields และวิธีพิสูจน์ activity participation |
| `admin-positions.html` | P3; admin-positions.js + positions API | add/edit/deactivate/order/assigned position history; ต้องยืนยันตำแหน่งหลายรายการต่อปีและ leader cardinality |
| `admin-projects.html` | P4; admin-projects.js + projects API | canonical project/legacy ID mapping/member selector; ต้องยืนยันแยก Club Highlights และ collaborator consent |
| `projects.html` (conditional) | P4 หากต้องมี public project directory; เสนอ projects.js และ scoped CSS | ไม่แทน achievement.html โดยอัตโนมัติ; ต้องยืนยัน public directory ใหม่และ filters ที่ต้องใช้ |
| `project.html` (conditional) | P4 หากต้องมี project detail แยก; เสนอ project.js และ scoped CSS | deep link/privacy/member links; ต้องเลือกแยก detail page หรือใช้ Modal/ส่วนเดิมที่อนุมัติ |

หากอนุมัติสองหน้า conditional ให้เพิ่ม exact file list, routes และ acceptance ลง work packet ก่อน implementation; ถ้าไม่อนุมัติ ให้ Projects ปรากฏผ่าน Profile/Portfolio โดยไม่สร้างปุ่มไปหน้าไม่มีอยู่.

## Test matrix ร่วม

| ชนิดงาน | Positive cases | Negative/edge cases |
| --- | --- | --- |
| การอ่านข้อมูล | guest เห็น published, owner เห็นของตน, pagination stable | private/unpublished/deleted ไม่รั่ว, missing ID, API down, empty dataset |
| ฟอร์ม | fill→validate→save→reload คงค่า, loading/feedback | whitespace/null/type/length, duplicate click, failed network, validation error คง input |
| Upload | JPEG/PNG/WebP และ orientation, cancel/replace, persisted URL | spoof MIME/extension, corrupt/oversized/pixel bomb, broken fallback, partial batch cleanup |
| Permissions | allow role + owner rule ที่ระบุ | guest 401, forbidden 403 หรือ private resource 404, ban/delete/role change หลัง login |
| Search/tag | Thai/Latin names, keyboard choose/remove, no duplicate | stale response, no results, invalid member ID, disabled account, SQL wildcard/escape handling |
| Modal/menu | pointer/keyboard open/close, Escape, focus restore | background scroll/focus leakage, mobile clipping, reopen stale data |
| Cards | same fixtures/viewport/browser เปรียบเทียบก่อนและหลัง | long/missing text/image, count เปลี่ยนโดยไม่เปลี่ยน layout/style ที่ป้องกัน |
| PDF | owner/public rules, template/page geometry, Thai fonts | hidden/private content, unsafe URL/path/CSS, missing images, renderer failure/concurrency |

การทดสอบ invalid cases ย่อมมี 4xx โดยตั้งใจ แยกจาก console/network error ใน happy path. ไม่ใช้คำว่า zero errors เพื่อปิดการตรวจสิทธิ์หรือซ่อน error output.

## แบบบันทึกผลจริงต่อหน้า

```text
PAGE / PACKET / COMMIT OR PRE-PHASE BASELINE:
ROLE / DATASET / DATABASE TARGET:
BROWSER + VERSION / VIEWPORT:
USER APPROVAL + UX CONCEPT:
CHECK / EXPECTED / ACTUAL / PASS-FAIL-BLOCKED:
SCREENSHOT BEFORE / AFTER:
CONSOLE + NETWORK (existing/new/expected negative):
KEYBOARD / CONTRAST / REDUCED MOTION:
DATA PERSISTENCE + PERMISSION EVIDENCE:
KNOWN ISSUE / FIX PACKET / RETEST RESULT:
QUESTIONS + RECORDED ANSWERS:
```
