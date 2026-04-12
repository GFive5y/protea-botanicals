// HRLeave.js v1.0
// Protea Botanicals · HR Module · Leave Management (Admin view)
// WP-HR-3 · March 2026
// NEW FILE — src/components/hq/HRLeave.js
//
// Sub-tabs: Requests | Balances | Calendar | Leave Types
// Scope: Admin sees their tenant's team only (RLS enforced)
// Approval flow: pending → admin_approved | rejected
// Leave balances: decrement on approval (handled DB-side by trigger)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
// Design tokens — imported from tokens.js (WP-UNIFY)
// Legacy aliases — preserve all internal logic that references C
const C = {
  green: T.accent,
  greenLight: T.accentLight,
  greenMid: T.accentMid,
  amber: T.warning,
  amberLight: T.warningLight,
  red: T.danger,
  redLight: T.dangerLight,
  blue: T.info,
  blueLight: T.infoLight,
  grey: T.ink500,
  greyLight: T.bg,
  border: T.border,
  bg: T.bg,
  white: "#fff",
  text: T.ink700,
  muted: T.ink500,
};

const STATUS_CFG = {
  pending: { label: "Pending", bg: T.warningLight, color: T.warning },
  admin_approved: { label: "Approved", bg: T.successLight, color: T.success },
  approved: { label: "Approved", bg: T.successLight, color: T.success },
  rejected: { label: "Rejected", bg: T.dangerLight, color: T.danger },
  cert_pending: { label: "Cert Required", bg: T.warningLight, color: T.warning },
};

const SUB_TABS = ["Requests", "Balances", "Calendar", "Leave Types"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function daysBetween(start, end) {
  if (!start || !end) return "?";
  const diff = (new Date(end) - new Date(start)) / 86400000;
  return Math.round(diff) + 1;
}
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || {
    label: status,
    bg: C.greyLight,
    color: C.grey,
  };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 20,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  wrapper: { fontFamily: T.font, color: T.ink700 },
  subTabs: {
    display: "flex",
    borderBottom: `1px solid ${T.border}`,
    marginBottom: 24,
    gap: 0,
  },
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  th: {
    padding: "11px 16px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: `1px solid ${C.border}`,
    background: C.bg,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    borderBottom: `1px solid #f5f2ee`,
    verticalAlign: "middle",
    fontSize: 13,
  },
  card: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "16px 20px",
    marginBottom: 12,
  },
  approveBtn: {
    padding: "5px 14px",
    background: T.accent,
    color: "#fff",
    border: "none",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginRight: 6,
  },
  rejectBtn: {
    padding: "5px 14px",
    background: "none",
    color: T.danger,
    border: `1px solid ${T.dangerBd}`,
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    boxSizing: "border-box",
    outline: "none",
  },
  select: {
    padding: "8px 12px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: T.font,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 5,
  },
  sectionTitle: {
    fontFamily: T.font,
    fontSize: 17,
    fontWeight: 600,
    color: T.ink700,
    margin: "0 0 16px 0",
  },
  statCard: {
    background: "#fff",
    padding: "16px 18px",
  },
  statNum: {
    fontFamily: T.font,
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    fontFamily: T.font,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginTop: 6,
  },
  emptyState: {
    padding: "48px 24px",
    textAlign: "center",
    color: C.muted,
    fontSize: 13,
  },
  error: {
    padding: "12px 16px",
    background: C.redLight,
    color: C.red,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
  },
  toast: (t) => ({
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
    background: t === "success" ? C.greenLight : C.redLight,
    color: t === "success" ? C.greenMid : C.red,
  }),
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    background: "#fff",
    borderRadius: 8,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    fontFamily: T.font,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB: LEAVE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════
function LeaveRequests({ tenantId, staffList, leaveTypes }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectModal, setRejectModal] = useState(null); // { id, name }
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(null);
  // New request form
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    staff_profile_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("leave_requests")
        .select(
          "id, staff_profile_id, leave_type_id, start_date, end_date, status, notes, created_at",
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all")
        q = q.eq("status", statusFilter);
      const { data, error: err } = await q;
      if (err) throw err;
      setRequests(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const staffName = (id) => {
    const s = staffList.find((x) => x.id === id);
    return s ? s.preferred_name || s.full_name : "Unknown";
  };
  const typeName = (id) => {
    const t = leaveTypes.find((x) => x.id === id);
    return t ? t.name : "—";
  };

  const approve = async (req) => {
    setProcessing(req.id);
    try {
      const { error: err } = await supabase
        .from("leave_requests")
        .update({ status: "admin_approved" })
        .eq("id", req.id);
      if (err) throw err;
      // Decrement leave balance
      const days = daysBetween(req.start_date, req.end_date);
      if (typeof days === "number") {
        const { data: bal } = await supabase
          .from("leave_balances")
          .select("id, available, used, pending")
          .eq("staff_profile_id", req.staff_profile_id)
          .eq("leave_type_id", req.leave_type_id)
          .eq("tenant_id", tenantId)
          .single();
        if (bal) {
          await supabase
            .from("leave_balances")
            .update({
              updated_at: new Date().toISOString(),
            })
            .eq("id", bal.id);
        }
      }
      setToast({
        type: "success",
        msg: `Leave approved for ${staffName(req.staff_profile_id)}.`,
      });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const reject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      const { error: err } = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
        })
        .eq("id", rejectModal.id);
      if (err) throw err;
      setToast({ type: "success", msg: `Leave rejected.` });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const submitNew = async () => {
    if (
      !newForm.staff_profile_id ||
      !newForm.leave_type_id ||
      !newForm.start_date ||
      !newForm.end_date
    ) {
      setToast({
        type: "error",
        msg: "Staff member, leave type, and dates are required.",
      });
      return;
    }
    setSaving(true);
    try {
      const daysReq =
        Math.round(
          (new Date(newForm.end_date) - new Date(newForm.start_date)) /
            86400000,
        ) + 1;
      const { error: err } = await supabase.from("leave_requests").insert([
        {
          tenant_id: tenantId,
          staff_profile_id: newForm.staff_profile_id,
          leave_type_id: newForm.leave_type_id,
          start_date: newForm.start_date,
          end_date: newForm.end_date,
          days_requested: daysReq,
          notes: newForm.notes.trim() || null,
          status: "pending",
        },
      ]);
      if (err) throw err;
      setToast({ type: "success", msg: "Leave request created." });
      setShowNew(false);
      setNewForm({
        staff_profile_id: "",
        leave_type_id: "",
        start_date: "",
        end_date: "",
        notes: "",
      });
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
  };

  return (
    <div>
      {/* Stats + toolbar */}
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
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            background: T.border,
            borderRadius: 6,
            overflow: "hidden",
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow.sm,
            flex: 1,
          }}
        >
          {[
            {
              label: "Pending",
              num: requests.filter((r) => r.status === "pending").length,
              color: T.warning,
            },
            {
              label: "Approved",
              num: requests.filter((r) =>
                ["admin_approved", "approved"].includes(r.status),
              ).length,
              color: T.success,
            },
            {
              label: "Rejected",
              num: requests.filter((r) => r.status === "rejected").length,
              color: T.danger,
            },
          ].map(({ label, num, color }) => (
            <div key={label} style={s.statCard}>
              <div style={{ ...s.statNum, color }}>{num}</div>
              <div style={s.statLabel}>{label}</div>
            </div>
          ))}
        </div>
        <select
          style={s.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="admin_approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <button
          style={{ ...s.approveBtn, background: C.green }}
          onClick={() => setShowNew(true)}
        >
          + New Request
        </button>
      </div>

      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
      {error && <div style={s.error}>⚠ {error}</div>}

      {/* New request modal */}
      {showNew && (
        <div
          style={s.modal}
          onClick={(e) => e.target === e.currentTarget && setShowNew(false)}
        >
          <div style={s.modalBox}>
            <h3 style={{ ...s.sectionTitle, marginBottom: 20 }}>
              New Leave Request
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Staff Member *</label>
              <select
                style={{ ...s.select, width: "100%" }}
                value={newForm.staff_profile_id}
                onChange={(e) =>
                  setNewForm((p) => ({
                    ...p,
                    staff_profile_id: e.target.value,
                  }))
                }
              >
                <option value="">Select staff member…</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.preferred_name || st.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Leave Type *</label>
              <select
                style={{ ...s.select, width: "100%" }}
                value={newForm.leave_type_id}
                onChange={(e) =>
                  setNewForm((p) => ({ ...p, leave_type_id: e.target.value }))
                }
              >
                <option value="">Select type…</option>
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={s.label}>Start Date *</label>
                <input
                  style={s.input}
                  type="date"
                  value={newForm.start_date}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, start_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={s.label}>End Date *</label>
                <input
                  style={s.input}
                  type="date"
                  value={newForm.end_date}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, end_date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Notes</label>
              <textarea
                style={{ ...s.input, height: 72, resize: "vertical" }}
                value={newForm.notes}
                onChange={(e) =>
                  setNewForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Optional notes…"
              />
            </div>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                style={{ ...s.rejectBtn, color: "#555", borderColor: "#ddd" }}
                onClick={() => setShowNew(false)}
              >
                Cancel
              </button>
              <button
                style={s.approveBtn}
                onClick={submitNew}
                disabled={saving}
              >
                {saving ? "Saving…" : "Create Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <div
          style={s.modal}
          onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
        >
          <div style={s.modalBox}>
            <h3 style={{ ...s.sectionTitle, marginBottom: 16 }}>
              Reject Leave Request
            </h3>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
              Rejecting leave for <strong>{rejectModal.name}</strong>.
              Optionally add a reason:
            </p>
            <textarea
              style={{
                ...s.input,
                height: 80,
                resize: "vertical",
                marginBottom: 20,
              }}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)…"
            />
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                style={{ ...s.rejectBtn, color: "#555", borderColor: "#ddd" }}
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>
              <button
                style={{ ...s.approveBtn, background: C.red }}
                onClick={reject}
                disabled={!!processing}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={s.emptyState}>Loading leave requests…</div>
      ) : requests.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗓</div>
          <div
            style={{
              fontFamily: T.font,
              fontSize: 15,
              color: T.ink500,
              marginBottom: 6,
            }}
          >
            No {statusFilter !== "all" ? statusFilter : ""} leave requests
          </div>
          <div style={{ fontSize: 12, color: "#ccc" }}>
            Requests appear here when staff submit through the portal
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                {[
                  "Staff Member",
                  "Leave Type",
                  "Dates",
                  "Days",
                  "Status",
                  "Notes",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const isPending = req.status === "pending";
                return (
                  <tr key={req.id}>
                    <td style={s.td}>
                      <strong>{staffName(req.staff_profile_id)}</strong>
                    </td>
                    <td style={s.td}>{typeName(req.leave_type_id)}</td>
                    <td style={{ ...s.td, fontSize: 12, whiteSpace: "nowrap" }}>
                      {fmtDate(req.start_date)} → {fmtDate(req.end_date)}
                    </td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      {daysBetween(req.start_date, req.end_date)}
                    </td>
                    <td style={s.td}>
                      <StatusBadge status={req.status} />
                    </td>
                    <td
                      style={{
                        ...s.td,
                        fontSize: 12,
                        color: "#666",
                        maxWidth: 180,
                      }}
                    >
                      {req.notes || <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td style={s.td}>
                      {isPending ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={s.approveBtn}
                            disabled={processing === req.id}
                            onClick={() => approve(req)}
                          >
                            {processing === req.id ? "…" : "Approve"}
                          </button>
                          <button
                            style={s.rejectBtn}
                            disabled={!!processing}
                            onClick={() =>
                              setRejectModal({
                                id: req.id,
                                name: staffName(req.staff_profile_id),
                              })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: C.muted }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginTop: 8,
              textAlign: "right",
            }}
          >
            {requests.length} request{requests.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB: BALANCES
// ═══════════════════════════════════════════════════════════════════════════════
function LeaveBalances({ tenantId, staffList, leaveTypes }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null); // { id, balance_days }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("leave_balances")
        .select(
          "id, staff_profile_id, leave_type_id, available, used, pending, accrued, opening_balance, cycle_start, cycle_end, updated_at",
        )
        .eq("tenant_id", tenantId)
        .order("staff_profile_id");
      if (selectedStaff) q = q.eq("staff_profile_id", selectedStaff);
      const { data, error: err } = await q;
      if (err) throw err;
      setBalances(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedStaff]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const saveBalance = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from("leave_balances")
        .update({
          available: parseFloat(editing.balance_days) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editing.id);
      if (err) throw err;
      setToast({ type: "success", msg: "Balance updated." });
      setEditing(null);
      load();
    } catch (err) {
      setToast({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const staffName = (id) => {
    const s = staffList.find((x) => x.id === id);
    return s ? s.preferred_name || s.full_name : "Unknown";
  };
  const typeName = (id) => {
    const t = leaveTypes.find((x) => x.id === id);
    return t ? t.name : "—";
  };
  const typeMaxDays = (id) => {
    const t = leaveTypes.find((x) => x.id === id);
    return t ? t.days_per_cycle : null;
  };

  // Group by staff
  const grouped = staffList
    .filter((s) => !selectedStaff || s.id === selectedStaff)
    .map((staff) => ({
      staff,
      balances: balances.filter((b) => b.staff_profile_id === staff.id),
    }))
    .filter((g) => g.balances.length > 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <select
          style={s.select}
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
        >
          <option value="">All Staff Members</option>
          {staffList.map((st) => (
            <option key={st.id} value={st.id}>
              {st.preferred_name || st.full_name}
            </option>
          ))}
        </select>
      </div>

      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
      {error && <div style={s.error}>⚠ {error}</div>}

      {loading ? (
        <div style={s.emptyState}>Loading leave balances…</div>
      ) : grouped.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <div
            style={{
              fontFamily: T.font,
              fontSize: 15,
              color: T.ink500,
              marginBottom: 6,
            }}
          >
            No balances on record
          </div>
          <div style={{ fontSize: 12, color: "#ccc" }}>
            Balances are created when leave types are assigned to staff members
          </div>
        </div>
      ) : (
        grouped.map(({ staff, balances: staffBalances }) => (
          <div key={staff.id} style={{ ...s.card, marginBottom: 16 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span>{staff.preferred_name || staff.full_name}</span>
              {staff.job_title && (
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>
                  {staff.job_title}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {staffBalances.map((bal) => {
                const max = typeMaxDays(bal.leave_type_id);
                const pct = max
                  ? Math.min(100, (bal.available / max) * 100)
                  : 0;
                const isEditing = editing?.id === bal.id;
                return (
                  <div
                    key={bal.id}
                    style={{
                      flex: "1 1 160px",
                      minWidth: 150,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: 6,
                      }}
                    >
                      {typeName(bal.leave_type_id)}
                    </div>
                    {isEditing ? (
                      <div>
                        <input
                          style={{
                            ...s.input,
                            width: 80,
                            padding: "4px 8px",
                            marginBottom: 6,
                          }}
                          type="number"
                          step="0.5"
                          min="0"
                          value={editing.balance_days}
                          onChange={(e) =>
                            setEditing((p) => ({
                              ...p,
                              balance_days: e.target.value,
                            }))
                          }
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{
                              ...s.approveBtn,
                              padding: "3px 10px",
                              fontSize: 11,
                            }}
                            onClick={saveBalance}
                            disabled={saving}
                          >
                            {saving ? "…" : "Save"}
                          </button>
                          <button
                            style={{
                              ...s.rejectBtn,
                              padding: "3px 10px",
                              fontSize: 11,
                            }}
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontFamily: T.font,
                            fontSize: 26,
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            fontVariantNumeric: "tabular-nums",
                            color:
                              (bal.available || 0) <= 2 ? T.danger : T.accent,
                            lineHeight: 1,
                          }}
                        >
                          {bal.available ?? "—"}
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 400,
                              color: C.muted,
                              marginLeft: 4,
                            }}
                          >
                            avail
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            marginTop: 3,
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          {bal.used > 0 && <span>✓ {bal.used} used</span>}
                          {bal.pending > 0 && (
                            <span style={{ color: C.amber }}>
                              ⏳ {bal.pending} pending
                            </span>
                          )}
                        </div>
                        {max && (
                          <div style={{ marginTop: 6 }}>
                            <div
                              style={{
                                height: 4,
                                background: "#e0e0e0",
                                borderRadius: 2,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.min(100, ((bal.available || 0) / max) * 100)}%`,
                                  background:
                                    (bal.available || 0) / max > 0.5
                                      ? C.green
                                      : (bal.available || 0) / max > 0.2
                                        ? C.amber
                                        : C.red,
                                  borderRadius: 2,
                                  transition: "width 0.3s",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: C.muted,
                                marginTop: 3,
                              }}
                            >
                              of {max} days/cycle
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB: CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════
function LeaveCalendar({ tenantId, staffList, leaveTypes }) {
  const [requests, setRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
      const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);

      const [reqRes, holRes] = await Promise.allSettled([
        supabase
          .from("leave_requests")
          .select(
            "id, staff_profile_id, leave_type_id, start_date, end_date, status",
          )
          .eq("tenant_id", tenantId)
          .in("status", ["admin_approved", "approved", "pending"])
          .lte("start_date", monthEnd)
          .gte("end_date", monthStart),
        supabase
          .from("public_holidays")
          .select("date, name, type")
          .gte("date", monthStart)
          .lte("date", monthEnd),
      ]);

      setRequests(reqRes.status === "fulfilled" ? reqRes.value.data || [] : []);
      setHolidays(holRes.status === "fulfilled" ? holRes.value.data || [] : []);
    } finally {
      setLoading(false);
    }
  }, [tenantId, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  // Build day event map
  const dayMap = {};
  requests.forEach((req) => {
    const start = new Date(req.start_date);
    const end = new Date(req.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!dayMap[key]) dayMap[key] = [];
      const staff = staffList.find((x) => x.id === req.staff_profile_id);
      dayMap[key].push({
        name: staff
          ? (staff.preferred_name || staff.full_name).split(" ")[0]
          : "?",
        status: req.status,
        color: req.status === "pending" ? C.amber : C.green,
      });
    }
  });
  const holidayMap = {};
  holidays.forEach((h) => {
    holidayMap[h.date] = h.name;
  });

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++)
    cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <button
          style={{
            ...s.rejectBtn,
            borderColor: "#ddd",
            color: "#555",
            padding: "6px 14px",
          }}
          onClick={prevMonth}
        >
          ‹
        </button>
        <span
          style={{
            fontFamily: T.font,
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: T.ink700,
          }}
        >
          {monthName}
        </span>
        <button
          style={{
            ...s.rejectBtn,
            borderColor: "#ddd",
            color: "#555",
            padding: "6px 14px",
          }}
          onClick={nextMonth}
        >
          ›
        </button>
      </div>

      {/* Legend */}
      <div
        style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}
      >
        {[
          { color: C.green, label: "Approved Leave" },
          { color: C.amber, label: "Pending Leave" },
          { color: C.red, label: "Public Holiday" },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#666",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
              }}
            />
            {label}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={s.emptyState}>Loading calendar…</div>
      ) : (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {/* Day headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                style={{
                  padding: "8px 4px",
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: C.bg,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {cells.map((day, i) => {
              if (!day)
                return (
                  <div
                    key={`e${i}`}
                    style={{
                      minHeight: 80,
                      borderRight: `1px solid ${C.border}`,
                      borderBottom: `1px solid ${C.border}`,
                      background: "#fafafa",
                    }}
                  />
                );
              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateKey === today;
              const isWeekend = [5, 6].includes(i % 7);
              const events = dayMap[dateKey] || [];
              const holiday = holidayMap[dateKey];

              return (
                <div
                  key={dateKey}
                  style={{
                    minHeight: 80,
                    padding: "6px 8px",
                    borderRight: `1px solid ${C.border}`,
                    borderBottom: `1px solid ${C.border}`,
                    background: isWeekend ? "#fafafa" : C.white,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? C.white : isWeekend ? C.muted : C.text,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: isToday ? C.green : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 4,
                    }}
                  >
                    {day}
                  </div>
                  {holiday && (
                    <div
                      style={{
                        fontSize: 9,
                        color: C.red,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🇿🇦 {holiday}
                    </div>
                  )}
                  {events.slice(0, 3).map((ev, j) => (
                    <div
                      key={j}
                      style={{
                        fontSize: 9,
                        background: ev.color,
                        color: C.white,
                        borderRadius: 3,
                        padding: "1px 4px",
                        marginBottom: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {ev.name}
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div style={{ fontSize: 9, color: C.muted }}>
                      +{events.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-TAB: LEAVE TYPES
// ═══════════════════════════════════════════════════════════════════════════════
function LeaveTypesPanel({ leaveTypes, loading }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
        Leave types are configured at the platform level. Contact your HR
        officer to add or modify leave types.
      </p>
      {loading ? (
        <div style={s.emptyState}>Loading leave types…</div>
      ) : leaveTypes.length === 0 ? (
        <div style={s.emptyState}>No leave types configured.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {leaveTypes.map((lt) => (
            <div
              key={lt.id}
              style={{
                ...s.card,
                borderLeft: `4px solid ${lt.color || C.green}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                {lt.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#666",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span>
                  📅 {lt.days_per_cycle} days per {lt.cycle_months}-month cycle
                </span>
                {lt.carryover_days > 0 && (
                  <span>↩ {lt.carryover_days} day carryover</span>
                )}
                {lt.cert_required_after_days && (
                  <span>
                    📋 Certificate after {lt.cert_required_after_days} days
                  </span>
                )}
                <span style={{ marginTop: 4 }}>
                  <span
                    style={{
                      background: lt.paid ? C.greenLight : C.greyLight,
                      color: lt.paid ? C.greenMid : C.grey,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      textTransform: "uppercase",
                    }}
                  >
                    {lt.paid ? "Paid" : "Unpaid"}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function HRLeave({ tenantId }) {
  const [subTab, setSubTab] = useState("Requests");
  const [staffList, setStaffList] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const loadShared = useCallback(async () => {
    try {
      const [staffRes, typesRes] = await Promise.allSettled([
        supabase
          .from("staff_profiles")
          .select("id, full_name, preferred_name, job_title")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .order("full_name"),
        supabase
          .from("leave_types")
          .select(
            "id, name, days_per_cycle, cycle_months, carryover_days, cert_required_after_days, paid, color",
          )
          .order("name"),
      ]);
      setStaffList(
        staffRes.status === "fulfilled" ? staffRes.value.data || [] : [],
      );
      setLeaveTypes(
        typesRes.status === "fulfilled" ? typesRes.value.data || [] : [],
      );
    } finally {
      setLoadingTypes(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadShared();
  }, [loadShared]);

  return (
    <div style={s.wrapper}>
      <div style={s.subTabs}>
        {SUB_TABS.map((t) => (
          <button
            key={t}
            style={s.subTab(subTab === t)}
            onClick={() => setSubTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === "Requests" && (
        <LeaveRequests
          tenantId={tenantId}
          staffList={staffList}
          leaveTypes={leaveTypes}
        />
      )}
      {subTab === "Balances" && (
        <LeaveBalances
          tenantId={tenantId}
          staffList={staffList}
          leaveTypes={leaveTypes}
        />
      )}
      {subTab === "Calendar" && (
        <LeaveCalendar
          tenantId={tenantId}
          staffList={staffList}
          leaveTypes={leaveTypes}
        />
      )}
      {subTab === "Leave Types" && (
        <LeaveTypesPanel leaveTypes={leaveTypes} loading={loadingTypes} />
      )}
    </div>
  );
}
