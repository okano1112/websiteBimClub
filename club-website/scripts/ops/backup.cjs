// Encrypted logical backup. All app/worker writes must be paused for DB/files consistency.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {createReadStream,createWriteStream}=require('node:fs'),{spawn,execFile}=require('node:child_process'),{promisify}=require('node:util'),{pipeline}=require('node:stream/promises');
const run=promisify(execFile);
async function dump(file){
  const child=spawn('mariadb-dump',['--host',process.env.DB_HOST,'--port',process.env.DB_PORT||'3306','--user',process.env.DB_USER,'--single-transaction','--skip-lock-tables','--hex-blob',process.env.DB_NAME],{env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},stdio:['ignore','pipe','ignore']});
  const ended=new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Database backup failed')));});
  await Promise.all([pipeline(child.stdout,createWriteStream(file,{mode:0o600})),ended]);
}
(async()=>{
 if(!process.argv.includes('--writes-paused'))throw Error('Pause all application/worker writes, then pass --writes-paused');
 for(const k of ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME','BACKUP_KEY_BASE64','BACKUP_OUTPUT'])if(!process.env[k])throw Error(`Missing ${k}`);
 const key=Buffer.from(process.env.BACKUP_KEY_BASE64,'base64');if(key.length!==32)throw Error('Backup encryption key must be 32 random bytes in base64');
 const output=path.resolve(process.env.BACKUP_OUTPUT),uploads=path.resolve(process.env.UPLOADS_DIR||'uploads');
 if(output.startsWith(uploads+path.sep)||output.startsWith(path.resolve('public')+path.sep))throw Error('Backup must be stored outside public/uploads');
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'bimclub-backup-'));await fs.chmod(tmp,0o700);
 let reserved=false;
 try{
  const handle=await fs.open(output,'wx',0o600);await handle.close();reserved=true;
  await dump(path.join(tmp,'database.sql'));
  await fs.cp(uploads,path.join(tmp,'uploads'),{recursive:true,dereference:false,filter:async source=>{if((await fs.lstat(source)).isSymbolicLink())throw Error('Symlinks not permitted in backup uploads');return true;}});
  await fs.writeFile(path.join(tmp,'manifest.json'),JSON.stringify({version:1,createdAt:new Date().toISOString(),database:process.env.DB_NAME,type:'logical-quiesced',node:process.version}));
  const archive=path.join(tmp,'payload.tar.gz');await run('tar',['-czf',archive,'-C',tmp,'database.sql','uploads','manifest.json']);
  const nonce=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,nonce);
  await fs.writeFile(output,Buffer.concat([Buffer.from('BIMBK001'),nonce]));
  await pipeline(createReadStream(archive),cipher,createWriteStream(output,{flags:'a'}));await fs.appendFile(output,cipher.getAuthTag());
  reserved=false;console.log('Encrypted backup complete:',output);
 }finally{if(reserved)await fs.rm(output,{force:true});await fs.rm(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error('Backup failed:',e.code||e.message);process.exitCode=1;});
