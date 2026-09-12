# UI/UX System Improvement Plan

## Existing architecture read

- Node.js/CommonJS + Express 5 API, MySQL via `mysql2`, session auth via `express-session` and MySQL store.
- Static HTML/CSS/vanilla JavaScript in `public/`; feature routes live in `src/routes/`.
- Existing domains include honors/alumni, achievements, activities, posts, portfolios/CV and a legacy timeline page.
- Shared visual tokens are in `public/css/global.css`; navbar and footer are custom elements.
- Existing portfolio editor already uses a three-column navigation/form/live-preview pattern and should be refined rather than replaced.

## Implementation order

1. Add the separate Personnel domain and year/role model, then expose it inside About with a legacy redirect.
2. Split official Club Highlights from member works at the content/API boundary.
3. Make regular Alumni cards a stable responsive carousel with View All.
4. Remove emoji UI glyphs and use the existing text/icon treatment.
5. Refine Portfolio Builder states, labels and responsive behavior while keeping the recommended Sidebar + Form + Live Preview pattern.
6. Consolidate timeline presentation and audit keyboard, contrast, loading and error states.
7. Run API tests plus browser checks at desktop, tablet and mobile widths.

## Guardrails

Preserve existing routes, auth, permissions and database behavior. Add only additive migrations; do not inspect secrets or production data. No new framework, dependency, remote script or icon package is required.

## Portfolio recommendation

Keep **Sidebar + Form + Live Preview**. The current editor already has section navigation, progress, a focused form and a preview iframe. This best answers “อยู่ขั้นตอนไหน / กำลังแก้อะไร / ผลลัพธ์เป็นอย่างไร” without forcing a long linear wizard. Improve section status, sticky save/publish actions, mobile panel switching, and explicit loading/error/empty states first.
