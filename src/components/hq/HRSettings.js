// HRSettings.js v1.1 — WP-VISUAL
// Protea Botanicals · HR Module · HR Settings
// WP-HR-5 · March 2026
// src/components/hq/HRSettings.js
//
// Sub-tabs: Leave Types | Work Hours
// Leave types: full CRUD against leave_types table
// Work hours: standard hours config per tenant (stored in leave_types defaults)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
// Design tokens — imported from tokens.js (WP-UNIFY)
// Legacy aliases — all internal C.* references resolve correctly
const C = {
  green: T.accent,
  greenLight: T.accentLight,
  greenMid: T.accentMid,
  red: T.danger,
  redLight: T.dangerLight,
  border: T.border,
  bg: T.bg,
  white: "#fff",
  text: T.ink700,
  muted: T.ink500,
};

const LEAVE_COLORS = [
  "#3d6b35",
  "#1565c0",
  "#c62828",
  "#6a1b9a",
  "#00695c",
  "#e65100",
  "#f57f17",
  "#9e9e9e",
  "#2e7d32",
  "#0288d1",
];

const s = {
  subTabs: {
    display: "flex",
    borderBottom: `2px solid ${C.border}`,
    marginBottom: 24,
  },
  // Underline-only sub-tab pattern
  subTab: (a) => ({
    padding: "10px 16px",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    fontSize: 11,
    fontFamily: T.font,
    color: a ? T.accent : T.ink500,
    borderBottom: a ? `2px solid ${T.accent}` : "2px solid transparent",
    fontWeight: a ? 700 : 400,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: -2,
  }),
  card: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "16px 20px",
    marginBottom: 12,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 14,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14,
    marginBottom: 14,
  },
  input: {
    padding: "8px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 13,
    fontFamily: T.font,
    background: C.white,
    outline: "none",
    boxSizing: "border-box",
    width: "100%",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: 4,
  },
  btn: (bg, color = C.white) => ({
    padding: "7px 16px",
    background: bg,
    color,
    border: `1px solid ${bg}`,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    letterSpacing: "0.04em",
  }),
  outBtn: (color) => ({
    padding: "7px 14px",
    background: "none",
    color,
    border: `1px solid ${color}`,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
  }),
  toast: (t) => ({
    padding: "10px 16px",
    borderRadius: 4,
    fontSize: 13,
    marginBottom: 16,
    fontFamily: T.font,
    background: t === "success" ? C.greenLight : C.redLight,
    color: t === "success" ? C.greenMid : C.red,
  }),
  badge: (active) => ({
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
    background: active ? C.greenLight : "#f5f5f5",
    color: active ? C.greenMid : C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontFamily: T.font,
  }),
  sectionTitle: {
    fontFamily: T.font,
    fontSize: 16,
    fontWeight: 600,
    color: T.ink900,
    margin: "0 0 16px 0",
    letterSpacing: "-0.01em",
  },
};

const EMPTY_LT = {
  name: "",
  code: "",
  description: "",
  days_per_cycle: 0,
  cycle_months: 12,
  carryover_days: 0,
  requires_approval: true,
  requires_certificate: false,
  cert_required_after_days: null,
  paid: true,
  color: "#3d6b35",
  is_active: true,
  sort_order: 0,
};

// ── Leave Types sub-tab ───────────────────────────────────────────────────
function LeaveTypesSettings({ tenantId }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, 'new' = new, id = edit
  const [form, setForm] = useState(EMPTY_LT);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leave_types")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order")
      .order("name");
    setTypes(data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setForm({ ...EMPTY_LT, sort_order: types.length + 1 });
    setEditing("new");
  };
  const openEdit = (lt) => {
    setForm({
      ...lt,
      cert_required_after_days: lt.cert_required_after_days ?? "",
    });
    setEditing(lt.id);
  };
  const cancel = () => {
    setEditing(null);
    setForm(EMPTY_LT);
  };
  const f = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));
  const fb = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.checked }));

  const save = async () => {
    if (!form.name.trim()) {
      setToast({ type: "error", msg: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase() || null,
        description: form.description.trim() || null,
        days_per_cycle: parseFloat(form.days_per_cycle) || 0,
        cycle_months: parseInt(form.cycle_months) || 12,
        carryover_days: parseFloat(form.carryover_days) || 0,
        requires_approval: !!form.requires_approval,
        requires_certificate: !!form.requires_certificate,
        cert_required_after_days: form.cert_required_after_days
          ? parseInt(form.cert_required_after_days)
          : null,
        paid: !!form.paid,
        color: form.color || "#3d6b35",
        is_active: !!form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      };
      let error;
      if (editing === "new") {
        ({ error } = await supabase.from("leave_types").insert([payload]));
      } else {
        ({ error } = await supabase
          .from("leave_types")
          .update(payload)
          .eq("id", editing));
      }
      if (error) throw error;
      setToast({
        type: "success",
        msg: editing === "new" ? "Leave type created." : "Leave type updated.",
      });
      cancel();
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (id) => {
    try {
      const { error } = await supabase
        .from("leave_types")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      setToast({ type: "success", msg: "Leave type deactivated." });
      setConfirmDelete(null);
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    }
  };

  // ── Edit / New form ──
  if (editing !== null) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button style={s.outBtn(C.muted)} onClick={cancel}>
            ← Back
          </button>
          <span
            style={{
              fontFamily: T.font,
              fontSize: 16,
              fontWeight: 600,
              color: T.ink900,
            }}
          >
            {editing === "new" ? "New Leave Type" : `Edit: ${form.name}`}
          </span>
        </div>
        {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}

        <div style={s.card}>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Name *</label>
              <input
                style={s.input}
                value={form.name}
                onChange={f("name")}
                placeholder="e.g. Annual Leave"
              />
            </div>
            <div>
              <label style={s.label}>Code</label>
              <input
                style={s.input}
                value={form.code}
                onChange={f("code")}
                placeholder="e.g. AL"
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Description</label>
            <input
              style={s.input}
              value={form.description}
              onChange={f("description")}
              placeholder="Brief description"
            />
          </div>
          <div style={s.grid3}>
            <div>
              <label style={s.label}>Days per Cycle</label>
              <input
                style={s.input}
                type="number"
                step="0.5"
                value={form.days_per_cycle}
                onChange={f("days_per_cycle")}
              />
            </div>
            <div>
              <label style={s.label}>Cycle (months)</label>
              <input
                style={s.input}
                type="number"
                value={form.cycle_months}
                onChange={f("cycle_months")}
              />
            </div>
            <div>
              <label style={s.label}>Carryover Days</label>
              <input
                style={s.input}
                type="number"
                step="0.5"
                value={form.carryover_days}
                onChange={f("carryover_days")}
              />
            </div>
          </div>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Cert Required After (days)</label>
              <input
                style={s.input}
                type="number"
                value={form.cert_required_after_days || ""}
                onChange={f("cert_required_after_days")}
                placeholder="Leave blank if N/A"
              />
            </div>
            <div>
              <label style={s.label}>Colour</label>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                {LEAVE_COLORS.map((col) => (
                  <div
                    key={col}
                    onClick={() => setForm((p) => ({ ...p, color: col }))}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: col,
                      cursor: "pointer",
                      border:
                        form.color === col
                          ? "3px solid #fff"
                          : "3px solid transparent",
                      boxShadow:
                        form.color === col ? `0 0 0 2px ${col}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            {[
              { field: "paid", label: "Paid leave" },
              { field: "requires_approval", label: "Requires approval" },
              { field: "requires_certificate", label: "Requires certificate" },
              { field: "is_active", label: "Active" },
            ].map(({ field, label }) => (
              <label
                key={field}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: T.font,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!form[field]}
                  onChange={fb(field)}
                />
                {label}
              </label>
            ))}
          </div>
          <div>
            <label style={s.label}>Sort Order</label>
            <input
              style={{ ...s.input, width: 80 }}
              type="number"
              value={form.sort_order}
              onChange={f("sort_order")}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button style={s.btn(C.green)} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Leave Type"}
          </button>
          <button style={s.outBtn(C.muted)} onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <p style={s.sectionTitle}>Leave Types</p>
        <button style={s.btn(C.green)} onClick={openNew}>
          + Add Leave Type
        </button>
      </div>
      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
      {loading ? (
        <div style={{ color: C.muted, padding: "24px", textAlign: "center" }}>
          Loading…
        </div>
      ) : types.length === 0 ? (
        <div style={{ color: C.muted, padding: "40px", textAlign: "center" }}>
          No leave types configured. Add your first type above.
        </div>
      ) : (
        <div>
          {types.map((lt) => (
            <div
              key={lt.id}
              style={{
                ...s.card,
                borderLeft: `4px solid ${lt.color || C.green}`,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  <strong style={{ fontSize: 14, fontFamily: T.font }}>
                    {lt.name}
                  </strong>
                  {lt.code && (
                    <span
                      style={{
                        fontSize: 10,
                        color: C.muted,
                        fontFamily: "monospace",
                        background: "#f5f5f5",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {lt.code}
                    </span>
                  )}
                  <span style={s.badge(lt.is_active)}>
                    {lt.is_active ? "Active" : "Inactive"}
                  </span>
                  <span style={s.badge(lt.paid)}>
                    {lt.paid ? "Paid" : "Unpaid"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#666",
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    fontFamily: T.font,
                  }}
                >
                  <span>
                    📅 {lt.days_per_cycle} days / {lt.cycle_months}mo
                  </span>
                  {lt.carryover_days > 0 && (
                    <span>↩ {lt.carryover_days} carryover</span>
                  )}
                  {lt.cert_required_after_days && (
                    <span>📋 cert after {lt.cert_required_after_days}d</span>
                  )}
                  {lt.requires_approval && <span>✓ approval required</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    ...s.outBtn(C.green),
                    padding: "4px 12px",
                    fontSize: 11,
                  }}
                  onClick={() => openEdit(lt)}
                >
                  Edit
                </button>
                {confirmDelete === lt.id ? (
                  <>
                    <button
                      style={{
                        ...s.btn(C.red),
                        padding: "4px 10px",
                        fontSize: 11,
                      }}
                      onClick={() => deleteType(lt.id)}
                    >
                      Confirm
                    </button>
                    <button
                      style={{
                        ...s.outBtn(C.muted),
                        padding: "4px 10px",
                        fontSize: 11,
                      }}
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    style={{
                      ...s.outBtn(C.red),
                      padding: "4px 10px",
                      fontSize: 11,
                    }}
                    onClick={() => setConfirmDelete(lt.id)}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Work Hours sub-tab ─────────────────────────────────────────────────────
function WorkHoursSettings() {
  return (
    <div>
      <p style={s.sectionTitle}>Work Hour Standards</p>
      <p
        style={{
          fontSize: 13,
          color: C.muted,
          marginBottom: 20,
          fontFamily: T.font,
        }}
      >
        Standard work hours are set per employment contract. The values below
        are the system defaults used when creating new contracts. Edit
        individual contracts in the Contracts tab to override.
      </p>
      <div style={s.card}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            {
              label: "Standard Hours/Day",
              value: "8 hours",
              note: "Set per contract",
            },
            {
              label: "Standard Days/Week",
              value: "5 days",
              note: "Mon–Fri default",
            },
            {
              label: "Default Break",
              value: "30 min",
              note: "Per timesheet entry",
            },
            {
              label: "Default Notice Period",
              value: "30 days",
              note: "Set per contract",
            },
          ].map(({ label, value, note }) => (
            <div
              key={label}
              style={{
                flex: "1 1 160px",
                padding: "16px 18px",
                background: "#fff",
                border: `1px solid ${T.border}`,
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.ink500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 6,
                  fontFamily: T.font,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 22,
                  fontWeight: 400,
                  color: T.accent,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: 4,
                }}
              >
                {value}
              </div>
              <div
                style={{ fontSize: 11, color: T.ink500, fontFamily: T.font }}
              >
                {note}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            background: "#fffde7",
            border: "1px solid #fff9c4",
            borderRadius: 4,
            fontSize: 12,
            color: "#7c6f00",
            fontFamily: T.font,
          }}
        >
          ℹ SA BCEA compliance: Full-time employees are entitled to a minimum
          15-minute break per 5-hour work period and 30 minutes per 6-hour
          period.
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
const TABS = ["Leave Types", "Work Hours"];

export default function HRSettings({ tenantId }) {
  const [tab, setTab] = useState("Leave Types");
  return (
    <div style={{ fontFamily: T.font, color: T.ink700 }}>
      <div style={s.subTabs}>
        {TABS.map((t) => (
          <button key={t} style={s.subTab(tab === t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Leave Types" && <LeaveTypesSettings tenantId={tenantId} />}
      {tab === "Work Hours" && <WorkHoursSettings tenantId={tenantId} />}
    </div>
  );
}
