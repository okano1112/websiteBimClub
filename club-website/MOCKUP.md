# Mockup Documentation

เอกสารนี้เป็น checklist สำหรับค้นหา แยก และถอด Mockup ก่อน Production Deployment

## Admin Dashboard

Location:

- `public/page/admin-dashboard.html`
- `public/js/admin-dashboard.js`
- `public/js/mock/admin-mock-data.js`
- `public/css/admin.css`

Mockup:

- Dashboard statistics
- Recent activity
- Quick links layout
- Loading, empty และ error state samples

Purpose:

ใช้ยืนยันโครงสร้างหน้า Dashboard และลำดับข้อมูลก่อนสร้าง aggregation API

Status: `MOCKUP`

Production action: `REPLACE WITH API`

- สร้าง admin-only dashboard service/API
- เปลี่ยนค่าจาก `BimClubAdminMockData.dashboard` เป็น response จริง
- ลบ marker และ badge `MOCKUP` หลังเชื่อมต่อและทดสอบสิทธิ์แล้ว

## Admin Reports

Location:

- `public/page/admin-reports.html`
- `public/js/admin-reports.js`
- `public/js/mock/admin-mock-data.js`

Mockup:

- Report table
- Search, category filter และ sort
- Pagination
- Export CSV feedback

Purpose:

ใช้ยืนยัน interaction ของหน้ารายงาน ขณะนี้ไม่มี analytics/report API

Status: `MOCKUP`

Production action: `REPLACE WITH API`

- กำหนด metric definition และ authorization ของรายงาน
- เชื่อม query/API จริง
- Implement export ที่สร้างไฟล์จากข้อมูลจริง

## Admin System Settings

Location:

- `public/page/admin-system-settings.html`
- `public/js/admin-system-settings.js`
- `public/js/mock/admin-mock-data.js`

Mockup:

- General settings form
- Email verification toggle
- Instructor request toggle
- Maintenance mode toggle
- Confirm, cancel และ success feedback

Purpose:

แยก System Settings ออกจาก Account Settings โดยยังไม่บันทึกค่าใดลงฐานข้อมูล

Status: `MOCKUP`

Production action: `REPLACE WITH DATABASE`

- ออกแบบ settings schema/config store
- เพิ่ม admin-only read/update API พร้อม validation และ audit log
- ห้ามนำค่าจาก mock form ไปใช้ควบคุม production จนกว่าจะมี backend enforcement

## Shared Admin Mock Data

Location: `public/js/mock/admin-mock-data.js`

Mockup:

- Dashboard statistics และ activity
- Report rows
- System setting defaults

Status: `MOCKUP DATA ONLY`

Production action: `REMOVE BEFORE PRODUCTION`

- ลบ script reference ออกจากทุกหน้าหลังเชื่อม API
- ลบไฟล์เมื่อไม่มี consumer เหลือ

## AI Chatbot Placeholder (existing)

Location: `public/js/auth.js`

Mockup:

- Floating chatbot button
- Coming Soon modal

Status: `MOCKUP`

Production action: `REMOVE BEFORE PRODUCTION` หรือ `REPLACE WITH API`

- ถ้ายังไม่มี chatbot service ให้ถอด button และ modal
- ถ้ามี service แล้ว ให้เพิ่ม authentication, privacy notice และ error handling ก่อนเปิดใช้

## Legacy Timeline Placeholder (existing)

Location: `public/page/timeline.html`

Mockup:

- ปีและข้อความ Lorem ipsum
- Generic `Title` entries

Status: `MOCKUP`

Production action: `REMOVE BEFORE PRODUCTION` หรือ `REPLACE WITH DATABASE`

- หน้าไม่ได้เชื่อมจาก navigation หลักในปัจจุบัน
- ลบหน้าเมื่อยืนยันว่าไม่ใช้ หรือเชื่อมข้อมูล timeline ที่ผ่านการอนุมัติแล้ว

## Development Seed Content (existing)

Location: `database/schema.sql`

Mockup:

- ตัวอย่างโพสต์ กิจกรรม และผลงาน

Status: `MOCKUP DATA ONLY`

Production action: `REMOVE BEFORE PRODUCTION`

- แยก seed สำหรับ development/test ออกจาก production migration
- ตรวจบัญชี `admin` และ `admin2` ที่ใช้รหัสผ่านเริ่มต้นที่ทราบอยู่แล้ว

## Search-term Review

รายการที่ค้นพบแต่ควร `KEEP IN PRODUCTION`:

- HTML `placeholder` ใน input/textarea เป็นข้อความช่วยกรอก ไม่ใช่ mock data
- CSS class เช่น avatar `placeholder` เป็น fallback UI
- ตัวแปร SQL `placeholders` ใน `routes/posts.js` และ `routes/courses.js` ใช้ parameterized query
- Mock objects ภายใน `node_modules` เป็น dependency test code และอยู่นอก source ที่ดูแล

## Pre-production Checklist

- [ ] ค้นหา `MOCKUP` แล้วจัดการทุกตำแหน่งในเอกสารนี้
- [ ] ค้นหา `mock`, `dummy`, `fake`, `test data`, `placeholder`, `coming soon`, `Lorem ipsum`
- [ ] Dashboard ใช้ admin-only API จริง
- [ ] Reports ใช้แหล่งข้อมูลและ metric definitions ที่อนุมัติแล้ว
- [ ] System Settings มี backend enforcement และ audit log
- [ ] ถอด `public/js/mock/admin-mock-data.js`
- [ ] ถอดหรือเชื่อม AI Chatbot จริง
- [ ] ถอดหรือแทนที่ Timeline placeholder
- [ ] ไม่ deploy development seed accounts/content
- [ ] เปลี่ยน Docker/SMTP/Database secrets เป็น secret management ของ environment
- [ ] เปิดและทดสอบ Content Security Policy ที่เข้ากับ assets/scripts จริง
- [ ] ทดสอบ Authentication, Authorization และ session invalidation ซ้ำ
