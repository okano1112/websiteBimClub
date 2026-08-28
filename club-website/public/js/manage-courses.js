document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('manageCourseGrid');
  const message = document.getElementById('courseMessage');
  const show = (text) => { message.textContent = text; message.hidden = false; };
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  async function load() {
    const response = await fetch('/api/courses/manage');
    const data = await response.json();
    if (response.status === 401) return location.href = 'login.html';
    if (response.status === 403) return show('หน้านี้สำหรับอาจารย์และผู้ดูแลระบบเท่านั้น');
    if (!response.ok) throw new Error(data.message);
    if (!data.courses.length) return show('ยังไม่มีคอร์ส กด “สร้างคอร์ส” เพื่อเริ่มต้น');
    grid.innerHTML = data.courses.map(course => `<article class="course-card">
      <div class="course-cover">${course.thumbnailUrl ? `<img src="${esc(course.thumbnailUrl)}" alt="">` : '<span>📚</span>'}</div>
      <div class="course-card-body"><p class="course-meta">${course.isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}${course.instructorName ? ` · ${esc(course.instructorName)}` : ''}</p><h2>${esc(course.title)}</h2><p>${esc(course.description || 'ยังไม่มีรายละเอียดคอร์ส')}</p><div class="button-row"><a class="button primary" href="course-editor.html?id=${course.id}">แก้ไขคอร์ส</a><button class="button danger" data-delete="${course.id}" data-title="${esc(course.title)}">ลบ</button></div></div>
    </article>`).join('');
  }
  document.getElementById('createCourse').addEventListener('click', async () => {
    const title = prompt('ชื่อคอร์ส');
    if (!title || !title.trim()) return;
    try {
      const response = await fetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      location.href = `course-editor.html?id=${data.course.id}`;
    } catch (error) { show(error.message || 'ไม่สามารถสร้างคอร์สได้'); }
  });
  grid.addEventListener('click', async event => {
    const button = event.target.closest('[data-delete]');
    if (!button || !confirm(`ต้องการลบคอร์ส “${button.dataset.title}” ใช่หรือไม่?`)) return;
    try {
      const response = await fetch(`/api/courses/${button.dataset.delete}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      grid.innerHTML = ''; message.hidden = true; await load();
    } catch (error) { show(error.message || 'ไม่สามารถลบคอร์สได้'); }
  });
  try { await load(); } catch (error) { show(error.message || 'ไม่สามารถโหลดข้อมูลได้'); }
});
