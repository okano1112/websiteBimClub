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

    root.innerHTML = `<article class="learning-layout"><section><p class="eyebrow">ผู้สอน: ${esc(course.instructorName || 'BimClub')}</p><h1>${esc(course.title)}</h1><p class="course-description">${esc(course.description || '')}</p>${playerHtml}<div id="stopQuestion" class="stop-question" hidden></div>${commentsSection}</section><aside class="course-sidebar"><h2>ความคืบหน้าคอร์ส</h2><p>คะแนนผ่าน: <strong>${course.passScore}%</strong></p>${course.certificate ? `<div class="certificate-status"><strong>ได้รับใบเซอร์แล้ว</strong><br>รหัส: ${esc(course.certificate.certificateCode)}</div>` : '<p>ทำแบบทดสอบท้ายคอร์สเมื่อเรียนจบเพื่อรับใบเซอร์</p>'}${user.role === 'admin' && !course.certificate ? '<button id="adminGrant" class="button secondary">รับใบเซอร์ทันที (ผู้ดูแล)</button>' : ''}</aside></article><section class="quiz-panel"><h2>แบบทดสอบท้ายคอร์ส</h2>${course.quizQuestions.length ? `<form id="quizForm">${course.quizQuestions.map(question => choice(question, 'quiz')).join('')}<button class="button primary" type="submit">ส่งคำตอบ</button></form>` : '<p>คอร์สนี้ยังไม่มีแบบทดสอบท้ายคอร์ส</p>'}</section>`;
    const video = document.getElementById('courseVideo');
    const stopBox = document.getElementById('stopQuestion'); let seenStops = new Set();
    if (video) video.addEventListener('timeupdate', () => {
      const next = course.stops.find(stop => !seenStops.has(stop.id) && video.currentTime >= stop.timeSeconds);
      if (!next) return; seenStops.add(next.id); video.pause(); stopBox.innerHTML = `<h3>คำถามระหว่างวิดีโอ</h3>${choice(next, 'stop')}<button class="button primary" type="button">ตอบแล้ว เรียนต่อ</button>`; stopBox.hidden = false;
      stopBox.querySelector('button').addEventListener('click', () => { if (!stopBox.querySelector('input:checked')) return alert('กรุณาเลือกคำตอบก่อน'); stopBox.hidden = true; video.play(); });
    });
    const quizForm = document.getElementById('quizForm');
    if (quizForm) quizForm.addEventListener('submit', async event => { event.preventDefault(); const answers = course.quizQuestions.map(question => ({ questionId: question.id, selectedIndex: Number(quizForm.querySelector(`input[name="quiz-${question.id}"]:checked`)?.value) })).filter(answer => Number.isInteger(answer.selectedIndex)); if (answers.length !== course.quizQuestions.length) return show('กรุณาตอบแบบทดสอบให้ครบทุกข้อ'); try { const result = await fetch(`/api/courses/${id}/quiz/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) }); const resultData = await result.json(); if (!result.ok) throw new Error(resultData.message); show(`${resultData.message} คะแนนที่ได้ ${resultData.score}%`, resultData.passed ? 'success' : ''); if (resultData.passed) quizForm.querySelector('button').disabled = true; } catch (error) { show(error.message || 'ไม่สามารถส่งคำตอบได้'); } });
    const adminGrant = document.getElementById('adminGrant');
    if (adminGrant) adminGrant.addEventListener('click', async () => { if (!confirm('ยืนยันรับใบเซอร์ทันทีโดยข้ามการเรียนและการสอบ?')) return; try { const result = await fetch(`/api/courses/${id}/admin-grant-certificate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); const resultData = await result.json(); if (!result.ok) throw new Error(resultData.message); show(`${resultData.message} รหัส: ${resultData.certificate.certificateCode}`, 'success'); adminGrant.remove(); } catch (error) { show(error.message); } });

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
        countSpan.textContent = \`ความคิดเห็น \${currentCount + 1}\`;
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
        countSpan.textContent = \`ความคิดเห็น \${currentCount - 1}\`;
        
        const list = document.getElementById('courseCommentsList');
        if (list.children.length === 0) list.innerHTML = '<p class="no-comments">ยังไม่มีความคิดเห็น</p>';
      } catch (error) { show(error.message); }
    });
  } catch (error) { root.innerHTML = ''; show(error.message || 'ไม่สามารถโหลดคอร์สได้'); }
});
