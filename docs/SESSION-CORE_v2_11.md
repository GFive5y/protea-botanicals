# SESSION-CORE.md — NuAi Platform Bible
## Version: v2.11 · Updated: April 4, 2026
## v2.10: LL-192 through LL-195 — verify before suggest
## v2.11: LL-196 through LL-199 — WP-VISUAL complete, viz/ rules, seed schema, TenantPortal
## Update: Only when new LLs added or schema changes confirmed.

> READ THIS FILE ONCE PER SESSION. Invariant truth about this system.
> Read order: SESSION-STATE → SESSION-CORE → VIOLATION_LOG → SESSION-BUGS → REGISTRY → MANIFEST

---

# RULE 0 — MANDATORY. EVERY SESSION. EVERY TASK.

## BEFORE ANY BUILD SUGGESTION — MANDATORY PRE-FLIGHT
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

## BEFORE WRITING ANY CODE:
STEP 1 — Read REGISTRY.md Section 1 (Feature Index) FIRST.
STEP 2 — Read MANIFEST.md in full.
STEP 3 — powershell: Get-ChildItem -Path src -Recurse -Filter "*.js"
STEP 4 — git show HEAD:src/PATH/TO/FILE.js | Out-File -FilePath temp.txt -Encoding utf8
STEP 5 — Find/replace blocks only. Never full rewrites unless file produced externally.
STEP 6 — After building: add to REGISTRY.md Section 1 + Section 2.

## BEFORE WRITING ANY DOCUMENT:
STEP A — Read SESSION-STATE from GitHub first (STEP 0A above).
STEP B — Version must be higher. Merge, never replace.
STEP C — Write to outputs/, present_files to user.
STEP D — REGISTRY Section 3 entries: verify absent from disk BEFORE listing.

## RULE 0B — FILE INTEGRITY CHECK
FI-1 git status · FI-2 First 5 lines · FI-3 Export matches filename · FI-4 COMMIT IMMEDIATELY

## RULE 0C — PRE-BUILD OWNER CONFIRMATION — always, no exceptions.

## RULE 0D — DISK IS TRUTH
GitHub:get_file_contents is the primary tool. PowerShell is the owner's tool.
Never ask the owner to run file inspection commands Claude can run itself.

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
production_runs ACTUAL columns (confirmed March 24, 2026):
id, tenant_id, batch_id, production_date, operator_id, batch_size_g, yield_g,
yield_pct, status, qc_pass, notes, created_at

## RULE 0K — COMPONENT REPLACEMENT PROHIBITION
BEFORE touching any case in renderTab() or any routing switch:

Read the CURRENT component being served by that case — ALL of it.
List every tab, feature, and sub-component it contains.
State explicitly: "This change will REMOVE access to: [list]"
Get explicit owner confirmation before proceeding.
NEW features are ADDITIVE. They NEVER replace existing cases.
Origin: F33 — SmartInventory replaced HQStock in one case swap.


## RULE 0L — READ BEFORE BUILD
Before building ANY component that touches inventory, stock, or items:

Read HQStock.js first 50 lines + grep for all tab IDs.
Read StockItemModal.js first 30 lines (LOCKED — 14 product worlds).
Ask: "Does a component already exist that does part of this?"
If yes: ENHANCE, do not build parallel.
Origin: F34 — SmartInventory built without reading HQStock.


## RULE 0M — CODE BOX DISCIPLINE (LL-184)
TWO BOX TYPES. NEVER MIXED.
TYPE 1 — DEPLOY BOX: executable content ONLY.
TYPE 2 — CONTEXT: prose sentences in the response.
No label text on the line immediately above ```. No >> characters.
Violation log: VL-001, VL-002

## RULE 0N — FILE KNOWLEDGE BEFORE EDIT (LL-185)
Before suggesting ANY change to a file, Claude must have read the CURRENT
version of that file in this session via GitHub MCP. Never ask owner to paste.

## RULE 0O — VIOLATION LOG REQUIREMENT
Every time Claude violates any rule:
STEP 1 — STOP. State: "I violated [RULE/LL]. Logging now."
STEP 2 — Add entry to VIOLATION_LOG with all fields.
STEP 3 — Update SESSION-CORE if rule needs strengthening.
STEP 4 — Only THEN continue.
If violated twice → rule is INCOMPLETE → rewrite it.

## RULE 0P — THE THREE QUESTIONS
Ask before EVERY build session:
Q1: WHO IS THIS FOR? (Operator / Shop Manager / Clerk / Customer)
Q2: WHAT IS THE ONE THING THEY NEED TO DO? (specific, not a category)
Q3: DOES THIS ALREADY EXIST? (verify from GitHub before answering)

---

# LL ENTRIES — v2.5 through v2.11

## LL-174 — CATEGORY LABELS SINGLE SOURCE OF TRUTH
ALWAYS import CATEGORY_LABELS, CATEGORY_ICONS from ProductWorlds.js.
NEVER define category label maps locally. Exception: StockItemModal.js (LOCKED).

## LL-175 — SHOP ARCHITECTURE
The inventory IS the website. No separate shop products table.
Control via is_active + sell_price.

## LL-176 — LOYALTY CATEGORY
inventory_items.loyalty_category is SEPARATE from .category.
Use CATEGORY_TO_LOYALTY from ProductWorlds.js to auto-derive.

## LL-177 — storefrontDb
Shop uses separate Supabase client (storefrontDb) with no-op storage adapter.
Never replace with main supabase client.

## LL-178 — NEVER REPLACE A RENDERTAB CASE WITHOUT EXPLICIT WARNING
STEP 1 — Read component currently rendered.
STEP 2 — List everything that becomes unreachable.
STEP 3 — Show owner the full loss list.
STEP 4 — Owner must explicitly confirm.
STEP 5 — If not confirmed → DO NOT proceed.
New features → new case entries only. Never hijack existing cases.
Origin: F33 (April 1 2026)

## LL-179 — ADDITIVE ONLY POLICY FOR NEW SCREENS
New screen → new nav entry → new case in renderTab.
NEVER route to new screen from an existing case.

## LL-180 — READ EXISTING COMPONENT BEFORE BUILDING PARALLEL
Before building anything inventory-related: read HQStock.js in full.
HQStock has 7 tabs, 14 product worlds, StockItemModal (LOCKED).
Origin: F34 (April 1 2026)

## LL-181 — COLUMN INVENTORY_ITEMS.NOTES DOES NOT EXIST
No 'notes' column on inventory_items. Never include in INSERT/UPDATE.

## LL-182 — INVENTORY_ITEMS.CATEGORY IS AN ENUM
SQL needs ::inventory_category cast. JS/Supabase handles automatically.
Confirmed values: flower, concentrate, edible, accessory,
finished_product, hardware, raw_material

## LL-183 — GIT IN POWERSHELL: NO && OPERATOR
Separate lines only. Never: git add . && git commit -m "..." && git push

## LL-184 — CODE BOX CARBON COPY RULE
DEPLOY BOX = executable content ONLY.
CONTEXT = prose sentences, separated from fence by prose.
No label text immediately above ```. No >> characters. Violation log: VL-001, VL-002.

## LL-185 — FILE KNOWLEDGE BEFORE SUGGESTING EDITS
Must have read current file THIS session via GitHub MCP before suggesting any edit.
Never ask owner to paste — it is Claude's job to read via GitHub MCP.

## LL-186 — TENANTPORTAL LAYOUT — INNER CONSTANT PATTERN
const INNER = { maxWidth: 1400, width: "100%", margin: "0 auto" };
TenantPortal.js v2.5 (commit 68cb2fa · April 4 2026)
v2.5 additions to CANNABIS_RETAIL_WATERFALL:
Daily Operations section: tabs 'trading' (HQTradingDashboard) + 'cashup' (EODCashUp)
Balance Sheet added to Intelligence section: tab 'balance-sheet' (HQBalanceSheet)
ROLE_SECTIONS: 'operations' added for owner + manager roles

## LL-187 — UNICODE BOM IN JS FILES
BOM causes silent Python str.replace() failures.
Fix: strip via VS Code status bar → Save with UTF-8.

## LL-188 — REORDERPANEL PO STATUS
ReorderPanel creates purchase_orders status='draft' ONLY. Never auto-submit.

## LL-189 — POSSCREEN MOVEMENT TYPE
movement_type = 'sale_pos' for in-store POS sales (NOT 'sale_out').
'sale_out' = B2B wholesale only (HQWholesaleOrders.js).
seed-demo-data.js uses 'sale_out' for seed rows — correct for seed only.

## LL-190 — EOD THRESHOLDS FROM DB ONLY
All EODCashUp thresholds from tenant_config.settings JSONB. Never hardcode.
eod_cash_variance_tolerance · eod_escalation_threshold
eod_default_float · eod_approver_role
UPDATE tenant_config SET settings = settings || '{"key": value}' WHERE tenant_id = '...';

## LL-191 — LOYALTY_TRANSACTIONS COLUMN NAME
Column is transaction_type (NOT 'type'). Use .ilike() not .eq().
.ilike("transaction_type", "earned") — never .eq("type", "earned").

## LL-192 — GITHUB MCP READ IS CLAUDE'S JOB, NOT THE OWNER'S
When GitHub MCP get_file_contents is available:
NEVER ask the owner to run: Select-String, Get-Content, Select-Object,
grep, cat, head, or any file inspection command.
Claude reads from GitHub. Owner provides decisions.
Origin: VL-005 — April 4, 2026.

## LL-193 — SESSION-STATE DOCS LAG BEHIND CODE STATE
SESSION-STATE is a human-maintained document. It can be sessions behind code.
Two failure modes:
(1) Code is ahead of SESSION-STATE (work done, doc not updated)
(2) SESSION-STATE shows planned work never executed
Before suggesting ANY build: read SESSION-STATE for orientation, then read
the actual source file to verify. Do not trust docs without disk verification.
Origin: VL-004 — April 4, 2026.

## LL-194 — REGISTRY SECTION 3 ENTRIES MUST BE DISK-VERIFIED ABSENT
Before adding ANY feature to REGISTRY Section 3 ("Safe to Build"):

Read the relevant source file from GitHub
Search for feature indicators
If found → BUILT. List in Section 1 and 2, not Section 3.
If absent → may list in Section 3.
If cannot verify → "STATUS UNVERIFIED — check disk first"
Origin: VL-006 — April 4, 2026.


## LL-195 — BUILD SUGGESTIONS REQUIRE PRIOR DISK VERIFICATION
Sequence is always:
(1) Read source file from GitHub
(2) Determine state (built / absent / unknown)
(3) Then suggest, dismiss, or flag unverified
NEVER reverse this sequence.
Origin: VL-003, VL-004 — April 4, 2026.

## LL-196 — WP-VISUAL TYPOGRAPHY RULES — COMPLETE (NEW v2.11)
WP-VISUAL Phases A–N complete as of April 4, 2026 (HEAD: 111ef27).
These patterns are BANNED in all new code going forward:
fontWeight: 300          — BANNED. Minimum 400 body, 600 for values/headers.
fontSize: 9px on labels  — BANNED. Minimum 11px.
letterSpacing: "0.3em"   — BANNED on labels. Use "0.07em".
borderRadius: 2 on cards — BANNED. Use 10 or higher.
color: #999999 on labels — BANNED. Use #374151.
REQUIRED patterns:
Metric values (KPI, MiniStat, StatGrid): fontWeight MINIMUM 600
Card labels: fontSize 11px, fontWeight 700, letterSpacing "0.07em"
Cards: borderRadius 10, boxShadow layered
fontVariantNumeric: "tabular-nums" on all currency/count displays
Files confirmed clean (disk-verified April 4, 2026):
ExpenseManager.js — already clean before WP-VISUAL
Distribution.js   — Phase L (feb0afc)
HQFraud.js        — Phase M (111ef27)
HQInvoices.js     — Phase N (111ef27)
GeoAnalyticsDashboard.js — Phase K (8dc6cea)
Files NOT yet verified (may still have pre-WP-VISUAL patterns):
HQSuppliers.js · HQTransfer.js · HQWholesaleOrders.js
HQMedical.js · AdminDashboard.js
Read before touching — do not assume clean.

## LL-197 — VIZ/ LIBRARY v2.0 USAGE RULES (NEW v2.11)
src/components/viz/ — ChartCard, ChartTooltip, DeltaBadge, SparkLine,
BulletChart, InlineProgressBar, PipelineStages, Icon
All exported from src/components/viz/index.js
ChartCard v2.0 — ALWAYS use for any chart wrapper. Props:
title · subtitle · accent (green|blue|amber|red|purple|teal|default)
height · badge · footer
Hover shadow lift built in. 12px border-radius. #FAFAFA header bg.
ChartTooltip v2.0 — ALWAYS use. NEVER use Recharts default tooltip.
Frosted glass blur. 8-colour palette. 700-weight values.
Import: import { ChartTooltip } from "../viz";
DeltaBadge v2.0 — for period-over-period deltas.
Props: value · suffix · size (sm|md|lg) · inverse (bool, for costs)
Neutral state fires when |value| < 0.5%.
All new charts MUST have:
isAnimationActive={true} + animationDuration 600–800ms
CartesianGrid: horizontal only, stroke T.ink150, strokeWidth 0.5
XAxis/YAxis: axisLine={false} tickLine={false}, fontSize 10, fill T.ink400
Gradient stopOpacity: min 0.35 at offset 5%, 0.02 at offset 95%

## LL-198 — SEED-DEMO-DATA SCHEMA FACTS (NEW v2.11)
Discovered during seed-demo-data.js build (v178). Do NOT repeat these mistakes:
eod_cash_ups:
variance          = GENERATED column — NEVER INSERT it
field name        = system_cash_total (NOT expected_cash)
UNIQUE constraint = (tenant_id, cashup_date)
pos_sessions:
NO total_sales column — use notes field for seed tagging only
orders:
field  = total (NOT total_amount)
status = 'paid' (NOT 'completed')
stock_movements:
seed rows → movement_type = 'sale_out' (NOT 'sale_pos')
'sale_pos' is POSScreen in-store only (LL-189)
user_profiles:
.id is FK to auth.users — must use real auth user UUIDs
Fabricated UUIDs will violate FK constraint
daily_summaries:
table does NOT exist — seed skips with WARN, do not attempt INSERT
Env var for seed script:
SUPABASE_SERVICE_ROLE_KEY (NOT REACT_APP_ prefixed — Node context, not React)
Seed commands:
npm run seed        — idempotent (checks seed_tag before inserting)
npm run seed:reset  — wipe seed rows then reinsert

## LL-199 — LL-120 CLOSED FOR STOCKOPENINGCALIBRATION (NEW v2.11)
LL-120 rule: Never call api.anthropic.com directly from React. Always route
through ai-copilot Edge Function.
StockOpeningCalibration.js v1.1 (commit a92aaaf · April 4 2026) — FIXED.
BEFORE (broken):
fetch("https://api.anthropic.com/v1/messages", {
headers: { "Content-Type": "application/json" }
})
const raw = data.content?.[0]?.text || "";
AFTER (correct):
fetch(${supabaseUrl}/functions/v1/ai-copilot, {
headers: {
"Content-Type": "application/json",
Authorization: Bearer ${supabaseAnon}
}
})
const raw = (data.reply || "").replace(/json|/g, "").trim();
// + JSON indexOf/lastIndexOf extraction with try/catch fallback
Key facts:
Response field = data.reply (NOT data.content[0].text)
LL-120 itself remains ACTIVE as a system-wide rule.

---

# HQSTOCK — PROTECTED ARCHITECTURE
HQStock.js v3.1 — PROTECTED. Read LL-178, LL-179, LL-180 before touching.
Root div: no maxWidth (removed commit e7eca29 · April 3 2026)
TABS (7): Overview · Items · Movements · Pricing · Receipts · Purchase Orders · Shop Manager
LOCKED SUB-COMPONENTS: StockItemModal.js (14 worlds) · StockItemPanel · StockPricingPanel

---

# LOCKED FILES
StockItemModal.js   — LOCKED. 14 product worlds. Never modify.
ProteaAI.js         — LOCKED. Never modify.
PlatformBar.js      — LOCKED. Never modify.
LiveFXBar.js        — PROTECTED. Never modify.
supabaseClient.js   — PROTECTED. Never modify.
HQStock.js          — PROTECTED. Read full file before any change.

---

# SCHEMA — CONFIRMED (April 4, 2026)
inventory_items:      no 'notes' column · category is enum (::inventory_category in SQL)
                      loyalty_category SEPARATE from category (LL-176)
orders:               field = total (NOT total_amount) · status = pending/paid/failed/cancelled/refunded
order_items:          NO inventory_item_id FK — via product_metadata jsonb
                      line_total is GENERATED — NEVER INSERT
loyalty_transactions: column = transaction_type (NOT type) — use .ilike() (LL-191)
movement_type:        'sale_pos' for POS · 'sale_out' for wholesale/seed (LL-189)
eod_cash_ups:         LIVE · UNIQUE(tenant_id, cashup_date) · variance GENERATED (LL-198)
                      field = system_cash_total (NOT expected_cash)
pos_sessions:         LIVE — (tenant_id, session_date, opening_float, status)
                      NO total_sales column (LL-198)
tenant_config.settings: JSONB — EOD thresholds, never hardcode (LL-190)
scan_logs:            NO tenant_id column — NEVER filter by it (LL-056)
daily_summaries:      table does NOT exist — do not INSERT (LL-198)
user_profiles.id:     FK to auth.users — must use real auth UUIDs in seed (LL-198)

---

# THREE-CLAUDE ECOSYSTEM
Claude.ai    — strategy, planning, GitHub MCP (READ-ONLY), Supabase MCP, Vercel MCP
Claude Code  — file edits, npm start verify, git commit, git push
GitHub MCP   — READ-ONLY permanently. 403 on all writes. Do not test again.
SESSION START SEQUENCE (mandatory):

List docs/ → identify latest SESSION-STATE filename
Read SESSION-STATE → understand planned priorities
For each priority: read source file → confirm state
THEN respond with verified, accurate information


---

## LL-200 — CANNABIS REFS BANNED ON PUBLIC/YOCO PAGES (RESTORED from LL-124)
Zero cannabis references on any public-facing page or Yoco integration point.
Visa/Mastercard network rules prohibit cannabis-related payment processing.
Applies to: storefront, checkout, Yoco pages, email receipts, unauthenticated URLs.
Banned words: cannabis, weed, ganja, bud, flower, THC, CBD, dagga, strain names,
any category name implying cannabis. Use neutral language: "products", "items".
Original text: LL-124 in LL-ARCHIVE_v1_0.md (lines 207-209).
Restored: April 5, 2026.

## LL-201 — YOCO SDK IS NATIVE MOBILE ONLY (RESTORED from LL-125)
Yoco in-person payment SDK = Android and iOS native only. CANNOT run in React web.
Web payment integration must use Yoco hosted payment portal redirect flow.
Never import or bundle Yoco SDK into React/Next.js.
Original text: LL-125 in LL-ARCHIVE_v1_0.md (lines 211-213).
Restored: April 5, 2026.

---

## LL-202 — GITHUB WRITE TOOLS BANNED FOR CLAUDE.AI — NO EXCEPTIONS (VL-007)
Prompted by VL-007 — April 5, 2026. Reinforcement of RULE 0Q.
Claude.ai NEVER calls GitHub write tools. Ever. No exceptions.
Banned tools for Claude.ai: push_files, create_or_update_file
Applies to: code files, doc files, config files — ALL file types
"Just docs" is not an exception.
"Just this once" is not an exception.
"Faster than Claude Code" is not an exception.
"The tool is available in my tool list" is NOT permission to use it.
The three-Claude workflow for all repo writes:

  Claude.ai produces complete file content in the chat response
  Claude.ai gives Claude Code the exact instruction
  Claude Code writes to disk, verifies, commits, pushes
  Claude.ai confirms via GitHub MCP read tools

If Claude.ai catches itself about to call push_files or create_or_update_file:
  STOP. Do not call the tool.
  State: "I was about to violate RULE 0Q. Logging VL-NNN."
  Write the violation log entry.
  Give Claude Code the instruction instead.
Origin: VL-007 (April 5, 2026).

---

*SESSION-CORE v2.11 · NuAi · April 4, 2026*
*v2.11: LL-196 through LL-199*
*  LL-196: WP-VISUAL typography banned patterns + required patterns*
*  LL-197: viz/ library v2.0 ChartCard, ChartTooltip, DeltaBadge rules*
*  LL-198: seed schema facts — eod variance GENERATED, orders.total, daily_summaries absent*
*  LL-199: LL-120 closed for StockOpeningCalibration — ai-copilot EF route, data.reply field*
*LL list is SACRED — never abbreviate, never skip, always write in full.*
