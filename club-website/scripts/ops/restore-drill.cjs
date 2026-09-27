// Deliberately refuses production DB names and existing tables/directories.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),mysql=require('mysql2/promise');
const {createReadStream,createWriteStream}=require('node:fs'),{spawn,execFile}=require('node:child_process'),{promisify}=require('node:util'),{pipeline}=require('node:stream/promises');const run=promisify(execFile);
(async()=>{
 for(const k of ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME','BACKUP_KEY_BASE64','BACKUP_INPUT','RESTORE_UPLOADS_DIR'])if(!process.env[k])throw Error(`Missing ${k}`);
 if(!/^bimclub_restore_[a-z0-9_]+$/.test(process.env.DB_NAME))throw Error('Restore drill requires a fresh bimclub_restore_* database');
 const key=Buffer.from(process.env.BACKUP_KEY_BASE64,'base64');if(key.length!==32)throw Error('Invalid encryption key');
 const target=path.resolve(process.env.RESTORE_UPLOADS_DIR);await fs.mkdir(target,{recursive:false,mode:0o700});
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'bimclub-restore-'));await fs.chmod(tmp,0o700);
 let db;try{
  const input=path.resolve(process.env.BACKUP_INPUT),stat=await fs.stat(input),handle=await fs.open(input,'r');let head=Buffer.alloc(20),tag=Buffer.alloc(16);
  try{await handle.read(head,0,20,0);await handle.read(tag,0,16,stat.size-16);}finally{await handle.close();}
  if(head.subarray(0,8).toString()!=='BIMBK001'||stat.size<37)throw Error('Invalid backup');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,head.subarray(8));decipher.setAuthTag(tag);const archive=path.join(tmp,'payload.tar.gz');
  // Authentication must finish before any SQL is executed or files extracted.
  await pipeline(createReadStream(input,{start:20,end:stat.size-17}),decipher,createWriteStream(archive,{mode:0o600}));
  await run('tar',['-xzf',archive,'-C',tmp]);
  const manifest=JSON.parse(await fs.readFile(path.join(tmp,'manifest.json'),'utf8'));if(manifest.version!==1)throw Error('Unsupported backup version');
  db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  const [tables]=await db.query('SHOW TABLES');if(tables.length)throw Error('Restore target must be empty');
  const child=spawn('mariadb',['--host',process.env.DB_HOST,'--port',process.env.DB_PORT||'3306','--user',process.env.DB_USER,process.env.DB_NAME],{env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},stdio:['pipe','ignore','ignore']});
  const ended=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Database restore failed')));});await Promise.all([pipeline(createReadStream(path.join(tmp,'database.sql')),child.stdin),ended]);
  await fs.cp(path.join(tmp,'uploads'),target,{recursive:true});const [restored]=await db.query('SHOW TABLES');if(!restored.length)throw Error('No tables restored');
  console.log('Restore drill completed:',restored.length,'tables; verify application records and media before accepting recovery');
 }finally{if(db)await db.end();await fs.rm(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error('Restore failed:',e.code||e.message);process.exitCode=1;});
