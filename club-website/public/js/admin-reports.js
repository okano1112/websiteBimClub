// MOCKUP-START: ADMIN REPORTS
// MOCKUP UI ONLY - Filtering, sorting, pagination, and export preview use mock data.
document.addEventListener('DOMContentLoaded', async () => {
  const authResponse = await fetch('/api/auth/me');
  if (!authResponse.ok) return window.location.href = 'login.html';
  const authData = await authResponse.json();
  if (authData.user?.role !== 'admin') return window.location.href = '../index.html';

  const search = document.getElementById('reportSearch');
  const category = document.getElementById('reportCategory');
  const sort = document.getElementById('reportSort');
  const rows = document.getElementById('reportRows');
  const feedback = document.getElementById('reportFeedback');
  const pageSize = 5;
  let page = 1;

  function filteredReports() {
    const query = search.value.trim().toLocaleLowerCase('th');
    const filtered = window.BimClubAdminMockData.reports.filter((report) =>
      (category.value === 'all' || report.category === category.value)
      && (!query || `${report.metric} ${report.period}`.toLocaleLowerCase('th').includes(query))
    );
    if (sort.value === 'change-desc') filtered.sort((a, b) => b.change - a.change);
    return filtered;
  }

  function render() {
    const reports = filteredReports();
    const pageCount = Math.max(1, Math.ceil(reports.length / pageSize));
    page = Math.min(page, pageCount);
    rows.innerHTML = '';
    reports.slice((page - 1) * pageSize, page * pageSize).forEach((report) => {
      const row = document.createElement('tr');
      [report.period, report.category, report.metric, report.value, `${report.change > 0 ? '+' : ''}${report.change}%`, report.status === 'positive' ? 'ปกติ' : 'ควรตรวจสอบ'].forEach((value) => {
        const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell);
      });
      rows.appendChild(row);
    });
    if (!reports.length) rows.innerHTML = '<tr><td colspan="6" class="loading-text">ไม่พบข้อมูลรายงาน</td></tr>';
    document.getElementById('reportPageInfo').textContent = `หน้า ${page} จาก ${pageCount} · ${reports.length} รายการ`;
    document.getElementById('reportPrev').disabled = page <= 1;
    document.getElementById('reportNext').disabled = page >= pageCount;
  }

  [search, category, sort].forEach((control) => control.addEventListener('input', () => { page = 1; render(); }));
  document.getElementById('reportPrev').addEventListener('click', () => { page -= 1; render(); });
  document.getElementById('reportNext').addEventListener('click', () => { page += 1; render(); });
  document.getElementById('reportExport').addEventListener('click', () => {
    feedback.hidden = false;
    feedback.textContent = 'MOCKUP: จำลองการ Export สำเร็จ ยังไม่มีไฟล์หรือข้อมูลจริงถูกสร้าง';
  });
  render();
});
// MOCKUP-END: ADMIN REPORTS
