# SESSION-STATE v200 — 07 Apr 2026
## Milestone: Full Financial Intelligence Suite Live

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **RULE 0Q + LL-202:** GitHub write tools BANNED for Claude.ai — specs only, Claude Code writes

---

## Session v200 — Complete Commit Log

| SHA | What |
|---|---|
| `ce97f21` | docs: v199 deep audit — 119 features, 3 WP specs, P&L intelligence data |
| `e17f5fc` | feat: WP-SIM-POS-v2 — pos_sessions + movements + eod + UI toggle in HQTenants |
| `b2b8a49` | feat: WP-P&L-INTELLIGENCE-v1 — real COGS from order_items AVCO, margin by product |
| `2122943` | fix: HQTenants sim button — 55s AbortController timeout + better error msg |
| `c6ce5ca` | fix: remove sale_out movements from P&L revenue — not a revenue source (LL-203) |
| `7120142` | fix: remove stale wholesaleMovements state + setter — ESLint cleanup (LL-203) |
| `c350c36` | feat: WP-FORECAST-v1 — 30d projection, stock depletion, cash flow |
| `a102dca` | fix: Cash Flow expenses query — DATE column filter corrected, R87K OPEX now showing |
| `4abe090` | feat: ProteaAI CODEBASE_FACTS v200 — 119 features, 62% margin, full financial suite |
| `6b34b90` | feat: TenantPortal Reports — add Forecast + Costing to cannabis waterfall |

---

## What Was Built This Session

### WP-SIM-POS-v2.0 — Simulator Engine Upgrade
- sim-pos-sales v4 deployed to Supabase (ACTIVE, verify_jwt=false)
- Now writes: orders + order_items + stock_movements + pos_sessions + eod_cash_ups
- Category weights v2: flower 30%, concentrate 25%, accessory 20%, hardware 12%
- 15% chance of bulk quantity (2-3 units) per line item
- eod_cash_ups: system_cash_total + counted_cash with ±5% variance (variance GENERATED — never insert)
- CORS fixed, ignoreDuplicates on eod_cash_ups for re-run safety
- UI toggle in HQTenants.js: Run 30 Days / Run 7 Days / Wipe Sim Data
- AbortController 55s timeout on invoke calls

### WP-P&L-INTELLIGENCE-v1.0 — Transaction-Level P&L
- HQProfitLoss now uses order_items × product_metadata weighted_avg_cost for COGS
- Priority chain: order_items AVCO > production_out AVCO > recipe estimates
- COGS label shows "(actual)" when using order_items data
- "Gross Profit by Product" section: top 10 by GP or margin %, toggle, color-coded badges
- Removed bogus wholesale revenue (sale_out movements × sell_price was NOT revenue)
- Cleaned up wholesaleMovements state and all stale references

### WP-FORECAST-v1.0 — Financial Forecasting Engine
- New HQForecast.js component wired to HQDashboard + TenantPortal
- Section 1: Revenue + GP + Net Income projection (5 KPI tiles with daily rate)
- Section 2: Stock Depletion Forecast (per-SKU days until empty, CRITICAL/ORDER badges)
- Section 3: Restock Spend Forecast (items needing restock, cost, cash headroom)
- Section 4: Cash Flow Projection (opening cash + revenue - COGS - OPEX - restock)
- Confidence badge: High (14d+) / Medium (7-13d) / Low (<7d)

### Cash Flow Expenses Fix
- HQBalanceSheet.js: expense_date is DATE column, was being compared to ISO timestamps
- Fix: .slice(0, 10) to strip to YYYY-MM-DD before .gte/.lte
- HQProfitLoss already had correct pattern — only HQBalanceSheet was broken

### TenantPortal Financial Suite Complete
- Cannabis Intelligence section: P&L · Costing · Analytics · Reorder · Balance Sheet · **Forecast**
- Generic Reports section: P&L · Expenses · Analytics · Reorder · Balance Sheet · **Costing** · **Forecast**
- P&L desc updated: "margin by product" added
- Comms: confirmed already wired (LL-201 — disk ahead of docs)

### ProteaAI CODEBASE_FACTS v200
- Updated to 119 features, 7 portals, 62% blended margin, full financial suite
- All Edge Functions listed with versions
- Schema facts corrected (expenses DATE column, tenants type constraint)

---

## Current System State

### Financial Intelligence — ALL LIVE
| Metric | Value |
|---|---|
| Revenue (sim 30d) | R477,880 |
| COGS (actual, from order_items AVCO) | R181,000 |
| Gross Profit | R297,000 |
| Blended Margin | 62% |
| OPEX (last 30d from expenses) | R87,210 |
| Top Margin Product | Shatter 1g at 80.2% |
| Forecast: Projected Net Income | R108,520/month |

### Simulator Data (sim-pos-sales v4)
| Table | Sim Rows | Tag |
|---|---|---|
| orders | 438 | sim_data_v1 |
| order_items | 1,083 | via order FK |
| stock_movements | 1,083 | sim_data_v1 |
| pos_sessions | 30 | sim_data_v1 |
| eod_cash_ups | 30 | sim_data_v1 |

### Platform Stats
- Features: 119 documented (FEATURE-AUDIT v2.0)
- Portals: 7 (HQ 34 tabs · TenantPortal · Admin 13 tabs · Shop 4 tabs · HR 14 tabs · Staff · Wholesale)
- Component files: 130+
- DB tables: 104 (58 with data)
- DB functions: 35
- Edge Functions: 10 active
- Tenants: 5 (4 real + 1 test)
- Inventory: 232 items, 186 active

### TenantPortal Reports Section (7 tabs)
P&L · Costing · Analytics · Reorder · Balance Sheet · Forecast · Expenses (generic only)

---

## Pending — Priority Order

### P1 — Yoco Keys → Real POS Till
No active pos_session = POS locked. Yoco sk_test_ keys not yet in tenant_config.
Steps: configure Yoco test keys → open session → test one cash sale → EOD.
This is the ONLY blocker to real revenue flow.

### P2 — HQProduction Deep Audit
310KB — largest file in system. Almost certainly contains undocumented sub-features.
Needs dedicated session with header reads on all internal sub-components.

### P3 — CustomerInbox + CustomerSupportWidget
53KB combined — built but no nav entry. Wire to TenantPortal or Admin.

### P4 — Inventory Expiry Dates
0 of 186 SKUs have expiry_date set. Add to receive flow or bulk-edit.

### P5 — TenantSetupWizard Full Test
Dry run confirmed successful. Needs second client onboarding end-to-end test
with real data flow: tenant → first SKU → first sale → first EOD.

---

## Lessons Learned This Session

**LL-203 — STOCK MOVEMENTS ARE NOT REVENUE** (new)
sale_out stock_movements × sell_price was incorrectly used as "wholesale revenue"
in HQProfitLoss.js. Stock movements are inventory audit trail, not sales records.
Revenue sources: orders WHERE status='paid' ONLY.
Origin: P&L fix session — 07 Apr 2026.

**LL-204 — CHECK WATERFALL + RENDERTAB BEFORE WIRING** (new)
Before adding any nav entry to TenantPortal, read the CANNABIS_RETAIL_WATERFALL arrays
AND the renderTab switch. Disk often already has the entry (LL-201 pattern).
AdminCommsCenter was already wired — import line 36, waterfall line 376, renderTab line 495.
Origin: Comms wiring check — 07 Apr 2026.

**LL-201 (carry forward) — DISK IS AHEAD OF DOCS**
Before any build task: verify disk. Assume feature might already exist.

**LL-GH-MCP-01 (carry forward)**
GitHub MCP returns stale cached SHA. Always grep/cat before str_replace.

---

## Locked Files
- src/components/PlatformBar.js — LOCKED
- src/components/hq/LiveFXBar.js — PROTECTED
- src/components/StockItemModal.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED

---

*SESSION-STATE v200 · NuAi · 07 Apr 2026*
*10 commits · Full financial intelligence suite live*
*P&L: actual COGS from order_items AVCO · Forecasting: 30d projection + stock depletion + cash flow*
*Next: Yoco keys → first real POS transaction*
