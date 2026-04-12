// src/hooks/useBadges.js
// WP-DS-6 Phase 4 — Rescue signal badge counts for sidebar nav tabs
// Fetches live data on mount + every 60s. Cleared tabs stay clear for session.
// Returns: { badges: { tabId: { count, severity } }, clearBadge(tabId) }

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

export function useBadges(tenantId) {
  const [badges, setBadges] = useState({});
  const clearedRef = useRef(new Set());

  const fetchBadges = useCallback(async () => {
    if (!tenantId) return;

    const [vatTxRes, vatFiledRes, captureRes, bankRes] = await Promise.allSettled([
      supabase.from("vat_transactions")
        .select("vat_period").eq("tenant_id", tenantId),
      supabase.from("vat_period_filings")
        .select("period_id").eq("tenant_id", tenantId),
      supabase.from("capture_queue")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("is_duplicate", true),
      supabase.from("bank_statement_lines")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("matched_type", "unmatched"),
    ]);

    const periods = new Set(
      (vatTxRes.status === "fulfilled" ? vatTxRes.value.data || [] : [])
        .map(r => r.vat_period)
    );
    const filed = new Set(
      (vatFiledRes.status === "fulfilled" ? vatFiledRes.value.data || [] : [])
        .map(r => r.period_id)
    );

    const overdueCount   = [...periods].filter(p => !filed.has(p)).length;
    const dupeCount      = captureRes.status === "fulfilled" ? captureRes.value.count || 0 : 0;
    const unmatchedCount = bankRes.status   === "fulfilled" ? bankRes.value.count   || 0 : 0;

    const next = {};
    if (overdueCount   > 0) next["vat"]          = { count: overdueCount,   severity: "danger"  };
    if (dupeCount      > 0) next["smart-capture"] = { count: dupeCount,      severity: "danger"  };
    if (unmatchedCount > 0) next["bank-recon"]    = { count: unmatchedCount, severity: "warning" };

    // Respect session-cleared tabs
    clearedRef.current.forEach(tabId => delete next[tabId]);
    setBadges(next);
  }, [tenantId]);

  useEffect(() => {
    fetchBadges();
    const iv = setInterval(fetchBadges, 60000);
    return () => clearInterval(iv);
  }, [fetchBadges]);

  const clearBadge = useCallback((tabId) => {
    clearedRef.current.add(tabId);
    setBadges(prev => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
  }, []);

  return { badges, clearBadge };
}
