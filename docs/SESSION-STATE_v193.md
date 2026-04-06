# SESSION-STATE v193 — 07 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **RULE 0Q + LL-202:** GitHub write tools BANNED for Claude.ai — specs only, Claude Code writes

---

## ⚠️ CRITICAL TOOL ISSUE — READ FIRST

GitHub MCP `get_file_contents` returns a STALE CACHED SHA (`9c872daa`) — the
original pre-session file — regardless of what has been committed. This caused
multiple failed str_replace specs this session because FIND strings were written
against old code.

**Claude Code MUST always run `grep` or `cat` before any str_replace.**
**Claude.ai specs must use grep-first instructions, not blind FIND strings.**

---

## Session Apr 7 2026 — What Was Built

### Dashboard — Information Bubbles (NEW CONCEPT THIS SESSION)
Philosophy: every tile answers "what does this number mean right now?"
Pattern: Primary KPI + Comparative delta(s) + Operational callout
Gold standard: FX tile — R16.9776 + ↓0.20% vs yesterday + ↑1.55% vs 30 days

### Commits this session (approx SHAs — use git log to verify)
- FX tile: reads `usd_zar_yesterday` from Edge Function response
- QR Scans tile: stacked period lines (2 scans last 7 days / 181 last 30 days)
- Loyalty Points tile: stacked period lines (10 pts last 7d / 3,974 pts last 30d)
- FX tile: added vs 30 days delta row (2nd comparison line)
- Data audit: full Medi Rec intelligence audit performed

### Edge Function — get-fx-rate v35 (deployed via Supabase MCP)
Returns: `usd_zar`, `eur_zar`, `usd_zar_yesterday`, `usd_zar_30d`, `fetched_at`, `source`
Yesterday + 30d: fetched from `api.frankfurter.app/{DATE}?from=USD&to=ZAR`
Frankfurter auto-falls back to last business day (handles weekends/PH)
Cache: 60 minutes via fx_rates table

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
  Primary:    #6366F1  (indigo — weekday bars, main data)
  Secondary:  #F472B6  (rose — public holidays)
  Tertiary:   #06B6D4  (cyan)
  Quaternary: #A78BFA  (violet)
  Neutral:    #94A3B8  (slate — last month dashed line)
  Weekend:    #C7D2FE  (indigo-200 light wash)
  Grid:       #E2E8F0
  Axis:       #94A3B8

FIN palette: revenue #059669 · cost #DC2626 · rate #2563EB
CHART.cat (donut/bar rotation): [#6366F1, #F472B6, #06B6D4, #A78BFA, #94A3B8]

### Revenue Chart
- ComposedChart: Bar (colored by dayType) + Line (last month dashed slate)
- Data: { date, fullDate, total, lastMonth, dayType, phName }
- SA_PUBLIC_HOLIDAYS hardcoded constant 2025–2026
- X-axis: all 30 days, 8px two-line custom tick (abbr + date number)
- Legend: 3 bar swatches + dashed line, inline above chart

### Stock by Category — Drill-down
- 14 Product Worlds via worldForItem() subcategory-first matching
- selectedWorld state: null = overview, worldId = drill-down
- Back: SVG chevron in ChartCard action slot (top right)
- Title: "Stock by Category" → "Stock by Sub Category"
- byWorldSub built alongside byCat in fetchCannabisData

### FX Tile
- Live rate via Edge Function (open.er-api.com)
- Yesterday delta: ↓ green = rand strengthened, ↑ red = weakened
- 30-day delta: same color logic
- Countdown timer 60s + manual refresh

---

## Supabase Data State (Medi Rec b1bad266...)

### Inventory — 186 active SKUs, all 14 worlds
- Subcategories corrected: Flower (cultivation types), Hash & Kief, Concentrates
- last_movement_at: 23 moved last 7d, 162 stale >30d
- expiry_date: 0 of 186 set — BLIND SPOT
- Unpriced: 5 SKUs (sell_price = 0, blocking sales)
- Stock value: R205,634 AVCO-weighted

### Orders
- Payment methods: cash · card · yoco
- Status constraint: paid | pending | failed | cancelled | refunded (NOT 'completed')
- NO order_items table — biggest intelligence gap
- NO channel field — cannot distinguish POS vs Online vs Wholesale

### Scans — 181 total (all Mar 12–23)
### Loyalty — 3,974 pts, 1 member (bronze), 0 last 7d
### fx_rates table — empty (Edge Function doesn't persist)

---

## Pending Items — Priority Order

### P0 — FIRST THING NEXT SESSION
**LL-TOAST-01:** Toast notifications flood — stack visually, look cheap.
Fix: max 2 visible, auto-dismiss, slide-out animation, deduplicate identical messages.
File: SmartInventory.js / catalog toast call sites.

### P1 — Transactions Tile Payment Breakdown (spec in WP-DASHBOARD-IB_v1_0.md)
Inline Cash · Card · Yoco breakdown + "R1,655 cash in till" callout.
State: todayPayments
Query: SELECT payment_method, COUNT(*), SUM(total) FROM orders WHERE DATE(today) GROUP BY payment_method
Colors: cash=#059669 · card=#2563EB · yoco=#6366F1

### P2 — Information Bubble rollout section by section
See WP-DASHBOARD-IB_v1_0.md for full audit + priority queue.
Order: Transactions → Avg Basket → Revenue MTD run rate → Stock Health stale count → Reorder categories

### P3 — LL-SUBCATEGORY-01
Verify SmartInventory.js receiveAttrs col:"subcategory" wires to DB insert.
Test: create concentrate via Smart Catalog → check subcategory field populated.

### P4 — Schema gaps (separate session)
- Add orders.channel enum: pos / online / wholesale
- Add order_items table (product-level sales intelligence)
- Populate inventory_items.expiry_date

### P5 — POS till session flow
No active session = locked out. Yoco keys sk_test_ needed.

### P6 — HQTradingDashboard palette
30-day bar + revenue-by-hour still on old green. Update to Indigo Intelligence.

### P7 — Dashboard action tiles navigate on click

---

## Locked Files
- src/components/PlatformBar.js — LOCKED
- src/components/hq/LiveFXBar.js — PROTECTED
- src/components/StockItemModal.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED

---

## Lessons Learned This Session

**LL-GH-MCP-01:** GitHub MCP get_file_contents returns stale cached SHA.
Cannot be trusted for reading current file state. All specs must grep first.

**LL-FX-ARCH-01:** Client-side Frankfurter fetch fails silently during long weekends.
Root cause: nested async + ECB no-publish on public holidays.
Fix: moved to Edge Function server-side, Promise.all with live rate.

**LL-SUBCATEGORY-SEED-01:** Original bulk seed wrote generic subcategories.
Pattern: any drill-down showing one row named after the world = this bug.
Fix: UPDATE by name ILIKE matching.

**LL-INFO-BUBBLE-01 (NEW):** Information bubble pattern is the core UX philosophy.
Formula: Primary KPI + delta(s) + operational callout.
Apply section by section — Today first, then The Shelf, etc.
