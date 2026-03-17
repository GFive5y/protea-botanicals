// src/services/copilotService.js v3.0
// WP-Y: AI CoPilot — dual mode: Script (free) + AI (token-consuming)
//
// ── MODES ────────────────────────────────────────────────────────────────────
// Script Mode: local intent engine reads pageContext data. Zero API calls.
//              Handles: status checks, warnings, actions, metrics, overviews.
//              Unhandled queries → suggests switching to AI mode.
//
// AI Mode:     sends compressed pageContext to ai-copilot Edge Function.
//              Claude responds as a business advisor with live data context.
//              Token budget: max 600 output, last 12 messages, ~400 token context.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "./supabaseClient";

const EDGE_FUNCTION_URL =
  process.env.REACT_APP_COPILOT_URL ||
  `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ai-copilot`;

// ─── AI MODE: SEND MESSAGE ────────────────────────────────────────────────────

export async function sendMessage(messages, userContext = null) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages, userContext }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[copilotService] API error:", response.status, errBody);
      return {
        reply: null,
        error: `Server error (${response.status}). Please try again.`,
      };
    }

    const data = await response.json();
    if (data.error && !data.reply) {
      return { reply: null, error: data.error };
    }
    return {
      reply: data.reply,
      model: data.model,
      usage: data.usage,
      error: null,
    };
  } catch (err) {
    console.error("[copilotService] Network error:", err);
    return {
      reply: null,
      error: "Unable to reach the assistant. Check your connection.",
    };
  }
}

// ─── USER CONTEXT BUILDER ─────────────────────────────────────────────────────
// v3.0: Now accepts pageContext and compresses it for token-efficient AI injection

export async function buildUserContext(
  roleCtx,
  currentPage,
  pageContext = null,
) {
  const context = {
    role: roleCtx.role || null,
    email: roleCtx.userEmail || null,
    current_page: currentPage || "/",
  };

  if (roleCtx.role) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        context.user_id = user.id;
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("loyalty_points, loyalty_tier, full_name")
          .eq("id", user.id)
          .single();
        if (profile) {
          context.loyalty_points = profile.loyalty_points || 0;
          context.loyalty_tier = profile.loyalty_tier || "bronze";
          context.full_name = profile.full_name || null;
        }
      }
    } catch (err) {
      console.warn(
        "[copilotService] Could not fetch user profile:",
        err.message,
      );
    }
  }

  // v3.0: Inject compressed pageContext for AI mode business awareness
  if (pageContext && roleCtx.role !== "customer") {
    context.page_context = compressContextForAI(pageContext);
  }

  return context;
}

// ─── CONTEXT COMPRESSION ──────────────────────────────────────────────────────
// Strips raw query data, keeps only what Claude needs. Target: ~300 tokens.

export function compressContextForAI(pageContext) {
  if (!pageContext) return null;
  const { status, headline, items, warnings, actions } = pageContext;
  return {
    status: status || "ok",
    headline: headline || "",
    items: (items || []).slice(0, 5), // Max 5 items
    warnings: (warnings || []).slice(0, 4), // Max 4 warnings
    actions: (actions || []).slice(0, 3).map((a) => a.label || a), // Labels only
  };
}

// ─── SCRIPT MODE: LOCAL INTENT ENGINE ─────────────────────────────────────────
// Reads pageContext data and generates responses locally. Zero API calls.
// Returns: string response | null (null = escalate to AI mode)

const INTENT_PATTERNS = [
  {
    type: "issues",
    pattern:
      /\b(wrong|issue|problem|warn|alert|error|broken|fail|bad|concern|risk)\b/i,
  },
  {
    type: "status",
    pattern:
      /\b(status|health|how.?s|ok|fine|running|all good|everything|check)\b/i,
  },
  {
    type: "actions",
    pattern:
      /\b(action|do|next|should|fix|recommend|help|priority|urgent|focus|what now|todo)\b/i,
  },
  {
    type: "overview",
    pattern:
      /\b(overview|summary|brief|tell me|show|detail|all|report|update|what.?s)\b/i,
  },
  {
    type: "stats",
    pattern:
      /\b(number|stat|count|how many|total|metric|figure|data|amount)\b/i,
  },
];

const STATUS_ICON = {
  ok: "✅",
  info: "ℹ️",
  warn: "⚠️",
  critical: "🔴",
  setup: "🔧",
};

function detectIntent(message) {
  const msg = message.toLowerCase().trim();
  for (const { type, pattern } of INTENT_PATTERNS) {
    if (pattern.test(msg)) return type;
  }
  return null;
}

function formatScriptResponse(intent, ctx) {
  const { status, headline, items, warnings, actions } = ctx;
  const icon = STATUS_ICON[status] || "📊";

  switch (intent) {
    case "issues":
      if (!warnings || warnings.length === 0) {
        return `✅ No issues detected.\n\n**${headline}**`;
      }
      return [
        `**${warnings.length} issue${warnings.length > 1 ? "s" : ""} detected:**`,
        "",
        ...warnings.map((w) => w),
        actions?.length
          ? `\n**Recommended next step:** ${actions[0].label || actions[0]}`
          : "",
      ]
        .filter((l) => l !== "")
        .join("\n");

    case "status":
      return [
        `${icon} **${headline}**`,
        "",
        ...(items || []).slice(0, 4).map((i) => `• ${i}`),
      ].join("\n");

    case "actions":
      if (!actions || actions.length === 0) {
        return `No immediate actions needed.\n\n${icon} ${headline}`;
      }
      return [
        "**Recommended actions:**",
        "",
        ...actions.map((a) => `→ ${a.label || a}`),
        warnings?.length ? `\n**Why:** ${warnings[0]}` : "",
      ]
        .filter((l) => l !== "")
        .join("\n");

    case "stats":
    case "overview":
      return [
        `${icon} **${headline}**`,
        "",
        ...(items || []).map((i) => `• ${i}`),
        warnings?.length
          ? [
              "",
              "**Warnings:**",
              ...warnings.slice(0, 3).map((w) => `⚠️ ${w}`),
            ].join("\n")
          : "",
        actions?.length ? `\n→ ${actions[0].label || actions[0]}` : "",
      ]
        .filter((l) => l !== "")
        .join("\n");

    default:
      return null;
  }
}

export function generateScriptResponse(message, pageContext) {
  if (!pageContext || pageContext.loading) return null;

  const intent = detectIntent(message);
  if (!intent) return null;

  return formatScriptResponse(intent, pageContext);
}

// ─── DYNAMIC SUGGESTIONS ──────────────────────────────────────────────────────
// Generates context-aware suggestions from live pageContext data.
// Falls back to role/page-based static suggestions.

export function getContextSuggestions(pageContext, role, pathname) {
  // If we have live context with actionable data, surface relevant prompts
  if (pageContext && !pageContext.loading) {
    const suggestions = [];

    if (pageContext.warnings?.length > 0) {
      suggestions.push(`What issues need my attention?`);
    }

    if (pageContext.actions?.length > 0) {
      suggestions.push(`What should I do right now?`);
    }

    if (pageContext.status === "setup") {
      suggestions.push(`Help me with initial setup`);
    }

    suggestions.push(`Give me a full overview`);

    if (suggestions.length >= 3) return suggestions.slice(0, 4);
  }

  // Fallback to route-based static suggestions
  return getStaticSuggestions(role, pathname);
}

function getStaticSuggestions(role, pathname) {
  const PAGE_SUGGESTIONS = {
    "/": [
      "What products do you offer?",
      "How does the loyalty programme work?",
      "Tell me about your strains",
      "What makes Protea different?",
    ],
    "/shop": [
      "How do I place an order?",
      "Do you offer delivery?",
      "Cart or Pen — what's the difference?",
      "What payment methods do you accept?",
    ],
    "/loyalty": [
      "Check my loyalty points",
      "How do I earn more points?",
      "What rewards can I redeem?",
      "What tier am I on?",
    ],
    "/scan": [
      "How do I scan a QR code?",
      "What happens after I scan?",
      "How many points per scan?",
      "Why should I scan my product?",
    ],
    "/hr": [
      "What needs my attention today?",
      "Any leave requests pending?",
      "Staff data quality issues?",
      "Give me an HR overview",
    ],
    "/staff": [
      "Show my leave balance",
      "What timesheets are pending?",
      "My profile details",
      "How do I request leave?",
    ],
    "/admin": [
      "System health check",
      "What needs attention today?",
      "Scan analytics this week",
      "Any urgent issues?",
    ],
  };

  const ROLE_SUGGESTIONS = {
    admin: [
      "What needs attention today?",
      "System health check",
      "Scan analytics this week",
      "Any urgent issues?",
    ],
    retailer: [
      "Check my orders",
      "What strains are available?",
      "Best sellers for my shop?",
      "Wholesale pricing",
    ],
    customer: [
      "What strain helps with sleep?",
      "Check my loyalty points",
      "Difference between Cart and Pen?",
      "How does QR scanning work?",
    ],
  };

  const DEFAULT_SUGGESTIONS = [
    "What strains do you have?",
    "How does the loyalty programme work?",
    "Tell me about your products",
    "What makes Protea different?",
  ];

  if (role === "admin" || role === "hr") return ROLE_SUGGESTIONS.admin;
  if (PAGE_SUGGESTIONS[pathname]) return PAGE_SUGGESTIONS[pathname];
  const prefix = "/" + (pathname.split("/")[1] || "");
  if (prefix !== pathname && PAGE_SUGGESTIONS[prefix])
    return PAGE_SUGGESTIONS[prefix];
  return ROLE_SUGGESTIONS[role] || DEFAULT_SUGGESTIONS;
}
