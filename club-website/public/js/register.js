document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('regError');
    const successDiv = document.getElementById('regSuccess');
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        errorDiv.textContent = 'รหัสผ่านไม่ตรงกัน';
        errorDiv.style.display = 'block';
        return;
    }

    const body = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        fullName: document.getElementById('fullName').value,
        password: password
    };

    const btn = document.querySelector('.register-submit');
    btn.textContent = 'กำลังสมัคร...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.success) {
            successDiv.innerHTML = `
                <strong>สมัครสมาชิกสำเร็จ!</strong><br>
                📧 กรุณาตรวจสอบอีเมล <strong>${body.email}</strong> เพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ<br>
                <span style="font-size:0.85rem; color:#666;">(ลิงก์ยืนยันจะหมดอายุใน 24 ชั่วโมง)</span>
            `;
            successDiv.style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        } else {
            errorDiv.textContent = data.message;
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        errorDiv.style.display = 'block';
    }

    btn.textContent = 'สมัครสมาชิก';
    btn.disabled = false;
});