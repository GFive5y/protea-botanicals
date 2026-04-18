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

**Decision (S313, owner confirmed S312.5):** Option A — per-tenant copies.
Architecture: LL-294. Each tenant owns its own supplier records. No sharing.

**Execution (S313.5):** FIXED. Migration `20260417164513_tier2b5_safety080_supplier_migration.sql`.
4 HQ suppliers → Pure Premium, 8 document_log rows repointed, 123 supplier_products
moved, Facility A → Medi Rec (FK evidence from stock_receipts), 4 NULL → Metro Hardware.
NOT NULL applied. Final: Pure Premium 4, Metro Hardware 4, Medi Rec 1. Zero cross-tenant refs.

**Status:** FIXED (S313.5).

#### S313.5 Migration Plan

**A. Metro Hardware's 4 NULL suppliers**
Simple backfill: `UPDATE suppliers SET tenant_id = '57156762-deb8-4721-a1f3-0c6d7c2a67d8' WHERE tenant_id IS NULL`
Names: Excel-Tools SA, Leroy Merlin, Makro, Toolcraft Distributors.
Referenced only by Metro Hardware purchase_orders. No cloning needed.

**B. Eybna Technologies (HQ-owned, 2-tenant usage)**
- Create Medi Rec copy (tenant_id = b1bad266)
- Create Pure Premium copy (tenant_id = f8ff8d07)
- Repoint: 5 document_log rows → Medi-Rec-Eybna
- Repoint: 1 PO + 23 inventory_items → Pure-Premium-Eybna
- supplier_products (94 rows): decision needed before S313.5
- Delete original HQ Eybna after all references repointed

**C. Steamups Technology (HQ-owned, 2-tenant usage)**
Same pattern as Eybna:
- Medi Rec copy + Pure Premium copy
- Repoint: 2 docs → Medi Rec, 1 PO + 10 inventory_items → Pure Premium
- supplier_products (21 rows): decision needed
- Delete HQ Steamups

**D. Ecogreen Analytics (HQ-owned, 1-tenant usage)**
- Create Medi Rec copy, repoint 1 document_log row
- Delete HQ Ecogreen

**E. Cannalytics Africa (HQ-owned, orphan)**
8 orphan supplier_products. No demo tenant usage. Recommendation: leave as-is.

**F. Facility A (HQ-owned, zero references)**
Fully orphan. Recommendation: delete.

**G. Final step:** Apply NOT NULL on suppliers. DB hardening → 90/97 (93%).

**Open question for owner before S313.5:**
supplier_products (94 Eybna + 21 Steamups + 8 Cannalytics = 123 rows):
  Option 1: Clone per-tenant copies (most correct, effort ~M)
  Option 2: Re-parent to tenant suppliers (simpler, may break supplier_id FK)
  Option 3: Leave as HQ-owned (inaccessible to tenants via RLS, no bugs but dead data)

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

#### 2B.4a — SAFETY-082a: Shared-reference-data tables (S311) — CLOSED, NOT A BUG

Tables: `public_holidays` (40 rows), `product_formats` (14), `product_strains` (18)

**Status:** CLOSED — intentional design. RLS policies use
`(tenant_id IS NULL) OR (tenant_id = user_tenant_id())` pattern.
NULL tenant_id rows are globally-visible platform defaults; non-NULL rows
are per-tenant overrides. The 100% NULL state means no tenant has created
overrides yet — the feature is dormant, not broken. See LL-293.

Verified: S310.5 pg_policies query. Audit script updated to exclude
these tables from tenant-scoping checks (SHARED_REFERENCE_TABLES).

#### 2B.4b — SAFETY-082b: Backfill + NOT NULL on 6 tables (S312) — COMPLETE

Migration: `20260417160107_tier2b4b_backfill_not_null_6_tables.sql`
Backup: `_migration_backup_s312` retained (23 rows).

| Table | Before | Action | After |
|---|---|---|---|
| customer_messages | 7 NULL | Backfilled 4→Pure Premium + 3→HQ (via user_profiles) | NOT NULL |
| notification_log | 7 NULL | Deleted 4 junk (+2700000), backfilled 3→HQ (phone owner) | NOT NULL |
| products | 2 NULL | Backfilled 2→Pure Premium (via batches) | NOT NULL |
| production_runs | 4 NULL | Backfilled 4→Pure Premium (via batches) | NOT NULL |
| scans | 2 NULL | Backfilled 2→HQ (via user_profiles) | NOT NULL |
| support_tickets | 1 NULL | Backfilled 1→HQ (via user_profiles) | NOT NULL |

Attribution verified at each phase — zero drift from S311.75 evidence.

---

### 1.9 Loop System Architecture (S311.5 + S311.75)

Capstone workstream addressing institutional memory beyond the safety campaign.

| Session | Deliverable | Status |
|---|---|---|
| S311.5 | AGENT-METHODOLOGY.md — investigation procedures, patterns, failure modes | DONE |
| S311.75 | LOOP-PRINCIPLES.md — philosophy of ambient capture | DONE |
| S311.75 | DECISION-JOURNAL.md — seeded with 11 retrospective entries | DONE |
| S311.75 | Session close Step 7 — reasoning capture mechanism | DONE |
| S311.75 | AGENT-ORIENTATION.md — 8-item read list + Loop discipline | DONE |
| S311.75 | LL-292 expanded — all-surface Loop discipline | DONE |
| S311.75 | .claude/ memory audit — stale entries converted to pointers | DONE |
| S316.5 | Capstone Part 3 — retrospective audit + register pattern-tagging | PLANNED |

---

## SECTION 2: FINANCIAL DATA DEBT

### 2.1 Active Findings

| ID | Severity | Affected Tenants | Symptom | Root Cause | Blast Radius | Size |
|---|---|---|---|---|---|---|
| FIN-001 | **FIXED** S316 | All 5 | ~~Year-end close marks ALL equity_ledger rows~~ | Added `.eq("financial_year", fyLabel)`. LL-296 documents the cross-year contamination pattern. | — | S |
| FIN-002 | **FIXED** S317 | All 5 | ~~Hardcoded FY2026~~ | Computed from tenant's financial_year_start. Also fixed HQTenants calendar-year P&L period bug. LL-297. | — | S |
| FIN-003 | **FIXED** S317 | All 5 | ~~Hardcoded VAT_RATE 1.15~~ | Per-tenant from tenant_config.vat_rate. tenantService hydrates vat_rate. LL-298. | — | S |
| FIN-006 | **FIXED** S317 | All 5 | ~~equity_ledger join unsorted~~ | Added .order("financial_year", desc, foreignTable) to embedded join. | — | S |

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

### GAP-002: Cash Flow Opening Balance — **FIXED S319**
- **Symptom:** Cosmetic blank field on cash flow statement
- **Root cause (reframed):** bank_accounts.opening_balance column existed; 4/6 tenants had seeded values. Fix was wiring (frontend + EF), not new infrastructure.
- **Fix:** +1 query to bank_accounts, +3 render rows (opening → net → closing), mirrored in PDF EF page 4.
- **Phase B (deferred):** Partial-year-aware opening for tenants opened mid-FY.

### GAP-003: Pricing Data Source
- **Symptom:** Pricing data source shows red (0) on costing dashboard
- **Root cause:** No product_pricing records linked to recipes
- **Why permanent:** Affects costing dashboard only, not financials
- **Demo handling:** Skip costing dashboard in demo flow

---

## SECTION 6: PATTERN TAGGING

Added S318 (Capstone-003). Maps each finding cluster from Sections 1-2 to the
methodology patterns (AGENT-METHODOLOGY Section 3) and failure modes
(AGENT-METHODOLOGY Section 4) it exemplifies. Use this to retrieve findings
BY pattern ("show me all Pattern B clusters") or to see which failure modes
have the richest evidence.

Legend:
  PA = Pattern A (Trigger Tenant)       PB = Pattern B (Viewer Tenant)
  PC = Pattern C (Record Tenant)        SD = Shared-Defaults (LL-293)
  HQB = HQ Bypass                       SR = Service-Role EF
  PU = Per-User Scoping
  FM1-FM8 = Failure Modes 1 through 8   P5 = Procedure 5 (Financial)

### Safety Clusters (Section 1.1)

| Cluster | Finding Range | Tenant Pattern | Failure Modes | Notes |
|---|---|---|---|---|
| StockControl INSERTs | SAFETY-001 to 005 | PB | FM1 | Classic viewer-tenant — threaded tenantId prop through sub-views |
| Loyalty pipeline | SAFETY-013 to 019 | PA | — | Consumer surfaces — storefrontTenantId not useTenant |
| HQDocuments Smart Capture | SAFETY-006 to 008, +S297 | PC | FM1 | Record-tenant from selectedDoc — HQ viewing, record owned elsewhere. Re-grep caught +1 |
| HQ Purchase Orders | SAFETY-011, 012, 031, 032 | PB | FM1 | WATCH-007 re-grep caught +2 |
| HQMedical dispensing | SAFETY-009 | PB | — | Mirrors L1020 dispensing_log pattern |
| Admin Production | SAFETY-020, 033, 034 | PB | FM1 | Re-grep caught +2 |
| HQFraud audit + alerts | SAFETY-021, 035 | PB | FM1 | Re-grep caught hardcoded UUID +1 |
| HQPricing | SAFETY-022 | PB | — | One-liner |
| ScanResult hardcoded UUID | SAFETY-030 | PA | FM6 | **WATCH-008 — historical misattribution remains** |
| HQYearEnd journal_lines | SAFETY-023 | PB | — | 3 push sites, one commit |

### SELECT-without-tenant-filter Clusters (Section 1.2)

| Cluster | Finding Range | Tenant Pattern | Failure Modes | Notes |
|---|---|---|---|---|
| HQ bypass UX correctness | SAFETY-024 to 029 | HQB + PB | — | LL-285 canon — HQ RLS bypass doesn't excuse UI-layer scoping |
| usePageContext AI engine | SAFETY-036 to 056 | PB | FM1 | 21 in one file. Biggest single-file finding of the campaign |
| HQProduction chambers | SAFETY-057 to 060, 066-069 | PB | FM1 | Re-grep caught +4 |
| Other SELECT misses | SAFETY-061 to 065 | PB | FM1 | 1 false positive from context window |

### Edge Function Findings (Section 1.6)

| Cluster | Finding Range | Pattern | Failure Modes | Notes |
|---|---|---|---|---|
| process-document cross-tenant dedup | SAFETY-070 | SR | FM3 | Initially CRITICAL; S305 DB investigation proved latent (1 tenant only) → reclass HIGH |
| No-auth EF cluster | SAFETY-072, 073, 074, 076, 077, 078 | SR | — | 6 EFs needed verifyTenantAuth — two-mode helper shipped S306 |
| Intentional-design EFs | SAFETY-071, 079 | SR | — | auto-post-capture initial fetch + verify-qr public — documented, not fixed |
| False positive | SAFETY-075 | — | — | sim-pos-sales SQL interpolation is response body, not execution |

### Supplier Architecture (Section 1.7)

| Cluster | Finding | Pattern | Failure Modes | Notes |
|---|---|---|---|---|
| Supplier tenancy debt | SAFETY-080 | PB + new LL-294 | FM4 | Per-tenant copies. S313 decided, S313.5 executed. Facility A FK to Medi Rec caught during execution, not plan |

### Database Hardening (Section 1.8)

| Cluster | Finding | Pattern | Failure Modes | Notes |
|---|---|---|---|---|
| NOT NULL on 25 clean tables | 2B.1 | — | — | Zero NULL rows pre-apply, mechanical DDL |
| Backfill + NOT NULL on 3 tables | 2B.2 | — | FM4 | 174-row backup. **S309 pivoted attribution from Medi Rec to Pure Premium mid-session** — canonical FM4 example |
| Self-referencing views | SAFETY-081 | — | — | Grep-before-drop found silent failure in GeoAnalyticsDashboard.js:485 |
| Shared-defaults pattern | SAFETY-082a | SD | FM2 | 3 tables. Would-have-been-backfilled. Classified as design via RLS policy evidence |
| Backfill + NOT NULL on 6 tables | SAFETY-082b | — | FM4 | 23-row backup. Phone-owner attribution rule for notification_log |

### RLS Policy Campaign (from PENDING-ACTIONS, not yet in register section)

| Cluster | Sessions | Pattern | Failure Modes | Notes |
|---|---|---|---|---|
| Bucket A CRITICAL using='true' | S314.1 | — | FM1 (4 rounds) | 10 + 10 + 1 + 8 = 29 policies across 4 sweep rounds. Largest FM1 example of campaign |
| HIGH tenant-scoped with_check | S314.3a | — | FM1 | 83 live vs 37 registered = 2.2x under-count |
| HR cluster with_check | S314.3b | — | FM1 over-estimate | 24 actual vs 32 predicted = -25% (only over-estimate in campaign) |
| HQ bypass with_check | S314.3c | HQB | FM1 | 65 live vs 57 predicted = +14% |
| Stock_take legacy migration | S314.3d | — | — | Unused feature, migrated for consistency dividend |
| message_templates schema | S314.2c | SD (refined) | — | Added tenant_id + asymmetric WITH CHECK. LL-293 refinement |
| Final Bucket A escapes | S314.4 | — | FM1 | 8 more tables, none had tenant_id — fixed via HQ-only / user-scoped / FK patterns |

### Financial Findings (Section 2)

| Finding | Session | Pattern | Failure Modes | Procedure | Notes |
|---|---|---|---|---|---|
| FIN-001 HQYearEnd FY filter | S316 | — | FM1 (latent) | P5 | Single-year data state — would corrupt on first multi-year tenant. LL-296 |
| FIN-002 Hardcoded FY2026 | S317 | — | FM1 | P5 | Register said 4 sites, disk had 5. **Also caught HQTenants calendar-year P&L-period bug not in register.** LL-297 |
| FIN-003 Hardcoded VAT_RATE | S317 | — | — | P5 | 3 module-level constants → per-tenant tenant_config.vat_rate. LL-298 |
| FIN-006 Unsorted equity_ledger join | S317 | — | FM1 (latent) | P5 | 1 row per tenant today. Time bomb Jan 2027 |
| FIN-004/005 | — | — | — | P5 | **Confirmed CLEAN** — all query sites + UNIQUE constraint verified |

### LL Maintenance (Section 2.4)

| Finding | Session | Failure Modes | Notes |
|---|---|---|---|
| LL-251 Q5 period_month TEXT not integer | S315 | FM7 | Stale since before campaign |
| LL-251 Q6 closing_balance column doesn't exist | S315 | FM7 | Should be opening_balance. Same fix. |

### WP Register (Section 1.9)

| Cluster | Session | Failure Modes | Notes |
|---|---|---|---|
| WP doc status drift | S316.5b.1-3 | FM8 | 6/32 WPs (19%) reclassified at verification. All 6 under-classified (SCOPED → SHIPPED). Same direction as FM1 |

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

---

## SECTION 7: EF TECHNICAL DEBT (opened S-post-2A.6 by Phase 2B scoping)

### WP-EF-MODULES — Refactor process-document to shared Deno modules
- **Opened:** S-post-2A.6, 18 April 2026
- **Summary:** process-document/index.ts is 1,247 lines as of v61, growing to ~1,400 in v62. Contains fingerprint + SARS + dedup + lump-sum + expense classifier + capture classifier + system prompt all inline. Should be refactored into supabase/functions/_shared/ modules.
- **Risk level:** Low (working code, just monolithic)
- **Blocking:** Nothing
- **Estimate:** ~4h when picked up

### WP-EF-LL120-RECONCILE — Route process-document Anthropic calls through ai-copilot
- **Opened:** S-post-2A.6, 18 April 2026
- **Summary:** LL-120 mandates all AI calls route through ai-copilot EF. process-document v61 violates this by calling api.anthropic.com directly. Predates the LL. Fix requires designing an ai-copilot endpoint that can accept structured-output requests (system prompt + document bytes -> JSON extraction), then refactor process-document to use it.
- **Risk level:** Medium (changes hot-path EF behaviour)
- **Blocking:** Nothing currently; blocks "single AI gateway" audit story
- **Estimate:** ~6h when picked up

### WP-IMAGE-HASH-REAL — Replace image hash proxy with real SHA-256
- **Opened:** S-post-2A.6, 18 April 2026
- **Summary:** process-document v61 uses a proxy hash `${mime_type}:${file_size_kb}:${file_base64.slice(0,80)}` as the image_hash. Real SHA-256 on file_base64 is strictly more reliable for duplicate detection. Proxy works 95% of the time but fails when the same document is re-compressed or resampled with tiny byte differences that don't change the first 80 base64 chars.
- **Risk level:** Low (purely improvement; no regression path)
- **Blocking:** Nothing
- **Estimate:** ~1.5h when picked up

---

*DEBT_REGISTER_v1.md · NuAi · Session 294 · 17 April 2026 · Updated S-post-2A.6*
*Next step: Owner reviews Section 4, picks top items for Stage 1.*
