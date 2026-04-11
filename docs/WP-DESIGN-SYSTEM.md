# WP-DESIGN-SYSTEM — NuAi Visual Unification & Ambient Intelligence
## Status: PLANNING
## Created: 11 April 2026
## Author: Claude.ai + George Fivaz
## This WP survives agent turnover. Every agent MUST read this 
## before touching any design token, component style, or theme file.

---

## WHY THIS EXISTS

NuAi was built tab by tab, session by session, across months of 
development. Each session produced individually competent components 
that share no visual grammar. The result: 6 portals, 41+ HQ tabs, 
35+ tenant tabs — each with its own card style, spacing, colour 
treatment, and button hierarchy. Users re-orient on every screen. 
Muscle memory never forms. Features go undiscovered.

This WP unifies the visual layer without touching business logic.
It also plants the foundation for an Ambient Intelligence design 
layer that no ERP platform has shipped.

The science behind this decision is documented in:
  docs/UX-RESEARCH-BRIEF_11Apr2026.md (to be created)

The feature inventory that maps every component affected is at:
  docs/FEATURE-INVENTORY.md (526 lines, committed d589af5)

---

## WHAT EXISTS TODAY (as of 11 Apr 2026)

### Two competing token systems (UNRESOLVED)
| System | Files | Font | Status |
|---|---|---|---|
| Old: C object (Jost font) | AdminQrGenerator, some Admin files | Jost | DEPRECATED (91c452f) |
| New: T object (Inter font) | HQProduction, HQStock, ActionCentre, most HQ files | Inter | ACTIVE — extend this |

The T token system is the winner. All new work uses T.
No file should introduce C tokens. AdminQrGenerator already deprecated.

### Current T token shape (from HQProduction.js)
```javascript
const T = {
  // Typography
  font: "Inter, sans-serif",
  
  // Backgrounds
  bg: "#f8f9fa",
  surface: "#ffffff", 
  surfaceAlt: "#f1f3f5",
  
  // Borders
  border: "#dee2e6",
  borderMid: "#ced4da",
  
  // Text
  ink900: "#212529",
  ink600: "#6c757d",
  ink400: "#adb5bd",
  
  // Semantic colours
  accent: "#2d6a4f",        // NuAi green — primary brand
  accentMid: "#40916c",     // green mid
  accentLight: "#d8f3dc",   // green light bg
  
  danger: "#c0392b",        // critical red
  dangerBg: "#fdf0ef",      // red background
  
  warning: "#e67e22",       // amber warning
  warningBg: "#fef9f0",     // amber background
  
  success: "#27ae60",       // success green
  successBg: "#eafaf1",     // success background
  
  info: "#2980b9",          // info blue
  infoBg: "#eaf4fb",        // info background
  
  // Radius
  radius: "8px",
  radiusSm: "4px",
  radiusLg: "12px",
  
  // Shadow
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.10)",
}
```

### Problems with current T token usage
- T is redefined locally inside each component function — not imported
- No shared source of truth — if accent colour changes, 40+ files need editing
- Spacing is ad-hoc (some files use 8px, 12px, 16px, 24px randomly)
- Border radius inconsistent (4px in some cards, 8px in others, 12px in modals)
- No type scale — font sizes chosen per-component with no system
- Button styles differ across 6 portals
- Status pills have 5 different implementations

### Tokens added during WP-DS-2 PageShell migration (`846280c`)
Three additional tokens were added to the T object in `src/styles/tokens.js` to handle PageShell's dark footer and Protea Botanicals brand gold accent — both of which had no equivalent in the WP-DS-1 base token set:

```javascript
// ─── DARK SURFACES ───────────────────────────────────────────
surfaceDark:    "#1a1a1a",   // dark footer / dark hero surfaces
surfaceDarkAlt: "#060e09",   // deepest surface (Redeem.js footer)

// ─── BRAND ACCENTS ───────────────────────────────────────────
brandGold:      "#b5935a",   // Protea Botanicals brand accent (warm gold)
```

**Correction to original WP-DS-2 mapping rule:**
The original rule table included `C.footer → T.surfaceAlt`, but this was **incorrect**: `C.footer = "#1a1a1a"` (near-black) and `T.surfaceAlt = "#f1f3f5"` (near-white) — opposite ends of the palette. Applying the rule literally would have inverted PageShell's footer and made its white text unreadable. The correct mapping is `C.footer → T.surfaceDark` (new token). Similarly, `C.gold` was NOT mapped in the original spec — it maps to the new `T.brandGold`, not to `T.warning` (which is semantic orange, wrong for a brand accent).

All future PageShell-style dark-surface work should use `T.surfaceDark` and `T.brandGold`. Any reference to `T.warning` for brand gold is wrong.

### Tokens added during WP-DS-2/P3 ActionCentre migration
Two additional tokens were added for mid-tier alert borders — T had light surfaces and bright semantic tiers but no border-weight colours in between:

```javascript
// ─── BORDER ACCENTS ──────────────────────────────────────────
warningBorder:  "#FDE68A",   // mid-yellow warning border
dangerBorder:   "#FECACA",   // light-pink danger border
```

### ⚠ CRITICAL SEMANTIC RULE — text-tier vs surface-tier (applies to all Priority 4)

When migrating legacy `C.warning` or `C.danger` references, **the correct target depends on how the colour is used**:

| Original use | Map to | Example |
|---|---|---|
| **TEXT colour** (foreground ink on a pale semantic background) | `T.warningText` / `T.dangerText` | `color: C.warning` → `color: T.warningText` |
| **BORDER colour** (outline on a pale semantic background) | `T.warningBorder` / `T.dangerBorder` | `border: 1px solid C.warningBd` → `border: 1px solid T.warningBorder` |
| **LIGHT BACKGROUND** (pale alert / pill background) | `T.warningLight` / `T.dangerLight` | `background: C.warningBg` → `background: T.warningLight` |
| **BRIGHT SURFACE** (full-saturation accent, banner, CTA) | `T.warning` / `T.danger` | rare — most uses are text-tier |

**WRONG — naive mapping:**
```javascript
// ❌ Produces alarming bright orange text on pale background
color: C.warning → color: T.warning   // #92400E → #e67e22
```

**RIGHT — semantic-tier mapping:**
```javascript
// ✓ Preserves muted dark amber text
color: C.warning → color: T.warningText   // #92400E → #7d4a00
```

**Why this matters:** the legacy `C.warning = "#92400E"` is a dark amber text colour. The new `T.warning = "#e67e22"` is a bright orange surface/accent colour — a different tier in the WP-DS-1 semantic scale. A naive rename produces visually alarming text. Same logic applies to `C.danger` (`#991B1B` dark red text) → `T.dangerText` (`#7b1a11` dark red text), NOT → `T.danger` (`#c0392b` bright red surface).

**This rule applies to every HQ component in Priority 4.** HQ components frequently render status pills, alert banners, and section headers with coloured text on pale backgrounds — all are text-tier uses. Future Priority 4 sessions MUST apply the text-tier rule, not the naive rule.

**First application:** ActionCentre.js migration (this session) — `C.warning → T.warningText`, `C.danger → T.dangerText`, `C.warningBd → T.warningBorder`, `C.dangerBd → T.dangerBorder`, `C.warningBg → T.warningLight`, `C.dangerBg → T.dangerLight`. Six semantic-tier mappings, each verified correct by visual intent.

---

## THE PLAN — 5 SUB-WORK-PACKAGES

Each sub-WP is small scope, independently shippable, and builds on 
the previous. No sub-WP requires another to be "complete" first.
Each can be paused and resumed by a new agent with no knowledge loss.

---

## WP-DS-1 — SHARED TOKEN FILE
**Status: NOT STARTED**
**Estimated sessions: 1**
**Risk: LOW — additive only, no existing code changes**

### What was done
Nothing. T tokens are currently inline in each component.

### Direction
Create src/styles/tokens.js — a single exported token object.
Every component imports from this file instead of defining locally.

### Scope
1. Create src/styles/tokens.js with the T token shape above
2. Add spacing scale: space: { 1:4, 2:8, 3:12, 4:16, 5:24, 6:32, 7:48, 8:64 }
3. Add type scale: text: { xs:11, sm:12, base:14, md:15, lg:16, xl:18, 2xl:22, 3xl:28 }
4. Add profile-aware palette section (see WP-DS-3)
5. Export as: export const T = { ... }
6. DO NOT change any component imports yet — that is WP-DS-2

### Did we miss anything
- Dark mode: out of scope for this WP. Note for future.
- CSS custom properties vs JS object: JS object chosen for React 
  inline-style compatibility. CSS vars considered for WP-DS-5.

### How it will look
No visual change. This is infrastructure only.

### How it will function
import { T } from "../styles/tokens";
Same usage as today — just from one source.

### Can we improve
YES — future: tokens.js becomes tokens.ts with full TypeScript 
typing. Each token documented. Not in scope now.

---

## WP-DS-2 — COMPONENT MIGRATION (SHARED COMPONENTS FIRST)
**Status: NOT STARTED**
**Estimated sessions: 2-3**
**Risk: MEDIUM — touches existing components**
**Prerequisite: WP-DS-1 complete**

### What was done
ActionCentre.js was built with self-contained tokens — correct for 
a new component. It needs to be the first file migrated to import 
from tokens.js once WP-DS-1 ships.

### Direction
Migrate shared components first (lowest blast radius):
Priority 1: src/components/shared/ActionCentre.js
Priority 2: src/components/WorkflowGuide.js  
Priority 3: src/components/shared/* (all files in shared/)
Priority 4: HQ components (HQProduction, HQStock, HQOverview)
Priority 5: Tenant portal components
Priority 6: Admin components

### Scope per session
Max 5 files per Claude Code session. 
Read each file in full before editing (LL-221).
Change only: const T = { ... } → import { T } from "../../styles/tokens"
Do not touch any logic, layout, or business code.

### Did we miss anything
- Some components use C tokens (old system). These get the T import 
  AND their C references replaced. Flag any C usage found.
- StockControl.js has both C and T references — needs audit.

### How it will look
No visual change until WP-DS-3.

### How it will function
Single source of truth. Change accent colour in tokens.js → 
all 40+ components update. That is the goal.

### Can we improve
Automated check: add a lint rule or grep CI step that fails if 
any new component defines a local T object. Prevents regression.

---

## WP-DS-3 — PROFILE-AWARE TOKENS
**Status: NOT STARTED**
**Estimated sessions: 1**
**Risk: MEDIUM — requires useTenant() in tokens or token switching**
**Prerequisite: WP-DS-1 complete**

### What was done
Industry profiles exist (cannabis_retail, cannabis_dispensary, 
food_beverage, general_retail). Visual treatment is identical 
across all profiles — no differentiation.

### Direction
Extend tokens.js with a getProfileTokens(profile) function that 
returns profile-specific overrides merged with base T tokens.

### The vision (from UX research, 11 Apr 2026)
Cannabis retail: deep confident greens, premium brand aesthetic
Medical dispensary: clinical teal, trust language of healthcare  
Food & Beverage: warm terracotta/earth tones, kitchen warmth
General retail: clean neutral, Swiss army knife

### Scope
```javascript
export const profileOverrides = {
  cannabis_retail: {
    accent: "#2d6a4f",       // deep forest green (current default)
    accentMid: "#40916c",
    accentLight: "#d8f3dc",
    brandName: "NuAi Cannabis",
  },
  cannabis_dispensary: {
    accent: "#0d6efd",       // clinical blue
    accentMid: "#3d8bfd", 
    accentLight: "#cfe2ff",
    brandName: "NuAi Medical",
  },
  food_beverage: {
    accent: "#8b4513",       // warm terracotta
    accentMid: "#a0522d",
    accentLight: "#fdf0e8",
    brandName: "NuAi Kitchen",
  },
  general_retail: {
    accent: "#495057",       // confident charcoal
    accentMid: "#6c757d",
    accentLight: "#f1f3f5",
    brandName: "NuAi Retail",
  },
}

export const getTokens = (profile) => ({
  ...T,
  ...(profileOverrides[profile] || {}),
})
```

### Did we miss anything
- HQ operator sees all profiles simultaneously — HQ uses base T always
- Profile token switching happens at the portal entry point 
  (TenantPortal.js, AdminDashboard.js) via useTenant()

### How it will look
Nourish Kitchen sidebar accent becomes warm terracotta.
Medi Can sidebar becomes clinical blue.
Cannabis retail stays the current deep green.
All other tokens (spacing, radius, type) remain identical.

### How it will function
TenantPortal.js calls getTokens(industryProfile) and passes 
via React context. All child components consume from context 
instead of importing T directly. This is a breaking change — 
plan carefully.

### Can we improve
CSS custom properties (--nuai-accent: #2d6a4f) would allow 
instant theme switching without re-render. WP-DS-5 territory.

---

## WP-DS-4 — UNIFIED COMPONENT LIBRARY
**Status: NOT STARTED**
**Estimated sessions: 3-4**
**Risk: HIGH — visual changes across all portals**
**Prerequisite: WP-DS-2 complete**

### What was done
Each component built its own card, button, and status pill. 
No shared component library exists. Current inventory:
- 5+ different card implementations
- 3 different button styles (primary/secondary inconsistent)
- 5+ different status pill implementations
- 2 different modal styles
- 4+ different KPI tile implementations

### Direction
Build src/components/ui/ — a small, focused component library:
- Card.js — one card with variants (default/elevated/outlined)
- Button.js — one button with variants (primary/secondary/ghost/danger)
- StatusPill.js — one pill with variants (active/pending/warn/critical/archived/info)
- KPITile.js — one tile (label/value/subtitle/trend pattern)
- SectionHeader.js — one header (title/subtitle/breadcrumb/action)
- DataTable.js — one table (sortable/filterable/paginated)

### Scope per sub-session
One component at a time. Ship. Test. Then next.
Do NOT attempt to replace all usages in the same session as creation.
Create first, migrate tab by tab in subsequent sessions.

### Did we miss anything
This is the highest risk sub-WP. A wrong Card.js breaks every 
tab that imports it. Testing protocol:
1. Build component
2. Use it in ONE tab only
3. Screenshot and review
4. Only then migrate to other tabs

### How it will look
Every card across the platform has the same radius, padding, 
border, and shadow. Every button responds identically to hover 
and click. Every status pill uses the same dot-colour-label system.
The platform feels like one product for the first time.

### How it will function
Existing components import from src/components/ui/ rather than 
defining their own styles. Migration is additive — old styles 
stay until replaced. No flag day.

### Can we improve
Storybook integration for component documentation — future session.
This is the mature design system endpoint.

---

## WP-DS-5 — AMBIENT INTELLIGENCE LAYER
**Status: FUTURE — NOT STARTED**
**Estimated sessions: UNKNOWN**
**Risk: NEW TERRITORY — no ERP has shipped this**
**Prerequisite: WP-DS-1 through WP-DS-4 complete**

### What was done
Nothing. This is new territory.

### The concept (from UX research, 11 Apr 2026)
Future SaaS products will intimately understand their users, 
predicting their needs and adapting interfaces to individual 
workflows. Ambient personalisation: interfaces change based on 
user habits, time of day, role, and context — without explicit 
configuration by the user.

### Three sub-features

**5A — Behavioural Dashboard Reordering**
Track which tabs/sections each user visits most frequently 
(via analytics events to Supabase). After 2 weeks of data, 
surface their most-used KPIs on the Dashboard home tab 
automatically. No configuration. No settings screen.
Data: user_id + tab_id + timestamp → frequency score → 
reorder dashboard widgets by score.

**5B — Emotional State Tokens**
When all KPIs are green and no alerts exist: interface shifts 
subtly warmer (success state palette applied globally).
When critical alerts exist: interface shifts cooler and more 
urgent (danger-tinted surface tokens).
This is NOT a dramatic colour change. It is ambient.
Implementation: computed token override based on alert state 
passed from ActionCentre's alert count to a global context.

**5C — Role-Pace Adaptation**
HQ operator: denser information, smaller text, more data per card.
Store manager: medium density.
Staff: large targets, 2-tap maximum, simplified.
Implementation: density: "compact" | "default" | "comfortable" 
as a token-level variable. Components read density and adjust 
their padding/font-size/line-height accordingly.

### Did we miss anything
CGI/animation concerns noted by owner (11 Apr 2026):
"the effects of our code is limited" — confirm React inline-style
approach (no Three.js, no WebGL, no CSS animations beyond 
simple transitions). All of 5A/5B/5C are achievable with 
React state + token switching. No GPU required.

### How it will look
The platform breathes. It notices the user. It adjusts without 
being asked. On a good day for the business, the interface 
feels celebratory without being garish. On a day with problems, 
it feels focused and urgent. Users will not be able to explain 
why the platform feels alive — they will just feel it.

### How it will function
Global design context (React Context) holds:
- currentProfile (from useTenant)
- alertSeverity (from ActionCentre counts)
- userDensityPreference (from behaviour tracking)
- dominantTokens (computed from above)
All components consume dominantTokens instead of static T.

### Can we improve
This is the moat. Once shipped, competitors cannot copy it 
without understanding what it is. It has no marketing name yet.
Suggested internal codename: WP-PULSE.

---

## AGENT HANDOFF PROTOCOL

Every new agent starting work on this WP must:
1. Read this document in full
2. Read docs/FEATURE-INVENTORY.md — know what components exist
3. Read docs/SESSION-STATE (current version) — know HEAD commit
4. Read src/styles/tokens.js if it exists — understand current state
5. Check WP status table below before starting any sub-WP
6. Update status table on completion of each sub-WP

## STATUS TABLE (update this on every session)

| Sub-WP | Name | Status | Commit | Date |
|---|---|---|---|---|
| WP-DS-1 | Shared Token File | **COMPLETE** | `4a6f451` | 11 Apr 2026 |
| WP-DS-2 | Component Migration | **IN PROGRESS — P1+P2 CLOSED, P3 started (1/~8 done: ActionCentre)** | `021b5dd → cb4a0d8 → (P3-1)` | 11 Apr 2026 |
| WP-DS-3 | Profile-Aware Tokens | NOT STARTED | — | — |
| WP-DS-4 | Unified Component Library | NOT STARTED | — | — |
| WP-DS-5 | Ambient Intelligence Layer | FUTURE | — | — |

---

## WP-DS-1 COMPLETION NOTE + CORRECTION (11 Apr 2026)

### What was actually shipped
`src/styles/tokens.js` **was extended additively**, not created from scratch. The file already existed (107 lines) and was load-bearing infrastructure for the legacy `C` token system. It now contains both:
- **NEW** at top: `T`, `profileOverrides`, `getTokens`, `getSeverityTokens` — per the WP-DS-1 spec
- **LEGACY** at bottom (preserved byte-for-byte): `FONTS`, `C`, `makeBtn`, `inputStyle`, `labelStyle`, `sectionLabel`, `TIER_COLORS`, `LS`, `BANNER_H`, `POINTS_PER_SCAN`, default export

File grew from 107 → 386 lines. Zero consumer breaks. Zero runtime impact. Zero visual change.

### Correction to original WP text
The original WP-DS-1 planning text (this document, first commit `0c78e50`) contained a factual error:

> *"The old C object (Jost font, legacy palette) is deprecated. AdminQrGenerator.js was the last consumer — deprecated 91c452f."*

**This was wrong.** Pre-flight grep during WP-DS-1 implementation found **4 live C consumers** still importing `{ C }` from `src/styles/tokens.js`:

| File | Route | Import |
|---|---|---|
| `src/pages/CheckoutPage.js` | `/checkout` | `import { C } from "../styles/tokens"` |
| `src/pages/Redeem.js` | `/redeem` | `import { C } from "../styles/tokens"` |
| `src/pages/WholesalePortal.js` | `/wholesale` | `import { C } from "../styles/tokens"` |
| `src/components/PageShell.js` | *shared layout wrapper* | `import { FONTS, C } from "../styles/tokens"` |

Plus 12+ additional files that use non-C exports from this file (`LS`, `makeBtn`, `TIER_COLORS`, `BANNER_H`, `POINTS_PER_SCAN`) including `src/App.js` (auth persistence via `LS.ROLE` + `LS.DEV_MODE`).

Writing the WP-DS-1 spec verbatim (which asserted "C is not exported from this file intentionally") would have crashed all 4 routes above and logged every user out at next page load. The verbatim spec was rejected and Option A (additive) was adopted instead. The legacy section header in `src/styles/tokens.js` now carries the full corrected consumer list so future agents reading the file directly see the truth.

### WP-DS-2 scope update — priority migration list
WP-DS-2 ("Component Migration") is now scoped to handle the legacy consumers above as **Priority 1 migrations** ahead of the general HQ/Admin component sweep. Revised priority order:

**Priority 1 — Legacy `{ C }` consumers (4 files — WP-DS-2 blocker) — ✅ COMPLETE**
1. ✅ `src/pages/CheckoutPage.js` — commit `021b5dd` (22 C refs + 1 import, strict mapping)
2. ✅ `src/pages/Redeem.js` — commit `b205c33` (12 C refs, 2 hero-gradient exceptions: lines 194/227 `C.accent → T.accentLight` for contrast)
3. ✅ `src/pages/WholesalePortal.js` — commit `3cff956` (31 C refs, 1 hero exception line 200 same pattern)
4. ✅ `src/components/PageShell.js` — commit `846280c` (3 C refs + 3 new tokens added to tokens.js for dark surfaces / brand gold; FONTS import preserved because PageShell IS the global loader)

Order changed from original doc: PageShell was moved to last (not first) because it is the highest blast radius (7 routes) and needed new tokens added to the T system before it could be migrated cleanly.

**Priority 1 total: 68 C references migrated across 4 files. 3 new tokens added (`T.surfaceDark`, `T.surfaceDarkAlt`, `T.brandGold`). 1 mapping rule correction documented (`C.footer → T.surfaceDark`, not `T.surfaceAlt`). 3 hero-gradient exception lines documented (`C.accent → T.accentLight` on dark backgrounds where strict mapping produces 1.0:1 invisible contrast).**

**Priority 2 — ❌ RETRACTED (false positive) — ✅ effectively COMPLETE — zero consumers**

An earlier pre-flight report (commit `4a6f451`) claimed 11 files were Priority 2 consumers of legacy `LS`, `makeBtn`, `TIER_COLORS`, `BANNER_H`, and `POINTS_PER_SCAN` exports from `src/styles/tokens.js`:

> ~~`src/App.js`, `src/pages/AdminDashboard.js`, `src/pages/AdminQrGenerator.js`, `src/components/hq/HQFraud.js`, `src/components/hq/HQDocuments.js`, `src/components/AdminCustomerEngagement.js`, `src/components/AdminShipments.js`, `src/components/AdminFraudSecurity.js`, `src/components/AdminBatchManager.js`, `src/components/AdminNotifications.js`, `src/components/AdminProductionModule.js`~~

**This list was a false positive.** It was produced by grepping for **identifier usages** (`LS.ROLE`, `makeBtn(`, `BANNER_H`, etc.) rather than for **import statements** (`from ".../styles/tokens"`). The grep matched local variable definitions and coincidentally-named symbols. For example:

- **`src/App.js`** defines its own `const LS = { ROLE: "protea_role", DEV_MODE: "protea_dev_mode" }` **locally at line 85**. It never imports from `styles/tokens`. The local `LS` happens to share its name and keys with the tokens.js export, but they are two independent constants. App.js is NOT a tokens.js consumer.
- None of the other 10 files import from `styles/tokens` either. Verified via direct `grep "from.*styles/tokens"` on each file in commit `96d8f70`.

**Definitive audit (post-PageShell-migration, `846280c`):** exhaustive `grep "styles/tokens"` across the entire `src/` tree returns exactly 5 files:
1. `src/styles/tokens.js` (the source file itself)
2. `src/components/PageShell.js` — `import { FONTS, T }` ✅
3. `src/pages/CheckoutPage.js` — `import { T }` ✅
4. `src/pages/Redeem.js` — `import { T }` ✅
5. `src/pages/WholesalePortal.js` — `import { T }` ✅

All 5 are the 4 Priority 1 files (already migrated) plus tokens.js itself. **Priority 2 as described in this document does not exist.** All legacy C consumers were Priority 1. Priority 2 is effectively COMPLETE with zero files to migrate.

### LL-221 lesson learned — grep imports, not identifiers

When auditing which files consume a module, **grep for import statements**, not for identifier usages:

**WRONG (produces false positives):**
```
grep "LS\.ROLE" src/    # matches local const LS definitions
grep "makeBtn("  src/    # matches any function named makeBtn
```

**CORRECT:**
```
grep "from.*/styles/tokens" src/              # catches any import path depth
grep "import.*\{.*LS.*\}.*from.*tokens" src/  # catches named import of LS
```

Identifier-usage grep cannot distinguish between:
- A file that **imports** `LS` from tokens.js and uses it
- A file that **defines its own** `LS` locally and uses that
- A file that contains the substring `LS` anywhere (comments, variable names, etc.)

All three are indistinguishable to identifier-grep. Only import-statement grep tells the truth about module consumers. **This failure wasted a session planning Priority 2 that did not exist.** Future agents: grep imports.

**Consequences of this correction:**
- The "legacy section" at the bottom of `src/styles/tokens.js` is **entirely dead code** except for `FONTS` (1 consumer: PageShell.js) and the new WP-DS-1 exports (T, profileOverrides, getTokens, getSeverityTokens). All other legacy exports (`C`, `makeBtn`, `inputStyle`, `labelStyle`, `sectionLabel`, `TIER_COLORS`, `LS`, `BANNER_H`, `POINTS_PER_SCAN`, default export) have **zero consumers** and were archived in this commit.
- Priority 2 WP-DS-2 scope is closed. Proceed directly to Priority 3.

---

**Priority 3 — Shared components with LOCAL T definitions** (original WP-DS-2 Priority 1) — **IN PROGRESS**
- ✅ `src/components/shared/ActionCentre.js` — *(this commit)* · 9 C.x refs migrated (text-tier rule applied), 1 hardcoded Badge font migrated, local `const C = {...}` deleted, `import { T }` added. 2 new tokens added (`T.warningBorder`, `T.dangerBorder`). 4 unused C keys dropped (`C.ink500`, `C.ink400`, `C.ink150`, `C.ink050` were declared but never referenced in the component body — dead-declaration cleanup as a side effect).
- ⏳ `src/components/WorkflowGuide.js` (next)
- ⏳ Rest of `src/components/shared/*`

Estimated: **1 session, ~5–10 files**. ActionCentre complete (1/~8).

**Priority 4 — HQ components with LOCAL T definitions** (original WP-DS-2 Priority 4)
- HQProduction, HQStock, HQOverview, HQCogs, HQProfitLoss, HQMedical, etc. — each file currently defines `const T = {...}` locally at the top. Migrate to `import { T } from "../../styles/tokens";` one file at a time. Some use the new T object shape, some drift — each file needs LL-221 pre-flight read to identify drift.

Estimated: **3–4 sessions, ~25 files**.

**Priority 5 — Tenant portal + Admin + root components** (original WP-DS-2 Priority 5–6)
- TenantPortal.js, AdminDashboard.js, HQDashboard.js, AppShell.js, NavSidebar.js, etc.
- Consumer pages not yet touched: Shop.js, Account.js, CartPage.js, OrderSuccess.js, Loyalty.js, Leaderboard.js, MoleculesPage.js, TerpenePage.js, ScanResult.js, ProductVerification.js, Welcome.js, etc.
- HR Suite (13 modules), Admin components (14 tabs), rest of HQ

Estimated: **2 sessions, ~15 files** (the rest are large but most are consumer/HR/Admin with smaller local T definitions).

**Total remaining WP-DS-2 sessions: 6–7.**

The dead legacy section at the bottom of `src/styles/tokens.js` was removed in this same commit — no longer gating anything. Only `FONTS` remains and its removal is scheduled for a future PageShell refactor session.

### Invariants preserved by this commit
- `src/styles/tokens.js` exports `{ T, profileOverrides, getTokens, getSeverityTokens, FONTS, C, makeBtn, inputStyle, labelStyle, sectionLabel, TIER_COLORS, LS, BANNER_H, POINTS_PER_SCAN }` plus the default export. 15 named exports, 1 default.
- All 4 C-consuming pages still work identically at runtime.
- `LS.ROLE` + `LS.DEV_MODE` auth persistence unchanged.
- Pre-existing ESLint warning at `export default {...}` (now line 375, shifted from 96) left alone — out of scope per owner instruction.
- No component file touched. No business logic touched.
- Build: clean. No new warnings introduced.

---

## WHAT NOT TO DO

- Do not attempt all sub-WPs in one session
- Do not change business logic while changing visual tokens
- Do not introduce new local T definitions in any new component
- Do not touch StockItemModal.js, ProteaAI.js, PlatformBar.js, 
  supabaseClient.js (LOCKED — LL-061)
- Do not start WP-DS-4 before WP-DS-2 is complete
- Do not start WP-DS-5 before WP-DS-1 through 4 are complete

---

## RELATED DOCUMENTS
- docs/NUAI-AGENT-BIBLE.md — rules and lessons learned
- docs/SESSION-STATE_v239.md — current platform state  
- docs/FEATURE-INVENTORY.md — all 130 features mapped
- docs/VIOLATION_LOG_v1_1.md — what broke before
- docs/PLATFORM-OVERVIEW_v1_0.md — system orientation

---
*WP-DESIGN-SYSTEM v1.0 · NuAi · Created 11 April 2026*
*Next review: start of WP-DS-1 session*

---

## WP-DS-6 — Layout & Container Tokens
**Status:** TOKENS DEFINED — adopt in all new features from this point  
**Prerequisite:** WP-DS-1 complete ✅  
**Added:** 11 April 2026

### The Problem
PageShell defaults to maxWidth=900px centered in the viewport.  
At 1440px screen width this produces 270px dead gutters on each side.  
Container widths are hardcoded at route level — 900 / 1000 / 1200 / 1400 — 
none tokenised, none documented. New features invented values ad-hoc.

### Layout Tokens — Add to tokens.js T object

```js
container: {
  narrow:  900,   // consumer-facing: shop, checkout, account
  default: 1200,  // standard portals: admin, staff
  wide:    1400,  // power portals: HQ, HR, group dashboard
  full:   "100%", // full-bleed: data-heavy tabs needing every pixel
},
page: {
  gutterX:  24,   // horizontal padding inside any container
  gutterY:  40,   // vertical section padding (top of content area)
  sectionGap: 32, // gap between major page sections
  cardGap:  16,   // gap between cards in a grid
},
sidebar: {
  collapsed:  64, // icon-only sidebar width
  expanded:  220, // full sidebar width (current TenantPortal nav)
},
breakpoint: {
  mobile:   768,
  tablet:  1024,
  desktop: 1280,
  wide:    1440,
},
```

### Container Assignment Rules
| Portal | Route | Container | Token |
|---|---|---|---|
| Consumer Shop | /shop | 900px | T.container.narrow |
| Staff Portal | /staff | 1000px | T.container.default (close enough) |
| Admin Dashboard | /admin | 1200px | T.container.default |
| Tenant Portal | /tenant-portal | 1200px | T.container.default ← FIX from undocumented |
| HQ Command Centre | /hq | 1400px | T.container.wide |
| HR Suite | /hr | 1400px | T.container.wide |
| Group Portal (NEW) | /group-portal | 1400px | T.container.wide |

### The Dead Space Fix
TenantPortal's content container is currently undocumented and inconsistent.  
Standard: adopt T.container.default (1200px) for all TenantPortal tab content.  
This recovers ~150px of dead space per side at 1440px screen width.  
Do NOT migrate existing tabs now — adopt on new features, fix in WP-DS-2 continuation.

### Rules
- All new features MUST declare their container token in their WP spec
- Never hardcode a pixel width that matches a container token — import T
- Group Portal uses T.container.wide (1400px) — same as HQ
- Full-bleed tabs (large data tables, stock grids) may use T.container.full
- Page gutter T.page.gutterX (24px) always applied — never 0 except noPadding
- Card grids use T.page.cardGap (16px) as gap — never ad-hoc margins between cards

### Also add to tokens.js under the existing T export:
These tokens go AFTER the existing spacing/radius/shadow/z sections.
Use the same export pattern — additive, no existing tokens removed.

### Dead Space Recording (for future UX audit — LL-238)
LL-238: The 900px default PageShell container creates 270px dead gutters  
at 1440px. This is a known UX deficiency. Fixing it for existing pages  
is WP-DS-2 continuation scope. All NEW features use T.container tokens  
from this point. A full container-width audit of existing pages is  
scheduled as WP-DS-6 Phase 2 (future session).
