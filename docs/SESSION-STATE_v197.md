# SESSION-STATE v197 — 07 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **RULE 0Q + LL-202:** GitHub write tools BANNED for Claude.ai — specs only, Claude Code writes

---

## ⚠️ CRITICAL TOOL ISSUE — CARRY FORWARD

GitHub MCP `get_file_contents` returns a STALE CACHED SHA — always `grep`/`cat` the
actual file via Claude Code before any str_replace. Claude.ai uses GitHub MCP for
navigation only — verify line numbers via grep before writing any spec.

---

## What Was Done This Session (v197)

### Full System Audit (FEATURE-AUDIT_v1_0.md)
- Audited 96 component files across hq/, root components, pages
- Documented 78 distinct features with status labels
- DB snapshot: 104 tables, key data state confirmed
- Navigation wiring map: HQDashboard (34 tabs), TenantPortal, HRDashboard, App.js routes
- Produced: `docs/FEATURE-AUDIT_v1_0.md` + `docs/PLANNING-SESSION_v1_0.md`

### Sprint 1 — Demo Ready (ALL COMPLETE)

| Commit | What |
|---|---|
| `68cfe33` | Toast notification fix — max 2 visible, auto-dismiss, dedup |
| `538d186` | Transactions tile — Cash/Card/Yoco payment breakdown |
| `44ff1c2` | Avg Basket information bubble |
| `262d99b` | Revenue MTD run rate callout |
| `7a9ce9c` | Velocity-weighted reorder scoring |
| `4301631` | POS intelligence fix |
| `39f475e` | GeoAnalyticsDashboard wired + HQTradingDashboard Indigo palette |
| `d83a329` | ProteaAI CODEBASE_FACTS updated to v197 audit state (78 features, 96 components) |
| Supabase | HACCP seed — 3 control points: Receiving (biological), Storage (physical), Dispensing (chemical) |
| No change | CannabisDetailView — already wired in HQStock at line 5051 (audit error VL-009) |

### Audit Correction — VL-009
FEATURE-AUDIT_v1_0.md listed CannabisDetailView as `🔌 NOT WIRED`.
Disk is truth: it IS wired inside HQStock.js at line 5051 — renders when `viewMode === "detail"`
in CannabisItemsView. It was not visible in page-level imports but exists as a sub-component.
Status correction: `⚡ WIRED-UNTESTED` (in HQStock Items tab, detail view mode).

---

## Current System State

### Dashboard Architecture
Sections in order (HQOverview.js):
1. TODAY — Sales / Transactions (Cash·Card·Yoco split) / Avg Basket (with information bubbles)
2. Revenue — Last 30 Days (ComposedChart, SA public holidays annotated)
3. THE SHELF — Stock Health / Purchase Orders / Revenue MTD (run rate) / Reorder Alerts
4. PRODUCT HEALTH — Stock by Category (drill-down) + Stock Value / Margin Health / Expiry
5. Scan Activity — Last 30 Days
6. MEMBERS & LOYALTY — QR Scans / Loyalty Points / Comms / Fraud Alerts
7. Scan Distribution + Volume by Type
8. BIRTHDAYS
9. STORE PERFORMANCE — Avg Gross Margin / USD·ZAR (yesterday + 30d deltas)
10. Gross Margin gauge
11. Recent Scans + Low Stock Alerts
12. Quick Actions

### Chart Color System — LOCKED (Indigo Intelligence)
```
Primary:    #6366F1  (indigo — weekday bars, main data)
Secondary:  #F472B6  (rose — public holidays)
Tertiary:   #06B6D4  (cyan)
Quaternary: #A78BFA  (violet)
Neutral:    #94A3B8  (slate — last month dashed line)
Weekend:    #C7D2FE  (indigo-200)
FIN:        revenue #059669 · cost #DC2626 · rate #2563EB
```

### Data State (Medi Rec — as of 07 Apr 2026)
- Inventory: 232 items, 186 active, 14 product worlds. Stock value: ~R205,634 AVCO.
- Orders: 1,513 (mix of real + seeded) · order_items: 2,833 rows (per-SKU analytics LIVE)
- Scans: 181 (all Mar 12–23) · Loyalty: 3,974 pts, 1 bronze member
- EOD: 90 cashups · POS Sessions: 90 · fx_rates: 712 rows
- HACCP: 3 control points seeded (Receiving, Storage, Dispensing Accuracy)
- Expiry dates: 0 of 186 set — still a blind spot
- Expenses: 2 rows — P&L OPEX line still sparse

---

## Pending Items — Priority Order

### P0 — NOTHING (Sprint 1 complete)

### P1 — Transactions tile (DONE `538d186`)

### P2 — Information Bubble rollout (continue)
Next section: THE SHELF tiles (Stock Health stale count, Reorder categories).
Spec in WP-DASHBOARD-IB_v1_0.md.

### P3 — LL-SUBCATEGORY-01
Verify SmartInventory.js receiveAttrs col:"subcategory" wires to DB insert.
Test: create concentrate via Smart Catalog → check subcategory field populated in DB.

### P4 — Schema gaps (separate session — Sprint 2)
- Add orders.channel enum: pos / online / wholesale
- Populate inventory_items.expiry_date (186 SKUs, all null)

### P5 — POS till session flow
No active session = locked out. Yoco keys sk_test_ still not configured.
Needs: Yoco test keys → tenant_config → open a pos_session → test one sale end-to-end.

### P6 — DONE (HQTradingDashboard Indigo palette, `39f475e`)

### P7 — Dashboard action tiles navigate on click (still pending)

### Sprint 2 — Revenue Ready (next build session)
1. orders.channel enum migration (Supabase MCP apply_migration)
2. Update POSScreen.js to set `channel: 'pos'` on order INSERT
3. Update payfast-checkout EF to set `channel: 'online'`
4. First invoice via HQWholesaleOrders → HQInvoices
5. ExpenseManager seeding (10+ realistic expenses for P&L)
6. order_items top sellers wiring in HQTradingDashboard

### Sprint 3 — Platform Ready
1. TenantSetupWizard entry point (HQTenants.js "Add new tenant" → wizard)
2. Self-service onboarding dry run for client #2
3. inventory_items.expiry_date population
4. RLS cross-tenant audit (5 key tables)

---

## Lessons Learned This Session

**LL-200 — AUDIT SUB-COMPONENT WIRING CHECK**
When auditing components as NOT WIRED, verify not just page-level imports but also
sub-component imports inside large protected files (HQStock, SmartInventory).
CannabisDetailView was wired inside HQStock.js at line 5051 — invisible from page imports.
Before marking any component as NOT WIRED, grep for its name across the full src/ tree.
Origin: VL-009 — 07 Apr 2026.

**LL-GH-MCP-01 (carry forward)**
GitHub MCP get_file_contents returns stale cached SHA. Always grep/cat before str_replace.

**LL-INFO-BUBBLE-01 (carry forward)**
Information bubble pattern: Primary KPI + delta(s) + operational callout.
Apply section by section. Every tile should answer "what does this mean right now?"

---

## Locked Files
- src/components/PlatformBar.js — LOCKED
- src/components/hq/LiveFXBar.js — PROTECTED
- src/components/StockItemModal.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED
