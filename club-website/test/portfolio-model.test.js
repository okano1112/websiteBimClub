const test=require('node:test'), assert=require('node:assert/strict');
const model=require('../public/js/portfolio-model'), templates=require('../public/js/portfolio-templates');
const saved={full_name:'นักศึกษา Test',phone:'0812345678',email:'fixture@example.test',avatar_url:'/assets/img/logobranding/logobim.png',headline:'BIM Club Developer',target_role:'BIM Coordinator',summary:'สรุปภาษาไทย\nSecond line',career_objective:'เป้าหมายอาชีพ',website_url:'https://example.test',skills:JSON.stringify(['Revit','Unicode Ω']),projects:[{id:10,canonical_project_id:100,title:'Project fixture'}],involved_projects:[{id:11,canonical_project_id:100,title:'Duplicate'}],extra_sections:JSON.stringify({awards:[{title:'Achievement fixture',description:'Award detail'}],activities:[{title:'Activity fixture',role:'Leader'}],custom_contacts:[{label:'GitHub',url:'https://example.test/link'}]}),portfolio_settings:{template:'maroon-editorial',theme:{primary:'#123456'}}};
test('One normalized payload across user-profile and public SQL aliases, without changing source',()=>{
 const copy=JSON.stringify(saved);const publicPayload=model.documentPayload(saved);const {full_name,phone,email,avatar_url,...rest}=saved;
 assert.deepEqual(model.documentPayload({...rest,user_profile:{full_name,phone,email,avatar_url}}),publicPayload);
 assert.equal(publicPayload.projects.length,1);assert.equal(publicPayload.skills[1],'Unicode Ω');assert.equal(JSON.stringify(saved),copy);
});
test('Form synchronization reads fullName, phone and every scalar into local draft',()=>{
 const draft={};const values={inpFullName:'New name',inpPhone:'0899999999',inpHeadline:'Live headline',inpTargetRole:'New role',inpSummary:'Live summary',inpCareerObjective:'Live objective',inpWebsiteUrl:'https://example.test'};
 model.syncFormDraftToState(draft,{querySelector:id=>values[id.slice(1)]===undefined?null:{value:values[id.slice(1)]}});
 assert.equal(draft.user_profile.full_name,'New name');assert.equal(draft.user_profile.phone,'0899999999');assert.equal(draft.headline,'Live headline');assert.equal(draft.summary,'Live summary');assert.equal(draft.career_objective,'Live objective');
});
test('All Portfolio templates retain headline, target role, summary, objective and collections',()=>{
 for(const template of ['maroon-editorial','navy-professional','modern-grid','minimal-a4','a3-landscape-showcase','institutional-bimclub']){
  const payload=model.documentPayload(saved,{}, {template});const html=templates.renderDocument(payload);
  for(const text of ['BIM Club Developer','BIM Coordinator','สรุปภาษาไทย','เป้าหมายอาชีพ','Project fixture','Achievement fixture','Activity fixture','https://example.test/link','https://example.test','/assets/img/logobranding/logobim.png'])assert.ok(html.includes(text),template+': '+text);
 }
});
test('Editor visibility names map to renderer names and input payload is immutable',()=>{
 const payload=model.documentPayload(saved,{}, {hiddenSections:['about_me','career_objective','name_headline_role','contact_links']});const before=JSON.stringify(payload);const html=templates.renderDocument(payload);
 for(const text of ['สรุปภาษาไทย','เป้าหมายอาชีพ','BIM Club Developer','BIM Coordinator','https://example.test/link'])assert.ok(!html.includes(text),text);
 assert.equal(JSON.stringify(payload),before);
});
