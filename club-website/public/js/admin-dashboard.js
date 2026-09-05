// MOCKUP-START: ADMIN DASHBOARD
// MOCKUP UI ONLY - Replace BimClubAdminMockData with an admin dashboard service before production.
document.addEventListener('DOMContentLoaded', async () => {
  const authResponse = await fetch('/api/auth/me');
  if (!authResponse.ok) return window.location.href = 'login.html';
  const authData = await authResponse.json();
  if (authData.user?.role !== 'admin') return window.location.href = '../index.html';

  const data = window.BimClubAdminMockData.dashboard;
  const stats = document.getElementById('dashboardStats');
  const activity = document.getElementById('recentActivity');
  stats.innerHTML = '';
  data.stats.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'admin-stat-card';
    const label = document.createElement('span');
    label.textContent = item.label;
    const value = document.createElement('strong');
    value.textContent = item.value;
    const trend = document.createElement('small');
    trend.textContent = item.trend;
    card.append(label, value, trend);
    stats.appendChild(card);
  });

  data.activities.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'admin-activity-item';
    const dot = document.createElement('span');
    dot.className = 'admin-activity-dot';
    const text = document.createElement('p');
    text.textContent = item.text;
    const time = document.createElement('small');
    time.textContent = item.time;
    row.append(dot, text, time);
    activity.appendChild(row);
  });
});
// MOCKUP-END: ADMIN DASHBOARD
