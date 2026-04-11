# NEXT SESSION START PROMPT — v240
## Updated: 11 April 2026 (late session close)
## HEAD: 8bcadc7 (Phase 3 NetworkDashboard — Group Portal live, verified in browser)
## Previous prompt: NEXT-SESSION-PROMPT_v239.md (now superseded)

---

## YOUR FIRST 5 ACTIONS (no exceptions, no shortcuts)

1. `git log --oneline -1` → confirm HEAD is **8bcadc7**
2. Read **docs/SESSION-STATE_v239.md** — note both Addendum 1 (ActionCentre rollout + orphan audit) and Addendum 2 (WP-DESIGN-SYSTEM launch + WP-DS-1/2 execution) and Addendum 3 (this session — WP-DS-6 + WP-TENANT-GROUPS). **Read all three addendums in order — they are cumulative.**
3. Read **docs/WP-DESIGN-SYSTEM.md** in full — especially the **text-tier vs surface-tier rule**, the **WP-DS-6 layout tokens** section, and the **Semantic Spacing Aliases** section (T.gap, T.pad, T.inset, T.container, T.page, T.sidebar, T.breakpoint). These govern every new component.
4. Read **docs/WP-TENANT-GROUPS.md** in full — this WP is live, 3 of 6 phases complete. Next phase is **Phase 4 (GroupTransfer.js)**.
5. Read **src/styles/tokens.js** — know the full T shape. 6 token groups (container/page/sidebar/breakpoint + gap/pad/inset) plus everything from WP-DS-1/2.

**Do NOT read any SESSION-STATE older than v239. Do NOT trust WP-TENANT-GROUPS v1.0 spec about `get_my_tenant_id()` — that function does NOT exist. The correct RLS helper is `user_tenant_id()` (corrected at commit `969a065`, documented in the spec at line 107).**

---

## PLATFORM IN ONE SENTENCE

NuAi is now a production multi-tenant SaaS ERP with **three generations of design infrastructure live in production**: a unified T token system (WP-DS-1/2), a layout + semantic spacing token layer (WP-DS-6), and a **franchise ownership layer** (WP-TENANT-GROUPS) enabling a single owner to manage multiple stores from a new `/group-portal` route — all shipped 11 April 2026 with zero regressions to existing tenant operations.

---

## WHAT HAPPENED IN THE LAST SESSION (Addendum 3 summary)

**HEAD chain:** `dd9f751 → cb4a0d8 → 78b2267 → 6cca407 → e8ceaaa → 329ed9b → d93ef9e → ad3dc21 → 969a065 → c304c40 → 8bcadc7`

Condensed milestone list:

1. **Priority 1 owner action complete** — `trigger-sim-nourish` EF deleted from Supabase
2. **Priority 2 owner action complete** — Supabase Auth SMTP → Resend provider live
3. **Priority 4 complete** — ProteaAI `getSuggested()` received CSR / Compliance / Forecast tab suggestions (commit `d842cd0`); LL-237 extended from Medical tab to all four dispensary-facing tabs
4. **WP-DS-6 Phase 1 complete** — three commits: `e8ceaaa` (spec), `329ed9b` (4 layout token groups in code), `d93ef9e` (3 semantic spacing alias groups + full docs for all 7 groups); 17 new leaf tokens added to T; **dead space fix rule established (LL-238)**
5. **WP-TENANT-GROUPS spec published** at `ad3dc21` — 494-line document covering architecture, schema, RLS, portal layout, 6 tab specs, build sequence, token usage mandatory, critical rules
6. **Spec correction** at `969a065` — `get_my_tenant_id()` replaced with `user_tenant_id()` in 5 policy definitions + LIVE-AUDIT citation note; the original typo was caught in pre-flight before any DB damage could happen
7. **WP-TENANT-GROUPS Phase 1 schema shipped** — 2 new tables (`tenant_groups`, `tenant_group_members`), 5 RLS policies, seed data for "Medi Can Franchise Network" with Medi Can as franchisor; `medican@nuai.dev` auth user created; group_transfer_visibility policy added to existing `stock_transfers` table. **All applied directly to Supabase** — no repo commit for DB changes
8. **WP-TENANT-GROUPS Phase 2 shipped** at `c304c40` — `/group-portal` route wired in App.js (mirrors `/tenant-portal` pattern, no AppShell, RequireAuth wrapper only); new directory `src/components/group/`; `GroupPortal.js` skeleton (442 lines) with sidebar nav + tab router + empty/loading/error states; all layout via T.* tokens
9. **WP-TENANT-GROUPS Phase 3 shipped** at `8bcadc7` — `NetworkDashboard.js` (730 lines) with NuAi insight bar + 4 KPI tiles (Combined Revenue MTD, Orders/Events MTD, Network Avg Stock Margin, Combined Stock Value) + store comparison grid with industry badges + quick actions row; parallel per-store fetches via `Promise.allSettled`; industry-profile branch for dispensary revenue (LL-231)
10. **VERIFIED WORKING** — Group Portal tested in browser, loads live Supabase data, displays Medi Can Dispensary as solo-store network with real revenue (R20,000 MTD from 14 dispensing events) and stock metrics

---

## LIVE PLATFORM FACTS (as of 8bcadc7, 11 April 2026)

### Infrastructure (carried forward from v239 + updated)
- Repo: github.com/GFive5y/protea-botanicals · branch: main
- Supabase: uvicrqapgzcdvozxrreo (eu-west-1)
- Live URL: https://nuai-gfive5ys-projects.vercel.app
- Stack: React 18 · Supabase JS v2 · React Router v6 · Vercel

### Tenants (9 active)
Unchanged from SESSION-STATE v239. Medi Can Dispensary (`2bd41eb7-1a6e-416c-905b-1358f6499d8d`) is now the franchisor of **Medi Can Franchise Network** with 1 member (itself). Adding a second tenant unlocks real network comparison.

### NEW — Group Portal routes (WP-TENANT-GROUPS)
- `/group-portal` — franchise/network management (NetworkDashboard live, 5 tabs placeholder)
- Sub-tabs via `?tab=` query param: `dashboard` (live) · `transfers` · `compare` · `financials` · `loyalty` (Phase 2+) · `settings`
- **Gate:** `RequireAuth` — no role gate. Access granted to any user whose tenant is a member of at least one group.
- **Test credential:** `medican@nuai.dev / MediCan2026!` → tenant_id `2bd41eb7-...` → franchisor of "Medi Can Franchise Network"

### NEW — Database tables (live, NOT in migrations folder)
| Table | Purpose | RLS helpers used |
|---|---|---|
| `tenant_groups` | Franchise/network headers | `user_tenant_id()`, `is_hq_user()` |
| `tenant_group_members` | Tenant-to-group membership | `user_tenant_id()`, `is_hq_user()` |

**New RLS policy on existing table:**
- `stock_transfers.group_transfer_visibility` — allows group members to see transfers where their tenant is from_tenant_id OR to_tenant_id

**Seed data:** 1 group (Medi Can Franchise Network, franchise type, owner=2bd41eb7), 1 member (Medi Can, role=franchisor).

### NEW — Token system additions (WP-DS-6)
All 3 commits shipped. Current T object in `src/styles/tokens.js` has these 7 layout/spacing token groups:

| Group | Keys | Source commit |
|---|---|---|
| `T.container` | narrow/default/wide/full (900/1200/1400/"100%") | `329ed9b` |
| `T.page` | gutterX/gutterY/sectionGap/cardGap (24/40/32/16) | `329ed9b` |
| `T.sidebar` | collapsed/expanded (64/220) | `329ed9b` |
| `T.breakpoint` | mobile/tablet/desktop/wide (768/1024/1280/1440) | `329ed9b` |
| `T.gap` | xs/sm/md/lg/xl/xxl (4/8/12/16/24/32) | `d93ef9e` |
| `T.pad` | xs/sm/md/lg/xl/xxl (4/8/12/16/24/40) | `d93ef9e` |
| `T.inset` | card/modal/section/page/tight (16/24/24/24/8) | `d93ef9e` |

**Golden rule (mandatory for every new component):** import `{ T }` from `"../../styles/tokens"`. Never hardcode a pixel value that matches a token. Never declare a local `const T = {...}`. Read WP-DESIGN-SYSTEM.md "Golden Rules for New Features" section before touching any style.

---

## PRIORITY QUEUE FOR NEXT SESSION

### Priority 1 — WP-TENANT-GROUPS Phase 4: GroupTransfer.js
**Status:** NOT STARTED
**Scope:** Inter-store stock transfers using the existing `stock_transfers` / `stock_transfer_items` infrastructure. The schema already exists (HQTransfer.js has been running on it since March 2026). The new component will:

1. Read the spec at `docs/WP-TENANT-GROUPS.md` "Tab 2: Stock Transfers" section
2. Create `src/components/group/GroupTransfer.js` (new file)
3. Scope FROM store selector to group members only (not hardcoded to HQ tenant like HQTransfer.js does)
4. Scope TO store selector to group members only, excluding the selected FROM
5. Line item table with **dual qty display** — shows FROM store qty and TO store qty side by side when a product is selected
6. Transfer creation flow matches HQTransfer lifecycle: draft → ship → receive (do NOT fork HQTransfer.js; either import extractable sub-components or build a simplified flow)
7. All styling via T.* tokens (T.container.wide, T.gap.md, T.inset.card, etc.)
8. Update GroupPortal.js to swap the `transfers` tab placeholder with `<GroupTransfer />`

**RLS already in place** — `group_transfer_visibility` policy on `stock_transfers` shipped in Phase 1.

**LL-221 pre-flight required** — read HQTransfer.js in full before writing GroupTransfer (it's 1,692 lines — be pragmatic: grep the useful handlers and read them individually). Report findings before building.

### Priority 2 — WP-TENANT-GROUPS Phase 5: GroupSettings.js
**Status:** NOT STARTED
**Scope:** Tab 6 of the Group Portal. Manage group membership + metadata.

- View current members (name, role, joined date, industry profile)
- Invite existing tenant by tenant_id (INSERT into tenant_group_members)
- Remove a tenant from the group (DELETE from tenant_group_members — does NOT delete the tenant itself)
- Rename the group (UPDATE tenant_groups.name)
- Change group type (franchise / corporate / cooperative)
- Set royalty percentage (stored for a future royalty WP — not calculated in Phase 1)
- Only franchisor-role members can edit (check current user's role via their membership row)

File: `src/components/group/GroupSettings.js`
Tokens: same WP-DS-6 rules

### Priority 3 — Wire ai-copilot EF into NetworkDashboard insight bar
**Status:** Currently a static placeholder in `NetworkDashboard.js` (lines ~310-340)
**Scope:**
1. On NetworkDashboard mount, call `ai-copilot` EF with:
   - Context: "You are analysing a franchise network. Compare margins, stock health, and revenue across stores."
   - User data: the fetched storeData array + network totals (revenue, stock value, margin)
2. Display streaming response in the insight bar
3. Cache the result for 5 minutes (per the spec — use `sessionStorage` keyed by `groupId`)
4. Example outputs the spec wants:
   - "Store B margin is 9% below network average — 4 SKUs priced below network median"
   - "Store C has 3 items at reorder threshold. Store A has surplus of the same SKUs — consider a transfer"
   - "Network revenue up 12% MTD. Store B driving 68% of growth"
5. LL-120: never call `api.anthropic.com` from React — always route through the ai-copilot EF

### Priority 4 — Wire "View store →" cross-tenant navigation
**Status:** Currently a `console.log` placeholder on every store card in NetworkDashboard
**Scope:**
1. Click handler must call `switchTenant(targetTenant)` from `useTenant()` (requires importing the hook in NetworkDashboard — currently NetworkDashboard does NOT call useTenant per prop-drill pattern)
2. After switch, `navigate("/tenant-portal")`
3. **Architectural question**: should NetworkDashboard call useTenant() itself (deviation from the current prop-drill pattern established in Phase 3) or receive `switchTenant` as a prop from GroupPortal? **My recommendation: receive as prop** — consistent with current pattern, minimal surface area for tenant context leakage.
4. RLS implication: the new tenant's tenant_id must have cross-tenant visibility policies. Already in place for `stock_transfers` via Phase 1. Verify other tables if any access is needed inside the target tenant portal.

### Priority 5 — WP-DS-2 continuation (token migration remaining files)
**Status:** Priority 3 started last session (ActionCentre done, 1/~8 shared components migrated). Priority 4 (~25 HQ components with local T definitions) NOT started.

**Next shared-component target:** `src/components/WorkflowGuide.js` (589 lines). Apply the same pattern as ActionCentre migration:
1. LL-221 read in full
2. Audit local T vs shared T
3. Report drift before editing
4. Apply text-tier vs surface-tier rule for any warning/danger references
5. Commit

**Context:** WP-DESIGN-SYSTEM.md documents the mandatory rule — **every Priority 4 HQ component session MUST apply the text-tier vs surface-tier rule, not the naive rule**. Naive `C.warning → T.warning` would produce bright orange alarm text across 25 components.

### Priority 6 — Owner actions (carried forward)
- **CIPRO registration + nuai.co.za domain** — gov docs pending, still in progress
- **Sender email update to `noreply@nuai.co.za`** when the domain goes live (currently sending from Resend default)

---

## KEY RULES TO CARRY FORWARD (memorise before any code)

### Schema
- **`user_tenant_id()` is the correct RLS helper** — NOT `get_my_tenant_id()` (the latter does not exist). Corrected in commit `969a065`. Every new RLS policy must use `user_tenant_id()`.
- **`orders.total`** (NOT `total_amount`) — verified live against HQOverview.js:795. Use this in every revenue query.
- **`orders.status = "paid"`** — not `!= "cancelled"`. Revenue queries must filter on paid. Matches HQProfitLoss, HQOverview, HQForecast, NetworkDashboard conventions.
- **`inventory_items.reorder_level`** (NOT `reorder_point`) — verified live against HQOverview.js:525.
- **Dispensary revenue** (LL-231): `dispensing_log × inventory_items.sell_price` with `is_voided != true`. NOT orders table.
- **Medi Can seeded** — tenant `2bd41eb7-1a6e-416c-905b-1358f6499d8d`, now franchisor of "Medi Can Franchise Network". **DO NOT RE-SEED** (LL-227).

### Design system
- **T.container.wide = 1400px** for group portal and any wide-layout feature (WP-DS-6).
- **All new components use T.* tokens** — zero hardcoded px. LL-238 (dead space rule) documents the container/spacing standard.
- **Text-tier vs surface-tier semantic rule** (from WP-DS-2/P3 ActionCentre migration): `C.warning/danger` as text colours map to `T.warningText/T.dangerText`, NOT `T.warning/T.danger` (which are bright surface colours). Critical for every Priority 4 HQ component migration.
- **Never declare `const T = {...}` locally** in a new component. Import `{ T }` from `"../../styles/tokens"` (adjust depth). The shared tokens.js is the single source of truth.

### Group Portal
- **Test user:** `medican@nuai.dev / MediCan2026!`
- **Test path:** log in → navigate to `/group-portal` → loads NetworkDashboard with Medi Can as solo-store franchisor
- **NetworkDashboard does NOT call `useTenant()`** — it receives `members[]` as a prop from GroupPortal. Consistent with the LL-206 "no tenantId props on HQ children" pattern inverted for the group-portal scope (where iterating all members is the point).
- **Parallel fetches via `Promise.allSettled`** — resilient to per-tenant failures. One store's query failing must not crash the network dashboard.
- **LL-231 branch** — every per-store revenue query must check `industry_profile === "cannabis_dispensary"` before choosing between the `dispensing_log` and `orders` path.

### Locked files (LL-061)
Never touch:
- `src/components/StockItemModal.js`
- `src/components/ProteaAI.js` (exception: `CODEBASE_FACTS` str_replace + `getSuggested()` return arrays only — LL-237)
- `src/components/PlatformBar.js`
- `src/services/supabaseClient.js`

### Rule 0Q
**Claude.ai NEVER calls `push_files` or `create_or_update_file` against the repo.** All repo writes via Claude Code only. No exceptions.

---

## WHAT IS LIVE vs WHAT NEEDS BUILDING

### ✅ Live in production (this session)
- `/group-portal` route + GroupPortal.js + NetworkDashboard.js
- Live Supabase data fetching (tenant_groups, tenant_group_members, orders, dispensing_log, inventory_items)
- 4 KPI tiles with real network totals
- Store comparison grid with industry badges + 4 metric rows per card
- Quick actions (transfers/financials navigation, export placeholder)
- WP-DS-6 token system (7 groups, 17 new leaf tokens)
- All 3 previous-session owner actions (trigger-sim-nourish deleted, SMTP configured, ProteaAI getSuggested complete)

### ⏸ Scaffolded but not implemented
- GroupPortal tabs: `transfers`, `compare`, `financials`, `loyalty`, `settings` — all render placeholder cards
- NuAi insight bar in NetworkDashboard — static placeholder text
- "View store →" button — logs to console, no tenant switch
- "Export network summary" — logs to console, no CSV generation

### ❌ Not yet started
- GroupTransfer.js (Phase 4)
- GroupSettings.js (Phase 5)
- StoreComparison.js (Tab 3)
- CombinedPL.js (Tab 4)
- Shared Loyalty (Phase 2+ — deferred, requires schema addition)

---

## DEMO VERIFICATION CHECKLIST

Run after any Vercel deploy (test in incognito, confirm Vercel "Ready" status first, per LL-214):

### Group Portal — first access
[ ] Log in as `medican@nuai.dev` (password `MediCan2026!`)
[ ] Navigate to `/group-portal` (type in URL — no nav link yet from HQ)
[ ] Page loads within 2 seconds with no console errors
[ ] Sidebar shows "Medi Can Franchise Network" brand header
[ ] Sidebar shows group type pill "FRANCHISE"
[ ] Sidebar shows "1 store" count
[ ] Sidebar nav items visible: Network Dashboard (active), Stock Transfers, Compare Stores, Combined P&L, Shared Loyalty (disabled, "Phase 2" label), Group Settings
[ ] Sidebar "My Stores" section shows "Medi Can Dispensary" with "franchisor" role + industry profile

### Network Dashboard — data loaded
[ ] NuAi insight bar renders with green dot + solo-store message
[ ] 4 KPI tiles visible:
   - Combined Revenue MTD: ~R20,000 (from 14 seeded dispensing events)
   - Events MTD: 14
   - Network Avg Stock Margin: real percentage (computed from Medi Can's priced inventory)
   - Combined Stock Value: real number (AVCO weighted)
[ ] Store comparison grid shows 1 card:
   - "Medi Can Dispensary" title
   - "Medical Dispensary" badge (clinical blue)
   - Revenue MTD row with real amount
   - Stock margin row with coloured value
   - Orders / events row (14)
   - Stock health row ("All stocked" in green for seeded data)
   - "View store →" button (click → console log only)
   - Italic "Phase 4" label next to the button
[ ] Quick actions row shows 3 buttons:
   - "Transfer stock between stores" (primary green)
   - "Combined P&L report" (secondary)
   - "Export network summary" (secondary)
[ ] Click "Transfer stock between stores" → navigates to `?tab=transfers` → placeholder card
[ ] Click "Combined P&L report" → navigates to `?tab=financials` → placeholder card

### Error scenarios
[ ] Log in as a tenant NOT in any group → see friendly empty state card
[ ] RLS correctly isolates group data (another tenant's user cannot see Medi Can's network)

---

## FILES NOT TO TOUCH WITHOUT READING IN FULL (LL-221)

Updated from v239 + new Phase 3 entries:

| File | Size | Risk |
|---|---|---|
| src/components/group/NetworkDashboard.js | 730 lines | Group portal centrepiece — multi-store data aggregation |
| src/components/group/GroupPortal.js | 445 lines | Group portal root — all tab routing, auth flow |
| src/components/hq/HQProfitLoss.js | 112KB+ | TDZ risk · profile branching |
| src/components/hq/HQCogs.js | 145KB / 3,912 lines | LL-233 |
| src/components/hq/HQStock.js | 208KB | 14 product worlds |
| src/components/hq/HQOverview.js | ~3,320 lines | Multi-fetch · profile branches |
| src/components/hq/HQMedical.js | ~70KB | 6 sub-tabs · Schedule 6 |
| src/components/hq/HQTransfer.js | 1,692 lines | **CRITICAL for Phase 4 — reference only, do NOT fork** |
| src/pages/TenantPortal.js | ~1,200 lines | 4-branch waterfall routing |
| src/components/StockItemModal.js | — | LOCKED |
| src/components/ProteaAI.js | 2,346 lines | LOCKED (LL-061 + LL-237) |
| src/components/PlatformBar.js | — | LOCKED |
| src/services/supabaseClient.js | — | LOCKED |

---

## THE VISION (unchanged from v239 — worth reading again)

NuAi is South Africa's first AI-native multi-tenant ERP for specialty retail. Built from a real cannabis retail business. Expanding to 4 profiles (cannabis retail, medical dispensary, food & beverage, general retail) from one codebase. Replacing R1.4M+ of bespoke software at R3,500–R12,000/month per client.

**New this session:** franchise/network management. One owner, many stores, zero schema refactor to existing tenant architecture. The foundation for WP-PULSE (ambient intelligence — WP-DS-5) and cross-tenant network optimisation is now in place.

The architecture is solid. The patterns are documented. The platform is live. Every agent who reads this prompt has everything they need to build the best ERP SaaS ever built in South Africa.

Go build something great.

---

*NEXT-SESSION-PROMPT v240 · NuAi · 11 April 2026*
*HEAD at time of writing: 8bcadc7*
*Previous prompt: NEXT-SESSION-PROMPT_v239.md (now superseded — do not read)*
*Session built: WP-DS-6 Phase 1 + WP-TENANT-GROUPS Phases 1-3 + 3 carried-forward owner actions + ProteaAI Priority 4*
