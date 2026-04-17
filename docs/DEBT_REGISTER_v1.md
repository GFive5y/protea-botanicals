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

#### Cluster 4: HQ Purchase Orders (2+2 violations) — FIXED 0548979

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-011 | HQPurchaseOrders.js:599 | inventory_items | FIXED | `tenant_id: tenantId` (pattern B) |
| SAFETY-012 | HQPurchaseOrders.js:631 | stock_movements | FIXED | `tenant_id: tenantId` (pattern B) |
| SAFETY-031 (NEW S298) | HQPurchaseOrders.js:492 | purchase_order_items | FIXED | `tenant_id: tenantId` (USD PO lines, found via WATCH-007 re-grep) |
| SAFETY-032 (NEW S298) | HQPurchaseOrders.js:705 | purchase_order_items | FIXED | `tenant_id: tenantId` (ZAR PO lines, found via WATCH-007 re-grep) |

**All 4 fixed in Session 298 commit 0548979.**

#### Cluster 5: Other Components (4+2 violations — ALL FIXED)

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-009 | HQMedical.js:1045 | stock_movements | **FIXED** 5fe88a3 (S300) | `tenant_id: tenantId` (mirrors L1020 dispensing_log) |
| SAFETY-020 | AdminProductionModule.js:471 | production_runs | **FIXED** 9d2b9bc (S299) | `tenant_id: tenantId` + useTenant added |
| SAFETY-021 | HQFraud.js:592 | audit_log | **FIXED** 5fe88a3 (S300) | `tenant_id: tenantId \|\| null` + useTenant added |
| SAFETY-022 | HQPricing.js:808 | product_pricing | **FIXED** 5fe88a3 (S300) | `tenant_id: tenant?.id` |
| SAFETY-033 (NEW S299) | AdminProductionModule.js:488 | production_run_inputs | **FIXED** 9d2b9bc (S299) | `tenant_id: tenantId` (WATCH-007 re-grep) |
| SAFETY-034 (NEW S299) | AdminProductionModule.js:788 | stock_movements | **FIXED** 9d2b9bc (S299) | `tenant_id: tenantId` (WATCH-007 re-grep) |
| SAFETY-035 (NEW S300) | HQFraud.js:609 | system_alerts | **FIXED** 5fe88a3 (S300) | Replaced hardcoded UUID with `tenantId \|\| null` (WATCH-007 re-grep) |

#### Cluster 7: Hardcoded Tenant UUID (1 violation) — FIXED 9d2b9bc

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-030 | ScanResult.js:1285 | system_alerts | **FIXED** | Replaced hardcoded UUID `"43b34c33-..."` with `tenantId \|\| null` (pattern A — TRIGGER tenant) |

**Note:** Register originally said loyalty_transactions; actual table is system_alerts. Corrected during S299 fix.
**S304.5 annotation:** Hardcoded UUID `43b34c33-6864-4f02-98dd-df1d340475c3` identified as Nu Ai HQ operator tenant (industry_profile='operator'). The misattribution bug was writing system_alerts to the platform operator, not a random unrelated tenant. Also found in HQFraud.js (SAFETY-035, fixed S300).**

#### Cluster 6: Financial (1 violation)

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-023 | HQYearEnd.js:196-201 | journal_lines | **FIXED** 5fe88a3 (S300) | `tenant_id: tenantId` on all 3 jLines.push sites (matches parent journal_entries at L183) |

---

### 1.2 LL-285 Violations (SELECT missing tenant scoping on hq_all_ bypass tables)

Tables with `hq_all_*` RLS bypass policies let HQ operators see all tenants'
data by design. But React-level queries MUST still filter by tenant_id to
prevent cross-tenant data appearing in per-tenant views.

| ID | File:Line | Table | Impact | Fix Sketch | Size |
|---|---|---|---|---|---|
| SAFETY-024 | HQPurchaseOrders.js:369 | suppliers | ~~HQ sees all tenants' suppliers~~ | **FIXED** 0548979 (S298) | S |
| SAFETY-025 | HQInvoices.js:762 | suppliers | ~~HQ sees all tenants' suppliers~~ | **FIXED** 9d2b9bc (S299) | S |
| SAFETY-026 | HQInvoices.js:763 | wholesale_partners | ~~HQ sees all tenants' partners~~ | **FIXED** 9d2b9bc (S299) | S |
| SAFETY-027 | AdminProductionModule.js:1313 | inventory_items | ~~Admin loads all tenants' inventory~~ | **FIXED** 9d2b9bc (S299) | S |
| SAFETY-028 | AdminProductionModule.js:1318 | production_runs | ~~Admin loads all tenants' runs~~ | **FIXED** 9d2b9bc (S299) | S |
| SAFETY-029 | AdminProductionModule.js:1320 | batches | ~~Admin loads all tenants' batches~~ | **FIXED** 9d2b9bc (S299) | S |

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

**Status:** DONE in S301. Script extended to 50+ tables, detection logic
enhanced to cover INSERT payloads and single-record operations.

### 1.4 Script Verification Run (Session 301)

Script: `docs/audit_tenant_isolation.py` v2.0 (extended S301)
Run: `python docs/audit_tenant_isolation.py` from repo root
Result: **62 raw BLEEDs → 24 TRUE BLEEDs after triage, 38 false positives**

False positives caused by: child-row queries scoped by parent ID (journal_lines
by journal_id, stock_movements by item_id), single-record UPDATE/DELETE by `.eq("id")`,
context window too small (tenant filter exists but >18 lines away), non-standard
column names (`destination_tenant_id` in ShopOverview).

### 1.5 NEW Findings from Script Verification (Stage 6 input)

#### Cluster 8: usePageContext.js (21 violations — CRITICAL) — FIXED c3f2dc8

The CONTEXT_QUERIES engine powers the WorkflowGuide AI assistant across all
portals. `tenantId` was passed as a parameter but not used on 21 queries.
**All 21 fixed in Session 302 commit c3f2dc8.**

| ID | File:Line | Table | Impact | Size |
|---|---|---|---|---|
| SAFETY-036 | usePageContext.js:85 | product_cogs | AI context cross-tenant | S |
| SAFETY-037 | usePageContext.js:151 | batches | AI context cross-tenant | S |
| SAFETY-038 | usePageContext.js:159 | inventory_items | AI context cross-tenant | S |
| SAFETY-039 | usePageContext.js:166 | inventory_items | AI context cross-tenant | S |
| SAFETY-040 | usePageContext.js:172 | production_runs | AI context cross-tenant | S |
| SAFETY-041 | usePageContext.js:398 | inventory_items | AI context cross-tenant | S |
| SAFETY-042 | usePageContext.js:440 | qr_codes | AI context cross-tenant | S |
| SAFETY-043 | usePageContext.js:499 | inventory_items | AI context cross-tenant | S |
| SAFETY-044 | usePageContext.js:504 | support_tickets | AI context cross-tenant | S |
| SAFETY-045 | usePageContext.js:577 | orders | AI context cross-tenant | S |
| SAFETY-046 | usePageContext.js:581 | loyalty_transactions | AI context cross-tenant | S |
| SAFETY-047 | usePageContext.js:713 | document_log | AI context cross-tenant | S |
| SAFETY-048 | usePageContext.js:717 | document_log | AI context cross-tenant | S |
| SAFETY-049 | usePageContext.js:721 | document_log | AI context cross-tenant | S |
| SAFETY-050 | usePageContext.js:787 | product_cogs | AI context cross-tenant | S |
| SAFETY-051 | usePageContext.js:789 | product_pricing | AI context cross-tenant | S |
| SAFETY-052 | usePageContext.js:867 | batches | AI context cross-tenant | S |
| SAFETY-053 | usePageContext.js:968 | customer_messages | AI context cross-tenant | S |
| SAFETY-054 | usePageContext.js:972 | support_tickets | AI context cross-tenant | S |
| SAFETY-055 | usePageContext.js:1146 | shipments | AI context cross-tenant | S |
| SAFETY-056 | usePageContext.js:1150 | production_runs | AI context cross-tenant | S |

#### Cluster 9: HQProduction.js (4+4 violations) — FIXED 37cc3d3

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-057 | HQProduction.js:1908 | wholesale_partners | **FIXED** | `.eq("tenant_id", tenantId)` |
| SAFETY-058 | HQProduction.js:1913 | product_formats | **FIXED** | `.eq("tenant_id", tenantId)` |
| SAFETY-059 | HQProduction.js:1925 | product_format_bom | **FIXED** | `.eq("tenant_id", tenantId)` |
| SAFETY-060 | HQProduction.js:4780 | production_runs | **FIXED** | `tenant_id: tenantId` |
| SAFETY-066 (NEW S303) | HQProduction.js:4821 | production_run_inputs | **FIXED** | `tenant_id: tenantId` (single-chamber vape) |
| SAFETY-067 (NEW S303) | HQProduction.js:4985 | production_run_inputs | **FIXED** | `tenant_id: tenantId` (BOM lines) |
| SAFETY-068 (NEW S303) | HQProduction.js:4898 | production_run_inputs | **FIXED** | `tenant_id: tenantId` (multi-chamber medium+terpene) |
| SAFETY-069 (NEW S303) | HQProduction.js:4940 | production_run_inputs | **FIXED** | `tenant_id: tenantId` (multi-chamber hardware) |

#### Cluster 10: Other files (5 violations — 4 FIXED, 1 FALSE POSITIVE) — FIXED 37cc3d3

| ID | File:Line | Table | Status | Fix Applied |
|---|---|---|---|---|
| SAFETY-061 | HQSuppliers.js:517 | suppliers | **FIXED** | `tenant_id: tenantId` + useTenant added |
| SAFETY-062 | HQSuppliers.js:1279 | suppliers | **FIXED** | `.eq("tenant_id", tenantId)` |
| SAFETY-063 | AdminHRPanel.js:58,62,70 | staff/leave/timesheets | **FIXED** | `.eq("tenant_id", tenantId)` on all 3 queries |
| SAFETY-064 | ExpenseManager.js:307 | expenses | **FALSE POSITIVE** | tenant_id already in payload at L282 (script context window too small) |
| SAFETY-065 | HQAnalytics.js:197,345 | shipments, production_runs | **FIXED** | `.eq("tenant_id", tenantId)` on both |

**All Stage 6 findings resolved. Total: 30 original + 4 re-grep = 34 findings, 33 fixed + 1 FP.**

---

### 1.6 Edge Function Safety Findings (Session 304 — Tier 2 Workstream A)

14 Edge Functions audited at HEAD `9fe86e8`. First EF-side tenant isolation
audit. Prior safety campaign (S294-S303) was React-only.

**Summary: 14 EFs audited, 8 findings across 6 EFs, 6 EFs CLEAN.**

| # | EF Name | Risk | Findings | Key Issue |
|---|---|---|---|---|
| 1 | auto-post-capture | HIGH | 3 | No auth; initial fetch unfiltered |
| 2 | process-document | **HIGH** (was CRITICAL, reclassified S305 — latent, not active) | 2 | Latent cross-tenant leak in duplicate guard |
| 3 | seed-tenant | HIGH | 1 | No auth (mitigated by idempotency) |
| 4 | sim-pos-sales | HIGH | 2 | No auth; latent SQL interpolation |
| 5 | sign-qr | CLEAN | 0 | Pure crypto, no DB |
| 6 | verify-qr | LOW | 1 | Products read not tenant-filtered |
| 7 | payfast-itn | CLEAN | 0 | UUID-scoped, correct tenant_id |
| 8 | invite-user | MEDIUM | 1 | Trusts caller-provided tenant_id |
| 9 | send-notification | CLEAN | 0 | tenant_id included |
| 10 | send-email | CLEAN | 0 | Authenticated, tenant-filtered |
| 11 | generate-financial-statements | MEDIUM | 1 | No auth on sensitive financial PDFs |
| 12 | ai-copilot | MEDIUM | 1 | tenantId from unverified request body |
| 13 | payfast-checkout | CLEAN | 0 | Authenticated, tenant from profile |
| 14 | get-fx-rate | CLEAN | 0 | Global data, no tenant scope needed |

**DOMINANT PATTERN: Missing caller authorization, not missing tenant_id.**
Most EFs correctly include tenant_id in their write payloads. The risk is
that service-role clients bypass RLS, and most EFs accept tenant_id from
the request body without verifying the caller has authority over that tenant.

#### Finding Detail

**CRITICAL:**

| ID | EF | Line | Type | Table | Description | Size |
|---|---|---|---|---|---|---|
| SAFETY-070 | process-document | L907 | SELECT | document_log | **FIXED** 5404b74 (S305). Added `.eq("tenant_id", tenant_id)` + tightened guard to require tenant_id (skip dedup if null). Defence-in-depth — latent leak closed before activation. | S |

**HIGH:**

| ID | EF | Line | Type | Description | Size |
|---|---|---|---|---|---|
| SAFETY-071 | auto-post-capture | L49 | SELECT | **DOCUMENTED** 54412c0 (S307). Unscoped fetch is intentional — record's tenant_id needed for auth check (SAFETY-072). Auth gates all processing. Inline comment added. | S |
| SAFETY-072 | auto-post-capture | — | AUTH | **FIXED** 90be33c (S306). verifyTenantAuth('tenant', cap.tenant_id) after record fetch. | M |
| SAFETY-073 | seed-tenant | — | AUTH | **FIXED** 90be33c (S306). verifyTenantAuth('operator-only'). | M |
| SAFETY-074 | sim-pos-sales | — | AUTH | **FIXED** 90be33c (S306). verifyTenantAuth('operator-only'). | M |
| SAFETY-075 | sim-pos-sales | L323-328 | SQL | **FALSE POSITIVE** (S307). Interpolated SQL strings are returned in response body for human copy-paste only — never executed by the EF. SIM_TAG is a hardcoded constant, TENANT_ID is operator-gated UUID. No injection surface. | S |

**MEDIUM:**

| ID | EF | Line | Type | Description | Size |
|---|---|---|---|---|---|
| SAFETY-076 | invite-user | — | AUTH | **FIXED** 90be33c (S306). verifyTenantAuth('tenant', tenant_id). | M |
| SAFETY-077 | generate-financial-statements | — | AUTH | **FIXED** 90be33c (S306). verifyTenantAuth('tenant', tenant_id). | M |
| SAFETY-078 | ai-copilot | — | AUTH | **FIXED** 90be33c (S306). verifyTenantAuth('tenant', tenantId) when tenantId provided. | M |

**LOW:**

| ID | EF | Line | Type | Description | Size |
|---|---|---|---|---|---|
| SAFETY-079 | verify-qr | L83-102 | SELECT | **DOCUMENTED** 54412c0 (S307). Unscoped query is intentional — public QR scanner, no JWT. HMAC verification is the security gate (wrong product = invalid_signature). No sensitive data in response. Inline comment added. | S |

#### Auth Pattern Analysis

| EF | Auth Status | Deployment |
|---|---|---|
| payfast-checkout | Authenticated (JWT verified) | Correct |
| send-email | Authenticated (JWT verified) | Correct |
| payfast-itn | N/A (server-to-server callback) | Correct |
| sign-qr | N/A (no DB access) | Correct |
| get-fx-rate | N/A (global data) | Correct |
| auto-post-capture | **NO AUTH** | `--no-verify-jwt` likely |
| process-document | **NO AUTH** | `--no-verify-jwt` likely |
| seed-tenant | **NO AUTH** | Admin-only, but not enforced |
| sim-pos-sales | **NO AUTH** | Admin-only, but not enforced |
| invite-user | **NO AUTH** in code | Default JWT from gateway |
| generate-financial-statements | **NO AUTH** | `--no-verify-jwt` |
| ai-copilot | **NO AUTH** | `--no-verify-jwt` |
| send-notification | **NO AUTH** | Low-risk audit table |
| verify-qr | **NO AUTH** | Read-only, low risk |

**Recommendation:** The auth gap is systemic. Rather than fixing each EF
individually, consider:
1. **Immediate (S305):** Fix SAFETY-070 (the CRITICAL cross-tenant data leak —
   one-line `.eq("tenant_id", tenant_id)` on process-document L908).
2. **Short-term:** Add JWT verification to generate-financial-statements and
   ai-copilot (both expose sensitive tenant data).
3. **Medium-term:** Establish a standard EF auth pattern (verify JWT, extract
   tenant_id from token claims, validate against request tenant_id) and
   retrofit across all EFs. This is an architectural task, not a per-EF fix.

---

### 1.7 Supplier Tenancy Data Integrity (S305)

| ID | Table | Type | Description | Size |
|---|---|---|---|---|
| SAFETY-080 | suppliers | DATA | Architectural data debt: 4 suppliers with NULL tenant_id (Metro Hardware fixtures: Excel-Tools SA, Leroy Merlin, Makro, Toolcraft Distributors), 5 suppliers with tenant_id = 43b34c33 (Nu Ai HQ operator). 0 suppliers owned by any of 5 demo tenants. 8 of 19 document_log rows reference suppliers belonging to HQ tenant, not the document's tenant (Medi Rec). Cross-tenant data relationships already exist at data layer. | L |

**Impact:** Supplier-driven joins will break tenant isolation as soon as a second
tenant uploads documents. Current dedup and access patterns work only because one
tenant has documents.

**Fix approach (architectural decision required):**
- A. Migrate HQ-tenant suppliers into per-tenant copies
- B. Introduce "shared fixtures" as a first-class concept in RLS
- C. Re-seed demo tenants with their own supplier records

**Status:** OPEN. Not a code fix. Parked for dedicated supplier-tenancy session.

---

### 1.8 Database Hardening — Tier 2 Workstream B (S308+)

#### 2B.1 — NOT NULL constraints on tenant_id (S308) — COMPLETE

25 tables constrained via migration `20260417132906_tier2b1_not_null_tenant_id.sql`.
All confirmed zero NULL rows pre-apply. Post-apply verified `is_nullable='NO'`.
Negative test confirmed constraint enforcement (ERROR 23502).

Tables: batches, document_log, email_logs, expenses, food_ingredients, inventory,
local_inputs, loyalty_config, orders, price_history, product_cogs, product_format_bom,
product_pricing, purchase_orders, qr_codes, qr_security_settings, shipments,
stock_receipts, stock_transfers, supplier_products, tenant_usage_log, user_profiles,
wholesale_messages, wholesale_orders, wholesale_partners.

#### 2B.2 — Data cleanup + NOT NULL on 3 tables (S309) — COMPLETE

Migration: `20260417134822_tier2b2_cleanup_not_null.sql`
Backup: `_migration_backup_s309` table retained (174 rows).

| Table | Before | Action | After |
|---|---|---|---|
| inventory_items | 21 NULL / 1186 | Deleted 5 junk (FP-test etc + cascading dependents), backfilled 16 to Pure Premium | NOT NULL |
| stock_movements | 152 NULL / 15097 | Backfilled 146 from parent item tenant_id | NOT NULL |
| loyalty_transactions | 1 NULL / 673 | Backfilled 1 to Pure Premium (order cross-verified) | NOT NULL |

#### 2B.2 remaining — 10 nullable tables

| Status | Tables |
|---|---|
| Already logged as SAFETY-080 | suppliers (4/9 NULL) |
| 100% NULL (SAFETY-082) | customer_messages (7), notification_log (7), product_formats (14), product_strains (18), production_runs (8), products (2), public_holidays (40), scans (2), support_tickets (1) |

#### 2B.3 — SAFETY-081 (NEW S308): Recursive rules on 2 tables

`retailer_performance` and `scan_geo_summary` were self-referencing VIEWS
(not tables) with no underlying base tables. Non-queryable since creation.
**FIXED** dd254af (S310) — both views dropped. GeoAnalyticsDashboard.js L485
references retailer_performance but the query always failed (|| [] fallback,
same behaviour post-drop). No DB object dependencies found.

#### 2B.4 — SAFETY-082 (NEW S308): 100% NULL tenant_id on 9 tables

Tables with tenant_id column where every row has NULL. Two sub-classes:
- Legitimately cross-tenant reference data (`public_holidays`): column
  may be incorrect — consider dropping
- Tenant-scoped but never populated: data integrity finding, architectural
  decision needed

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
| 3 | SAFETY-024 to 029 | 6 SELECTs missing tenant scoping | ~~HIGH~~ | ~~MEDIUM~~ | S | **FIXED** 0548979+9d2b9bc (S298-299) |
| 4 | SAFETY-006 to 008 | HQDocuments.js: 3+1 INSERTs missing tenant_id | ~~HIGH~~ | ~~MEDIUM~~ | S | **FIXED** 6c50eaf (S297) |
| 5 | SAFETY-011, 012, 031, 032 | HQPurchaseOrders.js: 4 INSERTs + 1 SELECT | ~~HIGH~~ | ~~MEDIUM~~ | S | **FIXED** 0548979 (S298) |
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
