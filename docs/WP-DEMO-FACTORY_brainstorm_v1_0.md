# WP-DEMO-FACTORY — Brainstorm Document v1.0
## Session: v229 — 11 April 2026
## Status: BRAINSTORM ONLY — no code written yet
## Purpose: Deep-dive foundation for next brainstorm session
## This document answers: what are we building, how does it
## look, how does it function, is it demo or product?

---

## THE IDEA — IN ONE SENTENCE

A CA scans an industry-specific QR code, lands in a 5-minute
setup wizard pre-configured for their sector, and exits with
a live branded storefront AND a fully populated ERP backend
showing real financial data, real stock, real operations —
all specific to their industry. They do not watch a demo.
They experience becoming a customer.

---

## THE STRATEGIC QUESTION — DEMO OR PRODUCT?

This is the most important question to resolve before
building anything.

### Argument that it's a DEMO pipeline
- Pre-seeded data is artificial
- Tenants created for demos aren't real customers
- The flow is engineered for a specific presentation context
- It could mislead prospects about onboarding complexity

### Argument that it's a PRODUCT FEATURE
- Every SaaS product seeds demo data on signup (Shopify,
  Airtable, Notion, HubSpot all do this)
- The wizard already exists as the real onboarding flow
- Industry-specific seed data IS the product — it shows
  what's possible with zero configuration effort
- The "demo tenant" created during the CA presentation
  becomes a real trial tenant if they sign up
- Pre-configured industry templates reduce time-to-value
  from weeks to minutes for every future customer

### Recommended answer (to be validated in brainstorm)
This is a PRODUCT FEATURE disguised as a demo.
WP-DEMO-FACTORY should be renamed WP-INDUSTRY-SEEDS.
The demo is just the first use case. Every new tenant
onboarding benefits from industry seed data.
The CA meeting is the proof of concept for the feature,
not the feature itself.

---

## WHAT THE SYSTEM ALREADY HAS — DB AUDIT (11 Apr 2026)

### Live tenants and data
| Tenant               | Profile         | Products | Orders | Expenses |
|----------------------|-----------------|----------|--------|----------|
| Nu Ai HQ             | operator        | 0        | 0      | 0        |
| TEST SHOP            | cannabis_retail | 0        | 0      | 0        |
| Pure Premium THC     | cannabis_retail | 24       | 11     | 2        |
| Medi Recreational    | cannabis_retail | 186      | 468    | 47       |
| Test Dispensary CT   | cannabis_retail | 0        | 0      | 0        |
| Vozel Vapes          | general_retail  | 4        | 0      | 0        |

### Industry-specific table data (11 Apr 2026)
| Table               | Rows | Notes                              |
|---------------------|------|------------------------------------|
| stock_movements     | 2289 | Medi Rec cannabis operations       |
| food_ingredients    | 121  | SA DAFF ingredient library — LIVE  |
| product_strains     | 18   | Cannabis strains                   |
| product_cogs        | 13   | COGS records                       |
| order_items         | 1094 | Real line-item data from simulator |
| batches             | 10   | Production batches                 |
| haccp_control_points| 3    | Sparse — not a real F&B tenant     |
| food_recipes        | 1    | Sparse                             |
| vat_period_filings  | 1    | One VAT201 filed                   |
| temperature_logs    | 0    | Empty                              |
| haccp_log_entries   | 0    | Empty                              |

### Industry profiles in the codebase (26 files with branching)
- cannabis_retail: FULLY BUILT — strains, THC/CBD, QR auth,
  molecule education, 14 Product Worlds in StockItemModal.js
- cannabis_dispensary: GATED — SAHPRA, prescriptions,
  dispensing log (partially built)
- food_beverage: FULLY BUILT — 16,085 lines exclusive —
  SA DAFF ingredients, HACCP, allergens, cold chain,
  nutrition labels, recall, FSCA letters (SA R638 compliance)
- general_retail: BUILT — standard SKU management

### Edge Functions (14 deployed)
| EF               | What it does for demo purposes         |
|------------------|----------------------------------------|
| sim-pos-sales    | Generates realistic sales orders +     |
|                  | line items + revenue for any tenant    |
| sign-qr          | Creates HMAC-signed QR codes           |
| loyalty-ai       | Nightly AI engine for churn/birthday   |
| send-email       | Can send welcome/statement emails      |
| process-document | AI document capture (invoice/PO/COA)   |
| ai-copilot       | ProteaAI — natural language queries    |

### CRITICAL GAP: sim-pos-sales order_items
The simulator generates orders WITH line items (1,094 exist).
But it only works for existing products in a tenant's catalog.
A new demo tenant needs products seeded FIRST, then the
simulator can run to create realistic trading history.
Order: seed products → run sim → financial data appears.

---

## THE FOUR INDUSTRY DEMO PACKAGES

### Package 1 — General Retail / Nicotine Vape
Status: 70% DONE (Vozel Vapes exists, shop live)
What's missing: 30 days of simulated trading, expenses,
purchase orders, suppliers. No financial statements yet.
Time to complete: 1 session.

Vozel Vapes demo package contents:
- 4 products (VVZ-001 to VVZ-004) ✓
- 1 supplier (nicotine base supplier)
- 2 purchase orders (hardware from China, base from UK)
- 30 days sim-pos-sales data (run EF)
- 5 expenses (rent, utilities, insurance, packaging, labour)
- 3 journal entries (opening stock, depreciation, VAT)
- Financial statements: P&L, balance sheet auto-generated
- Loyalty: 50 pts welcome, Standard programme ✓
- Welcome QR ✓ (WELCOME-vozelvapes-5577MH)

### Package 2 — Food & Beverage
Status: 0% (no F&B tenant exists, but UI is fully built)
This is the HIGHEST VALUE package for CAs because F&B
compliance is a genuine pain point they understand daily.
A restaurant CA immediately sees the value of HACCP logs,
recipe costing, allergen management, and supplier traceability.

Proposed tenant: "Nourish Kitchen & Deli" (Johannesburg)
Industry profile: food_beverage

F&B demo package contents:
Products (12):
  - Signature Chicken Wrap (finished)
  - Pulled Pork Slider Board (finished)
  - Seasonal Grain Bowl (finished)
  - House Lemon Tart (finished)
  - Cold Brew Coffee (500ml) (finished)
  - Sourdough Loaf (finished)
  - Wholewheat Pizza Base (raw material)
  - Free-Range Chicken Thigh 1kg (raw material)
  - Organic Oat Flour 5kg (raw material)
  - Extra Virgin Olive Oil 5L (raw material)
  - Unsalted Butter 2kg (raw material)
  - Seasonal Mixed Veg Box 3kg (raw material)

Recipes (3):
  - Chicken Wrap recipe with ingredient lines + allergen flags
  - Lemon Tart with dairy/gluten allergen flags
  - Cold Brew protocol with brew time

HACCP (5 control points):
  - Receiving temperature (< 4°C for cold chain)
  - Cold storage monitoring (< 2°C)
  - Hot holding (> 60°C)
  - Cross-contamination prevention
  - Final product temperature check

Suppliers (3):
  - Fresh produce supplier (weekly delivery)
  - Dry goods distributor (bi-weekly)
  - Dairy/proteins supplier (3× per week)

Financial (30 days sim):
  - Food cost % target: 28-32%
  - Gross margin: ~65%
  - Revenue: ~R85,000/month
  - COGS: ingredients + labour + utilities
  - VAT: registered, monthly period

What the backend looks like for F&B:
  HACCP logs, temperature monitoring, recipe cost analysis,
  ingredient traceability, allergen compliance matrix,
  nutrition label generator, recall event log,
  FSCA compliance letters, cold chain records.
  None of this exists in any other ERP a CA has seen.

### Package 3 — Professional Services / General Business
Status: 0% (general_retail profile, but service-focused)
For CAs who work with law firms, consultancies, agencies.
The differentiator: service line items, time billing, project
P&L, retainer management.

Note: The current platform is product-inventory-first.
Service billing requires either: (a) using inventory_items
with category='service' and unit='hours', or (b) a separate
service_line_items table. This needs architectural discussion
before building.

Proposed tenant: "Apex Advisory Group" (Cape Town)
Products (services):
  - Advisory retainer monthly (service)
  - Financial review engagement (service)
  - Tax compliance filing (service)
  - BBBEE compliance audit (service)

Financial focus: retainer revenue, engagement margins,
professional indemnity expense, partner draw accounts.

### Package 4 — Cannabis Retail (for cannabis-sector CAs)
Status: 80% DONE (Medi Rec has real data)
The platform's original and deepest vertical.
Medi Recreational: 186 products, 468 orders, 11 QR codes.
This tenant already IS the demo. Needs:
  - Financial statements populated
  - COGS builder filled for key products
  - Loyalty AI logs showing churn rescue
  - SAHPRA compliance notes (dispensary profile)

For non-cannabis CA meetings: HIDE this package entirely.
The wizard Step 3 industry picker must have a
?hide_cannabis=true URL parameter that removes the
cannabis_retail tile.

---

## THE QR-TO-LIVE-SYSTEM FLOW — DETAILED

### Physical setup at the CA meeting table

One QR code per industry sector printed on a card:
  Card 1 (food & beverage CA):
    QR → /onboarding?industry=food_beverage&demo=true
    Back of card: "Scan to see your industry's ERP"
  Card 2 (general retail CA):
    QR → /onboarding?industry=general_retail&demo=true
  Card 3 (professional services CA):
    QR → /onboarding?industry=general_retail&demo=true
  NOTE: Cannabis card only printed for cannabis-sector CAs

### The wizard experience (?demo=true mode)

Questions to resolve in brainstorm:
Q1. Does ?demo=true skip the wizard or accelerate it?
  Option A: 3-step accelerated wizard (name + colour + launch)
    Industry, template, products, loyalty are pre-configured
    from the demo template. Fastest path, 90 seconds.
  Option B: Full 7-step wizard with industry pre-selected
    They choose everything. More engagement. 5 minutes.
  Option C: No wizard at all — they scan, a demo tenant
    is auto-created with their name, they go straight to
    the backend.
  RECOMMEND: Option B. The wizard IS the product. They
  experience the onboarding, which is the sale.

Q2. Does each CA get their own tenant or a shared demo?
  Option A: Shared read-only demo tenant per industry
    Everyone sees the same data. No creation needed.
    Risk: multiple people scanning = one shared experience.
  Option B: Each scan creates a new tenant (ephemeral)
    Personal experience. Their name, their brand colour.
    Risk: DB fills with demo tenants.
  Option C: Each scan creates a trial tenant (real)
    The demo IS the trial signup. If they like it, they
    already have an account.
  RECOMMEND: Option C with auto-cleanup after 30 days
  if no payment method is added.

Q3. What data gets seeded at launch?
  The industry seed function runs after wizard_complete=true
  It inserts: products, suppliers, purchase orders, expenses,
  then calls sim-pos-sales EF to generate 30 days of orders.
  Financial statements auto-populate from live data.
  Total seed time: ~30 seconds (async, shown as progress).

Q4. What backend do they get?
  This is THE question. The backend is the ERP.
  After launch they click "Go to your dashboard →"
  and land in the Tenant Portal with:
  - Their industry profile active (correct tabs visible)
  - Pre-seeded data showing realistic operations
  - ProteaAI enabled so they can ask natural language questions
  - Financial statements showing 30 days of trading
  This is not a demo. This is their trial account.

---

## WHAT THE CA ACTUALLY EXPERIENCES — STEP BY STEP

### Minute 0: Scan
CA scans the industry-specific QR with their phone.
Browser opens: /onboarding?industry=food_beverage
They see the wizard. Industry is pre-selected.
Their phone becomes the portal.

### Minutes 1-5: Wizard
Step 1: "What's your business name?" (they type their firm)
Step 2: Pick brand colour (live preview updates)
Step 3: Industry pre-selected — they confirm
Step 4: Template (they pick minimal/bold/editorial)
Step 5: Products — demo template products shown as preview,
  "We'll pre-load [12] F&B products for you"
Step 6: Loyalty preset
Step 7: Launch → progress bar → "Seeding your data..."
  (30 seconds while sim runs and seeds industry data)
  → "Your ERP is live"
QR + live URL appear. They already have a welcome QR.

### Minutes 5-15: Exploration
You walk them through the backend on your laptop.
Their tenant. Their name. Their industry data.
You demonstrate:
  - Live sales dashboard showing 30 days of trading
  - Their product catalog configured for their industry
  - Financial statements: P&L showing food cost %
  - HACCP logs and compliance records
  - ProteaAI: "What were my top 3 products this month?"
  - QR scan: scan the welcome QR, earn points, see loyalty
  - Email a statement: live demo of send-email EF

This is 15 minutes from scan to full ERP walkthrough.
No slides. No "imagine if". Their name is on everything.

---

## WHAT NEEDS TO BE BUILT — GAP ANALYSIS

### Already exists
- WP-STOREFRONT-WIZARD (7-step wizard) ✓
- 4 industry profiles in the codebase ✓
- sim-pos-sales EF (order + line item generation) ✓
- Food & beverage UI (16,085 lines) ✓
- General retail UI ✓
- Financial statements (IFRS, auto-populated) ✓
- Loyalty system (AI engine, tier management) ✓
- Email infrastructure (send-email EF) ✓
- QR infrastructure (sign-qr + verify-qr EFs) ✓
- ProteaAI (natural language queries) ✓

### Needs building

WP-INDUSTRY-SEEDS (new WP):
  1. Industry seed data definitions (JSON templates)
     One template per industry: products, suppliers,
     expenses, COGS lines, HACCP points (F&B), recipes (F&B)
  2. seed-tenant EF (new Edge Function)
     Called after wizard_complete=true when ?demo=true
     Reads the industry template, inserts all seed data,
     calls sim-pos-sales for 30 days of orders
  3. Wizard ?demo=true mode
     Pre-selects industry from URL parameter
     Shows "We'll pre-load N items for your industry"
     on Step 5 instead of the product entry form
     Shows "Seeding your data..." progress on Step 7
  4. ?hide_cannabis=true parameter
     Removes cannabis_retail tile from Step 3
  5. Trial tenant lifecycle
     wizard_complete=true + demo=true → trial_expires_at
     set to 30 days from launch
     After 30 days without payment: is_active=false

### Needs discussion in brainstorm
- Should cannabis be hidden or "contact us" gated?
- Is professional services a viable demo industry?
  (service billing not natively supported)
- What is the right backend to show a non-technical CA?
  (Tenant Portal vs Admin Dashboard vs custom demo view)
- How do we prevent sim-pos-sales data looking fake?
  (orders need believable timing, amounts, products)
- Financial statements: do they auto-populate for demo
  tenants or do we need a separate financial seed?
  (expenses + journal entries need manual seeding —
  the sim only creates order/revenue data)
- Multi-tenant demo: if 5 CAs scan at the same time,
  are they isolated? (yes — separate tenant rows)

---

## THE HARDEST QUESTION — BACKEND FOR THE CA

The consumer shop is impressive but CAs are accountants.
They want to see the backend.

The Tenant Portal currently shows:
  - Dashboard with KPIs and alerts
  - Inventory (stock, catalog, movements)
  - Ordering (POs, suppliers, receiving)
  - Operations (production, batches)
  - Sales (orders, customers, POS)
  - Reports (P&L, balance sheet, COGS)
  - Finance (VAT, journals, year-end)
  - Team (HR, leave, timesheets)
  - All tabs are industry-profile adaptive

For a F&B CA, the killer features to show:
  1. Recipe cost analysis → "Your lemon tart costs R12.40
     to make and sells for R55 — 77% gross margin"
  2. HACCP compliance log → "Every temperature check
     logged automatically, FSCA-ready"
  3. Allergen matrix → "One screen shows all allergens
     across your menu"
  4. Ingredient traceability → "If Supplier X has a
     recall, we show every affected product in 3 seconds"
  5. ProteaAI: "Which recipe has the worst food cost
     trend this month?" → live SQL response

For a general retail CA:
  1. AVCO stock valuation → "Every movement recalculates
     automatically per IAS 2"
  2. Smart Capture → scan a supplier invoice, AI reads it,
     creates the expense and journal entry automatically
  3. VAT201 module → "One click generates your VAT return
     from live data"
  4. IFRS financial statements → print/email ready

These features ALL exist in the platform today.
The question is: are they populated with demo data
realistic enough to impress a CA?

---

## THINGS TO RESOLVE IN THE BRAINSTORM SESSION

The next session is brainstorm only. No code.
Questions to work through:

1. NAMING: WP-DEMO-FACTORY or WP-INDUSTRY-SEEDS?
   (The name determines how it's built and positioned)

2. DEMO vs TRIAL: Is the QR scan a demo or a trial signup?
   If demo: ephemeral, cleaned up, no real account
   If trial: real account, 30-day timer, becomes customer
   RECOMMEND TRIAL — but need to discuss

3. CANNABIS PRESENTATION: Show or hide for CA meeting?
   Cannabis is the platform's strongest vertical with
   the most data. But it may distract/concern non-cannabis CAs.
   RECOMMEND: Industry-specific QRs. Cannabis CA gets
   cannabis demo. F&B CA gets F&B demo. Same system.

4. WIZARD MODE: Full 7 steps or accelerated 3 steps?
   Trade-off: engagement vs time.

5. FINANCIAL DATA: How do we make demo financials convincing?
   sim-pos-sales generates revenue (orders) but not:
   - Expenses (rent, utilities, COGS inputs)
   - Journal entries (opening stock, depreciation)
   - VAT transactions
   - Purchase orders paid
   Need a financial seed layer on top of the sim.

6. MOBILE vs DESKTOP: The CA scans on mobile.
   Wizard is 50/50 desktop layout — mobile collapses.
   Is the mobile wizard experience good enough?
   Test on a real phone before the meeting.

7. THE RIGHT ORDER: Build seed data first or wizard
   ?demo=true mode first?
   RECOMMEND: Seed data first (JSON templates + seed-tenant EF)
   Then wire the wizard trigger.

8. SUCCESS METRICS: How do we know the demo worked?
   Email log: did the CA receive a statement email?
   QR log: did they scan the welcome QR?
   Conversion: did they add a payment method within 7 days?

---

## COMPETITIVE POSITIONING

This is the section for the brainstorm.

What every other ERP demo looks like:
  Salesperson shares screen.
  Shows a generic pre-built database.
  "Imagine your products were in here."
  CA imagines. Or doesn't.

What NuAi's demo looks like:
  CA scans a QR code.
  Types their business name.
  Picks their industry.
  5 minutes later: their ERP is live.
  Their name. Their colour. Their industry.
  Their 30 days of trading history.
  Their financial statements.
  No imagination required.

This is not incremental improvement on ERP demos.
This is a category change in how enterprise software is sold.

---

## LIVE STATE AT DOCUMENT CREATION

HEAD: 872f927 + docs commit pending
Vozel Vapes: wizard_complete=true, launched_at=2026-04-10
Welcome QR: WELCOME-vozelvapes-5577MH (50pts, Starter)
Brand colour: #0F6E56 (dark green — user chose this)
/shop/vozel-vapes: LIVE, showing 4 products correctly

Vozel Vapes is Package 1 (General Retail / Nicotine Vape).
It is 70% demo-ready. Missing: 30 days trading data,
financial statements, expenses, purchase orders.

---

## NEXT SESSION AGENDA

This is a BRAINSTORM session. No Claude Code. No code.
Agenda:
1. Answer the 8 questions above
2. Define the architecture of seed-tenant EF
3. Design the F&B demo package in detail
4. Define the ?demo=true wizard mode behaviour
5. Decide the CA meeting demo script (exact flow)
6. Assign WP-INDUSTRY-SEEDS to a build session

Come prepared to make decisions on every open question.
The next build session after this brainstorm should be
able to produce the seed-tenant EF and F&B demo package
in a single session.

---
*WP-DEMO-FACTORY Brainstorm v1.0 · NuAi · 11 April 2026*
*The mission: first demo where the prospect IS the product.*
