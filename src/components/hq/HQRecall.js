// src/components/hq/HQRecall.js
// WP-FNB S7 — Recall Readiness & Lot Traceability — v1.0
// Built: March 25, 2026
// Rules: RULE 0F (tenant_id), RULE 0G (useTenant inside),
//        WorkflowGuide first, InfoTooltip on key fields

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";

const C = {
  bg: "#F8F7F4",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  ink: "#1A1A18",
  inkMid: "#4A4740",
  inkLight: "#8A8680",
  accent: "#2D6A4F",
  accentBg: "#EBF5EF",
  amber: "#92400E",
  amberBg: "#FEF3C7",
  red: "#991B1B",
  redBg: "#FEF2F2",
  blue: "#1D4ED8",
  blueBg: "#EFF6FF",
  purple: "#5B21B6",
  purpleBg: "#F5F3FF",
};

const SEVERITY_CONFIG = {
  class_1: {
    label: "Class I",
    desc: "Reasonable probability of serious adverse health consequences or death",
    color: C.red,
    bg: C.redBg,
  },
  class_2: {
    label: "Class II",
    desc: "Remote probability of serious adverse health consequences",
    color: C.amber,
    bg: C.amberBg,
  },
  class_3: {
    label: "Class III",
    desc: "Unlikely to cause any adverse health consequences",
    color: C.blue,
    bg: C.blueBg,
  },
  investigation: {
    label: "Investigation",
    desc: "Under investigation — severity not yet determined",
    color: C.purple,
    bg: C.purpleBg,
  },
};

const TYPE_CONFIG = {
  mock_drill: { label: "Mock Drill", icon: "🎯", color: C.blue },
  live_recall: { label: "Live Recall", icon: "🚨", color: C.red },
  investigation: { label: "Investigation", icon: "🔍", color: C.amber },
};

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function genRef(type) {
  const prefix =
    type === "mock_drill" ? "MOCK" : type === "live_recall" ? "RC" : "INV";
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${ds}-${Math.floor(Math.random() * 900 + 100)}`;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function HQRecall() {
  const { tenantId } = useTenant(); // RULE 0G

  const [activeTab, setActiveTab] = useState("trace");
  const [recallEvents, setRecallEvents] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [productions, setProductions] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipeLines, setRecipeLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Trace state
  const [traceMode, setTraceMode] = useState("forward"); // forward | backward
  const [traceInput, setTraceInput] = useState("");
  const [traceResults, setTraceResults] = useState(null);
  const [tracing, setTracing] = useState(false);

  // Recall form
  const emptyRecall = {
    type: "mock_drill",
    trigger_type: "ingredient_lot",
    trigger_reference: "",
    reason: "",
    severity: "investigation",
    notes: "",
  };
  const [recallForm, setRecallForm] = useState(emptyRecall);
  const [showRecallForm, setShowRecallForm] = useState(false);
  const [activeRecall, setActiveRecall] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [recallRes, ingRes, prodRes, recipeRes, linesRes] =
        await Promise.all([
          supabase
            .from("recall_events")
            .select("*")
            .eq("tenant_id", tenantId) // RULE 0F
            .order("created_at", { ascending: false }),
          supabase
            .from("food_ingredients")
            .select("id, name, category")
            .or(`is_seeded.eq.true,tenant_id.eq.${tenantId}`)
            .order("name"),
          supabase
            .from("production_runs")
            .select(
              "id, batch_lot_number, recipe_name, started_at, actual_units, status, allergen_flags",
            )
            .eq("tenant_id", tenantId) // RULE 0F
            .not("batch_lot_number", "is", null)
            .order("started_at", { ascending: false }),
          supabase
            .from("food_recipes")
            .select("id, name, version, status")
            .eq("tenant_id", tenantId)
            .order("name"), // RULE 0F
          supabase
            .from("food_recipe_lines")
            .select("*")
            .in(
              "recipe_id",
              (
                await supabase
                  .from("food_recipes")
                  .select("id")
                  .eq("tenant_id", tenantId)
              ).data?.map((r) => r.id) || [],
            ),
        ]);
      if (recallRes.error) throw recallRes.error;
      setRecallEvents(recallRes.data || []);
      setIngredients(ingRes.data || []);
      setProductions(prodRes.data || []);
      setRecipes(recipeRes.data || []);
      setRecipeLines(linesRes.data || []);
    } catch (err) {
      showToast("Load failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── FORWARD TRACE: ingredient → recipes → production runs ─────────────────
  function runForwardTrace(ref) {
    if (!ref.trim()) return;
    setTracing(true);
    try {
      const q = ref.trim().toLowerCase();

      // Find matching ingredients
      const matchedIngredients = ingredients.filter(
        (i) => i.name.toLowerCase().includes(q) || i.id === ref.trim(),
      );

      // Find recipes that use those ingredients via recipe_lines
      const matchedIngIds = matchedIngredients.map((i) => i.id);
      const affectedLines = recipeLines.filter((l) =>
        matchedIngIds.includes(l.ingredient_id),
      );
      const affectedRecipeIds = [
        ...new Set(affectedLines.map((l) => l.recipe_id)),
      ];
      const affectedRecipes = recipes.filter((r) =>
        affectedRecipeIds.includes(r.id),
      );
      const affectedRecipeNames = affectedRecipes.map((r) => r.name);

      // Find production runs using those recipes
      const affectedProductions = productions.filter((p) =>
        affectedRecipeNames.some((name) =>
          (p.recipe_name || "").toLowerCase().includes(name.toLowerCase()),
        ),
      );

      // Also check direct lot number matches
      const directLotMatches = productions.filter((p) =>
        (p.batch_lot_number || "").toLowerCase().includes(q),
      );

      const allAffected = [
        ...new Set([...affectedProductions, ...directLotMatches]),
      ];

      setTraceResults({
        mode: "forward",
        query: ref,
        matchedIngredients,
        affectedRecipes,
        affectedLines,
        affectedProductions: allAffected,
        summary: `Found ${matchedIngredients.length} ingredient(s) → ${affectedRecipes.length} recipe(s) → ${allAffected.length} production batch(es)`,
      });
    } finally {
      setTracing(false);
    }
  }

  // ── BACKWARD TRACE: batch lot → recipe → ingredient lots ─────────────────
  function runBackwardTrace(ref) {
    if (!ref.trim()) return;
    setTracing(true);
    try {
      const q = ref.trim().toLowerCase();

      // Find matching production runs
      const matchedProductions = productions.filter(
        (p) =>
          (p.batch_lot_number || "").toLowerCase().includes(q) ||
          (p.recipe_name || "").toLowerCase().includes(q),
      );

      // Get recipes used
      const recipeNames = [
        ...new Set(
          matchedProductions.map((p) => p.recipe_name).filter(Boolean),
        ),
      ];
      const usedRecipes = recipes.filter((r) =>
        recipeNames.some((name) => r.name.toLowerCase() === name.toLowerCase()),
      );

      // Get ingredient lines for those recipes
      const usedRecipeIds = usedRecipes.map((r) => r.id);
      const usedLines = recipeLines.filter((l) =>
        usedRecipeIds.includes(l.recipe_id),
      );
      const usedIngredientIds = [
        ...new Set(usedLines.map((l) => l.ingredient_id)),
      ];
      const usedIngredients = ingredients.filter((i) =>
        usedIngredientIds.includes(i.id),
      );

      setTraceResults({
        mode: "backward",
        query: ref,
        matchedProductions,
        usedRecipes,
        usedLines,
        usedIngredients,
        summary: `Found ${matchedProductions.length} batch(es) → ${usedRecipes.length} recipe(s) → ${usedIngredients.length} ingredient(s) sourced`,
      });
    } finally {
      setTracing(false);
    }
  }

  // ── Raise recall event ─────────────────────────────────────────────────────
  async function handleRaiseRecall() {
    if (!recallForm.trigger_reference.trim()) {
      showToast("Trigger reference required", "error");
      return;
    }
    if (!recallForm.reason.trim()) {
      showToast("Reason required", "error");
      return;
    }
    setSaving(true);
    try {
      // Auto-compute affected batches from trace
      let affectedBatches = [];
      if (recallForm.trigger_type === "ingredient_lot") {
        const q = recallForm.trigger_reference.toLowerCase();
        const matchedIds = ingredients
          .filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.id === recallForm.trigger_reference,
          )
          .map((i) => i.id);
        const lines = recipeLines.filter((l) =>
          matchedIds.includes(l.ingredient_id),
        );
        const rIds = [...new Set(lines.map((l) => l.recipe_id))];
        const rNames = recipes
          .filter((r) => rIds.includes(r.id))
          .map((r) => r.name);
        affectedBatches = productions
          .filter((p) =>
            rNames.some((name) =>
              (p.recipe_name || "").toLowerCase().includes(name.toLowerCase()),
            ),
          )
          .map((p) => ({
            lot: p.batch_lot_number,
            recipe: p.recipe_name,
            units: p.actual_units,
            date: p.started_at,
          }));
      } else {
        const q = recallForm.trigger_reference.toLowerCase();
        affectedBatches = productions
          .filter((p) => (p.batch_lot_number || "").toLowerCase().includes(q))
          .map((p) => ({
            lot: p.batch_lot_number,
            recipe: p.recipe_name,
            units: p.actual_units,
            date: p.started_at,
          }));
      }

      const totalUnits = affectedBatches.reduce(
        (s, b) => s + (b.units || 0),
        0,
      );

      const { data, error } = await supabase
        .from("recall_events")
        .insert({
          tenant_id: tenantId, // RULE 0F
          reference: genRef(recallForm.type),
          type: recallForm.type,
          trigger_type: recallForm.trigger_type,
          trigger_reference: recallForm.trigger_reference,
          reason: recallForm.reason,
          severity: recallForm.severity,
          affected_batches: affectedBatches,
          affected_units_produced: totalUnits,
          notes: recallForm.notes || null,
          status: "open",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw error;

      // Write system_alert for live recalls
      if (recallForm.type === "live_recall") {
        await supabase.from("system_alerts").insert({
          tenant_id: tenantId,
          alert_type: "product_recall",
          severity: recallForm.severity === "class_1" ? "critical" : "warning",
          message: `RECALL INITIATED: ${recallForm.trigger_reference} — ${recallForm.reason}. ${affectedBatches.length} batch(es) affected.`,
          created_at: new Date().toISOString(),
        });
      }

      showToast(
        recallForm.type === "live_recall"
          ? "🚨 Live recall initiated — PlatformBar alert raised"
          : "🎯 Mock drill created",
      );
      setShowRecallForm(false);
      setRecallForm(emptyRecall);
      setActiveRecall(data);
      setActiveTab("events");
      fetchAll();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Close recall ───────────────────────────────────────────────────────────
  async function handleCloseRecall(id) {
    const { error } = await supabase
      .from("recall_events")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenantId); // RULE 0F
    if (error) {
      showToast("Close failed: " + error.message, "error");
      return;
    }
    showToast("Recall event closed");
    fetchAll();
  }

  // ── FSCA notification letter ───────────────────────────────────────────────
  function generateFSCALetter(event) {
    const today = new Date().toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const batches = (event.affected_batches || [])
      .map(
        (b) =>
          `  • ${b.lot || "—"} (${b.recipe || "—"}, ${b.units || 0} units, produced ${fmtDate(b.date)})`,
      )
      .join("\n");
    return `FOOD SAFETY RECALL NOTIFICATION
Reference: ${event.reference}
Date: ${today}

TO: Food Safety Control Authority (FSCA)

SUBJECT: ${event.type === "mock_drill" ? "[MOCK DRILL] " : ""}Product Recall Notification — ${event.trigger_reference}

Dear FSCA Commissioner,

We hereby notify you of a ${event.type === "live_recall" ? "voluntary product recall" : "mock recall drill"} initiated on ${fmtDate(event.created_at)}.

RECALL DETAILS:
Reference Number: ${event.reference}
Severity Classification: ${SEVERITY_CONFIG[event.severity]?.label || event.severity}
Trigger: ${event.trigger_type.replace(/_/g, " ")} — ${event.trigger_reference}
Reason: ${event.reason}

AFFECTED PRODUCTS (${(event.affected_batches || []).length} batch(es), ${event.affected_units_produced || 0} units total):
${batches || "  No affected batches identified"}

IMMEDIATE ACTIONS TAKEN:
1. Affected products identified and quarantined
2. Distribution chain notified
3. Root cause investigation initiated
4. FSCA notified within 24 hours of identification

We will provide further updates as the investigation progresses.

Yours sincerely,

[Authorised Representative]
[Company Name]
[Contact Details]

---
Generated by Protea Botanicals Platform — ${today}
${event.type === "mock_drill" ? "THIS IS A MOCK DRILL DOCUMENT — NOT A REAL RECALL" : ""}`;
  }

  const kpis = useMemo(
    () => ({
      total: recallEvents.length,
      open: recallEvents.filter((e) => e.status === "open").length,
      live: recallEvents.filter(
        (e) => e.type === "live_recall" && e.status === "open",
      ).length,
      mocks: recallEvents.filter((e) => e.type === "mock_drill").length,
      ingredients: ingredients.length,
      productions: productions.length,
    }),
    [recallEvents, ingredients, productions],
  );

  const sInput = {
    width: "100%",
    padding: "8px 11px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    background: C.surface,
    boxSizing: "border-box",
    color: C.ink,
  };
  const sLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.inkLight,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  const TABS = [
    { id: "trace", label: "Lot Traceability" },
    { id: "recall", label: "Initiate Recall" },
    {
      id: "events",
      label: `Recall Register (${recallEvents.length})${kpis.live > 0 ? ` 🚨` : ""}`,
    },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: C.ink }}>
      <WorkflowGuide tabId="hq-recall" />

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "error" ? C.redBg : "#F0FDF4",
            border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`,
            color: toast.type === "error" ? C.red : "#166534",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            maxWidth: 420,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.02em",
          }}
        >
          🔍 Recall Readiness & Lot Traceability
          <InfoTooltip
            title="Recall Readiness"
            body="Forward trace: given an ingredient, find every batch it touched. Backward trace: given a batch lot, find every ingredient sourced. Initiate mock drills or live recalls with FSCA notification letter auto-generated."
          />
        </h2>
        <p style={{ margin: "4px 0 0", color: C.inkLight, fontSize: 14 }}>
          {kpis.ingredients} ingredients · {kpis.productions} production batches
          traceable · {kpis.open} open recall events
        </p>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}
      >
        {[
          {
            label: "Traceable Batches",
            value: kpis.productions,
            accent: C.accent,
            bg: C.accentBg,
          },
          {
            label: "Ingredient Library",
            value: kpis.ingredients,
            accent: C.accent,
            bg: C.accentBg,
          },
          {
            label: "Open Recalls",
            value: kpis.open,
            accent: kpis.open > 0 ? C.red : C.accent,
            bg: kpis.open > 0 ? C.redBg : C.accentBg,
          },
          {
            label: "Live Recalls",
            value: kpis.live,
            accent: kpis.live > 0 ? C.red : C.accent,
            bg: kpis.live > 0 ? C.redBg : C.accentBg,
          },
          {
            label: "Mock Drills Run",
            value: kpis.mocks,
            accent: C.blue,
            bg: C.blueBg,
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: k.bg,
              border: `1px solid ${k.accent}20`,
              borderRadius: 10,
              padding: "16px 20px",
              flex: 1,
              minWidth: 120,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: k.accent,
                letterSpacing: "-0.02em",
              }}
            >
              {k.value}
            </div>
            <div
              style={{
                fontSize: 12,
                color: k.accent,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "9px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? C.accent : C.inkLight,
              borderBottom:
                activeTab === tab.id
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: C.inkLight }}>
          Loading trace data…
        </div>
      )}

      {/* ── LOT TRACEABILITY TAB ──────────────────────────────────────────── */}
      {!loading && activeTab === "trace" && (
        <div>
          {/* Mode selector */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[
              {
                mode: "forward",
                label: "⬇️ Forward Trace",
                desc: "Ingredient → Recipes → Batches",
              },
              {
                mode: "backward",
                label: "⬆️ Backward Trace",
                desc: "Batch Lot → Recipes → Ingredients",
              },
            ].map((m) => (
              <button
                key={m.mode}
                onClick={() => {
                  setTraceMode(m.mode);
                  setTraceResults(null);
                  setTraceInput("");
                }}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  textAlign: "left",
                  background: traceMode === m.mode ? C.accentBg : C.bg,
                  border: `2px solid ${traceMode === m.mode ? C.accent : C.border}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: traceMode === m.mode ? C.accent : C.ink,
                  }}
                >
                  {m.label}
                </div>
                <div style={{ fontSize: 12, color: C.inkLight, marginTop: 3 }}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Search input */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input
              value={traceInput}
              onChange={(e) => setTraceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  traceMode === "forward"
                    ? runForwardTrace(traceInput)
                    : runBackwardTrace(traceInput);
              }}
              placeholder={
                traceMode === "forward"
                  ? 'Enter ingredient name or ID (e.g. "Full Cream Milk", "Wheat Flour")'
                  : 'Enter batch lot number or recipe name (e.g. "LOT-20260325-001")'
              }
              style={{ ...sInput, flex: 1, fontSize: 14 }}
            />
            <button
              onClick={() =>
                traceMode === "forward"
                  ? runForwardTrace(traceInput)
                  : runBackwardTrace(traceInput)
              }
              disabled={tracing || !traceInput.trim()}
              style={{
                padding: "10px 24px",
                background: traceInput.trim() ? C.accent : "#D1D5DB",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {tracing ? "Tracing…" : "🔍 Run Trace"}
            </button>
          </div>

          {/* Trace results */}
          {traceResults && (
            <div>
              {/* Summary banner */}
              <div
                style={{
                  background: C.accentBg,
                  border: `1px solid ${C.accent}30`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  marginBottom: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: C.accent }}
                  >
                    {traceMode === "forward"
                      ? "⬇️ Forward Trace"
                      : "⬆️ Backward Trace"}{" "}
                    — "{traceResults.query}"
                  </div>
                  <div style={{ fontSize: 13, color: C.inkMid, marginTop: 4 }}>
                    {traceResults.summary}
                  </div>
                </div>
                {traceResults.affectedProductions?.length > 0 ||
                traceResults.matchedProductions?.length > 0 ? (
                  <button
                    onClick={() => {
                      setRecallForm((f) => ({
                        ...f,
                        trigger_type:
                          traceMode === "forward"
                            ? "ingredient_lot"
                            : "finished_batch",
                        trigger_reference: traceResults.query,
                      }));
                      setActiveTab("recall");
                    }}
                    style={{
                      padding: "8px 16px",
                      background: C.red,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    🚨 Initiate Recall
                  </button>
                ) : null}
              </div>

              {/* Forward trace results */}
              {traceMode === "forward" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 14,
                  }}
                >
                  {/* Ingredients */}
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.inkLight,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      🧪 Matched Ingredients (
                      {traceResults.matchedIngredients?.length || 0})
                    </div>
                    {traceResults.matchedIngredients?.length === 0 ? (
                      <div style={{ color: C.inkLight, fontSize: 13 }}>
                        No matching ingredients found.
                      </div>
                    ) : (
                      traceResults.matchedIngredients?.map((ing) => (
                        <div
                          key={ing.id}
                          style={{
                            padding: "8px 0",
                            borderBottom: `1px solid ${C.border}`,
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{ing.name}</div>
                          <div style={{ fontSize: 11, color: C.inkLight }}>
                            {ing.category}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Recipes */}
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.inkLight,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      📖 Affected Recipes (
                      {traceResults.affectedRecipes?.length || 0})
                    </div>
                    {traceResults.affectedRecipes?.length === 0 ? (
                      <div style={{ color: C.inkLight, fontSize: 13 }}>
                        No recipes use this ingredient.
                      </div>
                    ) : (
                      traceResults.affectedRecipes?.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            padding: "8px 0",
                            borderBottom: `1px solid ${C.border}`,
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: C.inkLight }}>
                            {r.version} · {r.status}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Production batches */}
                  <div
                    style={{
                      background:
                        traceResults.affectedProductions?.length > 0
                          ? C.amberBg
                          : C.surface,
                      border: `1px solid ${traceResults.affectedProductions?.length > 0 ? "#FDE68A" : C.border}`,
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          traceResults.affectedProductions?.length > 0
                            ? C.amber
                            : C.inkLight,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      📦 Affected Batches (
                      {traceResults.affectedProductions?.length || 0})
                    </div>
                    {traceResults.affectedProductions?.length === 0 ? (
                      <div style={{ color: C.inkLight, fontSize: 13 }}>
                        No production batches found.
                      </div>
                    ) : (
                      traceResults.affectedProductions?.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: "8px 0",
                            borderBottom: `1px solid ${traceResults.affectedProductions?.length > 0 ? "#FDE68A" : C.border}`,
                            fontSize: 13,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontFamily: "monospace",
                              color: C.amber,
                            }}
                          >
                            {p.batch_lot_number}
                          </div>
                          <div style={{ fontSize: 11, color: C.inkMid }}>
                            {p.recipe_name} · {p.actual_units} units ·{" "}
                            {fmtDate(p.started_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Backward trace results */}
              {traceMode === "backward" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      background: C.amberBg,
                      border: "1px solid #FDE68A",
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.amber,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      📦 Matched Batches (
                      {traceResults.matchedProductions?.length || 0})
                    </div>
                    {traceResults.matchedProductions?.length === 0 ? (
                      <div style={{ color: C.inkLight, fontSize: 13 }}>
                        No matching batches found.
                      </div>
                    ) : (
                      traceResults.matchedProductions?.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid #FDE68A",
                            fontSize: 13,
                          }}
                        >
                          <div
                            style={{ fontWeight: 700, fontFamily: "monospace" }}
                          >
                            {p.batch_lot_number}
                          </div>
                          <div style={{ fontSize: 11, color: C.inkMid }}>
                            {p.recipe_name} · {p.actual_units} units ·{" "}
                            {fmtDate(p.started_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.inkLight,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      📖 Recipes Used ({traceResults.usedRecipes?.length || 0})
                    </div>
                    {traceResults.usedRecipes?.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: "8px 0",
                          borderBottom: `1px solid ${C.border}`,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: C.inkLight }}>
                          {r.version}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: C.inkLight,
                        marginBottom: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      🧪 Ingredients Sourced (
                      {traceResults.usedIngredients?.length || 0})
                    </div>
                    {traceResults.usedIngredients?.length === 0 ? (
                      <div style={{ color: C.inkLight, fontSize: 13 }}>
                        No ingredients traced.
                      </div>
                    ) : (
                      traceResults.usedIngredients?.map((i) => (
                        <div
                          key={i.id}
                          style={{
                            padding: "8px 0",
                            borderBottom: `1px solid ${C.border}`,
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div style={{ fontSize: 11, color: C.inkLight }}>
                            {i.category}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!traceResults && (
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.inkMid,
                  marginBottom: 8,
                }}
              >
                Enter a search term to run a trace
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: C.inkLight,
                  maxWidth: 480,
                  margin: "0 auto",
                }}
              >
                <strong>Forward:</strong> Enter an ingredient name to see which
                recipes and production batches used it.
                <br />
                <strong>Backward:</strong> Enter a batch lot number to see which
                recipes and ingredients went into it.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INITIATE RECALL TAB ───────────────────────────────────────────── */}
      {!loading && activeTab === "recall" && (
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 28,
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>
              🚨 Initiate Recall / Mock Drill
            </h3>
            <p style={{ margin: "0 0 22px", color: C.inkLight, fontSize: 13 }}>
              Runs a full trace, documents the event, and generates an FSCA
              notification letter. Use Mock Drill for practice — it does not
              trigger live alerts.
            </p>

            {/* Type selector */}
            <div style={{ marginBottom: 18 }}>
              <label style={sLabel}>Recall Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setRecallForm((f) => ({ ...f, type: key }))}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      background:
                        recallForm.type === key ? cfg.color + "15" : C.bg,
                      border: `2px solid ${recallForm.type === key ? cfg.color : C.border}`,
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: recallForm.type === key ? 700 : 400,
                      color: recallForm.type === key ? cfg.color : C.inkMid,
                    }}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={sLabel}>Trigger Type</label>
                <select
                  value={recallForm.trigger_type}
                  onChange={(e) =>
                    setRecallForm((f) => ({
                      ...f,
                      trigger_type: e.target.value,
                    }))
                  }
                  style={sInput}
                >
                  <option value="ingredient_lot">Ingredient / Lot</option>
                  <option value="finished_batch">Finished Batch</option>
                  <option value="supplier">Supplier</option>
                  <option value="cold_chain_breach">Cold Chain Breach</option>
                </select>
              </div>
              <div>
                <label style={sLabel}>
                  Trigger Reference *
                  <InfoTooltip
                    title="Trigger Reference"
                    body="The specific ingredient name, lot number, supplier, or breach reference that triggered this recall."
                  />
                </label>
                <input
                  value={recallForm.trigger_reference}
                  onChange={(e) =>
                    setRecallForm((f) => ({
                      ...f,
                      trigger_reference: e.target.value,
                    }))
                  }
                  placeholder="e.g. Full Cream Milk / LOT-20260325-001"
                  style={sInput}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={sLabel}>Reason / Description *</label>
              <textarea
                value={recallForm.reason}
                onChange={(e) =>
                  setRecallForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="e.g. Supplier notified of possible Listeria contamination in milk delivery batch..."
                rows={3}
                style={{ ...sInput, resize: "vertical" }}
              />
            </div>

            {/* Severity */}
            <div style={{ marginBottom: 18 }}>
              <label style={sLabel}>
                Severity Classification
                <InfoTooltip
                  title="Recall Severity"
                  body="Class I: serious health risk. Class II: remote health risk. Class III: unlikely to cause health issues. Investigation: severity not yet determined."
                />
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setRecallForm((f) => ({ ...f, severity: key }))
                    }
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      background: recallForm.severity === key ? cfg.bg : C.bg,
                      border: `1.5px solid ${recallForm.severity === key ? cfg.color : C.border}`,
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: C.inkLight,
                        marginLeft: 10,
                      }}
                    >
                      {cfg.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sLabel}>Additional Notes</label>
              <textarea
                value={recallForm.notes}
                onChange={(e) =>
                  setRecallForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any additional context..."
                rows={2}
                style={{ ...sInput, resize: "vertical" }}
              />
            </div>

            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setRecallForm(emptyRecall)}
                style={{
                  padding: "10px 20px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  color: C.inkMid,
                }}
              >
                Clear
              </button>
              <button
                onClick={handleRaiseRecall}
                disabled={saving}
                style={{
                  padding: "10px 28px",
                  background: saving
                    ? "#D1D5DB"
                    : recallForm.type === "live_recall"
                      ? C.red
                      : C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                {saving
                  ? "Processing…"
                  : recallForm.type === "live_recall"
                    ? "🚨 Initiate Live Recall"
                    : recallForm.type === "mock_drill"
                      ? "🎯 Run Mock Drill"
                      : "🔍 Start Investigation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECALL REGISTER TAB ───────────────────────────────────────────── */}
      {!loading && activeTab === "events" && (
        <div>
          {recallEvents.length === 0 ? (
            <div
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}30`,
                borderRadius: 10,
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.accent,
                  marginBottom: 8,
                }}
              >
                No recall events yet
              </div>
              <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 20 }}>
                Run a mock drill to test your recall readiness. FSCA recommends
                at least one mock recall annually.
              </div>
              <button
                onClick={() => {
                  setRecallForm({ ...emptyRecall, type: "mock_drill" });
                  setActiveTab("recall");
                }}
                style={{
                  padding: "10px 24px",
                  background: C.blue,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                🎯 Run First Mock Drill
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recallEvents.map((event) => {
                const tc = TYPE_CONFIG[event.type] || TYPE_CONFIG.investigation;
                const sc =
                  SEVERITY_CONFIG[event.severity] ||
                  SEVERITY_CONFIG.investigation;
                return (
                  <div
                    key={event.id}
                    style={{
                      background:
                        event.type === "live_recall" && event.status === "open"
                          ? C.redBg
                          : C.surface,
                      border: `1px solid ${event.type === "live_recall" && event.status === "open" ? "#FECACA" : C.border}`,
                      borderRadius: 10,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginBottom: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {event.reference}
                          </span>
                          <span
                            style={{
                              background: tc.color + "15",
                              color: tc.color,
                              border: `1px solid ${tc.color}30`,
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {tc.icon} {tc.label}
                          </span>
                          <span
                            style={{
                              background: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.color}30`,
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {sc.label}
                          </span>
                          <span
                            style={{
                              background:
                                event.status === "open"
                                  ? C.amberBg
                                  : C.accentBg,
                              color:
                                event.status === "open" ? C.amber : C.accent,
                              border: `1px solid ${event.status === "open" ? "#FDE68A" : C.accent + "30"}`,
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {event.status.toUpperCase()}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: C.inkMid,
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>Trigger:</span>{" "}
                          {event.trigger_type.replace(/_/g, " ")} —{" "}
                          <span style={{ fontFamily: "monospace" }}>
                            {event.trigger_reference}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: C.inkMid,
                            marginBottom: 8,
                          }}
                        >
                          {event.reason}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            fontSize: 12,
                            color: C.inkLight,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>📅 {fmtDate(event.created_at)}</span>
                          <span>
                            📦 {(event.affected_batches || []).length} batch(es)
                            affected
                          </span>
                          <span>
                            📊 {event.affected_units_produced || 0} units
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexDirection: "column",
                        }}
                      >
                        <button
                          onClick={() => {
                            const letter = generateFSCALetter(event);
                            const blob = new Blob([letter], {
                              type: "text/plain",
                            });
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = `${event.reference}-FSCA-notification.txt`;
                            a.click();
                          }}
                          style={{
                            padding: "7px 14px",
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                            borderRadius: 5,
                            cursor: "pointer",
                            fontSize: 12,
                            fontFamily: "inherit",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          📄 FSCA Letter
                        </button>
                        {event.status === "open" && (
                          <button
                            onClick={() => handleCloseRecall(event.id)}
                            style={{
                              padding: "7px 14px",
                              background: C.accent,
                              color: "#fff",
                              border: "none",
                              borderRadius: 5,
                              cursor: "pointer",
                              fontSize: 12,
                              fontFamily: "inherit",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✅ Close
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Affected batches */}
                    {(event.affected_batches || []).length > 0 && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 14px",
                          background: C.bg,
                          borderRadius: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.inkLight,
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Affected Batches
                        </div>
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          {(event.affected_batches || []).map((b, i) => (
                            <span
                              key={i}
                              style={{
                                fontFamily: "monospace",
                                background: C.amberBg,
                                color: C.amber,
                                border: "1px solid #FDE68A",
                                borderRadius: 4,
                                padding: "2px 9px",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {b.lot} ({b.units} units)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
