document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const errorDiv = document.getElementById('registerError');
  const successDiv = document.getElementById('registerSuccess');
  const button = form.querySelector('button[type="submit"]');
  const show = (node, message) => { node.textContent = message; node.classList.remove('d-none'); node.style.display = 'block'; };
  const otpForm = document.getElementById('otpForm');
  const resend = document.getElementById('resendOtp');
  let cooldownUntil = 0, sendingOtp = false;
  const clearMessages = () => [errorDiv, successDiv].forEach(node => { node.classList.add('d-none'); node.style.display = 'none'; });
  function openOtp() { otpForm.hidden = false; form.hidden = true; form.style.display = 'none'; document.getElementById('showOtp').hidden = true; document.getElementById('otpEmail').focus(); }
  function countdown(seconds) { cooldownUntil = Date.now() + seconds * 1000; tick(); }
  function tick() { const seconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)); resend.disabled = sendingOtp || seconds > 0; document.getElementById('otpCountdown').textContent = seconds ? `ส่งรหัสใหม่ได้ใน ${seconds} วินาที` : ''; }
  setInterval(tick, 1000);
  document.getElementById('showOtp').addEventListener('click', openOtp);
  async function otpRequest(path, body) {
    const response = await fetch(`/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (data.retryAfter) countdown(data.retryAfter);
    if (!response.ok || !data.success) throw new Error(data.message || 'ดำเนินการไม่สำเร็จ');
    return data;
  }
  otpForm.addEventListener('submit', async event => {
    event.preventDefault(); clearMessages();
    const submit = otpForm.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const data = await otpRequest('verify-otp', { email: document.getElementById('otpEmail').value.trim().toLowerCase(), otp: document.getElementById('otpCode').value.trim() });
      show(successDiv, data.message); sessionStorage.removeItem('bimclub.pendingVerificationEmail'); otpForm.hidden = true; document.getElementById('verifiedLogin').hidden = false; document.getElementById('verifiedLogin').focus();
    } catch (error) { show(errorDiv, error.message); } finally { submit.disabled = false; }
  });
  resend.addEventListener('click', async () => {
    clearMessages(); if (!document.getElementById('otpEmail').reportValidity()) return;
    sendingOtp = true; resend.disabled = true;
    try { const data = await otpRequest('resend-verify', { email: document.getElementById('otpEmail').value.trim().toLowerCase() }); show(successDiv, data.message); }
    catch (error) { show(errorDiv, error.message); } finally { sendingOtp = false; tick(); }
  });
  const pendingEmail = sessionStorage.getItem('bimclub.pendingVerificationEmail');
  if (pendingEmail) { document.getElementById('otpEmail').value = pendingEmail; openOtp(); }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); clearMessages();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    if (password.length < 8) return show(errorDiv, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    if (password !== confirmPassword) return show(errorDiv, 'รหัสผ่านไม่ตรงกัน');
    button.disabled = true; button.textContent = 'กำลังสมัคร...';
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('regUsername').value.trim(), email: document.getElementById('regEmail').value.trim().toLowerCase(), fullName: document.getElementById('regFullName').value.trim(), password }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      show(successDiv, data.message || 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมล'); document.getElementById('otpEmail').value = document.getElementById('regEmail').value.trim().toLowerCase(); sessionStorage.setItem('bimclub.pendingVerificationEmail', document.getElementById('otpEmail').value); openOtp(); countdown(data.retryAfter || 60); form.reset();
    } catch (error) { show(errorDiv, error.message); } finally { button.disabled = false; button.textContent = 'ยืนยันการสมัคร'; }
  });
});
