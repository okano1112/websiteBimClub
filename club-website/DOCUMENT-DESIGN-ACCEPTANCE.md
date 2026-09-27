# Approved document designs — 2026-09-18

Implemented the user's confirmed choices: **Resume R3, CV C2, Portfolio P1/P2/P3**.

## Where to select

- `/page/portfolio.html` → ธีม & แม่แบบ: three native-button cards with first-page thumbnails, descriptions and selected state. Select a card then Save settings.
- `/page/cv.html` → ประเภทเอกสาร: R3 Resume or C2 CV. Expand “ดูหน้าตาและเลือก Resume / CV” for the two preview cards. Selection uses the existing CV auto-save behavior.
- Thumbnails use the production renderer and fictional sample data with an original schematic drawing; they do not show another member's information.

## Implementation

- `public/js/portfolio-templates.js`: five approved layouts; shared section renderers preserve stored content. Legacy rendering functions remain internally available; application payloads resolve old saved IDs to P1/C2.
- `public/js/document-template-picker.js` and `public/css/document-template-picker.css`: responsive preview cards, native keyboard controls, aria-pressed, sandboxed first-page previews.
- `public/js/portfolio-model.js`, `portfolio.js`, `cv.js`, and the two editor HTML pages: defaults/selection, load/save compatibility, Resume download label/filename, save-before-download for Resume/CV, no duplicate summary-to-objective fallback.
- New templates have no institutional banner; the corresponding legacy Portfolio controls are hidden. Actual profile/project images remain supported.
- No new framework, font dependency, schema, account permissions or production changes. Resume and CV share the existing CV settings/public URL, with one active selection; Portfolio settings remain independent.
- Legacy saved templates now display P1/C2 immediately on public pages and PDF exports, without an editor save or database rewrite. Explicit approved selections are preserved. This fixes the old public design remaining visible after the editor redesign.

## Validation

- Node targeted tests: **16/16 PASS**, including new designs, preserved data/visibility and existing Portfolio/CV/PDF resource regressions.
- `scripts/qa/approved-designs.cjs`: all five designs **PASS** for picker → save → reload → public renderer → real PDF. Resume/CV download buttons also tested. Temporary user, projects, upload and sessions removed afterward.
- Legacy regression **PASS**: public Portfolio/CV opened before visiting either editor display P1/C2; anonymous public PDF exports succeed, and stored legacy settings remain unchanged. Both extra PDF files pass content, blank-page and text-bound checks. Public Portfolio screenshot inspected.
- Browser screenshots inspected: Portfolio selection cards at 1440px and 390px; mobile document width remains 390px. No page errors.
- `scripts/qa/validate-approved-designs.py`: all five PDF files contain the entered headline, long Thai summary, projects, experience, award and activity markers; no blank pages or text outside paper bounds. First-page PNGs reviewed for document layout/Thai text.
- Existing long-content fixture yields R3 2 pages, C2 2, P1 2, P2 4, P3 3. Page count follows content, not a forced one-page crop.
- `node --check` and `git diff --check`: PASS.

Not evaluated: every browser/print driver, every paper/theme combination, or production deployment. P1/P2/P3 use existing project images/descriptions; this change does not introduce multi-image project editing or fabricate case-study outcomes.
