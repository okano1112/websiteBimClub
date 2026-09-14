// Reuse existing honors identities. No copied arrays or newly invented personal metadata.
async function transferToAlumni(conn, teamId) {
  const [[member]] = await conn.query('SELECT * FROM team_members WHERE id=? FOR UPDATE',[teamId]);
  if (!member) throw new Error('ไม่พบบุคลากร');
  if (member.alumni_honor_id) return member.alumni_honor_id;
  const [matches] = await conn.query('SELECT * FROM honors WHERE name=? AND joined_year=? FOR UPDATE',[member.full_name,member.team_year]);
  if (matches.length > 1) throw new Error('พบ Alumni ซ้ำ กรุณาตรวจรายการก่อนย้าย');
  let honorId;
  const fields = {nickname:member.nickname,position:member.role,description:member.bio,profile_image:member.profile_image};
  if (matches.length) {
    const existing=matches[0];honorId=existing.id;
    for (const [key,value] of Object.entries(fields)) {
      if (value && existing[key] && value!==existing[key]) throw new Error(`ข้อมูล ${key} ต่างกัน กรุณาตรวจสอบก่อนย้าย`);
      if (value && !existing[key]) await conn.query(`UPDATE honors SET ${key}=? WHERE id=?`,[value,honorId]);
    }
  } else {
    const [result]=await conn.query('INSERT INTO honors (name,nickname,position,description,profile_image,joined_year,display_order,is_published) VALUES (?,?,?,?,?,?,?,?)',[member.full_name,member.nickname,member.role,member.bio,member.profile_image,member.team_year,member.display_order,member.is_published]);honorId=result.insertId;
  }
  await conn.query('UPDATE team_members SET alumni_honor_id=? WHERE id=?',[honorId,teamId]);
  return honorId;
}
module.exports={transferToAlumni};
