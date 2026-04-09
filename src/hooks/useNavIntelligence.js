// src/hooks/useNavIntelligence.js
// WP-AINS Phase 1 — Intelligence Foundation
// Runs 6 Supabase queries in parallel on mount.
// Returns structured intelligence object consumed by NavSidebar,
// AIFixture, IntelStrip, and NuAiBrief via IntelligenceContext.
// Refreshes every 5 minutes. Zero LLM calls.

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

const REFRESH_MS = 5 * 60 * 1000;
const fmtR = (n) => "R" + Math.round(n).toLocaleString("en-ZA");
const fmtPct = (n) => Math.round(n * 10) / 10 + "%";

export function useNavIntelligence(tenantId) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef            = useRef(null);

  const run = useCallback(async () => {
    if (!tenantId) return;
    try {
      const now        = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [invR, todayR, mtdR, alertsR, commsR] = await Promise.allSettled([
        // 1 — inventory health (all active items)
        supabase
          .from("inventory_items")
          .select("name,quantity_on_hand,reorder_level,weighted_avg_cost,sell_price,category")
          .eq("tenant_id", tenantId)
          .eq("is_active", true),

        // 2 — today's paid orders
        supabase
          .from("orders")
          .select("total,created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", todayStart),

        // 3 — MTD paid orders
        supabase
          .from("orders")
          .select("total,created_at")
          .eq("tenant_id", tenantId)
          .eq("status", "paid")
          .gte("created_at", monthStart),

        // 4 — unacknowledged system alerts
        supabase
          .from("system_alerts")
          .select("id,severity,alert_type,message")
          .eq("tenant_id", tenantId)
          .is("acknowledged_at", null)
          .order("created_at", { ascending: false })
          .limit(20),

        // 5 — unread customer messages
        supabase
          .from("customer_messages")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .is("read_at", null),
      ]);

      // ── Inventory ──────────────────────────────────────────────────
      const items    = invR.status === "fulfilled" ? invR.value.data || [] : [];
      const oos      = items.filter((i) => (i.quantity_on_hand || 0) <= 0).length;
      const lowStock = items.filter(
        (i) => i.reorder_level != null &&
               (i.quantity_on_hand || 0) > 0 &&
               (i.quantity_on_hand || 0) <= i.reorder_level
      ).length;
      const noAvco = items.filter(
        (i) => !(i.weighted_avg_cost > 0) && (i.quantity_on_hand || 0) > 0
      ).length;

      // Best margin category
      const catMap = {};
      items.forEach((i) => {
        if (!i.category) return;
        if (!catMap[i.category]) catMap[i.category] = [];
        if (i.sell_price > 0 && i.weighted_avg_cost > 0) {
          catMap[i.category].push(
            ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100
          );
        }
      });
      let bestCat = null, bestCatPct = 0;
      Object.entries(catMap).forEach(([cat, margins]) => {
        if (!margins.length) return;
        const avg = margins.reduce((s, m) => s + m, 0) / margins.length;
        if (avg > bestCatPct) { bestCatPct = avg; bestCat = cat; }
      });

      // Most critical stock item for IntelLines
      const criticalItem = items
        .filter((i) =>
          (i.quantity_on_hand || 0) <= 0 ||
          (i.reorder_level != null && (i.quantity_on_hand || 0) <= i.reorder_level)
        )
        .sort((a, b) => (a.quantity_on_hand || 0) - (b.quantity_on_hand || 0))[0];

      // ── Orders ─────────────────────────────────────────────────────
      const todayOrders  = todayR.status === "fulfilled" ? todayR.value.data || [] : [];
      const todayCount   = todayOrders.length;
      const todayRev     = todayOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);

      const mtdOrders    = mtdR.status === "fulfilled" ? mtdR.value.data || [] : [];
      const mtdCount     = mtdOrders.length;
      const mtdRevIncl   = mtdOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
      const mtdRevExcl   = Math.round((mtdRevIncl / 1.15) * 100) / 100;

      // Best day this month (for % comparison)
      const dayTotals = {};
      mtdOrders.forEach((o) => {
        const d = o.created_at.slice(0, 10);
        dayTotals[d] = (dayTotals[d] || 0) + (parseFloat(o.total) || 0);
      });
      const bestDayRev  = Math.max(...Object.values(dayTotals), 0);
      const todayVsBest = bestDayRev > 0
        ? Math.round((todayRev / bestDayRev) * 100)
        : null;

      // ── Alerts & comms ─────────────────────────────────────────────
      const alerts      = alertsR.status === "fulfilled" ? alertsR.value.data || [] : [];
      const critAlerts  = alerts.filter((a) => ["critical","danger"].includes(a.severity)).length;
      const warnAlerts  = alerts.filter((a) => a.severity === "warning").length;
      const unreadComms = commsR.status === "fulfilled" ? commsR.value.count || 0 : 0;

      // ── IntelLines (2 lines: critical first, then positive) ────────
      const lines = [];

      if (criticalItem) {
        const qty = criticalItem.quantity_on_hand || 0;
        lines.push({
          text: qty <= 0
            ? `${criticalItem.name} · out of stock`
            : `${criticalItem.name} · ${qty} unit${qty !== 1 ? "s" : ""} left`,
          variant: qty <= 0 ? "danger" : "warning",
          context: "stock-critical",
          tab:     "stock",
        });
      } else if (critAlerts > 0) {
        lines.push({
          text:    `${critAlerts} critical alert${critAlerts !== 1 ? "s" : ""} need attention`,
          variant: "danger",
          context: "alerts",
          tab:     "overview",
        });
      }

      if (bestCat) {
        lines.push({
          text:    `${bestCat} · ${fmtPct(bestCatPct)} margin · best category`,
          variant: "success",
          context: "top-category",
          tab:     "stock",
        });
      } else if (todayRev > 0) {
        lines.push({
          text:    `${fmtR(todayRev)} today · ${mtdCount} orders MTD`,
          variant: "success",
          context: "revenue",
          tab:     "trading",
        });
      }

      // Ensure at least 2 lines
      if (lines.length < 1) {
        lines.push({
          text:    mtdRevExcl > 0 ? `${fmtR(mtdRevExcl)} MTD · ${mtdCount} orders` : "All systems clear",
          variant: "info",
          context: "revenue",
          tab:     "trading",
        });
      }
      if (lines.length < 2) {
        lines.push({
          text:    todayRev > 0
            ? `${fmtR(todayRev)} today · ${todayVsBest != null ? todayVsBest + "% of best" : todayCount + " orders"}`
            : `${items.length} items · ${oos} OOS`,
          variant: "info",
          context: "revenue",
          tab:     "trading",
        });
      }

      // ── NuAi mark bottom line ──────────────────────────────────────
      let nuaiMark = "Ask anything";
      if (todayRev > 0 && todayVsBest != null) {
        nuaiMark = `↑ ${fmtR(todayRev)} today · ${todayVsBest}% of best`;
      } else if (todayRev > 0) {
        nuaiMark = `${fmtR(todayRev)} today · ${todayCount} orders`;
      } else if (mtdRevExcl > 0) {
        nuaiMark = `${fmtR(mtdRevExcl)} MTD · ${mtdCount} orders`;
      }

      // ── Sub-item insight strings ───────────────────────────────────
      const subItems = {
        stock:    lowStock > 0 || oos > 0
          ? `${oos + lowStock} need attention`
          : "all stocked ✓",
        catalog:  `${items.length} active${oos > 0 ? " · " + oos + " OOS" : ""}`,
        pos:      todayRev > 0 ? `${fmtR(todayRev)} today` : "no sales yet",
        pl:       bestCat
          ? `${bestCat} ${fmtPct(bestCatPct)} best`
          : mtdRevExcl > 0 ? `${fmtR(mtdRevExcl)} MTD` : "",
        loyalty:  `${mtdCount} orders MTD`,
        expenses: "",
        vat:      "",
      };

      // ── Badge variants ─────────────────────────────────────────────
      const invBadge   = oos + lowStock;
      const salesBadge = todayCount;
      const custBadge  = unreadComms;
      const rptBadge   = critAlerts;

      setData({
        inventory: {
          outOfStock:   oos,
          belowReorder: lowStock,
          missingAvco:  noAvco,
          totalActive:  items.length,
          bestCat,
          bestCatPct:   Math.round(bestCatPct * 10) / 10,
          badgeCount:   invBadge,
          badgeVariant: oos > 0 ? "danger" : invBadge > 0 ? "warning" : null,
        },
        sales: {
          todayOrders:  todayCount,
          todayRevenue: Math.round(todayRev * 100) / 100,
          mtdOrders:    mtdCount,
          mtdRevenue:   mtdRevExcl,
          todayVsBest,
          bestDayRev:   Math.round(bestDayRev * 100) / 100,
          badgeCount:   salesBadge,
          badgeVariant: salesBadge > 0 ? "info" : null,
        },
        customers: {
          unreadMessages: unreadComms,
          badgeCount:     custBadge,
          badgeVariant:   custBadge > 0 ? "warning" : null,
        },
        reports: {
          criticalAlerts: critAlerts,
          warningAlerts:  warnAlerts,
          badgeCount:     rptBadge,
          badgeVariant:   rptBadge > 0 ? "danger" : null,
        },
        subItems,
        intelLines:    lines.slice(0, 2),
        nuaiMark,
        lastRefreshed: new Date(),
      });
    } catch (err) {
      console.error("[useNavIntelligence]", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    run();
    timerRef.current = setInterval(run, REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [run]);

  return { data, loading, refresh: run };
}
