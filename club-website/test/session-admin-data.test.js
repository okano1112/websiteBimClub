const test = require('node:test');
const assert = require('node:assert/strict');
const { parseUpdate, updateAdminUser } = require('../src/services/adminUserUpdate');
const { profileFields, saveProfile } = require('../src/services/profileUpdate');
const validatePortfolio = require('../src/services/portfolioInput');
const sessionPolicy = require('../config/sessionPolicy');

test('Profile patches preserve omitted visibility and reject ambiguous boolean values', async () => {
  assert.deepEqual(profileFields({ department: ' BIM ' }), { department: 'BIM' });
  for (const isPublic of ['false', '0', 0, null]) assert.throws(() => profileFields({ isPublic }), e => e.status === 400);
  assert.equal(profileFields({ isPublic: false }).is_public, 0);
  let statement;
  await saveProfile({ query: async (sql, values) => { statement = { sql, values }; } }, 4, { department: 'BIM' });
  assert.match(statement.sql, /is_public/);
  assert.doesNotMatch(statement.sql.split('ON DUPLICATE KEY UPDATE')[1], /is_public/);
  assert.equal(statement.values[1], 0);
  assert.throws(() => profileFields({ coverUrl: '/uploads/../secret.png' }));
});
test('Portfolio rejects invalid JSON, nested skills and executable URLs before writing', () => {
  assert.doesNotThrow(() => validatePortfolio({ skills: '["BIM"]', extraSections: {}, websiteUrl: 'https://example.com' }));
  for (const body of [{skills:'broken'}, {skills:[{}]}, {cvSettings:[]}, {websiteUrl:'javascript:alert(1)'}, {headline:{}}, {isPublic:'maybe'}]) assert.throws(() => validatePortfolio(body), e => e.status === 400);
});
test('Admin profile and role commit together; failed updates rollback and release', async () => {
  let commits = 0, rollbacks = 0, releases = 0, updates = 0, fail = false;
  const conn = {
    beginTransaction: async () => {}, commit: async () => { commits++; }, rollback: async () => { rollbacks++; }, release: () => { releases++; },
    query: async (sql, values) => {
      if (sql.startsWith('SELECT id FROM users')) return [[{id:1},{id:2}]];
      if (sql.startsWith('SELECT id, role')) return [[{id:3, role:'user'}]];
      if (sql.startsWith('UPDATE')) { assert.match(sql, /full_name = \?, phone = \?, role = \?/); updates++; if (fail) throw Error('write failed'); return [{}]; }
      throw Error(sql);
    }
  };
  const db = { getConnection: async () => conn };
  const value = parseUpdate({ fullName: ' Member ', phone:'0812345678', role:'instructor' }, true);
  await updateAdminUser(db, 1, 3, value);
  assert.equal(commits,1); assert.equal(updates,1);
  fail = true;
  await assert.rejects(updateAdminUser(db,1,3,value));
  assert.equal(commits,1); assert.equal(rollbacks,1); assert.equal(releases,2);
  assert.throws(() => parseUpdate({fullName:'x',role:'root'},true),e=>e.status===400);
  await assert.rejects(updateAdminUser(db,99,3,value),e=>e.status===403);
});
test('Session configuration validates idle, absolute expiry and proxy hop limits', () => {
  assert.deepEqual(sessionPolicy({}), {idleMs:86400000,absoluteMs:604800000,proxyHops:1});
  for(const env of [{SESSION_IDLE_HOURS:'NaN'},{SESSION_MAX_DAYS:'0'},{TRUST_PROXY_HOPS:'true'},{SESSION_IDLE_HOURS:'168',SESSION_MAX_DAYS:'1'}]) assert.throws(()=>sessionPolicy(env));
});
test('One session works across two app instances, rolls its cookie and is revoked at absolute expiry', async () => {
  const express = require('express'), session = require('express-session');
  const store = new session.MemoryStore(); // Test double only; production uses MariaDB.
  let now = 100000;
  const servers = [];
  try {
    for(let i=0;i<2;i++) {
      const app=express();
      app.use(session(require('../config/sessionOptions')(store,{SESSION_SECRET:'test-only-shared-secret'})));
      app.use(require('../middleware/sessionLifetime')({idleMs:86400000,absoluteMs:604800000},()=>now));
      app.get('/login',(req,res)=>{req.session.regenerate(error=>{if(error)throw error;req.session.user={id:4};req.session.authenticatedAt=now;req.session.save(error=>{if(error)throw error;res.json({ok:true});});});});
      app.get('/me',(req,res)=>res.status(req.session.user?200:401).json({ok:!!req.session.user}));
      app.post('/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
      const server=app.listen(0,'127.0.0.1');servers.push(server);
      await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
    }
    const url=i=>`http://127.0.0.1:${servers[i].address().port}`;
    const login=await fetch(url(0)+'/login');
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const me=await fetch(url(1)+'/me',{headers:{cookie}});
    assert.equal(me.status,200);assert.ok(me.headers.get('set-cookie'));
    now += 604800001;
    assert.equal((await fetch(url(1)+'/me',{headers:{cookie}})).status,401);
    assert.equal((await fetch(url(0)+'/me',{headers:{cookie}})).status,401);
    const again=await fetch(url(0)+'/login');
    const second=again.headers.get('set-cookie').split(';')[0];
    await fetch(url(1)+'/logout',{method:'POST',headers:{cookie:second}});
    assert.equal((await fetch(url(0)+'/me',{headers:{cookie:second}})).status,401);
  } finally { for(const server of servers){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));} store.clear(); }
});
test('Shared rate-limit store returns committed counters and fails closed on DB errors', async () => {
  const Store = require('../src/services/mysqlRateLimitStore');
  let hits=0, commits=0, releases=0, rollbacks=0, fail=false;
  const conn={beginTransaction:async()=>{},commit:async()=>{commits++;},rollback:async()=>{rollbacks++;},release:()=>{releases++;},query:async(sql,values)=>{
    assert.match(values[0],/^[a-f0-9]{64}$/);
    if(fail)throw Error('DB unavailable');
    if(sql.includes('INSERT INTO auth_rate_limits')){hits++;assert.match(sql,/ON DUPLICATE KEY UPDATE/);return [{}];}
    if(sql.startsWith('SELECT'))return [[{hits,expires_at:2000000000000}]];
    throw Error(sql);
  }};
  const db={getConnection:async()=>conn};
  const first=new Store(db),second=new Store(db);
  first.init({windowMs:900000});second.init({windowMs:900000});
  assert.equal((await first.increment('192.0.2.1')).totalHits,1);
  assert.equal((await second.increment('192.0.2.1')).totalHits,2);
  assert.equal(commits,2);assert.equal(releases,2);
  fail=true;await assert.rejects(first.increment('192.0.2.1'),/DB unavailable/);
  assert.equal(rollbacks,1);assert.equal(releases,3);
});
test('Multi-table transaction rolls back when an image write fails', async () => {
  let committed=false, rolledBack=false, released=false;
  const db={getConnection:async()=>({beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{released=true;}})};
  await assert.rejects(require('../src/services/transaction')(db,async()=>{throw Error('image failure');}));
  assert.equal(committed,false);assert.equal(rolledBack,true);assert.equal(released,true);
});
