document.addEventListener('DOMContentLoaded', async () => {
    const feed = document.getElementById('requestFeed');
    const tabs = document.querySelectorAll('.request-tab');
    let activeStatus = 'pending';
    let summary = { pending: 0, approved: 0, rejected: 0 };

    function escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatTime(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    }

    function updateTabLabels() {
        tabs.forEach((tab) => {
            const status = tab.dataset.status;
            const labels = {
                pending: 'รออนุมัติ',
                approved: 'อนุมัติแล้ว',
                rejected: 'ปฏิเสธแล้ว'
            };
            const count = summary[status] || 0;
            tab.textContent = `${labels[status]} (${count})`;
            tab.classList.toggle('active', status === activeStatus);
        });
    }

    function renderRequests(requests) {
        if (!requests.length) {
            const emptyText = {
                pending: 'ยังไม่มีคำขอที่รอการยืนยัน',
                approved: 'ยังไม่มีคำขอที่อนุมัติ',
                rejected: 'ยังไม่มีคำขอที่ปฏิเสธ'
            };
            feed.innerHTML = `<div class="empty-feed">${emptyText[activeStatus]}</div>`;
            return;
        }

        feed.innerHTML = requests.map((request) => {
            const name = request.fullName || request.user.username;
            const avatar = request.user.avatarUrl
                ? `<img class="request-avatar" src="${escapeHtml(request.user.avatarUrl)}" alt="รูปโปรไฟล์">`
                : `<div class="request-avatar-placeholder">${escapeHtml(name.charAt(0).toUpperCase())}</div>`;

            const actions = request.status === 'pending'
                ? `<div class="request-actions">
                        <button type="button" class="btn-confirm" data-action="approve" data-id="${request.id}">ยืนยัน</button>
                        <button type="button" class="btn-decline" data-action="reject" data-id="${request.id}">ปฏิเสธ</button>
                   </div>`
                : `<div class="request-meta">ดำเนินการเมื่อ ${escapeHtml(formatTime(request.reviewedAt))}${request.reviewerName ? ` โดย ${escapeHtml(request.reviewerName)}` : ''}</div>`;

            return `
                <article class="request-feed-card">
                    ${avatar}
                    <div class="request-feed-body">
                        <div class="request-name">${escapeHtml(name)}</div>
                        <div class="request-meta">${escapeHtml(request.user.email || '')}</div>
                        <div class="request-meta">ต้องการเป็นอาจารย์ · คณะ ${escapeHtml(request.faculty)}</div>
                        <div class="request-meta">โทร ${escapeHtml(request.phone)} · ส่งเมื่อ ${escapeHtml(formatTime(request.createdAt))}</div>
                        ${actions}
                    </div>
                </article>
            `;
        }).join('');
    }

    async function loadRequests() {
        feed.innerHTML = '<div class="empty-feed">กำลังโหลดคำขอ...</div>';
        const res = await fetch(`/api/instructor-requests?status=${encodeURIComponent(activeStatus)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.message || 'โหลดคำขอไม่สำเร็จ');
        }

        summary = data.summary || summary;
        updateTabLabels();
        renderRequests(data.requests || []);
    }

    async function reviewRequest(id, action) {
        const res = await fetch(`/api/instructor-requests/${id}/${action}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'ดำเนินการไม่สำเร็จ');
        }
        await loadRequests();
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', async () => {
            activeStatus = tab.dataset.status;
            updateTabLabels();
            try {
                await loadRequests();
            } catch (error) {
                feed.innerHTML = `<div class="empty-feed">${escapeHtml(error.message)}</div>`;
            }
        });
    });

    feed.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const confirmText = action === 'approve'
            ? 'ยืนยันคำขอนี้และเปลี่ยนสถานะผู้ใช้เป็นอาจารย์ทันที?'
            : 'ปฏิเสธคำขอนี้?';

        if (!confirm(confirmText)) return;

        const buttons = feed.querySelectorAll(`[data-id="${id}"]`);
        buttons.forEach((entry) => { entry.disabled = true; });

        try {
            await reviewRequest(id, action);
        } catch (error) {
            alert(error.message || 'เกิดข้อผิดพลาด');
            buttons.forEach((entry) => { entry.disabled = false; });
        }
    });

    try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) throw new Error('กรุณาเข้าสู่ระบบ');
        const meData = await meRes.json();
        if (!meData.user || meData.user.role !== 'admin') {
            throw new Error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        }
        await loadRequests();
    } catch (error) {
        alert(error.message || 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location.href = 'login.html';
    }
});
