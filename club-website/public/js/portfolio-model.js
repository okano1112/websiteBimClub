/* Shared browser/Node mapping. Database fields remain canonical; drafts never change public data. */
(function(root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.PortfolioModel = factory(); })(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const json = (value, fallback) => { if (typeof value !== 'string') return value ?? fallback; try { return JSON.parse(value); } catch { return fallback; } };
  const clone = value => JSON.parse(JSON.stringify(value));
  function documentPayload(portfolio, user = {}, overrides = {}) {
    const type = overrides.docType || overrides.type || 'portfolio';
    const saved = json(type === 'cv' ? portfolio.cv_settings : portfolio.portfolio_settings, {});
    const settings = { docType: type, template: type === 'cv' ? 'cv-a4-standard' : 'maroon-editorial', pageSize: 'a4', orientation: 'portrait', language: 'th', hiddenSections: [], ...saved, ...overrides,
      theme: { primary: '#012240', secondary: '#AD0F0F', bg: 'white', ...saved.theme, ...overrides.theme },
      branding: { showSoeLogo: true, showBimClubLogo: true, footerStyle: 'footer-bar', scope: 'all', logoSize: 'medium', institutionText: 'BimClub Official Accredited • Faculty of Engineering', ...saved.branding, ...overrides.branding } };
    const extra = json(portfolio.extra_sections, {});
    const profile = portfolio.user_profile || user;
    const value = (snake, camel, fallback = '') => profile[snake] ?? profile[camel] ?? portfolio[snake] ?? fallback;
    const projects = [...(portfolio.projects || []), ...(portfolio.involved_projects || [])];
    const seen = new Set();
    return { profile: { fullName: value('full_name','fullName', portfolio.user_name || 'สมาชิก BimClub'), email: value('email','email'), phone: value('phone','phone'), avatarUrl: value('avatar_url','avatarUrl',portfolio.user_avatar || ''), headline: portfolio.headline || '', targetRole: portfolio.target_role || '', summary: portfolio.summary || '', careerObjective: portfolio.career_objective || '', websiteUrl: portfolio.website_url || '', customLinks: extra.custom_contacts || [] },
      skills: json(portfolio.skills, []), experiences: (portfolio.experiences || []).map(item => ({ ...item, start_date: item.start_date || item.startDate, end_date: item.end_date || item.endDate })), education: (portfolio.education || []).map(item => ({ ...item, field_of_study: item.field_of_study || item.fieldOfStudy, end_year: item.end_year || item.endYear || item.graduation_year })),
      projects: projects.filter(item => { const key = item.canonical_project_id ?? item.id; if (key == null) return true; if (seen.has(key)) return false; seen.add(key); return true; }), certificates: portfolio.certificates || { system: [], manual: [] }, extraSections: extra, settings };
  }
  const scalarFields = { inpFullName: ['user_profile','full_name'], inpPhone: ['user_profile','phone'], inpTargetRole: ['target_role'], inpHeadline: ['headline'], inpSummary: ['summary'], inpCareerObjective: ['career_objective'], inpWebsiteUrl: ['website_url'], inpWebsiteLink: ['website_url'] };
  function syncFormDraftToState(draft, form) {
    for (const [id, keys] of Object.entries(scalarFields)) { const input = form.querySelector(`#${id}`); if (!input) continue; if (keys.length === 2) (draft[keys[0]] ||= {})[keys[1]] = input.value; else draft[keys[0]] = input.value; }
    return draft;
  }
  // Each collection uses its existing storage/API. One unsent row can be edited per section.
  const collections = {
    experiences: { button:'btnAddExpSubmit', path:'experiences', response:'experience', required:['company','position'], fields:{company:'inpExpCompany',position:'inpExpPosition',start_date:'inpExpStart',end_date:'inpExpEnd',description:'inpExpDesc'} },
    projects: {button:'btnAddProjSubmit',path:'projects',response:'project',required:['title'],fields:{title:'inpProjTitle',project_url:'inpProjUrl',description:'inpProjDesc',is_public:'inpProjPublic'}},
    education: {button:'btnAddEduSubmit',path:'education',response:'education',required:['institution'],fields:{institution:'inpEduInstitution',degree:'inpEduDegree',field_of_study:'inpEduField',end_year:'inpEduYear'}},
    certificates: {button:'btnAddCertSubmit',path:'certificates',response:'certificate',required:['title','issuer'],fields:{title:'inpCertTitle',issuer:'inpCertIssuer',issue_date:'inpCertDate',credential_url:'inpCertUrl'}},
    internships:{button:'btnAddInternSubmit',extra:true,required:['company','role'],fields:{company:'inpInternCompany',role:'inpInternRole',period:'inpInternPeriod',description:'inpInternDesc'}},
    awards:{button:'btnAddAwardSubmit',extra:true,required:['title'],fields:{title:'inpAwardTitle',issuer:'inpAwardIssuer',year:'inpAwardYear',description:'inpAwardDesc'}},
    activities:{button:'btnAddActSubmit',extra:true,required:['title'],fields:{title:'inpActTitle',role:'inpActRole',year:'inpActYear'}},
    languages:{button:'btnAddLangSubmit',extra:true,required:['language'],fields:{language:'inpLangName',level:'inpLangLevel'}},
    publications:{button:'btnAddPubSubmit',extra:true,required:['title'],fields:{title:'inpPubTitle',publisher:'inpPubPublisher',year:'inpPubYear'}},
    volunteer:{button:'btnAddVolSubmit',extra:true,required:['role'],fields:{role:'inpVolRole',organization:'inpVolOrg'}},
    references:{button:'btnAddRefSubmit',extra:true,required:['name'],fields:{name:'inpRefName',title:'inpRefTitle',organization:'inpRefOrg',contact:'inpRefContact'}},
    custom_contacts:{button:'btnAddLinkSubmit',extra:true,required:['label','url'],fields:{label:'inpLinkTitle',url:'inpLinkUrl'}}
  };
  function list(draft, key) { if (collections[key].extra) return (draft.extra_sections ||= {})[key] ||= []; if (key === 'certificates') return (draft.certificates ||= {system:[]}).manual ||= []; return draft[key] ||= []; }
  function saveFields(draft, settings) { return { headline:draft.headline || '', targetRole:draft.target_role || '', summary:draft.summary || '', careerObjective:draft.career_objective || '', websiteUrl:draft.website_url || '', skills:draft.skills || [], extraSections:draft.extra_sections || {}, portfolioSettings:settings, isPublic:!!draft.is_public }; }
  return { documentPayload, syncFormDraftToState, collections, list, clone, saveFields };
});
