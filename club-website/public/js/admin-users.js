document.addEventListener('DOMContentLoaded', async () => {
  const usersList = document.getElementById('usersList');
  const feedback = document.getElementById('userFeedback');
  const search = document.getElementById('userSearch');
  const roleFilter = document.getElementById('userRoleFilter');
  const statusFilter = document.getElementById('userStatusFilter');
  const sortControl = document.getElementById('userSort');
  const pageSize = 8;
  let allUsers = [];
  let currentUser = null;
  let selectedUser = null;
  let page = 1;

  function getStatus(user) {
    if (user.deleted_at) return 'deleted';
    if (user.is_banned) return 'banned';
    if (!user.is_verified) return 'unverified';
    return 'active';
  }

  function showFeedback(message, isError = false) {
    feedback.hidden = false;
    feedback.className = `admin-feedback${isError ? ' error' : ''}`;
    feedback.textContent = message;
  }

  function filteredUsers() {
    const query = search.value.trim().toLocaleLowerCase('th');
    const users = allUsers.filter((user) => {
      const searchable = [user.username, user.email, user.full_name].join(' ').toLocaleLowerCase('th');
      return (!query || searchable.includes(query))
        && (roleFilter.value === 'all' || user.role === roleFilter.value)
        && (statusFilter.value === 'all' || getStatus(user) === statusFilter.value);
    });
    if (sortControl.value === 'name') users.sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username, 'th'));
    if (sortControl.value === 'role') users.sort((a, b) => a.role.localeCompare(b.role));
    return users;
  }

  function badge(text, type) {
    const element = document.createElement('span');
    element.className = `badge ${type}`;
    element.textContent = text;
    return element;
  }

  function actionButton(label, action, user, className = 'btn-edit') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-btn ${className}`;
    button.dataset.action = action;
    button.dataset.userId = user.id;
    button.textContent = label;
    return button;
  }

  function renderUsers() {
    const users = filteredUsers();
    const pageCount = Math.max(1, Math.ceil(users.length / pageSize));
    page = Math.min(page, pageCount);
    const visible = users.slice((page - 1) * pageSize, page * pageSize);
    usersList.innerHTML = '';
    if (!visible.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td'); cell.colSpan = 5; cell.className = 'loading-text'; cell.textContent = 'ไม่พบผู้ใช้งานตามเงื่อนไข';
      row.appendChild(cell); usersList.appendChild(row);
    }

    visible.forEach((user) => {
      const row = document.createElement('tr');
      const idCell = document.createElement('td'); idCell.textContent = user.id;
      const identity = document.createElement('td');
      const name = document.createElement('strong'); name.textContent = user.full_name || user.username;
      const email = document.createElement('small'); email.style.display = 'block'; email.textContent = `${user.username} · ${user.email}`;
      identity.append(name, email);
      const roleCell = document.createElement('td'); roleCell.appendChild(badge(user.role, user.role));
      const statusCell = document.createElement('td');
      const status = getStatus(user);
      statusCell.appendChild(badge({ active: 'ปกติ', unverified: 'ยังไม่ยืนยัน', banned: 'ถูกแบน', deleted: 'ถูกลบ' }[status], status === 'active' ? 'user' : status));
      const actions = document.createElement('td');
      actions.append(actionButton('รายละเอียด', 'detail', user), actionButton('แก้ไข', 'edit', user), actionButton('เปลี่ยนรหัส', 'password', user));
      if (Number(user.id) !== Number(currentUser.id) && user.role !== 'admin') {
        if (user.deleted_at) actions.append(actionButton('กู้คืน', 'restore', user, 'btn-restore'));
        else {
          actions.append(actionButton(user.is_banned ? 'ปลดแบน' : 'แบน', 'ban', user, user.is_banned ? 'btn-unban' : 'btn-ban'));
          actions.append(actionButton('ลบบัญชี', 'delete', user, 'btn-delete'));
        }
      }
      row.append(idCell, identity, roleCell, statusCell, actions);
      usersList.appendChild(row);
    });
    document.getElementById('userPageInfo').textContent = `หน้า ${page} จาก ${pageCount} · ${users.length} รายการ`;
    document.getElementById('userPrev').disabled = page <= 1;
    document.getElementById('userNext').disabled = page >= pageCount;
  }

  async function request(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'ดำเนินการไม่สำเร็จ');
    return data;
  }

  async function loadUsers() { const data = await request('/api/admin/users'); allUsers = data.users; renderUsers(); }
  function showModal(id) { document.getElementById(id).style.display = 'block'; }
  function closeModal(id) { document.getElementById(id).style.display = 'none'; }

  function openDetails(user) {
    const fields = [['ID', user.id], ['ชื่อ', user.full_name || '-'], ['Username', user.username], ['อีเมล', user.email], ['โทรศัพท์', user.phone || '-'], ['Role', user.role], ['สถานะ', getStatus(user)], ['สมัครเมื่อ', new Date(user.created_at).toLocaleString('th-TH')]];
    const details = document.getElementById('userDetails'); details.innerHTML = '';
    fields.forEach(([label, value]) => { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; details.append(dt, dd); });
    showModal('userDetailModal');
  }

  usersList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const user = allUsers.find((item) => Number(item.id) === Number(button.dataset.userId));
    if (!user) return;
    selectedUser = user;
    try {
      if (button.dataset.action === 'detail') return openDetails(user);
      if (button.dataset.action === 'edit') {
        document.getElementById('editFullName').value = user.full_name || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editRole').value = user.role;
        document.getElementById('editRole').disabled = Number(user.id) === Number(currentUser.id);
        return showModal('editUserModal');
      }
      if (button.dataset.action === 'password') {
        document.getElementById('passwordModalUser').textContent = `ผู้ใช้: ${user.username}`;
        document.getElementById('newPassword').value = '';
        return showModal('passwordModal');
      }
      const confirmation = { ban: user.is_banned ? 'ยืนยันการปลดแบนบัญชีนี้?' : 'ยืนยันการแบนบัญชีนี้?', delete: 'ยืนยันการ Soft Delete บัญชีนี้?', restore: 'ยืนยันการกู้คืนบัญชีนี้?' }[button.dataset.action];
      if (!confirm(confirmation)) return;
      if (button.dataset.action === 'ban') await request(`/api/admin/users/${user.id}/ban`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isBanned: !user.is_banned }) });
      if (button.dataset.action === 'delete') await request(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (button.dataset.action === 'restore') await request(`/api/admin/users/${user.id}/restore`, { method: 'PUT' });
      showFeedback('อัปเดตสถานะผู้ใช้งานสำเร็จ'); await loadUsers();
    } catch (error) { showFeedback(error.message, true); }
  });

  document.getElementById('editUserForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedUser) return;
    try {
      const nextRole = document.getElementById('editRole').value;
      if (nextRole !== selectedUser.role && Number(selectedUser.id) !== Number(currentUser.id) && !confirm(`ยืนยันการเปลี่ยน Role เป็น ${nextRole}?`)) return;
      await request(`/api/admin/users/${selectedUser.id}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: document.getElementById('editFullName').value, phone: document.getElementById('editPhone').value }) });
      if (nextRole !== selectedUser.role && Number(selectedUser.id) !== Number(currentUser.id)) await request(`/api/admin/users/${selectedUser.id}/role`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: nextRole }) });
      closeModal('editUserModal'); showFeedback('บันทึกข้อมูลผู้ใช้งานสำเร็จ'); await loadUsers();
    } catch (error) { showFeedback(error.message, true); }
  });

  document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    const password = document.getElementById('newPassword').value;
    if (password.length < 6) return showFeedback('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', true);
    try { await request(`/api/admin/users/${selectedUser.id}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: password }) }); closeModal('passwordModal'); showFeedback('เปลี่ยนรหัสผ่านสำเร็จ'); }
    catch (error) { showFeedback(error.message, true); }
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
  document.querySelectorAll('.modal').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal.id); }));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.querySelectorAll('.modal').forEach((modal) => closeModal(modal.id)); });
  [search, roleFilter, statusFilter, sortControl].forEach((control) => control.addEventListener('input', () => { page = 1; renderUsers(); }));
  document.getElementById('userPrev').addEventListener('click', () => { page -= 1; renderUsers(); });
  document.getElementById('userNext').addEventListener('click', () => { page += 1; renderUsers(); });

  try {
    const auth = await request('/api/auth/me');
    if (auth.user?.role !== 'admin') return window.location.href = '../index.html';
    currentUser = auth.user; await loadUsers();
  } catch (error) {
    if (error.message === 'กรุณาเข้าสู่ระบบ') return window.location.href = 'login.html';
    usersList.innerHTML = '<tr><td colspan="5" class="admin-error"></td></tr>'; usersList.querySelector('td').textContent = error.message;
  }
});
