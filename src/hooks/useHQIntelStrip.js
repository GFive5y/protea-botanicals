// src/hooks/useHQIntelStrip.js
// WP-DS-6 Phase 2 — HQ-specific IntelStrip pill computation
// Returns { pills, loading } for the current HQ tab.
// Each tab case queries Supabase directly — no IntelligenceContext needed.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

const fmtR = (n) => "R" + Math.round(n).toLocaleString("en-ZA");

async function buildHQPills(tabId, tenantId, allTenants) {
  const tids = (allTenants || []).map((t) => t.id).filter(Boolean);

  switch (tabId) {
    // ── OVERVIEW — cross-tenant summary ─────────────────────────
    case "overview": {
      if (!tids.length) return [];
      const [vatTxRes, vatFiledRes, avcoRes, dupeRes, bankRes] =
        await Promise.allSettled([
          supabase
            .from("vat_transactions")
            .select("tenant_id, vat_period")
            .in("tenant_id", tids),
          supabase
            .from("vat_period_filings")
            .select("tenant_id, period_id")
            .in("tenant_id", tids),
          supabase
            .from("inventory_items")
            .select("tenant_id")
            .in("tenant_id", tids)
            .eq("is_active", true)
            .or("weighted_avg_cost.is.null,weighted_avg_cost.eq.0"),
          supabase
            .from("capture_queue")
            .select("id", { count: "exact", head: true })
            .in("tenant_id", tids)
            .eq("is_duplicate", true),
          supabase
            .from("bank_statement_lines")
            .select("id", { count: "exact", head: true })
            .in("tenant_id", tids)
            .eq("matched_type", "unmatched"),
        ]);

      const vatTxRows = vatTxRes.status === "fulfilled" ? vatTxRes.value.data || [] : [];
      const vatFiledRows = vatFiledRes.status === "fulfilled" ? vatFiledRes.value.data || [] : [];
      const filedSet = new Set(vatFiledRows.map((r) => `${r.tenant_id}::${r.period_id}`));
      const overduePeriods = new Set();
      vatTxRows.forEach((r) => {
        if (!filedSet.has(`${r.tenant_id}::${r.vat_period}`)) {
          overduePeriods.add(`${r.tenant_id}::${r.vat_period}`);
        }
      });
      const overdueTenantsSet = new Set();
      overduePeriods.forEach((k) => overdueTenantsSet.add(k.split("::")[0]));

      const avcoGap = avcoRes.status === "fulfilled" ? (avcoRes.value.data || []).length : 0;
      const dupes = dupeRes.status === "fulfilled" ? dupeRes.value.count || 0 : 0;
      const unmatched = bankRes.status === "fulfilled" ? bankRes.value.count || 0 : 0;

      const pills = [];
      if (overdueTenantsSet.size > 0)
        pills.push({ label: "VAT Overdue", value: `${overdueTenantsSet.size} tenant${overdueTenantsSet.size > 1 ? "s" : ""}`, variant: "danger", context: "vat-network" });
      if (avcoGap > 0)
        pills.push({ label: "AVCO Gaps", value: `${avcoGap} items`, variant: "warning", context: "avco-network" });
      if (dupes > 0)
        pills.push({ label: "Duplicate Invoices", value: `${dupes} flagged`, variant: "danger", context: "capture-network" });
      if (unmatched > 0)
        pills.push({ label: "Unreconciled", value: `${unmatched} lines`, variant: "warning", context: "bank-network" });
      if (pills.length === 0)
        pills.push({ label: "Network", value: "All clear", variant: "success", context: "network-ok" });
      return pills;
    }

    // ── P&L — current tenant ────────────────────────────────────
    case "pl": {
      if (!tenantId) return [];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().slice(0, 10);
      const [avcoRes, expRes] = await Promise.allSettled([
        supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .or("weighted_avg_cost.is.null,weighted_avg_cost.eq.0"),
        supabase
          .from("expenses")
          .select("amount_zar")
          .eq("tenant_id", tenantId)
          .gte("expense_date", monthStart),
      ]);
      const avcoGap = avcoRes.status === "fulfilled" ? avcoRes.value.count || 0 : 0;
      const expMtd = expRes.status === "fulfilled"
        ? (expRes.value.data || []).reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0)
        : 0;
      const pills = [];
      if (avcoGap > 0)
        pills.push({ label: "AVCO Gap", value: `${avcoGap} items — margin unverifiable`, variant: "danger", context: "avco-pl" });
      pills.push({ label: "OpEx MTD", value: fmtR(expMtd), variant: "info", context: "opex-pl" });
      return pills;
    }

    // ── VAT — current tenant ────────────────────────────────────
    case "vat": {
      if (!tenantId) return [];
      const [vatTxRes, vatFiledRes] = await Promise.allSettled([
        supabase
          .from("vat_transactions")
          .select("vat_period")
          .eq("tenant_id", tenantId),
        supabase
          .from("vat_period_filings")
          .select("period_id")
          .eq("tenant_id", tenantId),
      ]);
      const periods = new Set(
        (vatTxRes.status === "fulfilled" ? vatTxRes.value.data || [] : []).map((r) => r.vat_period)
      );
      const filed = new Set(
        (vatFiledRes.status === "fulfilled" ? vatFiledRes.value.data || [] : []).map((r) => r.period_id)
      );
      const overdue = [...periods].filter((p) => !filed.has(p));
      const pills = [];
      overdue.forEach((p) =>
        pills.push({ label: "VAT Overdue", value: p, variant: "danger", context: "vat-overdue" })
      );
      if (overdue.length === 0)
        pills.push({ label: "VAT", value: "All periods filed", variant: "success", context: "vat-ok" });
      return pills;
    }

    // ── HQ STOCK — current tenant ───────────────────────────────
    case "hq-stock": {
      if (!tenantId) return [];
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      const [avcoRes, deadRes, reorderRes] = await Promise.allSettled([
        supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .or("weighted_avg_cost.is.null,weighted_avg_cost.eq.0"),
        supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .gt("quantity_on_hand", 0)
          .lt("last_movement_at", sixMonthsAgo),
        supabase
          .from("inventory_items")
          .select("id,quantity_on_hand,reorder_level")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .gt("reorder_level", 0),
      ]);
      const avcoGap = avcoRes.status === "fulfilled" ? avcoRes.value.count || 0 : 0;
      const dead = deadRes.status === "fulfilled" ? deadRes.value.count || 0 : 0;
      const reorderItems = reorderRes.status === "fulfilled" ? reorderRes.value.data || [] : [];
      const belowReorder = reorderItems.filter(
        (i) => (parseFloat(i.quantity_on_hand) || 0) <= (parseFloat(i.reorder_level) || 0)
      ).length;
      const pills = [];
      if (avcoGap > 0)
        pills.push({ label: "No Cost Price", value: `${avcoGap} items`, variant: "danger", context: "avco-stock" });
      if (dead > 0)
        pills.push({ label: "Dead Stock", value: `${dead} items`, variant: "warning", context: "dead-stock" });
      if (belowReorder > 0)
        pills.push({ label: "Below Reorder", value: `${belowReorder} items`, variant: "warning", context: "reorder-stock" });
      return pills;
    }

    // ── TENANTS — allTenants health overview ────────────────────
    case "tenants": {
      if (!tids.length) return [];
      const [avcoRes, vatTxRes, vatFiledRes] = await Promise.allSettled([
        supabase
          .from("inventory_items")
          .select("tenant_id")
          .in("tenant_id", tids)
          .eq("is_active", true)
          .or("weighted_avg_cost.is.null,weighted_avg_cost.eq.0"),
        supabase
          .from("vat_transactions")
          .select("tenant_id, vat_period")
          .in("tenant_id", tids),
        supabase
          .from("vat_period_filings")
          .select("tenant_id, period_id")
          .in("tenant_id", tids),
      ]);
      const avcoByTenant = {};
      (avcoRes.status === "fulfilled" ? avcoRes.value.data || [] : []).forEach((r) => {
        avcoByTenant[r.tenant_id] = (avcoByTenant[r.tenant_id] || 0) + 1;
      });
      const filedSet = new Set(
        (vatFiledRes.status === "fulfilled" ? vatFiledRes.value.data || [] : []).map(
          (r) => `${r.tenant_id}::${r.period_id}`
        )
      );
      const vatOverdueTenants = new Set();
      (vatTxRes.status === "fulfilled" ? vatTxRes.value.data || [] : []).forEach((r) => {
        if (!filedSet.has(`${r.tenant_id}::${r.vat_period}`))
          vatOverdueTenants.add(r.tenant_id);
      });
      const avcoHighTenants = Object.keys(avcoByTenant).filter((tid) => avcoByTenant[tid] > 10);
      const needAttention = new Set([...vatOverdueTenants, ...avcoHighTenants]);
      const pills = [];
      if (needAttention.size > 0)
        pills.push({
          label: "Stores need attention",
          value: `${needAttention.size} of ${tids.length}`,
          variant: needAttention.size > tids.length / 2 ? "danger" : "warning",
          context: "tenant-health",
        });
      else
        pills.push({ label: "All stores", value: "Healthy", variant: "success", context: "tenant-ok" });
      return pills;
    }

    default:
      return [];
  }
}

export function useHQIntelStrip(tabId, tenantId, allTenants) {
  const [pills, setPills] = useState([]);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    if (!tabId) { setPills([]); return; }
    setLoading(true);
    try {
      const p = await buildHQPills(tabId, tenantId, allTenants);
      setPills(p || []);
    } catch (err) {
      console.error("[useHQIntelStrip]", tabId, err);
      setPills([]);
    } finally {
      setLoading(false);
    }
  }, [tabId, tenantId, allTenants]);

  useEffect(() => { compute(); }, [compute]);

  return { pills, loading };
}
