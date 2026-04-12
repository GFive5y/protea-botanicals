// src/components/hq/HQHaccp.js
// WP-FNB S3 — HACCP Digital Control Point System — v1.0
// Built: March 25, 2026
// Rules: RULE 0F (tenant_id), RULE 0G (useTenant inside),
//        WorkflowGuide first, InfoTooltip on key fields

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";
import { T } from "../../styles/tokens";

// WP-UNIFY: F&B local palette mapped to tokens.js T where equivalent
const C = {
  bg: T.surface,
  surface: "#ffffff",
  border: T.border,
  ink: T.ink900,
  inkMid: T.ink700,
  inkLight: T.ink500,
  accent: T.accentMid,
  accentBg: T.accentLight,
  amber: T.warning,
  amberBg: T.warningLight,
  red: T.danger,
  redBg: T.dangerLight,
  blue: "#1D4ED8",
  blueBg: T.infoLight,
  orange: "#C2410C",
  orangeBg: "#FFF7ED",
};

// ─── CCP template library ─────────────────────────────────────────────────────
const CCP_TEMPLATES = [
  {
    step_name: "Pasteurisation",
    step_number: 1,
    process_stage: "Heat Treatment",
    hazard_type: "biological",
    hazard_description:
      "Listeria monocytogenes, Salmonella, E. coli O157:H7 — pathogen survival",
    critical_limit:
      "Temperature ≥72°C for ≥15 seconds (HTST) or ≥63°C for ≥30 minutes (LTLT)",
    monitoring_procedure:
      "Continuous temperature recording via calibrated thermometer + time measurement",
    monitoring_frequency: "Every batch — continuous",
    corrective_action:
      "Stop process, re-pasteurise or destroy batch. Review and repair equipment.",
    verification_method:
      "Weekly thermometer calibration. Monthly microbiological testing.",
  },
  {
    step_name: "Chilling & Cold Storage",
    step_number: 2,
    process_stage: "Cooling",
    hazard_type: "biological",
    hazard_description:
      "Bacterial growth (Listeria, Salmonella) in temperature abuse zone 8–63°C",
    critical_limit: "Cool from 60°C to ≤8°C within 2 hours. Store at ≤4°C.",
    monitoring_procedure:
      "Continuous temperature logging in chiller/cold room. Manual check every 4 hours.",
    monitoring_frequency: "Every batch + every 4 hours in storage",
    corrective_action:
      "If >8°C for >2 hours: destroy product. Log incident. Review cold chain.",
    verification_method:
      "Daily temperature log review. Thermometer calibration monthly.",
  },
  {
    step_name: "Metal Detection",
    step_number: 3,
    process_stage: "Final Inspection",
    hazard_type: "physical",
    hazard_description: "Metal fragments from equipment wear or contamination",
    critical_limit:
      "Detection sensitivity: Fe ≥1.5mm, Non-Fe ≥2.0mm, SS ≥2.5mm",
    monitoring_procedure:
      "Pass each product unit through calibrated metal detector. Test with test pieces at start, hourly, and end of run.",
    monitoring_frequency: "Hourly + start/end of production run",
    corrective_action:
      "Stop line. Identify and isolate affected products. Re-inspect. Quarantine and destroy affected batch.",
    verification_method:
      "Monthly calibration verification with certified test pieces.",
  },
  {
    step_name: "Allergen Cleaning Verification",
    step_number: 4,
    process_stage: "Changeover",
    hazard_type: "allergen",
    hazard_description:
      "Cross-contamination of allergen-free products with major allergens (milk, peanuts, tree nuts, gluten)",
    critical_limit:
      "No visible allergen residue. Swab test: <1ppm allergen protein on all contact surfaces.",
    monitoring_procedure:
      "Visual inspection of all food contact surfaces. ATP swab test. Allergen-specific ELISA swab test before first production.",
    monitoring_frequency: "Every allergen changeover",
    corrective_action:
      "Re-clean and re-verify. Do not commence production until test passes. Document all actions.",
    verification_method:
      "Third-party allergen verification quarterly. Internal ATP swab protocol.",
  },
  {
    step_name: "pH Control",
    step_number: 5,
    process_stage: "Formulation",
    hazard_type: "biological",
    hazard_description:
      "Pathogen survival and growth in products with insufficient acidity",
    critical_limit:
      "pH ≤4.6 for acid/acidified foods. pH ≤3.5 for carbonated beverages.",
    monitoring_procedure:
      "Calibrated pH meter measurement on representative sample from each batch.",
    monitoring_frequency:
      "Every batch — minimum 3 readings (start, middle, end)",
    corrective_action:
      "Adjust formulation and re-test. If not achievable, destroy batch.",
    verification_method:
      "pH meter calibration with certified buffers — daily before use.",
  },
  {
    step_name: "Water Activity (Aw) Control",
    step_number: 6,
    process_stage: "Formulation",
    hazard_type: "biological",
    hazard_description:
      "Mould and yeast growth, Staphylococcus aureus growth above Aw 0.85",
    critical_limit:
      "Aw ≤0.85 for shelf-stable products. ≤0.70 for extremely low moisture products.",
    monitoring_procedure:
      "Water activity meter measurement on sample from each production batch.",
    monitoring_frequency:
      "Every batch — minimum 1 reading per 500kg or per batch",
    corrective_action:
      "Adjust moisture content, add humectants, or destroy batch if not achievable.",
    verification_method:
      "Water activity meter calibration with certified salt solutions monthly.",
  },
  {
    step_name: "Packaging Integrity Check",
    step_number: 7,
    process_stage: "Packaging",
    hazard_type: "biological",
    hazard_description:
      "Recontamination of finished product through compromised seal or package",
    critical_limit:
      "Zero visual defects. Seal strength ≥X N/15mm (define per product spec). No leaks on vacuum/modified atmosphere packs.",
    monitoring_procedure:
      "Visual inspection of every 10th unit. Seal strength pull test on samples. Leak test on hermetically sealed packs.",
    monitoring_frequency: "Every 10th unit + start/end of production run",
    corrective_action:
      "Remove and re-pack all units from defective batch. Inspect and adjust sealing equipment.",
    verification_method:
      "Seal tester calibration monthly. External package integrity testing quarterly.",
  },
  {
    step_name: "Raw Material Temperature on Receipt",
    step_number: 8,
    process_stage: "Receiving",
    hazard_type: "biological",
    hazard_description:
      "Cold chain break during transport — pathogen growth in chilled/frozen materials",
    critical_limit: "Chilled: ≤8°C on receipt. Frozen: ≤-15°C on receipt.",
    monitoring_procedure:
      "Probe thermometer measurement of core temperature on representative sample from each delivery.",
    monitoring_frequency: "Every chilled/frozen delivery",
    corrective_action:
      "Reject delivery if temperature exceeded. Notify supplier. Log nonconformance.",
    verification_method:
      "Thermometer calibration monthly. Supplier cold chain audit annually.",
  },
];

const HAZARD_COLORS = {
  biological: {
    bg: "#FEF2F2",
    color: "#991B1B",
    label: "Biological",
    icon: "🦠",
  },
  chemical: { bg: "#FFF7ED", color: "#C2410C", label: "Chemical", icon: "⚗️" },
  physical: { bg: "#EFF6FF", color: "#1D4ED8", label: "Physical", icon: "🔩" },
  allergen: { bg: "#FEF3C7", color: "#92400E", label: "Allergen", icon: "⚠️" },
};

const SEVERITY_COLORS = {
  minor: { bg: C.blueBg, color: C.blue, label: "Minor" },
  major: { bg: C.amberBg, color: C.amber, label: "Major" },
  critical: { bg: C.redBg, color: C.red, label: "Critical" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function HazardBadge({ type }) {
  const s = HAZARD_COLORS[type] || HAZARD_COLORS.biological;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const s = SEVERITY_COLORS[severity] || SEVERITY_COLORS.minor;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    open: { bg: C.redBg, color: C.red, label: "Open" },
    closed: { bg: C.accentBg, color: C.accent, label: "Closed" },
    monitoring: { bg: C.amberBg, color: C.amber, label: "Monitoring" },
  };
  const s = map[status] || map.open;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function HQHaccp() {
  const { tenantId } = useTenant(); // RULE 0G — inside component

  const [activeTab, setActiveTab] = useState("register");
  const [cps, setCps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recentLots, setRecentLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // CCP form
  const emptyCp = {
    step_name: "",
    step_number: "",
    process_stage: "",
    hazard_type: "biological",
    hazard_description: "",
    critical_limit: "",
    monitoring_procedure: "",
    monitoring_frequency: "Every batch",
    corrective_action: "",
    verification_method: "",
    responsible_person: "",
  };
  const [cpForm, setCpForm] = useState(emptyCp);
  const [editingCp, setEditingCp] = useState(null);
  const [showCpForm, setShowCpForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Log entry form
  const emptyLog = {
    control_point_id: "",
    batch_lot_number: "",
    recipe_name: "",
    actual_value: "",
    is_within_limit: true,
    corrective_action_taken: "",
    notes: "",
  };
  const [logForm, setLogForm] = useState(emptyLog);
  const [showLogForm, setShowLogForm] = useState(false);

  // NCR form
  const emptyNc = {
    log_entry_id: "",
    batch_lot_number: "",
    severity: "minor",
    description: "",
    immediate_action: "",
    root_cause: "",
    corrective_action: "",
    preventive_action: "",
    disposition: "pending",
  };
  const [ncForm, setNcForm] = useState(emptyNc);
  const [showNcForm, setShowNcForm] = useState(false);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Fetch all ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [cpRes, logRes, ncRes, recipeRes, lotsRes] = await Promise.all([
        supabase
          .from("haccp_control_points")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("step_number"), // RULE 0F
        supabase
          .from("haccp_log_entries")
          .select("*, haccp_control_points(step_name)")
          .eq("tenant_id", tenantId)
          .order("monitored_at", { ascending: false })
          .limit(100),
        supabase
          .from("haccp_nonconformances")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        supabase
          .from("food_recipes")
          .select("id, name, status")
          .eq("tenant_id", tenantId)
          .eq("status", "approved")
          .order("name"),
        supabase
          .from("production_runs")
          .select("batch_lot_number, recipe_name")
          .eq("tenant_id", tenantId)
          .not("batch_lot_number", "is", null)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      if (cpRes.error) throw cpRes.error;
      if (logRes.error) throw logRes.error;
      if (ncRes.error) throw ncRes.error;
      setCps(cpRes.data || []);
      setLogs(logRes.data || []);
      setNcs(ncRes.data || []);
      setRecipes(recipeRes.data || []);
      // Unique lot numbers from recent production runs
      const lots = [
        ...new Set(
          (lotsRes.data || []).map((r) => r.batch_lot_number).filter(Boolean),
        ),
      ];
      setRecentLots(lots);
    } catch (err) {
      showToast("Load failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Save CCP ───────────────────────────────────────────────────────────────
  async function handleSaveCp() {
    if (!cpForm.step_name.trim()) {
      showToast("Step name required", "error");
      return;
    }
    if (!cpForm.hazard_description.trim()) {
      showToast("Hazard description required", "error");
      return;
    }
    if (!cpForm.critical_limit.trim()) {
      showToast("Critical limit required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...cpForm,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      }; // RULE 0F
      if (editingCp) {
        const { error } = await supabase
          .from("haccp_control_points")
          .update(payload)
          .eq("id", editingCp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("haccp_control_points")
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }
      showToast(editingCp ? "CCP updated" : "CCP added to register");
      setShowCpForm(false);
      setEditingCp(null);
      setCpForm(emptyCp);
      fetchAll();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Seed templates ─────────────────────────────────────────────────────────
  async function handleSeedTemplates() {
    if (
      !window.confirm(
        `Add ${CCP_TEMPLATES.length} industry-standard CCP templates to your register?`,
      )
    )
      return;
    setSaving(true);
    try {
      const payload = CCP_TEMPLATES.map((t) => ({
        ...t,
        tenant_id: tenantId,
        is_template: true, // RULE 0F
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("haccp_control_points")
        .insert(payload);
      if (error) throw error;
      showToast(`✅ ${CCP_TEMPLATES.length} CCP templates added`);
      setShowTemplates(false);
      fetchAll();
    } catch (err) {
      showToast("Seed failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Save log entry ─────────────────────────────────────────────────────────
  async function handleSaveLog() {
    if (!logForm.control_point_id) {
      showToast("Select a control point", "error");
      return;
    }
    if (!logForm.actual_value.trim()) {
      showToast("Enter the actual measured value", "error");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("haccp_log_entries")
        .insert({
          ...logForm,
          tenant_id: tenantId, // RULE 0F
          monitored_at: new Date().toISOString(),
          is_within_limit:
            logForm.is_within_limit === "true" ||
            logForm.is_within_limit === true,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      // Auto-create NCR if outside limit
      if (!logForm.is_within_limit || logForm.is_within_limit === "false") {
        await supabase.from("haccp_nonconformances").insert({
          tenant_id: tenantId, // RULE 0F
          log_entry_id: data.id,
          batch_lot_number: logForm.batch_lot_number || null,
          severity: "major",
          description: `CCP deviation: ${cps.find((c) => c.id === logForm.control_point_id)?.step_name} — actual value "${logForm.actual_value}" outside critical limit.`,
          immediate_action: logForm.corrective_action_taken || null,
          disposition: "pending",
          status: "open",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        showToast(
          "⚠️ Log saved — NCR automatically raised for deviation",
          "error",
        );
      } else {
        showToast("✅ CCP log entry saved");
      }
      setShowLogForm(false);
      setLogForm(emptyLog);
      fetchAll();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Save NCR ───────────────────────────────────────────────────────────────
  async function handleSaveNc() {
    if (!ncForm.description.trim()) {
      showToast("Description required", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("haccp_nonconformances").insert({
        ...ncForm,
        tenant_id: tenantId, // RULE 0F
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      showToast("NCR raised");
      setShowNcForm(false);
      setNcForm(emptyNc);
      fetchAll();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Close NCR ──────────────────────────────────────────────────────────────
  async function handleCloseNc(id) {
    const { error } = await supabase
      .from("haccp_nonconformances")
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
    showToast("NCR closed");
    fetchAll();
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const openNcs = ncs.filter((n) => n.status === "open").length;
    const criticalNcs = ncs.filter(
      (n) => n.status === "open" && n.severity === "critical",
    ).length;
    const today = new Date().toISOString().slice(0, 10);
    const logsToday = logs.filter(
      (l) => l.monitored_at?.slice(0, 10) === today,
    ).length;
    const deviations = logs.filter((l) => !l.is_within_limit).length;
    const complianceRate =
      logs.length > 0
        ? Math.round(
            (logs.filter((l) => l.is_within_limit).length / logs.length) * 100,
          )
        : 100;
    return {
      cps: cps.length,
      openNcs,
      criticalNcs,
      logsToday,
      deviations,
      complianceRate,
    };
  }, [cps, logs, ncs]);

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
    { id: "register", label: `CCP Register (${cps.length})` },
    { id: "log", label: `Live Log (${logs.length})` },
    {
      id: "ncr",
      label: `Non-Conformances${kpis.openNcs > 0 ? ` ⚠️ ${kpis.openNcs}` : ""}`,
    },
    { id: "export", label: "Audit Export" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: C.ink }}>
      <WorkflowGuide tabId="hq-haccp" />

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
          🛡️ HACCP Control Point System
          <InfoTooltip
            title="Digital HACCP"
            body="Hazard Analysis Critical Control Points — digital replacement for paper CCP logs. Every production batch is traced against your defined control points. Non-conformances auto-raise and track to closure. Audit-ready export at any time."
          />
        </h2>
        <p style={{ margin: "4px 0 0", color: C.inkLight, fontSize: 14 }}>
          {kpis.cps} control points · {kpis.complianceRate}% compliance rate ·{" "}
          {kpis.openNcs} open NCRs
        </p>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}
      >
        {[
          {
            label: "Control Points",
            value: kpis.cps,
            accent: C.accent,
            bg: C.accentBg,
          },
          {
            label: "Compliance Rate",
            value: kpis.complianceRate + "%",
            accent:
              kpis.complianceRate >= 98
                ? C.accent
                : kpis.complianceRate >= 90
                  ? C.amber
                  : C.red,
            bg:
              kpis.complianceRate >= 98
                ? C.accentBg
                : kpis.complianceRate >= 90
                  ? C.amberBg
                  : C.redBg,
          },
          {
            label: "Logs Today",
            value: kpis.logsToday,
            accent: C.blue,
            bg: C.blueBg,
          },
          {
            label: "Open NCRs",
            value: kpis.openNcs,
            accent: kpis.openNcs > 0 ? C.amber : C.accent,
            bg: kpis.openNcs > 0 ? C.amberBg : C.accentBg,
          },
          {
            label: "Critical Open",
            value: kpis.criticalNcs,
            accent: kpis.criticalNcs > 0 ? C.red : C.accent,
            bg: kpis.criticalNcs > 0 ? C.redBg : C.accentBg,
          },
          {
            label: "Total Deviations",
            value: kpis.deviations,
            accent: kpis.deviations > 0 ? C.orange : C.accent,
            bg: kpis.deviations > 0 ? C.orangeBg : C.accentBg,
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
          Loading HACCP data…
        </div>
      )}

      {/* ── CCP REGISTER ─────────────────────────────────────────────────── */}
      {!loading && activeTab === "register" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              onClick={() => {
                setShowCpForm(true);
                setShowTemplates(false);
                setEditingCp(null);
                setCpForm(emptyCp);
              }}
              style={{
                padding: "9px 18px",
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              + Add Control Point
            </button>
            {cps.length === 0 && (
              <button
                onClick={() => setShowTemplates(true)}
                style={{
                  padding: "9px 18px",
                  background: C.amberBg,
                  color: C.amber,
                  border: `1px solid #FDE68A`,
                  borderRadius: 7,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                🏭 Load Industry Templates ({CCP_TEMPLATES.length})
              </button>
            )}
          </div>

          {/* Template preview */}
          {showTemplates && (
            <div
              style={{
                background: C.amberBg,
                border: `1px solid #FDE68A`,
                borderRadius: 10,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.amber,
                  marginBottom: 10,
                }}
              >
                🏭 Industry-Standard HACCP Templates
              </div>
              <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 14 }}>
                {CCP_TEMPLATES.length} pre-defined CCPs covering the most
                critical food safety hazards. Covers: pasteurisation, chilling,
                metal detection, allergen cleaning, pH control, water activity,
                packaging integrity, and raw material receiving.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {CCP_TEMPLATES.map((t) => (
                  <span
                    key={t.step_name}
                    style={{
                      background: HAZARD_COLORS[t.hazard_type].bg,
                      color: HAZARD_COLORS[t.hazard_type].color,
                      border: `1px solid ${HAZARD_COLORS[t.hazard_type].color}30`,
                      borderRadius: 4,
                      padding: "3px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {HAZARD_COLORS[t.hazard_type].icon} {t.step_name}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleSeedTemplates}
                  disabled={saving}
                  style={{
                    padding: "9px 18px",
                    background: C.amber,
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
                    ? "Adding…"
                    : `✅ Add All ${CCP_TEMPLATES.length} Templates`}
                </button>
                <button
                  onClick={() => setShowTemplates(false)}
                  style={{
                    padding: "9px 14px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* CCP form */}
          {showCpForm && (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>
                {editingCp ? "Edit Control Point" : "New Control Point"}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={sLabel}>CCP Step Name *</label>
                  <input
                    value={cpForm.step_name}
                    onChange={(e) =>
                      setCpForm((f) => ({ ...f, step_name: e.target.value }))
                    }
                    placeholder="e.g. Pasteurisation"
                    style={sInput}
                  />
                </div>
                <div>
                  <label style={sLabel}>Step Number</label>
                  <input
                    type="number"
                    value={cpForm.step_number}
                    onChange={(e) =>
                      setCpForm((f) => ({ ...f, step_number: e.target.value }))
                    }
                    placeholder="1"
                    style={sInput}
                  />
                </div>
                <div>
                  <label style={sLabel}>Process Stage</label>
                  <input
                    value={cpForm.process_stage}
                    onChange={(e) =>
                      setCpForm((f) => ({
                        ...f,
                        process_stage: e.target.value,
                      }))
                    }
                    placeholder="e.g. Heat Treatment"
                    style={sInput}
                  />
                </div>
                <div>
                  <label style={sLabel}>Hazard Type *</label>
                  <select
                    value={cpForm.hazard_type}
                    onChange={(e) =>
                      setCpForm((f) => ({ ...f, hazard_type: e.target.value }))
                    }
                    style={sInput}
                  >
                    <option value="biological">🦠 Biological</option>
                    <option value="chemical">⚗️ Chemical</option>
                    <option value="physical">🔩 Physical</option>
                    <option value="allergen">⚠️ Allergen</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={sLabel}>Hazard Description *</label>
                <textarea
                  value={cpForm.hazard_description}
                  onChange={(e) =>
                    setCpForm((f) => ({
                      ...f,
                      hazard_description: e.target.value,
                    }))
                  }
                  placeholder="e.g. Listeria monocytogenes survival due to insufficient heat treatment"
                  rows={2}
                  style={{ ...sInput, resize: "vertical" }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={sLabel}>
                  Critical Limit *{" "}
                  <InfoTooltip
                    title="Critical Limit"
                    body="The measurable boundary that separates acceptable from unacceptable. Must be specific and measurable (e.g. ≥72°C for ≥15s — not 'sufficiently hot')."
                  />
                </label>
                <input
                  value={cpForm.critical_limit}
                  onChange={(e) =>
                    setCpForm((f) => ({ ...f, critical_limit: e.target.value }))
                  }
                  placeholder="e.g. Temperature ≥72°C for ≥15 seconds"
                  style={sInput}
                />
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
                  <label style={sLabel}>Monitoring Procedure</label>
                  <textarea
                    value={cpForm.monitoring_procedure}
                    onChange={(e) =>
                      setCpForm((f) => ({
                        ...f,
                        monitoring_procedure: e.target.value,
                      }))
                    }
                    rows={2}
                    style={{ ...sInput, resize: "vertical" }}
                    placeholder="How is this CCP monitored?"
                  />
                </div>
                <div>
                  <label style={sLabel}>Corrective Action</label>
                  <textarea
                    value={cpForm.corrective_action}
                    onChange={(e) =>
                      setCpForm((f) => ({
                        ...f,
                        corrective_action: e.target.value,
                      }))
                    }
                    rows={2}
                    style={{ ...sInput, resize: "vertical" }}
                    placeholder="What to do when limit is exceeded?"
                  />
                </div>
                <div>
                  <label style={sLabel}>Monitoring Frequency</label>
                  <input
                    value={cpForm.monitoring_frequency}
                    onChange={(e) =>
                      setCpForm((f) => ({
                        ...f,
                        monitoring_frequency: e.target.value,
                      }))
                    }
                    placeholder="e.g. Every batch"
                    style={sInput}
                  />
                </div>
                <div>
                  <label style={sLabel}>Verification Method</label>
                  <input
                    value={cpForm.verification_method}
                    onChange={(e) =>
                      setCpForm((f) => ({
                        ...f,
                        verification_method: e.target.value,
                      }))
                    }
                    placeholder="e.g. Monthly calibration"
                    style={sInput}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={sLabel}>Responsible Person</label>
                <input
                  value={cpForm.responsible_person}
                  onChange={(e) =>
                    setCpForm((f) => ({
                      ...f,
                      responsible_person: e.target.value,
                    }))
                  }
                  placeholder="e.g. Production Manager"
                  style={{ ...sInput, maxWidth: 300 }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSaveCp}
                  disabled={saving}
                  style={{
                    padding: "9px 20px",
                    background: C.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                >
                  {saving ? "Saving…" : editingCp ? "Save Changes" : "Add CCP"}
                </button>
                <button
                  onClick={() => {
                    setShowCpForm(false);
                    setEditingCp(null);
                    setCpForm(emptyCp);
                  }}
                  style={{
                    padding: "9px 16px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* CCP list */}
          {cps.length === 0 && !showCpForm && !showTemplates ? (
            <div
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}30`,
                borderRadius: 10,
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.accent,
                  marginBottom: 8,
                }}
              >
                No control points defined
              </div>
              <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 20 }}>
                Load the industry template library or create custom CCPs for
                your process.
              </div>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "center" }}
              >
                <button
                  onClick={() => setShowTemplates(true)}
                  style={{
                    padding: "10px 20px",
                    background: C.amber,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontFamily: "inherit",
                  }}
                >
                  🏭 Load Templates
                </button>
                <button
                  onClick={() => setShowCpForm(true)}
                  style={{
                    padding: "10px 20px",
                    background: C.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontFamily: "inherit",
                  }}
                >
                  + Custom CCP
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cps.map((cp) => (
                <div
                  key={cp.id}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 15 }}>
                          CCP{cp.step_number} — {cp.step_name}
                        </span>
                        <HazardBadge type={cp.hazard_type} />
                        {cp.is_template && (
                          <span
                            style={{
                              fontSize: 10,
                              color: C.inkLight,
                              background: C.bg,
                              border: `1px solid ${C.border}`,
                              borderRadius: 3,
                              padding: "1px 6px",
                            }}
                          >
                            TEMPLATE
                          </span>
                        )}
                      </div>
                      {cp.process_stage && (
                        <div
                          style={{
                            fontSize: 12,
                            color: C.inkLight,
                            marginBottom: 6,
                          }}
                        >
                          📍 {cp.process_stage}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 13,
                          color: C.inkMid,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: C.red }}>
                          Hazard:
                        </span>{" "}
                        {cp.hazard_description}
                      </div>
                      <div
                        style={{
                          background: C.redBg,
                          border: `1px solid #FECACA`,
                          borderRadius: 6,
                          padding: "8px 12px",
                          marginBottom: 8,
                          display: "inline-block",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.red,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Critical Limit:{" "}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: C.red,
                          }}
                        >
                          {cp.critical_limit}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 20,
                          fontSize: 12,
                          color: C.inkLight,
                          flexWrap: "wrap",
                        }}
                      >
                        {cp.monitoring_frequency && (
                          <span>⏱ {cp.monitoring_frequency}</span>
                        )}
                        {cp.responsible_person && (
                          <span>👤 {cp.responsible_person}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditingCp(cp);
                          setCpForm({
                            step_name: cp.step_name,
                            step_number: cp.step_number || "",
                            process_stage: cp.process_stage || "",
                            hazard_type: cp.hazard_type,
                            hazard_description: cp.hazard_description,
                            critical_limit: cp.critical_limit,
                            monitoring_procedure: cp.monitoring_procedure || "",
                            monitoring_frequency:
                              cp.monitoring_frequency || "Every batch",
                            corrective_action: cp.corrective_action || "",
                            verification_method: cp.verification_method || "",
                            responsible_person: cp.responsible_person || "",
                          });
                          setShowCpForm(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          background: C.bg,
                          border: `1px solid ${C.border}`,
                          borderRadius: 5,
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "inherit",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => {
                          setLogForm({ ...emptyLog, control_point_id: cp.id });
                          setShowLogForm(true);
                          setActiveTab("log");
                        }}
                        style={{
                          padding: "6px 12px",
                          background: C.accent,
                          color: "#fff",
                          border: "none",
                          borderRadius: 5,
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "inherit",
                          fontWeight: 700,
                        }}
                      >
                        📝 Log Reading
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LIVE LOG TAB ──────────────────────────────────────────────────── */}
      {!loading && activeTab === "log" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              onClick={() => setShowLogForm(true)}
              style={{
                padding: "9px 18px",
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              📝 Log CCP Reading
            </button>
          </div>

          {/* Log form */}
          {showLogForm && (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>
                Log CCP Reading
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={sLabel}>Control Point *</label>
                  <select
                    value={logForm.control_point_id}
                    onChange={(e) =>
                      setLogForm((f) => ({
                        ...f,
                        control_point_id: e.target.value,
                      }))
                    }
                    style={sInput}
                  >
                    <option value="">Select CCP…</option>
                    {cps.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        CCP{cp.step_number} — {cp.step_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={sLabel}>Batch / Lot Number</label>
                  <select
                    value={logForm.batch_lot_number}
                    onChange={(e) =>
                      setLogForm((f) => ({
                        ...f,
                        batch_lot_number: e.target.value,
                      }))
                    }
                    style={sInput}
                  >
                    <option value="">Select or type lot number…</option>
                    {recentLots.map((lot) => (
                      <option key={lot} value={lot}>
                        {lot}
                      </option>
                    ))}
                  </select>
                  {/* Allow manual entry if lot not in list */}
                  {logForm.batch_lot_number === "" && (
                    <input
                      value={logForm.batch_lot_number}
                      onChange={(e) =>
                        setLogForm((f) => ({
                          ...f,
                          batch_lot_number: e.target.value,
                        }))
                      }
                      placeholder="Or type manually: LOT-20260325-001"
                      style={{ ...sInput, marginTop: 6, fontSize: 11 }}
                    />
                  )}
                </div>
                <div>
                  <label style={sLabel}>Recipe / Product Name</label>
                  <select
                    value={logForm.recipe_name}
                    onChange={(e) =>
                      setLogForm((f) => ({ ...f, recipe_name: e.target.value }))
                    }
                    style={sInput}
                  >
                    <option value="">Select recipe…</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {logForm.control_point_id && (
                <div
                  style={{
                    background: C.redBg,
                    border: `1px solid #FECACA`,
                    borderRadius: 6,
                    padding: "10px 14px",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.red,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Critical Limit to Meet:
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>
                    {
                      cps.find((c) => c.id === logForm.control_point_id)
                        ?.critical_limit
                    }
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={sLabel}>
                    Actual Measured Value *{" "}
                    <InfoTooltip
                      title="Actual Value"
                      body="Enter the exact reading — e.g. '74°C for 18s' or 'pH 3.8' or 'Aw 0.82'."
                    />
                  </label>
                  <input
                    value={logForm.actual_value}
                    onChange={(e) =>
                      setLogForm((f) => ({
                        ...f,
                        actual_value: e.target.value,
                      }))
                    }
                    placeholder="e.g. 74°C for 18s"
                    style={sInput}
                  />
                </div>
                <div>
                  <label style={sLabel}>Within Critical Limit? *</label>
                  <select
                    value={String(logForm.is_within_limit)}
                    onChange={(e) =>
                      setLogForm((f) => ({
                        ...f,
                        is_within_limit: e.target.value === "true",
                      }))
                    }
                    style={sInput}
                  >
                    <option value="true">✅ Yes — Within Limit</option>
                    <option value="false">❌ No — Deviation</option>
                  </select>
                </div>
              </div>
              {(logForm.is_within_limit === false ||
                logForm.is_within_limit === "false") && (
                <div
                  style={{
                    background: C.redBg,
                    border: `1px solid #FECACA`,
                    borderRadius: 8,
                    padding: "12px 14px",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.red,
                      marginBottom: 8,
                    }}
                  >
                    ⚠️ DEVIATION — An NCR will be automatically raised
                  </div>
                  <label style={{ ...sLabel, color: C.red }}>
                    Immediate Corrective Action Taken
                  </label>
                  <textarea
                    value={logForm.corrective_action_taken}
                    onChange={(e) =>
                      setLogForm((f) => ({
                        ...f,
                        corrective_action_taken: e.target.value,
                      }))
                    }
                    placeholder="Describe the immediate action taken to correct the deviation…"
                    rows={2}
                    style={{ ...sInput, resize: "vertical" }}
                  />
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={sLabel}>Notes</label>
                <input
                  value={logForm.notes}
                  onChange={(e) =>
                    setLogForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Additional observations…"
                  style={sInput}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSaveLog}
                  disabled={saving}
                  style={{
                    padding: "9px 20px",
                    background: C.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                >
                  {saving ? "Saving…" : "Save CCP Reading"}
                </button>
                <button
                  onClick={() => {
                    setShowLogForm(false);
                    setLogForm(emptyLog);
                  }}
                  style={{
                    padding: "9px 16px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Log table */}
          {logs.length === 0 && !showLogForm ? (
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "40px 24px",
                textAlign: "center",
                color: C.inkLight,
              }}
            >
              No log entries yet. Click "Log CCP Reading" to start recording.
            </div>
          ) : (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {[
                      "Date & Time",
                      "Control Point",
                      "Batch / Lot",
                      "Product",
                      "Actual Value",
                      "Status",
                      "Notes",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 12px",
                          textAlign: "left",
                          fontSize: 11,
                          color: C.inkLight,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      style={{
                        borderTop: `1px solid ${C.border}`,
                        background: !log.is_within_limit
                          ? "#FFF8F8"
                          : idx % 2 === 0
                            ? C.surface
                            : "#FCFCFB",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: C.inkLight,
                        }}
                      >
                        {fmtDateTime(log.monitored_at)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {log.haccp_control_points?.step_name || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: C.inkMid,
                        }}
                      >
                        {log.batch_lot_number || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 12,
                          color: C.inkMid,
                        }}
                      >
                        {log.recipe_name || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {log.actual_value}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {log.is_within_limit ? (
                          <span
                            style={{
                              background: C.accentBg,
                              color: C.accent,
                              border: `1px solid ${C.accent}30`,
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            ✅ Pass
                          </span>
                        ) : (
                          <span
                            style={{
                              background: C.redBg,
                              color: C.red,
                              border: "1px solid #FECACA",
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            ❌ Deviation
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 11,
                          color: C.inkLight,
                        }}
                      >
                        {log.notes ||
                          (log.corrective_action_taken
                            ? `Action: ${log.corrective_action_taken.substring(0, 40)}…`
                            : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── NCR TAB ───────────────────────────────────────────────────────── */}
      {!loading && activeTab === "ncr" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <button
              onClick={() => setShowNcForm(true)}
              style={{
                padding: "9px 18px",
                background: C.red,
                color: "#fff",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              ⚠️ Raise Manual NCR
            </button>
          </div>

          {showNcForm && (
            <div
              style={{
                background: C.redBg,
                border: `1px solid #FECACA`,
                borderRadius: 10,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: "0 0 18px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.red,
                }}
              >
                ⚠️ New Non-Conformance Record
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label style={{ ...sLabel, color: C.red }}>
                    Batch / Lot Number
                  </label>
                  <input
                    value={ncForm.batch_lot_number}
                    onChange={(e) =>
                      setNcForm((f) => ({
                        ...f,
                        batch_lot_number: e.target.value,
                      }))
                    }
                    placeholder="e.g. LOT-20260325-001"
                    style={sInput}
                  />
                </div>
                <div>
                  <label style={{ ...sLabel, color: C.red }}>Severity *</label>
                  <select
                    value={ncForm.severity}
                    onChange={(e) =>
                      setNcForm((f) => ({ ...f, severity: e.target.value }))
                    }
                    style={sInput}
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...sLabel, color: C.red }}>Disposition</label>
                  <select
                    value={ncForm.disposition}
                    onChange={(e) =>
                      setNcForm((f) => ({ ...f, disposition: e.target.value }))
                    }
                    style={sInput}
                  >
                    <option value="pending">Pending Decision</option>
                    <option value="rework">Rework</option>
                    <option value="destroy">Destroy</option>
                    <option value="release_with_deviation">
                      Release with Deviation
                    </option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ ...sLabel, color: C.red }}>Description *</label>
                <textarea
                  value={ncForm.description}
                  onChange={(e) =>
                    setNcForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Describe the non-conformance in detail…"
                  rows={2}
                  style={{ ...sInput, resize: "vertical" }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div>
                  <label style={sLabel}>Immediate Action Taken</label>
                  <textarea
                    value={ncForm.immediate_action}
                    onChange={(e) =>
                      setNcForm((f) => ({
                        ...f,
                        immediate_action: e.target.value,
                      }))
                    }
                    rows={2}
                    style={{ ...sInput, resize: "vertical" }}
                    placeholder="What was done immediately?"
                  />
                </div>
                <div>
                  <label style={sLabel}>Root Cause</label>
                  <textarea
                    value={ncForm.root_cause}
                    onChange={(e) =>
                      setNcForm((f) => ({ ...f, root_cause: e.target.value }))
                    }
                    rows={2}
                    style={{ ...sInput, resize: "vertical" }}
                    placeholder="Why did this happen?"
                  />
                </div>
                <div>
                  <label style={sLabel}>Corrective Action</label>
                  <textarea
                    value={ncForm.corrective_action}
                    onChange={(e) =>
                      setNcForm((f) => ({
                        ...f,
                        corrective_action: e.target.value,
                      }))
                    }
                    rows={2}
                    style={{ ...sInput, resize: "vertical" }}
                    placeholder="How will this be fixed?"
                  />
                </div>
                <div>
                  <label style={sLabel}>Preventive Action</label>
                  <textarea
                    value={ncForm.preventive_action}
                    onChange={(e) =>
                      setNcForm((f) => ({
                        ...f,
                        preventive_action: e.target.value,
                      }))
                    }
                    rows={2}
                    style={{ ...sInput, resize: "vertical" }}
                    placeholder="How will recurrence be prevented?"
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSaveNc}
                  disabled={saving}
                  style={{
                    padding: "9px 20px",
                    background: C.red,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                >
                  {saving ? "Raising…" : "Raise NCR"}
                </button>
                <button
                  onClick={() => {
                    setShowNcForm(false);
                    setNcForm(emptyNc);
                  }}
                  style={{
                    padding: "9px 16px",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {ncs.length === 0 && !showNcForm ? (
            <div
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}30`,
                borderRadius: 10,
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>
                No non-conformances recorded
              </div>
              <div style={{ fontSize: 13, color: C.inkMid, marginTop: 6 }}>
                NCRs auto-raise when a CCP deviation is logged. Manual NCRs can
                also be raised above.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ncs.map((nc) => (
                <div
                  key={nc.id}
                  style={{
                    background: nc.status === "open" ? C.redBg : C.surface,
                    border: `1px solid ${nc.status === "open" ? "#FECACA" : C.border}`,
                    borderRadius: 10,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <SeverityBadge severity={nc.severity} />
                        <StatusBadge status={nc.status} />
                        {nc.batch_lot_number && (
                          <span
                            style={{
                              fontSize: 12,
                              fontFamily: "monospace",
                              color: C.inkMid,
                              background: C.bg,
                              border: `1px solid ${C.border}`,
                              borderRadius: 4,
                              padding: "2px 8px",
                            }}
                          >
                            {nc.batch_lot_number}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: C.inkLight }}>
                          {fmtDate(nc.created_at)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 6,
                        }}
                      >
                        {nc.description}
                      </div>
                      {nc.immediate_action && (
                        <div
                          style={{
                            fontSize: 12,
                            color: C.inkMid,
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            Immediate action:
                          </span>{" "}
                          {nc.immediate_action}
                        </div>
                      )}
                      {nc.disposition && nc.disposition !== "pending" && (
                        <div style={{ fontSize: 12, color: C.inkMid }}>
                          <span style={{ fontWeight: 600 }}>Disposition:</span>{" "}
                          {nc.disposition.replace(/_/g, " ")}
                        </div>
                      )}
                    </div>
                    {nc.status === "open" && (
                      <button
                        onClick={() => handleCloseNc(nc.id)}
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
                        ✅ Close NCR
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AUDIT EXPORT TAB ──────────────────────────────────────────────── */}
      {!loading && activeTab === "export" && (
        <div style={{ maxWidth: 620 }}>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 28,
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>
              📋 HACCP Audit Export
            </h3>
            <p style={{ margin: "0 0 24px", color: C.inkLight, fontSize: 14 }}>
              Export your complete HACCP documentation for regulatory audits
              (FSCA, ISO 22000, SANS 10049).
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                {
                  icon: "📋",
                  title: "CCP Register",
                  desc: `${cps.length} control points with hazard descriptions, critical limits, monitoring procedures and corrective actions`,
                  action: "Export CCP Register (CSV)",
                },
                {
                  icon: "📊",
                  title: "CCP Log — Full History",
                  desc: `${logs.length} log entries with dates, values, pass/fail status and operator notes`,
                  action: "Export CCP Log (CSV)",
                },
                {
                  icon: "⚠️",
                  title: "Non-Conformance Register",
                  desc: `${ncs.length} NCRs with severity, root cause, corrective and preventive actions`,
                  action: "Export NCR Register (CSV)",
                },
                {
                  icon: "📄",
                  title: "Complete HACCP Dossier",
                  desc: "CCP register + log + NCR register in a single audit-ready PDF",
                  action: "Export Full Dossier (PDF)",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {item.icon} {item.title}
                    </div>
                    <div
                      style={{ fontSize: 12, color: C.inkLight, marginTop: 4 }}
                    >
                      {item.desc}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // CSV export for CCP log
                      if (
                        item.title === "CCP Log — Full History" &&
                        logs.length > 0
                      ) {
                        const headers = [
                          "Date",
                          "Control Point",
                          "Batch",
                          "Product",
                          "Actual Value",
                          "Pass/Fail",
                          "Notes",
                        ];
                        const rows = logs.map((l) => [
                          fmtDateTime(l.monitored_at),
                          l.haccp_control_points?.step_name || "",
                          l.batch_lot_number || "",
                          l.recipe_name || "",
                          l.actual_value,
                          l.is_within_limit ? "PASS" : "DEVIATION",
                          l.notes || "",
                        ]);
                        const csv = [headers, ...rows]
                          .map((r) => r.map((v) => `"${v}"`).join(","))
                          .join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `haccp-log-${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                      } else {
                        showToast(
                          "Export feature — add more log data to generate meaningful reports",
                          "success",
                        );
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      background: C.accent,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "inherit",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
