const test = require('node:test');
const assert = require('node:assert/strict');
const PortfolioTemplates = require('../public/js/portfolio-templates');

const samplePayload = {
    profile: {
        fullName: 'กิตติศักดิ์ พัฒนาวิศวกรรม',
        headline: 'Lead BIM Specialist',
        targetRole: 'Senior BIM Manager',
        summary: 'เชี่ยวชาญการจัดการแบบจำลองสารสนเทศอาคารขนาดใหญ่',
        careerObjective: 'มุ่งมั่นพัฒนาและนำเทคโนโลยี BIM และ AI มาประยุกต์ใช้ในอุตสาหกรรมก่อสร้าง',
        email: 'kittisak@example.com',
        phone: '089-111-2222',
        websiteUrl: 'https://kittisak-bim.com',
        customLinks: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/test' }]
    },
    skills: ['Revit', 'Dynamo', 'Navisworks', 'Python', 'BIM 360'],
    experiences: [
        { company: 'Smart BIM Solutions', position: 'BIM Coordinator', startDate: '2023-01', endDate: '', description: 'บริหารแบบจำลองอาคาร 30 ชั้น' }
    ],
    education: [
        { institution: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี', degree: 'วิศวกรรมศาสตรบัณฑิต', fieldOfStudy: 'วิศวกรรมโยธา', endYear: 2022 }
    ],
    projects: [
        { title: 'โครงการรถไฟฟ้าใต้ดินสายสีม่วง', description: 'งานประสานแบบโครงสร้างและงานระบบ MEP' }
    ],
    certificates: {
        system: [{ course_title: 'Revit Essentials', certificate_code: 'CERT-12345' }],
        manual: [{ title: 'Autodesk Certified Professional', issuer: 'Autodesk', issue_date: '2023-05-10' }]
    },
    extraSections: {
        internships: [{ role: 'BIM Trainee', company: 'Design Tech', period: '2022' }],
        awards: [{ title: 'BIM Innovation Award', issuer: 'SOE', year: '2023' }],
        activities: [{ title: 'ประธานชมรม BimClub', role: 'President', year: '2022' }],
        languages: [{ language: 'Thai', level: 'Native' }, { language: 'English', level: 'Professional' }],
        publications: [{ title: 'BIM in High-Rise Structures', publisher: 'Engineering Journal', year: '2024' }],
        volunteer: [{ role: 'วิทยากรจิตอาสา', organization: 'BimClub Academy', period: '2023' }],
        references: [{ name: 'ดร.อาจารย์ ที่ปรึกษา', title: 'อาจารย์ประจำภาควิชา', organization: 'KMUTT', contact: 'advisor@kmutt.ac.th' }],
        sectionStates: {}
    },
    settings: {
        docType: 'portfolio',
        template: 'maroon-editorial',
        pageSize: 'a4',
        orientation: 'portrait',
        theme: { primary: '#012240', secondary: '#AD0F0F', bg: 'white' },
        branding: { showSoeLogo: true, showBimClubLogo: true, footerStyle: 'footer-bar' },
        language: 'th'
    }
};

test('renders all 6 Portfolio templates without error', () => {
    const templates = [
        'maroon-editorial',
        'navy-professional',
        'modern-grid',
        'minimal-a4',
        'a3-landscape-showcase',
        'institutional-bimclub'
    ];

    templates.forEach(tpl => {
        const payload = JSON.parse(JSON.stringify(samplePayload));
        payload.settings.docType = 'portfolio';
        payload.settings.template = tpl;
        const html = PortfolioTemplates.renderDocument(payload);
        assert.ok(html.includes('กิตติศักดิ์ พัฒนาวิศวกรรม'), `Template ${tpl} must include user name`);
        assert.ok(html.includes('doc-page'), `Template ${tpl} must contain document pages`);
    });
});

test('renders all 5 CV templates without error', () => {
    const cvTemplates = [
        'cv-a4-standard',
        'cv-a4-ats',
        'cv-letter-standard',
        'cv-a4-landscape-creative',
        'cv-a3-presentation'
    ];

    cvTemplates.forEach(tpl => {
        const payload = JSON.parse(JSON.stringify(samplePayload));
        payload.settings.docType = 'cv';
        payload.settings.template = tpl;
        const html = PortfolioTemplates.renderDocument(payload);
        assert.ok(html.includes('กิตติศักดิ์ พัฒนาวิศวกรรม'), `CV Template ${tpl} must include user name`);
        if (tpl === 'cv-a4-ats') {
            assert.ok(html.includes('ats-document'), 'ATS template must contain ats-document class');
        }
    });
});

test('contrast ratio calculation produces valid WCAG numbers', () => {
    // White on Black -> ~21
    const whiteOnBlack = PortfolioTemplates.getContrastRatio('#FFFFFF', '#000000');
    assert.ok(whiteOnBlack >= 20, 'White on Black should be ~21:1');

    // Navy on White -> ~15
    const navyOnWhite = PortfolioTemplates.getContrastRatio('#012240', '#FFFFFF');
    assert.ok(navyOnWhite >= 10, 'Navy on White should be > 10:1 (AA and AAA compliant)');

    // Low contrast check: light gray on white
    const lowContrast = PortfolioTemplates.getContrastRatio('#EEEEEE', '#FFFFFF');
    assert.ok(lowContrast < 4.5, 'Low contrast should be < 4.5');
});

test('hidden sections are excluded from document output', () => {
    const payload = JSON.parse(JSON.stringify(samplePayload));
    payload.settings.hiddenSections = ['skills', 'education'];
    const html = PortfolioTemplates.renderDocument(payload);
    assert.ok(!html.includes('doc-section-skills'), 'Hidden skills section should not be in HTML');
    assert.ok(!html.includes('doc-section-edu'), 'Hidden education section should not be in HTML');
});

test('document renderer keeps geometry and branding in the shared output', () => {
    const payload = JSON.parse(JSON.stringify(samplePayload));
    payload.settings.pageSize = 'a3';
    payload.settings.orientation = 'landscape';
    payload.settings.branding = {
        showSoeLogo: true,
        showBimClubLogo: true,
        soeLogoUrl: '/uploads/soe-custom.png',
        bimClubLogoUrl: '/uploads/bim-custom.png',
        footerStyle: 'footer-bar'
    };
    const html = PortfolioTemplates.renderDocument(payload);
    assert.ok(html.includes('@page'), 'Output should contain explicit PDF page rules');
    assert.ok(html.includes('420mm 297mm'), 'A3 landscape geometry should be explicit');
    assert.ok(html.includes('/uploads/soe-custom.png'), 'Custom SOE branding should be rendered');
    assert.ok(html.includes('/uploads/bim-custom.png'), 'Custom BimClub branding should be rendered');
    assert.ok(html.includes('.doc-branding-footer { bottom: 0; }'), 'Footer branding should be anchored to the bottom');
    assert.ok(html.includes('.doc-branding-top { top: 0; }'), 'Header branding should be anchored to the top');
});

test('Letter CV layout uses Letter paper geometry', () => {
    const payload = JSON.parse(JSON.stringify(samplePayload));
    payload.settings.docType = 'cv';
    payload.settings.template = 'cv-letter-standard';
    payload.settings.pageSize = 'letter';
    payload.settings.orientation = 'portrait';
    const html = PortfolioTemplates.renderDocument(payload);
    assert.ok(html.includes('8.5in 11in'), 'Letter portrait geometry should be explicit');
});
