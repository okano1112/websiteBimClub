# แผนนำ BimClub ขึ้น Production ผ่าน Cloudflare

สถานะเอกสาร: แผนเตรียมพร้อมสำหรับ deployment จริง (ยังไม่ได้เชื่อมบัญชีหรือโดเมน Cloudflare)

## 1. สถาปัตยกรรมที่แนะนำ

โปรเจกต์นี้เป็น Express ที่ต้องมี process ทำงานตลอดเวลา และใช้ MariaDB, session ในฐานข้อมูล และไฟล์อัปโหลดแบบถาวร จึงควรรันชุด Docker บน VPS/VM ก่อน แล้วใช้ Cloudflare Tunnel เป็นทางเข้าจากอินเทอร์เน็ต

```text
ผู้ใช้ (HTTPS)
      |
Cloudflare DNS / CDN / WAF
      |
Cloudflare Tunnel (outbound connection)
      |
Docker network บน VPS
      +-- app:3000 (Express)
      +-- db:3306 (MariaDB, private only)
      +-- persistent volumes (database + uploads)
```

ข้อดีของรูปแบบนี้คือไม่ต้องเปิด port `3000`, `3306` หรือ `8080` สู่สาธารณะ และไม่เปิดเผย origin IP ผ่าน DNS ของเว็บไซต์ โดย Cloudflare แนะนำ remotely-managed tunnel สำหรับงาน Docker

ทางเลือกสำรองคือใช้ DNS แบบ Proxied ชี้ไปยัง public IP ของ VPS และให้ reverse proxy ที่ origin รับ HTTPS บน port 443 วิธีนี้ต้องติดตั้งใบรับรองที่ origin และตั้ง SSL/TLS เป็น `Full (strict)`

## 2. ประเด็นที่ต้องแก้ก่อน Production

จากการตรวจ `docker-compose.yml` ปัจจุบัน พบค่าที่เหมาะสำหรับ local development แต่ห้ามนำขึ้น production ตรง ๆ:

| จุดปัจจุบัน | ความเสี่ยง | สิ่งที่ต้องทำ |
| --- | --- | --- |
| DB password, session secret และ SMTP credential อยู่ใน compose | secret รั่วผ่าน repository/image/history | ย้ายไป production environment หรือ Docker secrets และหมุนค่าเดิมทั้งหมด |
| MariaDB เปิด host port `3306` | ฐานข้อมูลถูกเข้าถึงจากภายนอก | เอา `ports` ของ `db` ออก ใช้เฉพาะ Docker private network |
| phpMyAdmin เปิด port `8080` | เพิ่มพื้นผิวโจมตี | ไม่รันใน production หรือป้องกันด้วย Cloudflare Access และไม่ publish port |
| Express เปิด host port `3000` | ข้าม Cloudflare ไปหา origin ได้ | เมื่อใช้ Tunnel ให้ใช้ `expose` ภายใน Docker network แทน `ports` |
| `APP_URL=http://localhost:3000` | ลิงก์ reset password ผิดโดเมน | ตั้งเป็น `https://<production-domain>` |
| SMTP เป็น Ethereal | ส่งอีเมลถึงผู้ใช้จริงไม่ได้ | ใช้ SMTP provider จริง พร้อม SPF/DKIM/DMARC |
| bind mount `./uploads` | สำรอง/ย้ายเครื่องไม่เป็นระบบ | ใช้ named volume หรือ object storage พร้อม backup policy |
| image ติดตั้งด้วย `npm install` | build ไม่แน่นอนเท่า lockfile | เปลี่ยน production Dockerfile เป็น `npm ci --omit=dev` |

ค่าขั้นต่ำที่ต้องมีใน production environment:

```dotenv
NODE_ENV=production
PORT=3000
APP_URL=https://<production-domain>
DB_HOST=db
DB_PORT=3306
DB_NAME=club_database
DB_USER=<non-root-app-user>
DB_PASSWORD=<generated-strong-password>
SESSION_SECRET=<generated-random-secret-at-least-32-bytes>
SMTP_HOST=<production-smtp-host>
SMTP_PORT=587
SMTP_USER=<production-smtp-user>
SMTP_PASS=<production-smtp-password>
CLOUDFLARE_TUNNEL_TOKEN=<token-from-cloudflare-dashboard>
```

ห้าม commit ไฟล์ environment จริงหรือ Tunnel token เข้า Git

## 3. ขั้นตอนดำเนินงาน

### Phase A — เตรียม origin server

1. เลือก VPS/VM ที่ติดตั้ง Docker Engine และ Docker Compose ได้
2. สร้าง Linux user สำหรับ deployment และจำกัดสิทธิ์ SSH
3. ติดตั้ง firewall ให้อนุญาตเฉพาะ SSH จาก IP ที่กำหนด; เมื่อใช้ Tunnel ไม่ต้องเปิด inbound web port
4. สร้าง production compose แยกจาก local compose
5. สร้าง MariaDB app user ที่ไม่ใช่ `root`
6. เตรียม persistent volume สำหรับ MariaDB และ uploads
7. ตั้ง backup อัตโนมัติรายวัน พร้อมทดสอบ restore
8. เพิ่ม health check ของ Express เช่น `GET /api/health`

### Phase B — เตรียม Cloudflare

1. เพิ่มโดเมนเข้า Cloudflare และเปลี่ยน nameserver ที่ registrar
2. เปิด Cloudflare Zero Trust แล้วสร้าง remotely-managed Tunnel
3. เพิ่ม `cloudflared` เป็น container ใน production compose โดยรับ token ผ่าน environment/secret
4. กำหนด Public Hostname เช่น `bimclub.example.com` ให้ชี้ service ไปที่ `http://app:3000`
5. หากต้องการทั้ง apex และ `www` ให้เลือก hostname หลักหนึ่งตัวและ redirect อีกตัวไป hostname หลัก
6. เปิด `Always Use HTTPS`; เปิด HSTS หลังตรวจทุก subdomain และ HTTPS ผ่านครบแล้วเท่านั้น

ตัวอย่าง service ที่จะใช้ใน production compose (ใส่ token ตอน deploy ไม่ใส่ในไฟล์):

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  restart: unless-stopped
  command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
  depends_on:
    app:
      condition: service_healthy
```

### Phase C — Security และ Cache Rules

1. เปิด Cloudflare managed protections ที่มีใน plan
2. ทำ rate limit สำหรับ login, register, reset password และ upload เพิ่มจาก rate limit ใน Express
3. ไม่ cache path ที่มีข้อมูลผู้ใช้หรือ session ได้แก่ `/api/*`, `/page/admin-*`, `/page/settings.html`, `/page/course-editor.html`
4. cache เฉพาะ static asset ที่ version ได้ เช่น CSS, JS, font และรูป public
5. จำกัดขนาดและชนิดไฟล์ upload ทั้งที่ Cloudflare และ Express
6. หากคง phpMyAdmin ไว้ ให้ใช้ hostname แยกและบังคับ Cloudflare Access; ไม่เปิดสู่ public โดยตรง

### Phase D — Deploy และตรวจรับ

1. สำรองฐานข้อมูลและ uploads ก่อน deploy
2. build image จาก commit/tag ที่ระบุได้
3. รัน database migration ก่อนสลับ traffic
4. เปิด staging hostname และรัน smoke test ทั้ง desktop/mobile
5. สลับ production hostname เข้า Tunnel
6. ตรวจ log ของ app, MariaDB และ Tunnel รวมถึง HTTP 4xx/5xx
7. เก็บ image/tag ก่อนหน้าไว้อย่างน้อยหนึ่งรุ่นสำหรับ rollback

## 4. Production acceptance checklist

- [ ] หน้าแรก, สมัครสมาชิก, login/logout และ session ผ่าน HTTPS ทำงาน
- [ ] Admin สร้าง แก้ไข เผยแพร่ และยกเลิกเผยแพร่คอร์สได้
- [ ] คอร์สที่เผยแพร่ปรากฏที่ `/page/courses.html`
- [ ] YouTube URL แบบ `watch`, `youtu.be`, `shorts` และ `embed` แสดงในหน้าผู้เรียน
- [ ] ทดสอบวิดีโอที่เจ้าของอนุญาตให้ embed; วิดีโอที่ปิด embed ต้องแสดงข้อผิดพลาดที่เข้าใจได้
- [ ] Upload รูป/วิดีโอแล้วไฟล์ยังอยู่หลัง restart container
- [ ] Password reset สร้างลิงก์ production domain และส่งอีเมลถึงกล่องจริง
- [ ] ไม่มี port `3000`, `3306`, `8080` เข้าถึงได้จาก public Internet
- [ ] `/api/*` และหน้า admin ไม่ถูก Cloudflare cache
- [ ] Backup และ restore ฐานข้อมูล/ไฟล์ผ่านการทดสอบ
- [ ] Rollback ไป image รุ่นก่อนหน้าผ่านการทดสอบ

## 5. ข้อมูลที่ต้องได้รับก่อนเริ่มเชื่อมจริง

- ชื่อโดเมนและสิทธิ์เข้าถึง registrar/Cloudflare account
- VPS/VM ที่จะใช้เป็น origin และระบบปฏิบัติการ
- production SMTP provider และชื่ออีเมลผู้ส่ง
- ปลายทางเก็บ backup
- hostname ที่ต้องการ เช่น apex domain, `www` หรือ `app`
- ระยะเวลาที่อนุญาตให้หยุดระบบระหว่างย้ายข้อมูล

## 6. เอกสารอ้างอิง

- [Cloudflare: Update cloudflared / Docker tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/update-cloudflared/)
- [Cloudflare: DNS proxy status](https://developers.cloudflare.com/dns/proxy-status/)
- [Cloudflare: Full (strict) SSL/TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [YouTube IFrame Player API errors](https://developers.google.com/youtube/iframe_api_reference)
