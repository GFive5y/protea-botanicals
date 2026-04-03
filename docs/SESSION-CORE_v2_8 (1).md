# SESSION-CORE.md — NuAi Platform Bible
## Version: v2.9 · Updated: April 4, 2026
## CRITICAL UPDATE: LL-184 strengthened after VL-001/VL-002. RULE 0O added (violation log).
## v2.9: LL-189 (sale_pos), LL-190 (EOD config), LL-191 (loyalty column). Schema updated.
## Update: Only when new LLs added or schema changes confirmed.

> READ THIS FILE ONCE PER SESSION. Invariant truth about this system.
> Read order: SESSION-STATE → SESSION-CORE → VIOLATION_LOG → SESSION-BUGS → REGISTRY → MANIFEST

---

# RULE 0 — MANDATORY. EVERY SESSION. EVERY TASK.

## BEFORE WRITING ANY CODE:
```
STEP 0 — Read REGISTRY.md Section 1 (Feature Index) FIRST.
STEP 1 — Read MANIFEST.md in full.
STEP 2 — powershell: Get-ChildItem -Path src -Recurse -Filter "*.js"
STEP 3 — git show HEAD:src/PATH/TO/FILE.js | Out-File -FilePath temp.txt -Encoding utf8
STEP 4 — Find/replace blocks only. Never full rewrites unless file produced externally.
STEP 5 — After building: add to REGISTRY.md Section 1 + Section 2.
```

## BEFORE WRITING ANY DOCUMENT:
```
STEP A — project_knowledge_search("SESSION-STATE.md") FIRST.
STEP B — view /mnt/project/SESSION-STATE.md — read actual file.
STEP C — Version must be higher. Merge, never replace.
STEP D — Write to outputs/, present_files to user.
```

## RULE 0B — FILE INTEGRITY CHECK
FI-1 git status · FI-2 First 5 lines · FI-3 Export matches filename · FI-4 COMMIT IMMEDIATELY

## RULE 0C — PRE-BUILD OWNER CONFIRMATION — always, no exceptions.

## RULE 0D — DISK IS TRUTH
```
Get-ChildItem src\components\hq\ | Select-Object Name
Get-Content src\FILE.js | Select-Object -First 3
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

## ⚠️ RULE 0M — CODE BOX DISCIPLINE (LL-184) — STRENGTHENED AFTER VL-001/VL-002
```
TWO BOX TYPES. NEVER MIXED.

TYPE 1 — DEPLOY BOX:
  • Contains ONLY the exact executable content. Nothing else.
  • No label text on the line immediately above the opening ```.
  • No >> characters. No "DEPLOY". No "git commands:". No comments.
  • If the owner clicks the copy icon, what they get must run as-is.

TYPE 2 — CONTEXT (prose only, never a code fence):
  • Written as a normal sentence in the response.
  • Must be separated from any following code fence by at least one
    sentence of prose — never a bare label on the line above ```.
  • Words like "DEPLOY", "DO NOT DEPLOY", "run this" belong here only.

CRITICAL — WHAT VL-001 TAUGHT US:
  WRONG: Writing "DEPLOY — git commands:" on the line immediately
         above a code fence. The copy icon captures ambiguously.
  WRONG: Any >> text near a code fence (>> is PowerShell redirection).
  RIGHT: "Copy the block below and paste it into your terminal:"
         [blank line]
         ```
         git add ...
         ```

Violation log: VL-001, VL-002 (April 3 2026)
```

## ⚠️ RULE 0N — FILE KNOWLEDGE BEFORE EDIT (LL-185)
```
Before suggesting ANY change to a file, Claude must have read the CURRENT
version of that file in this session. If not read → ask owner to paste it.
The owner can ONLY do Ctrl+F carbon copy paste replacements.
If Claude provides an incorrect "find" string → owner is stuck.
Origin: April 3 2026 — multiple failed partial replacements.
```

## ⚠️ RULE 0O — VIOLATION LOG REQUIREMENT (NEW v2.8)
```
Every time Claude violates any rule:
  STEP 1 — STOP the current task immediately.
  STEP 2 — State: "I violated [RULE/LL]. Logging now."
  STEP 3 — Add entry to VIOLATION_LOG.md (outputs/) with all fields:
             VL-NNN, date, rule violated, what happened, what should have
             happened, root cause, doc fix applied.
  STEP 4 — Update SESSION-CORE if the rule needs strengthening.
  STEP 5 — Only THEN continue with the original task.

  If a rule is violated twice → the rule is INCOMPLETE → rewrite it.
  The violation log is read every session (listed in read order above).
  It is NEVER pruned.

Origin: Owner instruction April 3 2026 — "every time you violate a rule
        you review the system docs, assess where you went wrong, include
        it in the docs, record it for future documentation purposes."
```

---

# LL ENTRIES — v2.5 through v2.7
## (LL-174 through LL-188 — see previous versions for full text)
## Reproduced in full below for session completeness.

## LL-174 — CATEGORY LABELS SINGLE SOURCE OF TRUTH
```
ALWAYS import CATEGORY_LABELS, CATEGORY_ICONS from ProductWorlds.js.
NEVER define category label maps locally. Exception: StockItemModal.js (LOCKED).
```

## LL-175 — SHOP ARCHITECTURE
```
The inventory IS the website. No separate shop products table.
Control via is_active + sell_price. Image: image_url → brand_image_library → CATEGORY_ICONS.
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
Separate lines only:
  git add src\path\file.js
  git commit -m "message"
  git push
Never: git add . && git commit -m "..." && git push
```

## LL-184 — CODE BOX CARBON COPY RULE (STRENGTHENED v2.8 after VL-001/VL-002)
```
DEPLOY BOX = executable content ONLY. Nothing else inside the fence.
CONTEXT = prose sentences in the response, separated from fence by prose.

SPECIFICALLY FORBIDDEN inside or immediately above a code fence:
  • Any label: "DEPLOY", "DO NOT DEPLOY", "git commands:", "run this"
  • Any >> characters (PowerShell redirection operator)
  • Any explanation of what the code does
  • Partial snippets requiring manual assembly

CORRECT PATTERN:
  Prose sentence describing what the block does, then a blank line, then:
  ```
  [executable content only]
  ```

WRONG PATTERN (caused VL-001):
  DEPLOY — git commands:
  ```
  git add ...
  ```

Violation log: VL-001, VL-002
```

## LL-185 — FILE KNOWLEDGE BEFORE SUGGESTING EDITS
```
Must have read current file THIS session before suggesting any edit.
If not read → ask: "Can you paste [filename]?"
Owner can ONLY do Ctrl+F carbon copy paste.
Wrong "find" string = owner is stuck.
```

## LL-186 — TENANTPORTAL LAYOUT — INNER CONSTANT PATTERN
```
const INNER = { maxWidth: 1400, width: "100%", margin: "0 auto" };
Applied to: breadcrumb, FX bar wrapper, fullBleed inner, non-fullBleed inner.
Scroll: fullBleed → outer overflow:hidden + inner INNER.
        non-fullBleed → outer overflowY:auto + inner INNER.
Current: TenantPortal.js v2.4 (commit e7eca29 · April 3 2026)
```

## LL-187 — UNICODE BOM IN JS FILES
```
BOM causes silent Python str.replace() failures.
Fix: strip via VS Code status bar (encoding indicator → Save with UTF-8).
```

## LL-189 — POSSCREEN MOVEMENT TYPE
```
movement_type = 'sale_pos' for in-store POS sales (NOT 'sale_out').
'sale_out' = B2B wholesale only (HQWholesaleOrders.js).
Using 'sale_out' from POS will corrupt wholesale analytics.
```

## LL-190 — EOD THRESHOLDS FROM DB ONLY (never hardcode)
```
All EODCashUp thresholds must come from tenant_config.settings:
  eod_cash_variance_tolerance  (amber flag threshold)
  eod_escalation_threshold     (red escalation threshold)
  eod_default_float            (pre-filled opening float)
  eod_approver_role            (who approves escalations)
To change without code deploy:
  UPDATE tenant_config SET settings = settings || '{"eod_cash_variance_tolerance": 100}'
  WHERE tenant_id = '...';
Never hardcode threshold values in EODCashUp.js or any component.
```

## LL-191 — LOYALTY_TRANSACTIONS COLUMN NAME (confirmed April 4 2026)
```
Column name is transaction_type (NOT 'type').
Querying .eq("type", ...) or .ilike("type", ...) returns HTTP 400.
ALWAYS use: .ilike("transaction_type", "earned")
            .ilike("transaction_type", "redeemed")
Use .ilike() not .eq() — casing is inconsistent in DB (LL-077 still applies).
Confirmed via Supabase schema query April 4 2026.
```

## LL-188 — REORDERPANEL PO STATUS
```
ReorderPanel creates purchase_orders status='draft' ONLY. Never auto-submit.
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

# SCHEMA — CONFIRMED (April 3 2026)

```
inventory_items: no 'notes' column · category is enum (::inventory_category in SQL)
orders: status = pending/paid/failed/cancelled/refunded (NOT 'completed')
order_items: no inventory_item_id FK — linked via product_metadata jsonb
eod_cash_ups — ✅ LIVE (5249529). UNIQUE(tenant_id, cashup_date). variance GENERATED.
pos_sessions — ✅ LIVE (5249529). (tenant_id, session_date, opening_float, status).
loyalty_transactions — column is transaction_type (NOT type) — LL-191 confirmed April 4.
purchase_orders + purchase_order_items + suppliers — confirmed correct
```

---

# THREE-CLAUDE ECOSYSTEM

```
Claude.ai       — strategy, architecture, Supabase MCP, Vercel MCP, WP spec authoring
Claude Code     — reads WP spec, implements, npm start verify, git commit, git push branch, PR
GitHub MCP      — connected READ-ONLY via Copilot endpoint. Write operations return 403 (permanent).
                  Use Claude Code for all git push operations.

WP EXECUTION PATTERN (established PR #1, April 4 2026):
  1. Claude.ai reads current files via GitHub MCP, authors executable WP spec
  2. Claude.ai runs any DB migrations via Supabase MCP
  3. Claude Code reads spec + reads files from disk (LL-185), implements, verifies (npm start)
  4. Claude Code pushes branch, creates PR
  5. Claude.ai monitors Vercel preview build via Vercel MCP, gives merge signal
  6. PR merged → Vercel auto-deploys to production
```

---

*SESSION-CORE v2.9 · NuAi · April 4, 2026*
*New: RULE 0O (violation log), LL-184 strengthened after VL-001/VL-002*
*v2.9: LL-189 (sale_pos movement type), LL-190 (EOD DB config), LL-191 (loyalty transaction_type)*
*Read order now includes VIOLATION_LOG.md*
*LL list is SACRED — never abbreviate, never skip, always write in full.*
