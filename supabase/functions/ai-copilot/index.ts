// supabase/functions/ai-copilot/index.ts
// v62 ��� Phase 2: Tool Use (Agentic DB queries)
//
// Architecture:
//   stream:true  + HQ/admin + non-trivial msg:
//     → runToolLoop (non-streamed, Claude decides which tools to call)
//     → streamFinalResponse (stream the synthesis with full tool context)
//   stream:true  + non-HQ OR trivial msg:
//     → streamResponse (direct SSE, no tool overhead — Phase 1 path)
//   stream:false (Query tab + legacy):
//     → runToolLoop (non-streamed) → JSON response
//
// Phase 1 (v61) changes preserved:
//   - systemOverride actually used
//   - SSE streaming
//   - 49-table NuAi allowlist
//   - tenantId enforcement
//   - Cannabis retail catalog removed
//
// Phase 2 (v62) new:
//   - Tool loop runs BEFORE streaming for HQ/admin
//   - streamFinalResponse: runs tool context through Claude one more time as stream
//   - pipeSSE: shared SSE piping utility
//   - runToolLoop returns { messages, finalText } so context is available for re-stream
//
// Deploy: npx supabase functions deploy ai-copilot --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOOL_ROUNDS = 5;

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

// ── NuAi table allowlist ─────────────────────────────────────────────────────
const NUAI_ALLOWED_TABLES = new Set([
  "inventory_items", "stock_movements", "stock_transfers", "stock_transfer_items",
  "production_runs", "batches", "food_recipes", "food_recipe_lines",
  "food_ingredients", "haccp_log_entries", "haccp_control_points",
  "haccp_nonconformances", "temperature_logs", "cold_chain_locations",
  "recall_events", "document_log", "purchase_orders", "purchase_order_items",
  "invoices", "expenses", "suppliers", "leave_requests", "staff_profiles",
  "user_profiles", "loyalty_transactions", "scan_logs", "qr_codes",
  "system_alerts", "tenants", "tenant_config", "orders", "order_items",
  "customers", "journal_entries", "journal_lines", "vat_transactions",
  "depreciation_entries", "bank_statement_lines", "fixed_assets",
  "chart_of_accounts", "equity_ledger", "capture_queue", "loyalty_ai_log",
  "financial_statement_status", "vat_period_filings", "notification_log",
  "stock_receipts", "stock_receipt_lines", "financial_year_archive",
  // legacy backward compat
  "products", "scans", "redemptions", "wholesale_partners",
]);

// Tables with no tenant_id column
const NO_TENANT_ID = new Set(["scan_logs", "scans"]);

// ── Tool definitions ─────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "query_database",
    description: "Run a read-only query on any NuAi database table. Always filters by tenant_id. Use this to get specific data: inventory levels, orders, expenses, VAT, journals, customers, staff, loyalty, etc. Returns up to 100 rows.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string" as const, description: "Table name to query" },
        columns: { type: "string" as const, description: "Columns to select, comma-separated or * for all (keep under 10 columns for readability)" },
        filters: {
          type: "array" as const,
          description: "Additional filter conditions (tenant_id is added automatically)",
          items: {
            type: "object" as const,
            properties: {
              column: { type: "string" as const },
              op: { type: "string" as const, enum: ["eq","neq","gt","gte","lt","lte","is","in","ilike"] },
              value: {},
            },
            required: ["column","op","value"],
          },
        },
        order: {
          type: "object" as const,
          properties: {
            column: { type: "string" as const },
            ascending: { type: "boolean" as const },
          },
        },
        limit: { type: "number" as const, description: "Max rows to return (default 20, max 100)" },
      },
      required: ["table"],
    },
  },
  {
    name: "get_financial_summary",
    description: "Get a real-time financial summary for a time period: revenue ex-VAT (÷1.15), expenses, gross profit estimate, orders count, VAT position. Use for financial questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string" as const, enum: ["mtd","ytd"], description: "mtd = month to date, ytd = year to date" },
      },
      required: ["period"],
    },
  },
  {
    name: "get_alerts",
    description: "Get current unacknowledged system alerts and low-stock items needing attention.",
    input_schema: { type: "object" as const, properties: {} },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  tenantId: string | null,
): Promise<string> {
  const supabase = getSupabaseClient();

  switch (name) {
    case "query_database": {
      const table = input.table as string;
      const columns = (input.columns as string) || "*";
      const filters = (input.filters as Array<{column:string;op:string;value:unknown}>) || [];
      const order = input.order as {column:string;ascending:boolean} | undefined;
      const limit = Math.min((input.limit as number) || 20, 100);

      if (!NUAI_ALLOWED_TABLES.has(table)) {
        return JSON.stringify({ error: `Table "${table}" not in allowlist. Use one of the 49 NuAi tables.` });
      }

      let q = supabase.from(table).select(columns).limit(limit);

      // Enforce tenant isolation
      if (tenantId && !NO_TENANT_ID.has(table)) q = q.eq("tenant_id", tenantId);

      for (const f of filters) {
        if (f.column === "tenant_id") continue; // already applied
        if (f.op === "eq") q = q.eq(f.column, f.value);
        else if (f.op === "neq") q = q.neq(f.column, f.value);
        else if (f.op === "gt") q = q.gt(f.column, f.value);
        else if (f.op === "gte") q = q.gte(f.column, f.value);
        else if (f.op === "lt") q = q.lt(f.column, f.value);
        else if (f.op === "lte") q = q.lte(f.column, f.value);
        else if (f.op === "is") q = q.is(f.column, f.value === "null" ? null : f.value as boolean|null);
        else if (f.op === "ilike") q = q.ilike(f.column, f.value as string);
        else if (f.op === "in") q = q.in(f.column, Array.isArray(f.value) ? f.value : [f.value]);
      }

      if (order) q = q.order(order.column, { ascending: order.ascending ?? false });

      const { data, error } = await q;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ table, row_count: data?.length ?? 0, rows: data });
    }

    case "get_financial_summary": {
      if (!tenantId) return JSON.stringify({ error: "No tenant context for financial summary." });
      const period = (input.period as string) || "mtd";
      const now = new Date();
      const startDate = period === "mtd"
        ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
        : `${now.getFullYear()}-01-01`;
      const periodId = `${now.getFullYear()}-P${Math.ceil((now.getMonth()+1)/2)}`;

      const [ordersRes, expRes, vatRes] = await Promise.all([
        supabase.from("orders").select("total")
          .eq("tenant_id", tenantId).eq("status","paid")
          .gte("created_at", startDate+"T00:00:00"),
        supabase.from("expenses").select("amount_zar,category")
          .eq("tenant_id", tenantId).gte("expense_date", startDate),
        supabase.from("vat_transactions").select("output_vat,input_vat")
          .eq("tenant_id", tenantId).eq("vat_period", periodId),
      ]);

      const revIncl = (ordersRes.data||[]).reduce((s:number,o:Record<string,unknown>)=>s+(parseFloat(o.total as string)||0),0);
      const revExcl = Math.round((revIncl/1.15)*100)/100;
      const expenses = (expRes.data||[]).reduce((s:number,e:Record<string,unknown>)=>s+(parseFloat(e.amount_zar as string)||0),0);
      const outputVat = (vatRes.data||[]).reduce((s:number,t:Record<string,unknown>)=>s+(parseFloat(t.output_vat as string)||0),0);
      const inputVat = (vatRes.data||[]).reduce((s:number,t:Record<string,unknown>)=>s+(parseFloat(t.input_vat as string)||0),0);

      return JSON.stringify({
        period, start: startDate,
        orders_count: (ordersRes.data||[]).length,
        revenue_excl_vat: revExcl,
        revenue_incl_vat: Math.round(revIncl*100)/100,
        total_expenses: Math.round(expenses*100)/100,
        gross_profit_estimate: Math.round((revExcl-expenses)*100)/100,
        vat_output: Math.round(outputVat*100)/100,
        vat_input: Math.round(inputVat*100)/100,
        vat_net_payable: Math.round((outputVat-inputVat)*100)/100,
        note: "Revenue shown ex-VAT (total÷1.15). Known: P&L source data includes VAT — see GAP-01.",
      });
    }

    case "get_alerts": {
      if (!tenantId) return JSON.stringify({ error: "No tenant context for alerts." });
      const [alertsRes, stockRes] = await Promise.all([
        supabase.from("system_alerts").select("severity,alert_type,message,created_at")
          .eq("tenant_id",tenantId).is("acknowledged_at",null)
          .order("created_at",{ascending:false}).limit(20),
        supabase.from("inventory_items")
          .select("name,quantity_on_hand,reorder_level,category")
          .eq("tenant_id",tenantId).eq("is_active",true)
          .not("reorder_level","is",null).limit(200),
      ]);
      const alerts = alertsRes.data||[];
      const low = (stockRes.data||[]).filter((i:Record<string,unknown>)=>
        (i.reorder_level as number)>0 && (i.quantity_on_hand as number)<=(i.reorder_level as number)
      ).map((i:Record<string,unknown>)=>({ name:i.name, on_hand:i.quantity_on_hand, reorder_level:i.reorder_level, category:i.category }));

      return JSON.stringify({
        unacknowledged_alerts: alerts.length,
        critical: alerts.filter((a:Record<string,unknown>)=>a.severity==="critical").length,
        warning: alerts.filter((a:Record<string,unknown>)=>a.severity==="warning").length,
        recent_alerts: alerts.slice(0,5).map((a:Record<string,unknown>)=>({ severity:a.severity, type:a.alert_type, message:a.message })),
        low_stock_count: low.length,
        low_stock_items: low.slice(0,8),
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── Fallback system prompt (non-ProteaAI callers only) ────────────────────────
function buildFallbackSystemPrompt(userContext: Record<string,unknown>|null): string {
  const role = (userContext?.role as string)||"guest";
  return `You are ProteaAI, the AI assistant for a South African specialty retail ERP platform.
Role: ${role}. Be helpful and concise. Use ZAR. Under 200 words unless more detail is requested.`;
}

// ── Tool loop (non-streamed) — used by both stream and non-stream paths ───────
async function runToolLoop(
  initialMessages: Array<Record<string,unknown>>,
  system: string,
  apiKey: string,
  tenantId: string|null,
): Promise<{ messages: Array<Record<string,unknown>>; finalText: string }> {
  let currentMessages = [...initialMessages];
  let finalText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        system,
        messages: currentMessages,
        tools: TOOLS,
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    if (data.stop_reason !== "tool_use") {
      // Claude finished — extract text and add to messages
      finalText = (data.content||[])
        .filter((b:Record<string,unknown>)=>b.type==="text")
        .map((b:Record<string,unknown>)=>b.text as string)
        .join("\n");
      currentMessages = [...currentMessages, { role: "assistant", content: data.content }];
      break;
    }

    // Claude called tools — execute and continue
    const toolUseBlocks = (data.content||[]).filter((b:Record<string,unknown>)=>b.type==="tool_use");
    currentMessages = [...currentMessages, { role: "assistant", content: data.content }];

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (tu:Record<string,unknown>) => {
        console.log(`[ai-copilot v62] Tool: ${tu.name}`, JSON.stringify(tu.input));
        const result = await executeTool(
          tu.name as string,
          (tu.input as Record<string,unknown>)||{},
          tenantId,
        );
        return { type: "tool_result", tool_use_id: tu.id, content: result };
      }),
    );

    currentMessages = [...currentMessages, { role: "user", content: toolResults } as any];

    if (round === MAX_TOOL_ROUNDS - 1) {
      finalText = "I reached a processing limit. Please try a more specific question.";
    }
  }

  return { messages: currentMessages, finalText };
}

// ── SSE pipe — shared utility ─────────────────────────────────────────────────
function pipeSSE(claudeRes: Response): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  (async () => {
    try {
      const reader = claudeRes.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const evt = JSON.parse(raw);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta" && evt.delta?.text) {
              await writer.write(enc.encode(`data: ${JSON.stringify({ token: evt.delta.text })}\n\n`));
            }
          } catch { /* malformed SSE line — skip */ }
        }
      }
    } catch (e) {
      console.error("[ai-copilot v62] SSE pipe error:", e);
    } finally {
      try {
        await writer.write(enc.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch { /* writer already closed */ }
    }
  })();

  return new Response(readable, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// ── Stream direct — no tools, for non-HQ or trivial messages ─────────────────
async function streamDirect(
  messages: Array<Record<string,unknown>>,
  system: string,
  apiKey: string,
): Promise<Response> {
  const claudeRes = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      system,
      messages,
      // No tools — prevents tool_use events swallowing text_delta tokens
      max_tokens: 1024,
      temperature: 0.4,
      stream: true,
    }),
  });

  if (!claudeRes.ok) {
    throw new Error(`Anthropic streaming error ${claudeRes.status}: ${await claudeRes.text()}`);
  }

  return pipeSSE(claudeRes);
}

// ── Stream synthesis — after tool loop, re-stream the final answer ────────────
// Takes the messages array INCLUDING the last assistant turn from tool loop.
// Drops it and re-calls Claude with stream:true so the answer streams.
// No tools in synthesis call — prevents recursive tool loops.
async function streamSynthesis(
  messagesWithTools: Array<Record<string,unknown>>,
  system: string,
  apiKey: string,
): Promise<Response> {
  // Drop last assistant turn to re-generate as a stream
  const last = messagesWithTools[messagesWithTools.length - 1] as Record<string,unknown>;
  const msgs = last?.role === "assistant"
    ? messagesWithTools.slice(0, -1)
    : messagesWithTools;

  const claudeRes = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      system,
      messages: msgs,
      // No tools in synthesis — Claude has all the data from tool results in context
      max_tokens: 1024,
      temperature: 0.4,
      stream: true,
    }),
  });

  if (!claudeRes.ok) {
    throw new Error(`Anthropic synthesis streaming error ${claudeRes.status}: ${await claudeRes.text()}`);
  }

  return pipeSSE(claudeRes);
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const {
      messages,
      userContext = null,
      systemOverride = null,  // ProteaAI.js always provides this — v60+ critical fix
      stream = false,         // Chat tab: true  |  Query tab: false
    } = body;

    // Health check
    if (messages?.length === 1 && messages[0]?.content === "__health_check__") {
      return new Response(
        JSON.stringify({ reply: "ok", model: "health-check", usage: null, error: null }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ reply: null, model: null, usage: null, error: "No messages provided." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      const msg = "AI assistant not configured. Set ANTHROPIC_API_KEY in Supabase secrets.";
      if (stream) {
        const body = `data: ${JSON.stringify({ token: msg })}\n\ndata: [DONE]\n\n`;
        return new Response(body, { headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" } });
      }
      return new Response(
        JSON.stringify({ reply: msg, model: null, usage: null, error: "ANTHROPIC_API_KEY not set" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Extract context — ProteaAI.js sends { role, isHQ, tenantId }
    const tenantId = (userContext?.tenantId as string) || null;
    const role = (userContext?.role as string) || null;
    const isHQ = !!(userContext?.isHQ);

    // Use systemOverride when provided (ProteaAI.js always provides it)
    const system: string = systemOverride || buildFallbackSystemPrompt(userContext);

    const anthropicMessages = messages.map((m: Record<string,unknown>) => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.content,
    }));

    // ── Stream path (Chat tab) ────────────────────────────────────────────────
    if (stream) {
      // Phase 2: HQ and admin users get tool-aware streaming
      const userHasTools = isHQ || role === "admin";

      if (!userHasTools) {
        // Non-HQ: stream directly — no tool overhead
        return await streamDirect(anthropicMessages, system, apiKey);
      }

      // Skip tool loop for trivial/greeting messages (saves 1 API call)
      const lastContent = String(messages[messages.length-1]?.content || "").trim();
      const trivialMsg = lastContent.length < 15 ||
        /^(hi|hello|thanks|ok|sure|great|yes|no|good|cool|nice|got it)\b/i.test(lastContent);

      if (trivialMsg) {
        return await streamDirect(anthropicMessages, system, apiKey);
      }

      // Tool-aware streaming:
      // 1. Run tool loop non-streamed (Claude decides which tools to call)
      // 2. Stream the final synthesis with full tool context
      console.log(`[ai-copilot v62] Tool-aware stream for role:${role} isHQ:${isHQ}`);
      const { messages: withTools } = await runToolLoop(
        anthropicMessages, system, apiKey, tenantId,
      );
      return await streamSynthesis(withTools, system, apiKey);
    }

    // ── Non-stream path (Query tab + legacy callers) ──────────────────────────
    const { finalText } = await runToolLoop(
      anthropicMessages, system, apiKey, tenantId,
    );

    return new Response(
      JSON.stringify({
        reply: finalText || "I wasn't able to generate a response. Please try again.",
        model: MODEL,
        usage: null,
        error: null,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("[ai-copilot v62] Error:", error);
    return new Response(
      JSON.stringify({ reply: null, model: null, usage: null, error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
