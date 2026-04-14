# WP-DS6-UNIFICATION — Full site visual unification
## Priority 1 — Session 284

## THE PROBLEM

The Group Portal (group-portal) and new Tenant Portal fin package look professional, modern, and unified. Legacy pages — HQ Stock, Daily Trading, Procurement, Stock Control tabs — still carry old design remnants. The contrast is jarring and immediately visible when switching between tabs.

## WHAT THE OWNER SEES

**Group Portal:** clean white surfaces, consistent card widths, proper typography hierarchy, full-width pinned layout, SVG icons, green brand palette, breathing room.

**Legacy pages (HQ Stock, Trading Performance, Stock Control tabs):** beige/cream backgrounds, different font stack, hard-to-read number fonts, bare layout, content not pinned to sidebar/scrollbar boundaries, empty strips on sides when zoomed out, non-SVG icons, old tab styling.

## SCREENSHOTS PROVIDED AT SESSION START

Owner will provide comparison screenshots. Read them before any code. The Group Portal is the design reference — not a mockup, the actual live component.

## THE SPECIFIC ISSUES

1. **Background colour:** legacy pages use a cream/beige tone. New pages use white (`--color-background-primary`). Every legacy page needs the background corrected.
2. **Layout pinning:** content area must stretch edge to edge between the left sidebar and right scrollbar. Legacy pages have dead white/grey strips on both sides when the browser is at normal zoom. Group Portal does not have this.
3. **Typography:** number fonts differ between old and new. Standardise to the DS6 font stack everywhere — Anthropic Sans or the system font defined in the design tokens.
4. **Icons:** legacy pages use raster/emoji icons. New pages use SVG. Replace all non-SVG icons in legacy components.
5. **Card styling:** legacy cards have different border radius, border weight, and shadow from DS6 cards. Unify to `var(--border-radius-lg)`, 0.5px border, no shadow.
6. **Tab styling:** legacy tabs (OVERVIEW / ITEMS / MOVEMENTS etc) use a different tab component from the fin package tabs. Unify the tab component or apply consistent styles.
7. **Colour palette:** legacy pages use hardcoded hex colours. New pages use CSS variables. Audit and replace all hardcoded colours with CSS variables.

## APPROACH

Read the Group Portal component first. Identify its CSS variables, layout wrapper, card component, and typography classes. Then read each legacy component and apply the same system. Do not redesign — replicate the Group Portal's approach exactly.

## FILES LIKELY IN SCOPE

- StockControl.js (4,759 lines — PROTECTED, read before any change)
- HQProduction.js (8,949 lines — PROTECTED)
- AdminQRCodes.js
- Shop.js
- Any component with a background that is not `var(--color-background-primary)` or transparent.

## SUCCESS CRITERIA

A user switching between Group Portal and any other page in the system cannot tell the difference in visual quality. Same fonts, same spacing, same card style, same background, same layout pinning.

---
*WP-DS6-UNIFICATION-BRIEF · Created Session 283 for Session 284 kickoff*
