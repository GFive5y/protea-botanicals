# MASTER AUDIT — NuAi Platform Documentation
## Full System Knowledge Audit · April 4, 2026
## Purpose: Paint a complete picture for all future Claude sessions
## Produced: Session v177 — post SmartInventory v1.5 fix

---

## ⚠️ CRITICAL — READ THIS BEFORE ANYTHING ELSE

This audit was produced after reading ALL 30 project knowledge documents in a single session.
It identifies: what is current, what is stale, what gold was preserved, and what gold is at risk.
Use this to build SESSION-STATE v177 and update the master doc set.

---

# PART 1 — DOCUMENT STATUS AUDIT

## ✅ CURRENT & ACCURATE

### SESSION-STATE_v176.md
- Status: CURRENT but one version behind
- Issue: HEAD says 7cd80ef — missing commits from this session:
  - 1ef262f (SmartInventory v1.4 pill scroll)
  - f6b065f (SmartInventory v1.5 dataTransfer drag fix — THIS SESSION)
- Action: Replace with SESSION-STATE_v177 (built in this audit)

### SESSION-CORE_v2_8.md
- Status: MOSTLY CURRENT — has 3 stale sections
- STALE 1: Schema section says "eod_cash_ups / pos_sessions / daily_summaries — NOT YET CREATED"
  → They ARE live and confirmed (committed 5249529, WP-EOD)
- STALE 2: LL-189, LL-190, LL-191 referenced in v176 but NOT in v2.8 body text
  → These must be added to v2.8 (see Part 3 below)
- STALE 3: THREE-CLAUDE section doesn't reflect VS Code Claude Code integration
- Action: Increment to v2.9, fix schema, add LL-189/190/191, update THREE-CLAUDE

### NORTH-STAR_v1_0.md
- Status: ✅ GOLD — fully accurate strategic document
- No updates needed. This is the WHY document — update only if strategy changes.

### STRATEGY_v2_0.md
- Status: MOSTLY CURRENT — 3 stale items
- STALE 1: Build priority list shows WP-POS as future — POSScreen v1.0 is LIVE
- STALE 2: BUG-047/045/046 listed as pending — all CLOSED (session v176)
- STALE 3: Priority P6 "ProteaAI CODEBASE_FACTS update" — still pending (owner action)
- Action: Minor update if desired, not critical for sessions

### VIOLATION_LOG_v1_0.md
- Status: ✅ CURRENT — only 2 violations (VL-001, VL-002), both LL-184 related
- No new violations in sessions v173-v177
- Action: None. Keep as-is.

### ONBOARDING_v2_0.md
- Status: PARTIALLY STALE
- STALE 1: Section 10 "What's Coming" shows BUG-047/045/046 as immediate — CLOSED
- STALE 2: Doesn't include SmartInventory, POSScreen v2, EOD expansion as future items
- STALE 3: HQDashboard listed as v4.2 in architecture diagram, should be v4.3
- Action: Minor update, not blocking

### SESSION_AUDIT_COMPLETE.md
- Status: ✅ GOLD DOCUMENT — comprehensive audit from March 30
- Contains critical undocumented decisions still relevant:
  - Decision C (Client 2 storefront options — STILL UNRESOLVED)
  - Decision D (Yoco per-tenant vs platform — STILL UNRESOLVED)
  - check_reorder() trigger bug — NEVER added to SESSION-BUGS
  - F&B sessionStorage handoff pattern
  - Owner actions from v139-v153 — many still unclosed
- Action: Extract gold into SESSION-STATE v177 and update docs

### SESSION-LOG_DEFINITIVE.md
- Status: ✅ CURRENT TO MARCH 30 — needs new entries appended
- Missing entries: WP-DAILY-OPS Sessions B+C, WP-POS, WP-EOD, BUG-046/047
- Action: Append new session blocks for April sessions

### NUAI_STRATEGIC_RESET_v1_0.md
- Status: PARTIALLY STALE
- STALE: WP-POS listed as "not yet built" — POSScreen v1.0 IS live
- STALE: Gap analysis items that have been resolved (POSScreen, SmartInventory)
- Action: This was a one-time reset document. Keep for historical context but note it's partially superseded.

---

## ⚠️ STALE — NEEDS REPLACEMENT

### REGISTRY_v3_0.md (internally says v3.1)
- Status: SIGNIFICANTLY STALE
- MISSING from Feature Index:
  - SmartInventory.js — major new component in TenantPortal
  - POSScreen.js (listed in Section 2 but not Section 1 feature index)
  - EODCashUp.js (listed in Section 2 but not Section 1 feature index)
  - HQTradingDashboard v3.0 (Section 1 may show v1.0)
- STALE in Section 3 (Pending):
  - WP-DAILY-OPS Session C — COMPLETED (HQTradingDashboard v3.0, commit a5340f8)
  - BUG-047 — CLOSED (8c19990)
  - BUG-046 — CLOSED (7cd80ef)
- Action: Increment to v3.2, add SmartInventory, close completed items

### MANIFEST_v3_0.md (internally says v3.1)
- Status: SIGNIFICANTLY STALE
- MISSING entirely:
  - SmartInventory.js — not listed anywhere
- STALE entries:
  - HQTradingDashboard shows v1.0 — should be v3.0
  - HQTenants.js shows v1.1 — is v1.1+BUG-046 (correct but minor)
- Action: Add SmartInventory.js entry, update HQTradingDashboard version

### SESSION-BUGS_updated.md
- Status: STALE — 3 bugs listed as OPEN that are CLOSED
- BUG-047: CLOSED (8c19990, session v176)
- BUG-046: CLOSED (7cd80ef, session v176)
- BUG-045: CLOSED (self-healed, session v176)
- MISSING from OPEN bugs:
  - SmartInventory column drag-drop — OPEN (was being worked this session, f6b065f = fix)
  - check_reorder() trigger — from SESSION_AUDIT, never logged
- Action: Close BUG-045/046/047, add drag-drop resolution, verify check_reorder status

---

## 🗑️ SUPERSEDED — CAN BE REMOVED FROM PROJECT KNOWLEDGE

### SESSION-CORE_v2_2.md
- Superseded by v2_3 which is superseded by v2_8
- Contains LL-001 through ~LL-147
- GOLD NOTE: The LL list from v2.2/v2.3 (LL-001 through LL-173) is NOT reproduced in v2.8
  v2.8 only explicitly shows LL-174 through LL-191
  → All prior LLs are assumed intact in the codebase but are NOT in the read docs
  → ACTION: Preserve v2.3 OR add a "LL Summary Archive" to master set

### SESSION-CORE_v2_3.md
- Superseded by v2_8 but contains RULE 0J detail (production_runs schema, 27+ columns)
  that v2.8 abbreviated
- GOLD NOTE: production_runs columns list in v2.3 is more detailed than v2.8
  → ACTION: Merge the detailed columns into v2.9 update

### SESSION-STATE_v173.md, v174.md, v175.md
- All superseded by v176
- ACTION: Remove from project knowledge, content preserved in v176

### SESSION-BUGS_v166.md
- Superseded by SESSION-BUGS_updated.md
- ACTION: Remove from project knowledge

### SOP.md (older version)
- Superseded by SOP_v1_1.md
- ACTION: Remove SOP.md, keep SOP_v1_1.md

---

## 📦 ACTIVE WP SPECS — STATUS

### WP-VISUAL-SYSTEM_v1.docx
- Status: ACTIVE — 20+ page-level charts NOT YET BUILT
- Action: Keep. Next major build after current fixes.

### WP-O_v2_0_Loyalty_Engine_Spec.md
- Status: ACTIVE — loyalty-ai Edge Function NOT YET DEPLOYED
- Action: Keep. Needed for loyalty-ai EF build.

### WP-FIN_v1_0.md
- Status: PARTIALLY COMPLETE
- S1-S4: DONE. S5 (Balance Sheet): DONE (29ecb89 — see SESSION-LOG).
- S6 (Cash Flow): In HQBalanceSheet.js — DONE.
- Remaining: S5 WP-FIN note (local COGS tracking), S6 VAT module
- Action: Keep but update status section

### WP-FNB_SOP_v1.md
- Status: REFERENCE ONLY — WP-FNB all 8 sessions complete
- Action: Keep as F&B reference document

### WP-SMART-CATALOG_v1_1.md
- Status: ACTIVE — SmartInventory.js spec, v1.5 is live with drag fix
- Action: Keep. Update to reflect v1.5 as latest.

### WP-STOCK-RECEIVE-S3_v1_0.md
- Status: PENDING BUILD
- Action: Keep. Part of next operational build priorities.

### WP-STOCK-MERGE_v1_0.md
- Status: PENDING BUILD
- Action: Keep.

### WP-REORDER_v1_0.md
- Status: BLOCKED — needs real sales velocity data (2-3 weeks of real sales)
- Action: Keep but note blocked status.

### WP-DAILY-OPS_v1_0.md
- Status: COMPLETE (Sessions A, B, C all done)
- Session A: EODCashUp
- Session B: HQTradingDashboard v1.0
- Session C: HQTradingDashboard v3.0 (30-day chart, month/year history)
- Action: Archive or mark complete

---

# PART 2 — GOLD AT RISK (not in current active docs)

## 1. LL-001 through LL-173 — THE FULL LL ARCHIVE

SESSION-CORE v2.8 only shows LL-174 through LL-191. The preceding 173 LLs exist in
SESSION-CORE v2.2 and v2.3. If those files are removed from project knowledge without
a summary, the critical early lessons are lost to future sessions.

The most important LLs from v2.3 that are NOT in v2.8:

```
LL-018: MANIFEST not read before build — duplication
LL-021: Session doc overwritten without reading first
LL-024: Auto-created shop items always at sell_price=0 (owner must set price)
LL-051: HQ/admin components = Inter font ONLY. Never Outfit/Cormorant/Jost.
LL-056: scan_logs has NO tenant_id column. Never filter by it.
LL-075: DISK IS TRUTH. Session docs can say pending when file exists.
LL-083: Truncated reads drop data. Always confirm line count before updating.
LL-084: Dedup gate — never confirm stock movement if reference in document_log.
LL-085: allocateLumpSumCosts must be at module level not inside try{}.
LL-086: Food fields on production_runs ONLY. Never on batches.
LL-087: isFoodBev must be declared before formatGroups computation.
LL-088: product_formats.is_cannabis must be set for all cannabis formats.
LL-089: product_format_bom needs RLS. product_formats column = label NOT name.
LL-100: product_cogs.tenant_id added + RLS enabled.
LL-111: stock_movements.unit_cost ONLY (not unit_cost_zar in the movements table).
LL-115: stock_reservations uses inventory_item_id + quantity_reserved.
LL-116: invoices uses supplier_id for ALL partners. invoice_number not reference.
LL-117: Reserve_stock() DB function must exist before calling.
LL-120: ALL Claude API calls via ai-copilot EF. NEVER from React directly.
LL-124: ZERO cannabis refs on public/Yoco-integrated pages. Visa/Mastercard prohibited.
LL-125: Yoco in-person SDK = Android/iOS Bluetooth ONLY. Cannot run in React web.
LL-127: useTenant() never call after early return — breaks rules-of-hooks.
LL-128: <a> tags drop in find/replace — check HTML after any find/replace near links.
LL-131: HQStock hardcoded HQ_TENANT_ID removed — always use useTenant().
LL-132: user_profiles_role_check blocks 'management' role INSERT — check constraints.
LL-138: Always verify version numbers against disk before starting a WP session.
LL-139: Verify UNIQUE constraints before using ON CONFLICT.
LL-142: MANIFEST can say "—" when file exists — always verify disk before rebuilding.
LL-143: WP spec version numbers get stale — always read actual file first.
LL-144: PayFast block + inventory deduction in CheckoutPage must be preserved exactly.
LL-147: grep for existing content before any find/replace in large files.
```

## 2. Unresolved Architectural Decisions (from SESSION_AUDIT_COMPLETE)

```
Decision C: Client 2 storefront options (A/B/C) — UNRESOLVED since v149
  Option A: Rebuild their site on NuAi, point domain at Vercel
  Option B: Keep existing site, webhook sync orders into NuAi
  Option C: NuAi embed JS snippet into existing site
  → Must resolve before any WP-MULTISITE S2 work

Decision D: Yoco per-tenant vs platform account — UNRESOLVED since v149
  Per-tenant: each client has own sk_live_ in tenant_config.yoco_secret_key
  Platform: one NuAi merchant account, route payments between tenants
  → Must resolve before WP-PAY S1 build starts
```

## 3. check_reorder() Trigger Bug (from SESSION_AUDIT_COMPLETE)

```
Never added to SESSION-BUGS.md. Status: UNKNOWN.
Raised in v139, never closed.
Check: SELECT routine_name FROM information_schema.routines
       WHERE routine_schema = 'public' AND routine_name LIKE '%reorder%';
```

## 4. F&B sessionStorage Handoff Pattern

```
HQRecipeEngine.js "▶ Start Batch" button:
  1. Writes sessionStorage('fnb_start_batch') with JSON payload:
     { recipe_id, name, version, yield, allergens, shelf_life, temp_zone }
  2. Navigates to /hq?tab=hq-production
  3. HQProduction.js reads sessionStorage on mount → pre-fills New Run form
This is the ONLY handoff between F&B Recipes and Production.
Not documented in ONBOARDING or SESSION-CORE.
```

## 5. Pending Owner Actions (accumulated)

```
FROM EARLY SESSIONS (v139-v153) — still outstanding:
  [ ] Rebuild check_reorder() trigger — status unknown
  [ ] Delete duplicate Takealot expense row (expenses table)
  [ ] Resolve Yoco architecture question (per-tenant vs platform)
  [ ] Resolve Client 2 storefront option (A/B/C)
  [ ] Update ProteaAI.js CODEBASE_FACTS string (says "Vercel deploy pending" — very stale)
      Search: const CODEBASE_FACTS = `
      Should reflect: WP-O complete, POSScreen live, EOD live, Balance Sheet live, etc.

FROM v176 SESSION:
  [ ] Supabase backups — enable NOW (Settings → Add-ons)
  [ ] Load real product SKUs for Medi Rec (20-40 SKUs)
  [ ] Set sell_price on each SKU
  [ ] Set loyalty_category on each SKU
  [ ] Set reorder_level on each SKU
  [ ] nuai.co.za → register (R99 at domains.co.za)
  [ ] Yoco merchant signup (sole trader, no CIPRO needed)
```

## 6. SmartInventory Missing from Registry/Manifest

SmartInventory.js is a major component (>4,000 lines) serving the tenant-portal catalog.
It is:
- ✅ Built (v1.5 live as of this session, commit f6b065f)
- ❌ NOT in REGISTRY Section 1 Feature Index
- ❌ NOT in MANIFEST file list
- ❌ NOT in ONBOARDING HQ feature map

This is a significant documentation gap. Any future Claude session that searches for
"show stock catalogue to tenant" will not find it and may build a duplicate.

---

# PART 3 — MISSING LLs FROM SESSION-CORE v2.8

The following LLs are referenced in SESSION-STATE_v176 as confirmed but are NOT
in the body text of SESSION-CORE_v2_8.md:

## LL-189 — STOCK MOVEMENT TYPE FOR POSSCREEN
```
movement_type must be 'sale_pos' for POSScreen sales.
NOT 'sale_out' (that is for wholesale).
Origin: POSScreen.js v1.0 build session
```

## LL-190 — EOD THRESHOLDS FROM DB ALWAYS
```
All EOD thresholds (variance_tolerance, escalation_threshold, default_float,
approver_role) MUST come from tenant_config.settings JSONB.
NEVER hardcode these values in EODCashUp.js.
Origin: WP-EOD build session
```

## LL-191 — LOYALTY TRANSACTIONS COLUMN NAME
```
loyalty_transactions table column name is: transaction_type
NOT: type, loyalty_type, or event_type.
Always use transaction_type in INSERT/SELECT/WHERE.
Origin: HQTradingDashboard build session — column name caused query failure
```

---

# PART 4 — CURRENT LIVE STATE (April 4, 2026)

## Git Head
```
f6b065f  fix(catalog): SmartInventory v1.5 — dataTransfer drag fix  ← CURRENT PROD
1ef262f  fix(catalog): SmartInventory v1.4 — pill scroll + column drag-drop
7cd80ef  fix(tenants): BUG-046 — read tier from tenant_config not tenants table
8c19990  fix(loyalty): BUG-047 — scope loyalty_config query to tenant_id
b1bbad6  docs: REGISTRY v3.2 + MANIFEST v3.2 + SESSION-CORE v2.9
5b24855  Merge PR #1 — HQTradingDashboard v3.0
```

## Live Files — Confirmed
```
src/components/hq/SmartInventory.js     v1.5  ✅ LIVE — drag fix
src/components/hq/HQTradingDashboard.js v3.0  ✅ LIVE
src/components/hq/EODCashUp.js          v1.0  ✅ LIVE
src/components/hq/POSScreen.js          v1.0  ✅ LIVE
src/components/hq/HQStock.js            v3.1  ✅ LIVE
src/components/hq/HQTenants.js          v1.1  ✅ LIVE (BUG-046 fixed)
src/hooks/usePageContext.js             v1.7  ✅ LIVE (BUG-047 fixed)
src/pages/HQDashboard.js               v4.3  ✅ LIVE
src/pages/TenantPortal.js              v2.4  ✅ LIVE
src/components/hq/LiveFXBar.js               LOCKED — never modify
src/components/StockItemModal.js             LOCKED — never modify
src/components/PlatformBar.js                LOCKED — never modify
```

## DB — Live Tables (Confirmed)
```
pos_sessions:     ✅ LIVE (id, tenant_id, session_date, opening_float, status)
eod_cash_ups:     ✅ LIVE (variance GENERATED, UNIQUE tenant+date, RLS enabled)
daily_summaries:  ✅ LIVE (HQTradingDashboard queries)
```

## Bugs
```
BUG-045: CLOSED (self-healed, session v176)
BUG-046: CLOSED (7cd80ef, session v176)
BUG-047: CLOSED (8c19990, session v176)
BUG-043: OPEN — terpene qty inflation (physical count required)
BUG-044: OPEN — HQCogs shipping_alloc_usd (verify column exists)
SmartInventory drag-drop: CLOSED (f6b065f, this session)
```

## Tenant State
```
Medi Recreational  b1bad266-ceb4-4558-bbc3-22cfeeeafe74
  tier: pro (in tenant_config — tenants.tier = 'starter' always)
  Sandbox orders: DELETED (clean baseline)
  Orders: 0
  Inventory: 184 SKUs
  sell_price: R0 on most (owner must set prices)

Protea Botanicals  43b34c33...  (HQ operator)
Pure PTV           f8ff8d07...  (Client 1)
TEST SHOP          4a6c7d5c...  (dev only)
```

---

# PART 5 — MASTER SET V1 — DOCUMENT MANIFEST

## KEEP (current, gold, active)
```
NORTH-STAR_v1_0.md          — WHY document — timeless strategic vision
STRATEGY_v2_0.md            — business strategy + 3 questions + competitive pitch
NUAI_STRATEGIC_RESET_v1_0.md — architectural reset decisions (historical gold)
SESSION_AUDIT_COMPLETE.md   — v139-v153 gold extraction (still relevant)
ONBOARDING_v2_0.md          — architecture bible (needs minor update)
SOP_v1_1.md                 — session procedure rules
VIOLATION_LOG_v1_0.md       — VL-001, VL-002 (never prune)
SESSION-LOG_DEFINITIVE.md   — build history to March 30
WP-VISUAL-SYSTEM_v1.docx    — charts spec — 20+ charts not yet built
WP-O_v2_0_Loyalty_Engine_Spec.md — loyalty-ai EF spec — not yet deployed
WP-FIN_v1_0.md              — S5 VAT module still pending
WP-FNB_SOP_v1.md            — F&B reference
WP-SMART-CATALOG_v1_1.md    — SmartInventory spec
WP-STOCK-RECEIVE-S3_v1_0.md — next build priority
WP-STOCK-MERGE_v1_0.md      — planned
WP-REORDER_v1_0.md          — blocked (needs sales velocity)
WP-DAILY-OPS_v1_0.md        — complete (archive)
WP-STOCK-OVERVIEW_v1_0.docx — reference
```

## REPLACE WITH UPDATED VERSION
```
SESSION-STATE_v176.md       → SESSION-STATE_v177.md (built in this session)
SESSION-BUGS_updated.md     → Updated: close 045/046/047, add check_reorder
SESSION-CORE_v2_8.md        → SESSION-CORE_v2_9.md (add LLs 189-191, fix schema)
REGISTRY_v3_0.md            → Add SmartInventory, update HQTradingDashboard v3.0
MANIFEST_v3_0.md            → Add SmartInventory.js entry
```

## DELETE (superseded)
```
SESSION-CORE_v2_2.md        → superseded by v2_8
SESSION-CORE_v2_3.md        → superseded by v2_8 (but preserve LL archive — see below)
SESSION-STATE_v173.md       → superseded by v176
SESSION-STATE_v174.md       → superseded by v176
SESSION-STATE_v175.md       → superseded by v176
SESSION-BUGS_v166.md        → superseded by SESSION-BUGS_updated
SOP.md (old version)        → superseded by SOP_v1_1.md
```

## ADD NEW (built in this session)
```
MASTER-AUDIT_v1_0.md        → THIS DOCUMENT — complete system audit
SESSION-STATE_v177.md       → Current state including this session
LL-ARCHIVE_v1_0.md          → LL-001 through LL-173 preservation
```

---

# PART 6 — THREE-CLAUDE ECOSYSTEM (CURRENT STATE)

```
Claude.ai (this session):
  Role: Strategy, architecture, WP spec authoring, Supabase MCP, Vercel MCP
  Tools: Supabase MCP, Vercel MCP, GitHub MCP (READ ONLY — 403 on all writes)
  Produces: WP specs, DB migrations, deployment monitoring, audit docs

Claude Code (VS Code extension):
  Role: File edits, verification, git commits, git push
  Method: Reads WP spec from project or user message
        → reads files from disk (must use disk, not session memory)
        → implements changes
        → npm start verification
        → git add / git commit / git push branch
  IMPORTANT: Claude Code in VS Code is now UNLOCKED and proven (commit f6b065f)

GitHub MCP:
  Role: READ ONLY — get_file_contents works, all write ops = 403
  Why: Copilot token architecture — cannot write to repo
  Workaround: Claude Code handles all writes

WORKFLOW PATTERN (proven):
  1. Claude.ai reads current files via GitHub:get_file_contents
  2. Claude.ai authors executable WP spec
  3. Claude.ai runs DB migrations via Supabase MCP if needed
  4. User gives spec to Claude Code in VS Code
  5. Claude Code reads files from disk, implements, npm start verify, commits, pushes
  6. Claude.ai monitors Vercel deployment via Vercel MCP
  7. Claude.ai confirms production is live
```

---

# PART 7 — NEXT SESSION BOOTSTRAP SEQUENCE

When a new session starts, read these documents in order:

```
1. NORTH-STAR_v1_0.md          — WHY (5 min, do not skip)
2. SESSION-STATE_v177.md       — WHERE WE ARE (current state, bugs, priorities)
3. SESSION-CORE_v2_9.md        — HOW (rules, LLs, schema)
4. VIOLATION_LOG_v1_0.md       — WHAT WENT WRONG (VL-001, VL-002)
5. REGISTRY_v3_0.md            — WHAT EXISTS (by capability)
6. MANIFEST_v3_0.md            — WHAT EXISTS (by filename)
7. [Current WP spec]           — WHAT THIS SESSION BUILDS
```

Then ask the 3 questions:
```
1. WHO IS THIS FOR?       Operator / Shop Manager / Clerk / Customer
2. WHAT IS THE ONE THING? Not "manage stock" — "receive a delivery without opening Supabase"
3. DOES THIS EXIST?       Check REGISTRY Section 1 + disk before building
```

---

*MASTER-AUDIT v1.0 · NuAi Platform · April 4, 2026*
*Full read of 30 project knowledge documents in single session*
*Produced by Claude.ai session v177*
*Use this to build the Master Set V1 for all future sessions*
