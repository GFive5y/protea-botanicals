// src/components/group/GroupTransfer.js
// WP-TENANT-GROUPS Phase 4 — Inter-store stock transfers for franchise networks.
//
// Parallel to HQTransfer.js but NOT a fork:
//   • FROM store comes from form state (never hardcoded to tenantId)
//   • Route is restricted to stores inside the current group
//   • AVCO is recalculated correctly on receive (HQTransfer bug — see LL-242)
//   • Dual quantity display in New Transfer: shows qty at FROM and qty at TO
//
// Reuses existing infrastructure: stock_transfers, stock_transfer_items,
// stock_movements, inventory_items. No schema changes.
//
// Workflow: draft → in_transit (ship) → received (receive) | cancelled.
//
// LL-206: direct useTenant destructure · LL-238: T.* tokens only
// LL-242: AVCO fix mandatory on receive (do not copy HQTransfer pattern)

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { T } from "../../styles/tokens";

// ─── Helpers (duplicated from HQTransfer — do NOT import) ────────────────────

function generateReference() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "TRF-" + d + "-" + rand;
}

function formatR(n) {
  const val = Number(n || 0);
  return "R" + val.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const map = {
    draft: { bg: T.neutralLight, fg: T.neutralText, label: "Draft" },
    in_transit: { bg: T.warningLight, fg: T.warningText, label: "In Transit" },
    received: { bg: T.successLight, fg: T.successText, label: "Received" },
    cancelled: { bg: T.dangerLight, fg: T.dangerText, label: "Cancelled" },
  };
  const s = map[status] || map.draft;
  return (
    <span
      style={{
        display: "inline-block",
        background: s.bg,
        color: s.fg,
        padding: `2px ${T.pad.sm}px`,
        borderRadius: T.radius.full,
        fontSize: T.text.xs,
        fontWeight: T.weight.medium,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {s.label}
    </span>
  );
}

function KpiCard({ label, value, sub }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        padding: T.inset.card,
      }}
    >
      <div
        style={{
          fontSize: T.text.xs,
          fontWeight: T.weight.semibold,
          color: T.ink600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: T.gap.sm,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: T.text["2xl"],
          fontWeight: T.weight.bold,
          color: T.ink900,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: T.text.xs,
            color: T.ink600,
            marginTop: T.gap.xs,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function GroupTransfer({ groupId, groupName, members, onNavigate }) {
  // eslint-disable-next-line no-unused-vars
  const { tenantId } = useTenant(); // LL-206 — reserved for future created_by attribution
  void groupId; void onNavigate;

  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [transfers, setTransfers] = useState([]);
  const [fromInventory, setFromInventory] = useState([]);
  const [toInventory, setToInventory] = useState({}); // map { [sku]: qty }
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    from_tenant_id: "",
    to_tenant_id: "",
    notes: "",
    lines: [],
    lineItem: "",
    lineQty: "",
  });

  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // ── Derived helpers ──────────────────────────────────────────────────────
  const memberTenantIds = useMemo(
    () => (members || []).map((m) => m.tenant_id),
    [members],
  );

  const getStoreName = useCallback(
    (tid) => {
      const m = (members || []).find((x) => x.tenant_id === tid);
      return m?.tenants?.name || "Unknown store";
    },
    [members],
  );

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch transfers for this group ───────────────────────────────────────
  const fetchTransfers = useCallback(async () => {
    if (!memberTenantIds.length) {
      setTransfers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const idList = memberTenantIds.join(",");
      const { data, error } = await supabase
        .from("stock_transfers")
        .select("*, stock_transfer_items(*)")
        .or(`from_tenant_id.in.(${idList}),to_tenant_id.in.(${idList})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTransfers(data || []);
    } catch (err) {
      console.error("[GroupTransfer] fetchTransfers:", err);
      showToast("Failed to load transfers: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [memberTenantIds]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // ── Fetch FROM store inventory when from_tenant_id changes ───────────────
  useEffect(() => {
    if (!form.from_tenant_id) {
      setFromInventory([]);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select(
            "id, name, sku, category, unit, quantity_on_hand, reserved_qty, weighted_avg_cost, reorder_level, is_active",
          )
          .eq("tenant_id", form.from_tenant_id)
          .eq("is_active", true)
          .gt("quantity_on_hand", 0)
          .order("name");
        if (error) throw error;
        setFromInventory(data || []);
      } catch (err) {
        console.error("[GroupTransfer] fetchFromInventory:", err);
        showToast("Failed to load source inventory: " + err.message, "error");
      }
    })();
  }, [form.from_tenant_id]);

  // ── Fetch TO store qty per SKU when to_tenant_id or lines change ─────────
  useEffect(() => {
    if (!form.to_tenant_id || form.lines.length === 0) {
      setToInventory({});
      return;
    }
    const skus = form.lines.map((l) => l.sku).filter(Boolean);
    if (skus.length === 0) {
      setToInventory({});
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("sku, quantity_on_hand")
          .eq("tenant_id", form.to_tenant_id)
          .in("sku", skus);
        if (error) throw error;
        const map = {};
        (data || []).forEach((row) => {
          if (row.sku) map[row.sku] = row.quantity_on_hand || 0;
        });
        setToInventory(map);
      } catch (err) {
        console.error("[GroupTransfer] fetchToInventory:", err);
      }
    })();
  }, [form.to_tenant_id, form.lines]);

  // ── Add line to form ─────────────────────────────────────────────────────
  function handleAddLine() {
    if (!form.lineItem) {
      showToast("Select a product first", "error");
      return;
    }
    const qty = parseInt(form.lineQty, 10);
    if (!qty || qty <= 0) {
      showToast("Enter a valid quantity", "error");
      return;
    }
    const item = fromInventory.find((i) => i.id === form.lineItem);
    if (!item) return;
    const available = Math.max(
      0,
      (item.quantity_on_hand || 0) - (item.reserved_qty || 0),
    );
    if (qty > available) {
      showToast(
        "Only " + available + " available at source store",
        "error",
      );
      return;
    }
    if (form.lines.some((l) => l.item_id === item.id)) {
      showToast("Item already added to this transfer", "error");
      return;
    }
    setForm({
      ...form,
      lines: [
        ...form.lines,
        {
          item_id: item.id,
          item_name: item.name,
          sku: item.sku || null,
          unit: item.unit || null,
          qty,
          available_from: available,
          unit_cost_zar: item.weighted_avg_cost || 0,
          reorder_level: item.reorder_level || 0,
        },
      ],
      lineItem: "",
      lineQty: "",
    });
  }

  function handleRemoveLine(itemId) {
    setForm({ ...form, lines: form.lines.filter((l) => l.item_id !== itemId) });
  }

  // ── Create transfer ──────────────────────────────────────────────────────
  async function handleCreateTransfer() {
    if (!form.from_tenant_id || !form.to_tenant_id) {
      showToast("Select both FROM and TO stores", "error");
      return;
    }
    if (form.from_tenant_id === form.to_tenant_id) {
      showToast("FROM and TO must be different stores", "error");
      return;
    }
    if (form.lines.length === 0) {
      showToast("Add at least one product", "error");
      return;
    }
    setActionLoading(true);
    try {
      const reference = generateReference();
      const { data: userResp } = await supabase.auth.getUser();
      const createdBy = userResp?.user?.id || null;

      const { data: transfer, error: tErr } = await supabase
        .from("stock_transfers")
        .insert({
          reference,
          from_tenant_id: form.from_tenant_id, // LL-242 — from form, not tenantId
          to_tenant_id: form.to_tenant_id,
          status: "draft",
          notes: form.notes || null,
          created_by: createdBy,
        })
        .select()
        .single();
      if (tErr) throw tErr;

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
        from_tenant_id: "",
        to_tenant_id: "",
        notes: "",
        lines: [],
        lineItem: "",
        lineQty: "",
      });
      setActiveSubTab("active");
      fetchTransfers();
    } catch (err) {
      console.error("[GroupTransfer] handleCreateTransfer:", err);
      showToast("Failed to create transfer: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Ship transfer: draft → in_transit ────────────────────────────────────
  // Per-line loop, no transaction wrapper (atomicity gap — known issue).
  async function handleShip(transfer) {
    if (
      !window.confirm(
        "Ship " +
          transfer.reference +
          " from " +
          getStoreName(transfer.from_tenant_id) +
          " to " +
          getStoreName(transfer.to_tenant_id) +
          "?\n\nThis will deduct the quantities from " +
          getStoreName(transfer.from_tenant_id) +
          " stock immediately.",
      )
    )
      return;

    setActionLoading(true);
    try {
      const lines = transfer.stock_transfer_items || [];
      for (const line of lines) {
        const qty = line.qty_requested;

        const { data: inv, error: invGetErr } = await supabase
          .from("inventory_items")
          .select("quantity_on_hand, reserved_qty, weighted_avg_cost")
          .eq("id", line.item_id)
          .eq("tenant_id", transfer.from_tenant_id)
          .single();
        if (invGetErr) throw invGetErr;

        const available = Math.max(
          0,
          (inv?.quantity_on_hand || 0) - (inv?.reserved_qty || 0),
        );
        if (available < qty) {
          throw new Error(
            "Insufficient stock at " +
              getStoreName(transfer.from_tenant_id) +
              " for " +
              line.item_name +
              " (available: " +
              available +
              ", requested: " +
              qty +
              ")",
          );
        }

        const { error: invErr } = await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: (inv.quantity_on_hand || 0) - qty })
          .eq("id", line.item_id)
          .eq("tenant_id", transfer.from_tenant_id);
        if (invErr) throw invErr;

        const { error: mvErr } = await supabase.from("stock_movements").insert({
          item_id: line.item_id,
          tenant_id: transfer.from_tenant_id,
          type: "transfer_out",
          quantity: -qty,
          unit_cost: null,
          unit_cost_zar: inv?.weighted_avg_cost || 0,
          reference: transfer.reference,
          notes: "Transfer to " + getStoreName(transfer.to_tenant_id),
        });
        if (mvErr) throw mvErr;
      }

      const { error: stErr } = await supabase
        .from("stock_transfers")
        .update({ status: "in_transit", shipped_at: new Date().toISOString() })
        .eq("id", transfer.id);
      if (stErr) throw stErr;

      showToast(transfer.reference + " shipped — awaiting destination receipt");
      fetchTransfers();
    } catch (err) {
      console.error("[GroupTransfer] handleShip:", err);
      showToast("Ship failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Receive transfer: in_transit → received ─────────────────────────────
  // LL-242 AVCO FIX — when destination item exists, recalculate weighted
  // average cost as ((qty_d × avco_d) + (qty_in × cost_in)) / (qty_d + qty_in).
  // HQTransfer.js skips this step and silently corrupts destination AVCO.
  async function handleReceive(transfer) {
    if (
      !window.confirm(
        "Confirm " +
          getStoreName(transfer.to_tenant_id) +
          " has received " +
          transfer.reference +
          "?\n\nThis will add stock to the destination store.",
      )
    )
      return;

    setActionLoading(true);
    try {
      const lines = transfer.stock_transfer_items || [];
      for (const line of lines) {
        const confirmedQty = line.qty_confirmed ?? line.qty_requested;
        const inUnitCost = line.unit_cost_zar || 0;

        // Two-step match: SKU first, name fallback.
        let destItemId = null;
        let destQty = 0;
        let destAvco = 0;

        if (line.sku) {
          const { data: bySkuArr } = await supabase
            .from("inventory_items")
            .select("id, quantity_on_hand, weighted_avg_cost")
            .eq("tenant_id", transfer.to_tenant_id)
            .eq("sku", line.sku);
          const bySku = bySkuArr?.[0] || null;
          if (bySku) {
            destItemId = bySku.id;
            destQty = bySku.quantity_on_hand || 0;
            destAvco = bySku.weighted_avg_cost || 0;
          }
        }

        if (!destItemId) {
          const { data: byNameArr } = await supabase
            .from("inventory_items")
            .select("id, quantity_on_hand, weighted_avg_cost")
            .eq("tenant_id", transfer.to_tenant_id)
            .eq("name", line.item_name);
          const byName = byNameArr?.[0] || null;
          if (byName) {
            destItemId = byName.id;
            destQty = byName.quantity_on_hand || 0;
            destAvco = byName.weighted_avg_cost || 0;
          }
        }

        if (destItemId) {
          // LL-242 — correct AVCO recalculation on the destination tenant.
          const newQty = destQty + confirmedQty;
          const newAvco =
            newQty > 0
              ? (destQty * destAvco + confirmedQty * inUnitCost) / newQty
              : inUnitCost;

          const { error: updErr } = await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand: newQty,
              weighted_avg_cost: newAvco,
            })
            .eq("id", destItemId)
            .eq("tenant_id", transfer.to_tenant_id);
          if (updErr) throw updErr;
        } else {
          // New item on destination — create with transferred cost as AVCO.
          // LL-024: sell_price=0, destination store must set before sale.
          const { data: newItem, error: newErr } = await supabase
            .from("inventory_items")
            .insert({
              tenant_id: transfer.to_tenant_id,
              name: line.item_name,
              sku: line.sku || null,
              unit: line.unit || null,
              category: "finished_product",
              quantity_on_hand: confirmedQty,
              reserved_qty: 0,
              is_active: true,
              sell_price: 0,
              weighted_avg_cost: inUnitCost,
            })
            .select("id")
            .single();
          if (newErr) throw newErr;
          destItemId = newItem.id;
        }

        const { error: mvErr } = await supabase.from("stock_movements").insert({
          item_id: destItemId,
          tenant_id: transfer.to_tenant_id,
          type: "transfer_in",
          quantity: confirmedQty,
          unit_cost: null,
          unit_cost_zar: inUnitCost,
          reference: transfer.reference,
          notes: "Transfer from " + getStoreName(transfer.from_tenant_id),
        });
        if (mvErr) throw mvErr;
      }

      const { error: stErr } = await supabase
        .from("stock_transfers")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("id", transfer.id);
      if (stErr) throw stErr;

      showToast(transfer.reference + " received — destination stock updated");
      fetchTransfers();
    } catch (err) {
      console.error("[GroupTransfer] handleReceive:", err);
      showToast("Receive failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Cancel transfer ──────────────────────────────────────────────────────
  async function handleCancel(transfer) {
    if (!cancelReason.trim()) {
      showToast("Enter a cancellation reason", "error");
      return;
    }
    setActionLoading(true);
    try {
      if (transfer.status === "in_transit") {
        // Reverse source deduction.
        const lines = transfer.stock_transfer_items || [];
        for (const line of lines) {
          const { data: inv } = await supabase
            .from("inventory_items")
            .select("quantity_on_hand")
            .eq("id", line.item_id)
            .eq("tenant_id", transfer.from_tenant_id)
            .single();

          await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand:
                (inv?.quantity_on_hand || 0) + line.qty_requested,
            })
            .eq("id", line.item_id)
            .eq("tenant_id", transfer.from_tenant_id);

          await supabase.from("stock_movements").insert({
            item_id: line.item_id,
            tenant_id: transfer.from_tenant_id,
            type: "transfer_out",
            quantity: line.qty_requested,
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
      fetchTransfers();
    } catch (err) {
      console.error("[GroupTransfer] handleCancel:", err);
      showToast("Cancel failed: " + err.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Derived lists ────────────────────────────────────────────────────────
  const activeTransfers = transfers.filter((t) =>
    ["draft", "in_transit"].includes(t.status),
  );
  const historyTransfers = transfers.filter((t) =>
    ["received", "cancelled"].includes(t.status),
  );

  const totalValueMoved = transfers
    .filter((t) => t.status === "received")
    .reduce((sum, t) => {
      const lines = t.stock_transfer_items || [];
      return (
        sum +
        lines.reduce(
          (s, l) =>
            s + (l.qty_confirmed ?? l.qty_requested) * (l.unit_cost_zar || 0),
          0,
        )
      );
    }, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: T.font,
          fontSize: T.text.base,
          color: T.ink600,
        }}
      >
        Loading transfers…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.font }}>
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: T.page.sectionGap }}>
        <div
          style={{
            fontSize: T.text["3xl"],
            fontWeight: T.weight.bold,
            color: T.ink900,
            marginBottom: T.gap.xs,
          }}
        >
          Stock Transfers · {groupName}
        </div>
        <div style={{ fontSize: T.text.base, color: T.ink600 }}>
          Move stock between stores in your network
        </div>
      </div>

      {/* ── Sub-tab nav ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: T.gap.sm,
          borderBottom: `1px solid ${T.border}`,
          marginBottom: T.page.sectionGap,
        }}
      >
        {[
          { id: "overview", label: "Overview" },
          { id: "new-transfer", label: "New Transfer" },
          { id: "active", label: `Active (${activeTransfers.length})` },
          { id: "history", label: `History (${historyTransfers.length})` },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                padding: `${T.pad.md}px ${T.pad.lg}px`,
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
                color: isActive ? T.accentText : T.ink600,
                fontFamily: T.font,
                fontSize: T.text.base,
                fontWeight: isActive ? T.weight.semibold : T.weight.medium,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: T.gap.xl,
            right: T.gap.xl,
            background:
              toast.type === "error" ? T.dangerLight : T.successLight,
            color: toast.type === "error" ? T.dangerText : T.successText,
            border: `1px solid ${
              toast.type === "error" ? T.dangerBorder : T.success
            }`,
            borderRadius: T.radius.md,
            padding: `${T.pad.md}px ${T.pad.lg}px`,
            fontSize: T.text.base,
            fontWeight: T.weight.medium,
            boxShadow: T.shadow.lg,
            zIndex: T.z.toast,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
      {activeSubTab === "overview" && (
        <OverviewPane
          transfers={transfers}
          activeCount={activeTransfers.length}
          historyCount={
            transfers.filter((t) => t.status === "received").length
          }
          totalValueMoved={totalValueMoved}
          getStoreName={getStoreName}
          onNew={() => setActiveSubTab("new-transfer")}
        />
      )}

      {/* ── NEW TRANSFER ──────────────────────────────────────────────── */}
      {activeSubTab === "new-transfer" && (
        <NewTransferPane
          members={members}
          form={form}
          setForm={setForm}
          fromInventory={fromInventory}
          toInventory={toInventory}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onCreate={handleCreateTransfer}
          actionLoading={actionLoading}
        />
      )}

      {/* ── ACTIVE ────────────────────────────────────────────────────── */}
      {activeSubTab === "active" && (
        <TransferList
          transfers={activeTransfers}
          emptyText="No active transfers. Create one in New Transfer."
          getStoreName={getStoreName}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          cancellingId={cancellingId}
          setCancellingId={setCancellingId}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          onShip={handleShip}
          onReceive={handleReceive}
          onCancel={handleCancel}
          actionLoading={actionLoading}
          showActions
        />
      )}

      {/* ── HISTORY ───────────────────────────────────────────────────── */}
      {activeSubTab === "history" && (
        <TransferList
          transfers={historyTransfers}
          emptyText="No completed transfers yet."
          getStoreName={getStoreName}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          cancellingId={cancellingId}
          setCancellingId={setCancellingId}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          onShip={handleShip}
          onReceive={handleReceive}
          onCancel={handleCancel}
          actionLoading={actionLoading}
          showActions={false}
        />
      )}
    </div>
  );
}

// ─── OVERVIEW PANE ───────────────────────────────────────────────────────────

function OverviewPane({
  transfers,
  activeCount,
  historyCount,
  totalValueMoved,
  getStoreName,
  onNew,
}) {
  const recent = transfers.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.page.sectionGap }}>
      {/* KPI tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: T.page.cardGap,
        }}
      >
        <KpiCard label="Total Transfers" value={transfers.length} />
        <KpiCard
          label="Active"
          value={activeCount}
          sub="Draft + in transit"
        />
        <KpiCard label="Completed" value={historyCount} />
        <KpiCard
          label="Stock Value Moved"
          value={formatR(totalValueMoved)}
          sub="Received transfers"
        />
      </div>

      {/* Quick action */}
      <div>
        <button
          type="button"
          onClick={onNew}
          style={{
            background: T.accent,
            color: "#ffffff",
            border: "none",
            borderRadius: T.radius.md,
            padding: `${T.pad.md}px ${T.pad.xl}px`,
            fontFamily: T.font,
            fontSize: T.text.base,
            fontWeight: T.weight.semibold,
            cursor: "pointer",
          }}
        >
          + New Transfer
        </button>
      </div>

      {/* Recent transfers table */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.lg,
          padding: T.inset.card,
        }}
      >
        <div
          style={{
            fontSize: T.text.lg,
            fontWeight: T.weight.semibold,
            color: T.ink900,
            marginBottom: T.gap.lg,
          }}
        >
          Recent Transfers
        </div>
        {recent.length === 0 ? (
          <div style={{ fontSize: T.text.base, color: T.ink600 }}>
            No transfers yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: T.text.sm,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: T.ink600 }}>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    Reference
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    From
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    To
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    Items
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    Status
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr
                    key={t.id}
                    style={{ borderTop: `1px solid ${T.border}`, color: T.ink900 }}
                  >
                    <td
                      style={{
                        padding: T.inset.tight,
                        fontFamily: T.fontMono,
                        fontSize: T.text.xs,
                      }}
                    >
                      {t.reference}
                    </td>
                    <td style={{ padding: T.inset.tight }}>
                      {getStoreName(t.from_tenant_id)}
                    </td>
                    <td style={{ padding: T.inset.tight }}>
                      {getStoreName(t.to_tenant_id)}
                    </td>
                    <td style={{ padding: T.inset.tight }}>
                      {t.stock_transfer_items?.length || 0}
                    </td>
                    <td style={{ padding: T.inset.tight }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ padding: T.inset.tight, color: T.ink600 }}>
                      {formatDate(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NEW TRANSFER PANE ───────────────────────────────────────────────────────

function NewTransferPane({
  members,
  form,
  setForm,
  fromInventory,
  toInventory,
  onAddLine,
  onRemoveLine,
  onCreate,
  actionLoading,
}) {
  const totalCost = form.lines.reduce(
    (s, l) => s + l.qty * (l.unit_cost_zar || 0),
    0,
  );

  const sectionLabelStyle = {
    fontSize: T.text.xs,
    fontWeight: T.weight.semibold,
    color: T.ink600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: T.gap.sm,
  };

  const inputStyle = {
    padding: `${T.pad.md}px`,
    borderRadius: T.radius.md,
    border: `1px solid ${T.border}`,
    fontSize: T.text.base,
    fontFamily: T.font,
    background: T.surface,
    color: T.ink900,
    width: "100%",
  };

  const cardStyle = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.lg,
    padding: T.inset.card,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.page.sectionGap }}>
      {/* Section 1 — Route */}
      <div style={cardStyle}>
        <div style={sectionLabelStyle}>Transfer route</div>
        <div
          style={{
            display: "flex",
            gap: T.gap.xl,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: T.text.sm,
                color: T.ink700,
                marginBottom: T.gap.xs,
              }}
            >
              From store
            </div>
            <select
              value={form.from_tenant_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  from_tenant_id: e.target.value,
                  lines: [],
                  lineItem: "",
                  lineQty: "",
                })
              }
              style={inputStyle}
            >
              <option value="">— Select source store —</option>
              {members.map((m) => (
                <option key={m.tenant_id} value={m.tenant_id}>
                  {m.tenants?.name || "Unnamed store"}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              fontSize: T.text["2xl"],
              color: T.ink400,
              paddingBottom: T.pad.md,
            }}
          >
            →
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: T.text.sm,
                color: T.ink700,
                marginBottom: T.gap.xs,
              }}
            >
              To store
            </div>
            <select
              value={form.to_tenant_id}
              onChange={(e) => setForm({ ...form, to_tenant_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">— Select destination store —</option>
              {members
                .filter((m) => m.tenant_id !== form.from_tenant_id)
                .map((m) => (
                  <option key={m.tenant_id} value={m.tenant_id}>
                    {m.tenants?.name || "Unnamed store"}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2 — Notes */}
      <div style={cardStyle}>
        <div style={sectionLabelStyle}>Notes (optional)</div>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Transfer notes (optional)"
          rows={2}
          style={{ ...inputStyle, resize: "vertical", fontFamily: T.font }}
        />
      </div>

      {/* Section 3 — Line items */}
      <div style={cardStyle}>
        <div style={sectionLabelStyle}>Products to transfer</div>

        {/* Add line row */}
        <div
          style={{
            display: "flex",
            gap: T.gap.md,
            alignItems: "flex-end",
            marginBottom: T.gap.lg,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 2, minWidth: 240 }}>
            <div
              style={{
                fontSize: T.text.sm,
                color: T.ink700,
                marginBottom: T.gap.xs,
              }}
            >
              Product
            </div>
            <select
              value={form.lineItem}
              onChange={(e) => setForm({ ...form, lineItem: e.target.value })}
              disabled={!form.from_tenant_id}
              style={{
                ...inputStyle,
                opacity: form.from_tenant_id ? 1 : 0.5,
                cursor: form.from_tenant_id ? "pointer" : "not-allowed",
              }}
            >
              <option value="">
                {form.from_tenant_id
                  ? "— Select a product —"
                  : "— Select source store first —"}
              </option>
              {fromInventory
                .filter((i) => !form.lines.some((l) => l.item_id === i.id))
                .map((i) => {
                  const avail = Math.max(
                    0,
                    (i.quantity_on_hand || 0) - (i.reserved_qty || 0),
                  );
                  return (
                    <option key={i.id} value={i.id}>
                      {i.name} — {avail} {i.unit || "units"} available
                    </option>
                  );
                })}
            </select>
          </div>
          <div style={{ width: 100 }}>
            <div
              style={{
                fontSize: T.text.sm,
                color: T.ink700,
                marginBottom: T.gap.xs,
              }}
            >
              Qty
            </div>
            <input
              type="number"
              min="1"
              value={form.lineQty}
              onChange={(e) => setForm({ ...form, lineQty: e.target.value })}
              disabled={!form.lineItem}
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            onClick={onAddLine}
            disabled={!form.lineItem || !form.lineQty}
            style={{
              background: T.accentLight,
              color: T.accentText,
              border: `1px solid ${T.accent}`,
              borderRadius: T.radius.md,
              padding: `${T.pad.md}px ${T.pad.lg}px`,
              fontFamily: T.font,
              fontSize: T.text.base,
              fontWeight: T.weight.semibold,
              cursor:
                form.lineItem && form.lineQty ? "pointer" : "not-allowed",
              opacity: form.lineItem && form.lineQty ? 1 : 0.5,
            }}
          >
            + Add
          </button>
        </div>

        {/* Lines table */}
        {form.lines.length === 0 ? (
          <div
            style={{
              fontSize: T.text.base,
              color: T.ink600,
              padding: T.pad.lg,
              textAlign: "center",
              background: T.surfaceAlt,
              borderRadius: T.radius.md,
            }}
          >
            No items added yet. Select a product above.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: T.text.sm,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: T.ink600 }}>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    Product
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    SKU
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    At FROM
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    At TO
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    Transfer Qty
                  </th>
                  <th style={{ padding: T.inset.tight, fontWeight: T.weight.semibold }}>
                    Line Cost
                  </th>
                  <th style={{ padding: T.inset.tight }} />
                </tr>
              </thead>
              <tbody>
                {form.lines.map((l) => {
                  const toQty = l.sku ? toInventory[l.sku] : undefined;
                  const hasAtTo = toQty !== undefined && toQty > 0;
                  const lowAtFrom =
                    l.reorder_level > 0 &&
                    l.available_from <= l.reorder_level;

                  return (
                    <tr
                      key={l.item_id}
                      style={{
                        borderTop: `1px solid ${T.border}`,
                        color: T.ink900,
                      }}
                    >
                      <td
                        style={{
                          padding: T.inset.tight,
                          fontWeight: T.weight.medium,
                        }}
                      >
                        {l.item_name}
                      </td>
                      <td
                        style={{
                          padding: T.inset.tight,
                          fontFamily: T.fontMono,
                          fontSize: T.text.xs,
                          color: T.ink600,
                        }}
                      >
                        {l.sku || "—"}
                      </td>
                      <td
                        style={{
                          padding: T.inset.tight,
                          color: lowAtFrom ? T.warningText : T.ink900,
                          fontWeight: lowAtFrom
                            ? T.weight.semibold
                            : T.weight.normal,
                        }}
                      >
                        {l.available_from}
                      </td>
                      <td style={{ padding: T.inset.tight }}>
                        {hasAtTo ? (
                          <span style={{ color: T.successText }}>{toQty}</span>
                        ) : form.to_tenant_id ? (
                          <span
                            style={{
                              display: "inline-block",
                              background: T.infoLight,
                              color: T.infoText,
                              padding: `2px ${T.pad.sm}px`,
                              borderRadius: T.radius.full,
                              fontSize: T.text.xs,
                              fontWeight: T.weight.medium,
                            }}
                          >
                            New to store
                          </span>
                        ) : (
                          <span style={{ color: T.ink400 }}>—</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: T.inset.tight,
                          fontWeight: T.weight.semibold,
                        }}
                      >
                        {l.qty} {l.unit || ""}
                      </td>
                      <td style={{ padding: T.inset.tight }}>
                        {formatR(l.qty * (l.unit_cost_zar || 0))}
                      </td>
                      <td
                        style={{ padding: T.inset.tight, textAlign: "right" }}
                      >
                        <button
                          type="button"
                          onClick={() => onRemoveLine(l.item_id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: T.dangerText,
                            fontSize: T.text.sm,
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 4 — Submit */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: T.gap.lg,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: T.text.base, color: T.ink700 }}>
            <strong style={{ color: T.ink900 }}>{form.lines.length}</strong>{" "}
            product{form.lines.length !== 1 ? "s" : ""} ·{" "}
            <strong style={{ color: T.ink900 }}>{formatR(totalCost)}</strong>{" "}
            total cost
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={
              actionLoading ||
              !form.from_tenant_id ||
              !form.to_tenant_id ||
              form.lines.length === 0
            }
            style={{
              background: T.accent,
              color: "#ffffff",
              border: "none",
              borderRadius: T.radius.md,
              padding: `${T.pad.md}px ${T.pad.xl}px`,
              fontFamily: T.font,
              fontSize: T.text.base,
              fontWeight: T.weight.semibold,
              cursor:
                actionLoading ||
                !form.from_tenant_id ||
                !form.to_tenant_id ||
                form.lines.length === 0
                  ? "not-allowed"
                  : "pointer",
              opacity:
                actionLoading ||
                !form.from_tenant_id ||
                !form.to_tenant_id ||
                form.lines.length === 0
                  ? 0.5
                  : 1,
            }}
          >
            {actionLoading ? "Creating…" : "Create Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TRANSFER LIST (Active + History) ────────────────────────────────────────

function TransferList({
  transfers,
  emptyText,
  getStoreName,
  expandedId,
  setExpandedId,
  cancellingId,
  setCancellingId,
  cancelReason,
  setCancelReason,
  onShip,
  onReceive,
  onCancel,
  actionLoading,
  showActions,
}) {
  if (transfers.length === 0) {
    return (
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.lg,
          padding: T.pad.xl,
          textAlign: "center",
          color: T.ink600,
          fontSize: T.text.base,
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.gap.lg }}>
      {transfers.map((t) => {
        const isExpanded = expandedId === t.id;
        const isCancelling = cancellingId === t.id;
        const lines = t.stock_transfer_items || [];
        const lineCount = lines.length;
        const totalQty = lines.reduce(
          (s, l) => s + (l.qty_confirmed ?? l.qty_requested),
          0,
        );
        const totalCost = lines.reduce(
          (s, l) =>
            s +
            (l.qty_confirmed ?? l.qty_requested) * (l.unit_cost_zar || 0),
          0,
        );

        return (
          <div
            key={t.id}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.lg,
              padding: T.inset.card,
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: T.gap.lg,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: T.gap.lg, flexWrap: "wrap" }}>
                <div
                  style={{
                    fontFamily: T.fontMono,
                    fontSize: T.text.sm,
                    fontWeight: T.weight.semibold,
                    color: T.ink900,
                  }}
                >
                  {t.reference}
                </div>
                <StatusBadge status={t.status} />
                <div style={{ fontSize: T.text.sm, color: T.ink700 }}>
                  {getStoreName(t.from_tenant_id)}{" "}
                  <span style={{ color: T.ink400 }}>→</span>{" "}
                  {getStoreName(t.to_tenant_id)}
                </div>
                <div style={{ fontSize: T.text.xs, color: T.ink600 }}>
                  {lineCount} line{lineCount !== 1 ? "s" : ""} · {totalQty} units ·{" "}
                  {formatR(totalCost)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
                style={{
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.md,
                  padding: `${T.pad.xs}px ${T.pad.md}px`,
                  fontFamily: T.font,
                  fontSize: T.text.sm,
                  color: T.ink700,
                  cursor: "pointer",
                }}
              >
                {isExpanded ? "Collapse ▴" : "Expand ▾"}
              </button>
            </div>

            {/* Date strip */}
            <div
              style={{
                fontSize: T.text.xs,
                color: T.ink600,
                marginTop: T.gap.sm,
              }}
            >
              Created {formatDate(t.created_at)}
              {t.shipped_at && " · Shipped " + formatDate(t.shipped_at)}
              {t.received_at && " · Received " + formatDate(t.received_at)}
              {t.cancelled_at && " · Cancelled " + formatDate(t.cancelled_at)}
              {t.cancelled_reason && (
                <span style={{ color: T.dangerText }}>
                  {" "}
                  ({t.cancelled_reason})
                </span>
              )}
            </div>

            {/* Expanded body */}
            {isExpanded && (
              <div style={{ marginTop: T.gap.lg }}>
                {t.notes && (
                  <div
                    style={{
                      fontSize: T.text.sm,
                      color: T.ink700,
                      marginBottom: T.gap.md,
                      padding: T.pad.md,
                      background: T.surfaceAlt,
                      borderRadius: T.radius.md,
                    }}
                  >
                    <strong>Notes:</strong> {t.notes}
                  </div>
                )}
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: T.text.sm,
                    }}
                  >
                    <thead>
                      <tr style={{ textAlign: "left", color: T.ink600 }}>
                        <th
                          style={{
                            padding: T.inset.tight,
                            fontWeight: T.weight.semibold,
                          }}
                        >
                          Product
                        </th>
                        <th
                          style={{
                            padding: T.inset.tight,
                            fontWeight: T.weight.semibold,
                          }}
                        >
                          SKU
                        </th>
                        <th
                          style={{
                            padding: T.inset.tight,
                            fontWeight: T.weight.semibold,
                          }}
                        >
                          Qty Requested
                        </th>
                        <th
                          style={{
                            padding: T.inset.tight,
                            fontWeight: T.weight.semibold,
                          }}
                        >
                          Qty Confirmed
                        </th>
                        <th
                          style={{
                            padding: T.inset.tight,
                            fontWeight: T.weight.semibold,
                          }}
                        >
                          Unit Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr
                          key={l.id}
                          style={{
                            borderTop: `1px solid ${T.border}`,
                            color: T.ink900,
                          }}
                        >
                          <td style={{ padding: T.inset.tight }}>
                            {l.item_name}
                          </td>
                          <td
                            style={{
                              padding: T.inset.tight,
                              fontFamily: T.fontMono,
                              fontSize: T.text.xs,
                              color: T.ink600,
                            }}
                          >
                            {l.sku || "—"}
                          </td>
                          <td style={{ padding: T.inset.tight }}>
                            {l.qty_requested} {l.unit || ""}
                          </td>
                          <td style={{ padding: T.inset.tight, color: T.ink600 }}>
                            {l.qty_confirmed ?? "—"}
                          </td>
                          <td style={{ padding: T.inset.tight }}>
                            {formatR(l.unit_cost_zar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                {showActions && (
                  <div
                    style={{
                      marginTop: T.gap.lg,
                      display: "flex",
                      gap: T.gap.md,
                      flexWrap: "wrap",
                    }}
                  >
                    {t.status === "draft" && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => onShip(t)}
                        style={{
                          background: T.accent,
                          color: "#ffffff",
                          border: "none",
                          borderRadius: T.radius.md,
                          padding: `${T.pad.md}px ${T.pad.lg}px`,
                          fontFamily: T.font,
                          fontSize: T.text.base,
                          fontWeight: T.weight.semibold,
                          cursor: actionLoading ? "not-allowed" : "pointer",
                          opacity: actionLoading ? 0.5 : 1,
                        }}
                      >
                        Ship →
                      </button>
                    )}
                    {t.status === "in_transit" && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => onReceive(t)}
                        style={{
                          background: T.successLight,
                          color: T.successText,
                          border: `1px solid ${T.success}`,
                          borderRadius: T.radius.md,
                          padding: `${T.pad.md}px ${T.pad.lg}px`,
                          fontFamily: T.font,
                          fontSize: T.text.base,
                          fontWeight: T.weight.semibold,
                          cursor: actionLoading ? "not-allowed" : "pointer",
                          opacity: actionLoading ? 0.5 : 1,
                        }}
                      >
                        Mark Received ✓
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setCancellingId(isCancelling ? null : t.id);
                        setCancelReason("");
                      }}
                      style={{
                        background: T.dangerLight,
                        color: T.dangerText,
                        border: `1px solid ${T.dangerBorder}`,
                        borderRadius: T.radius.md,
                        padding: `${T.pad.md}px ${T.pad.lg}px`,
                        fontFamily: T.font,
                        fontSize: T.text.base,
                        fontWeight: T.weight.medium,
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        opacity: actionLoading ? 0.5 : 1,
                      }}
                    >
                      {isCancelling ? "Close" : "Cancel Transfer"}
                    </button>
                  </div>
                )}

                {/* Cancel reason input */}
                {showActions && isCancelling && (
                  <div
                    style={{
                      marginTop: T.gap.md,
                      display: "flex",
                      gap: T.gap.md,
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Reason for cancellation"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: 240,
                        padding: T.pad.md,
                        borderRadius: T.radius.md,
                        border: `1px solid ${T.border}`,
                        fontSize: T.text.base,
                        fontFamily: T.font,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => onCancel(t)}
                      disabled={actionLoading || !cancelReason.trim()}
                      style={{
                        background: T.danger,
                        color: "#ffffff",
                        border: "none",
                        borderRadius: T.radius.md,
                        padding: `${T.pad.md}px ${T.pad.lg}px`,
                        fontFamily: T.font,
                        fontSize: T.text.base,
                        fontWeight: T.weight.semibold,
                        cursor:
                          actionLoading || !cancelReason.trim()
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          actionLoading || !cancelReason.trim() ? 0.5 : 1,
                      }}
                    >
                      Confirm Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
