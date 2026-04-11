# WP-ANALYTICS — NuAi Franchise Analytics Suite
## Master Vision Document
## Status: MODULE 1 IN PROGRESS — Modules 2-6 specced, not yet built
## Written: 11 April 2026 · HEAD at time of writing: 20dff82

---

## THE STRATEGIC CONTEXT

NuAi already has reporting inside each tenant portal.
What the Group Portal needs is analytics — network-wide
intelligence that no single store can see about itself.

THE CRITICAL DISTINCTION (never lose this):
  Reporting  = tells you what happened (backward, passive)
  Analytics  = tells you what it means and what to do 
               (forward, active, network-wide)

This distinction drives every design decision in this suite.
Do not build reporting screens. Build analytics screens.

---

## THE FOUR ANALYTICS TYPES — OUR DESIGN FRAMEWORK

Every screen in this suite must answer one or more of:

1. DESCRIPTIVE   — "What happened?"
   Standard KPIs, daily sales, inventory levels.
   Foundation layer. Every screen has this.

2. DIAGNOSTIC    — "Why did it happen?"
   Connect data points to explain shifts.
   "Store B margin dropped because 4 SKUs are priced below
   network median."

3. PREDICTIVE    — "What will happen?"
   Forecast demand, flag risk before it hits.
   "At current velocity Store B is on track for R210k —
   12% below your R240k target."

4. PRESCRIPTIVE  — "What should I do?"
   Powered by ai-copilot EF (already deployed).
   "Transfer 20 units of SKU-XYZ from Store A to Store B
   before it runs out on Friday."

Most ERP analytics tools only do descriptive.
NuAi's competitive advantage is doing all four.
Prescriptive is the moat — no competitor has it in a
SA cannabis + franchise + IFRS context.

---

## UX DESIGN PRINCIPLES (apply to every module)

These are non-negotiable for every screen in this suite:

1. ONE PRIMARY QUESTION PER SCREEN
   Every screen answers a single question clearly.
   "Which of my stores is performing best and why?"
   Not a wall of charts. A focused answer.

2. PROGRESSIVE DISCLOSURE
   Summary → Chart → Detail Cards
   The franchise owner reads top to bottom and gets
   progressively more granular without navigating.

3. EVERY METRIC HAS CONTEXT
   Raw R6,000 means nothing.
   R6,000 vs network avg R8,500 (−29%) means everything.
   Every number shows: vs what? vs when?

4. EVERY INSIGHT IMPLIES AN ACTION
   The worst-performing store card has [Transfer stock]
   and [View store] as immediate actions.
   If you can't act on it, don't show it.

5. LEADING + LAGGING BALANCE
   Lagging = what happened (revenue, margin, stock)
   Leading = what will happen (velocity, churn risk, reorder)
   Every dashboard needs both.
   Lagging-only dashboards are rearview mirrors.

6. BENCHMARKING IS THE VALUE
   Franchisees need performance relative to peers.
   Not just "how am I doing" but "how am I doing vs
   the network, vs my best month, vs the top store."

---

## THE 8-12 KPI RULE

Standardise 8-12 core KPIs across all stores.
Every franchisee has a clear benchmark to work toward.
Too many KPIs = cognitive overload = ignored dashboard.
Too few = blind spots.

NuAi's 10 core network KPIs:
1.  Revenue MTD (profile-adaptive: orders or dispensing_log)
2.  Revenue vs last month (delta %)
3.  Gross margin % (AVCO-correct per LL-242 fix)
4.  Average order/event value (AOV)
5.  Order/event count MTD
6.  Stock health (critical + low item counts)
7.  Combined stock value (AVCO-weighted)
8.  Top product by revenue
9.  Customer count (unique, MTD)
10. Loyalty points issued (network loyalty health)

---

## COMPETITIVE LANDSCAPE — WHY NuAi WINS

### What competitors offer:
Flowhub, Cova, BLAZE — cannabis POS + compliance only.
  No franchise view. No cross-store analytics.
  Reporting only (descriptive). No AI intelligence layer.

FranConnect, Claromentis — generic franchise management.
  No cannabis compliance. No SAHPRA. No AVCO.
  No product-world inventory. No South Africa.

### What NuAi owns exclusively:
- SAHPRA-aware dispensary analytics in a franchise network view
- AVCO-correct margin (fixed per LL-242 — competitors don't have this)
- Profile-adaptive revenue routing (LL-231) — dispensary vs retail
  in the SAME network, handled correctly
- IFRS-compliant financial data feeding the analytics layer
- ai-copilot EF already deployed — prescriptive analytics ready
- South African context: VAT, BCEA, SAHPRA, R638 — none of the
  global competitors understand this regulatory environment

This is the first South African franchise ERP analytics suite
that is simultaneously cannabis-compliant, IFRS-aware, and
AI-native. That is the product.

---

## THE SIX MODULES

### Module 1 — Store Comparison (WP-ANALYTICS-1)
File: docs/WP-ANALYTICS-1.md (full spec — read this)
Tab: /group-portal?tab=compare
Status: COMPLETE — StoreComparison.js live, verified in browser
        with 2 stores. HEAD: 8221177
Primary question: "Which store is performing best and why?"
Key innovation: First cross-tenant comparison surface in NuAi.
               Benchmarks every store against network average.

### Module 2 — Combined P&L (WP-ANALYTICS-2)
File: docs/WP-ANALYTICS-2.md (full spec — read this)
Tab: /group-portal?tab=financials
Status: COMPLETE — CombinedPL.js live, verified in browser. HEAD: 5ba63b5
        Spec: docs/WP-ANALYTICS-2.md
Primary question: "Is my franchise network profitable as a whole?"
Key features:
  - Network consolidated P&L (revenue, COGS, gross profit,
    expenses, net profit) — one number for the whole network
  - Per-store P&L columns side by side
  - Profile-adaptive: dispensary uses dispensing_log (LL-231)
  - IFRS-consistent with the tenant-level financial suite
  - Date range: MTD / last month / last 3 months / YTD
  - Export to CSV
Key innovation: COGS % flagged automatically when a store runs
  2-3% above network benchmark — silent profit leak detector.
Data sources: orders, dispensing_log, expenses, stock_movements

### Module 3 — Revenue Intelligence (WP-ANALYTICS-3)
File: docs/WP-ANALYTICS-3.md (full spec — read this)
Tab: /group-portal?tab=revenue
Status: IN PROGRESS — Session 1 HEAD 5352d96 · Session 2 pending
Primary question: "Is my network growing or shrinking, and where?"
Key features:
  - Same-Store Sales Growth (SSSG) per store — the gold standard
    franchise health metric (week-on-week, month-on-month, YoY)
  - Revenue trend chart — all stores overlaid, 30/60/90 day
  - Peak trading analysis (from orders.created_at timestamps)
  - Average basket size trend
  - Revenue per product category — which categories drive which stores
  - Predictive: "At current velocity Store B is on track for R210k
    this month — 12% below your R240k target"
Key innovation: First predictive revenue module. Goes beyond
  what happened to what will happen.
Data sources: orders, dispensing_log (grouped by day/week/month)

### Module 4 — Stock Intelligence (WP-ANALYTICS-4)
File: docs/WP-ANALYTICS-4.md (to be written before build)
Tab: /group-portal?tab=stock
Status: SPEC COMPLETE — docs/WP-ANALYTICS-4.md committed 12 Apr 2026. Ready to build.
Primary question: "Where is stock stuck and where is it needed?"
Key features:
  - Network-wide stock heatmap — every store, every SKU, one view
  - Slow movers: items with zero movement in 30+ days
  - Fast movers: top velocity items with stock risk flag
  - Transfer opportunities: AI-identified — "Store A has 45 units
    of SKU-XYZ, Store B has 0 and sells 3/week → transfer 21 units"
  - Dead stock value — capital tied up per store
  - Reorder intelligence: which stores need what, by when
Key innovation: Direct integration with GroupTransfer — transfer
  opportunities are actionable with one tap. Analytics → action
  in one screen.
Data sources: inventory_items, stock_movements, orders

### Module 5 — Customer & Loyalty Intelligence (WP-ANALYTICS-5)
File: docs/WP-ANALYTICS-5.md (to be written before build)
Tab: New tab — /group-portal?tab=customers
Status: SPECCED IN MASTER DOC — detailed spec not yet written
Primary question: "Are my customers loyal and growing?"
Key features:
  - Network loyalty members: total, active (30d), at-risk
  - Tier distribution across all stores
  - Cross-store customers: customers visiting multiple network stores
  - Loyalty programme ROI: points issued vs revenue driven
  - Churn risk alerts: "Store B has 23 customers who haven't
    visited in 45+ days — NuAi recommends a WhatsApp campaign"
Key innovation: Cross-network loyalty view. Customer who shops
  at Store A and Store B is the same customer — tracked correctly.
Data sources: user_profiles, loyalty_transactions, orders

### Module 6 — NuAi Network Intelligence (WP-ANALYTICS-6)
File: docs/WP-ANALYTICS-6.md (to be written before build)
Tab: Intelligence layer across ALL modules (not a separate tab)
Status: SPECCED IN MASTER DOC — detailed spec not yet written
Primary question: "What should I do today to improve my network?"
Key features:
  - Daily Network Briefing: generated each morning via ai-copilot.
    "Here's what happened yesterday. Two things need attention."
  - Anomaly detection: auto-alerts when any store deviates >15%
    from its own 30-day trend
  - Best practice propagation: "Store A's margin increased 4%
    after repricing 6 SKUs. Apply same to Store B?"
  - Natural language queries: "Which store had the best Saturday
    last month and why?"
  - NuAi Insight Bar: already exists in NetworkDashboard as a
    static placeholder — this module wires the real ai-copilot call
Key innovation: Prescriptive analytics. The AI doesn't just show
  data — it tells the franchise owner what to do next.
Dependencies: All Modules 1-5 complete (needs all data sources)
EF: ai-copilot v70 (already deployed, already tested in tenant portals)

---

## PHASED DELIVERY PLAN

| Phase | Module | Sessions | Status |
|---|---|---|---|
| WP-ANALYTICS-1 | Store Comparison | 1 | ✅ COMPLETE — HEAD 8221177 |
| WP-ANALYTICS-2 | Combined P&L | 1 | ✅ COMPLETE — HEAD 5ba63b5 |
| WP-ANALYTICS-3 | Revenue Intelligence | 2 | IN PROGRESS — Session 1 HEAD 5352d96 |
| WP-ANALYTICS-4 | Stock Intelligence | 2 | SPEC COMPLETE — ready to build |
| WP-ANALYTICS-5 | Customer & Loyalty | 1 | Pending |
| WP-ANALYTICS-6 | NuAi Network Intelligence | 2 | Pending |

Total: ~9 sessions for the complete suite.
Each phase ships something complete and immediately useful.
No half-built tabs left as placeholders between sessions.

---

## PREREQUISITE ARCHITECTURE (already in place)

The following infrastructure means this suite can be built
without new schema or new dependencies:

Database:
  orders, order_items (verify exists — LL-244 candidate)
  dispensing_log, inventory_items, stock_movements
  user_profiles, loyalty_transactions, loyalty_tiers
  tenant_groups, tenant_group_members (WP-TENANT-GROUPS)
  expenses (for Module 2 Combined P&L)

Edge Functions (all already deployed):
  ai-copilot v70 — powers Module 6 intelligence layer
  All other EFs unchanged

React libraries (all already in package.json):
  Recharts ^3.8.0 — 28 files already using it
  src/components/viz/ — ChartCard, ChartTooltip, DeltaBadge,
    SparkLine, InlineProgressBar (all already built)

Design system:
  WP-DS-6 complete — T.container, T.gap, T.pad, T.inset, 
  T.page tokens all available. Zero new tokens needed.

---

## RULES FOR ALL MODULES IN THIS SUITE

LL-231: Dispensary revenue = dispensing_log × sell_price.
  NEVER orders table for dispensary revenue.
  Every query must branch on industryProfile.

LL-226: dispensing_log Schedule 6 — is_voided != true on
  every dispensing query.

LL-242: AVCO is correctly calculated in GroupTransfer.
  HQTransfer fix landed 713ef3a.
  All margin calculations use weighted_avg_cost as corrected.

WP-DS-6: All components import { T } from tokens.js.
  Zero hardcoded px matching a token.
  Reuse src/components/viz/ — no new chart primitives.

LL-221: Read every file before touching it. Disk is truth.

RULE 0Q: Claude.ai never writes to the repo. Ever.

---

## SESSION CLOSE PROTOCOL FOR THIS SUITE

At the end of every WP-ANALYTICS session:
1. Update this master document with module status changes
2. Write the next module's detailed spec doc (WP-ANALYTICS-N.md)
   BEFORE closing the session — never leave a module unspecced
3. Update NEXT-SESSION-PROMPT with analytics priority queue
4. Record any new schema discoveries as LL candidates

---
*WP-ANALYTICS Master Suite Document v1.0*
*NuAi · 11 April 2026*
*Author: George Fivaz + Claude.ai (Sonnet 4.6)*
*Next session reads: docs/WP-ANALYTICS.md THEN docs/WP-ANALYTICS-1.md*
