document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('honorGrid');
    const modal = document.getElementById('honorDetailModal');
    const closeBtn = document.querySelector('.close-modal');
    const yearNavigation = document.getElementById('hofYearNavigation');
    const yearSelect = document.getElementById('hofYearSelect');
    const fallbackImage = '';
    const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
    // Leader emphasis comes from the verified position catalog; legacy rows retain text fallback.
    const isPresident = item => item.position_id ? Number(item.is_leader) === 1 : (Boolean(item.is_president) || (/ประธาน|president/i.test(item.position || '') && !/รอง|vice|deputy/i.test(item.position || '')));
    const yearLabel = item => item.joined_year || 'ไม่ระบุปี';

    try {
        const res = await fetch('/api/honors');
        const data = await res.json();
        if (data.success && data.honors.length > 0) {
            window.honorData = data.honors;
            renderGrid(data.honors);
        } else {
            grid.innerHTML = '<div class="honor-empty">ยังไม่มีข้อมูลศิษย์เก่าหรือบุคคลเกียรติยศในขณะนี้</div>';
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div class="honor-empty honor-empty-error">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</div>';
    }

    function renderGrid(honors) {
        const grouped = honors.reduce((groups, item) => {
            const year = yearLabel(item);
            (groups[year] ||= []).push(item);
            return groups;
        }, {});
        const sortedYears = Object.keys(grouped).sort((a, b) => {
            if (a === 'ไม่ระบุปี') return 1;
            if (b === 'ไม่ระบุปี') return -1;
            return String(b).localeCompare(String(a), 'th', { numeric: true });
        });
        // Keep the navigation newest-first, while the full directory reads
        // chronologically from the oldest class at the top.
        const sectionYears = [...sortedYears].reverse();
        grid.innerHTML = sectionYears.map(year => {
            const members = grouped[year];
            const featured = members.filter(isPresident);
            const regular = members.filter(item => !isPresident(item));
            return `<section class="honor-year-group hof-year-section" data-year="${escapeHtml(year)}" aria-labelledby="honor-year-${escapeHtml(year)}"><div class="honor-year-heading"><span class="honor-year-kicker">CLASS OF ${escapeHtml(year)}</span><h2 id="honor-year-${escapeHtml(year)}">รุ่นปี ${escapeHtml(year)}</h2><span class="honor-year-count">${members.length} คน</span></div>${featured.map(renderFeatured).join('')}${regular.length > 3 ? renderCarousel(regular, year) : `<div class="honor-card-grid">${regular.map(renderCard).join('')}</div>`}</section>`;
        }).join('');
        renderYearNavigation(sortedYears);
        applyYear(readYearFromUrl(), sortedYears);
    }
    function renderYearNavigation(years) {
        yearNavigation.innerHTML = `${years.map(year => `<button type="button" class="hof-year-button" data-year="${escapeHtml(year)}">${escapeHtml(year)}</button>`).join('')}<button type="button" class="hof-year-button" data-year="all">ทุกปี</button>`;
        yearSelect.innerHTML = `<option value="all">ทุกปี</option>${years.map(year => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join('')}`;
        yearNavigation.addEventListener('click', event => {
            const button = event.target.closest('.hof-year-button');
            if (button) applyYear(button.dataset.year, years);
        });
        yearSelect.addEventListener('change', event => applyYear(event.target.value, years));
    }
    function readYearFromUrl() {
        const queryYear = new URLSearchParams(window.location.search).get('year');
        return queryYear || (window.location.hash ? window.location.hash.slice(1) : 'all');
    }
    function applyYear(selectedYear, years) {
        const activeYear = selectedYear !== 'all' && years.includes(selectedYear) ? selectedYear : 'all';
        grid.querySelectorAll('.hof-year-section').forEach(section => {
            const visible = activeYear === 'all' || section.dataset.year === activeYear;
            section.hidden = !visible;
            section.classList.toggle('hof-year-section-visible', visible);
        });
        yearNavigation.querySelectorAll('.hof-year-button').forEach(button => {
            const active = button.dataset.year === activeYear;
            button.classList.toggle('hof-year-button-active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        yearSelect.value = activeYear;
        const url = new URL(window.location.href);
        if (activeYear === 'all') url.searchParams.delete('year');
        else url.searchParams.set('year', activeYear);
        url.hash = '';
        window.history.replaceState({}, '', url);
    }
    function personName(item) { return item.nickname ? `${item.name} (${item.nickname})` : item.name; }
    function roleAndGen(item) { return [item.position_name_th || item.position, item.generation].filter(Boolean).join(' | '); }
    function imageMarkup(item, className) { return item.profile_image ? `<img class="${className}" src="${escapeHtml(item.profile_image)}" alt="รูปโปรไฟล์ ${escapeHtml(item.name)}" loading="lazy" onerror="this.replaceWith(document.createTextNode('ไม่มีรูปโปรไฟล์'))">` : `<div class="${className} honor-image-placeholder" role="img" aria-label="ไม่มีรูปโปรไฟล์">ไม่มีรูปโปรไฟล์</div>`; }
    function renderFeatured(item) { return `<article class="honor-featured-card"><div class="honor-featured-image">${imageMarkup(item, 'honor-featured-photo')}<span class="honor-featured-badge">ประธานชมรม</span></div><div class="honor-featured-content"><span class="honor-card-eyebrow">FEATURED ALUMNI</span><h3>${escapeHtml(personName(item))}</h3><p class="honor-card-subtitle">${escapeHtml(roleAndGen(item) || 'BimClub Alumni')}</p>${item.achievement ? `<p class="honor-card-achievement">${escapeHtml(item.achievement)}</p>` : ''}<p class="honor-card-desc">${escapeHtml(item.description || 'บุคคลสำคัญผู้สร้างคุณูปการให้แก่ชมรม')}</p><button class="btn-read-more" type="button" onclick="openModal(${Number(item.id)})">อ่านประวัติ</button></div></article>`; }
    function renderCard(item) { return `<article class="honor-card">${imageMarkup(item, 'honor-card-photo')}<div class="card-content"><span class="honor-card-eyebrow">BIMCLUB ALUMNI</span><h3 class="card-name">${escapeHtml(personName(item))}</h3><div class="card-subtitle">${escapeHtml(roleAndGen(item))}</div>${item.achievement ? `<div class="card-achievement">${escapeHtml(item.achievement)}</div>` : ''}<p class="card-desc">${escapeHtml(item.description || '')}</p><button class="btn-read-more" type="button" onclick="openModal(${Number(item.id)})">อ่านประวัติ</button></div></article>`; }
    function renderCarousel(items, year) { return `<div class="honor-carousel" data-year="${escapeHtml(year)}"><div class="honor-carousel-toolbar"><span>สมาชิกทั่วไป ${items.length} คน</span><div class="honor-carousel-actions"><button type="button" class="honor-carousel-btn" data-direction="prev" aria-label="สมาชิกก่อนหน้า">←</button><button type="button" class="honor-carousel-btn" data-direction="next" aria-label="สมาชิกถัดไป">→</button><a class="honor-view-all" href="#honor-all-${escapeHtml(year)}">ดูทั้งหมด</a></div></div><div class="honor-carousel-viewport"><div class="honor-carousel-track">${items.map(renderCard).join('')}</div></div><div id="honor-all-${escapeHtml(year)}" class="honor-view-all-panel">${items.map(renderCompactCard).join('')}</div></div>`; }
    function renderCompactCard(item) { return `<button type="button" class="honor-compact-card" onclick="openModal(${Number(item.id)})"><span>${escapeHtml(personName(item))}</span><small>${escapeHtml(item.position_name_th || item.position || 'สมาชิก BimClub')}</small></button>`; }
    window.openModal = function(id) {
        const item = window.honorData.find(h => Number(h.id) === Number(id));
        if (!item) return;
        const modalImage = document.getElementById('modalImage');
        modalImage.hidden = !item.profile_image;
        if (item.profile_image) modalImage.src = item.profile_image;
        document.getElementById('modalImage').alt = `รูปโปรไฟล์ ${item.name}`;
        document.getElementById('modalName').textContent = personName(item);
        document.getElementById('modalSubtitle').textContent = roleAndGen(item);
        document.getElementById('modalJoined').textContent = item.joined_year || '-';
        document.getElementById('modalAchievement').textContent = item.achievement || '-';
        document.getElementById('modalCurrent').textContent = item.current_position || '-';
        document.getElementById('modalDesc').textContent = item.description || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม';
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    };
    function closeModal() { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
    closeBtn.addEventListener('click', closeModal);
    grid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-direction]');
        if (!button) return;
        const carousel = button.closest('.honor-carousel');
        const track = carousel?.querySelector('.honor-carousel-track');
        if (!track) return;
        track.scrollBy({ left: button.dataset.direction === 'next' ? track.clientWidth : -track.clientWidth, behavior: 'smooth' });
    });
    window.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    window.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.style.display === 'block') closeModal(); });
});
