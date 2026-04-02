# NuAi — NORTH STAR
## Read this FIRST. Every session. Without exception.
## Version 1.0 · March 30, 2026
## This document answers WHY. SESSION-STATE answers WHERE WE ARE. SESSION-CORE answers HOW.

---

## WHAT NUAI IS BECOMING

NuAi is the operating system for the South African cannabis industry.

Not just a stock system. Not just a loyalty app.
The platform that runs every type of cannabis business —
from the grow facility in the ground to the customer sitting at home
scanning a QR on their product.

Every plant. Every batch. Every gram. Every sale. Every customer.
Tracked. Measured. Understood. Optimised.

**Nobody in SA is doing this. We are building it. This is the moat.**

---

## THE SA MARKET REALITY (understand this before every session)

South Africa is in a unique grey-area cannabis climate right now (2026):

```
THE LANDSCAPE:
  Recreational shops      Popping up in malls, online, everywhere
  Vape shops              Selling cannabis alongside nicotine — same shelf
  Medical dispensaries    SAHPRA-licensed, prescription-driven
  Health shops            Adding CBD, functional mushrooms, wellness cannabis
  Grow facilities         Small personal grows to large commercial operations
  Extraction facilities   BHO, rosin, CO2 — producing for local + export market
  Large medical grows     Currently export-only but SA domestic market opening
  Coffee shops            Amsterdam-style, cannabis on the menu
  Online retailers        Direct-to-consumer, delivery-based

THE OPPORTUNITY:
  Everyone is focused on pushing product.
  Nobody is focused on the software that runs the business.
  No SA-native platform exists that understands this industry.
  We have a 12-24 month window before international competitors notice.
  The market is growing faster than any other retail segment in SA.
```

---

## THE PLUG-IN MODULE ARCHITECTURE

NuAi is built as a core platform with industry-specific modules that plug in.

```
CORE (already built — do not rebuild):
  ✅ Multi-tenant infrastructure
  ✅ Inventory + AVCO engine
  ✅ Loyalty + QR system
  ✅ Finance (P&L, Balance Sheet, Cash Flow)
  ✅ HR suite
  ✅ Document AI ingestion
  ✅ Production engine
  ✅ Wholesale + distribution
  ✅ Multi-currency + live FX

CANNABIS MODULES (to build — each is a separate WP):
  [WP-GROW]      Professional grow diary + plant-level QR tracking
  [WP-EXTRACT]   Extraction facility management (BHO, rosin, CO2)
  [WP-DISPENSARY] Full dispensary POS + compliance (medical + recreational)
  [WP-TRACK]     SA track-and-trace (plant → batch → product → customer)
  [WP-LAB]       COA management + potency tracking + lab submissions
  [WP-DELIVERY]  Cannabis delivery management + geo routing
  [WP-COFFEE]    Cannabis café menu + dosing management + table service

EACH MODULE:
  - Plugs into the core via industry_profile flag
  - Adds its own DB tables, UI screens, and AI analysis
  - Shares the core loyalty, QR, finance, and HR engines
  - Can be enabled/disabled per tenant in tenant_config
```

---

## THE QR VISION (most important differentiator)

Every physical thing in the NuAi ecosystem gets a QR code.

```
PLANT QR (WP-GROW):
  Tag every plant at germination
  Scan to update: growth stage, height, health notes, nutrients fed,
  training applied, photos, wet weight at harvest, dry weight, yield%
  Track which batch it became → which products were made → which customers bought them
  Full chain from seed to consumer. One scan at any point shows the whole story.

BATCH QR (already partially built):
  Every production batch gets a QR
  Links to: source plants, extraction method, COA, potency, batch notes
  Customer scans product → sees exact batch info → builds trust

PRODUCT QR (built ✅):
  Customer scans → loyalty points → product verification → batch trace
  But currently only showing loyalty. Need to show the full story.

THE INSIGHT:
  When a customer scans a QR at home — we collect that data.
  Location. Time. Product. Customer profile.
  Every scan is market intelligence.
  300 customers scanning 50 products = 15,000 data points per month.
  That data is valuable to the business and eventually to the industry.
```

---

## THE SA BUSINESS TYPES — what each needs from NuAi

```
TYPE 1 — RECREATIONAL DISPENSARY (Medi Recreational = live client)
  Core: Stock + POS + Loyalty + QR + HR + Finance
  Module: WP-DISPENSARY (strain management, concentrate taxonomy, age verification)
  Status: Core running. WP-STOCK-UI in progress. WP-DISPENSARY planned.

TYPE 2 — VAPE SHOP (pure vape selling cannabis cartridges + nicotine)
  Core: Stock + POS + Loyalty + QR
  Module: Subset of WP-DISPENSARY (no grow, just retail)
  Status: Core covers this. Same system, different product catalogue.

TYPE 3 — MEDICAL DISPENSARY (SAHPRA-licensed)
  Core: All of above
  Module: WP-MED (already partially built — patients, prescriptions, SAHPRA reports)
  Status: HQMedical.js exists but is gated. Needs patient management UI.

TYPE 4 — GROW FACILITY (personal to commercial scale)
  Core: Stock + Production + HR + Finance
  Module: WP-GROW (plant diary, grow room management, harvest tracking, yield analytics)
  Status: NOT YET BUILT. Highest-differentiation module. Build after demo.

TYPE 5 — EXTRACTION FACILITY
  Core: Production + Stock + Finance + Lab (COA)
  Module: WP-EXTRACT (machine logs, solvent tracking, yield per run, compliance)
  Status: NOT YET BUILT.

TYPE 6 — LARGE MEDICAL/COMMERCIAL GROW + EXTRACTION
  Core: Everything
  Module: WP-GROW + WP-EXTRACT + WP-TRACK (full chain)
  Status: NOT YET BUILT. Enterprise tier. R12k+/month.

TYPE 7 — HEALTH SHOP (CBD, wellness, functional mushrooms)
  Core: Stock + Loyalty + QR + Finance
  Module: None needed — core covers this
  Status: Works today. Zero cannabis-specific features needed.

TYPE 8 — COFFEE SHOP / CANNABIS CAFÉ
  Core: Stock + POS + Finance
  Module: WP-COFFEE (table management, menu dosing, consumption tracking)
  Status: NOT YET BUILT. Interesting future module.

TYPE 9 — ONLINE RETAILER / DELIVERY
  Core: Stock + Shop.js + Payments + Loyalty
  Module: WP-DELIVERY (delivery zones, driver tracking, geo-fencing)
  Status: Shop.js exists. Payments in progress (WP-PAY). Delivery not built.
```

---

## THE LOW-HANGING FRUIT (in order of effort vs revenue)

```
EFFORT: LOW → HIGH
REVENUE: HIGH → LOW (approximate)

1. RECREATIONAL DISPENSARY (Medi Recreational type)
   Effort:  WP-STOCK-UI (5 sessions) + WP-DISPENSARY S1 (2 sessions)
   Revenue: Every rec shop in SA. Hundreds of potential clients.
   Why low effort: Medi is the live test. We know the products. We know the pain.
   Timeline: 4-6 weeks to demo-ready.

2. VAPE SHOP (Pure PTV type)
   Effort:  Already works. Just needs sell prices + QR codes.
   Revenue: Every vape shop with cannabis. Dozens in Jhb alone.
   Why low effort: Same system as dispensary, simpler product range.
   Timeline: 1-2 weeks.

3. HEALTH SHOP (CBD, wellness)
   Effort:  Zero cannabis-specific work. Core system covers everything.
   Revenue: Every health shop adding CBD products.
   Why low effort: We remove the scary cannabis feature flags.
   Timeline: Ready now. Just needs a demo.

4. GROW FACILITY (WP-GROW)
   Effort:  4-6 sessions. New module.
   Revenue: HIGHEST per client. Growers pay for compliance + insight.
   Why medium effort: New screens but reuses production + QR infrastructure.
   Timeline: 6-10 weeks. Build after first paying dispensary client.

5. MEDICAL DISPENSARY
   Effort:  HQMedical.js exists. Needs patient management completion.
   Revenue: High value but small market (SAHPRA licensed only).
   Why medium effort: Compliance requirements are strict.
   Timeline: 8-12 weeks.

6. EXTRACTION FACILITY
   Effort:  4-6 sessions. Specific compliance needs.
   Revenue: High value, niche market.
   Timeline: 10-14 weeks.

7. LARGE COMMERCIAL GROW + EXTRACTION
   Effort:  All modules combined. Enterprise implementation.
   Revenue: HIGHEST (R12k+/month, enterprise contract).
   Timeline: 6-12 months. Build when we have the simpler clients running.
```

---

## HOW TO MANAGE THIS ACROSS SESSIONS

The continuity problem is real. Here is the system:

```
EVERY SESSION READS (in order):
  1. This file (NORTH-STAR) — the vision and why
  2. SESSION-STATE — where we are right now
  3. SESSION-CORE — the rules and lessons learned
  4. Current WP spec — what this session builds

EVERY SESSION ENDS WITH:
  1. Updated SESSION-STATE (version increment)
  2. Any new LLs added to SESSION-CORE
  3. WP spec updated if architecture changed
  4. Git commit with meaningful message
  5. Screenshot evidence in session notes

WHAT PREVENTS DRIFT:
  - NORTH-STAR tells the AI the WHY (this file)
  - SESSION-STATE tells the AI the WHERE (current state)
  - SESSION-CORE tells the AI the HOW (rules + lessons)
  - WP spec tells the AI the WHAT (current task)
  - The 3 questions (WHO/WHAT/EXISTS) prevent rebuilding things that exist

THE RULE: If a session starts without reading these four files —
  it will make decisions that contradict previous sessions.
  Reading these files takes 5 minutes.
  Fixing contradicted decisions takes 5 hours.
```

---

## WHAT NOT TO BUILD (ever)

```
❌ A separate mobile app for each business type (one app, configurable by industry_profile)
❌ Integrations with international platforms (Shopify, WooCommerce) — we ARE the platform
❌ A blockchain track-and-trace (QR + Supabase is faster, cheaper, and good enough)
❌ Anything that requires SAHPRA approval before the medical module is explicitly requested
❌ Payroll engine (SimplePay CSV export is permanently sufficient)
❌ Anything for industries outside SA (stay local until 50+ clients)
```

---

## THE NORTH STAR IN ONE PARAGRAPH

We are building the first end-to-end operating system for the South African cannabis
industry — from the grow room to the dispensary shelf to the customer's home.
Every plant tagged. Every batch tracked. Every gram costed. Every customer rewarded.
Every business decision backed by live AI intelligence.
Built in SA. For SA. At a price SA businesses can actually afford.
Nobody is doing this. We are first. The window is open now.

---

*NORTH-STAR v1.0 · NuAi · March 30, 2026*
*Read this first. Every session. This is the why behind every line of code.*
*Update only when the strategic direction changes — not for individual WPs.*
