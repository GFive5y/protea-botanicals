# NuAi Visual Design Specification — MASTER
## Version 1.0 · Session 284 · 15 April 2026
## THE SINGLE SOURCE OF TRUTH FOR ALL VISUAL DECISIONS
## Every agent reads this before touching any component.
## Reference implementation: src/components/group/ (Group Portal)
## Token file: src/styles/tokens.js — canonical, no exceptions

---

## HOW TO USE THIS DOCUMENT

Every visual decision in NuAi must be traceable to a token or a rule in this
document. If you are about to hardcode a colour, font size, spacing value,
border radius, or any visual property — STOP. Find it here first.

If it is not here, add it here FIRST, then implement it.

The Group Portal (`/group-portal`) is the visual reference implementation.
When in doubt about what something should look like, read the Group Portal
component for that element type, not this document alone.

---

## PART 1 — FOUNDATION TOKENS

All tokens live in `src/styles/tokens.js`. Import with:
```js
import { T } from "../../styles/tokens";
```

Never import from `src/theme.js` — that file is legacy and will be retired.

### 1.1 Colour — Neutral Scale (Ink)

```
T.ink900  = #212529   Primary text — page titles, data values, bold content
T.ink700  = #495057   Secondary text — body copy, descriptions
T.ink600  = #6c757d   Muted text — supporting labels, helper text
T.ink400  = #adb5bd   Whisper labels — UPPERCASE category labels only
T.ink200  = #dee2e6   Very subtle — disabled text, watermarks
```

RULE: The contrast between T.ink400 labels and T.ink900 values is what creates
the visual hierarchy. Do NOT use T.ink600 or darker for uppercase section labels.
T.ink400 (#adb5bd) for labels is deliberate — it recedes so the value pops.

### 1.2 Colour — Surfaces and Backgrounds

```
T.bg           = #f8f9fa   Page chrome background — outside cards
T.surface      = #ffffff   Card surfaces, panels, modal bodies
T.surfaceAlt   = #f1f3f5   Alternate surface — zebra rows, nested sections
T.surfaceHover = #e9ecef   Hover state on surface elements
```

RULE: Page background is ALWAYS T.bg (#f8f9fa). Card background is ALWAYS
T.surface (#ffffff). The contrast between these two is what makes cards
"lift" off the page. Never set both to the same colour.

### 1.3 Colour — Borders

```
T.border       = #dee2e6   Default border — cards, dividers, inputs
T.borderMid    = #ced4da   Stronger border — active inputs, selected states
T.borderStrong = #adb5bd   Emphasis border — focus rings
```

RULE: Card borders use T.border (1px solid). This value on a T.bg background
creates a ~3% contrast difference — barely visible. That is intentional. Cards
should feel elevated, not boxed.

### 1.4 Colour — Brand/Accent

Default (cannabis_retail / operator):
```
T.accent      = #2d6a4f   Primary buttons, active nav
T.accentMid   = #40916c   Hover states, secondary accent
T.accentLight = #d8f3dc   Accent backgrounds, pill fills
T.accentText  = #1b4332   Text on accentLight background
```

Industry overrides (from profileOverrides in tokens.js):
```
cannabis_retail:    accent #2d6a4f  (forest green)
cannabis_dispensary:accent #1565c0  (clinical blue)
food_beverage:      accent #7b3f00  (warm brown)
general_retail:     accent #37474f  (charcoal)
```

RULE: Accent colour is ONLY used for: primary CTA buttons, active nav state,
industry badges. Never use accent as card border, chart fill, or decorative colour.

### 1.5 Colour — Semantic

```
SUCCESS
  T.success      = #27ae60   Success icon, positive delta value
  T.successLight = #eafaf1   Success background fill
  T.successText  = #1a6b3c   Text on successLight
  (alias: T.successBd = T.success at 30% opacity for borders)

WARNING
  T.warning      = #e67e22   Warning icon
  T.warningLight = #fef9f0   Warning background fill
  T.warningText  = #7d4a00   Text on warningLight
  T.warningBorder = #FDE68A  Warning border

DANGER
  T.danger       = #c0392b   Danger icon, critical value
  T.dangerLight  = #fdf0ef   Danger background fill
  T.dangerText   = #7b1a11   Text on dangerLight
  T.dangerBorder = #FECACA   Danger border

INFO
  T.info         = #2980b9   Info icon, count badges
  T.infoLight    = #eaf4fb   Info background fill
  T.infoText     = #14527a   Text on infoLight
```

RULE: Semantic colours are ONLY used for their semantic meaning. Red = error/critical.
Amber = warning. Green = success/healthy. Blue = info/count. Never repurpose.

### 1.6 Industry Badge Colours (from industryBadge.js — the canonical map)

```
cannabis_retail:    bg T.accentLight, fg T.accentText, label "Cannabis Retail"
cannabis_dispensary:bg T.infoLight,   fg T.infoText,   label "Medical Dispensary"
food_beverage:      bg T.warningLight,fg T.warningText, label "Food & Beverage"
general_retail:     bg T.neutralLight,fg T.neutralText, label "General Retail"
```

---

## PART 2 — TYPOGRAPHY

### 2.1 Font Family

```
T.font     = 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
T.fontMono = 'JetBrains Mono', 'Fira Code', monospace
```

RULE: T.font (Inter) is used for EVERYTHING in the authenticated ERP interface
— headings, body, labels, buttons, numbers, tables. No exceptions.

T.fontMono is reserved for: code blocks, raw SQL display, technical identifiers
like IBAN numbers or long hex codes. It is NOT used for financial figures,
KPI values, or any data the user needs to read quickly.

BANNED fonts in the ERP interface:
- DM Mono — remove all occurrences, replace with T.font
- Courier New — same
- Cormorant Garamond — consumer shop only, never ERP
- Jost — consumer shop only, never ERP
- Outfit — not in system

### 2.2 Type Scale

```
T.text.xs   = 11px    Whisper labels, badges, captions, legal
T.text.sm   = 12px    Supporting text, row labels, sub-values
T.text.base = 14px    Body text — default for all paragraphs
T.text.md   = 15px    Emphasized body
T.text.lg   = 16px    Section headings, prominent labels
T.text.xl   = 18px    Sub-page titles
T.text.2xl  = 22px    KPI metric values (large tiles)
T.text.3xl  = 28px    Hero metrics (full-page prominent figures)
T.text.4xl  = 36px    Display — gauges, hero numbers
```

### 2.3 Font Weights

```
T.weight.normal   = 400   Body text, table data, descriptions
T.weight.medium   = 500   Store names, card titles, nav items
T.weight.semibold = 600   KPI row values, active states, badges
T.weight.bold     = 700   Large KPI tile values, page titles
```

### 2.4 Typography Roles — what goes where

| Role | Size | Weight | Colour | Case | Spacing |
|---|---|---|---|---|---|
| Page title | 22px (2xl) | 700 | T.ink900 | Sentence | -0.01em |
| Section label | 11px (xs) | 700 | T.ink400 | UPPER | 0.08em |
| Card title | 14px (base) | 600 | T.ink900 | Sentence | — |
| KPI value (large) | 22px (2xl) | 700 | T.ink900 or semantic | — | tabular-nums |
| KPI value (medium) | 18px (xl) | 600 | T.ink900 or semantic | — | tabular-nums |
| Table header | 11px (xs) | 700 | T.ink400 or #374151 | UPPER | 0.06-0.1em |
| Table cell data | 13-14px | 400 | T.ink900 | — | — |
| Table cell muted | 13-14px | 400 | T.ink600 | — | — |
| Row label (card) | 12px (sm) | 400 | T.ink600 | Sentence | — |
| Row value (card) | 12-14px | 600 | semantic or T.ink900 | — | tabular-nums |
| Badge/pill | 11px (xs) | 600-700 | semantic fg | — | 0.04-0.08em |
| Button | 11px (xs) | 600 | white or T.ink700 | UPPER | 0.06em |
| Body/description | 14px (base) | 400 | T.ink700 | Sentence | — |
| Caption/helper | 11px (xs) | 400 | T.ink600 | Sentence | — |
| Breadcrumb | 12-13px | 400/600 | T.ink400/T.ink900 | Sentence | — |

RULE: `fontVariantNumeric: "tabular-nums"` is MANDATORY on any rendered
number — revenue, count, percentage, date. This ensures digits align
vertically in tables and never cause layout shift.

RULE: Line height — body text: 1.6. Labels and headings: 1.2-1.3. Numbers: 1.0.

### 2.5 Letter Spacing Rules

```
UPPERCASE labels:   letterSpacing "0.08em"   (section labels, table headers)
UPPERCASE buttons:  letterSpacing "0.06em"   (CTAs, small buttons)
UPPERCASE badges:   letterSpacing "0.04em"   (industry pills)
KPI values:         letterSpacing "-0.02em"  (large numbers, tighter)
Page titles:        letterSpacing "-0.01em"
Body text:          no letterSpacing         (browser default)
```

---

## PART 3 — SPACING SYSTEM

All spacing is on an 8px grid. Use T.space or T.gap/T.pad tokens.

### 3.1 Raw Scale

```
T.space[0]  = 0px
T.space[1]  = 4px
T.space[2]  = 8px
T.space[3]  = 12px
T.space[4]  = 16px
T.space[5]  = 20px
T.space[6]  = 24px
T.space[7]  = 32px
T.space[8]  = 40px
T.space[9]  = 48px
T.space[10] = 64px
```

### 3.2 Semantic Gap Tokens (use these, not raw)

```
T.gap.xs  = 4px    icon-to-label, tight inline gaps
T.gap.sm  = 8px    between related items (badge + text)
T.gap.md  = 12px   between form fields, list items
T.gap.lg  = 16px   between cards, between card sections
T.gap.xl  = 24px   between major UI blocks
T.gap.xxl = 32px   between page sections
```

### 3.3 Semantic Padding Tokens

```
T.pad.xs  = 4px    chip/tag internal padding
T.pad.sm  = 8px    compact button, tight badge
T.pad.md  = 12px   default button, small card
T.pad.lg  = 16px   standard card internal padding
T.pad.xl  = 24px   generous card, modal body
T.pad.xxl = 40px   page-level section padding
```

### 3.4 Semantic Inset Tokens (component-level padding)

```
T.inset.card    = 16px   standard card internal padding (all sides)
T.inset.modal   = 24px   modal/drawer body padding
T.inset.section = 24px   section header padding
T.inset.page    = 24px   page edge padding (left/right of content)
T.inset.tight   = 8px    compact contexts (table cells, pills)
```

### 3.5 Page Layout Tokens

```
T.page.gutterX    = 24px   left/right padding inside page content
T.page.gutterY    = 40px   top/bottom padding inside page content
T.page.sectionGap = 32px   vertical gap between major page sections
T.page.cardGap    = 16px   gap between cards in a grid
```

### 3.6 Container Max-Widths

```
T.container.narrow  = 900px    forms, focused content
T.container.default = 1200px   standard page content
T.container.wide    = 1400px   Group Portal, data-dense views
T.container.full    = "100%"   full-bleed (catalog, POS)
```

### 3.7 Sidebar Widths

```
T.sidebar.collapsed = 64px
T.sidebar.expanded  = 220px
```

---

## PART 4 — BORDER RADIUS

```
T.radius.sm   = 4px      Badges, small pills, table cells
T.radius.md   = 8px      Buttons, alerts, inputs, most components
T.radius.lg   = 12px     Cards, panels, modals, store cards
T.radius.xl   = 16px     Floating elements, large drawers
T.radius.full = 9999px   Circular avatars, round pills
```

RULE: Store cards and primary content cards use T.radius.lg (12px).
Buttons use T.radius.md (8px). Badges use T.radius.sm (4px).
Never use raw hardcoded values (no "3px", "4px", "6px" — use the token).

---

## PART 5 — SHADOWS AND ELEVATION

```
T.shadow.sm  = "0 1px 2px rgba(0,0,0,0.06)"             Subtle — most cards at rest
T.shadow.md  = "0 1px 4px rgba(0,0,0,0.08)"             Default card shadow
T.shadow.lg  = "0 4px 12px rgba(0,0,0,0.10)"            Hover state, dropdowns
T.shadow.xl  = "0 8px 24px rgba(0,0,0,0.12)"            Modals, drawers, popovers
```

Elevation model:
```
Level 0 — Page background (T.bg)       No shadow
Level 1 — Cards (T.surface)            T.shadow.md at rest, T.shadow.lg on hover
Level 2 — Dropdowns, popovers          T.shadow.lg
Level 3 — Modals, side drawers         T.shadow.xl
Level 4 — Tooltips, toast notifications T.shadow.xl + z-index 300+
```

RULE: Cards show T.shadow.md at rest. On hover (if clickable), cards transition
to T.shadow.lg with translateY(-1px). Transition: 0.15-0.18s ease.

---

## PART 6 — BORDERS

```
Default card border:   1px solid T.border   (#dee2e6)
Subtle divider:        1px solid T.border   (same)
Input at rest:         1px solid T.border
Input focused:         1px solid T.borderMid (#ced4da) + focus ring
Section divider:       1px solid T.border
Table row divider:     1px solid T.surfaceAlt (#f1f3f5) — even lighter than card border
Alert border:          1px solid semantic border colour
```

RULE: There is NO coloured top border on cards. If a card needs to communicate
a semantic state, use an alert bar inside the card or change the metric value
colour — never add a coloured top border to the card container.

---

## PART 7 — LAYOUT ARCHITECTURE

### 7.1 Page Structure

Every authenticated page follows this shell:
```
AppShell (display: flex, height: 100vh)
  ├── NavSidebar (220px expanded / 64px collapsed)
  └── main.app-shell-content (flex: 1, overflow-y: auto)
        └── content wrapper (width: 100%, padding: T.page.gutterY T.page.gutterX)
              └── Page component (maxWidth: T.container.*, margin: 0 auto)
```

Page background: T.bg (#f8f9fa) — set on both AppShell and content wrapper.
Card surfaces: T.surface (#ffffff) — set on card components, NOT the page wrapper.

### 7.2 Tenant Portal Specific

TenantPortal.js wraps all tab content in:
```js
// Non-fullBleed tabs:

  
    {content}
  


// INNER = { width: "100%", boxSizing: "border-box" }
```

RULE: The INNER wrapper in TenantPortal.js must NOT use maxWidth or margin: auto.
Content must fill 100% of the space between the sidebar and the right scrollbar
at all viewport widths and zoom levels. Individual components manage their own
internal layout width if needed. The grey T.bg side-strips visible when zoomed
out are caused by maxWidth centering — this is prohibited. (LOOP-DS6-001 · Session 284)

**RULE (LL-267):** Tab-level components (HQLoyalty, HQTradingDashboard, HQOverview,
HQStock, etc.) must NEVER set `background: T.surface` on their outermost return div.
The correct layering:
```
Shell (HQDashboard/TenantPortal) — background: T.bg   ← grey page chrome
└── Tab outer div — background: "transparent"         ← shows grey through
    ├── Page header div — background: T.surface      ← white sticky header
    └── Tab content div — no background              ← grey shows through
        └── SectionCards/tiles — T.surface           ← white cards on grey
```
Violating this creates a white middleman box over the grey AppShell chrome.
(LOOP-DS6-002, LOOP-DS6-003 · Session 284 · HQLoyalty + HQDashboard fixes)

### 7.3 Group Portal Specific

GroupPortal renders its own internal layout:
```js

    {/* Inner portal nav */}
  
```

The Group Portal has two sidebars: the global NavSidebar (AppShell) and its
own internal portal sidebar. This creates the structured left-column feel.

### 7.4 Grid Patterns

KPI tiles — 4-column equal:
```js
display: "grid",
gridTemplateColumns: "repeat(4, 1fr)",
gap: T.page.cardGap  // 16px
```

Store cards — responsive:
```js
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
gap: T.page.cardGap
```

Two-column split:
```js
display: "grid",
gridTemplateColumns: "1fr 1fr",
gap: T.gap.xl  // 24px
```

Metric tiles (HQOverview style):
```js
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
gap: 14
```

---

## PART 8 — COMPONENT SPECS

### 8.1 KPI Tile (Metric Card)

The fundamental display unit for any number that matters.

Structure:
```
Container
  ├── Label row (UPPERCASE label + optional hint/link)
  ├── Value row (large number + optional sparkline)
  ├── Delta badge (optional)
  ├── Sub-label (optional — description of value)
  └── Status/semantic indicator (optional)
```

Exact styles:
```js
// Container
background: T.surface         // #ffffff
border: "0.5px solid #E5E7EB" // slightly lighter than T.border for tiles
borderRadius: T.radius.lg     // 12px
padding: "18px 20px 16px"
boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
// On hover (if clickable):
boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)"
transform: "translateY(-1px)"
transition: "box-shadow 0.18s ease, transform 0.12s ease"

// Label
fontSize: T.text.xs           // 11px
fontWeight: T.weight.bold     // 700
letterSpacing: "0.08em"
textTransform: "uppercase"
color: "#6B7280"              // T.ink600 equivalent

// Value
fontSize: T.text["2xl"]       // 22px  (large tile)
// or fontSize: T.text.xl     // 18px  (medium tile)
fontWeight: T.weight.bold     // 700  (large) or semibold (medium)
color: T.ink900               // or semantic colour
letterSpacing: "-0.02em"
fontVariantNumeric: "tabular-nums"

// Sub-label
fontSize: T.text.xs           // 11px
color: "#9CA3AF"              // lighter than T.ink600
```

States:
- Default: T.shadow.md
- Hover (clickable only): T.shadow.lg + translateY(-1px)
- Semantic success: value colour T.successText
- Semantic warning: value colour T.warningText
- Semantic danger: value colour T.dangerText

### 8.2 Store/Content Card

The primary content container. Used for store comparison cards, detail panels.

```js
background: T.surface          // #ffffff
border: `1px solid ${T.border}` // 1px solid #dee2e6
borderRadius: T.radius.lg       // 12px
padding: T.inset.card           // 16px
display: "flex"
flexDirection: "column"
gap: T.gap.md                   // 12px between internal sections
```

Card header (name + badge):
```js
// Name
fontSize: T.text.base           // 14px
fontWeight: T.weight.medium     // 500
color: T.ink900
marginBottom: T.gap.xs          // 4px

// Industry badge
display: "inline-block"
background: badge.bg            // from INDUSTRY_BADGE map
color: badge.fg
fontSize: T.text.xs             // 11px
fontWeight: T.weight.semibold   // 600
padding: `${T.pad.xs}px ${T.pad.sm}px`  // 4px 8px
borderRadius: T.radius.sm       // 4px
letterSpacing: "0.04em"
```

Card metric rows:
```js
display: "flex"
justifyContent: "space-between"
alignItems: "baseline"
paddingBottom: T.gap.sm         // 8px
borderBottom: `1px solid ${T.border}`  // last row: borderBottom "none"
fontSize: T.text.sm             // 12px

// Label column
color: T.ink600                 // #6c757d

// Value column
color: semantic or T.ink900
fontWeight: T.weight.semibold   // 600
fontVariantNumeric: "tabular-nums"
```

### 8.3 Section Label / Divider Heading

The small uppercase heading used to introduce groups of cards.

```js
// The exact Group Portal pattern:
<div style={{
  fontSize: T.text.xs,            // 11px
  fontWeight: T.weight.semibold,  // 600
  color: T.ink600,                // #6c757d
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: T.gap.lg,         // 16px
}}>

// HQOverview pattern (with accent bar — use this):

  <span style={{
    display: "inline-block",
    width: 3, height: 14,
    borderRadius: 2,
    background: T.accent,    // industry-aware accent colour
    flexShrink: 0,
  }} />
  {label}

```

RULE: Use the accent-bar version for all section labels in authenticated ERP.
The 3px × 14px coloured bar on the left is the NuAi section label signature.

### 8.4 Buttons

Primary CTA:
```js
background: T.accent            // industry-specific
color: "#ffffff"
border: "none"
borderRadius: T.radius.md       // 8px
padding: "9px 16px"            // md size
// or "6px 12px"               // sm size
fontSize: T.text.xs            // 11px
fontWeight: T.weight.semibold  // 600
letterSpacing: "0.06em"
textTransform: "uppercase"
cursor: "pointer"
fontFamily: T.font
```

Secondary (ghost):
```js
background: "transparent"
color: T.ink700
border: `1px solid ${T.border}`
// same radius/padding/font as primary
```

Danger:
```js
background: "transparent"
color: T.dangerText
border: `1px solid ${T.dangerBorder}`
```

Accent outline (used in Group Portal quick actions):
```js
background: T.surface
color: T.ink700
border: `1px solid ${T.border}`
```

RULE: No emoji in buttons. No raster icons in buttons. Only Lucide SVG icons
(strokeWidth={1.5}, fill="none") or text labels.

### 8.5 Industry Badges / Pills

```js
display: "inline-block"
background: badge.bg            // from INDUSTRY_BADGE — semantic fill
color: badge.fg                 // from INDUSTRY_BADGE — semantic text
fontSize: T.text.xs             // 11px
fontWeight: T.weight.semibold   // 600
padding: `${T.pad.xs}px ${T.pad.sm}px`  // 4px 8px
borderRadius: T.radius.sm       // 4px
letterSpacing: "0.04em"
```

Status badges (non-industry):
```js
// Same structure, semantic colours:
success: { bg: T.successLight, color: T.successText }
warning: { bg: T.warningLight, color: T.warningText }
danger:  { bg: T.dangerLight,  color: T.dangerText  }
info:    { bg: T.infoLight,    color: T.infoText    }
neutral: { bg: T.neutralLight, color: T.neutralText }
```

### 8.6 Data Tables

Table container:
```js
width: "100%"
borderCollapse: "collapse"
fontFamily: T.font
```

Header cell:
```js
textAlign: "left"
padding: "8px 12px"  // or T.inset.tight
fontSize: T.text.xs              // 11px
letterSpacing: "0.06-0.1em"
textTransform: "uppercase"
color: T.ink400                  // #adb5bd — whisper
borderBottom: `2px solid ${T.border}`
fontWeight: T.weight.bold        // 700
background: T.surface
whiteSpace: "nowrap"
```

Data cell:
```js
padding: "9px 12px"
borderBottom: `1px solid ${T.border}`
fontSize: 13                     // slightly below T.text.base
fontFamily: T.font
verticalAlign: "middle"
color: T.ink900
```

Numeric data cell (any number in a table):
```js
// Same as data cell PLUS:
fontVariantNumeric: "tabular-nums"
// and for financial figures, textAlign: "right"
```

Row zebra striping:
```js
// Even rows: background T.surface (#ffffff)
// Odd rows:  background T.surfaceAlt (#f1f3f5)
// Or: no zebra, rely on hover
```

Row hover:
```js
background: T.surfaceHover      // #e9ecef on hover
```

### 8.7 Tabs / Sub-Navigation

```js
// Tab bar container
display: "flex"
borderBottom: `1px solid ${T.border}`
gap: 0
// (tabs are flush, no gap)

// Individual tab button
padding: "10px 16px"
fontSize: T.text.xs             // 11px
fontWeight: T.weight.bold       // 700
letterSpacing: "0.06em"
textTransform: "uppercase"
color: active ? T.accent : T.ink600
cursor: "pointer"
borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent"
marginBottom: "-1px"           // overlaps container border
background: "none"
border: "none" (except bottom)
fontFamily: T.font
whiteSpace: "nowrap"
transition: "color 0.15s"
```

### 8.8 Alert / Banner Bars

```js
// Danger alert
background: T.dangerLight
border: `1px solid ${T.dangerBorder}`
borderRadius: T.radius.md        // 8px
padding: "12px 16px"
color: T.dangerText
fontSize: T.text.base
display: "flex"
alignItems: "flex-start"
gap: T.gap.sm

// Warning alert
background: T.warningLight
border: `1px solid ${T.warningBorder}`
// same structure

// Success alert / info bar
// same structure with respective semantic colours
```

Action centre / collapsible alert block:
```js
background: T.dangerLight
border: `1px solid ${T.dangerBorder}`
borderRadius: T.radius.md
```

### 8.9 Form Inputs

```js
// Text input at rest
background: T.surface
border: `1px solid ${T.border}`
borderRadius: T.radius.md        // 8px
padding: "9px 12px"
fontSize: T.text.base            // 14px
fontFamily: T.font
color: T.ink900
outline: "none"
width: "100%"

// Focused
border: `1px solid ${T.borderMid}`  // slightly darker
boxShadow: `0 0 0 3px ${T.accentLight}`  // soft accent ring

// Placeholder
color: T.ink400                  // whisper grey

// Label above input
fontSize: T.text.xs              // 11px
fontWeight: T.weight.semibold    // 600
color: T.ink600
textTransform: "uppercase"
letterSpacing: "0.06em"
marginBottom: T.gap.xs           // 4px
```

Select/dropdown:
```js
// Same as text input plus:
appearance: "none"
paddingRight: "32px"             // space for chevron icon
// Chevron: Lucide ChevronDown, 14px, color T.ink600
```

### 8.10 Icons

RULE: ALL icons in the authenticated ERP use Lucide React. No exceptions.
No emoji. No raster. No Font Awesome. No custom SVG unless it's a brand logo.

```js
import { ChevronDown, AlertTriangle, Check, ... } from "lucide-react";

// Inline (next to text):


// Standalone (card header):


// Interactive/prominent:


// Error/warning:

```

Emoji replacements (mandatory):
```
💎  →  <Star size={14} />           or <Award size={14} />
💵  →  <Banknote size={14} />
💳  →  <CreditCard size={14} />
📱  →  <Smartphone size={14} />
✅  →  <CheckCircle size={14} />    or <Check size={14} />
⚠️  →  <AlertTriangle size={14} />
🚨  →  <AlertOctagon size={14} />
🟢  →  coloured dot div, NOT emoji
⚪  →  coloured dot div, NOT emoji
📅  →  <Calendar size={14} />
🔗  →  <Link size={14} />
🌿  →  <Leaf size={14} />           (cannabis product icon)
📦  →  <Package size={14} />
🧪  →  <FlaskConical size={14} />
↻   →  <RefreshCw size={14} />
```

Status dot (replaces 🟢 ⚪ 🔴):
```js
<span style={{
  display: "inline-block",
  width: 6, height: 6,
  borderRadius: T.radius.full,
  background: T.success,          // or T.danger, T.warning, T.ink400
  flexShrink: 0,
}} />
```

### 8.11 Navigation Sidebar (Global)

```js
// Sidebar container
background: T.surface             // #ffffff
borderRight: `1px solid ${T.border}`

// Section heading (collapsed group label)
fontSize: T.text.xs               // 11px, but actually 10px in current impl
fontWeight: T.weight.bold         // 700
letterSpacing: "0.1em"
textTransform: "uppercase"
color: active ? section.color : T.ink400

// Tab item (expanded)
fontSize: 13                      // between T.text.sm and T.text.base
fontWeight: active ? 600 : 400
color: active ? section.color : T.ink500
padding: "7px 16px 7px 36px"     // indent for hierarchy

// Active indicator
boxShadow: `inset 3px 0 0 ${section.color}`  // left accent bar
background: accentLight                        // industry-aware fill
```

### 8.12 Breadcrumbs

```js
// Container
height: 48
display: "flex"
alignItems: "center"
gap: 6
background: "#fff"              // T.surface — breadcrumb bar is white
borderBottom: none              // (in TenantPortal, section below is T.bg)

// Home button
fontSize: 12
color: T.ink400
// with Home icon 12px

// Separator ›
color: T.ink400 (T.ink150 in some places — use T.ink400)
fontSize: 12

// Section link
fontSize: 12
color: T.ink400

// Active tab (current)
fontSize: 13
fontWeight: T.weight.semibold   // 600
color: T.ink900

// Description
fontSize: 11
color: T.ink400                 // · description text
```

### 8.13 Modals / Drawers

```js
// Overlay
background: "rgba(0,0,0,0.35)"
position: "fixed"
inset: 0
zIndex: T.z.modal               // 200

// Modal container
background: T.surface
borderRadius: T.radius.lg        // 12px
padding: T.inset.modal           // 24px
boxShadow: T.shadow.xl
maxWidth: depends on content

// Drawer (side panel)
width: "min(720px, 95vw)"
background: T.surface
padding: T.inset.modal           // 24px
boxShadow: "-4px 0 24px rgba(0,0,0,0.12)"
overflowY: "auto"

// Modal header
fontSize: T.text.lg              // 16px
fontWeight: T.weight.semibold    // 600
color: T.ink900

// Close button
background: "none"
border: "none"
fontSize: 18
cursor: "pointer"
color: T.ink500
```

### 8.14 Loading States

Spinner:
```js
width: 28, height: 28
border: `2px solid ${T.border}`
borderTopColor: T.accent
borderRadius: T.radius.full
animation: "spin 0.8s linear infinite"
// @keyframes spin { to { transform: rotate(360deg) } }
```

Loading text:
```js
fontSize: 11
fontWeight: T.weight.bold
letterSpacing: "0.12em"
textTransform: "uppercase"
color: T.ink600
```

Skeleton (placeholder while loading):
```js
background: T.surfaceAlt         // #f1f3f5
borderRadius: T.radius.sm
// animate: shimmer left-to-right gradient
animation: "shimmer 1.5s infinite"
```

### 8.15 Empty States

```js
// Container
padding: T.pad.xxl               // 40px
textAlign: "center"
color: T.ink600
fontFamily: T.font

// Icon (optional)
// Use a Lucide icon at 48px, color T.ink400, marginBottom 16px
// NO emoji

// Heading
fontSize: T.text.lg              // 16px
fontWeight: T.weight.semibold
color: T.ink700
marginBottom: T.gap.md           // 12px

// Description
fontSize: T.text.base            // 14px
color: T.ink600
lineHeight: 1.6

// CTA button (optional)
// Primary button style (8.4)
marginTop: T.gap.xl              // 24px
```

### 8.16 Toast Notifications

```js
// Container (fixed, bottom-right or top-right)
position: "fixed"
bottom: 20, right: 20
zIndex: T.z.toast               // 300

// Toast item
background: T.surface
border: `1px solid ${T.border}`
borderRadius: T.radius.md        // 8px
padding: "12px 16px"
boxShadow: T.shadow.xl
fontFamily: T.font
fontSize: T.text.sm              // 12px
color: T.ink900
minWidth: 280
display: "flex"
alignItems: "flex-start"
gap: T.gap.sm                    // 8px

// Semantic variants same as alert bars
```

---

## PART 9 — DATA VISUALIZATION

### 9.1 Chart Palette

Primary chart palette (use in this order — max 6 colours per chart):
```
1. #6366F1   Indigo      — primary data series (today, current)
2. #F472B6   Pink        — secondary series (yesterday, comparison)
3. #06B6D4   Cyan        — tertiary
4. #A78BFA   Violet      — quaternary
5. #94A3B8   Slate       — neutral/secondary
6. #34D399   Emerald     — success context
```

Bar chart cell colours by day type (revenue charts):
```
Weekday:         #6366F1   (indigo)
Weekend:         #C7D2FE   (light indigo)
Public holiday:  #F472B6   (pink)
No data/zero:    T.border  (#dee2e6)
Today highlight: #6366F1   (same as weekday but annotated)
```

RULE: Never use more than 6 colours in a single chart. Use the palette in order.
Never use T.neutralLight (#f1f3f5) as a bar fill — it is invisible on a white
background (LL-263).

Group portal bar palette (StoreComparison.js — 6 distinct store colours):
```
const BAR_PALETTE = ["#1A3D2B","#2563EB","#7C3AED","#C2410C","#0F766E","#B45309"]
```

### 9.2 Chart Container

```js
// ChartCard wrapper
background: T.surface
border: `1px solid ${T.border}`
borderRadius: T.radius.lg         // 12px
padding: T.inset.card             // 16px
boxShadow: T.shadow.md

// Chart title
fontSize: T.text.sm               // 12px
fontWeight: T.weight.bold         // 700
letterSpacing: "0.06em"
textTransform: "uppercase"
color: T.ink600

// Chart subtitle
fontSize: T.text.xs               // 11px
color: T.ink400
```

### 9.3 Axis Styling (Recharts)

```js
// XAxis and YAxis ticks
tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: T.font }}
axisLine={false}
tickLine={false}

// Grid lines

```

### 9.4 Tooltips

```js
contentStyle={{
  fontFamily: T.font,
  fontSize: 12,
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.md,       // 8px
  boxShadow: "none",
  padding: "10px 14px",
}}
labelStyle={{ color: T.ink600, fontSize: 11 }}
```

### 9.5 Area Chart Gradient

```js

  
    
    
  

// fill="url(#gradient-{name})"
```

### 9.6 Sparklines

```js
// SparkLine component from src/components/viz
<SparkLine
  data={data}           // array of { v: number }
  positive={bool}       // true = green gradient, false = red
  width={56-80}
  height={28}
/>
```

### 9.7 Delta Badges (% change indicators)

```js
// DeltaBadge component from src/components/viz


// Positive: T.successText background, upward arrow
// Negative: T.dangerText background, downward arrow
// Near-zero: T.ink500 background, neutral
```

### 9.8 Gauge / Radial Charts

Used for margin percentage display (HQOverview MarginGauge):
```js
// SVG arc gauge
// Track colour: T.border
// Fill colour:  semantic (success/warning/danger based on value)
// Stroke width: 16px
// strokeLinecap: "round"
// Value text: T.text.4xl (36px), fontWeight 400, semantic colour
// Label text:  T.text.xs (11px), T.ink500, uppercase, 0.08em spacing
```

### 9.9 Horizontal Bar Charts (comparison/ranking)

```js
// Category label
fontSize: 11
color: T.ink500
width: 110
// Bar track
background: T.border
height: 8
borderRadius: 3
// Bar fill
background: semantic or palette colour
borderRadius: 3
// Value label (right-aligned)
fontFamily: T.font
fontVariantNumeric: "tabular-nums"
fontSize: 11
color: T.ink900
```

### 9.10 Donut / Pie Charts

```js
<Pie
  innerRadius={52}
  outerRadius={80}
  paddingAngle={3}
  isAnimationActive={false}  // always false for performance
>
// Legend: inline div with coloured squares (9px × 9px, borderRadius 2)
// NOT the Recharts Legend component
```

---

## PART 10 — INTERACTION AND MOTION

### 10.1 Transition Defaults

```js
// Colour transitions (hover states)
transition: "color 0.15s"
transition: "background 0.15s"
transition: "opacity 0.15s"

// Transform (lift on hover)
transition: "box-shadow 0.18s ease, transform 0.12s ease"

// Sidebar collapse/expand
transition: "width 0.2s ease, min-width 0.2s ease, padding 0.2s ease"

// Progress bar fill
transition: "width 0.4s ease"

// Chart animation
animationDuration={600}
animationEasing="ease-out"
// For sparklines and area charts: isAnimationActive={false} (performance)
```

### 10.2 Hover States

Clickable cards:
```js
// At rest
boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
transform: "none"

// Hovered
boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)"
transform: "translateY(-1px)"
```

Nav items:
```js
// Hovered (not active)
background: `${section.color}08`   // 3% opacity tint of section colour
```

Table rows:
```js
// Hovered
background: T.surfaceHover         // #e9ecef
```

Buttons:
```js
// Primary hover: opacity 0.9 (slight dim) or background slightly darker
// Ghost hover: background T.surfaceAlt
// opacity transition 0.15s
```

### 10.3 Focus States (Accessibility)

All interactive elements must have a visible focus indicator:
```js
// Input focus
border: `1px solid ${T.borderMid}`
boxShadow: `0 0 0 3px ${T.accentLight}`
outline: "none"

// Button focus
outline: `2px solid ${T.accent}`
outlineOffset: 2
```

### 10.4 Active/Pressed States

```js
// Buttons pressed
opacity: 0.85
transform: "scale(0.98)"
```

### 10.5 Disabled States

```js
opacity: 0.45
cursor: "not-allowed"
// Do NOT change colours for disabled — use opacity only
```

---

## PART 11 — Z-INDEX SCALE

```
T.z.base    = 0       Normal document flow
T.z.raised  = 10      Sticky headers, floating labels
T.z.overlay = 100     Dropdown menus, popovers, tooltips
T.z.modal   = 200     Modals, drawers, lightboxes
T.z.toast   = 300     Toast notifications
T.z.max     = 9999    Absolute top — emergency overlays
```

---

## PART 12 — INDUSTRY PROFILE VISUAL ADAPTATION

NuAi serves 4 industry profiles. Each gets its own accent palette. All other
tokens (spacing, radius, typography, semantic colours) remain identical.

The accent colour propagates through:
1. Primary buttons
2. Active nav item indicator + tint
3. Industry badge background/text
4. Active tab underline
5. Section label accent bar (3px × 14px left border on section headings)
6. Loyalty/accent strip backgrounds

Implementation pattern (from TenantPortal.js):
```js
const pOvr       = profileOverrides[industryProfile] || {};
const pAccent    = pOvr.accent    || T.accent;
const pAccentMid = pOvr.accentMid || T.accentMid;
const pAccentLit = pOvr.accentLight || T.accentLight;
```

---

## PART 13 — WHAT IS NEVER ALLOWED

These rules override everything else. No exceptions. No context excuses them.

### 13.1 Fonts
- ❌ DM Mono anywhere in ERP interface
- ❌ Courier New for data display
- ❌ Cormorant Garamond in /tenant-portal, /hq, /admin, /hr, /staff
- ❌ Jost in ERP portals
- ❌ Any Google Font not explicitly listed in tokens.js

### 13.2 Colours
- ❌ #faf9f6 or #FAF8F5 or any warm cream as page or card background
- ❌ T.neutralLight (#f1f3f5) as a chart bar fill (invisible)
- ❌ Hardcoded hex that duplicates a token (use the token, not #2d6a4f directly)
- ❌ Purple anywhere in the system (no T.purple token exists — LL-263 precedent)
- ❌ Coloured top borders on cards (semantic state → alert bar inside, not card border)

### 13.3 Icons
- ❌ Emoji in any authenticated ERP interface (no 💎 💵 💳 ✅ ⚠️ 🚨 📅 🌿 etc.)
- ❌ Raster/PNG icons
- ❌ Font Awesome (not in the stack)
- ❌ Custom inline SVG paths unless they are a certified brand asset

### 13.4 Spacing
- ❌ Arbitrary pixel values not on the 4px grid
- ❌ Raw T.space[n] for layout — use T.gap.*, T.pad.*, T.inset.*, T.page.*
- ❌ Negative margins (exception: tab underline marginBottom: "-1px")

### 13.5 Layout
- ❌ max-width on page content that differs from T.container tokens
- ❌ Setting page background to #ffffff (it must be T.bg = #f8f9fa)
- ❌ Setting card background to anything other than T.surface = #ffffff
- ❌ Inline margin/padding that contradicts the T.page layout system

### 13.6 Typography
- ❌ fontVariantNumeric omitted on any rendered number
- ❌ Letter spacing on body text (reserved for labels/buttons only)
- ❌ fontWeight 400 on large KPI values (must be 600-700)
- ❌ Using T.ink500 (#6c757d) for UPPERCASE section labels (must be T.ink400 = #adb5bd)

---

## PART 14 — AUDIT CHECKLIST FOR AGENTS

Before shipping any component change, verify every item:

TYPOGRAPHY
- [ ] All text uses T.font (Inter) — no DM Mono, Courier, Jost, Cormorant
- [ ] All numbers have fontVariantNumeric: "tabular-nums"
- [ ] Section labels: 11px, 700 weight, T.ink400, uppercase, 0.08em spacing
- [ ] KPI values: 22px+, 600-700 weight, T.ink900 or semantic colour
- [ ] Table headers: 11px, uppercase, T.ink400, 0.06-0.1em spacing

COLOUR
- [ ] Page background: T.bg (#f8f9fa) — not #ffffff, not #faf9f6
- [ ] Card background: T.surface (#ffffff)
- [ ] No hardcoded hex that duplicates a token
- [ ] Semantic colours used correctly (red = error only, green = success only)
- [ ] No cream/warm tones anywhere in authenticated ERP

SPACING
- [ ] Cards use T.inset.card (16px) padding
- [ ] Section gaps use T.page.sectionGap (32px)
- [ ] Card grids use T.page.cardGap (16px) gap
- [ ] No arbitrary pixel values off the 4px grid

RADIUS
- [ ] Content cards: T.radius.lg (12px)
- [ ] Buttons: T.radius.md (8px)
- [ ] Badges: T.radius.sm (4px)
- [ ] No hardcoded "3px", "4px", "6px" unless it IS the correct token value

ICONS
- [ ] Zero emoji in authenticated interface
- [ ] All icons are Lucide React, strokeWidth 1.5, fill "none"
- [ ] Status dots are div spans with borderRadius T.radius.full

CHARTS
- [ ] Chart palette starts with #6366F1 (indigo) for primary series
- [ ] T.neutralLight NOT used as bar fill
- [ ] Axes: no axisLine, no tickLine, fill #94A3B8, fontSize 10, fontFamily T.font
- [ ] isAnimationActive={false} on sparklines and area charts

INTERACTION
- [ ] Clickable cards have hover shadow + translateY(-1px)
- [ ] All transitions use 0.15s-0.18s (not 0.3s, not instant)
- [ ] Disabled states use opacity 0.45, cursor "not-allowed"

---

## PART 15 — LIVING RECORD OF VIOLATIONS FIXED

| Session | File | Violation | Fix |
|---|---|---|---|
| 284 | AppShell.css | background: #faf9f6 (cream) | → #f8f9fa (T.bg) |
| 284 | TenantPortal.js | T.bg: "#FAFAF9" in local T object | → "#f8f9fa" |
| 284 | TenantPortal.js | 3 hardcoded #faf9f6 backgrounds | → T.bg |
| 284 | All tenant tabs | background gap: cream inherited | Fixed via TenantPortal |
| OPEN | HQTradingDashboard.js | const MONO = DM Mono | Replace with T.font |
| OPEN | HQTradingDashboard.js | borderRadius: "4px" hardcoded | Replace with T.radius tokens |
| OPEN | HQTradingDashboard.js | 10+ emoji (💎💵💳✅⚠️📅) | Replace with Lucide |
| OPEN | All hq/ components | T.ink500 on section labels | Replace with T.ink400 |
| OPEN | All hq/ components | fontVariantNumeric missing | Add to all number renders |
| CLOSED | HQLoyalty.js | outer div background: T.surface | → transparent |
| CLOSED | HQDashboard.js | content div no background | → background: T.bg |
| CLOSED | HQLoyalty.js | page header background: T.surface | → transparent |

---

*NUAI-VISUAL-SPEC.md · v1.0 · Session 284 · 15 April 2026*
*Updated each session in-place when new violations are found or specs added.*
*This document does not expire. It grows.*
