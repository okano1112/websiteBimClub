if(process.env.DB_NAME!=='bimclub_hardening')throw Error('Isolated QA database required');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const db=require('../../config/database'),bcrypt=require('bcryptjs'),app=require('../../src/app');
const password=crypto.randomBytes(16).toString('hex'),newPassword=crypto.randomBytes(16).toString('hex');let server,uid;
const base='http://localhost:3000';
async function req(path,method='GET',body,cookie,origin=base){return fetch(base+path,{method,headers:{...(origin?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...(body && !(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined});}
async function login(pw){const r=await req('/api/auth/login','POST',{email:'hardening-qa',password:pw});assert.equal(r.status,200);return r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');}
(async()=>{
  const [u]=await db.query('INSERT INTO users(username,email,password,full_name,role,is_verified) VALUES(?,?,?,?,?,1)',['hardening-qa','qa@example.test',await bcrypt.hash(password,12),'QA fixture','admin']);uid=u.insertId;
  server=await new Promise(resolve=>{const s=app.listen(3000,()=>resolve(s));});
  assert.equal((await req('/api/auth/login','POST',{email:'hardening-qa',password},null,'https://evil.example')).status,403);
  const a=await login(password),b=await login(password);assert.equal((await req('/api/auth/me','GET',null,a)).status,200);
  const token=crypto.randomBytes(32).toString('hex');await db.query('UPDATE users SET reset_token=?,reset_token_expires=DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id=?',[crypto.createHash('sha256').update(token).digest('hex'),uid]);
  const result=await Promise.all([req('/api/auth/reset-password','POST',{token,newPassword}),req('/api/auth/reset-password','POST',{token,newPassword})]);assert.deepEqual(result.map(r=>r.status).sort(),[200,400]);
  for(const cookie of [a,b])assert.equal((await req('/api/auth/me','GET',null,cookie)).status,401);
  let cookie=await login(newPassword);
  const form=new FormData();form.append('video',new Blob(['video'],{type:'video/mp4'}),'lesson.mp4');assert.equal((await req('/api/upload/video','POST',form,cookie)).status,410);
  assert.equal((await req('/uploads/malicious.html')).status,404);
  const puppeteer=require('puppeteer');const browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/page/login.html');await page.evaluate(async pw=>{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'hardening-qa',password:pw})});if(!r.ok)throw Error('Login failed');},newPassword);
    await page.goto(base+'/page/admin-dashboard.html',{waitUntil:'networkidle2'});await page.waitForSelector('#system-sidebar-toggle:not([hidden])');await page.click('#system-sidebar-toggle');await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));await page.focus('[data-sidebar-logout]');await page.keyboard.press('Tab');assert.equal(await page.$eval('.system-sidebar-close',e=>e===document.activeElement),true);await page.keyboard.press('Escape');assert.equal(await page.$eval('.system-sidebar-panel',e=>e.getAttribute('aria-hidden')),'true');assert.deepEqual(errors,[]);
  }finally{await browser.close();}
  const {generatePdf}=require('../../src/services/pdfRenderer');const pdf=await generatePdf({profile:{fullName:'QA fixture'},settings:{template:'cv-c2',docType:'cv'}});assert.ok(pdf.length>1000);
  const run=promisify(execFile),rootDb=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,user:'root',password:process.env.DB_PASSWORD});
  try{
    await run(process.execPath,['scripts/ops/migrate.cjs','--apply']);
    await run(process.execPath,['scripts/ops/migrate.cjs','--apply']);
    await rootDb.query('CREATE DATABASE bimclub_restore_drill');
    await fs.mkdir('/tmp/backup-fixture');await fs.writeFile('/tmp/backup-fixture/photo.txt','QA MEDIA');
    const key=crypto.randomBytes(32).toString('base64');
    await run(process.execPath,['scripts/ops/backup.cjs','--writes-paused'],{env:{...process.env,BACKUP_KEY_BASE64:key,BACKUP_OUTPUT:'/tmp/qa-backup.enc',UPLOADS_DIR:'/tmp/backup-fixture'}});
    await run(process.execPath,['scripts/ops/restore-drill.cjs'],{env:{...process.env,DB_USER:'root',DB_NAME:'bimclub_restore_drill',BACKUP_KEY_BASE64:key,BACKUP_INPUT:'/tmp/qa-backup.enc',RESTORE_UPLOADS_DIR:'/tmp/qa-restored'}});
    const [[count]]=await rootDb.query('SELECT COUNT(*) AS n FROM bimclub_restore_drill.users');assert.equal(Number(count.n),Number((await db.query('SELECT COUNT(*) AS n FROM users'))[0][0].n));assert.equal(await fs.readFile('/tmp/qa-restored/photo.txt','utf8'),'QA MEDIA');
    await run(process.execPath,['scripts/ops/provision-app-user.cjs','--apply'],{env:{...process.env,DB_USER:'qa_limited',DB_ADMIN_USER:'root',DB_ADMIN_PASSWORD:process.env.DB_PASSWORD}});
    const limited=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,user:'qa_limited',password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
    try{await limited.query('SELECT id FROM users');await assert.rejects(limited.query('CREATE TABLE forbidden (id INT)'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');}finally{await limited.end();}
    console.log('PASS encrypted DB/media backup restore / idempotent migration / restricted app grants');
  }finally{await rootDb.query('DROP DATABASE IF EXISTS bimclub_restore_drill');await rootDb.query("DROP USER IF EXISTS 'qa_limited'@'%'");await rootDb.end();}
  console.log('PASS real DB atomic reset / two-session revocation / Origin / video upload disabled / admin keyboard / Chromium PDF');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{if(uid)await db.query('DELETE FROM users WHERE id=?',[uid]);if(server)await new Promise(r=>server.close(r));await app.locals.closeResources();});
