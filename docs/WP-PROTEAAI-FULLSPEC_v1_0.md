# WP-PROTEAAI-FULLSPEC v1.0
## ProteaAI — Full Intelligence Upgrade
## Status: READY TO BUILD · Produced: 09 Apr 2026
## Prerequisite: ProteaAI v1.3 complete (5e47a96) — Dev tab removed, 2-tab UI

---

## WHAT THIS WP DELIVERS

ProteaAI currently has two tabs (Chat, Query) that work but operate
in isolation — Chat has shallow context, Query has no financial tables,
and the AI waits passively to be asked. It has no memory, no tool use,
no proactive intelligence, no ability to act.

This WP upgrades ProteaAI from a sidebar chatbot into the platform's
central intelligence and operations layer — the business equivalent of
a senior analyst who knows every number, can query any table, can draft
actions for owner approval, and surfaces problems before being asked.

Five phases. Each phase is independent and deliverable in isolation.
Phase 1 is the most impactful. Phase 5 is the most transformational.

---

## CURRENT STATE (after v1.3)

| Component | Status |
|---|---|
| Chat tab | ✅ Working — context-aware, role-aware, tab-aware |
| Query tab | ✅ Working — 49 tables, financial tables now included |
| Financial context in Chat | ✅ Working — MTD revenue, expenses, VAT position loaded |
| Dev tab | ✅ Removed — Claude Code handles dev |
| CODEBASE_FACTS | ✅ Current — EF versions, FIN-AUDIT gaps, platform scale |
| Streaming | ❌ Fake — dumps full response, no real SSE |
| Tool use | ❌ None — static context snapshot only |
| Proactive insights | ❌ None — reactive only |
| Action capability | ❌ None — read only |
| Persistent memory | ❌ None — resets on panel close |
| Financial health check | ❌ None — manual via FIN-AUDIT script |

---

## PHASE 1 — Real Streaming
### Effort: 2 sessions · Priority: HIGH · Impact: Immediate UX

### What it fixes
The AI currently waits for the full response then dumps all text at once.
A 200-word response takes 3-4 seconds of silence then appears instantly.
Real streaming means the first word appears in ~300ms and builds word by word.
This transforms ProteaAI from a slow API call into something that feels alive.

### Architecture change

**ai-copilot EF (v59 → v60):**
Modify to stream SSE (Server-Sent Events) instead of returning JSON blob.
```typescript
// Current (v59):
return new Response(JSON.stringify({ reply: fullText }), headers);

// New (v60) — stream SSE:
const stream = new ReadableStream({
  async start(controller) {
    const enc = new TextEncoder();
    const claudeStream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01",
                 "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, stream: true }),
    });
    const reader = claudeStream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) { controller.enqueue(enc.encode("data: [DONE]\n\n")); break; }
      const chunk = new TextDecoder().decode(value);
      // Parse SSE events from Anthropic, extract delta text
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "content_block_delta" && evt.delta?.text) {
              controller.enqueue(enc.encode(`data: ${JSON.stringify({ token: evt.delta.text })}\n\n`));
            }
          } catch {}
        }
      }
    }
    controller.close();
  }
});
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache",
             "Access-Control-Allow-Origin": "*" }
});
```

**ProteaAI.js (v1.3 → v1.4) — handleSend:**
```javascript
// Replace the fetch + efData parsing with a streaming reader:
const res = await fetch(`${SUPA}/functions/v1/ai-copilot`, { ... });
const reader = res.body.getReader();
const dec = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += dec.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop(); // keep incomplete line
  for (const line of lines) {
    if (line.startsWith("data: ") && line !== "data: [DONE]") {
      try {
        const { token } = JSON.parse(line.slice(6));
        setMessages(p => p.map(m =>
          m.id === aid ? { ...m, content: m.content + token } : m
        ));
      } catch {}
    }
  }
}
// Mark streaming done
setMessages(p => p.map(m =>
  m.id === aid ? { ...m, streaming: false } : m
));
```

### Fallback
If the EF streaming response fails, fall back to the current JSON response
pattern as a catch. The Query tab does NOT stream (structured JSON response
must be parseable) — streaming applies to Chat tab only.

### Files changed
- `supabase/functions/ai-copilot/index.ts` — v60, SSE streaming
- `src/components/ProteaAI.js` — v1.4, streaming reader in handleSend

---

## PHASE 2 — Tool Use (The Core Architecture Upgrade)
### Effort: 3 sessions · Priority: HIGH · Impact: Transformational

### What it fixes
Currently: AI has a pre-loaded static context snapshot. If the snapshot
is incomplete or stale, every answer is wrong or vague.

With tool use: AI has no pre-loaded data. It has tools. When a question
requires data, it calls the tool, gets real-time results, synthesises,
and continues. Multi-step questions trigger multiple tool calls. The AI
knows exactly what's in the system because it can look.

### How Claude tool use works
User: "What's my VAT position this period?"
→ Claude decides: I need vat_transactions data
→ Claude emits: tool_use { name: "query_db", input: { table: "vat_transactions", ... } }
→ EF runs query, returns rows
→ Claude receives: tool_result { rows: [...] }
→ Claude synthesises: "Your P3 VAT position is: output R18,400 · input R4,200 · net payable R14,200"
→ Claude may call another tool: "I'll also check if this period is filed"
→ Claude emits: tool_use { name: "query_db", input: { table: "vat_period_filings", ... } }
→ Final answer: "P3 payable R14,200 — not yet filed, due 31 Jul 2026"

### Tool definitions (ai-copilot EF)
```typescript
const TOOLS = [
  {
    name: "query_db",
    description: "Query any table in the NuAi database. Read-only. Always filter by tenant_id.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name from: " + KNOWN_TABLES },
        columns: { type: "string", description: "Comma-separated columns or * for all" },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              op: { type: "string", enum: ["eq","neq","gt","gte","lt","lte","is","in","ilike"] },
              value: {}
            }
          }
        },
        order: {
          type: "object",
          properties: {
            column: { type: "string" },
            ascending: { type: "boolean" }
          }
        },
        limit: { type: "integer", maximum: 100 }
      },
      required: ["table"]
    }
  },
  {
    name: "summarise_financials",
    description: "Get a real-time financial summary: MTD revenue (ex-VAT), expenses, gross profit estimate, VAT position.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["mtd", "ytd", "last_month"], description: "Time period" }
      },
      required: ["period"]
    }
  },
  {
    name: "get_alerts",
    description: "Get current unacknowledged system alerts and low stock items.",
    input_schema: { type: "object", properties: {} }
  }
];
```

### Tool execution loop (ai-copilot EF)
```typescript
async function runWithTools(messages, system, tenantId, db) {
  let response = await claudeApi({ messages, system, tools: TOOLS, max_tokens: 2000 });
  
  // Agentic loop — keep running until Claude stops calling tools
  while (response.stop_reason === "tool_use") {
    const toolUses = response.content.filter(b => b.type === "tool_use");
    const toolResults = await Promise.all(toolUses.map(async (tu) => {
      let result;
      try {
        if (tu.name === "query_db") {
          result = await executeDbQuery(tu.input, tenantId, db);
        } else if (tu.name === "summarise_financials") {
          result = await getFinancialSummary(tu.input.period, tenantId, db);
        } else if (tu.name === "get_alerts") {
          result = await getAlerts(tenantId, db);
        }
      } catch (e) {
        result = { error: e.message };
      }
      return {
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result)
      };
    }));
    
    // Continue conversation with tool results
    messages = [
      ...messages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults }
    ];
    response = await claudeApi({ messages, system, tools: TOOLS, max_tokens: 2000 });
  }
  
  // Extract final text response
  const textBlock = response.content.find(b => b.type === "text");
  return textBlock?.text || "";
}
```

### Security — tool use is read-only
- `executeDbQuery` enforces `tenant_id = tenantId` on every query
- No INSERT, UPDATE, DELETE in any tool function
- Max limit: 100 rows per tool call
- Table allowlist: same as KNOWN_TABLES in ProteaAI.js

### ProteaAI.js changes
- Remove `buildContext()` pre-loading for HQ Chat (context now fetched by tools)
- Keep context strip but update it: show "tools active" instead of loaded keys
- Remove financial context pre-fetch (tools handle this on demand)
- Keep stock/alerts pre-fetch as a lightweight warm-up
- Non-HQ roles: keep pre-loading (no tool use for non-HQ)

### Files changed
- `supabase/functions/ai-copilot/index.ts` — v61, tool use loop + 3 tools
- `src/components/ProteaAI.js` — v1.5, remove HQ pre-load, show tool activity

---

## PHASE 3 — Financial Health Check Command
### Effort: 1 session · Priority: MEDIUM · Impact: High operational value

### What it fixes
The FIN-AUDIT we ran today required Claude Code, grep commands, and
Supabase SQL queries. It produced a 10-gap audit document. This phase
makes that same audit runnable from inside ProteaAI Chat with a single
command — and keeps it running on every new session.

### Command
User: "/healthcheck" or "Run a financial health check"

### What ProteaAI checks (10 automated checks)
Each check queries the live DB via tool use and returns pass/warn/fail:

CHECK 01: Revenue VAT treatment
Query: orders.total vs order_items AVCO comparison
Pass: revenue divided by 1.15 before P&L display
Fail: revenue includes VAT (current state — GAP-01)

CHECK 02: Journal entries flowing to P&L
Query: journal_entries count where status='posted'
+ check if HQProfitLoss queries journal_entries
Pass: journals integrated with P&L
Fail: journals isolated (current state — GAP-02)

CHECK 03: Expense VAT completeness
Query: COUNT(*) from expenses WHERE input_vat_amount = 0 OR input_vat_amount IS NULL
Pass: < 10% of expenses missing VAT
Warn: 10-30% missing
Fail: > 30% missing (current state — 100% — GAP-03)

CHECK 04: Depreciation currency
Query: COUNT(*) from depreciation_entries
+ COUNT(*) from fixed_assets WHERE is_active = true
Pass: depreciation_entries > 0 for all active assets
Fail: no entries despite assets present (current state — GAP-04)

CHECK 05: AVCO integrity
Query: COUNT(*) from inventory_items
WHERE (weighted_avg_cost IS NULL OR weighted_avg_cost = 0) AND is_active = true
Pass: 0 items missing AVCO
Fail: any items missing AVCO

CHECK 06: VAT pipeline completeness
Query: vat_transactions grouped by source_table
Pass: entries from expenses, stock_receipts, capture_queue
Warn: only one source active

CHECK 07: Bank recon currency
Query: MAX(created_at) from bank_statement_lines
Pass: lines exist and recent
Warn: no lines in 30 days

CHECK 08: Year-end status
Query: equity_ledger.year_closed
Pass: prior year closed
Warn: prior year still open

CHECK 09: Smart Capture backlog
Query: COUNT(*) from capture_queue WHERE status = 'pending_review'
Pass: 0 pending
Warn: 1-5 pending
Fail: > 5 pending

CHECK 10: Supabase backup status
External: cannot query — surfaces the known owner action
Output: "OWNER ACTION: Enable Supabase backups in Settings → Add-ons"

### Output format in Chat
```
✦ Financial Health Check — 09 Apr 2026

CRITICAL (2):
  ❌ GAP-01: Revenue includes VAT — P&L overstated ~15%
  ❌ GAP-02: 5 posted journals invisible to P&L and Balance Sheet

WARNINGS (2):
  ⚠️  GAP-03: 47/47 expenses have R0 input VAT — claim may be understated
  ⚠️  GAP-04: Depreciation not run — 3 assets, 0 entries

PASSING (5):
  ✅ AVCO: all 186 active items have weighted_avg_cost
  ✅ VAT pipeline: all 3 entry points active
  �� Smart Capture: 0 documents pending review
  ✅ Bank recon: FNB lines present
  ✅ Financial setup: complete

OWNER ACTIONS (1):
  📌 Enable Supabase backups — Settings → Add-ons (no backups running)

Run again: type /healthcheck
Fix critical gaps: type /fix-revenue-vat or /fix-journals
```

### Implementation
- Trigger detection in handleSend: if text starts with `/healthcheck` or
  matches "health check|financial audit|fin audit" regex
- Run 9 tool calls in parallel via Promise.all
- Format results as structured output
- No new EF needed — runs through existing tool use (Phase 2 dependency)
  OR as a standalone set of Supabase queries if Phase 2 not yet deployed

### Files changed (standalone — no Phase 2 dependency)
- `src/components/ProteaAI.js` — v1.6, `/healthcheck` command handler
  with direct Supabase queries (no tool use needed)

---

## PHASE 4 — Action Layer (Propose → Confirm → Write)
### Effort: 2 sessions · Priority: MEDIUM · Impact: Operational efficiency

### What it fixes
ProteaAI is read-only. The user must navigate to the right module,
find the right form, and fill it in. The AI can see what needs doing
but cannot do it. This phase gives ProteaAI the ability to propose
specific database writes that the user approves with one click.

### Principles
1. AI NEVER writes autonomously. Always: Propose → User confirms → Write.
2. Every action is reversible or auditable.
3. Actions limited to a specific allowlist.
4. Failed actions report clearly — no silent failures.

### Action allowlist (Phase 4 scope)

ACTION 01: create_expense
Trigger: "Create an expense for..." or "Add expense..."
Data collected by AI: date, category, subcategory, amount_zar, description, supplier_id
Write: expenses INSERT (triggers expense_vat_sync automatically)
Confirm UI: expense card with [Confirm] [Edit] [Cancel]

ACTION 02: set_reorder_level
Trigger: "Set reorder level for [item] to [quantity]"
Data: item_id (from name match), new reorder_level
Write: inventory_items UPDATE SET reorder_level = n WHERE id = item_id
Confirm UI: "Set [item name] reorder level to [n]?" with [Confirm] [Cancel]

ACTION 03: flag_document
Trigger: "Flag [document] for review" or "Hold that Smart Capture"
Data: document_log_id or capture_queue_id
Write: capture_queue UPDATE SET status = 'flagged' WHERE id = id
Confirm UI: "Flag document [ref] for manual review?" with [Confirm] [Cancel]

ACTION 04: send_whatsapp
Trigger: "Send [customer] a WhatsApp" or "Notify [customer] about..."
Data: user_profile_id, template_type, variables
Write: calls send-notification EF (already live)
Confirm UI: message preview with [Send] [Cancel]

ACTION 05: acknowledge_alert
Trigger: "Acknowledge that alert" or "Clear the [alert type] alert"
Data: system_alert_id
Write: system_alerts UPDATE SET acknowledged_at = now() WHERE id = id
Confirm UI: "Acknowledge alert: [message]?" with [Confirm] [Cancel]

### UI — Confirm card component (new)
```jsx
// Renders below AI message when an action is proposed
function ActionConfirmCard({ action, onConfirm, onCancel }) {
  return (
    <div style={{ border: `1px solid ${T.accentBd}`, borderRadius: 10,
                  padding: "12px 14px", background: T.accentLit, marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 8 }}>
        ✦ Proposed Action — {action.label}
      </div>
      {/* Render action-specific preview */}
      <ActionPreview action={action} />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onConfirm} style={confirmBtnStyle}>✓ Confirm</button>
        <button onClick={onCancel}  style={cancelBtnStyle}>✕ Cancel</button>
      </div>
    </div>
  );
}
```

### Action detection (handleSend)
When Claude's response includes a structured action block `[ACTION:type:json]`,
ProteaAI intercepts it before rendering, strips the action block from the
displayed message, and renders the ActionConfirmCard below the response.

The system prompt instructs Claude:
```
When the user clearly requests a specific action you can perform, respond with:
Your normal helpful message...
[ACTION:create_expense:{"date":"2026-04-09","category":"opex","subcategory":"Shipping","amount_zar":850,"description":"Courier — ShipLogic"}]

Available actions: create_expense | set_reorder_level | flag_document | send_whatsapp | acknowledge_alert
Only propose an action if the user's intent is clear and specific.
Always confirm the details in your message before proposing the action block.
```

### Files changed
- `src/components/ProteaAI.js` — v1.7, action detection + ActionConfirmCard
- `src/components/ProteaAI.js` — action execution functions (one per action type)
- `supabase/functions/ai-copilot/index.ts` — system prompt updated with action instructions

---

## PHASE 5 — Persistent AI Memory
### Effort: 2 sessions · Priority: LOWER · Impact: Long-term compound value

### What it fixes
Every ProteaAI conversation starts from zero. The AI doesn't know that
Medi Rec is on hold, that the depreciation needs catching up, that wages
are entered manually, or that WP-REORDER is the next priority. This
institutional knowledge is rebuilt from scratch every session — or lost.

Persistent memory means the AI accumulates context over time. Facts
confirmed by the owner persist across sessions. The AI behaves like it
has been in the room for the past six months.

### DB schema — new table
```sql
CREATE TABLE proteaai_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  memory_type     TEXT NOT NULL,  -- 'decision', 'preference', 'known_issue', 'context', 'task'
  key             TEXT NOT NULL,  -- short identifier, e.g. 'medi_rec_status'
  value           TEXT NOT NULL,  -- the fact, e.g. 'ON HOLD until further notice'
  source          TEXT,           -- 'owner_confirmed', 'ai_derived', 'system'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  confirmed_at    TIMESTAMPTZ,    -- when owner explicitly confirmed this fact
  expires_at      TIMESTAMPTZ,    -- optional TTL
  UNIQUE(tenant_id, key)
);

-- RLS
ALTER TABLE proteaai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON proteaai_memory
  FOR ALL USING (tenant_id = user_tenant_id());
CREATE POLICY "hq_all_proteaai_memory" ON proteaai_memory
  FOR ALL TO public USING (is_hq_user());
```

### Memory types

| Type | Example key | Example value |
|---|---|---|
| decision | medi_rec_status | "ON HOLD until CA presentation outcome" |
| decision | wp_priority | "WP-REORDER Phase 1 — next after ProteaAI" |
| known_issue | depreciation | "Not run — 23 months outstanding, 3 assets" |
| known_issue | revenue_vat | "P&L revenue is VAT-inclusive — GAP-01 fix pending" |
| preference | revenue_display | "Always show ex-VAT in chat responses" |
| context | wages_entry | "Wages entered manually as opex expenses — no payroll integration" |
| task | owner_action_backups | "Supabase backups not enabled — owner must do Settings → Add-ons" |

### Memory loading
At Chat tab open, ProteaAI loads memories for the tenant:
```javascript
const { data: memories } = await supabase
  .from("proteaai_memory")
  .select("key, value, memory_type, source")
  .eq("tenant_id", tenantId)
  .is("expires_at", null)  // or expires_at > now()
  .order("memory_type");

// Append to system prompt:
const memoryBlock = memories?.length > 0
  ? `\n\nPERSISTED MEMORY (confirmed facts about this business):\n${
      memories.map(m => `[${m.memory_type.toUpperCase()}] ${m.key}: ${m.value}`).join("\n")
    }`
  : "";
```

### Memory creation
Triggered two ways:
1. **Owner command**: "Remember that Medi Rec is on hold"
   → AI proposes memory entry → owner confirms → saved
2. **AI derives**: When the AI encounters a notable fact during conversation
   → AI may propose: "Should I remember that wages are entered manually?"
   → Owner clicks "Yes, remember this"

### Memory management command
`/memory` — shows all current memories with edit/delete controls

### Files changed
- `supabase/migrations/` — proteaai_memory table + RLS
- `src/components/ProteaAI.js` — v1.8, memory loading + memory creation UI
- `supabase/functions/ai-copilot/index.ts` — memory appended to system prompt

---

## PHASE 6 — Proactive Business Brief
### Effort: 1 session · Priority: MEDIUM · Impact: High daily value

### What it fixes
ProteaAI is reactive. It waits to be asked. The business generates
events constantly — new orders, stock alerts, loyalty tier upgrades,
approaching VAT deadlines — and none of them surface unless the owner
navigates to the right screen.

A nightly brief surfaces the important ones automatically.

### Implementation
Extend the existing `loyalty-ai` EF pattern (which already runs nightly
via pg_cron) OR create a new `proteaai-brief` EF.

The brief runs nightly at 06:00 (SA time) and writes to a new
`proteaai_brief` table. When ProteaAI opens in the morning, the Chat tab
shows the brief as the first message (if generated today).

### Brief structure
```
✦ Morning Brief — 09 Apr 2026

YESTERDAY:
  · Revenue: R1,240 (3 orders) · MTD: R47,200
  · 2 Smart Capture documents approved

TODAY:
  · VAT P3 due in 52 days — net payable R14,200
  · 2 items below reorder level (Grape Terpene · Hardware X)
  · 1 purchase order expected arrival today (PO-2026-008)

ATTENTION:
  · 47 expenses have R0 input VAT — VAT may be under-claimed
  · Depreciation not run — 23 months outstanding

LOYALTY ENGINE: ran at 02:00 · 3 churn rescue offers sent · 0 tier upgrades
```

### New DB table
```sql
CREATE TABLE proteaai_brief (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  brief_date  DATE NOT NULL,
  content     TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, brief_date)
);
```

### Files changed
- `supabase/migrations/` — proteaai_brief table
- `supabase/functions/proteaai-brief/index.ts` — new EF
- `src/components/ProteaAI.js` — v1.9, load and display daily brief on open

---

## IMPLEMENTATION DEPENDENCIES

Phase 1 (Streaming)        — standalone, no dependencies
Phase 2 (Tool Use)         — standalone, replaces Phase 1 for non-streaming queries
Phase 3 (Health Check)     — can run standalone OR on top of Phase 2 tools
Phase 4 (Actions)          — requires Phase 2 (tool use for data lookups during action prep)
Phase 5 (Memory)           — standalone, DB migration required
Phase 6 (Brief)            — standalone, new EF

Recommended build order: 1 → 2 → 3 → 5 → 6 → 4

---

## BUILD SEQUENCE — SESSION BY SESSION

### Session A: Phase 1 — Streaming (2 sessions)
- Read ai-copilot/index.ts current state
- Session A1: Modify EF to stream SSE
- Session A2: Modify ProteaAI.js handleSend to consume SSE stream
- Deploy EF, build, commit

### Session B: Phase 2 — Tool Use (3 sessions)
- Session B1: Design tool schemas, executeDbQuery function in EF
- Session B2: Agentic tool loop in EF, test with simple queries
- Session B3: ProteaAI.js changes (remove HQ pre-load, tool activity indicator)
- Deploy EF v61, build, commit

### Session C: Phase 3 — Health Check (1 session)
- Add /healthcheck command handler to ProteaAI.js
- Run 9 Supabase checks in parallel
- Format structured output
- Build, commit

### Session D: Phase 5 — Memory (2 sessions)
- Session D1: DB migration, memory loading in Chat
- Session D2: Memory creation UI, /memory command
- Build, commit

### Session E: Phase 6 — Brief (1 session)
- proteaai-brief EF + DB table
- ProteaAI.js brief display on open
- Add to pg_cron schedule
- Deploy, build, commit

### Session F: Phase 4 — Actions (2 sessions)
- Session F1: Action detection in handleSend, ActionConfirmCard UI
- Session F2: Action execution functions (5 actions), system prompt update
- Build, commit

---

## SUCCESS CRITERIA — EACH PHASE

### Phase 1 (Streaming)
- First token appears within 400ms of sending a message
- Text builds word by word, cursor animates during generation
- Query tab unaffected (still returns structured JSON)

### Phase 2 (Tool Use)
- "What's my VAT position this period?" → AI calls query_db, returns real numbers
- "Show me low stock" → AI calls get_alerts, returns specific items
- "What's my revenue this month?" → AI calls summarise_financials, returns ex-VAT figure
- No pre-loaded context needed for HQ Chat to answer financial questions

### Phase 3 (Health Check)
- `/healthcheck` returns 10-check report within 5 seconds
- Correctly identifies all 4 current gaps (GAP-01 through GAP-04)
- Passes on all items that are genuinely working

### Phase 4 (Actions)
- "Create an expense for R500 cleaning supplies" → AI proposes → Confirm → expense row exists in DB
- Proposed action card visible below AI message
- Confirm button writes to DB and shows success
- Cancel button dismisses without writing

### Phase 5 (Memory)
- "Remember that wages are entered manually" → Memory saved → Next session AI knows this
- /memory command shows all active memories
- Memory loads in system prompt on every Chat open

### Phase 6 (Brief)
- Brief visible as first Chat message when ProteaAI opens after 06:00
- Brief contains real numbers from DB, not hardcoded
- Brief includes loyalty AI action count from previous night

---

## FILES THAT WILL CHANGE

| File | Phases | Change type |
|---|---|---|
| supabase/functions/ai-copilot/index.ts | 1, 2, 4 | Major — streaming + tools + action prompts |
| supabase/functions/proteaai-brief/index.ts | 6 | New EF |
| src/components/ProteaAI.js | 1, 2, 3, 4, 5, 6 | LOCKED — str_replace only per phase |
| supabase/migrations/ | 5, 6 | 2 new tables: proteaai_memory, proteaai_brief |

**ProteaAI.js version progression:**
v1.3 (current) → v1.4 (streaming) → v1.5 (tool use) → v1.6 (health check)
→ v1.7 (actions) → v1.8 (memory) → v1.9 (brief)

---

## WHAT NOT TO BUILD (OUT OF SCOPE)

- Voice input/output — future consideration
- Autonomous writes without owner confirmation — never
- External API calls from ProteaAI directly — all AI via ai-copilot EF
- Training or fine-tuning — Anthropic API only
- Multi-model switching in UI — model selection remains internal
- ProteaAI for non-HQ roles getting tool use — Chat only, pre-loaded context

---

## OWNER ACTIONS REQUIRED BEFORE PHASE 2

1. pg_cron must be enabled in Supabase for Phase 6 (brief scheduling)
2. No other owner actions required for Phases 1-5

---

## RELATIONSHIP TO FIN-AUDIT GAPS

Once Phase 2 (Tool Use) is deployed, the following FIN-AUDIT gaps
become self-diagnosable by ProteaAI without any manual audit script:

| Gap | How ProteaAI detects it |
|---|---|
| GAP-01: Revenue VAT-inclusive | Compares orders.total to orders.total/1.15, flags discrepancy |
| GAP-02: Journals not in P&L | Queries journal_entries count, cross-checks P&L source tables |
| GAP-03: Expenses R0 VAT | Queries expenses WHERE input_vat_amount = 0, reports count |
| GAP-04: Depreciation not run | Queries depreciation_entries count vs fixed_assets count |

---
*WP-PROTEAAI-FULLSPEC v1.0 · NuAi · 09 Apr 2026*
*ProteaAI v1.3 is the baseline. Six phases, six upgrades.*
*Phase 1 (streaming) and Phase 3 (health check) are the fastest wins.*
*Phase 2 (tool use) is the architectural upgrade that changes everything.*
