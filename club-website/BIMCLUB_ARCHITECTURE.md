# คู่มือและสถาปัตยกรรมระบบ BimClub (BimClub Architecture & System Manual)

⚠️ **AI SYSTEM INSTRUCTION: ให้ AI ทุกตัวอ่านและทำความเข้าใจไฟล์นี้ก่อนเริ่มทำงานใดๆ กับโค้ดในโปรเจกต์นี้ เพื่อป้องกันการทำงานซ้ำซ้อนหรือทำลายโครงสร้างเดิม** ⚠️

---

## 1. ข้อมูลทั่วไปและ Tech Stack (Tech Stack Overview)
- **Frontend**: Vanilla HTML, CSS, JavaScript (ไม่มี Framework เครื่องมืออย่าง React/Vue)
- **Backend**: Node.js, Express.js
- **Database**: MariaDB (เวอร์ชัน 10.11) ทำงานผ่าน Docker
- **Session Management**: ใช้ `express-session` ร่วมกับ `express-mysql-session` จัดการผ่านคุกกี้
- **Deployment & Environment**: ทำงานใน Docker Container 2 ตัว ได้แก่ `bimclub_app` (Node.js) และ `bimclub_db` (MariaDB)
  - 🚨 **ข้อควรระวังสำคัญสำหรับ AI**: โค้ด Backend (Node.js) ในโฟลเดอร์หลัก **ไม่ได้ทำ Volume Mapping** เข้าไปใน Docker หาก AI มีการแก้ไขไฟล์ใน `server.js` หรือโฟลเดอร์ `routes/`, `middleware/`, `config/` จะต้องรันคำสั่ง `docker-compose up -d --build app` ทุกครั้งเพื่อให้ความเปลี่ยนแปลงมีผล

## 2. โครงสร้างโฟลเดอร์ (Directory Structure)
- `/public/page/`: รวมไฟล์หน้าเว็บ `.html` ทั้งหมด (เช่น `index.html`, `login.html`, `activity.html`, `admin.html`)
- `/public/js/`: รวมไฟล์สคริปต์ Frontend หน้าต่างๆ ที่ใช้ดึง API (Fetch) และจัดการ DOM
- `/public/css/`: สไตล์ชีทของระบบ (เน้นใช้ `navbar.css` เป็น Global Navbar)
- `/routes/`: ไฟล์ Router ของ Express.js แยกระบบตามฟีเจอร์ (เช่น `auth.js`, `courses.js`, `activities.js`)
- `/middleware/`: ตัวกรองสิทธิ์การเข้าถึง ได้แก่ `requireLogin.js`, `requireRole.js`, `requireAdmin.js`, `requireInstructor.js`
- `/config/`: ไฟล์ตั้งค่า Database (`database.js`) และระบบส่งอีเมล (`mailer.js`)
- `/database/`: เก็บไฟล์ `schema.sql` และไฟล์ Migration ของฐานข้อมูล 
  - 🚨 **ข้อควรระวังสำคัญสำหรับ AI**: หากมีการแก้ไขตารางในฐานข้อมูล ต้องอัปเดตไฟล์ `schema.sql` ทุกครั้งเพื่อป้องกันข้อมูลหายเมื่อ Build Docker ใหม่

## 3. ระบบสิทธิ์และบทบาท (Roles & Permissions)
ตาราง `users` มีฟิลด์ `role` แบ่งผู้ใช้ออกเป็น 3 ระดับ:
1. **User (ผู้ใช้ทั่วไป)**:
   - เข้าดูคอร์สเรียน, โพสต์/คอมเมนต์/ถูกใจ ใน Feed, สร้างและอัปโหลดผลงานใน Portfolio ของตัวเองได้
   - สามารถส่ง "คำขอสิทธิ์อาจารย์" ได้ผ่านหน้า `/page/request-instructor.html`
2. **Instructor (อาจารย์)**:
   - ได้รับสิทธิ์เหมือน User ทุกอย่าง
   - สามารถเข้าถึงหน้า "จัดการคอร์ส" (`/page/manage-courses.html`)
   - สามารถสร้าง แก้ไข ลบคอร์ส, อัปโหลดวิดีโอ (หรือใส่ลิงก์ YouTube Embed), และจัดการข้อสอบ (Quiz & Video Stops) ของคอร์สตัวเองได้
3. **Admin (ผู้ดูแลระบบ)**:
   - สามารถเข้าถึงหน้า Admin Dashboards ทั้งหมด (`admin.html`, `admin-cms.html`, `admin-instructor-requests.html`, `admin-users.html`)
   - **ระบบคอร์ส**: มีสิทธิ์ Universal Bypass (สามารถกดรับใบ Certificate ของคอร์สใดก็ได้ทันทีโดยไม่ต้องสอบผ่าน)
   - **ระบบผู้ใช้**: สามารถแก้ไขรหัสผ่าน, แบน (Ban), และลบผู้ใช้งาน (Soft-Delete) คนอื่นได้
   - **ระบบเนื้อหา**: สามารถสร้างและลบข่าวสารกิจกรรม (Activity) ให้ไปโชว์ในปฏิทินและสไลด์ของหน้าบ้านได้

## 4. โครงสร้างฟีเจอร์หลัก (Key Features & API Workflows)

### 4.1. ระบบสมาชิก (Authentication)
- การเข้าสู่ระบบจัดการผ่าน `routes/auth.js`
- เมื่อสมัครสมาชิก ระบบจะสร้าง Verification Token และส่งอีเมลยืนยัน ผู้ใช้ต้องยืนยันอีเมลก่อนเข้าสู่ระบบ
- การล็อกอินจะตรวจสอบว่าผู้ใช้นั้นถูกแบน (`is_banned = 1`) หรือถูกลบ (`deleted_at IS NOT NULL`) หรือไม่

### 4.2. ระบบกิจกรรมและปฏิทิน (Activities & FullCalendar)
- Backend: `routes/activities.js`
- Frontend: `public/page/activity.html` + `public/js/activity-dynamic.js`
- แอดมินสามารถเพิ่มกิจกรรมได้จากหน้าเว็บโดยตรง หากกำหนด `start_date` และ `end_date` ข้อมูลจะถูกนำไปแสดงใน FullCalendar ทันที

### 4.3. ระบบผลงาน (Achievements & Portfolios)
- Backend: `routes/portfolios.js` และ `routes/achievements.js`
- หน้ารวม Achievements ดึงข้อมูลผู้ใช้ที่มีผลงานโดดเด่นมาโชว์ 
- ผู้ใช้แต่ละคนมี URL สำหรับโชว์ผลงานตัวเองแบบสาธารณะ `/api/portfolios/public/:id` โดยผู้ใช้สามารถอัปโหลดรูปภาพผลงาน (`portfolio_projects`) ของตัวเองได้ผ่าน `portfolio.html`

### 4.4. ระบบ Feed (Playground)
- Backend: `routes/posts.js`
- Frontend: `public/page/feed.html` + `public/js/feed.js`
- ผู้ใช้สามารถสร้างโพสต์ อัปโหลดรูปภาพ (หลายรูป) กด Like โพสต์ และคอมเมนต์โพสต์ได้ 

### 4.5. ระบบคอร์สเรียนและใบรับรอง (Courses, Interactive Videos, Certificates)
- Backend: `routes/courses.js`
- การเรียนคอร์สจะใช้ไฟล์ `course-player.html` (+ `course-player.js`) 
- **Interactive Video (จุดพักวิดีโอ)**: วิดีโอจะหยุดอัตโนมัติตามช่วงเวลาที่กำหนด (`course_video_stops`) และบังคับให้ผู้เรียนตอบคำถามให้ถูกก่อนถึงจะเรียนต่อได้
- **Quiz**: แบบทดสอบท้ายบทเรียน (`course_quiz_questions`) ระบบตรวจคะแนนคำนวณผ่าน API หากคะแนนผ่านเกณฑ์ จะทำการออกใบรับรองให้อัตโนมัติและเก็บลงตาราง `certificates`
- นักศึกษาสามารถ กด Like และ Comment ถามตอบในคอร์สเรียนได้ (`course_likes`, `course_comments`)

## 5. กฎระเบียบสำหรับ AI ในการพัฒนาต่อ (Rules for AI Agents)
1. **Never Rewrite**: ห้ามเขียนทับหรือรื้อโค้ดเดิมทั้งหมดเพื่อสร้างใหม่ ให้ใช้วิธีต่อยอดและแทรกโค้ด (Enhance and Fix) เท่านั้น
2. **Read First**: ก่อนแก้ไข UI หรือ Logic ใดๆ ให้ใช้คำสั่ง `cat` หรือ `grep` เพื่ออ่านไฟล์เดิมให้แน่ใจว่า Class หรือ ID ที่ใช้ตรงกัน (เช่น ตรวจสอบชื่อ ID ของ `<form>` และ `<section>`)
3. **Database Rules**: หากมีการเพิ่มหรือลดคอลัมน์ในฐานข้อมูล ต้องเอาคำสั่ง SQL นั้นไปต่อท้ายไฟล์ `database/schema.sql` เสมอ
4. **Thai Language**: หน้าตาเว็บ UI / ปุ่ม / การแจ้งเตือน (Alert, Error) ที่สื่อสารกับผู้ใช้งาน ต้องใช้ภาษาไทยทั้งหมด

### 4.6. ระบบเกียรติยศแห่งชมรม (Hall of Honor)
- **Concept:** แสดงรายชื่อและเชิดชูเกียรติบุคคลสำคัญของชมรม (ศิษย์เก่า/สมาชิกผลงานโดดเด่น)
- **Database:** ตาราง `honors` เก็บข้อมูลรายบุคคล (ชื่อ, รุ่น, ตำแหน่ง, ความสำเร็จ, รายละเอียด ฯลฯ)
- **Backend:** `routes/honors.js` (เพิ่มลงใน `server.js`)
- **Frontend (Public):** `public/page/honor.html` + `public/js/honor.js` + `public/css/honor.css` 
  - ออกแบบแบบ Responsive Grid Card (3 - 2 - 1)
  - มี Modal สำหรับแสดงประวัติอย่างละเอียด
- **Frontend (Admin):** `public/page/admin-honor.html` + `public/js/admin-honor.js`
  - ให้ Admin จัดการ (CRUD) ควบคุมการเผยแพร่ และจัดเรียงลำดับ (`display_order`)
  - ใช้ API อัปโหลดรูปภาพผ่าน `/api/upload` เดิมที่มีอยู่แล้ว

### 4.7. ระบบ Design System (Global UI/UX)
- **Concept:** ปรับปรุง UI/UX ทั้งเว็บไซต์ให้เป็นมาตรฐานเดียวกัน (Production-ready) เน้น Symmetry, Alignment, Spacing, Typography
- **Core CSS:** สร้างไฟล์ `public/css/global.css` เพื่อเป็นตัวควบคุม Design System หลัก (ใช้ CSS Variables แทนการ Hardcode สี และขนาด) 
  - *Typography*: Noto Sans Thai (มีการจำกัด Scale แบบ H1-H6)
  - *Spacing/Container*: ใช้ระบบ 8-point grid, ความกว้างสูงสุดของ Container คือ 1200px
  - *Components*: รวม Button, Forms, Input, Cards กลางให้หน้า Auth (`login`, `register`, `forget`) และหน้าอื่นๆ ดึงไปใช้
- **Responsive Images:** ทุกหน้า (Activity, Honor, Achievement, Works) ใช้ `aspect-ratio` ร่วมกับ `object-fit: cover` เพื่อไม่ให้รูปภาพเสียสัดส่วน 
- **Global Components:**
  - *Navbar*: ควบคุมด้วย `navbar.css` ผูกเข้ากับทุกไฟล์
  - *Footer*: ใช้ Snippet มาตรฐานแทรกไว้ก่อนจบ `</body>` ทุกไฟล์ 
  - *Auth Layout*: `auth-layout.css` สำหรับ Login, Register, Forget/Reset password แบบตรงกลางดูทันสมัย 
- **ห้ามทำลาย Backend:** โค้ด HTML, IDs ของฟอร์ม, การเรียกใช้ API และ Authentication คงเดิมทั้งหมด เพื่อไม่ให้ Logic ภายในเสีย

## 6. Authentication & OTP System
- **Login / Register**: 
  - Backend uses `bcryptjs` for password hashing.
  - Newly registered users have `is_verified = 0` and cannot log in.
- **OTP Verification**:
  - The system sends a 6-digit OTP code to the registered email.
  - Verification is done via `POST /api/auth/verify-otp` using JSON `{ "email": "...", "otp": "..." }`.
  - OTPs expire in 24 hours (tracked via `verify_token_expires`).
  - Resend OTP is handled via `POST /api/auth/resend-verify` which overrides the existing OTP.
