// StaffPortal.js v1.0 — SCHEMA VERIFIED
// WP-HR-12: Staff Portal — /staff self-service route
// Location: src/pages/StaffPortal.js
//
// ── ACCESS MODEL: Option B (profile-based) ───────────────────────────────────
// Any logged-in user with a matching staff_profiles.user_id = auth.uid()
// gets access. No new role required.
//
// ── CONFIRMED SCHEMAS USED ───────────────────────────────────────────────────
// staff_profiles:    id, user_id, tenant_id, employee_number, full_name,
//                    preferred_name, job_title, department, employment_type,
//                    employment_start_date, status, avatar_url, email_work,
//                    phone_personal, email_personal, address_residential (jsonb),
//                    bank_account (jsonb), tax_number, emergency_contact_name,
//                    emergency_contact_phone, emergency_contact_relation
//
// leave_requests:    id, staff_profile_id, tenant_id, start_date, end_date,
//                    days_requested, reason, status, leave_types(name, color)
//
// leave_balances:    id, staff_profile_id, leave_type_id, tenant_id,
//                    available, used, pending, leave_types(name, color)
//
// timesheets:        id, staff_profile_id, period_start, period_end,
//                    status, total_hours, regular_hours, overtime_hours,
//                    late_count, absent_count
//
// leave_types:       id, name, color, days_per_cycle, paid, is_active
//
// ── READ-ONLY for staff — no INSERT/UPDATE except leave_requests ──────────────
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "../services/supabaseClient";
import { RoleContext } from "../App";

// ─── THEME ───────────────────────────────────────────────────────────────────

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  bg: "#f7f6f2",
};

const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function zar(v) {
  if (v == null) return "—";
  return `R ${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending: { bg: "#fff8e1", color: "#f57f17", border: "#ffe082" },
  admin_approved: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  hr_approved: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  rejected: { bg: "#fce4ec", color: "#c62828", border: "#ef9a9a" },
  draft: { bg: "#f5f5f5", color: "#666", border: "#ddd" },
  staff_submitted: { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  admin_approved_ts: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  locked: { bg: "#f5f5f5", color: "#555", border: "#ccc" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || {
    bg: "#f5f5f5",
    color: "#666",
    border: "#ddd",
  };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {status?.replace(/_/g, " ") || "—"}
    </span>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast?.type === "success") {
      const t = setTimeout(onClose, 5000);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: toast.type === "error" ? C.red : "#2e7d32",
        color: "#fff",
        borderRadius: 8,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONTS.body,
        maxWidth: 400,
      }}
    >
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── SUB TAB BAR ──────────────────────────────────────────────────────────────

function SubTabs({ tabs, active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: `2px solid ${C.border}`,
        marginBottom: 24,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            borderBottom:
              active === t.id
                ? `2px solid ${C.green}`
                : "2px solid transparent",
            marginBottom: -2,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: FONTS.body,
            color: active === t.id ? C.green : C.muted,
            transition: "all 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── MY PROFILE TAB ──────────────────────────────────────────────────────────

function ProfileTab({ profile }) {
  if (!profile) return null;

  const address = profile.address_residential || {};
  const bank = profile.bank_account || {};

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Personal info */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "20px 22px",
        }}
      >
        <SectionTitle>Personal Details</SectionTitle>
        <InfoRow
          label="Full Name"
          value={profile.full_name || profile.preferred_name || "—"}
        />
        <InfoRow label="Preferred Name" value={profile.preferred_name || "—"} />
        <InfoRow label="Employee #" value={profile.employee_number || "—"} />
        <InfoRow
          label="ID Number"
          value={profile.id_number ? "••••••••" : "—"}
        />
        <InfoRow
          label="Date of Birth"
          value={formatDate(profile.date_of_birth)}
        />
        <InfoRow label="Gender" value={profile.gender || "—"} />
        <InfoRow label="Nationality" value={profile.nationality || "—"} />
      </div>

      {/* Contact info */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "20px 22px",
        }}
      >
        <SectionTitle>Contact Details</SectionTitle>
        <InfoRow label="Work Email" value={profile.email_work || "—"} />
        <InfoRow label="Personal Email" value={profile.email_personal || "—"} />
        <InfoRow label="Phone" value={profile.phone_personal || "—"} />
        {address.street && (
          <InfoRow
            label="Address"
            value={[
              address.street,
              address.suburb,
              address.city,
              address.postal_code,
            ]
              .filter(Boolean)
              .join(", ")}
          />
        )}
      </div>

      {/* Employment info */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "20px 22px",
        }}
      >
        <SectionTitle>Employment</SectionTitle>
        <InfoRow label="Job Title" value={profile.job_title || "—"} />
        <InfoRow label="Department" value={profile.department || "—"} />
        <InfoRow
          label="Employment Type"
          value={profile.employment_type?.replace(/_/g, " ") || "—"}
        />
        <InfoRow
          label="Start Date"
          value={formatDate(profile.employment_start_date)}
        />
        <InfoRow label="Status">
          <StatusBadge status={profile.status} />
        </InfoRow>
      </div>

      {/* Emergency contact */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "20px 22px",
        }}
      >
        <SectionTitle>Emergency Contact</SectionTitle>
        <InfoRow label="Name" value={profile.emergency_contact_name || "—"} />
        <InfoRow label="Phone" value={profile.emergency_contact_phone || "—"} />
        <InfoRow
          label="Relationship"
          value={profile.emergency_contact_relation || "—"}
        />
      </div>

      {/* Banking — masked */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          padding: "20px 22px",
          gridColumn: "1/-1",
        }}
      >
        <SectionTitle>
          Banking Details{" "}
          <span
            style={{
              fontSize: 11,
              color: C.muted,
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            (read-only — contact HR to update)
          </span>
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <InfoRow label="Bank" value={bank.bank_name || "—"} />
          <InfoRow
            label="Account Number"
            value={
              bank.account_number
                ? `••••${String(bank.account_number).slice(-4)}`
                : "—"
            }
          />
          <InfoRow label="Branch Code" value={bank.branch_code || "—"} />
          <InfoRow label="Account Type" value={bank.account_type || "—"} />
          <InfoRow
            label="Tax Number"
            value={
              profile.tax_number
                ? `••••${String(profile.tax_number).slice(-4)}`
                : "—"
            }
          />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, value, children }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.muted,
          minWidth: 120,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {children || <span style={{ fontSize: 13, color: "#333" }}>{value}</span>}
    </div>
  );
}

// ─── MY LEAVE TAB ─────────────────────────────────────────────────────────────

function LeaveTab({ profileId, tenantId }) {
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [reqRes, balRes, ltRes] = await Promise.allSettled([
      supabase
        .from("leave_requests")
        .select(
          "id, start_date, end_date, days_requested, reason, status, leave_types(name, color)",
        )
        .eq("staff_profile_id", profileId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("leave_balances")
        .select("id, available, used, pending, leave_types(name, color)")
        .eq("staff_profile_id", profileId)
        .eq("tenant_id", tenantId),
      supabase
        .from("leave_types")
        .select("id, name, color, days_per_cycle")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order"),
    ]);
    if (reqRes.status === "fulfilled") setRequests(reqRes.value.data || []);
    if (balRes.status === "fulfilled") setBalances(balRes.value.data || []);
    if (ltRes.status === "fulfilled") setLeaveTypes(ltRes.value.data || []);
    setLoading(false);
  }, [profileId, tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    if (!form.leave_type_id) return setFormErr("Select a leave type.");
    if (!form.start_date) return setFormErr("Start date is required.");
    if (!form.end_date) return setFormErr("End date is required.");
    if (form.end_date < form.start_date)
      return setFormErr("End date must be after start date.");

    setSaving(true);
    setFormErr(null);
    try {
      // Calculate days_requested (required NOT NULL)
      const start = new Date(form.start_date + "T00:00:00");
      const end = new Date(form.end_date + "T00:00:00");
      let days = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) days++;
      }
      if (days === 0)
        return setFormErr("Selected dates contain no working days.");

      const { error } = await supabase.from("leave_requests").insert({
        staff_profile_id: profileId,
        tenant_id: tenantId,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        days_requested: days,
        reason: form.reason || null,
        status: "pending",
        submitted_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
      setToast({
        type: "success",
        msg: `Leave request submitted for ${days} day${days !== 1 ? "s" : ""}.`,
      });
      setShowForm(false);
      setForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
      load();
    } catch (e) {
      setFormErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>
        Loading leave…
      </div>
    );

  return (
    <div>
      {/* Balances */}
      {balances.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 12,
            }}
          >
            Leave Balances
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))",
              gap: 10,
            }}
          >
            {balances.map((b) => (
              <div
                key={b.id}
                style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${b.leave_types?.color || C.accent}`,
                  borderRadius: 2,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: C.muted,
                    marginBottom: 6,
                  }}
                >
                  {b.leave_types?.name || "Leave"}
                </div>
                <div
                  style={{
                    fontFamily: FONTS.heading,
                    fontSize: 26,
                    color: C.green,
                  }}
                >
                  {b.available ?? "—"}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  days available
                </div>
                {b.pending > 0 && (
                  <div style={{ fontSize: 10, color: "#f57f17", marginTop: 2 }}>
                    {b.pending} pending
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request form toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          My Leave Requests
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "8px 18px",
            background: showForm ? C.bg : C.green,
            color: showForm ? C.muted : C.white,
            border: `1px solid ${showForm ? C.border : C.green}`,
            borderRadius: 2,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: FONTS.body,
            letterSpacing: "0.1em",
          }}
        >
          {showForm ? "Cancel" : "+ Request Leave"}
        </button>
      </div>

      {/* Request form */}
      {showForm && (
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: "18px 20px",
            marginBottom: 20,
          }}
        >
          {formErr && (
            <div
              style={{
                background: "#fce4ec",
                border: "1px solid #ef9a9a",
                borderRadius: 4,
                padding: "8px 12px",
                color: C.red,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {formErr}
            </div>
          )}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div style={{ gridColumn: "1/-1" }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.muted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Leave Type *
              </label>
              <select
                value={form.leave_type_id}
                onChange={(e) =>
                  setForm((p) => ({ ...p, leave_type_id: e.target.value }))
                }
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontFamily: FONTS.body,
                  background: C.white,
                  width: "100%",
                }}
              >
                <option value="">— Select type —</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.muted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Start Date *
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, start_date: e.target.value }))
                }
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontFamily: FONTS.body,
                  background: C.white,
                  width: "100%",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.muted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                End Date *
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, end_date: e.target.value }))
                }
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontFamily: FONTS.body,
                  background: C.white,
                  width: "100%",
                }}
              />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.muted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Reason
              </label>
              <textarea
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
                rows={2}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontFamily: FONTS.body,
                  background: C.white,
                  width: "100%",
                  resize: "vertical",
                }}
                placeholder="Optional reason"
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 14,
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: "9px 24px",
                background: C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: FONTS.body,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </div>
      )}

      {/* Requests table */}
      {requests.length === 0 ? (
        <div
          style={{
            color: C.muted,
            textAlign: "center",
            padding: 40,
            fontSize: 13,
          }}
        >
          No leave requests yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              fontFamily: FONTS.body,
            }}
          >
            <thead>
              <tr
                style={{
                  background: C.bg,
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                {["Type", "From", "To", "Days", "Reason", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 12px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.muted,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = C.bg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td style={{ padding: "9px 12px" }}>
                    <span
                      style={{
                        background: r.leave_types?.color
                          ? r.leave_types.color + "22"
                          : "#f5f5f5",
                        color: r.leave_types?.color || "#555",
                        border: `1px solid ${r.leave_types?.color ? r.leave_types.color + "44" : "#ddd"}`,
                        borderRadius: 20,
                        padding: "2px 9px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {r.leave_types?.name || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                    {formatDate(r.start_date)}
                  </td>
                  <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                    {formatDate(r.end_date)}
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 600 }}>
                    {r.days_requested}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      color: C.muted,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.reason || "—"}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── MY TIMESHEETS TAB ────────────────────────────────────────────────────────

function TimesheetsTab({ profileId, tenantId }) {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("timesheets")
      .select(
        "id, period_start, period_end, status, total_hours, regular_hours, overtime_hours, late_count, absent_count, staff_notes, hr_notes, admin_notes",
      )
      .eq("staff_profile_id", profileId)
      .eq("tenant_id", tenantId)
      .order("period_start", { ascending: false })
      .then(({ data }) => {
        setTimesheets(data || []);
        setLoading(false);
      });
  }, [profileId, tenantId]);

  if (loading)
    return (
      <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>
        Loading timesheets…
      </div>
    );

  if (timesheets.length === 0)
    return (
      <div
        style={{
          color: C.muted,
          textAlign: "center",
          padding: 48,
          fontSize: 13,
        }}
      >
        No timesheets on record yet.
      </div>
    );

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          fontFamily: FONTS.body,
        }}
      >
        <thead>
          <tr
            style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}
          >
            {[
              "Period",
              "Status",
              "Total Hrs",
              "Regular",
              "Overtime",
              "Late",
              "Absent",
              "Notes",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "9px 12px",
                  textAlign: "left",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.muted,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timesheets.map((ts) => (
            <tr
              key={ts.id}
              style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <td
                style={{
                  padding: "9px 12px",
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {formatDate(ts.period_start)} – {formatDate(ts.period_end)}
              </td>
              <td style={{ padding: "9px 12px" }}>
                <StatusBadge status={ts.status} />
              </td>
              <td
                style={{ padding: "9px 12px", fontWeight: 600, color: C.green }}
              >
                {ts.total_hours ?? "—"}h
              </td>
              <td style={{ padding: "9px 12px" }}>
                {ts.regular_hours ?? "—"}h
              </td>
              <td
                style={{
                  padding: "9px 12px",
                  color: ts.overtime_hours > 0 ? "#1565c0" : C.muted,
                }}
              >
                {ts.overtime_hours > 0 ? `${ts.overtime_hours}h` : "—"}
              </td>
              <td
                style={{
                  padding: "9px 12px",
                  color: ts.late_count > 0 ? "#e65100" : C.muted,
                }}
              >
                {ts.late_count > 0 ? ts.late_count : "—"}
              </td>
              <td
                style={{
                  padding: "9px 12px",
                  color: ts.absent_count > 0 ? C.red : C.muted,
                }}
              >
                {ts.absent_count > 0 ? ts.absent_count : "—"}
              </td>
              <td
                style={{
                  padding: "9px 12px",
                  color: C.muted,
                  fontSize: 12,
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ts.hr_notes || ts.admin_notes || ts.staff_notes || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── NO PROFILE STATE ─────────────────────────────────────────────────────────

function NoProfile() {
  return (
    <div
      style={{
        fontFamily: FONTS.body,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
        <h2
          style={{
            fontFamily: FONTS.heading,
            fontSize: 24,
            color: C.green,
            marginBottom: 10,
          }}
        >
          No Staff Profile Found
        </h2>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Your account is not yet linked to a staff profile. Please contact HR
          to have your profile set up.
        </p>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function StaffPortal() {
  const { userEmail } = useContext(RoleContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [subTab, setSubTab] = useState("profile");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: FONTS.body,
          color: C.muted,
          fontSize: 13,
        }}
      >
        Loading your profile…
      </div>
    );

  if (notFound) return <NoProfile />;

  const TABS = [
    { id: "profile", label: "My Profile" },
    { id: "leave", label: "My Leave" },
    { id: "timesheets", label: "My Timesheets" },
  ];

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Header */}
      <div
        style={{
          background: C.green,
          padding: "20px 32px",
          borderRadius: 2,
          marginBottom: 0,
        }}
      >
        <span
          style={{
            color: C.accent,
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Staff Portal
        </span>
        <h1
          style={{
            color: C.white,
            fontFamily: FONTS.heading,
            fontSize: 24,
            margin: "4px 0 0",
          }}
        >
          {profile.preferred_name || profile.full_name || "My Portal"}
        </h1>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          {profile.job_title && (
            <span style={{ color: C.accent, fontSize: 12 }}>
              {profile.job_title}
            </span>
          )}
          {profile.department && (
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              · {profile.department}
            </span>
          )}
          {profile.employee_number && (
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              · #{profile.employee_number}
            </span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          padding: "8px 32px",
          display: "flex",
          gap: 20,
          alignItems: "center",
          marginBottom: 0,
        }}
      >
        <StatusBadge status={profile.status} />
        <span style={{ fontSize: 12, color: C.muted }}>
          Started {formatDate(profile.employment_start_date)}
        </span>
        {userEmail && (
          <span style={{ fontSize: 12, color: C.muted }}>· {userEmail}</span>
        )}
      </div>

      {/* Tab content */}
      <div style={{ padding: "24px 0 0" }}>
        <SubTabs tabs={TABS} active={subTab} onChange={setSubTab} />
        {subTab === "profile" && <ProfileTab profile={profile} />}
        {subTab === "leave" && (
          <LeaveTab profileId={profile.id} tenantId={profile.tenant_id} />
        )}
        {subTab === "timesheets" && (
          <TimesheetsTab profileId={profile.id} tenantId={profile.tenant_id} />
        )}
      </div>
    </div>
  );
}
