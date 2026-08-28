document.addEventListener('DOMContentLoaded', async () => {
    const sections = {
        activities: {
            label: 'กิจกรรม',
            addTitle: 'เพิ่มกิจกรรม',
            editTitle: 'แก้ไขกิจกรรม',
            listTitle: 'รายการกิจกรรม',
            emptyText: 'ยังไม่มีกิจกรรม'
        },
        achievements: {
            label: 'ผลงาน',
            addTitle: 'เพิ่มผลงาน',
            editTitle: 'แก้ไขผลงาน',
            listTitle: 'รายการผลงาน',
            emptyText: 'ยังไม่มีผลงาน'
        }
    };

    const tabs = document.querySelectorAll('.cms-tab');
    const form = document.getElementById('cmsForm');
    const itemIdInput = document.getElementById('cmsItemId');
    const titleInput = document.getElementById('cmsTitle');
    const descriptionInput = document.getElementById('cmsDescription');
    const imageInput = document.getElementById('cmsImage');
    const imageUrlInput = document.getElementById('cmsImageUrl');
    const imagePreview = document.getElementById('cmsImagePreview');
    const formTitle = document.getElementById('cmsFormTitle');
    const listTitle = document.getElementById('cmsListTitle');
    const list = document.getElementById('cmsList');
    const submitBtn = document.getElementById('cmsSubmitBtn');
    const cancelBtn = document.getElementById('cmsCancelBtn');
    const messageBox = document.getElementById('cmsMessage');

    const initialSection = new URLSearchParams(window.location.search).get('section');
    let activeSection = sections[initialSection] ? initialSection : 'activities';
    let items = [];

    function escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showMessage(type, text) {
        messageBox.className = `cms-message ${type}`;
        messageBox.textContent = text;
    }

    function clearMessage() {
        messageBox.className = 'cms-message';
        messageBox.textContent = '';
    }

    function renderPreview(imageUrl) {
        imagePreview.innerHTML = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="รูปภาพเนื้อหา">`
            : '';
    }

    function resetForm() {
        form.reset();
        itemIdInput.value = '';
        imageUrlInput.value = '';
        formTitle.textContent = sections[activeSection].addTitle;
        submitBtn.textContent = 'บันทึก';
        cancelBtn.style.display = 'none';
        renderPreview('');
        clearMessage();
    }

    function setActiveSection(section) {
        activeSection = section;
        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.section === section));
        listTitle.textContent = sections[section].listTitle;
        const url = new URL(window.location.href);
        url.searchParams.set('section', section);
        window.history.replaceState({}, '', url);
        resetForm();
        loadItems();
    }

    async function ensureAdmin() {
        const res = await fetch('/api/auth/me');
        if (!res.ok) throw new Error('กรุณาเข้าสู่ระบบ');
        const data = await res.json();
        if (!data.user || data.user.role !== 'admin') {
            throw new Error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        }
    }

    async function uploadSelectedImage() {
        const file = imageInput.files[0];
        if (!file) return imageUrlInput.value || null;

        const formData = new FormData();
        formData.append('images', file);

        const res = await fetch('/api/upload/cms', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (!res.ok || !data.success || !data.urls || data.urls.length === 0) {
            throw new Error(data.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
        }

        return data.urls[0];
    }

    async function loadItems() {
        list.innerHTML = '<div class="loading-text">กำลังโหลดข้อมูล...</div>';

        try {
            const res = await fetch(`/api/cms-content/${activeSection}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ');
            }

            items = data.items || [];
            renderItems();
        } catch (error) {
            list.innerHTML = `<div class="loading-text">${escapeHtml(error.message || 'เกิดข้อผิดพลาด')}</div>`;
        }
    }

    function renderItems() {
        if (items.length === 0) {
            list.innerHTML = `<div class="loading-text">${sections[activeSection].emptyText}</div>`;
            return;
        }

        list.innerHTML = items.map(item => {
            const imageHtml = item.image_url
                ? `<img class="cms-item-image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">`
                : '<div class="cms-item-empty-image">ไม่มีรูปภาพ</div>';

            return `
                <article class="cms-item">
                    ${imageHtml}
                    <div class="cms-item-body">
                        <h3 class="cms-item-title">${escapeHtml(item.title)}</h3>
                        <p class="cms-item-description">${escapeHtml(item.description)}</p>
                        <div class="cms-item-actions">
                            <button type="button" class="cms-edit-btn" data-id="${item.id}">แก้ไข</button>
                            <button type="button" class="cms-delete-btn" data-id="${item.id}">ลบ</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function editItem(id) {
        const item = items.find(entry => String(entry.id) === String(id));
        if (!item) return;

        itemIdInput.value = item.id;
        titleInput.value = item.title || '';
        descriptionInput.value = item.description || '';
        imageUrlInput.value = item.image_url || '';
        formTitle.textContent = sections[activeSection].editTitle;
        submitBtn.textContent = 'บันทึกการแก้ไข';
        cancelBtn.style.display = 'inline-flex';
        renderPreview(item.image_url || '');
        clearMessage();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function deleteItem(id) {
        if (!confirm(`ยืนยันการลบ${sections[activeSection].label}นี้?`)) return;

        try {
            const res = await fetch(`/api/cms-content/${activeSection}/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'ลบข้อมูลไม่สำเร็จ');
            }

            showMessage('success', data.message);
            if (itemIdInput.value === String(id)) resetForm();
            await loadItems();
        } catch (error) {
            showMessage('error', error.message || 'เกิดข้อผิดพลาด');
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => setActiveSection(tab.dataset.section));
    });

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (!file) return renderPreview(imageUrlInput.value);

        const reader = new FileReader();
        reader.onload = event => renderPreview(event.target.result);
        reader.readAsDataURL(file);
    });

    cancelBtn.addEventListener('click', resetForm);

    list.addEventListener('click', event => {
        const editButton = event.target.closest('.cms-edit-btn');
        const deleteButton = event.target.closest('.cms-delete-btn');

        if (editButton) editItem(editButton.dataset.id);
        if (deleteButton) deleteItem(deleteButton.dataset.id);
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = itemIdInput.value ? 'กำลังบันทึก...' : 'กำลังเพิ่ม...';

        try {
            const imageUrl = await uploadSelectedImage();
            const itemId = itemIdInput.value;
            const res = await fetch(`/api/cms-content/${activeSection}${itemId ? `/${itemId}` : ''}`, {
                method: itemId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: titleInput.value,
                    description: descriptionInput.value,
                    imageUrl
                })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'บันทึกข้อมูลไม่สำเร็จ');
            }

            resetForm();
            showMessage('success', data.message);
            await loadItems();
        } catch (error) {
            showMessage('error', error.message || 'เกิดข้อผิดพลาด');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = itemIdInput.value ? 'บันทึกการแก้ไข' : 'บันทึก';
        }
    });

    try {
        await ensureAdmin();
        cancelBtn.style.display = 'none';
        setActiveSection(activeSection);
    } catch (error) {
        alert(error.message || 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location.href = 'login.html';
    }
});
