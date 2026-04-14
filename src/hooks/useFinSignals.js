// src/hooks/useFinSignals.js
// Unified financial alert signal system — Layer 1.
// One shared fetch feeds four consumers: badges, hover cards, section pills, walk-in brief.
// Refreshes every 5 minutes to match useNavIntelligence cadence.
// Scope v1: balance-sheet, vat, pl. Scaling to other fin tabs = add a new file under finChecks/.

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";
import { checkBalanceSheet } from "./finChecks/checkBalanceSheet";
import { checkVat } from "./finChecks/checkVat";
import { checkPL } from "./finChecks/checkPL";

const REFRESH_MS = 5 * 60 * 1000;

export function useFinSignals(tenantId) {
  const { industryProfile } = useTenant();
  const [signals, setSignals] = useState({});
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const run = useCallback(async () => {
    if (!tenantId) {
      setSignals({});
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearStartIso = new Date(now.getFullYear(), 0, 1).toISOString();

      // ── One shared fetch for all three checks ────────────────────────────
      // BS COGS source: tenant_financial_period RPC over 90 days (LL-210 canonical).
      // PL revenue source: tenant_financial_period RPC over FY bounds (YTD, matches IFRS IS).
      // Wages YTD: from expenses table filtered to FY start.
      const [itemsRes, fpRpc90d, fpRpcYTD, expensesYTDRes, tenantConfigRes] =
        await Promise.allSettled([
          // 1 — inventory_items (for BS inventory value)
          supabase
            .from("inventory_items")
            .select("id, quantity_on_hand, weighted_avg_cost")
            .eq("tenant_id", tenantId)
            .eq("is_active", true),

          // 2 — tenant_financial_period RPC over last 90 days (for BS cogs.actual)
          supabase.rpc("tenant_financial_period", {
            p_tenant_id: tenantId,
            p_since: ninetyDaysAgo,
            p_until: now.toISOString(),
          }),

          // 3 — tenant_financial_period RPC over FY bounds (for PL YTD revenue)
          supabase.rpc("tenant_financial_period", {
            p_tenant_id: tenantId,
            p_since: yearStartIso,
            p_until: now.toISOString(),
          }),

          // 4 — expenses YTD (used by both VAT missing-input check AND PL wage ratio)
          supabase
            .from("expenses")
            .select("category, subcategory, amount_zar, input_vat_amount")
            .eq("tenant_id", tenantId)
            .gte("expense_date", yearStart),

          // 5 — tenant_config (vat_registered flag for VAT check)
          supabase
            .from("tenant_config")
            .select("vat_registered")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
        ]);

      const items   = itemsRes.status === "fulfilled" ? itemsRes.value.data || [] : [];
      const fp90d   = fpRpc90d.status === "fulfilled" ? fpRpc90d.value.data || {} : {};
      const cogs90d = parseFloat(fp90d?.cogs?.actual) || 0;
      const fpYTD   = fpRpcYTD.status === "fulfilled" ? fpRpcYTD.value.data || {} : {};
      const expYTD  = expensesYTDRes.status === "fulfilled" ? expensesYTDRes.value.data || [] : [];
      const vatRegistered =
        tenantConfigRes.status === "fulfilled"
          ? !!tenantConfigRes.value.data?.vat_registered
          : false;

      // Revenue YTD — LL-231 branch for cannabis_dispensary (RPC returns 0 for dispensary)
      let revenueYTD = 0;
      if (industryProfile === "cannabis_dispensary") {
        const { data: dispensingData } = await supabase
          .from("dispensing_log")
          .select("quantity_dispensed, inventory_items!inner(sell_price)")
          .eq("tenant_id", tenantId)
          .eq("is_voided", false)
          .gte("dispensed_at", yearStartIso);
        revenueYTD = (dispensingData || []).reduce((s, d) => {
          const q = parseFloat(d.quantity_dispensed) || 0;
          const sell = parseFloat(d.inventory_items?.sell_price) || 0;
          return s + q * sell;
        }, 0);
      } else {
        revenueYTD = parseFloat(fpYTD?.revenue?.ex_vat) || 0;
      }

      // ── Run the three pure checks ────────────────────────────────────────
      const bsSignal = checkBalanceSheet({ items, cogs90d, industryProfile });
      const vatSignal = checkVat({ vatRegistered, expenses: expYTD });
      const plSignal = checkPL({ expensesYTD: expYTD, revenueYTD });

      setSignals({
        "balance-sheet": bsSignal,
        vat: vatSignal,
        pl: plSignal,
      });
    } catch (err) {
      console.error("[useFinSignals]", err);
      setSignals({});
    } finally {
      setLoading(false);
    }
  }, [tenantId, industryProfile]);

  useEffect(() => {
    run();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(run, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [run]);

  return { signals, loading };
}
