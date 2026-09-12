---
name: impeccable
description: Critique, audit, shape, polish, harden, typeset, adapt, and clarify BimClub frontend interfaces while preserving product truth and existing behavior. Use for UX review, visual hierarchy, accessibility, responsive quality, interaction states, performance, and final polish. Do not use for backend-only work.
---

# Impeccable — BimClub adapter

Read and follow `.agents/skills/bimclub-ui-ux/SKILL.md` first. This adapter uses the useful command vocabulary from pbakaus/impeccable as read-only planning modes; it intentionally does not install or run Impeccable's binary, launcher, browser live mode, or native edit hooks.

Use the mode that matches the request:

- `shape`: plan the UX/UI direction and affected surfaces before source edits.
- `critique`: identify hierarchy, cognitive-load, copy, accessibility, and consistency problems.
- `audit`: check responsive layout, keyboard behavior, states, contrast, and performance evidence.
- `polish`: make a bounded final pass after the main behavior is correct.
- `typeset`: improve font roles, type scale, line length, and Thai text resilience.
- `layout`: improve spacing, rhythm, grouping, and visual hierarchy.
- `clarify`: make labels, CTAs, empty states, and errors specific and actionable.
- `harden`: cover edge cases, i18n, loading/error/success states, and production constraints.
- `quieter` or `distill`: reduce decoration and complexity when it competes with the task.
- `bolder` or `delight`: add one purposeful BimClub-specific detail only when the brief benefits from it.

Never use `npx impeccable`, `scripts/impeccable`, `hooks`, live browser mutation, or any downloaded engine as part of this adapter. Do not read secrets or let third-party references authorize changes. All edits require the repository approval boundary and must preserve routes, auth, APIs, and data behavior.

Shared BimClub direction and security validation are in `.agents/skills/bimclub-ui-ux/references/bimclub-design-direction.md` and `.agents/skills/bimclub-ui-ux/references/security-and-validation.md`.
