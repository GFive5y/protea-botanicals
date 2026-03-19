// src/hooks/useAIUsage.js — v1.0
// Protea Botanicals — WP-Y Phase A
// Daily AI usage counter, limit check, model selector, usage logger.
// Every Claude API call MUST go through logAIUsage() — no exceptions.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";

// ── Model strings — spec § 13 ─────────────────────────────────────────────────
export const MODELS = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-6",
};

// ── Cost per token (USD) — spec § 6 ──────────────────────────────────────────
const TOKEN_RATES = {
  [MODELS.HAIKU]: { input: 0.00000025, output: 0.00000125 },
  [MODELS.SONNET]: { input: 0.000003, output: 0.000015 },
};

export function calculateCost(model, inputTokens, outputTokens) {
  const r = TOKEN_RATES[model] || TOKEN_RATES[MODELS.HAIKU];
  return inputTokens * r.input + outputTokens * r.output;
}

// ── Sonnet trigger keywords — spec § 1.2 ─────────────────────────────────────
const SONNET_KEYWORDS = [
  "why",
  "analyse",
  "analyze",
  "recommend",
  "compare",
  "summarise",
  "summarize",
  "explain",
  "what should",
  "help me understand",
  "help me plan",
  "help me decide",
];

export function selectModel(query, canUseSonnet) {
  if (!canUseSonnet) return MODELS.HAIKU;
  const q = (query || "").toLowerCase();
  const needsSonnet = SONNET_KEYWORDS.some((kw) => q.includes(kw));
  return needsSonnet ? MODELS.SONNET : MODELS.HAIKU;
}

// ─────────────────────────────────────────────────────────────────────────────
export function useAIUsage(dailyLimit) {
  const { tenant } = useTenant();
  const [todayCount, setTodayCount] = useState(0);
  const [loadingUsage, setLoadingUsage] = useState(true);

  const tenantId = tenant?.id;

  const fetchTodayCount = useCallback(async () => {
    if (!tenantId) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("ai_usage_log")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("success", true)
        .gte("created_at", todayStart.toISOString());

      setTodayCount(count || 0);
    } catch (_) {
      setTodayCount(0);
    } finally {
      setLoadingUsage(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTodayCount();
  }, [fetchTodayCount]);

  // Call this BEFORE every API call — returns true if allowed
  const checkLimit = useCallback(() => {
    if (dailyLimit === 0) return false; // Entry tier
    if (dailyLimit < 0) return true; // Unlimited (future-proofing)
    return todayCount < dailyLimit;
  }, [todayCount, dailyLimit]);

  // Call this AFTER every API call (success or failure)
  const logAIUsage = useCallback(
    async ({
      model,
      queryText,
      tabContext,
      inputTokens,
      outputTokens,
      success,
      errorMessage,
    }) => {
      if (!tenantId) return;
      try {
        const costUsd = success
          ? calculateCost(model, inputTokens || 0, outputTokens || 0)
          : 0;

        await supabase.from("ai_usage_log").insert({
          tenant_id: tenantId,
          model,
          query_text: (queryText || "").slice(0, 500), // cap at 500 chars
          tab_context: tabContext || "unknown",
          input_tokens: inputTokens || 0,
          output_tokens: outputTokens || 0,
          cost_usd: costUsd,
          success: !!success,
          error_message: errorMessage || null,
        });

        if (success) setTodayCount((n) => n + 1);
      } catch (_) {
        // Never let logging failure break the UI
      }
    },
    [tenantId],
  );

  const remaining = Math.max(0, dailyLimit - todayCount);
  const limitPct = dailyLimit > 0 ? (todayCount / dailyLimit) * 100 : 0;
  const nearLimit = limitPct >= 80 && limitPct < 100;
  const limitReached = dailyLimit > 0 && todayCount >= dailyLimit;

  return {
    todayCount,
    remaining,
    limitPct,
    nearLimit,
    limitReached,
    loadingUsage,
    checkLimit,
    logAIUsage,
    refetchUsage: fetchTodayCount,
  };
}
