function invalid(message) { throw Object.assign(new Error(message), { status: 400 }); }
function profileFields(body) {
  const fields = {};
  const strings = { coverUrl: ['cover_url', 500], department: ['department', 150], program: ['program', 150], generation: ['generation', 50], graduationYear: ['graduation_year', 10] };
  for (const [key, [column, max]] of Object.entries(strings)) {
    if (!Object.hasOwn(body, key)) continue;
    if (typeof body[key] !== 'string' || body[key].length > max) invalid(`ข้อมูล ${key} ไม่ถูกต้อง`);
    fields[column] = body[key].trim() || null;
  }
  if (fields.cover_url && !/^\/uploads\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(fields.cover_url)) invalid('รูปปกต้องเป็นภาพที่อัปโหลดผ่านระบบ');
  if (fields.cover_url?.split('/').includes('..')) invalid('รูปปกไม่ถูกต้อง');
  if (fields.graduation_year && !/^(19|20)\d{2}$/.test(fields.graduation_year)) invalid('ปีสำเร็จการศึกษาต้องเป็นปี ค.ศ. 4 หลัก');
  if (Object.hasOwn(body, 'memberType')) {
    if (!['member', 'alumni', 'instructor'].includes(body.memberType)) invalid('ประเภทสมาชิกไม่ถูกต้อง');
    fields.member_type = body.memberType;
  }
  if (Object.hasOwn(body, 'isPublic')) {
    if (typeof body.isPublic !== 'boolean') invalid('สถานะเผยแพร่ต้องเป็น true หรือ false');
    fields.is_public = body.isPublic ? 1 : 0;
  }
  return fields;
}
async function saveProfile(db, id, body) {
  const fields = profileFields(body);
  const columns = Object.keys(fields);
  if (!columns.length) return;
  // New profiles default to private. Existing visibility is preserved when omitted.
  const insert = { user_id: id, is_public: 0, ...fields };
  await db.query(`INSERT INTO member_profiles (${Object.keys(insert).join(', ')}) VALUES (${Object.keys(insert).map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${columns.map(key => `${key}=VALUES(${key})`).join(', ')}`, Object.values(insert));
}
module.exports = { profileFields, saveProfile };
