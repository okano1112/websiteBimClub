/* Opt-in LOCAL integration harness. Uses disposable rows and an in-memory mailer.
   Headers identifying test users exist only on this ephemeral 127.0.0.1 server.
   Run with BIMCLUB_QA_LOCAL=1 node scripts/qa/gaps-integration.cjs from app root. */
if (process.env.BIMCLUB_QA_LOCAL !== '1' || process.env.NODE_ENV === 'production') throw new Error('Local QA only');
const path = require('node:path');
const root = process.cwd();
const assert = require('node:assert/strict');
const express = require(path.join(root,'node_modules/express'));
const db = require(path.join(root,'config/database'));
const tag = `qa_gap_${Date.now()}`;
const users = [], projects = [], positions = [], honors = [];
let mailFailure = false, outbox = [];
const mailer = require.resolve(path.join(root,'config/mailer'));
require.cache[mailer] = { id:mailer,filename:mailer,loaded:true,exports:{ sendMail:async(email,subject,html)=>{if(mailFailure)throw new Error('QA simulated delivery failure');outbox.push({email,html});} } };
const app = express(); app.use(express.json());
app.use((req,res,next)=>{ req.session = { ...(req.headers['x-qa-user'] ? {user:{id:Number(req.headers['x-qa-user'])}} : {}), destroy:fn=>fn?.(), regenerate:fn=>fn?.(), save:fn=>fn?.() };next(); });
for(const [url,file] of [['auth','auth'],['projects','projects'],['positions','positions'],['honors','honors'],['admin/users','admin-users'],['portfolios','portfolios']]) app.use(`/api/${url}`,require(path.join(root,'src/routes',file)));
let server, base, checks = 0;
async function request(url, who, method='GET', body) {const response=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(who?{'x-qa-user':String(who)}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();return {status:response.status,data};}
function ok(result,status) {assert.equal(result.status,status,JSON.stringify(result.data)); checks++;return result.data;}
async function fixture(role,index) {const [row]=await db.query('INSERT INTO users (username,email,password,full_name,role,is_verified) VALUES (?,?,?,?,?,1)',[`${tag}_${index}`,`${tag}_${index}@example.test`,'fixture-not-a-password-hash',`${tag} ${index}`,role]);users.push(row.insertId);await db.query('INSERT INTO portfolios (user_id,is_public) VALUES (?,1)',[row.insertId]);return row.insertId;}
(async()=>{
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});base=`http://127.0.0.1:${server.address().port}`;
 const admin=await fixture('admin',0),owner=await fixture('user',1),member=await fixture('user',2),other=await fixture('instructor',3);
 for(let i=4;i<12;i++)await fixture('user',i);
 // Server paging/filtering and permissions.
 ok(await request('/api/admin/users?page=1',member),403);ok(await request('/api/admin/users?page=1'),401);
 const p1=ok(await request(`/api/admin/users?limit=3&page=1&q=${tag}&sort=name`,admin),200);
 const p2=ok(await request(`/api/admin/users?limit=3&page=2&q=${tag}&sort=name`,admin),200);
 assert.equal(p1.pagination.total,12);assert.equal(p1.users.length,3);assert.equal(new Set([...p1.users,...p2.users].map(u=>u.id)).size,6);
 const last=ok(await request(`/api/admin/users?limit=3&page=999&q=${tag}&scope=members`,admin),200);assert.equal(last.pagination.total,11);assert.equal(last.pagination.page,4);
 const empty=ok(await request(`/api/admin/users?q=${tag}missing`,admin),200);assert.equal(empty.pagination.total,0);
 // Canonical writes, admin tagging, private visibility, and old-ID delete.
 const direct=ok(await request('/api/projects',owner,'POST',{title:tag+' direct',is_public:false}),201).project;projects.push(direct.id);
 const project=ok(await request('/api/portfolios/me/projects',owner,'POST',{title:tag,is_public:false}),201).project;projects.push(project.canonical_project_id);assert.ok(project.id);assert.ok(project.canonical_project_id);assert.notEqual(project.id,project.canonical_project_id);
 const id=project.canonical_project_id;
 ok(await request(`/api/projects/${id}`),404);ok(await request(`/api/projects/${id}`,owner),200);ok(await request(`/api/projects/${id}`,admin),200);
 ok(await request(`/api/projects/${id}`,other,'PUT',{title:'forbidden'}),404);
 ok(await request(`/api/projects/${id}/collaborators`,owner,'PUT',{members:[]}),403);
 ok(await request(`/api/projects/${id}/collaborators`,admin,'PUT',{members:[{userId:member},{userId:member}]}),400);
 ok(await request(`/api/projects/${id}/collaborators`,admin,'PUT',{members:[{userId:owner}]}),400);
 ok(await request(`/api/projects/${id}/collaborators`,admin,'PUT',{members:[{userId:member,roleInProject:'BIM modelling'}]}),200);
 let portfolio=ok(await request('/api/portfolios/me',member),200).portfolio;assert.equal(portfolio.involved_projects.length,0);
 ok(await request(`/api/projects/${id}`,owner,'PUT',{is_public:true}),200);
 portfolio=ok(await request('/api/portfolios/me',member),200).portfolio;assert.equal(portfolio.projects.length,0);assert.equal(portfolio.involved_projects[0].canonical_project_id,id);
 let own=ok(await request('/api/portfolios/me',owner),200).portfolio;assert.equal(own.projects.find(p=>p.canonical_project_id===id).id,project.id);assert.equal(own.involved_projects.length,0);
 const publicPortfolio=ok(await request(`/api/portfolios/public/${member}`),200).portfolio;assert.equal(publicPortfolio.projects.length,0);assert.equal(publicPortfolio.involved_projects[0].canonical_project_id,id);
 const pdfResponse=await fetch(`${base}/api/portfolios/public/${member}/export/pdf?type=cv`);assert.equal(pdfResponse.status,200);const pdf=Buffer.from(await pdfResponse.arrayBuffer());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');checks++;
 require('node:fs').mkdirSync('/tmp/bimclub-ui',{recursive:true});require('node:fs').writeFileSync('/tmp/bimclub-ui/tagged-cv-test.pdf',pdf);console.log(JSON.stringify({publicTaggedCvPdfBytes:pdf.length}));
 ok(await request(`/api/projects/${id}`,owner,'PUT',{is_public:false}),200);const hidden=ok(await request(`/api/portfolios/public/${member}`),200).portfolio;assert.equal(hidden.involved_projects.length,0);
 ok(await request(`/api/projects/${id}`,owner,'PUT',{is_public:true}),200);
 ok(await request(`/api/projects/${id}/collaborators`,admin,'PUT',{members:[]}),200);assert.equal(ok(await request(`/api/portfolios/public/${member}`),200).portfolio.involved_projects.length,0);
 ok(await request(`/api/projects/${id}`,member,'DELETE'),404);
 ok(await request(`/api/projects/${id}`,owner,'PUT',{title:''}),400);
 ok(await request(`/api/projects/${id}`,owner,'PUT',{project_url:'javascript:alert(1)'}),400);
 ok(await request(`/api/portfolios/me/projects/${project.id}`,member,'DELETE'),404);
 ok(await request(`/api/portfolios/me/projects/${project.id}`,owner,'DELETE'),200);ok(await request(`/api/projects/${id}`),404);
 // Position catalog, multiple leaders, inactive history.
 ok(await request('/api/positions',member,'POST',{position_name_th:tag}),403);
 const position=ok(await request('/api/positions',admin,'POST',{position_name_th:tag,is_leader:true,sort_order:9}),201).position;positions.push(position.id);
 const honorBody={name:tag,position_id:position.id,joined_year:'9998',is_published:0};
 const honor=ok(await request('/api/honors',admin,'POST',honorBody),201).honor;honors.push(honor.id);
 ok(await request(`/api/positions/${position.id}`,admin,'PUT',{position_name_th:tag,sort_order:1,is_leader:true,active:false}),200);
 ok(await request('/api/honors',admin,'POST',{...honorBody,name:tag+' inactive'}),400);
 ok(await request(`/api/honors/${honor.id}`,admin,'PUT',honorBody),200);
 ok(await request('/api/auth/register',null,'POST',{username:['invalid'],email:'bad',password:'Fixture-valid-password',fullName:'QA'}),400);
 // OTP: delivery failure keeps recoverable account, cooldown, wrong/expired/reused, race.
 const email=`${tag}_register@example.test`;mailFailure=true;
 const reg=ok(await request('/api/auth/register',null,'POST',{username:tag+'_register',email,password:'Fixture-valid-password',fullName:'QA registration'}),201);assert.equal(reg.deliveryPending,true);
 const [[registered]]=await db.query('SELECT id,verify_token,password FROM users WHERE email=?',[email]);users.push(registered.id);assert.match(registered.verify_token,/^[a-f0-9]{64}$/);assert.match(registered.password,/^\$2/);
 ok(await request('/api/auth/resend-verify',null,'POST',{email}),429);
 await db.query('UPDATE users SET verify_sent_at=DATE_SUB(NOW(),INTERVAL 2 MINUTE) WHERE id=?',[registered.id]);mailFailure=false;
 ok(await request('/api/auth/resend-verify',null,'POST',{email}),200);const code=outbox.at(-1).html.match(/<h2>(\d{6})<\/h2>/)[1];
 for(let i=0;i<5;i++)ok(await request('/api/auth/verify-otp',null,'POST',{email,otp:'000000'}),400);
 ok(await request('/api/auth/verify-otp',null,'POST',{email,otp:code}),400);
 await db.query('UPDATE users SET verify_sent_at=DATE_SUB(NOW(),INTERVAL 2 MINUTE) WHERE id=?',[registered.id]);
 ok(await request('/api/auth/resend-verify',null,'POST',{email}),200);const code2=outbox.at(-1).html.match(/<h2>(\d{6})<\/h2>/)[1];
 if(code!==code2)ok(await request('/api/auth/verify-otp',null,'POST',{email,otp:code}),400);
 await db.query('UPDATE users SET verify_token_expires=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE id=?',[registered.id]);
 ok(await request('/api/auth/verify-otp',null,'POST',{email,otp:code2}),400);
 await db.query('UPDATE users SET verify_token_expires=DATE_ADD(NOW(),INTERVAL 10 MINUTE) WHERE id=?',[registered.id]);
 const concurrent=await Promise.all([request('/api/auth/verify-otp',null,'POST',{email,otp:code2}),request('/api/auth/verify-otp',null,'POST',{email,otp:code2})]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,400]);checks++;
 ok(await request('/api/auth/login',null,'POST',{email,password:'Fixture-valid-password'}),200);
 ok(await request('/api/auth/register',null,'POST',{username:tag+'_register',email,password:'Fixture-valid-password',fullName:'QA duplicate'}),409);
 console.log(JSON.stringify({passed:true,httpChecks:checks,pagination:true,projects:true,positions:true,otp:true,mailer:'in-memory; no external messages'}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 try {
  for(const id of honors)await db.query('DELETE FROM honors WHERE id=?',[id]);
  for(const id of positions)await db.query('DELETE FROM positions WHERE id=?',[id]);
  for(const id of projects)await db.query('DELETE FROM projects WHERE id=?',[id]);
  for(const id of users){await db.query('DELETE FROM portfolios WHERE user_id=?',[id]);await db.query('DELETE FROM users WHERE id=?',[id]);}
  console.log('Disposable QA rows removed');
 } finally {await new Promise(resolve=>server?server.close(resolve):resolve());await db.end();}
});
