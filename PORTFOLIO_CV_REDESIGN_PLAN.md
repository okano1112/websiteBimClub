# BimClub Portfolio & CV Redesign — Agent Execution Plan

## Purpose

This document is the implementation brief for a future AI agent. The agent must redesign the existing Portfolio experience and add a separate CV experience while preserving all unrelated BimClub functionality.

This plan is intentionally separate from application source code. Read it together with `club-website/AGENTS.md` before making any implementation change.

## Non-negotiable scope

The requested work is limited to:

1. Improving the Portfolio data-entry UI.
2. Improving the Portfolio public/showcase UI.
3. Adding real PDF export for Portfolio and CV.
4. Adding multiple Portfolio and CV templates.
5. Adding document-size and orientation choices.
6. Adding configurable theme colors, logos, and institutional footer branding.
7. Adding a separate CV document flow/page that can reuse the user's saved profile data.

Do not modify unrelated pages, authentication, courses, activities, achievements, feed, admin features, database tables unrelated to Portfolio/CV, or global navigation styling unless a directly required integration cannot work otherwise.

The current working tree contains an unrelated user change in:

`club-website/public/css/navbar.css`

Do not overwrite, stage, revert, or reformat that file.

## Existing implementation to inspect first

Before coding, inspect these files and preserve their existing API contracts unless a migration is explicitly planned:

- `club-website/public/page/portfolio.html`
- `club-website/public/page/portfolio-public.html`
- `club-website/public/css/portfolio.css`
- `club-website/public/css/portfolio-public.css`
- `club-website/public/js/portfolio.js`
- `club-website/src/routes/portfolios.js`
- `club-website/database/phase3-portfolio-projects.sql`
- `club-website/database/phase2-profile-migration.sql`
- `club-website/package.json`

The current system already has Portfolio data for basic information, skills, work experience, education, projects, certificates, public visibility, and a public link. Reuse this data where possible; do not create duplicate fields or duplicate routes.

## Product structure

### Entry point

Add a clear document choice before editing:

- `Portfolio` — visual work showcase and professional profile.
- `CV` — concise employment/education document.

The two documents may share profile data, but their templates, layout rules, and export settings must remain separate.

### Portfolio editor

Replace the current long, hard-to-understand form flow with a guided editor:

- Left: section navigation.
- Center: the active form.
- Right: live preview on desktop.
- Mobile: section navigation becomes a compact step selector and preview becomes a separate tab/panel.

Each section must show one of these states:

- Not started.
- In progress.
- Complete.
- Hidden from output.

Every section must exist in the editor but may be left empty or hidden by the user. Do not force users to fill optional sections.

Use plain-language helper text and examples so users understand what each section is for.

### Portfolio sections

Support the following section model. Existing database fields should be mapped first; new fields should only be added when necessary:

1. Personal information and contact.
2. Profile photo.
3. Name, headline, and target role.
4. About me / profile summary.
5. Career objective.
6. Skills and software.
7. Work experience.
8. Internship/co-op experience.
9. Projects and work samples.
10. Education.
11. Certificates and credentials.
12. Awards and achievements.
13. Activities and leadership.
14. Languages.
15. Research/publications.
16. Volunteer work.
17. References.
18. Contact links and external portfolio links.

If a section is not yet persisted by the current schema, design the UI and data model carefully before adding a migration. Keep the migration additive and reversible.

### CV editor

Create a separate CV page/flow. It must not simply render the Portfolio page with a different title.

The CV editor should support:

- Profile/header.
- Professional summary or objective.
- Education.
- Work/internship experience.
- Projects.
- Skills.
- Certificates.
- Awards.
- Activities/leadership.
- Languages.
- Links/contact.

Allow the user to choose which optional sections appear in the CV. Use standard English/Thai section labels in the document output where appropriate.

## Template system

Use a shared structured data model and a template renderer. Do not hard-code separate copies of every field for every template.

### Portfolio templates

Implement the following initial template identities:

1. `maroon-editorial`
   - Main visual template inspired by the supplied reference image.
   - Refined, modern, premium look.
   - Strong cover page, project showcase pages, clear section hierarchy.

2. `navy-professional`
   - Professional layout using navy as the dominant visual color.
   - Suitable for engineering, BIM, and technical applicants.

3. `modern-grid`
   - Project cards and grid-based work showcase.
   - Suitable for users with multiple projects.

4. `minimal-a4`
   - White space, restrained color, highly readable.
   - Suitable for general job applications.

5. `a3-landscape-showcase`
   - Visual presentation layout for BIM, architecture, engineering, and design portfolios.

6. `institutional-bimclub`
   - BimClub/SOE institutional footer treatment enabled by default.

### CV templates

Implement these initial identities:

1. `cv-a4-standard` — A4 portrait, professional default.
2. `cv-a4-ats` — A4 portrait, single-column, standard headings, text-first.
3. `cv-letter-standard` — Letter portrait for US-oriented applications.
4. `cv-a4-landscape-creative` — visual/creative CV only.
5. `cv-a3-presentation` — presentation-style CV, not the recommended ATS/default format.

Do not imply that A3 or multi-column layouts are ATS-safe. The UI must clearly label the ATS template as the safest choice for online job systems.

## Page sizes and orientations

### Portfolio options

- A4 portrait.
- A4 landscape.
- A3 portrait.
- A3 landscape.
- Letter portrait.
- Custom size only if it can be implemented without breaking export validation.

### CV options

- A4 portrait — default and recommended for Thailand/international applications.
- Letter portrait — recommended for US-oriented applications.
- A4 landscape — creative option.
- A3 portrait/landscape — presentation option, clearly marked as non-standard for ordinary CV submission.

The UI must show a short recommendation beside each option. A4 portrait must be preselected for CV; A4 portrait or A3 landscape may be offered as the Portfolio defaults depending on the selected template.

Define paper dimensions explicitly in the export renderer. Do not rely on the browser window size.

## Theme and branding controls

### Default colors

Use these as the default theme pair:

- Primary: `#012240`
- Secondary: `#AD0F0F`

The user must be able to:

- Swap primary and secondary colors.
- Pick a custom primary color.
- Pick a custom secondary color.
- Choose a background: white, cream, light gray, or dark where supported.
- Choose text color when contrast remains accessible.
- Add one optional accent color.
- Preview the theme before applying it.

Add contrast validation and a warning when a selected foreground/background combination is difficult to read.

### Institutional logos and footer

The default institutional layout is:

- SOE logo at the bottom-left.
- BimClub logo at the bottom-right.

Implement configurable branding controls:

- Show/hide SOE logo.
- Show/hide BimClub logo.
- Upload/replace each logo.
- Choose footer bar, transparent footer, top bar, cover-only, or hidden.
- Set logo size within safe limits.
- Apply branding to all pages or cover/footer only.
- Add optional institution text.

Use the supplied images only as visual references until original high-resolution logo assets are provided. For A3 export, prefer SVG or high-resolution transparent PNG assets.

## PDF export requirements

This is a hard requirement.

Do not use:

- `window.print()` as the primary export.
- Screenshot capture as the PDF source.
- A rasterized image pretending to be a document.

Implement a real PDF export endpoint that returns a PDF file directly. The preferred architecture for the current Node/Express project is a server-side headless browser renderer such as Puppeteer:

1. Load a dedicated print/export route or server-rendered document view.
2. Inject the authenticated user's selected document, template, theme, branding, and page-size settings.
3. Wait for fonts and images to load.
4. Generate a PDF buffer with explicit paper dimensions, orientation, margins, background graphics, and CSS page-break rules.
5. Return the buffer with `Content-Type: application/pdf` and a safe download filename.

The resulting PDF must contain selectable text, embedded/loaded images, predictable page breaks, and preserved colors. Use `@page`, `break-before`, `break-after`, and `break-inside` rules where needed.

Add export validation for:

- Empty optional sections.
- Long names and long project titles.
- Missing images.
- Thai and English fonts.
- A4 and A3.
- Portrait and landscape.
- One-page and multi-page documents.
- Logo visibility combinations.
- Color backgrounds.

The export UI must offer:

- Download Portfolio PDF.
- Download CV PDF.
- Open public Website.
- Copy public link.

## Website output requirements

The public Portfolio page must:

- Match the selected template/theme.
- Be responsive.
- Have readable navigation between sections.
- Exclude editor-only controls.
- Respect hidden sections.
- Preserve bilingual content behavior.
- Provide a direct Download PDF action.

The CV may have a separate public route or a document selector route, but it must remain visually distinct from the Portfolio.

## Bilingual behavior

Support Thai and English at the document level. Prefer a clear language selector in the editor and preview.

Do not silently translate user-entered content. If a user wants both languages, provide separate Thai and English fields or clearly defined bilingual fields. The export must use the selected language without mixing labels accidentally.

## Data and API rules

- Preserve existing Portfolio API response shapes where possible.
- Reuse existing `/api/portfolios` routes before adding new routes.
- If new routes are required, use names that clearly separate Portfolio and CV resources.
- Enforce authentication and ownership checks for private editor data and PDF generation.
- Do not expose private portfolio data through public routes unless `is_public` is enabled.
- Validate uploaded logos and project images by file type, size, and safe filename handling.
- Do not put raw user data, credentials, or secrets in source files or test fixtures.

## Implementation boundaries

Expected files that may be changed, after inspection and only when required:

- `club-website/public/page/portfolio.html`
- `club-website/public/page/portfolio-public.html`
- `club-website/public/page/` for a dedicated CV page
- `club-website/public/css/portfolio.css`
- `club-website/public/css/portfolio-public.css`
- `club-website/public/css/` for CV-specific styles
- `club-website/public/js/portfolio.js`
- `club-website/public/js/` for CV/template/export UI modules
- `club-website/src/routes/portfolios.js`
- `club-website/src/routes/` for narrowly scoped CV/export routes
- `club-website/src/` only for directly required renderer/service code
- `club-website/database/` only for additive, documented Portfolio/CV migrations
- `club-website/package.json` only if a PDF renderer dependency is required

Do not edit `club-website/public/css/navbar.css` because it contains an unrelated user change.

## Suggested implementation sequence

1. Inspect the existing Portfolio UI, routes, schema, and server route registration.
2. Create a clean data contract for document type, template, size, orientation, theme, branding, and section visibility.
3. Build the editor shell and section navigation without changing existing save behavior.
4. Build reusable template renderers for Portfolio and CV.
5. Add live preview and public output integration.
6. Add document-size/orientation controls.
7. Add theme, logo, and footer branding controls.
8. Add the dedicated PDF renderer and download endpoints.
9. Add the CV page and CV templates.
10. Run tests, export test documents, inspect PDF text and page count, and verify responsive behavior.
11. Review the diff carefully for unrelated changes.

## Acceptance criteria

The work is complete only when all of the following are true:

- A user can choose Portfolio or CV.
- A user can choose a template and document size/orientation.
- A user can choose colors, including `#012240` and `#AD0F0F`.
- A user can show/hide and replace SOE and BimClub branding.
- SOE defaults to bottom-left and BimClub defaults to bottom-right.
- All listed Portfolio/CV sections exist and optional sections can remain empty or hidden.
- The editor clearly communicates which section the user is editing.
- The public output reflects the selected data, template, theme, and visibility settings.
- PDF export downloads a real text-based PDF directly, without screenshot capture or `window.print()`.
- A4 portrait CV is the default recommended CV layout.
- ATS CV is visibly labelled as single-column/text-first.
- A3 layouts are labelled as presentation/visual layouts rather than ordinary ATS CVs.
- Thai and English content render correctly.
- Existing unrelated BimClub pages and the user's `navbar.css` change are untouched.
- Tests/syntax checks pass, and the final diff contains only in-scope changes.

## Verification checklist

Run the project’s existing tests and appropriate syntax checks. Then verify manually:

- Editor loads without console errors.
- Existing Portfolio data still loads and saves.
- Existing public Portfolio links still work.
- A blank Portfolio can be exported.
- A blank CV can be exported.
- Long Thai and English content does not overlap or disappear.
- A4/A3/Letter and both orientations export with correct page geometry.
- Text can be selected in the PDF.
- Logos are sharp enough at the selected size or a warning is shown.
- Hidden sections do not appear in website or PDF output.
- Public/private access rules still work.
- No unrelated files are staged.

## Git safety and rollback

Before implementation:

1. Run `git status --short`.
2. Preserve all pre-existing user changes.
3. Create a dedicated branch with a `codex/` prefix, or create a clearly named implementation commit only after confirming the diff is scoped.

During implementation:

- Stage files by explicit path, never with `git add -A`.
- Do not stage `club-website/public/css/navbar.css`.
- Keep database migrations additive and reversible.
- Make focused commits, for example:
  - `feat(portfolio): redesign editor and templates`
  - `feat(cv): add CV editor and layouts`
  - `feat(export): add direct PDF generation`

Rollback options:

- Revert the focused implementation commit(s), or
- Delete the implementation branch/worktree without touching the user's original branch.

Never use `git reset --hard` or broad checkout commands to roll back because they can destroy unrelated user work.

## Reference validation used for this plan

- Portfolio sections and structure: [UConn Portfolio Guide](https://career.uconn.edu/resources/portfolio-guide/) and [MIT Portfolio Guide](https://capd.mit.edu/getting-started-on-your-portfolio/).
- Resume/CV sections and concise professional presentation: [University of Pennsylvania Career Services](https://careerservices.upenn.edu/channels/resume/).
- ATS-safe, single-column resume guidance: [CareerOneStop Resume Formatting](https://cloudfront.careeronestop.org/JobSearch/Resumes/ResumeGuide/formatting.aspx) and [National University Career Services](https://careerservices.nu.edu/s/1843/images/gid2/editor_documents/career_servcies/english_resume_and_cover_letter_handbook-compressed.pdf?gid=2&pgid=542).
- A3 portfolio usage in visual/design contexts: [University of Sheffield Portfolio Guidance](https://sheffield.ac.uk/architecture-landscape/postgraduate/masters/apply/landscape) and [Birmingham City University Portfolio Guidance](https://www.bcu.ac.uk/student-info/how-to-apply/portfolio-guidance/architecture).
- Direct PDF generation capabilities: [Puppeteer PDF Generation](https://pptr.dev/guides/pdf-generation) and [Puppeteer PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions).

