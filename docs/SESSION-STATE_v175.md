# SESSION-STATE.md — NuAi Platform
## Version: v175 · April 4, 2026
## Session: WP-DAILY-OPS Session C (Tier 1 Foundation Fixes) + REGISTRY/MANIFEST v3.1

---

# GIT HEAD

```
50bae6b  fix(trading): remove unused Cell import
b60b5ab  fix(trading): loyalty_transactions column type → transaction_type (LL-077)
d7c13ce  feat(trading): HQTradingDashboard v2.0 — SAST timezone, auto-refresh, EOD status, category fix, projected revenue
e1e0808  docs: REGISTRY + MANIFEST v3.1 — add EODCashUp, HQTradingDashboard, POSScreen
e686198  docs: SESSION-STATE v174
5249529  feat(eod): EODCashUp v1.0 — configurable daily cash reconciliation
aa51b74  feat(trading): HQTradingDashboard v1.0 + wire POSScreen to nav
```

---

# PLATFORM IDENTITY

```
Product:   NuAi multi-tenant SaaS ERP for SA cannabis retail
Stack:     React (CRA) + Supabase + Vercel
Repo:      github.com/GFive5y/protea-botanicals
Prod:      protea-botanicals.vercel.app
Tenant:    Medi Recreational · b1bad266-ceb4-4558-bbc3-22cfeeeafe74 · 184 SKUs
Supabase:  uvicrqapgzcdvozxrreo
Vercel:    team_4mcbNpkclTRzzkutzol5iUME / prj_M2qcKbX8LOylzSxwIRisXhs4JQ40
HQ Login:  admin@protea.dev (is_operator: true, hq_access: true)
```

---

# COMPLETED THIS SESSION

## P1 — REGISTRY + MANIFEST v3.1 (e1e0808)
- REGISTRY Section 1: 4 new feature index rows (HQTradingDashboard, POSScreen, EODCashUp, configurable EOD thresholds)
- REGISTRY Section 2: Full signatures for all 3 new components
- REGISTRY Section 3: WP-DAILY-OPS Session C, WP-REORDER Phase 2, BUG-047 added
- REGISTRY Section 5: POSScreen postmortem (LL-075 reinforcement)
- MANIFEST: 3 new component rows, pos_sessions + eod_cash_ups DB tables, change log v3.1

## WP-DAILY-OPS Session C — HQTradingDashboard.js v2.0 (d7c13ce)

### Tier 1 Foundation Fixes — all shipped:

1. **TIMEZONE FIX** — All date boundaries now SAST-correct (UTC+2).
   New helpers: `nowSAST()`, `dayStartSAST(daysAgo)`, `dayEndSAST(daysAgo)`,
   `monthStartSAST()`, `todayStrSAST()`, `sastHour(isoString)`.
   SAST midnight = 22:00 UTC previous day.
   Hourly chart now shows 08:00–20:00 SAST hours (was UTC hours).

2. **AUTO-REFRESH** — 5-minute countdown (`↻ 4:23`) in header.
   `setInterval` ticks every second, auto-calls `load()` at zero.
   Manual Refresh button resets countdown.

3. **CATEGORY RESOLUTION** — `resolveCategories(items)` async function
   fetches missing categories from `inventory_items` via `inventory_item_id`
   in `product_metadata`. Fixes "Other" for all sandbox data and older POS
   sales. Applied to both today's data and history panel.

4. **EOD STATUS WIDGET** — `EODStatusWidget` component between loyalty strip
   and hourly chart. Three states:
   - no session (grey, "Open till →" → POS tab)
   - session open (green, "Close day →" → Cash-Up tab)
   - day closed (status colour matched to balanced/flagged/escalated with variance)
   Navigation via `window.history.pushState` + `popstate` event.

5. **PROJECTED REVENUE** — 5th KPI card in accent green.
   Formula: `current revenue ÷ hours elapsed × total trading hours`.
   Only shown during 08:00–20:00 SAST when today has ≥1 sale.

## Bug fixes (b60b5ab, 50bae6b)
- `loyalty_transactions`: `type` → `transaction_type` (LL-077 reinforcement)
  Both queries now use `.ilike("transaction_type", ...)` as per confirmed schema.
- Removed unused `Cell` import from recharts (ESLint no-unused-vars clean).

---

# SESSION ASSESSMENT — WP-DAILY-OPS RETROSPECTIVE

## What was found (pre-build analysis):

```
CRITICAL:  Timezone bug — dayStart() used local time, not SAST UTC+2
           Hourly chart was 2 hours behind real trading activity
MISSING:   Auto-refresh — data went stale without manual intervention
MISSING:   Category resolution — sandbox data always showed "Other"
MISSING:   EOD integration — no awareness of cash-up status in trading view
MISSING:   Projected revenue — no mid-day pace indicator
PLANNED:   30-day revenue chart (spec Session C)
PLANNED:   Custom date range picker (spec Session C)
```

## What was deferred to Tier 2 (next session):
```
- 30-day revenue chart with day-of-week labels (full-width bar chart)
- Custom date range picker in history panel (from/to date inputs)
- Month/year selector for past months (October, November, December data)
```

Note: All historical order data is permanently stored in Supabase.
Every POS sale writes to orders + order_items forever. Past months data
is already there — the dashboard just needs the month selector to surface it.

---

# KNOWN BUGS / LOGGED ISSUES

## BUG-FX-001 — LiveFXBar historical chart broken
```
Status:   LOGGED — cannot fix (LiveFXBar.js is LOCKED)
Symptom:  FX rate history chart shows "0 data points" / no data
Error:    GET api.frankfurter.app/2026-03-04..2026-04-03 → 301 redirect → CORS blocked
Cause:    frankfurter.app moved their historical endpoint; redirect returns no CORS header
Impact:   LOW — only the history chart panel in LiveFXBar is affected
          Live rate (get-fx-rate Edge Function) is unaffected: R16.9514 shows correctly
          Trading dashboard, COGS engine, P&L all use get-fx-rate EF (unaffected)
Action:   Log and move on. LiveFXBar.js permanently locked (LL-LOCKED).
          If the API is permanently broken, the fix is in the get-fx-rate Edge Function
          (add historical endpoint support), not in LiveFXBar.js itself.
```

## BUG-047 — PlatformBar loyalty scope fix (~30 min) — STILL OPEN

## BUG-043 — 23 terpenes qty inflated — STILL OPEN (physical count required)

## BUG-044 — HQCogs shipping_alloc_usd column — STILL OPEN (verify column exists)

---

# NEXT PRIORITIES

## [P1] WP-DAILY-OPS Tier 2 — History panel upgrade (Session D)
- Month/year selector — see past months (October, November, December etc.)
- 30-day revenue chart — full-width BarChart with day-of-week labels (Mon/Tue/Wed...)
- Custom date range — from/to date inputs in history panel

## [P2] BUG-047 — PlatformBar loyalty scope fix (~30 min)

## [P3] First real POS sale + EOD verification
```sql
-- Remove sandbox before go-live:
DELETE FROM orders WHERE tenant_id='b1bad266-ceb4-4558-bbc3-22cfeeeafe74' AND notes='SANDBOX'
```
Then: run real POS sale → close day through EODCashUp → verify full loop

## [P4] WP-REORDER Phase 2
- ProteaAI quantity suggestions based on sales velocity

---

# KEY FILES — CURRENT STATE

```
src/pages/HQDashboard.js                v4.3  ✅ LIVE (e1e0808)
src/components/hq/HQTradingDashboard.js v2.0  ✅ LIVE (50bae6b) — Tier 1 fixes
src/components/hq/EODCashUp.js          v1.0  ✅ LIVE (5249529)
src/components/hq/POSScreen.js          v1.0  ✅ LIVE — wired (aa51b74)
src/components/hq/HQStock.js            v3.1  ✅ LIVE, no maxWidth (e7eca29)
src/components/hq/SmartInventory.js     v1.3  ✅ LIVE (90bd37e)
src/components/hq/ReorderPanel.js       v1.0  ✅ LIVE (a72b359)
src/hooks/useNavConfig.js               —     ✅ LIVE (5249529)
docs/REGISTRY_v3_0.md                   v3.1  ✅ (e1e0808)
docs/MANIFEST_v3_0.md                   v3.1  ✅ (e1e0808)
src/components/hq/LiveFXBar.js                PROTECTED — never modify
src/components/StockItemModal.js              LOCKED — never modify
```

---

# DB SCHEMA — CONFIRMED

```
orders:              status = pending/paid/failed/cancelled/refunded (NOT 'completed')
order_items:         no inventory_item_id FK — via product_metadata jsonb
                     category from: product_metadata?.category
inventory_items:     no 'notes' column · category is enum
movement_type:       'sale_pos' used by POSScreen (differs from 'sale_out')
pos_sessions:        ✅ LIVE — (tenant_id, session_date, opening_float, status)
eod_cash_ups:        ✅ LIVE — (variance GENERATED, UNIQUE tenant+date, RLS)
tenant_config.settings: ✅ JSONB — eod thresholds + float + approver_role
loyalty_transactions: columns confirmed via schema query April 4 2026:
  - transaction_type (NOT type) ← LL-077 confirmed
  - transaction_date AND created_at both exist (use created_at)
  - tenant_id column EXISTS ✅
  - points column (NOT points_change)
```

---

# EOD CONFIG — MEDI REC (confirmed live)

```
eod_cash_variance_tolerance: 50   (±R50 amber flag)
eod_escalation_threshold:   200   (±R200 red escalation)
eod_default_float:          500   (R500 opening float, manager overrides)
eod_approver_role:         'owner'
```

To change without code deploy:
```sql
UPDATE tenant_config
SET settings = settings || '{"eod_cash_variance_tolerance": 100}'
WHERE tenant_id = 'b1bad266-ceb4-4558-bbc3-22cfeeeafe74';
```

---

# SANDBOX DATA

```
598 orders · R303,983 · March 4–April 3, 2026
Flagged: notes='SANDBOX', status='paid'
Remove: DELETE FROM orders WHERE tenant_id='b1bad266...' AND notes='SANDBOX'
Note:   SAST timezone fix means April 4 sandbox shows R0 correctly —
        sandbox is all in March, today (April 4 SAST) has no sandbox sales.
Note:   resolveCategories() now fixes "Other" by reading inventory_items via
        inventory_item_id from product_metadata — sandbox categories now display correctly.
```

---

# CRITICAL RULES (must re-read every session)

```
RULE 0O:  Every violation → log in VIOLATION_LOG before continuing
LL-184:   Deploy box = executable only. Labels in prose, separated by prose.
          Never put any text on the line immediately above a code fence.
LL-185:   Must have read current file before suggesting any edit.
LL-183:   PowerShell has no && — git commands on separate lines
LL-178:   Never change renderTab case without loss list + owner confirm
LL-180:   Read HQStock.js before any inventory component work
LL-190:   EOD thresholds always from tenant_config.settings (never hardcoded)
LL-077:   loyalty_transactions: use transaction_type column (NOT type)
          Use .ilike() not .eq() — casing is inconsistent in DB
```

---

# GITHUB MCP STATUS

```
GitHub MCP (Copilot endpoint): READ-ONLY PERMANENTLY
- get_file_contents: ✅ works every session
- create_or_update_file: ❌ 403 Resource not accessible by integration
- push_files: ❌ 403 Resource not accessible by integration
- Root cause: Copilot API token is architecturally read-only — not fixable
- Workaround: 3-line terminal push (git add → git commit → git push)
- Write tools appear in system prompt with full definitions every session —
  they will always fail with 403. Do not test again.
```

---

# THREE-CLAUDE ECOSYSTEM

```
Claude.ai    — strategy, planning, GitHub MCP (read-only), Supabase MCP, Vercel MCP
Claude Code  — file edits, git push (local credentials)
GitHub MCP   — read-only permanently (Copilot token limitation)
```

---

*SESSION-STATE v175 · NuAi · April 4, 2026*
*WP-DAILY-OPS Session C complete · Tier 1 foundation fixes shipped · 4 commits*
*HEAD: 50bae6b*
*Upload to project knowledge: SESSION-STATE_v175.md (replaces v174)*
