/* Preview cards use the production renderer with explicitly fictional sample data. */
document.addEventListener('DOMContentLoaded', () => {
    const illustration = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#edf0ef"/><g fill="none" stroke="#526872" stroke-width="3"><path d="M70 280 290 350 570 210 350 140Z M70 280V130L350 30 570 110V210 M350 30V140 M570 110 290 250 70 130 M290 250V350"/><path d="M140 154V302 M215 181V325 M365 213V315 M440 175V275 M510 139V240 M70 180 290 300 570 160"/></g></svg>');
    const sample = {
        user_profile:{full_name:'กานต์ ตัวอย่าง',email:'sample@example.test',phone:'08X-XXX-XXXX'},
        headline:'Building Information Modeling',target_role:'BIM Coordinator',
        summary:'นักศึกษาวิศวกรรมที่สนใจการสร้างแบบจำลองอาคารและประสานงานระหว่างสาขา',
        skills:['Revit','Navisworks','IFC','AutoCAD'],
        experiences:[{company:'บริษัทตัวอย่าง',position:'BIM Intern',start_date:'2025-01-01',end_date:'2025-06-01',description:'สร้างแบบจำลองและตรวจสอบความสอดคล้องของแบบร่วมกับทีม'}],
        education:[{institution:'มหาวิทยาลัยตัวอย่าง',degree:'วิศวกรรมศาสตรบัณฑิต',field_of_study:'วิศวกรรมโยธา',end_year:'2026'}],
        projects:[{id:1,title:'Learning Centre',image_url:illustration,description:'ศึกษาแบบจำลองอาคารเพื่อประสานงานโครงสร้างและสถาปัตยกรรม\nบทบาท: จัดทำโมเดลและตรวจสอบแบบ',is_public:1},{id:2,title:'Campus Coordination',image_url:illustration,description:'รวบรวมและทบทวนแบบจำลองร่วมกับทีม',is_public:1}],
        certificates:{system:[],manual:[]},extra_sections:{}
    };
    document.querySelectorAll('[data-document-picker]').forEach(container => {
        const type = container.dataset.documentPicker;
        for (const design of PortfolioTemplates.DESIGNS.filter(item => item.type === type)) {
            const button = document.createElement('button');
            button.type='button';button.className='template-card document-template-option';button.dataset.template=design.id;
            button.setAttribute('aria-pressed','false');
            const thumbnail=document.createElement('span');thumbnail.className='document-thumbnail';
            const frame=document.createElement('iframe');frame.title=`ตัวอย่าง ${design.title}`;frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');frame.setAttribute('sandbox','');
            frame.srcdoc=PortfolioTemplates.renderDocument(PortfolioModel.documentPayload(sample,{}, {docType:type,template:design.id,branding:{footerStyle:'hidden'}}));
            thumbnail.append(frame);
            const title=document.createElement('span');title.className='template-card-title';title.textContent=design.title;
            const description=document.createElement('span');description.className='template-card-desc';description.textContent=design.description;
            button.append(thumbnail,title,description);container.append(button);
            new ResizeObserver(() => {const width=thumbnail.clientWidth;frame.style.transform=`scale(${width/794})`;thumbnail.style.height=`${width*1123/794}px`;}).observe(thumbnail);
            if(type==='cv') button.addEventListener('click',()=>{const select=document.getElementById('selectCvTemplate');select.value=design.id;select.dispatchEvent(new Event('change',{bubbles:true}));});
        }
        if(type==='cv') {
            const select=document.getElementById('selectCvTemplate');
            const sync=()=>container.querySelectorAll('button').forEach(button=>{const active=button.dataset.template===select.value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
            select.addEventListener('change',sync);sync();
            // Loading saved settings updates the select without a synthetic user event.
            document.addEventListener('cv-settings-loaded',sync);
        }
    });
});
