// Local-only browser workflow test; temporary accounts/records are removed in finally.
if (process.env.BIMCLUB_QA_LOCAL !== '1' || process.env.NODE_ENV === 'production') throw new Error('Local QA only');
const path = require('node:path'), root = process.cwd(), assert = require('node:assert/strict'), fs = require('node:fs'), crypto = require('node:crypto');
const puppeteer = require(path.join(root,'node_modules/puppeteer')), bcrypt = require(path.join(root,'node_modules/bcryptjs')), db = require(path.join(root,'config/database'));
const tag = `qa_ui_${Date.now()}`, password = crypto.randomBytes(18).toString('hex'), users = [], projectIds = [], positionIds = [];
const output='/tmp/bimclub-ui';fs.mkdirSync(output,{recursive:true});let browser, page, guest;const errors=[];
async function fill(selector,value) {await page.$eval(selector,(el,text)=>{el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}
async function post(url,method,body) {const result=await page.evaluate(async({url,method,body})=>{const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status, data:await r.json()};},{url,method,body});assert.ok(result.status<400,JSON.stringify(result));return result.data;}
async function shot(name,target=page) {await target.screenshot({path:`${output}/${name}.png`});}
(async()=>{
 const hash=await bcrypt.hash(password,12);
 for(let i=0;i<12;i++){const [r]=await db.query('INSERT INTO users (username,email,password,full_name,role,is_verified) VALUES (?,?,?,?,?,1)',[`${tag}_${i}`,`${tag}_${i}@example.test`,hash,`${tag} ${i}`,i===0?'admin':'user']);users.push(r.insertId);await db.query('INSERT INTO portfolios (user_id,is_public) VALUES (?,1)',[r.insertId]);}
 browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium-browser',args:['--no-sandbox','--disable-dev-shm-usage']});page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:900});
 await page.goto('http://127.0.0.1:3000/page/login.html',{waitUntil:'networkidle2'});await fill('#username',`${tag}_0`);await fill('#password',password);await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}),page.click('#loginForm button[type=submit]')]);assert.ok(!page.url().includes('login'));
 console.log('Browser login passed');
 // Real create/edit/deactivate through Positions UI.
 await page.goto('http://127.0.0.1:3000/page/admin-positions.html',{waitUntil:'networkidle2'});await fill('#positionNameTh',tag);await fill('#positionOrder',7);await page.click('#positionLeader');
 const createPosition=page.waitForResponse(r=>r.url().endsWith('/api/positions')&&r.request().method()==='POST');await page.click('#positionForm button[type=submit]');const positionData=await(await createPosition).json();assert.equal(positionData.success,true);positionIds.push(positionData.position.id);
 await page.waitForFunction(t=>document.querySelector('#positionRows').textContent.includes(t),{},tag);
 await page.evaluate(t=>{const row=[...document.querySelectorAll('#positionRows tr')].find(r=>r.textContent.includes(t));row.querySelector('button').click();},tag);
 await fill('#positionOrder',2);await page.click('#positionActive');const editPosition=page.waitForResponse(r=>r.url().endsWith(`/api/positions/${positionIds[0]}`)&&r.request().method()==='PUT');await page.click('#positionForm button[type=submit]');assert.equal((await editPosition).status(),200);await shot('positions-workflow-mobile');
 console.log('Positions UI passed');
 // Project API setup then admin UI editing and keyboard tagging.
 const created=await post('/api/projects','POST',{title:tag+' project',is_public:false});projectIds.push(created.project.id);
 await page.goto('http://127.0.0.1:3000/page/admin-projects.html',{waitUntil:'networkidle2'});const filteredProjects=page.waitForResponse(r=>r.url().includes('/api/projects/admin?')&&new URL(r.url()).searchParams.get('q')===tag);await fill('#projectSearch',tag);await filteredProjects;await page.waitForNetworkIdle({idleTime:250});await page.click('#projectRows button');await page.waitForSelector('#projectForm:not([hidden])');
 await fill('#projectTitle',tag+' updated');await page.click('#projectPublic');const projectSave=page.waitForResponse(r=>r.url().endsWith(`/api/projects/${projectIds[0]}`)&&r.request().method()==='PUT');await page.click('#projectForm button[type=submit]');assert.equal((await projectSave).status(),200);
 await fill('#collaboratorSearch',`${tag}_1`);await page.waitForSelector('#collaboratorResults button');await page.focus('#collaboratorSearch');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForSelector('#collaboratorSelected input');await fill('#collaboratorSelected input','BIM contributor');const tagging=page.waitForResponse(r=>r.url().includes('/collaborators')&&r.request().method()==='PUT');await page.click('#saveCollaborators');assert.equal((await tagging).status(),200);await shot('tagging-workflow-mobile');
 const [[member]]=await db.query('SELECT user_id FROM project_members WHERE project_id=?',[projectIds[0]]);assert.ok(member);
 console.log('Project tagging UI passed');
 // Page 2 comes from server, search keeps all matching fixtures and filter resets page.
 await page.goto('http://127.0.0.1:3000/page/admin-users.html',{waitUntil:'networkidle2'});await fill('#userSearch',tag);await page.waitForFunction(()=>document.querySelector('#userPageInfo').textContent.includes('12 รายการ'));const first=await page.$$eval('#usersList tr',rows=>rows.map(r=>r.cells[0].textContent));await page.click('#userNext');await page.waitForFunction(()=>document.querySelector('#userPageInfo').textContent.includes('หน้า 2'));const second=await page.$$eval('#usersList tr',rows=>rows.map(r=>r.cells[0].textContent));assert.ok(second.every(id=>!first.includes(id)));await page.select('#userRoleFilter','admin');await page.waitForFunction(()=>document.querySelector('#userPageInfo').textContent.includes('1 รายการ'));await shot('pagination-workflow-mobile');
 console.log('Pagination UI passed');
 // Public guest sees tagged project in profile and both document renderers.
 const context=await browser.createBrowserContext();guest=await context.newPage();guest.on('pageerror',e=>errors.push(e.message));await guest.setViewport({width:390,height:900});
 for(const [file,query] of [['profile','userId'],['portfolio-public','id'],['cv-public','id']]){
  console.log("Checking public",file);
  await guest.goto(`http://127.0.0.1:3000/page/${file}.html?${query}=${member.user_id}`,{waitUntil:'networkidle2'});try { await guest.waitForFunction(t=>document.body.textContent.includes(t) || [...document.querySelectorAll('iframe')].some(frame=>frame.contentDocument?.body?.textContent.includes(t)),{timeout:10000},tag+' updated'); } catch(error) { console.log(await guest.evaluate(()=>document.body.innerText.slice(-1500))); throw error; }if (file !== 'profile') { await guest.waitForFunction(()=>!!document.querySelector('.apple-document-frame')?.style.height); assert.ok(await guest.$eval('iframe',frame=>frame.getBoundingClientRect().width > 250 && frame.getBoundingClientRect().height > 300)); assert.ok(await guest.$eval('iframe',frame=>frame.getBoundingClientRect().width <= frame.parentElement.clientWidth + 1)); } const width=await guest.evaluate(()=>document.documentElement.scrollWidth);assert.equal(width,390,`${file} mobile overflow`);await shot(`${file}-populated-mobile`,guest);
 }
 console.log('Public tagged document rendering passed');
 // UI recovery/verification state uses intercepted local responses; actual OTP logic tested separately against DB.
 await guest.setRequestInterception(true);guest.on('request',request=>{const url=new URL(request.url());if(['/api/auth/register','/api/auth/verify-otp'].includes(url.pathname)){request.respond({status:url.pathname.endsWith('register')?201:200,contentType:'application/json',body:JSON.stringify({success:true,message:'QA verification response',requiresVerification:true,retryAfter:60})});}else request.continue();});
 await guest.goto('http://127.0.0.1:3000/page/register.html',{waitUntil:'networkidle2'});
 for(const [selector,value] of [['#regUsername','qa_ui_register'],['#regEmail','qa_ui_register@example.test'],['#regFullName','QA Browser'],['#regPassword',password],['#regConfirmPassword',password]])await guest.$eval(selector,(el,v)=>{el.value=v;},value);
 await guest.click('#registerForm button[type=submit]');await guest.waitForSelector('#otpForm:not([hidden])');await guest.reload({waitUntil:'networkidle2'});assert.equal(await guest.$eval('#otpEmail',el=>el.value),'qa_ui_register@example.test');assert.equal(await guest.$eval('#showOtp',el=>getComputedStyle(el).display),'none');await guest.type('#otpCode','123456');await shot('otp-panel-mobile',guest);await guest.click('#otpForm button[type=submit]');await guest.waitForSelector('#verifiedLogin:not([hidden])');
 // Member-only request form at 320px, plus latest About/auth narrow viewport.
 await post('/api/auth/logout','POST',{});await post('/api/auth/login','POST',{email:`${tag}_1`,password});
 for(const file of ['request-instructor','register','about','admin-positions','admin-projects']){await page.setViewport({width:320,height:900});await page.goto(`http://127.0.0.1:3000/page/${file}.html`,{waitUntil:'networkidle2'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320,file);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,workflows:['login','positions create/edit/deactivate','projects edit/publish','keyboard collaborator selection','server pagination','public profile/portfolio/cv tagged work','OTP panel and refresh (responses mocked)','320px layout'],pageErrors:errors}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();
 for(const id of projectIds)await db.query('DELETE FROM projects WHERE id=?',[id]);for(const id of positionIds)await db.query('DELETE FROM positions WHERE id=?',[id]);
 for(const id of users){await db.query("DELETE FROM sessions WHERE JSON_EXTRACT(data, '$.user.id') = ?",[id]);await db.query('DELETE FROM portfolios WHERE user_id=?',[id]);await db.query('DELETE FROM users WHERE id=?',[id]);}
 await db.end();console.log('Browser QA fixtures removed');
});
