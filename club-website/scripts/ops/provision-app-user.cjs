const mysql=require('mysql2/promise');
(async()=>{
  if(!process.argv.includes('--apply')){console.log('Plan: create a dedicated app user with SELECT/INSERT/UPDATE/DELETE; use separate admin credentials.');return;}
  for(const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','DB_ADMIN_USER','DB_ADMIN_PASSWORD'])if(!process.env[key])throw Error(`Missing ${key}`);
  if(!/^[A-Za-z0-9_]+$/.test(process.env.DB_NAME)||!/^[A-Za-z0-9_]+$/.test(process.env.DB_USER)||process.env.DB_USER==='root'||process.env.DB_USER===process.env.DB_ADMIN_USER)throw Error('Dedicated application account and valid database name required');
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_ADMIN_USER,password:process.env.DB_ADMIN_PASSWORD});
  try{
    // Deliberately do not alter an existing account or silently preserve existing broad grants.
    await db.query("CREATE USER ?@'%' IDENTIFIED BY ?",[process.env.DB_USER,process.env.DB_PASSWORD]);
    await db.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ??.* TO ?@'%'",[process.env.DB_NAME,process.env.DB_USER]);
    console.log('Created dedicated application account with DML-only privileges');
  }finally{await db.end();}
})().catch(e=>{console.error('Provisioning failed:',e.code||e.message);process.exitCode=1;});
