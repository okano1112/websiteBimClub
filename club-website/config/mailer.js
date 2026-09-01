const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true สำหรับ port 465
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

/**
 * ส่งอีเมล
 * @param {string} to - อีเมลผู้รับ
 * @param {string} subject - หัวข้อ
 * @param {string} html - เนื้อหา HTML
 */
async function sendMail(to, subject, html) {
    const mailOptions = {
        from: `"BimClub" <${process.env.SMTP_USER || 'noreply@bimclub.com'}>`,
        to,
        subject,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('----------------------------------------------------');
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        
        // ถ้าใช้ Ethereal (สำหรับทดสอบ) ให้แสดงลิงก์เปิดดูอีเมลจำลอง
        if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('ethereal')) {
            console.log('👀 Preview URL (Ethereal):', nodemailer.getTestMessageUrl(info));
        }
        console.log('----------------------------------------------------');
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า SMTP หรือลองใหม่ภายหลัง');
    }
}

module.exports = { sendMail };
