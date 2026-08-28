document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('courseGrid');
  const message = document.getElementById('courseMessage');
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const show = (text) => { message.textContent = text; message.hidden = false; };
  try {
    const response = await fetch('/api/courses');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    if (!data.courses.length) return show('ยังไม่มีคอร์สที่เผยแพร่ในขณะนี้');
    grid.innerHTML = data.courses.map(course => `
      <article class="course-card">
        <div class="course-cover">${course.thumbnailUrl ? `<img src="${esc(course.thumbnailUrl)}" alt="">` : '<span>📚</span>'}</div>
        <div class="course-card-body"><p class="course-meta">ผู้สอน: ${esc(course.instructorName || 'BimClub')}</p><h2>${esc(course.title)}</h2><p>${esc(course.description || 'ยังไม่มีรายละเอียดคอร์ส')}</p><a class="button primary" href="course.html?id=${course.id}">เริ่มเรียน</a></div>
      </article>`).join('');
  } catch (error) { show(error.message || 'ไม่สามารถโหลดคอร์สได้'); }
});
