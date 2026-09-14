// PDF fixtures only: no database writes and no personal data.
if(process.env.BIMCLUB_QA_LOCAL!=='1'||process.env.NODE_ENV==='production')throw Error('Local QA only');
const fs=require('node:fs'),path=require('node:path'),root=process.cwd();
const {generatePdf}=require(path.join(root,'src/services/pdfRenderer')),model=require(path.join(root,'public/js/portfolio-model'));
(async()=>{
 const out='/tmp/bimclub-targeted',saved=JSON.parse(fs.readFileSync(out+'/saved-fixture.json'));
 saved.user_profile.avatar_url='/assets/img/logobranding/logobim.png';saved.skills=Array.from({length:45},(_,i)=>`BIM-Skill-${i+1}`);saved.projects[0].image_url='/assets/img/logobranding/logobim.png';
 for(const template of ['maroon-editorial','navy-professional','modern-grid','minimal-a4','a3-landscape-showcase','institutional-bimclub','cv-a4-ats']){
  const payload=model.documentPayload(saved,{}, {template,docType:template.startsWith('cv-')?'cv':'portfolio',pageSize:template.startsWith('a3-')?'a3':'a4',orientation:template.startsWith('a3-')?'landscape':'portrait',theme:{primary:'#123456',secondary:'#ad0f0f'},hiddenSections:[]});
  fs.writeFileSync(`${out}/${template}.pdf`,await generatePdf(payload));console.log('PDF generated',template);
 }
 const empty=model.documentPayload({user_profile:{full_name:'EMPTY OPTIONAL QA'},skills:[]});fs.writeFileSync(out+'/empty.pdf',await generatePdf(empty));console.log('PDF generated empty optional fields');
})().catch(e=>{console.error(e);process.exitCode=1;});
