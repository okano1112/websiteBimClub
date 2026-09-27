function workLimit(max) {
  let active = 0;
  return async work => {
    if (active >= max) { const error = new Error('ระบบกำลังประมวลผล กรุณาลองใหม่ภายหลัง'); error.status = 503; throw error; }
    active++;
    try { return await work(); } finally { active--; }
  };
}
module.exports = workLimit;
