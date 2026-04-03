# SESSION-STATE v177
## NuAi Platform — Protea Botanicals
## Date: April 4, 2026
## Session: v177 — SmartInventory v1.5 drag fix + full doc audit + Claude Code workflow proven

---

# LIVE HEAD

```
f6b065f  fix(catalog): harden column drag-drop with dataTransfer fallback  ← CURRENT PROD
1ef262f  fix(catalog): SmartInventory v1.4 — pill scroll + column drag-drop
7cd80ef  fix(tenants): BUG-046 — read tier from tenant_config not tenants table
8c19990  fix(loyalty): BUG-047 — scope loyalty_config query to tenant_id in usePageContext
b1bbad6  docs: REGISTRY + MANIFEST v3.2 + SESSION-CORE v2.9
5b24855  Merge PR #1 — HQTradingDashboard v3.0
```

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v177)

## SmartInventory v1.5 — Column Drag-Drop FIXED
```
Commit:  f6b065f — applied via Claude Code in VS Code
Root cause 1 (PRIMARY): setColOrder callback read dragCol.current AFTER it was
  set to null on the very next line. React batches state updates — callback runs
  during next render cycle, AFTER dragCol.current = null. fromIdx = -1 → return prev.
Root cause 2 (SECONDARY): dragend event fires before drop in Chrome when inside
  overflow:auto + position:sticky thead — dragCol.current cleared by handleDragEnd
  before handleDrop runs.

Fix 1: handleDragStart — added e.dataTransfer.setData("text/plain", key)
Fix 2: handleDragOver — removed !dragCol.current guard (fired too early on dragend race)
Fix 3: handleDrop — uses const sourceKey = e.dataTransfer.getData("text/plain") || dragCol.current
         setColOrder callback uses sourceKey (local var) NOT dragCol.current (mutable ref)
Fix 4: TABLE element — added onDragOver + onDrop fallback using dragOverKey state
Version: v1.4 → v1.5
```

## Claude Code in VS Code — WORKFLOW PROVEN
```
SmartInventory v1.5 was the first fix committed via Claude Code in VS Code.
The user used the VS Code extension panel, described the 4 changes needed,
and Claude Code applied them, committed, and pushed without terminal intervention.
This is now the standard workflow for all code changes.

Pattern locked:
  Claude.ai → reads files, diagnoses, writes spec/instructions
  Claude Code (VS Code) → reads files from disk, implements, verifies, pushes
  GitHub MCP → READ ONLY permanently (403 on all writes)
```

## Full Documentation Audit Completed
```
All 30 project knowledge documents read in single session.
Audit: MASTER-AUDIT_v1_0.md produced.
Key findings:
  - SmartInventory missing from REGISTRY and MANIFEST (urgent)
  - SESSION-CORE v2.8 missing LL-189/190/191 in body
  - SESSION-BUGS still shows 045/046/047 as OPEN (should be CLOSED)
  - REGISTRY shows WP-DAILY-OPS Session C as pending (DONE)
  - LL-001 through LL-173 exist in v2.3 but not in v2.8 (at risk)
  - 2 unresolved architectural decisions (Yoco architecture, Client 2 storefront)
```

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
```
src/components/hq/SmartInventory.js     v1.5  ✅ LIVE (f6b065f) — drag FIXED
src/components/hq/HQTradingDashboard.js v3.0  ✅ LIVE (a5340f8)
src/components/hq/EODCashUp.js          v1.0  ✅ LIVE
src/components/hq/POSScreen.js          v1.0  ✅ LIVE
src/components/hq/HQStock.js            v3.1  ✅ LIVE
src/components/hq/HQTenants.js          v1.1  ✅ LIVE (BUG-046 fixed)
src/hooks/usePageContext.js             v1.7  ✅ LIVE (BUG-047 fixed)
src/pages/HQDashboard.js               v4.3  ✅ LIVE
src/pages/TenantPortal.js              v2.4  ✅ LIVE
src/components/hq/LiveFXBar.js               PROTECTED — never modify
src/components/StockItemModal.js             LOCKED — never modify
src/components/PlatformBar.js                LOCKED — never modify
```

## DB SCHEMA — CONFIRMED
```
orders:                  status = pending/paid/failed/cancelled/refunded (NOT 'completed')
orders:                  SANDBOX DELETED — 0 orders for Medi Rec
order_items:             no inventory_item_id FK — via product_metadata jsonb
inventory_items:         no 'notes' column · category is enum
movement_type:           'sale_pos' for POSScreen (NOT 'sale_out') — LL-189
pos_sessions:            ✅ LIVE — (tenant_id, session_date, opening_float, status)
eod_cash_ups:            ✅ LIVE — (variance GENERATED, UNIQUE tenant+date, RLS)
daily_summaries:         ✅ LIVE — (used by HQTradingDashboard)
tenant_config.settings:  ✅ JSONB — eod thresholds + float + approver_role
loyalty_transactions:    column = transaction_type (NOT 'type') — LL-191
loyalty_config:          4 tenant rows — always .eq('tenant_id', tenantId)
tenants.tier:            ALL rows = 'starter' (never updated) — use tenant_config.tier
scan_logs:               NO tenant_id column (LL-056) — never filter by tenant_id
```

## TENANT STATE
```
Medi Recreational  b1bad266-ceb4-4558-bbc3-22cfeeeafe74
  tier:      pro (in tenant_config — tenants.tier = 'starter' always, ignore it)
  Sandbox:   DELETED (clean baseline, 0 orders)
  Inventory: 184 SKUs
  sell_price: R0 on most — owner action required
  EOD config: variance_tolerance=50, escalation_threshold=200,
              default_float=500, approver_role='owner'

Protea Botanicals  43b34c33...  (HQ operator — internal)
Pure PTV           f8ff8d07...  (Client 1)
TEST SHOP          4a6c7d5c...  (dev only — has no tenant_config row)
```

## OPEN BUGS
```
BUG-043  Terpene qty inflation (23 items 2-3x) — physical count required before SQL fix
BUG-044  HQCogs shipping_alloc_usd column — verify exists, re-save recipes if needed
         SQL: SELECT column_name FROM information_schema.columns
              WHERE table_name='product_cogs' AND column_name='shipping_alloc_usd'

check_reorder() trigger — UNKNOWN status (raised v139, never closed, never in SESSION-BUGS)
  SQL: SELECT routine_name FROM information_schema.routines
       WHERE routine_schema = 'public' AND routine_name LIKE '%reorder%';
```

## CLOSED BUGS THIS SESSION
```
BUG-047: CLOSED (8c19990) — loyalty_config tenant scope
BUG-046: CLOSED (7cd80ef) — HQTenants tier from tenant_config
BUG-045: CLOSED (self-healed) — HQTenants false positive
SmartInventory drag-drop: CLOSED (f6b065f) — setColOrder closure + dataTransfer fix
```

---

# NEXT PRIORITIES

## [URGENT] Doc Updates Before Next Session
```
1. SESSION-BUGS.md — close BUG-045/046/047, add check_reorder(), resolve drag-drop
2. SESSION-CORE → v2.9 — add LL-189/190/191 in body, fix schema section
3. REGISTRY → v3.2 — add SmartInventory, update HQTradingDashboard to v3.0
4. MANIFEST → v3.2 — add SmartInventory.js entry
```

## [P1] Owner Actions Required
```
- Supabase backups: ENABLE NOW (Settings → Add-ons) — URGENT
- Load 20-40 real Medi SKUs via HQ Stock
- Set sell_price on each SKU (gates shop visibility)
- Set loyalty_category on each SKU (drives earn rates)
- Set reorder_level on each SKU
- Register nuai.co.za (R99 at domains.co.za)
- Yoco merchant signup (sole trader — no CIPRO needed)
- Update ProteaAI.js CODEBASE_FACTS string (very stale — says "Vercel deploy pending")
```

## [P2] WP-VISUAL Phase 1 — Page-level Charts
```
Status:  NOT STARTED
Spec:    WP-VISUAL-SYSTEM_v1.docx
Scope:   20+ page-level charts across HQ tabs
Library: viz/ components ready (ChartCard, SparkLine, DeltaBadge, etc.)
No real sales data needed — pure UI work
Ideal: Claude Code WP during 1-2 week pre-go-live window
```

## [P3] POSScreen v2
```
Status:  v1.0 live. v2 NOT STARTED.
Features: Customer lookup, loyalty display at checkout, receipt print/email
Gates:   Makes staff training real — customers see points earned
```

## [P4] First Real POS Sale + Full Loop Verification
```
- Dashboard zero-baseline ready (sandbox deleted)
- Run real POS sale → verify dashboard shows it
- Close day via EODCashUp → verify eod_cash_ups row created
- Verify loop: POS → stock deduction → trading dashboard → cash-up
Gate: sell_price must be set on SKUs first (P1 owner action)
```

## [P5] WP-REORDER Phase 2
```
Status:  BLOCKED — needs 2-3 weeks of real sales velocity data
Unblock: After first real sales week
```

## [FUTURE] Unresolved Architectural Decisions
```
Decision C: Client 2 storefront — Option A/B/C (UNRESOLVED since v149)
  A: Rebuild on NuAi, point domain at Vercel
  B: Keep existing site, webhook sync
  C: NuAi embed JS snippet
  Must decide before any WP-MULTISITE S2 work.

Decision D: Yoco per-tenant vs platform account (UNRESOLVED since v149)
  Must decide before WP-PAY S1 build.
```

---

# CRITICAL RULES (always re-read)

## Code Rules
```
status = 'paid' always (NOT 'completed')
movement_type = 'sale_pos' for POSScreen (NOT 'sale_out') — LL-189
EOD thresholds always from tenant_config.settings (never hardcoded) — LL-190
tenant_id on every INSERT (Rule 0F)
loyalty_transactions: use transaction_type column (NOT type) — LL-191
loyalty_config: always .eq('tenant_id', tenantId) — 4 rows exist
tenants.tier = 'starter' always — use tenant_config.tier for real tier
scan_logs: NO tenant_id column (LL-056) — never filter by it
ALL Anthropic API calls via ai-copilot Edge Function — NEVER from React (LL-120)
ZERO cannabis refs on public/Yoco pages — Visa/Mastercard prohibited (LL-124)
Yoco in-person SDK = Android/iOS only — cannot run in React web (LL-125)
```

## File Safety Rules
```
Read file via GitHub:get_file_contents before any edit (LL-185)
PlatformBar.js LOCKED — never modify
LiveFXBar.js PROTECTED — never modify
StockItemModal.js LOCKED — never modify
HQStock.js PROTECTED — read full file before any change (LL-180)
Never change renderTab case without loss list + owner confirm (LL-178)
PowerShell: no && operator, separate lines (LL-183)
```

## Document Rules
```
Read REGISTRY Section 1 FIRST — it may already exist
Disk is truth — MANIFEST can lie about pending vs built (LL-075)
Truncated reads drop data silently — confirm line count (LL-083)
setColOrder + useRef: always capture local variable BEFORE setting ref to null
HTML5 DnD: use dataTransfer.setData/getData for data that must survive dragend
```

---

# THREE-CLAUDE ECOSYSTEM

```
Claude.ai   — strategy, architecture, Supabase MCP, Vercel MCP, audit docs, WP specs
Claude Code — VS Code extension: file edits, npm start verify, git commit, git push
GitHub MCP  — READ ONLY permanently (403 on all writes — Copilot token architecture)

EXECUTION PATTERN (proven via f6b065f):
  1. Claude.ai reads files via GitHub MCP, diagnoses/architects, writes spec
  2. Claude.ai runs DB migrations via Supabase MCP if needed
  3. User gives spec to Claude Code in VS Code
  4. Claude Code reads files from disk, implements, verifies, commits, pushes
  5. Claude.ai monitors via Vercel MCP
  6. Claude.ai confirms production deployment

CLAUDE CODE BEST PRACTICE:
  - Create CLAUDE.md in repo root with critical rules
  - Claude Code reads CLAUDE.md before every task
  - Reference WP spec files from project knowledge or paste as message
```

---

# DOCUMENT READ ORDER FOR NEXT SESSION

```
1. NORTH-STAR_v1_0.md          — WHY (vision, SA market, modules)
2. SESSION-STATE_v177.md       — WHERE WE ARE (this file)
3. SESSION-CORE_v2_9.md        — HOW (rules, LLs LL-174 to LL-191, schema)
4. VIOLATION_LOG_v1_0.md       — WHAT WENT WRONG (VL-001, VL-002)
5. REGISTRY_v3_0.md            — WHAT EXISTS by capability
6. MANIFEST_v3_0.md            — WHAT EXISTS by filename
7. MASTER-AUDIT_v1_0.md        — FULL SYSTEM PICTURE (this audit)
8. [Current WP spec if applicable]
```

---

*SESSION-STATE v177 · NuAi · April 4, 2026*
*SmartInventory v1.5 live · BUG-045/046/047 closed · Full doc audit complete*
*HEAD: f6b065f · Branch: main · Claude Code workflow in VS Code proven*
*Next: owner actions (prices, backups) then WP-VISUAL Phase 1*
