document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(location.search).get('id');
  const form = document.getElementById('courseForm');
  const message = document.getElementById('courseMessage');
  const stopsEl = document.getElementById('stops');
  const quizEl = document.getElementById('quizQuestions');
  const show = (text, type = '') => { message.textContent = text; message.className = `notice ${type}`; message.hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const normalizeYouTubeUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?[^\s"']*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  };
  function formatSeconds(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  const questionMarkup = (kind, item = {}) => {
    const radioName = `correct-${kind}-${crypto.randomUUID()}`;
    const isStop = kind === 'stop';
    const initSec = item.timeSeconds ?? 0;
    const isActive = item.isActive !== false && item.is_active !== false && item.enabled !== false;
    
    return `<article class="question-card" data-kind="${kind}">
    <div class="question-top">
      ${isStop ? `
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <label style="margin:0;">เวลาหยุด (วินาที)
            <input class="question-time" type="number" min="0" value="${item.timeSeconds ?? ''}" placeholder="เช่น 15" required style="width:110px; margin-top:4px;">
          </label>
          <span class="time-preview-badge" style="font-size:0.85rem; padding:5px 10px; border-radius:6px; background:#f1f5f9; color:#475467; font-weight:700; margin-top:16px;">⏱️ ${formatSeconds(initSec)}</span>
          <button type="button" class="button-text btn-grab-time" style="margin-top:16px; font-size:0.82rem; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; background:#fff;" title="ใช้วินาทีปัจจุบันของวิดีโอที่กำลังเล่นอยู่">ใช้เวลาจากวิดีโอ</button>
          <label class="check-label" style="margin:16px 0 0 0; padding:0; font-weight:600; font-size:0.88rem; cursor:pointer;">
            <input type="checkbox" class="stop-enabled" ${isActive ? 'checked' : ''}> เปิดใช้งานจุดนี้
          </label>
        </div>
      ` : '<strong>คำถามท้ายคอร์ส</strong>'}
      <button type="button" class="icon-button remove-question" aria-label="ลบคำถาม">×</button>
    </div>
    <label>คำถาม<input class="question-text" value="${esc(item.question || '')}" required></label>
    <div class="option-list">${[0, 1, 2, 3].map((_, index) => `<label class="option-row"><input type="radio" name="${radioName}" value="${index}" ${Number(item.correctIndex) === index ? 'checked' : ''} required><input class="option-text" value="${esc((item.options || [])[index] || '')}" placeholder="ตัวเลือก ${index + 1}" required></label>`).join('')}</div>
    <p class="help-text">เลือกวงกลมหน้าตัวเลือกที่ถูกต้อง</p></article>`;
  };

  function addQuestion(kind, item) { (kind === 'stop' ? stopsEl : quizEl).insertAdjacentHTML('beforeend', questionMarkup(kind, item)); }
  function collect(container, isStop) {
    return [...container.querySelectorAll('.question-card')].map((card, index) => {
      const options = [...card.querySelectorAll('.option-text')].map(input => input.value.trim()).filter(Boolean);
      const checked = card.querySelector('input[type="radio"]:checked');
      const timeInput = card.querySelector('.question-time');
      const enabledBox = card.querySelector('.stop-enabled');
      return {
        question: card.querySelector('.question-text').value.trim(),
        options,
        correctIndex: checked ? Number(checked.value) : -1,
        ...(isStop ? {
          timeSeconds: timeInput ? Number(timeInput.value) : 0,
          isActive: enabledBox ? enabledBox.checked : true
        } : {})
      };
    });
  }
  async function upload(file, endpoint, field) {
    if (!file) return null;
    const body = new FormData(); body.append(field, file);
    const response = await fetch(endpoint, { method: 'POST', body }); const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data.url || (data.urls && data.urls[0]);
  }
  function renderMedia() {
    const thumb = document.getElementById('thumbnailUrl').value;
    const video = document.getElementById('videoUrl').value;
    document.getElementById('thumbnailPreview').innerHTML = thumb ? `<img src="${esc(thumb)}" alt="ตัวอย่างรูปปก">` : '';
    document.getElementById('videoPreview').innerHTML = video
      ? (video.includes('youtube-nocookie.com/embed/') ? `<iframe src="${esc(video)}" title="ตัวอย่างวิดีโอ YouTube" allowfullscreen></iframe>` : `<video controls src="${esc(video)}"></video>`)
      : '';
  }
  document.getElementById('addStop').addEventListener('click', () => addQuestion('stop'));
  document.getElementById('addQuiz').addEventListener('click', () => addQuestion('quiz'));
  document.addEventListener('click', event => { if (event.target.closest('.remove-question')) event.target.closest('.question-card').remove(); });
  stopsEl.addEventListener('input', (e) => {
    if (e.target.classList.contains('question-time')) {
      const badge = e.target.closest('.question-card')?.querySelector('.time-preview-badge');
      if (badge) badge.textContent = `⏱️ ${formatSeconds(e.target.value)}`;
    }
  });
  stopsEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-grab-time')) {
      const video = document.querySelector('#videoPreview video');
      if (video && !isNaN(video.currentTime)) {
        const timeInput = e.target.closest('.question-card')?.querySelector('.question-time');
        const badge = e.target.closest('.question-card')?.querySelector('.time-preview-badge');
        const sec = Math.floor(video.currentTime);
        if (timeInput) timeInput.value = sec;
        if (badge) badge.textContent = `⏱️ ${formatSeconds(sec)}`;
      } else {
        alert('กรุณากดเล่นวิดีโอตัวอย่างด้านบนก่อน เพื่อดึงเวลาปัจจุบัน');
      }
    }
  });
  document.getElementById('thumbnailFile').addEventListener('change', async event => { try { const url = await upload(event.target.files[0], '/api/upload/images', 'images'); if (url) { document.getElementById('thumbnailUrl').value = url; renderMedia(); } } catch (error) { show(error.message); } });
  document.getElementById('videoFile').addEventListener('change', async event => { try { show('กำลังอัปโหลดวิดีโอ โปรดรอสักครู่'); const url = await upload(event.target.files[0], '/api/upload/video', 'video'); if (url) { document.getElementById('videoUrl').value = url; renderMedia(); message.hidden = true; } } catch (error) { show(error.message); } });
  document.getElementById('youtubeEmbed').addEventListener('input', event => {
    const normalized = normalizeYouTubeUrl(event.target.value);
    const error = document.getElementById('youtubeError');
    event.target.setAttribute('aria-invalid', String(normalized === null));
    error.textContent = normalized === null ? 'กรุณาวางลิงก์หรือโค้ดฝังจาก YouTube ที่ถูกต้อง' : '';
    document.getElementById('videoUrl').value = normalized || '';
    renderMedia();
  });
  document.getElementById('clearVideo').addEventListener('click', () => { if (!confirm('ต้องการลบวิดีโอออกจากคอร์สใช่หรือไม่?')) return; document.getElementById('videoUrl').value = ''; document.getElementById('youtubeEmbed').value = ''; document.getElementById('videoFile').value = ''; renderMedia(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (document.getElementById('youtubeEmbed').getAttribute('aria-invalid') === 'true') return document.getElementById('youtubeEmbed').focus();
    const youtubeValue = document.getElementById('youtubeEmbed').value.trim();
    const videoUrl = youtubeValue ? normalizeYouTubeUrl(youtubeValue) : document.getElementById('videoUrl').value;
    const payload = { title: document.getElementById('title').value.trim(), description: document.getElementById('description').value.trim(), passScore: Number(document.getElementById('passScore').value), isPublished: document.getElementById('isPublished').checked, thumbnailUrl: document.getElementById('thumbnailUrl').value, videoUrl, stops: collect(stopsEl, true), quizQuestions: collect(quizEl, false) };
    try { const response = await fetch(`/api/courses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); document.getElementById('videoUrl').value = data.course.videoUrl || ''; if (data.course.videoUrl?.includes('youtube-nocookie.com/embed/')) document.getElementById('youtubeEmbed').value = data.course.videoUrl; renderMedia(); show(data.course.isPublished ? 'บันทึกและเผยแพร่คอร์สเรียบร้อย' : 'บันทึกคอร์สเป็นฉบับร่างเรียบร้อย', 'success'); } catch (error) { show(error.message || 'ไม่สามารถบันทึกคอร์สได้'); }
  });
  try {
    if (!id) throw new Error('ไม่พบรหัสคอร์ส');
    const response = await fetch(`/api/courses/${id}/editor`); const data = await response.json();
    if (response.status === 401) return location.href = 'login.html'; if (!response.ok) throw new Error(data.message);
    const course = data.course; document.getElementById('editorTitle').textContent = `แก้ไข: ${course.title}`; document.getElementById('title').value = course.title; document.getElementById('description').value = course.description || ''; document.getElementById('passScore').value = course.passScore; document.getElementById('isPublished').checked = course.isPublished; document.getElementById('thumbnailUrl').value = course.thumbnailUrl || ''; document.getElementById('videoUrl').value = course.videoUrl || ''; if ((course.videoUrl || '').includes('youtube-nocookie.com/embed/')) document.getElementById('youtubeEmbed').value = course.videoUrl; course.stops.forEach(item => addQuestion('stop', item)); course.quizQuestions.forEach(item => addQuestion('quiz', item)); renderMedia();
  } catch (error) { form.hidden = true; show(error.message || 'ไม่สามารถโหลดคอร์สได้'); }
});
