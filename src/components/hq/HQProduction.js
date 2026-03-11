// src/components/hq/HQProduction.js v1.1
// v1.1 — Schema fix: aligned to real DB columns
//   production_runs: id, batch_id, run_number, status, planned_units,
//     actual_units, started_at, completed_at, notes, tenant_id, created_at
//   production_run_inputs: id, run_id, item_id, quantity_planned, quantity_actual, notes
//   yield_pct: calculated client-side (actual/planned × 100) — not a DB column
// v1.0 — WP-L: Production Module

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  white: "#fff",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  error: "#c0392b",
  red: "#e74c3c",
  blue: "#2c4a6e",
  purple: "#6c3483",
  lightPurple: "#f5eef8",
  orange: "#d4680a",
  lightOrange: "#fff3e8",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  padding: "20px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
};
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background:
    v === "primary" ? C.green : v === "danger" ? C.red : "transparent",
  color: v === "primary" || v === "danger" ? C.white : C.mid,
  border: v === "primary" || v === "danger" ? "none" : `1px solid ${C.mid}`,
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
const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "4px",
  fontFamily: F.body,
};
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: C.muted,
  borderBottom: `2px solid ${C.border}`,
  fontWeight: 500,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${C.border}`,
  color: C.text,
  verticalAlign: "middle",
};

const FORMAT_BOM = {
  "1ml_cart": {
    label: "1ml Cartridge (510 Thread)",
    distillate_ml: 1.0,
    terpene_ratio: 0.1,
    format_short: "1ml Cart",
  },
  "2ml_pen": {
    label: "2ml Disposable Pen (All-in-One)",
    distillate_ml: 2.0,
    terpene_ratio: 0.1,
    format_short: "2ml Pen",
  },
};

const STRAIN_OPTIONS = [
  "Pineapple Express",
  "Gelato #41",
  "Cinnamon Kush Cake",
  "Sweet Watermelon",
  "ZKZ",
  "Wedding Cake",
  "Peaches & Cream",
  "Purple Punch",
  "Mimosa",
  "RNTZ",
  "Blue Zushi",
  "MAC",
  "Pear Jam",
  "Melon Lychee",
  "Tutti Frutti",
  "Purple Crack",
  "Lemonhead+",
  "Sherblato+",
];

function genRunNumber(strain, format) {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const sc = strain
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase();
  const fc = format === "1ml_cart" ? "1ML" : "2ML";
  return `PR-${y}${m}${day}-${sc}-${fc}`;
}

function calcYield(actual, planned) {
  if (!planned || planned === 0) return null;
  return +((actual / planned) * 100).toFixed(1);
}

function StatusBadge({ status, yieldPct }) {
  let bg, color, label;
  if (status === "completed" && yieldPct !== null && yieldPct < 95) {
    bg = "#fff3e8";
    color = C.orange;
    label = "Yield Flagged";
  } else if (status === "completed") {
    bg = "#d4edda";
    color = C.green;
    label = "Completed";
  } else if (status === "in_progress") {
    bg = "#fff3e8";
    color = C.orange;
    label = "In Progress";
  } else {
    bg = C.warm;
    color = C.muted;
    label = status || "Draft";
  }
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "2px",
        background: bg,
        color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 600,
        fontFamily: F.body,
      }}
    >
      {label}
    </span>
  );
}

function StockGauge({ label, available, needed, unit, color = C.accent }) {
  const pct = needed > 0 ? Math.min((available / needed) * 100, 100) : 100;
  const ok = available >= needed;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontSize: "12px", fontFamily: F.body, color: C.text }}>
          {label}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontFamily: F.body,
            fontWeight: 600,
            color: ok ? C.green : C.red,
          }}
        >
          {ok ? "✓" : "✕"}{" "}
          {typeof available === "number" ? available.toFixed(2) : available}
          {unit} available
          {needed > 0 && (
            <span style={{ color: C.muted, fontWeight: 400 }}>
              {" "}
              / {needed}
              {unit} needed
            </span>
          )}
        </span>
      </div>
      <div
        style={{
          height: "6px",
          background: C.border,
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: ok ? color : C.red,
            borderRadius: "3px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function HQProduction() {
  const [subTab, setSubTab] = useState("overview");
  const [items, setItems] = useState([]);
  const [runs, setRuns] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsR, runsR, partnersR] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("production_runs")
          .select(
            `
            id, batch_id, run_number, status, planned_units, actual_units,
            started_at, completed_at, notes, created_at,
            batches ( batch_number, product_name, strain, product_type, volume ),
            production_run_inputs (
              id, run_id, item_id, quantity_planned, quantity_actual, notes,
              inventory_items ( name, sku, unit, category )
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("wholesale_partners")
          .select("id, name, contact_name")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (itemsR.error) throw itemsR.error;
      if (runsR.error) throw runsR.error;

      setItems(itemsR.data || []);
      setRuns(runsR.data || []);
      setPartners(partnersR.data || []);
    } catch (err) {
      console.error("[HQProduction] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const SUB_TABS = [
    { id: "overview", label: "Overview", icon: "◎" },
    { id: "new-run", label: "New Production Run", icon: "⊕" },
    { id: "history", label: "History", icon: "📋" },
    { id: "allocate", label: "Allocate Stock", icon: "→" },
  ];

  if (error) {
    return (
      <div
        style={{
          ...sCard,
          borderLeft: `3px solid ${C.error}`,
          margin: "20px 0",
        }}
      >
        <div style={sLabel}>Error</div>
        <p style={{ fontSize: "13px", color: C.error, margin: "8px 0 0" }}>
          {error}
        </p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "8px 16px",
              background: subTab === t.id ? C.green : C.white,
              color: subTab === t.id ? C.white : C.muted,
              border: `1px solid ${subTab === t.id ? C.green : C.border}`,
              borderRadius: "2px",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: F.body,
              fontWeight: subTab === t.id ? 600 : 400,
              transition: "all 0.15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>◎</div>
          Loading production data...
        </div>
      ) : (
        <>
          {subTab === "overview" && <OverviewPanel items={items} runs={runs} />}
          {subTab === "new-run" && (
            <NewRunPanel
              items={items}
              onComplete={() => {
                fetchAll();
                setSubTab("history");
              }}
            />
          )}
          {subTab === "history" && (
            <HistoryPanel runs={runs} onRefresh={fetchAll} />
          )}
          {subTab === "allocate" && (
            <AllocatePanel
              items={items}
              partners={partners}
              onRefresh={fetchAll}
            />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewPanel({ items, runs }) {
  const distillate = items.filter(
    (i) => i.category === "raw_material" && i.unit === "ml",
  );
  const terpenes = items.filter((i) => i.category === "terpene");
  const hardware = items.filter((i) => i.category === "hardware");
  const finished = items.filter((i) => i.category === "finished_product");

  const totalDistillate = distillate.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );
  const totalTerpenes = terpenes.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );
  const totalHardware = hardware.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );
  const totalFinished = finished.reduce(
    (s, i) => s + parseFloat(i.quantity_on_hand || 0),
    0,
  );

  const capacity1ml = Math.floor(totalDistillate / 1.0);
  const capacity2ml = Math.floor(totalDistillate / 2.0);

  const now = new Date();
  const monthRuns = runs.filter((r) => {
    const d = new Date(r.created_at);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const monthUnits = monthRuns.reduce(
    (s, r) => s + (r.actual_units || r.planned_units || 0),
    0,
  );

  const yieldsArr = runs
    .filter((r) => r.actual_units && r.planned_units)
    .map((r) => calcYield(r.actual_units, r.planned_units))
    .filter((y) => y !== null);
  const avgYield =
    yieldsArr.length > 0
      ? (yieldsArr.reduce((s, y) => s + y, 0) / yieldsArr.length).toFixed(1)
      : null;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      {distillate.length === 0 && (
        <div
          style={{
            ...sCard,
            borderLeft: `4px solid ${C.orange}`,
            background: C.lightOrange,
          }}
        >
          <div style={{ ...sLabel, color: C.orange }}>
            ⚠ No Distillate in Inventory
          </div>
          <p
            style={{
              fontSize: "13px",
              color: C.text,
              margin: "8px 0 4px",
              fontFamily: F.body,
            }}
          >
            Distillate must be added as a raw_material inventory item (unit: ml)
            before production runs can begin.
          </p>
          <pre
            style={{
              fontSize: "11px",
              background: "#1a1a2e",
              color: "#52b788",
              padding: "10px 14px",
              borderRadius: "2px",
              margin: "8px 0 0",
              overflowX: "auto",
              fontFamily: "monospace",
            }}
          >{`INSERT INTO inventory_items (sku, name, category, unit, quantity_on_hand, cost_price, is_active)
VALUES ('RM-DIST-D9', 'D9 Distillate', 'raw_material', 'ml', 0, 0, true);`}</pre>
          <p
            style={{
              fontSize: "11px",
              color: C.muted,
              margin: "6px 0 0",
              fontFamily: F.body,
            }}
          >
            Then record a purchase_in movement in StockControl → Movements to
            set your opening balance.
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
          gap: "14px",
        }}
      >
        {[
          {
            label: "Distillate",
            value: `${totalDistillate.toFixed(1)}ml`,
            sub: `${distillate.length} SKU`,
            color: C.blue,
          },
          {
            label: "Terpenes",
            value: `${totalTerpenes.toFixed(1)}g`,
            sub: `${terpenes.length} strains`,
            color: C.purple,
          },
          {
            label: "Hardware",
            value: totalHardware.toLocaleString(),
            sub: `${hardware.length} types`,
            color: C.gold,
          },
          {
            label: "Finished Stock",
            value: totalFinished.toLocaleString(),
            sub: "units ready",
            color: C.accent,
          },
          {
            label: "Capacity (1ml)",
            value: capacity1ml.toLocaleString(),
            sub: "carts possible",
            color: C.green,
          },
          {
            label: "Capacity (2ml)",
            value: capacity2ml.toLocaleString(),
            sub: "pens possible",
            color: C.mid,
          },
          {
            label: "Runs (Month)",
            value: monthRuns.length,
            sub: `${monthUnits} units`,
            color: C.blue,
          },
          {
            label: "Avg Yield",
            value: avgYield ? `${avgYield}%` : "—",
            sub: "all runs",
            color: avgYield && parseFloat(avgYield) >= 95 ? C.accent : C.gold,
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              ...sCard,
              borderTop: `3px solid ${c.color}`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "6px",
                fontFamily: F.body,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 600,
                color: c.color,
                fontFamily: F.heading,
              }}
            >
              {c.value}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: C.muted,
                marginTop: "2px",
                fontFamily: F.body,
              }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        {[
          { label: "🧪 Distillate", data: distillate, unit: "ml", decimals: 1 },
          { label: "🌿 Terpenes", data: terpenes, unit: "g", decimals: 2 },
          { label: "⚙ Hardware", data: hardware, unit: "pcs", decimals: 0 },
          { label: "📦 Finished", data: finished, unit: "pcs", decimals: 0 },
        ].map(({ label, data, unit, decimals }) => (
          <div key={label} style={sCard}>
            <div style={sLabel}>{label}</div>
            {data.length === 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  color: C.muted,
                  marginTop: "8px",
                  fontFamily: F.body,
                }}
              >
                None in inventory
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  fontFamily: F.body,
                  marginTop: "10px",
                }}
              >
                <thead>
                  <tr>
                    <th style={sTh}>Name</th>
                    <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                    {label === "📦 Finished" && (
                      <th style={{ ...sTh, textAlign: "right" }}>Sell</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.map((i) => (
                    <tr key={i.id}>
                      <td style={sTd}>{i.name}</td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontWeight: 600,
                          color:
                            parseFloat(i.quantity_on_hand || 0) <= 0
                              ? C.red
                              : C.text,
                        }}
                      >
                        {decimals === 0
                          ? Math.floor(parseFloat(i.quantity_on_hand || 0))
                          : parseFloat(i.quantity_on_hand || 0).toFixed(
                              decimals,
                            )}
                        {unit === "pcs" ? "" : unit}
                      </td>
                      {label === "📦 Finished" && (
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            color:
                              parseFloat(i.sell_price || 0) > 0
                                ? C.text
                                : C.red,
                          }}
                        >
                          {parseFloat(i.sell_price || 0) > 0
                            ? `R${parseFloat(i.sell_price).toFixed(0)}`
                            : "R0 ⚠"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {runs.length > 0 && (
        <div style={sCard}>
          <div style={sLabel}>Recent Production Runs</div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: F.body,
              marginTop: "10px",
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Date</th>
                <th style={sTh}>Run #</th>
                <th style={sTh}>Product</th>
                <th style={{ ...sTh, textAlign: "right" }}>Planned</th>
                <th style={{ ...sTh, textAlign: "right" }}>Actual</th>
                <th style={{ ...sTh, textAlign: "right" }}>Yield</th>
                <th style={sTh}>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 8).map((r) => {
                const yp =
                  r.actual_units && r.planned_units
                    ? calcYield(r.actual_units, r.planned_units)
                    : null;
                return (
                  <tr key={r.id}>
                    <td style={sTd}>
                      {new Date(r.created_at).toLocaleDateString("en-ZA")}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        fontFamily: "monospace",
                        fontSize: "11px",
                        color: C.muted,
                      }}
                    >
                      {r.run_number || "—"}
                    </td>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      {r.batches?.product_name || r.batches?.strain || "—"}
                    </td>
                    <td style={{ ...sTd, textAlign: "right" }}>
                      {r.planned_units || "—"}
                    </td>
                    <td style={{ ...sTd, textAlign: "right", fontWeight: 600 }}>
                      {r.actual_units || "—"}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        color: yp && yp >= 95 ? C.accent : C.gold,
                      }}
                    >
                      {yp ? `${yp}%` : "—"}
                    </td>
                    <td style={sTd}>
                      <StatusBadge status={r.status} yieldPct={yp} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW RUN
// ═══════════════════════════════════════════════════════════════════════════════
function NewRunPanel({ items, onComplete }) {
  const [form, setForm] = useState({
    strain: "",
    format: "1ml_cart",
    planned_units: "",
    terpene_item_id: "",
    hardware_item_id: "",
    distillate_item_id: "",
    actual_units: "",
    notes: "",
    terpene_ratio_override: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setConfirmed(false);
  };

  const bom = FORMAT_BOM[form.format] || FORMAT_BOM["1ml_cart"];
  const planned = parseInt(form.planned_units) || 0;
  const terpeneRatio =
    parseFloat(form.terpene_ratio_override) || bom.terpene_ratio;

  const distillateNeeded = +(planned * bom.distillate_ml).toFixed(2);
  const terpeneNeeded = +(planned * bom.distillate_ml * terpeneRatio).toFixed(
    2,
  );
  const hardwareNeeded = planned;

  const distillateItems = items.filter(
    (i) => i.category === "raw_material" && i.unit === "ml",
  );
  const terpeneItems = items.filter((i) => i.category === "terpene");
  const hardwareItems = items.filter((i) => i.category === "hardware");

  const selDist = distillateItems.find((i) => i.id === form.distillate_item_id);
  const selTerp = terpeneItems.find((i) => i.id === form.terpene_item_id);
  const selHw = hardwareItems.find((i) => i.id === form.hardware_item_id);

  const distAvail = parseFloat(selDist?.quantity_on_hand || 0);
  const terpAvail = parseFloat(selTerp?.quantity_on_hand || 0);
  const hwAvail = parseFloat(selHw?.quantity_on_hand || 0);

  const canRun =
    planned > 0 &&
    form.strain &&
    form.distillate_item_id &&
    distAvail >= distillateNeeded &&
    form.terpene_item_id &&
    terpAvail >= terpeneNeeded &&
    form.hardware_item_id &&
    hwAvail >= hardwareNeeded;

  const distCost = selDist
    ? parseFloat(selDist.cost_price || 0) * distillateNeeded
    : 0;
  const terpCost = selTerp
    ? parseFloat(selTerp.cost_price || 0) * terpeneNeeded
    : 0;
  const hwCost = selHw ? parseFloat(selHw.cost_price || 0) * hardwareNeeded : 0;
  const totalCost = distCost + terpCost + hwCost;
  const costPerUnit = planned > 0 ? (totalCost / planned).toFixed(2) : 0;

  const finalActual = parseInt(form.actual_units) || planned;
  const yieldPct = calcYield(finalActual, planned);
  const yieldFlagged = yieldPct !== null && yieldPct < 95;

  const strainSlug = form.strain.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const finishedName = form.strain ? `${form.strain} ${bom.format_short}` : "";
  const finishedSku = `FP-${strainSlug}-${form.format === "1ml_cart" ? "1ml" : "2ml"}`;
  const runNumber = form.strain ? genRunNumber(form.strain, form.format) : "";

  const handleConfirm = async () => {
    if (!canRun) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();

      // 1. Create batch
      const { data: batch, error: batchErr } = await supabase
        .from("batches")
        .insert({
          batch_number: runNumber,
          product_name: finishedName,
          product_type: bom.format_short,
          strain: form.strain,
          volume: `${bom.distillate_ml}ml`,
          production_date: now.split("T")[0],
          units_produced: finalActual,
          status: "active",
          is_archived: false,
        })
        .select()
        .single();
      if (batchErr) throw batchErr;

      // 2. Create production_run
      const { data: run, error: runErr } = await supabase
        .from("production_runs")
        .insert({
          batch_id: batch.id,
          run_number: runNumber,
          status: "completed",
          planned_units: planned,
          actual_units: finalActual,
          started_at: now,
          completed_at: now,
          notes: form.notes || null,
        })
        .select()
        .single();
      if (runErr) throw runErr;

      // 3. Log inputs (run_id FK, not production_run_id)
      await supabase.from("production_run_inputs").insert([
        {
          run_id: run.id,
          item_id: form.distillate_item_id,
          quantity_planned: distillateNeeded,
          quantity_actual: distillateNeeded,
          notes: "Distillate",
        },
        {
          run_id: run.id,
          item_id: form.terpene_item_id,
          quantity_planned: terpeneNeeded,
          quantity_actual: terpeneNeeded,
          notes: "Terpene",
        },
        {
          run_id: run.id,
          item_id: form.hardware_item_id,
          quantity_planned: hardwareNeeded,
          quantity_actual: hardwareNeeded,
          notes: "Hardware",
        },
      ]);

      // 4. Deduct raw materials
      await supabase.from("stock_movements").insert([
        {
          item_id: form.distillate_item_id,
          quantity: -distillateNeeded,
          movement_type: "production_out",
          reference: runNumber,
          notes: `Run ${runNumber}: distillate`,
        },
        {
          item_id: form.terpene_item_id,
          quantity: -terpeneNeeded,
          movement_type: "production_out",
          reference: runNumber,
          notes: `Run ${runNumber}: ${selTerp?.name}`,
        },
        {
          item_id: form.hardware_item_id,
          quantity: -hardwareNeeded,
          movement_type: "production_out",
          reference: runNumber,
          notes: `Run ${runNumber}: ${selHw?.name}`,
        },
      ]);

      // 5. Update raw material quantities
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: distAvail - distillateNeeded })
        .eq("id", form.distillate_item_id);
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: terpAvail - terpeneNeeded })
        .eq("id", form.terpene_item_id);
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: hwAvail - hardwareNeeded })
        .eq("id", form.hardware_item_id);

      // 6. Find or create finished product inventory item
      const existingFinished = items.find(
        (i) => i.category === "finished_product" && i.name === finishedName,
      );
      let finishedItemId;
      if (existingFinished) {
        finishedItemId = existingFinished.id;
      } else {
        const { data: newItem, error: itemErr } = await supabase
          .from("inventory_items")
          .insert({
            sku: finishedSku,
            name: finishedName,
            category: "finished_product",
            unit: "pcs",
            quantity_on_hand: 0,
            cost_price: parseFloat(costPerUnit) || 0,
            sell_price: 0,
            is_active: true,
            description: `Produced via run ${runNumber}`,
          })
          .select()
          .single();
        if (itemErr) throw itemErr;
        finishedItemId = newItem.id;
      }

      // 7. Add finished goods movement
      await supabase.from("stock_movements").insert({
        item_id: finishedItemId,
        quantity: finalActual,
        movement_type: "production_in",
        reference: runNumber,
        notes: `Batch ${runNumber}: ${finishedName}`,
      });

      // 8. Update finished product qty + cost
      const currentQty = parseFloat(existingFinished?.quantity_on_hand || 0);
      await supabase
        .from("inventory_items")
        .update({
          quantity_on_hand: currentQty + finalActual,
          cost_price: parseFloat(costPerUnit) || 0,
        })
        .eq("id", finishedItemId);

      onComplete();
    } catch (err) {
      console.error("[HQProduction] Run error:", err);
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fLabel = (text, hint) => (
    <label
      style={{
        fontSize: "11px",
        color: C.muted,
        display: "block",
        marginBottom: "4px",
        fontFamily: F.body,
      }}
    >
      {text}
      {hint && (
        <span style={{ color: C.accent, marginLeft: "6px", fontSize: "9px" }}>
          {hint}
        </span>
      )}
    </label>
  );

  return (
    <div style={{ display: "grid", gap: "20px", maxWidth: "800px" }}>
      <div style={{ ...sCard, borderLeft: `4px solid ${C.accent}` }}>
        <div style={{ ...sLabel, marginBottom: "16px" }}>
          Step 1 — Define Run
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            {fLabel("Strain *")}
            <select
              style={sSelect}
              value={form.strain}
              onChange={(e) => set("strain", e.target.value)}
            >
              <option value="">— Select Strain —</option>
              {STRAIN_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            {fLabel("Format *")}
            <select
              style={sSelect}
              value={form.format}
              onChange={(e) => set("format", e.target.value)}
            >
              {Object.entries(FORMAT_BOM).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            {fLabel("Units to Produce *")}
            <input
              style={sInput}
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 50"
              value={form.planned_units}
              onChange={(e) => set("planned_units", e.target.value)}
            />
          </div>
          <div>
            {fLabel(
              "Terpene % g/ml",
              `default ${(bom.terpene_ratio * 100).toFixed(0)}%`,
            )}
            <input
              style={sInput}
              type="number"
              step="0.01"
              min="0.01"
              max="0.30"
              placeholder={`${(bom.terpene_ratio * 100).toFixed(0)}% (default)`}
              value={form.terpene_ratio_override}
              onChange={(e) => set("terpene_ratio_override", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ ...sCard, borderLeft: `4px solid ${C.blue}` }}>
        <div style={{ ...sLabel, marginBottom: "16px" }}>
          Step 2 — Select Materials
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            {fLabel("Distillate *")}
            <select
              style={sSelect}
              value={form.distillate_item_id}
              onChange={(e) => set("distillate_item_id", e.target.value)}
            >
              <option value="">— Select —</option>
              {distillateItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({parseFloat(i.quantity_on_hand || 0).toFixed(1)}ml)
                </option>
              ))}
            </select>
            {distillateItems.length === 0 && (
              <p
                style={{
                  fontSize: "11px",
                  color: C.red,
                  margin: "4px 0 0",
                  fontFamily: F.body,
                }}
              >
                Add distillate via StockControl first
              </p>
            )}
          </div>
          <div>
            {fLabel("Terpene *")}
            <select
              style={sSelect}
              value={form.terpene_item_id}
              onChange={(e) => set("terpene_item_id", e.target.value)}
            >
              <option value="">— Select —</option>
              {terpeneItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({parseFloat(i.quantity_on_hand || 0).toFixed(2)}g)
                </option>
              ))}
            </select>
          </div>
          <div>
            {fLabel("Hardware *")}
            <select
              style={sSelect}
              value={form.hardware_item_id}
              onChange={(e) => set("hardware_item_id", e.target.value)}
            >
              <option value="">— Select —</option>
              {hardwareItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({Math.floor(parseFloat(i.quantity_on_hand || 0))}{" "}
                  pcs)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {planned > 0 &&
        form.distillate_item_id &&
        form.terpene_item_id &&
        form.hardware_item_id && (
          <div
            style={{
              ...sCard,
              borderLeft: `4px solid ${canRun ? C.accent : C.red}`,
              background: canRun ? "#f0faf5" : "#fff5f5",
            }}
          >
            <div
              style={{
                ...sLabel,
                color: canRun ? C.green : C.red,
                marginBottom: "16px",
              }}
            >
              Step 3 — Bill of Materials{" "}
              {canRun
                ? "✓ All materials available"
                : "✕ Insufficient materials"}
            </div>
            <StockGauge
              label="Distillate"
              available={distAvail}
              needed={distillateNeeded}
              unit="ml"
              color={C.blue}
            />
            <StockGauge
              label={`Terpene (${selTerp?.name || "—"})`}
              available={terpAvail}
              needed={terpeneNeeded}
              unit="g"
              color={C.purple}
            />
            <StockGauge
              label={`Hardware (${selHw?.name || "—"})`}
              available={hwAvail}
              needed={hardwareNeeded}
              unit=" pcs"
              color={C.gold}
            />
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                paddingTop: "14px",
                marginTop: "8px",
                display: "flex",
                gap: "32px",
                flexWrap: "wrap",
              }}
            >
              {[
                ["Output", `${planned} × ${finishedName || "—"}`, C.green],
                ["Cost / Unit", `R${costPerUnit}`, C.gold],
                ["Total Material Cost", `R${totalCost.toFixed(2)}`, C.blue],
                ["Run Number", runNumber, C.muted],
              ].map(([label, val, color]) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: C.muted,
                      marginBottom: "4px",
                      fontFamily: F.body,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: label === "Run Number" ? "13px" : "18px",
                      fontWeight: 600,
                      fontFamily:
                        label === "Run Number" ? "monospace" : F.heading,
                      color,
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {canRun && (
        <div style={{ ...sCard, borderLeft: `4px solid ${C.gold}` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Step 4 — Confirm & Log
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              {fLabel("Actual Units Filled", `planned: ${planned}`)}
              <input
                style={sInput}
                type="number"
                min="1"
                step="1"
                placeholder={String(planned)}
                value={form.actual_units}
                onChange={(e) => set("actual_units", e.target.value)}
              />
              {form.actual_units && yieldFlagged && (
                <p
                  style={{
                    fontSize: "11px",
                    color: C.orange,
                    margin: "4px 0 0",
                    fontFamily: F.body,
                  }}
                >
                  ⚠ Yield {yieldPct}% — below 95% threshold
                </p>
              )}
            </div>
            <div>
              {fLabel("Notes")}
              <input
                style={sInput}
                placeholder="Optional batch notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          {!confirmed && (
            <div
              style={{
                padding: "14px 16px",
                background: C.warm,
                borderRadius: "2px",
                marginBottom: "14px",
                fontSize: "13px",
                fontFamily: F.body,
                color: C.text,
              }}
            >
              <strong>This will:</strong>
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: "18px",
                  lineHeight: "1.9",
                }}
              >
                <li>
                  Deduct <strong>{distillateNeeded}ml</strong> from{" "}
                  {selDist?.name}
                </li>
                <li>
                  Deduct <strong>{terpeneNeeded}g</strong> from {selTerp?.name}
                </li>
                <li>
                  Deduct <strong>{hardwareNeeded} pcs</strong> from{" "}
                  {selHw?.name}
                </li>
                <li>
                  Add <strong>{finalActual} units</strong> of {finishedName} to
                  finished stock
                </li>
                <li>Create batch record + production run log</li>
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            {!confirmed ? (
              <button onClick={() => setConfirmed(true)} style={sBtn()}>
                Review & Confirm →
              </button>
            ) : (
              <>
                <button
                  onClick={() => setConfirmed(false)}
                  style={sBtn("outline")}
                >
                  ← Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  style={{
                    ...sBtn(),
                    background: saving ? C.muted : C.green,
                    minWidth: "180px",
                  }}
                >
                  {saving ? "Processing..." : "✓ Confirm Production Run"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
function HistoryPanel({ runs, onRefresh }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "11px", color: C.muted, fontFamily: F.body }}>
          {runs.length} production runs
        </div>
        <button
          onClick={onRefresh}
          style={{ ...sBtn("outline"), fontSize: "9px", padding: "6px 12px" }}
        >
          ↻ Refresh
        </button>
      </div>

      {runs.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: C.muted,
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚗</div>
          <p style={{ fontFamily: F.body, fontSize: "14px" }}>
            No production runs yet.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {runs.map((run) => {
            const yp =
              run.actual_units && run.planned_units
                ? calcYield(run.actual_units, run.planned_units)
                : null;
            const isOpen = expanded === run.id;
            const productLabel =
              run.batches?.product_name ||
              run.batches?.strain ||
              run.run_number ||
              "Production Run";
            return (
              <div
                key={run.id}
                style={{
                  ...sCard,
                  borderLeft: `3px solid ${yp && yp < 95 ? C.orange : C.accent}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        fontFamily: F.heading,
                        color: C.text,
                      }}
                    >
                      {productLabel}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: C.muted,
                        fontFamily: "monospace",
                        marginTop: "2px",
                      }}
                    >
                      {run.run_number || run.id?.slice(0, 8)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <StatusBadge status={run.status} yieldPct={yp} />
                    <span
                      style={{
                        fontSize: "11px",
                        color: C.muted,
                        fontFamily: F.body,
                      }}
                    >
                      {new Date(run.created_at).toLocaleDateString("en-ZA")}
                    </span>
                    <button
                      onClick={() => setExpanded(isOpen ? null : run.id)}
                      style={{
                        ...sBtn("outline"),
                        padding: "4px 10px",
                        fontSize: "9px",
                      }}
                    >
                      {isOpen ? "▲ Hide" : "▼ Details"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "32px",
                    marginTop: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    ["Planned", run.planned_units || "—", "units"],
                    ["Actual", run.actual_units || "—", "units"],
                    ["Yield", yp ? `${yp}%` : "—", ""],
                  ].map(([label, val, unit]) => (
                    <div key={label}>
                      <div
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: C.muted,
                          fontFamily: F.body,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: 600,
                          fontFamily: F.heading,
                          color:
                            label === "Yield" && yp && yp < 95
                              ? C.orange
                              : C.text,
                        }}
                      >
                        {val}
                        <span
                          style={{
                            fontSize: "12px",
                            color: C.muted,
                            marginLeft: "2px",
                          }}
                        >
                          {unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {yp !== null && yp < 95 && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 12px",
                      background: C.lightOrange,
                      borderRadius: "2px",
                      fontSize: "12px",
                      color: C.orange,
                      fontFamily: F.body,
                    }}
                  >
                    ⚠ Yield {yp}% — below 95% threshold. Review for waste or
                    filling losses.
                  </div>
                )}

                {isOpen && (
                  <div
                    style={{
                      marginTop: "14px",
                      borderTop: `1px solid ${C.border}`,
                      paddingTop: "14px",
                    }}
                  >
                    {run.production_run_inputs?.length > 0 && (
                      <>
                        <div
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: C.muted,
                            fontFamily: F.body,
                            marginBottom: "10px",
                          }}
                        >
                          Materials Consumed
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(180px, 1fr))",
                            gap: "10px",
                            marginBottom: "12px",
                          }}
                        >
                          {run.production_run_inputs.map((inp) => (
                            <div
                              key={inp.id}
                              style={{
                                padding: "10px 14px",
                                background: C.warm,
                                borderRadius: "2px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "9px",
                                  letterSpacing: "0.2em",
                                  textTransform: "uppercase",
                                  color: C.muted,
                                  fontFamily: F.body,
                                }}
                              >
                                {inp.inventory_items?.name || "Material"}
                              </div>
                              <div
                                style={{
                                  fontSize: "16px",
                                  fontWeight: 600,
                                  fontFamily: F.heading,
                                  color: C.text,
                                  marginTop: "4px",
                                }}
                              >
                                {parseFloat(
                                  inp.quantity_actual ||
                                    inp.quantity_planned ||
                                    0,
                                ).toFixed(2)}
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: C.muted,
                                    marginLeft: "3px",
                                  }}
                                >
                                  {inp.inventory_items?.unit || ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {run.notes && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: C.muted,
                          fontStyle: "italic",
                          margin: 0,
                          fontFamily: F.body,
                        }}
                      >
                        {run.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOCATE
// ═══════════════════════════════════════════════════════════════════════════════
function AllocatePanel({ items, partners, onRefresh }) {
  const finished = items.filter(
    (i) =>
      i.category === "finished_product" &&
      parseFloat(i.quantity_on_hand || 0) > 0,
  );
  const [form, setForm] = useState({
    item_id: "",
    quantity: "",
    channel: "wholesale",
    partner_id: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const selItem = finished.find((i) => i.id === form.item_id);
  const available = parseFloat(selItem?.quantity_on_hand || 0);
  const qty = parseInt(form.quantity) || 0;
  const valid = qty > 0 && qty <= available && form.item_id;

  const CHANNELS = [
    {
      id: "wholesale",
      label: "Wholesale",
      icon: "🏪",
      desc: "Allocate to a retail partner",
    },
    {
      id: "samples",
      label: "Samples",
      icon: "🎁",
      desc: "Internal / giveaway units",
    },
    {
      id: "write_off",
      label: "Write Off",
      icon: "✕",
      desc: "Damaged or destroyed units",
    },
  ];

  const handleAllocate = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const partner = partners.find((p) => p.id === form.partner_id);
      const ref =
        form.channel === "wholesale" && partner ? partner.name : form.channel;

      await supabase.from("stock_movements").insert({
        item_id: form.item_id,
        quantity: -qty,
        movement_type: "sale_out",
        reference: ref,
        notes: form.notes || `Allocated to ${ref}`,
      });

      await supabase
        .from("inventory_items")
        .update({
          quantity_on_hand: available - qty,
        })
        .eq("id", form.item_id);

      setForm({
        item_id: "",
        quantity: "",
        channel: "wholesale",
        partner_id: "",
        notes: "",
      });
      onRefresh();
      alert(`✓ ${qty} units of ${selItem.name} allocated to ${ref}`);
    } catch (err) {
      console.error("[HQProduction] Allocate error:", err);
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            onClick={() => set("channel", ch.id)}
            style={{
              ...sCard,
              cursor: "pointer",
              borderLeft: `4px solid ${form.channel === ch.id ? C.green : C.border}`,
              background: form.channel === ch.id ? "#f0faf5" : C.white,
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>
              {ch.icon}
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: F.body,
                color: C.text,
              }}
            >
              {ch.label}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: C.muted,
                fontFamily: F.body,
                marginTop: "3px",
              }}
            >
              {ch.desc}
            </div>
          </div>
        ))}
      </div>

      <div style={sCard}>
        <div style={sLabel}>📦 Available Finished Stock</div>
        {finished.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: C.muted,
              marginTop: "10px",
              fontFamily: F.body,
            }}
          >
            No finished products in stock. Run a production batch first.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: F.body,
              marginTop: "10px",
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Product</th>
                <th style={sTh}>SKU</th>
                <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                <th style={{ ...sTh, textAlign: "right" }}>Sell Price</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => set("item_id", i.id)}
                  style={{
                    cursor: "pointer",
                    background:
                      form.item_id === i.id ? "#f0faf5" : "transparent",
                  }}
                >
                  <td style={{ ...sTd, fontWeight: 500 }}>
                    {form.item_id === i.id && (
                      <span style={{ color: C.accent, marginRight: "6px" }}>
                        ►
                      </span>
                    )}
                    {i.name}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      fontFamily: "monospace",
                      fontSize: "11px",
                      color: C.muted,
                    }}
                  >
                    {i.sku}
                  </td>
                  <td
                    style={{
                      ...sTd,
                      textAlign: "right",
                      fontWeight: 600,
                      color: C.green,
                    }}
                  >
                    {Math.floor(parseFloat(i.quantity_on_hand || 0))} pcs
                  </td>
                  <td style={{ ...sTd, textAlign: "right" }}>
                    R{parseFloat(i.sell_price || 0).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form.item_id && (
        <div style={{ ...sCard, borderLeft: `4px solid ${C.gold}` }}>
          <div style={{ ...sLabel, marginBottom: "16px" }}>
            Allocate: {selItem?.name} — {Math.floor(available)} units available
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "11px",
                  color: C.muted,
                  display: "block",
                  marginBottom: "4px",
                  fontFamily: F.body,
                }}
              >
                Quantity *
              </label>
              <input
                style={sInput}
                type="number"
                min="1"
                max={Math.floor(available)}
                step="1"
                placeholder={`Max: ${Math.floor(available)}`}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
            {form.channel === "wholesale" && (
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: C.muted,
                    display: "block",
                    marginBottom: "4px",
                    fontFamily: F.body,
                  }}
                >
                  Wholesale Partner
                </label>
                <select
                  style={sSelect}
                  value={form.partner_id}
                  onChange={(e) => set("partner_id", e.target.value)}
                >
                  <option value="">— Select Partner —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                color: C.muted,
                display: "block",
                marginBottom: "4px",
                fontFamily: F.body,
              }}
            >
              Notes
            </label>
            <input
              style={sInput}
              placeholder="Delivery ref, order #, etc."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {qty > 0 && (
            <div
              style={{
                padding: "12px 14px",
                background: C.warm,
                borderRadius: "2px",
                marginBottom: "12px",
                fontSize: "12px",
                fontFamily: F.body,
                color: C.text,
              }}
            >
              <strong>
                {qty} × {selItem.name}
              </strong>{" "}
              → {CHANNELS.find((c) => c.id === form.channel)?.label}
              {form.channel === "wholesale" &&
                partners.find((p) => p.id === form.partner_id) && (
                  <span style={{ color: C.muted }}>
                    {" "}
                    · {partners.find((p) => p.id === form.partner_id).name}
                  </span>
                )}
              {qty > available && (
                <span
                  style={{ color: C.red, marginLeft: "8px", fontWeight: 600 }}
                >
                  ⚠ Exceeds stock
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleAllocate}
            disabled={saving || !valid}
            style={{ ...sBtn(), opacity: valid ? 1 : 0.5 }}
          >
            {saving ? "Recording..." : `✓ Allocate ${qty || "?"} Units`}
          </button>
        </div>
      )}

      <div
        style={{
          ...sCard,
          borderLeft: `3px solid ${C.accent}`,
          background: "#f0faf5",
        }}
      >
        <div style={sLabel}>🛍 Website Shop — Automatic</div>
        <p
          style={{
            fontSize: "12px",
            color: C.mid,
            margin: "6px 0 0",
            fontFamily: F.body,
            lineHeight: "1.7",
          }}
        >
          Finished products with <strong>sell_price &gt; R0</strong> and{" "}
          <strong>quantity &gt; 0</strong> are automatically live in the
          customer shop. Set sell prices in StockControl → Items → Edit.
        </p>
      </div>
    </div>
  );
}
