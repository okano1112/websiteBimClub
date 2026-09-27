// Only the new operational migrations live here. Never run schema.sql on an existing DB.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),mysql=require('mysql2/promise');
(async()=>{
  const directory=path.resolve(__dirname,'../../database/migrations');
  const files=(await fs.readdir(directory)).filter(f=>/^\d+-[a-z-]+\.sql$/.test(f)).sort();
  if(!process.argv.includes('--apply')){console.log('Plan only:',files.join(', '));return;}
  for(const key of ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME'])if(!process.env[key])throw Error(`Missing ${key}`);
  const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  let locked=false;
  try{
    const [[row]]=await db.query("SELECT GET_LOCK('bimclub_schema_migrations',10) AS acquired");if(row.acquired!==1)throw Error('Migration lock unavailable');locked=true;
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(190) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    for(const name of files){const sql=await fs.readFile(path.join(directory,name),'utf8');const checksum=crypto.createHash('sha256').update(sql).digest('hex');const [[old]]=await db.query('SELECT checksum FROM schema_migrations WHERE name=?',[name]);if(old){if(old.checksum!==checksum)throw Error(`Changed applied migration: ${name}`);continue;}
      // Each migration is one idempotent statement: DDL may auto-commit before ledger insert.
      await db.query(sql);await db.query('INSERT INTO schema_migrations(name,checksum) VALUES(?,?)',[name,checksum]);console.log('Applied',name);
    }
  }finally{if(locked)await db.query("SELECT RELEASE_LOCK('bimclub_schema_migrations')");await db.end();}
})().catch(e=>{console.error('Migration failed:',e.code||e.message);process.exitCode=1;});
