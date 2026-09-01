document.addEventListener('DOMContentLoaded', async () => {
    // Basic Auth Check
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.user || data.user.role !== 'admin') {
            window.location.href = '../index.html';
            return;
        }
    } catch (err) {
        window.location.href = 'login.html';
        return;
    }

    const tbody = document.getElementById('honorTableBody');
    const modal = document.getElementById('honorModal');
    const form = document.getElementById('honorForm');
    const btnAdd = document.getElementById('btnAdd');
    const btnCancel = document.getElementById('btnCancel');
    const btnSave = document.getElementById('btnSave');
    const imgInput = document.getElementById('profileImageFile');
    const imgPreview = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('previewContainer');
    const hiddenImg = document.getElementById('profileImage');
    
    let currentId = null;

    async function loadHonors() {
        try {
            const res = await fetch('/api/honors/admin');
            const data = await res.json();
            if (data.success) {
                renderTable(data.honors);
            } else {
                tbody.innerHTML = '<tr><td colspan="7">ดึงข้อมูลไม่สำเร็จ</td></tr>';
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="7">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        }
    }

    function renderTable(list) {
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">ไม่มีข้อมูล</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(item => `
            <tr>
                <td>
                    <img src="${item.profile_image || '../../../assets/img/default-avatar.png'}" class="profile-img-preview" alt="Profile">
                </td>
                <td>
                    <strong>${item.name}</strong>
                    ${item.nickname ? `<br><small class="text-gray-500">(${item.nickname})</small>` : ''}
                </td>
                <td>${item.generation || '-'}</td>
                <td>${item.position || '-'}</td>
                <td>${item.display_order}</td>
                <td>
                    <span class="badge ${item.is_published ? 'published' : 'hidden'}">
                        ${item.is_published ? 'เผยแพร่' : 'ซ่อน'}
                    </span>
                </td>
                <td>
                    <button class="action-btn btn-edit" onclick="editHonor(${item.id})">แก้ไข</button>
                    <button class="action-btn btn-delete" onclick="deleteHonor(${item.id})">ลบ</button>
                </td>
            </tr>
        `).join('');
    }

    imgInput.addEventListener('change', async (e) => {
        if (e.target.files.length === 0) return;
        const fd = new FormData();
        fd.append('images', e.target.files[0]);
        btnSave.disabled = true;
        btnSave.textContent = 'กำลังอัปโหลด...';
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success && data.urls.length > 0) {
                hiddenImg.value = data.urls[0];
                imgPreview.src = data.urls[0];
                previewContainer.style.display = 'block';
            }
        } catch (error) {
            alert('อัปโหลดรูปล้มเหลว');
        }
        btnSave.disabled = false;
        btnSave.textContent = 'บันทึก';
    });

    btnAdd.addEventListener('click', () => {
        currentId = null;
        form.reset();
        document.getElementById('modalTitle').textContent = 'เพิ่มบุคคลเกียรติยศ';
        hiddenImg.value = '';
        previewContainer.style.display = 'none';
        modal.style.display = 'block';
    });

    btnCancel.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSave.disabled = true;
        btnSave.textContent = 'กำลังบันทึก...';
        
        const payload = {
            name: document.getElementById('name').value,
            nickname: document.getElementById('nickname').value,
            generation: document.getElementById('generation').value,
            position: document.getElementById('position').value,
            profile_image: hiddenImg.value,
            achievement: document.getElementById('achievement').value,
            description: document.getElementById('description').value,
            current_position: document.getElementById('currentPosition').value,
            joined_year: document.getElementById('joinedYear').value,
            display_order: parseInt(document.getElementById('displayOrder').value) || 0,
            is_published: document.getElementById('isPublished').checked ? 1 : 0
        };

        const url = currentId ? `/api/honors/${currentId}` : '/api/honors';
        const method = currentId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                modal.style.display = 'none';
                loadHonors();
            } else {
                alert(data.message || 'บันทึกไม่สำเร็จ');
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาด');
        }
        btnSave.disabled = false;
        btnSave.textContent = 'บันทึก';
    });

    window.editHonor = async (id) => {
        try {
            const res = await fetch(`/api/honors/${id}`);
            const data = await res.json();
            if (data.success) {
                currentId = id;
                const item = data.honor;
                document.getElementById('modalTitle').textContent = 'แก้ไขข้อมูลบุคคล';
                document.getElementById('name').value = item.name;
                document.getElementById('nickname').value = item.nickname || '';
                document.getElementById('generation').value = item.generation || '';
                document.getElementById('position').value = item.position || '';
                hiddenImg.value = item.profile_image || '';
                if (item.profile_image) {
                    imgPreview.src = item.profile_image;
                    previewContainer.style.display = 'block';
                } else {
                    previewContainer.style.display = 'none';
                }
                document.getElementById('achievement').value = item.achievement || '';
                document.getElementById('description').value = item.description || '';
                document.getElementById('currentPosition').value = item.current_position || '';
                document.getElementById('joinedYear').value = item.joined_year || '';
                document.getElementById('displayOrder').value = item.display_order;
                document.getElementById('isPublished').checked = item.is_published === 1;
                
                modal.style.display = 'block';
            }
        } catch (err) {
            console.error(err);
            alert('โหลดข้อมูลไม่สำเร็จ');
        }
    };

    window.deleteHonor = async (id) => {
        if (!confirm('ยืนยันการลบข้อมูลบุคคลนี้?')) return;
        try {
            const res = await fetch(`/api/honors/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadHonors();
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    loadHonors();
});
