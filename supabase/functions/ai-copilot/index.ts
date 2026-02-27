// supabase/functions/ai-copilot/index.ts
// Protea Botanicals — AI Co-Pilot Edge Function
// Version: v1.1
// ★ v1.1: Added tools-only mode — works WITHOUT API keys.
//   Tool results returned directly with smart formatting.
//   AI providers (Grok/Claude) used only when keys are available.
//
// Deploy:  npx supabase functions deploy ai-copilot --no-verify-jwt
// Secrets: npx supabase secrets set XAI_API_KEY=xxx ANTHROPIC_API_KEY=xxx

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

// ─── CORS headers ────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

// ─── Supabase client for tool execution ──────────────────────────────────
function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

// ─── File Registry (from Handover v10.0) ─────────────────────────────────
const FILE_REGISTRY: Record<
  string,
  { version: string; lock: string; purpose: string; key: string }
> = {
  "App.js": {
    version: "v3.5",
    lock: "🔒 LOCKED",
    purpose:
      "Root component, routing, RequireAuth/RequireRole guards, RoleContext, CoPilot overlay",
    key: "Routes, guards, context providers",
  },
  "Account.js": {
    version: "v5.5",
    lock: "🔒 LOCKED",
    purpose: "Login/Register with role-based redirect + smart returnUrl",
    key: "signInWithPassword, role redirect logic",
  },
  "supabaseClient.js": {
    version: "v5.1",
    lock: "🔒 LOCKED",
    purpose: "Supabase client singleton + LockManager no-op",
    key: "createClient(), supabase export",
  },
  "scanService.js": {
    version: "v5.1",
    lock: "🔒 LOCKED",
    purpose: "QR scan processing — validate, award points, record scan",
    key: "processScan(), awardLoyaltyPoints()",
  },
  "ScanResult.js": {
    version: "v5.1",
    lock: "🔒 LOCKED",
    purpose: "Post-scan UI with celebration modal + product info",
    key: "Animated result display",
  },
  "Landing.js": {
    version: "v5.2",
    lock: "🔒 LOCKED",
    purpose: "Public landing page with auth detection + header visibility fix",
    key: "Hero, features, CTA",
  },
  "tokens.js": {
    version: "v2",
    lock: "🔒 LOCKED",
    purpose: "Design system tokens — colors, fonts, spacing, radii",
    key: "All style constants",
  },
  "PageShell.js": {
    version: "v1.0",
    lock: "🔒 LOCKED",
    purpose: "Shared layout wrapper — max-width 1200px, padding, background",
    key: "Layout container",
  },
  "AdminDashboard.js": {
    version: "v3.5",
    lock: "🔒 LOCKED",
    purpose: "5-tab admin panel: Overview, Users, Products, Scans, Smart QR",
    key: "Tab system, bulk QR, smart QR link",
  },
  "WholesalePortal.js": {
    version: "v1.1",
    lock: "🔒 LOCKED",
    purpose: "Wholesale partner dashboard with PageShell integration",
    key: "Order form, partner info",
  },
  "Redeem.js": {
    version: "v1.1",
    lock: "🔒 LOCKED",
    purpose: "Loyalty point redemption with PageShell",
    key: "Voucher display, redeem flow",
  },
  "Shop.js": {
    version: "v2.3",
    lock: "🔒 LOCKED",
    purpose: "36 vape products (18 strains × 2 formats) + 6 Coming Soon",
    key: "Product grid, R800/R1600 pricing",
  },
  "ProductVerification.js": {
    version: "v2.2",
    lock: "🔒 LOCKED",
    purpose: "18 Eybna strain profiles with terpene data + COA links",
    key: "Strain lookup, terpene display",
  },
  "AdminQrGenerator.js": {
    version: "v1.0",
    lock: "🔒 LOCKED",
    purpose: "Smart QR generator — 4 types: product, promo, loyalty, custom",
    key: "QR type selector, URL builder, download",
  },
  "CoPilot.js": {
    version: "v1.0",
    lock: "🔓 OPEN",
    purpose: "AI Co-Pilot floating chat widget",
    key: "Chat UI, provider toggle, message handling",
  },
  "copilotService.js": {
    version: "v1.0",
    lock: "🔓 OPEN",
    purpose: "Client service layer for Co-Pilot Edge Function",
    key: "sendMessage(), checkBackendHealth()",
  },
  "AgeGate.js": {
    version: "v1.0",
    lock: "🔓 OPEN",
    purpose: "4-step age verification modal (not yet integrated)",
    key: "Modal flow, age check",
  },
  "PromoBanner.js": {
    version: "v1.0",
    lock: "🔓 OPEN",
    purpose: "Animated promotional banner (not yet integrated)",
    key: "Banner animation, dismiss",
  },
  "Loyalty.js": {
    version: "v5.0",
    lock: "🔓 OPEN",
    purpose: "Loyalty dashboard — points, history, rewards",
    key: "Points display, transaction history",
  },
  "QrCode.js": {
    version: "v1",
    lock: "🔓 OPEN",
    purpose: "QR code display component using qrcode.react",
    key: "QRCodeSVG render",
  },
};

// ─── Route Registry (from App.js v3.5) ───────────────────────────────────
const ROUTE_TABLE = [
  {
    path: "/",
    component: "Landing.js",
    guards: "None (public)",
    layout: "No NavBar",
    purpose: "Public landing page",
  },
  {
    path: "/account",
    component: "Account.js",
    guards: "None (public)",
    layout: "NavBar + PageShell",
    purpose: "Login/Register",
  },
  {
    path: "/scan/:qrCode",
    component: "ScanResult.js",
    guards: "None (public)",
    layout: "Standalone",
    purpose: "QR scan processing",
  },
  {
    path: "/verify/:id",
    component: "ProductVerification.js",
    guards: "None (public)",
    layout: "NavBar",
    purpose: "Public product/COA verification",
  },
  {
    path: "/shop",
    component: "Shop.js",
    guards: "None (public)",
    layout: "NavBar",
    purpose: "Product catalog (36 vapes)",
  },
  {
    path: "/cart",
    component: "CartPage.js",
    guards: "None (public)",
    layout: "NavBar",
    purpose: "Shopping cart",
  },
  {
    path: "/loyalty",
    component: "Loyalty.js",
    guards: "RequireAuth",
    layout: "NavBar + PageShell",
    purpose: "Loyalty dashboard",
  },
  {
    path: "/redeem",
    component: "Redeem.js",
    guards: "RequireAuth",
    layout: "NavBar + PageShell",
    purpose: "Redeem loyalty points",
  },
  {
    path: "/checkout",
    component: "CheckoutPage.js",
    guards: "RequireAuth",
    layout: "NavBar + PageShell",
    purpose: "Payment checkout",
  },
  {
    path: "/order-success",
    component: "OrderSuccess.js",
    guards: "None",
    layout: "NavBar + PageShell",
    purpose: "Order confirmation",
  },
  {
    path: "/wholesale",
    component: "WholesalePortal.js",
    guards: "RequireAuth + RequireRole(retailer)",
    layout: "NavBar + PageShell",
    purpose: "Wholesale partner portal",
  },
  {
    path: "/admin",
    component: "AdminDashboard.js",
    guards: "RequireAuth + RequireRole(admin)",
    layout: "NavBar + PageShell(1200)",
    purpose: "Admin dashboard (5 tabs)",
  },
  {
    path: "/admin/qr",
    component: "AdminQrGenerator.js",
    guards: "RequireAuth + RequireRole(admin)",
    layout: "NavBar + PageShell(1200)",
    purpose: "Smart QR generator",
  },
  {
    path: "*",
    component: "NotFound.js",
    guards: "None",
    layout: "NavBar",
    purpose: "404 page",
  },
];

// ─── Lessons Learned ─────────────────────────────────────────────────────
const LESSONS_LEARNED = [
  {
    id: "LL-006",
    lesson:
      "onAuthStateChange is unreliable for redirect — use redirect after signInWithPassword response instead",
  },
  {
    id: "LL-011",
    lesson:
      "Supabase v2.x ignores lock:false parameter — LockManager is a no-op",
  },
  {
    id: "LL-012",
    lesson:
      "RequireAuth must check loading && !role before redirect to avoid flash",
  },
  {
    id: "LL-014",
    lesson:
      "DB role values must match code exactly (customer, retailer, admin)",
  },
  {
    id: "LL-015",
    lesson: "Password gates are redundant when RequireRole guards are in place",
  },
  {
    id: "LL-016",
    lesson:
      "Always diff against the ACTUAL file version, not the handover description",
  },
  {
    id: "LL-017",
    lesson:
      "Two QR tools are complementary: Bulk Generator creates DB records, Smart Generator creates URLs",
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const supabase = getSupabaseClient();

  switch (name) {
    case "get_system_health": {
      const tables = [
        "batches",
        "products",
        "scans",
        "user_profiles",
        "loyalty_transactions",
        "redemptions",
      ];
      const counts: Record<string, number | string> = {};
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        counts[table] = error ? `Error: ${error.message}` : (count ?? 0);
      }
      return JSON.stringify(
        {
          status: "connected",
          project: "uvicrqapgzcdvozxrreo",
          tables: counts,
        },
        null,
        2,
      );
    }

    case "query_supabase": {
      const table = args.table as string;
      const select = (args.select as string) || "*";
      const filters = (args.filters as Record<string, unknown>) || {};
      const order = args.order as string | undefined;
      const limit = Math.min((args.limit as number) || 20, 100);

      const ALLOWED = [
        "batches",
        "products",
        "scans",
        "user_profiles",
        "loyalty_transactions",
        "redemptions",
        "wholesale_partners",
        "orders",
        "order_items",
        "inventory",
      ];
      if (!ALLOWED.includes(table)) {
        return JSON.stringify({
          error: `Table "${table}" not in allowlist. Allowed: ${ALLOWED.join(", ")}`,
        });
      }

      let query = supabase.from(table).select(select).limit(limit);
      for (const [key, val] of Object.entries(filters)) {
        query = query.eq(key, val);
      }
      if (order) {
        query = query.order(order, { ascending: false });
      }

      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify(
        { table, rowCount: data?.length ?? 0, data },
        null,
        2,
      );
    }

    case "explain_file": {
      const name = args.name as string;
      const key = name.endsWith(".js") ? name : `${name}.js`;
      const info = FILE_REGISTRY[key];
      if (!info) {
        return JSON.stringify({
          error: `File "${name}" not found. Known files: ${Object.keys(FILE_REGISTRY).join(", ")}`,
        });
      }
      return JSON.stringify({ file: key, ...info }, null, 2);
    }

    case "decode_error": {
      const trace = args.trace as string;
      const hints: string[] = [];
      if (trace.includes("onAuthStateChange"))
        hints.push(LESSONS_LEARNED[0].lesson);
      if (trace.includes("lock") || trace.includes("Lock"))
        hints.push(LESSONS_LEARNED[1].lesson);
      if (trace.includes("RequireAuth") || trace.includes("redirect"))
        hints.push(LESSONS_LEARNED[2].lesson);
      if (trace.includes("role")) hints.push(LESSONS_LEARNED[3].lesson);
      return JSON.stringify(
        {
          trace: trace.substring(0, 500),
          matchedLessons:
            hints.length > 0
              ? hints
              : ["No direct match — check console for full stack trace."],
          allLessons: LESSONS_LEARNED,
        },
        null,
        2,
      );
    }

    case "list_routes": {
      return JSON.stringify(
        { routeCount: ROUTE_TABLE.length, routes: ROUTE_TABLE },
        null,
        2,
      );
    }

    case "list_files": {
      const files = Object.entries(FILE_REGISTRY).map(([name, info]) => ({
        file: name,
        version: info.version,
        lock: info.lock,
        purpose: info.purpose,
      }));
      return JSON.stringify({ fileCount: files.length, files }, null, 2);
    }

    case "help": {
      return JSON.stringify(
        {
          commands: [
            {
              command: "system health",
              description: "Check Supabase connection + table row counts",
            },
            {
              command: "list routes",
              description: "Show all routes with guards and layouts",
            },
            {
              command: "list files",
              description:
                "Show all project files with version and lock status",
            },
            {
              command: "explain <file>",
              description:
                'Get details about a specific file (e.g. "explain App.js")',
            },
            {
              command: "show <table>",
              description:
                'Query a Supabase table (e.g. "show products", "show user_profiles")',
            },
            { command: "count <table>", description: "Count rows in a table" },
            {
              command: "<error text>",
              description:
                "Paste an error to get diagnosis + matching Lessons Learned",
            },
          ],
          tip: "AI summarization available when Grok/Claude API keys are configured.",
        },
        null,
        2,
      );
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── Smart formatting for tools-only mode ────────────────────────────────
function formatToolResult(name: string, resultJson: string): string {
  try {
    const data = JSON.parse(resultJson);

    switch (name) {
      case "get_system_health": {
        let msg = `✅ Supabase connected (${data.project})\n\n📊 Table row counts:\n`;
        for (const [table, count] of Object.entries(data.tables)) {
          msg += `  • ${table}: ${count} rows\n`;
        }
        return msg;
      }

      case "list_routes": {
        let msg = `🗺 ${data.routeCount} routes:\n\n`;
        for (const r of data.routes) {
          msg += `  ${r.path}\n    → ${r.component} | ${r.guards} | ${r.layout}\n\n`;
        }
        return msg;
      }

      case "list_files": {
        let msg = `📁 ${data.fileCount} project files:\n\n`;
        for (const f of data.files) {
          msg += `  ${f.lock} ${f.file} (${f.version})\n    ${f.purpose}\n\n`;
        }
        return msg;
      }

      case "explain_file": {
        if (data.error) return `❌ ${data.error}`;
        return `📄 ${data.file} (${data.version}) ${data.lock}\n\nPurpose: ${data.purpose}\nKey: ${data.key}`;
      }

      case "query_supabase": {
        if (data.error) return `❌ Query error: ${data.error}`;
        let msg = `📋 ${data.table}: ${data.rowCount} rows returned\n\n`;
        if (data.data && data.data.length > 0) {
          // Show first 5 rows formatted
          const rows = data.data.slice(0, 5);
          for (const row of rows) {
            const summary = Object.entries(row)
              .slice(0, 5)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" | ");
            msg += `  • ${summary}\n`;
          }
          if (data.rowCount > 5) msg += `\n  ... and ${data.rowCount - 5} more`;
        } else {
          msg += "  (no rows)";
        }
        return msg;
      }

      case "decode_error": {
        let msg = `🔍 Error analysis:\n\n`;
        if (data.matchedLessons.length > 0) {
          msg += `Matching Lessons Learned:\n`;
          for (const lesson of data.matchedLessons) {
            msg += `  ⚡ ${lesson}\n`;
          }
        }
        return msg;
      }

      case "help": {
        let msg = `🤖 Co-Pilot Commands:\n\n`;
        for (const cmd of data.commands) {
          msg += `  "${cmd.command}"\n    → ${cmd.description}\n\n`;
        }
        msg += `\n${data.tip}`;
        return msg;
      }

      default:
        return resultJson;
    }
  } catch {
    return resultJson;
  }
}

// ─── AI Provider Calls ───────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  try {
    const anthropicMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: anthropicMessages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ai-copilot] Claude API error:", response.status, errText);
      return null;
    }
    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────
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
    const { message, provider = "grok", history = [] } = body;

    // Health check
    if (message === "__health_check__") {
      return new Response(
        JSON.stringify({
          status: "ok",
          provider,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // ── Step 1: Match tools ──────────────────────────────────────────
    const toolCalls: Array<{ name: string; args: string; result: string }> = [];
    const lowerMsg = message.toLowerCase().trim();

    // Help
    if (lowerMsg === "help" || lowerMsg === "?" || lowerMsg === "commands") {
      const result = await executeTool("help", {});
      toolCalls.push({ name: "help", args: "", result });
    }

    // System health
    if (
      lowerMsg.includes("health") ||
      lowerMsg.includes("status") ||
      lowerMsg.includes("connection") ||
      lowerMsg.includes("ping")
    ) {
      const result = await executeTool("get_system_health", {});
      toolCalls.push({ name: "get_system_health", args: "", result });
    }

    // Routes
    if (
      lowerMsg.includes("route") ||
      lowerMsg.includes("routes") ||
      lowerMsg.includes("url") ||
      lowerMsg.includes("pages")
    ) {
      const result = await executeTool("list_routes", {});
      toolCalls.push({ name: "list_routes", args: "", result });
    }

    // Files
    if (
      lowerMsg === "list files" ||
      lowerMsg === "files" ||
      lowerMsg.includes("file registry") ||
      lowerMsg.includes("all files")
    ) {
      const result = await executeTool("list_files", {});
      toolCalls.push({ name: "list_files", args: "", result });
    }

    // Query table
    const tableMatch = lowerMsg.match(
      /(?:query|show|list|count|how many|check|get)\s+(batches|products|scans|user_profiles|loyalty_transactions|redemptions|wholesale_partners|orders|order_items|inventory)/,
    );
    if (tableMatch) {
      const result = await executeTool("query_supabase", {
        table: tableMatch[1],
        limit: 10,
      });
      toolCalls.push({ name: "query_supabase", args: tableMatch[1], result });
    }

    // Explain file
    const fileMatch = lowerMsg.match(
      /(?:explain|what does|tell me about|describe|info on|what is)\s+(\w+\.?j?s?)/,
    );
    if (
      fileMatch &&
      !["the", "this", "that", "my", "a", "an"].includes(fileMatch[1])
    ) {
      const fileName = fileMatch[1].endsWith(".js")
        ? fileMatch[1]
        : `${fileMatch[1]}.js`;
      const result = await executeTool("explain_file", { name: fileName });
      toolCalls.push({ name: "explain_file", args: fileName, result });
    }

    // Error decode
    if (
      (lowerMsg.includes("error") ||
        lowerMsg.includes("failed") ||
        lowerMsg.includes("crash") ||
        lowerMsg.includes("bug")) &&
      message.length > 30
    ) {
      const result = await executeTool("decode_error", { trace: message });
      toolCalls.push({ name: "decode_error", args: "trace", result });
    }

    // No tool matched — show help
    if (toolCalls.length === 0) {
      const result = await executeTool("help", {});
      toolCalls.push({ name: "help", args: "", result });
    }

    // ── Step 2: Try AI provider (graceful fallback) ──────────────────
    const toolResultsStr = toolCalls
      .map((tc) => `[${tc.name}]: ${tc.result}`)
      .join("\n\n");

    const systemPrompt = `You are the Protea Botanicals Co-Pilot. React 18 CRA + Supabase v2.97.0. v10.0 status. Be concise.\n\n--- TOOL RESULTS ---\n${toolResultsStr}\n--- END ---\n\nSummarize the tool results clearly for the developer.`;

    const conversationMessages = [
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    let answer: string | null = null;

    if (provider === "claude") {
      answer = await callClaude(systemPrompt, conversationMessages);
    } else {
      answer = await callGrok(systemPrompt, conversationMessages);
    }

    // ── Step 3: Fallback to formatted tool results ───────────────────
    if (!answer) {
      // No AI available — format tool results directly
      answer = toolCalls
        .map((tc) => formatToolResult(tc.name, tc.result))
        .join("\n─────────────────\n");
      answer +=
        "\n\n💡 Tip: Add API keys for AI-powered summaries (see COPILOT_SETUP.md)";
    }

    return new Response(
      JSON.stringify({
        answer,
        provider: answer ? provider : "tools-only",
        toolCalls: toolCalls.map((tc) => ({ name: tc.name, args: tc.args })),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[ai-copilot] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        answer: `⚠ Co-Pilot error: ${error.message}. Check Edge Function logs.`,
        toolCalls: [],
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
