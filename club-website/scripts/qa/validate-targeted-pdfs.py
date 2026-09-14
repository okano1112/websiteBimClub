"""Read-only checks of PDFs produced by targeted-portfolio.cjs and targeted-pdf.cjs.
Requires pdfplumber (available in the Codex bundled Python runtime).
"""
import json, logging, re, sys
from pathlib import Path
import pdfplumber
logging.getLogger('pdfminer').setLevel(logging.ERROR)
root = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/bimclub-targeted')
files = ['portfolio', 'public', 'maroon-editorial', 'navy-professional', 'modern-grid', 'minimal-a4',
         'a3-landscape-showcase', 'institutional-bimclub', 'cv-a4-ats', 'empty']
normalize = lambda value: re.sub(r'\s+', '', value).casefold()
results = []
for name in files:
    with pdfplumber.open(root / f'{name}.pdf') as document:
        pages = [page.extract_text() or '' for page in document.pages]
        text = normalize(''.join(pages))
        assert all(page.strip() for page in pages), f'{name}: blank page'
        if name == 'empty':
            assert len(pages) == 1 and 'emptyoptionalqa' in text
        else:
            terms = ['BIM Club Developer', 'BIM Engineer', '0812345678', 'https://example.test/portfolio',
                     'SUMMARY-END', 'OBJECTIVE-END', 'MULTILINE SECOND LINE', 'café', 'Ω', 'ทดสอบ',
                     'https://example.test/projects', 'https://example.test/certificates', 'https://example.test/custom_contacts']
            # Every free-text collection field in the browser fixture must survive printing.
            saved = json.loads((root / 'saved-fixture.json').read_text())
            collections = [saved.get('education', []), saved.get('experiences', []), saved.get('projects', []),
                           saved.get('certificates', {}).get('manual', [])] + list(saved.get('extra_sections', {}).values())
            for items in collections:
                if isinstance(items, list):
                    for row in items:
                        if isinstance(row, dict):
                            terms.extend(value for value in row.values() if isinstance(value, str) and value.endswith('-QA'))
            terms += ['Revit QA'] if name in ['portfolio','public'] else [f'BIM-Skill-{i}' for i in range(1,46)]
            for term in terms:
                assert normalize(term) in text, f'{name}: missing {term}'
            assert len(pages) > 1, f'{name}: long fixture did not paginate'
            if not name.startswith('cv-'):
                assert sum(len(page.images) for page in document.pages) >= 2, f'{name}: profile/project images absent'
        for page in document.pages:
            assert all(-.5 <= char['x0'] and char['x1'] <= page.width+.5 and -.5 <= char['top'] and char['bottom'] <= page.height+.5 for char in page.chars), f'{name}: text outside page'
        results.append({'pdf': name, 'pages':len(pages), 'content':'PASS', 'blank_pages':0, 'out_of_bounds':0})
print(json.dumps(results, ensure_ascii=False, indent=2))
(root / 'pdf-validation.json').write_text(json.dumps(results, indent=2))
