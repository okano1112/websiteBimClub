document.addEventListener('DOMContentLoaded', async () => {
    const gridContainer = document.querySelector('.achieve-grid');
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

    let allAchievements = [];

    // Fetch and render achievements
    async function fetchAchievements() {
        try {
            const res = await fetch('/api/achievements');
            const data = await res.json();
            if (data.success && data.achievements.length > 0) {
                gridContainer.innerHTML = ''; // Clear static cards
                allAchievements = data.achievements;
                
                data.achievements.forEach((ach, index) => {
                    let deleteBtn = isAdmin ? `<button onclick="deleteAch(event, ${ach.id})" style="position:absolute; top:10px; right:10px; background:red; color:white; border:none; border-radius:4px; padding:5px 10px; cursor:pointer; z-index:10;">ลบ</button>` : '';
                    let mainImg = ach.images && ach.images.length > 0 ? ach.images[0].image_url : '../../../assets/img/logobranding/logobim.png';

                    gridContainer.innerHTML += `
                    <div class="achieve-card" onclick="openCarouselCustom(${index})" style="position:relative;">
                        ${deleteBtn}
                        <div class="card-thumbnail">
                            <img src="${mainImg}" alt="Thumbnail">
                            <div class="card-overlay">
                                <span class="view-icon">🔍</span>
                                <span>ดูผลงาน</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <span class="card-category">${ach.category}</span>
                            <h3>${ach.title}</h3>
                            <p>${ach.description.substring(0, 50)}...</p>
                            <div class="card-meta">
                                <span>👥 ${ach.team_size}</span>
                                <span>📅 ${ach.project_year}</span>
                            </div>
                        </div>
                    </div>`;
                });
            }
        } catch (err) { console.error(err); }
    }

    fetchAchievements();

    // The Custom logic to open the modal
    window.openCarouselCustom = function(index) {
        const ach = allAchievements[index];
        const modal = document.getElementById('carouselModal');
        const ring = document.getElementById('carouselRing');
        const infoTitle = document.getElementById('infoTitle');
        const infoDesc = document.getElementById('infoDesc');

        infoTitle.textContent = ach.title;
        infoDesc.textContent = ach.description;

        ring.innerHTML = '';
        if (ach.images && ach.images.length > 0) {
            const total = ach.images.length;
            const angle = 360 / total;
            ach.images.forEach((img, i) => {
                const zDist = Math.round((280 / 2) / Math.tan(Math.PI / total)) + 50; 
                ring.innerHTML += `
                <div class="carousel-item" style="transform: rotateY(${i * angle}deg) translateZ(${zDist}px);">
                    <img src="${img.image_url}" alt="Slide">
                    <div class="item-caption">${img.caption || ''}</div>
                </div>
                `;
            });
        }
        
        modal.classList.add('open');
    }

    window.deleteAch = async function(e, id) {
        e.stopPropagation();
        if(!confirm('ยืนยันลบผลงาน?')) return;
        await fetch('/api/achievements/' + id, { method: 'DELETE' });
        window.location.reload();
    }

    function renderAdminBox() {
        const boxHTML = `
        <section class="admin-create-box" style="max-width: 1000px; margin: 40px auto; background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="margin-bottom: 15px; display:flex; align-items:center; gap:10px;">
                <span style="background:#ad0f0f; color:#fff; padding:4px 8px; border-radius:4px; font-size:12px;">ผู้ดูแลระบบ</span> เพิ่มผลงานใหม่
            </h3>
            <form id="addAchForm" style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                <input type="text" id="achTitle" placeholder="ชื่อผลงาน" required style="padding:10px; border:1px solid #ccc; border-radius:6px;">
                <input type="text" id="achCat" placeholder="หมวดหมู่ (เช่น Architecture)" required style="padding:10px; border:1px solid #ccc; border-radius:6px;">
                <input type="text" id="achTeam" placeholder="จำนวนทีม (เช่น ทีม 3 คน)" required style="padding:10px; border:1px solid #ccc; border-radius:6px;">
                <input type="text" id="achYear" placeholder="ปีผลงาน (เช่น 2026)" required style="padding:10px; border:1px solid #ccc; border-radius:6px;">
                <textarea id="achDesc" placeholder="รายละเอียดแบบเต็ม..." required style="grid-column: span 2; padding:10px; border:1px solid #ccc; border-radius:6px; min-height:80px;"></textarea>
                
                <div style="grid-column: span 2; border: 1px dashed #ccc; padding: 15px; border-radius: 6px;">
                    <label style="font-weight:bold; display:block; margin-bottom:10px;">เพิ่มรูปภาพ (เลือกหลายรูปได้สำหรับ 3D Carousel)</label>
                    <input type="file" id="achImgFile" accept="image/*" multiple style="font-size:14px; margin-bottom:10px;">
                </div>
                
                <div style="grid-column: span 2; text-align:right;">
                    <button type="submit" style="padding:10px 20px; background:#ad0f0f; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">บันทึกผลงาน</button>
                </div>
            </form>
        </section>
        `;
        heroSection.insertAdjacentHTML('afterend', boxHTML);

        document.getElementById('addAchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.textContent = 'กำลังอัปโหลดและบันทึก...';
            btn.disabled = true;

            let imageUrls = [];
            const fileInput = document.getElementById('achImgFile');
            if (fileInput.files.length > 0) {
                const fd = new FormData();
                for(let i=0; i<fileInput.files.length; i++) {
                    fd.append('images', fileInput.files[i]);
                }
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.urls.length > 0) {
                    imageUrls = uploadData.urls.map(url => ({ url: url, caption: '' }));
                }
            }

            const body = {
                title: document.getElementById('achTitle').value,
                category: document.getElementById('achCat').value,
                team_size: document.getElementById('achTeam').value,
                project_year: document.getElementById('achYear').value,
                description: document.getElementById('achDesc').value,
                imageUrls: imageUrls
            };

            await fetch('/api/achievements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            window.location.reload();
        });
    }
});
