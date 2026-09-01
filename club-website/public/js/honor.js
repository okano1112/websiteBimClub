document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('honorGrid');
    const modal = document.getElementById('honorDetailModal');
    const closeBtn = document.querySelector('.close-modal');

    // Fetch and render
    try {
        const res = await fetch('/api/honors');
        const data = await res.json();
        
        if (data.success && data.honors.length > 0) {
            window.honorData = data.honors; // Store globally for modal access
            renderGrid(data.honors);
        } else {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #64748b;">ยังไม่มีข้อมูลเกียรติยศในขณะนี้</div>';
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }

    function renderGrid(honors) {
        grid.innerHTML = honors.map(item => {
            const displayName = item.nickname ? `${item.name} (${item.nickname})` : item.name;
            const roleAndGen = [item.position, item.generation].filter(Boolean).join(' | ');
            const imgUrl = item.profile_image || '../../../assets/img/default-avatar.png';
            
            return `
            <div class="honor-card">
                <div class="card-img-wrapper">
                    <img src="${imgUrl}" alt="${item.name}">
                </div>
                <div class="card-content">
                    <h3 class="card-name">${displayName}</h3>
                    <div class="card-subtitle">${roleAndGen}</div>
                    ${item.achievement ? `<div class="card-achievement">🏆 ${item.achievement}</div>` : ''}
                    <div class="card-desc">${item.description || ''}</div>
                    <button class="btn-read-more" onclick="openModal(${item.id})">อ่านประวัติ</button>
                </div>
            </div>
            `;
        }).join('');
    }

    // Modal Logic
    window.openModal = function(id) {
        const item = window.honorData.find(h => h.id === id);
        if (!item) return;

        const displayName = item.nickname ? `${item.name} (${item.nickname})` : item.name;
        const roleAndGen = [item.position, item.generation].filter(Boolean).join(' | ');

        document.getElementById('modalImage').src = item.profile_image || '../../../assets/img/default-avatar.png';
        document.getElementById('modalName').textContent = displayName;
        document.getElementById('modalSubtitle').textContent = roleAndGen;
        
        document.getElementById('modalJoined').textContent = item.joined_year || '-';
        document.getElementById('modalAchievement').textContent = item.achievement || '-';
        document.getElementById('modalCurrent').textContent = item.current_position || '-';
        document.getElementById('modalDesc').textContent = item.description || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม';

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling background
    };

    closeBtn.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };
});
