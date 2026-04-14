# WP-DS6-UNIFICATION — Full site visual unification
## Priority 1 — Session 284

## ROOT CAUSE — READ THIS BEFORE ANY CODE (diagnosed Session 284)

Previous DS6 and Unification attempts failed because they patched component
colours without addressing three structural problems. Fix these first or the
visual regression will return.

### PROBLEM 1 — Two token files, same export name `T`
`src/theme.js`          → exports T with T.ink[900], T.pageBg, T.accent.dark, T.font.ui
`src/styles/tokens.js`  → exports T with T.ink900, T.bg, T.surface, T.accent, T.font

Two completely different object shapes, same variable name. GroupPortal imports
from `src/styles/tokens.js`. Legacy components import from `src/theme.js` or
use hardcoded hex entirely. Token patches applied to the wrong file have zero
effect on components importing the other one.

CANONICAL FILE: `src/styles/tokens.js` — use this everywhere.
LEGACY FILE:    `src/theme.js` — do not add new imports from this file.
                Migration to tokens.js is Step 4 below (after layout is fixed).

### PROBLEM 2 — AppShell.css hardcodes cream background
`src/components/AppShell.css` line 4:  background: #faf9f6;  ← warm cream
`src/components/AppShell.css` line 10: background: #faf9f6;  ← same

This overrides everything. Every legacy component that doesn't set its own
background inherits cream from the shell. Changing token values has no effect
until this CSS is corrected. Fix: set both to `#ffffff`.

### PROBLEM 3 — GroupPortal's quality is architectural, not cosmetic
GroupPortal renders inside AppShell's content div with its own internal flex
layout: `display:flex, flexDirection:row` with its own sidebar flush-left
inside a `maxWidth: T.container.wide` container. This is why it pins edge to
edge and looks structured. Legacy Tenant Portal tabs have no equivalent wrapper
— they render into whatever TenantPortal gives them, with inconsistent inner
max-widths and padding that creates dead strips at the sides.

The fix is a shared `<TenantPageFrame>` wrapper component — not individual
color patches.

---

## CORRECT EXECUTION ORDER — SESSION 284

**Step 1 — Fix AppShell.css (2 lines, instant platform-wide impact)**
In `src/components/AppShell.css`:
- `.app-shell`         → change `background: #faf9f6` to `background: #ffffff`
- `.app-shell-content` → change `background: #faf9f6` to `background: #ffffff`
Read the file first (LL-185). Verify line numbers before str_replace.

**Step 2 — Create `src/components/shared/TenantPageFrame.js`**
A wrapper component all legacy Tenant Portal tabs will use. Pattern:
```jsx
import { T } from "../../styles/tokens";
export default function TenantPageFrame({ children, maxWidth }) {
  return (
    <div style={{
      width: "100%",
      maxWidth: maxWidth || T.container.default,
      background: T.surface,           // #ffffff
      fontFamily: T.font,              // Inter
      display: "flex",
      flexDirection: "column",
      gap: T.page.sectionGap,
    }}>
      {children}
    
  );
}
```
This is the primitive. Every legacy tab wraps its top-level return in this.

**Step 3 — Apply TenantPageFrame to the 4 highest-visibility legacy tabs**
Targets (read each file fully before touching — LL-185):
- Daily Trading tab component (visible in screenshot: Trading Performance)
- Cold Chain (HQ cold chain tab)
- HACCP tab
- POS Till tab
Wrap the outermost returned `<div>` in `<TenantPageFrame>` and import T from
`../../styles/tokens`. Do one file at a time. Test on localhost between each.

**Step 4 — Token import audit (after Steps 1–3 are verified working)**
```bash
grep -rn "from.*theme" src/ --include="*.js" | grep -v node_modules
grep -rn "from.*theme" src/ --include="*.js" | wc -l
```
For each file that still imports from `src/theme.js`: migrate its T usages to
the equivalent token in `src/styles/tokens.js`. The mapping is:
| theme.js         | tokens.js         |
|------------------|-------------------|
| T.ink[900]       | T.ink900          |
| T.ink[700]       | T.ink700          |
| T.ink[500]       | T.ink600          |
| T.ink[150]       | T.border          |
| T.ink[75]        | T.neutralLight    |
| T.pageBg         | T.bg              |
| T.accent.dark    | T.accentText      |
| T.accent.lit     | T.accentLight     |
| T.radius.lg      | T.radius.lg (px)  |
| T.font.ui        | T.font            |
| T.type.metricLg  | T.text["3xl"]     |
Do NOT delete src/theme.js yet — confirm zero consumers first.

**Step 5 — Typography pass**
After token migration, grep for any remaining non-Inter font references:
```bash
grep -rn "Cormorant\|Jost\|DM Mono\|Outfit" src/ --include="*.js"
```
Replace all with `T.font` from `src/styles/tokens.js`.

**Step 6 — Icon audit**
```bash
grep -rn "emoji\|🌿\|📦\|⚠️\|✅\|❌" src/ --include="*.js" | grep -v node_modules
```
Replace with Lucide React equivalents. strokeWidth={1.5}, fill="none".

---

## SUCCESS CRITERIA (unchanged from original brief)
A user switching between Group Portal and any other page cannot detect a visual
quality difference. Same white surface, same Inter font, same card style, same
layout pinning behaviour.

---

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
