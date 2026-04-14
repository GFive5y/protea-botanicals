# NEXT SESSION PROMPT v257
## Context: Demo audit complete — now: Garden Bistro site polish
## Date produced: 14 April 2026
## CA demo: 12 May 2026 — 4 weeks away

---

## READ BEFORE ANYTHING ELSE (mandatory order)
1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md
3. docs/SESSION-STATE_v267.md   <- NEW — read this, not v257
4. docs/LL-POSTGREST-ROW-CAP_v1_0.md  <- NEW — critical rule LL-209
5. docs/TENANT-AUDIT-RUNBOOK-V2.md

---

## WHAT IS DONE (as of 14 April 2026)

### Demo Audit — 3 of 4 tenants complete
- MediCare Dispensary: All phases complete
- Medi Recreational: All phases complete
- The Garden Bistro: All phases complete — P&L fixed (commit 315accd)
- Metro Hardware: LOOP-001 open — sim-pos-sales not triggered (needs Supabase Studio)

### Garden Bistro P&L — RESOLVED
The longest single debug session in the build (30 sub-sessions).
Root cause was PostgREST's 1000-row default cap silencing client-side period filter.
Fixed by passing p_since/p_until to the RPC (commit 315accd).
Live verified: R97,587 revenue / 538 orders / 58.7% gross margin / 41.3% food cost.
Full chronicle: docs/LL-POSTGREST-ROW-CAP_v1_0.md

---

## THIS SESSION: Garden Bistro — Site Polish and Cleanup

The operator is now starting work in claude.ai (not Claude Code) on Garden Bistro UI.
Claude Code's role this session: support on demand, handle any DB or code fixes
that come out of the polish work.

### GARDEN BISTRO TENANT CONTEXT

Tenant ID: 7d50ea34-9bb2-46da-825a-956d0e4023e1
Industry profile: food_beverage
Tenant portal: /tenant-portal?tab=dashboard (switch to Garden Bistro in HQ)

Live P&L numbers (last 30 days):
  Revenue:       R97,587
  COGS (actual): R40,297
  Gross Profit:  R57,290
  Food Cost %:   41.3%  <- above 30% target (typical for bistro)
  Net Loss:      -R220,690 (heavily OpEx: wages R65k + rent R45k + depr R60k)

Orders: 3,388 paid | 390 cancelled | total 3,778
Order dates: 2025-11-01 to 2026-05-12

### KNOWN OPEN ITEMS FOR POLISH

1. Food Cost % is 41.3% — above the <30% target KPI. Expected for Garden Bistro's
   menu/cost structure. May need explanation text or benchmark adjustment for demo.

2. Depreciation line (-R60,080) appears in Journal Adjustments — confirm it
   renders correctly and the account code is correct.

3. COGS shows "actual" source (from order_items AVCO) — confirm the Gross Profit
   by Product table is populated with recognisable F&B dish names.

4. The HQ overview bar shows Revenue MTD R38,043 — verify this matches the
   P&L MTD figure and the top-bar stats are consistent.

5. Shop.js still creates a second GoTrueClient at module load time (LOOP-002).
   "Multiple GoTrueClient instances detected" warning in console.
   Low priority but creates noise — fix when convenient.

---

## METRO HARDWARE — OUTSTANDING (LOOP-001)

Before demo: trigger sim-pos-sales manually from Supabase Studio.
Cannot be done from Claude Code.
Body: {"tenant_id":"57156762-deb8-4721-a1f3-0c6d7c2a67d8","days":30,"orders_per_day":15}
Then re-verify Dashboard, P&L, Daily Trading.

---

## CRITICAL RULES (unchanged)
- RULE 0Q: Never push_files or create_or_update_file from Claude.ai. Claude Code only.
- LL-209: Never fetch unbounded large table and filter client-side by date. Always pass dates to DB.
- LL-221: Read source file before any edit.
- LL-205: Every new DB table needs hq_all_ RLS bypass policy.
- LL-206: const { tenant } = useTenant(); const tenantId = tenant?.id;
- LL-207: No tenantId props on HQ child components.

## REPO STATE
- HEAD: 024925b (session close docs committed by Claude Code)
- Supabase: uvicrqapgzcdvozxrreo
- RLS on orders: ENABLED
- get_tenant_orders_for_pl RPC: LIVE with p_since/p_until params

---
*NEXT-SESSION-PROMPT v257 — 14 April 2026*
*Garden Bistro audit done. P&L live. Now: polish the bistro for demo.*
