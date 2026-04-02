// src/components/hq/ReorderPanel.js — v1.0
// WP-REORDER Phase 1 — Smart reorder queue + PO creation
// Triggered from SmartInventory toolbar or SC-01 panels
// Flow: select items → group by supplier → preview → create POs
// Phase 1 scope: ZAR only, no FX, no lead time logic (Phase 2)
// Rule 0F: tenant_id on every INSERT
// LL-131: tenantId as prop only

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import toast from "../../services/toast";
import { PRODUCT_WORLDS, itemMatchesWorld } from "./ProductWorlds";

const T = {
  bg: "#FAFAF9",
  white: "#ffffff",
  border: "#ECEAE6",
  borderDark: "#D4D0CB",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentXlit: "#F0FAF4",
  danger: "#DC2626",
  dangerLit: "#FEF2F2",
  amber: "#D97706",
  amberLit: "#FFFBEB",
  blue: "#2563EB",
  blueLit: "#EFF6FF",
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#474747",
  ink400: "#6B6B6B",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink50: "#F7F7F7",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
};

const zar = (n) =>
  n == null
    ? "—"
    : "R" + Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function genPONumber() {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PO-${d}-${r}`;
}

function defaultOrderQty(item) {
  if ((item.reorder_level || 0) > 0) return Math.max(item.reorder_level * 2, 5);
  return 10;
}

export default function ReorderPanel({ tenantId, onClose, onComplete }) {
  const [step, setStep] = useState(1); // 1 = select, 2 = preview
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Step 2: editable quantities per item, notes per supplier
  const [quantities, setQuantities] = useState({});
  const [supplierNotes, setSupplierNotes] = useState({});

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const [{ data: itemData }, { data: supplierData }] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("*, suppliers(id, name, email, avg_lead_time_days, currency)")
        .eq("tenant_id", tenantId)
        .or("quantity_on_hand.eq.0,needs_reorder.eq.true")
        .order("quantity_on_hand", { ascending: true })
        .order("name"),
      supabase
        .from("suppliers")
        .select("id, name, email, avg_lead_time_days, currency")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name"),
    ]);
    setItems(itemData || []);
    setSuppliers(supplierData || []);
    // Initialise default quantities
    const qtys = {};
    (itemData || []).forEach((i) => {
      qtys[i.id] = defaultOrderQty(i);
    });
    setQuantities(qtys);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const soldOutItems = useMemo(
    () => items.filter((i) => (i.quantity_on_hand || 0) === 0),
    [items],
  );
  const lowStockItems = useMemo(
    () => items.filter((i) => (i.quantity_on_hand || 0) > 0 && i.needs_reorder),
    [items],
  );
  const noSupplierItems = useMemo(
    () => items.filter((i) => !i.supplier_id),
    [items],
  );
  const selectableItems = useMemo(
    () => items.filter((i) => i.supplier_id),
    [items],
  );

  const toggleItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedIds(new Set(selectableItems.map((i) => i.id)));
  const clearAll = () => setSelectedIds(new Set());

  // Group selected items by supplier for Step 2
  const supplierGroups = useMemo(() => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    const groups = {};
    selected.forEach((item) => {
      const sid = item.supplier_id;
      if (!groups[sid]) {
        groups[sid] = {
          supplier: suppliers.find((s) => s.id === sid) || item.suppliers,
          items: [],
        };
      }
      groups[sid].items.push(item);
    });
    return Object.values(groups);
  }, [items, selectedIds, suppliers]);

  const totalSelected = selectedIds.size;
  const totalSuppliers = supplierGroups.length;

  // Step 2 → Confirm: create POs
  const handleConfirm = async () => {
    if (supplierGroups.length === 0) return;
    setCreating(true);

    try {
      let posCreated = 0;
      let itemsOrdered = 0;
      const orderedItemIds = [];

      for (const group of supplierGroups) {
        const poNumber = genPONumber();
        const groupItems = group.items;
        const subtotal = groupItems.reduce((sum, item) => {
          const qty = parseFloat(quantities[item.id]) || 1;
          const cost = item.weighted_avg_cost || 0;
          return sum + qty * cost;
        }, 0);

        // Create the PO
        const { data: poData, error: poErr } = await supabase
          .from("purchase_orders")
          .insert({
            tenant_id: tenantId,
            supplier_id: group.supplier?.id,
            po_number: poNumber,
            status: "draft",
            order_date: new Date().toISOString().slice(0, 10),
            currency: group.supplier?.currency || "ZAR",
            subtotal: subtotal,
            notes: supplierNotes[group.supplier?.id] || null,
          })
          .select("id")
          .single();

        if (poErr) throw poErr;

        // Create PO line items
        const lineItems = groupItems.map((item) => {
          const qty = parseFloat(quantities[item.id]) || 1;
          const cost = item.weighted_avg_cost || 0;
          return {
            po_id: poData.id,
            item_id: item.id,
            quantity_ordered: qty,
            quantity_received: 0,
            unit_cost: cost,
            line_total: qty * cost,
          };
        });

        const { error: lineErr } = await supabase
          .from("purchase_order_items")
          .insert(lineItems);

        if (lineErr) throw lineErr;

        posCreated++;
        itemsOrdered += groupItems.length;
        orderedItemIds.push(...groupItems.map((i) => i.id));
      }

      // Mark all ordered items as on_order = true
      if (orderedItemIds.length > 0) {
        await supabase
          .from("inventory_items")
          .update({ on_order: true, updated_at: new Date().toISOString() })
          .in("id", orderedItemIds);
      }

      toast.success(
        `${posCreated} PO${posCreated > 1 ? "s" : ""} created · ${itemsOrdered} item${itemsOrdered > 1 ? "s" : ""} on order`,
      );
      onComplete?.();
      onClose();
    } catch (err) {
      console.error("Reorder error:", err);
      toast.error("Failed to create purchase orders — check your connection");
    } finally {
      setCreating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 800,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 820,
          maxWidth: "96vw",
          background: T.white,
          zIndex: 801,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.16)",
          fontFamily: T.font,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px 14px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
            background: T.bg,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{ fontSize: 17, fontWeight: 800, color: T.ink900 }}
              >
                ⚑ Reorder Queue
              </div>
              <div style={{ fontSize: 12, color: T.ink400, marginTop: 3 }}>
                {step === 1
                  ? `${soldOutItems.length} sold out · ${lowStockItems.length} low stock`
                  : `${totalSelected} items · ${totalSuppliers} supplier${totalSuppliers !== 1 ? "s" : ""}`}
              </div>
            </div>

            {/* Step indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginRight: 40,
              }}
            >
              {[
                { n: 1, label: "Select" },
                { n: 2, label: "Review" },
              ].map((s, i) => (
                <div
                  key={s.n}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background:
                        step === s.n
                          ? T.accent
                          : step > s.n
                            ? T.accentMid
                            : T.ink150,
                      color:
                        step >= s.n ? "#fff" : T.ink400,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {s.n}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: step === s.n ? 700 : 400,
                      color: step === s.n ? T.ink700 : T.ink400,
                    }}
                  >
                    {s.label}
                  </span>
                  {i < 1 && (
                    <div
                      style={{
                        width: 20,
                        height: 1,
                        background: T.borderDark,
                        marginLeft: 2,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: T.ink400,
                lineHeight: 1,
                padding: "2px 4px",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: T.ink400,
                fontSize: 13,
              }}
            >
              Loading items…
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                padding: 60,
                textAlign: "center",
                color: T.ink400,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.ink700,
                  marginBottom: 6,
                }}
              >
                Nothing to reorder
              </div>
              <div style={{ fontSize: 13 }}>
                All items are in stock and no items are flagged for reorder.
              </div>
            </div>
          ) : step === 1 ? (
            <Step1
              soldOutItems={soldOutItems}
              lowStockItems={lowStockItems}
              noSupplierItems={noSupplierItems}
              selectedIds={selectedIds}
              onToggle={toggleItem}
              onSelectAll={selectAll}
              onClearAll={clearAll}
              T={T}
            />
          ) : (
            <Step2
              supplierGroups={supplierGroups}
              quantities={quantities}
              onQtyChange={(itemId, val) =>
                setQuantities((prev) => ({ ...prev, [itemId]: val }))
              }
              supplierNotes={supplierNotes}
              onNoteChange={(supplierId, val) =>
                setSupplierNotes((prev) => ({ ...prev, [supplierId]: val }))
              }
              T={T}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
            background: T.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {step === 1 ? (
            <>
              <div style={{ fontSize: 12, color: T.ink400 }}>
                {totalSelected > 0 ? (
                  <span>
                    <strong style={{ color: T.ink700 }}>{totalSelected}</strong>{" "}
                    item{totalSelected !== 1 ? "s" : ""} selected across{" "}
                    <strong style={{ color: T.ink700 }}>{totalSuppliers}</strong>{" "}
                    supplier{totalSuppliers !== 1 ? "s" : ""}
                  </span>
                ) : (
                  "Select items to order"
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={onClose}
                  style={footerBtn(T.white, T.ink500, T.border, T)}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={totalSelected === 0}
                  style={{
                    ...footerBtn(T.accent, "#fff", T.accent, T),
                    opacity: totalSelected === 0 ? 0.4 : 1,
                    cursor: totalSelected === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Review {totalSelected > 0 ? `${totalSelected} items` : ""} →
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                style={footerBtn(T.white, T.ink500, T.border, T)}
              >
                ← Back
              </button>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.ink400 }}>
                  {totalSuppliers} PO{totalSuppliers !== 1 ? "s" : ""} will be
                  created as <strong>Draft</strong>
                </span>
                <button
                  onClick={handleConfirm}
                  disabled={creating}
                  style={{
                    ...footerBtn(T.accent, "#fff", T.accent, T),
                    fontWeight: 700,
                    opacity: creating ? 0.6 : 1,
                    cursor: creating ? "not-allowed" : "pointer",
                  }}
                >
                  {creating
                    ? "Creating…"
                    : `Confirm & Create ${totalSuppliers} PO${totalSuppliers !== 1 ? "s" : ""}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Step 1: Item selection ───────────────────────────────────────────────────

function Step1({
  soldOutItems,
  lowStockItems,
  noSupplierItems,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  T,
}) {
  const allSelectable = [...soldOutItems, ...lowStockItems].filter(
    (i) => i.supplier_id,
  );
  const allSelected =
    allSelectable.length > 0 &&
    allSelectable.every((i) => selectedIds.has(i.id));

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          padding: "10px 24px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: T.ink50,
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <button
          onClick={allSelected ? onClearAll : onSelectAll}
          style={smallBtn(T.white, T.ink500, T.border, T)}
        >
          {allSelected ? "☐ Deselect All" : "☑ Select All"}
        </button>
        <button
          onClick={() =>
            soldOutItems
              .filter((i) => i.supplier_id)
              .forEach((i) => {
                if (!selectedIds.has(i.id)) onToggle(i.id);
              })
          }
          style={smallBtn(T.dangerLit, T.danger, T.danger + "40", T)}
        >
          Select Sold Out ({soldOutItems.filter((i) => i.supplier_id).length})
        </button>
        <button
          onClick={() =>
            lowStockItems
              .filter((i) => i.supplier_id)
              .forEach((i) => {
                if (!selectedIds.has(i.id)) onToggle(i.id);
              })
          }
          style={smallBtn(T.amberLit, T.amber, T.amber + "40", T)}
        >
          Select Low Stock ({lowStockItems.filter((i) => i.supplier_id).length})
        </button>
        {selectedIds.size > 0 && (
          <button onClick={onClearAll} style={smallBtn(T.white, T.ink400, T.border, T)}>
            Clear
          </button>
        )}
      </div>

      {/* Sold Out section */}
      {soldOutItems.length > 0 && (
        <Section
          title="OUT OF STOCK"
          count={soldOutItems.length}
          color={T.danger}
          bg={T.dangerLit}
          items={soldOutItems}
          selectedIds={selectedIds}
          onToggle={onToggle}
          T={T}
        />
      )}

      {/* Low Stock section */}
      {lowStockItems.length > 0 && (
        <Section
          title="LOW STOCK — FLAGGED FOR REORDER"
          count={lowStockItems.length}
          color={T.amber}
          bg={T.amberLit}
          items={lowStockItems}
          selectedIds={selectedIds}
          onToggle={onToggle}
          T={T}
        />
      )}

      {/* No supplier warning */}
      {noSupplierItems.length > 0 && (
        <div
          style={{
            margin: "0 24px 20px",
            padding: "12px 16px",
            background: T.amberLit,
            border: `1px solid ${T.amber}40`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: T.amber,
              marginBottom: 4,
            }}
          >
            ⚠ {noSupplierItems.length} item
            {noSupplierItems.length !== 1 ? "s have" : " has"} no supplier
            assigned
          </div>
          <div style={{ fontSize: 11, color: T.amber }}>
            {noSupplierItems.map((i) => i.name).join(", ")} — assign a supplier
            in the Smart Catalog to include{" "}
            {noSupplierItems.length !== 1 ? "them" : "it"}.
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, color, bg, items, selectedIds, onToggle, T }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          padding: "10px 24px 8px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 10,
            background: bg,
            color,
            padding: "1px 7px",
            borderRadius: 99,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      </div>
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          selected={selectedIds.has(item.id)}
          onToggle={onToggle}
          T={T}
        />
      ))}
    </div>
  );
}

function ItemRow({ item, selected, onToggle, T }) {
  const hasSupplier = !!item.supplier_id;
  const world = PRODUCT_WORLDS.find(
    (w) => w.id !== "all" && itemMatchesWorld(item, w),
  );
  const isOut = (item.quantity_on_hand || 0) === 0;

  return (
    <div
      onClick={() => hasSupplier && onToggle(item.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 24px",
        borderBottom: `1px solid ${T.border}`,
        background: selected ? T.accentXlit : T.white,
        cursor: hasSupplier ? "pointer" : "default",
        opacity: hasSupplier ? 1 : 0.45,
        transition: "background 0.1s",
        borderLeft: selected ? `3px solid ${T.accentMid}` : "3px solid transparent",
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={!hasSupplier}
        onChange={() => hasSupplier && onToggle(item.id)}
        style={{
          width: 15,
          height: 15,
          accentColor: T.accent,
          cursor: hasSupplier ? "pointer" : "not-allowed",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      />

      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {world?.icon || "📦"}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: T.ink900,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.ink400,
            marginTop: 2,
            display: "flex",
            gap: 8,
          }}
        >
          {item.brand && <span>{item.brand}</span>}
          {item.variant_value && <span>{item.variant_value}</span>}
          {!isOut && (
            <span style={{ color: T.amber }}>
              {item.quantity_on_hand} in stock
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {item.sell_price > 0 && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.accentMid,
            }}
          >
            {zar(item.sell_price)}
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            color: hasSupplier ? T.ink400 : T.amber,
            marginTop: 2,
          }}
        >
          {hasSupplier ? item.suppliers?.name || "Supplier" : "⚠ No supplier"}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: PO Preview ───────────────────────────────────────────────────────

function Step2({
  supplierGroups,
  quantities,
  onQtyChange,
  supplierNotes,
  onNoteChange,
  T,
}) {
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 12, color: T.ink400 }}>
        Review quantities before creating purchase orders. All POs are created
        as <strong>Draft</strong> — you can edit them in Purchase Orders before
        submitting to suppliers.
      </div>

      {supplierGroups.map((group) => {
        const supplierId = group.supplier?.id;
        const groupTotal = group.items.reduce((sum, item) => {
          const qty = parseFloat(quantities[item.id]) || 0;
          const cost = item.weighted_avg_cost || 0;
          return sum + qty * cost;
        }, 0);

        return (
          <div
            key={supplierId}
            style={{
              border: `1.5px solid ${T.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* Supplier header */}
            <div
              style={{
                padding: "12px 16px",
                background: T.accentLit,
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: T.accent,
                  }}
                >
                  📦 {group.supplier?.name || "Unknown Supplier"}
                </div>
                <div style={{ fontSize: 11, color: T.accentMid, marginTop: 2 }}>
                  {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                  {group.supplier?.email && ` · ${group.supplier.email}`}
                  {group.supplier?.avg_lead_time_days &&
                    ` · ~${group.supplier.avg_lead_time_days} day lead time`}
                </div>
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: T.accent,
                  fontFamily: T.mono,
                }}
              >
                {zar(groupTotal)}
              </div>
            </div>

            {/* Line items */}
            <div>
              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 100px 100px",
                  padding: "6px 16px",
                  background: T.ink50,
                  borderBottom: `1px solid ${T.border}`,
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.ink400,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>Item</span>
                <span style={{ textAlign: "right" }}>Unit Cost</span>
                <span style={{ textAlign: "center" }}>Qty to Order</span>
                <span style={{ textAlign: "right" }}>Line Total</span>
              </div>

              {group.items.map((item) => {
                const qty = parseFloat(quantities[item.id]) || 0;
                const cost = item.weighted_avg_cost || 0;
                const lineTotal = qty * cost;
                const world = PRODUCT_WORLDS.find(
                  (w) => w.id !== "all" && itemMatchesWorld(item, w),
                );
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 100px 100px",
                      padding: "10px 16px",
                      borderBottom: `1px solid ${T.border}`,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: T.ink900,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 14 }}>
                          {world?.icon || "📦"}
                        </span>
                        {item.name}
                      </div>
                      {item.variant_value && (
                        <div style={{ fontSize: 10, color: T.ink400, marginTop: 2, paddingLeft: 20 }}>
                          {item.variant_value}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        color: T.ink500,
                        fontFamily: T.mono,
                      }}
                    >
                      {cost > 0 ? zar(cost) : "—"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={quantities[item.id] ?? ""}
                        onChange={(e) => onQtyChange(item.id, e.target.value)}
                        style={{
                          width: 72,
                          padding: "5px 8px",
                          border: `1.5px solid ${T.border}`,
                          borderRadius: 6,
                          fontSize: 13,
                          fontFamily: T.mono,
                          fontWeight: 700,
                          textAlign: "center",
                          outline: "none",
                          color: T.ink900,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        fontWeight: 700,
                        color: lineTotal > 0 ? T.accentMid : T.ink300,
                        fontFamily: T.mono,
                      }}
                    >
                      {lineTotal > 0 ? zar(lineTotal) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes field */}
            <div
              style={{
                padding: "10px 16px",
                background: T.bg,
              }}
            >
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.ink400,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Notes for supplier (optional)
              </label>
              <input
                type="text"
                value={supplierNotes[supplierId] || ""}
                onChange={(e) => onNoteChange(supplierId, e.target.value)}
                placeholder="e.g. Urgent — please deliver by Friday"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: T.font,
                  outline: "none",
                  color: T.ink900,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function footerBtn(bg, color, border, T) {
  return {
    padding: "9px 20px",
    borderRadius: 7,
    border: `1.5px solid ${border}`,
    background: bg,
    color,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    whiteSpace: "nowrap",
  };
}

function smallBtn(bg, color, border, T) {
  return {
    padding: "5px 12px",
    borderRadius: 6,
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    whiteSpace: "nowrap",
  };
}
