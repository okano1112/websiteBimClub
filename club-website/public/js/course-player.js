document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('courseContent');
  const message = document.getElementById('courseMessage');
  let user;
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const show = (text, type = '') => { message.textContent = text; message.className = `notice ${type}`; message.hidden = false; };
  function choice(question, prefix) { return `<fieldset class="learner-question"><legend>${esc(question.question)}</legend>${question.options.map((option, index) => `<label><input type="radio" name="${prefix}-${question.id}" value="${index}"> ${esc(option)}</label>`).join('')}</fieldset>`; }
  try {
    const me = await fetch('/api/auth/me');
    if (!me.ok) return location.href = 'login.html';
    user = (await me.json()).user;
    if (!id) throw new Error('ไม่พบรหัสคอร์ส');
    const response = await fetch(`/api/courses/${id}`); const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    const course = data.course;
    const nameOf = u => u.full_name || u.fullName || u.username || 'ผู้ใช้งาน';
    const date = value => new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    const canManageComment = comment => user && (user.role === 'admin' || Number(comment.author_id) === Number(user.id) || Number(course.instructorId) === Number(user.id));
    const STORAGE_KEY_STOPS = 'bimclub_user_stops_enabled';
    let userStopsEnabled = localStorage.getItem(STORAGE_KEY_STOPS) !== 'false';

    const formatTime = (seconds) => {
      const s = Math.max(0, Math.floor(Number(seconds) || 0));
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    };

    const activeStops = (course.stops || []).filter(s => s.isActive !== false);

    const toolbarHtml = `
      <div class="video-toolbar">
        <div class="video-toolbar-info">
          <span>📺 บทเรียนวิดีโอ</span>
          ${activeStops.length > 0 ? `<span class="stops-count-badge" id="stopsBadge">🎯 มีจุดถามคำถาม ${activeStops.length} จุด</span>` : ''}
        </div>
        <div class="video-toolbar-actions">
          <label class="toggle-switch-container" title="คลิกเพื่อตั้งค่าว่าจะให้วิดีโอหยุดถามคำถามระหว่างเรียนหรือไม่">
            <input type="checkbox" id="userStopsToggle" ${userStopsEnabled ? 'checked' : ''}>
            <span class="toggle-switch-track"><span class="toggle-switch-slider"></span></span>
            <span class="toggle-switch-label" id="userStopsLabel">${userStopsEnabled ? 'หยุดถามคำถาม: เปิด' : 'หยุดถามคำถาม: ปิด'}</span>
          </label>
        </div>
      </div>
    `;

    const videoUrl = String(course.videoUrl || '');
    let ytEmbedUrl = '';
    if (videoUrl.includes('youtube-nocookie.com/embed/')) {
      ytEmbedUrl = videoUrl.includes('?') ? `${videoUrl}&enablejsapi=1` : `${videoUrl}?enablejsapi=1`;
    }
    const playerHtml = ytEmbedUrl
      ? `<div class="video-wrap" id="videoContainer">
           <iframe id="courseYoutubeIframe" src="${esc(ytEmbedUrl)}" title="วิดีโอคอร์ส ${esc(course.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
           <div id="stopModalOverlay" class="stop-modal-overlay" style="display:none;"></div>
         </div>`
      : videoUrl.startsWith('/uploads/videos/') || videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm')
        ? `<div class="video-wrap" id="videoContainer">
             <video id="courseVideo" controls preload="metadata" src="${esc(videoUrl)}"></video>
             <div id="stopModalOverlay" class="stop-modal-overlay" style="display:none;"></div>
           </div>`
        : '<div class="video-empty">คอร์สนี้ยังไม่มีวิดีโอ</div>';
    
    function commentHtml(comment) {
      const avatar = comment.avatar_url ? `<img src="${esc(comment.avatar_url)}" alt="" class="comment-avatar">` : `<span class="comment-avatar placeholder">${esc(nameOf(comment).charAt(0))}</span>`;
      return `<article class="comment" data-comment-id="${comment.id}">${avatar}<div class="comment-body"><div class="comment-bubble"><strong>${esc(nameOf(comment))}</strong><p>${esc(comment.content).replace(/\\n/g, '<br>')}</p></div><div class="comment-meta">${date(comment.created_at)}${canManageComment(comment) ? `<button type="button" class="text-action" data-delete-comment="${comment.id}">ลบ</button>` : ''}</div></div></article>`;
    }

    const commentsSection = `
      <div class="course-interaction">
        <div class="course-actions">
          <button type="button" class="like-button${course.isLiked ? ' liked' : ''}" id="likeCourse" data-course-id="${course.id}" aria-pressed="${Boolean(course.isLiked)}">♥ <span id="likeCount">${Number(course.likeCount || 0)}</span> ถูกใจ</button>
          <span class="comment-count">ความคิดเห็น ${course.comments?.length || 0}</span>
        </div>
        <section class="comments" id="courseCommentsList">
          ${(course.comments || []).map(commentHtml).join('') || '<p class="no-comments">ยังไม่มีความคิดเห็น</p>'}
        </section>
        ${user ? `<form class="comment-form" id="commentForm"><input maxlength="2000" id="commentInput" placeholder="เขียนความคิดเห็น..." required><button class="button primary" type="submit">ส่ง</button></form>` : '<p class="login-hint"><a href="login.html">เข้าสู่ระบบ</a> เพื่อแสดงความคิดเห็น</p>'}
      </div>
    `;

    root.innerHTML = `<article class="learning-layout"><section><p class="eyebrow">ผู้สอน: ${esc(course.instructorName || 'BimClub')}</p><h1>${esc(course.title)}</h1><p class="course-description">${esc(course.description || '')}</p>${toolbarHtml}${playerHtml}${commentsSection}</section><aside class="course-sidebar" id="courseSidebar"><h2>ความคืบหน้าคอร์ส</h2><p>คะแนนผ่าน: <strong>${course.passScore}%</strong></p><div id="certContainer">${course.certificate ? `<div class="certificate-status"><strong>ได้รับใบเซอร์แล้ว</strong><br>รหัส: ${esc(course.certificate.certificateCode)}<br><a href="portfolio.html" class="button secondary" style="margin-top:8px; display:inline-block;">ดูใน Portfolio</a></div>` : '<p>ทำแบบทดสอบท้ายคอร์สเมื่อเรียนจบเพื่อรับใบเซอร์</p>'}</div>${user.role === 'admin' && !course.certificate ? '<button id="adminGrant" class="button secondary">รับใบเซอร์ทันที (ผู้ดูแล)</button>' : ''}</aside></article><section class="quiz-panel"><h2>แบบทดสอบท้ายคอร์ส</h2>${course.quizQuestions.length ? `<form id="quizForm">${course.quizQuestions.map(question => choice(question, 'quiz')).join('')}<button class="button primary" type="submit">ส่งคำตอบ</button></form>` : '<p>คอร์สนี้ยังไม่มีแบบทดสอบท้ายคอร์ส</p>'}</section>`;
    
    const video = document.getElementById('courseVideo');
    const overlay = document.getElementById('stopModalOverlay');
    let seenStops = new Set();
    let ytPlayer = null;

    function handleTriggerStop(next) {
      if (!userStopsEnabled) return;
      if (!next || seenStops.has(next.id) || next.isActive === false) return;
      seenStops.add(next.id);
      
      // หยุดวิดีโอทันที!
      if (video) video.pause();
      if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
      
      if (!overlay) return;
      overlay.style.display = 'flex';
      overlay.innerHTML = `
        <div class="stop-modal-card" role="dialog" aria-modal="true" aria-labelledby="stopModalTitle">
          <div class="stop-modal-header">
            <div class="stop-modal-badge">⏸️ จุดหยุดคิดทบทวนบทเรียน</div>
            <span class="stop-modal-time">⏱️ วินาทีที่ ${next.timeSeconds} (${formatTime(next.timeSeconds)})</span>
          </div>
          <h3 id="stopModalTitle" class="stop-modal-question">${esc(next.question)}</h3>
          <div class="stop-modal-options">
            ${next.options.map((option, idx) => `
              <label class="stop-modal-option">
                <input type="radio" name="stop-choice-${next.id}" value="${idx}">
                <span>${esc(option)}</span>
              </label>
            `).join('')}
          </div>
          <div id="stopModalFeedback" class="stop-modal-feedback" style="display:none;"></div>
          <div class="stop-modal-footer">
            <button type="button" class="button primary" id="btnSubmitStopModal">ส่งคำตอบและเรียนต่อ</button>
            <button type="button" class="button-text" id="btnSkipStopModal">ข้ามคำถามนี้</button>
          </div>
          <div class="stop-modal-optout">
            <label class="check-inline">
              <input type="checkbox" id="chkDisableStops"> ปิดการหยุดถามคำถามสำหรับคอร์สนี้
            </label>
          </div>
        </div>
      `;

      const submitBtn = document.getElementById('btnSubmitStopModal');
      const skipBtn = document.getElementById('btnSkipStopModal');
      const feedback = document.getElementById('stopModalFeedback');
      const chkDisable = document.getElementById('chkDisableStops');

      const closeAndResume = (shouldDisable) => {
        if (shouldDisable) {
          userStopsEnabled = false;
          localStorage.setItem(STORAGE_KEY_STOPS, 'false');
          const toggle = document.getElementById('userStopsToggle');
          const label = document.getElementById('userStopsLabel');
          if (toggle) toggle.checked = false;
          if (label) label.textContent = 'หยุดถามคำถาม: ปิด';
        }
        overlay.style.display = 'none';
        overlay.innerHTML = '';
        if (video) video.play();
        if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
      };

      skipBtn.addEventListener('click', () => {
        closeAndResume(chkDisable && chkDisable.checked);
      });

      submitBtn.addEventListener('click', async () => {
        const checked = overlay.querySelector('input[type="radio"]:checked');
        if (!checked) return alert('กรุณาเลือกคำตอบก่อน');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังตรวจคำตอบ...';
        try {
          const res = await fetch(`/api/courses/${id}/stops/${next.id}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedIndex: Number(checked.value) })
          });
          const ansData = await res.json();
          if (ansData.success && !ansData.isCorrect) {
            feedback.className = 'stop-modal-feedback error';
            feedback.style.display = 'block';
            feedback.textContent = ansData.message || 'คำตอบยังไม่ถูกต้อง ลองเลือกใหม่อีกครั้ง';
            submitBtn.disabled = false;
            submitBtn.textContent = 'ลองตอบอีกครั้ง';
            return;
          }
          feedback.className = 'stop-modal-feedback success';
          feedback.style.display = 'block';
          feedback.textContent = ansData.message || 'ตอบถูกต้อง! กำลังเล่นวิดีโอต่อ...';
        } catch (e) {
          // If network error, proceed gracefully
        }
        
        setTimeout(() => {
          closeAndResume(chkDisable && chkDisable.checked);
        }, 600);
      });
    }

    // Toggle Listener
    const userStopsToggle = document.getElementById('userStopsToggle');
    const userStopsLabel = document.getElementById('userStopsLabel');
    if (userStopsToggle) {
      userStopsToggle.addEventListener('change', () => {
        userStopsEnabled = userStopsToggle.checked;
        localStorage.setItem(STORAGE_KEY_STOPS, String(userStopsEnabled));
        if (userStopsLabel) userStopsLabel.textContent = userStopsEnabled ? 'หยุดถามคำถาม: เปิด' : 'หยุดถามคำถาม: ปิด';
        
        if (!userStopsEnabled && overlay && overlay.style.display !== 'none') {
          overlay.style.display = 'none';
          overlay.innerHTML = '';
          if (video) video.play();
          if (ytPlayer && ytPlayer.playVideo) ytPlayer.playVideo();
        }
        show(userStopsEnabled
          ? 'เปิดการหยุดวิดีโอเพื่อถามคำถามแล้ว ระบบจะเด้งคำถามเมื่อถึงจุดที่กำหนด'
          : 'ปิดการหยุดวิดีโอแล้ว วิดีโอจะเล่นต่อเนื่องโดยไม่หยุดถามคำถาม', 'success');
      });
    }

    if (video) {
      video.addEventListener('timeupdate', () => {
        if (!userStopsEnabled) return;
        const next = course.stops.find(stop => !seenStops.has(stop.id) && stop.isActive !== false && video.currentTime >= stop.timeSeconds);
        if (next) handleTriggerStop(next);
      });
    }

    // Support YouTube Iframe API if YouTube video
    if (ytEmbedUrl && activeStops.length > 0) {
      const initYT = () => {
        if (!window.YT || !window.YT.Player) return;
        ytPlayer = new YT.Player('courseYoutubeIframe', {
          events: {
            'onStateChange': (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                if (!window._ytCheckInterval) {
                  window._ytCheckInterval = setInterval(() => {
                    if (ytPlayer && ytPlayer.getCurrentTime && userStopsEnabled) {
                      const cur = ytPlayer.getCurrentTime();
                      const next = course.stops.find(stop => !seenStops.has(stop.id) && stop.isActive !== false && cur >= stop.timeSeconds);
                      if (next) handleTriggerStop(next);
                    }
                  }, 300);
                }
              } else {
                if (window._ytCheckInterval) {
                  clearInterval(window._ytCheckInterval);
                  window._ytCheckInterval = null;
                }
              }
            }
          }
        });
      };

      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
        window.onYouTubeIframeAPIReady = initYT;
      } else {
        initYT();
      }
    }

    const quizForm = document.getElementById('quizForm');
    if (quizForm) quizForm.addEventListener('submit', async event => {
      event.preventDefault();
      const answers = course.quizQuestions.map(question => ({
        questionId: question.id,
        selectedIndex: Number(quizForm.querySelector(`input[name="quiz-${question.id}"]:checked`)?.value)
      })).filter(answer => Number.isInteger(answer.selectedIndex));
      
      if (answers.length !== course.quizQuestions.length) return show('กรุณาตอบแบบทดสอบให้ครบทุกข้อ');
      
      try {
        const result = await fetch(`/api/courses/${id}/quiz/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers })
        });
        const resultData = await result.json();
        if (!result.ok) throw new Error(resultData.message);
        
        show(`${resultData.message} คะแนนที่ได้ ${resultData.score}%`, resultData.passed ? 'success' : '');
        if (resultData.passed) {
          quizForm.querySelector('button').disabled = true;
          const certBox = document.getElementById('certContainer');
          if (certBox && resultData.certificate) {
            certBox.innerHTML = `<div class="certificate-status"><strong>ได้รับใบเซอร์แล้ว</strong><br>รหัส: ${esc(resultData.certificate.certificateCode)}<br><a href="portfolio.html" class="button secondary" style="margin-top:8px; display:inline-block;">ดูใน Portfolio</a></div>`;
          }
        }
      } catch (error) {
        show(error.message || 'ไม่สามารถส่งคำตอบได้');
      }
    });

    const adminGrant = document.getElementById('adminGrant');
    if (adminGrant) adminGrant.addEventListener('click', async () => {
      if (!confirm('ยืนยันรับใบเซอร์ทันทีโดยข้ามการเรียนและการสอบ?')) return;
      try {
        const result = await fetch(`/api/courses/${id}/admin-grant-certificate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        const resultData = await result.json();
        if (!result.ok) throw new Error(resultData.message);
        show(`${resultData.message} รหัส: ${resultData.certificate.certificateCode}`, 'success');
        adminGrant.remove();
        const certBox = document.getElementById('certContainer');
        if (certBox && resultData.certificate) {
          certBox.innerHTML = `<div class="certificate-status"><strong>ได้รับใบเซอร์แล้ว</strong><br>รหัส: ${esc(resultData.certificate.certificateCode)}<br><a href="portfolio.html" class="button secondary" style="margin-top:8px; display:inline-block;">ดูใน Portfolio</a></div>`;
        }
      } catch (error) {
        show(error.message);
      }
    });

    const likeBtn = document.getElementById('likeCourse');
    if (likeBtn) likeBtn.addEventListener('click', async () => {
      try {
        const active = likeBtn.classList.contains('liked');
        const response = await fetch(`/api/courses/${id}/likes`, { method: active ? 'DELETE' : 'POST' });
        const resultData = await response.json();
        if (!response.ok) throw new Error(resultData.message);
        likeBtn.classList.toggle('liked', resultData.isLiked);
        likeBtn.setAttribute('aria-pressed', resultData.isLiked);
        document.getElementById('likeCount').textContent = resultData.likeCount;
      } catch (error) { show(error.message); }
    });

    const commentForm = document.getElementById('commentForm');
    if (commentForm) commentForm.addEventListener('submit', async event => {
      event.preventDefault();
      const input = document.getElementById('commentInput');
      const btn = commentForm.querySelector('button');
      btn.disabled = true;
      try {
        const response = await fetch(`/api/courses/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: input.value.trim() }) });
        const resultData = await response.json();
        if (!response.ok) throw new Error(resultData.message);
        input.value = '';
        
        // Append new comment locally without full reload
        const list = document.getElementById('courseCommentsList');
        if (list.querySelector('.no-comments')) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', commentHtml(resultData.comment));
        
        const countSpan = document.querySelector('.comment-count');
        const currentCount = parseInt(countSpan.textContent.replace(/[^0-9]/g, '')) || 0;
        countSpan.textContent = `ความคิดเห็น ${currentCount + 1}`;
      } catch (error) { show(error.message); } finally { btn.disabled = false; }
    });

    document.getElementById('courseCommentsList')?.addEventListener('click', async event => {
      const deleteBtn = event.target.closest('[data-delete-comment]');
      if (!deleteBtn) return;
      if (!confirm('ต้องการลบความคิดเห็นนี้ใช่หรือไม่?')) return;
      try {
        const commentId = deleteBtn.dataset.deleteComment;
        const response = await fetch(`/api/courses/${id}/comments/${commentId}`, { method: 'DELETE' });
        const resultData = await response.json();
        if (!response.ok) throw new Error(resultData.message);
        deleteBtn.closest('.comment').remove();
        
        const countSpan = document.querySelector('.comment-count');
        const currentCount = parseInt(countSpan.textContent.replace(/[^0-9]/g, '')) || 1;
        countSpan.textContent = `ความคิดเห็น ${Math.max(0, currentCount - 1)}`;
        
        const list = document.getElementById('courseCommentsList');
        if (list.children.length === 0) list.innerHTML = '<p class="no-comments">ยังไม่มีความคิดเห็น</p>';
      } catch (error) { show(error.message); }
    });
  } catch (error) { root.innerHTML = ''; show(error.message || 'ไม่สามารถโหลดคอร์สได้'); }
});
