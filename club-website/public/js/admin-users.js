document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify Admin Role
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error('Not logged in');
        const data = await res.json();
        if (!data.user || data.user.role !== 'admin') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = '../index.html';
            return;
        }
    } catch (err) {
        window.location.href = 'login.html';
        return;
    }

    const usersList = document.getElementById('usersList');
    let allUsers = [];
    let selectedUserId = null;

    // Load Users
    async function loadUsers() {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                allUsers = data.users;
                renderUsers();
            } else {
                usersList.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">${data.message}</td></tr>`;
            }
        } catch (err) {
            console.error(err);
            usersList.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
        }
    }

    function renderUsers() {
        usersList.innerHTML = '';
        allUsers.forEach(user => {
            let roleBadge = '';
            if (user.role === 'admin') roleBadge = '<span class="badge admin">Admin</span>';
            else if (user.role === 'instructor') roleBadge = '<span class="badge instructor">Instructor</span>';
            else roleBadge = '<span class="badge user">User</span>';

            let statusBadges = [];
            if (user.is_banned) statusBadges.push('<span class="badge banned">ถูกแบน</span>');
            if (user.deleted_at) statusBadges.push('<span class="badge deleted">ถูกระงับ/ลบ</span>');
            if (statusBadges.length === 0) statusBadges.push('<span class="badge user">ปกติ</span>');

            let actionButtons = `<button class="action-btn btn-edit" onclick="openPasswordModal(${user.id}, '${user.username}')">เปลี่ยนรหัส</button>`;
            
            if (user.role !== 'admin') { // prevent admin doing this to themselves directly
                if (user.is_banned) {
                    actionButtons += `<button class="action-btn btn-unban" onclick="toggleBan(${user.id}, false)">ปลดแบน</button>`;
                } else {
                    actionButtons += `<button class="action-btn btn-ban" onclick="toggleBan(${user.id}, true)">แบนอีเมล</button>`;
                }

                if (user.deleted_at) {
                    actionButtons += `<button class="action-btn btn-restore" onclick="restoreUser(${user.id})">กู้คืนบัญชี</button>`;
                } else {
                    actionButtons += `<button class="action-btn btn-delete" onclick="deleteUser(${user.id})">ลบบัญชี</button>`;
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.full_name || '-'}</td>
                <td>${roleBadge}</td>
                <td>${statusBadges.join(' ')}</td>
                <td>${actionButtons}</td>
            `;
            usersList.appendChild(tr);
        });
    }

    // Export functions to global for inline onclick handlers
    window.toggleBan = async (id, isBanned) => {
        const confirmMsg = isBanned ? 'คุณแน่ใจหรือไม่ที่จะแบนผู้ใช้นี้? พวกเขาจะไม่สามารถล็อกอินได้' : 'ต้องการปลดแบนผู้ใช้นี้ใช่หรือไม่?';
        if (!confirm(confirmMsg)) return;
        
        try {
            const res = await fetch(`/api/admin/users/${id}/ban`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBanned })
            });
            const data = await res.json();
            alert(data.message);
            if (data.success) loadUsers();
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    window.deleteUser = async (id) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะระงับ/ลบบัญชีนี้ (Soft Delete)?')) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            alert(data.message);
            if (data.success) loadUsers();
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    window.restoreUser = async (id) => {
        if (!confirm('ต้องการกู้คืนบัญชีนี้ใช่หรือไม่?')) return;
        try {
            const res = await fetch(`/api/admin/users/${id}/restore`, { method: 'PUT' });
            const data = await res.json();
            alert(data.message);
            if (data.success) loadUsers();
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        }
    };

    // Password Modal Logic
    const modal = document.getElementById('passwordModal');
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    const newPasswordInput = document.getElementById('newPassword');

    window.openPasswordModal = (id, username) => {
        selectedUserId = id;
        document.getElementById('passwordModalUser').textContent = `ผู้ใช้: ${username}`;
        newPasswordInput.value = '';
        modal.style.display = 'block';
    };

    window.closeModal = () => {
        modal.style.display = 'none';
        selectedUserId = null;
    };

    savePasswordBtn.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value;
        if (newPassword.length < 6) {
            alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        savePasswordBtn.textContent = 'กำลังบันทึก...';
        savePasswordBtn.disabled = true;

        try {
            const res = await fetch(`/api/admin/users/${selectedUserId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            alert(data.message);
            if (data.success) closeModal();
        } catch (err) {
            alert('เกิดข้อผิดพลาด');
        } finally {
            savePasswordBtn.textContent = 'บันทึก';
            savePasswordBtn.disabled = false;
        }
    });

    // Close modal when click outside
    window.onclick = (e) => {
        if (e.target == modal) closeModal();
    };

    loadUsers();
});
