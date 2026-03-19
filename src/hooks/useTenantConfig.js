// src/hooks/useTenantConfig.js — v1.0
// Protea Botanicals — WP-Y Phase A
// Reads tenant_config feature flags. Read-only. Cached for session.
// Never updates tenant_config — purely observational.

import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";

const SESSION_KEY = "pb_tenant_config";

export function useTenantConfig() {
  const { tenant } = useTenant();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;

    // Check session cache first — avoids repeated DB reads within same session
    try {
      const cached = sessionStorage.getItem(SESSION_KEY + "_" + tenant.id);
      if (cached) {
        setConfig(JSON.parse(cached));
        setLoading(false);
        return;
      }
    } catch (_) {}

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tenant_config")
          .select("*")
          .eq("tenant_id", tenant.id)
          .single();

        if (error || !data) {
          // Graceful fallback — Entry tier defaults if no config row exists
          const fallback = {
            tenant_id: tenant.id,
            tier: "entry",
            feature_ai_basic: false,
            feature_ai_full: false,
            feature_hq: false,
            ai_queries_daily: 0,
            seats: 1,
          };
          setConfig(fallback);
          return;
        }

        setConfig(data);
        try {
          sessionStorage.setItem(
            SESSION_KEY + "_" + tenant.id,
            JSON.stringify(data),
          );
        } catch (_) {}
      } catch (_) {
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tenant?.id]);

  // Helpers derived from raw config
  const canUseAI = config
    ? config.feature_ai_basic === true || config.feature_ai_full === true
    : false;

  const canUseSonnet = config ? config.feature_ai_full === true : false;

  const dailyLimit = config?.ai_queries_daily ?? 0;

  const tier = config?.tier ?? "entry";

  return {
    config,
    loading,
    canUseAI,
    canUseSonnet,
    dailyLimit,
    tier,
  };
}
