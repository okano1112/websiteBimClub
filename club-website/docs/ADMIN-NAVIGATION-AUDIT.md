# ตรวจแถบบริหาร Admin และความสมเหตุผลของหน้าปลายทาง

วันที่ 18 กันยายน 2026 — ตรวจแบบอ่านอย่างเดียว ไม่เปลี่ยน source หรือข้อมูลจริง

## ข้อค้นพบที่ควรแก้

| ระดับ | ปัญหาและผลต่อผู้ใช้ | หลักฐาน | แนวทางแก้ |
|---|---|---|---|
| สูง | Reports/Settings ใน sidebar ดูเป็นฟังก์ชันพร้อมใช้ แต่รายงานใช้ข้อมูลตัวอย่าง, Export ไม่สร้างไฟล์ และ Settings ไม่เปลี่ยนระบบจริง แม้หน้าปลายทางมีป้าย MOCKUP | `public/js/system-sidebar-component.js:65`, `public/js/admin-reports.js:49`, `public/js/admin-system-settings.js:18` | แยกหมวดต้นแบบพร้อมป้ายตั้งแต่เมนู หรือซ่อนจากเมนูปฏิบัติงานจนทำงานจริง ไม่แสดง success จำลองใน flow จริง |
| กลาง | ไม่มีเมนูบุคลากรใน sidebar ทั้งที่ Dashboard มีทางลัดและมีหน้าใช้งานอยู่ เมื่อเข้าแล้วไม่มีเมนูใดแสดง current page | `system-sidebar-component.js` buildSections เทียบ `public/page/admin-dashboard.html` และ `admin-personnel.html` | เพิ่ม “ทีมงานปัจจุบัน” ใต้หมวดบุคลากร เชื่อมกับศิษย์เก่า/ตำแหน่งให้เข้าใจว่าเป็นข้อมูลคนละประเภท |
| กลาง | Hall of Honor / บุคคลเกียรติยศ ไม่ตรงกับการย้ายบุคลากรไป “ศิษย์เก่า” ที่พาเข้าหน้าเดียวกัน | `system-sidebar-component.js:74`, `public/page/admin-honor.html:24`, `public/js/admin-personnel.js` | ใช้ชื่อ “ศิษย์เก่า” ให้ตรงขอบเขตที่ตกลง หากจะมีเกียรติยศให้แยกเกณฑ์และหน้าที่ภายหลัง |
| กลาง | Profile พาไป portfolio.html ทำให้สับสนกับ profile.html; ไม่มีทางตรงไป Resume/CV ในเมนูนี้ | `system-sidebar-component.js:85` | เปลี่ยนชื่อเป็น “Portfolio ของฉัน” และเพิ่ม Resume/CV แยก; อย่าใช้ Profile แทนหลายประเภทเอกสาร |
| กลาง | Users กับ Members ดูซ้ำกันโดยไม่บอกขอบเขต: Members เป็นข้อมูลผู้ใช้ที่ไม่ใช่ admin และรวม instructor ไม่ใช่ทะเบียนสมาชิกชมรมแยก | `system-sidebar-component.js:59,62`, `src/routes/admin-users.js:33`, `public/js/admin-members.js:89` | อธิบาย Members ว่า “รายชื่อสมาชิกและอาจารย์”; ถ้าไม่มีงานต่างจาก Users มากพอ ใช้ saved filter/ทางลัดแทนเมนูหลักซ้ำ |
| กลาง | Content กับ Projects ต่างบอกว่า “ผลงาน” แต่ Content จัดการ achievements ทางการ ส่วน Projects เป็นโครงการและผู้ร่วมงาน | `system-sidebar-component.js:61,63`, `public/js/admin-cms.js:10` | ตั้งชื่อ “กิจกรรมและผลงานชมรม” / “โครงการสมาชิกและผู้ร่วมงาน” ให้รู้เจ้าของข้อมูลและแหล่งเผยแพร่ |
| กลาง | Dashboard “กิจกรรมล่าสุด” ไม่ได้แสดงรายการกิจกรรมหรือเวลา แสดงเพียงข้อความสถิติปัจจุบัน | `public/page/admin-dashboard.html:25`, `public/js/admin-dashboard.js:38` | เปลี่ยนเป็นหมายเหตุสถิติ หรือทำ activity log จริงพร้อมชนิดเหตุการณ์/เวลา/ผู้ดำเนินการ |
| กลาง | การ์ด “ผู้ใช้งาน” นับทุกแถวรวม soft-deleted ขณะที่ “ยังไม่ยืนยัน” ตัด soft-deleted ออก; ป้าย “ข้อมูลปัจจุบัน” ไม่อธิบายความต่าง และ “ผลงาน” นับเฉพาะ achievements ไม่รวม projects | `src/routes/admin-dashboard.js:10`, `public/js/admin-dashboard.js:22` | กำหนดนิยามแต่ละ metric และตั้งชื่อให้ตรง; แสดงจำนวนลบ/ระงับแยกหรืออธิบายการนับ |
| กลาง | Drawer ทำงานเหมือน modal (backdrop + lock scroll) แต่ไม่มี Tab focus trap/background inert; handler ดูเพียง Escape จึงไม่กัก keyboard focus ไว้ในเมนู | `system-sidebar-component.js` open/handleKeydown และ `public/css/system-sidebar.css` | เพิ่ม focus loop, ป้องกัน background focus และกำหนด dialog semantics ตามรูปแบบ พร้อมตรวจ focus return; เป็นข้อสรุปจากโค้ด ยังไม่ทดสอบ Tab จริงรอบนี้ |
| กลาง | หน้า personnel แสดงสถานะ “เผยแพร่/ซ่อน” แต่ไม่มี control แก้สถานะในฟอร์ม; เพิ่มใหม่ default เผยแพร่ทันที | `public/page/admin-personnel.html`, `public/js/admin-personnel.js:10`, `src/routes/team.js:31` | ให้ผู้ดูแลเลือกสถานะและเห็นผลก่อนบันทึก หรือระบุชัดว่าสร้างแล้วเผยแพร่ทันที; UPDATE ปัจจุบัน merge existing จึงไม่ได้สรุปว่าจะเปลี่ยนรายการซ่อนเป็นเผยแพร่ทุกครั้ง |
| ต่ำ | Administration / Operations แบ่งหมวดไม่ชัด: Users/Members อยู่หมวดแรก แต่คำขออาจารย์อยู่หมวดสอง; ชื่ออังกฤษนำในระบบภาษาไทย | `system-sidebar-component.js:56–91` | จัดตามงาน “ภาพรวม / ผู้ใช้งานและบุคลากร / เนื้อหาและการเรียน / ส่วนตัว” พร้อมชื่อไทยหลัก |
| กลาง | เมื่อ fetch Dashboard ล้มเหลวระดับ network ไม่มี outer catch; เมื่อ API ตอบ error จะแสดงข้อความแต่ไม่ล้าง loading ของสถิติ | `public/js/admin-dashboard.js:1–16` | จัด loading/error/empty ให้จบในแต่ละกรณี พร้อมปุ่มลองใหม่ ไม่ค้าง “กำลังโหลด” |

## โครงเมนูที่เสนอ

- ภาพรวม: Dashboard
- บัญชีและบุคลากร: ผู้ใช้งานและสิทธิ์, รายชื่อสมาชิก (หากยังจำเป็น), คำขออาจารย์, ทีมงานปัจจุบัน, ศิษย์เก่า, ตำแหน่งในทำเนียบ
- เนื้อหาและการเรียน: คอร์สเรียน, กิจกรรมและผลงานชมรม, โครงการสมาชิกและผู้ร่วมงาน, โพสต์ชุมชน
- ส่วนตัว: Portfolio, Resume/CV, ตั้งค่าบัญชี
- ต้นแบบ: รายงาน, ตั้งค่าระบบ — แสดงป้ายชัด หรือไม่แสดงในเมนูใช้งานจริง

Positions ควรอธิบายว่าเป็นตำแหน่งในทำเนียบ มิใช่สิทธิ์ User/Instructor/Admin; บุคลากรปัจจุบันยังกรอก role เป็นข้อความ จึงไม่ควรทำให้ผู้ใช้เข้าใจว่าการแก้ Positions จะเปลี่ยน role ของบุคลากรทุกคน

## สิ่งที่ตรวจแล้วไม่พบว่าเป็นลิงก์เสีย

ใช้ Node VM เรียก buildSections จาก component จริง: Admin 14 links, Instructor 3 links, User 3 links ทุกปลายทางมีไฟล์ HTML; Admin ไม่มี admin-personnel.html ตามที่รายงาน การมีไฟล์ไม่ยืนยันว่า API ทุกหน้าใช้งานได้

Dashboard/Users มี requireAdmin ฝั่ง server ที่ตรวจ ไม่พบเหตุให้สรุปจากการเห็นเมนูว่า bypass สิทธิ์ได้ รายงานนี้ไม่ใช่การตรวจความปลอดภัยหรือทดสอบ authorization ครบทุก endpoint

## ขอบเขตการตรวจและข้อจำกัด

ตรวจ source ของ sidebar/navbar/CSS, Dashboard, Users/Members, CMS, Personnel, Positions, Reports, System Settings และหน้าศิษย์เก่าที่เกี่ยวข้อง พร้อมเส้นทาง API ที่ใช้ประกอบข้อค้นพบ ไม่ได้กดบันทึก/ลบ/เปลี่ยน role จริง

เตรียม browser check แบบ mock API แล้ว แต่รันไม่ได้เพราะ container bimclub_app หยุดทำงาน จึงยังไม่ยืนยันภาพบนมือถือ/desktop, Tab behavior, HTTP 401/403 จริง หรือผลการกดปุ่มครบทุกหน้า ไม่มีการเริ่ม container หรือเปลี่ยนระบบแทนผู้ใช้

ลำดับแก้ที่แนะนำ: แยก mockup → ชื่อ/การจัดหมวดและเมนูที่หาย → metrics และสถานะที่ไม่ตรง → focus/error states → browser regression เมื่อแอปพร้อม
