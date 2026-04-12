# WP-UNIFY v1.0 — Design System Unification
## NuAi Platform · Permanent Reference Document
## Produced: 13 April 2026 — brainstorm session with George Fivaz
## Status: ACTIVE — governs every build session going forward
## This file is NEVER replaced. Append date-stamped updates below the body.

---

## WHY THIS DOCUMENT EXISTS

On 13 April 2026, after completing WP-DS-6 (Phases 1-4), the owner reviewed
the platform side by side — the new Group Portal against the older HQ stock
and production tabs. The contrast was immediate and stark.

The Group Portal looked like a Series A product.
The older components looked like a capable internal tool.

Same codebase. Same data. Completely different perceived quality.

This document records the full analysis of why that gap exists, the human
research that explains why it matters, and the governing rules that prevent
it from growing wider.

Every agent starting a new session MUST read this document after reading
PLATFORM-OVERVIEW and NUAI-AGENT-BIBLE. The rules here are not stylistic
preferences. They are grounded in peer-reviewed research on human cognition,
visual trust, and enterprise software decision-making.

---

## PART 1 — THE HUMAN NEUROSCIENCE

### The 50-millisecond verdict (Lindgaard et al., 2006)

Humans form a stable aesthetic judgment of a digital interface in approximately
50 milliseconds — before any content is read, before any button is clicked.
This judgment is not superficial. It anchors every subsequent interaction.

A CA opens NuAi. In the time it takes to blink, their brain has already filed
it as either "enterprise-grade" or "work in progress." Everything after that
is confirmation or contradiction of that first verdict.

The current state: Group Portal and Tenant Portal shell -> "enterprise-grade."
HQStock sub-tabs, Batch Management, older HQ components -> "capable but unfinished."

A product that is polished in some places and rough in others is MORE damaging
than one that is uniformly rough. Uniformly rough reads as "early stage."
Polished-in-parts reads as "the rough parts aren't important to them."

### The Aesthetic-Usability Effect (Kurosu & Kashimura, CHI 1995)

Users consistently rate more aesthetically coherent interfaces as easier to use,
even when task completion times are identical.

NuAi's AVCO calculations are correct. The dispensing log is Schedule-6 compliant.
The VAT pipeline is automated. But if the container those numbers live in looks
inconsistent, users will trust the numbers less. This is documented, replicated
human psychology. The container affects the perceived credibility of the content.

In a business rescue context: a CA presenting NuAi's P&L to a distressed
company's board is staking their professional reputation on the quality of
the data. If the interface looks inconsistent, the CA hesitates. That hesitation
is the sale not closing.

### Cognitive Load Theory (Sweller, 1988 — widely replicated)

Working memory has a hard ceiling — approximately 7 items (Miller's Law, 1956).
Every visual inconsistency a user encounters forces their brain to spend working
memory resolving the question "what does this difference mean?" — resources
borrowed from the actual task.

In NuAi's case, the task is understanding a business's financial position.
Every time the border style changes, or the font weight jumps unexpectedly,
or the table header looks nothing like the last table header, the user is paying
a cognitive tax that has nothing to do with understanding the business.

Without a unified design system, every time a developer needs a button, they
code a new one. After several years, you have dozens of different button types.
Every time the user encounters a difference, they hesitate subconsciously.

### Dopamine and Completion Signals

Research into dopamine response in digital interfaces shows that well-timed
completion signals — a green checkmark, a specific number rendered cleanly —
produce a small neurochemical reward that makes users associate the product
with accomplishment.

NuAi already has these moments — the balance sheet equation badge, the AVCO
trigger confirmation, the AI drawer streaming analysis. But their impact is
diluted when they appear inside an inconsistent visual environment. The
signal-to-noise ratio is wrong.

---

## PART 2 — TYPOGRAPHY SCIENCE

### Why Inter is correct

Inter was designed specifically for screen UI. It has a large x-height,
open apertures, and excellent legibility at small sizes — ideal for data-dense
interfaces where labels, numbers, and table cells sit at 11-13px.

Sans serif fonts are demonstrably superior for on-screen reading. Research
(Chaparro et al., 2010; Bernard et al., multiple) consistently shows that
sans-serif outperforms serif on screen for data interfaces. Inter is among
the best-performing options available.

### The Jost violation

Jost was chosen for consumer-facing surfaces: the shop, the loyalty portal,
the landing page. It is correct there — it is a warm, brand-appropriate
display font.

Applied to data tables and financial statements, Jost introduces the wrong
register. The brain reads Jost and categorises the content as "marketing
material." It reads Inter and categorises it as "operational data." These
are different trust registers for the same numbers.

RULE: Jost is for consumer pages (/shop, /loyalty, /scan, /account, /welcome).
Inter is for every authenticated portal (HQ, Tenant Portal, Admin, HR, Staff,
Group Portal). No exceptions.

### Weight discipline — the single most visible problem

MIT AgeLab/Clear-IP research (Sawyer et al., HFES 2017) found that font weight
and case significantly affect reading speed and accuracy. Inconsistent weight
usage directly slows information processing.

NuAi's codebase currently uses fontWeight values of 300, 400, 500, 600, 700,
and 800 — six different weights, applied without a governing rule.

THE CORRECT TWO-WEIGHT SYSTEM (used in Group Portal — correct):
  400 — body text, table cells, secondary information, all readable content
  500 — primary labels, active nav items, card titles, emphasis
  600 — section headers that need to stand out, KPI values, critical data
  700 — ONLY for the smallest UI labels (9-10px uppercase) where weight
         compensates for size

NEVER use 300, 800, or inconsistent mixing of 600/700 in the same component.

### The correct type scale for NuAi

All values from T.text in tokens.js. Use only these — nothing else.

  9-10px / weight 600-700 / letter-spacing 0.08-0.12em / uppercase
    -> section group labels, table column headers, stat card labels
    -> the "wayfinding" tier — never used for reading, only for scanning

  12-13px / weight 400-500
    -> table cell body text, secondary information, metadata, timestamps
    -> the "data" tier — readable without effort

  13-14px / weight 500-600
    -> primary labels, active nav items, card titles, form labels
    -> the "emphasis" tier

  15-24px / weight 400-600
    -> KPI numbers, page titles, metric values, stat card figures
    -> the "signal" tier — these are the numbers the user came to see

### Line height and spacing rules

US Web Design System (USWDS) and typography research consensus:
  Body text: minimum 1.5x line height
  Data tables: 1.4x line height minimum
  Headings/labels: 1.2-1.35x line height

Minimum font size anywhere in an authenticated portal: 11px.
The current tokens.js enforces T.text.xs = 11. Honour it — never go below.

---

## PART 3 — COLOUR SCIENCE

### Light mode is correct (confirmed by research)

2025 study (173 participants, Tandfonline): cognitive scores were higher in
light mode compared to dark mode. Younger adults performed significantly better
in light mode.

NuAi's T.bg = "#f8f9fa" (near-white, not pure white) is correct. The slight
warmth reduces eye strain compared to pure white while maintaining the cognitive
performance advantages of high contrast text-on-light.

This is NOT up for re-evaluation. Light mode first. Always.

### The forest green brand — why it works

Deep greens carry financial trust associations (currency, growth, stability)
without the ubiquity of navy blue. In a room of blue-dominant ERP competitors,
NuAi's green (#2D6A4F) is immediately distinctive while remaining credible.

B2B colour research: "Financial services brands typically use blues, deep greens,
and golds to convey stability, prosperity, and established authority. Clients
entrusting their financial data need visual reassurance of reliability."
(Funictech B2B Colour Psychology, 2025)

The green is correct. The problem is fragmentation — it appears in at least
6 different hex values across the codebase. Everything must collapse into
the token system's defined ramp.

### Colour fragmentation — the green hex problem

WRONG (all of these exist in the codebase):
  #1A3D2B, #1b4332, #2D6A4F, #2d6a4f, #166534, #40916c

RIGHT (tokens.js defines exactly):
  T.accent      = "#2d6a4f"   <- primary green
  T.accentMid   = "#40916c"   <- mid green
  T.accentLight = "#d8f3dc"   <- light green background
  T.accentText  = "#1b4332"   <- text on light green

RULE: Never hardcode a green hex value. Always use T.accent, T.accentMid,
T.accentLight, or T.accentText. If the component needs TenantPortal-style
local tokens, use pAccent/pAccentMid/pAccentLit (Phase 3 pattern).

### Semantic colour discipline

The brain reads colour before it reads text. If red means different things
in different parts of the same interface, the signal is corrupted.

Research (2025 colour psychology studies): "High-contrast, clashing colour
combinations create decision paralysis in commercial contexts. Cognitive load
increases and trust decreases when colour fails to carry consistent semantic
meaning."

MANDATORY SEMANTIC COLOUR RULES:
  Red   -> danger, overdue, critical, error         -> T.danger (#c0392b) ONLY
  Amber -> warning, due soon, low stock, caution    -> T.warning (#e67e22) ONLY
  Green -> success, healthy, filed, complete        -> T.success (#27ae60) ONLY
  Blue  -> information, neutral alert, dispensary   -> T.info (#2980b9) ONLY
  Grey  -> inactive, disabled, placeholder          -> T.neutral (#6c757d) ONLY

Never mix these. Never use a custom hex for a semantic moment.

### Contrast ratios — WCAG AA compliance

Minimum 4.5:1 contrast ratio for normal text. 3:1 for large text.
T.ink300 (#999999) on white = ~2.85:1. This FAILS WCAG AA.

RULE: Never use T.ink300 or lighter for body text or data values.
T.ink300 is permitted only for placeholder text inside input fields.
Minimum for readable text: T.ink600 (#6c757d) — contrast 4.6:1 on white.

### Border weight — the 0.5px difference

Group Portal uses: border: 0.5px solid var(--color-border-tertiary)
Older components use: border: 1px solid #E2E2E2 (or various equivalents)

On modern Retina displays (standard for any MacBook or recent PC), 1px borders
are visually heavy. 0.5px borders feel refined and lightweight.

RULE: All card borders and table borders in new or migrated components must use:
  border: `1px solid ${T.border}`  (for standard borders — T.border = #dee2e6)
This renders at 0.5px on Retina. Do NOT use rgba() or custom hex border colours.

---

## PART 4 — SPACING AND GRID

### The 8pt grid (industry standard, research-backed)

8pt spatial system: all spacing values must be multiples of 4 (4, 8, 12, 16,
20, 24, 32, 40, 48, 64). This is the system defined in tokens.js.

Research: "An 8pt linear scale reduces confusion while being easy to implement.
Choosing a smaller base unit opens you to too many variables in your system."
(DesignSystems.com, Spacing, Grids and Layouts)

All T.space, T.gap, T.pad, T.inset values in tokens.js are 8pt-derived.
Use them. Never use arbitrary values like padding: "10px 12px 7px" or
marginBottom: "14px". Map to nearest token.

### Density — the correct enterprise trade-off

Consumer apps (Spotify, Instagram): generous whitespace, browsing experience.
Enterprise dashboards (Linear, Stripe, Datadog): information density, task focus.

"The strongest dashboard pattern combines sidebar navigation, a card-based
metric strip (4-6 KPIs), and a flexible content grid. Prioritise information
density over whitespace — dashboard users are power users who want data,
not breathing room." (Dashboard Design Patterns, 2026)

NuAi's users are power users. The Group Portal's card density is correct.
The distinction between "efficient density" and "cramped density":
  Efficient: consistent row height + consistent cell padding + clean header
  Cramped: arbitrary spacing + heavy borders + mixed font weights

### Table standards — what every table must look like

COLUMN HEADERS:
  fontSize: T.text.xs (11px)
  fontWeight: T.weight.semibold (600) or T.weight.bold (700)
  letterSpacing: "0.1em"
  textTransform: "uppercase"
  color: T.ink600
  borderBottom: `2px solid ${T.border}`
  padding: "10px 12px"

TABLE ROWS:
  padding: "10px 12px" (T.inset.tight = 8px for compact, 12px for standard)
  borderBottom: `1px solid ${T.bg}` (barely visible separator)
  fontSize: T.text.base (14px) or T.text.sm (12px) for secondary data
  color: T.ink900 for primary data, T.ink600 for secondary

NEVER use thick borders between rows. NEVER use alternating background colours
(zebra striping) except in very dense data contexts where it aids tracking.

---

## PART 5 — THE FULL BLAST ZONE AUDIT

### What WP-DS-6 actually did vs what remains

WP-DS-6 (Phases 1-4) fixed the SHELL — the navigation layers, layout
containers, AINSBar, and profile tokens on the sidebar. This is the part
users see when they open a portal. It is important and correct.

WP-DS-6 did NOT touch the CONTENT — the actual tab components that render
when a user clicks any nav item. Every tab component remains pre-token.

This means the correct mental model is:
  WP-DS-6: painted the house exterior — clean, professional, correct.
  WP-UNIFY: paints the interior — every room, every wall, same paint.

The interior has approximately 90 components still to migrate.

### THE COMPLETE INVENTORY — ALL PORTALS

**What is DONE (built inside T from the start or migrated):**

  src/styles/tokens.js                   -- source of truth, complete
  src/contexts/TokenContext.js            -- Phase 3, complete
  src/components/shared/AINSBar.js        -- Phase 2, complete
  src/pages/HQDashboard.js               -- Phase 1 shell, complete
  src/pages/TenantPortal.js              -- Phase 3 shell, complete
  src/hooks/useBadges.js                  -- Phase 4, complete
  src/components/shared/ (all group/)    -- built inside T, complete
    GroupPortal.js, NetworkDashboard.js, GroupTransfer.js,
    GroupSettings.js, StoreComparison.js, CombinedPL.js,
    RevenueIntelligence.js, StockIntelligence.js,
    CustomerIntelligence.js, NetworkIntelligence.js

**BLAST ZONE — src/components/hq/ (75 files, all pre-token)**

HQ TAB CONTENT (41 tabs):

  Priority 1 — CA sees in demo (migrate before 12 May):
  HQOverview.js         114KB   Local C tokens, first screen CA sees
  HQStock.js            205KB   PROTECTED (RULE 0L), 7 sub-tabs, local tokens
  HQProfitLoss.js       120KB   Local tokens, P&L is core demo path
  HQBalanceSheet.js      61KB   Local tokens, demo path
  HQDocuments.js        102KB   Local tokens, Smart Capture demo path
  ExpenseManager.js      57KB   Local tokens, demo path

  Priority 2 — Migrate sessions 1-5 post-demo:
  HQAnalytics.js        105KB   Local tokens, 6 sub-tabs
  HQTradingDashboard.js  71KB   Local tokens
  HQFraud.js             92KB   Local tokens, security module
  HQLoyalty.js          149KB   Local tokens, 10 tabs
  HQVat.js               46KB   Local tokens
  HQBankRecon.js         24KB   Local tokens
  HQFixedAssets.js       30KB   Local tokens
  HQJournals.js          40KB   Local tokens
  HQForecast.js          28KB   Local tokens
  HQYearEnd.js           19KB   Local tokens
  HQInvoices.js          63KB   Local tokens
  HQPricing.js           68KB   Local tokens
  HQMedical.js           94KB   Local tokens (has local const T)
  HQTenants.js           64KB   Local tokens (recently touched, still local T)
  HQEmailLogs.js         13KB   Local tokens
  HQFinancialNotes.js    14KB   Local tokens
  HQFinancialSetup.js    19KB   Local tokens
  HQFinancialStatements  43KB   Local tokens
  HQWholesaleOrders.js   64KB   Local tokens
  HQReorderScoring.js    52KB   Local tokens
  HQSmartCapture.js      40KB   Local tokens
  GeoAnalyticsDashboard  38KB   Local tokens
  RetailerHealth.js      58KB   Local tokens
  ShopManager.js         26KB   Local tokens
  Distribution.js        67KB   Local tokens
  SupplyChain.js         13KB   Local tokens
  HQTransfer.js          62KB   Local tokens
  EODCashUp.js           42KB   Local tokens
  POSScreen.js           49KB   Local tokens
  HQSuppliers.js         79KB   Local tokens
  HQPurchaseOrders.js   119KB   Local tokens

  Priority 3 — PROTECTED or F&B only (read special rules first):
  HQCogs.js             144KB   PROTECTED, LL-233: read in full first
  HQProduction.js       307KB   LARGEST FILE, read in full, plan carefully
  SmartInventory.js     180KB   Local C tokens, complex multi-view
  HQFoodIngredients.js  158KB   F&B profile only, local tokens
  HQRecipeEngine.js      73KB   F&B profile only, local tokens
  HQHaccp.js             84KB   F&B profile only, local tokens
  HQFoodSafety.js        44KB   F&B profile only, local tokens
  HQNutritionLabel.js    41KB   F&B profile only, local tokens
  HQColdChain.js         44KB   F&B profile only, local tokens
  HQRecall.js            60KB   F&B profile only, local tokens
  HQFoodIntelligence.js  45KB   F&B profile only, local tokens

  Stock sub-panel components (inside HQStock, migrate WITH HQStock):
  StockAIAnalysis.js, StockChannelPanel.js, StockIntelPanel.js,
  StockItemPanel.js, StockPricingPanel.js, StockReceiveModal.js,
  StockReceiveHistoryPanel.js, StockOpeningCalibration.js

  Other hq/ components:
  CannabisDetailView.js, LiveFXBar.js (PROTECTED), ProductWorlds.js,
  ReorderPanel.js, TenantSetupWizard.js

HR SUITE (14 modules, all in src/components/hq/, all pre-token):
  HRTimesheets.js, HRLeave.js, HRRoster.js, HRCalendar.js,
  HRStaffDirectory.js, HRStaffProfile.js, HRContracts.js,
  HRDisciplinary.js, HRComms.js, HRLoans.js, HRPayroll.js,
  HRPerformance.js, HRSettings.js, HRStockView.js

**Admin Portal:** AdminDashboard.js, AdminQRCodes.js,
  AdminCustomerEngagement.js, AdminCommsCenter.js

**Staff Portal:** StaffPortal.js

**Consumer pages (different register, lowest priority):**
  Shop.js, Loyalty.js, Account.js, CheckoutPage.js

### TOTAL SCOPE SUMMARY

| Zone | Files | Approx KB | Priority |
|---|---|---|---|
| HQ tab content | 41 | ~2,800 | P1-P3 |
| HQ sub-panels | 8 | ~350 | P3 (with HQStock) |
| HQ other | 5 | ~215 | P3-P4 |
| HR suite | 14 | ~720 | P4 |
| Admin portal | 4 | ~170 | P4 |
| Staff portal | 1 | ~39 | P5 |
| Consumer pages | 4+ | ~350 | P5 (different register) |
| **TOTAL** | **~77** | **~4,600** | — |

At one component per session (UNIFY-2 migrate-on-touch strategy), this
takes approximately 20-25 sessions to complete.

### Cross-cutting blast zones (affect everything)

1. BUTTON INCONSISTENCY — at least 8 different button implementations.
   Must converge on: padding T.pad.sm/T.pad.md, borderRadius T.radius.md,
   background T.accent for primary, T.surface with T.border for outline.

2. TABLE HEADER INCONSISTENCY — see Table standards above. Apply uniformly.

3. CARD BORDER INCONSISTENCY — must be: border: `1px solid ${T.border}`
   borderRadius: T.radius.lg (12px) for cards, T.radius.md (8px) for inputs.

4. RADIUS INCONSISTENCY — values 2,3,4,5,6,8,10,12,20,9999 all exist.
   Must be: T.radius.sm=4, T.radius.md=8, T.radius.lg=12, T.radius.full=9999.

5. MODAL/DRAWER INCONSISTENCY — all modals must use identical structure:
   padding T.inset.modal (24px), header with borderBottom T.border,
   close button T.ink600, footer with borderTop T.border.

6. FONT FAMILY — Jost must not appear in any authenticated portal component.
   Every authenticated route uses T.font (Inter).

---

## PART 6 — MARKET LEADER ANALYSIS

### Linear — the constraint standard

Linear uses exactly: 2 neutral colours, 1 accent (purple), 3 semantic colours.
One font. Two weights (400, 600). Strict 8pt grid. No 700 weight anywhere in UI.
Result: every screen feels designed in the same room on the same day.
Lesson: CONSTRAINT IS THE PREREQUISITE FOR QUALITY.

### Stripe — the financial data standard

Stripe uses 0.5px borders (not 1px) on Retina displays. Strict 3-tier number
hierarchy: large KPI, medium secondary, small metadata. Every table: identical
row height (44px), identical cell padding (12px horizontal, 8px vertical),
identical header treatment. Financial data reads as reliable because the container
communicates accuracy before the number is parsed.
Lesson: CONSISTENCY CREATES TRUST IN THE DATA, NOT JUST THE INTERFACE.

### Vercel — the density standard

High density and elegance are not mutually exclusive. Vercel's deployment
tables pack enormous data into compact rows without feeling cramped, because
the spacing is precisely consistent.
Lesson: DENSITY + RHYTHM = POWERFUL. DENSITY - RHYTHM = CRAMPED.

### NetSuite Redwood — the migration precedent

NetSuite had exactly NuAi's problem: a product built over 20+ years with
dozens of competing visual grammars. Their Redwood redesign was a 3-year
systematic token migration. Outcome: faster enterprise sales cycles, higher
demo-to-close rates, reduced training costs.
Lesson: THE WORK IS NOT COSMETIC. IT IS COMMERCIAL.

### Salesforce Lightning — the AI integration standard

Salesforce proved that AI embedded in the data surface (not as a bolt-on tool)
is the correct pattern. The CA doesn't want to open a separate AI window.
They want AI intelligence woven into the surface they're already looking at.
NuAi already does this with AINSBar and ProteaAI. The missing piece is that
the data surfaces it lives inside must match its quality.
Lesson: THE AI IS ONLY AS TRUSTWORTHY AS ITS CONTAINER.

---

## PART 7 — THE NUAI DESIGN PERSONALITY

This is the agreed personality for NuAi's authenticated portals.
Every new component must express this. Every migrated component must be
evaluated against it.

**Sophisticated density.**

Information-forward. Every pixel earns its place. The spacing is generous
enough to breathe but tight enough to be serious. Typography is restrained —
two weights (400/500 body, 600/700 labels only), one font (Inter), one scale
(T.text). Colour is disciplined — a single profile accent applied sparingly,
semantic colours applied with rules not whims. Borders are light — T.border,
never heavier. Shadows are minimal — T.shadow.sm at most. The data is the hero.
The container is invisible.

This is the Linear/Stripe register. NOT Notion (too warm, too consumer).
NOT Salesforce legacy (too heavy, too legacy). NOT a generic "dashboard."

The test for every component: does this look like it was built in the same
room as the Group Portal? If not, it needs to be migrated.

---

## PART 8 — THE GOVERNING RULES (WP-UNIFY RULES)

These rules apply to EVERY session from 13 April 2026 onwards.

### UNIFY-1: No new local T definition — ever

Any new component MUST start with:
  import { T } from "../../styles/tokens";  (adjust path for depth)

A local const T = { ... } or const C = { ... } at module level is a violation.
If Claude Code produces one, stop and fix it before committing.

### UNIFY-2: Migrate on touch

Every time an existing file is opened for any reason (bug fix, feature addition,
data change), the local token object is migrated as part of that same commit.
This does not need its own dedicated session. It travels alongside the actual work.
Over time, every file converges without a dedicated "migration sprint."

### UNIFY-3: Two weights only in new/migrated components

400 for body/data. 500 for primary labels. 600 for section headers and KPIs.
700 ONLY for the smallest (9-10px) uppercase labels where weight compensates
for size. Never 300. Never 800. Never 700 on anything above 11px.

### UNIFY-4: One border style

All card and table borders: border: `1px solid ${T.border}`
All input focus borders: borderColor: T.accent or T.accentMid
Never: rgba(), custom hex, mixed border weights in the same component.

### UNIFY-5: Semantic colour by token only

Red -> T.danger. Amber -> T.warning. Green -> T.success. Blue -> T.info.
Never a custom hex for a semantic moment. Check getSeverityTokens() in tokens.js.

### UNIFY-6: Font is Inter in portals, Jost on consumer pages only

Every authenticated route (/hq, /tenant-portal, /admin, /hr, /staff, /group-portal):
fontFamily: T.font ("'Inter', -apple-system, BlinkMacSystemFont, sans-serif")

Consumer routes (/shop, /loyalty, /scan, /account, /welcome):
fontFamily: "Jost, sans-serif" — kept intentionally separate.

Never use Jost in an authenticated portal component. It reads as "marketing."

### UNIFY-7: Shared components first

When building a pattern that appears in more than one component, build it as a
shared component in src/components/shared/ and import it — do not duplicate
the implementation. Priority shared components to build:

  SharedDataTable.js  — table header + rows + empty state + loading state
  SharedStatCard.js   — KPI card: label, value, delta, optional sparkline
  SharedBadge.js      — severity pill: danger/warning/success/info/neutral
  SharedSectionHeader.js — section title + subtitle + optional action slot
  SharedTabBar.js     — tab row with active indicator and optional count badge
  SharedModalShell.js — modal wrapper: header, body, footer, close button
  SharedEmptyState.js — icon + title + body + optional CTA

### UNIFY-8: The demo path is inviolable

Before 12 May 2026, the components a CA sees in the demo (Tier 1 above)
must match the Group Portal standard. Nothing ships to the demo path that
does not pass the "same room" test.

---

## PART 9 — THE MIGRATION PATTERN (what Claude Code does)

When any Tier 1 or Tier 2 component is opened in Claude Code:

STEP 1: Find the local token definition at module level.
  Look for: const T = {...}, const C = {...}, const STYLES = {...}, sBtn(), sCard()
  These are the blast markers. Every one of them is a violation.

STEP 2: Read the full file. Understand what the component does.
  Do not make any changes until you understand what you're migrating.

STEP 3: Add the import.
  import { T } from "../../styles/tokens";  (adjust path)

STEP 4: Map local values to T equivalents.
  fontWeight: 700 on a section label -> T.weight.semibold (600) or T.weight.bold (700)
  fontWeight: 700 on body text -> T.weight.medium (500)
  borderRadius: 6 -> T.radius.md (8) — use nearest
  color: "#991B1B" -> T.dangerText
  color: "#1b4332" -> T.accentText
  background: "#FEF2F2" -> T.dangerLight
  fontSize: 9 -> T.text.xs (11) — NEVER go below T.text.xs
  fontSize: 13 -> T.text.base (14)
  padding: "20px" -> T.inset.card (16px) or T.pad.xl (24px)

STEP 5: Remove the local token definition.

STEP 6: Verify the component still compiles and renders correctly.

STEP 7: Commit with message format:
  "refactor(UNIFY): migrate [ComponentName].js to tokens.js — [brief note]"

---

## PART 10 — WHAT THE END STATE LOOKS LIKE

When WP-UNIFY is complete, every authenticated screen in NuAi will:

1. Use Inter at the correct weights from the T.text scale
2. Have borders that render at 0.5px on Retina (T.border)
3. Use semantic colours exclusively from the T token ramp
4. Have table headers that look identical to Group Portal table headers
5. Have stat cards that look identical to Group Portal stat cards
6. Have the same modal structure everywhere
7. Have a sidebar active state that uses T.accentLight / T.accentText

When the CA opens any tab in any portal, their brain will not have to resolve
a visual inconsistency. The cognitive budget that was spent on "what does this
difference mean?" will be spent on "what does this data mean?"

That is the goal. Not beauty for its own sake. Clarity in service of trust.
Trust in service of the deal.

---

## THE ONE-SENTENCE VERSION

The Group Portal looks the way it does because it was built inside the design
system. Everything else looks the way it does because the design system didn't
exist when it was built. The path forward is to bring everything inside the
system — starting with what the CA sees on 12 May, then everything else
methodically, one component per session, until there is no screen in NuAi
that doesn't feel like it was designed in the same room on the same day.

---

## STATUS TABLE (update on every migration commit)

| Component | Status | Commit | Date |
|---|---|---|---|
| tokens.js | COMPLETE — source of truth | WP-DS-1 | 11 Apr 2026 |
| TokenContext.js | COMPLETE — provider + hook | 1c2d51e | 13 Apr 2026 |
| TenantPortal.js shell | COMPLETE — pAccent/pAccentMid/pAccentLit | 1c2d51e | 13 Apr 2026 |
| AINSBar.js | COMPLETE — profileOverrides, T tokens | 1c2d51e | 13 Apr 2026 |
| HQDashboard.js | COMPLETE — WP-DS-6 Phase 1 | cf9241e | 13 Apr 2026 |
| GroupPortal.js + all group/ | COMPLETE — built inside T from start | various | Apr 2026 |
| **P1: ALL COMPLETE (13 Apr 2026)** | | | |
| HQOverview.js | COMPLETE | dbb3e95 | 13 Apr 2026 |
| HQStock.js + 8 sub-panels | COMPLETE | 8b3ef58 | 13 Apr 2026 |
| HQProfitLoss.js | COMPLETE | cb6e625 | 13 Apr 2026 |
| HQBalanceSheet.js | COMPLETE | fc49b07 | 13 Apr 2026 |
| HQDocuments.js | COMPLETE | 42402b0 | 13 Apr 2026 |
| ExpenseManager.js | COMPLETE | b04fc7e | 13 Apr 2026 |
| **P2: Post-demo sessions 1-5** | | | |
| HQAnalytics.js | COMPLETE | fe241e6 | 13 Apr 2026 |
| HQTradingDashboard.js | COMPLETE | 7395330 | 13 Apr 2026 |
| HQFraud.js | NOT STARTED | — | — |
| HQLoyalty.js (10 tabs) | NOT STARTED | — | — |
| HQVat.js | NOT STARTED | — | — |
| + 23 more P2 files | NOT STARTED | — | — |
| **P3: Protected + large + F&B** | | | |
| HQCogs.js (PROTECTED) | NOT STARTED | — | — |
| HQProduction.js (307KB) | NOT STARTED | — | — |
| SmartInventory.js (180KB) | NOT STARTED | — | — |
| + 18 more P3 files | NOT STARTED | — | — |
| **P4: HR Suite + Admin + Staff** | | | |
| 14 HR modules + 4 Admin + 1 Staff | NOT STARTED | — | — |
| **P5: Consumer pages** | | | |
| Shop.js + Loyalty.js + Account.js + CheckoutPage.js | NOT STARTED | — | — |

---
*WP-UNIFY v1.0 · NuAi · 13 April 2026*
*Produced from brainstorm session with George Fivaz*
*Research sources: Lindgaard 2006, Kurosu & Kashimura 1995, Sweller 1988,*
*Miller 1956, Sawyer et al. 2017, Chaparro et al. 2010, USWDS typography,*
*Funictech B2B Colour 2025, Dashboard Design Patterns 2026, NN/g 2021*
*All future agents: this document survives you. Read it before touching any UI.*
