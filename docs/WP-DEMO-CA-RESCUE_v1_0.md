# WP-DEMO-CA-RESCUE — Business Rescue CA Demo Specification
## Status: REQUIREMENTS — awaiting gap audit confirmation before build
## Produced: 12 April 2026 · Owner strategic direction session
## Every agent reads this before touching any demo-related code
## Companion: NUAI-STRATEGIC-INTELLIGENCE_v1_0.md (system context)

---

## THE BUSINESS OBJECTIVE

A room of senior Chartered Accountants specialising in business rescue.
These are sophisticated operators who will immediately see through a
staged demo. Every number must be real. Every problem must be specific.
Every alert must be earned by actual data conditions — not hardcoded.

The goal: they leave understanding that NuAi is the operational intelligence
layer their rescue clients are missing. Not accounting software. Not a
dashboard. The system that would have seen the problem coming.

---

## THE DEMO FLOW — STEP BY STEP

### Act 1: Personalised Entry (QR → Wizard → World)

Each CA receives a printed card with a QR code unique to them.

The QR code resolves to a URL that:
- Carries their first name as a URL parameter
- Routes to the tenant setup wizard
- Pre-populates the "Your name" or "Account name" field
- Leaves only two decisions: Business name + Industry type

The wizard asks:
1. "What is your business called?" (they type e.g. "Riverside Dispensary")
2. "What industry?" (4 tiles: Cannabis Retail · Medical Dispensary · Food & Beverage · General Retail)
3. One button: "Launch my business"

On submit:
- A tenant is created under their account
- A pre-configured demo dataset is applied to that tenant automatically
  (the "rescue scenario" for their chosen industry — see Act 2)
- They land in the Tenant Portal for their new business
- The nav bar already has notification badges lit up

This requires:
- A URL scheme: `/setup?name=John&demo=true&session=CA-RESCUE-2026`
- The setup wizard accepting URL params and pre-populating
- A demo seed function that fires on wizard completion for demo sessions
- Session tagging so demo tenants are identifiable

### Act 2: The Business in Distress

Each industry type has a pre-built "rescue scenario" — a specific set of
data conditions that tell a coherent business rescue story.

**Cannabis Retail rescue scenario ("Greenleaf Trading"):**
- Revenue declining 3 months consecutively (sim_pos_sales configured low)
- 18 SKUs with zero AVCO (receiving workflow never completed — margin unknown)
- 6 products with critical restock (selling but not replenishing)
- Dead stock: R45,000 tied up in 22 items untouched for 90+ days
- Loyalty programme: 340 members, 12% active, 88% lapsed
- VAT: 2 months of accrued output VAT not yet submitted
- Gross margin apparent: 52% — but AVCO gaps mean actual margin unknown
- Net position: R-8,200/month operating loss
- Nav badge: ⚠ Finance (VAT) · ⚠ Stock (critical restock) · ⚠ Customers (churn)

**Medical Dispensary rescue scenario ("MediCare Pharmacy"):**
- SAHPRA compliance: 3 Schedule 6 items dispensed without complete prescription records
- Dispensing log: 14 items with quantity_dispensed but no linked patient (orphaned records)
- Revenue: R82,000/month but COGS unknown (weighted_avg_cost missing on 60% of items)
- Licence expiry approaching (surfaced as a compliance alert)
- Staff: 2 employees on timesheets with unresolved leave balance discrepancies
- Nav badge: ⚠ Compliance (SAHPRA) · ⚠ Finance (COGS gap) · ⚠ HR (leave)

**Food & Beverage rescue scenario ("The Garden Bistro"):**
- Recipe cost vs menu price: 4 signature dishes running at negative gross margin
  (food cost > sell price when portion yields are factored in)
- HACCP: 3 overdue temperature log entries (cold chain compliance gap)
- Allergen matrix: 2 menu items missing allergen declarations (R638 exposure)
- Ingredients: meat and poultry categories present but no supplier pricing
  (AVCO gap = food cost unknown on 40% of menu)
- Stock: R12,000 of perishables with last_movement_at > 5 days (cold chain risk)
- Supplier invoices: 3 captured via Smart Capture, 1 flagged as potential duplicate
- Nav badge: ⚠ Compliance (HACCP/R638) · ⚠ Finance (margin) · ⚠ Stock (perishables)

**General Retail rescue scenario ("Metro Hardware"):**
- 47% of inventory has no AVCO (floor stock purchased without proper receiving)
- Margin by category: fasteners at 8% gross (below bank covenant threshold)
- Aged slow-movers: R67,000 in tools untouched for 120+ days
- 6 items selling at a loss (sell_price < weighted_avg_cost)
- Customer loyalty: 0 redemptions in 90 days (1,240 members, 43,800 points unburned)
- QR codes: 12 product authentication QRs generating scan alerts (possible counterfeits)
- Nav badge: ⚠ Stock (loss-making items) · ⚠ Finance (covenant risk) · ⚠ Fraud (QR alerts)

### Act 3: The Navigate-Through

They spend 10-15 minutes in their business. The platform guides them
via the notification badges. They don't need to be told where to look —
the alerts tell them.

Each module surfaces the specific problem for their scenario:
- Finance → Income Statement shows the loss / VAT gap / covenant breach
- Stock → Smart Catalog with dead stock tinted, AVCO missing highlighted
- Compliance → The specific log entries or missing records
- Loyalty → The churn cohort, the unburned points balance
- HR → The leave discrepancy / timesheet gaps
- Smart Capture → The duplicate invoice flag
- ProteaAI → They can ask "What is my biggest problem?" and get a real answer

### Act 4: The Reveal

At the bottom of every page in the demo tenant, a subtle but distinct
element: a "Join the Group" icon or the Franchise Network indicator.

"Your business is part of a group."

They click it. They're taken to the Group Portal.

Every business every CA in the room just created — all different industries,
all different problems — is now visible in the Group Portal as a single
franchise network: "CA Rescue Demo Network."

The Network Intelligence tab loads:
- Alert Centre: combined alerts from every business in the room
  (could be 8-12 businesses with 3-4 alerts each)
- Health Scores: each business scored 0-100, most in the WATCH/CRITICAL band
- Benchmarking Table: all businesses side by side — their relative positions
- Royalty Calculator: the "group" is the CA firm; each business "owes" fees

ProteaAI is open. The facilitator asks:
"Which of these businesses is closest to insolvency and why?"

The AI queries across all their live data and answers with specific figures.

That is the close.

---

## WHAT IS ALREADY BUILT (system assets for the demo)

### Ready to use as-is:
- sign-qr EF v36 + verify-qr EF v34 — QR generation and verification
- Tenant setup wizard — exists, needs URL param extension
- All 4 industry profiles — code complete
- Financial Intelligence Suite — IFRS-compliant, live from actual data
- Smart Capture — document ingestion, duplicate detection
- QR Authentication Network — scan logs, fraud detection
- Loyalty & AI Customer Engine — churn rescue, tier management
- HR Suite — timesheets, leave, disciplinary
- Group Portal — all 8 tabs including Network Intelligence
- ProteaAI — natural language → live SQL, context-aware
- Consumer Shop — age-gated, product verification

### Ready but needs demo data:
- cannabis_retail profile — code complete, needs Greenleaf scenario seed
- cannabis_dispensary profile — code complete, needs MediCare scenario seed
- general_retail profile — code complete, needs Metro Hardware scenario seed

### Code complete, data significantly incomplete:
- food_beverage profile (16,085 lines) — CRITICAL GAPS:
  - Ingredients: SA DAFF list exists but MISSING meat/poultry categories
  - Ingredients: MISSING seafood category
  - Recipes: NO recipe entries in the database (the recipe builder code exists
    but the seed data was never populated — zero recipes)
  - Portion yields: NOT seeded
  - Menu pricing: NOT seeded against recipe costs
  This is the most significant data gap in the entire platform. A F&B demo
  without recipes is a kitchen without food.

---

## GAPS AUDIT — WHAT NEEDS BUILDING

### GAP 1 — QR → Wizard URL scheme (NEW FEATURE, medium scope)

**What's needed:**
```
/setup?name=John+Smith&session=CA-RESCUE-2026&industry=food_beverage
```

The setup wizard reads URL params on mount:
- Pre-populates name field
- Optionally pre-selects industry tile
- Tags the created tenant as `demo: true, session: 'CA-RESCUE-2026'`

The `session` parameter allows:
- All demo tenants from this session to be pre-added to the demo group
- Demo tenants to be cleaned up after the session if needed

**Files to read before building:**
- The tenant setup wizard component (read in full — LL-221)
- The tenant creation flow (read the Supabase insert path)
- sign-qr EF v36 (to understand QR URL generation pattern)

**Complexity:** Medium. URL param reading is trivial. The demo session tag
and auto-group-join require schema and flow decisions.

### GAP 2 — Demo seed function (NEW FEATURE, high scope)

On wizard completion for a demo session, a seeder fires that:
1. Creates a full product catalog for the chosen industry (30-50 items)
2. Creates historical orders/dispensing with a decline trajectory
3. Creates loyalty members in specific cohort distributions
4. Creates expense entries that produce the target net loss
5. Creates specific compliance gaps (missing records, overdue entries)
6. Creates specific stock conditions (dead stock, critical restock, AVCO gaps)
7. Creates QR codes with scan history for fraud signals

This is essentially a `sim-pos-sales` EF v4 extension but much more
comprehensive — it seeds an entire business rescue scenario, not just POS sales.

**The seeder must produce data that is:**
- Specific (the same rescue story every time for that industry)
- Accurate (real AVCO calculations, real margin math)
- Progressive (problems visible in multiple modules simultaneously)
- NOT obviously fake (realistic product names, realistic pricing)

**New edge function required:** `seed-demo-tenant` EF v1
Triggered by the setup wizard on demo session completion.
Accepts: `{ tenantId, industry, scenarioKey, sessionTag }`
Idempotent: can be re-run without creating duplicates.

### GAP 3 — Notification badge system on Tenant Portal nav (NEW FEATURE, high scope)

**Currently:** The tenant portal nav has no notification badges.
The NuAI Insight bar exists in the Group Portal but not per-tenant.

**What's needed:**
A real-time (or near-real-time) intelligence scan that:
1. Runs on tenant portal load
2. Queries the tenant's data for rescue signals
3. Returns a badge count per nav section
4. Renders as small coloured circles on the nav items

**The intelligence scan covers:**
- Finance: VAT unsubmitted, net loss, bank recon unreconciled
- Stock: critical restock, selling with no stock, AVCO gaps > 30%
- Compliance: overdue entries, missing records, licence alerts
- Customers: churn rate > 50%, zero redemptions in 90 days
- HR: unresolved leave, timesheet gaps, overdue disciplinary

**The badge is earned by data — never hardcoded.**

This is the single most impactful new feature for the demo. A nav bar that
lights up specifically for this business's problems is immediately
comprehensible to a CA. They know exactly what "3 alerts in Finance" means.

**New edge function or component:** `get-tenant-intelligence` EF v1 OR
a client-side intelligence scan on tenant portal mount.

**Files to read before building:**
- The Tenant Portal nav component (read in full — LL-221)
- PlatformBar.js (LOCKED — read before touching)
- The existing NuAI Insight bar in GroupPortal (reference pattern)

### GAP 4 — Food & Beverage data (CRITICAL — demo-blocking if F&B is a scenario)

**Missing from the ingredient database:**
- Meat & poultry category (beef, chicken, pork, lamb, game)
- Seafood category (fish, shellfish)
- Dairy subcategories (cheese varieties, cream types)
- Bakery/pastry ingredients

**Missing entirely:**
- Recipe database (zero recipes — the builder exists but has no content)
- Portion yield data (recipe yield per portion)
- Menu pricing (sell price linked to recipe cost)
- Food cost % per menu item (recipe cost / sell price)

**Impact:** Without recipes, the F&B scenario cannot demonstrate:
- Negative gross margin on dishes
- HACCP per-recipe temperature requirements
- Allergen matrix (allergens are on ingredients, not recipes)
- The core F&B intelligence: "Is your kitchen profitable?"

**What needs seeding for The Garden Bistro scenario:**
- 25 ingredients (including meat/poultry/seafood) with DAFF-compliant names
- 8 recipes (starters, mains, desserts) with ingredient quantities and yields
- Menu pricing for each recipe
- 3 recipes with food cost > sell price (the rescue signal)
- 2 allergen declarations missing (the R638 exposure)

### GAP 5 — Auto-group-join for demo session (NEW FEATURE, low-medium scope)

**Currently:** Adding a store to a group requires pasting a UUID in Group Settings.
**What's needed for the demo:** All tenants created in session `CA-RESCUE-2026`
are automatically added to the demo group on creation.

**Options:**
A. Pre-create the demo group, include the group UUID in the QR URL params,
   auto-join on wizard completion
B. Post-session: a facilitator runs a single "group all session tenants" admin
   action after all CAs have created their businesses

Option A is cleaner for the demo UX. Option B requires less build.
**Recommendation:** Option A. The reveal works better if it's seamless —
"Your business is already part of a group. Click here to see it."

### GAP 6 — "Join the Group" reveal element on Tenant Portal (NEW FEATURE, small scope)

A persistent element at the bottom of the tenant portal (or in the sidebar
navigation) that says:
"You are part of [Group Name] · View network →"

Clicking it routes to `/group-portal?group=[groupId]`.

**For non-demo tenants:** This element only renders when the tenant is a member
of a franchise group (i.e. tenant_group_members has a row for this tenant).
It's not demo-specific — it's a real feature that all group members should have.

---

## IMPROVEMENTS ON THE ORIGINAL CONCEPT

### Improvement 1: Industry assignment, not free choice

Rather than letting each CA choose their industry freely, pre-assign one per QR code:

- CA 1-3: Cannabis Retail (Greenleaf Trading)
- CA 4-5: Medical Dispensary (MediCare Pharmacy)
- CA 6-8: Food & Beverage (The Garden Bistro)
- CA 9-10: General Retail (Metro Hardware)

This ensures all 4 industries are represented in the room, giving the
Group Portal reveal maximum diversity. If everyone chose cannabis retail,
the network view is less compelling.

The industry is encoded in the QR URL: `&industry=food_beverage`

### Improvement 2: ProteaAI pre-prompts per scenario

Each rescue scenario has 3 pre-suggested ProteaAI queries specific to
its problems. They appear as chips in the ProteaAI interface for this tenant:

Cannabis Retail: "What is my true gross margin?" · "Which products are
killing my margin?" · "How many customers have I lost in 90 days?"

F&B: "Which dishes are unprofitable?" · "What is my compliance exposure?" ·
"What is my food cost on the summer menu?"

These are not hardcoded answers — they're real queries against real data.
The AI answers from live data in the demo tenant.

### Improvement 3: The "problems found" score

Before entering the Group Portal reveal, show each CA a summary card:

"In 15 minutes, you found:
- 3 compliance issues
- R45,000 in dead stock
- 2 months of unsubmitted VAT
- 88 customers at churn risk"

This makes the value visceral before the group reveal. They've personally
found real problems in a real business. Now they're about to see what
happens when 10 businesses like this are viewed together.

### Improvement 4: The network alert count as the reveal hook

On the Group Portal Network Intelligence tab, the Alert Centre count
badge at the top should show the combined alert count across all demo
businesses before the tab even loads. Something like:

"24 alerts across 10 businesses · 8 critical"

The number is real — it's the sum of all the rescue scenario alerts
from every business every CA just walked through. That number lands hard.

### Improvement 5: Facilitator mode

A separate URL/credential for the facilitator that shows:
- A real-time list of which CAs have completed setup
- Which industries are represented
- A "reveal group" button that switches the screen to the Group Portal
  view on the main projector

This doesn't require new code — it's a view of the `session` data
from the demo tenant seed.

---

## DESIGN SYSTEM COMPLIANCE — NON-NEGOTIABLE

Every element of this demo must follow WP-DS-6. The CAs are sophisticated.
The UI must match the intelligence of the backend.

Specific requirements:
- The rescue alert badges on the nav must use T.danger/T.warning tokens
  consistently with how Stock Intelligence and Network Intelligence surface alerts
- The "problems found" summary card follows the KpiTile pattern
- The "Join the Group" reveal element follows the existing card patterns
- The QR landing page / setup wizard follows the existing tenant portal style
- ProteaAI pre-prompt chips follow the existing chip component style

No one-off styles for the demo. If it ships in the demo, it ships in production.

---

## BUILD PRIORITY ORDER

### Must-have before the meeting:

**P1 — Demo seed function (Gap 2)**
Without realistic data in distress, there is no demo. This is the foundation.
Build the `seed-demo-tenant` EF with all four industry scenarios.

**P2 — F&B data: recipes + meat/poultry ingredients (Gap 4)**
The F&B scenario is the most visually compelling (recipes, allergens, HACCP).
It cannot run without recipes. Seed meat/poultry/seafood and 8 recipes.

**P3 — Notification badge system on Tenant Portal nav (Gap 3)**
This is the single most impactful new feature. The nav lighting up with
specific rescue signals is the "aha" moment in Act 2. Without it, the
CA has to know where to look. With it, the platform tells them.

**P4 — QR → Wizard URL scheme (Gap 1)**
The personalised entry creates the emotional hook. "It already knows my name"
is the first impression. Worth building well.

**P5 — Auto-group-join + reveal element (Gaps 5 + 6)**
The closing move. Essential for the reveal to land cleanly.

### Nice-to-have if time allows:

**P6 — ProteaAI pre-prompts per scenario (Improvement 2)**
**P7 — "Problems found" summary card (Improvement 3)**
**P8 — Facilitator mode (Improvement 5)**

---

## WHAT EVERY AGENT MUST UNDERSTAND ABOUT THIS WORK

This is the most consequential build in the platform's history.

The WP-ANALYTICS suite proved what NuAi can do technically.
This demo proves it to people who write business rescue plans for a living.

If it lands, NuAi gets business rescue clients. Business rescue clients
have urgent operational needs, existing financial records, and a mandate
to cut costs and surface problems. NuAi is built for exactly this.

Every feature built for this demo must:
1. Work from real data — not hardcoded values, not approximations
2. Follow WP-DS-6 — the visual quality is part of the pitch
3. Be production-ready — if we build notification badges for the demo,
   they ship as a real feature for all tenants
4. Tell a coherent story — each business's problems must be interconnected,
   not random flags

The platform is ready. The data layer is ready. The Group Portal reveal
is ready. What's missing is the demo scaffolding and the F&B content.

Build those. Then the system sells itself.

---

## BEFORE WRITING A LINE OF CODE

1. Confirm the meeting date — the build priority depends on how much time exists
2. Confirm how many CAs will attend — determines how many QR codes to generate
3. Confirm which industries they want represented (or use the recommendation above)
4. Audit the F&B module in full:
   - Read `src/components/HQFoodIngredients.js` in full (5,082 lines — LL-221)
   - Run a Supabase query: `SELECT category, COUNT(*) FROM ingredients GROUP BY category`
   - Identify every missing category vs the SA DAFF classification list
   - Run: `SELECT COUNT(*) FROM recipes` — confirm zero or near-zero
5. Read the Tenant Portal setup wizard in full before touching it
6. Read PlatformBar.js (LOCKED) before planning the notification badge approach

The audit comes before the spec. The spec comes before the code.
That's how this system gets built right.

---

*WP-DEMO-CA-RESCUE v1.0 · 12 April 2026*
*Owner-directed strategic session*
*Every agent reads this before touching any demo-related code*
*This is priority work — treat it as such*
