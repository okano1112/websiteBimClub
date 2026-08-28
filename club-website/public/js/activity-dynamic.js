document.addEventListener('DOMContentLoaded', async () => {
    const swiperWrapper = document.querySelector('.featuredSwiper .swiper-wrapper');
    const timelineContainer = document.querySelector('.timeline');
    const heroSection = document.querySelector('.hero-section');
    
    // Check if user is admin
    let isAdmin = false;
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            if (data.user && data.user.role === 'admin') {
                isAdmin = true;
                renderAdminBox();
            }
        }
    } catch (err) { console.error(err); }

    // Fetch and render activities
    async function fetchActivities() {
        try {
            const res = await fetch('/api/activities');
            const data = await res.json();
            if (data.success && data.activities.length > 0) {
                // We will replace the entire swiper and timeline with data from DB
                swiperWrapper.innerHTML = '';
                timelineContainer.innerHTML = '';

                data.activities.forEach((act, index) => {
                    let deleteBtn = isAdmin ? `<button onclick="deleteActivity(${act.id})" style="position:absolute; top:10px; right:10px; background:red; color:white; border:none; border-radius:4px; padding:5px 10px; cursor:pointer; z-index:100;">ลบกิจกรรม</button>` : '';
                    let img = act.image_url || '../../../assets/img/swiperimg/bimActivity.jpg';
                    
                    // 1. Add to Swiper Carousel
                    swiperWrapper.innerHTML += `
                    <div class="swiper-slide">
                        <div class="activity-card" style="position:relative;">
                            ${deleteBtn}
                            <div class="card-image">
                                <img src="${img}" alt="${act.title}" />
                                <div class="card-badge">News</div>
                            </div>
                            <div class="card-body">
                                <div class="card-date">
                                    <span class="date-icon">📅</span>
                                    <span>${act.event_date}</span>
                                </div>
                                <h3>${act.title}</h3>
                                <p>${act.description}</p>
                                <div class="card-footer">
                                    <span class="participants"><span class="icon">👥</span> ${act.participants} คน</span>
                                </div>
                            </div>
                        </div>
                    </div>`;

                    // 2. Add to Timeline
                    const alignment = index % 2 === 0 ? 'left' : 'right';
                    timelineContainer.innerHTML += `
                    <div class="timeline-item ${alignment}">
                        <div class="timeline-content">
                            <span class="timeline-date">${act.event_date}</span>
                            <h3>${act.title}</h3>
                            <p>${act.description}</p>
                        </div>
                    </div>`;
                });

                // Re-initialize or update Swiper instance
                if (window.featuredSwiper) {
                    window.featuredSwiper.update();
                }

                // Re-init observer for animation
                const timelineItems = document.querySelectorAll('.timeline-item');
                const timelineObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('show');
                        }
                    });
                }, { threshold: 0.2 });
                timelineItems.forEach(item => timelineObserver.observe(item));

            }
        } catch (err) { console.error(err); }
    }

    fetchActivities();

    function renderAdminBox() {
        const boxHTML = `
        <section class="admin-create-box" style="max-width: 1000px; margin: 40px auto; background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="margin-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <span style="background:#ad0f0f; color:#fff; padding:4px 8px; border-radius:4px; font-size:12px;">ผู้ดูแลระบบ</span> เพิ่มข่าวสาร/กิจกรรมใหม่ (จะแสดงในรูปสไลด์อัตโนมัติ)
            </h3>
            <form id="addActivityForm" style="display:flex; flex-direction:column; gap:10px;">
                <input type="text" id="actTitle" placeholder="หัวเรื่องกิจกรรม" required style="padding:10px; border:1px solid #ccc; border-radius:6px;">
                <input type="text" id="actDate" placeholder="วันที่ (เช่น ตุลาคม 2026)" required style="padding:10px; border:1px solid #ccc; border-radius:6px;">
                <input type="number" id="actParts" placeholder="จำนวนคนที่เข้าร่วม (เช่น 50)" style="padding:10px; border:1px solid #ccc; border-radius:6px;">
                <textarea id="actDesc" placeholder="รายละเอียด..." required style="padding:10px; border:1px solid #ccc; border-radius:6px; min-height:80px;"></textarea>
                
                <div style="display:flex; gap:10px; align-items:center; background:#f9f9f9; padding:10px; border-radius:6px; border:1px dashed #ccc;">
                    <label style="font-weight:bold;">รูปภาพประกอบ:</label>
                    <input type="file" id="actImgFile" accept="image/*" style="font-size:14px;">
                    <button type="submit" style="padding:10px 20px; background:#ad0f0f; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold; margin-left:auto;">โพสต์ลงสไลด์</button>
                </div>
            </form>
        </section>
        `;
        heroSection.insertAdjacentHTML('afterend', boxHTML);

        document.getElementById('addActivityForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'กำลังโพสต์...';
            btn.disabled = true;

            let imageUrl = '';
            const fileInput = document.getElementById('actImgFile');
            if (fileInput.files.length > 0) {
                const fd = new FormData();
                fd.append('images', fileInput.files[0]);
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.urls.length > 0) {
                    imageUrl = uploadData.urls[0];
                }
            }

            const body = {
                title: document.getElementById('actTitle').value,
                description: document.getElementById('actDesc').value,
                event_date: document.getElementById('actDate').value,
                participants: document.getElementById('actParts').value || 0,
                image_url: imageUrl
            };

            await fetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            window.location.reload();
        });
    }
});

window.deleteActivity = async function(id) {
    if(!confirm('ยืนยันลบกิจกรรม?')) return;
    await fetch('/api/activities/' + id, { method: 'DELETE' });
    window.location.reload();
}
