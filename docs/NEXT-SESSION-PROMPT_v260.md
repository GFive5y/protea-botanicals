# NEXT SESSION PROMPT v260
## Context: Loop improvement shipped. Ground truth + schema reference live.
## Date produced: 14 April 2026
## CA demo: 12 May 2026 -- 4 weeks away

---

## READ BEFORE ANYTHING ELSE
1. docs/SYSTEM-GROUND-TRUTH.md  -- NEW -- read this first, every session
2. docs/PLATFORM-OVERVIEW_v1_0.md
3. docs/NUAI-AGENT-BIBLE.md (note LL-210, LL-244, LL-245)
4. docs/SESSION-STATE_v274.md (or latest)
5. docs/PREFLIGHT-SQL.md  -- in the loop now
6. docs/SCHEMA-REFERENCE.md  -- NEW -- read before writing any SQL
7. docs/LL-POSTGREST-ROW-CAP_v1_0.md
8. docs/TENANT-AUDIT-RUNBOOK-V2.md

---

## WHAT CHANGED THIS SESSION

### Loop Improvement (this commit)
- SYSTEM-GROUND-TRUTH.md: 60-second orientation from live DB. Active tenant roster
  with UUIDs, industry, wizard status, COA count, admin emails, revenue, known bugs.
- SCHEMA-REFERENCE.md: Correct production table/column names. "Wrong name -> correct
  name" lookup table. Full 109-table schema dump. Prevents wrong SQL in specs.
- update_ground_truth.py: Stub script documenting the queries. Full implementation
  pending supabase-py integration.
- Old session files archived to docs/archive/ (50+ files moved)

### HQTenantProfiles (commit 2558564)
- New HQ tab: read-only diagnostic view of all tenant financial setup data
- 14 automated bug detection rules (critical/warning/info)
- Surfaces COA counts, equity state, VAT config, auditor details per tenant

---

## THIS SESSION OPTIONS

### Option A -- Metro Hardware close-out (highest demo priority)
Owner triggers sim-pos-sales from Supabase Studio, then full dry-run.
Body: {"tenant_id":"57156762-deb8-4721-a1f3-0c6d7c2a67d8","days":30,"orders_per_day":15}

### Option B -- Nourish Kitchen Financial Setup
Run the wizard with data from session 259 chat. Populate equity_ledger.

### Option C -- Smoke test framework (NEXT-PRIORITY-001 Phase 2)
Build runnable smoke test suites from the framework spec.

### Option D -- Demo dry-run
Full walkthrough of Garden Bistro + Medi Rec financial package.

---

## OUTSTANDING ITEMS (from SYSTEM-GROUND-TRUTH.md)

- Metro Hardware sim-pos-sales trigger (owner action)
- Nourish Kitchen Financial Setup Wizard
- Garden Bistro real VAT number
- POS VAT pipeline investigation
- equity_ledger.net_profit_for_year auto-population
- T14 Phase C: P&L full switchover

---

## CRITICAL RULES
RULE 0Q, LL-205, 206, 207, 208, 209, 210, 221, 244, 245

## REPO STATE
- HEAD: [current commit]
- Supabase: uvicrqapgzcdvozxrreo
- RPCs: tenant_financial_period, hq_financial_period, tenant_vat_periods
- New files: SYSTEM-GROUND-TRUTH.md, SCHEMA-REFERENCE.md, update_ground_truth.py

---
*NEXT-SESSION-PROMPT v260 -- 14 April 2026*
*Loop improved. Ground truth live. Schema reference live.*
