// src/services/systemHealthContext.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM HEALTH CONTEXT — WP-K
//
// Purpose: Single shared data layer consumed by ALL HQ tabs.
// Eliminates the "each tab fetches independently" problem that caused
// inconsistent stats across Overview, SupplyChain, Analytics, Production.
//
// Architecture:
//   - React context wrapping HQDashboard
//   - Fetches all key stats ONCE on mount
//   - Supabase realtime subscriptions auto-refresh on any DB change
//   - Any component can call refresh() after mutations
//   - All stats guaranteed consistent across all tabs at all times
//
// Exposes:
//   stats: { inventory, purchaseOrders, production, distribution, scans }
//   loading: bool
//   lastUpdated: Date
//   refresh(): void — manual refresh trigger
//
// Tables subscribed to (realtime):
//   inventory_items, purchase_orders, production_batches,
//   stock_movements, orders, scans
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "./supabaseClient";

const SystemHealthContext = createContext(null);

// ── Default empty stats shape ─────────────────────────────────────────────
const EMPTY_STATS = {
  inventory: {
    totalActive: 0,
    outOfStock: 0,
    lowStock: 0,
    stockValueSell: 0,
    stockCost: 0,
    byCategory: {},
  },
  purchaseOrders: {
    open: 0,
    inTransit: 0,
    pendingPayment: 0,
    received: 0,
  },
  production: {
    planned: 0,
    inProgress: 0,
    completed: 0,
    unitsFilled: 0,
    avgYield: 0,
  },
  distribution: {
    shipmentsActive: 0,
    shipmentsDelivered: 0,
    unitsShipped: 0,
  },
  scans: {
    total: 0,
    last7Days: 0,
    last30Days: 0,
    customers: 0,
  },
  loyalty: {
    pointsIssued: 0,
  },
  alerts: {
    lowStockItems: [],
    outOfStockItems: [],
    openPOCount: 0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════
export function SystemHealthProvider({ children }) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const channelsRef = useRef([]);
  const debounceRef = useRef(null);

  // ── Core fetch function ────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      // Run all queries in parallel
      const [
        inventoryRes,
        posRes,
        batchesRes,
        shipmentsRes,
        shipmentItemsRes,
        scansRes,
        scans7dRes,
        scans30dRes,
        customersRes,
        loyaltyRes,
      ] = await Promise.allSettled([
        supabase
          .from("inventory_items")
          .select(
            "id, name, sku, category, quantity_on_hand, reorder_level, cost_price, sell_price, is_active",
          )
          .eq("is_active", true),
        supabase
          .from("purchase_orders")
          .select("id, status, po_status")
          .not("status", "in", '("cancelled")'),
        supabase
          .from("production_batches")
          .select("id, status, actual_quantity, target_quantity"),
        supabase
          .from("shipments")
          .select("id, status")
          .not("status", "in", '("cancelled")'),
        supabase
          .from("shipment_items")
          .select("id, quantity, shipment_id")
          .not("shipment_id", "is", null),
        supabase.from("scans").select("id", { count: "exact", head: true }),
        supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .gte(
            "scanned_at",
            new Date(Date.now() - 30 * 86400000).toISOString(),
          ),
        supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "customer"),
        supabase
          .from("loyalty_transactions")
          .select("points_earned")
          .eq("transaction_type", "earn"),
      ]);

      // ── Inventory ──────────────────────────────────────────────────────
      const items =
        inventoryRes.status === "fulfilled"
          ? inventoryRes.value.data || []
          : [];

      const lowStockItems = items.filter(
        (i) =>
          i.reorder_level > 0 &&
          i.quantity_on_hand > 0 &&
          i.quantity_on_hand <= i.reorder_level,
      );
      const outOfStockItems = items.filter(
        (i) => (i.quantity_on_hand || 0) === 0,
      );
      const stockValueSell = items.reduce(
        (sum, i) => sum + (i.sell_price || 0) * (i.quantity_on_hand || 0),
        0,
      );
      const stockCost = items.reduce(
        (sum, i) => sum + (i.cost_price || 0) * (i.quantity_on_hand || 0),
        0,
      );
      const byCategory = items.reduce((acc, i) => {
        const cat = i.category || "other";
        if (!acc[cat]) acc[cat] = { count: 0, qty: 0 };
        acc[cat].count++;
        acc[cat].qty += i.quantity_on_hand || 0;
        return acc;
      }, {});

      // ── Purchase Orders ────────────────────────────────────────────────
      const pos = posRes.status === "fulfilled" ? posRes.value.data || [] : [];
      const openPOs = pos.filter(
        (p) => !["received", "cancelled"].includes(p.status),
      ).length;
      const inTransitPOs = pos.filter((p) =>
        ["ordered", "shipped"].includes(p.status),
      ).length;
      const pendingPayment = pos.filter((p) => p.status === "draft").length;
      const receivedPOs = pos.filter((p) => p.status === "received").length;

      // ── Production ────────────────────────────────────────────────────
      const batches =
        batchesRes.status === "fulfilled" ? batchesRes.value.data || [] : [];
      const completedBatches = batches.filter((b) => b.status === "completed");
      const unitsFilled = completedBatches.reduce(
        (sum, b) => sum + (b.actual_quantity || 0),
        0,
      );
      const avgYield =
        completedBatches.length > 0
          ? completedBatches.reduce((sum, b) => {
              const target = b.target_quantity || 0;
              const actual = b.actual_quantity || 0;
              return sum + (target > 0 ? (actual / target) * 100 : 100);
            }, 0) / completedBatches.length
          : 0;

      // ── Distribution ──────────────────────────────────────────────────
      const shipments =
        shipmentsRes.status === "fulfilled"
          ? shipmentsRes.value.data || []
          : [];
      const shipItems =
        shipmentItemsRes.status === "fulfilled"
          ? shipmentItemsRes.value.data || []
          : [];
      const unitsShipped = shipItems.reduce(
        (sum, si) => sum + (si.quantity || 0),
        0,
      );

      // ── Scans ─────────────────────────────────────────────────────────
      const totalScans =
        scansRes.status === "fulfilled" ? scansRes.value.count || 0 : 0;
      const scans7d =
        scans7dRes.status === "fulfilled" ? scans7dRes.value.count || 0 : 0;
      const scans30d =
        scans30dRes.status === "fulfilled" ? scans30dRes.value.count || 0 : 0;
      const customers =
        customersRes.status === "fulfilled" ? customersRes.value.count || 0 : 0;

      // ── Loyalty ───────────────────────────────────────────────────────
      const loyaltyRows =
        loyaltyRes.status === "fulfilled" ? loyaltyRes.value.data || [] : [];
      const pointsIssued = loyaltyRows.reduce(
        (sum, r) => sum + (r.points_earned || 0),
        0,
      );

      setStats({
        inventory: {
          totalActive: items.length,
          outOfStock: outOfStockItems.length,
          lowStock: lowStockItems.length,
          stockValueSell,
          stockCost,
          byCategory,
        },
        purchaseOrders: {
          open: openPOs,
          inTransit: inTransitPOs,
          pendingPayment,
          received: receivedPOs,
        },
        production: {
          planned: batches.filter((b) => b.status === "planned").length,
          inProgress: batches.filter((b) => b.status === "in_progress").length,
          completed: completedBatches.length,
          unitsFilled,
          avgYield,
        },
        distribution: {
          shipmentsActive: shipments.filter((s) =>
            ["pending", "in_transit"].includes(s.status),
          ).length,
          shipmentsDelivered: shipments.filter((s) => s.status === "delivered")
            .length,
          unitsShipped,
        },
        scans: {
          total: totalScans,
          last7Days: scans7d,
          last30Days: scans30d,
          customers,
        },
        loyalty: {
          pointsIssued,
        },
        alerts: {
          lowStockItems,
          outOfStockItems,
          openPOCount: openPOs,
        },
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[SystemHealth] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounced refresh (prevents rapid re-fetches from realtime) ────────
  const refresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAll();
    }, 400);
  }, [fetchAll]);

  // ── Initial fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Realtime subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    const tables = [
      "inventory_items",
      "purchase_orders",
      "production_batches",
      "stock_movements",
      "shipments",
      "shipment_items",
      "scans",
      "loyalty_transactions",
    ];

    const channels = tables.map((table) =>
      supabase
        .channel(`system-health-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () =>
          refresh(),
        )
        .subscribe(),
    );

    channelsRef.current = channels;

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [refresh]);

  return (
    <SystemHealthContext.Provider
      value={{ stats, loading, lastUpdated, refresh }}
    >
      {children}
    </SystemHealthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useSystemHealth() {
  const ctx = useContext(SystemHealthContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      stats: EMPTY_STATS,
      loading: false,
      lastUpdated: null,
      refresh: () => {},
    };
  }
  return ctx;
}
