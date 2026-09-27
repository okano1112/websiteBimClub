"""Read-only validation of approved-designs.cjs PDF outputs; requires pdfplumber."""
import logging, re, sys
from pathlib import Path
import pdfplumber
logging.getLogger('pdfminer').setLevel(logging.ERROR)
root=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/bimclub-designs')
for name in ['resume-r3','cv-c2','portfolio-p1','portfolio-p2','portfolio-p3','legacy-portfolio','legacy-cv']:
    with pdfplumber.open(root/(name+'.pdf')) as pdf:
        texts=[page.extract_text() or '' for page in pdf.pages]
        text=re.sub(r'\s+','',''.join(texts))
        assert 'FACULTYACCREDITEDPORTFOLIO' not in text,(name,'legacy cover')
        for marker in ['BIMDESIGNQA','SUMMARY-END','PROJECT-END','EXPERIENCE-END','AWARD-END','ACTIVITY-END']:
            assert marker in text,(name,marker)
        assert all(t.strip() for t in texts),(name,'blank page')
        assert all(-.5<=c['x0'] and c['x1']<=p.width+.5 and -.5<=c['top'] and c['bottom']<=p.height+.5 for p in pdf.pages for c in p.chars),(name,'outside page')
        print(name,len(pdf.pages),'pages: content, no blank pages, text bounds PASS')
