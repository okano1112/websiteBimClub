// 1. นำเข้าเครื่องมือที่เรา npm install ไว้มาใช้งาน
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

// 2. สร้างตัวแปร app เพื่อเริ่มใช้งานเว็บเซิร์ฟเวอร์ Express
const app = express();

// 3. ตั้งค่าให้เซิร์ฟเวอร์อ่านข้อมูลจากฟอร์ม HTML ได้ และเปิดระบบ Session
app.use(express.urlencoded({ extended: true })); 
app.use(session({
    secret: 'secret-key-club', 
    resave: false,
    saveUninitialized: false
}));

// 4. อนุญาตให้ผู้ใช้ทั่วไปเข้าถึงไฟล์ในโฟลเดอร์ public ได้โดยตรง (เช่น รูปภาพ, css, หน้า index.html)
app.use(express.static(path.join(__dirname, 'public')));

// 5. ตั้งค่าเชื่อมต่อฐานข้อมูล MariaDB
const db = mysql.createPool({
    host: 'localhost',       
    user: 'root',            // ใส่ Username ของ MariaDB (ค่าเริ่มต้นคือ root)
    password: '',            // ใส่ Password (ถ้าใช้ XAMPP ปกติจะว่างไว้)
    database: 'club_database', // ชื่อฐานข้อมูลที่คุณสร้างเตรียมไว้
});

// 6. โค้ดส่วนระบบเข้าสู่ระบบ (Login)
app.post('/login', (req, res) => {
    const username = req.body.username; // ดึงชื่อผู้ใช้ที่กรอกจากฟอร์ม
    const password = req.body.password; // ดึงรหัสผ่านที่กรอกจากฟอร์ม

    // สั่งให้ฐานข้อมูลค้นหาชื่อผู้ใช้คนนี้
    db.query(`SELECT * FROM users WHERE username = ?`, [username], (err, results) => {
        if (err) throw err;
        
        // เช็คว่าเจอผู้ใช้ไหม และรหัสผ่านที่ถอดรหัสแล้วตรงกันไหม
        if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
            // ถ้าถูกต้อง ให้ประทับตรา Session ว่าล็อกอินแล้ว และส่งไปหน้าวิดีโอ (dashboard)
            req.session.loggedIn = true;
            res.redirect('/dashboard');
        } else {
            res.send("ชื่อผู้ใช้หรือรหัสผ่านผิด <a href='/'>กลับไปล็อกอิน</a>");
        }
    });
});

// 7. โค้ดส่วนหน้าวิดีโอที่ต้องล็อกอินก่อน (Protected Route)
app.get('/dashboard', (req, res) => {
    // เช็คว่ามีตราประทับ Session ว่า loggedIn หรือไม่
    if (req.session.loggedIn) {
        // ถ้ามี ให้ส่งไฟล์ dashboard.html ไปให้ดู
        res.sendFile(path.join(__dirname, 'protected', 'dashboard.html'));
    } else {
        // ถ้าไม่มี (แอบเข้า) ให้เตะกลับไปหน้าแรก
        res.redirect('/');
    }
});

// 8. สั่งให้เซิร์ฟเวอร์เริ่มทำงานและรอรับคำขอที่ช่องทาง (Port) 3000
app.listen(3000, () => {
    console.log("เซิร์ฟเวอร์เปิดทำงานแล้วที่ http://localhost:3000");
});