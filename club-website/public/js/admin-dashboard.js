document.addEventListener('DOMContentLoaded', async () => {
  try {
  const authResponse = await fetch('/api/auth/me');
  if (!authResponse.ok) return window.location.href = 'login.html';
  const authData = await authResponse.json();
  if (authData.user?.role !== 'admin') return window.location.href = '../index.html';

  const response = await fetch('/api/admin/dashboard');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    const message = document.getElementById('dashboardMessage');
    document.getElementById('dashboardStats').replaceChildren();
    message.hidden = false;
    message.textContent = payload.message || 'โหลดข้อมูลไม่สำเร็จ';
    return;
  }
  const data = payload.metrics;
  const stats = document.getElementById('dashboardStats');
  const activity = document.getElementById('recentActivity');
  stats.innerHTML = '';
  const statsData = [
    ['บัญชีที่ยังไม่ถูกลบ', data.users], ['ยังไม่ยืนยัน', data.unverifiedUsers],
    ['คอร์สทั้งหมด', data.courses], ['คอร์สเผยแพร่', data.publishedCourses],
    ['กิจกรรม', data.activities], ['ผลงานทางการของชมรม', data.achievements],
    ['คำขออาจารย์รอตรวจ', data.pendingInstructorRequests], ['โพสต์ชุมชน', data.posts]
  ];
  statsData.forEach(([labelText, valueText]) => {
    const card = document.createElement('article');
    card.className = 'admin-stat-card';
    const label = document.createElement('span');
    label.textContent = labelText;
    const value = document.createElement('strong');
    value.textContent = valueText;
    const trend = document.createElement('small');
    trend.textContent = 'ข้อมูลปัจจุบัน';
    card.append(label, value, trend);
    stats.appendChild(card);
  });

  activity.textContent = 'สถิติอัปเดตจากฐานข้อมูลปัจจุบัน';
  } catch {
    document.getElementById('dashboardStats').replaceChildren();
    const message = document.getElementById('dashboardMessage');
    message.hidden = false; message.textContent = 'เชื่อมต่อไม่สำเร็จ กรุณารีเฟรชเพื่อลองใหม่';
  }
});
