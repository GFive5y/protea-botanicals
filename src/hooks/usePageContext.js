// src/hooks/usePageContext.js
// WP-GUIDE Phase A — Living Intelligence Layer
// Version: 1.1.0
// WP-GUIDE-C: Added 'overview' and 'pl' context queries
//
// ─── DESIGN PHILOSOPHY ────────────────────────────────────────────────────────
// This hook is PLATFORM-AGNOSTIC by design. The engine (query runner, context
// builder, status hierarchy, refresh mechanism, AI payload) is deployment-
// independent. The CONTEXT_QUERIES map is the only layer that knows what this
// particular deployment cares about. To deploy this for a different business:
//   1. Replace or extend CONTEXT_QUERIES with new tab handlers
//   2. Pass customQueries to usePageContext() to override at runtime
//   3. The component (WorkflowGuide) needs zero changes
//
// Returns:
//   { loading, status, headline, items[], warnings[], actions[], raw, refresh, lastFetched }
//
// Status values (worst-first hierarchy):
//   'setup'    -> purple  -- no data yet, guide user through first-time config
//   'ok'       -> green   -- all checks passed
//   'info'     -> blue    -- items to note, no action required
//   'warn'     -> amber   -- something broken or missing, action recommended
//   'critical' -> red     -- revenue/operation impacting, fix immediately
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds before auto-requery
const STATUS_RANK = { setup: 0, ok: 1, info: 2, warn: 3, critical: 4 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Safely extract data from a Promise.allSettled result. Never throws. */
const safeData = (result) =>
  result?.status === "fulfilled" ? (result.value?.data ?? []) : [];

/** Parse a value as float safely, treating null/undefined/empty as 0. */
const safeFloat = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

/** Pick the highest-severity status from an array of status strings. */
const worstStatus = (statuses) =>
  statuses.reduce((acc, s) => {
    if (!s) return acc;
    return STATUS_RANK[s] > STATUS_RANK[acc] ? s : acc;
  }, "ok");

/** Format a relative time string: "Updated 8s ago", "Updated 2m ago" */
const relativeTime = (date) => {
  if (!date) return null;
  const secs = Math.floor((Date.now() - date) / 1000);
  if (secs < 60) return `Updated ${secs}s ago`;
  if (secs < 3600) return `Updated ${Math.floor(secs / 60)}m ago`;
  return `Updated ${Math.floor(secs / 3600)}h ago`;
};

/** Simple plural helper */
const pl = (n, word, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;

// ─── CONTEXT QUERIES ─────────────────────────────────────────────────────────
// Each function receives (supabase, tenantId) and returns a context object.
// All strings are derived from live data — nothing is hardcoded business logic.
//
// ADDING A NEW TAB: export registerTabContext(tabId, queryFn) is available
// for runtime registration without modifying this file.

const CONTEXT_QUERIES = {
  // ── COSTING / COGS ENGINE ─────────────────────────────────────────────────
  costing: async (sb, tenantId) => {
    const [inputsRes, recipesRes] = await Promise.allSettled([
      sb
        .from("local_inputs")
        .select("name, cost_zar, category")
        .eq("is_active", true),
      sb.from("product_cogs").select("product_name, sku").eq("is_active", true),
    ]);

    const inputs = safeData(inputsRes);
    const recipes = safeData(recipesRes);

    if (inputs.length === 0 && recipes.length === 0) {
      return {
        status: "setup",
        headline: "First-time setup — configure your cost engine",
        items: [
          "Step 1: Add your unit costs (materials, labour, packaging) in Local Inputs",
          "Step 2: Create a SKU recipe linking a product to its input costs",
          "Step 3: Set transport and batch overheads per production run",
        ],
        warnings: [],
        actions: [{ label: "-> Open Local Inputs", tab: "local-inputs" }],
        raw: { tabId: "costing", queries: { inputs, recipes } },
      };
    }

    const zeroCosts = inputs.filter((i) => safeFloat(i.cost_zar) === 0);
    const warnings = zeroCosts.map(
      (i) =>
        `⚠ ${i.name}${i.category ? ` (${i.category})` : ""} has no cost set — any recipe using this input shows incorrect totals`,
    );

    const items = [
      recipes.length > 0
        ? `${pl(recipes.length, "SKU recipe")} in the cost registry`
        : "No SKU recipes yet — add your first recipe to calculate product costs",
      inputs.length > 0
        ? `${pl(inputs.length, "input cost")} configured${zeroCosts.length > 0 ? `, ${zeroCosts.length} missing` : " — all set"}`
        : "No input costs found",
    ];

    return {
      status: zeroCosts.length > 0 ? "warn" : "ok",
      headline:
        zeroCosts.length > 0
          ? `${pl(zeroCosts.length, "input cost")} missing — cost calculations incorrect`
          : "Cost engine healthy — all inputs configured",
      items,
      warnings,
      actions:
        zeroCosts.length > 0
          ? [
              {
                label: "-> Fix missing costs in Local Inputs",
                tab: "local-inputs",
              },
            ]
          : [],
      raw: { tabId: "costing", queries: { inputs, recipes } },
    };
  },

  // ── PRODUCTION / INVENTORY ALLOCATION ─────────────────────────────────────
  "hq-production": async (sb, tenantId) => {
    const [batchesRes, zeroPricesRes] = await Promise.allSettled([
      sb
        .from("batches")
        .select("batch_number, product_name, lifecycle_status")
        .eq("is_archived", false)
        .order("production_date", { ascending: false })
        .limit(10),
      sb
        .from("inventory_items")
        .select("name, sell_price")
        .eq("category", "finished_product")
        .eq("is_active", true)
        .eq("sell_price", 0),
    ]);

    const batches = safeData(batchesRes);
    const zeroPrices = safeData(zeroPricesRes);

    const warnings = zeroPrices.map(
      (p) =>
        `⚠ "${p.name}" has no sell price — invisible to customers in the storefront`,
    );

    const batchItems = batches
      .slice(0, 3)
      .map(
        (b) => `${b.batch_number} · ${b.product_name} · ${b.lifecycle_status}`,
      );

    const items = [
      batches.length > 0
        ? `${pl(batches.length, "active batch", "es")}`
        : "No active production batches",
      ...batchItems,
    ];

    return {
      status: zeroPrices.length > 0 ? "warn" : "ok",
      headline:
        zeroPrices.length > 0
          ? `${pl(zeroPrices.length, "product")} not visible — sell price not set`
          : "All products priced and visible",
      items,
      warnings,
      actions:
        zeroPrices.length > 0
          ? [{ label: "-> Set prices in Allocate Stock", tab: "allocate" }]
          : [],
      raw: { tabId: "hq-production", queries: { batches, zeroPrices } },
    };
  },

  // ── LOYALTY / REWARDS ENGINE ───────────────────────────────────────────────
  loyalty: async (sb, tenantId) => {
    const [configRes, usersRes] = await Promise.allSettled([
      sb
        .from("loyalty_config")
        .select(
          "active_schema, threshold_silver, threshold_gold, threshold_platinum, pts_per_r100_online, pts_qr_scan",
        )
        .single(),
      sb.from("user_profiles").select("loyalty_tier, loyalty_points"),
    ]);

    const config =
      configRes?.status === "fulfilled" ? configRes.value?.data : null;
    const users = safeData(usersRes);

    if (!config) {
      return {
        status: "warn",
        headline: "Loyalty configuration not found",
        items: [
          "No loyalty config row detected — the rewards engine cannot run",
        ],
        warnings: [
          "⚠ loyalty_config table has no rows — create a config row to enable rewards",
        ],
        actions: [],
        raw: { tabId: "loyalty", queries: { config: null, users } },
      };
    }

    const tierCounts = users.reduce((acc, u) => {
      const tier = u.loyalty_tier || "bronze";
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    const tierDisplay =
      ["platinum", "gold", "silver", "bronze"]
        .filter((t) => tierCounts[t])
        .map((t) => `${tierCounts[t]} ${t}`)
        .join(" · ") || "No customers yet";

    const items = [
      `Active schema: ${config.active_schema || "standard"}`,
      `Thresholds: Silver ${config.threshold_silver} pts · Gold ${config.threshold_gold} pts · Platinum ${config.threshold_platinum} pts`,
      `Member tiers: ${tierDisplay}`,
      config.pts_qr_scan ? `Scan earns: ${config.pts_qr_scan} pts` : null,
    ].filter(Boolean);

    return {
      status: "ok",
      headline: `${config.active_schema || "standard"} schema active · ${pl(users.length, "member")}`,
      items,
      warnings: [],
      actions: [],
      raw: { tabId: "loyalty", queries: { config, tierCounts, users } },
    };
  },

  // ── PROCUREMENT / PURCHASE ORDERS ─────────────────────────────────────────
  procurement: async (sb, tenantId) => {
    const [posRes] = await Promise.allSettled([
      sb
        .from("purchase_orders")
        .select("po_number, status, suppliers(name)")
        .neq("status", "complete")
        .order("created_at", { ascending: false }),
    ]);

    const pos = safeData(posRes);

    if (pos.length === 0) {
      return {
        status: "ok",
        headline: "All purchase orders complete",
        items: ["No open purchase orders — nothing awaiting action"],
        warnings: [],
        actions: [],
        raw: { tabId: "procurement", queries: { pos } },
      };
    }

    const items = pos.map(
      (p) =>
        `${p.po_number} · ${p.suppliers?.name || "Unknown supplier"} · ${p.status}`,
    );

    return {
      status: "info",
      headline: `${pl(pos.length, "open purchase order")} — action needed`,
      items,
      warnings: [],
      actions: [
        { label: `-> Review ${pl(pos.length, "open PO")}`, tab: "procurement" },
      ],
      raw: { tabId: "procurement", queries: { pos } },
    };
  },

  // ── STOCK / INVENTORY HEALTH ───────────────────────────────────────────────
  "admin-stock": async (sb, tenantId) => {
    const [itemsRes] = await Promise.allSettled([
      sb
        .from("inventory_items")
        .select("name, quantity_on_hand, reorder_level, category, is_active")
        .eq("is_active", true),
    ]);

    const allItems = safeData(itemsRes);
    const below = allItems.filter(
      (i) => safeFloat(i.quantity_on_hand) <= safeFloat(i.reorder_level),
    );

    const warnings = below.map(
      (i) =>
        `⚠ ${i.name}: ${i.quantity_on_hand} remaining (reorder point: ${i.reorder_level})`,
    );

    const items = [
      `${pl(allItems.length, "active inventory item")}`,
      below.length > 0
        ? `${pl(below.length, "item")} at or below reorder point`
        : "All items above reorder levels",
    ];

    return {
      status: below.length > 0 ? "warn" : "ok",
      headline:
        below.length > 0
          ? `${pl(below.length, "item")} need restocking`
          : "Stock levels healthy",
      items,
      warnings,
      actions:
        below.length > 0
          ? [{ label: "-> View reorder recommendations", tab: "reorder" }]
          : [],
      raw: { tabId: "admin-stock", queries: { allItems, below } },
    };
  },

  // ── QR CODES / SCAN ENGINE ────────────────────────────────────────────────
  "admin-qr": async (sb, tenantId) => {
    const [qrRes] = await Promise.allSettled([
      sb
        .from("qr_codes")
        .select("is_active, claimed, scan_count")
        .eq("is_active", true),
    ]);

    const codes = safeData(qrRes);
    const total = codes.length;
    const claimed = codes.filter((q) => q.claimed).length;
    const totalScans = codes.reduce((sum, q) => sum + (q.scan_count || 0), 0);
    const claimRate = total > 0 ? ((claimed / total) * 100).toFixed(1) : "0.0";

    if (total === 0) {
      return {
        status: "setup",
        headline: "No active QR codes — generate your first batch",
        items: [
          "No active QR codes found",
          "Generate codes in the Generate tab to get started",
        ],
        warnings: [],
        actions: [{ label: "-> Generate QR codes", tab: "generate" }],
        raw: { tabId: "admin-qr", queries: { codes } },
      };
    }

    return {
      status: "ok",
      headline: `${pl(total, "active code")} · ${claimRate}% claimed`,
      items: [
        `${pl(total, "active QR code")}`,
        `${claimed} claimed (${claimRate}% claim rate)`,
        `${total - claimed} unclaimed — ready to distribute`,
        totalScans > 0
          ? `${pl(totalScans, "total scan")} recorded`
          : "No scans recorded yet",
      ],
      warnings: [],
      actions: [],
      raw: { tabId: "admin-qr", queries: { codes, claimRate } },
    };
  },

  // ── HQ OVERVIEW DASHBOARD ─────────────────────────────────────────────────
  // WP-GUIDE-C: Added for HQOverview.js context wiring + GAP-01 tile fix
  // Reads: scan_logs (today count, scanned_at) + inventory_items (depleted)
  //        + support_tickets (open count)
  // Note: Uses count queries (head:true) for scan_logs and support_tickets
  //       to avoid fetching full rows. Promise.allSettled safe on empty tables.
  overview: async (sb, tenantId) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const [scansRes, depletedRes, ticketsRes] = await Promise.allSettled([
      sb
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .gte("scanned_at", todayIso),
      sb
        .from("inventory_items")
        .select("name, quantity_on_hand")
        .eq("is_active", true)
        .lte("quantity_on_hand", 0),
      sb
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

    const scansToday =
      scansRes?.status === "fulfilled" ? (scansRes.value?.count ?? 0) : 0;
    const depleted = safeData(depletedRes);
    const openTickets =
      ticketsRes?.status === "fulfilled" ? (ticketsRes.value?.count ?? 0) : 0;

    const warnings = [
      ...depleted.map(
        (i) => `⚠ ${i.name} — out of stock (quantity: ${i.quantity_on_hand})`,
      ),
      openTickets > 0
        ? `⚠ ${pl(openTickets, "support ticket")} awaiting response`
        : null,
    ].filter(Boolean);

    const items = [
      `${pl(scansToday, "QR scan")} today`,
      depleted.length > 0
        ? `${pl(depleted.length, "item")} out of stock`
        : "All stocked items available",
      openTickets > 0
        ? `${pl(openTickets, "open support ticket")}`
        : "No open support tickets",
    ];

    const status = worstStatus([
      depleted.length > 0 ? "warn" : "ok",
      openTickets > 0 ? "info" : "ok",
    ]);

    return {
      status,
      headline:
        depleted.length > 0
          ? `${pl(depleted.length, "item")} out of stock — attention needed`
          : openTickets > 0
            ? `${pl(openTickets, "open ticket")} — ${pl(scansToday, "scan")} today`
            : `${pl(scansToday, "scan")} today — operations normal`,
      items,
      warnings,
      actions: [
        ...(depleted.length > 0
          ? [{ label: "-> Restock items", tab: "items" }]
          : []),
        ...(openTickets > 0
          ? [{ label: "-> View support tickets", tab: "support" }]
          : []),
      ],
      raw: {
        tabId: "overview",
        queries: { scansToday, depleted, openTickets },
      },
    };
  },

  // ── PROFIT & LOSS SUMMARY ─────────────────────────────────────────────────
  // WP-GUIDE-C: Added for HQProfitLoss.js context wiring
  // Reads: orders (revenue — `total` column, NOT total_amount)
  //        + loyalty_transactions (redemptions — `transaction_date`, NOT created_at)
  // Note: Promise.allSettled — empty tables on new tenants return [] not error.
  pl: async (sb, tenantId) => {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const thisMonthIso = thisMonthStart.toISOString();

    const [ordersRes, redemptionsRes] = await Promise.allSettled([
      sb
        .from("orders")
        .select("total, created_at")
        .gte("created_at", thisMonthIso),
      sb
        .from("loyalty_transactions")
        .select("points_change, transaction_date")
        .eq("transaction_type", "redemption")
        .gte("transaction_date", thisMonthIso),
    ]);

    const orders = safeData(ordersRes);
    const redemptions = safeData(redemptionsRes);

    const revenue = orders.reduce((sum, o) => sum + safeFloat(o.total), 0);
    const orderCount = orders.length;
    const avgOrder = orderCount > 0 ? revenue / orderCount : 0;
    const redemptionCount = redemptions.length;
    const pointsRedeemed = redemptions.reduce(
      (sum, r) => sum + Math.abs(safeFloat(r.points_change)),
      0,
    );

    const items = [
      orderCount > 0
        ? `${pl(orderCount, "order")} this month — R${revenue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} revenue`
        : "No orders recorded this month",
      orderCount > 0
        ? `Average order value: R${avgOrder.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
        : null,
      redemptionCount > 0
        ? `${pl(redemptionCount, "loyalty redemption")} — ${pointsRedeemed.toLocaleString()} pts redeemed`
        : "No loyalty redemptions this month",
    ].filter(Boolean);

    return {
      status: orderCount === 0 ? "info" : "ok",
      headline:
        orderCount > 0
          ? `R${revenue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} revenue · ${pl(orderCount, "order")} this month`
          : "No orders this month — P&L awaiting data",
      items,
      warnings: [],
      actions: [],
      raw: {
        tabId: "pl",
        queries: {
          orders,
          redemptions,
          revenue,
          orderCount,
          redemptionCount,
          pointsRedeemed,
        },
      },
    };
  },
};

// ─── RUNTIME REGISTRATION ─────────────────────────────────────────────────────
// External code can register tab context handlers without modifying this file.
// Usage:
//   import { registerTabContext } from '../hooks/usePageContext';
//   registerTabContext('my-custom-tab', async (supabase, tenantId) => ({
//     status: 'ok', headline: '...', items: [...], warnings: [], actions: [], raw: {}
//   }));

const _runtimeRegistry = {};

export const registerTabContext = (tabId, queryFn) => {
  if (typeof tabId !== "string" || typeof queryFn !== "function") {
    console.warn(
      "[usePageContext] registerTabContext: tabId must be string, queryFn must be function",
    );
    return;
  }
  _runtimeRegistry[tabId] = queryFn;
};

// ─── EMPTY FALLBACK ───────────────────────────────────────────────────────────
const EMPTY_CONTEXT = {
  loading: false,
  status: "ok",
  headline: "",
  items: [],
  warnings: [],
  actions: [],
  raw: null,
  lastFetched: null,
};

const ERROR_CONTEXT = {
  loading: false,
  status: "info",
  headline: "System check unavailable",
  items: ["Could not retrieve live data — tap ↻ to retry"],
  warnings: [],
  actions: [],
  raw: null,
  lastFetched: null,
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * usePageContext(tabId, tenantId, customQueries?)
 *
 * @param {string}   tabId         -- matches a key in CONTEXT_QUERIES (or runtime registry)
 * @param {string}   tenantId      -- passed to query functions for RLS / tenant filtering
 * @param {object}   customQueries -- optional: override or extend CONTEXT_QUERIES at call site
 *
 * @returns {object} context -- { loading, status, headline, items, warnings, actions, raw, refresh, lastFetched }
 */
export function usePageContext(tabId, tenantId, customQueries = {}) {
  const [ctx, setCtx] = useState({ ...EMPTY_CONTEXT, loading: true });
  const lastFetchedRef = useRef(null);
  const abortRef = useRef(false);

  // Merge: call-site overrides -> runtime registry -> built-in defaults
  const resolvedQueries = {
    ...CONTEXT_QUERIES,
    ..._runtimeRegistry,
    ...customQueries,
  };

  const run = useCallback(async () => {
    if (!tabId) {
      setCtx({ ...EMPTY_CONTEXT });
      return;
    }

    const queryFn = resolvedQueries[tabId];

    if (!queryFn) {
      setCtx({ ...EMPTY_CONTEXT });
      return;
    }

    const now = Date.now();
    if (lastFetchedRef.current && now - lastFetchedRef.current < CACHE_TTL_MS) {
      return;
    }

    setCtx((prev) => ({ ...prev, loading: true }));
    abortRef.current = false;

    try {
      const result = await queryFn(supabase, tenantId);

      if (abortRef.current) return;

      const fetchedAt = new Date().toISOString();
      lastFetchedRef.current = Date.now();

      const enrichedRaw = {
        ...(result.raw || {}),
        tabId,
        tenantId,
        fetchedAt,
        status: result.status,
        headline: result.headline,
        warnings: result.warnings || [],
      };

      setCtx({
        loading: false,
        status: result.status ?? "ok",
        headline: result.headline ?? "",
        items: result.items ?? [],
        warnings: result.warnings ?? [],
        actions: result.actions ?? [],
        raw: enrichedRaw,
        lastFetched: new Date(),
      });
    } catch (err) {
      if (abortRef.current) return;
      console.error(`[usePageContext] Error on tab "${tabId}":`, err);
      lastFetchedRef.current = null;
      setCtx({ ...ERROR_CONTEXT, lastFetched: new Date() });
    }
  }, [tabId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    lastFetchedRef.current = null;
    run();
  }, [run]);

  useEffect(() => {
    abortRef.current = false;
    lastFetchedRef.current = null;
    run();
    return () => {
      abortRef.current = true;
    };
  }, [tabId, tenantId, run]);

  useEffect(() => {
    const timer = setInterval(run, CACHE_TTL_MS + 1000);
    return () => clearInterval(timer);
  }, [run]);

  return { ...ctx, refresh, relativeTime: relativeTime(ctx.lastFetched) };
}
