# SESSION-STATE v195 — 07 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **RULE 0Q + LL-202:** GitHub write tools BANNED for Claude.ai — specs only, Claude Code writes

---

## ⚠️ CRITICAL TOOL ISSUE — READ FIRST

GitHub MCP `get_file_contents` returns a STALE CACHED SHA — cannot be trusted
for reading current file state. All Claude Code specs must grep-first.

---

## Session Apr 7 2026 — All Commits

| SHA | What |
|---|---|
| `68cfe33` | P0: LL-TOAST-01 toast flooding fix |
| `04af4ff` | P1: Transactions tile breakdown (pre-existing) |
| `44ff1c2` | P2: Avg Basket information bubble |
| `efd9859` | Typography: fontWeight 600 on semantic callouts |
| `360a21f` | Today's Sales: vs same weekday last week, removed duplicate pill |
| `454a352` | Today's Sales: arrow format + layout |
| `3479a14` | Today's Sales: fontSize consistency, span→div crumb wrapper |
| (various) | Today's Sales two-metric comparison, Transactions Option A layout |
| `9827903` | Docs: SESSION-STATE v194 + WP-INTELLIGENCE-AUDIT_v1_0.md |
| `4301631` | P4: POSScreen stock_movements error check + orders.channel |

---

## Dashboard Architecture (Current)

### TODAY Tile Pattern — LOCKED
All three tiles follow: value → muted subLabel → gray context → colored callout last

**Today's Sales:**
- Two comparison metrics (distinct, not duplicates):
  - Metric 1: today vs yesterday (R amount + colored ↑↓ % arrow)
  - Metric 2: today vs same weekday last week (R amount + colored ↑↓ % arrow)
- Fetch: Promise.all([today, yesterday, weekAgo]) — 3 windows
- State: todaySummary { rev, txns, avgBasket, avgItems, ydayRev, ydayDelta, weekAgoRev, weekAgoLabel, weekAgoDelta, txnDelta, avg7d, bestDow }

**Transactions tile — Option A layout:**
- Three-column rows: ● dot · label · count · revenue
- cash=#059669 · card=#2563EB · yoco=#6366F1
- All columns semantic color per method · tabular nums
- Ready for channel column when orders.channel UI is wired

**Avg Basket tile:**
- avgItems: computed from existing items_count (no extra query)
- bestDow: best avg-basket day of week over 30 days
- vsSevenD: render-time delta (avgBasket vs avg7d)

### Semantic callout typography — LOCKED
fontSize: 11 · fontWeight: 600 · semantic color · Inter

---

## Supabase Schema State — CONFIRMED 07 Apr 2026

### orders
```
Columns: id, user_id, tenant_id, order_ref, status, total, currency,
         payfast_payment_id, payment_method, channel, items_count,
         notes, created_at, updated_at
channel: TEXT CHECK (channel IN ('pos','online','wholesale')) DEFAULT 'pos'
         Added via migration this session. Back-filled: payfast → 'online'
```

### order_items
```
Columns: id, order_id, product_name, quantity, unit_price, line_total,
         product_metadata (JSONB: {item_id, category, weighted_avg_cost}),
         created_at
Note: No tenant_id directly (via orders join). No inventory_item_id FK.
RLS: hq_select_all_order_items (is_hq_user()) + users own orders
```

### stock_movements enum (movement_type)
```
purchase_in · sale_out · adjustment · waste · transfer ·
production_in · production_out · sale_pos (ADDED this session)
```

---

## Intelligence State — CORRECTED (full audit: docs/WP-INTELLIGENCE-AUDIT_v1_0.md)

### ✅ What was discovered this session:
- order_items EXISTS — 1,013 rows — ALL seed data (demo_seed_v1)
- POSScreen.js ALREADY HAD order_items + stock_movements write code
- Bug was: `movement_type: "sale_pos"` not in enum → silent failure → fixed
- The 12 "real" orders (MR-2026-0551 to 0607) were manually entered — not from POSScreen
- All 404 seeded orders belong to ONE user (Medi Admin) — no real customer diversity yet

### After `4301631` every POS sale correctly writes:
- ✅ orders (with channel: "pos")
- ✅ order_items (product_name, quantity, unit_price, line_total, product_metadata)
- ✅ stock_movements (movement_type: "sale_pos", now valid)
- ✅ inventory_items.quantity_on_hand (was always working)

### What still needs doing:
- CheckoutPage.js: add `channel: 'online'` to the payfast-checkout Edge Function call
- payfast-checkout Edge Function: add `channel: 'online'` to orders INSERT
- order_items: add tenant_id + inventory_item_id FK (schema hardening — separate session)

---

## Pending Items — Priority Order

### P3 — Revenue MTD run rate (The Shelf tile)
Add run rate + projected month-end to Revenue MTD MetricTile.
```
Revenue MTD
R151,415
60.9% avg margin
R6,054/day run rate · projected R182k month end
```
Calculation (render-time, no new query):
  daysElapsed = new Date().getDate()
  runRate = plStats.revenueMTD / daysElapsed
  projected = runRate * 30
File: src/components/hq/HQOverview.js — Revenue MTD MetricTile sub prop only.

### P4b — Add channel: 'online' to online checkout flow
File 1: src/pages/CheckoutPage.js
  The PayFast invoke body does NOT write to orders directly — Edge Function does.
  But CheckoutPage stores items in localStorage for OrderSuccess.
  Check if CheckoutPage has a direct orders.insert — if not, skip to Edge Function.

File 2: payfast-checkout Edge Function
  Add channel: 'online' to orders INSERT inside the function.
  Deploy via Supabase MCP after editing.

### P5 — POS till session flow
No active session = warning badge shown, sales still process.
Yoco keys sk_test_ needed for card payment integration.

### P6 — HQTradingDashboard palette
30-day bar + revenue-by-hour still on old green. Update to Indigo Intelligence.

### P7 — Dashboard tile layout rethink (Option B — deferred)
Label + value on one row. Deferred until channel split populates Tile 2.

### P8 — order_items schema hardening
Add tenant_id + inventory_item_id FK. Backfill from product_metadata.
Separate session — no urgent intelligence impact now that POS writes correctly.

---

## Locked Files
- src/components/PlatformBar.js — LOCKED
- src/components/hq/LiveFXBar.js — PROTECTED
- src/components/StockItemModal.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED

---

## Lessons Learned (additions this session)

**LL-INTELLIGENCE-01:** order_items table exists but was seeded-only.
Real POS sales were failing silently due to enum bug (sale_pos not in enum).
NEVER assume intelligence panels reflect real sales without verifying data source.
Full audit: docs/WP-INTELLIGENCE-AUDIT_v1_0.md

**LL-SEED-VS-REAL-01:** Always distinguish seed data from real data.
Pattern: check orders.notes field. demo_seed = seeded. NULL = real or manual.
Before any intelligence claim: SELECT DISTINCT notes FROM orders WHERE tenant_id = ?

**LL-SESSION-STATE-LAG-01 (extends LL-193):** SESSION-STATE docs lag behind
code AND behind database reality. Previous state claimed "NO order_items table"
— table had 1,013 rows. Always verify schema from Supabase directly.

**LL-SUPABASE-SILENT-FAIL-01 (NEW):** Supabase JS client returns {data, error}
— it does NOT throw on DB errors. Always destructure and check error:
  const { error } = await supabase.from(...).insert(...)
  if (error) console.warn(...)
Unchecked inserts silently fail. This caused stock_movements to never write
on POS sales despite correct code. Rule: every DB write must check its error.

**LL-ENUM-CHECK-01 (NEW):** Before using a custom enum value in application code,
verify it exists: SELECT enumlabel FROM pg_enum WHERE typname = 'your_enum_type'.
"sale_pos" was used in POSScreen.js but never added to movement_type enum.
