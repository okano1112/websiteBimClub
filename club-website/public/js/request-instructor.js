document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('requestForm');
    const facultyInput = document.getElementById('faculty');
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const submitBtn = document.getElementById('submitBtn');
    const statusBox = document.getElementById('statusBox');
    const formMessage = document.getElementById('formMessage');

    const statusText = {
        pending: 'คำขอของคุณอยู่ในสถานะรออนุมัติ ผู้ดูแลระบบจะตรวจสอบเร็วๆ นี้',
        approved: 'คำขอได้รับการอนุมัติแล้ว บัญชีของคุณเป็นอาจารย์',
        rejected: 'คำขอล่าสุดถูกปฏิเสธ คุณสามารถส่งคำขอใหม่ได้'
    };

    function showMessage(type, text) {
        formMessage.className = `request-message ${type}`;
        formMessage.textContent = text;
    }

    function renderStatus(request) {
        if (!request) {
            statusBox.style.display = 'none';
            return;
        }

        statusBox.style.display = 'block';
        statusBox.className = `request-status-box ${request.status}`;
        statusBox.textContent = statusText[request.status] || '';

        if (request.status === 'pending') {
            form.querySelectorAll('input').forEach((input) => { input.disabled = true; });
            submitBtn.disabled = true;
            submitBtn.textContent = 'รอการอนุมัติ';
        }
    }

    try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
            window.location.href = 'login.html';
            return;
        }

        const meData = await meRes.json();
        const user = meData.user;

        if (user.role !== 'user') {
            alert(user.role === 'instructor'
                ? 'บัญชีนี้เป็นอาจารย์อยู่แล้ว'
                : 'ผู้ดูแลระบบไม่ต้องขอสิทธิ์อาจารย์');
            window.location.href = '../index.html';
            return;
        }

        fullNameInput.value = user.fullName || user.full_name || '';
        phoneInput.value = user.phone || '';

        const requestRes = await fetch('/api/instructor-requests/me');
        const requestData = await requestRes.json();
        if (requestRes.ok && requestData.request) {
            facultyInput.value = requestData.request.faculty || '';
            fullNameInput.value = requestData.request.fullName || fullNameInput.value;
            phoneInput.value = requestData.request.phone || phoneInput.value;
            renderStatus(requestData.request);
        }
    } catch (error) {
        showMessage('error', 'โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังส่งคำขอ...';

        try {
            const res = await fetch('/api/instructor-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    faculty: facultyInput.value,
                    fullName: fullNameInput.value,
                    phone: phoneInput.value
                })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'ส่งคำขอไม่สำเร็จ');
            }

            showMessage('success', data.message);
            renderStatus(data.request);
        } catch (error) {
            showMessage('error', error.message || 'เกิดข้อผิดพลาด');
            submitBtn.disabled = false;
            submitBtn.textContent = 'ส่งคำขอ';
        }
    });
});
