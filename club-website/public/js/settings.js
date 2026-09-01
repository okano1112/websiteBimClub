document.addEventListener('DOMContentLoaded', async () => {
    const roleLabels = {
        user: 'ผู้ใช้ทั่วไป',
        instructor: 'อาจารย์',
        admin: 'ผู้ดูแลระบบ'
    };

    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const profileMessage = document.getElementById('profileMessage');
    const passwordMessage = document.getElementById('passwordMessage');
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const avatarFileInput = document.getElementById('avatarFile');
    const avatarPreview = document.getElementById('avatarPreview');
    const settingsRole = document.getElementById('settingsRole');

    let currentAvatarUrl = '';

    function showMessage(element, type, message) {
        element.className = `settings-message ${type}`;
        element.textContent = message;
    }

    function renderAvatar(userName, avatarUrl) {
        avatarPreview.innerHTML = '';
        if (avatarUrl) {
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'รูปโปรไฟล์';
            avatarPreview.appendChild(img);
            return;
        }
        avatarPreview.textContent = (userName || 'U').charAt(0).toUpperCase();
    }

    async function loadProfile() {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = 'login.html';
            return;
        }

        const data = await res.json();
        const user = data.user;
        const userName = user.fullName || user.full_name || user.username || '';
        currentAvatarUrl = user.avatarUrl || user.avatar_url || '';

        fullNameInput.value = userName;
        phoneInput.value = user.phone || '';
        settingsRole.textContent = `สถานะบัญชี: ${user.roleLabel || roleLabels[user.role] || roleLabels.user}`;
        renderAvatar(userName, currentAvatarUrl);
    }

    avatarFileInput.addEventListener('change', () => {
        const file = avatarFileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            renderAvatar(fullNameInput.value, event.target.result);
        };
        reader.readAsDataURL(file);
    });

    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const btn = profileForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'กำลังบันทึก...';

        try {
            let avatarUrl = currentAvatarUrl;
            const file = avatarFileInput.files[0];

            if (file) {
                const formData = new FormData();
                formData.append('images', file);
                const uploadRes = await fetch('/api/upload/images', {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok || !uploadData.success) {
                    throw new Error(uploadData.message || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
                }
                avatarUrl = uploadData.urls[0];
            }

            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullNameInput.value,
                    phone: phoneInput.value,
                    avatarUrl
                })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ');
            }

            currentAvatarUrl = data.user.avatarUrl || data.user.avatar_url || '';
            avatarFileInput.value = '';
            renderAvatar(data.user.fullName || data.user.full_name, currentAvatarUrl);
            showMessage(profileMessage, 'success', data.message);
        } catch (error) {
            showMessage(profileMessage, 'error', error.message || 'เกิดข้อผิดพลาด');
        } finally {
            btn.disabled = false;
            btn.textContent = 'บันทึกข้อมูลโปรไฟล์';
        }
    });

    loadProfile();
});
