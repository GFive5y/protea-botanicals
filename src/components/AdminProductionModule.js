// src/components/AdminProductionModule.js
// v1.0 — March 2026
// WP2 — Production Module
// Features:
//   - Production run card grid (planned → in_progress → completed)
//   - Create run: links to batch, selects raw materials, sets planned units
//   - Start run: logs started_at, sets status → in_progress
//   - Complete run: logs actual_units + completed_at, auto-deducts stock movements
//   - Input materials checklist per run
//   - Run history with yield % (actual vs planned)
//   - Live stats: runs today, units produced this month, avg yield

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";
import { T } from "../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  orange: "#e67e22",
  lightOrange: "#fef9f0",
  lightGreen: "#eafaf1",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  purple: "#6c3483",
  lightPurple: "#f5eef8",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  planned: { label: "Planned", color: C.blue, bg: C.lightBlue, icon: "📋" },
  in_progress: {
    label: "In Progress",
    color: C.orange,
    bg: C.lightOrange,
    icon: "⚙️",
  },
  completed: { label: "Completed", color: C.mid, bg: C.lightGreen, icon: "✅" },
  cancelled: { label: "Cancelled", color: C.red, bg: C.lightRed, icon: "✕" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: FONTS.body,
  backgroundColor: C.white,
  color: C.text,
  boxSizing: "border-box",
  outline: "none",
};
const makeBtn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "9px 18px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: "none",
  borderRadius: 2,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: FONTS.body,
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.2s",
});
const sectionHead = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.2em",
  color: C.muted,
  textTransform: "uppercase",
  marginBottom: 12,
  borderBottom: `1px solid ${C.border}`,
  paddingBottom: 8,
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function yieldPct(actual, planned) {
  if (!planned || planned === 0) return null;
  return ((actual / planned) * 100).toFixed(1);
}
function autoRunNumber(runs) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const seq = String((runs?.length || 0) + 1).padStart(3, "0");
  return `RUN-${year}${month}-${seq}`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.planned;
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.color}40`,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.green }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: "18px 20px",
        flex: "1 1 160px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: FONTS.heading,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          marginTop: 4,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Run Card ─────────────────────────────────────────────────────────────────
function RunCard({
  run,
  batches,
  onStart,
  onComplete,
  onCancel,
  onViewDetails,
}) {
  const batch = batches.find((b) => b.id === run.batch_id);
  const yPct =
    run.status === "completed"
      ? yieldPct(run.actual_units, run.planned_units)
      : null;

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${run.status === "in_progress" ? C.orange : C.border}`,
        borderRadius: 2,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 18,
              color: C.green,
              fontWeight: 600,
            }}
          >
            {run.run_number}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {batch
              ? `${batch.product_name} — ${batch.batch_number}`
              : "No batch linked"}
          </div>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {/* Units strip */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 0",
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: FONTS.heading,
              color: C.blue,
            }}
          >
            {run.planned_units || "—"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Planned
          </div>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: FONTS.heading,
              color: run.actual_units ? C.accent : C.muted,
            }}
          >
            {run.actual_units || "—"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Actual
          </div>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: FONTS.heading,
              color: yPct
                ? parseFloat(yPct) >= 90
                  ? C.accent
                  : parseFloat(yPct) >= 70
                    ? C.gold
                    : C.red
                : C.muted,
            }}
          >
            {yPct ? `${yPct}%` : "—"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Yield
          </div>
        </div>
      </div>

      {/* Dates */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: C.muted,
          flexWrap: "wrap",
        }}
      >
        <span>Created: {fmtDate(run.created_at)}</span>
        {run.started_at && <span>Started: {fmtDateTime(run.started_at)}</span>}
        {run.completed_at && (
          <span>Completed: {fmtDateTime(run.completed_at)}</span>
        )}
      </div>

      {/* Notes */}
      {run.notes && (
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            fontStyle: "italic",
            borderTop: `1px solid ${C.border}`,
            paddingTop: 8,
          }}
        >
          {run.notes}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <button
          onClick={() => onViewDetails(run)}
          style={{
            ...makeBtn(C.blue),
            fontSize: 10,
            padding: "7px 14px",
            flex: 1,
          }}
        >
          📋 Details
        </button>
        {run.status === "planned" && (
          <button
            onClick={() => onStart(run)}
            style={{
              ...makeBtn(C.orange),
              fontSize: 10,
              padding: "7px 14px",
              flex: 1,
            }}
          >
            ▶ Start Run
          </button>
        )}
        {run.status === "in_progress" && (
          <button
            onClick={() => onComplete(run)}
            style={{
              ...makeBtn(C.accent),
              fontSize: 10,
              padding: "7px 14px",
              flex: 1,
            }}
          >
            ✓ Complete
          </button>
        )}
        {(run.status === "planned" || run.status === "in_progress") && (
          <button
            onClick={() => onCancel(run)}
            style={{
              ...makeBtn("transparent", C.red),
              border: `1px solid ${C.red}`,
              fontSize: 10,
              padding: "7px 12px",
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Create Run Form ──────────────────────────────────────────────────────────
function CreateRunForm({
  batches,
  inventoryItems,
  existingRuns,
  tenantId,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState({
    batch_id: "",
    run_number: autoRunNumber(existingRuns),
    planned_units: "",
    notes: "",
  });
  const [inputs, setInputs] = useState([{ item_id: "", quantity_planned: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setInput = (i, k, v) =>
    setInputs((arr) => arr.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addInput = () =>
    setInputs((arr) => [...arr, { item_id: "", quantity_planned: "" }]);
  const removeInput = (i) =>
    setInputs((arr) => arr.filter((_, idx) => idx !== i));

  const rawMaterials = inventoryItems.filter(
    (i) =>
      i.is_active &&
      ["raw_material", "terpene", "hardware"].includes(i.category),
  );

  const handleSave = async () => {
    setError("");
    if (!form.run_number.trim()) {
      setError("Run number required.");
      return;
    }
    if (!form.planned_units || parseInt(form.planned_units) < 1) {
      setError("Planned units required.");
      return;
    }
    setSaving(true);
    try {
      const { data: run, error: runErr } = await supabase
        .from("production_runs")
        .insert({
          tenant_id: tenantId,
          batch_id: form.batch_id || null,
          run_number: form.run_number,
          planned_units: parseInt(form.planned_units),
          notes: form.notes || null,
          status: "planned",
        })
        .select()
        .single();
      if (runErr) throw runErr;

      const validInputs = inputs.filter((i) => i.item_id && i.quantity_planned);
      if (validInputs.length > 0) {
        const { error: inputErr } = await supabase
          .from("production_run_inputs")
          .insert(
            validInputs.map((i) => ({
              tenant_id: tenantId,
              run_id: run.id,
              item_id: i.item_id,
              quantity_planned: parseFloat(i.quantity_planned),
            })),
          );
        if (inputErr) throw inputErr;
      }
      onSave(run);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(560px, 100vw)",
        background: C.white,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        zIndex: 1000,
        overflowY: "auto",
        fontFamily: FONTS.body,
      }}
    >
      <div
        style={{
          background: C.green,
          padding: "20px 24px",
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <div
          style={{ fontFamily: FONTS.heading, fontSize: 22, color: C.white }}
        >
          New Production Run
        </div>
        <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>
          Log materials & planned output
        </div>
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: C.white,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: C.lightRed,
              border: `1px solid ${C.red}`,
              borderRadius: 2,
              color: C.red,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div style={sectionHead}>Run Identity</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
            Run Number *
          </div>
          <input
            style={inputStyle}
            value={form.run_number}
            onChange={(e) => set("run_number", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Linked Batch
            </div>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.batch_id}
              onChange={(e) => set("batch_id", e.target.value)}
            >
              <option value="">— No batch —</option>
              {batches
                .filter((b) => !b.is_archived)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} — {b.product_name}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Planned Units *
            </div>
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={form.planned_units}
              onChange={(e) => set("planned_units", e.target.value)}
              placeholder="100"
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
            Notes
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional run notes"
          />
        </div>

        <div style={sectionHead}>Input Materials</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          Log raw materials consumed in this run. Stock will be deducted
          automatically when run completes.
        </div>

        {inputs.map((inp, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <div style={{ flex: 3 }}>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={inp.item_id}
                onChange={(e) => setInput(i, "item_id", e.target.value)}
              >
                <option value="">— Select material —</option>
                {rawMaterials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) — {item.quantity_on_hand}{" "}
                    {item.unit} on hand
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                placeholder="Qty"
                value={inp.quantity_planned}
                onChange={(e) =>
                  setInput(i, "quantity_planned", e.target.value)
                }
              />
            </div>
            {inputs.length > 1 && (
              <button
                onClick={() => removeInput(i)}
                style={{
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "8px 10px",
                  cursor: "pointer",
                  color: C.muted,
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addInput}
          style={{
            ...makeBtn("transparent", C.mid),
            border: `1px solid ${C.border}`,
            fontSize: 10,
            padding: "7px 14px",
            marginBottom: 24,
          }}
        >
          + Add Material
        </button>

        <div
          style={{
            display: "flex",
            gap: 12,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...makeBtn(C.green, C.white, saving), flex: 1 }}
          >
            {saving ? "Creating…" : "Create Run"}
          </button>
          <button
            onClick={onCancel}
            style={{
              ...makeBtn("transparent", C.muted),
              border: `1px solid ${C.border}`,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Complete Run Modal ───────────────────────────────────────────────────────
function CompleteRunModal({
  run,
  runInputs,
  inventoryItems,
  tenantId,
  onConfirm,
  onCancel,
}) {
  const [actualUnits, setActualUnits] = useState(run.planned_units || "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const yPct =
    actualUnits && run.planned_units
      ? yieldPct(parseInt(actualUnits), run.planned_units)
      : null;

  const handleConfirm = async () => {
    if (!actualUnits || parseInt(actualUnits) < 0) {
      setError("Enter actual units produced.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 1. Update run
      const { error: runErr } = await supabase
        .from("production_runs")
        .update({
          status: "completed",
          actual_units: parseInt(actualUnits),
          completed_at: new Date().toISOString(),
          notes: notes || run.notes || null,
        })
        .eq("id", run.id);
      if (runErr) throw runErr;

      // 2. For each input: deduct stock + record movement
      for (const inp of runInputs) {
        const qty = inp.quantity_actual || inp.quantity_planned;
        if (!qty || !inp.item_id) continue;

        // Update actual on the input record
        await supabase
          .from("production_run_inputs")
          .update({ quantity_actual: parseFloat(qty) })
          .eq("id", inp.id);

        // Record stock movement
        const { error: moveErr } = await supabase
          .from("stock_movements")
          .insert({
            tenant_id: tenantId,
            item_id: inp.item_id,
            quantity: -Math.abs(parseFloat(qty)),
            movement_type: "production_out",
            reference: run.run_number,
            notes: `Auto-deducted: Production run ${run.run_number}`,
          });
        if (moveErr) throw moveErr;

        // Update inventory quantity
        const item = inventoryItems.find((i) => i.id === inp.item_id);
        if (item) {
          await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand: Math.max(
                0,
                (item.quantity_on_hand || 0) - Math.abs(parseFloat(qty)),
              ),
            })
            .eq("id", inp.item_id);
        }
      }

      onConfirm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 2,
          padding: 32,
          maxWidth: 480,
          width: "90%",
          fontFamily: FONTS.body,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: 22,
            color: C.green,
            marginBottom: 4,
          }}
        >
          Complete Production Run
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          {run.run_number} · {run.planned_units} units planned
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: C.lightRed,
              border: `1px solid ${C.red}`,
              borderRadius: 2,
              color: C.red,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
            Actual Units Produced *
          </div>
          <input
            style={{
              ...inputStyle,
              fontSize: 20,
              fontWeight: 700,
              textAlign: "center",
            }}
            type="number"
            min="0"
            value={actualUnits}
            onChange={(e) => setActualUnits(e.target.value)}
          />
          {yPct && (
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                fontSize: 13,
                fontWeight: 600,
                color:
                  parseFloat(yPct) >= 90
                    ? C.accent
                    : parseFloat(yPct) >= 70
                      ? C.gold
                      : C.red,
              }}
            >
              Yield: {yPct}%{" "}
              {parseFloat(yPct) >= 90
                ? "✅"
                : parseFloat(yPct) >= 70
                  ? "⚠️"
                  : "🔴"}
            </div>
          )}
        </div>

        {runInputs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={sectionHead}>Materials to Deduct</div>
            {runInputs.map((inp) => {
              const item = inventoryItems.find((i) => i.id === inp.item_id);
              return (
                <div
                  key={inp.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: 13,
                  }}
                >
                  <span>{item?.name || "Unknown"}</span>
                  <span style={{ fontWeight: 600, color: C.red }}>
                    −{inp.quantity_planned} {item?.unit || ""}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
              Stock will be automatically deducted from inventory.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
            Completion Notes
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes on this run"
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{ ...makeBtn(C.accent, C.white, saving), flex: 1 }}
          >
            {saving ? "Completing…" : "✓ Complete Run"}
          </button>
          <button
            onClick={onCancel}
            style={{
              ...makeBtn("transparent", C.muted),
              border: `1px solid ${C.border}`,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Details Modal ────────────────────────────────────────────────────────────
function DetailsModal({ run, batches, runInputs, inventoryItems, onClose }) {
  const batch = batches.find((b) => b.id === run.batch_id);
  const yPct =
    run.actual_units && run.planned_units
      ? yieldPct(run.actual_units, run.planned_units)
      : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 2,
          padding: 32,
          maxWidth: 520,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          fontFamily: FONTS.body,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: 24,
                color: C.green,
              }}
            >
              {run.run_number}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
              {batch
                ? `${batch.batch_number} — ${batch.product_name}`
                : "No batch linked"}
            </div>
          </div>
          <StatusBadge status={run.status} />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: 16,
              background: C.cream,
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: FONTS.heading,
                color: C.blue,
              }}
            >
              {run.planned_units || "—"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Planned
            </div>
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: 16,
              background: C.cream,
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: FONTS.heading,
                color: C.accent,
              }}
            >
              {run.actual_units || "—"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Actual
            </div>
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: 16,
              background: C.cream,
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: FONTS.heading,
                color: yPct
                  ? parseFloat(yPct) >= 90
                    ? C.accent
                    : parseFloat(yPct) >= 70
                      ? C.gold
                      : C.red
                  : C.muted,
              }}
            >
              {yPct ? `${yPct}%` : "—"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Yield
            </div>
          </div>
        </div>

        <div style={sectionHead}>Timeline</div>
        <div
          style={{ fontSize: 13, display: "grid", gap: 6, marginBottom: 20 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.muted }}>Created</span>
            <span>{fmtDateTime(run.created_at)}</span>
          </div>
          {run.started_at && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted }}>Started</span>
              <span>{fmtDateTime(run.started_at)}</span>
            </div>
          )}
          {run.completed_at && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted }}>Completed</span>
              <span>{fmtDateTime(run.completed_at)}</span>
            </div>
          )}
        </div>

        {runInputs.length > 0 && (
          <>
            <div style={sectionHead}>Input Materials</div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <thead>
                <tr>
                  {["Material", "Planned", "Actual", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 10,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runInputs.map((inp) => {
                  const item = inventoryItems.find((i) => i.id === inp.item_id);
                  return (
                    <tr key={inp.id}>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {item?.name || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {inp.quantity_planned} {item?.unit || ""}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          color: inp.quantity_actual ? C.accent : C.muted,
                        }}
                      >
                        {inp.quantity_actual
                          ? `${inp.quantity_actual} ${item?.unit || ""}`
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {inp.quantity_actual ? (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 20,
                              backgroundColor: C.lightGreen,
                              color: C.mid,
                            }}
                          >
                            Deducted
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 20,
                              backgroundColor: C.lightBlue,
                              color: C.blue,
                            }}
                          >
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {run.notes && (
          <>
            <div style={sectionHead}>Notes</div>
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                fontStyle: "italic",
                marginBottom: 20,
              }}
            >
              {run.notes}
            </div>
          </>
        )}

        <button onClick={onClose} style={{ ...makeBtn(C.mid), width: "100%" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminProductionModule() {
  const { tenantId } = useTenant();
  const [runs, setRuns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [runInputsMap, setRunInputsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [filter, setFilter] = useState("active");
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [runsRes, batchRes, itemsRes] = await Promise.all([
        supabase
          .from("production_runs")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("batches")
          .select("id, batch_number, product_name, strain, is_archived")
          .eq("tenant_id", tenantId)
          .order("batch_number"),
        supabase.from("inventory_items").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      ]);
      const runList = runsRes.data || [];
      setRuns(runList);
      setBatches(batchRes.data || []);
      setInventoryItems(itemsRes.data || []);

      // Fetch all inputs for all runs
      if (runList.length > 0) {
        const { data: inputs } = await supabase
          .from("production_run_inputs")
          .select("*")
          .in(
            "run_id",
            runList.map((r) => r.id),
          );
        const map = {};
        for (const inp of inputs || []) {
          if (!map[inp.run_id]) map[inp.run_id] = [];
          map[inp.run_id].push(inp);
        }
        setRunInputsMap(map);
      }
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleStart = async (run) => {
    const { error } = await supabase
      .from("production_runs")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", run.id);
    if (!error) {
      showToast(`Run ${run.run_number} started.`);
      fetchAll();
    }
  };

  const handleCancel = async (run) => {
    if (!window.confirm(`Cancel run ${run.run_number}?`)) return;
    const { error } = await supabase
      .from("production_runs")
      .update({ status: "cancelled" })
      .eq("id", run.id);
    if (!error) {
      showToast("Run cancelled.");
      fetchAll();
    }
  };

  const handleComplete = () => {
    setCompleteTarget(null);
    showToast("Run completed. Stock deducted.");
    fetchAll();
  };
  const handleSaveNew = () => {
    setShowCreate(false);
    showToast("Production run created.");
    fetchAll();
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const unitsThisMonth = runs
    .filter(
      (r) => r.status === "completed" && new Date(r.completed_at) >= monthStart,
    )
    .reduce((s, r) => s + (r.actual_units || 0), 0);
  const activeRuns = runs.filter((r) => r.status === "in_progress").length;
  const completedRuns = runs.filter((r) => r.status === "completed");
  const avgYield =
    completedRuns.length > 0
      ? (
          (completedRuns.reduce(
            (s, r) =>
              s + (r.planned_units > 0 ? r.actual_units / r.planned_units : 0),
            0,
          ) /
            completedRuns.length) *
          100
        ).toFixed(1)
      : null;

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = runs.filter((r) => {
    if (filter === "active")
      return ["planned", "in_progress"].includes(r.status);
    if (filter === "completed") return r.status === "completed";
    if (filter === "cancelled") return r.status === "cancelled";
    return true;
  });

  return (
    <div style={{ fontFamily: FONTS.body, position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.green,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            fontFamily: FONTS.body,
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: FONTS.heading,
              color: C.green,
              fontSize: 24,
              margin: 0,
            }}
          >
            Production Module
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Log assembly runs · Track material consumption · Record yields
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={makeBtn(C.mid)}>
          + New Run
        </button>
      </div>

      {/* Stats strip */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        <StatCard
          label="Active Runs"
          value={activeRuns}
          color={activeRuns > 0 ? C.orange : C.muted}
        />
        <StatCard
          label="Units This Month"
          value={unitsThisMonth}
          color={C.green}
        />
        <StatCard label="Total Runs" value={runs.length} color={C.blue} />
        <StatCard
          label="Avg Yield"
          value={avgYield ? `${avgYield}%` : "—"}
          color={
            avgYield
              ? parseFloat(avgYield) >= 90
                ? C.accent
                : C.gold
              : C.muted
          }
        />
      </div>

      {/* In-progress alert */}
      {activeRuns > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: C.lightOrange,
            border: `1px solid ${C.orange}`,
            borderRadius: 2,
            marginBottom: 20,
            fontSize: 13,
            color: C.orange,
            fontWeight: 600,
          }}
        >
          ⚙️ {activeRuns} run{activeRuns > 1 ? "s" : ""} currently in progress
        </div>
      )}

      {/* Filter + refresh bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {[
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" },
            { key: "cancelled", label: "Cancelled" },
            { key: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 16px",
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: FONTS.body,
                transition: "all 0.15s",
                backgroundColor: filter === f.key ? C.green : C.white,
                color: filter === f.key ? C.white : C.muted,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
          {filtered.length} run{filtered.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={fetchAll}
          style={{
            ...makeBtn("transparent", C.muted),
            border: `1px solid ${C.border}`,
            padding: "8px 16px",
            fontSize: 11,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Card grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: C.muted }}>
          Loading production runs…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            border: `1px dashed ${C.border}`,
            borderRadius: 2,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              marginBottom: 8,
            }}
          >
            No production runs found
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
            {filter === "active"
              ? "No active runs. Create one to get started."
              : `No ${filter} runs.`}
          </div>
          {filter === "active" && (
            <button onClick={() => setShowCreate(true)} style={makeBtn(C.mid)}>
              + Create First Run
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              batches={batches}
              onStart={handleStart}
              onComplete={(r) => setCompleteTarget(r)}
              onCancel={handleCancel}
              onViewDetails={(r) => setDetailTarget(r)}
            />
          ))}
        </div>
      )}

      {/* Create form slide-in */}
      {showCreate && (
        <>
          <div
            onClick={() => setShowCreate(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 999,
            }}
          />
          <CreateRunForm
            batches={batches}
            inventoryItems={inventoryItems}
            existingRuns={runs}
            tenantId={tenantId}
            onSave={handleSaveNew}
            onCancel={() => setShowCreate(false)}
          />
        </>
      )}

      {/* Complete modal */}
      {completeTarget && (
        <CompleteRunModal
          run={completeTarget}
          runInputs={runInputsMap[completeTarget.id] || []}
          inventoryItems={inventoryItems}
          tenantId={tenantId}
          onConfirm={handleComplete}
          onCancel={() => setCompleteTarget(null)}
        />
      )}

      {/* Details modal */}
      {detailTarget && (
        <DetailsModal
          run={detailTarget}
          batches={batches}
          runInputs={runInputsMap[detailTarget.id] || []}
          inventoryItems={inventoryItems}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}
