document.addEventListener('DOMContentLoaded', async () => {
  const rows = document.getElementById('memberRows');
  const search = document.getElementById('memberSearch');
  const role = document.getElementById('memberRole');
  const status = document.getElementById('memberStatus');
  const previous = document.getElementById('memberPrev');
  const next = document.getElementById('memberNext');
  const pageInfo = document.getElementById('memberPageInfo');
  const modal = document.getElementById('memberModal');
  const details = document.getElementById('memberDetails');
  const pageSize = 8;
  let members = [];
  let page = 1;

  const memberStatus = (member) => member.deleted_at ? 'deleted' : member.is_banned ? 'banned' : member.is_verified ? 'active' : 'unverified';
  const statusLabel = { active: 'ใช้งานได้', unverified: 'ยังไม่ยืนยัน', banned: 'ถูกระงับ', deleted: 'ถูกลบ' };

  function filteredMembers() {
    const query = search.value.trim().toLocaleLowerCase('th');
    return members.filter((member) => {
      const text = [member.username, member.email, member.full_name].join(' ').toLocaleLowerCase('th');
      return (!query || text.includes(query))
        && (role.value === 'all' || member.role === role.value)
        && (status.value === 'all' || memberStatus(member) === status.value);
    });
  }

  function addCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }

  function render() {
    const filtered = filteredMembers();
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pageCount);
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
    rows.innerHTML = '';

    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.className = 'loading-text';
      cell.textContent = 'ไม่พบสมาชิกตามเงื่อนไข';
      row.appendChild(cell);
      rows.appendChild(row);
    }

    visible.forEach((member) => {
      const row = document.createElement('tr');
      addCell(row, member.full_name || member.username);
      addCell(row, member.role);
      addCell(row, member.is_verified ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน');
      addCell(row, statusLabel[memberStatus(member)]);
      addCell(row, new Date(member.created_at).toLocaleDateString('th-TH'));
      const action = document.createElement('td');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action-btn btn-edit';
      button.textContent = 'ดูรายละเอียด';
      button.addEventListener('click', () => openDetails(member));
      action.appendChild(button);
      row.appendChild(action);
      rows.appendChild(row);
    });

    pageInfo.textContent = `หน้า ${page} จาก ${pageCount} · ${filtered.length} รายการ`;
    previous.disabled = page <= 1;
    next.disabled = page >= pageCount;
  }

  function openDetails(member) {
    const fields = [
      ['ชื่อ', member.full_name || '-'], ['Username', member.username], ['อีเมล', member.email],
      ['โทรศัพท์', member.phone || '-'], ['Role', member.role], ['สถานะ', statusLabel[memberStatus(member)]]
    ];
    details.innerHTML = '';
    fields.forEach(([label, value]) => {
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'); description.textContent = value;
      details.append(term, description);
    });
    modal.style.display = 'block';
    document.getElementById('closeMemberModal').focus();
  }

  [search, role, status].forEach((control) => control.addEventListener('input', () => { page = 1; render(); }));
  previous.addEventListener('click', () => { page -= 1; render(); });
  next.addEventListener('click', () => { page += 1; render(); });
  document.getElementById('closeMemberModal').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') modal.style.display = 'none'; });

  try {
    const response = await fetch('/api/admin/users');
    if (response.status === 401) return window.location.href = 'login.html';
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'ไม่มีสิทธิ์เข้าถึง');
    members = data.users.filter((member) => member.role !== 'admin');
    render();
  } catch (error) {
    rows.innerHTML = '';
    const row = document.createElement('tr');
    const cell = document.createElement('td'); cell.colSpan = 6; cell.className = 'admin-error'; cell.textContent = error.message;
    row.appendChild(cell); rows.appendChild(row);
  }
});
