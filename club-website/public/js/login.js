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

        currentEmail = ''; // Resolve the email only after the server validates the password.

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
                currentEmail = data.verificationEmail || '';
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
        resendVerifyBtn.addEventListener('click', () => {
            if (!currentEmail) return;
            sessionStorage.setItem('bimclub.pendingVerificationEmail', currentEmail);
            window.location.href = 'register.html#verify';
        });
    }
});
