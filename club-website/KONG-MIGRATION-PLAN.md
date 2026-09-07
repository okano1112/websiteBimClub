# แผนประเมินการเปลี่ยน API Gateway จาก Nginx เป็น Kong

## สรุปสำหรับโปรเจกต์ปัจจุบัน

สามารถเปลี่ยนชั้น Gateway จาก Nginx เป็น Kong ได้ประมาณ **70–80% ของหน้าที่ Gateway** โดยไม่ต้องเขียน business logic ใหม่ แต่ไม่ควรย้าย logic ของสมาชิก, session, สิทธิ์ admin/instructor, คอร์ส หรือ MariaDB ไปไว้ใน Gateway

การแบ่งขอบเขตที่แนะนำ:

| ความรับผิดชอบ | ย้ายไป Kong ได้หรือไม่ | คำแนะนำ |
| --- | --- | --- |
| Reverse proxy ไป Express `app:3000` | ได้เต็มรูปแบบ | ใช้ Service/Route ของ Kong |
| TLS termination, header, CORS | ได้ | ย้ายทีละ policy แล้วทดสอบ |
| Rate limit / request size / IP policy | ได้ | ใช้ Kong plugins; คง validation ใน Express เป็นชั้นที่สอง |
| API key/JWT/OIDC สำหรับ public API | ได้ | ใช้เมื่อมี client ภายนอกจริง และออกแบบ consumer/token ก่อน |
| Login แบบ session cookie ปัจจุบัน | ไม่ควรย้ายในรอบแรก | ให้ Express และ MySQL session store เป็นเจ้าของต่อไป |
| Role/ownership เช่น admin หรือ instructor | ไม่ควรย้าย | ต้องตรวจจากฐานข้อมูลและ business rules ใน Express |
| Static HTML/CSS/JS และ `/uploads` | ทำได้ แต่ไม่ใช่จุดเด่นของ Kong | Nginx/CDN/object storage เหมาะกว่า |
| Load balancing หลาย app replicas | ได้ | เพิ่ม upstream/health checks หลัง app ทำงานแบบ stateless เพียงพอ |

## สิ่งที่พบจากระบบจริง

- Express รับ API ทั้งหมดใต้ `/api` และเสิร์ฟ static files กับ `/uploads` เอง
- มี `express-session` ใช้ `express-mysql-session`; session cookie จึงต้องส่งผ่าน gateway โดยไม่ถูก rewrite หรือ cache
- มี rate limit ใน Express อยู่แล้วสำหรับ authentication ควรคงไว้ก่อน เพื่อป้องกันการย้าย policy แล้วเกิดช่องว่าง
- Docker Compose ปัจจุบันมี app, MariaDB และ phpMyAdmin แต่ไม่มี service `nginx` ในไฟล์ compose
- พบ container ชื่อ `bimclub_nginx` ที่รันอยู่และ mount `nginx.conf` เดิม แต่ไฟล์ `nginx.conf` ไม่อยู่ใน working tree ปัจจุบัน จึงต้องกู้/ยืนยัน config เดิมก่อนตัดสินใจถอด Nginx

## Kong เทียบกับ Nginx

| ประเด็น | Nginx | Kong Gateway |
| --- | --- | --- |
| Reverse proxy และ static file | เบา, เร็ว, ตั้งค่าง่าย | ทำได้ แต่ซับซ้อนเกินความจำเป็นสำหรับ static file |
| API routing จำนวนไม่มาก | เหมาะมาก | ทำได้ แต่ต้องสร้าง Service/Route entities |
| Plugin rate limit, auth, CORS, transforms | ต้องเขียน config/module เพิ่ม | มี plugin สำเร็จรูปและ policy ระดับ route/service |
| การจัดการหลายทีม/หลาย API | ใช้ไฟล์ config และระบบภายนอก | มี Admin API, declarative config และ ecosystem ของ plugins |
| GitOps/config review | ทำได้ดีด้วยไฟล์ config | ทำได้ดีใน DB-less declarative mode |
| High availability | ต้องออกแบบเอง | มี topology สำหรับ control/data plane แต่เพิ่มองค์ประกอบระบบ |
| ทรัพยากรและ operational overhead | ต่ำ | สูงกว่า ต้องดูแล Kong และ plugin lifecycle |
| ค่าใช้จ่าย/ความเสี่ยงสำหรับเว็บนี้ | ต่ำสุด | คุ้มเมื่อมีหลาย client, หลาย service หรือ policy ซับซ้อน |

ข้อสรุปเชิงเลือกใช้: สำหรับ BimClub ที่มี Express service เดียวและยังไม่มีหลาย consumer, **Nginx เหมาะกว่าในระยะสั้น** ส่วน Kong จะคุ้มเมื่อเริ่มมี API หลายชุด, mobile/third-party clients, ต้องการ policy แบบรวมศูนย์, analytics หรือทีมหลายทีมดูแล API

## แนวทาง migration ที่ปลอดภัย

### Phase 0 — Inventory และ baseline

1. กู้ `nginx.conf` จากเครื่อง/volume/image เดิม และบันทึก behavior ของทุก route
2. เก็บ baseline response headers, cookie attributes, status code, upload size, timeout และ WebSocket (ถ้ามี)
3. เพิ่ม/ยืนยัน health endpoint ของ Express เช่น `GET /api/health`
4. ตรวจว่าไม่มี frontend เรียก Kong Admin API หรือเปิด Admin API ออกสู่สาธารณะ

### Phase 1 — Kong แบบ shadow/staging

1. เพิ่ม Kong container ใน compose เฉพาะ staging โดยให้ Kong proxy ไป `app:3000`
2. ใช้ DB-less declarative config สำหรับ single gateway instance และเก็บไฟล์ใน Git
3. สร้าง Service `bimclub-app` และ Route `/api` กับ route สำหรับหน้าเว็บตาม behavior เดิม
4. เริ่มจาก plugin ที่ไม่เปลี่ยน business behavior: correlation/request ID, security headers และ CORS ที่วัดผลได้
5. ทดสอบ login/logout, session cookie, course publish, YouTube URL, upload และ admin pages เทียบกับ Nginx

### Phase 2 — ย้าย policy ที่เหมาะกับ Gateway

1. ย้าย rate limit ของ endpoint เสี่ยง เช่น login, register, reset password และ upload ไป Kong แบบ conservative
2. คง rate limit ใน Express ไว้ก่อน แล้วค่อยลด/ถอดเมื่อมี metrics ยืนยันว่า policy ใหม่ครอบคลุม
3. ตั้ง request body/timeout ให้ upload ไม่ถูกตัดกลางทาง
4. ปิด cache สำหรับ `/api/*`, admin pages และ response ที่มี session; cache เฉพาะ static assets
5. เพิ่ม JWT/API-key เฉพาะเมื่อมี requirement จริง ไม่แทนที่ session cookie โดยอัตโนมัติ

### Phase 3 — Canary และ cutover

1. ให้ hostname staging ชี้ Kong และ production hostname ยังผ่าน Nginx
2. เปรียบเทียบ 4xx/5xx, latency, upload success, session failures และ DB load อย่างน้อย 24–72 ชั่วโมง
3. สลับ production traffic ด้วย DNS/Cloudflare Tunnel หรือ reverse proxy ทีละ hostname
4. เก็บ Nginx ไว้เป็น rollback path จนกว่าจะผ่าน monitoring window
5. Rollback โดยเปลี่ยน route กลับ Nginx และ reload gateway config โดยไม่แตะข้อมูล MariaDB

## รูปแบบ Kong ที่ควรเลือก

### DB-less (แนะนำสำหรับระยะแรก)

- ไม่เพิ่ม database ใหม่สำหรับ Kong
- เก็บ Service/Route/plugin ใน declarative YAML และ deploy พร้อม image
- เหมาะกับ gateway เดียวหรือจำนวน node น้อย
- Admin API เป็น read-only และ configuration อยู่ใน memory; ต้อง reload ทั้ง config เมื่อเปลี่ยน
- rate limiting แบบ cluster ต้องระวัง เพราะ state ไม่ได้ประสานกันทุก node; หากทำ HA ให้พิจารณา Redis หรือ topology อื่น

### Traditional / database-backed

- เหมาะเมื่อมีหลาย Kong nodes และต้องการ configuration/control plane กลาง
- ต้องเพิ่ม PostgreSQL สำหรับ Kong แยกจาก MariaDB ของแอป
- เพิ่มงานดูแล migration, backup, HA และ security
- ไม่ควรใช้ MariaDB ของ BimClub เป็น datastore ของ Kong โดยตรง

## เกณฑ์ตัดสินใจ

เลือก **คง Nginx** ถ้า:

- มี Express service เดียว
- ต้องการเพียง TLS, reverse proxy, static file และ basic rate limit
- ทีมต้องการ operational complexity ต่ำ

เลือก **เพิ่ม Kong (โดยอาจคง Nginx หน้า static/CDN)** ถ้า:

- มี API มากกว่าหนึ่ง service หรือมี mobile/partner clients
- ต้องการ auth/rate-limit/header policy แบบรวมศูนย์หลาย route
- ต้องการ consumer analytics, plugin ecosystem หรือการบริหาร API หลายทีม

## Definition of Done

- [ ] ทุก route เดิมตอบ status และ payload เทียบเท่า baseline
- [ ] session cookie, login/logout และ role guard ทำงานผ่าน Kong
- [ ] สร้าง/เผยแพร่คอร์สและฝัง YouTube ได้เหมือนเดิม
- [ ] upload รูป/วิดีโอไม่ timeout และไฟล์ยังคงอยู่หลัง restart
- [ ] Kong Admin API ไม่เปิด public และ secrets ไม่อยู่ใน Git
- [ ] มี dashboard/log/alert ของ Kong และ Express
- [ ] มี rollback ไป Nginx ที่ทดสอบแล้ว
- [ ] มีเอกสาร ownership ว่า policy อยู่ที่ Kong หรือ Express อย่างชัดเจน

## เอกสารอ้างอิง

- [Kong DB-less mode](https://developer.konghq.com/gateway/db-less-mode/)
- [Kong deployment topologies](https://developer.konghq.com/gateway/deployment-topologies/)
- [Kong Rate Limiting plugin](https://docs.konghq.com/hub/kong-inc/rate-limiting/)
- [Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
