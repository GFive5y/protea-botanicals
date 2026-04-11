# WP-TENANT-GROUPS
## Franchise & Multi-Location Network Layer
## Status: SPEC COMPLETE — ready to build
## Written: 11 April 2026 · Author: George Fivaz + Claude.ai

---

## WHAT THIS WP BUILDS

A franchise/group ownership layer that sits above the existing 
multi-tenant architecture. Allows one owner to manage multiple 
stores — their own or franchised — from a single Group Portal, 
without touching any existing tenant, component, or RLS policy.

This WP does NOT:
- Change how individual tenants operate (unchanged)
- Add branch logic inside a tenant (Path B — rejected)
- Refactor any existing component
- Touch StockItemModal, ProteaAI, PlatformBar, supabaseClient (locked)

This WP DOES:
- Add 2 new DB tables (tenant_groups, tenant_group_members)
- Add 1 new portal route (/group-portal)
- Add 3 new RLS policies (scoped to group membership)
- Build the Group Portal UI on WP-DS-6 tokens throughout
- Wire inter-store stock transfers through existing stock_transfers 
  infrastructure (zero schema change for transfers)

---

## ARCHITECTURAL DECISION — WHY PATH A (NOT PATH B)

Every store is its own tenant. Always.

Path B (branches inside one tenant) was evaluated and rejected:
- Requires 50+ file refactor (every component reads tenant_id only)
- Requires new schema: branches table + branch_id on inventory_items, 
  stock_movements, orders, customers — massive migration
- Requires new RLS layer on top of existing tenant isolation
- 5+ sessions of high-risk work with no user-visible value until done

Path A (tenant-per-store + group linking layer):
- Zero schema change to existing tables
- Zero change to existing components
- Zero risk to existing tenants
- 2 new tables only
- Group Portal is additive — new route, new UI, new RLS
- Works immediately when a second tenant is created

Platform precedent: every expansion to date has added tenants, 
not subdivided them. Path A is architecturally consistent.

---

## THE FRANCHISE REALITY — WHY GROUPS EXIST

```
Medi Can Brand (franchisor)
├── Store A — owned by Medi Can directly       → tenant A (franchisor)
├── Store B — owned by franchisee John         → tenant B (franchisee)
├── Store C — owned by franchisee Sarah        → tenant C (franchisee)

John also owns:
├── Store B (Medi Can franchise)               → tenant B
└── Store E (different brand)                  → tenant E
```

Cross-ownership is real. One owner, multiple groups.
One tenant can belong to multiple groups.

---

## DATABASE — 2 NEW TABLES

### Table 1: tenant_groups

```sql
CREATE TABLE tenant_groups (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  group_type      text NOT NULL DEFAULT 'franchise',
  -- 'franchise' | 'corporate' | 'cooperative'
  owner_tenant_id uuid NOT NULL REFERENCES tenants(id),
  -- the franchisor's or primary owner's tenant
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now() NOT NULL
);
```

### Table 2: tenant_group_members

```sql
CREATE TABLE tenant_group_members (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    uuid NOT NULL REFERENCES tenant_groups(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  role        text NOT NULL DEFAULT 'franchisee',
  -- 'franchisor' | 'franchisee' | 'member'
  joined_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, tenant_id)
);
```

### RLS — 3 new policies (LL-205: every new table needs both policies)

```sql
-- Note: use user_tenant_id() not get_my_tenant_id()
--   Source: LIVE-AUDIT v1.0 Part 1 line 391 (LL-221)
-- tenant_groups: owner can see and manage their own groups
CREATE POLICY "tenant_can_see_own_groups" ON tenant_groups
  FOR ALL USING (
    owner_tenant_id = user_tenant_id()
    OR is_hq_user()
  );

-- tenant_group_members: members can see their group
CREATE POLICY "member_can_see_group" ON tenant_group_members
  FOR ALL USING (
    tenant_id = user_tenant_id()
    OR group_id IN (
      SELECT id FROM tenant_groups 
      WHERE owner_tenant_id = user_tenant_id()
    )
    OR is_hq_user()
  );

-- HQ bypass (LL-205 mandatory)
CREATE POLICY "hq_all_tenant_groups" ON tenant_groups
  FOR ALL USING (is_hq_user());

CREATE POLICY "hq_all_tenant_group_members" ON tenant_group_members
  FOR ALL USING (is_hq_user());

-- stock_transfers: allow cross-group transfers (additive policy)
-- The existing RLS on stock_transfers already allows HQ access.
-- This new policy allows group members to see sibling transfers.
CREATE POLICY "group_transfer_visibility" ON stock_transfers
  FOR SELECT USING (
    from_tenant_id = user_tenant_id()
    OR to_tenant_id = user_tenant_id()
    OR is_hq_user()
  );
```

---

## PORTAL ARCHITECTURE

### Route: /group-portal

New route in App.js. Parallel to /hq, /tenant-portal, /admin.
Protected by RequireAuth. Group membership check on mount.

```
/group-portal                 → GroupPortal.js (new file)
/group-portal?tab=dashboard   → NetworkDashboard (default)
/group-portal?tab=transfers   → NetworkTransfers
/group-portal?tab=compare     → StoreComparison
/group-portal?tab=financials  → CombinedPL
/group-portal?tab=loyalty     → SharedLoyalty (Phase 2)
/group-portal?tab=settings    → GroupSettings
```

### Container: T.container.wide (1400px)

Per WP-DS-6. No dead space gutters. Full use of viewport.

### Layout pattern

```
┌─────────────────────────────────────────────────────────────┐
│ [sidebar 200px] │ [content area — fills to T.container.wide]│
│                 │                                            │
│ Network brand   │ NuAi insight bar (AI-native, always shown) │
│ Nav items       │ KPI tiles (4 — combined across network)    │
│ My stores list  │ Store comparison grid (1 card per store)   │
│                 │ Quick actions row                          │
└─────────────────────────────────────────────────────────────┘
```

Sidebar width: T.sidebar.expanded (220px)
Content padding: T.inset.page (24px) all sides
KPI grid gap: T.page.cardGap (16px)
Section gap: T.page.sectionGap (32px)
Card padding: T.inset.card (16px)

---

## GROUP PORTAL — TAB SPECIFICATIONS

### Tab 1: Network Dashboard (default)

**Purpose:** First thing a group owner sees. Full network health 
at a glance. No drill-down needed for daily check-in.

**Components:**

1. NuAi Insight Bar — always rendered at top
   - AI-generated insight from ai-copilot EF
   - Context: "You are analysing a franchise network. 
     Compare margins, stock health, and revenue across stores."
   - Refresh on tab load. Cached 5 minutes.
   - Example outputs:
     - "Store B margin is 9% below network average — 4 SKUs 
       priced below network median"
     - "Store C has 3 items at reorder threshold. Store A has 
       surplus of the same SKUs — consider a transfer"
     - "Network revenue up 12% MTD. Store B driving 68% of growth"

2. KPI Tiles (4 tiles, T.page.cardGap gap)
   - Combined Revenue MTD (sum across all member tenants)
   - Total Orders / Events (orders for retail, dispensing 
     events for dispensary — per LL-231)
   - Network Average Gross Margin (weighted average)
   - Combined Stock Value (sum of inventory_items.quantity × AVCO)

3. Store Comparison Grid (1 card per store)
   - Store name + industry profile badge
   - Revenue MTD
   - Gross margin (colour: green ≥55%, amber 40-55%, red <40%)
   - Order/event count
   - Stock health (all stocked / N low / N critical)
   - "View store" button → opens tenant portal for that store

4. Quick Actions Row
   - [Transfer stock between stores] → opens Tab 2
   - [Combined P&L report] → opens Tab 4
   - [Export all store data] → CSV of network summary

**Data fetching pattern:**
```javascript
// Fetch all tenants in the group
const { data: members } = await supabase
  .from("tenant_group_members")
  .select("tenant_id, role, tenants(name, industry_profile)")
  .eq("group_id", groupId);

// For each member tenant — fetch revenue, margin, stock
// Run in parallel with Promise.all — never sequential
const storeData = await Promise.all(
  members.map(m => fetchStoreSummary(m.tenant_id))
);
```

**LL-231 reminder:** dispensary revenue = 
  dispensing_log × sell_price (NOT orders table)

---

### Tab 2: Stock Transfers

**Purpose:** Move stock from an overstocked store to an 
understocked one. Uses existing stock_transfers infrastructure.

**Existing infrastructure (zero schema change needed):**
- stock_transfers table: from_tenant_id → to_tenant_id ✅
- stock_transfer_items table ✅  
- HQTransfer.js: full workflow (draft → ship → receive) ✅
- AVCO update on receive ✅
- stock_movements audit trail ✅

**What's new in this tab:**
- FROM store selector scoped to group members only
  (HQTransfer.js currently hardcodes from = HQ tenant)
- TO store selector scoped to group members only
- Stock level comparison: shows qty at FROM store + qty at TO 
  store side by side when selecting a product
- "Smart suggestions" — NuAi pre-suggests which products to 
  transfer based on velocity and stock levels

**Transfer creation flow:**
1. Select FROM store (dropdown — group members only)
2. Select TO store (dropdown — excluding FROM store)
3. Add line items — shows FROM store's inventory
   For each item: shows FROM qty, TO qty, suggested transfer qty
4. Review → Ship → Receive (same 3-step flow as HQTransfer)
5. Both stores' AVCO updated on receive (existing trigger)

**RLS:** group_transfer_visibility policy (defined above) ensures
group members can see transfers between their sibling tenants.

**Re-use strategy:** Do NOT fork HQTransfer.js.
Create GroupTransfer.js that imports the transfer workflow 
sub-components from HQTransfer.js where they are extractable,
or builds a simplified version for group-to-group scope.

---

### Tab 3: Store Comparison

**Purpose:** Side-by-side deep comparison of any 2+ stores.
Helps franchise owner identify best performers and replicate 
their practices.

**Comparison dimensions:**
- Revenue (MTD, last 3 months, trend chart)
- Gross margin (by product category)
- Top 10 products (by revenue and by volume)
- Customer metrics (if loyalty enabled — avg points, tier mix)
- Stock efficiency (turnover rate, dead stock %)
- Staff productivity (orders per staff hour — if HR enabled)

**Layout:** 
- Store selector at top (multi-select — default: all stores)
- Metric cards per store in columns
- Recharts line chart for revenue trend overlay
- Colour coding: best store = green accent, worst = amber

---

### Tab 4: Combined P&L

**Purpose:** Franchisor sees consolidated P&L across all stores.
Each store's P&L stacked with a network total row.

**Data source:** 
- Revenue: orders + dispensing_log per LL-231
- COGS: AVCO-weighted from stock_movements
- Expenses: expenses table per tenant
- Net profit: revenue - COGS - expenses

**Layout:**
- Toggle: "By store" (columns) vs "Combined" (one P&L)
- Date range selector (MTD / last month / last 3 months / YTD)
- Export to CSV / PDF

**Note:** This is a read-only view. Financial posting (journals, 
VAT, bank recon) still happens inside each tenant's own portal.
WP-TENANT-GROUPS does not replicate the financial posting stack.

---

### Tab 5: Shared Loyalty (Phase 2 — not Session 1)

**Purpose:** Customer earns points at Store A, redeems at Store B.

**Prerequisite:** loyalty programme must be active on both stores.
**Schema addition needed:** loyalty_group_id on loyalty_customers 
and loyalty_transactions — links cross-tenant loyalty records.
**Defer to Phase 2** — do not build in Session 1.

---

### Tab 6: Group Settings

**Purpose:** Manage group membership, add/remove stores, 
configure group-level settings.

**Functions:**
- View all group members (name, role, joined date)
- Invite a new store (creates tenant + adds to group, or adds 
  existing tenant to group by tenant_id)
- Remove a store from the group (does not delete the tenant)
- Rename the group
- Change group type (franchise / corporate / cooperative)
- Set royalty percentage (stored for future royalty WP — not 
  calculated in Phase 1, just stored)

---

## NEW FILES TO CREATE

```
src/components/group/GroupPortal.js       — root portal component
src/components/group/NetworkDashboard.js  — Tab 1
src/components/group/GroupTransfer.js     — Tab 2
src/components/group/StoreComparison.js   — Tab 3
src/components/group/CombinedPL.js        — Tab 4
src/components/group/GroupSettings.js     — Tab 6
```

New directory: src/components/group/ (does not exist yet)

---

## FILES TO MODIFY (minimal blast radius)

| File | Change | Risk |
|---|---|---|
| src/App.js | Add /group-portal route | Low |
| src/components/PlatformBar.js | LOCKED — do not touch | — |
| supabase migrations | 2 new tables + RLS | Medium |

**Do NOT touch:**
- Any existing tenant portal component
- HQTransfer.js (reference only — do not modify)
- Any HQ component
- Any locked file

---

## BUILD SEQUENCE — SESSION 1

### Phase 1 — Schema (Claude Code, ~15 min)
1. Migration: create tenant_groups table + RLS
2. Migration: create tenant_group_members table + RLS
3. Migration: add group_transfer_visibility to stock_transfers
4. Seed: create "Medi Can Franchise Network" group with 
   Medi Can Dispensary (2bd41eb7) as franchisor member
5. Verify via SQL: confirm tables exist, seed row present

### Phase 2 — Route wiring (Claude Code, ~10 min)
6. Add /group-portal route to App.js
7. Create src/components/group/ directory
8. Create GroupPortal.js skeleton (sidebar nav + tab router)
9. Verify: /group-portal loads without crash

### Phase 3 — Network Dashboard (Claude Code, ~45 min)
10. Create NetworkDashboard.js
    - NuAi Insight Bar (calls ai-copilot EF with group context)
    - 4 KPI tiles (T.container.wide, T.page.cardGap, T.inset.card)
    - Store comparison grid (T.page.sectionGap between sections)
    - Quick actions row
11. Verify: loads with real data from Medi Can tenant

### Phase 4 — Group Transfer UI (Claude Code, ~60 min)
12. Create GroupTransfer.js
    - FROM/TO store selectors scoped to group
    - Line item table with dual qty display
    - Hooks into existing stock_transfers workflow
13. Test: create a draft transfer, ship, receive

---

## TOKEN USAGE — MANDATORY FOR ALL GROUP COMPONENTS

Every group component imports { T } from "../../styles/tokens"

Layout:
  Container:    T.container.wide   (1400px — set in App.js route)
  Page gutter:  T.inset.page       (24px horizontal padding)
  Section gap:  T.page.sectionGap  (32px between sections)
  Card gap:     T.page.cardGap     (16px between KPI tiles)

Components:
  Card padding: T.inset.card       (16px)
  Modal/drawer: T.inset.modal      (24px)
  Inline gaps:  T.gap.lg           (16px — between card elements)
  Tight gaps:   T.gap.sm           (8px — icon-to-label, tags)

No hardcoded px values matching any token. Ever.
New rule documented in WP-DS-6 Golden Rules (LL-238 scope).

---

## CRITICAL RULES FOR THIS WP

LL-205: tenant_groups + tenant_group_members both need 
  hq_all_ bypass policy → done in schema above.

LL-206: const { tenantId } = useTenant() in all group components.
  GroupPortal also needs groupId from its own query:
  const [groupId, setGroupId] = useState(null); — fetched on mount.

LL-221: Read every file in full before editing.
  Especially App.js before adding the /group-portal route.

LL-231: Dispensary revenue = dispensing_log × sell_price.
  NetworkDashboard must branch on industry_profile per tenant.

LL-227: Medi Can Dispensary (2bd41eb7) is seeded. DO NOT RE-SEED.
  Phase 1 seed adds this tenant to a group — does not re-seed it.

RULE 0Q: Claude.ai never writes to the repo. Claude Code only.

WP-DS-6: All new components use T.container, T.gap, T.pad, 
  T.inset tokens. No hardcoded layout values.

---

## SUCCESS CRITERIA — SESSION 1 COMPLETE WHEN:

[ ] tenant_groups table exists in Supabase with correct RLS
[ ] tenant_group_members table exists with correct RLS  
[ ] Medi Can Dispensary is seeded as group member
[ ] /group-portal route loads without error
[ ] NetworkDashboard shows combined KPI tiles with real data
[ ] Store comparison grid shows Medi Can store card
[ ] NuAi insight bar renders (even if generic while solo store)
[ ] No existing routes broken (regression check)
[ ] All new components use T.* tokens — zero hardcoded px

---

## FUTURE PHASES (not Session 1)

Phase 2: Shared loyalty across group stores
Phase 3: Royalty calculation + franchisor revenue share tracking
Phase 4: Compliance broadcast — push policy to all stores
Phase 5: New store onboarding wizard from group portal
Phase 6: AI network intelligence — predictive cross-store insights

---
*WP-TENANT-GROUPS v1.0 · NuAi · 11 April 2026*
*Status: SPEC COMPLETE — ready to build Session 1*
*Prerequisite commits: d93ef9e (WP-DS-6 Phase 1 complete)*
