// src/hooks/useIntelStrip.js
// WP-AINS Phase 3 — IntelStrip
// Returns array of pills for the current tab.
// Maximises reuse of IntelligenceContext data already computed.
// Only runs fresh Supabase queries for tabs needing specific data.
// Returns: [{ label, value, variant, context }]
// variant: null | 'success' | 'warning' | 'danger' | 'info'

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

const fmtR  = (n) => "R" + Math.round(n).toLocaleString("en-ZA");
const fmtPct = (n) => (Math.round(n * 10) / 10) + "%";

async function buildPills(tabId, tenantId, intel) {
  const inv   = intel?.inventory  || {};
  const sales = intel?.sales      || {};
  const cust  = intel?.customers  || {};

  switch (tabId) {

    // ── OVERVIEW / DASHBOARD ───────────────────────────────────────
    case "overview": {
      return [
        { label: "Today's sales",    value: fmtR(sales.todayRevenue || 0),  variant: sales.todayRevenue > 0 ? "success" : null, context: "revenue" },
        { label: "Orders today",     value: String(sales.todayOrders || 0),  variant: "info",    context: "orders" },
        { label: "Stock alerts",     value: String(inv.badgeCount || 0),     variant: inv.badgeCount > 0 ? "warning" : "success", context: "stock" },
        { label: "MTD revenue",      value: fmtR(sales.mtdRevenue || 0),    variant: null,       context: "revenue-mtd" },
      ];
    }

    // ── STOCK ──────────────────────────────────────────────────────
    case "stock": {
      const stockVal = await supabase
        .from("inventory_items")
        .select("quantity_on_hand,weighted_avg_cost")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      const val = (stockVal.data || [])
        .reduce((s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0), 0);
      return [
        { label: "Total SKUs",       value: String(inv.totalActive || 0),   variant: null,       context: "skus" },
        { label: "Stock value",      value: fmtR(val),                       variant: null,       context: "value" },
        { label: "Below reorder",    value: String(inv.belowReorder || 0),  variant: inv.belowReorder > 0 ? "warning" : "success", context: "reorder" },
        { label: "Out of stock",     value: String(inv.outOfStock || 0),    variant: inv.outOfStock > 0 ? "danger" : "success",  context: "oos" },
        { label: "Best margin",      value: inv.bestCat ? `${inv.bestCat} ${fmtPct(inv.bestCatPct)}` : "—", variant: "success", context: "margin" },
      ];
    }

    // ── CATALOG ────────────────────────────────────────────────────
    case "catalog": {
      const catR = await supabase
        .from("inventory_items")
        .select("sell_price,weighted_avg_cost,is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      const items = catR.data || [];
      const withPrice = items.filter(i => i.sell_price > 0).length;
      const noPrice   = items.filter(i => !(i.sell_price > 0)).length;
      const margins   = items.filter(i => i.sell_price > 0 && i.weighted_avg_cost > 0)
        .map(i => ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100);
      const avgMargin = margins.length
        ? margins.reduce((s, m) => s + m, 0) / margins.length : 0;
      return [
        { label: "Active items",     value: String(items.length),           variant: null,       context: "active" },
        { label: "With price",       value: String(withPrice),              variant: "success",  context: "priced" },
        { label: "No price set",     value: String(noPrice),                variant: noPrice > 0 ? "danger" : "success", context: "no-price" },
        { label: "Avg margin",       value: fmtPct(avgMargin),              variant: avgMargin > 60 ? "success" : "warning", context: "avg-margin" },
      ];
    }

    // ── PURCHASE ORDERS ────────────────────────────────────────────
    case "procurement": {
      const [poR, suppR] = await Promise.allSettled([
        supabase.from("purchase_orders").select("id,status,expected_delivery_date")
          .eq("tenant_id", tenantId),
        supabase.from("suppliers").select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
      ]);
      const pos      = poR.status === "fulfilled" ? poR.value.data || [] : [];
      const open     = pos.filter(p => !["completed","cancelled","received"].includes(p.status)).length;
      const today    = new Date().toISOString().slice(0, 10);
      const overdue  = pos.filter(p => p.expected_delivery_date && p.expected_delivery_date < today
        && !["completed","received"].includes(p.status)).length;
      const suppCount = suppR.status === "fulfilled" ? suppR.value.count || 0 : 0;
      return [
        { label: "Open POs",         value: String(open),                   variant: open > 0 ? "info" : null,    context: "open-pos" },
        { label: "Overdue",          value: String(overdue),                variant: overdue > 0 ? "danger" : "success", context: "overdue-pos" },
        { label: "Suppliers on file",value: String(suppCount),              variant: suppCount === 0 ? "danger" : null, context: "suppliers" },
      ];
    }

    // ── DAILY TRADING ──────────────────────────────────────────────
    case "trading": {
      const now = new Date();
      const ystStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const ystEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const ystR = await supabase
        .from("orders")
        .select("total")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", ystStart)
        .lt("created_at", ystEnd);
      const ystRev = (ystR.data || []).reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
      const todayRev = sales.todayRevenue || 0;
      const vsYest = ystRev > 0 ? Math.round(((todayRev - ystRev) / ystRev) * 100) : null;
      const avgBasket = sales.todayOrders > 0
        ? Math.round((todayRev / sales.todayOrders) * 100) / 100 : 0;
      return [
        { label: "Today's revenue",  value: fmtR(todayRev),                variant: todayRev > 0 ? "success" : null, context: "revenue" },
        { label: "Orders today",     value: String(sales.todayOrders || 0), variant: "info",   context: "orders" },
        { label: "Avg basket",       value: avgBasket > 0 ? fmtR(avgBasket) : "—", variant: null, context: "basket" },
        { label: "vs yesterday",     value: vsYest != null ? (vsYest >= 0 ? "+" : "") + vsYest + "%" : "—",
          variant: vsYest == null ? null : vsYest >= 0 ? "success" : "danger", context: "vs-yesterday" },
      ];
    }

    // ── P&L — via tenant_financial_period RPC (LL-210) ──────────
    case "pl": {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data: fp } = await supabase.rpc("tenant_financial_period", {
        p_tenant_id: tenantId,
        p_since: monthStart.toISOString(),
        p_until: new Date().toISOString(),
      });
      let revMtd   = fp?.revenue?.ex_vat || 0;
      let cogsMtd  = fp?.cogs?.actual || 0;
      const expMtd = fp?.opex?.total || 0;
      // LL-231: cannabis_dispensary revenue = dispensing_log × sell_price, not orders/RPC
      // The tenant_financial_period RPC returns 0 for dispensary profiles — override.
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("industry_profile")
        .eq("id", tenantId)
        .maybeSingle();
      if (tenantRow?.industry_profile === "cannabis_dispensary") {
        const { data: dispensingData } = await supabase
          .from("dispensing_log")
          .select("quantity_dispensed,inventory_items!inner(sell_price,cost_price,weighted_avg_cost)")
          .eq("tenant_id", tenantId)
          .eq("is_voided", false)
          .gte("dispensed_at", monthStart.toISOString());
        let dRev = 0, dCogs = 0;
        (dispensingData || []).forEach(d => {
          const q = parseFloat(d.quantity_dispensed) || 0;
          const sell = parseFloat(d.inventory_items?.sell_price) || 0;
          const cost = parseFloat(d.inventory_items?.weighted_avg_cost) || parseFloat(d.inventory_items?.cost_price) || 0;
          dRev  += q * sell;
          dCogs += q * cost;
        });
        revMtd  = dRev;
        cogsMtd = dCogs;
      }
      const grossPft = revMtd - cogsMtd;
      const margin   = revMtd > 0 ? (grossPft / revMtd) * 100 : 0;
      return [
        { label: "Revenue MTD",      value: fmtR(revMtd),                  variant: revMtd > 0 ? "success" : null, context: "revenue-mtd" },
        { label: "COGS MTD",         value: fmtR(cogsMtd),                 variant: null,       context: "cogs" },
        { label: "Gross Profit",     value: fmtR(grossPft),                variant: grossPft > 0 ? "success" : "danger", context: "gross-profit" },
        { label: "Margin",           value: fmtPct(margin),                variant: margin > 50 ? "success" : margin > 30 ? "warning" : "danger", context: "margin" },
        { label: "OpEx MTD",         value: fmtR(expMtd),                  variant: null,       context: "expenses" },
      ];
    }

    // ── EXPENSES ───────────────────────────────────────────────────
    case "expenses": {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().slice(0, 10);
      const expR = await supabase
        .from("expenses")
        .select("amount_zar,input_vat_amount,category")
        .eq("tenant_id", tenantId)
        .gte("expense_date", monthStart);
      const exps       = expR.data || [];
      const totalMtd   = exps.reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);
      const missingVat = exps.filter(e => !(parseFloat(e.input_vat_amount) > 0)).length;
      const cats       = new Set(exps.map(e => e.category).filter(Boolean)).size;
      return [
        { label: "Total MTD",        value: fmtR(totalMtd),                variant: null,       context: "expenses-total" },
        { label: "Entries",          value: String(exps.length),            variant: null,       context: "entries" },
        { label: "Missing VAT",      value: String(missingVat),             variant: missingVat > 0 ? "danger" : "success", context: "missing-vat" },
        { label: "Categories",       value: String(cats),                   variant: null,       context: "categories" },
      ];
    }

    // ── VAT ────────────────────────────────────────────────────────
    case "vat": {
      const now = new Date();
      const periodId = `${now.getFullYear()}-P${Math.ceil((now.getMonth() + 1) / 2)}`;
      const vatR = await supabase
        .from("vat_transactions")
        .select("output_vat,input_vat")
        .eq("tenant_id", tenantId)
        .eq("vat_period", periodId);
      const vats      = vatR.data || [];
      const outputVat = vats.reduce((s, v) => s + (parseFloat(v.output_vat) || 0), 0);
      const inputVat  = vats.reduce((s, v) => s + (parseFloat(v.input_vat)  || 0), 0);
      const net       = outputVat - inputVat;
      return [
        { label: "Output VAT",       value: fmtR(outputVat),               variant: null,       context: "output-vat" },
        { label: "Input VAT",        value: fmtR(inputVat),                variant: inputVat === 0 ? "danger" : null, context: "input-vat" },
        { label: "Net payable",      value: fmtR(net),                     variant: net > 0 ? "warning" : "success", context: "net-vat" },
        { label: "Period",           value: periodId,                       variant: null,       context: "vat-period" },
      ];
    }

    // ── LOYALTY ────────────────────────────────────────────────────
    case "loyalty": {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString();
      const [txR, activeR] = await Promise.allSettled([
        supabase.from("loyalty_transactions").select("points,transaction_type")
          .eq("tenant_id", tenantId).gte("created_at", monthStart),
        supabase.from("loyalty_transactions").select("user_id")
          .eq("tenant_id", tenantId).gte("created_at", new Date(Date.now() - 7*24*60*60*1000).toISOString()),
      ]);
      const txs          = txR.status === "fulfilled" ? txR.value.data || [] : [];
      const issued       = txs.filter(t => (t.transaction_type || '').toLowerCase().includes('earn'))
        .reduce((s, t) => s + (t.points || 0), 0);
      const activeCust   = txR.status === "fulfilled"
        ? new Set((activeR.status === "fulfilled" ? activeR.value.data || [] : []).map(t => t.user_id)).size : 0;
      return [
        { label: "Transactions MTD", value: String(txs.length),            variant: null,       context: "loyalty-tx" },
        { label: "Points issued",    value: String(Math.round(issued)),     variant: "success",  context: "points-issued" },
        { label: "Active (7d)",      value: String(activeCust),             variant: activeCust > 0 ? "info" : null, context: "active-cust" },
      ];
    }

    // ── CUSTOMERS / PROFILES ───────────────────────────────────────
    case "customers": {
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      const [profR, newR] = await Promise.allSettled([
        supabase.from("user_profiles")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase.from("user_profiles")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", weekAgo),
      ]);
      const total   = profR.status === "fulfilled" ? profR.value.count ?? 0 : 0;
      const newThis = newR.status  === "fulfilled" ? newR.value.count  ?? 0 : 0;
      const unread  = cust.unreadMessages || 0;
      return [
        { label: "Profiles",         value: String(total),                  variant: null,       context: "profiles" },
        { label: "New this week",    value: String(newThis),                variant: newThis > 0 ? "info" : null,    context: "new-cust" },
        { label: "Unread messages",  value: String(unread),                 variant: unread > 0 ? "warning" : "success", context: "messages" },
      ];
    }

    // ── ANALYTICS ─────────────────────────────────────────────────
    // scan_logs has no tenant_id column — rely on context data only.
    case "analytics": {
      return [
        { label: "MTD orders",       value: String(sales.mtdOrders || 0),  variant: sales.mtdOrders > 0 ? "info" : null, context: "orders-mtd" },
        { label: "MTD revenue",      value: fmtR(sales.mtdRevenue || 0),   variant: null,       context: "revenue-mtd" },
        { label: "Active customers", value: String(cust.unreadMessages > 0 ? "!" : "—"), variant: null, context: "customers" },
        { label: "Stock alerts",     value: String(inv.badgeCount || 0),   variant: inv.badgeCount > 0 ? "warning" : "success", context: "stock" },
      ];
    }

    // ── REORDER ────────────────────────────────────────────────────
    case "reorder": {
      return [
        { label: "Below reorder",    value: String(inv.belowReorder || 0), variant: inv.belowReorder > 0 ? "warning" : "success", context: "reorder" },
        { label: "Out of stock",     value: String(inv.outOfStock || 0),   variant: inv.outOfStock > 0 ? "danger" : "success",    context: "oos" },
        { label: "Total active",     value: String(inv.totalActive || 0),  variant: null,       context: "active" },
      ];
    }

    // ── STAFF / TEAM ───────────────────────────────────────────────
    case "staff": {
      const staffR = await supabase
        .from("staff_profiles")
        .select("id,employment_status", { count: "exact" })
        .eq("tenant_id", tenantId);
      const staff  = staffR.data || [];
      const active = staff.filter(s => s.employment_status === "active").length;
      return [
        { label: "Total staff",      value: String(staffR.count || staff.length), variant: null, context: "staff" },
        { label: "Active",           value: String(active),                variant: null,       context: "staff-active" },
      ];
    }

    default:
      return [];
  }
}

export function useIntelStrip(tabId, tenantId, intelligenceData) {
  const [pills, setPills]   = useState([]);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    if (!tenantId || !tabId) { setPills([]); return; }
    setLoading(true);
    try {
      const p = await buildPills(tabId, tenantId, intelligenceData);
      setPills(p || []);
    } catch (err) {
      console.error("[useIntelStrip]", tabId, err);
      setPills([]);
    } finally {
      setLoading(false);
    }
  }, [tabId, tenantId, intelligenceData]);

  useEffect(() => { compute(); }, [compute]);

  return { pills, loading };
}
