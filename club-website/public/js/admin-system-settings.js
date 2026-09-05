// MOCKUP-START: ADMIN SYSTEM SETTINGS
// MOCKUP UI ONLY - The form never persists values to an API or database.
document.addEventListener('DOMContentLoaded', async () => {
  const authResponse = await fetch('/api/auth/me');
  if (!authResponse.ok) return window.location.href = 'login.html';
  const authData = await authResponse.json();
  if (authData.user?.role !== 'admin') return window.location.href = '../index.html';

  const mockSettings = window.BimClubAdminMockData.settings;
  const feedback = document.getElementById('settingsFeedback');
  function resetForm() {
    Object.entries(mockSettings).forEach(([key, value]) => {
      const control = document.getElementById(key);
      if (control.type === 'checkbox') control.checked = value;
      else control.value = value;
    });
  }
  document.getElementById('systemSettingsForm').addEventListener('submit', (event) => {
    event.preventDefault();
    feedback.hidden = false;
    feedback.textContent = 'MOCKUP: แสดงตัวอย่าง Success Feedback เท่านั้น ไม่มีการบันทึกลงระบบ';
  });
  document.getElementById('resetSettings').addEventListener('click', () => {
    if (!confirm('ยกเลิกการเปลี่ยนแปลงตัวอย่างทั้งหมดหรือไม่?')) return;
    resetForm();
    feedback.hidden = false;
    feedback.textContent = 'คืนค่าข้อมูล Mockup แล้ว';
  });
  resetForm();
});
// MOCKUP-END: ADMIN SYSTEM SETTINGS
