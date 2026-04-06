# SESSION-STATE v198 — 07 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **RULE 0Q + LL-202:** GitHub write tools BANNED for Claude.ai — specs only, Claude Code writes

---

## ⚠️ CRITICAL TOOL ISSUE — CARRY FORWARD

GitHub MCP `get_file_contents` returns a stale cached SHA. Always `grep`/`cat` the
actual file before any str_replace. Verify line numbers on disk before writing specs.

---

## What Was Done This Session (v197–v198)

### Audit Session (v197)
- Full system audit — FEATURE-AUDIT_v1_0.md produced (78 features, 96 components, 104 tables)
- PLANNING-SESSION_v1_0.md produced (Sprint 1/2/3 roadmap, Kill List, Moat)
- VL-009 logged — CannabisDetailView wrongly listed as NOT WIRED (already in HQStock line 5051)
- LL-200 added — grep full src/ tree before marking any component as NOT WIRED

### Sprint 1 — Demo Ready (COMPLETE)

| Commit | What |
|---|---|
| `68cfe33` | Toast fix — max 2 visible, auto-dismiss, dedup |
| `538d186` | Transactions tile — Cash/Card/Yoco payment breakdown |
| `44ff1c2` | Avg Basket information bubble |
| `262d99b` | Revenue MTD run rate callout |
| `7a9ce9c` | Velocity-weighted reorder scoring |
| `4301631` | POS intelligence fix |
| `39f475e` | GeoAnalyticsDashboard wired + HQTradingDashboard Indigo palette |
| `d83a329` | ProteaAI CODEBASE_FACTS updated to v197 audit state |
| Supabase | HACCP seed — 3 control points (Receiving/Storage/Dispensing) |
| `887237c` | SESSION-STATE v197, VL-009, FEATURE-AUDIT correction, CLAUDE.md HEAD |

### Sprint 2 — Revenue Ready (COMPLETE)

| Task | Status | Detail |
|---|---|---|
| `orders.channel` column | Already existed | `text`, default `'pos'`, constraint `pos\|online\|wholesale` |
| `payfast-checkout channel: 'online'` | ✅ Deployed v44 | Supabase MCP — online orders now correctly tagged |
| Top sellers `order_items` wiring | Already done | line 234-237 HQTradingDashboard — disk ahead of docs |
| Expense seeding — 3 months (Jan–Mar) | ✅ 31 rows, R257,930 | Supabase MCP |
| Expense seeding — April 2026 | ✅ 10 rows, R74,000 | Claude Code + Supabase |
| SESSION-CORE `line_total` correction | ✅ `d7a6461` | `line_total` is plain numeric, NOT GENERATED |

---

## Current Data State (Medi Rec — 07 Apr 2026)

### Inventory
- 232 items total · 186 active SKUs · 14 product worlds
- Stock value: ~R205,634 AVCO-weighted
- Expiry dates: 0 of 186 set (still a blind spot — Sprint 3 item)
- 5 unpriced SKUs (sell_price = 0)

### Orders & Revenue
- orders: 1,513 rows (mix of real + seeded)
- order_items: 2,833 rows (per-SKU analytics operational)
- orders.channel: all existing = `pos` (default) · future online orders → `online` (EF v44)
- payment_method values in use: cash · card · yoco · payfast

### Expenses (P&L now meaningful)
- Total rows: 43 (2 original capex + 31 Jan–Mar + 10 April)
- Jan–Mar OPEX: R257,930 · Monthly avg: R85,977
- April OPEX: R74,000

**April 2026 OPEX breakdown:**
| Subcategory | Amount |
|---|---|
| Rent | R32,500 |
| Wages (2 budtenders) | R24,000 |
| Accounting | R3,500 |
| Electricity | R3,200 |
| Security | R2,800 |
| Marketing | R2,500 |
| Packaging | R1,800 |
| Insurance | R1,650 |
| Water & rates | R1,100 |
| Internet | R950 |

### Loyalty & Scans
- Loyalty transactions: 263 · Points: 3,974 · Members: 1 (bronze)
- Scans: 181 (all Mar 12–23) · QR codes: 60
- double_points_campaigns: 0 rows (campaign feature untested)

### HACCP (newly seeded)
- 3 control points: Raw Material Receiving (biological) · Storage Temperature (physical) ·
  Dispensing Accuracy (chemical)
- haccp_log_entries: 0 · haccp_nonconformances: 0

### Other
- fx_rates: 712 rows (EF v35 persisting correctly)
- pos_sessions: 90 · eod_cash_ups: 90
- suppliers: 5 · supplier_products: 123
- purchase_orders: 6 · purchase_order_items: 27

---

## Schema Facts — Confirmed or Corrected This Session

```
orders.channel:     text, default 'pos', constraint pos|online|wholesale (already existed)
orders_channel_check: already existed — schema was ahead of SESSION-STATE v193
order_items.line_total: plain numeric — NOT GENERATED (SESSION-CORE v2.11 was wrong, corrected d7a6461)
haccp_control_points.hazard_type: CHECK constraint requires lowercase: biological|chemical|physical|allergen
expenses.category:  no constraint — opex and capex both in use
```

---

## Pending Items — Priority Order

### P0 — Nothing blocking (Sprint 1 + 2 complete)

### P1 — POS Till session (blocked on Yoco keys)
No active pos_session = POS locked. Yoco sk_test_ keys not yet in tenant_config.
Steps when ready: configure Yoco test keys → open session → test one cash sale → EOD.

### P2 — Information Bubble rollout (continue)
Next section: THE SHELF tiles (Stock Health stale count, Reorder categories).
Then: Avg Basket already done. Revenue MTD done.
Spec in WP-DASHBOARD-IB_v1_0.md.

### P3 — LL-SUBCATEGORY-01
Verify SmartInventory.js receiveAttrs subcategory wires to DB insert.
Test: create concentrate via Smart Catalog → check DB.

### P4 — Dashboard action tiles navigate on click

### P5 — HQTradingDashboard — confirm top sellers renders correctly
order_items has 2,833 rows. Verify top sellers section actually shows
product_name data (some rows may have empty product_name from seeding).

### Sprint 3 — Platform Ready (next major milestone)

1. **TenantSetupWizard entry point** — 52KB wizard exists, NOT wired.
   Add "Add new tenant" button in HQTenants.js → opens TenantSetupWizard.
   This is THE platform-critical feature. Without it: client #2 = manual DB work.

2. **Self-service onboarding dry run** — create test tenant through wizard,
   confirm CANNABIS_RETAIL_WATERFALL renders correctly, confirm RLS isolation.

3. **inventory_items.expiry_date** — 0 of 186 set. Add to receive flow or bulk-edit.

4. **RLS cross-tenant audit** — 5 key tables: orders, inventory_items,
   loyalty_transactions, staff_profiles, eod_cash_ups.

5. **invoices first use** — wholesale order → invoice → payment recorded.

---

## Lessons Learned This Session

**LL-200 — AUDIT SUB-COMPONENT WIRING CHECK** (new, v197)
Before marking any component NOT WIRED: `grep -rn "ComponentName" src/`
CannabisDetailView was wired inside HQStock.js line 5051, invisible from page imports.
Origin: VL-009 — 07 Apr 2026.

**LL-201 — SCHEMA IS AHEAD OF DOCS ON THIS PROJECT** (new, v198)
Multiple Sprint 2 "tasks" were already done in the schema or codebase:
- orders.channel existed with correct constraint
- orders_channel_check constraint existed
- HQTradingDashboard top sellers already queried order_items (line 234)
- CannabisDetailView already wired in HQStock (line 5051)
Before starting any build task: read the relevant file + query the relevant table.
Assume the system is 1-2 sprints ahead of the docs.
Origin: Sprint 2 session — 07 Apr 2026.

**LL-GH-MCP-01 (carry forward)**
GitHub MCP returns stale cached SHA. Always grep/cat current file before str_replace.

**LL-INFO-BUBBLE-01 (carry forward)**
Information bubble formula: Primary KPI + delta(s) + operational callout.
Every tile should answer "what does this number mean right now?"

---

## Locked Files
- src/components/PlatformBar.js — LOCKED
- src/components/hq/LiveFXBar.js — PROTECTED
- src/components/StockItemModal.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED

---

*SESSION-STATE v198 · NuAi · 07 Apr 2026*
*Sprint 1 complete (8 commits + HACCP seed)*
*Sprint 2 complete (payfast-checkout v44 + 41 expense rows + d7a6461 SESSION-CORE fix)*
*Next: Sprint 3 — TenantSetupWizard + self-service onboarding*
