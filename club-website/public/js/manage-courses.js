document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('manageCourseGrid');
  const message = document.getElementById('courseMessage');
  const search = document.getElementById('manageCourseSearch');
  const status = document.getElementById('manageCourseStatus');
  const sort = document.getElementById('manageCourseSort');
  const pageSize = 6;
  let courses = [];
  let page = 1;

  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const show = (text, type = '') => { message.textContent = text; message.className = `notice ${type}`; message.hidden = false; };

  function filteredCourses() {
    const query = search.value.trim().toLocaleLowerCase('th');
    const filtered = courses.filter((course) => {
      const searchable = `${course.title} ${course.description || ''} ${course.instructorName || ''}`.toLocaleLowerCase('th');
      return (!query || searchable.includes(query))
        && (status.value === 'all' || (status.value === 'published') === course.isPublished);
    });
    if (sort.value === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title, 'th'));
    return filtered;
  }

  function render() {
    const filtered = filteredCourses();
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pageCount);
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    grid.innerHTML = '';

    if (!visible.length) grid.innerHTML = '<div class="admin-empty">ไม่พบคอร์สตามเงื่อนไข</div>';
    visible.forEach((course) => {
      const article = document.createElement('article');
      article.className = 'course-card';
      article.innerHTML = `
        <div class="course-cover">${course.thumbnailUrl ? `<img src="${esc(course.thumbnailUrl)}" alt="">` : '<span aria-hidden="true">📚</span>'}</div>
        <div class="course-card-body">
          <p class="course-meta">${course.isPublished ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}${course.instructorName ? ` · ${esc(course.instructorName)}` : ''}</p>
          <h2>${esc(course.title)}</h2><p>${esc(course.description || 'ยังไม่มีรายละเอียดคอร์ส')}</p>
          <div class="button-row"><a class="button primary" href="course-editor.html?id=${course.id}">แก้ไข</a>${course.isPublished ? `<a class="button secondary" href="course.html?id=${course.id}">Preview</a>` : ''}<button class="button danger" type="button" data-delete="${course.id}" data-title="${esc(course.title)}">ลบ</button></div>
        </div>`;
      grid.appendChild(article);
    });
    document.getElementById('manageCoursePageInfo').textContent = `หน้า ${page} จาก ${pageCount} · ${filtered.length} คอร์ส`;
    document.getElementById('manageCoursePrev').disabled = page <= 1;
    document.getElementById('manageCourseNext').disabled = page >= pageCount;
  }

  async function load() {
    const response = await fetch('/api/courses/manage');
    const data = await response.json();
    if (response.status === 401) return location.href = 'login.html';
    if (response.status === 403) return show('หน้านี้สำหรับอาจารย์และผู้ดูแลระบบเท่านั้น');
    if (!response.ok) throw new Error(data.message);
    courses = data.courses;
    render();
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

  grid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete]');
    if (!button || !confirm(`ต้องการลบคอร์ส “${button.dataset.title}” ใช่หรือไม่?`)) return;
    try {
      const response = await fetch(`/api/courses/${button.dataset.delete}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      show(data.message, 'success');
      await load();
    } catch (error) { show(error.message || 'ไม่สามารถลบคอร์สได้'); }
  });

  [search, status, sort].forEach((control) => control.addEventListener('input', () => { page = 1; render(); }));
  document.getElementById('manageCoursePrev').addEventListener('click', () => { page -= 1; render(); });
  document.getElementById('manageCourseNext').addEventListener('click', () => { page += 1; render(); });
  try { await load(); } catch (error) { show(error.message || 'ไม่สามารถโหลดข้อมูลได้'); }
});
