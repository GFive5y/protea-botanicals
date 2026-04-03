# SESSION-CORE.md — NuAi Platform Bible
## Version: v2.10 · Updated: April 4, 2026
## v2.10: LL-192 through LL-195 added after VL-003 through VL-006
##         Root cause: suggest before verify — four violations, same session
## Update: Only when new LLs added or schema changes confirmed.

> READ THIS FILE ONCE PER SESSION. Invariant truth about this system.
> Read order: SESSION-STATE → SESSION-CORE → VIOLATION_LOG → SESSION-BUGS → REGISTRY → MANIFEST

---

# RULE 0 — MANDATORY. EVERY SESSION. EVERY TASK.

## BEFORE ANY BUILD SUGGESTION — MANDATORY PRE-FLIGHT (NEW v2.10)
```
When GitHub MCP is connected, this is the FIRST action of every session:

STEP 0A — Read SESSION-STATE from GitHub:
  GitHub:get_file_contents path=docs/[latest SESSION-STATE filename]
  If unsure which is latest: list docs/ directory, pick highest version number.

STEP 0B — For each potential build suggestion, read the source file:
  GitHub:get_file_contents path=src/components/hq/[TargetComponent].js
  Search for feature indicators BEFORE including in any suggestion.
  If found → it is BUILT. Do not suggest.
  If absent → may suggest, with caveat "verify on disk first".

STEP 0C — Never ask the owner to run any file inspection command.
  Select-String, Get-Content, Select-Object — these are Claude's job via GitHub MCP.
  Owner's time is for decisions, not file lookups.

VIOLATION PATTERN TO PREVENT:
  ❌ Present build options → verify only when challenged by owner
  ✅ Verify from GitHub → then present options already confirmed absent
```

## BEFORE WRITING ANY CODE:
```
STEP 1 — Read REGISTRY.md Section 1 (Feature Index) FIRST.
STEP 2 — Read MANIFEST.md in full.
STEP 3 — powershell: Get-ChildItem -Path src -Recurse -Filter "*.js"
STEP 4 — git show HEAD:src/PATH/TO/FILE.js | Out-File -FilePath temp.txt -Encoding utf8
STEP 5 — Find/replace blocks only. Never full rewrites unless file produced externally.
STEP 6 — After building: add to REGISTRY.md Section 1 + Section 2.
```

## BEFORE WRITING ANY DOCUMENT:
```
STEP A — Read SESSION-STATE from GitHub first (STEP 0A above).
STEP B — Version must be higher. Merge, never replace.
STEP C — Write to outputs/, present_files to user.
STEP D — REGISTRY Section 3 entries: verify absent from disk BEFORE listing.
```

## RULE 0B — FILE INTEGRITY CHECK
FI-1 git status · FI-2 First 5 lines · FI-3 Export matches filename · FI-4 COMMIT IMMEDIATELY

## RULE 0C — PRE-BUILD OWNER CONFIRMATION — always, no exceptions.

## RULE 0D — DISK IS TRUTH
```
GitHub:get_file_contents is the primary tool. PowerShell is the owner's tool.
Never ask the owner to run file inspection commands Claude can run itself.
```

## RULE 0E — LOYALTY DATA MODEL
Three stores. NEVER reconcile. user_profiles = operational truth.

## RULE 0F — TENANT_ID ON EVERY INSERT
Every INSERT to any tenant-scoped table MUST include tenant_id. RLS silently hides rows.

## RULE 0G — COMPONENT SCOPE FOR useTenant()
useTenant() must be called INSIDE the component that uses it. Never assume parent scope.

## RULE 0H — NO MANUAL DB PATCHES FOR DISPLAY BUGS
Fix the CODE, not the data. Only exception: corrupt legacy data where root bug also fixed.

## RULE 0I — DOCUMENT INGESTION DEDUP (LL-084)
Never confirm stock movement on a document whose reference already appears in document_log.

## RULE 0J — PRODUCTION_RUNS SCHEMA
```
production_runs ACTUAL columns (confirmed March 24, 2026):
  id, tenant_id, batch_id, production_date, operator_id, batch_size_g, yield_g,
  yield_pct, status, qc_pass, notes, created_at
```

## ⚠️ RULE 0K — COMPONENT REPLACEMENT PROHIBITION
```
BEFORE touching any case in renderTab() or any routing switch:
  1. Read the CURRENT component being served by that case — ALL of it.
  2. List every tab, feature, and sub-component it contains.
  3. State explicitly: "This change will REMOVE access to: [list]"
  4. Get explicit owner confirmation before proceeding.
  5. NEW features are ADDITIVE. They NEVER replace existing cases.
Origin: F33 — SmartInventory replaced HQStock in one case swap.
```

## RULE 0L — READ BEFORE BUILD
```
Before building ANY component that touches inventory, stock, or items:
  1. Read HQStock.js first 50 lines + grep for all tab IDs.
  2. Read StockItemModal.js first 30 lines (LOCKED — 14 product worlds).
  3. Ask: "Does a component already exist that does part of this?"
  4. If yes: ENHANCE, do not build parallel.
Origin: F34 — SmartInventory built without reading HQStock.
```

## ⚠️ RULE 0M — CODE BOX DISCIPLINE (LL-184)
```
TWO BOX TYPES. NEVER MIXED.
TYPE 1 — DEPLOY BOX: executable content ONLY.
TYPE 2 — CONTEXT: prose sentences in the response.
No label text on the line immediately above ```. No >> characters.
Violation log: VL-001, VL-002
```

## ⚠️ RULE 0N — FILE KNOWLEDGE BEFORE EDIT (LL-185)
```
Before suggesting ANY change to a file, Claude must have read the CURRENT
version of that file in this session via GitHub MCP. Never ask owner to paste.
```

## ⚠️ RULE 0O — VIOLATION LOG REQUIREMENT
```
Every time Claude violates any rule:
  STEP 1 — STOP. State: "I violated [RULE/LL]. Logging now."
  STEP 2 — Add entry to VIOLATION_LOG with all fields.
  STEP 3 — Update SESSION-CORE if rule needs strengthening.
  STEP 4 — Only THEN continue.
  If violated twice → rule is INCOMPLETE → rewrite it.
```

## ⚠️ RULE 0P — THE THREE QUESTIONS
```
Ask before EVERY build session:
  Q1: WHO IS THIS FOR? (Operator / Shop Manager / Clerk / Customer)
  Q2: WHAT IS THE ONE THING THEY NEED TO DO? (specific, not a category)
  Q3: DOES THIS ALREADY EXIST? (verify from GitHub before answering)
```

---

# LL ENTRIES — v2.5 through v2.10

## LL-174 — CATEGORY LABELS SINGLE SOURCE OF TRUTH
```
ALWAYS import CATEGORY_LABELS, CATEGORY_ICONS from ProductWorlds.js.
NEVER define category label maps locally. Exception: StockItemModal.js (LOCKED).
```

## LL-175 — SHOP ARCHITECTURE
```
The inventory IS the website. No separate shop products table.
Control via is_active + sell_price.
```

## LL-176 — LOYALTY CATEGORY
```
inventory_items.loyalty_category is SEPARATE from .category.
Use CATEGORY_TO_LOYALTY from ProductWorlds.js to auto-derive.
```

## LL-177 — storefrontDb
```
Shop uses separate Supabase client (storefrontDb) with no-op storage adapter.
Never replace with main supabase client.
```

## LL-178 — NEVER REPLACE A RENDERTAB CASE WITHOUT EXPLICIT WARNING
```
STEP 1 — Read component currently rendered.
STEP 2 — List everything that becomes unreachable.
STEP 3 — Show owner the full loss list.
STEP 4 — Owner must explicitly confirm.
STEP 5 — If not confirmed → DO NOT proceed.
New features → new case entries only. Never hijack existing cases.
Origin: F33 (April 1 2026)
```

## LL-179 — ADDITIVE ONLY POLICY FOR NEW SCREENS
```
New screen → new nav entry → new case in renderTab.
NEVER route to new screen from an existing case.
```

## LL-180 — READ EXISTING COMPONENT BEFORE BUILDING PARALLEL
```
Before building anything inventory-related: read HQStock.js in full.
HQStock has 7 tabs, 14 product worlds, StockItemModal (LOCKED).
Origin: F34 (April 1 2026)
```

## LL-181 — COLUMN INVENTORY_ITEMS.NOTES DOES NOT EXIST
```
No 'notes' column on inventory_items. Never include in INSERT/UPDATE.
```

## LL-182 — INVENTORY_ITEMS.CATEGORY IS AN ENUM
```
SQL needs ::inventory_category cast. JS/Supabase handles automatically.
Confirmed values: flower, concentrate, edible, accessory,
                  finished_product, hardware, raw_material
```

## LL-183 — GIT IN POWERSHELL: NO && OPERATOR
```
Separate lines only. Never: git add . && git commit -m "..." && git push
```

## LL-184 — CODE BOX CARBON COPY RULE
```
DEPLOY BOX = executable content ONLY.
CONTEXT = prose sentences, separated from fence by prose.
No label text immediately above ```. No >> characters. Violation log: VL-001, VL-002.
```

## LL-185 — FILE KNOWLEDGE BEFORE SUGGESTING EDITS
```
Must have read current file THIS session via GitHub MCP before suggesting any edit.
Never ask owner to paste — it is Claude's job to read via GitHub MCP.
```

## LL-186 — TENANTPORTAL LAYOUT — INNER CONSTANT PATTERN
```
const INNER = { maxWidth: 1400, width: "100%", margin: "0 auto" };
TenantPortal.js v2.4 (commit e7eca29 · April 3 2026)
```

## LL-187 — UNICODE BOM IN JS FILES
```
BOM causes silent Python str.replace() failures.
Fix: strip via VS Code status bar → Save with UTF-8.
```

## LL-188 — REORDERPANEL PO STATUS
```
ReorderPanel creates purchase_orders status='draft' ONLY. Never auto-submit.
```

## LL-189 — POSSCREEN MOVEMENT TYPE
```
movement_type = 'sale_pos' for in-store POS sales (NOT 'sale_out').
'sale_out' = B2B wholesale only (HQWholesaleOrders.js).
```

## LL-190 — EOD THRESHOLDS FROM DB ONLY
```
All EODCashUp thresholds from tenant_config.settings JSONB. Never hardcode.
  eod_cash_variance_tolerance · eod_escalation_threshold
  eod_default_float · eod_approver_role
UPDATE tenant_config SET settings = settings || '{"key": value}' WHERE tenant_id = '...';
```

## LL-191 — LOYALTY_TRANSACTIONS COLUMN NAME
```
Column is transaction_type (NOT 'type'). Use .ilike() not .eq().
.ilike("transaction_type", "earned") — never .eq("type", "earned").
```

## LL-192 — GITHUB MCP READ IS CLAUDE'S JOB, NOT THE OWNER'S (NEW v2.10)
```
When GitHub MCP get_file_contents is available:
  NEVER ask the owner to run: Select-String, Get-Content, Select-Object,
  grep, cat, head, or any file inspection command.
  Claude reads from GitHub. Owner provides decisions.
  File inspection is zero-cost for Claude and non-zero-cost for owner.
  Asking the owner to do Claude's job is a Rule 0O violation.

Origin: VL-005 — April 4, 2026. Owner had to correct Claude twice in the
        same session: once for wrong suggestion, once for redundant request.
```

## LL-193 — SESSION-STATE DOCS LAG BEHIND CODE STATE (NEW v2.10)
```
SESSION-STATE is a human-maintained document. It can be sessions behind code.
Two failure modes:
  (1) Code is ahead of SESSION-STATE (work done, doc not updated)
  (2) SESSION-STATE shows planned work never executed

Before suggesting ANY build:
  Read SESSION-STATE for orientation (what was planned).
  Read the actual source file from GitHub to verify current state.
  Do not trust any document — including SESSION-STATE — without disk verification.

The gap between GitHub docs/ and GitHub src/ can span multiple sessions.
GitHub source files are always authoritative. SESSION-STATE docs are hints.

Origin: VL-004 — April 4, 2026. SESSION-STATE_v175 showed WP-DAILY-OPS Tier 2
        as P1 pending. HQTradingDashboard.js was already at v3.0 (built 2 sessions
        after v175 was written). Claude suggested the build without reading the file.
```

## LL-194 — REGISTRY SECTION 3 ENTRIES MUST BE DISK-VERIFIED ABSENT (NEW v2.10)
```
Before adding ANY feature to REGISTRY Section 3 ("Safe to Build"):
  1. Identify the relevant source file(s) for that feature
  2. Read from GitHub via get_file_contents
  3. Search for feature indicators (component names, state variables, function names)
  4. If found → the feature is BUILT. List in Section 1 and Section 2.
  5. If absent → may list in Section 3.
  6. If cannot verify → write "STATUS UNVERIFIED — check disk first" not "Safe to Build"

NEVER write "Safe to Build" based on document research alone.
A corrupt Section 3 entry creates a false canonical record that cascades into
wasted build sessions and broken owner trust. It is the most damaging document
error this system can produce.

Origin: VL-006 — April 4, 2026. REGISTRY_v3_2 listed SC-01 as "Safe to Build"
        without reading SmartInventory.js. SC-01 was already built with 16 SoldOut
        hits, 12 BelowReorder hits, 19 NoPrice hits. VL-006 directly caused VL-003.
```

## LL-195 — BUILD SUGGESTIONS REQUIRE PRIOR DISK VERIFICATION (NEW v2.10)
```
The sequence is always:
  (1) Read source file from GitHub
  (2) Determine feature state (built / absent / unknown)
  (3) Then suggest, dismiss, or flag as unverified

NEVER reverse this sequence:
  ❌ Suggest → verify only when challenged
  ✅ Verify → then suggest or dismiss

This applies to every item in every priority list, every WP suggestion,
every "next steps" list. If a source file has not been read in this session,
the feature state is UNKNOWN — not pending, not buildable, not confirmable.

Owner cost of wrong suggestion:
  - Trust damage (the system was built to prevent exactly this)
  - Session time wasted on correction
  - Cascading doubt about what else is wrong

Origin: VL-003, VL-004 — April 4, 2026. Four violations in one session,
        all from the same root cause: presenting build options before disk
        verification. The owner had spent hours updating docs to prevent this.
```

---

# HQSTOCK — PROTECTED ARCHITECTURE

```
HQStock.js v3.1 — PROTECTED. Read LL-178, LL-179, LL-180 before touching.
Root div: no maxWidth (removed commit e7eca29 · April 3 2026)
TABS (7): Overview · Items · Movements · Pricing · Receipts · Purchase Orders · Shop Manager
LOCKED SUB-COMPONENTS: StockItemModal.js (14 worlds) · StockItemPanel · StockPricingPanel
```

---

# LOCKED FILES

```
StockItemModal.js   — LOCKED. 14 product worlds. Never modify.
ProteaAI.js         — LOCKED. Never modify.
PlatformBar.js      — LOCKED. Never modify.
LiveFXBar.js        — PROTECTED. Never modify.
supabaseClient.js   — PROTECTED. Never modify.
HQStock.js          — PROTECTED. Read full file before any change.
```

---

# SCHEMA — CONFIRMED (April 4, 2026)

```
inventory_items:   no 'notes' column · category is enum (::inventory_category in SQL)
                   loyalty_category is SEPARATE from category (LL-176)
orders:            status = pending/paid/failed/cancelled/refunded (NOT 'completed')
order_items:       NO inventory_item_id FK — linked via product_metadata jsonb
                   line_total is GENERATED — NEVER INSERT
loyalty_transactions: column = transaction_type (NOT type) — use .ilike() (LL-191)
movement_type:     'sale_pos' for POS · 'sale_out' for wholesale (LL-189)
eod_cash_ups:      ✅ LIVE — UNIQUE(tenant_id, cashup_date) · variance GENERATED
pos_sessions:      ✅ LIVE — (tenant_id, session_date, opening_float, status)
tenant_config.settings: JSONB — EOD thresholds (never hardcode) — LL-190
scan_logs:         NO tenant_id column — NEVER filter by it (LL-056)
```

---

# THREE-CLAUDE ECOSYSTEM

```
Claude.ai    — strategy, planning, GitHub MCP (READ-ONLY permanently), Supabase MCP, Vercel MCP
Claude Code  — file edits, npm start verify, git commit, git push (local credentials)
GitHub MCP   — READ-ONLY permanently. write ops return 403. Do not test again.

GITHUB MCP IS FOR:
  - Reading SESSION-STATE at session start
  - Verifying feature state before any suggestion or spec
  - Reading source files before any edit suggestion
  - Never for writing — always for reading

SESSION START SEQUENCE (mandatory when GitHub MCP connected):
  1. List docs/ directory → identify latest SESSION-STATE filename
  2. Read SESSION-STATE → understand planned priorities
  3. For each planned priority: read source file → confirm state
  4. THEN respond to owner with verified, accurate information
```

---

*SESSION-CORE v2.10 · NuAi · April 4, 2026*
*v2.10: LL-192 through LL-195 added after VL-003 through VL-006*
*Root cause of all 4 violations: suggest before verify*
*Fix: verify from GitHub first, always, before any suggestion or canonical document entry*
*LL list is SACRED — never abbreviate, never skip, always write in full.*
