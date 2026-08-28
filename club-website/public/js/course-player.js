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
    const playerHtml = !course.videoUrl ? '<div class="video-empty">คอร์สนี้ยังไม่ได้เพิ่มวิดีโอ</div>' : course.videoUrl.includes('youtube-nocookie.com/embed/') ? `<div class="video-wrap"><iframe src="${esc(course.videoUrl)}" title="วิดีโอคอร์ส YouTube" allowfullscreen></iframe></div>` : `<div class="video-wrap"><video id="courseVideo" controls controlsList="nodownload" src="${esc(course.videoUrl)}"></video></div>`;
    root.innerHTML = `<article class="learning-layout"><section><p class="eyebrow">ผู้สอน: ${esc(course.instructorName || 'BimClub')}</p><h1>${esc(course.title)}</h1><p class="course-description">${esc(course.description || '')}</p>${playerHtml}<div id="stopQuestion" class="stop-question" hidden></div></section><aside class="course-sidebar"><h2>ความคืบหน้าคอร์ส</h2><p>คะแนนผ่าน: <strong>${course.passScore}%</strong></p>${course.certificate ? `<div class="certificate-status"><strong>ได้รับใบเซอร์แล้ว</strong><br>รหัส: ${esc(course.certificate.certificateCode)}</div>` : '<p>ทำแบบทดสอบท้ายคอร์สเมื่อเรียนจบเพื่อรับใบเซอร์</p>'}${user.role === 'admin' && !course.certificate ? '<button id="adminGrant" class="button secondary">รับใบเซอร์ทันที (ผู้ดูแล)</button>' : ''}</aside></article><section class="quiz-panel"><h2>แบบทดสอบท้ายคอร์ส</h2>${course.quizQuestions.length ? `<form id="quizForm">${course.quizQuestions.map(question => choice(question, 'quiz')).join('')}<button class="button primary" type="submit">ส่งคำตอบ</button></form>` : '<p>คอร์สนี้ยังไม่มีแบบทดสอบท้ายคอร์ส</p>'}</section>`;
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
  } catch (error) { root.innerHTML = ''; show(error.message || 'ไม่สามารถโหลดคอร์สได้'); }
});
