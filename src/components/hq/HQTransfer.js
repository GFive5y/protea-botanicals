// src/components/hq/HQTransfer.js
// WP-STOCK-PRO S5 — HQ→Shop Transfer Orders — v1.0
// Commit: [to be filled after git commit]
// Built: March 24, 2026
//
// RULES:
//  - RULE 0F: tenant_id on every INSERT
//  - RULE 0G: useTenant() called inside this component
//  - LL-033/036: Commit immediately after creation
//  - LL-014: No backticks in Supabase SQL
//  - stock_movements: unit_cost (null for transfers) + unit_cost_zar required
//  - WorkflowGuide MUST be first element rendered
//  - Never store available_qty — always compute on_hand - reserved_qty

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";

// ─── Reference generator ─────────────────────────────────────────────────────
function generateReference() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return "TRF-" + dateStr + "-" + rand;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    draft: { bg: "#EFF6FF", color: "#1D4ED8", label: "Draft" },
    in_transit: { bg: "#FEF3C7", color: "#B45309", label: "In Transit" },
    received: { bg: "#F0FDF4", color: "#166534", label: "Received" },
    cancelled: { bg: "#FEF2F2", color: "#991B1B", label: "Cancelled" },
  };
  const s = map[status] || { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        letterSpacing: "0.03em",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        padding: "18px 22px",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div
        style={{ fontSize: 22, fontWeight: 700, color: accent || "#111827" }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HQTransfer() {
  const { tenantId } = useTenant(); // RULE 0G — inside component

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [transfers, setTransfers] = useState([]);
  const [allTenants, setAllTenants] = useState([]);
  const [hqInventory, setHqInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // New Transfer form state
  const [form, setForm] = useState({
    to_tenant_id: "",
    notes: "",
    lines: [], // [{ item_id, item_name, sku, unit, qty, available, unit_cost_zar }]
    lineItem: "",
    lineQty: "",
  });

  // Expanded transfer detail (active tab)
  const [expandedId, setExpandedId] = useState(null);

  // Cancel confirmation
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // 1. Load all transfer orders (HQ global view — no tenant filter needed for HQ)
      const { data: tData, error: tErr } = await supabase
        .from("stock_transfers")
        .select("*, stock_transfer_items(*)")
        .order("created_at", { ascending: false });
      if (tErr) throw tErr;
      setTransfers(tData || []);

      // 2. Load all tenants (stores) — exclude HQ tenant
      const { data: tenantData, error: tenErr } = await supabase
        .from("tenants")
        .select("id, name, industry_profile")
        .neq("id", tenantId)
        .order("name");
      if (tenErr) throw tenErr;
      setAllTenants(tenantData || []);

      // 3. Load HQ inventory_items (items available to transfer)
      const { data: invData, error: invErr } = await supabase
        .from("inventory_items")
        .select(
          "id, name, sku, category, unit, quantity_on_hand, reserved_qty, " +
            "weighted_avg_cost, reorder_level, is_active",
        )
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (invErr) throw invErr;
      setHqInventory(invData || []);
    } catch (err) {
      console.error("HQTransfer fetchAll:", err);
      showToast("Failed to load transfer data", "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Computed available qty ─────────────────────────────────────────────────
  function availQty(item) {
    // NEVER store available_qty — always compute (LL pattern from StockControl)
    return Math.max(0, (item.quantity_on_hand || 0) - (item.reserved_qty || 0));
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = (() => {
    const pending = transfers.filter((t) => t.status === "draft").length;
    const inTransit = transfers.filter((t) => t.status === "in_transit").length;
    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const received = transfers.filter(
      (t) => t.status === "received" && t.received_at >= startOfMonth,
    ).length;
    const itemsMTD = transfers
      .filter((t) => t.status === "received" && t.received_at >= startOfMonth)
      .reduce((sum, t) => sum + (t.stock_transfer_items?.length || 0), 0);
    return { pending, inTransit, received, itemsMTD };
  })();

  // ── Form: add a line item ──────────────────────────────────────────────────
  function handleAddLine() {
    if (!form.lineItem || !form.lineQty) return;
    const item = hqInventory.find((i) => i.id === form.lineItem);
    if (!item) return;

    const av = availQty(item);
    const qty = parseFloat(form.lineQty);
    if (isNaN(qty) || qty <= 0) {
      showToast("Enter a valid quantity", "error");
      return;
    }
    if (qty > av) {
      showToast(
        "Quantity exceeds available stock (" +
          av +
          " " +
          (item.unit || "units") +
          ")",
        "error",
      );
      return;
    }
    // Prevent duplicate item in same transfer
    if (form.lines.find((l) => l.item_id === item.id)) {
      showToast("Item already added to this transfer", "error");
      return;
    }

    setForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          item_id: item.id,
          item_name: item.name,
          sku: item.sku || "",
          unit: item.unit || "",
          qty: qty,
          available: av,
          unit_cost_zar: item.weighted_avg_cost || 0,
        },
      ],
      lineItem: "",
      lineQty: "",
    }));
  }

  function handleRemoveLine(itemId) {
    setForm((f) => ({
      ...f,
      lines: f.lines.filter((l) => l.item_id !== itemId),
    }));
  }

  // ── Create transfer order ──────────────────────────────────────────────────
  async function handleCreateTransfer() {
    if (!form.to_tenant_id) {
      showToast("Select a destination store", "error");
      return;
    }
    if (form.lines.length === 0) {
      showToast("Add at least one item", "error");
      return;
    }

    setActionLoading(true);
    try {
      const reference = generateReference();

      // INSERT header — RULE 0F: from_tenant_id is HQ tenantId
      const { data: transfer, error: tErr } = await supabase
        .from("stock_transfers")
        .insert({
          reference,
          from_tenant_id: tenantId, // RULE 0F
          to_tenant_id: form.to_tenant_id,
          status: "draft",
          notes: form.notes || null,
          created_by: (await supabase.auth.getUser()).data?.user?.id || null,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      // INSERT line items
      const items = form.lines.map((l) => ({
        transfer_id: transfer.id,
        item_id: l.item_id,
        item_name: l.item_name,
        sku: l.sku || null,
        unit: l.unit || null,
        qty_requested: l.qty,
        unit_cost_zar: l.unit_cost_zar || 0,
      }));
      const { error: iErr } = await supabase
        .from("stock_transfer_items")
        .insert(items);
      if (iErr) throw iErr;

      showToast("Transfer " + reference + " created");
      setForm({
        to_tenant_id: "",
        notes: "",
        lines: [],
        lineItem: "",
        lineQty: "",
      });
      setActiveSubTab("active");
      fetchAll();
    } catch (err) {
      console.error("handleCreateTransfer:", err);
      showToast("Failed to create transfer: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Ship transfer (draft → in_transit) ────────────────────────────────────
  // Deducts HQ stock + inserts transfer_out movement per line
  async function handleShip(transfer) {
    if (
      !window.confirm(
        "Ship " +
          transfer.reference +
          " to " +
          getStoreName(transfer.to_tenant_id) +
          "?\n\n" +
          "This will deduct the quantities from HQ stock immediately.",
      )
    )
      return;

    setActionLoading(true);
    try {
      const lines = transfer.stock_transfer_items || [];

      for (const line of lines) {
        const qty = line.qty_requested;

        // Check HQ stock still sufficient
        const { data: inv } = await supabase
          .from("inventory_items")
          .select("quantity_on_hand, reserved_qty, weighted_avg_cost")
          .eq("id", line.item_id)
          .eq("tenant_id", tenantId) // RULE 0F — scope to HQ
          .single();

        const av = Math.max(
          0,
          (inv?.quantity_on_hand || 0) - (inv?.reserved_qty || 0),
        );
        if (av < qty) {
          throw new Error(
            "Insufficient stock for " +
              line.item_name +
              " (available: " +
              av +
              ", requested: " +
              qty +
              ")",
          );
        }

        // Deduct HQ inventory_items.quantity_on_hand
        const { error: invErr } = await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: (inv.quantity_on_hand || 0) - qty })
          .eq("id", line.item_id)
          .eq("tenant_id", tenantId); // RULE 0F
        if (invErr) throw invErr;

        // INSERT transfer_out stock_movement for HQ
        // stock_movements: unit_cost (USD — null for transfers) + unit_cost_zar required
        const { error: mvErr } = await supabase.from("stock_movements").insert({
          item_id: line.item_id,
          tenant_id: tenantId, // RULE 0F — HQ tenant
          type: "transfer_out",
          quantity: -qty, // negative = deduction
          unit_cost: null, // no USD cost for internal transfer
          unit_cost_zar: inv?.weighted_avg_cost || 0,
          reference: transfer.reference,
          notes: "Transfer to " + getStoreName(transfer.to_tenant_id),
        });
        if (mvErr) throw mvErr;
      }

      // Update transfer status → in_transit
      const { error: stErr } = await supabase
        .from("stock_transfers")
        .update({ status: "in_transit", shipped_at: new Date().toISOString() })
        .eq("id", transfer.id);
      if (stErr) throw stErr;

      showToast(transfer.reference + " shipped — awaiting store confirmation");
      fetchAll();
    } catch (err) {
      console.error("handleShip:", err);
      showToast("Ship failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Mark received (in_transit → received) ─────────────────────────────────
  // Adds stock to shop side + inserts transfer_in movement per line
  async function handleReceive(transfer) {
    if (
      !window.confirm(
        "Confirm " +
          getStoreName(transfer.to_tenant_id) +
          " has received " +
          transfer.reference +
          "?\n\nThis will add stock to the store's inventory.",
      )
    )
      return;

    setActionLoading(true);
    try {
      const lines = transfer.stock_transfer_items || [];

      for (const line of lines) {
        const confirmedQty = line.qty_confirmed ?? line.qty_requested;

        // Find or create shop inventory_item for this item
        // First: try match by sku, then by name
        let shopItemId = null;
        let shopCurrentQty = 0;

        if (line.sku) {
          const { data: bySkuArr } = await supabase
            .from("inventory_items")
            .select("id, quantity_on_hand")
            .eq("tenant_id", transfer.to_tenant_id)
            .eq("sku", line.sku);
          const bySku = bySkuArr?.[0] || null;
          if (bySku) {
            shopItemId = bySku.id;
            shopCurrentQty = bySku.quantity_on_hand || 0;
          }
        }

        if (!shopItemId) {
          // Try name match as fallback
          const { data: byNameArr } = await supabase
            .from("inventory_items")
            .select("id, quantity_on_hand")
            .eq("tenant_id", transfer.to_tenant_id)
            .eq("name", line.item_name);
          const byName = byNameArr?.[0] || null;
          if (byName) {
            shopItemId = byName.id;
            shopCurrentQty = byName.quantity_on_hand || 0;
          }
        }

        if (shopItemId) {
          // Update existing shop item
          const { error: updErr } = await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: shopCurrentQty + confirmedQty })
            .eq("id", shopItemId)
            .eq("tenant_id", transfer.to_tenant_id); // RULE 0F
          if (updErr) throw updErr;
        } else {
          // Create new inventory_item in shop (LL-024: is_active=true, sell_price=0)
          // RULE 0F: tenant_id = shop tenant
          const { data: newItem, error: newErr } = await supabase
            .from("inventory_items")
            .insert({
              tenant_id: transfer.to_tenant_id, // RULE 0F
              name: line.item_name,
              sku: line.sku || null,
              unit: line.unit || null,
              category: "finished_product",
              quantity_on_hand: confirmedQty,
              reserved_qty: 0,
              is_active: true,
              sell_price: 0, // LL-024
              weighted_avg_cost: line.unit_cost_zar || 0,
            })
            .select("id")
            .single();
          if (newErr) throw newErr;
          shopItemId = newItem.id;
        }

        // INSERT transfer_in stock_movement for shop
        const { error: mvErr } = await supabase.from("stock_movements").insert({
          item_id: shopItemId,
          tenant_id: transfer.to_tenant_id, // RULE 0F — shop tenant
          type: "transfer_in",
          quantity: confirmedQty, // positive = addition
          unit_cost: null, // no USD cost for internal transfer
          unit_cost_zar: line.unit_cost_zar || 0,
          reference: transfer.reference,
          notes: "Transfer received from HQ",
        });
        if (mvErr) throw mvErr;
      }

      // Update transfer status → received
      const { error: stErr } = await supabase
        .from("stock_transfers")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("id", transfer.id);
      if (stErr) throw stErr;

      showToast(
        transfer.reference + " marked as received — store stock updated",
      );
      fetchAll();
    } catch (err) {
      console.error("handleReceive:", err);
      showToast("Receive failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Cancel transfer ────────────────────────────────────────────────────────
  // Only allowed for draft orders (in_transit requires investigation)
  async function handleCancel(transfer) {
    if (!cancelReason.trim()) {
      showToast("Enter a cancellation reason", "error");
      return;
    }

    setActionLoading(true);
    try {
      // If already shipped (in_transit), we must reverse HQ stock deduction
      if (transfer.status === "in_transit") {
        const lines = transfer.stock_transfer_items || [];
        for (const line of lines) {
          const { data: inv } = await supabase
            .from("inventory_items")
            .select("quantity_on_hand")
            .eq("id", line.item_id)
            .eq("tenant_id", tenantId)
            .single();

          // Reverse the deduction
          await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand:
                (inv?.quantity_on_hand || 0) + line.qty_requested,
            })
            .eq("id", line.item_id)
            .eq("tenant_id", tenantId); // RULE 0F

          // Insert reversal movement
          await supabase.from("stock_movements").insert({
            item_id: line.item_id,
            tenant_id: tenantId, // RULE 0F
            type: "transfer_out", // reversal of the deduction
            quantity: line.qty_requested, // positive = restoring stock
            unit_cost: null,
            unit_cost_zar: line.unit_cost_zar || 0,
            reference: transfer.reference,
            notes: "Transfer cancelled — stock reversed: " + cancelReason,
          });
        }
      }

      const { error } = await supabase
        .from("stock_transfers")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_reason: cancelReason,
        })
        .eq("id", transfer.id);
      if (error) throw error;

      showToast(transfer.reference + " cancelled");
      setCancellingId(null);
      setCancelReason("");
      fetchAll();
    } catch (err) {
      console.error("handleCancel:", err);
      showToast("Cancel failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Helper: get store name ─────────────────────────────────────────────────
  function getStoreName(tenantId) {
    return allTenants.find((t) => t.id === tenantId)?.name || tenantId;
  }

  // ── Format date ────────────────────────────────────────────────────────────
  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // ── Filtered transfer lists ────────────────────────────────────────────────
  const activeTransfers = transfers.filter(
    (t) => t.status === "draft" || t.status === "in_transit",
  );
  const historyTransfers = transfers.filter(
    (t) => t.status === "received" || t.status === "cancelled",
  );

  // ── SUB-TABS ───────────────────────────────────────────────────────────────
  const SUB_TABS = [
    { id: "overview", label: "Overview" },
    { id: "new-transfer", label: "+ New Transfer" },
    { id: "active", label: "Active (" + activeTransfers.length + ")" },
    { id: "history", label: "History" },
  ];

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: "#111827" }}>
      {/* WorkflowGuide MUST be first element — never remove */}
      <WorkflowGuide tabId="hq-transfers" />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "error" ? "#FEF2F2" : "#F0FDF4",
            border:
              "1px solid " + (toast.type === "error" ? "#FECACA" : "#BBF7D0"),
            color: toast.type === "error" ? "#991B1B" : "#166534",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
          Transfer Orders
          <InfoTooltip
            title="HQ→Shop Transfers"
            body="Create and manage stock transfers from HQ warehouse to shop locations. Both sides get full stock movement audit trails."
          />
        </h2>
        <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 14 }}>
          Distribute stock from HQ warehouse to shop tenants — Vape King
          distribution model
        </p>
      </div>

      {/* Sub-tab navigation */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "2px solid #E5E7EB",
          marginBottom: 24,
        }}
      >
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: "8px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeSubTab === tab.id ? 600 : 400,
              color: activeSubTab === tab.id ? "#2563EB" : "#6B7280",
              borderBottom:
                activeSubTab === tab.id
                  ? "2px solid #2563EB"
                  : "2px solid transparent",
              marginBottom: -2,
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#9CA3AF",
            fontSize: 14,
          }}
        >
          Loading transfer data…
        </div>
      )}

      {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
      {!loading && activeSubTab === "overview" && (
        <div>
          {/* KPI strip */}
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <KpiCard
              label="Draft Orders"
              value={kpis.pending}
              sub="Awaiting dispatch"
              accent={kpis.pending > 0 ? "#B45309" : "#111827"}
            />
            <KpiCard
              label="In Transit"
              value={kpis.inTransit}
              sub="Shipped to stores"
              accent={kpis.inTransit > 0 ? "#1D4ED8" : "#111827"}
            />
            <KpiCard
              label="Received (MTD)"
              value={kpis.received}
              sub="This month"
              accent="#166534"
            />
            <KpiCard
              label="Line Items (MTD)"
              value={kpis.itemsMTD}
              sub="Across received orders"
            />
            <KpiCard
              label="Total Stores"
              value={allTenants.length}
              sub="Available destinations"
            />
          </div>

          {/* Recent activity */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #E5E7EB",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Recent Transfers
            </div>
            {transfers.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#9CA3AF",
                }}
              >
                No transfers yet.{" "}
                <button
                  onClick={() => setActiveSubTab("new-transfer")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563EB",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                >
                  Create your first transfer →
                </button>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    {["Reference", "Store", "Items", "Status", "Date"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 16px",
                            textAlign: "left",
                            fontSize: 12,
                            color: "#6B7280",
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {transfers.slice(0, 10).map((t) => (
                    <tr key={t.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1D4ED8",
                        }}
                      >
                        {t.reference}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        {getStoreName(t.to_tenant_id)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "#6B7280",
                        }}
                      >
                        {t.stock_transfer_items?.length || 0} line
                        {t.stock_transfer_items?.length !== 1 ? "s" : ""}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <StatusBadge status={t.status} />
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "#9CA3AF",
                        }}
                      >
                        {fmtDate(t.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── NEW TRANSFER TAB ───────────────────────────────────────────────── */}
      {!loading && activeSubTab === "new-transfer" && (
        <div style={{ maxWidth: 780 }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 10,
              padding: 28,
            }}
          >
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
              New Transfer Order
            </h3>

            {/* Destination store */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Destination Store *
                <InfoTooltip
                  title="Destination Store"
                  body="Select the shop tenant that will receive this stock. Both HQ (deduction) and the store (addition) will get stock movement entries."
                />
              </label>
              <select
                value={form.to_tenant_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, to_tenant_id: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: "#fff",
                  color: "#111827",
                }}
              >
                <option value="">Select a store…</option>
                {allTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Transfer Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="e.g. Weekly replenishment — Vape King Sandton"
                rows={2}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Item picker */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Add Items *
                <InfoTooltip
                  title="Transfer Items"
                  body="Add HQ inventory items to include in this transfer. Quantity cannot exceed available stock (on hand minus reserved)."
                />
              </label>

              <div
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                {/* Item dropdown */}
                <div style={{ flex: 3 }}>
                  <select
                    value={form.lineItem}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lineItem: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: "inherit",
                      background: "#fff",
                    }}
                  >
                    <option value="">Select item…</option>
                    {hqInventory
                      .filter(
                        (i) => !form.lines.find((l) => l.item_id === i.id),
                      )
                      .map((i) => {
                        const av = availQty(i);
                        return (
                          <option key={i.id} value={i.id} disabled={av <= 0}>
                            {i.name}
                            {i.sku ? " [" + i.sku + "]" : ""} — {av}{" "}
                            {i.unit || "units"} avail
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* Qty input */}
                <div style={{ flex: 1 }}>
                  {(() => {
                    const sel = hqInventory.find((i) => i.id === form.lineItem);
                    const av = sel ? availQty(sel) : 0;
                    return (
                      <input
                        type="number"
                        min="0.01"
                        max={av || undefined}
                        step="0.01"
                        value={form.lineQty}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, lineQty: e.target.value }))
                        }
                        placeholder={"Qty" + (sel ? " (max " + av + ")" : "")}
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          border: "1px solid #D1D5DB",
                          borderRadius: 6,
                          fontSize: 13,
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      />
                    );
                  })()}
                </div>

                {/* Add button */}
                <button
                  onClick={handleAddLine}
                  style={{
                    padding: "9px 18px",
                    background: "#2563EB",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  Add Line
                </button>
              </div>
            </div>

            {/* Lines list */}
            {form.lines.length > 0 && (
              <div
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  overflow: "hidden",
                  marginBottom: 24,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["Item", "SKU", "Qty", "Unit", "AVCO Cost", ""].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "8px 14px",
                              textAlign: "left",
                              fontSize: 12,
                              color: "#6B7280",
                              fontWeight: 600,
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line) => (
                      <tr
                        key={line.item_id}
                        style={{ borderTop: "1px solid #F3F4F6" }}
                      >
                        <td
                          style={{
                            padding: "10px 14px",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {line.item_name}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontSize: 12,
                            color: "#9CA3AF",
                          }}
                        >
                          {line.sku || "—"}
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 13 }}>
                          {line.qty}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontSize: 13,
                            color: "#6B7280",
                          }}
                        >
                          {line.unit || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            fontSize: 13,
                            color: "#6B7280",
                          }}
                        >
                          R{(line.unit_cost_zar || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <button
                            onClick={() => handleRemoveLine(line.item_id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#EF4444",
                              cursor: "pointer",
                              fontSize: 18,
                              lineHeight: 1,
                            }}
                            title="Remove line"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div
                  style={{
                    padding: "8px 14px",
                    background: "#F9FAFB",
                    borderTop: "1px solid #E5E7EB",
                    fontSize: 12,
                    color: "#6B7280",
                    textAlign: "right",
                  }}
                >
                  {form.lines.length} line{form.lines.length !== 1 ? "s" : ""} ·
                  Total value:{" "}
                  <strong style={{ color: "#111827" }}>
                    R
                    {form.lines
                      .reduce((s, l) => s + l.qty * (l.unit_cost_zar || 0), 0)
                      .toFixed(2)}
                  </strong>
                </div>
              </div>
            )}

            {/* Submit */}
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() =>
                  setForm({
                    to_tenant_id: "",
                    notes: "",
                    lines: [],
                    lineItem: "",
                    lineQty: "",
                  })
                }
                style={{
                  padding: "10px 20px",
                  background: "#F3F4F6",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              >
                Clear
              </button>
              <button
                onClick={handleCreateTransfer}
                disabled={
                  actionLoading || form.lines.length === 0 || !form.to_tenant_id
                }
                style={{
                  padding: "10px 24px",
                  background:
                    actionLoading ||
                    form.lines.length === 0 ||
                    !form.to_tenant_id
                      ? "#D1D5DB"
                      : "#2563EB",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                {actionLoading ? "Creating…" : "Create Transfer Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVE TAB ─────────────────────────────────────────────────────── */}
      {!loading && activeSubTab === "active" && (
        <div>
          {activeTransfers.length === 0 ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: "48px 24px",
                textAlign: "center",
                color: "#9CA3AF",
              }}
            >
              No active transfers.{" "}
              <button
                onClick={() => setActiveSubTab("new-transfer")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563EB",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              >
                Create one →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeTransfers.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #E5E7EB",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {/* Row header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "14px 20px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#1D4ED8",
                        }}
                      >
                        {t.reference}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}
                      >
                        {fmtDate(t.created_at)}
                      </div>
                    </div>
                    <div style={{ flex: 1, fontSize: 14 }}>
                      <div style={{ fontWeight: 500 }}>
                        {getStoreName(t.to_tenant_id)}
                      </div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                        {t.stock_transfer_items?.length || 0} line
                        {t.stock_transfer_items?.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      {/* Expand/collapse */}
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === t.id ? null : t.id)
                        }
                        style={{
                          padding: "6px 12px",
                          background: "#F3F4F6",
                          border: "none",
                          borderRadius: 5,
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "inherit",
                        }}
                      >
                        {expandedId === t.id ? "Hide Lines ▲" : "View Lines ▼"}
                      </button>
                      {/* Ship button — draft only */}
                      {t.status === "draft" && (
                        <button
                          onClick={() => handleShip(t)}
                          disabled={actionLoading}
                          style={{
                            padding: "6px 14px",
                            background: "#1D4ED8",
                            color: "#fff",
                            border: "none",
                            borderRadius: 5,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "inherit",
                          }}
                        >
                          Ship ✈
                        </button>
                      )}
                      {/* Mark Received — in_transit only */}
                      {t.status === "in_transit" && (
                        <button
                          onClick={() => handleReceive(t)}
                          disabled={actionLoading}
                          style={{
                            padding: "6px 14px",
                            background: "#166534",
                            color: "#fff",
                            border: "none",
                            borderRadius: 5,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "inherit",
                          }}
                        >
                          Mark Received ✓
                        </button>
                      )}
                      {/* Cancel */}
                      {cancellingId === t.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Reason for cancellation"
                            style={{
                              padding: "5px 10px",
                              border: "1px solid #FCA5A5",
                              borderRadius: 5,
                              fontSize: 12,
                              fontFamily: "inherit",
                              width: 200,
                            }}
                          />
                          <button
                            onClick={() => handleCancel(t)}
                            disabled={actionLoading}
                            style={{
                              padding: "5px 10px",
                              background: "#DC2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: 5,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: "inherit",
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setCancellingId(null);
                              setCancelReason("");
                            }}
                            style={{
                              padding: "5px 8px",
                              background: "#F3F4F6",
                              border: "none",
                              borderRadius: 5,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: "inherit",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancellingId(t.id)}
                          style={{
                            padding: "6px 10px",
                            background: "#FEF2F2",
                            color: "#991B1B",
                            border: "1px solid #FECACA",
                            borderRadius: 5,
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: "inherit",
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* In-transit note */}
                  {t.status === "in_transit" && (
                    <div
                      style={{
                        margin: "0 20px 10px",
                        padding: "8px 12px",
                        background: "#FEF3C7",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#92400E",
                      }}
                    >
                      ✈ Shipped {fmtDate(t.shipped_at)} — awaiting store
                      confirmation. HQ stock already deducted.
                    </div>
                  )}

                  {/* Expanded line items */}
                  {expandedId === t.id && (
                    <div
                      style={{
                        borderTop: "1px solid #F3F4F6",
                        background: "#FAFAFA",
                      }}
                    >
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            {[
                              "Item",
                              "SKU",
                              "Unit",
                              "Requested",
                              "Confirmed",
                              "AVCO/unit",
                              "Total Value",
                            ].map((h) => (
                              <th
                                key={h}
                                style={{
                                  padding: "8px 16px",
                                  textAlign: "left",
                                  fontSize: 11,
                                  color: "#9CA3AF",
                                  fontWeight: 600,
                                }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(t.stock_transfer_items || []).map((line) => (
                            <tr
                              key={line.id}
                              style={{ borderTop: "1px solid #F3F4F6" }}
                            >
                              <td
                                style={{
                                  padding: "9px 16px",
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                {line.item_name}
                              </td>
                              <td
                                style={{
                                  padding: "9px 16px",
                                  fontSize: 12,
                                  color: "#9CA3AF",
                                }}
                              >
                                {line.sku || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "9px 16px",
                                  fontSize: 13,
                                  color: "#6B7280",
                                }}
                              >
                                {line.unit || "—"}
                              </td>
                              <td style={{ padding: "9px 16px", fontSize: 13 }}>
                                {line.qty_requested}
                              </td>
                              <td
                                style={{
                                  padding: "9px 16px",
                                  fontSize: 13,
                                  color: "#6B7280",
                                }}
                              >
                                {line.qty_confirmed ?? "—"}
                              </td>
                              <td
                                style={{
                                  padding: "9px 16px",
                                  fontSize: 13,
                                  color: "#6B7280",
                                }}
                              >
                                R{(line.unit_cost_zar || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: "9px 16px", fontSize: 13 }}>
                                R
                                {(
                                  line.qty_requested * (line.unit_cost_zar || 0)
                                ).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {t.notes && (
                        <div
                          style={{
                            padding: "8px 16px",
                            fontSize: 12,
                            color: "#6B7280",
                            fontStyle: "italic",
                          }}
                        >
                          Note: {t.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ────────────────────────────────────────────────────── */}
      {!loading && activeSubTab === "history" && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {historyTransfers.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "#9CA3AF",
                fontSize: 14,
              }}
            >
              No completed or cancelled transfers yet.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {[
                    "Reference",
                    "Store",
                    "Lines",
                    "Status",
                    "Created",
                    "Completed/Cancelled",
                    "Notes",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 12,
                        color: "#6B7280",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyTransfers.map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      {t.reference}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>
                      {getStoreName(t.to_tenant_id)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "#6B7280",
                      }}
                    >
                      {t.stock_transfer_items?.length || 0}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 12,
                        color: "#9CA3AF",
                      }}
                    >
                      {fmtDate(t.created_at)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 12,
                        color: "#9CA3AF",
                      }}
                    >
                      {t.status === "received"
                        ? fmtDate(t.received_at)
                        : fmtDate(t.cancelled_at)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 12,
                        color: "#6B7280",
                      }}
                    >
                      {t.cancelled_reason || t.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
