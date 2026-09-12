---
name: ui-ux-pro-max
description: Apply evidence-led UI/UX decisions for BimClub web pages, flows, components, accessibility, responsive layout, typography, color, motion, and visual QA. Use when designing, reviewing, or improving an interface. Do not use for backend-only work.
---

# UI/UX Pro Max — BimClub adapter

Read and follow `.agents/skills/bimclub-ui-ux/SKILL.md` first. This adapter distills the upstream UI/UX Pro Max priority model without copying its CLI, Python scripts, data catalogs, or installer.

Prioritize work in this order:

1. Accessibility: semantic HTML, labels, focus-visible, keyboard order, alt text, contrast, reduced motion, text scaling.
2. Touch and interaction: 44px targets, immediate loading feedback, clear active/disabled/error states.
3. Performance: intrinsic media dimensions, lazy below-fold assets, minimal JavaScript, stable layout, no unnecessary animation.
4. Style consistency: one token system, one icon family, one radius/elevation language, no emoji as structural icons.
5. Responsive layout: mobile-first reflow, no horizontal overflow, predictable navigation and back behavior.
6. Typography, color, forms, navigation, and charts: use semantic tokens, readable Thai copy, field-level errors, and non-color-only status.

For each design decision, state the user problem solved, evidence or assumption, tradeoff, and confidence. For a new page or system-wide redesign, produce or update `DESIGN_SYSTEM.md` with actual values. For a focused concern, review only the relevant surface and state rules.

Security boundary: do not execute `search.py`, `design_system.py`, `npx`, `pip`, or any upstream script in this adapter. Do not persist unverified external output, include private project data in queries, read secrets, or install dependencies. Use existing local files and approved browser/read-only checks only.

Shared BimClub direction and validation are in `.agents/skills/bimclub-ui-ux/references/bimclub-design-direction.md` and `.agents/skills/bimclub-ui-ux/references/security-and-validation.md`.
