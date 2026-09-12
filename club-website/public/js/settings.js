document.addEventListener('DOMContentLoaded', async () => {
  const roleLabels = { user: 'ผู้ใช้ทั่วไป', instructor: 'อาจารย์', admin: 'ผู้ดูแลระบบ' };
  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');
  const recoveryForm = document.getElementById('recoveryForm');
  const profileMessage = document.getElementById('profileMessage');
  const passwordMessage = document.getElementById('passwordMessage');
  const recoveryMessage = document.getElementById('recoveryMessage');
  const fullNameInput = document.getElementById('fullName');
  const ageInput = document.getElementById('age');
  const phoneInput = document.getElementById('phone');
  const recoveryPhoneInput = document.getElementById('recoveryPhone');
    const avatarFileInput = document.getElementById('avatarFile');
  const avatarPreview = document.getElementById('avatarPreview');
  const settingsRole = document.getElementById('settingsRole');
  let currentAvatarUrl = '';

  function showMessage(element, type, message) {
    element.className = `settings-message ${type}`;
    element.textContent = message;
  }

  function renderAvatar(userName, avatarUrl) {
    avatarPreview.replaceChildren();
    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = 'รูปโปรไฟล์';
      img.addEventListener('error', () => renderAvatar(userName, ''), { once: true });
      avatarPreview.appendChild(img);
      return;
    }
    avatarPreview.textContent = (userName || 'U').charAt(0).toUpperCase();
  }

  function focusHashSection() {
    const section = document.querySelector(`[data-settings-section="${location.hash.slice(1)}"]`);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function parseResponse(response) {
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'ไม่สามารถบันทึกข้อมูลได้');
    return data;
  }

  async function loadProfile() {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      location.href = 'login.html';
      return;
    }
    const { user } = await response.json();
    const userName = user.fullName || user.full_name || user.username || '';
    currentAvatarUrl = user.avatarUrl || user.avatar_url || '';
    fullNameInput.value = userName;
    ageInput.value = user.age ?? '';
    phoneInput.value = user.phone || '';
    recoveryPhoneInput.value = user.recoveryPhone || user.recovery_phone || '';
    settingsRole.textContent = `สถานะบัญชี: ${user.roleLabel || roleLabels[user.role] || roleLabels.user}`;
    renderAvatar(userName, currentAvatarUrl);
    requestAnimationFrame(focusHashSection);
  }

  avatarFileInput.addEventListener('change', () => {
    const file = avatarFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', (event) => renderAvatar(fullNameInput.value, event.target.result));
    reader.readAsDataURL(file);
  });

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = profileForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      let avatarUrl = currentAvatarUrl;
      const file = avatarFileInput.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('images', file);
        const upload = await parseResponse(await fetch('/api/upload/images', { method: 'POST', body: formData }));
        avatarUrl = upload.urls[0];
      }

      const data = await parseResponse(await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullNameInput.value,
          age: ageInput.value,
          phone: phoneInput.value,
          avatarUrl
        })
      }));
      currentAvatarUrl = data.user.avatarUrl || data.user.avatar_url || '';
      avatarFileInput.value = '';
      renderAvatar(data.user.fullName || data.user.full_name, currentAvatarUrl);
      showMessage(profileMessage, 'success', data.message);
    } catch (error) {
      showMessage(profileMessage, 'error', error.message);
    } finally {
      button.disabled = false;
    }
  });

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) {
      showMessage(passwordMessage, 'error', 'รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน');
      return;
    }
    const button = passwordForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const data = await parseResponse(await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      }));
      passwordForm.reset();
      showMessage(passwordMessage, 'success', data.message);
    } catch (error) {
      showMessage(passwordMessage, 'error', error.message);
    } finally {
      button.disabled = false;
    }
  });

  recoveryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = recoveryForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const data = await parseResponse(await fetch('/api/auth/recovery-phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryPhone: recoveryPhoneInput.value })
      }));
      showMessage(recoveryMessage, 'success', data.message);
    } catch (error) {
      showMessage(recoveryMessage, 'error', error.message);
    } finally {
      button.disabled = false;
    }
  });

  window.addEventListener('hashchange', focusHashSection);
  try {
    await loadProfile();
  } catch (error) {
    showMessage(profileMessage, 'error', error.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
  }
});
