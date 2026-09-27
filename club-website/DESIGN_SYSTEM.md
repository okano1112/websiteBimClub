# BimClub UI Design System

## Direction

Modern, minimal, friendly and editorial: a living BIM studio noticeboard for Thai students, members and alumni. Content leads; burgundy is an accent, not a full-page fill.

## Tokens

| Role | Value |
|---|---|
| Brand burgundy | `#AD0F0F` |
| Brand navy | `#012240` |
| Surface | `#FFFFFF` |
| Canvas | `#F8FAFC` |
| Text | `#0F172A` |
| Muted text | `#475569` |
| Border | `#E2E8F0` |
| Spacing | 8px base rhythm (`8, 12, 16, 24, 32, 48, 64, 80`) |
| Radius | 6px controls, 12px cards, 18px feature surfaces |
| Body type | Noto Sans Thai, minimum 16px |

## Patterns

- Use semantic HTML, visible `:focus-visible`, 44px touch targets, and text alternatives for non-text status.
- Use intrinsic image dimensions/aspect ratios to avoid layout shift.
- Use one card depth hierarchy; avoid decorative gradients, nested card grids and emoji UI icons.
- Use responsive single-column flow below 640px and preserve readable Thai line lengths.
- Motion is limited to feedback and hierarchy and must respect `prefers-reduced-motion`.

## Content taxonomy

- **Club Highlights**: official, admin-managed achievements with stronger visual hierarchy.
- **Community Member Works**: member-owned projects and submissions, visually distinct from official achievements.
- **Current Team**: active members for a specific year; never mix with Alumni/Hall of Fame.
# Home visual implementation — 2026-09-12

Implemented in `public/css/home-editorial.css`: a centered Thai hero, white navbar, gray canvas (#f5f5f7), ink (#1d1d1f), muted copy (#626267), burgundy accent (#a3131a), fluid 32–80px hero typography, pill primary actions, section introductions and closing membership CTA. Existing carousel/feed/info cards remain intact. Info grid container now fits 320px without overflow. Existing fonts reused; no new dependencies. This is an implemented Home composition, not a claim that all other pages have been redesigned.

Evidence: Chromium screenshots in `output/playwright/home-editorial-desktop.png` and `home-editorial-mobile.png`; overflow measured at 320/390/768/1024/1440px, all equal viewport width, pageerror list empty in the measured run. Full a11y/cross-browser compliance is not claimed.

## Approved document layouts — 2026-09-18

User choice: R3 Resume (two columns), C2 CV (dates left, narrative right), and P1/P2/P3 Portfolio selected from illustrated cards. New designs use the existing Thai/Latin fonts and saved primary/secondary/background colors. White space, thin rules and restrained type replace institutional cover banners; no new font or UI dependency.

- R3: 1:2.15 sidebar/content columns, 30px gap, profile heading 30px.
- C2: 100px date column and flexible history column; aligned chronological entries.
- P1: two-column project grid; P2: large full-width project images and 42px name; P3: numbered case studies with image and supplied description/role.
- Actual images use contain sizing to preserve technical drawings. Missing images are omitted. Case studies use existing project descriptions; no invented outcomes or separate project-media schema.
- Document picker: native buttons, visible focus, aria-pressed; responsive one-column cards at narrow widths. Thumbnails render the same templates with clearly fictional data; they show the first page, not a promise of a one-page document.
- Resume/CV share the existing CV editor/settings slot. Portfolio has its own settings slot. Legacy saved template IDs resolve to the approved defaults (P1/C2) in the editor, public page and PDF, without requiring a new save. Explicit P1/P2/P3/R3/C2 choices and stored content remain intact; edits to content still require saving.
- Legacy institutional branding controls are hidden for the approved Portfolio designs, which focus on the applicant and projects.

## About history — 2026-09-18

History uses one ordered list with a 170px date column, 48px gutter, thin neutral rule and small burgundy markers. At 600px and below, dates move above each entry. Headings scale 32–48px; descriptions remain 16px with 1.9 line height. No cards, gradients or scroll-dependent visibility in this section. Existing dates are retained pending factual verification; this styling change does not authenticate club history. Component clarity findings are recorded in `docs/UI-COMPONENT-CLARITY-AUDIT.md`.
