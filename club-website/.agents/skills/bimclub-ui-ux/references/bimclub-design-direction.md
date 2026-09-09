# BimClub design direction

## Public and editorial surfaces

Use a calm editorial composition inspired by architecture studios while keeping BimClub recognizably its own product.

- First viewport: clear identity, one concise value statement, one primary action, and meaningful club imagery.
- Navigation: stable, Thai-first, one-row desktop layout and a clearly labeled mobile menu. Current location must be visible.
- Page rhythm: alternate editorial text, imagery, evidence, and action rather than repeating identical card rows.
- Section labels: numbered labels such as `01 — ACTIVITIES` are allowed when they aid wayfinding; do not use decorative eyebrows on every section.
- Imagery: prefer existing real club activities, members, instructors, projects, and achievements. Maintain one crop and treatment per content family.
- Copy: warm, direct, useful, and grounded in actual BimClub activities. Avoid corporate claims that could describe any training website.
- Primary CTA: one visual style and one label per intent. Repeat only where the user naturally needs the next action.

### Homepage pilot

Recommended order: navigation, editorial hero, BimClub introduction, featured activities, learning paths or courses, member work, credible numbers or evidence, membership action, footer. Drop any section without real content.

Do not copy Small BIM Studio's exact hero artwork, wording, grid, product modules, or page sequence. Adapt only abstract qualities: oversized Thai type, restrained monochrome imagery, numbered wayfinding, generous whitespace, and architecture-studio precision.

## Member and product flows

- Optimize task completion over visual drama.
- Keep navigation position consistent and preserve user context on back navigation.
- One primary action per screen; secondary actions must be visibly subordinate.
- Persistent labels above fields; inline errors connected with `aria-describedby`; required state expressed in text.
- Async actions show immediate progress and explicit success or recoverable error feedback.
- Design empty, loading, error, disabled, read-only, and permission-denied states when relevant.
- Preserve authentication, session, upload, and API behavior unless separately authorized.

## Admin surfaces

- Favor scan density, grouping, and clear status over large marketing sections.
- Cards are reserved for real hierarchy; otherwise use whitespace and restrained dividers.
- Tables use readable row rhythm, sticky headers when long, right-aligned numbers, and visible sorting state.
- Destructive actions are separated, clearly named, confirmed, and never triggered by styling-only work.
- Status never relies on red/green color alone.

## Token starting point

These are planning defaults, not permission to edit source. Confirm contrast and adjust against the actual rendered UI before adoption.

| Role | Suggested value | Intended use |
| --- | --- | --- |
| Brand accent | `#A3131A` | Primary action, active state, focus accent |
| Brand dark | `#711015` | Pressed state and high-contrast brand text |
| Ink | `#171717` | Primary text and dark surfaces |
| Body | `#525252` | Supporting text on light surfaces |
| Canvas | `#F7F7F5` | Main page background |
| Surface | `#FFFFFF` | Raised content only |
| Border | `#E6E5E1` | Inputs, tables, and necessary dividers |

Typography starting point: `IBM Plex Sans Thai` for Thai and `Onest` for Latin/numerals, both already referenced by the current UI. Consolidate duplicated font imports before adding another family.

Spacing should follow an 8px base rhythm with optical adjustments where Thai text requires them. Default radii are 8–12px; motion is subtle CSS-only unless a concrete interaction requires more.

## Responsive and accessibility gate

- Inspect at representative 390px, 768px, 1024px, and 1440px widths.
- Check approximately 700px and 800px laptop heights for first-viewport clipping.
- No unintended horizontal scrolling or truncated Thai copy.
- Keyboard order follows the visible order; menus, dropdowns, dialogs, and carousels remain operable without a pointer.
- Body/supporting text targets at least 4.5:1 contrast; large text and essential UI graphics target at least 3:1.
- Verify 200% text enlargement and reduced-motion behavior.
- Record measurements rather than making unverified compliance claims.
