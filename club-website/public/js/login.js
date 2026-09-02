document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginVerify = document.getElementById('loginVerify');
    const resendVerifyBtn = document.getElementById('resendVerifyBtn');
    
    if (!loginForm) return;

    let currentEmail = '';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loginError.classList.add('d-none');
        loginVerify.classList.add('d-none');
        
        // Use the username field as email (since the API expects email)
        // Or handle it if the user typed an email
        const identifier = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        currentEmail = identifier; // We assume they enter email here

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier, password })
            });
            const data = await res.json();
            
            if (data.success) {
                // Determine redirect path
                const role = data.user.role;
                if (role === 'admin' || role === 'instructor') {
                    window.location.href = 'admin-cms.html';
                } else {
                    window.location.href = '../index.html';
                }
            } else if (data.needVerify) {
                loginVerify.classList.remove('d-none');
                loginVerify.childNodes[0].textContent = data.message + ' ';
            } else {
                loginError.classList.remove('d-none');
                loginError.textContent = data.message;
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.classList.remove('d-none');
            loginError.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
        }
    });

    if (resendVerifyBtn) {
        resendVerifyBtn.addEventListener('click', async () => {
            if (!currentEmail) return;
            try {
                const res = await fetch('/api/auth/resend-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentEmail })
                });
                const data = await res.json();
                alert(data.message);
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการส่งอีเมล');
            }
        });
    }
});
