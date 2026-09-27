document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const errorDiv = document.getElementById('registerError');
  const successDiv = document.getElementById('registerSuccess');
  const button = form.querySelector('button[type="submit"]');
  const show = (node, message) => { node.textContent = message; node.classList.remove('d-none'); node.style.display = 'block'; if (node === errorDiv) node.focus(); };
  const otpForm = document.getElementById('otpForm');
  const resend = document.getElementById('resendOtp');
  const memberType = document.getElementById('regMemberType');
  const graduationYear = document.getElementById('regGraduationYear');
  let cooldownUntil = 0, sendingOtp = false;
  const updateMemberType = () => {
    const alumni = memberType.value === 'alumni';
    document.getElementById('alumniYearGroup').hidden = !alumni;
    graduationYear.disabled = !alumni;
    if (!alumni) graduationYear.value = '';
  };
  memberType.addEventListener('change', updateMemberType);
  updateMemberType();
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
    const username = document.getElementById('regUsername').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const digits = phone.replace(/\D/g, '');
    if (!/^[\p{L}\p{N}._-]{3,50}$/u.test(username)) { show(errorDiv, 'ชื่อผู้ใช้ต้องยาว 3–50 ตัวอักษร และไม่มีช่องว่างหรืออักขระพิเศษ'); document.getElementById('regUsername').focus(); return; }
    if (phone && (!/^\+?[0-9()\s-]{8,30}$/.test(phone) || digits.length < 8 || digits.length > 15)) { show(errorDiv, 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง'); document.getElementById('regPhone').focus(); return; }
    if (password.length < 8) { show(errorDiv, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); document.getElementById('regPassword').focus(); return; }
    if (password !== confirmPassword) { show(errorDiv, 'รหัสผ่านไม่ตรงกัน'); document.getElementById('regConfirmPassword').focus(); return; }
    button.disabled = true; button.textContent = 'กำลังสมัคร...';
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email: document.getElementById('regEmail').value.trim().toLowerCase(), fullName: document.getElementById('regFullName').value.trim(), phone, memberType: memberType.value, department: document.getElementById('regDepartment').value.trim(), program: document.getElementById('regProgram').value.trim(), generation: document.getElementById('regGeneration').value.trim(), graduationYear: graduationYear.disabled ? '' : graduationYear.value.trim(), password }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      show(successDiv, data.message || 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมล'); document.getElementById('otpEmail').value = document.getElementById('regEmail').value.trim().toLowerCase(); sessionStorage.setItem('bimclub.pendingVerificationEmail', document.getElementById('otpEmail').value); openOtp(); countdown(data.retryAfter || 60); form.reset(); updateMemberType();
    } catch (error) { show(errorDiv, error.message); } finally { button.disabled = false; button.textContent = 'ยืนยันการสมัคร'; }
  });
});
