// Run explicitly on the authorized local database. Never infer a different cohort.
if(process.env.BIMCLUB_QA_LOCAL!=='1'||process.env.NODE_ENV==='production')throw new Error('Local only');
const db=require(process.cwd()+'/config/database');const {transferToAlumni}=require(process.cwd()+'/src/services/alumniTransfer');
(async()=>{
 await db.query('ALTER TABLE team_members ADD COLUMN IF NOT EXISTS alumni_honor_id INT NULL');
 await db.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_team_alumni_honor ON team_members(alumni_honor_id)');
 const conn=await db.getConnection();
 try {
  await conn.beginTransaction();
  const [rows]=await conn.query("SELECT t.id,t.alumni_honor_id,h.id AS honor_id FROM team_members t JOIN honors h ON h.name=t.full_name AND h.joined_year=t.team_year WHERE t.team_year='2024' ORDER BY t.display_order,t.id FOR UPDATE");
  if(rows.length!==12 || new Set(rows.map(r=>r.id)).size!==12)throw new Error('Expected exactly 12 uniquely matched 2024 records; stopped');
  const [[before]]=await conn.query('SELECT COUNT(*) AS total FROM honors');
  for(const row of rows)await transferToAlumni(conn,row.id);
  const [[after]]=await conn.query('SELECT COUNT(*) AS total FROM honors');
  if(before.total!==after.total)throw new Error('Unexpected duplicate insertion');
  const [[counts]]=await conn.query("SELECT COUNT(*) AS archived_links, SUM(h.is_published=1) AS public_alumni FROM team_members t JOIN honors h ON h.id=t.alumni_honor_id WHERE t.team_year='2024'");
  if(Number(counts.archived_links)!==12||Number(counts.public_alumni)!==12)throw new Error('Transfer verification failed');
  await conn.commit();console.log(JSON.stringify({moved:rows.filter(r=>!r.alumni_honor_id).length,verifiedAlumni:12,duplicatesAdded:0,sourceRowsRetainedAsArchive:true}));
 }catch(error){await conn.rollback();throw error;}finally{conn.release();await db.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
