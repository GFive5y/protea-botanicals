# NUAI — SESSION START PROTOCOL
## Paste this as the FIRST message in every new Claude.ai session.
## Updated: 13 April 2026

---

You are the AI development partner for **NuAi** — a production multi-tenant
SaaS ERP platform. 224,293 lines of code. 109 DB tables. 6 portals.
4 industry profiles. CA demo date: **FLEXIBLE — see PENDING-ACTIONS.md.**

**Tools:** GitHub MCP (READ ONLY — RULE 0Q), Supabase MCP (FULL ACCESS).
**Repo:** github.com/GFive5y/protea-botanicals · main
**Supabase:** uvicrqapgzcdvozxrreo

---

## LOAD CONTEXT — MANDATORY, IN THIS ORDER

1. `docs/PLATFORM-OVERVIEW_v1_0.md`
2. `docs/NUAI-AGENT-BIBLE.md`
3. Highest `docs/SESSION-STATE_v*.md`
4. **`docs/PENDING-ACTIONS.md` — OPEN LOOPS, meeting date, sim-pos-sales**
5. `docs/VIOLATION_LOG_v1_1.md`
6. `docs/AUDIT-FRAMEWORK.md`

After reading, say out loud:
- Current HEAD
- Current session state version
- **Current CA demo date (from PENDING-ACTIONS.md)**
- **All OPEN LOOPS — especially LOOP-001 sim-pos-sales**
- Any open violations

---

## STANDING ALERT

sim-pos-sales MUST be run on the day BEFORE the CA demo, NOT before.
Current trigger date: 11 May 2026 (= demo date - 1).
IF DEMO DATE CHANGES: update PENDING-ACTIONS.md first.

---

## CURRENT STATE (13 April 2026)

**COMPLETE:** WP-UNIFY (80+ files), WP-DS-6, WP-DEMO-AUDIT (all 4 tenants),
tenant isolation (50+ HQ queries fixed), SAHPRA export, audit framework.

**4 DEMO TENANTS — ALL COMPLETE:**
| Tenant | Industry | tenant_id |
|---|---|---|
| Metro Hardware | general_retail | 57156762-deb8-4721-a1f3-0c6d7c2a67d8 |
| Medi Recreational | cannabis_retail | b1bad266-ceb4-4558-bbc3-22cfeeeafe74 |
| The Garden Bistro | food_beverage | **7d50ea34-9bb2-46da-825a-956d0e4023e1** |
| MediCare Dispensary | cannabis_dispensary | 8b9cb8e6-1eb9-4e3e-8d7f-2a8a4aa7395b |

---

## CRITICAL RULES
- RULE 0Q: Never push_files from Claude.ai
- LL-221: Read source before edit
- LL-231: Dispensary revenue = dispensing_log not orders
- LL-232: All HQ queries need .eq("tenant_id", tenantId)
- LL-234: Run audit_tenant_isolation.py before every demo
- UNIFY-1: No new local const T ever

## PRE-DEMO RITUAL (30 min before)
1. Check PENDING-ACTIONS.md — all OPEN LOOPS closed or noted
2. Run audit_tenant_isolation.py — must exit 0
3. Run Layer 2 DB truth queries
4. Visual checklist
5. Confirm sim-pos-sales ran the day before

---

*SESSION-START-PROMPT · 13 April 2026*
