// src/services/copilotService.js v2.0
import { supabase } from "./supabaseClient";

const EDGE_FUNCTION_URL =
  process.env.REACT_APP_COPILOT_URL ||
  `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ai-copilot`;

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

export async function buildUserContext(roleCtx, currentPage) {
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
  return context;
}
