// src/hooks/usePageContext.js
// WP-GUIDE Phase A — Living Intelligence Layer
// Version: 1.7.0
// WP-HR-2: Added 'hr-staff' context query — Staff Directory health (16 total queries)
// WP-GUIDE-D: Enriched 'hq-production' query — covers all sub-tabs (Batches/COA/expiry/stock/runs)
// WP-GUIDE-C+++: Added 'hq-analytics' and 'admin-analytics' context queries
// WP-GUIDE-C++: Added 'batches', 'comms', and 'customers' context queries
// WP-GUIDE-C+: Added 'fraud', 'documents', 'pricing' context queries
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

  // ── PRODUCTION / BATCH HEALTH ─────────────────────────────────────────────
  // WP-GUIDE-D: Enriched v1.6.0 — queries ALL sub-tab data:
  //   Overview, Batches (COA/expiry/stock), History, Allocate Stock, Audit
  // RULE: Context queries must cover every sub-tab on the page, not just overview.
  "hq-production": async (sb, tenantId) => {
    const [batchesRes, zeroPricesRes, pricedItemsRes, runsRes] =
      await Promise.allSettled([
        // All active batches — full field set for multi-sub-tab analysis
        sb
          .from("batches")
          .select(
            "id, batch_number, product_name, lifecycle_status, coa_url, expiry_date, production_date",
          )
          .eq("is_archived", false)
          .order("production_date", { ascending: false }),
        // Products with no sell price → invisible in storefront (Allocate Stock concern)
        sb
          .from("inventory_items")
          .select("name")
          .eq("category", "finished_product")
          .eq("is_active", true)
          .eq("sell_price", 0),
        // Priced finished products → check for low stock (Batches / Overview concern)
        sb
          .from("inventory_items")
          .select("name, quantity_on_hand, reorder_level")
          .eq("category", "finished_product")
          .eq("is_active", true)
          .gt("sell_price", 0),
        // Production runs → find batches with no logged run (History concern)
        sb.from("production_runs").select("batch_id, status"),
      ]);

    const batches = safeData(batchesRes);
    const zeroPrices = safeData(zeroPricesRes);
    const pricedItems = safeData(pricedItemsRes);
    const runs = safeData(runsRes);

    // ── Batch-level analysis (Batches sub-tab) ───────────────────────────────
    const noCoa = batches.filter((b) => !b.coa_url);
    const noExpiry = batches.filter((b) => !b.expiry_date);
    const batchIdsWithRuns = new Set(
      runs.map((r) => r.batch_id).filter(Boolean),
    );
    const noRun = batches.filter((b) => !batchIdsWithRuns.has(b.id));

    // ── Inventory-level analysis (Overview / Allocate Stock sub-tab) ─────────
    const lowStock = pricedItems.filter(
      (i) =>
        safeFloat(i.reorder_level) > 0 &&
        safeFloat(i.quantity_on_hand) <= safeFloat(i.reorder_level),
    );

    const warnings = [
      // Critical (revenue impact) first
      ...zeroPrices.map(
        (p) =>
          `⚠ "${p.name}" has no sell price — invisible to customers in the storefront`,
      ),
      lowStock.length > 0
        ? `⚠ ${pl(lowStock.length, "finished product")} at or below reorder level — plan a production run`
        : null,
      // Important compliance issues
      noCoa.length > 0
        ? `⚠ ${pl(noCoa.length, "batch", "es")} missing lab certificate (COA) — ${noCoa
            .map((b) => b.batch_number)
            .slice(0, 3)
            .join(", ")}${noCoa.length > 3 ? ` +${noCoa.length - 3} more` : ""}`
        : null,
      noExpiry.length > 0
        ? `⚠ ${pl(noExpiry.length, "batch", "es")} have no expiry date set — required for compliance`
        : null,
      // Operational gaps
      noRun.length > 0
        ? `${pl(noRun.length, "batch", "es")} ${noRun.length === 1 ? "has" : "have"} no linked production run — material consumption untracked`
        : null,
    ].filter(Boolean);

    const totalIssues = warnings.length;
    const criticalIssues = zeroPrices.length + lowStock.length;

    const headline =
      zeroPrices.length > 0
        ? `${pl(zeroPrices.length, "product")} not visible — sell price not set`
        : lowStock.length > 0
          ? `${pl(lowStock.length, "product")} running low — production run needed`
          : noCoa.length > 0
            ? `${pl(noCoa.length, "batch", "es")} missing lab certificate`
            : batches.length === 0
              ? "No active batches — create your first batch to begin production"
              : "All products priced and visible";

    const batchSummary = batches
      .slice(0, 3)
      .map(
        (b) => `${b.batch_number} · ${b.product_name} · ${b.lifecycle_status}`,
      );

    const items = [
      batches.length > 0
        ? `${pl(batches.length, "active batch", "es")}`
        : "No active production batches",
      ...batchSummary,
      lowStock.length > 0
        ? `Low stock: ${lowStock
            .map((i) => i.name)
            .slice(0, 2)
            .join(
              ", ",
            )}${lowStock.length > 2 ? ` +${lowStock.length - 2} more` : ""}`
        : "All priced products stocked above reorder level",
      noCoa.length > 0
        ? `${pl(noCoa.length, "batch", "es")} awaiting COA upload`
        : null,
      noExpiry.length > 0
        ? `${pl(noExpiry.length, "batch", "es")} missing expiry date`
        : null,
    ].filter(Boolean);

    return {
      status: criticalIssues > 0 ? "warn" : totalIssues > 0 ? "info" : "ok",
      headline,
      items,
      warnings,
      actions: [
        ...(zeroPrices.length > 0
          ? [{ label: "-> Set prices in Allocate Stock tab", tab: "allocate" }]
          : []),
        ...(noCoa.length > 0
          ? [{ label: "-> Upload COA in Batches tab", tab: "batches" }]
          : []),
        ...(lowStock.length > 0
          ? [{ label: "-> Plan new production run", tab: "new-run" }]
          : []),
      ],
      raw: {
        tabId: "hq-production",
        subTabData: {
          overview: { batchCount: batches.length, lowStock: lowStock.length },
          batches: {
            noCoa: noCoa.length,
            noExpiry: noExpiry.length,
            noRun: noRun.length,
          },
          allocate: { zeroPrices: zeroPrices.length },
        },
      },
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
        .select("po_number, status, po_status, suppliers(name)")
        .eq("tenant_id", tenantId)
        .not("po_status", "in", '("complete","paid","cancelled")')
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
        `${p.po_number} · ${p.suppliers?.name || "Unknown supplier"} · ${p.po_status || p.status}`,
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
        .select("points, created_at")
        .in("transaction_type", ["REDEEMED", "redeemed", "REDEEMED_POINTS"])
        .gte("created_at", thisMonthIso),
    ]);

    const orders = safeData(ordersRes);
    const redemptions = safeData(redemptionsRes);

    const revenue = orders.reduce((sum, o) => sum + safeFloat(o.total), 0);
    const orderCount = orders.length;
    const avgOrder = orderCount > 0 ? revenue / orderCount : 0;
    const redemptionCount = redemptions.length;
    const pointsRedeemed = redemptions.reduce(
      (sum, r) => sum + Math.abs(safeFloat(r.points)),
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

  // ── FRAUD & SECURITY ──────────────────────────────────────────────────────
  // WP-GUIDE-C+: Added for HQFraud.js context wiring
  // Reads: user_profiles (flagged + suspended counts)
  //        + deletion_requests (pending POPIA count)
  // Note: head:true count queries — no row data fetched.
  fraud: async (sb, tenantId) => {
    const [flaggedRes, suspendedRes, deletionsRes] = await Promise.allSettled([
      sb
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .gte("anomaly_score", 50),
      sb
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_suspended", true),
      sb
        .from("deletion_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    const flagged =
      flaggedRes?.status === "fulfilled" ? (flaggedRes.value?.count ?? 0) : 0;
    const suspended =
      suspendedRes?.status === "fulfilled"
        ? (suspendedRes.value?.count ?? 0)
        : 0;
    const deletions =
      deletionsRes?.status === "fulfilled"
        ? (deletionsRes.value?.count ?? 0)
        : 0;

    const warnings = [
      flagged > 0
        ? `⚠ ${pl(flagged, "account")} flagged — anomaly score ≥ 50, review required`
        : null,
      deletions > 0
        ? `⚠ ${pl(deletions, "POPIA deletion request")} pending — must be processed within 30 days`
        : null,
    ].filter(Boolean);

    const status = worstStatus([
      flagged > 0 ? "warn" : "ok",
      deletions > 0 ? "warn" : "ok",
    ]);

    return {
      status,
      headline:
        flagged > 0 || suspended > 0 || deletions > 0
          ? `${flagged} flagged · ${suspended} suspended · ${deletions} deletion${deletions !== 1 ? "s" : ""} pending`
          : "No active fraud alerts — all accounts in good standing",
      items: [
        `${pl(flagged, "account")} with anomaly score ≥ 50`,
        `${pl(suspended, "account")} currently suspended`,
        deletions > 0
          ? `${pl(deletions, "POPIA deletion request")} pending — 30-day deadline applies`
          : "No pending deletion requests",
      ],
      warnings,
      actions: [
        ...(flagged > 0
          ? [{ label: "→ Review flagged accounts", tab: "flagged" }]
          : []),
        ...(deletions > 0
          ? [{ label: "→ Process deletion requests", tab: "deletions" }]
          : []),
      ],
      raw: { tabId: "fraud", queries: { flagged, suspended, deletions } },
    };
  },

  // ── DOCUMENT INGESTION ────────────────────────────────────────────────────
  // WP-GUIDE-C+: Added for HQDocuments.js context wiring
  // Reads: document_log (counts by status — pending_review, confirmed, rejected)
  // Note: head:true count queries throughout.
  documents: async (sb, tenantId) => {
    const [pendingRes, confirmedRes, rejectedRes] = await Promise.allSettled([
      sb
        .from("document_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      sb
        .from("document_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed"),
      sb
        .from("document_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected"),
    ]);

    const pending =
      pendingRes?.status === "fulfilled" ? (pendingRes.value?.count ?? 0) : 0;
    const confirmed =
      confirmedRes?.status === "fulfilled"
        ? (confirmedRes.value?.count ?? 0)
        : 0;
    const rejected =
      rejectedRes?.status === "fulfilled" ? (rejectedRes.value?.count ?? 0) : 0;
    const total = pending + confirmed + rejected;

    if (total === 0) {
      return {
        status: "setup",
        headline: "No documents ingested yet — upload your first document",
        items: [
          "Drop a PDF, JPG, or PNG above to start",
          "AI extracts supplier, products, quantities and prices automatically",
          "Review extracted data and confirm — changes apply to your DB instantly",
        ],
        warnings: [],
        actions: [],
        raw: { tabId: "documents", queries: { pending, confirmed, rejected } },
      };
    }

    return {
      status: pending > 0 ? "warn" : "ok",
      headline:
        pending > 0
          ? `${pl(pending, "document")} awaiting review — extracted data not yet applied`
          : `${pl(total, "document")} in vault — all reviewed`,
      items: [
        `${pl(total, "document")} in the vault`,
        pending > 0
          ? `${pl(pending, "document")} pending review`
          : "No documents pending review",
        `${pl(confirmed, "document")} confirmed · ${pl(rejected, "document")} rejected`,
      ],
      warnings:
        pending > 0
          ? [
              `⚠ ${pl(pending, "document")} awaiting review — extracted data not yet applied to inventory or POs`,
            ]
          : [],
      actions:
        pending > 0
          ? [{ label: "→ Review pending documents", tab: "review" }]
          : [],
      raw: {
        tabId: "documents",
        queries: { pending, confirmed, rejected, total },
      },
    };
  },

  // ── PRICING & MARGIN ──────────────────────────────────────────────────────
  // WP-GUIDE-C+: Added for HQPricing.js context wiring
  // Reads: product_cogs (active count) + product_pricing (retail prices set)
  // Warn if any active SKU has no retail price — product invisible in shop.
  pricing: async (sb, tenantId) => {
    const [recipesRes, pricingRes] = await Promise.allSettled([
      sb.from("product_cogs").select("id").eq("is_active", true),
      sb
        .from("product_pricing")
        .select("product_cogs_id, channel, sell_price_zar")
        .eq("channel", "retail"),
    ]);

    const recipes = safeData(recipesRes);
    const retailPrices = safeData(pricingRes);

    if (recipes.length === 0) {
      return {
        status: "setup",
        headline:
          "No SKU recipes yet — build COGS recipes in HQ → Costing first",
        items: [
          "Go to HQ → Costing to create your first SKU recipe",
          "Once recipes exist, return here to set sell prices per channel",
        ],
        warnings: [],
        actions: [{ label: "→ Go to Costing", tab: "costing" }],
        raw: {
          tabId: "pricing",
          queries: { recipesCount: 0, unpricedCount: 0 },
        },
      };
    }

    const pricedIds = new Set(retailPrices.map((p) => p.product_cogs_id));
    const unpricedCount = recipes.filter((r) => !pricedIds.has(r.id)).length;
    const zeroPricedCount = retailPrices.filter(
      (p) => !safeFloat(p.sell_price_zar),
    ).length;

    const warnings = [
      unpricedCount > 0
        ? `⚠ ${pl(unpricedCount, "SKU")} with no retail price — invisible to customers in shop`
        : null,
      zeroPricedCount > 0
        ? `⚠ ${pl(zeroPricedCount, "SKU")} has retail price of R0 — will not appear in shop`
        : null,
    ].filter(Boolean);

    return {
      status: unpricedCount > 0 || zeroPricedCount > 0 ? "warn" : "ok",
      headline:
        unpricedCount > 0
          ? `${pl(unpricedCount, "SKU")} missing retail price — not visible in shop`
          : `${pl(recipes.length, "SKU")} priced across all channels`,
      items: [
        `${pl(recipes.length, "active SKU recipe")}`,
        unpricedCount > 0
          ? `${pl(unpricedCount, "SKU")} with no retail price — invisible to customers`
          : "All SKUs have retail prices set",
        `${pl(retailPrices.length, "retail price")} configured`,
      ],
      warnings,
      actions:
        unpricedCount > 0
          ? [{ label: "→ Set missing prices", tab: "pricing" }]
          : [],
      raw: {
        tabId: "pricing",
        queries: {
          recipesCount: recipes.length,
          unpricedCount,
          zeroPricedCount,
        },
      },
    };
  },

  // ── BATCH MANAGER ────────────────────────────────────────────────────────────
  // WP-GUIDE-C++: Added for AdminBatchManager.js context wiring
  // Reads: batches (active, expiring, no COA)
  // CRITICAL: batches has NO created_at / NO updated_at → ORDER BY production_date only
  //           production_batches = UNUSED — NEVER query this table
  batches: async (sb, tenantId) => {
    const [batchRes] = await Promise.allSettled([
      sb
        .from("batches")
        .select("id, batch_number, product_name, expiry_date, coa_url")
        .eq("is_archived", false),
    ]);

    const allBatches = safeData(batchRes);
    const now = Date.now();

    const expiring = allBatches.filter((b) => {
      const days = b.expiry_date
        ? Math.ceil((new Date(b.expiry_date) - now) / 86400000)
        : null;
      return days !== null && days <= 30 && days >= 0;
    });
    const expired = allBatches.filter((b) => {
      const days = b.expiry_date
        ? Math.ceil((new Date(b.expiry_date) - now) / 86400000)
        : null;
      return days !== null && days < 0;
    });
    const noCoa = allBatches.filter((b) => !b.coa_url);

    if (allBatches.length === 0) {
      return {
        status: "setup",
        headline:
          "No batches yet — create your first production batch to get started",
        items: [
          "Click '+ New Batch' to register a production run",
          "Add batch number, THC/CBD content, and production date",
          "Upload the COA PDF for lab certification",
          "Then generate QR codes linked to this batch",
        ],
        warnings: [],
        actions: [{ label: "→ Create first batch", tab: "batches" }],
        raw: { tabId: "batches", queries: { total: 0, expiring: 0, noCoa: 0 } },
      };
    }

    const warnings = [
      expiring.length > 0
        ? `⚠ ${pl(expiring.length, "batch")} expiring within 30 days — review distribution plan`
        : null,
      expired.length > 0
        ? `⚠ ${pl(expired.length, "batch")} already expired — archive or investigate`
        : null,
      noCoa.length > 0
        ? `⚠ ${pl(noCoa.length, "batch")} without a COA uploaded — required for QR trust`
        : null,
    ].filter(Boolean);

    return {
      status: worstStatus([
        expired.length > 0 ? "error" : "ok",
        expiring.length > 0 ? "warn" : "ok",
        noCoa.length > 0 ? "warn" : "ok",
      ]),
      headline:
        expired.length > 0
          ? `${pl(expired.length, "batch")} expired — action required`
          : expiring.length > 0
            ? `${pl(expiring.length, "batch")} expiring soon · ${pl(allBatches.length, "active batch")} total`
            : `${pl(allBatches.length, "active batch")} · all in date`,
      items: [
        `${pl(allBatches.length, "active batch")} in production`,
        expiring.length > 0
          ? `${pl(expiring.length, "batch")} expiring within 30 days`
          : "No batches expiring soon",
        noCoa.length > 0
          ? `${pl(noCoa.length, "batch")} missing COA — customers cannot verify lab results`
          : "All batches have COA uploaded",
      ],
      warnings,
      actions: [
        ...(expiring.length > 0
          ? [{ label: "→ View expiring batches", tab: "batches" }]
          : []),
        ...(noCoa.length > 0
          ? [{ label: "→ Upload missing COAs", tab: "batches" }]
          : []),
      ],
      raw: {
        tabId: "batches",
        queries: {
          total: allBatches.length,
          expiring: expiring.length,
          expired: expired.length,
          noCoa: noCoa.length,
        },
      },
    };
  },

  // ── CUSTOMER COMMS ────────────────────────────────────────────────────────────
  // WP-GUIDE-C++: Added for AdminCommsCenter.js context wiring
  // CRITICAL: customer_messages uses .body (NOT .content) and .read_at (NOT .read)
  //           ticket_messages uses .content (NOT .body)
  //           support_tickets open = NOT IN ('closed','resolved')
  comms: async (sb, tenantId) => {
    const [unreadRes, ticketsRes] = await Promise.allSettled([
      sb
        .from("customer_messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
      sb
        .from("support_tickets")
        .select("id, status")
        .not("status", "in", '("closed","resolved")'),
    ]);

    const unread =
      unreadRes?.status === "fulfilled" ? (unreadRes.value?.count ?? 0) : 0;
    const ticketRows = safeData(ticketsRes);
    const openTickets = ticketRows.length;

    if (unread === 0 && openTickets === 0) {
      return {
        status: "ok",
        headline: "All caught up — no unread messages or open tickets",
        items: [
          "No unread customer messages",
          "No open support tickets",
          "Use Broadcast to send tier-targeted messages to Bronze/Silver/Gold/Platinum customers",
        ],
        warnings: [],
        actions: [],
        raw: { tabId: "comms", queries: { unread: 0, openTickets: 0 } },
      };
    }

    const warnings = [
      unread > 0
        ? `⚠ ${pl(unread, "unread message")} awaiting reply — customers are waiting`
        : null,
      openTickets > 0
        ? `⚠ ${pl(openTickets, "open ticket")} — respond to maintain customer satisfaction`
        : null,
    ].filter(Boolean);

    return {
      status: worstStatus([
        unread > 10 ? "error" : unread > 0 ? "warn" : "ok",
        openTickets > 0 ? "warn" : "ok",
      ]),
      headline:
        unread > 0 && openTickets > 0
          ? `${pl(unread, "unread message")} + ${pl(openTickets, "open ticket")}`
          : unread > 0
            ? `${pl(unread, "unread message")} awaiting reply`
            : `${pl(openTickets, "open ticket")} to resolve`,
      items: [
        unread > 0
          ? `${pl(unread, "customer message")} unread — reply promptly`
          : "No unread messages",
        openTickets > 0
          ? `${pl(openTickets, "support ticket")} open`
          : "No open support tickets",
        "Use Broadcast to reach customers by tier — Bronze, Silver, Gold, Platinum",
      ],
      warnings,
      actions: [
        ...(unread > 0
          ? [{ label: "→ View unread messages", tab: "customers" }]
          : []),
        ...(openTickets > 0
          ? [{ label: "→ View open tickets", tab: "customers" }]
          : []),
      ],
      raw: { tabId: "comms", queries: { unread, openTickets } },
    };
  },

  // ── CUSTOMER ENGAGEMENT ───────────────────────────────────────────────────────
  // WP-GUIDE-C++: Added for AdminCustomerEngagement.js context wiring
  // Reads: user_profiles (role='customer' — total, at-risk, opt-in)
  // Churn risk: inactive 45+ days OR (total_scans=0 AND loyalty_points<50)
  customers: async (sb, tenantId) => {
    const [allRes, churnRes, optinRes] = await Promise.allSettled([
      sb
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer"),
      sb
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
        .lt(
          "last_active_at",
          new Date(Date.now() - 45 * 86400000).toISOString(),
        ),
      sb
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
        .eq("marketing_opt_in", true),
    ]);

    const total =
      allRes?.status === "fulfilled" ? (allRes.value?.count ?? 0) : 0;
    const churnRisk =
      churnRes?.status === "fulfilled" ? (churnRes.value?.count ?? 0) : 0;
    const optIn =
      optinRes?.status === "fulfilled" ? (optinRes.value?.count ?? 0) : 0;
    const optInRate = total > 0 ? Math.round((optIn / total) * 100) : 0;

    if (total === 0) {
      return {
        status: "setup",
        headline:
          "No customers yet — they appear here once they sign up and scan a QR code",
        items: [
          "Customers register via the shop website or in-store registration",
          "Use 'Register In-Store' button to manually onboard walk-in customers",
          "Engagement scores are calculated automatically from scan + loyalty data",
        ],
        warnings: [],
        actions: [],
        raw: {
          tabId: "customers",
          queries: { total: 0, churnRisk: 0, optIn: 0 },
        },
      };
    }

    const warnings = [
      churnRisk > 0
        ? `⚠ ${pl(churnRisk, "customer")} inactive for 45+ days — at churn risk`
        : null,
      optInRate < 30
        ? `⚠ Only ${optInRate}% opted into marketing — consider a re-consent campaign`
        : null,
    ].filter(Boolean);

    return {
      status: churnRisk > total * 0.3 ? "warn" : "ok",
      headline:
        churnRisk > 0
          ? `${pl(churnRisk, "customer")} at churn risk out of ${pl(total, "total")}`
          : `${pl(total, "customer")} · all engaged`,
      items: [
        `${pl(total, "customer")} registered`,
        churnRisk > 0
          ? `${pl(churnRisk, "customer")} inactive 45+ days — churn risk`
          : "No customers at churn risk",
        `${pl(optIn, "customer")} opted into marketing (${optInRate}%)`,
      ],
      warnings,
      actions:
        churnRisk > 0
          ? [{ label: "→ View at-risk customers", tab: "customers" }]
          : [],
      raw: {
        tabId: "customers",
        queries: { total, churnRisk, optIn, optInRate },
      },
    };
  },

  // ── HQ ANALYTICS ─────────────────────────────────────────────────────────────
  // WP-GUIDE-C+++: Added for HQAnalytics.js context wiring
  // Reads: scan_logs (today count), shipments (in transit + overdue),
  //        production_runs (active)
  // Note: shipments.estimated_arrival compared client-side in context
  "hq-analytics": async (sb, tenantId) => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();

    const [todayScansRes, allScansRes, shipmentsRes, runsRes] =
      await Promise.allSettled([
        sb
          .from("scan_logs")
          .select("id", { count: "exact", head: true })
          .gte("scanned_at", todayStart),
        sb.from("scan_logs").select("id", { count: "exact", head: true }),
        sb
          .from("shipments")
          .select("id, shipment_number, status, estimated_arrival")
          .not("status", "in", '("delivered","confirmed","cancelled")'),
        sb
          .from("production_runs")
          .select("id, status")
          .eq("status", "in_progress"),
      ]);

    const todayScans =
      todayScansRes?.status === "fulfilled"
        ? (todayScansRes.value?.count ?? 0)
        : 0;
    const totalScans =
      allScansRes?.status === "fulfilled" ? (allScansRes.value?.count ?? 0) : 0;
    const openShipments = safeData(shipmentsRes);
    const activeRuns = safeData(runsRes);

    const inTransit = openShipments.filter((s) =>
      ["shipped", "in_transit"].includes(s.status),
    );
    const overdue = openShipments.filter(
      (s) => s.estimated_arrival && new Date(s.estimated_arrival) < now,
    );

    const warnings = [
      overdue.length > 0
        ? `⚠ ${pl(overdue.length, "shipment")} overdue — past estimated arrival date`
        : null,
      activeRuns.length > 0
        ? `${pl(activeRuns.length, "production run")} currently in progress`
        : null,
    ].filter(Boolean);

    return {
      status: overdue.length > 0 ? "warn" : "ok",
      headline:
        overdue.length > 0
          ? `${pl(overdue.length, "shipment")} overdue · ${todayScans} scans today`
          : `${todayScans} scans today · ${pl(totalScans, "total")} all time`,
      items: [
        `${todayScans} scans today · ${pl(totalScans, "total")} all time`,
        inTransit.length > 0
          ? `${pl(inTransit.length, "shipment")} in transit`
          : "No shipments in transit",
        activeRuns.length > 0
          ? `${pl(activeRuns.length, "production run")} active`
          : "No active production runs",
      ],
      warnings,
      actions:
        overdue.length > 0
          ? [{ label: "→ View distribution status", tab: "distribution" }]
          : [],
      raw: {
        tabId: "hq-analytics",
        queries: {
          todayScans,
          totalScans,
          inTransit: inTransit.length,
          overdue: overdue.length,
          activeRuns: activeRuns.length,
        },
      },
    };
  },

  // ── ADMIN SCAN ANALYTICS ──────────────────────────────────────────────────────
  // WP-GUIDE-C+++: Added for AdminAnalytics.js context wiring
  // Reads: scan_logs (total, today, 7d counts — head:true)
  "admin-analytics": async (sb, tenantId) => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    const weekStart = new Date(now - 7 * 86400000).toISOString();

    const [totalRes, todayRes, weekRes] = await Promise.allSettled([
      sb.from("scan_logs").select("id", { count: "exact", head: true }),
      sb
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .gte("scanned_at", todayStart),
      sb
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .gte("scanned_at", weekStart),
    ]);

    const total =
      totalRes?.status === "fulfilled" ? (totalRes.value?.count ?? 0) : 0;
    const today =
      todayRes?.status === "fulfilled" ? (todayRes.value?.count ?? 0) : 0;
    const week =
      weekRes?.status === "fulfilled" ? (weekRes.value?.count ?? 0) : 0;

    if (total === 0) {
      return {
        status: "setup",
        headline:
          "No scan activity yet — scans appear here after customers scan QR codes",
        items: [
          "Generate QR codes in Admin → QR Codes tab",
          "Attach them to product batches",
          "Customers scan → scan_logs records every event with geo + device data",
        ],
        warnings: [],
        actions: [],
        raw: {
          tabId: "admin-analytics",
          queries: { total: 0, today: 0, week: 0 },
        },
      };
    }

    const weekAvgPerDay = week > 0 ? (week / 7).toFixed(1) : "0";

    return {
      status: "ok",
      headline: `${today} scan${today !== 1 ? "s" : ""} today · ${week} this week · ${pl(total, "total")}`,
      items: [
        `${pl(total, "scan")} recorded all time`,
        `${today} scan${today !== 1 ? "s" : ""} today · ${week} in last 7 days`,
        `~${weekAvgPerDay} scans/day average this week`,
      ],
      warnings:
        today === 0 && total > 0
          ? [
              "No scans yet today — this may be normal for your traffic patterns",
            ]
          : [],
      actions: [],
      raw: { tabId: "admin-analytics", queries: { total, today, week } },
    };
  },

  // ── HR STAFF DIRECTORY ────────────────────────────────────────────────────────
  // WP-HR-2: Added for AdminHRPanel.js context wiring
  // Reads: staff_profiles (total, active count, data quality checks)
  // Surfaces: missing job titles, missing start dates, churn/termination counts
  // Note: Uses head:true for active count to avoid fetching full rows.
  //       Promise.allSettled — graceful on empty table for new tenants.
  "hr-staff": async (sb, tenantId) => {
    const [allRes, activeRes] = await Promise.allSettled([
      sb
        .from("staff_profiles")
        .select("id, status, job_title, employment_start_date, department")
        .eq("tenant_id", tenantId),
      sb
        .from("staff_profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
    ]);

    const all = safeData(allRes);
    const activeCount =
      activeRes?.status === "fulfilled" ? (activeRes.value?.count ?? 0) : 0;
    const total = all.length;

    if (total === 0) {
      return {
        status: "setup",
        headline: "No staff records yet — add your first team member",
        items: [
          "Click '+ Add Staff Member' to create the first employee record",
          "Add personal details, employment info, banking and emergency contacts",
          "Staff records feed leave, timesheets, contracts and payroll export",
        ],
        warnings: [],
        actions: [{ label: "→ Add first staff member", tab: "staff" }],
        raw: { tabId: "hr-staff", queries: { total: 0, active: 0 } },
      };
    }

    const noTitle = all.filter((s) => !s.job_title).length;
    const noStart = all.filter((s) => !s.employment_start_date).length;
    const terminated = all.filter((s) => s.status === "terminated").length;
    const onLeave = all.filter((s) => s.status === "on_leave").length;
    const suspended = all.filter((s) => s.status === "suspended").length;

    const warnings = [
      noTitle > 0
        ? `⚠ ${pl(noTitle, "staff member")} missing job title — required for payroll export`
        : null,
      noStart > 0
        ? `⚠ ${pl(noStart, "staff member")} missing employment start date — required for leave accrual`
        : null,
    ].filter(Boolean);

    const items = [
      `${pl(activeCount, "active staff member")}`,
      total > activeCount
        ? `${total - activeCount} inactive (${terminated > 0 ? `${terminated} terminated` : ""}${onLeave > 0 ? `${terminated > 0 ? ", " : ""}${onLeave} on leave` : ""}${suspended > 0 ? `, ${suspended} suspended` : ""})`
        : "All staff members active",
      noTitle > 0
        ? `${pl(noTitle, "staff member")} missing job title`
        : "All records have job titles",
      noStart > 0
        ? `${pl(noStart, "staff member")} missing start date`
        : "All records have start dates",
    ].filter(Boolean);

    return {
      status: warnings.length > 0 ? "warn" : "ok",
      headline:
        warnings.length > 0
          ? `${pl(warnings.length, "data quality issue")} — ${pl(activeCount, "active staff member")}`
          : `${pl(activeCount, "active staff member")} · ${pl(total, "total record")}`,
      items,
      warnings,
      actions:
        warnings.length > 0
          ? [{ label: "→ Complete missing staff details", tab: "staff" }]
          : [],
      raw: {
        tabId: "hr-staff",
        queries: {
          total,
          active: activeCount,
          terminated,
          onLeave,
          suspended,
          noTitle,
          noStart,
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
