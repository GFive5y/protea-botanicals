# SESSION-STATE v267
## Date: 14 April 2026 — END OF SESSION
## Status: CLOSED — LOOP RESOLVED

## WHAT WAS FIXED THIS SESSION

Garden Bistro P&L Revenue R0 — RESOLVED after 30 sub-sessions

Root cause: PostgREST 1000-row default cap.
- fetchAll in HQProfitLoss.js called .rpc("get_tenant_orders_for_pl") without date params.
- PostgREST returned the first 1000 orders (oldest: Nov–Dec 2025).
- Client-side period filter (Last 30 days = March–April 2026) found zero of them.
- Revenue rendered as R0. No error. Silent failure.

Fix (commit 315accd):
1. DB: get_tenant_orders_for_pl updated to accept p_since/p_until params, filters server-side.
2. Code: RPC call passes periodStart(period, customFrom) and periodEnd(period, customTo).
3. fetchAll deps updated to [tenantId, period, customFrom, customTo].

## VERIFIED GARDEN BISTRO LIVE NUMBERS

Revenue (Last 30 days, ex-VAT): R97,586.96
Orders: 538 | Avg order value: R181
COGS (actual, AVCO): R40,297.00
Gross Profit: R57,289.96
Food Cost %: 41.3% (target <30%)
Net Loss: -R220,690.04
Gross Margin: 58.7% | Net Margin: -226.15% (OpEx heavy by design)

OpEx: R65k wages + R45k rent + R12k utilities + R4.2k marketing +
      R3.8k insurance + R2.8k cleaning + R1.4k software + R60k depreciation
      = R277,980 total

## TENANT AUDIT STATUS

| Tenant              | Status   | Notes                                        |
|---------------------|----------|----------------------------------------------|
| MediCare Dispensary | COMPLETE |                                              |
| Medi Recreational   | COMPLETE |                                              |
| Garden Bistro       | COMPLETE | P&L fixed — commit 315accd                   |
| Metro Hardware      | PENDING  | LOOP-001 open: sim-pos-sales not triggered   |

## OPEN LOOPS AT SESSION CLOSE

LOOP-001 — Metro Hardware sim trigger (STILL OPEN)
Metro Hardware has 0 real orders. Cannot be done from Claude Code.
Supabase Studio > Edge Functions > sim-pos-sales > Invoke
Body: {"tenant_id":"57156762-deb8-4721-a1f3-0c6d7c2a67d8","days":30,"orders_per_day":15}

LOOP-002 — Shop.js second GoTrueClient (OPEN — LOW PRIORITY)
Shop.js creates storefrontDb = createClient(...) at module load time.
Fires "Multiple GoTrueClient instances" warning on every page load.
Fix: remove storefrontDb = createClient(...), replace with shared supabase import.
See LL-210 in LL-ARCHIVE for full details.

## DB STATE AT SESSION CLOSE

orders RLS: ENABLED (re-enabled after debugging)
hq_orders_inline policy: EXISTS (ALL, EXISTS hq_access check)
get_tenant_orders_for_pl RPC: LIVE — accepts p_since/p_until params
orders.user_id: Updated to c64cda97 for Garden Bistro rows

## KEY LESSON FOR NEXT AGENT

PostgREST silently caps all SELECT results at 1000 rows.
Any component that fetches an unbounded large table and filters client-side
will silently return wrong data at scale. Always pass date filters server-side.

Debug-first principle: add console.log BEFORE changing anything.
The [PL-fetchAll] RESULTS: {orders: 1000} log found the bug in one run.
30 sessions of DB/RLS changes found nothing.
