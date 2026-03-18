// supabase/functions/ai-copilot/index.ts
// Protea Botanicals — AI Assistant Edge Function
// Version: v3.0
// ★ v3.0 (WP-Y): Live business context injection.
//   - pageData extracted from userContext.page_context
//   - Injected as [LIVE BUSINESS DATA] block for admin/hr roles
//   - HR officer role added to Role-Specific Behaviour
//   - /hr and /staff routes added to Website Structure
//   - All v2.0 tools, tool loop, health check, strain catalog — untouched.
//
// ★ v2.0: FULL REWRITE — Claude as brain with native tool use.
//
// Deploy:  npx supabase functions deploy ai-copilot --no-verify-jwt
// Secrets: npx supabase secrets set ANTHROPIC_API_KEY=xxx

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

const SHARED_TOOLS = [
  {
    name: "lookup_product",
    description:
      "Search for a product by QR code, batch number, or strain name. Returns product details including status, points value, and scan count.",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string" as const,
          description:
            "QR code (e.g. PB-001-2026-0001), batch ID, or strain name to search for",
        },
      },
      required: ["search"],
    },
  },
];

const CUSTOMER_TOOLS = [
  {
    name: "lookup_loyalty",
    description:
      "Look up a customer's loyalty points, tier, and recent transaction history.",
    input_schema: {
      type: "object" as const,
      properties: {
        user_id: {
          type: "string" as const,
          description:
            "The user UUID. If not provided, uses the current user from context.",
        },
      },
      required: [],
    },
  },
];

const ADMIN_TOOLS = [
  {
    name: "get_system_health",
    description:
      "Check Supabase connection status and get row counts for all database tables.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "query_analytics",
    description:
      "Get scan analytics data — counts by source, recent scan activity, and trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        period_days: {
          type: "number" as const,
          description: "Number of days to look back (default 30)",
        },
      },
      required: [],
    },
  },
  {
    name: "list_users",
    description:
      "List all registered users with their roles, loyalty points, and tier.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number" as const,
          description: "Max users to return (default 20, max 100)",
        },
      },
      required: [],
    },
  },
  {
    name: "query_database",
    description:
      "Run a read-only SELECT query on any allowed table. Allowed: batches, products, scans, user_profiles, loyalty_transactions, redemptions, wholesale_partners, orders, order_items.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: { type: "string" as const, description: "Table name to query" },
        select: {
          type: "string" as const,
          description: "Columns to select (default: *)",
        },
        filters: {
          type: "object" as const,
          description: "Key-value pairs for WHERE clause",
          additionalProperties: true,
        },
        order_by: {
          type: "string" as const,
          description: "Column to order by (descending)",
        },
        limit: {
          type: "number" as const,
          description: "Max rows (default 20, max 100)",
        },
      },
      required: ["table"],
    },
  },
];

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  userContext: Record<string, unknown> | null,
): Promise<string> {
  const supabase = getSupabaseClient();

  switch (name) {
    case "lookup_product": {
      const search = (input.search as string) || "";
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("qr_code", search)
        .limit(5);
      if (!error && data && data.length === 0) {
        const result = await supabase
          .from("products")
          .select("*")
          .ilike("qr_code", `%${search}%`)
          .limit(5);
        data = result.data;
        error = result.error;
      }
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        found: data?.length ?? 0,
        products: data?.map((p: Record<string, unknown>) => ({
          qr_code: p.qr_code,
          status: p.status,
          claimed: p.claimed,
          points_value: p.points_value,
          qr_type: p.qr_type,
          scan_count: p.scan_count,
          last_scan_at: p.last_scan_at,
        })),
      });
    }

    case "lookup_loyalty": {
      const userId =
        (input.user_id as string) || (userContext?.user_id as string);
      if (!userId) return JSON.stringify({ error: "No user_id available." });
      const { data: profile, error: profileErr } = await supabase
        .from("user_profiles")
        .select("loyalty_points, loyalty_tier, full_name, role")
        .eq("id", userId)
        .single();
      if (profileErr) return JSON.stringify({ error: profileErr.message });
      const { data: transactions, error: txErr } = await supabase
        .from("loyalty_transactions")
        .select("points, transaction_type, description, transaction_date")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(10);
      return JSON.stringify({
        loyalty_points: profile?.loyalty_points ?? 0,
        loyalty_tier: profile?.loyalty_tier ?? "bronze",
        full_name: profile?.full_name ?? null,
        recent_transactions: txErr ? [] : (transactions ?? []),
      });
    }

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
      return JSON.stringify({
        status: "connected",
        project: "uvicrqapgzcdvozxrreo",
        tables: counts,
      });
    }

    case "query_analytics": {
      const days = Math.min((input.period_days as number) || 30, 90);
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { count: totalScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .gte("scan_date", since);
      const { data: scans } = await supabase
        .from("scans")
        .select("source, scan_date")
        .gte("scan_date", since)
        .order("scan_date", { ascending: false })
        .limit(500);
      const sourceCounts: Record<string, number> = {};
      if (scans) {
        for (const s of scans) {
          const src =
            ((s as Record<string, unknown>).source as string) || "unknown";
          sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        }
      }
      const { data: recent } = await supabase
        .from("scans")
        .select("product_id, user_id, scan_date, source")
        .order("scan_date", { ascending: false })
        .limit(10);
      return JSON.stringify({
        period_days: days,
        total_scans: totalScans ?? 0,
        scans_by_source: sourceCounts,
        recent_scans: recent ?? [],
      });
    }

    case "list_users": {
      const limit = Math.min((input.limit as number) || 20, 100);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, full_name, role, loyalty_points, loyalty_tier")
        .order("loyalty_points", { ascending: false })
        .limit(limit);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        user_count: data?.length ?? 0,
        users: data ?? [],
      });
    }

    case "query_database": {
      const table = input.table as string;
      const select = (input.select as string) || "*";
      const filters = (input.filters as Record<string, unknown>) || {};
      const orderBy = input.order_by as string | undefined;
      const limit = Math.min((input.limit as number) || 20, 100);
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
      ];
      if (!ALLOWED.includes(table)) {
        return JSON.stringify({
          error: `Table "${table}" not allowed. Allowed: ${ALLOWED.join(", ")}`,
        });
      }
      let query = supabase.from(table).select(select).limit(limit);
      for (const [key, val] of Object.entries(filters)) {
        query = query.eq(key, val);
      }
      if (orderBy) {
        query = query.order(orderBy, { ascending: false });
      }
      const { data, error } = await query;
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ table, row_count: data?.length ?? 0, data });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function getToolsForRole(role: string | null) {
  const tools = [...SHARED_TOOLS];
  if (role === "customer" || role === "retailer" || role === "admin")
    tools.push(...CUSTOMER_TOOLS);
  if (role === "admin") tools.push(...ADMIN_TOOLS);
  return tools;
}

function buildSystemPrompt(
  userContext: Record<string, unknown> | null,
): string {
  const role = (userContext?.role as string) || "guest";
  const points = userContext?.loyalty_points ?? null;
  const tier = userContext?.loyalty_tier ?? null;
  const page = userContext?.current_page ?? "/";
  const name = userContext?.full_name ?? null;
  const pageData =
    (userContext?.page_context as Record<string, unknown> | null) ?? null;

  return `You are the Protea Botanicals AI Assistant — a friendly, knowledgeable cannabis vape consultant for a South African premium brand.

## Your Personality
- Warm, professional, and approachable
- You know cannabis strains, terpenes, and effects deeply
- You speak naturally — never dump raw data or tool outputs
- Keep responses concise (2-4 short paragraphs max unless the user asks for detail)
- Use the brand voice: premium, botanical, sophisticated

## Current User Context
- Role: ${role}
- ${name ? `Name: ${name}` : "Name: not provided"}
- ${points !== null ? `Loyalty Points: ${points}` : "Not logged in"}
- ${tier ? `Tier: ${tier}` : ""}
- Current Page: ${page}

## Product Catalog — 18 Eybna Terpene Strains
All vapes use the same base distillate: 93.55% D9-THC (Ecogreen Analytics COA JB26-046-01, SANAS T1045 accredited).
Terpenes sourced from Eybna GmbH, Berlin. Two formats: 1ml Cartridge (R800) and 2ml Pen (R1,600).

### Pure Terpenes Line
- **Pineapple Express** — Sativa-Dominant Hybrid. Tropical, citrus, pine. Energising, creative, uplifting. Dominant terpenes: Myrcene, Limonene, Pinene, Caryophyllene.
- **Wedding Cake** — Indica-Hybrid. Sweet vanilla, earthy, peppery. Relaxing, euphoric, calming. Dominant terpenes: Caryophyllene, Limonene, Myrcene, Linalool.

### Palate Line
- **Gelato #41** — Indica-Dominant Hybrid. Sweet, citrus, earthy. Euphoric, creative, relaxing. Dominant terpenes: Limonene, Caryophyllene, Myrcene, Humulene.
- **Peaches & Cream** — Indica-Hybrid. Sweet peach, creamy, floral. Soothing, happy, mellow. Dominant terpenes: Myrcene, Limonene, Linalool, Caryophyllene.
- **Purple Punch** — Indica. Grape, blueberry, vanilla. Deeply relaxing, sleepy, soothing. Dominant terpenes: Myrcene, Caryophyllene, Pinene, Limonene.
- **Mimosa** — Sativa-Hybrid. Citrus, tropical, floral. Uplifting, energetic, happy. Dominant terpenes: Limonene, Myrcene, Pinene, Linalool.

### Live Line
- **Cinnamon Kush Cake** — Indica-Dominant. Cinnamon, sweet, earthy. Deeply relaxing, warm, sedating. Dominant terpenes: Caryophyllene, Myrcene, Limonene, Humulene.
- **RNTZ** — Hybrid. Sweet, fruity, creamy. Balanced, euphoric, giggly. Dominant terpenes: Limonene, Caryophyllene, Myrcene, Linalool.
- **Blue Zushi** — Indica-Hybrid. Berry, sweet, earthy. Calming, creative, mellow. Dominant terpenes: Myrcene, Limonene, Caryophyllene, Pinene.
- **MAC** (Miracle Alien Cookies) — Hybrid. Citrus, diesel, floral. Uplifting, creative, balanced. Dominant terpenes: Limonene, Caryophyllene, Myrcene, Terpinolene.

### Enhancer Line
- **Sweet Watermelon** — Sativa-Hybrid. Watermelon, sweet, fresh. Uplifting, refreshing, social. Dominant terpenes: Myrcene, Limonene, Pinene, Caryophyllene.
- **Pear Jam** — Indica-Hybrid. Sweet pear, jam, honey. Relaxing, comforting, warm. Dominant terpenes: Myrcene, Caryophyllene, Limonene, Linalool.
- **Melon Lychee** — Sativa-Hybrid. Melon, lychee, tropical. Refreshing, uplifting, creative. Dominant terpenes: Limonene, Myrcene, Terpinolene, Pinene.
- **Tutti Frutti** — Sativa-Hybrid. Mixed fruit, candy, sweet. Energetic, happy, social. Dominant terpenes: Limonene, Myrcene, Pinene, Caryophyllene.

### Live Plus+ Line
- **ZKZ** — Balanced Hybrid. Earthy, sweet, piney. Balanced, calm, focused. Dominant terpenes: Myrcene, Pinene, Caryophyllene, Limonene.
- **Purple Crack** — Sativa-Hybrid. Berry, citrus, earthy. Energising, focused, euphoric. Dominant terpenes: Myrcene, Limonene, Pinene, Caryophyllene.
- **Lemonhead+** — Sativa-Hybrid. Lemon, citrus, sweet. Uplifting, focused, clear-headed. Dominant terpenes: Limonene, Pinene, Myrcene, Terpinolene.
- **Sherblato+** — Indica-Hybrid. Berry, creamy, sweet. Relaxing, euphoric, dreamy. Dominant terpenes: Caryophyllene, Limonene, Myrcene, Linalool.

## Terpene Knowledge
- **Myrcene**: Earthy, musky. Relaxation, sedation, enhanced absorption.
- **Limonene**: Citrus. Mood elevation, stress relief, energising.
- **Caryophyllene**: Peppery, spicy. Anti-inflammatory, calming, pain relief.
- **Pinene**: Pine, fresh. Alertness, memory retention, anti-inflammatory.
- **Linalool**: Floral, lavender. Calming, anti-anxiety, sleep aid.
- **Humulene**: Earthy, woody. Appetite suppressant, anti-inflammatory.
- **Terpinolene**: Herbal, floral. Uplifting, antioxidant, mildly sedating.

## Loyalty Programme
- Earn 10 points per QR scan (inside packaging)
- Tiers: Bronze (0-99), Silver (100-499), Gold (500-999), Platinum (1000+)
- Points can be redeemed for discounts and rewards
- Each QR code is single-use to prevent fraud

## Pricing
- 1ml Cartridge: R800
- 2ml Pen: R1,600
- Same distillate and terpene quality in both formats

## Lab Certification
- Distillate tested by Ecogreen Analytics (Pty) Ltd, Somerset West
- Lab ID: JB26-046-01, Sample: D9DSOL160126
- SANAS T1045 accredited, SAHPRA licensed
- D9-THC: 93.55%, Total Cannabinoids: 98.53%
- Residual solvents, heavy metals, pesticides: testing pending

## Website Structure
- / — Landing page (public)
- /shop — Product catalog (36 vapes)
- /verify/:strain — Product verification + COA
- /scan/:qrCode — QR scan for loyalty points
- /loyalty — Loyalty dashboard (requires login)
- /account — Login/Register
- /admin — Admin dashboard (admin only)
- /wholesale — Wholesale portal (retailer only)
- /hr — HR Dashboard (hr/hq only)
- /staff — Staff Portal (any logged-in user with staff profile)

## Role-Specific Behaviour
${
  role === "admin"
    ? `- You are speaking with an ADMIN. You can help with system health checks, analytics, user management, and database queries.
- You have admin tools available: get_system_health, query_analytics, list_users, query_database.`
    : role === "hr"
      ? `- You are speaking with an HR OFFICER. Help with staff records, leave management, timesheets, disciplinary matters, payroll export, and performance reviews.
- Reference specific numbers and data gaps from the live context when available.`
      : role === "retailer"
        ? `- You are speaking with a WHOLESALE PARTNER. Help with orders, product info, and business queries.`
        : role === "customer"
          ? `- You are speaking with a CUSTOMER. Help with strain recommendations, loyalty points, product questions.
- You can check their loyalty points with the lookup_loyalty tool.`
          : `- This is a GUEST (not logged in). Help with general product info, strain recommendations, and explain the loyalty programme.
- Encourage them to create an account to earn loyalty points.`
}

## Important Rules
- NEVER reveal raw JSON or tool output — always summarise naturally
- If you use a tool, incorporate the results into a natural response
- For strain recommendations, explain WHY a strain fits (terpenes, effects)
- Always be honest about pending lab tests (solvents, metals, pesticides)
- Prices are in South African Rand (R)
- Do not make medical claims — use "may help with" language${
    pageData && role !== "customer" && role !== "guest"
      ? (() => {
          const { status, headline, items, warnings, actions } = pageData as {
            status?: string;
            headline?: string;
            items?: string[];
            warnings?: string[];
            actions?: string[];
          };
          const statusLabel: Record<string, string> = {
            ok: "HEALTHY",
            info: "NOTE",
            warn: "WARNING",
            critical: "CRITICAL",
            setup: "SETUP NEEDED",
          };
          const itemLines =
            Array.isArray(items) && items.length
              ? `\nKey facts:\n${items
                  .slice(0, 5)
                  .map((i: string) => `- ${i}`)
                  .join("\n")}`
              : "";
          const warnLines =
            Array.isArray(warnings) && warnings.length
              ? `\nActive issues:\n${warnings
                  .slice(0, 4)
                  .map((w: string) => `- ${w.replace(/^⚠\s*/, "")}`)
                  .join("\n")}`
              : "";
          const actionLines =
            Array.isArray(actions) && actions.length
              ? `\nRecommended actions:\n${actions
                  .slice(0, 3)
                  .map(
                    (a: unknown) =>
                      `- ${typeof a === "string" ? a : (a as { label: string }).label}`,
                  )
                  .join("\n")}`
              : "";
          return `\n\n[LIVE BUSINESS DATA — Page: ${page} — Status: ${statusLabel[status as string] ?? "UNKNOWN"}]\n${headline ?? ""}${itemLines}${warnLines}${actionLines}\n\nWhen live data is present: lead with the most critical issue, reference specific numbers, suggest exact next actions.`;
        })()
      : ""
  }`;
}

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
    const { messages, userContext = null } = body;

    if (
      messages &&
      messages.length === 1 &&
      messages[0]?.content === "__health_check__"
    ) {
      return new Response(
        JSON.stringify({
          reply: "ok",
          model: "health-check",
          usage: null,
          error: null,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          reply: null,
          model: null,
          usage: null,
          error: "No messages provided.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply:
            "The AI assistant is not configured yet. Please set the ANTHROPIC_API_KEY in Supabase secrets.",
          model: null,
          usage: null,
          error: "ANTHROPIC_API_KEY not set",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const role = (userContext?.role as string) || null;
    const systemPrompt = buildSystemPrompt(userContext);
    const tools = getToolsForRole(role);

    const anthropicMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role:
          m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }),
    );

    let currentMessages = [...anthropicMessages];
    let finalReply = "";
    let totalUsage = { input_tokens: 0, output_tokens: 0 };
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
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
          messages: currentMessages,
          tools: tools.length > 0 ? tools : undefined,
          max_tokens: 2000,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          "[ai-copilot] Anthropic API error:",
          response.status,
          errText,
        );
        return new Response(
          JSON.stringify({
            reply: null,
            model: null,
            usage: null,
            error: `AI provider error (${response.status}). Please try again.`,
          }),
          {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          },
        );
      }

      const data = await response.json();

      if (data.usage) {
        totalUsage.input_tokens += data.usage.input_tokens || 0;
        totalUsage.output_tokens += data.usage.output_tokens || 0;
      }

      if (data.stop_reason === "end_turn" || data.stop_reason !== "tool_use") {
        finalReply = (data.content || [])
          .filter((block: { type: string }) => block.type === "text")
          .map((block: { text: string }) => block.text)
          .join("\n");
        break;
      }

      if (data.stop_reason === "tool_use") {
        const toolUseBlocks = (data.content || []).filter(
          (block: { type: string }) => block.type === "tool_use",
        );
        const textBlocks = (data.content || []).filter(
          (block: { type: string }) => block.type === "text",
        );

        currentMessages.push({
          role: "assistant" as const,
          content: data.content,
        });

        const toolResults = [];
        for (const toolBlock of toolUseBlocks) {
          console.log(
            `[ai-copilot] Tool call: ${toolBlock.name}`,
            JSON.stringify(toolBlock.input),
          );
          const result = await executeTool(
            toolBlock.name,
            toolBlock.input || {},
            userContext,
          );
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: toolBlock.id,
            content: result,
          });
        }

        currentMessages.push({
          role: "user" as const,
          content: toolResults,
        } as any);

        if (round === MAX_TOOL_ROUNDS - 1) {
          finalReply =
            textBlocks
              .map((block: { text: string }) => block.text)
              .join("\n") ||
            "I found the information but ran into a limit. Please try a simpler question.";
        }
      }
    }

    return new Response(
      JSON.stringify({
        reply:
          finalReply ||
          "I wasn't able to generate a response. Please try again.",
        model: "claude-sonnet-4-20250514",
        usage: totalUsage,
        error: null,
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
        reply: null,
        model: null,
        usage: null,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
