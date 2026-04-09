// src/hooks/useBrief.js
// WP-AINS Phase 4 — NuAi Panel Brief
// SQL-computed brief per tab. No LLM. Instant on panel open.
// Returns: { brief: { rightNow, workingWell, actions, summary }, loading }

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

const fmtR = (n) => "R" + Math.round(n).toLocaleString("en-ZA");

async function compute(tabId, tenantId, intel) {
  const inv   = intel?.inventory || {};
  const sales = intel?.sales     || {};
  const rightNow    = [];
  const workingWell = [];
  const actions     = [];

  // ── STOCK / CATALOG / OVERVIEW ───────────────────────────────────────���────
  if (["stock","catalog","overview","reorder"].includes(tabId)) {
    const itemsR = await supabase
      .from("inventory_items")
      .select("name,quantity_on_hand,reorder_level,weighted_avg_cost,sell_price,category")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("quantity_on_hand", { ascending: true })
      .limit(60);
    const items   = itemsR.data || [];
    const oos     = items.filter(i => (i.quantity_on_hand || 0) <= 0);
    const low     = items.filter(i =>
      i.reorder_level != null &&
      (i.quantity_on_hand || 0) > 0 &&
      (i.quantity_on_hand || 0) <= i.reorder_level
    );
    const noAvco  = items.filter(i =>
      !(i.weighted_avg_cost > 0) && (i.quantity_on_hand || 0) > 0
    );

    oos.slice(0, 3).forEach(item => {
      rightNow.push({
        variant:     "danger",
        text:        `${item.name} — out of stock.`,
        actionLabel: "Raise PO",
        actionQuery: `I need to raise a purchase order for ${item.name} which is out of stock. What should I order and who do I order from?`,
      });
    });

    low.slice(0, 3).forEach(item => {
      rightNow.push({
        variant:     "warning",
        text:        `${item.name} — ${item.quantity_on_hand} unit${item.quantity_on_hand !== 1 ? "s" : ""} left, reorder level is ${item.reorder_level}.`,
        actionLabel: null,
        actionQuery: null,
      });
    });

    if (noAvco.length > 0) {
      const cats = [...new Set(noAvco.map(i => i.category))].slice(0, 3).join(", ");
      rightNow.push({
        variant:     "warning",
        text:        `${noAvco.length} item${noAvco.length !== 1 ? "s" : ""} have no cost entered (${cats}) — margin data is unreliable.`,
        actionLabel: "Show items",
        actionQuery: `Show me all active inventory items with no weighted average cost so I can enter the correct cost data.`,
      });
    }

    if (oos.length === 0 && low.length === 0) {
      workingWell.push({
        variant: "success",
        text:    `All ${items.length} active items are in stock — no OOS issues.`,
      });
    }

    if (inv.bestCat && inv.bestCatPct > 0) {
      workingWell.push({
        variant: "success",
        text:    `${inv.bestCat} at ${inv.bestCatPct}% margin — your best performing category.`,
      });
    }

    if (oos.length > 0) {
      actions.push({
        text:        `Prioritise restocking ${oos.length} OOS item${oos.length !== 1 ? "s" : ""} before you lose more sales.`,
        actionLabel: "Help me prioritise",
        actionQuery: `I have ${oos.length} items out of stock: ${oos.slice(0, 5).map(i => i.name).join(", ")}. Help me prioritise which to restock first based on sales velocity and margin.`,
      });
    }
  }

  // ── TRADING / POS / OVERVIEW ──────────────────────────────────────────────
  if (["trading","pos","overview","cashup"].includes(tabId)) {
    const todayRev   = sales.todayRevenue || 0;
    const bestDay    = sales.bestDayRev   || 0;
    const todayVsBest = sales.todayVsBest;
    const todayCount  = sales.todayOrders || 0;

    if (todayRev > 0 && todayVsBest != null) {
      if (todayVsBest < 50) {
        rightNow.push({
          variant:     "warning",
          text:        `${fmtR(todayRev)} today — ${todayVsBest}% of your best day (${fmtR(bestDay)}). Below pace.`,
          actionLabel: "Analyse gap",
          actionQuery: `My sales today are ${fmtR(todayRev)} which is ${todayVsBest}% of my best day of ${fmtR(bestDay)}. What could explain the gap and what should I do?`,
        });
      } else {
        workingWell.push({
          variant: "success",
          text:    `${fmtR(todayRev)} today — ${todayVsBest}% of your best day. ${todayVsBest >= 80 ? "Strong session." : "On track."}`,
        });
      }
    }

    if (todayCount > 0) {
      const avgBasket = Math.round(todayRev / todayCount);
      workingWell.push({
        variant: null,
        text:    `${todayCount} orders today · avg basket ${fmtR(avgBasket)}.`,
      });
    }

    actions.push({
      text:        "See what's selling today and compare to yesterday.",
      actionLabel: "Top sellers",
      actionQuery: "What are my top selling products today and how does today's revenue compare to yesterday?",
    });
  }

  // ── P&L / EXPENSES / VAT ──────────────────────────────────────────────────
  if (["pl","expenses","vat","bank-recon","journals"].includes(tabId)) {
    // GAP-01 resolved — revenue is now displayed ex-VAT (÷1.15) in HQProfitLoss.

    const expR = await supabase
      .from("expenses")
      .select("id,input_vat_amount")
      .eq("tenant_id", tenantId);
    const allExp     = expR.data || [];
    const missingVat = allExp.filter(e => !(parseFloat(e.input_vat_amount) > 0)).length;

    if (missingVat > 0) {
      rightNow.push({
        variant:     "warning",
        text:        `${missingVat} expense${missingVat !== 1 ? "s" : ""} have no VAT amount entered — input VAT is understated. (GAP-03)`,
        actionLabel: "Show expenses",
        actionQuery: `Show me the ${missingVat} expenses that are missing VAT amounts so I can enter the correct input VAT figures.`,
      });
    }

    if (sales.mtdRevenue > 0) {
      workingWell.push({
        variant: "success",
        text:    `${fmtR(sales.mtdRevenue)} MTD revenue (ex-VAT) from ${sales.mtdOrders || 0} orders.`,
      });
    }

    actions.push({
      text:        "Run a full financial health check for this month.",
      actionLabel: "Health check",
      actionQuery: "Give me a full financial health check for this month — revenue, expenses, gross margin, and anything I should be acting on.",
    });
  }

  // ── PROCUREMENT / SUPPLIERS ───────────────────────────────────────────────
  if (["procurement","suppliers"].includes(tabId)) {
    const [poR, suppR] = await Promise.allSettled([
      supabase.from("purchase_orders")
        .select("id,status,expected_delivery_date,supplier_name")
        .eq("tenant_id", tenantId),
      supabase.from("suppliers")
        .select("id,name")
        .eq("tenant_id", tenantId),
    ]);
    const pos      = poR.status  === "fulfilled" ? poR.value.data  || [] : [];
    const supps    = suppR.status === "fulfilled" ? suppR.value.data || [] : [];
    const today    = new Date().toISOString().slice(0, 10);
    const overdue  = pos.filter(p =>
      p.expected_delivery_date && p.expected_delivery_date < today &&
      !["completed","received","cancelled"].includes(p.status)
    );
    const open     = pos.filter(p => !["completed","received","cancelled"].includes(p.status));

    if (supps.length === 0) {
      rightNow.push({
        variant:     "danger",
        text:        "No suppliers on file — you cannot raise proper purchase orders.",
        actionLabel: "Add supplier",
        actionQuery: "How do I add a supplier to the system and what information do I need?",
      });
    }

    if (overdue.length > 0) {
      rightNow.push({
        variant:     "danger",
        text:        `${overdue.length} purchase order${overdue.length !== 1 ? "s" : ""} overdue — follow up required.`,
        actionLabel: "Review POs",
        actionQuery: `I have ${overdue.length} overdue purchase orders. What should I do to follow up?`,
      });
    }

    if (open.length > 0 && overdue.length === 0) {
      workingWell.push({
        variant: "info",
        text:    `${open.length} open PO${open.length !== 1 ? "s" : ""} in progress — all on track.`,
      });
    }

    if (supps.length > 0) {
      workingWell.push({
        variant: null,
        text:    `${supps.length} supplier${supps.length !== 1 ? "s" : ""} on file: ${supps.slice(0, 3).map(s => s.name).join(", ")}${supps.length > 3 ? " +more" : ""}.`,
      });
    }

    actions.push({
      text:        "Review stock levels and identify what needs ordering.",
      actionLabel: "What to order",
      actionQuery: "Which items are running low or out of stock and need a purchase order raised?",
    });
  }

  // ── LOYALTY / CUSTOMERS ───────────────────────────────────────────────────
  if (["loyalty","customers"].includes(tabId)) {
    workingWell.push({
      variant: "success",
      text:    `${sales.mtdOrders || 0} orders MTD — loyalty programme is active.`,
    });

    actions.push({
      text:        "Identify your highest-value and at-risk customers.",
      actionLabel: "Customer health",
      actionQuery: "Show me my top customers by spend MTD and any customers who seem at risk of churning.",
    });
  }

  // ── SUMMARY LINE ──────────────────────────────────────────────────────────
  const parts = [];
  const oosCount = rightNow.filter(r => r.variant === "danger").length;
  if (oosCount > 0) parts.push(`${oosCount} critical`);
  const warnCount = rightNow.filter(r => r.variant === "warning").length;
  if (warnCount > 0) parts.push(`${warnCount} warnings`);
  if (inv.bestCat && inv.bestCatPct > 0) parts.push(`${inv.bestCat} ${inv.bestCatPct}%`);
  if (sales.todayRevenue > 0) parts.push(fmtR(sales.todayRevenue) + " today");
  const summary = parts.length > 0 ? parts.join(" · ") : "All systems clear";

  return { rightNow, workingWell, actions, summary };
}

export function useBrief(tenantId, tabId, intel) {
  const [brief, setBrief]   = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (!tenantId || !tabId) return;
    setLoading(true);
    try {
      const result = await compute(tabId, tenantId, intel);
      setBrief(result);
    } catch (err) {
      console.error("[useBrief]", tabId, err);
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, tabId, intel]);

  useEffect(() => { run(); }, [run]);

  return { brief, loading };
}
