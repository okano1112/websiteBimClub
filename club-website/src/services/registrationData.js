function parseRegistration(body) {
  const keys = ['username', 'email', 'fullName', 'memberType', 'password'];
  if (!body || keys.some(key => typeof body[key] !== 'string')) {
    return { error: 'รูปแบบข้อมูลสมัครสมาชิกไม่ถูกต้อง' };
  }

  const username = body.username.trim();
  const email = body.email.trim().toLowerCase();
  const fullName = body.fullName.trim();
  if (body.phone != null && typeof body.phone !== 'string') return { error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' };
  const phone = (body.phone || '').trim();
  const memberType = body.memberType.trim();
  const password = body.password;
  const optional = ['department', 'program', 'generation', 'graduationYear'];
  if (optional.some(key => body[key] != null && typeof body[key] !== 'string')) {
    return { error: 'รูปแบบข้อมูลสมาชิกไม่ถูกต้อง' };
  }
  const department = (body.department || '').trim();
  const program = (body.program || '').trim();
  const generation = (body.generation || '').trim();
  const graduationYear = (body.graduationYear || '').trim();

  if (!/^[\p{L}\p{N}._-]{3,50}$/u.test(username)) return { error: 'ชื่อผู้ใช้ต้องยาว 3–50 ตัวอักษร และไม่มีช่องว่างหรืออักขระพิเศษ' };
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'กรุณากรอกอีเมลให้ถูกต้อง' };
  if (fullName.length < 2 || fullName.length > 100) return { error: 'ชื่อ-นามสกุลต้องยาว 2–100 ตัวอักษร' };
  const phoneDigits = phone.replace(/\D/g, '');
  if (phone && (!/^\+?[0-9()\s-]{8,30}$/.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 15)) return { error: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' };
  if (!['member', 'alumni'].includes(memberType)) return { error: 'กรุณาเลือกประเภทสมาชิก' };
  if (department.length > 150 || program.length > 150 || generation.length > 50) return { error: 'ข้อมูลคณะ สาขา หรือรุ่นยาวเกินกำหนด' };
  if (graduationYear && (memberType !== 'alumni' || !/^(19|20)\d{2}$/.test(graduationYear) || Number(graduationYear) > new Date().getFullYear())) {
    return { error: 'ปีที่สำเร็จการศึกษาต้องเป็นปี ค.ศ. ที่ผ่านมา และใช้กับศิษย์เก่าเท่านั้น' };
  }
  if (password.length < 8 || Buffer.byteLength(password) > 72) return { error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์' };

  return { value: { username, email, fullName, phone, memberType, department, program, generation, graduationYear, password } };
}

module.exports = { parseRegistration };
