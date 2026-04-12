# WP-DS-6 PHASE 2 — UNIFIED SHELL, AINS BAR & AMBIENT INTELLIGENCE LAYER
## NuAi Platform Design System — Pivotal Session Document
## Produced: 13 April 2026
## Status: READY FOR EXECUTION
## Author: Claude.ai + George Fivaz (brainstorm session 13 Apr 2026)

---

## SURVIVAL RULE FOR EVERY AGENT READING THIS

This document is permanent. It does not get replaced. It gets appended.
Every agent starting work on this WP must read:
1. docs/WP-DESIGN-SYSTEM.md (DS-1 through DS-5 context)
2. This document in full
3. docs/SESSION-STATE (current version)
4. src/App.js (the shell layout lives here)
5. src/pages/HQDashboard.js (the HQ content shell — no sidebar, local C tokens)
6. src/pages/TenantPortal.js (the reference — this is done right)

Do not start any phase without reading all six. This WP touches the structural
frame that every user sees on every page. A wrong change here breaks all portals.

---

## WHY THIS WP EXISTS — THE STRATEGIC MOMENT

This brainstorm session (13 April 2026) identified a pivotal convergence:

1. NetSuite just launched "NetSuite Next" — an AI-first ERP interface where
   the AI assistant ("Ask Oracle") is embedded in the global search bar,
   context-aware per tab, persistent across all pages. This is the direction
   the entire ERP industry is moving.

2. NuAi already has ProteaAI (ai-copilot EF v59) with context-aware
   pre-suggested questions per tab and systemOverride capability. We are
   ahead of NetSuite on the intelligence layer. We are behind on the
   SURFACE — the visible shell that delivers that intelligence.

3. The CA demo is 4 weeks away. The gap between what NuAi's intelligence
   can do and what a CA sees when they open the platform is the gap between
   winning and losing that meeting.

This WP closes that gap. It is not a cosmetic exercise. It is the
difference between a demo that says "we have AI" and one that SHOWS
intelligence woven into every surface the user touches.

---

## WHAT THE CODEBASE AUDIT FOUND (13 April 2026)

### HQDashboard.js — Critical Findings

File: src/pages/HQDashboard.js (13,628 bytes, read in full)

FINDING 1 — No shell layout. HQDashboard.js renders content directly.
The sidebar nav lives in App.js. HQDashboard.js has no awareness of
sidebar width. Content is rendered into whatever container App.js provides.
The gap is an App.js shell problem, not a per-tab problem.

FINDING 2 — Local C tokens still in use. Line 61-72 defines:
  const C = { bg: "#faf9f6", ... fontFamily: "Jost, sans-serif" }
HQDashboard.js uses the deprecated C token system and Jost font.
This is WP-DS-2 Priority 4 scope — migrate to T tokens and Inter font.

FINDING 3 — PlatformBar and LiveFXBar are rendered inside the content area,
not in a persistent shell position. This means they re-mount on every tab
switch, which causes visual flicker and re-fetch.

FINDING 4 — No AINS bar in HQ. The ProteaAI contextual bar visible on
the Tenant Portal does not appear on HQ at all. Power users (HQ operators)
have no persistent AI surface.

### TenantPortal.js — Reference Pattern (What's Done Right)

TenantPortal.js (58,841 bytes) — the Tenant Portal renders correctly because:
- Sidebar is part of a flex layout: sidebar (220px fixed) + content (flex: 1)
- Content area fills remaining space after sidebar — no dead gutters
- ProteaAI bar is present and context-aware per tab
- Uses T tokens (newer build)

This is the reference pattern for the fix. App.js shell for HQ must mirror
TenantPortal.js's flex layout approach.

### The Gap — Exact Pixel Analysis (from screenshots at 100% zoom, ~1440px screen)

HQ Portal:
- Sidebar (collapsed icon-only): ~50px
- Content left edge: ~230px
- Dead space left: ~180px
- Content right edge: ~1250px
- Viewport right: ~1456px
- Dead space right: ~206px
- Root cause: content container uses max-width + margin: auto centered
  on FULL viewport, not on remaining space after sidebar

Tenant Portal:
- Sidebar (expanded): ~220px
- Content starts at: ~270px (24px padding after sidebar)
- Right side gap: minor (~50px to scrollbar)
- Root cause: correct flex layout, minor right padding issue only

---

## FUTURE AGENT MEMORY — IDEAS TO PRESERVE

The following concepts were identified in the 13 April 2026 brainstorm as
STRATEGIC FUTURES. They are not in scope for this WP but must never be lost.
Every future agent starting a new design session should read this section.

### FUTURE-1: Canvas Intelligence (inspired by NetSuite Next Canvases)
What NetSuite is building: rich collaborative spaces where AI outputs narrative
summaries, analyses, comparisons, plans, and visualisations alongside live data.
What NuAi could do: a "Canvas" mode on any P&L, Balance Sheet, or Dispensing Log
tab where ProteaAI generates a narrative analysis of the current view — "Here is
what is happening in your business this month, here is why it matters, here is
what to do" — rendered as a formatted document alongside the data. The CA demo
would close with this. Codename: WP-CANVAS.

### FUTURE-2: Command Palette (Cmd+K)
The most non-obvious power feature that no ERP has shipped. Linear, Vercel,
Stripe, Notion all have it. Press Cmd+K from anywhere — a modal appears — type any
tab name, tenant name, or action — navigate instantly. For a 41-tab HQ with
multi-tenant switching, this is a 10x productivity improvement. No menu scanning.
No sidebar hunting. Codename: WP-KPALETTE. Prerequisite: shell unification.

### FUTURE-3: Intelligent Context Breadcrumb
Current breadcrumbs are navigation only: Home > Intelligence > P&L.
Next level: clicking "Intelligence" opens a mini-panel showing all Intelligence
signals for the current tenant. The breadcrumb becomes a live data surface, not
just wayfinding. NetSuite's Redwood design system does this. Low implementation
cost, very high perceived intelligence. Codename: WP-BREADCRUMB-INTEL.

### FUTURE-4: Ambient Emotional State Tokens (WP-PULSE / WP-DS-5)
When all KPIs are green: interface shifts subtly warmer.
When critical alerts exist: interface shifts cooler and more urgent.
Not dramatic. Ambient. The platform breathes. Users feel it without seeing it.
This is WP-DS-5 scope — prerequisite is shell unification (this WP).

### FUTURE-5: Density Modes
Three modes: compact (HQ operators, power users), default (managers),
comfortable (staff, touchscreen). Token-level implementation — T.density drives
padding, font-size, line-height across all components. No animation required.
This is WP-DS-5 / WP-DS-4 scope.

### FUTURE-6: Persona-Driven AI (inspired by NetSuite's direction)
NetSuite is building agents configured as role-bound digital workers with
defined instructions, permissions, and policy awareness. NuAi already has
systemOverride in ai-copilot EF. The next step: per-role prompt templates
stored in a new table (role_ai_context) that feed systemOverride automatically
based on the user's role. A pharmacist's ProteaAI knows SAHPRA. A CA's ProteaAI
knows rescue signals. A store manager's ProteaAI knows stock velocity.
No code change to the edge function needed. Codename: WP-PERSONA-AI.

---

## THE WORK PACKAGE — 4 PHASES, SEQUENCED

Each phase is independently shippable. Each phase is one Claude Code session.
No phase may be attempted without reading the six documents listed at the top.

---

## PHASE 1 — SHELL UNIFICATION (THE GAP FIX)
**Priority: CRITICAL — Do this first**
**Estimated session: 1 Claude Code session**
**Risk: HIGH — touches App.js which wraps all routes**
**Files: App.js (read in full before touching), HQDashboard.js**
**Demo value: Immediate — fixes the first impression problem**

### The Problem
App.js wraps all portal routes with a layout shell. For the HQ portal,
the sidebar is rendered by App.js but the content container inside HQDashboard.js
is not flex-aware. Content centers in the full viewport instead of filling
the remaining space after the sidebar.

### The Fix Pattern (from TenantPortal.js — already correct)
```
Outer shell: display: flex, flexDirection: row, height: 100vh
Sidebar: width: 220px (expanded) or 64px (collapsed), flexShrink: 0
Content area: flex: 1, overflow: auto, padding: T.page.gutterX
```

The content area NEVER has maxWidth + margin: auto.
maxWidth is only applied INSIDE the content area on a content wrapper,
and it uses T.container.wide (1400px) for HQ, T.container.default (1200px) for
Tenant Portal, not centered on the full viewport.

### Step-by-step for Claude Code

Step 1: Read App.js in full. Find where the sidebar and content area are
rendered for the /hq route. Identify the exact layout div structure.

Step 2: Read TenantPortal.js in full. Note the sidebar + content flex pattern.
This is the reference. The HQ layout must match this pattern.

Step 3: In App.js, for the /hq route:
- Set the outer wrapper: display: flex, flexDirection: row, minHeight: 100vh
- Set the sidebar wrapper: flexShrink: 0, width: sidebarExpanded ? 220 : 64
- Set the content wrapper: flex: 1, minWidth: 0, overflowX: hidden

Step 4: Inside HQDashboard.js, add an inner content container:
```javascript
<div style={{
  maxWidth: T.container.wide,  // 1400px
  margin: '0 auto',
  padding: `0 ${T.page.gutterX}px`,
}}>
  {/* all existing content */}
</div>
```
This centers the content WITHIN the available space, not within the full viewport.

Step 5: Migrate HQDashboard.js local C tokens to T import.
Replace: const C = { ... } and fontFamily: "Jost, sans-serif"
With: import { T } from "../styles/tokens"; and fontFamily: T.font

Step 6: Move LiveFXBar and PlatformBar OUT of the tab content area and
INTO the shell, above the content wrapper. They should persist across tab
switches without remounting.

Step 7: Verify in browser at 1440px — content should now fill edge to edge
after the sidebar with T.page.gutterX (24px) padding on each side.

### Browser Verification Checklist — Phase 1
- [ ] HQ: no dead space left of content at 1440px width
- [ ] HQ: no dead space right of content at 1440px width
- [ ] HQ: sidebar collapse — content expands to fill recovered space
- [ ] HQ: LiveFXBar and PlatformBar persist across tab switches (no flicker)
- [ ] HQ: Inter font rendering (not Jost)
- [ ] Tenant Portal: no regression — still renders correctly
- [ ] HR Portal: check for same gap problem, fix if present

### DO NOT TOUCH
- PlatformBar.js (LOCKED — LL-061)
- supabaseClient.js (LOCKED)
- Any business logic in HQ tab components
- TenantPortal.js (already correct — do not change)

---

## PHASE 2 — AINS BAR UNIFICATION
**Priority: HIGH — critical for CA demo**
**Estimated session: 1 Claude Code session**
**Risk: MEDIUM — extends existing ProteaAI, does not rewrite**
**Files: ProteaAI.js (LOCKED — str_replace only), HQDashboard.js, TenantPortal.js**
**Demo value: The moment that closes the deal**

### The Problem
The ProteaAI contextual bar (AINS — Ambient Intelligence Notification System)
is present in the Tenant Portal but absent from HQ. HQ power users have no
persistent AI surface. The chat bubble at the bottom of HQ is a poor substitute.

The vision: a persistent horizontal bar between the LiveFXBar/PlatformBar and
the tab content area. Not a modal. Not a floating bubble. A permanent surface
that always shows:

```
[NuAi AI]  [Current context: P&L — Medi Recreational — cannabis_retail]
[Suggested: "What caused the February margin drop?" | "Flag overdue VAT periods" | "Compare GP vs last month"]
[Search / Ask anything...]  [AD]  [Settings]
```

### What Exists Today
- ProteaAI.js (2,346 lines, LOCKED) — has the full AI chat interface
- ai-copilot EF v59 — routes all queries, supports tool use, systemOverride
- TenantPortal.js — renders a ProteaAI bar that pre-suggests questions per tab
- PlatformBar.js (LOCKED) — renders the notification/alert bar

### The Implementation Pattern
Do NOT modify ProteaAI.js content. Use str_replace only on the CODEBASE_FACTS
string if needed (documented in ProteaAI.js itself).

Create a new component: src/components/shared/AINSBar.js
This component renders the persistent AI bar using the existing ProteaAI
context and ai-copilot edge function. It accepts:
- currentTab: string (which tab is active)
- tenantId: string
- industryProfile: string
- role: "hq" | "tenant" | "admin" | "hr"

It reads a SUGGESTIONS map (defined in the component) that provides
3 pre-suggested questions per tab per role:

```javascript
const SUGGESTIONS = {
  hq: {
    overview: [
      "Which tenant has the highest fraud risk this week?",
      "Compare revenue across all tenants this month",
      "Which store has the most unreconciled bank lines?",
    ],
    pl: [
      "Why is the gross margin below 35% for this tenant?",
      "Show me expenses that are driving cost up",
      "Flag any revenue that can't be verified due to AVCO gaps",
    ],
    // ... one entry per HQ tab
  },
  tenant: {
    pl: [
      "What caused the margin movement this month?",
      "Are there any overdue VAT periods?",
      "Which products have the best and worst margins?",
    ],
    // ... one entry per Tenant Portal tab
  },
}
```

The bar renders 3 clickable suggestion pills. Clicking a suggestion sends it
directly to the ai-copilot edge function and opens the response in a
slide-in drawer (not a full-screen modal). The drawer can be dismissed.

### The Search Integration
The search input in AINSBar replaces the current "Search products, staff,
orders... Ctrl+K" input visible in the Tenant Portal topbar. In Phase 3,
this search input becomes the command palette trigger. For Phase 2, it is
a natural language query input that routes to ai-copilot.

### The Account + Status Area (right side of bar)
Right side of AINSBar shows:
- Alert count badge (from ActionCentre data)
- Current VAT period status (green = filed, amber = due soon, red = overdue)
- AI readiness indicator (green dot = edge function healthy)
- User avatar/initials + logout

This is the "persistent shell-level status strip" identified in the brainstorm.
It is always visible regardless of which tab is active.

### Browser Verification Checklist — Phase 2
- [ ] AINSBar renders on HQ (all tabs) below LiveFXBar/PlatformBar
- [ ] AINSBar renders on Tenant Portal (all tabs) in equivalent position
- [ ] Clicking a suggestion pill fires ai-copilot query
- [ ] Response renders in slide-in drawer, dismissible
- [ ] Alert count badge reflects ActionCentre data
- [ ] VAT period status dot updates based on current tenant's vat_period_filings
- [ ] AI readiness indicator green (edge function reachable)
- [ ] Search input accepts natural language queries
- [ ] No regression on existing ProteaAI full-screen mode

---

## PHASE 3 — PROFILE-AWARE TOKENS (WP-DS-3)
**Priority: HIGH — visible differentiator at CA demo**
**Estimated session: 1 Claude Code session**
**Risk: LOW — additive token layer, no component logic changes**
**Files: src/styles/tokens.js (additive), TenantPortal.js, HQDashboard.js**
**Demo value: The CA sees 4 different-feeling portals, not 4 identical ones**

### The Problem
All 4 industry profiles look identical. Cannabis dispensary = food & beverage
= general retail visually. The profile-aware token system is ALREADY DEFINED
in WP-DESIGN-SYSTEM.md (profileOverrides, getTokens) but never applied.

### The Fix
Apply getTokens(industryProfile) at the portal entry point. Each portal
reads the active tenant's industryProfile and passes the merged token set
to a React Context that all child components consume.

Profile colour assignments (from WP-DS-3 spec):
- cannabis_retail: deep forest green (current default) — no change
- cannabis_dispensary: clinical teal (#0d6efd) — trust language of healthcare
- food_beverage: warm terracotta (#8b4513) — kitchen warmth
- general_retail: confident charcoal (#495057) — clean neutral

Implementation:
1. Create src/contexts/TokenContext.js — provides merged T tokens
2. At TenantPortal.js entry: wrap with TokenContext.Provider,
   value = getTokens(industryProfile)
3. At HQDashboard.js: HQ always uses base T (sees all profiles simultaneously)
4. AINSBar (Phase 2) reads from TokenContext — sidebar accent colour changes
   with profile
5. Sidebar background and accent buttons reflect profile colour

### Browser Verification Checklist — Phase 3
- [ ] Switching to MediCare Dispensary tenant: sidebar accent shifts to clinical teal
- [ ] Switching to Garden Bistro: sidebar accent shifts to warm terracotta
- [ ] Switching to Metro Hardware: sidebar accent shifts to charcoal
- [ ] Medi Recreational: stays forest green (no change)
- [ ] HQ portal: stays base green regardless of viewed tenant
- [ ] No visual regression on any tab content

---

## PHASE 4 — NOTIFICATION BADGES
**Priority: MEDIUM — enhances demo, not critical path**
**Estimated session: 1 Claude Code session**
**Risk: LOW — additive overlay on existing nav**
**Files: TenantPortal.js sidebar nav, HQDashboard.js sidebar nav**
**Demo value: CA sees red numbers in the nav before clicking — rescue signals surface**

### The Problem
Rescue signals exist in the data but are only visible AFTER clicking the
relevant tab. A CA landing on the dashboard sees no indication of distress.
The demo relies on the CA following a scripted path. Notification badges make
distress visible immediately from any starting point.

### The Badge System
Each nav item gets an optional badge (number or dot) based on alert conditions:

```javascript
const BADGE_RULES = {
  vat: (tenant) => {
    const overdueCount = tenant.vatPeriods?.filter(p => p.status === 'overdue').length;
    return overdueCount > 0 ? { count: overdueCount, severity: 'danger' } : null;
  },
  'bank-recon': (tenant) => {
    const unmatched = tenant.bankLines?.filter(l => !l.matched_type).length;
    return unmatched > 0 ? { count: unmatched, severity: 'warning' } : null;
  },
  expenses: (tenant) => {
    const duplicate = tenant.captureQueue?.filter(q => q.is_duplicate).length;
    return duplicate > 0 ? { count: duplicate, severity: 'danger' } : null;
  },
  // ... one rule per rescue-signal tab
}
```

Badge data is fetched once on portal load and cached in a badges context.
Badges update every 60 seconds. Individual tab components are NOT changed.

### The PlatformBar Rule
PlatformBar.js is LOCKED. Notification badge system does NOT touch PlatformBar.
Badges go in the sidebar nav items only. PlatformBar handles system-wide alerts.
These are two separate surfaces with different scopes.

### Browser Verification Checklist — Phase 4
- [ ] MediCare Dispensary: VAT tab shows red badge "2" (overdue periods)
- [ ] MediCare Dispensary: Smart Capture tab shows red badge "1" (duplicate)
- [ ] Metro Hardware: VAT tab shows red badge
- [ ] Metro Hardware: Bank Recon tab shows amber badge with count
- [ ] Badges update on page refresh
- [ ] Clicking a badged tab clears the badge for that session
- [ ] No badge appears when no alerts exist (Garden Bistro clean state)
- [ ] PlatformBar.js: zero changes

---

## PHASE SEQUENCE AND DEPENDENCIES

```
Phase 1 (Shell Fix) -> Phase 2 (AINS Bar) -> Phase 3 (Profile Tokens) -> Phase 4 (Badges)
       |                      |                      |
  Prerequisite           Prerequisite            Prerequisite
  for all others         for Phase 3             for Phase 4
```

Phase 1 must complete before Phase 2 because AINSBar needs to know where
it lives in the layout before it can be built correctly.

Phase 2 must complete before Phase 3 because the AINSBar is the primary
surface where profile accent colours are most visible.

Phase 3 must complete before Phase 4 because badge severity colours
must reference profile-aware tokens, not hardcoded values.

---

## WHAT THIS PRODUCES — THE DEMO EXPERIENCE

When a CA sits down to the NuAi demo after these 4 phases:

1. **They open HQ.** The layout fills the screen edge to edge. No dead gutters.
   Professional. Dense. Like Linear or Stripe. First impression: this is real.

2. **They see the AINS bar.** It says: "3 rescue signals detected across
   your network — VAT overdue, SAHPRA gaps, covenant breach risk."
   The CA didn't ask. The system told them.

3. **They switch to MediCare Dispensary.** The sidebar accent shifts to
   clinical teal. They feel the portal personality change. Medical. Trusted.

4. **They see red badges on VAT and Smart Capture.** They know where to look
   before clicking anything. The platform is showing them the story.

5. **They ask the AINS bar: "Generate a rescue risk summary for this tenant."**
   A drawer opens with a formatted narrative. Revenue stable. COGS unknown.
   SAHPRA exposure. Pharmacist leave liability. Duplicate invoice flag.
   All from live data. Not from a slideshow.

This is not a feature list. This is a moment that closes deals.

---

## RULES FOR THIS WP

- RULE 0Q: NEVER push_files from Claude.ai — Claude Code only
- LL-061: PlatformBar.js is LOCKED — read str_replace rules in NUAI-AGENT-BIBLE
- LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
- LL-238: new features declare their container token in the WP spec
  - AINSBar: T.container.full (full width of shell)
  - Phase 1 HQ content inner wrapper: T.container.wide (1400px)
- LL-221: read the full file before any edit (grep imports, not identifiers)
- NEW-LL-DS-1: Every new component must import T from tokens.js, never define local T
- NEW-LL-DS-2: Shell layout uses flex, not maxWidth+margin:auto on viewport
- NEW-LL-DS-3: AINSBar is a shell component, not a tab component — it never re-mounts on tab switch

---

## STATUS TABLE (update this on every session)

| Phase | Name | Status | Commit | Date |
|---|---|---|---|---|
| Phase 1 | Shell Unification (Gap Fix) | COMPLETE | 2e3aed4 | 13 Apr 2026 |
| Phase 2 | AINS Bar Unification | NOT STARTED | — | — |
| Phase 3 | Profile-Aware Tokens | NOT STARTED | — | — |
| Phase 4 | Notification Badges | NOT STARTED | — | — |

---

## RELATED DOCUMENTS

- docs/WP-DESIGN-SYSTEM.md — DS-1 through DS-5 foundation
- docs/NUAI-AGENT-BIBLE.md — all rules including LL-NEW-5
- docs/SESSION-STATE (current) — HEAD commit and active rules
- docs/PLATFORM-OVERVIEW_v1_0.md — system orientation
- src/pages/TenantPortal.js — reference shell pattern (correct layout)
- src/pages/HQDashboard.js — shell to fix (incorrect layout, local C tokens)
- src/components/PlatformBar.js — LOCKED, do not touch
- src/components/ProteaAI.js — LOCKED, str_replace CODEBASE_FACTS only

---

## BRAINSTORM SESSION NOTES (13 April 2026) — For Future Agents

These are the raw insights that produced this WP. They are here so future agents
understand the thinking, not just the instructions.

The gap between NuAi's capability and what a user sees is the gap between
winning and losing. NetSuite spent $billions arriving at "Ask Oracle embedded
in search." We already have a smarter version of that in ai-copilot EF v59.
The only missing piece is the surface.

The most dangerous thing a competitor can do is ship a beautiful shell around
mediocre intelligence. The most powerful thing NuAi can do is ship a beautiful
shell around the intelligence that's already there.

Linear's lesson: "This part of the redesign isn't something you'll immediately
see but rather something that you'll feel after a few minutes of using the app."
That is the standard. Not features. Feeling.

The command palette (Cmd+K) is not in scope for this WP but it is the next
logical step after shell unification. When the shell is correct and the AINS
bar is live, Cmd+K becomes a one-session addition. It changes how power users
experience the platform — from menu-hunting to intention-first navigation.

The Canvas intelligence concept (FUTURE-1) is the long-term moat. When a CA
presses "Generate rescue analysis" and a formatted IFRS-aware narrative appears
alongside live data — that is the moment nobody can replicate without
understanding every layer of what was built here.

This is a pivotal time. The work is small. The impact is not.

---
*WP-DS-6 Phase 2 v1.0 · NuAi · 13 April 2026*
*Produced in brainstorm session with George Fivaz*
*All future agents: this document survives you. Read it first.*
