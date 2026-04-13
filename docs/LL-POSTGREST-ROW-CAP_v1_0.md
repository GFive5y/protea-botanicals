# LESSON LEARNED: PostgREST 1000-Row Default Cap
## LL-209 — Discovered 14 April 2026
## Longest debug session in the build: ~30 sub-sessions
## Critical for any agent working on financial reporting or analytics queries.

## THE ROOT CAUSE

PostgREST has a default maximum row count of 1000 for all SELECT queries.
This includes supabase.from(table).select(...) AND supabase.rpc(...) calls.

Sequence that broke the P&L:
1. fetchAll called supabase.rpc("get_tenant_orders_for_pl", { p_tenant_id })
2. RPC returned the first 1000 rows — oldest orders (Nov–Dec 2025)
3. Client-side period filter: Last 30 days (March 15–April 14 2026)
4. None of the 1000 rows were in that window. All filtered out.
5. filteredOrders = [] -> Revenue = R0
6. No error thrown. Status 200. DataBadge showed 0. Silent failure.

## THE DIAGNOSTIC BREAKTHROUGH

30 sessions of DB/RLS changes found nothing.
Claude Code added ONE console.log:

  console.log('[PL-fetchAll] RESULTS:', {
    orders: r1.data?.length,
    ordersErr: r1.error?.message,
  });

Output: [PL-fetchAll] RESULTS: {orders: 1000, ordersErr: undefined}

orders: 1000 — exactly the PostgREST default cap. Root cause confirmed in 5 minutes.
If this log had been added in session 1, the bug would have been found immediately.

## THE FIX

WRONG (client-side filter on unbounded fetch):
  supabase.rpc("get_tenant_orders_for_pl", { p_tenant_id: tenantId })
  // Returns 1000 oldest rows. Period filter finds 0.

CORRECT (server-side date filter):
  supabase.rpc("get_tenant_orders_for_pl", {
    p_tenant_id: tenantId,
    p_since: periodStart(period, customFrom) || null,
    p_until: periodEnd(period, customTo) || null,
  })
  // DB returns only matching rows. Cap irrelevant.

DB function pattern (get_tenant_orders_for_pl):
  WHERE o.tenant_id = p_tenant_id
    AND o.status NOT IN ('cancelled', 'failed')
    AND (p_since IS NULL OR o.created_at >= p_since)
    AND (p_until IS NULL OR o.created_at <= p_until)
  ORDER BY o.created_at DESC

## SCALABILITY

| Tenant size        | Orders/day | Orders/month | Hits cap?                    |
|--------------------|------------|--------------|------------------------------|
| Demo (current)     | 18         | 540          | Oldest 1000 miss the filter  |
| Small active       | 50         | 1,500        | Yes — 500 newest invisible   |
| Medium restaurant  | 200        | 6,000        | Yes — 5,000 newest invisible |
| Multi-location     | 1,000      | 30,000       | Catastrophic                 |

A tenant doing 50 orders/day hits >1000 per month at week 3.
P&L shows R0 from that point. No error. No warning.

Server-side filtering scales to any table size. Always use it for period queries.

## RULE LL-209

NEVER fetch an unbounded large table and filter client-side by date.
Any query that will be period-filtered in the component MUST pass the date range to the DB.

Tables to audit for this pattern:
- orders -> HQProfitLoss (fetchAll) FIXED — p_since/p_until in RPC
- stock_movements -> HQCogs, HQStock — verify at scale
- vat_transactions -> HQFinancials — verify at scale
- loyalty_transactions -> uses .gte() filter OK

## SECONDARY LESSONS

LL-210: Multiple GoTrueClient Warning
Shop.js creates storefrontDb = createClient(...) at MODULE LOAD TIME.
This fires before React components mount. Combined with lock: fn => fn() in
supabaseClient.js (disables auth mutex), creates auth racing on init.
Detection: "Multiple GoTrueClient instances detected" in browser console.
Fix: move storefrontDb inside component, or use shared supabase import.

LL-211: SECURITY DEFINER + STABLE function caching
Calling is_hq_user() (STABLE SECURITY DEFINER) inside another SECURITY DEFINER
function silently returns empty. STABLE cache returns stale results in nested
SECURITY DEFINER context. Fix: inline the EXISTS check, or declare VOLATILE.

LL-212: Debug-first methodology
Add console.log BEFORE touching anything.
Remote DB changes without diagnostics = 30 wasted sessions.
One diagnostic log = root cause in one run.
