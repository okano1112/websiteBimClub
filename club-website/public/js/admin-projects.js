document.addEventListener('DOMContentLoaded', async () => {
  const byId = id => document.getElementById(id);
  const feedback = byId('projectFeedback'), form = byId('projectForm');
  let page = 1, project = null, selected = [], listSequence = 0, searchSequence = 0, searchTimer, searchAbort;
  async function api(url, method = 'GET', body, signal) {
    const response = await fetch(url, { method, signal, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.message || 'ดำเนินการไม่สำเร็จ'); return data;
  }
  function button(label, callback) { const node = document.createElement('button'); node.type = 'button'; node.textContent = label; node.addEventListener('click', callback); return node; }
  async function load() {
    const sequence = ++listSequence;
    try {
      const data = await api(`/api/projects/admin?${new URLSearchParams({ page, q: byId('projectSearch').value.trim() })}`);
      if (sequence !== listSequence) return;
      page = data.pagination.page; const rows = byId('projectRows'); rows.replaceChildren();
      for (const item of data.projects) {
        const row = document.createElement('tr');
        for (const value of [item.title, item.owner_name, item.is_public ? 'สาธารณะ' : 'ส่วนตัว']) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
        const action = document.createElement('td'); action.append(button('แก้ไข / ผู้ร่วมงาน', () => open(item.id))); row.append(action); rows.append(row);
      }
      if (!data.projects.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 4; cell.textContent = 'ไม่พบผลงาน'; row.append(cell); rows.append(row); }
      byId('projectPageInfo').textContent = `หน้า ${page} จาก ${data.pagination.pages} · ${data.pagination.total} ผลงาน`;
      byId('projectPrev').disabled = page <= 1; byId('projectNext').disabled = page >= data.pagination.pages;
    } catch (error) { if (sequence === listSequence) feedback.textContent = error.message; }
  }
  function renderSelected() {
    const container = byId('collaboratorSelected'); container.replaceChildren();
    for (const member of selected) {
      const row = document.createElement('div'), name = document.createElement('span'), role = document.createElement('input');
      name.textContent = member.full_name || member.username; role.value = member.roleInProject || ''; role.maxLength = 150; role.placeholder = 'หน้าที่ในผลงาน'; role.setAttribute('aria-label', `หน้าที่ของ ${name.textContent}`);
      role.addEventListener('input', () => { member.roleInProject = role.value; });
      row.append(name, role, button('นำออก', () => { selected = selected.filter(item => item.userId !== member.userId); renderSelected(); })); container.append(row);
    }
  }
  async function open(id) {
    try {
      const data = await api(`/api/projects/${id}`); project = data.project;
      selected = project.members.map(member => ({ ...member, userId: Number(member.user_id), roleInProject: member.role_in_project || '' }));
      byId('projectTitle').value = project.title; byId('projectDescription').value = project.description || ''; byId('projectUrl').value = project.project_url || ''; byId('projectPublic').checked = !!project.is_public;
      byId('projectOwner').textContent = `เจ้าของผลงาน: ${project.owner_name}`;
      searchSequence++; byId('collaboratorSearch').value = ''; byId('collaboratorResults').replaceChildren(); renderSelected(); form.hidden = false; form.scrollIntoView({ block: 'start' }); byId('projectTitle').focus();
    } catch (error) { feedback.textContent = error.message; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try { await api(`/api/projects/${project.id}`, 'PUT', { title: byId('projectTitle').value.trim(), description: byId('projectDescription').value, project_url: byId('projectUrl').value.trim(), is_public: byId('projectPublic').checked }); feedback.textContent = 'บันทึกข้อมูลผลงานแล้ว'; await load(); }
    catch (error) { feedback.textContent = error.message; } finally { submit.disabled = false; }
  });
  byId('saveCollaborators').addEventListener('click', async event => {
    event.target.disabled = true;
    try { await api(`/api/projects/${project.id}/collaborators`, 'PUT', { members: selected.map(({ userId, roleInProject }) => ({ userId, roleInProject })) }); feedback.textContent = 'บันทึกผู้ร่วมงานแล้ว ผลงานสาธารณะจะแสดงใน Portfolio/CV ของสมาชิกที่เลือก'; }
    catch (error) { feedback.textContent = error.message; } finally { event.target.disabled = false; }
  });
  byId('collaboratorSearch').addEventListener('input', () => {
    clearTimeout(searchTimer); searchAbort?.abort(); searchAbort = new AbortController(); const sequence = ++searchSequence;
    byId('collaboratorResults').textContent = 'กำลังค้นหา…';
    searchTimer = setTimeout(async () => {
      try {
        const data = await api(`/api/admin/users/search?${new URLSearchParams({ q: byId('collaboratorSearch').value.trim() })}`, 'GET', undefined, searchAbort.signal);
        if (sequence !== searchSequence) return;
        const results = byId('collaboratorResults'); results.replaceChildren();
        for (const user of data.users.filter(user => Number(user.id) !== Number(project.owner_user_id) && !selected.some(member => member.userId === Number(user.id)))) {
          results.append(button(`เพิ่ม ${user.full_name || user.username}`, () => { if (selected.length >= 50 || selected.some(member => member.userId === Number(user.id))) return; selected.push({ ...user, userId: Number(user.id), roleInProject: '' }); results.replaceChildren(); byId('collaboratorSearch').setAttribute('aria-expanded', 'false'); renderSelected(); byId('collaboratorSelected').querySelector('div:last-child input')?.focus(); }));
        }
        results.querySelectorAll('button').forEach((button, index) => { button.setAttribute('role', 'option'); button.id = `collaborator-option-${index}`; });
        byId('collaboratorSearch').setAttribute('aria-expanded', String(!!results.childElementCount));
        if (!results.childElementCount) results.textContent = 'ไม่พบสมาชิกที่เพิ่มได้';
      } catch (error) { if (sequence === searchSequence && error.name !== 'AbortError') feedback.textContent = error.message; }
    }, 250);
  });
  for (const element of [byId('collaboratorSearch'), byId('collaboratorResults')]) element.addEventListener('keydown', event => {
    const options = [...byId('collaboratorResults').querySelectorAll('button')];
    if (event.key === 'Escape') { byId('collaboratorResults').replaceChildren(); byId('collaboratorSearch').setAttribute('aria-expanded', 'false'); byId('collaboratorSearch').focus(); }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && options.length) { event.preventDefault(); const index = options.indexOf(document.activeElement); options[(index + (event.key === 'ArrowDown' ? 1 : options.length - 1) + options.length) % options.length].focus(); }
    if (event.key === 'Enter' && event.target === byId('collaboratorSearch')) { event.preventDefault(); options[0]?.click(); }
  });
  byId('projectClose').addEventListener('click', () => { form.hidden = true; searchSequence++; });
  byId('projectSearch').addEventListener('input', () => { page = 1; load(); });
  byId('projectPrev').addEventListener('click', () => { page--; load(); }); byId('projectNext').addEventListener('click', () => { page++; load(); });
  await load();
});
