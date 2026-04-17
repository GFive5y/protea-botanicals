# NuAi DEBT REGISTER v1.0
## Produced: Session 294, 17 April 2026
## Audit HEAD: 921f31c (docs(S293): close session 293)
## Owner-reviewable: YES — read Sections 1-4 for prioritisation decisions

---

## PURPOSE

This register documents all known technical debt across the NuAi platform,
produced via a grounded audit of the live codebase — not from memory or
prior session docs. Each item has a file:line reference, a rule citation,
an impact assessment, and a fix sketch with size estimate.

**This is an evidence document, not a fix plan.** Owner reviews this register
and picks items for the next stage. No fixes were made in Session 294.

---

## SECTION 1: SAFETY DEBT — Multi-Tenant Isolation

### 1.1 RULE 0F Violations (INSERT missing tenant_id)

Every INSERT into a tenant-scoped table MUST include `tenant_id` in the
payload. The following 23 sites omit it.

#### Cluster 1: StockControl.js (5 violations) — FIXED b869ad4

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-001 | StockControl.js:3044 | stock_movements | FIXED | `tenant_id: tenantId` + threaded tenantId prop to MovementsView |
| SAFETY-002 | StockControl.js:3361 | purchase_orders | FIXED | `tenant_id: tenantId` + threaded tenantId prop to OrdersView |
| SAFETY-003 | StockControl.js:3375 | purchase_order_items | FIXED | `tenant_id: tenantId` in mapped array |
| SAFETY-004 | StockControl.js:3419 | stock_movements | FIXED | `tenant_id: tenantId` (PO receive flow) |
| SAFETY-005 | StockControl.js:4544 | suppliers | FIXED | `{ ...data, tenant_id: tenantId }` + threaded tenantId prop to SuppliersView |

**All 5 fixed in Session 296 commit b869ad4. WATCH-005 (S291) superseded and closed.**

#### Cluster 2: Loyalty Pipeline (7 violations) — FIXED 528d5c2

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-013 | OrderSuccess.js:219 | loyalty_transactions | FIXED | `tenant_id: storefrontTenantId` |
| SAFETY-014 | OrderSuccess.js:257 | loyalty_transactions | FIXED | `tenant_id: storefrontTenantId` |
| SAFETY-015 | OrderSuccess.js:286 | loyalty_transactions | FIXED | `tenant_id: storefrontTenantId` |
| SAFETY-016 | Account.js:553 | loyalty_transactions | FIXED | `tenant_id: storefrontTenantId` (added useStorefront to OTPPanel) |
| SAFETY-017 | Account.js:1454 | loyalty_transactions | FIXED | `tenant_id: storefrontTenantId` (added useStorefront to AccountView) |
| SAFETY-018 | SurveyWidget.js:77 | loyalty_transactions | FIXED | `tenant_id: tenantId \|\| null` (added tenantId prop, passed from ScanResult.js) |
| SAFETY-019 | ScanResult.js:1746 | loyalty_transactions | FIXED | `tenant_id: tenantId \|\| null` (mirrors L1254 pattern) |

**All 7 fixed in Session 295 commit 528d5c2.**

#### Cluster 3: HQDocuments.js (3+1 violations) — FIXED 6c50eaf

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-006 | HQDocuments.js:2082 | suppliers | FIXED | `tenant_id: selectedDoc?.tenant_id ?? null` |
| SAFETY-007 | HQDocuments.js:2385 | stock_movements | FIXED | `tenant_id: selectedDoc.tenant_id ?? null` |
| SAFETY-008 | HQDocuments.js:2506 | stock_movements | FIXED | `tenant_id: selectedDoc.tenant_id ?? null` |
| NEW (S297) | HQDocuments.js:2361 | inventory_items | FIXED | `tenant_id: selectedDoc.tenant_id ?? null` (create_supplier_product flow, unflagged in original audit) |

**All 4 fixed in Session 297 commit 6c50eaf. Source: selectedDoc.tenant_id (document owner, not HQ operator).**

#### Cluster 4: HQ Purchase Orders (2 violations)

| ID | File:Line | Table | Impact | Fix Sketch | Size |
|---|---|---|---|---|---|
| SAFETY-011 | HQPurchaseOrders.js:597 | inventory_items | New item from PO receive invisible to tenant | Add `tenant_id: tenantId` | S |
| SAFETY-012 | HQPurchaseOrders.js:628 | stock_movements | Stock movement from PO receive orphaned | Add `tenant_id: tenantId` | S |

#### Cluster 5: Other Components (4 violations)

| ID | File:Line | Table | Impact | Fix Sketch | Size |
|---|---|---|---|---|---|
| SAFETY-009 | HQMedical.js:1045 | stock_movements | Dispensing stock movement unattributed (dispensing_log at L1017 is correct) | Add `tenant_id: tenantId` | S |
| SAFETY-020 | AdminProductionModule.js:468 | production_runs | Production run unattributed | Add `tenant_id: tenantId` | S |
| SAFETY-021 | HQFraud.js:591 | audit_log | Audit log entry unattributed | Add `tenant_id: tenantId` | S |
| SAFETY-022 | HQPricing.js:808 | product_pricing | Pricing record unattributed | Add `tenant_id: tenant?.id` | S |

#### Cluster 7: Hardcoded Tenant UUID (1 violation)

| ID | File:Line | Table | Impact | Fix Sketch | Size |
|---|---|---|---|---|---|
| SAFETY-030 | ScanResult.js:1285 | loyalty_transactions | Hardcoded tenant_id `"43b34c33-..."` — every scan path through this site writes to that tenant regardless of actual QR tenant. Misattribution, not orphan. | Replace with dynamic tenant source, mirror L1254 pattern (`tenantId \|\| null`) | S |

#### Cluster 6: Financial (1 violation)

| ID | File:Line | Table | Impact | Fix Sketch | Size |
|---|---|---|---|---|---|
| SAFETY-023 | HQYearEnd.js:203 | journal_lines | Year-end closing journal lines lack tenant_id (parent journal_entries at L182 has it) | Add `tenant_id: tenantId` to each journal_lines entry | S |

---

### 1.2 LL-285 Violations (SELECT missing tenant scoping on hq_all_ bypass tables)

Tables with `hq_all_*` RLS bypass policies let HQ operators see all tenants'
data by design. But React-level queries MUST still filter by tenant_id to
prevent cross-tenant data appearing in per-tenant views.

| ID | File:Line | Table | Impact | Fix Sketch | Size |
|---|---|---|---|---|---|
| SAFETY-024 | HQPurchaseOrders.js:369 | suppliers | HQ sees all tenants' suppliers in PO dropdown | Add `.eq("tenant_id", tenantId)` | S |
| SAFETY-025 | HQInvoices.js:762 | suppliers | HQ sees all tenants' suppliers in invoice dropdown | Add `.eq("tenant_id", tenantId)` | S |
| SAFETY-026 | HQInvoices.js:763 | wholesale_partners | HQ sees all tenants' wholesale partners | Add `.eq("tenant_id", tenantId)` | S |
| SAFETY-027 | AdminProductionModule.js:1311 | inventory_items | Admin loads all tenants' inventory | Add `.eq("tenant_id", tenantId)` | S |
| SAFETY-028 | AdminProductionModule.js:1304 | production_runs | Admin loads all tenants' production runs | Add `.eq("tenant_id", tenantId)` | S |
| SAFETY-029 | AdminProductionModule.js:1308 | batches | Admin loads all tenants' batches | Add `.eq("tenant_id", tenantId)` | S |

---

### 1.3 Audit Script Coverage Gap

`docs/audit_tenant_isolation.py` checks 33 tenant-scoped tables but is missing
several tables that have `tenant_id` columns:

- `suppliers` (SAFETY-005/006/010/024/025 would have been caught)
- `production_runs` (SAFETY-020/028 would have been caught)
- `product_formats`, `product_format_bom`
- `stock_receipts`, `stock_receipt_lines`
- `audit_log` (SAFETY-021 would have been caught)
- `recall_events`
- `shipments`, `shipment_items`
- `product_pricing` (SAFETY-022 would have been caught)

**Recommendation:** Extend the script's `TENANT_SCOPED` set before the next
audit run. This is a S-sized script change.

---

## SECTION 2: FINANCIAL DATA DEBT

### 2.1 Active Findings

| ID | Severity | Affected Tenants | Symptom | Root Cause | Blast Radius | Size |
|---|---|---|---|---|---|---|
| FIN-001 | Medium | All 5 (if year-end triggered) | Year-end close marks ALL equity_ledger rows as year_closed, not just target FY | HQYearEnd.js:230 — `.eq("tenant_id", tenantId)` has no `.eq("financial_year", fyLabel)` filter (unlike journal_entries update at L224 which correctly scopes) | equity_ledger for all FYs per tenant; downstream BS/IFRS | M |
| FIN-002 | Low (time bomb) | All 5 | After Jan 2027, fin setup/recalc writes to FY2026 instead of FY2027 | Hardcoded `"FY2026"` in: HQTenantFinancialSetup.js:164,194 · HQTenants.js:999 · HQTenantProfiles.js:311 | All equity_ledger writes from setup/recalc flows | S |
| FIN-003 | Low | All 5 | If SA VAT rate changes, revenue ex-VAT calculations wrong | `const VAT_RATE = 1.15` defined independently in: HQProfitLoss.js:461 · fetchStoreTrend.js:24 · fetchStoreFinancials.js:40 (should read from tenant_config.vat_rate) | All ex-VAT revenue figures across HQ P&L and Group Portal | S |
| FIN-006 | Low | All 5 (if multi-FY rows exist) | Tenant profile health check could show wrong year's equity data | HQTenantProfiles.js:238 — embedded join `equity_ledger(...)` fetches ALL FY rows, takes `[0]` by default ordering | Tenant profile cards, detectBugs function | S |

### 2.2 Confirmed Clean

| ID | Check | Result |
|---|---|---|
| FIN-004 | equity_ledger tenant scoping | ALL CLEAR — all 11 query sites include `.eq("tenant_id", tenantId)` |
| FIN-005 | financial_statement_status integrity | ALL CLEAR — proper tenant_id + financial_year scoping, UNIQUE constraint respected |

### 2.3 Known Permanent Gaps (confirmed still documented, no drift)

| # | Gap | Location in PENDING-ACTIONS.md | Status |
|---|---|---|---|
| 1 | POS VAT pipeline — ~R5k BS gap per tenant | Lines 51-56 | Permanent (amber banner explains) |
| 2 | Cash flow opening balance — not wired to bank recon | Lines 58-60 | Permanent (cosmetic blank field) |
| 3 | Pricing data source red (0) — no product_pricing linked | Lines 62-63 | Permanent (costing dashboard only) |

### 2.4 LL-251 8-Point Anomaly Audit SQL

All 8 queries extracted from NUAI-AGENT-BIBLE.md. **Not yet executed** — requires
Supabase MCP. Queries ready for execution:

```sql
-- 1. Duplicate VAT numbers
SELECT vat_number, COUNT(*) FROM tenant_config tc
JOIN tenants t ON t.id = tc.tenant_id
WHERE vat_registered = true GROUP BY vat_number HAVING COUNT(*) > 1;

-- 2. Unmatched bank lines on demo tenants
SELECT t.name, COUNT(*) FROM bank_statement_lines bsl
JOIN tenants t ON t.id = bsl.tenant_id
WHERE (matched_type IS NULL OR matched_type = 'unmatched')
  AND t.is_active = true GROUP BY t.name;

-- 3. equity_ledger entries for all active tenants
SELECT t.name, el.net_profit_for_year, el.share_capital
FROM equity_ledger el JOIN tenants t ON t.id = el.tenant_id
WHERE el.financial_year = 'FY2026' ORDER BY t.name;

-- 4. Reversed/stale auto-capture journals
SELECT reference, journal_date, status, financial_year FROM journal_entries
WHERE journal_type = 'AUTO-CAPTURE' AND journal_date < '2025-01-01'
  AND status = 'posted';

-- 5. Depreciation entries coverage
SELECT fa.asset_code, MAX(de.period_year * 12 + de.period_month::integer) AS latest_period
FROM fixed_assets fa
LEFT JOIN depreciation_entries de ON de.asset_id = fa.id
WHERE fa.is_active = true GROUP BY fa.asset_code;

-- 6. All demo tenant bank accounts have closing balance > 0
SELECT t.name, ba.closing_balance FROM bank_accounts ba
JOIN tenants t ON t.id = ba.tenant_id WHERE t.is_active = true;

-- 7. No demo tenant has zero journal entries
SELECT t.name, COUNT(*) AS journal_count FROM journal_entries je
JOIN tenants t ON t.id = je.tenant_id
WHERE je.status = 'posted' GROUP BY t.name ORDER BY journal_count;

-- 8. VAT filings present for active periods
SELECT t.name, COUNT(*) AS filed_periods FROM vat_period_filings vpf
JOIN tenants t ON t.id = vpf.tenant_id WHERE t.is_active = true GROUP BY t.name;
```

---

## SECTION 3: DS6 / UX DEBT

### 3.1 Violation Summary by File

| File | Hex | fontSize | fontWeight | borderRadius | rgba/shadow | bg #fff | Total | UNIFY-1 |
|---|---|---|---|---|---|---|---|---|
| HQFoodIngredients.js | ~28 | 4 | 0 | 0 | 0 | 0 | **~32** | const C alias (L71) |
| StockControl.js | 16 | 21 | 71 | 0 | 5 | 3 | **116** | const T shadow (L95), const C (L111) |
| SmartInventory.js | 19 | 126 | 66 | 1 | 12 | 1 | **225** | const SINV_T (L22) |
| HQStock.js | 39 | 107 | 104 | 5 | 10 | 4 | **269** | None (imports T directly) |
| **TOTAL** | **102** | **258** | **241** | **6** | **27** | **8** | **~642** | **4 files** |

### 3.2 Phase 1 Regression Check

**HQFoodIngredients.js**: ~32 violations. Phase 1 close (S293) documented ~55.
The lower count is consistent — the S293 count included the CATEGORIES palette
(Bucket B structural decision, ~23 hex values in the data array at L90-160)
which the S294 scanner correctly excluded as data, not style. **No regression.**

### 3.3 WATCH-006: HQStock.js Overview Sub-Tab Count Bug

**Finding:** FoodOverview KPIs aggregate over `items` instead of `activeItems`,
meaning archived/inactive items inflate counts.

**Specific locations:**
- `HQStock.js:1084` — `foodKPIs` computation iterates over `items` (not `activeItems`)
- `HQStock.js:1407, 1415, 1418, 1419` — FoodOverview filtered lists also use `items`
- `HQStock.js:1441-1483` — All 8 KPI values (expired, exp7, exp30, noExp, allergens, cold, low, cost) affected

**Additional finding:** GeneralOverview at L2938 defines its own `activeItems` but
has a **stale dependency array** `[]` at L2940 instead of `[items]`. The memo won't
recompute if items change after initial render.

**Top-level KPIs** at L867 correctly use `activeItems` — no issue there.

**Size:** M (need to thread `activeItems` through FoodOverview + fix GeneralOverview deps)

### 3.4 UNIFY-1 Violations (Local Token Definitions)

| File | Issue | Line |
|---|---|---|
| StockControl.js | `const T = { ...DS }` shadows imported T | L95 |
| StockControl.js | `const C = { ... }` with raw hex | L111 |
| SmartInventory.js | `const SINV_T = { ... }` with raw rgba + numeric radius | L22 |
| HQFoodIngredients.js | `const C = { ... }` alias (mostly maps to T tokens) | L71 |

---

## SECTION 4: SUMMARY TABLE — Top Items by (Impact x Urgency) / Effort

| Rank | ID(s) | Description | Impact | Urgency | Effort | Recommendation |
|---|---|---|---|---|---|---|
| 1 | SAFETY-013 to 019 | Loyalty pipeline: 7 INSERTs missing tenant_id | ~~HIGH~~ | ~~HIGH~~ | S | **FIXED** 528d5c2 (S295) |
| 2 | SAFETY-001 to 005 | StockControl.js: 5 INSERTs missing tenant_id | ~~HIGH~~ | ~~MEDIUM~~ | S | **FIXED** b869ad4 (S296) |
| 3 | SAFETY-024 to 029 | 6 SELECTs missing tenant scoping | HIGH — cross-tenant data visible to HQ | MEDIUM — only affects HQ multi-tenant view | S (6 one-line fixes) | Fix in one commit |
| 4 | SAFETY-006 to 008 | HQDocuments.js: 3+1 INSERTs missing tenant_id | ~~HIGH~~ | ~~MEDIUM~~ | S | **FIXED** 6c50eaf (S297) |
| 5 | SAFETY-011, 012 | HQPurchaseOrders.js: 2 INSERTs missing tenant_id | HIGH — PO receive creates orphaned items | MEDIUM — PO flow is demo path | S (2 one-line fixes) | Fix in one commit |
| 6 | WATCH-006 | HQStock FoodOverview KPIs count archived items | LOW — inflated counts, no data corruption | LOW — cosmetic only | M | Fix when touching HQStock |
| 7 | FIN-001 | HQYearEnd equity_ledger update missing FY filter | HIGH — would corrupt multi-year equity | LOW — year-end close not in demo flow | M | Fix before any year-end close |
| 8 | FIN-002 | Hardcoded "FY2026" in 3 write paths | MEDIUM — time bomb for Jan 2027 | LOW — safe until 2027 | S | Fix post-demo |
| 9 | FIN-003 | VAT_RATE 1.15 hardcoded in 3 files | LOW — SA VAT rate stable | LOW — correct value today | S | Refactor to read tenant_config |
| 10 | DS6 batch | 642 DS6 violations across 4 files | LOW — cosmetic, no data impact | LOW — not demo-blocking | L (~20h work) | Phase 2+ or dedicated DS6 sprint |

---

## SECTION 5: PERMANENT GAPS (for the record, not for fixing)

These three items were scoped as permanent in Session 293 and remain so.
They should be explained during any demo, not fixed.

### GAP-001: POS VAT Pipeline
- **Symptom:** ~R5k BS gap per tenant (output VAT from POS orders not writing to vat_transactions)
- **Root cause:** POS transaction path does not call auto-post-capture EF
- **Why permanent:** Fixing requires touching live POS order flow + historical backfill. Regression risk outweighs cosmetic gap.
- **Demo handling:** Amber banner on BS explains the gap

### GAP-002: Cash Flow Opening Balance
- **Symptom:** Cosmetic blank field on cash flow statement
- **Root cause:** Prior-period closing balance snapshot table does not exist
- **Why permanent:** Requires new table + migration + backfill logic
- **Demo handling:** Not on critical demo path

### GAP-003: Pricing Data Source
- **Symptom:** Pricing data source shows red (0) on costing dashboard
- **Root cause:** No product_pricing records linked to recipes
- **Why permanent:** Affects costing dashboard only, not financials
- **Demo handling:** Skip costing dashboard in demo flow

---

## APPENDIX A: Audit Script Analysis

`docs/audit_tenant_isolation.py` was read and analysed. The script scans all
`.js` files in `src/` for `.from("tablename")` calls on 33 tenant-scoped
tables and 5 cross-tenant tables, then checks whether `.eq("tenant_id"`
appears within a [-3, +18] line window.

**Coverage gap:** The script's `TENANT_SCOPED` set is missing tables that have
`tenant_id` columns: `suppliers`, `production_runs`, `product_formats`,
`product_format_bom`, `stock_receipts`, `stock_receipt_lines`, `audit_log`,
`recall_events`, `shipments`, `shipment_items`, `product_pricing`.

**Recommendation:** Extend the table list before next audit run.

The script could not be executed due to environment constraints (Python/Bash
permissions). Manual grep-based audit was performed instead, covering all
INSERT and SELECT patterns across `src/`.

---

## APPENDIX B: Stream A Raw Findings

29 total findings:
- 23 RULE 0F violations (INSERT missing tenant_id)
- 6 LL-285 violations (SELECT missing tenant scoping on hq_all_ bypass tables)

Highest-risk clusters:
1. **StockControl.js** — 5 INSERT violations
2. **Loyalty pipeline** (OrderSuccess + Account + SurveyWidget + ScanResult) — 7 INSERT violations
3. **HQDocuments.js** — 3 INSERT violations
4. **AdminProductionModule.js** — 1 INSERT + 3 SELECT violations
5. **HQPurchaseOrders.js** — 2 INSERT + 1 SELECT violations

All 29 findings are Size S (single-line fix each). Total fix effort for all
SAFETY items: ~2-3 hours including testing across tenants.

---

## APPENDIX C: LL-251 8-Point Audit SQL

See Section 2.4 above. All 8 queries extracted from NUAI-AGENT-BIBLE.md,
ready for Supabase MCP execution. Not yet run in this session — requires
database access.

---

*DEBT_REGISTER_v1.md · NuAi · Session 294 · 17 April 2026*
*Audit-only session. No code changes. No fixes applied.*
*Next step: Owner reviews Section 4, picks top items for Stage 1.*
