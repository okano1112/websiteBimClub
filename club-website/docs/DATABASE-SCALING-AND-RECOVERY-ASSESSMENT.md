# BimClub: ประเมิน MariaDB เทียบ PostgreSQL และแผนป้องกันข้อมูลสูญหาย

วันที่ประเมิน: 18 กันยายน 2026 — สถานะ: ข้อเสนอเพื่อวางแผน ยังไม่ได้ติดตั้งระบบ backup, migration หรือทดสอบโหลดใหม่

## ข้อเสนอสำหรับการตัดสินใจ

**ใช้ MariaDB ต่อสำหรับระบบปัจจุบัน และให้ความสำคัญกับ backup + PITR + การซ้อมกู้คืนก่อนย้ายฐานข้อมูล** ยังไม่มีหลักฐานว่า MariaDB เป็นข้อจำกัดด้านจำนวนผู้ใช้ การเปลี่ยน engine อย่างเดียวไม่แก้ปัญหา query, connection, ไฟล์อัปโหลด หรือการสร้าง PDF ที่กินทรัพยากร

ถ้าเริ่มระบบใหม่ หรือ roadmap ต้องค้นหา/กรองข้อมูล JSON ซับซ้อนมากขึ้น ให้ PostgreSQL เป็นตัวเลือกหลักสำหรับการทดลองเปรียบเทียบ เพราะมี JSONB และการทำดัชนีที่รองรับโดยตรง แต่สำหรับ BimClub ที่เขียนเสร็จแล้ว ต้องชั่งกับต้นทุนย้ายและความเสี่ยงข้อมูล ไม่ควรย้ายเพียงเพราะคาดว่าจะมีสมาชิกมากขึ้น [PostgreSQL JSON types](https://www.postgresql.org/docs/current/datatype-json.html)

คำแนะนำนี้เป็นข้อสรุปเชิงวิศวกรรมจากโค้ดที่ตรวจ ไม่ใช่ผล benchmark เปรียบเทียบสอง engine และไม่ใช่การรับประกัน capacity

## สิ่งที่ตรวจพบในโปรเจกต์

| หลักฐานใน repository | ผลต่อการขยายระบบ/กู้คืน |
|---|---|
| `docker-compose.yml`, `docker-compose.production.yml`: MariaDB 10.11, app และ DB อย่างละหนึ่ง service | รูปแบบ deployment ที่ให้มายังไม่มี standby/failover; หลาย container บน host เดียวไม่ใช่การแยกจุดเสียหาย |
| `config/database.js`: mysql2 pool จำกัด 10 connections ต่อ process | ไม่ใช่เพดานผู้ใช้ 10 คน; เพิ่ม app แล้ว connections รวมจะเพิ่ม ต้องนับ session pool และ worker ด้วย |
| `src/app.js`: express-mysql-session สร้าง store แยก, uploads เสิร์ฟจาก local filesystem | session ผูกกับ MySQL; ขยายหลาย host ต้องทำให้ไฟล์เห็นตรงกัน และประเมินภาระ session |
| `src/services/pdfRenderer.js`: เปิด Chromium ในการสร้าง PDF | PDF burst อาจใช้ CPU/RAM จน app ช้า ก่อน DB ถึงขีดจำกัด; ควรแยก worker และจำกัด concurrency |
| `src/routes/profiles.js`, `posts.js`, `courses.js`, `portfolios.js` | พบ `ON DUPLICATE KEY UPDATE`, `INSERT IGNORE`, placeholders `?`; ต้องแปลงและตรวจ semantics เมื่อต้องย้าย |
| `database/schema.sql` | มี AUTO_INCREMENT และ ENUM ต้องทำ schema mapping ไม่ใช่นำ SQL ไปรันข้าม engine ตรง ๆ |
| `CLOUDFLARE-DEPLOYMENT.md`, `CONTROLLED-DEVELOPMENT-PLAN.md` | มีแนวทาง backup/rollback แต่ใน compose/scripts ที่ตรวจยังไม่พบ scheduler backup, archive binlog หรือหลักฐาน restore drill |
| `../PERFORMANCE_TEST_REPORT.md` | มีรายงานโหลดเดิม แต่ไม่พบ `test/performance/results/raw-performance-results.json` ตามพาธอ้างอิง; ไม่รับรองข้อสรุป production-ready หรือจำนวนผู้ใช้จากเอกสารนี้ |

ขอบเขต: อ่าน source/config ที่อยู่ใน repository เท่านั้น ไม่อ่าน `.env` หรือข้อมูลสมาชิก ไม่ตรวจ runtime DB settings และ infrastructure ภายนอก ดังนั้น “ไม่พบในไฟล์ที่ตรวจ” ไม่เท่ากับ “ไม่มีในระบบจริง”

## เปรียบเทียบเพื่อเลือกฐานข้อมูล

| ประเด็น | MariaDB | PostgreSQL | ผลต่อ BimClub |
|---|---|---|---|
| ความเข้ากันได้ปัจจุบัน | ใช้ driver, SQL, session store เดิม | ต้องเปลี่ยน driver, SQL, session store, migrations และทดสอบข้อมูล | MariaDB มีต้นทุนและความเสี่ยงเปลี่ยนระบบต่ำกว่า |
| รองรับผู้ใช้จำนวนมาก | ต้องวัด workload/index/IO/locks | ต้องวัด workload/index/IO/locks เช่นกัน | ไม่มีตัวเลขสมาชิกสูงสุดตายตัวสำหรับ engine ใด |
| ขยายการอ่าน | ใช้ replica พร้อม routing และจัดการ lag | ใช้ read standby พร้อม routing และจัดการ lag | อ่านหลังเขียนและการตัดสินสิทธิ์ควรอยู่ primary จนมี consistency policy ที่พิสูจน์แล้ว |
| ขยายการเขียน | Galera รับเขียนหลาย node ได้ แต่ไม่เพิ่ม throughput แบบเส้นตรง; งานชนแถวเดียวกันยังเป็นข้อจำกัด | topology primary/standby ปกติเขียนที่ primary; แยก shard ต้องออกแบบเพิ่มเติม | ไม่เสนอ multi-writer/sharding เป็นขั้นแรก |
| ข้อมูลกึ่งโครงสร้าง | ใช้ต่อได้กับ model ปัจจุบัน; ต้องตรวจดัชนี/query ตามจริง | JSONB/indexing เป็นเหตุผลที่ดีสำหรับ PoC หาก roadmap ใช้หนัก | ไม่จำเป็นต้องย้ายเพราะเก็บ settings JSON เพียงอย่างเดียว |
| กู้ตามเวลา | physical backup ที่เตรียมพร้อมกู้ + binlog ต่อเนื่อง | base backup + WAL archive ต่อเนื่อง | ทั้งคู่ทำ PITR ได้เมื่อวางระบบไว้ก่อนเกิดเหตุ |
| Transaction rollback | ใช้กับ transaction ที่ยังไม่ commit; DDL หลายคำสั่ง implicit commit | transaction rollback มีประโยชน์ แต่ต้องตรวจข้อจำกัด DDL แต่ละคำสั่ง | rollback transaction ไม่ใช่ undo ประวัติข้อมูลหลัง commit |
| ค่าใช้จ่ายรวม | ค่าเครื่อง + replica + backup + คนดูแล | ค่าเครื่อง + replica + backup + คนดูแล + งานย้าย | ขอราคาจริงหลังเลือกผู้ให้บริการ/region/สเปก ไม่ใช้ราคาเดา |

อ้างอิง: [MariaDB PITR](https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/point-in-time-recovery-pitr-mariadb-backup), [Galera limitations](https://mariadb.com/docs/galera-cluster/reference/mariadb-galera-cluster-known-limitations), [PostgreSQL standby](https://www.postgresql.org/docs/current/warm-standby.html), [PostgreSQL PITR](https://www.postgresql.org/docs/current/continuous-archiving.html), [MariaDB implicit commit](https://mariadb.com/docs/server/reference/sql-statements/transactions/sql-statements-that-cause-an-implicit-commit), [PostgreSQL BEGIN](https://www.postgresql.org/docs/current/sql-begin.html)

## วิธีประเมินจำนวนผู้ใช้โดยไม่เดา capacity

ต้องแยกสมาชิกทั้งหมด, daily active users, ผู้ใช้ที่กำลังกดใช้งานพร้อมกัน, HTTP requests/second และ DB transactions/second ออกจากกัน ผู้ใช้หนึ่งคนไม่ได้เปิด DB connection ค้างหนึ่งเส้นเสมอไป

ตัวอย่างเพื่อวางโหลดเท่านั้น: ผู้ใช้ active พร้อมกัน 1,000 คน แต่ละคนทำหนึ่ง action ทุก 10 วินาที และหนึ่ง action เรียก API เฉลี่ย 3 ครั้ง จะได้ประมาณ 300 API requests/second; ถ้าแต่ละ API ใช้เฉลี่ย 4 queries จะได้ประมาณ 1,200 queries/second ก่อนคิด cache/background/session traffic ตัวเลขนี้ไม่ใช่ผลทดสอบ BimClub

แผนทดลองบน staging ที่แยกจาก production:

1. ใช้ข้อมูลสังเคราะห์ขนาดเล็ก/คาดการณ์จริง/สามเท่าของคาดการณ์ พร้อมการกระจายข้อมูลและความสัมพันธ์ใกล้จริง ห้ามวัดเฉพาะตารางว่าง
2. ใช้ flow ผสม: อ่าน feed/course/portfolio, login, เขียนโพสต์/like, บันทึกโครงการ/ผู้ร่วมงาน และ upload; ทดสอบ PDF burst แยกพร้อมวัดผลกระทบต่อ API
3. เพิ่มโหลดทีละขั้น เช่น 100 → 300 → 1,000 → 3,000 active simulated users พร้อม think time และ arrival rate ที่กำหนด; หยุดเมื่อเกินเกณฑ์ ไม่อ้างว่าขั้นสุดท้ายต้องผ่าน
4. เก็บ API p50/p95/p99, errors, achieved RPS, pool wait, slow queries, locks/deadlocks, CPU/RAM/disk latency, connection count, replica/archive lag และ PDF queue time
5. เกณฑ์เริ่มต้นเสนอ: API ทั่วไป p95 ≤ 500 ms, p99 ≤ 1.5 s, unexpected errors < 0.1%; แยก login/upload/PDF SLA, ตรวจความถูกต้องข้อมูลด้วย ไม่ดูเพียง HTTP 200
6. วัด steady state 30–60 นาที, soak 4–8 ชั่วโมง และ spike/failover; เก็บ raw results, dataset size, commit, hardware, DB/config และ timestamp UTC เพื่อทำซ้ำ
7. หากทดลอง PostgreSQL ให้ใช้ทรัพยากรและ durability ที่เทียบกันได้ แยกเครื่องยิงโหลด วัดทั้ง warm/cold cache และให้ทั้งคู่มี indexes ที่เหมาะสม ไม่ปิด fsync เพื่อให้ตัวเลขดูดี

จำนวน connections โดยประมาณ = app processes × pool ต่อ process + session pools + workers + jobs + monitoring/admin reserve ต้องคุมงบรวม ไม่เพิ่ม pool แบบไม่จำกัด

## ลำดับการ scaling ที่แนะนำ

| ขั้น | งานที่ควรทำ | หลักฐานก่อนขยับขั้น |
|---|---|---|
| 0: กู้คืนได้ | ตั้ง backup/PITR ทั้ง DB และไฟล์, dashboard/alerts, restore drill | กู้บนเครื่องแยกได้และวัด RPO/RTO ผ่าน |
| 1: ใช้เครื่องให้คุ้ม | ตรวจ query plans/index/N+1, จำกัด pagination, cache เฉพาะข้อมูลที่เหมาะสม, queue PDF | workload เป้าหมายผ่านโดยมี headroom ที่ตกลงกัน |
| 2: หลาย app | load balancer, app แบบไม่มีไฟล์เฉพาะเครื่อง, shared/versioned object storage, session store ที่ทุก instance ใช้ร่วมกัน, shared rate-limit policy | session/upload/job ไม่ผิดพลาดเมื่อสลับ instance |
| 3: DB ทนเสียหาย | primary + standby ต่าง failure domain, failover ที่มี fencing ป้องกัน primary สองตัว; read replica เฉพาะ endpoint ที่ยอมรับ lag | ซ้อม primary ล่มและตรวจ committed writes/duplicate retries |
| 4: ทบทวน engine | PoC PostgreSQL เมื่อมี feature requirement หรือ bottleneck ที่พิสูจน์แล้ว | เปรียบเทียบ latency/throughput/ค่าใช้จ่าย/ความถูกต้อง และ migration rehearsal ผ่าน |
| 5: ใหญ่เกินเครื่องเดียวจริง | พิจารณา partition/archive ก่อน shard; shard เฉพาะเมื่อหลักฐานชี้ว่าจำเป็น | กำหนด shard key, cross-shard transactions และ recovery ได้ |

Partitioning ช่วยจัดข้อมูลและบาง query แต่ไม่ใช่การกระจาย writes ไปหลายเครื่องโดยอัตโนมัติ [PostgreSQL partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)

## Rollback ต้องแยกเป็นสี่กรณี

| เหตุการณ์ | วิธีรับมือ | สิ่งที่วิธีนี้ไม่ช่วย |
|---|---|---|
| Transaction ทำงานไม่ครบก่อน commit | ROLLBACK บน connection เดียวกับ transaction และคืน connection | ย้อนรายการที่ commit ไปแล้ว หรือ email/file side effects |
| deploy โค้ดใหม่มีบั๊ก | ย้อน app image ไป version ก่อน พร้อม schema ที่เข้ากันได้ | ไม่ควรย้อน DB ทั้งก้อนแล้วทิ้งรายการใหม่ |
| migration/schema มีปัญหา | expand–migrate–contract และแก้ไปข้างหน้า; เก็บ field/table เก่าระหว่าง rollback window | down migration ที่ DROP column ไม่สามารถคืนค่าที่ลบได้ |
| ลบ/แก้ข้อมูลผิด, disk/host เสีย | PITR หรือ backup restore ไป instance แยก แล้วตรวจ/กู้คืน | replica ไม่ใช่ backup เพราะการลบผิดอาจตามไป replica ด้วย |

ตัวอย่าง: deploy ตอน 14:00 แล้วมีสมาชิกเพิ่มผลงานตอน 14:05 หากแอปมีบั๊กตอน 14:10 ให้ย้อนโค้ดโดยคงผลงาน 14:05 ไว้ การ restore DB กลับ 14:00 ทับทันทีจะทำให้รายการนั้นหาย

แนวทาง schema: เพิ่ม column/table ที่ optional → deploy code ที่รองรับทั้งเก่าและใหม่ → backfill ทีละชุดและตรวจผล → เปลี่ยนอ่าน → เฝ้าระวังผ่าน rollback window → ค่อยพิจารณาเอาของเก่าออก หากข้อมูลใหม่แปลงกลับ format เก่าไม่ได้ ต้องมี compatibility plan ก่อน release

## Backup/PITR ที่เสนอสำหรับ BimClub

**RPO** คือช่วงข้อมูลล่าสุดที่อาจสูญหายได้; **RTO** คือเวลาที่ใช้กู้บริการกลับมา ทั้งสองตัวเลขต่อไปนี้เป็นเป้าหมายเสนอ ต้องซ้อมก่อนรับรอง

| เป้าหมาย | ค่าเริ่มต้นเพื่อหารือ | วิธีวัด |
|---|---|---|
| ภัยพิบัติที่ต้อง restore | RPO ≤ 5 นาที, RTO ≤ 60 นาที | เวลา transaction ล่าสุดที่กู้ได้ เทียบเวลาจำลองเหตุ; จับเวลาจนแอปและไฟล์ใช้งานได้ |
| primary failover | RTO ≤ 5 นาที; RPO ขึ้นกับ replication/durability | จำลองเครื่อง primary หาย ตรวจรายการที่ตอบ success แล้ว |
| ย้อน app release | RTO ≤ 10 นาที โดยไม่ทิ้งข้อมูลใหม่ | ซ้อมสลับ image และทดสอบด้วยข้อมูลที่เกิดหลัง deploy |

ข้อเสนอการเก็บรักษา: physical/base backup ทุกวัน, continuous off-host log archive, PITR window 30 วัน, สำเนารายเดือน 6 เดือน โดยปรับตามต้นทุนและนโยบายข้อมูลส่วนบุคคล ต้องเก็บ base backup ที่ครอบคลุมจุดเริ่ม window และ log chain ที่จำเป็นครบ ไม่ลบตามอายุไฟล์แยกกันจนกู้ไม่ได้

- MariaDB ปัจจุบัน: เลือก `mariadb-backup` ที่เข้ากับ server, enable/เก็บ binlog ต่อเนื่องนอก host, บันทึกตำแหน่ง binlog/GTID กับ backup และทำ prepare ก่อน restore ตามคู่มือ [MariaDB PITR](https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/point-in-time-recovery-pitr-mariadb-backup)
- ถ้าใช้ PostgreSQL: ใช้ base backup + WAL archive ต่อเนื่อง; `pg_dump` อย่างเดียวไม่ใช่ฐานสำหรับ WAL PITR และ PITR แบบ physical กู้ระดับ cluster จึงต้องกู้แยกก่อนเลือกข้อมูลบางรายการกลับ [PostgreSQL PITR](https://www.postgresql.org/docs/current/continuous-archiving.html)
- เก็บ backup คนละ failure domain กับ production; มีสำเนาที่การลบจากบัญชีแอปทำลายไม่ได้, เข้ารหัสและทดสอบกุญแจถอดรหัส; Docker volume เดียวบน host เดิมไม่ใช่ backup
- เก็บ uploads/object versions พร้อม manifest เชื่อม DB record → object key/version/checksum; DB PITR ไม่คืนรูปหรือวิดีโอที่ลบจาก filesystem ให้เอง กำหนด retention ของไฟล์ให้ครอบคลุม recovery window และสำรองก่อน garbage collection
- เก็บ deployment image digest, migration version, configuration และวิธีกู้ secrets ในระบบจัดการที่เหมาะสม ไม่ใส่ secrets ใน Git หรือรายงาน
- alert เมื่อ backup ไม่สำเร็จ, log archive ขาด/ล่าช้าเกิน RPO, พื้นที่ใกล้เต็ม หรือ restore verification ล้มเหลว; ตรวจ checksum อย่างเดียวไม่พิสูจน์ว่ากู้แล้วแอปทำงาน
- ทุกเดือนซ้อม full restore + PITR สู่ instance ใหม่; ทุกไตรมาสซ้อม host loss/failover; ซ้อมใหม่หลังเปลี่ยน engine/version/ระบบจัดเก็บสำคัญ

ถ้าต้องการ RPO 0 สำหรับ committed transactions เมื่อ primary เครื่องหนึ่งเสีย ต้องออกแบบ synchronous durable replication ตาม failure model และยอมรับ write latency/availability trade-off; ไม่ใช่การรับประกันว่าไม่มีข้อมูลสูญหายทุกกรณี การลบผิดหรือทั้ง failure domains เสียพร้อมกันยังต้อง backup [PostgreSQL synchronous replication](https://www.postgresql.org/docs/current/warm-standby.html)

## Runbook เมื่อพบข้อมูลผิดหรือสูญหาย

1. จำกัด/หยุดเส้นทางเขียนที่ก่อปัญหา รวม worker; บันทึกเวลาระบบ UTC, deployment version และขอบเขตเหตุ หลีกเลี่ยง retry ที่ทำให้ข้อมูลผิดเพิ่ม
2. เก็บสภาพ DB/log/files ปัจจุบันไว้เพื่อสอบทาน ห้าม restore ทับทันที; หา recovery point ก่อนรายการผิดโดยตรวจ transaction boundary ไม่เดาเวลาจากหน้าจออย่างเดียว
3. สร้าง instance กู้คืนแยกเครือข่ายที่ไม่ส่งอีเมล/รัน background jobs แล้ว restore backup และ replay logs ถึงจุดเป้าหมาย
4. ตรวจจำนวนแถว, PK/FK, ความสัมพันธ์ project/collaborator, Thai text, permissions, course enrollment และไฟล์จริง พร้อมทดสอบ login/portfolio/PDF ด้วยชุดตรวจที่ควบคุม
5. ถ้าเสียเฉพาะบางรายการ ให้จัดทำ diff และกู้เฉพาะข้อมูลที่จำเป็น โดยตรวจ foreign keys และรายการใหม่ที่อ้างอิงกัน; ใช้ transaction และหลักฐานก่อน/หลัง ไม่เขียนทับข้อมูลที่แก้ถูกต้องหลังเหตุ
6. ถ้าต้องย้ายกลับทั้งระบบ ให้กำหนดวิธีรักษา/reconcile รายการที่ถูกต้องหลัง recovery point ก่อน switch; หยุด writers เดิมและป้องกัน split-brain
7. เปลี่ยนปลายทางแอป, invalidate cache ตามจำเป็น, ตรวจ session/สิทธิ์, เปิด traffic ทีละส่วน และติดตาม error/lag
8. บันทึก RPO/RTO จริง รายการที่กู้ได้/ไม่ได้ และแก้สาเหตุ; เริ่ม backup chain ของระบบที่กู้แล้วและตรวจว่ายัง recover ต่อได้

หากยังไม่เคยสำรองหรือ archive logs มาก่อน จะย้อนเวลากลับไปกู้จาก PITR ที่ไม่มีอยู่ไม่ได้

## หากตัดสินใจย้าย MariaDB → PostgreSQL

ทำเป็นโครงการแยกจาก UI โดยมีขอบเขตและ acceptance ชัดเจน:

1. Inventory ทุก query, migration, driver result เช่น insertId/affectedRows, error code, transaction/isolation/locking และ session store
2. Map AUTO_INCREMENT → identity/sequence, ENUM/boolean/date/time/JSON, unsigned ranges, collation/case sensitivity และ Thai sorting; ตรวจ unique email/username ไม่ให้ความหมายเปลี่ยน
3. แปลง upsert/INSERT IGNORE อย่างเจาะจง; ไม่แทนข้อความด้วย regex ทั้ง repository แล้วถือว่าเสร็จ
4. ย้าย fixture ไป PostgreSQL staging; ทดสอบ user/instructor/admin, OTP ครั้งเดียว, permissions, likes ซ้ำ, projects/collaborators, courses, Portfolio/PDF และไฟล์ครบ
5. Import rehearsal + reconcile counts/checksums/invariants รายตาราง แล้วทดสอบโหลดและ PITR/failover ในปลายทาง
6. Cutover แบบหยุดเขียนช่วงสั้นมีความซับซ้อนน้อยกว่า: ทำ initial copy → หยุด writers/jobs → final sync → ตรวจความตรงกันและตั้ง sequences → สลับ app → smoke test → เปิดเขียน
7. หากต้องลด downtime ด้วย CDC ต้องเลือกเครื่องมือและทดสอบ mapping/delete/schema changes/lag เพิ่ม; native replication ของ engine ไม่ใช่การย้ายข้าม engine ที่ได้มาฟรี
8. **จุดสำคัญของ rollback:** ก่อน PostgreSQL รับ writes ใหม่สามารถกลับ MariaDB ที่ยังเป็นปัจจุบันได้ง่ายกว่า; หลังเริ่มรับ writes ใหม่ ห้ามสลับกลับ MariaDB เก่าทันที ต้อง freeze แล้ว reverse-sync/reconcile ที่ซ้อมไว้ หรือแก้ต่อบน PostgreSQL การ dual-write แบบไม่มีระบบตรวจสอบไม่ใช่แผนป้องกันข้อมูลหาย
9. เก็บ MariaDB เดิมแบบ read-only พร้อม snapshot ตาม window ที่ตกลง; ห้ามมีสองระบบรับเขียนโดยไม่มี ownership ชัดเจน

## ข้อมูลที่ต้องกำหนดก่อนออกแบบติดตั้งจริง

- สมาชิกทั้งหมด/active พร้อมกันที่คาดใน 12–24 เดือน, ช่วงพีค และสัดส่วน read/write/PDF/upload
- ขนาด DB/ไฟล์ปัจจุบัน อัตราโต และขนาดไฟล์สูงสุด
- งบ infrastructure ต่อเดือน, ผู้ดูแลและช่วงเวลาที่พร้อมรับเหตุ
- hosting/region/failure domains และข้อจำกัดข้อมูลส่วนบุคคล
- RPO/RTO/downtime ที่ยอมรับได้จริง; เป้าหมายในรายงานยังไม่ได้รับรอง

ลำดับงานที่เสนอให้อนุมัติภายหลัง: กำหนด recovery targets → ตั้ง MariaDB backup/PITR และไฟล์ → ซ้อม restore → ทำ workload baseline → แก้คอขวด → จึงตัดสินใจว่าคุ้มย้าย PostgreSQL หรือไม่
