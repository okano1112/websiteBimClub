if(process.env.BIMCLUB_QA_LOCAL!=='1'||process.env.NODE_ENV==='production')throw Error('Local QA only');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),root=process.cwd();
const db=require(path.join(root,'config/database')),bcrypt=require(path.join(root,'node_modules/bcryptjs')),puppeteer=require(path.join(root,'node_modules/puppeteer'));
const tag='qa_design_'+Date.now(),password=crypto.randomBytes(18).toString('hex'),out='/tmp/bimclub-designs';fs.mkdirSync(out,{recursive:true});let uid,browser,page,uploaded;const errors=[];
async function fill(id,v){await page.$eval('#'+id,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);}
async function api(url,method='GET',body){return page.evaluate(async({url,method,body})=>{const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));return d;},{url,method,body});}
async function drawer(){await page.click('#btnOpenSettings');await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));}
(async()=>{
 const [u]=await db.query('INSERT INTO users(username,email,password,full_name,role,is_verified) VALUES(?,?,?,?,?,1)',[tag,tag+'@example.test',await bcrypt.hash(password,10),'นักศึกษา ตัวอย่าง','user']);uid=u.insertId;
 browser=await puppeteer.launch({headless:true,executablePath:'/usr/bin/chromium-browser',args:['--no-sandbox','--disable-dev-shm-usage']});page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.setViewport({width:1440,height:1000});
 await page.goto('http://127.0.0.1:3000/page/login.html',{waitUntil:'networkidle2'});await fill('username',tag);await fill('password',password);await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}),page.click('#loginForm button[type=submit]')]);
 await api('/api/portfolios/me');await api('/api/portfolios/me','PUT',{headline:'BIM DESIGN QA',targetRole:'BIM Coordinator',summary:'ประสบการณ์การทำงานและผลงาน\n'+('พัฒนาแบบจำลองอาคาร BIM COORDINATION '.repeat(50))+' SUMMARY-END',skills:['Revit','Navisworks','IFC'],careerObjective:'CAREER-END',websiteUrl:'https://example.test',isPublic:true,extraSections:{awards:[{title:'AWARD-END'}],activities:[{title:'ACTIVITY-END'}]}});
 uploaded=await page.evaluate(async()=>{const image=await(await fetch('/assets/img/logobranding/logobim.png')).blob();const form=new FormData();form.append('images',image,'qa.png');const result=await(await fetch('/api/upload',{method:'POST',body:form})).json();if(!result.success)throw Error(result.message);return result.urls[0];});
 for(let i=0;i<2;i++)await api('/api/portfolios/me/projects','POST',{title:'PROJECT-'+i,description:'รายละเอียดงาน\nPROJECT-END',image_url:uploaded,is_public:true});
 await api('/api/portfolios/me/experiences','POST',{company:'STUDIO QA',position:'BIM Intern',startDate:'2025-01-01',endDate:'2025-06-01',description:'EXPERIENCE-END'});
 await api('/api/portfolios/me/education','POST',{institution:'UNIVERSITY QA',degree:'Engineering',endYear:'2026'});
 const guest=await(await browser.createBrowserContext()).newPage();guest.on('pageerror',e=>errors.push(e.message));
 // Regression: an existing published document must update without visiting/saving its editor.
 await api('/api/portfolios/me','PUT',{portfolioSettings:{template:'maroon-editorial'},cvSettings:{template:'cv-a4-standard'}});
 for(const [type,id] of [['portfolio','portfolio-p1'],['cv','cv-c2']]){
  await guest.goto(`http://127.0.0.1:3000/page/${type}-public.html?id=${uid}`,{waitUntil:'networkidle2'});
  await guest.waitForFunction(id=>!!document.querySelector('iframe')?.contentDocument?.querySelector('.approved-document.'+id),{},id);
  await guest.screenshot({path:out+'/legacy-'+type+'-public.png'});
  const bytes=await guest.evaluate(async({uid,type})=>{const r=await fetch(`/api/portfolios/public/${uid}/export/pdf?type=${type}`);if(!r.ok)throw Error(await r.text());return Array.from(new Uint8Array(await r.arrayBuffer()));},{uid,type});
  fs.writeFileSync(out+'/legacy-'+type+'.pdf',Buffer.from(bytes));
 }
 const legacyStored=(await api('/api/portfolios/me')).portfolio;
 assert.equal(legacyStored.portfolio_settings.template,'maroon-editorial');assert.equal(legacyStored.cv_settings.template,'cv-a4-standard');
 console.log('PASS legacy public pages and guest PDFs before editor save; stored settings unchanged');
 for(const id of ['portfolio-p1','portfolio-p2','portfolio-p3','resume-r3','cv-c2']){
  const cv=id.startsWith('resume')||id.startsWith('cv'),type=cv?'cv':'portfolio';
  await page.goto('http://127.0.0.1:3000/page/'+type+'.html',{waitUntil:'networkidle2'});
  if(!cv){await drawer();assert.equal(await page.$$eval('#portfolioTemplateGrid button',x=>x.length),3);if(id==='portfolio-p1'){await page.screenshot({path:out+'/picker-desktop.png'});await page.setViewport({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await page.screenshot({path:out+'/picker-mobile.png'});await page.setViewport({width:1440,height:1000});}await page.click('[data-template="'+id+'"]');const saved=page.waitForResponse(r=>r.url().endsWith('/api/portfolios/me')&&r.request().method()==='PUT');await page.click('#btnApplySettings');assert.equal((await saved).status(),200);}
  else {await page.click('.cv-template-gallery summary');const saved=page.waitForResponse(r=>r.url().endsWith('/api/portfolios/me')&&r.request().method()==='PUT');await page.click('[data-template="'+id+'"]');assert.equal((await saved).status(),200);}
  await page.reload({waitUntil:'networkidle2'});
  const stored=(await api('/api/portfolios/me')).portfolio;assert.equal(stored[cv?'cv_settings':'portfolio_settings'].template,id);
  await page.waitForFunction(id=>[...document.querySelectorAll('iframe')].some(f=>{try{return !!f.contentDocument?.querySelector('.approved-document.'+id)}catch{return false}}),{},id);
  await guest.goto(`http://127.0.0.1:3000/page/${type}-public.html?id=${uid}`,{waitUntil:'networkidle2'});await guest.waitForFunction(id=>!!document.querySelector('iframe')?.contentDocument?.querySelector('.approved-document.'+id),{},id);
  await guest.screenshot({path:out+'/'+id+'-public.png'});
  if(cv){const response=page.waitForResponse(r=>r.url().includes('/me/export/pdf')&&r.request().method()==='POST',{timeout:45000});await page.click('#btnDownloadCvPdf');assert.equal((await response).status(),200);await page.waitForFunction(()=>!document.getElementById('btnDownloadCvPdf').disabled);}
  const bytes=await page.evaluate(async type=>{const r=await fetch('/api/portfolios/me/export/pdf?type='+type);if(!r.ok)throw Error(await r.text());return Array.from(new Uint8Array(await r.arrayBuffer()));},type);fs.writeFileSync(out+'/'+id+'.pdf',Buffer.from(bytes));console.log('PASS',id,'picker/save/reload/public/PDF');
 }
 assert.deepEqual(errors,[]);console.log('PASS page errors=0 / mobile width=390');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(uploaded)fs.rmSync(path.join(root,uploaded),{force:true});if(uid){await db.query('DELETE FROM projects WHERE owner_user_id=?',[uid]);await db.query("DELETE FROM sessions WHERE JSON_EXTRACT(data,'$.user.id')=?",[uid]);await db.query('DELETE FROM portfolios WHERE user_id=?',[uid]);await db.query('DELETE FROM users WHERE id=?',[uid]);}await db.end();console.log('Fixtures removed');});
