# SESSION-STATE v218
## NuAi ERP — Session Close
## Date: 09 Apr 2026

---

## HEAD AFTER THIS SESSION

Commits this session (chronological):
- e7bdf2d — Fix: quantity_on_hand column + admin financial context
- b5a7c0a — ProteaAI v1.5 + ai-copilot v62 (Phase 2 tool use)
- b68c627 — Dual-loop streaming renderer (superseded)
- 60cd2bd — flushSync per chunk streaming (superseded)
- eb3fee3 — RAF-based streaming renderer (superseded)
- 629a6dc — flushSync per token (superseded)
- 75d5d05 — requestAnimationFrame yield between tokens
- a2ae7ee — setTimeout(80ms) pacing — FINAL WORKING STREAMING ✅
- [this commit] — ai-copilot v67 sync + session docs

---

## WHAT WAS BUILT THIS SESSION

### 1. Bug Fix: quantity_on_hand column (e7bdf2d) ✅
ProteaAI buildContext used `on_hand_qty` which does not exist in inventory_items.
Column is `quantity_on_hand`. Supabase returned 400, AI reported 0 items in stock.
Also fixed: financial context now loads for admin role (was isHQ only).

### 2. ProteaAI Phase 2 — Tool Use (b5a7c0a) ✅
ai-copilot v62 deployed and synced:
- HQ/admin non-trivial messages → runToolLoop (non-streamed) → streamSynthesis (SSE)
- 3 tools: query_database (49-table allowlist), get_financial_summary, get_alerts
- Trivial/non-HQ messages → streamDirect (no tool overhead)
ProteaAI v1.5:
- "✦ tools active" context strip for HQ/admin
- System prompt tells AI it has tools and to use them proactively

### 3. Streaming Fix — 9 Attempts, Final Solution ✅

FAILED approaches:
- Dual-loop setTimeout(33ms): React 18 batches ALL updates including setTimeout
- flushSync per chunk: chunks too large (sentence-level jumps)
- RAF drain at 60fps: still chunk-sized batches
- flushSync per token: browser only paints after JS yields — all tokens in
  one reader.read() chunk still appear together
- EF setTimeout(0) between writes: Deno TCP buffering ignores it
- EF 15ms between writes: still buffers at TCP level

WORKING SOLUTION (a2ae7ee):
Architecture: EF computes full response, emits word by word from its own loop.
No Anthropic stream relay. No TCP buffering problem because WE are the source.

EF (v67): streamWords emits word+space as one SSE token every 100ms
Client (a2ae7ee): flushSync per token + setTimeout(80ms) pacing between words
Result: ~10-12 words/second, smooth, consistent regardless of network conditions

Also fixed by this architecture:
- Tool XML leaking: streamSynthesis was calling Claude without tools schema,
  causing raw <function_calls> XML to render in chat. Removed in v65.

### 4. get_sales_breakdown Tool (v66) ✅
New tool that joins orders→order_items server-side.
Handles: best sellers, product sales ranking, weekly/monthly by product.
order_items columns: id, order_id, product_name, quantity, unit_price, line_total
Previously Claude hit MAX_TOOL_ROUNDS trying to manually join tables.
MAX_TOOL_ROUNDS increased from 5 to 8.

### 5. Sim Sales Data — Today (09 Apr) ✅
8 orders inserted directly via SQL (R10,805 total) for Medi Rec.
SIM-260409-0801 through SIM-260409-0808.

---

## CURRENT EF VERSIONS

| Function | Version | Status |
|---|---|---|
| ai-copilot | **v67** | ACTIVE — streamWords 100ms/word, tool loop, 4 tools |
| process-document | v53 | ACTIVE |
| auto-post-capture | v2 | ACTIVE |
| sim-pos-sales | v4 | ACTIVE — not scheduled |
| sign-qr | v36 | ACTIVE |
| verify-qr | v34 | ACTIVE |
| send-notification | v37 | ACTIVE |
| get-fx-rate | v35 | ACTIVE |
| payfast-checkout | v44 | ACTIVE |
| payfast-itn | v39 | ACTIVE |

---

## PROTEAAI STATUS (end of session)

### Working ✅
- Chat: real streaming word-by-word at ~10-12 words/second
- Chat: HQ/admin gets tool use — queries live DB mid-conversation
- Chat: 4 tools: query_database, get_financial_summary, get_alerts, get_sales_breakdown
- Chat: "✦ tools active" context strip
- Chat: system prompt tells AI it has tools and to use them
- Chat: financial + stock context pre-loaded in buildContext
- Chat: admin role gets financial context (fixed e7bdf2d)
- Query tab: 49-table allowlist, financial tables included
- Context: quantity_on_hand column fixed (was on_hand_qty)

### Not yet built (WP-PROTEAAI-FULLSPEC remaining phases)
- Phase 3: /healthcheck command (10 automated FIN-AUDIT checks)
- Phase 5: Persistent memory (proteaai_memory table)
- Phase 6: Proactive morning brief (proteaai-brief EF)
- Phase 4: Action layer (Propose→Confirm→Write, 5 actions)

---

## KNOWN ISSUES

### ai_usage_log 400
useAIUsage hook INSERT fails. Daily counter not tracking. Not blocking.

### sim-pos-sales not scheduled
Needs pg_cron. Today's data inserted manually via SQL.
SQL for schedule in NUAI-AGENT-BIBLE Section 8.

### Pure Premium THC Vapes — no order_items data
Orders exist (March sales) but order_items table has no rows for this tenant.
get_sales_breakdown returns "no line-item detail" — correct behavior.

### Revenue MTD shows R140,225 on dashboard but AI reports R116,320 ex-VAT
GAP-01 (FIN-AUDIT): dashboard shows VAT-inclusive, AI correctly divides by 1.15.
Dashboard fix: GAP-01 still pending (HQProfitLoss + HQFinancialStatements).

---

## NEXT PRIORITIES

### P1 — ProteaAI Phase 3: /healthcheck command
Read WP-PROTEAAI-FULLSPEC_v1_0.md Phase 3.
Standalone — no Phase 2 dependency. Direct Supabase queries.
10 checks: GAP-01 through GAP-04 + AVCO + VAT pipeline + bank recon + etc.

### P2 — FIN-AUDIT GAP-01: Revenue VAT
HQProfitLoss.js + HQFinancialStatements.js: ÷1.15 on revenue display.
~30 min fix. Read both files first (they are large).

### P3 — FIN-AUDIT GAP-02: Journals not in P&L
journal_entries not queried by HQProfitLoss or HQFinancialStatements.

### P4 — WP-REORDER Phase 1

---

## OWNER ACTIONS (URGENT)
- Supabase backups: Settings → Add-ons → Enable (NO BACKUPS RUNNING)
- sim-pos-sales: schedule via pg_cron (SQL in NUAI-AGENT-BIBLE Section 8)
- Run Depreciation: HQFixedAssets → catch up months outstanding (GAP-04)
- Expense VAT: Enter input_vat_amount on all 47 expenses (GAP-03)

---

## LOCKED FILES
src/components/StockItemModal.js · src/components/ProteaAI.js (str_replace only)
src/components/PlatformBar.js · src/services/supabaseClient.js

## PROTECTED FILES
src/components/hq/HQStock.js · src/components/hq/LiveFXBar.js

---
*SESSION-STATE v218 · NuAi · 09 Apr 2026*
*ProteaAI Phases 1 + 2 complete. Streaming solved. Next: Phase 3 healthcheck.*
