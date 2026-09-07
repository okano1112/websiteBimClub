# โครงสร้างโปรเจกต์ BimClub

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
