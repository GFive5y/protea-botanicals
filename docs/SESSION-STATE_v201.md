# SESSION-STATE v201 — 07 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **RULE 0Q + LL-202:** GitHub write tools BANNED from Claude.ai — Claude Code only
- **LL-201:** Disk is always ahead of docs. Read before building.
- **LL-204:** Read TenantPortal.js renderTab AND waterfall before adding nav entries.

---

## Session v200 Commit Log (complete)

| SHA | What |
|---|---|
| `ce97f21` | 6 docs — v199 audit, PRODUCT-FEATURES v2, 3 WP specs |
| `e17f5fc` | sim-pos-sales v2 EF + HQTenants sim UI panel |
| `b2b8a49` | P&L Intelligence — real COGS, Gross Profit by Product |
| `2122943` | Sim button 55s AbortController timeout |
| `c6ce5ca` | P&L — remove bogus sale_out wholesale revenue |
| `7120142` | ESLint — remove stale filteredWholesaleMovements |
| `c350c36` | WP-FORECAST — HQForecast.js, all 4 sections, wired to HQDashboard |
| `a102dca` | Expenses DATE vs timestamp bug — R87K OPEX now showing |
| `4abe090` | ProteaAI CODEBASE_FACTS v200 — 119 features, 62% margin |
| `6b34b90` | TenantPortal — Forecast + Costing in both waterfalls |
| `60963ee` | SESSION-STATE v200 committed |

---

## Current System State

### What is working
- **P&L:** R477K revenue · R297K gross profit · 62% margin · R87K OPEX showing
- **Balance Sheet:** Live · accounting equation passing · R15K equity
- **Cash Flow:** Live · waterfall chart · expenses now feeding in
- **Forecasting:** HQForecast.js live — 30-day projection, stock depletion, restock spend
- **Sim engine:** sim-pos-sales v4 deployed · 438 sim orders in DB
- **TenantPortal Reports:** P&L · Expenses · Analytics · Reorder · Balance Sheet · Costing · Forecast
- **Comms:** AdminCommsCenter wired in TenantPortal (confirmed LL-201 — was already there)
- **ProteaAI:** CODEBASE_FACTS v200 — 119 features, 7 portals, 62% margin, full fin suite

### DB State (07 Apr 2026)

| Table | Rows | Notes |
|---|---|---|
| orders | 461 | Sim + real (sim tagged sim_data_v1) |
| order_items | 1,094 | AVCO in product_metadata confirmed |
| stock_movements | 2,289 | Real + sim |
| inventory_items | 232 | 186 active, ~R15K AVCO |
| expenses | 44 | R331,620 total · subcategories INCONSISTENT |
| eod_cash_ups | 90 | Real cashups Jan-Apr |
| pos_sessions | 120 | Real + sim |
| fx_rates | 724 | Persisting correctly |
| tenants | 5 | 4 real + Test Dispensary CT |

**CRITICAL NOTE ON EXPENSES:** Subcategories are inconsistent:
`"rent"` vs `"Rent & Premises"`, `"wages"` vs `"Staff Wages"`, etc.
The normalisation SQL is in `docs/WP-FINANCIALS-v1_1.md` Section 6.
Run via `Supabase:apply_migration` BEFORE building WP-FINANCIALS Phase 2.

### Edge Functions (10 active)

| Function | Version | Status |
|---|---|---|
| ai-copilot | v58 | ACTIVE |
| sim-pos-sales | v4 | ACTIVE — CORS fixed, ignoreDuplicates on eod |
| create-admin-user | v1 | ACTIVE |
| payfast-checkout | v44 | ACTIVE |
| payfast-itn | v39 | ACTIVE |
| sign-qr | v36 | ACTIVE |
| verify-qr | v34 | ACTIVE |
| send-notification | v37 | ACTIVE |
| get-fx-rate | v35 | ACTIVE |
| process-document | v49 | ACTIVE |

---

## Next Priority — WP-FINANCIALS-v1.1

Full spec at: `docs/WP-FINANCIALS-v1_1.md`

**This is a platform feature, not a Medi Rec configuration.**

Build sequence (Phase 0 first):
Phase 0: Financial Setup Wizard (HQFinancialSetup.js) — gateway component
Phase 1: Schema migrations (8 new tables + column additions)
Phase 2: Income Statement IFRS upgrade
Phase 3: Balance Sheet upgrade
Phase 4: Fixed Asset Register (HQFixedAssets.js)
Phase 5: Journal Entry Module (HQJournals.js)
Phase 6: VAT Module (HQVat.js)
Phase 7: Bank Reconciliation (HQBankRecon.js)
Phase 8: Notes to Financial Statements
Phase 9: PDF Export Edge Function (generate-financial-statements)
Phase 10: Year-End Close Process

---

## Other Outstanding Items

**Yoco keys** — POS till blocked. No code change needed. Keys only.

**ProteaAI CODEBASE_FACTS** — current as of 4abe090. Will need update after
WP-FINANCIALS is built (new features, new tables).

**HQProduction audit** — 310KB file, likely undocumented sub-features.
Not urgent. Revisit after WP-FINANCIALS.

---

## Locked Files — Never Modify Without Explicit Owner Request
```
src/components/StockItemModal.js   — LOCKED
src/components/ProteaAI.js         — LOCKED (str_replace CODEBASE_FACTS only)
src/components/PlatformBar.js      — LOCKED
src/components/hq/LiveFXBar.js     — PROTECTED
src/components/hq/HQStock.js       — PROTECTED
```

---

*SESSION-STATE v201 · NuAi · 07 Apr 2026*
