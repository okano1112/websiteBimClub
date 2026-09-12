document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('positionForm'), rows = document.getElementById('positionRows'), feedback = document.getElementById('positionFeedback');
  const ids = ['positionNameTh', 'positionNameEn', 'positionOrder', 'positionLeader', 'positionActive'];
  const [nameTh, nameEn, order, leader, active] = ids.map(id => document.getElementById(id));
  let editingId = null;
  const reset = () => { editingId = null; form.reset(); document.getElementById('positionHeading').textContent = 'เพิ่มตำแหน่ง'; };
  async function load() {
    const response = await fetch('/api/positions/admin'); const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'โหลดตำแหน่งไม่สำเร็จ');
    rows.replaceChildren();
    if (!data.positions.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 5; cell.textContent = 'ยังไม่มีตำแหน่ง เพิ่มตำแหน่งแรกได้จากแบบฟอร์มด้านบน'; row.append(cell); rows.append(row); }
    for (const position of data.positions) {
      const row = document.createElement('tr');
      for (const value of [position.position_name_th, position.sort_order, position.is_leader ? 'ผู้นำ' : 'ทั่วไป', position.active ? 'ใช้งานอยู่' : 'ปิดใช้งาน']) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      const cell = document.createElement('td'), button = document.createElement('button'); button.type = 'button'; button.textContent = 'แก้ไข';
      button.addEventListener('click', () => { editingId = position.id; nameTh.value = position.position_name_th; nameEn.value = position.position_name_en || ''; order.value = position.sort_order; leader.checked = !!position.is_leader; active.checked = !!position.active; document.getElementById('positionHeading').textContent = 'แก้ไขตำแหน่ง'; form.scrollIntoView({ block: 'center' }); nameTh.focus(); });
      cell.append(button); row.append(cell); rows.append(row);
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const response = await fetch(`/api/positions${editingId ? `/${editingId}` : ''}`, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position_name_th: nameTh.value.trim(), position_name_en: nameEn.value.trim(), sort_order: Number(order.value), is_leader: leader.checked, active: active.checked }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      reset(); await load(); feedback.textContent = 'บันทึกแล้ว ลำดับนี้จะแสดงในหน้าบุคคลเกียรติยศ';
    } catch (error) { feedback.textContent = error.message; } finally { submit.disabled = false; }
  });
  document.getElementById('positionCancel').addEventListener('click', reset);
  try { await load(); } catch (error) { feedback.textContent = error.message; }
});
