# โครงสร้างโปรเจกต์ BimClub

## Controlled Development — สถานะที่ตรวจจาก source วันที่ 2026-09-10

ส่วนนี้อธิบายสถานะปัจจุบันสำหรับแผนพัฒนา 12 Phase; เนื้อหาหลังส่วนนี้คงไว้เป็นประวัติการปรับปรุงเดิม ไม่ใช่ผลทดสอบใหม่หรือคำสั่งให้รัน migration ทันที.

- เริ่มงานต่อที่ [DEVELOPMENT-HANDOFF.md](DEVELOPMENT-HANDOFF.md).
- วิธีแก้/ไฟล์/permission/data migration/tests/rollback ทุก Phase อยู่ใน [CONTROLLED-DEVELOPMENT-PLAN.md](CONTROLLED-DEVELOPMENT-PLAN.md).
- หน้าเดิมทั้งหมด 34 HTML (รวม redirects) และคำถาม/QA ต่อหน้าอยู่ใน [PAGE-INVENTORY-AND-QA.md](PAGE-INVENTORY-AND-QA.md).
- การอนุมัติรอบนี้ครอบคลุมเอกสารและแผนล่วงหน้า; runtime changes ยังไม่เริ่ม ดู [CONTROLLED-CHANGELOG.md](CONTROLLED-CHANGELOG.md).

### Runtime และขอบเขตโฟลเดอร์จริง

Application root คือ `club-website/` มี package.json ของแอปเอง; package.json ที่ repository root มี dependency อีกชุด จึงต้องรันคำสั่งแอปใน directory ให้ถูก. Express 5 + CommonJS ให้บริการ static HTML/CSS/JavaScript ไม่มี frontend framework/build pipeline ใน scripts ปัจจุบัน. MySQL ผ่าน mysql2; Compose ใช้ MariaDB 10.11; PDF ใช้ Puppeteer/Chromium.

```text
websiteBimClub/
├── assets/                    # shared assets นอก application root
│   ├── fonts/
│   ├── img/                   # about, achievement, hornor-hero, logobranding, swiperimg
│   └── videos/
├── package.json               # ไม่ใช่ application package
└── club-website/
    ├── server.js              # listen port → src/app.js
    ├── config/                # database pool / SMTP transport
    ├── middleware/            # login / role / errors
    ├── src/
    │   ├── app.js             # headers, parsers, session store, static, health, API
    │   ├── routes/            # feature routers; หลายไฟล์ยังมี query/business logic
    │   ├── controllers/       # account และ course list/create เท่านั้นใน baseline
    │   ├── models/            # user และ course ใน baseline
    │   ├── services/          # PDF renderer + validated image upload
    │   └── utils/             # video URL normalization
    ├── public/                # / (index.html, page/, js/, css/)
    ├── uploads/               # /uploads และ /uploads/videos
    ├── database/              # schema + migration/seed แบบ manual
    └── test/                  # Node built-in test runner
```

### Data flow และความสัมพันธ์

Browser HTML → feature JS/inline script → `/api` router → login/role middleware → controller/model **หรือ query ใน router เดิม** → MySQL/MariaDB → JSON → renderer. ไม่ใช่ทุก feature แยก controller/service/model แล้ว; ไม่จำเป็นต้องย้ายพร้อมกัน.

- Auth: bcrypt hashes, MySQL-backed session, regenerate session เมื่อ login; middleware โหลด user ปัจจุบันจาก DB เพื่อเช็ก banned/deleted/verified/role. `users.role` คือ user/instructor/admin.
- Account profile: users.full_name/avatar_url/phone; frontend อยู่ Settings. Social Profile page ใหม่ในแผน Phase 5 **ยังไม่มี**.
- Alumni: honors เก็บตำแหน่งข้อความ/year/generation; Personnel: team_members แยกตาราง. ยังไม่มี FK ของทั้งสอง domain ไป users ใน baseline.
- Portfolio: users 1:1 portfolios; experiences/education/projects/manual certificates เป็น child tables. Portfolio/CV ใช้ renderer ร่วมและแยก settings JSON.
- Project collaborators: **ยังไม่มี** canonical projects/project_members; portfolio_projects เป็นของ portfolio เดียว. อย่าสับสนกับ achievements หรือ posts.
- Achievements: Club Highlights + achievement_images; Posts: social content + images/comments/likes; Course certificates ถูกอ่านไป Portfolio/CV.
- Activities มี event_date แบบข้อความ; start_date/end_date มาจาก migration แยก. ตรวจ schema ของ target ก่อนใช้ calendar writes.

### Static paths และ configuration

`public/page/x.html` เป็น URL `/page/x.html`, `../assets/` เป็น `/assets/`, `uploads/` เป็น `/uploads/`. คง spelling/path ของ assets เดิม และอย่าย้ายไฟล์เพียงให้ตรงตัวอย่าง folder ใหม่.

Environment variable names ที่ source ใช้: NODE_ENV, PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, APP_URL, PUPPETEER_EXECUTABLE_PATH. เอกสารนี้ไม่อ่านหรือบันทึกค่าจริง. Docker development/production-like มี target/volume ต่างกัน ต้องระบุเป้าหมายก่อนรัน.

### สิ่งที่ยังไม่พร้อมและข้อจำกัดของหลักฐาน

- Registration API มี แต่ register.html ไม่โหลด register.js และ IDs ไม่ตรงกัน; OTP backend ยังไม่มี UI ใน baseline.
- Admin Dashboard/Reports/System Settings เป็น MOCKUP ที่ติดป้าย; chatbot เป็นข้อความแจ้งอยู่ระหว่างพัฒนา; timeline.html ยังมี placeholder.
- `schema.sql` มี DROP TABLE/seed จึงไม่ใช่ migration ที่ใช้รันทับระบบเดิมได้. คำแนะนำ migration ในบันทึกเก่าด้านล่างต้องตรวจ metadata/backup/approval ก่อนทุกครั้ง.
- Portfolio GET บางเส้นทางเรียก auto-migration/ensure record; อย่าถือว่า GET ทุก route เป็น read-only. Import app อาจเปิด DB/session และสร้าง uploads directory.
- UI ปัจจุบันมี CSS shared selectors และ inline scripts; card styles ทุกชุดเป็น Protected Components ตามแผนใหม่. แนวทาง UI เดิมในบันทึกประวัติไม่อนุญาตให้ redesign cards รอบใหม่.
- Phase 0: 23 tests ผ่าน, JavaScript runtime 58 ไฟล์ผ่าน syntax; ไม่มี live DB/browser proof จากการตรวจรอบนั้น. ดู known bugs และ acceptance ของแต่ละ feature ใน master plan.

---

## โครงสร้างปัจจุบันหลังปรับปรุง

```text
club-website/
├── config/                 # การเชื่อมต่อฐานข้อมูลและบริการภายนอก
├── database/               # schema หลักและ migration แบบเพิ่มทีละ phase
├── middleware/             # auth, role guard และ error handler กลาง
├── public/                 # HTML/CSS/JavaScript และ static asset ฝั่ง browser
│   ├── css/
│   ├── js/
│   └── page/
├── src/
│   ├── app.js              # ประกอบ Express app, session, static และ API router
│   ├── controllers/        # ตรวจ input/ควบคุม flow/แปลงผลลัพธ์เป็น HTTP response
│   ├── models/             # คำสั่งอ่านเขียนข้อมูลของแต่ละ domain
│   ├── routes/             # ประกาศ endpoint และผูก middleware/controller
│   └── services/           # งานหลายขั้นหรือระบบภายนอกที่ใช้ร่วมกัน
├── test/                   # automated regression tests
├── uploads/                # ไฟล์ที่ผู้ใช้อัปโหลด (ไม่ commit ไฟล์จริง)
├── server.js               # bootstrap บาง ๆ สำหรับ npm และ Docker
├── Dockerfile
└── docker-compose.yml
```

### เพิ่มเติมจาก UI/UX refactor

- `team_members` เป็น domain แยกจาก `honors` โดยเก็บปีทีมงาน ตำแหน่ง ลำดับ และสถานะเผยแพร่ รองรับการหมุนเวียนทีมรายปีผ่าน `database/phase10-current-team.sql` หรือ `database/schema.sql` สำหรับ installation ใหม่
- `/api/team` เป็น public read API และ `/api/team/admin` รวมถึง POST/PUT/DELETE เป็น admin-only เพื่อให้ต่อเข้าหน้า CMS เดิมได้โดยไม่ปะปนกับ Alumni
- `/page/team.html` คงไว้เป็น backward-compatible redirect ไปยัง About → Personnel เพื่อไม่สร้างหน้า Personnel ซ้ำ
- หน้า `public/page/achievement.html` แยก Club Highlights (achievements) ออกจาก Community Member Works (posts) โดยใช้ API เดิม ไม่สร้าง submission pipeline ซ้ำ

## หน้าที่ของแต่ละโฟลเดอร์

| ตำแหน่ง | หน้าที่ | ควรเก็บ | ไม่ควรเก็บ |
|---|---|---|---|
| `config/` | สร้างและ export configuration ที่ใช้ร่วมกัน | DB pool, mail client, env mapping | route หรือ HTML |
| `database/` | แหล่งอ้างอิงโครงสร้างฐานข้อมูล | schema, additive migration, seed สำหรับ dev | business logic |
| `middleware/` | ทำงานก่อน/หลัง handler | authentication, authorization, validation กลาง, error handler | query เฉพาะหน้า |
| `src/controllers/` | ประสาน request → model → response | validation ของ use case, HTTP status, response mapping | การประกาศ port/server |
| `src/models/` | data access ของ domain | parameterized SQL, transaction helper, row lookup | DOM/UI logic |
| `src/routes/` | ตารางทางเข้าของ API | path, HTTP method, middleware, controller binding | CSS หรือ client state |
| `src/services/` | workflow ที่ใช้หลาย model/ระบบ | mail, certificate, file orchestration | Express router |
| `public/` | ไฟล์ที่ browser ขอโดยตรง | semantic HTML, responsive CSS, client JS | secret หรือ DB credential |
| `test/` | ป้องกัน regression | unit/integration/API tests | production data |
| `uploads/` | runtime storage | รูป/วิดีโอที่ผ่าน upload validation | source code |

## การตัดสินใจเพื่อ compatibility

- คง `server.js` ไว้ที่ root เพราะ `package.json` และ Docker ใช้ path นี้ แต่ย้ายการประกอบแอปไป `src/app.js` เพื่อให้ทดสอบ/นำ app ไปใช้ซ้ำได้
- คง URL `/api/...` และ URL ของหน้า HTML เดิมทั้งหมด จึงไม่ทำให้ bookmark หรือ frontend request เดิมเสีย
- ย้าย route modules จาก `routes/` ไป `src/routes/` และแก้ require path รวมถึง path ลบไฟล์วิดีโอ/อัปโหลดให้ชี้ root เดิม
- แยก flow บัญชีและ course list/create ซึ่งมีการเปลี่ยน business rule ออกเป็น controller/model; route ที่เหลืออยู่ใต้ feature router เดิมเพื่อคง behavior ระหว่าง refactor และสามารถแยกเพิ่มทีละ domain โดยไม่เปลี่ยน public API
- ฐานข้อมูลเดิมต้องรัน `database/phase7-account-settings.sql` หนึ่งครั้ง ส่วน installation ใหม่ได้คอลัมน์จาก `database/schema.sql` แล้ว

## สาเหตุและวิธีแก้ UI/UX ทั้ง 7 จุด

1. **Navbar/Feed** — `auth.js` เคย inject ลิงก์ฟีดหลัง login ขณะที่หน้าแรกไม่มี feed container จึงทำให้ feed เป็นปลายทางแยกและ guest ไม่เห็น แก้โดยหยุด inject เมนู, ฝัง feed ใน `index.html`, โหลด `feed.js` ที่หน้าแรก และแก้ URL login ให้ทำงานทั้ง root/page
2. **Profile dropdown** — รูปโปรไฟล์ถูกใช้เปิด System Sidebar โดยตรง จึงไม่มีเมนูบัญชีส่วนตัว แก้โดยทำ dropdown ที่ควบคุมด้วย button/ARIA/Click/Escape และคงปุ่ม System Sidebar แยกต่างหาก พร้อมหน้า profile/password/recovery ที่ใช้งานจริง
3. **Courses** — POST เดิมบังคับ `is_published = 0` แต่หน้ารวม query เฉพาะ `is_published = 1` จึงบันทึกสำเร็จแต่ไม่แสดง ไม่ใช่ cache แก้โดยรับสถานะเผยแพร่จากฟอร์ม (default เปิด), แยก query/create เข้า model/controller และเปลี่ยน `prompt()` เป็น inline form ที่ validate แบบ real-time
4. **Footer** — grid เดิมขั้นต่ำ 250px ทุกคอลัมน์และ padding สูงทำให้ footer ใหญ่/แตกบรรทัดง่าย แก้เป็น grid 3/2/1 คอลัมน์ตาม breakpoint ลด type scale, gap และ vertical padding
5. **About** — card สามใบใช้ negative margin จึงทิ้งจังหวะ layout แปลกเมื่อเอาออก แก้โดยลบ markup/CSS/observer ทั้งชุดและกำหนดระยะก่อน team section ใหม่
6. **Timeline** — desktop ใช้เส้นกึ่งกลาง (`left: 50%`) และ mobile เปลี่ยนเป็นค่าคนละชุด แก้ timeline ของ About, Activity และหน้า timeline legacy ให้เป็น single-column โดยยึดเส้น/จุดที่ `left: 8px` ทุก viewport
7. **Featured activity card** — selector `.card-` พิมพ์ค้าง ทำให้ card body ไม่มี layout เฉพาะ และ flex item ที่มีเพียง `max-width` หดตาม content จนการ์ดแคบผิดปกติ แก้ `width: 100%`, body flex/min-width, image ratio, footer wrap/auto margin และปิด overflow ของ Swiper

## Regression checklist

- [ ] เริ่มด้วย `npm start` และ `docker compose up --build` ได้โดยไม่มี broken import
- [ ] guest เห็น feed บนหน้าแรกและ Navbar ไม่มีคำว่า “ฟีด”
- [ ] login แล้ว avatar dropdown เปิด/ปิดด้วย click และ Escape; System Sidebar ยังเปิดได้
- [ ] แก้ชื่อ อายุ เบอร์โทร รูปโปรไฟล์ และเบอร์สำรองแล้ว reload ยังอยู่
- [ ] เปลี่ยนรหัสผ่านด้วย current password; รหัสเดิมใช้ login ไม่ได้และรหัสใหม่ใช้ได้
- [ ] สร้างคอร์สแบบเผยแพร่แล้วเห็นทั้งหน้า manage และหน้าคอร์สสาธารณะ; แบบ draft ไม่ปรากฏสาธารณะ
- [ ] title คอร์สว่าง/สั้นกว่า 3 ตัวอักษรแสดง error ใต้ช่องโดยไม่ใช้ alert
- [ ] About ไม่มี 3 card เดิมและไม่มีช่องว่างจาก negative margin
- [ ] timeline ทุกหน้ามีเส้นซ้ายและ card ไม่ทับเส้นที่ 360/768/1280px
- [ ] activity card ไม่ล้นแนวนอน รูปไม่ยืด และ footer card อยู่ด้านล่าง
- [ ] footer แสดง 3/2/1 คอลัมน์ตาม desktop/tablet/mobile และทุกลิงก์ยังถูก path
- [ ] upload รูป/วิดีโอ, feed post/comment/like, role guard และ admin CMS เดิมยังทำงาน
