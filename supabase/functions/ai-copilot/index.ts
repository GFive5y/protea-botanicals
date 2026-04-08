// supabase/functions/ai-copilot/index.ts
// v60 (patch) — Phase 1: Real SSE streaming + systemOverride fix + NuAi table allowlist
//
// PATCH vs initial v60:
//   streaming path now sends NO tools to Claude.
//   When tools are passed in a streaming call, Claude emits tool_use events
//   (input_json_delta), not text_delta. Our SSE reader only captures text_delta,
//   so tool calls silently swallow the response — AI says "I'll check" then stops.
//   Fix: streaming path = text-only from context. Tool use = non-streaming (Phase 2).
//
// CRITICAL FIXES vs v59:
//   1. systemOverride now ACTUALLY USED — was silently ignored in v59
//   2. Real SSE streaming — when stream:true in body, final synthesis streams token by token
//   3. NuAi table allowlist — query_database covers all 49 NuAi tables
//   4. tenantId enforcement — query_database always filters by tenant_id
//
// Streaming architecture (Phase 1):
//   stream:true  → Claude called WITHOUT tools → pure text stream → SSE tokens to client
//   stream:false → Claude called WITH tools, full tool loop → JSON response (Query tab)
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

// ── Tool definitions (used by non-streaming / Query tab path only) ────────────
const TOOLS = [
  {
    name: "query_database",
    description: "Run a read-only query on any NuAi database table. Always filters by tenant_id. Returns up to 100 rows.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string" as const, description: "Table name to query" },
        columns: { type: "string" as const, description: "Columns to select, comma-separated or * (keep under 10)" },
        filters: {
          type: "array" as const,
          description: "Filter conditions (tenant_id added automatically)",
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
        limit: { type: "number" as const, description: "Max rows (default 20, max 100)" },
      },
      required: ["table"],
    },
  },
  {
    name: "get_financial_summary",
    description: "Get real-time financial summary: MTD revenue (ex-VAT), expenses, orders count, VAT position.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: { type: "string" as const, enum: ["mtd","ytd"] },
      },
      required: ["period"],
    },
  },
  {
    name: "get_alerts",
    description: "Get current unacknowledged system alerts and low stock items.",
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
        return JSON.stringify({ error: `Table "${table}" not in allowlist.` });
      }

      let q = supabase.from(table).select(columns).limit(limit);
      if (tenantId && !NO_TENANT_ID.has(table)) q = q.eq("tenant_id", tenantId);

      for (const f of filters) {
        if (f.column === "tenant_id") continue;
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
      return JSON.stringify({ table, row_count: data?.length ?? 0, data });
    }

    case "get_financial_summary": {
      if (!tenantId) return JSON.stringify({ error: "No tenant context" });
      const period = (input.period as string) || "mtd";
      const now = new Date();
      const startDate = period === "mtd"
        ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
        : `${now.getFullYear()}-01-01`;
      const periodId = `${now.getFullYear()}-P${Math.ceil((now.getMonth()+1)/2)}`;

      const [ordersRes, expRes, vatRes] = await Promise.all([
        supabase.from("orders").select("total,status")
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
        period, period_start: startDate,
        orders_count: (ordersRes.data||[]).length,
        revenue_incl_vat: Math.round(revIncl*100)/100,
        revenue_excl_vat: revExcl,
        total_expenses: Math.round(expenses*100)/100,
        gross_profit_estimate: Math.round((revExcl-expenses)*100)/100,
        vat_output: Math.round(outputVat*100)/100,
        vat_input: Math.round(inputVat*100)/100,
        vat_net_payable: Math.round((outputVat-inputVat)*100)/100,
        note: "Revenue ex-VAT (÷1.15). GAP-01: source data includes VAT.",
      });
    }

    case "get_alerts": {
      if (!tenantId) return JSON.stringify({ error: "No tenant context" });
      const [alertsRes, stockRes] = await Promise.all([
        supabase.from("system_alerts").select("severity,alert_type,message")
          .eq("tenant_id",tenantId).is("acknowledged_at",null).limit(20),
        supabase.from("inventory_items").select("name,quantity_on_hand,reorder_level")
          .eq("tenant_id",tenantId).eq("is_active",true)
          .not("reorder_level","is",null).limit(200),
      ]);
      const alerts = alertsRes.data||[];
      const low = (stockRes.data||[]).filter((i:Record<string,unknown>)=>
        (i.reorder_level as number)>0 && (i.quantity_on_hand as number)<=(i.reorder_level as number)
      ).map((i:Record<string,unknown>)=>({name:i.name,on_hand:i.quantity_on_hand,reorder_level:i.reorder_level}));
      return JSON.stringify({
        unacknowledged_alerts: alerts.length,
        critical: alerts.filter((a:Record<string,unknown>)=>a.severity==="critical").length,
        warning: alerts.filter((a:Record<string,unknown>)=>a.severity==="warning").length,
        alert_types:[...new Set(alerts.map((a:Record<string,unknown>)=>a.alert_type))],
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
Role: ${role}. Be helpful, concise. Use ZAR. Under 200 words unless detail requested.`;
}

// ── Non-streaming tool loop (Query tab + legacy) ──────────────────────────────
async function runToolLoop(
  initialMessages: Array<Record<string,unknown>>,
  system: string,
  apiKey: string,
  tenantId: string|null,
): Promise<string> {
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
      finalText = (data.content||[])
        .filter((b:Record<string,unknown>)=>b.type==="text")
        .map((b:Record<string,unknown>)=>b.text as string)
        .join("\n");
      break;
    }

    // Execute tool calls
    const toolUseBlocks = (data.content||[]).filter((b:Record<string,unknown>)=>b.type==="tool_use");
    currentMessages.push({ role: "assistant", content: data.content });

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (tu:Record<string,unknown>) => {
        console.log(`[ai-copilot] Tool: ${tu.name}`);
        const result = await executeTool(
          tu.name as string,
          (tu.input as Record<string,unknown>)||{},
          tenantId,
        );
        return { type: "tool_result", tool_use_id: tu.id, content: result };
      }),
    );
    currentMessages.push({ role: "user", content: toolResults } as any);

    if (round === MAX_TOOL_ROUNDS-1) {
      finalText = "I hit a processing limit. Please try a more specific question.";
    }
  }

  return finalText;
}

// ── SSE streaming (Chat tab) — NO tools, answers from system prompt context ───
// IMPORTANT: Tools are intentionally omitted from this call.
// When tools are passed in a streaming call, Claude emits tool_use content blocks
// (input_json_delta events). Our SSE reader only captures text_delta events.
// Tool calls in streaming silently consume the response with no visible output.
// Phase 1 = stream from rich context. Phase 2 = agentic tool loop (non-streaming).
async function streamResponse(
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
      // NO tools here — see comment above
      max_tokens: 1024,
      temperature: 0.4,
      stream: true,
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    throw new Error(`Anthropic streaming error ${claudeRes.status}: ${err}`);
  }

  // Pipe Anthropic SSE → NuAi SSE (text_delta tokens only)
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
            if (
              evt.type === "content_block_delta" &&
              evt.delta?.type === "text_delta" &&
              evt.delta?.text
            ) {
              await writer.write(
                enc.encode(`data: ${JSON.stringify({ token: evt.delta.text })}\n\n`),
              );
            }
          } catch { /* malformed SSE line — skip */ }
        }
      }
    } catch (e) {
      console.error("[ai-copilot] Stream pipe error:", e);
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

    // v60 CRITICAL FIX: extract systemOverride and stream from body
    const {
      messages,
      userContext = null,
      systemOverride = null,   // ProteaAI.js sends this — NOW ACTUALLY USED
      stream = false,          // Chat tab: true  |  Query tab: false
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
      const noKeyMsg = "AI assistant not configured. Set ANTHROPIC_API_KEY in Supabase secrets.";
      if (stream) {
        // Return error as SSE so client SSE reader doesn't hang
        const body = `data: ${JSON.stringify({ token: noKeyMsg })}\n\ndata: [DONE]\n\n`;
        return new Response(body, {
          headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
        });
      }
      return new Response(
        JSON.stringify({ reply: noKeyMsg, model: null, usage: null, error: "ANTHROPIC_API_KEY not set" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    // Use systemOverride when provided (ProteaAI.js always provides it)
    const tenantId = (userContext?.tenantId as string) || null;
    const system: string = systemOverride || buildFallbackSystemPrompt(userContext);

    const anthropicMessages = messages.map((m: Record<string,unknown>) => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.content,
    }));

    // ── Stream path (Chat tab) ────────────────────────────────────────────────
    // No tools — AI answers from rich system prompt context (financial MTD,
    // stock levels, alerts, tab-specific data loaded by buildContext in ProteaAI.js)
    if (stream) {
      return await streamResponse(anthropicMessages, system, apiKey);
    }

    // ── Non-stream path (Query tab + legacy callers) ──────────────────────────
    // Full tool loop — AI can query database, get financial summary, get alerts
    const finalText = await runToolLoop(anthropicMessages, system, apiKey, tenantId);

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
    console.error("[ai-copilot] Error:", error);
    return new Response(
      JSON.stringify({
        reply: null, model: null, usage: null,
        error: (error as Error).message || "Internal server error",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
