# WP-AINS v1.0
## Ambient Intelligence Navigation System
## NuAi Platform — Full Architecture Spec
## Produced: 10 Apr 2026 — Planning Session

---

## WHAT THIS IS

AINS replaces the current fragmented AI surface with a single coherent
intelligence layer embedded directly into the navigation structure.

The current model: user initiates every interaction.
Opens panel → types question → waits → reads answer.

The AINS model: the platform initiates.
Surfaces specific fact → user reads it → optionally asks for depth.

Every intelligence surface in AINS is SQL-computed by default.
LLM is reserved for interpretation and follow-up depth only.
The platform speaks first. The user responds.

---

## WHAT GETS REPLACED

| Current Component | Status | Replacement |
|---|---|---|
| PlatformBar.js | DEPRECATED | Alerts → NuAi brief. Comms → nav badge. Fraud → NuAi brief. Actions → IntelStrip. |
| AIFixture.js | REPLACED | IntelLines (2 live SQL facts) + NuAi mark with today's key metric |
| ProteaAI.js chat (blank open state) | REPLACED | Opens pre-loaded with NuAiBrief. Chat still exists for follow-up depth. |
| Static suggested questions (4 generic) | REMOVED | Replaced by IntelStrip pills and NuAiBrief action buttons |
| NavSidebar passive labels | UPGRADED | Live badge counts + sub-item insight text |

---

## THE FIVE SURFACES

### Surface 1 — Sidebar Intelligence Layer

**What it is:** The nav sidebar becomes aware of business state. Every nav
section and sub-item carries live data without any user interaction.

**Nav section badges (right side of section row):**
- Inventory: count of (below_reorder + out_of_stock) items → amber/red badge
- Sales: today's order count → info (blue) badge → positive signal, always shown
- Customers: unread messages + churn-risk customers → amber if > 0
- Reports: any open VAT alerts or unreconciled bank lines → red if critical

**Sub-item insight text (right side of sub-row, italic, muted):**
Every sub-item in the expanded nav shows a one-line SQL fact:
- Stock → "6 below reorder" or "all stocked ✓"
- Catalog → "186 active · 1 OOS"
- POS Till → "R13,520 today"
- P&L → "66.3% margin · R153k MTD"
- Loyalty → "258 pts transactions MTD"
- Expenses → "R47k logged · 47 entries"
- VAT → "R61,758 output · due 31 Jul"

**Interaction:** Clicking a sub-item navigates as normal. The insight text
is read-only display — it does not open NuAi. It is there so you know what
you're navigating INTO before you arrive.

---

### Surface 2 — IntelLines (bottom of sidebar, above NuAi mark)

**What it is:** Two always-visible lines showing the most critical and most
positive facts about the business right now. SQL-computed. No LLM.

**Priority logic:**
Line 1 (critical first): most urgent negative signal — OOS item with
high velocity, below-reorder item, alert, or if nothing critical: top
positive signal.
Line 2: next most important fact, different category from Line 1.

**Real examples from current Medi Rec data:**
- `⚠ Pre-Rolls critically low · 2 units ›`
- `▲ THC Distillate #1 · R18,750 MTD ›`

Or on a good day:
- `▲ R13,520 today · 67% of best day pace ›`
- `▲ Concentrates 73.6% margin · best category ›`

**Clicking an IntelLine opens NuAi panel pre-loaded with that specific
insight as the brief focus.** Not a generic panel — the brief has already
run the relevant queries for that specific fact.

**Refresh:** Every 5 minutes via setInterval. Visual fade-swap transition.

---

### Surface 3 — NuAi Mark (bottom strip)

**What it is:** The bottom-most element of the sidebar. Always visible.
Shows the NuAi brand mark + single most important business fact right now.

**Format:** `Nu[Ai] | ▲ R13,520 today · 67% of best`

Single line. The metric rotates every 30 seconds through:
1. Today's revenue vs best day
2. MTD revenue (ex-VAT)
3. Top product MTD
4. Stock health (all clear or X items need attention)

**Clicking anywhere on the mark opens the NuAi panel.**
This is the only way to open NuAi intentionally (beyond clicking IntelLines).

---

### Surface 4 — IntelStrip (top of content, per-tab)

**What it is:** A horizontal strip of 4–6 pills that sits between the
tab bar and the page content. Changes when the tab changes. SQL-computed.
Specific to the section and tab you are currently on.

**No LLM. Each pill is one SQL query result.**

**Pills per tab:**

STOCK (overview):
- Total SKUs: 186
- Stock value: R15,025
- Below reorder: 6 (amber)
- Out of stock: 1 (red)
- Best margin cat: Edibles 75% (green)

CATALOG:
- Active items: 186
- With sell price: 140
- No price set: 46 (amber)
- Avg margin: 68.4%

PURCHASE ORDERS:
- Open POs: 2
- Overdue: 2 (red)
- Total PO value: Rx
- Suppliers on file: 0 (red — critical gap)

DAILY TRADING:
- Today orders: 10
- Today revenue: R13,520
- Avg basket: R1,352
- vs yesterday: +25% (green) or -12% (red)
- Units sold: X

P&L:
- Revenue MTD (ex-VAT): R133,693
- Expenses MTD: R74,000
- Gross profit: R42,320
- Margin: 36%

LOYALTY:
- Transactions MTD: 258
- Points issued: X
- Active customers (7d): X
- Churn risk: X (if > 0, amber)

CUSTOMERS:
- Total profiles: 51
- New this week: X
- Messages unread: X

EXPENSES:
- Total MTD: R74,000
- Entries: 47
- Missing VAT amount: 47 (red — GAP-03)
- Categories: X unique

VAT:
- Output MTD: R61,758
- Input MTD: R0 (red — GAP-03 surfaced)
- Net payable: R61,758
- Due: 31 Jul 2026

**Clicking any pill opens NuAi panel focused on that specific metric.**
The panel brief is pre-loaded with the detail for that pill.

---

### Surface 5 — NuAi Panel (pre-loaded brief)

**What it changes:** The panel no longer opens blank with 4 generic
suggested questions. It opens with a pre-computed brief already visible.
Chat for follow-up sits below the brief.

**Brief structure:**

```
✦ NuAi
[Tab] · Store Manager

── RIGHT NOW ──────────────────────────
⚠ [CRITICAL] Pre-Rolls: 2 units left.
  Selling 15/week. Out in ~1 day.
  [Draft PO →]

⚠ [WARNING] Badder 0.5g: 1 unit left.
  Fastest-moving concentrate. 15 sold MTD.

⚠ [DATA GAP] 52 accessories: R0 cost.
  Margin reports unreliable for this category.
  [Fix AVCO →]

── WORKING WELL ───────────────────────
✓ Edibles at 75% margin — best category.
  12 SKUs, all in stock.

✓ Flower fully stocked — 36 SKUs, R7,157 value.
  No action needed.

── ACTIONS ────────────────────────────
→ Raise a PO for Pre-Rolls + Badder today.
  [Draft PO →]

→ Fix accessory AVCO — 52 SKUs, P&L unreliable.
  [Show items →]

────────────────────────────────────────
[Ask about stock…              ↑]
```

**Brief is generated from:**
1. SQL queries (facts, counts, values) → instant
2. Optional LLM synthesis (one sentence per section) → only when needed

**Action buttons** in the brief fire `sendPrompt()` with a pre-loaded
specific question. User sees the question, hits send, NuAi answers with
full tool use and real data.

**The brief is tab-aware.** Open NuAi on Stock → stock brief. Open NuAi
on P&L → financial brief. The content changes based on where you are.

---

## NEW COMPONENTS

### useNavIntelligence.js (new hook)
Single hook. Runs ONE batched set of SQL queries on mount.
Returns an object consumed by NavSidebar and AIFixture.
Refreshes every 5 minutes via setInterval.
Stored in React Context at TenantPortal level — one fetch, shared everywhere.

```
{
  inventory: { belowReorder: 6, outOfStock: 1, badgeCount: 7, badgeVariant: 'amber' },
  sales: { todayOrders: 10, todayRevenue: 13520, badgeCount: 10, badgeVariant: 'info' },
  customers: { unreadMessages: 0, churnRisk: 0, badgeCount: 0 },
  reports: { openVatAlerts: 0, badgeCount: 0 },
  subItems: {
    stock: '6 below reorder',
    catalog: '186 active · 1 OOS',
    pos: 'R13,520 today',
    pl: '66.3% margin · R153k MTD',
    loyalty: '258 pts transactions MTD',
    expenses: 'R47k logged · 47 entries',
    vat: 'R61,758 output · due 31 Jul',
  },
  intelLines: [
    { text: 'Pre-Rolls critically low · 2 units', variant: 'danger', tabTarget: 'stock', context: 'pre-rolls-oos' },
    { text: 'THC Distillate #1 · R18,750 MTD', variant: 'success', tabTarget: 'pl', context: 'top-product' },
  ],
  nuaiMark: '▲ R13,520 today · 67% of best',
  lastRefreshed: Date,
}
```

**SQL queries this runs (all in one Promise.all):**
1. inventory: OOS + below reorder counts + best margin category
2. orders: today's revenue + count
3. orders: MTD revenue + count
4. inventory: top product MTD (from order_items join)
5. user_profiles: customer counts
6. system_alerts: unacknowledged critical count
7. inventory: sub-item insight strings

Total: 7 queries. All lightweight. Typically < 300ms.

---

### useIntelStrip.js (new hook)
Accepts `tabId` as parameter. Returns array of pills.
Runs when tabId changes. Tab-specific queries.
Returns: `[{ label, value, variant, onClick }]`

---

### IntelStrip.js (new component)
Renders the pills bar.
Sits between `.tab-row` and `.page-body` in TenantPortal content area.
Receives pills from useIntelStrip.
Clicking a pill calls `onPillClick(context)` which opens NuAi with that
context pre-loaded.

---

### NuAiBrief.js (new component)
Renders inside ProteaAI.js panel when isOpen = true.
Sits above the chat message list.
Receives briefData from useBrief hook.
Collapsed to 1 summary line after user sends first message.

---

### useBrief.js (new hook)
Runs when NuAi panel opens or tab changes.
Returns brief sections (right now / working well / actions).
SQL-computed facts + optional LLM synthesis.

---

### IntelligenceContext.js (new context)
Provider at TenantPortal level.
Wraps useNavIntelligence and exposes data to all children.
Prevents re-running queries on re-renders.
Single source of truth for all intelligence data in the portal.

---

## COMPONENTS CHANGED

### TenantPortal.js
- Import IntelligenceContext.Provider and wrap the whole layout
- Import IntelStrip and insert between tab row and content
- Remove PlatformBar import (Phase 5)
- Pass intelligence context to AIFixture and NavSidebar via context

### NavSidebar.js (for AppShell routes — admin, HQ, HR)
- Import useNavIntelligence
- Add badge rendering to nav section rows
- Add insight text to sub-items when sidebar is expanded

### AIFixture.js
- Remove the EF call for insight cycling (too slow, LLM not needed)
- Replace with IntelLines consuming data from IntelligenceContext
- NuAi mark shows live fact from context, not cycling marketing copy

### ProteaAI.js (LOCKED — str_replace only)
- Open state: render NuAiBrief above empty message list
- After first user message: collapse brief to 1 summary line
- Remove static suggested questions array call on empty state
- When opened via pill click or IntelLine click: receive context prop

---

## COMPONENTS DEPRECATED

### PlatformBar.js
**Full deprecation — Phase 5.**
Before deprecation, each of its 4 jobs needs a new home:

| PlatformBar Job | New Home |
|---|---|
| System alerts (danger/warning) | NuAiBrief "right now" section + IntelLines |
| Comms (unread messages) | Nav badge on Customers section |
| Fraud (anomaly scores) | NuAiBrief "right now" section (shown when score > 85) |
| Actions (OOS, no price) | IntelStrip pills + NuAiBrief actions section |

PlatformBar stays in AppShell for /admin, /hq, /hr routes initially.
TenantPortal removes it in Phase 5.
Full deprecation in a future session after all jobs are covered.

---

## DATA ARCHITECTURE

### What is SQL-computed (zero LLM cost):
- All nav badge counts
- All sub-item insight strings
- All IntelStrip pill values
- All IntelLines text
- NuAi mark bottom text
- Brief facts (numbers, counts, names)

### What uses LLM (ai-copilot EF):
- Brief interpretation sentences ("At current pace, out in ~1 day")
- Action button suggestions ("Raise a PO for Pre-Rolls + Badder today")
- Follow-up chat depth
- Pre-loaded questions fired from action buttons

### LLM call reduction:
Current: every panel open → LLM call (tool loop, 3-8 seconds).
AINS: panel open → SQL brief loads instantly → LLM only if user asks.
Result: most users get a complete intelligence experience with 0 LLM calls.
LLM activates only when depth is needed.

---

## BUILD PHASES

### Phase 1 — Intelligence Foundation (hooks + context)
**What ships:** No visible UI change. Just the data layer.
- IntelligenceContext.js
- useNavIntelligence.js (7 SQL queries, cache, refresh)
- Provider added to TenantPortal
Files: src/contexts/IntelligenceContext.js · src/hooks/useNavIntelligence.js

### Phase 2 — Sidebar Intelligence
**What ships:** Nav items show live counts. Sub-items show insight text.
- Update AIFixture.js — remove EF call, wire to context
- Update NavSidebar.js — add badges and sub-item insight text
Files: src/components/AIFixture.js · src/components/NavSidebar.js

### Phase 3 — IntelStrip
**What ships:** Pills bar appears between tabs and content on every tab.
- useIntelStrip.js
- IntelStrip.js
- TenantPortal.js: insert IntelStrip between tab row and content
Files: src/hooks/useIntelStrip.js · src/components/IntelStrip.js · src/pages/TenantPortal.js

### Phase 4 — NuAi Panel Brief
**What ships:** Panel opens with pre-loaded brief, not blank.
- useBrief.js
- NuAiBrief.js
- ProteaAI.js: replace empty state with NuAiBrief component
Files: src/hooks/useBrief.js · src/components/NuAiBrief.js · src/components/ProteaAI.js (str_replace)

### Phase 5 — PlatformBar Migration
**What ships:** PlatformBar removed from TenantPortal. All its jobs covered.
- Comms badge wired to nav
- Fraud signals in NuAi brief
- Action items in IntelStrip
- PlatformBar import removed from TenantPortal.js
Files: src/pages/TenantPortal.js

### Phase 6 — Click-Through Depth
**What ships:** Clicking a pill or IntelLine opens NuAi focused on that context.
- ProteaAI.js: add `briefContext` prop
- IntelStrip: call onPillClick
- AIFixture IntelLines: call onLineClick
- TenantPortal: wire click handlers to setAiOpen + setBriefContext
Files: src/pages/TenantPortal.js · src/components/IntelStrip.js · src/components/AIFixture.js · src/components/ProteaAI.js (str_replace)

---

## DECISION LOG

### D1: All intelligence is SQL, not LLM
Rationale: The data is good enough. LLM for counting and aggregation is
wasteful, slow, and unreliable. SQL is instant, free, and correct.
LLM reserved for interpretation and follow-up only.

### D2: IntelligenceContext at TenantPortal level
Rationale: NavSidebar, AIFixture, IntelStrip, and NuAiBrief all need the
same data. One fetch shared via context is faster and simpler than each
component fetching independently.

### D3: PlatformBar deprecated, not deleted
Rationale: PlatformBar still lives in AppShell routes (/admin, /hq, /hr).
Only TenantPortal removes it in Phase 5. Full deletion later.

### D4: Sub-item insight text is display-only (no click)
Rationale: Sub-items already navigate. Adding click-to-NuAi creates
competing interactions. The text is passive. Clicking the sub-item
navigates, clicking an IntelLine opens NuAi. Clean separation.

### D5: NuAiBrief collapses after first user message
Rationale: Once the user starts chatting, the brief is no longer the
primary surface — the conversation is. Brief shrinks to a 1-line summary
so the chat takes over without the brief taking up space.

---

## WHAT THIS SYSTEM IS NOT

- Not a replacement for the nav structure — the waterfall nav stays
- Not a chatbot replacement — chat remains for depth
- Not real-time (WebSocket) — 5 minute refresh cadence is right
- Not AI-generated nav labels — SQL labels only, no hallucination risk
- Not a notification center — notifications stay out of this system
- Not mobile-first — sidebar pattern is desktop, mobile gets simplified

---

## SUCCESS CRITERIA

Phase 1 complete: IntelligenceContext loads 7 SQL queries < 300ms.
Phase 2 complete: Nav badges show correct live counts without any interaction.
Phase 3 complete: Navigating to Stock tab shows 5 correct pills instantly.
Phase 4 complete: Opening NuAi on Stock shows pre-loaded brief with real
  numbers before any user input. No blank state.
Phase 5 complete: PlatformBar removed from TenantPortal. No functional loss.
Phase 6 complete: Clicking "6 below reorder" pill opens NuAi with a brief
  specifically about those 6 items, ready to take action.

Full system complete: A user can open the platform, read the sidebar, read the
IntelStrip, and know the most important things about their business — without
typing a single thing and without waiting for a single LLM call.

---

## FILE MAP

| File | Phase | Action |
|---|---|---|
| src/contexts/IntelligenceContext.js | 1 | CREATE |
| src/hooks/useNavIntelligence.js | 1 | CREATE |
| src/hooks/useIntelStrip.js | 3 | CREATE |
| src/hooks/useBrief.js | 4 | CREATE |
| src/components/IntelStrip.js | 3 | CREATE |
| src/components/NuAiBrief.js | 4 | CREATE |
| src/components/AIFixture.js | 2 | MODIFY |
| src/components/NavSidebar.js | 2 | MODIFY |
| src/components/ProteaAI.js | 4,6 | str_replace ONLY (LOCKED) |
| src/pages/TenantPortal.js | 3,5,6 | MODIFY |
| src/components/PlatformBar.js | 5 | KEEP — TenantPortal removes import |

---
*WP-AINS v1.0 · NuAi · 10 Apr 2026*
*Ambient Intelligence Navigation System*
*6 phases · 6 new files · 5 modified · 1 deprecated from TenantPortal*
