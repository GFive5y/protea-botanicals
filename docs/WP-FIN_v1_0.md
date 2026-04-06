# WP-FIN — Live Financial Intelligence
## Version: v1.1 · Authored: March 23, 2026 · Updated: March 23, 2026
## Status: SPEC ONLY — not started. Read before building.

---

## THE PROBLEM

HQProfitLoss.js v2.6 looks like a live P&L but it is not. The critical gaps:

### What is live today:
- `orders` table — website revenue ✅ (real-time subscription active)
- `purchase_orders` (received/complete) — inventory investment ✅
- `product_cogs` recipes — per-unit margin estimates ✅ (estimated, not actual)
- `loyalty_transactions` — loyalty cost ✅

### What is broken today:
- **OPEX is in-memory `useState`** — `addOpex()` writes to React state only.
  Refresh the page and every manually entered cost item is gone.
  OPEX has never been persisted. The P&L net profit figure is fictional.
- **COGS is recipe-estimated** — it calculates what a unit *should* cost
  based on HQCogs recipes, not what was actually spent on raw materials.
- **CAPEX has no home** — equipment, setup costs, infrastructure purchases
  are not tracked anywhere.
- **Wholesale revenue is hardcoded as R0** with a "Not yet tracked" note.
- **No expense persistence** — the `expenses` table was created but nothing writes to it yet.
- **No VAT tracking** — all figures are VAT-exclusive with no VAT line.

### The core architectural problem:
The current P&L reads from COGS recipes (what things should cost) instead of
from stock_movements (what was actually spent). The moment actual production
deviates from the recipe — different terpene %, yield loss, substitution —
the P&L is wrong. For a live business this is not acceptable.

---

## THE SOLUTION — WP-FIN Architecture

### Guiding principle:
Every number on the P&L must trace back to a DB row.
No in-memory state. No estimates. No manual entry that isn't persisted.

### Data flow:

```
REVENUE
  orders           → website_revenue (live, already working)
  wholesale_orders → wholesale_revenue (to wire)

ACTUAL COGS (replace recipe estimates)
  stock_movements WHERE movement_type = 'production_out'
  → weighted_avg_cost on each item at time of movement
  → actual cost of materials consumed per batch

GROSS PROFIT = Revenue - Actual COGS

OPEX (persist to expenses table)
  expenses WHERE category = 'opex'
  → rent, utilities, wages, marketing, subscriptions

CAPEX (persist to expenses table)
  expenses WHERE category = 'capex'
  → equipment, setup costs, leasehold improvements

NET PROFIT = Gross Profit - OPEX
(CAPEX shown separately as capital expenditure, not deducted from net profit)
```

---

## WP-FIN SESSION PLAN

### Session 1 — Expense Engine + OPEX Persistence
Replace in-memory OPEX with live `expenses` table reads.
New `ExpenseManager` component.

### Session 2 — Actual COGS from stock_movements
Replace recipe-estimated COGS with actual production costs.

### Session 3 — Document → Expense Auto-Creation
AI detects expense documents and auto-creates expense rows.

### Session 4 — Wholesale Revenue
Wire wholesale revenue from stock_movements sale_out.

### Session 5 — VAT + Tax Provisions (if needed)
Defer until owner confirms VAT registration status.

### Session 6 — Balance Sheet + Cash Flow (Phase 2)
Assets (inventory at AVCO + CAPEX) vs Liabilities vs Equity.

---

## P&L STATE AFTER WP-FIN (target):

```
P&L Line              Source                    Status
═══════════════════════════════════════════════════════════
Website Revenue       orders.total              ✅ LIVE
Wholesale Revenue     stock_movements sale_out  ✅ LIVE (S4)
Total Revenue         sum of above              ✅ LIVE

Actual COGS           stock_movements prod_out  ✅ LIVE (S2)
  × weighted_avg_cost per item at AVCO
Total COGS            sum of above              ✅ LIVE

Gross Profit          Revenue - Actual COGS     ✅ LIVE

Loyalty Cost          loyalty_transactions      ✅ LIVE
OPEX                  expenses WHERE cat=opex   ✅ LIVE (S1)
Total OPEX            SUM from expenses table   ✅ LIVE

Net Profit            Gross - OPEX              ✅ LIVE

CAPEX this period     expenses WHERE cat=capex  ✅ LIVE (S1)
VAT Liability         orders.vat - exp.vat_in   ✅ LIVE (S5)
```

---

## IMPLEMENTATION RULES

```
1. RULE 0F — tenant_id on every expenses INSERT
2. RULE 0G — useTenant() inside ExpenseManager component
3. RULE 0H — never patch expenses table manually to fix P&L display
4. AVCO must be populated before Session 2 (check with SQL)
5. Never mix recipe estimates with actual stock_movement data in same P&L
6. All period filters must use consistent timezone (Africa/Johannesburg)
7. expenses.amount_zar is always the ZAR equivalent
8. Loyalty cost calculation stays in P&L engine (not expenses table)
```

---

*WP-FIN v1.1 · Protea Botanicals · March 23, 2026*
*Upload to project knowledge. Do not build until owner answers KEY TECHNICAL DECISIONS.*
