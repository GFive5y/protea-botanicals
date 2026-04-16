# NUAI DEEP ANALYSIS PROTOCOL v1.0
## MANDATORY reading before building ANY new feature, module, or industry profile
## Produced: Session 288 · 17 April 2026
## Status: GOSPEL — this file is permanent and referenced from NUAI-AGENT-BIBLE.md
## Rule: NEVER build before you understand. NEVER understand without data.

---

## WHY THIS EXISTS

Session 288 exposed a critical failure pattern: the F&B stock system had been
built with retail assumptions applied to a restaurant context. 12 dishes were
treated as physical stock items with 100 units each. R56,175 in "stock value"
was entirely fictitious. No agent had questioned whether the model was correct
because no agent had done a deep analysis before building.

This protocol prevents that from ever happening again.

The result of building without analysis:
- Wrong data model — wrong UI — wrong insights — wrong demo — lost client
- Hours of corrective work that should never have been needed
- Erosion of trust in the system's data integrity

The result of analysis before build:
- Correct data model from day one
- Features that reflect how the industry actually works
- Demo that resonates with the client because it mirrors their reality

---

## THE PROTOCOL — 6 MANDATORY STEPS BEFORE ANY NEW BUILD

### STEP 1 — LIVE DB AUDIT (Supabase MCP)

Before writing a single line of code or inserting a single row, audit what
already exists in the live database for the affected tenants and tables.

Mandatory queries:
```sql
-- What columns does this table actually have?
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'target_table' ORDER BY ordinal_position;

-- What data already exists?
SELECT * FROM target_table WHERE tenant_id = '...' LIMIT 20;

-- What enums does this column accept?
SELECT unnest(enum_range(NULL::column_type)) AS valid_value;

-- What FK constraints apply?
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE constraint_schema = 'public';
```

Rule: Never assume a column exists. Never assume an enum value is valid.
Never assume data is populated. Always verify from disk (LL-075).

---

### STEP 2 — INDUSTRY / DOMAIN RESEARCH

For every new industry module or feature, conduct market research BEFORE
designing the solution. This means:

1. Search for "leading [domain] software [year]" — identify 3-5 market leaders
2. For each leader: what does it actually do? What are its core workflows?
3. How do the different user types (owner / manager / staff) interact with it?
4. What is the daily operational flow? Morning to close?
5. What is the single most important metric for this industry?
6. What do competitors get wrong? What gap can NuAi fill?

The market leaders in 2026 for key NuAi verticals:
- Restaurant F&B: MarketMan, Restaurant365, WISK.ai, Operandio, Rezku
- Cannabis retail: BioTrack, MJ Freeway, Flourish, Leaflogix
- Medical dispensary: DispensaryXcel, MJ Platform, METRC (compliance)
- General retail: Cin7, TradeGecko/Unleashed, Shopify + Stocky, DEAR Inventory
- Hardware/general: Lightspeed, Vend, Cin7, Erply

Output of research: a written analysis document committed to docs/
following the template in APPENDIX A below.

---

### STEP 3 — DATA MODEL VALIDATION

The data model for the industry must be validated against how that industry
actually operates. The questions to answer:

1. What gets DELIVERED to this business? What arrives on a truck?
2. What gets CONSUMED or SOLD? How does it leave the building?
3. What is the UNIT OF MEASURE at each point in the chain?
4. What is the KEY FINANCIAL METRIC this business tracks daily?
5. What do REGULATORS require this business to report?
6. How does a SALE in this industry affect stock differently from retail?

Common failure modes (now gospel):

FAILURE MODE A — Retail thinking applied to restaurants (LL-275):
Wrong: Dish — inventory_items (finished_product, 100 units)
Right: Ingredient — inventory_items (raw_material, in kg/L)
      Dish — food_recipes (virtual, no units)
      Sale — deducts ingredients via recipe BOM

FAILURE MODE B — Physical stock for digital products:
Wrong: Software licences — inventory_items with quantity_on_hand
Right: Licence allocations managed separately, not as physical stock

FAILURE MODE C — Ignoring the regulatory layer:
Wrong: Cannabis dispensary = cannabis retail (same stock model)
Right: Dispensary tracks prescriptions + S21 + SAHPRA per batch
       Every sale links to a patient record and a dispense log

FAILURE MODE D — Unit mismatch:
Wrong: Lamb Shank in "pcs" when recipe uses grams
Right: Lamb Shank in kg, recipe deducts 0.6kg per portion

---

### STEP 4 — USER JOURNEY MAPPING

For each role that will use this feature, define:
- What time of day do they use it?
- What device are they on? (desktop / tablet / phone)
- What is the 3-tap flow to complete the most common action?
- What is the ONE number they look at every morning?
- What action does the system take automatically vs requiring human input?

Standard restaurant user journeys (gospel from Session 288):
- Chef (6am): "What can I cook tonight?" — portions possible per dish
- Manager (6am, delivery dock): receive delivery — scan/photo invoice — confirm
- Manager (daily): review actual vs theoretical food cost variance
- Owner (anywhere): food cost % today, stock value, top margin dish
- Kitchen hand (twice weekly): blind stock count by storage zone

Standard cannabis retail journeys (TBD — Session 289+):
- Budtender (per sale): scan QR — confirm THC% — complete sale
- Manager (daily): compliance batch check — expiry alerts — reorder
- Owner (weekly): category margin report — strain velocity

---

### STEP 5 — GAP ANALYSIS

Create a table with three columns:
- Capability: what the industry requires
- Industry standard: what market leaders do
- NuAi status: what exists, what is partial, what is missing

Status codes:
- BUILT — fully implemented and working
- PARTIAL — schema exists or partial UI, needs wiring
- MISSING — not built at all
- SCHEMA ONLY — migration applied, no UI or logic

Use red/amber/green coloring in the analysis document.

The gap table drives the initiative list. Every MISSING and PARTIAL becomes
a numbered initiative with an effort estimate.

---

### STEP 6 — IMPLEMENTATION STRATEGY

Structure the work as phases:
- Phase 0: Data foundation (Supabase MCP — no code required)
- Phase 1: Core loop (the minimum that makes the system correct)
- Phase 2: Operational completeness (daily workflows)
- Phase 3: Intelligence layer (AI insights, AI recommendations)
- Phase 4: Post-demo backlog (nice-to-have, future clients)

The core loop is ALWAYS: data in — data stored — data displayed correctly.
Until the core loop is closed, intelligence is fiction.

---

## THE ANALYSIS DOCUMENT TEMPLATE (APPENDIX A)

Every new industry module or major feature must have a companion analysis
document committed to docs/ before the first line of code is written.

File naming: `ANALYSIS-[INDUSTRY/FEATURE]_v1_0.md`
Example: `ANALYSIS-RESTAURANT-STOCK_v1_0.md`
         `ANALYSIS-CANNABIS-DISPENSARY_v1_0.md`
         `ANALYSIS-LOYALTY-ENGINE_v1_0.md`

Template structure:
```
# [INDUSTRY/FEATURE] DEEP ANALYSIS
## Produced: [date] · Session [N]
## Status: ACTIVE — referenced in PENDING-ACTIONS.md

## 1. What this industry/feature actually does
## 2. The daily operational flow
## 3. Market leaders and their capabilities
## 4. How different user types interact
## 5. Data model validation
## 6. NuAi gap analysis
## 7. UI/UX patterns from market leaders
## 8. Implementation initiatives
## 9. NuAi's differentiation
## 10. Open loops created
```

---

## COMPLETED ANALYSES (reference these before building)

### ANALYSIS-RESTAURANT-STOCK — Session 288 (17 April 2026)
File: docs/ANALYSIS-FNB-STOCK_v1_0.md
Key findings:
- Restaurant stocks INGREDIENTS (raw_material), not dishes (finished_product)
- Dishes live in food_recipes with BOM via food_recipe_lines
- Each POS sale must deduct BOM ingredients via production_out movements
- The key metric: portions possible per dish from current stock
- The key report: actual vs theoretical food cost variance
- Market leaders: MarketMan (recipe costing), R365 (accounting), WISK (AI variance)
- NuAi differentiator: ingredients — IFRS Income Statement in same system

### ANALYSIS pending — cannabis_retail (Session 289+)
### ANALYSIS pending — cannabis_dispensary (Session 289+)
### ANALYSIS pending — general_retail (Session 289+)

---

## WHAT HAPPENS WHEN THIS PROTOCOL IS VIOLATED

1. The analysis LL is logged: LL-XXX "feature X built without domain analysis"
2. A corrective loop is opened: LOOP-XXX-REWORK
3. The rework session must FIRST write the analysis document, then fix the data
4. Time cost of rework is logged in the BUILD-LOG.md for future reference

The F&B stock rework (Session 288) cost approximately 2 hours of a session
that could have been spent building new features. The analysis itself took
30 minutes. Analysis is always faster than rework.

---

## STANDING RULES DERIVED FROM THIS PROTOCOL

### DAP-001 — Analysis before code, always
Never write a React component or SQL migration for a new industry module
before completing Steps 1-5 above. The analysis document is the prerequisite.

### DAP-002 — Domain model trumps convenience
If the industry model conflicts with the current data schema, fix the schema.
Never bend the domain model to fit the existing schema. Restaurants stock
ingredients, not dishes — the schema was wrong, not the restaurant.

### DAP-003 — The core loop test
Before shipping any new feature, verify: can a human complete the primary
daily workflow end-to-end? For restaurant stock: receive delivery — stock
updates — dish costs update — portions possible displays — POS sale deducts
— stock drops. If any step breaks, the feature is not done.

### DAP-004 — Market research is not optional for demo tenants
The demo tenants represent real businesses. Garden Bistro is a real
restaurant in the demo. Its data must reflect how a real restaurant operates.
The CA will notice if "100 Lamb Shank Provencale" is in stock. The CA will
know this is wrong. Market research prevents demo embarrassment.

### DAP-005 — Industry-specific close conditions in PENDING-ACTIONS
Every industry module must have a LOOP entry in PENDING-ACTIONS.md with
explicit close conditions. "The F&B stock system is working" is not a close
condition. "POS sale deducts BOM ingredients via production_out, portions
possible widget shows accurate counts, actual vs theoretical variance report
available" is a close condition.

---

*DEEP-ANALYSIS-PROTOCOL v1.0 · NuAi Platform · Session 288 · 17 April 2026*
*This document is permanent. Add date-stamped updates below the line. Never replace above.*
*Load this document when: starting any new industry module, major feature, or integration*
