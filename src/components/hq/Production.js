// src/components/hq/Production.js — Protea Botanicals v1.2
// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION TAB — Phase 2C
//
// Purpose: Assembly batch tracking — the PRODUCE step of the supply chain:
//   Procure → Receive → ★ PRODUCE ★ → Distribute → Customer Scans
//
// Features:
//   - View all production batches (filterable by status)
//   - Create new batch (strain, cart size, target quantity)
//   - Add inputs from inventory (distillate, terpene, hardware)
//   - Auto-calculate bill of materials from cart size × quantity
//   - Status progression: planned → in_progress → completed → cancelled
//   - Record actual fill quantity when completing
//   - Cost tracking per batch (from input costs)
//   - ★ v1.1: Auto-deduct raw materials from inventory on batch completion
//     (Task A-1 — Automation WP). Creates stock_movements records and sets
//     production_inputs.deducted_from_stock = true for idempotency.
//   - ★ v1.2: Auto-create finished goods in inventory on batch completion
//     (Task A-2 — Automation WP). Finds or creates an inventory_item with
//     category "finished_product", increments quantity_on_hand by actual_quantity,
//     and creates a stock_movements record (type: "production_in").
//
// Tables used:
//   - production_batches (CRUD)
//   - production_inputs (CRUD, linked to batches)
//   - inventory_items (read + update/insert for auto-deduction & finished goods)
//   - stock_movements (insert for audit trail)
//
// Design: Cream aesthetic (Section 7 of handover).
// RLS: Uses is_hq_user() — HQ can do everything.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  bg: "#faf9f6",
  warmBg: "#f4f0e8",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#888888",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
  blue: "#2c4a6e",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ── Shared styles ─────────────────────────────────────────────────────────
const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accentGreen,
  marginBottom: "4px",
  fontFamily: F.body,
};
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const sBtn = (variant = "primary") => ({
  padding: "8px 16px",
  background: variant === "primary" ? C.primaryDark : "transparent",
  color: variant === "primary" ? C.white : C.primaryMid,
  border: variant === "primary" ? "none" : `1px solid ${C.primaryMid}`,
  borderRadius: "2px",
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: F.body,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontSize: "13px",
  fontFamily: F.body,
  background: C.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  planned: { label: "Planned", color: C.blue, bg: "rgba(44,74,110,0.1)" },
  in_progress: {
    label: "In Progress",
    color: C.gold,
    bg: "rgba(181,147,90,0.1)",
  },
  completed: {
    label: "Completed",
    color: C.accentGreen,
    bg: "rgba(82,183,136,0.1)",
  },
  cancelled: { label: "Cancelled", color: C.red, bg: "rgba(192,57,43,0.1)" },
};

// ── HQ tenant ID ──────────────────────────────────────────────────────────
const HQ_TENANT_ID = "43b34c33-6864-4f02-98dd-df1d340475c3";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Production() {
  const [batches, setBatches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState(null);

  // ── Fetch batches + inventory items ────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [batchRes, itemsRes] = await Promise.all([
        supabase
          .from("production_batches")
          .select("*, production_inputs(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("inventory_items")
          .select("id, name, sku, category, unit, quantity_on_hand, cost_price")
          .eq("is_active", true)
          .order("name"),
      ]);
      if (batchRes.error) throw batchRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setBatches(batchRes.data || []);
      setInventoryItems(itemsRes.data || []);
    } catch (err) {
      console.error("[Production] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filter batches by status ───────────────────────────────────────
  const filteredBatches =
    statusFilter === "all"
      ? batches
      : batches.filter((b) => b.status === statusFilter);

  // ── Summary stats ──────────────────────────────────────────────────
  const planned = batches.filter((b) => b.status === "planned").length;
  const inProgress = batches.filter((b) => b.status === "in_progress").length;
  const completed = batches.filter((b) => b.status === "completed").length;
  const totalFilled = batches
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.actual_quantity || 0), 0);

  if (error) {
    return (
      <div
        style={{
          ...sCard,
          borderLeft: `3px solid ${C.red}`,
          margin: "20px 0",
        }}
      >
        <div style={sLabel}>Error Loading Production Data</div>
        <p style={{ fontSize: "13px", color: C.red, margin: "8px 0 0" }}>
          {error}
        </p>
        <button onClick={fetchData} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontFamily: F.heading,
              fontSize: "22px",
              fontWeight: 300,
              color: C.primaryDark,
              margin: 0,
            }}
          >
            Production & Assembly
          </h2>
          <span
            style={{
              background: "rgba(82,183,136,0.15)",
              color: C.accentGreen,
              padding: "2px 8px",
              borderRadius: "2px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Phase 2C
          </span>
        </div>
        <p
          style={{
            color: C.muted,
            fontSize: "13px",
            fontWeight: 300,
            margin: 0,
          }}
        >
          Create production batches, track assembly runs, manage inputs from
          inventory.
        </p>
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <MiniStat label="Planned" value={planned} color={C.blue} />
        <MiniStat label="In Progress" value={inProgress} color={C.gold} />
        <MiniStat label="Completed" value={completed} color={C.accentGreen} />
        <MiniStat
          label="Units Filled"
          value={totalFilled.toLocaleString()}
          color={C.primaryDark}
        />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["all", "planned", "in_progress", "completed", "cancelled"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 14px",
                  background: statusFilter === s ? C.primaryDark : C.white,
                  color: statusFilter === s ? C.white : C.muted,
                  border: `1px solid ${statusFilter === s ? C.primaryDark : C.border}`,
                  borderRadius: "2px",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: F.body,
                  fontWeight: statusFilter === s ? 600 : 400,
                }}
              >
                {s === "all"
                  ? `All (${batches.length})`
                  : `${STATUS_CONFIG[s]?.label || s} (${batches.filter((b) => b.status === s).length})`}
              </button>
            ),
          )}
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={sBtn()}
        >
          {showCreateForm ? "Cancel" : "+ New Batch"}
        </button>
      </div>

      {/* ── Create Form ───────────────────────────────────────────── */}
      {showCreateForm && (
        <CreateBatchForm
          inventoryItems={inventoryItems}
          onCreated={() => {
            setShowCreateForm(false);
            fetchData();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* ── Batch List ────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🔧</div>
          Loading production data...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            color: C.muted,
            padding: "60px 40px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            🔧
          </div>
          <p style={{ fontSize: "13px", margin: 0 }}>
            {batches.length === 0
              ? "No production batches yet. Create your first batch to start tracking assembly."
              : "No batches match the selected filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {filteredBatches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              inventoryItems={inventoryItems}
              expanded={expandedBatch === batch.id}
              onToggle={() =>
                setExpandedBatch(expandedBatch === batch.id ? null : batch.id)
              }
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE BATCH FORM
// ═══════════════════════════════════════════════════════════════════════════
function CreateBatchForm({ inventoryItems, onCreated, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    strain_name: "",
    product_type: "cartridge",
    size_ml: "1.0",
    target_quantity: "",
    notes: "",
  });
  const [inputs, setInputs] = useState([
    {
      inventory_item_id: "",
      input_name: "",
      input_category: "distillate",
      quantity_used: "",
      unit: "ml",
      cost_per_unit: "",
    },
  ]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setInput = (idx, key, val) => {
    setInputs((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };

      // Auto-fill name and cost from selected inventory item
      if (key === "inventory_item_id" && val) {
        const item = inventoryItems.find((i) => i.id === val);
        if (item) {
          arr[idx].input_name = item.name;
          arr[idx].cost_per_unit = item.cost_price || "";
          arr[idx].unit = item.unit || "ml";
        }
      }
      return arr;
    });
  };
  const addInput = () =>
    setInputs((p) => [
      ...p,
      {
        inventory_item_id: "",
        input_name: "",
        input_category: "distillate",
        quantity_used: "",
        unit: "ml",
        cost_per_unit: "",
      },
    ]);
  const removeInput = (idx) => setInputs((p) => p.filter((_, i) => i !== idx));

  // ── Auto-generate batch code ───────────────────────────────────────
  const generateBatchCode = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const strain = form.strain_name
      .replace(/\s+/g, "-")
      .substring(0, 6)
      .toUpperCase();
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
    return `PB-${y}${m}-${strain}-${seq}`;
  };

  // ── BOM auto-calc ──────────────────────────────────────────────────
  const autoCalcBOM = () => {
    const qty = parseInt(form.target_quantity) || 0;
    const size = parseFloat(form.size_ml) || 1.0;
    if (qty === 0) return;

    // Rough estimates for a cartridge fill
    const distillateMl = qty * size * 0.85; // ~85% distillate
    const terpeneMl = qty * size * 0.12; // ~12% terpenes
    const hardwareUnits = qty; // 1 cart per unit

    setInputs([
      {
        inventory_item_id: "",
        input_name: "THC Distillate",
        input_category: "distillate",
        quantity_used: distillateMl.toFixed(1),
        unit: "ml",
        cost_per_unit: "",
      },
      {
        inventory_item_id: "",
        input_name: `${form.strain_name || "Strain"} Terpene`,
        input_category: "terpene",
        quantity_used: terpeneMl.toFixed(1),
        unit: "ml",
        cost_per_unit: "",
      },
      {
        inventory_item_id: "",
        input_name: `${form.size_ml}ml Cartridge Hardware`,
        input_category: "hardware",
        quantity_used: String(hardwareUnits),
        unit: "pcs",
        cost_per_unit: "",
      },
    ]);
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.strain_name.trim()) {
      alert("Strain name is required.");
      return;
    }
    if (!form.target_quantity || parseInt(form.target_quantity) <= 0) {
      alert("Enter a target quantity greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const batchCode = generateBatchCode();
      // Generate UUID client-side to avoid .select().single() RLS issues
      const batchId = crypto.randomUUID();
      console.log("[Production] Creating batch:", batchCode, "id:", batchId);

      // Get current user (non-blocking — fallback to null)
      let userId = null;
      try {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch (e) {
        console.warn("[Production] getUser failed, continuing:", e.message);
      }

      // Create batch — no .select().single() needed since we have the ID
      const { error: batchErr } = await supabase
        .from("production_batches")
        .insert({
          id: batchId,
          tenant_id: HQ_TENANT_ID,
          batch_code: batchCode,
          strain_name: form.strain_name.trim(),
          product_type: form.product_type,
          size_ml: parseFloat(form.size_ml),
          target_quantity: parseInt(form.target_quantity),
          status: "planned",
          notes: form.notes.trim() || null,
          created_by: userId,
        });
      if (batchErr) {
        console.error("[Production] Batch insert error:", batchErr);
        throw batchErr;
      }
      console.log("[Production] Batch created successfully:", batchId);

      // Create inputs (if any valid ones)
      const validInputs = inputs.filter(
        (inp) => inp.input_name.trim() && inp.quantity_used,
      );
      if (validInputs.length > 0) {
        const inputRows = validInputs.map((inp) => ({
          production_batch_id: batchId,
          inventory_item_id: inp.inventory_item_id || null,
          input_name: inp.input_name.trim(),
          input_category: inp.input_category || null,
          quantity_used: parseFloat(inp.quantity_used),
          unit: inp.unit,
          cost_per_unit: inp.cost_per_unit
            ? parseFloat(inp.cost_per_unit)
            : null,
          total_cost:
            inp.cost_per_unit && inp.quantity_used
              ? parseFloat(inp.quantity_used) * parseFloat(inp.cost_per_unit)
              : null,
        }));
        console.log("[Production] Inserting", inputRows.length, "inputs");
        const { error: inputErr } = await supabase
          .from("production_inputs")
          .insert(inputRows);
        if (inputErr) {
          console.error("[Production] Input insert error:", inputErr);
          throw inputErr;
        }
        console.log("[Production] Inputs created successfully");
      }

      onCreated();
    } catch (err) {
      console.error("[Production] Create error:", err);
      alert("Error creating batch: " + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const fieldRow = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  };

  // ── Total estimated cost ───────────────────────────────────────────
  const totalCost = inputs.reduce((sum, inp) => {
    const qty = parseFloat(inp.quantity_used) || 0;
    const cost = parseFloat(inp.cost_per_unit) || 0;
    return sum + qty * cost;
  }, 0);

  return (
    <div
      style={{
        ...sCard,
        marginBottom: "20px",
        borderLeft: `3px solid ${C.accentGreen}`,
      }}
    >
      <div style={{ ...sLabel, marginBottom: "16px" }}>
        New Production Batch
      </div>

      {/* Batch details */}
      <div style={fieldRow}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Strain Name *
          </label>
          <input
            style={sInput}
            value={form.strain_name}
            onChange={(e) => set("strain_name", e.target.value)}
            placeholder="e.g. Purple Punch"
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Product Type
          </label>
          <select
            style={sSelect}
            value={form.product_type}
            onChange={(e) => set("product_type", e.target.value)}
          >
            <option value="cartridge">Cartridge</option>
            <option value="disposable">Disposable</option>
            <option value="pod">Pod</option>
          </select>
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Cart Size (ml)
          </label>
          <select
            style={sSelect}
            value={form.size_ml}
            onChange={(e) => set("size_ml", e.target.value)}
          >
            <option value="0.5">0.5 ml</option>
            <option value="1.0">1.0 ml</option>
            <option value="2.0">2.0 ml</option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Target Quantity *
          </label>
          <input
            style={sInput}
            type="number"
            min="1"
            value={form.target_quantity}
            onChange={(e) => set("target_quantity", e.target.value)}
            placeholder="e.g. 100"
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Notes
          </label>
          <input
            style={sInput}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional batch notes"
          />
        </div>
      </div>

      {/* Bill of Materials */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div style={sLabel}>Bill of Materials (Inputs)</div>
        <button
          onClick={autoCalcBOM}
          style={{
            ...sBtn("outline"),
            padding: "4px 10px",
            fontSize: "9px",
          }}
          title="Auto-estimate inputs based on strain + quantity + size"
        >
          ⚡ Auto-Calculate
        </button>
      </div>

      {inputs.map((inp, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
            gap: "8px",
            marginBottom: "8px",
            alignItems: "end",
          }}
        >
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Inventory Item (optional)
              </label>
            )}
            <select
              style={sSelect}
              value={inp.inventory_item_id}
              onChange={(e) =>
                setInput(idx, "inventory_item_id", e.target.value)
              }
            >
              <option value="">— Manual entry —</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.quantity_on_hand} {i.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Input Name
              </label>
            )}
            <input
              style={sInput}
              value={inp.input_name}
              onChange={(e) => setInput(idx, "input_name", e.target.value)}
              placeholder="Name"
            />
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Qty Used
              </label>
            )}
            <input
              style={sInput}
              type="number"
              step="0.01"
              value={inp.quantity_used}
              onChange={(e) => setInput(idx, "quantity_used", e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Unit
              </label>
            )}
            <select
              style={sSelect}
              value={inp.unit}
              onChange={(e) => setInput(idx, "unit", e.target.value)}
            >
              <option value="ml">ml</option>
              <option value="g">g</option>
              <option value="pcs">pcs</option>
              <option value="bottles">bottles</option>
            </select>
          </div>
          <div>
            {idx === 0 && (
              <label
                style={{
                  fontSize: "10px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Cost/unit (R)
              </label>
            )}
            <input
              style={sInput}
              type="number"
              step="0.01"
              value={inp.cost_per_unit}
              onChange={(e) => setInput(idx, "cost_per_unit", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            {inputs.length > 1 && (
              <button
                onClick={() => removeInput(idx)}
                style={{
                  ...sBtn("outline"),
                  padding: "8px",
                  color: C.red,
                  borderColor: C.red,
                  fontSize: "11px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
        }}
      >
        <button
          onClick={addInput}
          style={{ ...sBtn("outline"), fontSize: "9px" }}
        >
          + Add Input
        </button>
        {totalCost > 0 && (
          <span
            style={{
              fontSize: "12px",
              color: C.primaryDark,
              fontWeight: 600,
            }}
          >
            Est. Batch Cost: R{totalCost.toFixed(2)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "20px",
          borderTop: `1px solid ${C.border}`,
          paddingTop: "16px",
        }}
      >
        <button onClick={onCancel} style={sBtn("outline")}>
          Cancel
        </button>
        <button onClick={handleCreate} disabled={saving} style={sBtn()}>
          {saving ? "Creating..." : "Create Batch"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH CARD — Individual batch with expand/collapse
// ═══════════════════════════════════════════════════════════════════════════
function BatchCard({ batch, inventoryItems, expanded, onToggle, onRefresh }) {
  const [updating, setUpdating] = useState(false);
  const [actualQty, setActualQty] = useState(
    batch.actual_quantity || batch.target_quantity || 0,
  );

  const statusCfg = STATUS_CONFIG[batch.status] || STATUS_CONFIG.planned;
  const inputs = batch.production_inputs || [];
  const totalInputCost = inputs.reduce(
    (sum, inp) => sum + (inp.total_cost || 0),
    0,
  );

  // ── Status change (v1.1: includes auto-deduction on completion) ────
  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === "in_progress")
        updates.started_at = new Date().toISOString();
      if (newStatus === "completed") {
        updates.completed_at = new Date().toISOString();
        updates.actual_quantity = parseInt(actualQty) || 0;
      }

      const { error } = await supabase
        .from("production_batches")
        .update(updates)
        .eq("id", batch.id);
      if (error) throw error;

      // ── TASK A-1: Auto-deduct raw materials from inventory ─────
      // When batch is completed, deduct used materials from inventory
      // and create stock_movements records for audit trail.
      // Uses deducted_from_stock flag for idempotency.
      if (newStatus === "completed") {
        const batchInputs = batch.production_inputs || [];
        const deductionErrors = [];
        let deductedCount = 0;

        for (const inp of batchInputs) {
          // Skip manual entries (no inventory link) and already-deducted
          if (!inp.inventory_item_id || inp.deducted_from_stock) continue;

          try {
            // 1. Read current quantity_on_hand (LL-046)
            const { data: item, error: readErr } = await supabase
              .from("inventory_items")
              .select("quantity_on_hand")
              .eq("id", inp.inventory_item_id)
              .single();

            if (readErr) {
              console.error(
                `[Production] Read inventory error for ${inp.input_name}:`,
                readErr,
              );
              deductionErrors.push(`${inp.input_name}: ${readErr.message}`);
              continue;
            }

            // 2. Subtract quantity_used from quantity_on_hand
            //    (allows negative — shows over-use, per WP risk register)
            const newQty =
              (item.quantity_on_hand || 0) - (inp.quantity_used || 0);
            const { error: updateErr } = await supabase
              .from("inventory_items")
              .update({ quantity_on_hand: newQty })
              .eq("id", inp.inventory_item_id);

            if (updateErr) {
              console.error(
                `[Production] Update inventory error for ${inp.input_name}:`,
                updateErr,
              );
              deductionErrors.push(`${inp.input_name}: ${updateErr.message}`);
              continue;
            }

            // 3. Create stock_movements record (client-side UUID per LL-048)
            const { error: moveErr } = await supabase
              .from("stock_movements")
              .insert({
                id: crypto.randomUUID(),
                item_id: inp.inventory_item_id,
                quantity: -(inp.quantity_used || 0),
                movement_type: "production_out",
                reference: batch.batch_code,
                notes: `Auto-deducted for batch ${batch.batch_code}`,
                tenant_id: HQ_TENANT_ID,
              });

            if (moveErr) {
              console.error(
                `[Production] Stock movement error for ${inp.input_name}:`,
                moveErr,
              );
              deductionErrors.push(
                `${inp.input_name} movement: ${moveErr.message}`,
              );
              // Continue to mark as deducted — inventory already updated
            }

            // 4. Mark input as deducted (idempotency flag — LL-064)
            const { error: flagErr } = await supabase
              .from("production_inputs")
              .update({ deducted_from_stock: true })
              .eq("id", inp.id);

            if (flagErr) {
              console.error(
                `[Production] Flag update error for ${inp.input_name}:`,
                flagErr,
              );
              deductionErrors.push(
                `${inp.input_name} flag: ${flagErr.message}`,
              );
            } else {
              deductedCount++;
              console.log(
                `[Production] ✓ Deducted ${inp.quantity_used} ${inp.unit} of ${inp.input_name} from inventory`,
              );
            }
          } catch (deductErr) {
            console.error(
              `[Production] Deduction error for ${inp.input_name}:`,
              deductErr,
            );
            deductionErrors.push(
              `${inp.input_name}: ${deductErr.message || "Unknown error"}`,
            );
          }
        }

        // Report results (batch status is already updated regardless)
        if (deductionErrors.length > 0) {
          console.warn("[Production] Some deductions failed:", deductionErrors);
          alert(
            "Batch marked as completed, but some inventory deductions failed:\n\n" +
              deductionErrors.join("\n") +
              "\n\nAlready-deducted items won't be deducted again on retry.",
          );
        } else if (deductedCount > 0) {
          console.log(
            `[Production] ✓ All ${deductedCount} inventory items deducted for batch ${batch.batch_code}`,
          );
        }

        // ── TASK A-2: Auto-create finished goods in inventory ────────
        // After deducting raw materials, create (or increment) a finished
        // product inventory item and record a production_in movement.
        const filledQty = parseInt(actualQty) || 0;
        if (filledQty > 0) {
          try {
            // Build finished product identity
            const fpName = `${batch.strain_name} ${batch.size_ml}ml ${batch.product_type}`;
            const fpSku =
              `FP-${batch.strain_name.replace(/\s+/g, "-").toUpperCase()}-${batch.size_ml}ML`.substring(
                0,
                50,
              );

            console.log(
              `[Production] A-2: Creating/updating finished product: "${fpName}" qty: ${filledQty}`,
            );

            // Check if finished product already exists in inventory
            const { data: existing, error: findErr } = await supabase
              .from("inventory_items")
              .select("id, quantity_on_hand")
              .eq("category", "finished_product")
              .eq("tenant_id", HQ_TENANT_ID)
              .ilike("name", fpName)
              .limit(1);

            if (findErr) {
              console.error(
                "[Production] A-2: Find finished product error:",
                findErr,
              );
              throw findErr;
            }

            let finishedItemId;

            if (existing && existing.length > 0) {
              // INCREMENT existing finished product
              finishedItemId = existing[0].id;
              const newQty = (existing[0].quantity_on_hand || 0) + filledQty;
              const { error: updErr } = await supabase
                .from("inventory_items")
                .update({ quantity_on_hand: newQty })
                .eq("id", finishedItemId);

              if (updErr) {
                console.error(
                  "[Production] A-2: Update finished product error:",
                  updErr,
                );
                throw updErr;
              }
              console.log(
                `[Production] A-2: ✓ Incremented "${fpName}" by ${filledQty} → ${newQty} total`,
              );
            } else {
              // CREATE new finished product inventory item (client-side UUID per LL-048)
              finishedItemId = crypto.randomUUID();

              // Calculate cost per unit from batch inputs
              const batchTotalCost = (batch.production_inputs || []).reduce(
                (sum, inp) => sum + (inp.total_cost || 0),
                0,
              );
              const costPerUnit =
                filledQty > 0 && batchTotalCost > 0
                  ? parseFloat((batchTotalCost / filledQty).toFixed(2))
                  : null;

              const { error: createErr } = await supabase
                .from("inventory_items")
                .insert({
                  id: finishedItemId,
                  tenant_id: HQ_TENANT_ID,
                  name: fpName,
                  sku: fpSku,
                  category: "finished_product",
                  quantity_on_hand: filledQty,
                  unit: "pcs",
                  cost_price: costPerUnit,
                  is_active: true,
                });

              if (createErr) {
                console.error(
                  "[Production] A-2: Create finished product error:",
                  createErr,
                );
                throw createErr;
              }
              console.log(
                `[Production] A-2: ✓ Created new finished product "${fpName}" with ${filledQty} pcs`,
              );
            }

            // Record stock movement for the finished goods (production_in)
            const { error: moveErr } = await supabase
              .from("stock_movements")
              .insert({
                id: crypto.randomUUID(),
                item_id: finishedItemId,
                quantity: filledQty,
                movement_type: "production_in",
                reference: batch.batch_code,
                notes: `Finished goods from batch ${batch.batch_code}: ${filledQty} × ${batch.size_ml}ml ${batch.product_type}`,
                tenant_id: HQ_TENANT_ID,
              });

            if (moveErr) {
              console.error("[Production] A-2: Stock movement error:", moveErr);
              // Non-fatal — inventory was already updated
            } else {
              console.log(
                `[Production] A-2: ✓ Stock movement recorded: +${filledQty} production_in for ${batch.batch_code}`,
              );
            }
          } catch (fpErr) {
            console.error("[Production] A-2: Finished goods error:", fpErr);
            alert(
              "Batch completed and raw materials deducted, but finished goods creation failed:\n\n" +
                (fpErr.message || JSON.stringify(fpErr)) +
                "\n\nYou can manually add the finished product in Stock Control.",
            );
          }
        } else {
          console.log("[Production] A-2: Skipped — actual quantity is 0");
        }
      }

      onRefresh();
    } catch (err) {
      console.error("[Production] Status update error:", err);
      alert("Error updating status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={sCard}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontFamily: F.heading,
                fontSize: "18px",
                fontWeight: 600,
                color: C.text,
              }}
            >
              {batch.batch_code}
            </span>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "2px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
                background: statusCfg.bg,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.color}35`,
              }}
            >
              {statusCfg.label}
            </span>
          </div>
          <div style={{ fontSize: "13px", color: C.muted }}>
            {batch.strain_name} · {batch.size_ml}ml {batch.product_type} ·{" "}
            Target: {batch.target_quantity} units
            {batch.actual_quantity > 0 && (
              <span style={{ color: C.accentGreen, fontWeight: 600 }}>
                {" "}
                · Filled: {batch.actual_quantity}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "11px",
              color: C.muted,
            }}
          >
            {new Date(batch.created_at).toLocaleDateString()}
          </span>
          <span
            style={{
              fontSize: "14px",
              color: C.muted,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {/* Inputs table */}
          {inputs.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ ...sLabel, marginBottom: "8px" }}>
                Materials / Inputs
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  fontFamily: F.body,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        fontSize: "9px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Input
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px",
                        fontSize: "9px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px",
                        fontSize: "9px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Qty Used
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px",
                        fontSize: "9px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Cost
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        fontSize: "9px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        color: C.muted,
                        borderBottom: `2px solid ${C.border}`,
                      }}
                    >
                      Deducted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inputs.map((inp) => (
                    <tr key={inp.id}>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          fontWeight: 500,
                        }}
                      >
                        {inp.input_name}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          color: C.muted,
                        }}
                      >
                        {inp.input_category || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                        }}
                      >
                        {inp.quantity_used} {inp.unit}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                        }}
                      >
                        {inp.total_cost ? `R${inp.total_cost.toFixed(2)}` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "center",
                        }}
                      >
                        {inp.deducted_from_stock ? (
                          <span style={{ color: C.accentGreen }}>✓</span>
                        ) : (
                          <span style={{ color: C.muted }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {totalInputCost > 0 && (
                  <tfoot>
                    <tr>
                      <td
                        colSpan="3"
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontWeight: 600,
                          fontSize: "11px",
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Total Cost:
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: C.primaryDark,
                        }}
                      >
                        R{totalInputCost.toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* Timestamps */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              fontSize: "11px",
              color: C.muted,
              marginBottom: "16px",
            }}
          >
            <span>Created: {new Date(batch.created_at).toLocaleString()}</span>
            {batch.started_at && (
              <span>
                Started: {new Date(batch.started_at).toLocaleString()}
              </span>
            )}
            {batch.completed_at && (
              <span>
                Completed: {new Date(batch.completed_at).toLocaleString()}
              </span>
            )}
          </div>

          {batch.notes && (
            <div
              style={{
                fontSize: "12px",
                color: C.muted,
                fontStyle: "italic",
                marginBottom: "16px",
                padding: "8px 12px",
                background: C.warmBg,
                borderRadius: "2px",
              }}
            >
              {batch.notes}
            </div>
          )}

          {/* Status actions */}
          {batch.status !== "completed" && batch.status !== "cancelled" && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                borderTop: `1px solid ${C.border}`,
                paddingTop: "12px",
              }}
            >
              {batch.status === "planned" && (
                <button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={updating}
                  style={{
                    ...sBtn(),
                    background: C.gold,
                  }}
                >
                  {updating ? "Updating..." : "▶ Start Production"}
                </button>
              )}
              {batch.status === "in_progress" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <label style={{ fontSize: "11px", color: C.muted }}>
                      Actual filled:
                    </label>
                    <input
                      style={{ ...sInput, width: "80px" }}
                      type="number"
                      min="0"
                      value={actualQty}
                      onChange={(e) => setActualQty(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => handleStatusChange("completed")}
                    disabled={updating}
                    style={{
                      ...sBtn(),
                      background: C.accentGreen,
                    }}
                  >
                    {updating ? "Updating..." : "✓ Mark Completed"}
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Cancel this production batch? This cannot be undone.",
                    )
                  ) {
                    handleStatusChange("cancelled");
                  }
                }}
                disabled={updating}
                style={{
                  ...sBtn("outline"),
                  color: C.red,
                  borderColor: C.red,
                }}
              >
                Cancel Batch
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mini stat card ──────────────────────────────────────────────────────
function MiniStat({ label, value, color }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: "2px",
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: F.heading,
          fontSize: "28px",
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
