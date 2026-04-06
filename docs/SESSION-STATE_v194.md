# SESSION-STATE v194 — 07 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **HEAD:** a6fd602 (verify with git log --oneline -1)
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **RULE 0Q + LL-202:** GitHub write tools BANNED for Claude.ai — specs only, Claude Code writes

---

## ⚠️ CRITICAL TOOL ISSUE — READ FIRST

GitHub MCP `get_file_contents` returns a STALE CACHED SHA — cannot be trusted
for reading current file state. All Claude Code specs must grep-first.
Claude.ai specs must use grep-first instructions, not blind FIND strings.

---

## Session Apr 7 2026 — What Was Built

### Dashboard — TODAY Section (Information Bubbles)
All three TODAY tiles now follow the same structure:
  value → muted subLabel → gray context → colored callout last

**Today's Sales tile:**
- Compares vs yesterday (R amount + % delta)
- Compares vs same weekday last week (R amount + % delta)
- Two distinct metrics, not duplicates
- Arrow format: ↑↓ colored 600-weight, comparison amount in muted gray above
- Fetch: 3 windows in Promise.all (today, yesterday, week ago)
- State: ydayDelta + weekAgoDelta stored separately

**Transactions tile — Option A layout:**
- Three-column rows: ● dot · label · count · revenue
- cash=#059669 · card=#2563EB · yoco=#6366F1
- All columns in semantic color per method
- Tabular nums on count + revenue
- Ready for channel column when orders.channel added

**Avg Basket tile:**
- avgItems: from existing items_count (no extra query)
- bestDow: best avg-basket day of week over 30 days
- vsSevenD: today vs 7d avg (render-time delta, no state overhead)
- Format: "1.3 items avg · best day: Wed · ↑89% vs 7d avg"

### Commits This Session (chronological)
```
68cfe33  fix(toast): LL-TOAST-01 — cap 2 visible, dedup, slide-out exit animation
44ff1c2  feat(dashboard): P2 — Avg Basket tile information bubble
efd9859  fix(dashboard): fontWeight 600 on all semantic tile crumbs
3479a14  fix(dashboard): TODAY tile callout typography consistency
360a21f  fix(dashboard): Today's Sales — remove duplicate delta pill, vs last weekday
454a352  fix(dashboard): Today's Sales — arrow format matches Avg Basket tile
be22197  fix(dashboard): Today's Sales — label on arrow + color comparison amount
e736a0c  fix(dashboard): Today's Sales tile layout matches Transactions + Avg Basket
538d186  feat(dashboard): Transactions tile — three-column row layout
a6fd602  fix(dashboard): Today's Sales — two distinct comparison metrics
```

Pre-existing (prior session, referenced):
```
04af4ff  feat(dashboard): Transactions tile — payment method breakdown
500d1d1  docs: SESSION-STATE_v193 + WP-DASHBOARD-IB_v1_0
```

Intelligence audit: WP-INTELLIGENCE-AUDIT_v1_0.md committed to docs/ (this session)

---

## Dashboard Architecture (Current)

### Section Order
1. TODAY (3 tiles: Today's Sales / Transactions / Avg Basket)
2. Revenue — Last 30 Days (ComposedChart: bars + last month dashed + PH annotations)
3. THE SHELF (Stock Health / Purchase Orders / Revenue MTD / Reorder Alerts)
4. PRODUCT HEALTH (Stock by Category [drill-down] + Stock Value / Margin Health / Expiry)
5. Scan Activity — Last 30 Days (zero-filled all 30 days)
6. MEMBERS & LOYALTY (QR Scans / Loyalty Points / Comms / Fraud Alerts)
7. Scan Distribution (legend left of donut) + Volume by Type (no legend)
8. BIRTHDAYS
9. STORE PERFORMANCE (Avg Gross Margin / USD/ZAR with yesterday + 30d deltas)
10. Gross Margin gauge
11. Recent Scans + Low Stock Alerts
12. Quick Actions

### Chart Color System — LOCKED
CHART palette:
  Primary:    #6366F1  (indigo)
  Secondary:  #F472B6  (rose — public holidays)
  Tertiary:   #06B6D4  (cyan)
  Quaternary: #A78BFA  (violet)
  Neutral:    #94A3B8  (slate)
  Weekend:    #C7D2FE
  Grid:       #E2E8F0
  Axis:       #94A3B8

Semantic callout colors (LOCKED across all TODAY tiles):
  cash/success: #059669
  card/info:    #2563EB
  yoco/primary: #6366F1
  danger/down:  #DC2626

---

## Supabase Data State (Medi Rec b1bad266...) — AUDITED Apr 7 2026

### ⚠️ CORRECTED — Previous session state was wrong. Full audit in WP-INTELLIGENCE-AUDIT_v1_0.md

### orders — 426 paid
- 404: "POS sale [demo_seed_v1]" — SEED DATA
- 10:  "POS sale [demo_seed_v2]" — seeded this session
- 12:  notes = NULL — REAL LIVE ORDERS (MR-2026-0551 to MR-2026-0607, Apr 5–6)
- Missing: channel column (POS vs Online vs Wholesale)
- Payment methods: cash · card · yoco
- Status constraint: paid | pending | failed | cancelled | refunded

### order_items — EXISTS · 1,013 rows — ALL SEED DATA
- Schema: id, order_id, product_name, quantity, unit_price, line_total, product_metadata (JSONB), created_at
- product_metadata contains: { item_id, category }
- 1,002/1,013 rows have item_id linking to inventory_items (100% integrity)
- Missing: tenant_id column, inventory_item_id FK
- CRITICAL GAP: Real POS orders DO NOT write order_items. POS flow is broken at this level.

### stock_movements — 1,010 total
- 1,002 sale_out · ALL SEED DATA
- 8 purchase_in · REAL (stock receive, Mar 30)
- CRITICAL GAP: Real POS sales DO NOT write stock_movements.

### Inventory — 186 active SKUs, all 14 worlds
- Subcategories corrected: Flower (cultivation types), Hash & Kief, Concentrates
- expiry_date: 0 of 186 set — BLIND SPOT
- Unpriced: 5 SKUs (sell_price = 0, blocking sales)
- Stock value: R205,634 AVCO-weighted
- quantity_on_hand: MAY BE WRONG for items sold via real POS (no stock_movements written)

### Intelligence that works TODAY (seeded data):
- Best Sellers, Making You Money, Fast Movers: ✅ works · ⚠️ seed data only
- Margin Heroes, Stock Value, Reorder Alerts: ✅ works · ✅ real data
- Basket co-purchase pairs: ✅ proven infrastructure · ⚠️ seed data only

### Scans — 181 total (all Mar 12–23)
### Loyalty — 3,974 pts, 1 member (bronze), 0 last 7d
### fx_rates table — empty (Edge Function doesn't persist)

---

## Pending Items — Priority Order

### P0 — DONE ✅
LL-TOAST-01: Toast flooding fix committed `68cfe33`

### P1 — DONE ✅ (pre-existing `04af4ff`)
Transactions tile payment breakdown

### P2 — DONE ✅ `44ff1c2`
Avg Basket information bubble

### P3 — Revenue MTD run rate (The Shelf tile)
Add run rate + projected month-end to Revenue MTD tile.
Calculation: daysElapsed = today date number · runRate = MTD/days · projected = runRate×30
No new query needed — uses plStats.revenueMTD already in state.

### P4 — REDEFINED (was "add order_items table" — TABLE ALREADY EXISTS)
**Fix POS flow to write order_items on every sale**
1. grep -rn "from('orders').insert\|from(\"orders\").insert" src/ — find all call sites
2. Add order_items INSERT to each call site
3. Add stock_movements write (or verify DB trigger exists)
   Check: SELECT * FROM information_schema.triggers WHERE event_object_table = 'order_items';
4. Run orders.channel migration:
   ALTER TABLE orders ADD COLUMN channel TEXT CHECK (channel IN ('pos','online','wholesale')) DEFAULT 'pos';
   UPDATE orders SET channel = 'online' WHERE payfast_payment_id IS NOT NULL;

### P5 — order_items schema hardening
ALTER TABLE order_items ADD COLUMN tenant_id UUID, ADD COLUMN inventory_item_id UUID REFERENCES inventory_items(id);
Backfill from product_metadata. Set tenant_id NOT NULL. Update RLS.

### P6 — POS till session flow
No active session = locked out. Yoco keys sk_test_ needed.

### P7 — Dashboard tile layout rethink (Option B deferred)
Label + value on one row. Deferred until P4 fills tile 2 with real channel data.

### P8 — HQTradingDashboard palette
30-day bar + revenue-by-hour still on old green. Update to Indigo Intelligence.

### P9 — LL-SUBCATEGORY-01
Verify SmartInventory.js receiveAttrs col:"subcategory" wires to DB insert.

---

## Locked Files
- src/components/PlatformBar.js — LOCKED
- src/components/hq/LiveFXBar.js — PROTECTED
- src/components/StockItemModal.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED

---

## Lessons Learned

**LL-GH-MCP-01:** GitHub MCP get_file_contents returns stale cached SHA.
Cannot be trusted for reading current file state. All specs must grep first.

**LL-FX-ARCH-01:** Client-side Frankfurter fetch fails silently during long weekends.
Fix: moved to Edge Function server-side.

**LL-SUBCATEGORY-SEED-01:** Original bulk seed wrote generic subcategories.

**LL-INFO-BUBBLE-01:** Information bubble pattern is the core UX philosophy.
Formula: Primary KPI + delta(s) + operational callout.

**LL-INTELLIGENCE-01 (NEW):** order_items table exists but is seeded-only.
Real POS orders do not write order_items or stock_movements.
NEVER assume intelligence panels reflect real sales without verifying data source.
Full audit: docs/WP-INTELLIGENCE-AUDIT_v1_0.md

**LL-SEED-VS-REAL-01 (NEW):** Always distinguish seed data from real data.
Pattern to identify: check orders.notes field. demo_seed = seeded. NULL = potentially real.
Before any intelligence claim, verify: SELECT DISTINCT notes FROM orders WHERE tenant_id = ?

**LL-SESSION-STATE-LAG-01 (NEW — extends LL-193):** SESSION-STATE docs lag behind
code AND behind database reality. Always verify schema from Supabase directly.
Previous state claimed "NO order_items table" — table had 1,013 rows.
