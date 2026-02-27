// src/services/copilotService.js
// Protea Botanicals — AI Co-Pilot Service Layer
// Version: v1.0
// Status: NEW (not locked)
// Purpose: Sends messages to Supabase Edge Function, handles response parsing
// Dependencies: supabaseClient.js (for project URL)

// ─── Configuration ──────────────────────────────────────────────────────
// The Edge Function URL is derived from your Supabase project.
// In production this uses the deployed edge function.
// For local dev with `supabase functions serve`, it uses localhost:54321.
const SUPABASE_URL = "https://uvicrqapgzcdvozxrreo.supabase.co";
const EDGE_FUNCTION_NAME = "ai-copilot";

// Toggle this to true when running `supabase functions serve` locally
const USE_LOCAL_FUNCTIONS = false;
const LOCAL_FUNCTIONS_URL = "http://localhost:54321/functions/v1";

function getEndpoint() {
  if (USE_LOCAL_FUNCTIONS) {
    return `${LOCAL_FUNCTIONS_URL}/${EDGE_FUNCTION_NAME}`;
  }
  return `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`;
}

// ─── Level 1 Tool Definitions (sent to AI for function calling) ─────────
// These tell the AI what tools are available. The actual execution
// happens server-side in the Edge Function.
export const TOOL_DEFINITIONS = [
  {
    name: "get_system_health",
    description:
      "Check Supabase connection status and return row counts for all core tables (batches, products, scans, user_profiles, loyalty_transactions, redemptions).",
    parameters: {},
  },
  {
    name: "query_supabase",
    description:
      "Execute a read-only SELECT query on a Supabase table. Supports filtering, ordering, and limit. Tables: batches, products, scans, user_profiles, loyalty_transactions, redemptions, wholesale_partners, orders, order_items, inventory.",
    parameters: {
      table: { type: "string", required: true, description: "Table name" },
      select: { type: "string", description: "Columns to select (default: *)" },
      filters: {
        type: "object",
        description: 'Key-value filters e.g. {"role": "admin"}',
      },
      order: { type: "string", description: "Column to order by" },
      limit: {
        type: "number",
        description: "Max rows (default: 20, max: 100)",
      },
    },
  },
  {
    name: "explain_file",
    description:
      "Return the purpose, version, lock status, key functions, and dependencies of a project source file. Knows all files in the Protea file registry.",
    parameters: {
      name: {
        type: "string",
        required: true,
        description: 'File name e.g. "App.js", "scanService.js"',
      },
    },
  },
  {
    name: "decode_error",
    description:
      "Analyse a JavaScript error trace or console error. Identifies the likely cause, affected file, and suggests a fix based on Protea Lessons Learned.",
    parameters: {
      trace: {
        type: "string",
        required: true,
        description: "Error message or stack trace to analyse",
      },
    },
  },
  {
    name: "list_routes",
    description:
      "Return the full route table from App.js v3.4 — path, component, guards (RequireAuth/RequireRole), layout (NavBar/PageShell), and purpose.",
    parameters: {},
  },
];

// ─── Send message to Edge Function ──────────────────────────────────────
/**
 * @param {Object} options
 * @param {string} options.message - User's message text
 * @param {'grok'|'claude'} options.provider - AI provider
 * @param {Array} options.history - Previous messages [{role, content}]
 * @returns {Promise<{answer: string, toolCalls: Array, provider: string}>}
 */
export async function sendMessage({
  message,
  provider = "grok",
  history = [],
}) {
  const endpoint = getEndpoint();

  console.log(
    "[CoPilot Service] Sending to:",
    endpoint,
    "| Provider:",
    provider,
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Supabase Edge Functions accept anon key for auth
      // This is your project's public anon key (safe for client-side)
      Authorization: `Bearer ${getAnonKey()}`,
    },
    body: JSON.stringify({
      message,
      provider,
      history: history.slice(-10), // Last 10 messages for context window
      tools: TOOL_DEFINITIONS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[CoPilot Service] Error response:",
      response.status,
      errorText,
    );
    throw new Error(
      `Co-Pilot backend returned ${response.status}: ${errorText}`,
    );
  }

  const data = await response.json();
  console.log("[CoPilot Service] Response:", data);

  return {
    answer: data.answer || "",
    toolCalls: data.toolCalls || [],
    provider: data.provider || provider,
  };
}

// ─── Anon key helper ────────────────────────────────────────────────────
// Your Supabase anon key is already in supabaseClient.js.
// We read it from the same env var or hardcode the public key.
// This is the PUBLIC anon key — safe for client-side use.
function getAnonKey() {
  // Option 1: From environment (CRA exposes REACT_APP_ prefixed vars)
  if (process.env.REACT_APP_SUPABASE_ANON_KEY) {
    return process.env.REACT_APP_SUPABASE_ANON_KEY;
  }
  // Option 2: Fallback — paste your anon key here (it's public, not secret)
  // TODO: Replace with your actual anon key from supabaseClient.js
  return "YOUR_SUPABASE_ANON_KEY_HERE";
}

// ─── Health check (can be called directly from widget) ──────────────────
export async function checkBackendHealth() {
  try {
    const endpoint = getEndpoint();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAnonKey()}`,
      },
      body: JSON.stringify({
        message: "__health_check__",
        provider: "grok",
        history: [],
        tools: [],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
