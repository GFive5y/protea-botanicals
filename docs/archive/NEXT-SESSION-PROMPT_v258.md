# NEXT SESSION PROMPT v258
## Context: Garden Bistro audit closed + canonical RPCs live
## Date produced: 14 April 2026
## CA demo: 12 May 2026 — 4 weeks away

---

## READ BEFORE ANYTHING ELSE
1. docs/PLATFORM-OVERVIEW_v1_0.md
2. docs/NUAI-AGENT-BIBLE.md (note new LL-209 and LL-210)
3. docs/SESSION-STATE_v270.md
4. docs/LL-POSTGREST-ROW-CAP_v1_0.md (LL-209)
5. docs/TENANT-AUDIT-RUNBOOK-V2.md

---

## WHAT IS DONE (as of 14 April 2026)

### Garden Bistro audit + RPC architecture (commits 7db98a3 -> b6edfb2 -> e529d4e -> 86eae8e)
8 of 9 audit fixes, two canonical RPCs (tenant + HQ), two consumer migrations,
LL-210 promoted. See SESSION-STATE_v270 for full detail.

### Demo Audit — 4 of 4 tenants
- MediCare Dispensary: complete
- Medi Recreational: complete
- The Garden Bistro: complete + RPC migrations
- Metro Hardware: LOOP-001 open — sim-pos-sales trigger needed

---

## THIS SESSION OPTIONS

Pick based on owner priority:

### Option A — Metro Hardware close-out (highest demo priority)
1. Owner triggers sim-pos-sales from Supabase Studio
2. Re-verify Dashboard, P&L, Daily Trading via tenant_financial_period
3. Tenant 4 of 4 closed for demo

### Option B — Continue migration to tenant_financial_period
Lower demo risk (numbers already correct), but hardens consistency:
- Cash Flow component
- Balance Sheet revenue YTD
- VAT Returns (per-period)
Each one is a single sitting. None blocks demo.

### Option C — tenant_inventory_velocity RPC for Forecast widget
The deferred T13 work. Build sibling RPC for SKU velocity / stock depletion.
Forecast widget then migrates cleanly. Useful but not demo-critical.

### Option D — Demo-day prep
Walkthrough run on Garden Bistro and Medi Rec. Identify any UX rough edges.
Demo script. Q&A prep for CA-likely questions (VAT, IFRS compliance, audit trail).

---

## OUTSTANDING ITEMS

### Metro Hardware (LOOP-001)
Trigger sim-pos-sales from Supabase Studio. Cannot be done from Claude Code.
Body: {"tenant_id":"57156762-deb8-4721-a1f3-0c6d7c2a67d8","days":30,"orders_per_day":15}

### Shop.js (LOOP-002)
"Multiple GoTrueClient instances detected" — low priority console noise.

### T14 Phase C — P&L Switchover
Side-by-side validation running since 86eae8e. After 24h with zero divergence
warnings, remove old data paths and switch P&L render to rpcData.

---

## CRITICAL RULES (unchanged from v257 + LL-209 + LL-210)
- RULE 0Q: Claude Code only for writes
- LL-205, 206, 207, 208, 209, 221 (see SESSION-STATE)
- LL-210 (NEW): Financial aggregations via canonical RPCs only

## REPO STATE
- HEAD: 86eae8e
- Supabase: uvicrqapgzcdvozxrreo
- get_tenant_orders_for_pl: still live (used by tenant_financial_period internally)
- tenant_financial_period: LIVE, 9 invariants pass
- hq_financial_period: LIVE, currency-mixing dormant

---
*NEXT-SESSION-PROMPT v258 — 14 April 2026*
*Garden Bistro closed. RPCs live. Pick A/B/C/D next session.*
