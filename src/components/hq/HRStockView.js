// src/components/hq/HRStockView.js v1.0 — WP-STOCK-PRO S4
// HR Stock Intelligence & Stock Take Management
// Scope: HQ inventory_items + all shop tenant inventory_items (global info highway)
// No price data visible (cost_price, sell_price, weighted_avg_cost hidden from HR)
// 5 sub-tabs: Overview | Schedule | New Count | Live Count | History
// Stock take modes: Blind (hides system qty) | Guided (shows system qty)
// Variance thresholds: per-category configurable by owner
// Approval workflow: manual approve per variance line, reason required
// Adjustment audit: stock_movement INSERT (type=stock_take_adjustment) per approved line
// Tables: inventory_items, stock_take_sessions, stock_take_items, stock_take_schedules
// RULE 0G: useTenant() called inside this component

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.font,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sSelect = { ...sInput, cursor: "pointer" };
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
  fontFamily: T.font,
  whiteSpace: "nowrap",
  background: T.ink050,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink150}`,
  fontSize: "13px",
  fontFamily: T.font,
  verticalAlign: "middle",
};
const sCard = {
  background: "#fff",
  border: "1px solid " + T.ink150,
  borderRadius: "6px",
  padding: "20px",
  boxShadow: T.shadow,
};

const sBtn = (v = "primary") => ({
  padding: "8px 18px",
  fontFamily: T.font,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderRadius: "4px",
  cursor: "pointer",
  background:
    v === "primary"
      ? T.accentMid
      : v === "danger"
        ? T.danger
        : v === "warning"
          ? T.warning
          : "transparent",
  color: ["primary", "danger", "warning"].includes(v) ? "#fff" : T.accentMid,
  border: ["primary", "danger", "warning"].includes(v)
    ? "none"
    : `1px solid ${T.accentBd}`,
});

const sBadge = (v) => ({
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "2px",
  padding: "2px 7px",
  ...(v === "danger"
    ? {
        background: T.dangerBg,
        color: T.danger,
        border: "1px solid " + T.dangerBd,
      }
    : {}),
  ...(v === "warning"
    ? {
        background: T.warningBg,
        color: T.warning,
        border: "1px solid " + T.warningBd,
      }
    : {}),
  ...(v === "success"
    ? {
        background: T.successBg,
        color: T.success,
        border: "1px solid " + T.successBd,
      }
    : {}),
  ...(v === "info"
    ? { background: T.infoBg, color: T.info, border: "1px solid " + T.infoBd }
    : {}),
  ...(v === "default"
    ? { background: T.ink075, color: T.ink500, border: "1px solid " + T.ink150 }
    : {}),
});

const CATEGORY_LABELS = {
  finished_product: "Finished Product",
  raw_material: "Raw Material",
  terpene: "Terpene",
  hardware: "Hardware",
  packaging: "Packaging",
  concentrate: "Concentrate",
  flower: "Flower",
  accessory: "Accessory",
  ingredient: "Ingredient",
  equipment: "Equipment",
  other: "Other",
};

const SCHEDULE_OPTIONS = [
  { value: "adhoc", label: "Ad Hoc (trigger anytime)" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtQty = (n, unit) =>
  n == null
    ? "—"
    : `${Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}${unit ? " " + unit : ""}`;

// Default category thresholds (% variance before flagging)
const DEFAULT_THRESHOLDS = {
  raw_material: 2,
  ingredient: 2,
  concentrate: 2,
  flower: 2,
  terpene: 2,
  finished_product: 5,
  packaging: 10,
  hardware: 10,
  equipment: 15,
  accessory: 10,
  other: 5,
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function HRStockView({ tenantId }) {
  const { industryProfile } = useTenant();
  const [subTab, setSubTab] = useState("overview");

  // Stock data
  const [items, setItems] = useState([]);
  const [allTenants, setAllTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stock take sessions
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionItems, setSessionItems] = useState([]);

  // Schedule config
  const [schedule, setSchedule] = useState(null);
  const [schedSaving, setSchedSaving] = useState(false);

  // New session form
  const [newSessionForm, setNewSessionForm] = useState({
    title: "",
    schedule_type: "adhoc",
    count_mode: "blind",
    scope: "hq", // hq | all
  });
  const [startingSess, setStartingSess] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all tenants for global view
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, name, industry_profile")
        .order("name");

      setAllTenants(tenantData || []);

      // Load HQ items
      const { data: hqItems, error: hqErr } = await supabase
        .from("inventory_items")
        .select(
          "id, name, sku, category, unit, quantity_on_hand, reserved_qty, reorder_level, expiry_date, temperature_zone, allergen_flags, tenant_id, is_active",
        )
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (hqErr) throw hqErr;

      // Load all shop tenant items
      const shopTenants = (tenantData || []).filter((t) => t.id !== tenantId);
      let shopItems = [];
      if (shopTenants.length > 0) {
        const { data: shopData } = await supabase
          .from("inventory_items")
          .select(
            "id, name, sku, category, unit, quantity_on_hand, reserved_qty, reorder_level, expiry_date, temperature_zone, allergen_flags, tenant_id, is_active",
          )
          .in(
            "tenant_id",
            shopTenants.map((t) => t.id),
          )
          .eq("is_active", true)
          .order("name");
        shopItems = shopData || [];
      }

      setItems([...(hqItems || []), ...shopItems]);

      // Load sessions
      const { data: sessData } = await supabase
        .from("stock_take_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      setSessions(sessData || []);

      // Check for active session
      const active = (sessData || []).find((s) =>
        ["open", "in_progress"].includes(s.status),
      );
      if (active) {
        setActiveSession(active);
        const { data: sItems } = await supabase
          .from("stock_take_items")
          .select("*, inventory_items(name, sku, category, unit)")
          .eq("session_id", active.id)
          .order("inventory_items(name)");
        setSessionItems(sItems || []);
        if (active.status === "in_progress") setSubTab("count");
      }

      // Load schedule config
      const { data: schedData } = await supabase
        .from("stock_take_schedules")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();
      if (schedData) {
        setSchedule(schedData);
      } else {
        setSchedule({
          tenant_id: tenantId,
          frequency: "monthly",
          next_due: null,
          reminder_days_before: 3,
          category_thresholds: DEFAULT_THRESHOLDS,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save schedule ──────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    setSchedSaving(true);
    try {
      const { data: existing } = await supabase
        .from("stock_take_schedules")
        .select("id")
        .eq("tenant_id", tenantId)
        .single();
      if (existing) {
        await supabase
          .from("stock_take_schedules")
          .update({ ...schedule, updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId);
      } else {
        await supabase
          .from("stock_take_schedules")
          .insert({ ...schedule, tenant_id: tenantId });
      }
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSchedSaving(false);
    }
  };

  // ── Start new stock take session ───────────────────────────────────────────
  const startSession = async () => {
    if (activeSession) {
      alert("Close the current session before starting a new one.");
      return;
    }
    setStartingSess(true);
    try {
      // Insert session
      const { data: sess, error: sErr } = await supabase
        .from("stock_take_sessions")
        .insert({
          tenant_id: tenantId,
          title:
            newSessionForm.title ||
            `Stock Take — ${new Date().toLocaleDateString("en-ZA")}`,
          schedule_type: newSessionForm.schedule_type,
          count_mode: newSessionForm.count_mode,
          status: "open",
        })
        .select()
        .single();
      if (sErr) throw sErr;

      // Determine which items to include
      const scopeItems =
        newSessionForm.scope === "hq"
          ? items.filter((i) => i.tenant_id === tenantId)
          : items;

      // Snapshot current quantities into stock_take_items
      const lines = scopeItems.map((i) => ({
        session_id: sess.id,
        item_id: i.id,
        system_qty: i.quantity_on_hand || 0,
        status: "pending",
      }));

      await supabase.from("stock_take_items").insert(lines);

      setActiveSession(sess);
      setSubTab("count");
      load();
    } catch (err) {
      alert("Error starting session: " + err.message);
    } finally {
      setStartingSess(false);
    }
  };

  // ── Submit count for a single item ────────────────────────────────────────
  const submitCount = async (sItem, countedQty, notes) => {
    if (countedQty === "" || countedQty == null) return;
    const qty = parseFloat(countedQty);
    const variance = qty - sItem.system_qty;
    const variancePct =
      sItem.system_qty > 0 ? Math.abs((variance / sItem.system_qty) * 100) : 0;

    await supabase
      .from("stock_take_items")
      .update({
        counted_qty: qty,
        variance,
        variance_pct: variancePct,
        status: "counted",
        counted_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq("id", sItem.id);

    // Refresh session items
    const { data } = await supabase
      .from("stock_take_items")
      .select("*, inventory_items(name, sku, category, unit)")
      .eq("session_id", activeSession.id)
      .order("inventory_items(name)");
    setSessionItems(data || []);

    // Mark session as in_progress
    if (activeSession.status === "open") {
      await supabase
        .from("stock_take_sessions")
        .update({ status: "in_progress" })
        .eq("id", activeSession.id);
    }
  };

  // ── Submit session for review ──────────────────────────────────────────────
  const submitForReview = async () => {
    const uncounted = sessionItems.filter((i) => i.status === "pending").length;
    if (uncounted > 0) {
      if (
        !window.confirm(
          `${uncounted} item${uncounted !== 1 ? "s" : ""} not yet counted. Submit anyway? Uncounted items will be skipped.`,
        )
      )
        return;
    }
    await supabase
      .from("stock_take_sessions")
      .update({ status: "pending_approval" })
      .eq("id", activeSession.id);
    load();
    setSubTab("review");
  };

  // ── Approve variance line ──────────────────────────────────────────────────
  const approveLine = async (sItem, applyAdjustment, reason) => {
    if (applyAdjustment && !reason?.trim()) {
      alert("Reason required for stock adjustment audit trail.");
      return;
    }

    await supabase
      .from("stock_take_items")
      .update({
        status: applyAdjustment ? "adjusted" : "approved",
        approved_at: new Date().toISOString(),
        adjustment_applied: applyAdjustment,
        notes: reason || sItem.notes,
      })
      .eq("id", sItem.id);

    if (applyAdjustment) {
      // Apply the adjustment to inventory
      const newQty = Math.max(
        0,
        (sItem.inventory_items?.quantity_on_hand || sItem.system_qty) +
          sItem.variance,
      );
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: newQty })
        .eq("id", sItem.item_id);
      // Write audit movement
      await supabase.from("stock_movements").insert({
        item_id: sItem.item_id,
        tenant_id: tenantId,
        movement_type: "stock_take_adjustment",
        quantity: sItem.variance,
        reference: `STKA-${activeSession.id.slice(-8).toUpperCase()}`,
        notes: reason || "Stock take adjustment",
        unit_cost: null,
      });
    }

    const { data } = await supabase
      .from("stock_take_items")
      .select("*, inventory_items(name, sku, category, unit)")
      .eq("session_id", activeSession.id)
      .order("inventory_items(name)");
    setSessionItems(data || []);
  };

  // ── Complete session ───────────────────────────────────────────────────────
  const completeSession = async () => {
    const pending = sessionItems.filter((i) =>
      ["pending", "counted"].includes(i.status),
    ).length;
    if (
      pending > 0 &&
      !window.confirm(
        `${pending} item${pending !== 1 ? "s" : ""} still pending approval. Complete anyway?`,
      )
    )
      return;
    await supabase
      .from("stock_take_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", activeSession.id);
    // Update last_completed in schedule
    await supabase
      .from("stock_take_schedules")
      .update({
        last_completed: new Date().toISOString().split("T")[0],
      })
      .eq("tenant_id", tenantId);
    setActiveSession(null);
    setSessionItems([]);
    load();
    setSubTab("overview");
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getTenantName = (id) =>
    allTenants.find((t) => t.id === id)?.name || "HQ";
  const getThreshold = (category) =>
    schedule?.category_thresholds?.[category] ??
    DEFAULT_THRESHOLDS[category] ??
    5;
  const isAboveThreshold = (item) =>
    item.variance_pct != null &&
    item.variance_pct > getThreshold(item.inventory_items?.category);

  const daysUntilDue = schedule?.next_due
    ? Math.ceil((new Date(schedule.next_due) - new Date()) / 86400000)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <p
        style={{
          padding: "32px 0",
          color: T.ink300,
          fontSize: "13px",
          fontFamily: T.font,
        }}
      >
        Loading stock data...
      </p>
    );
  if (error)
    return (
      <div
        style={{
          padding: "16px",
          background: T.dangerBg,
          border: "1px solid " + T.dangerBd,
          borderRadius: "4px",
          color: T.danger,
        }}
      >
        {error}
      </div>
    );

  const lowItems = items.filter(
    (i) =>
      i.reorder_level != null && (i.quantity_on_hand || 0) <= i.reorder_level,
  );
  const expiringItems = items.filter((i) => {
    if (!i.expiry_date) return false;
    return Math.ceil((new Date(i.expiry_date) - new Date()) / 86400000) < 30;
  });
  const countedPct =
    sessionItems.length > 0
      ? Math.round(
          (sessionItems.filter((i) => i.status !== "pending").length /
            sessionItems.length) *
            100,
        )
      : 0;
  const varianceLines = sessionItems.filter(
    (i) => i.variance !== 0 && i.counted_qty != null,
  );
  const flaggedLines = varianceLines.filter(isAboveThreshold);

  const TABS_DEF = [
    { id: "overview", label: "Overview" },
    { id: "schedule", label: "Schedule & Config" },
    { id: "new", label: "New Count" },
    {
      id: "count",
      label: activeSession ? `Live Count (${countedPct}%)` : "Live Count",
      disabled: !activeSession,
    },
    {
      id: "review",
      label:
        flaggedLines.length > 0
          ? `Review & Approve (${flaggedLines.length})`
          : "Review & Approve",
      disabled: !activeSession,
    },
    { id: "history", label: "History" },
  ];

  return (
    <div style={{ fontFamily: T.font, color: T.ink700, maxWidth: "1100px" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "0",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Outfit','Helvetica Neue',Arial,sans-serif",
              fontSize: "18px",
              fontWeight: 400,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            Stock Management
          </h2>
          <p style={{ fontSize: "12px", color: T.ink300, margin: 0 }}>
            {items.length} item{items.length !== 1 ? "s" : ""} across{" "}
            {allTenants.length} location{allTenants.length !== 1 ? "s" : ""}
            {lowItems.length > 0 && (
              <span
                style={{ color: T.danger, fontWeight: 600, marginLeft: "10px" }}
              >
                {lowItems.length} below reorder level
              </span>
            )}
            {daysUntilDue != null &&
              daysUntilDue <= (schedule?.reminder_days_before || 3) && (
                <span
                  style={{
                    color: T.warning,
                    fontWeight: 600,
                    marginLeft: "10px",
                  }}
                >
                  ⚠ Stock take due in {daysUntilDue}d
                </span>
              )}
          </p>
        </div>
        {activeSession && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: T.info, fontWeight: 600 }}>
              ● Active count: {activeSession.title}
            </span>
            <button
              style={{
                ...sBtn("outline"),
                padding: "5px 12px",
                fontSize: "11px",
              }}
              onClick={() => setSubTab("count")}
            >
              Continue →
            </button>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid " + T.ink150,
          marginBottom: "24px",
          marginTop: "16px",
          overflowX: "auto",
        }}
      >
        {TABS_DEF.map((t) => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setSubTab(t.id)}
            style={{
              padding: "10px 16px",
              background: "none",
              border: "none",
              borderBottom:
                subTab === t.id
                  ? "2px solid " + T.accentMid
                  : "2px solid transparent",
              fontFamily: T.font,
              fontSize: "11px",
              fontWeight: subTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: t.disabled
                ? T.ink300
                : subTab === t.id
                  ? T.accentMid
                  : T.ink500,
              cursor: t.disabled ? "not-allowed" : "pointer",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {subTab === "overview" && (
        <div style={{ display: "grid", gap: "20px" }}>
          {/* KPI grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "1px",
              background: T.ink150,
              borderRadius: "6px",
              overflow: "hidden",
              border: "1px solid " + T.ink150,
            }}
          >
            {[
              { label: "Total Items", value: items.length, top: T.ink150 },
              { label: "Locations", value: allTenants.length, top: T.ink150 },
              {
                label: "Low Stock",
                value: lowItems.length,
                top: lowItems.length > 0 ? T.warning : T.ink150,
              },
              {
                label: "Expiring <30d",
                value: expiringItems.length,
                top: expiringItems.length > 0 ? T.warning : T.ink150,
              },
              {
                label: "Active Count",
                value: activeSession ? "Yes" : "None",
                top: activeSession ? T.info : T.ink150,
              },
              {
                label: "Last Count",
                value: schedule?.last_completed
                  ? fmtDate(schedule.last_completed)
                  : "Never",
                top: T.ink150,
              },
              {
                label: "Next Due",
                value: schedule?.next_due
                  ? fmtDate(schedule.next_due)
                  : "Not set",
                top:
                  daysUntilDue != null && daysUntilDue <= 3
                    ? T.warning
                    : T.ink150,
              },
              {
                label: "Count Frequency",
                value:
                  SCHEDULE_OPTIONS.find(
                    (s) => s.value === schedule?.frequency,
                  )?.label?.split(" ")[0] || "—",
                top: T.ink150,
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: "#fff",
                  padding: "16px 18px",
                  borderTop: "3px solid " + k.top,
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 400,
                    color: T.ink900,
                    fontFamily: T.mono,
                    lineHeight: 1,
                    marginBottom: "4px",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {k.value}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: T.ink400,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          {/* Low stock summary */}
          {lowItems.length > 0 && (
            <div style={{ ...sCard, borderLeft: "3px solid " + T.warning }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.warning,
                  marginBottom: "12px",
                }}
              >
                Low Stock — {lowItems.length} item
                {lowItems.length !== 1 ? "s" : ""} below reorder level
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr>
                    {["Item", "Location", "On Hand", "Reorder Level"].map(
                      (h) => (
                        <th key={h} style={sTh}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lowItems.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td style={{ ...sTd, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ ...sTd, fontSize: "11px", color: T.ink400 }}>
                        {getTenantName(item.tenant_id)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.mono,
                          color: T.danger,
                          fontWeight: 700,
                        }}
                      >
                        {fmtQty(item.quantity_on_hand, item.unit)}
                      </td>
                      <td
                        style={{ ...sTd, fontFamily: T.mono, color: T.ink400 }}
                      >
                        {fmtQty(item.reorder_level, item.unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recent sessions summary */}
          {sessions.length > 0 && (
            <div style={sCard}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: "12px",
                }}
              >
                Recent Stock Take Sessions
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Session",
                      "Type",
                      "Mode",
                      "Status",
                      "Date",
                      "Variances",
                    ].map((h) => (
                      <th key={h} style={sTh}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 5).map((s) => (
                    <tr key={s.id}>
                      <td style={{ ...sTd, fontWeight: 500 }}>{s.title}</td>
                      <td style={{ ...sTd, fontSize: "11px" }}>
                        {SCHEDULE_OPTIONS.find(
                          (o) => o.value === s.schedule_type,
                        )?.label?.split(" ")[0] || s.schedule_type}
                      </td>
                      <td style={{ ...sTd, fontSize: "11px" }}>
                        {s.count_mode === "blind" ? "Blind" : "Guided"}
                      </td>
                      <td style={sTd}>
                        <span
                          style={sBadge(
                            s.status === "completed"
                              ? "success"
                              : s.status === "pending_approval"
                                ? "warning"
                                : "info",
                          )}
                        >
                          {s.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink400,
                          fontFamily: T.mono,
                        }}
                      >
                        {fmtDate(s.created_at)}
                      </td>
                      <td style={{ ...sTd, fontSize: "11px", color: T.ink400 }}>
                        —
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE & CONFIG ── */}
      {subTab === "schedule" && schedule && (
        <div style={{ display: "grid", gap: "20px", maxWidth: "680px" }}>
          <div style={sCard}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: T.ink700,
                marginBottom: "20px",
              }}
            >
              Count Schedule & Reminders
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "10px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Frequency
                </label>
                <select
                  style={sSelect}
                  value={schedule.frequency}
                  onChange={(e) =>
                    setSchedule({ ...schedule, frequency: e.target.value })
                  }
                >
                  {SCHEDULE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "10px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Next Due Date
                </label>
                <input
                  type="date"
                  style={sInput}
                  value={schedule.next_due || ""}
                  onChange={(e) =>
                    setSchedule({ ...schedule, next_due: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "10px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Reminder (days before)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  style={sInput}
                  value={schedule.reminder_days_before}
                  onChange={(e) =>
                    setSchedule({
                      ...schedule,
                      reminder_days_before: parseInt(e.target.value) || 3,
                    })
                  }
                />
              </div>
              {schedule.last_completed && (
                <div>
                  <label
                    style={{
                      fontSize: "10px",
                      color: T.ink500,
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Last Completed
                  </label>
                  <div
                    style={{
                      padding: "8px 12px",
                      background: T.ink075,
                      borderRadius: "4px",
                      fontSize: "13px",
                      color: T.ink500,
                    }}
                  >
                    {fmtDate(schedule.last_completed)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={sCard}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: T.ink700,
                marginBottom: "4px",
              }}
            >
              Variance Thresholds by Category
            </div>
            <p
              style={{ fontSize: "11px", color: T.ink400, margin: "0 0 16px" }}
            >
              Set the % variance at which a discrepancy is flagged for approval.
              Lower = stricter. Higher = only large gaps flagged.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <label style={{ fontSize: "12px", color: T.ink700, flex: 1 }}>
                    {label}
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      style={{ ...sInput, width: "70px", textAlign: "right" }}
                      value={
                        schedule.category_thresholds?.[cat] ??
                        DEFAULT_THRESHOLDS[cat] ??
                        5
                      }
                      onChange={(e) =>
                        setSchedule({
                          ...schedule,
                          category_thresholds: {
                            ...schedule.category_thresholds,
                            [cat]: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                    <span style={{ fontSize: "11px", color: T.ink400 }}>%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            style={{ ...sBtn(), alignSelf: "flex-start" }}
            onClick={saveSchedule}
            disabled={schedSaving}
          >
            {schedSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      )}

      {/* ── NEW COUNT ── */}
      {subTab === "new" && (
        <div style={{ maxWidth: "560px" }}>
          {activeSession ? (
            <div style={{ ...sCard, borderLeft: "3px solid " + T.info }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: T.info,
                  marginBottom: "8px",
                }}
              >
                Active Session in Progress
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: T.ink500,
                  margin: "0 0 16px",
                }}
              >
                "{activeSession.title}" is currently open. Complete or cancel it
                before starting a new count.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={sBtn()} onClick={() => setSubTab("count")}>
                  Continue Counting →
                </button>
                <button
                  style={{ ...sBtn("danger"), fontSize: "11px" }}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Cancel this session? All counted data will be lost.",
                      )
                    )
                      return;
                    await supabase
                      .from("stock_take_sessions")
                      .update({ status: "cancelled" })
                      .eq("id", activeSession.id);
                    setActiveSession(null);
                    setSessionItems([]);
                    load();
                  }}
                >
                  Cancel Session
                </button>
              </div>
            </div>
          ) : (
            <div style={sCard}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: T.ink700,
                  marginBottom: "20px",
                }}
              >
                Start New Stock Take
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    fontSize: "10px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Session Title
                </label>
                <input
                  style={sInput}
                  value={newSessionForm.title}
                  onChange={(e) =>
                    setNewSessionForm({
                      ...newSessionForm,
                      title: e.target.value,
                    })
                  }
                  placeholder={`Stock Take — ${new Date().toLocaleDateString("en-ZA")}`}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "10px",
                      color: T.ink500,
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Count Type
                  </label>
                  <select
                    style={sSelect}
                    value={newSessionForm.schedule_type}
                    onChange={(e) =>
                      setNewSessionForm({
                        ...newSessionForm,
                        schedule_type: e.target.value,
                      })
                    }
                  >
                    {SCHEDULE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "10px",
                      color: T.ink500,
                      display: "block",
                      marginBottom: "5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Count Mode
                  </label>
                  <select
                    style={sSelect}
                    value={newSessionForm.count_mode}
                    onChange={(e) =>
                      setNewSessionForm({
                        ...newSessionForm,
                        count_mode: e.target.value,
                      })
                    }
                  >
                    <option value="blind">
                      Blind — hide system qty (most accurate)
                    </option>
                    <option value="guided">
                      Guided — show system qty (faster)
                    </option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    fontSize: "10px",
                    color: T.ink500,
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Scope
                </label>
                <select
                  style={sSelect}
                  value={newSessionForm.scope}
                  onChange={(e) =>
                    setNewSessionForm({
                      ...newSessionForm,
                      scope: e.target.value,
                    })
                  }
                >
                  <option value="hq">
                    HQ Stock only (
                    {items.filter((i) => i.tenant_id === tenantId).length}{" "}
                    items)
                  </option>
                  <option value="all">
                    All locations — HQ + all shops ({items.length} items)
                  </option>
                </select>
              </div>

              {/* Mode explanation */}
              <div
                style={{
                  padding: "12px 14px",
                  background:
                    newSessionForm.count_mode === "blind"
                      ? T.infoBg
                      : T.accentLit,
                  border:
                    "1px solid " +
                    (newSessionForm.count_mode === "blind"
                      ? T.infoBd
                      : T.accentBd),
                  borderRadius: "4px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color:
                      newSessionForm.count_mode === "blind"
                        ? T.info
                        : T.accentMid,
                    marginBottom: "4px",
                  }}
                >
                  {newSessionForm.count_mode === "blind"
                    ? "Blind Count — Industry Best Practice"
                    : "Guided Count — Faster, Less Rigorous"}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color:
                      newSessionForm.count_mode === "blind"
                        ? T.info
                        : T.accentMid,
                  }}
                >
                  {newSessionForm.count_mode === "blind"
                    ? "System quantities are hidden until you submit your count. This prevents anchoring bias and produces the most accurate results. Recommended for monthly and quarterly counts."
                    : "System quantities are shown alongside your count entry. Faster for spot checks and delivery confirmations. Less suitable for formal audits."}
                </div>
              </div>

              <button
                style={{ ...sBtn(), width: "100%" }}
                onClick={startSession}
                disabled={startingSess}
              >
                {startingSess
                  ? "Creating session..."
                  : `Start Stock Take — ${newSessionForm.count_mode === "blind" ? "Blind" : "Guided"} Mode`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── LIVE COUNT ── */}
      {subTab === "count" && activeSession && (
        <div>
          {/* Session header */}
          <div
            style={{
              ...sCard,
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div
                style={{ fontSize: "13px", fontWeight: 700, color: T.ink700 }}
              >
                {activeSession.title}
              </div>
              <div
                style={{ fontSize: "11px", color: T.ink400, marginTop: "2px" }}
              >
                {activeSession.count_mode === "blind"
                  ? "Blind count"
                  : "Guided count"}{" "}
                · {sessionItems.filter((i) => i.status !== "pending").length} of{" "}
                {sessionItems.length} counted ({countedPct}%)
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ flex: 1, maxWidth: "300px" }}>
              <div
                style={{
                  height: "8px",
                  background: T.ink150,
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: countedPct + "%",
                    background: T.accentMid,
                    borderRadius: "4px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: T.ink400,
                  marginTop: "4px",
                  textAlign: "right",
                }}
              >
                {countedPct}% complete
              </div>
            </div>
            <button
              style={{ ...sBtn("outline"), fontSize: "11px" }}
              onClick={submitForReview}
              disabled={
                sessionItems.filter((i) => i.status !== "pending").length === 0
              }
            >
              Submit for Review →
            </button>
          </div>

          {/* Count table */}
          <div
            style={{
              background: "#fff",
              border: "1px solid " + T.ink150,
              borderRadius: "6px",
              overflow: "auto",
              boxShadow: T.shadow,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                fontFamily: T.font,
              }}
            >
              <thead>
                <tr>
                  <th style={sTh}>Item</th>
                  <th style={sTh}>Category</th>
                  <th style={sTh}>Location</th>
                  {activeSession.count_mode === "guided" && (
                    <th style={{ ...sTh, textAlign: "right" }}>System Qty</th>
                  )}
                  <th style={{ ...sTh, textAlign: "right" }}>Counted Qty</th>
                  {activeSession.count_mode === "guided" && (
                    <th style={{ ...sTh, textAlign: "right" }}>Variance</th>
                  )}
                  <th style={sTh}>Notes</th>
                  <th style={sTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionItems.map((sItem) => (
                  <CountRow
                    key={sItem.id}
                    sItem={sItem}
                    countMode={activeSession.count_mode}
                    getTenantName={getTenantName}
                    items={items}
                    onSubmit={submitCount}
                    threshold={getThreshold(sItem.inventory_items?.category)}
                    sTh={sTh}
                    sTd={sTd}
                    sBadge={sBadge}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REVIEW & APPROVE ── */}
      {subTab === "review" && activeSession && (
        <div>
          <div
            style={{
              ...sCard,
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div
                style={{ fontSize: "13px", fontWeight: 700, color: T.ink700 }}
              >
                {activeSession.title} — Variance Review
              </div>
              <div
                style={{ fontSize: "11px", color: T.ink400, marginTop: "2px" }}
              >
                {flaggedLines.length} line{flaggedLines.length !== 1 ? "s" : ""}{" "}
                above threshold · {varianceLines.length} total variance
                {varianceLines.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button style={sBtn()} onClick={completeSession}>
              Complete Session ✓
            </button>
          </div>

          {/* Flagged variances */}
          {flaggedLines.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.warning,
                  marginBottom: "10px",
                }}
              >
                Above Threshold — Require Approval
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid " + T.ink150,
                  borderRadius: "6px",
                  overflow: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={sTh}>Item</th>
                      <th style={{ ...sTh, textAlign: "right" }}>System Qty</th>
                      <th style={{ ...sTh, textAlign: "right" }}>Counted</th>
                      <th style={{ ...sTh, textAlign: "right" }}>Variance</th>
                      <th style={{ ...sTh, textAlign: "right" }}>Var %</th>
                      <th style={sTh}>Threshold</th>
                      <th style={sTh}>Status</th>
                      <th style={sTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedLines.map((sItem) => (
                      <ApprovalRow
                        key={sItem.id}
                        sItem={sItem}
                        threshold={getThreshold(
                          sItem.inventory_items?.category,
                        )}
                        onApprove={approveLine}
                        sTd={sTd}
                        sBadge={sBadge}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All variances summary */}
          {varianceLines.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: "10px",
                }}
              >
                All Variances ({varianceLines.length})
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid " + T.ink150,
                  borderRadius: "6px",
                  overflow: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "Item",
                        "System",
                        "Counted",
                        "Variance",
                        "Var %",
                        "Status",
                      ].map((h) => (
                        <th key={h} style={sTh}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {varianceLines.map((sItem) => {
                      const above = isAboveThreshold(sItem);
                      return (
                        <tr
                          key={sItem.id}
                          style={{ background: above ? T.warningBg : "#fff" }}
                        >
                          <td style={{ ...sTd, fontWeight: 500 }}>
                            {sItem.inventory_items?.name}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              fontFamily: T.mono,
                              textAlign: "right",
                            }}
                          >
                            {fmtQty(
                              sItem.system_qty,
                              sItem.inventory_items?.unit,
                            )}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              fontFamily: T.mono,
                              textAlign: "right",
                            }}
                          >
                            {fmtQty(
                              sItem.counted_qty,
                              sItem.inventory_items?.unit,
                            )}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              fontFamily: T.mono,
                              textAlign: "right",
                              color: sItem.variance > 0 ? T.success : T.danger,
                              fontWeight: 700,
                            }}
                          >
                            {sItem.variance > 0 ? "+" : ""}
                            {fmtQty(
                              sItem.variance,
                              sItem.inventory_items?.unit,
                            )}
                          </td>
                          <td
                            style={{
                              ...sTd,
                              fontFamily: T.mono,
                              textAlign: "right",
                              color: above ? T.warning : T.ink400,
                            }}
                          >
                            {sItem.variance_pct?.toFixed(1)}%
                          </td>
                          <td style={sTd}>
                            <span
                              style={sBadge(
                                sItem.status === "adjusted"
                                  ? "success"
                                  : sItem.status === "approved"
                                    ? "info"
                                    : above
                                      ? "warning"
                                      : "default",
                              )}
                            >
                              {sItem.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {varianceLines.length === 0 && (
            <div style={{ ...sCard, textAlign: "center", color: T.success }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>✓</div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>
                No variances found
              </div>
              <div
                style={{ fontSize: "12px", color: T.ink400, marginTop: "4px" }}
              >
                All counted quantities match system records.
              </div>
              <button
                style={{ ...sBtn(), marginTop: "16px" }}
                onClick={completeSession}
              >
                Complete Session
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {subTab === "history" && (
        <div>
          {sessions.length === 0 ? (
            <div
              style={{
                ...sCard,
                textAlign: "center",
                color: T.ink300,
                padding: "40px",
              }}
            >
              No stock take sessions recorded yet.{" "}
              <span
                style={{
                  color: T.accentMid,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                onClick={() => setSubTab("new")}
              >
                Start your first count →
              </span>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid " + T.ink150,
                borderRadius: "6px",
                overflow: "auto",
                boxShadow: T.shadow,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Session Title",
                      "Type",
                      "Mode",
                      "Scope",
                      "Status",
                      "Started",
                      "Completed",
                      "Items",
                      "Variances",
                    ].map((h) => (
                      <th key={h} style={sTh}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td style={{ ...sTd, fontWeight: 500 }}>{s.title}</td>
                      <td style={{ ...sTd, fontSize: "11px" }}>
                        {SCHEDULE_OPTIONS.find(
                          (o) => o.value === s.schedule_type,
                        )?.label?.split(" ")[0] || s.schedule_type}
                      </td>
                      <td style={{ ...sTd, fontSize: "11px" }}>
                        {s.count_mode === "blind" ? "Blind" : "Guided"}
                      </td>
                      <td style={{ ...sTd, fontSize: "11px", color: T.ink400 }}>
                        HQ
                      </td>
                      <td style={sTd}>
                        <span
                          style={sBadge(
                            s.status === "completed"
                              ? "success"
                              : s.status === "cancelled"
                                ? "danger"
                                : s.status === "pending_approval"
                                  ? "warning"
                                  : "info",
                          )}
                        >
                          {s.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink400,
                          fontFamily: T.mono,
                        }}
                      >
                        {fmtDate(s.created_at)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink400,
                          fontFamily: T.mono,
                        }}
                      >
                        {s.completed_at ? fmtDate(s.completed_at) : "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.mono,
                          textAlign: "right",
                        }}
                      >
                        —
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.mono,
                          textAlign: "right",
                        }}
                      >
                        —
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Count row — live entry ────────────────────────────────────────────────────
function CountRow({
  sItem,
  countMode,
  getTenantName,
  items,
  onSubmit,
  threshold,
  sTd,
  sBadge,
}) {
  const [qty, setQty] = useState(
    sItem.counted_qty != null ? String(sItem.counted_qty) : "",
  );
  const [notes, setNotes] = useState(sItem.notes || "");
  const [saving, setSaving] = useState(false);
  const item = sItem.inventory_items;
  const isDone = sItem.status !== "pending";
  const fullItem = items.find((i) => i.id === sItem.item_id);
  const variance = qty !== "" ? parseFloat(qty) - sItem.system_qty : null;
  const varPct =
    variance != null && sItem.system_qty > 0
      ? Math.abs((variance / sItem.system_qty) * 100)
      : 0;
  const isAbove = varPct > threshold;

  const submit = async () => {
    if (qty === "") return;
    setSaving(true);
    await onSubmit(sItem, qty, notes);
    setSaving(false);
  };

  return (
    <tr
      style={{
        background: isDone ? (isAbove ? T.warningBg : T.successBg) : "#fff",
        opacity: isDone ? 0.85 : 1,
      }}
    >
      <td style={{ ...sTd, fontWeight: 600 }}>
        {item?.name}
        <div
          style={{
            fontSize: "10px",
            color: "#999",
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {item?.sku}
        </div>
      </td>
      <td style={{ ...sTd, fontSize: "11px" }}>
        {item?.category ? item.category.replace(/_/g, " ") : "—"}
      </td>
      <td style={{ ...sTd, fontSize: "11px", color: "#6B6B6B" }}>
        {getTenantName(fullItem?.tenant_id)}
      </td>
      {countMode === "guided" && (
        <td
          style={{
            ...sTd,
            textAlign: "right",
            fontFamily: "'DM Mono',monospace",
            color: "#6B6B6B",
          }}
        >
          {fmtQty(sItem.system_qty, item?.unit)}
        </td>
      )}
      <td style={{ ...sTd, textAlign: "right" }}>
        {isDone ? (
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
            {fmtQty(sItem.counted_qty, item?.unit)}
          </span>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              justifyContent: "flex-end",
            }}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Enter count..."
              style={{
                padding: "6px 8px",
                border: "1px solid #E2E2E2",
                borderRadius: "3px",
                fontSize: "13px",
                width: "110px",
                textAlign: "right",
                fontFamily: "'DM Mono',monospace",
              }}
              autoFocus={false}
            />
            <span style={{ fontSize: "11px", color: "#999" }}>
              {item?.unit}
            </span>
            <button
              onClick={submit}
              disabled={saving || qty === ""}
              style={{
                padding: "5px 12px",
                background: "#2D6A4F",
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                fontSize: "11px",
                cursor: qty === "" ? "not-allowed" : "pointer",
                opacity: qty === "" ? 0.5 : 1,
                fontWeight: 600,
              }}
            >
              {saving ? "..." : "✓"}
            </button>
          </div>
        )}
      </td>
      {countMode === "guided" && (
        <td
          style={{
            ...sTd,
            textAlign: "right",
            fontFamily: "'DM Mono',monospace",
            color:
              variance == null
                ? "#999"
                : variance > 0
                  ? "#166534"
                  : variance < 0
                    ? "#991B1B"
                    : "#999",
            fontWeight: variance != null && variance !== 0 ? 700 : 400,
          }}
        >
          {variance != null
            ? (variance > 0 ? "+" : "") + fmtQty(variance, item?.unit)
            : "—"}
          {isAbove && variance != null && (
            <div style={{ fontSize: "9px", color: "#92400E", fontWeight: 700 }}>
              ⚠ {varPct.toFixed(1)}%
            </div>
          )}
        </td>
      )}
      <td style={sTd}>
        {!isDone ? (
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note..."
            style={{
              padding: "5px 8px",
              border: "1px solid #E2E2E2",
              borderRadius: "3px",
              fontSize: "11px",
              width: "160px",
            }}
          />
        ) : (
          <span
            style={{ fontSize: "11px", color: "#6B6B6B", fontStyle: "italic" }}
          >
            {sItem.notes || "—"}
          </span>
        )}
      </td>
      <td style={sTd}>
        <span
          style={sBadge(isDone ? (isAbove ? "warning" : "success") : "default")}
        >
          {isDone ? (isAbove ? "variance" : "ok") : "pending"}
        </span>
      </td>
    </tr>
  );
}

// ── Approval row ───────────────────────────────────────────────────────────────
function ApprovalRow({ sItem, threshold, onApprove, sTd, sBadge }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const item = sItem.inventory_items;
  const isDone = ["approved", "adjusted"].includes(sItem.status);
  const above = sItem.variance_pct > threshold;

  return (
    <tr style={{ background: isDone ? "#F0FDF4" : "#FFFBEB" }}>
      <td style={{ ...sTd, fontWeight: 600 }}>
        {item?.name}
        <div
          style={{
            fontSize: "10px",
            color: "#999",
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {item?.sku}
        </div>
      </td>
      <td
        style={{
          ...sTd,
          textAlign: "right",
          fontFamily: "'DM Mono',monospace",
        }}
      >
        {fmtQty(sItem.system_qty, item?.unit)}
      </td>
      <td
        style={{
          ...sTd,
          textAlign: "right",
          fontFamily: "'DM Mono',monospace",
          fontWeight: 700,
        }}
      >
        {fmtQty(sItem.counted_qty, item?.unit)}
      </td>
      <td
        style={{
          ...sTd,
          textAlign: "right",
          fontFamily: "'DM Mono',monospace",
          color: sItem.variance > 0 ? "#166534" : "#991B1B",
          fontWeight: 700,
        }}
      >
        {sItem.variance > 0 ? "+" : ""}
        {fmtQty(sItem.variance, item?.unit)}
      </td>
      <td
        style={{
          ...sTd,
          textAlign: "right",
          fontFamily: "'DM Mono',monospace",
          color: above ? "#92400E" : "#6B6B6B",
          fontWeight: above ? 700 : 400,
        }}
      >
        {sItem.variance_pct?.toFixed(1)}%
        <div style={{ fontSize: "9px", color: "#6B6B6B" }}>
          threshold: {threshold}%
        </div>
      </td>
      <td style={sTd}>
        <span style={sBadge(above ? "warning" : "default")}>
          {above ? "above threshold" : "minor"}
        </span>
      </td>
      <td style={sTd}>
        <span
          style={sBadge(
            isDone
              ? sItem.status === "adjusted"
                ? "success"
                : "info"
              : "default",
          )}
        >
          {sItem.status}
        </span>
      </td>
      <td style={sTd}>
        {isDone ? (
          <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
            {sItem.adjustment_applied ? "✓ Adjusted" : "✓ Approved (no adj.)"}
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for adjustment *"
              style={{
                padding: "5px 8px",
                border: "1px solid #E2E2E2",
                borderRadius: "3px",
                fontSize: "11px",
                width: "200px",
              }}
            />
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={async () => {
                  setSaving(true);
                  await onApprove(sItem, true, reason);
                  setSaving(false);
                }}
                disabled={saving || !reason.trim()}
                style={{
                  padding: "4px 10px",
                  background: "#2D6A4F",
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  fontSize: "10px",
                  cursor: !reason.trim() ? "not-allowed" : "pointer",
                  opacity: !reason.trim() ? 0.5 : 1,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Apply Adjustment
              </button>
              <button
                onClick={async () => {
                  setSaving(true);
                  await onApprove(
                    sItem,
                    false,
                    reason || "Variance acknowledged",
                  );
                  setSaving(false);
                }}
                disabled={saving}
                style={{
                  padding: "4px 10px",
                  background: "transparent",
                  color: "#2D6A4F",
                  border: "1px solid #A7D9B8",
                  borderRadius: "3px",
                  fontSize: "10px",
                  cursor: "pointer",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Acknowledge Only
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}
