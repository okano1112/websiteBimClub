# BimClub — Production และ Enterprise readiness

ประเมินวันที่ 20 กันยายน 2026 จาก working tree ปัจจุบันและสถานะ Docker local แบบอ่านอย่างเดียว

## ผลตัดสิน

**ยังไม่ควรรับรองว่า Production-ready และยังไม่ถึงระดับ Enterprise-ready** มีพื้นฐานแอปที่ใช้งานได้หลายส่วน แต่หลักฐานเรื่อง deploy ที่ทำซ้ำได้, ความปลอดภัยของสื่อ/บัญชี, backup/recovery และการปฏิบัติการยังไม่ครบ คำตัดสินนี้ไม่ใช่ผล penetration test หรือใบรับรองมาตรฐาน

Production ในรายงานนี้หมายถึงเปิดให้กลุ่มเป้าหมายใช้งานจริงได้อย่างมีผู้ดูแล ข้อมูลกู้คืนได้ มีเกณฑ์คุณภาพและขั้นตอนรับเหตุ ส่วน Enterprise เพิ่มการกำกับสิทธิ์ ตรวจสอบย้อนหลัง ความต่อเนื่องบริการ และข้อกำหนดขององค์กร ไม่ได้แปลว่าต้องมี Kubernetes, microservices, JWT หรือ PostgreSQL เสมอไป

สถานะใช้ 3 แบบ: **มีหลักฐานในโค้ด**, **มีบางส่วน**, **ยังไม่พบหลักฐานในขอบเขตที่ตรวจ** การไม่พบใน repository ไม่ยืนยันว่าผู้ให้บริการภายนอกไม่ได้ทำไว้แล้ว

## สิ่งที่มีแล้ว

| ด้าน | หลักฐาน | ข้อจำกัด |
|---|---|---|
| Password hashing | bcryptjs cost 12 ใน auth/account/admin password flows | ยังต้องแก้ token/session lifecycle |
| Session ฝั่ง server | express-session + express-mysql-session; HttpOnly, SameSite=Lax, Secure ใน production; regenerate ตอน login | ไม่พบ revoke-all session เมื่อเปลี่ยนรหัสผ่าน |
| Role/บัญชีถูกระงับ | requireRole โหลดผู้ใช้ปัจจุบันจาก DB ตรวจ verified/banned/deleted; admin/user/instructor | ยังไม่ใช่ permission matrix ละเอียดหรือ audit trail ครบ |
| OTP | random code, digest, TTL, cooldown, attempt limit; row-lock flow | OTP ยืนยันอีเมลไม่ใช่ MFA สำหรับ Admin |
| Transaction/constraints | มี FK, unique และ transaction ในหลาย flow เช่น collaborators | ไม่ได้พิสูจน์ทุก write path และไม่ครอบคลุมไฟล์นอก DB |
| Image checks | จำกัด bytes/pixels, ตรวจ metadata ด้วย sharp และชื่อสุ่มจาก crypto | วิดีโอยังใช้วิธีต่างกันและต้องเข้มงวดเพิ่ม |
| Basic hardening | Helmet บางส่วน, parameterized queries หลายจุด, production error message, auth rate limit | CSP ถูกปิด; ยังไม่พบ CSRF/Origin checks เฉพาะ |
| Deploy พื้นฐาน | Dockerfile ใช้ npm ci/lockfile/non-root, production compose แยก, healthcheck DB/app | runtime version ไม่ตรง dependency และยังไม่มี recovery/release gate ครบ |
| QA | `node --test test/*.test.js` รอบนี้ผ่าน 62/62; มี browser QA scripts จากงานก่อน | หลาย test ใช้ mock หรืออ่าน source; ไม่ใช่ full E2E/โหลดจริง/DR |

## ต้องแก้หรือมีหลักฐานผ่านก่อนเปิด Production

| ID / ลำดับ | ช่องว่างและผลกระทบ | หลักฐาน | เกณฑ์ปิดงาน |
|---|---|---|---|
| P01 / เร่งด่วน | Docker runtime หมด support และไม่ตรง dependency | Dockerfile ใช้ node:20-alpine; lockfile Puppeteer 25.10.0 ระบุ Node >=22.12.0; Node 20 EOL ตามเอกสารทางการ | เลือก LTS ที่รองรับ, clean build จาก lockfile ผ่าน, login/upload/PDF smoke tests บน image จริง และบันทึก digest; ไม่สรุปว่า image build ต้อง fail เสมอเพราะ engine warning อาจไม่ fatal |
| P02 / เร่งด่วน | วิดีโอเชื่อ MIME จาก client และคงนามสกุลชื่อเดิม; ไฟล์อยู่ใต้ static origin เดียวกับแอป | `src/routes/upload.js:61–88`, `src/app.js:62` | ตรวจ signature/container ด้วยตัวตรวจที่เหมาะสม, ใช้นามสกุลจากชนิดที่ยืนยันแล้ว, quarantine ก่อนเผยแพร่, ทดสอบ spoofed MIME/active content/corrupt file/oversize ถูกปฏิเสธ; ไม่ได้อัปโหลด payload โจมตีในรอบนี้ |
| P03 / เร่งด่วน | ยังไม่มีหลักฐาน backup + continuous log archive + restore drill ที่ใช้งานได้ | compose ไม่มี backup/archive service; scripts ที่ตรวจมี QA/seed; เอกสารมีแผนแต่ไม่ใช่ผลการกู้ | กำหนด RPO/RTO, สำรอง DB และ uploads นอก host, restore/PITR บน instance แยกพร้อมวัดผลและทดสอบไฟล์เปิดได้ |
| P04 / เร่งด่วน | Reset token เก็บค่า raw และการ consume token เป็น SELECT แล้ว UPDATE ตาม user ID โดยไม่ lock/conditional token จึงมีช่องให้ concurrent requests ผ่านก่อน token ถูกล้าง | `src/routes/auth.js:198–204,250–269` | เก็บ token digest, consume แบบ atomic/transaction; ทดสอบใช้ token พร้อมกันสำเร็จเพียงครั้งเดียว, หมดอายุ/ใช้ซ้ำถูกปฏิเสธ |
| P05 / เร่งด่วน | ไม่พบ invalidate session ทั้งหมดหลังเปลี่ยน/รีเซ็ตรหัสผ่าน | account.controller updatePassword, user.model updatePassword, auth reset-password, admin-users password route | กำหนด session version หรือ revoke sessions; browser session เก่าถูกปฏิเสธตาม policy, รวม admin reset และการยกเลิก reset token เก่า |
| P06 / สูง | App/session DB connection default root; production compose ใช้ DB_PASSWORD เดียวกับ root และไม่มี bootstrap least-privilege user ให้เห็น | config/database.js, src/app.js:21, docker-compose.production.yml | app ใช้บัญชีจำกัดสิทธิ์จริง, migrations ใช้บัญชีแยก, ทดสอบ app user สั่ง DROP/GRANT ไม่ได้; ไม่ได้ตรวจ grant ใน DB จริง |
| P07 / สูง | CSP ปิด และยังไม่พบ CSRF token หรือ Origin/Fetch-Metadata policy สำหรับคำขอเปลี่ยนข้อมูล | src/app.js:17–19, routes ที่ตรวจ | ออกแบบการป้องกันที่เข้ากับ session cookie และ multipart upload, ทดสอบ cross-origin requests ถูกปฏิเสธโดยไม่ทำลาย flow; SameSite ช่วยลดความเสี่ยงแต่ไม่ใช้แทนหลักฐานครอบคลุม; ไม่ได้ยืนยัน exploit ทุก endpoint |
| P08 / สูง | ไม่มีหลักฐาน TLS/domain/proxy/SMTP production ที่ทดสอบจริง; APP_URL fallback เป็น localhost | production compose, CLOUDFLARE-DEPLOYMENT.md, config/mailer.js | HTTPS และ secure cookie ผ่านบนโดเมนจริง, trust proxy ตรง topology, reset link ถูกโดเมน, ส่งเมลรับได้จริง; ป้องกัน direct origin/debug access ตามรูปแบบติดตั้ง |
| P09 / สูง | Docker build context ไม่ตัด .env.* และ artifacts ที่อาจไม่ควรเข้า image | .dockerignore ตัด .env เท่านั้น; Dockerfile COPY . . | allowlist build contents หรือตัด secret variants/output/.git ตามจริง, ตรวจ image ไม่มี secrets/ข้อมูลทดสอบ; ไม่ได้เปิดอ่าน secret หรือยืนยันว่ามีไฟล์ลับรั่วอยู่จริง |
| P10 / สูง | ขาด migration runner/version/checksum/locking และผล rehearsal ที่ผูกกับ release | มี SQL แยกหลายชุด; schema.sql มี DROP TABLE และถูก mount เป็น init | schema init ใช้เฉพาะ DB ใหม่, upgrade ใช้ ordered migrations, dry run บน clone, schema เก่ารองรับ app rollback; init image ไม่รัน schema ซ้ำทุก restart ของ volume ที่มีข้อมูล |
| P11 / สูง | ยังไม่พบ recovery policy และ graceful shutdown ใน code/deployment นี้ | server.js มี listen อย่างเดียว; production compose ไม่มี restart policy; app local หยุด | drain HTTP/งาน, ปิด pool, timeout/failure recovery ชัด; ซ้อม app crash/SIGTERM แล้วไม่ทิ้งข้อมูลครึ่งงาน; healthcheck อย่างเดียวไม่รับประกัน restart |
| P12 / สูง | Logs ยังเป็น console; ไม่พบ metrics, request ID, alert routing, uptime monitor | errorHandler/config/mailer/services และ package ที่ตรวจ | structured/redacted logs, request correlation, p95/error/CPU/RAM/disk/pool/backup lag, แจ้งผู้รับผิดชอบเมื่อ app ตายหรือ disk เต็ม และซ้อมรับ alert |
| P13 / สูง | อัปโหลดไฟล์และบันทึก metadata แยกคำขอ ไม่มีทะเบียน lifecycle ครบ; uploads ทั้งหมดเป็น static public | upload routes, schema image_url/video_url, src/app.js:62 | media record มีเจ้าของ/key/checksum/state, เปิดเผยเมื่อพร้อม; งานตรวจ orphan, soft delete/versioning; ถ้ามีไฟล์ private/คอร์สจำกัดสิทธิ์ต้องตรวจสิทธิ์ดาวน์โหลดหรือ signed URL ไม่พึ่งซ่อนลิงก์ |
| P14 / สูง | ทรัพยากรงานหนักยังไม่ถูกควบคุมครบ | PDF เปิด Chromium ต่อคำขอ, image memoryStorage สูงสุด 10×5MB ต่อ request, video 200MB; rate limit เฉพาะ auth | bounded concurrency/queue/timeout, upload quota ต่อผู้ใช้/ระบบ, backpressure; โหลดหนักไม่ทำให้ login/อ่านหน้าเว็บล่ม |
| P15 / สูง | ยังไม่มี CI/release gate ที่ตรวจพบ; รายงานโหลดเก่าไม่มี raw file ตามพาธอ้างอิง | package scripts/test + ไม่มี CI workflow ในชุดไฟล์ที่ตรวจ; PERFORMANCE_TEST_REPORT.md | CI unit + real-DB integration + E2E + image scan + staging smoke; เก็บผลตาม commit/image; load/soak ด้วยข้อมูลใกล้จริงผ่าน SLO ที่ตกลง |
| P16 / สูง | Admin มีฟังก์ชันจำลองและ metric/ชื่อเมนูคลาดเคลื่อน | docs/ADMIN-NAVIGATION-AUDIT.md และ source reports/settings/dashboard | ซ่อน/แยกต้นแบบ หรือทำงานจริง; export/file, settings persistence, metric definitions และ navigation ผ่าน acceptance |

อ้างอิงด้าน runtime: [Node.js release status](https://nodejs.org/en/about/previous-releases). ด้าน upload และคำขอข้าม origin: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). ข้อเสนอในตารางเป็นการประยุกต์กับ source ที่ตรวจ ไม่ใช่ผลรับรอง OWASP

## Enterprise: สิ่งที่ยังต้องเพิ่มตามขอบเขตองค์กร

| ID | ความสามารถ | สถานะ/สิ่งที่ขาด | เกณฑ์ยอมรับ |
|---|---|---|---|
| E01 | MFA/SSO และ account lifecycle | มี email OTP แต่ไม่พบ Admin MFA, SSO OIDC/SAML, provisioning/deprovisioning | Admin ใช้ MFA พร้อม recovery; เพิ่ม SSO เมื่อองค์กรกำหนด, ถอนสิทธิ์พนักงาน/สมาชิกแล้ว session ถูกเพิกถอน |
| E02 | Audit trail ที่แก้ย้อนหลังไม่ได้โดยผู้ใช้ทั่วไป | ไม่พบ audit model/writer สำหรับ role change, delete/restore, publication, migration | เก็บ actor/action/target/time/outcome/request ID และ before-after เท่าที่จำเป็น หลีกเลี่ยงรหัสผ่าน/token; กำหนด retention/export/access |
| E03 | สิทธิ์ละเอียด/แยกหน้าที่ | มี 3 roles แต่ admin กว้าง; ไม่พบ permission policy ตามงาน/หน่วยงานและ approval ของงานเสี่ยง | กำหนดสิทธิ์เผยแพร่/อนุมัติ/จัดการผู้ใช้แยกเมื่อจำเป็น; ทดสอบห้ามเกินขอบเขตทุก API |
| E04 | HA และ disaster recovery | production compose หนึ่ง app/หนึ่ง DB; ยังไม่พบ replica/failover ที่ซ้อมแล้ว | ออกแบบตาม SLO, แยก failure domains, fencing/restore plan, ซ้อม host loss และตรวจ committed data; ไม่จำเป็นต้อง multi-region หากเป้าหมายไม่ต้องการ |
| E05 | การกำกับข้อมูลส่วนบุคคล | ไม่พบหน้า privacy/terms หรือ workflow retention/export/delete ครบในชุดที่ตรวจ; soft delete บางรายการไม่ใช่การลบตามนโยบายครบ | มีเจ้าของข้อมูล/data inventory/retention/access/export/delete ที่ครอบคลุมไฟล์และ backup; ให้องค์กรตรวจข้อกำหนดกฎหมายที่ใช้จริง รายงานนี้ไม่รับรอง compliance |
| E06 | Supply chain/release governance | มี lockfile/non-root แต่ไม่พบ SCA/SBOM/container scan/secret scan/signing และหลักฐาน patch SLA | ตรวจ dependency/image ตาม release, มีรายการช่องโหว่ที่ triage แล้ว/ข้อยกเว้นมีวันหมดอายุ, deploy artifact ที่ trace กลับ commit ได้ |
| E07 | Operations และ incident response | มี deployment guide แต่ไม่พบ SLO/error budget/on-call/incident exercise ที่ตรวจได้ | ระบุผู้รับผิดชอบ เวลารับเหตุ escalation/status communication/runbooks และ postmortem พร้อมซ้อม |
| E08 | Reliability ของ background jobs | SMTP เรียกตรง, PDF อยู่ใน request, ไม่พบ durable queue/outbox/retry/dead-letter | ใช้ durable job เมื่อธุรกิจต้องรับประกันการทำงาน, idempotent retries, ดูงานค้าง/ล้มเหลวและสั่ง retry ได้ |
| E09 | หลายองค์กร/tenant | ไม่พบ tenant model และการแยกข้อมูล | ทำเฉพาะถ้าจะรองรับหลายชมรม/มหาวิทยาลัยจริง; ต้องทดสอบข้าม tenant ไม่ได้ ไม่ใช่ requirement อัตโนมัติของเว็บชมรมเดียว |
| E10 | Product quality ระดับองค์กร | มี responsive QA บางส่วน แต่พบ focus/navigation gaps, ไม่มีหลักฐาน cross-browser/a11y ครบ | ทดสอบ journey หลักด้วย keyboard/screen reader/zoom/mobile และ browser ที่องค์กรรองรับ พร้อมแก้ loading/error/empty states |

## ผลตรวจรอบนี้และสิ่งที่ยังยืนยันไม่ได้

- `node --test test/*.test.js`: **62 tests ผ่าน, 0 fail** บน host ไม่ใช่ Docker production image; หลายข้อเป็น source assertions หรือ mock DB
- อ่าน lockfile ยืนยัน Puppeteer Node engine requirement; ไม่ได้รัน dependency vulnerability scan จึงไม่อ้าง CVE หรือบอกว่าปลอดช่องโหว่
- Docker local: `bimclub_app` Exited (137), `bimclub_db` Up/healthy, `bimclub_phpmyadmin` Up, `bimclub_nginx` Exited (127). Exit 137 ไม่พิสูจน์ OOM; ต้องดู OOMKilled/events/logs ก่อนสรุปสาเหตุ. สถานะนี้ไม่ใช่สถานะ production server
- ไม่ได้เริ่ม/รีสตาร์ต container, build/deploy, migrate, ทดลอง restore หรือกดเปลี่ยนข้อมูลจริง
- ไม่อ่าน .env, secrets, บัญชีหรือ uploads ของผู้ใช้; ไม่ตรวจระบบ Cloudflare/hosting/SMTP/backup ภายนอก
- ไม่ยืนยัน TLS, grants, binlog, uptime/SLO หรือความถูกต้องทุก transaction จาก source เพียงอย่างเดียว
- เอกสารเดิมที่ระบุ production-ready ไม่ใช้แทนผลทดสอบตาม commit/image ปัจจุบัน

## แผนปิดช่องว่างตามลำดับ

1. **ฐาน runtime และความเสี่ยงข้อมูล:** ปิด P01–P06, P09; ตรวจเหตุ app หยุด สร้าง image ที่รองรับจริง สำรองและซ้อม restore ก่อนแตะข้อมูล
2. **เปิดใช้งานอย่างควบคุม:** P07–P12/P16; บังคับ domain/secret/config ที่ถูกต้อง, migration/release rollback, monitoring และแยก mockup
3. **รองรับโหลดและสื่อ:** P13–P15; file lifecycle, queue/quota, real-DB/E2E/load/soak และ fail/retry scenarios
4. **Enterprise ตามความต้องการจริง:** E01–E08/E10; E09 เมื่อหลายองค์กรเป็น scope ที่ตกลงกัน

ทุกขั้นควรมี ticket ระบุผู้รับผิดชอบ, target environment, หลักฐานก่อน/หลัง, acceptance test และ rollback ไม่กำหนดวันเสร็จหรือ capacity โดยยังไม่ทราบทีม/งบ/โหลด

เสนอเป้าหมายเริ่มต้นสำหรับหารือ: disaster recovery RPO ≤ 5 นาที/RTO ≤ 60 นาที และ API ทั่วไป p95 ≤ 500ms ภายใต้ workload ที่กำหนด ต้องซ้อม/วัดก่อนใช้เป็น SLA จริง ดูแผนละเอียดใน `DATABASE-SCALING-AND-RECOVERY-ASSESSMENT.md`

## สิ่งที่ไม่จำเป็นต้องเปลี่ยนเพื่อให้ดูเป็น Enterprise

MariaDB, server-side session และ monolith ใช้ต่อได้หากผ่านเป้าหมายจริง การเพิ่ม JWT/CORS, เปลี่ยน PostgreSQL, ติดตั้ง Redis/Kubernetes หรือแตก microservices ไม่ได้ทำให้ข้อมูลถูกต้องหรือกู้คืนได้โดยอัตโนมัติ Object storage/queue/HA ควรเพิ่มเมื่อแก้ข้อจำกัดที่วัดได้หรือข้อกำหนดบริการต้องการ
