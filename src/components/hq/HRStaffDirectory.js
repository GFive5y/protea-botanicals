// HRStaffDirectory.js v1.0
// Protea Botanicals · HR Module · Staff Directory
// WP-HR-2 · March 2026
// NEW FILE — src/components/hr/HRStaffDirectory.js

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import HRStaffProfile from "./HRStaffProfile";
import { T } from "../../styles/tokens";
// Design tokens — imported from tokens.js (WP-UNIFY)

const STATUS_CONFIG = {
  active: { label: "Active", bg: T.successLight, color: T.success },
  on_leave: { label: "On Leave", bg: T.warningLight, color: T.warning },
  terminated: { label: "Terminated", bg: T.dangerLight, color: T.danger },
  suspended: { label: "Suspended", bg: T.warningLight, color: T.warning },
};

const EMP_TYPE_CONFIG = {
  full_time: { label: "Full Time", bg: T.infoLight, color: T.info },
  part_time: { label: "Part Time", bg: T.infoLight, color: T.info },
  contractor: { label: "Contractor", bg: T.accentLight, color: T.accentMid },
  casual: { label: "Casual", bg: T.bg, color: T.ink500 },
};

const DEPT_COLORS = {
  Management: "#795548",
  Production: "#2e7d32",
  Sales: "#1565c0",
  Admin: "#6a1b9a",
  Security: "#c62828",
  Logistics: "#e65100",
  Finance: "#00695c",
  Other: "#616161",
};

function InitialsAvatar({ name, size = 40 }) {
  const parts = (name || "?").trim().split(" ").filter(Boolean);
  const initials =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0]?.slice(0, 2) || "?";
  const hue =
    (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: `hsl(${hue}, 40%, 68%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        color: "#fff",
        fontFamily: T.font,
        textTransform: "uppercase",
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

function Badge({ config, value }) {
  const cfg = config[value] || { label: value, bg: "#f5f5f5", color: "#666" };
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

const st = {
  wrapper: { fontFamily: T.font },
  toolbar: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
    alignItems: "center",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 200px",
    padding: "9px 14px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    color: T.ink700,
    outline: "none",
    background: "#fff",
  },
  filterSelect: {
    padding: "9px 14px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    color: T.ink500,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
  },
  addBtn: {
    padding: "9px 20px",
    background: T.accent,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: T.font,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    marginLeft: "auto",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
    gap: "1px",
    background: T.border,
    borderRadius: 6,
    overflow: "hidden",
    border: `1px solid ${T.border}`,
    boxShadow: T.shadow.sm,
    marginBottom: 24,
  },
  statCard: {
    background: "#fff",
    padding: "16px 18px",
  },
  statNum: {
    fontFamily: T.font,
    fontSize: 22,
    fontWeight: 400,
    color: T.ink900,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontFamily: T.font,
    marginTop: 6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    overflow: "hidden",
  },
  th: {
    padding: "11px 16px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: T.font,
    color: T.ink500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: `1px solid ${T.border}`,
    background: T.bg,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    borderBottom: `1px solid ${T.border}`,
    verticalAlign: "middle",
    fontSize: 13,
    fontFamily: T.font,
  },
  nameCell: { display: "flex", alignItems: "center", gap: 12 },
  staffName: {
    fontWeight: 600,
    color: T.ink700,
    fontSize: 14,
    lineHeight: 1.3,
    fontFamily: T.font,
  },
  staffMeta: {
    fontSize: 11,
    color: T.ink500,
    marginTop: 2,
    fontFamily: T.font,
  },
  deptDot: (dept) => ({
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: DEPT_COLORS[dept] || T.ink300,
    marginRight: 5,
    verticalAlign: "middle",
  }),
  editBtn: {
    padding: "5px 14px",
    background: "none",
    border: `1px solid ${T.border}`,
    borderRadius: 5,
    fontSize: 12,
    color: T.ink500,
    cursor: "pointer",
    fontFamily: T.font,
    fontWeight: 500,
  },
  emptyState: {
    padding: "60px 24px",
    textAlign: "center",
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontFamily: T.font,
    fontSize: 18,
    fontWeight: 600,
    color: T.ink500,
    margin: "0 0 8px 0",
  },
  emptyText: {
    fontSize: 13,
    color: T.ink300,
    margin: "0 0 20px 0",
    fontFamily: T.font,
  },
  loading: {
    padding: "40px",
    textAlign: "center",
    color: T.ink500,
    fontSize: 13,
    fontFamily: T.font,
  },
  error: {
    padding: "14px 16px",
    background: T.dangerLight,
    color: T.danger,
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
    fontFamily: T.font,
  },
};

// ─── STAFF SETUP WIZARD ──────────────────────────────────────────────────────
function StaffSetupWizard({ onAddStaff }) {
  const UNLOCKS = [
    { icon: "⏱", label: "Timesheets" },
    { icon: "📅", label: "Roster" },
    { icon: "📋", label: "Contracts" },
    { icon: "🗓", label: "Leave" },
    { icon: "💰", label: "Payroll" },
  ];

  const NEEDS = [
    { icon: "📄", label: "Full name",        note: "Required",               required: true  },
    { icon: "💼", label: "Job title",         note: "Recommended",            required: false },
    { icon: "🗓", label: "Start date",        note: "Recommended",            required: false },
    { icon: "📋", label: "Employment type",   note: "Full / Part / Contractor", required: false },
    { icon: "🪪", label: "ID number",         note: "For contracts",          required: false },
    { icon: "📞", label: "Phone number",      note: "For contact",            required: false },
    { icon: "🏦", label: "Bank details",      note: "For payroll",            required: false },
    { icon: "💵", label: "Salary / rate",     note: "Via Contracts tab",      required: false },
  ];

  return (
    <div style={{
      background: "#fff", border: `1px solid ${T.border}`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    }}>
      {/* Dark green header */}
      <div style={{ background: T.accent, padding: "32px 36px 28px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: T.accentBd, marginBottom: 10,
        }}>
          HR Setup · Getting Started
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.2 }}>
          Add your team members
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.6, maxWidth: 520 }}>
          Staff profiles are the foundation of everything in the HR module.
          Timesheets, roster, contracts, leave and payroll all connect to a staff profile.
        </div>

        {/* Unlocks pill row */}
        <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
          {UNLOCKS.map(({ icon, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 20, padding: "5px 12px",
              fontSize: 12, color: "#fff", fontFamily: T.font,
            }}>
              <span>{icon}</span> {label}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 36px 32px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: T.ink500, fontFamily: T.font,
          marginBottom: 14,
        }}>
          What you'll need for each team member
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 10, marginBottom: 28,
        }}>
          {NEEDS.map(({ icon, label, note, required }) => (
            <div key={label} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "11px 14px", borderRadius: 8,
              background: required ? T.accentLight : T.surface,
              border: `1px solid ${required ? T.accentBd : T.border}`,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: T.ink900,
                  fontFamily: T.font, marginBottom: 2,
                }}>
                  {label}
                  {required && (
                    <span style={{
                      marginLeft: 5, fontSize: 9, fontWeight: 700,
                      color: T.accent, textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>Required</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: T.ink500, fontFamily: T.font }}>
                  {note}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tip strip */}
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 24,
          background: T.accentLight, border: `1px solid ${T.accentBd}`,
          fontSize: 12, color: T.accent, fontFamily: T.font, lineHeight: 1.6,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <div>
            <strong>You only need a name to get started.</strong> You can add ID numbers,
            bank details and salary information later. Fill in what you have now and
            complete the rest as you go.
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            onClick={onAddStaff}
            style={{
              padding: "13px 32px", borderRadius: 8, border: "none",
              background: T.accent, color: "#fff",
              fontWeight: 700, fontSize: 14, fontFamily: T.font,
              cursor: "pointer", letterSpacing: "0.01em",
              boxShadow: "0 2px 8px rgba(26,61,43,0.25)",
            }}
          >
            Add your first team member →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HRStaffDirectory({ tenantId, user, initialSearch }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(initialSearch || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [editingStaff, setEditingStaff] = useState(null); // null = closed, {} = new, {id,..} = edit
  const [profileOpen, setProfileOpen] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("staff_profiles")
        .select(
          "id, employee_number, full_name, preferred_name, job_title, department, employment_type, status, employment_start_date, reports_to, avatar_url",
        )
        .eq("tenant_id", tenantId)
        .order("full_name", { ascending: true });
      if (err) throw err;
      setStaff(data || []);
    } catch (err) {
      setError(err.message || "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const openNew = () => {
    setEditingStaff({});
    setProfileOpen(true);
  };
  const openEdit = (s) => {
    setEditingStaff(s);
    setProfileOpen(true);
  };
  const closeProfile = () => {
    setProfileOpen(false);
    setEditingStaff(null);
  };
  const handleSaved = () => {
    closeProfile();
    loadStaff();
  };

  const departments = [
    ...new Set(staff.map((s) => s.department).filter(Boolean)),
  ].sort();

  const filtered = staff.filter((s) => {
    const name = (s.preferred_name || s.full_name || "").toLowerCase();
    const emp = (s.employee_number || "").toLowerCase();
    const title = (s.job_title || "").toLowerCase();
    const q = search.toLowerCase();
    const matchSearch =
      !q || name.includes(q) || emp.includes(q) || title.includes(q);
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchDept = !deptFilter || s.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const counts = {
    total: staff.length,
    active: staff.filter((s) => s.status === "active").length,
    on_leave: staff.filter((s) => s.status === "on_leave").length,
    terminated: staff.filter((s) => s.status === "terminated").length,
  };

  return (
    <div style={st.wrapper}>
      {error && <div style={st.error}>⚠ {error}</div>}

      {/* Stats row */}
      {!loading && staff.length > 0 && (
        <div style={st.statsRow}>
          {[
            { num: counts.total, label: "Total Staff" },
            { num: counts.active, label: "Active", color: T.success },
            { num: counts.on_leave, label: "On Leave", color: T.warning },
            { num: counts.terminated, label: "Terminated", color: T.danger },
          ].map(({ num, label, color }) => (
            <div key={label} style={st.statCard}>
              <div style={{ ...st.statNum, color: color || T.ink900 }}>
                {num}
              </div>
              <div style={st.statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={st.toolbar}>
        <input
          style={st.searchInput}
          placeholder="Search by name, ID or job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={st.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        {departments.length > 0 && (
          <select
            style={st.filterSelect}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        <button style={st.addBtn} onClick={openNew}>
          + Add Staff Member
        </button>
      </div>

      {/* Table / States */}
      {loading ? (
        <div style={st.loading}>Loading staff records…</div>
      ) : staff.length === 0 ? (
        <StaffSetupWizard onAddStaff={openNew} />
      ) : filtered.length === 0 ? (
        <div style={{ ...st.emptyState }}>
          <div style={st.emptyIcon}>🔍</div>
          <h3 style={st.emptyTitle}>No results found</h3>
          <p style={st.emptyText}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={st.table}>
            <thead>
              <tr>
                <th style={st.th}>Staff Member</th>
                <th style={st.th}>Emp #</th>
                <th style={st.th}>Department</th>
                <th style={st.th}>Type</th>
                <th style={st.th}>Status</th>
                <th style={st.th}>Start Date</th>
                <th style={st.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openEdit(s)}
                >
                  <td style={st.td}>
                    <div style={st.nameCell}>
                      <InitialsAvatar
                        name={s.preferred_name || s.full_name}
                        size={36}
                      />
                      <div>
                        <div style={st.staffName}>
                          {s.preferred_name || s.full_name}
                        </div>
                        {s.job_title && (
                          <div style={st.staffMeta}>{s.job_title}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      ...st.td,
                      color: "#888",
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                  >
                    {s.employee_number || "—"}
                  </td>
                  <td style={st.td}>
                    {s.department ? (
                      <span>
                        <span style={st.deptDot(s.department)} />
                        {s.department}
                      </span>
                    ) : (
                      <span style={{ color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td style={st.td}>
                    {s.employment_type ? (
                      <Badge
                        config={EMP_TYPE_CONFIG}
                        value={s.employment_type}
                      />
                    ) : (
                      <span style={{ color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td style={st.td}>
                    <Badge
                      config={STATUS_CONFIG}
                      value={s.status || "active"}
                    />
                  </td>
                  <td style={{ ...st.td, color: "#666", fontSize: 12 }}>
                    {s.employment_start_date ? (
                      new Date(s.employment_start_date).toLocaleDateString(
                        "en-ZA",
                        { year: "numeric", month: "short", day: "numeric" },
                      )
                    ) : (
                      <span style={{ color: "#ccc" }}>Not set</span>
                    )}
                  </td>
                  <td
                    style={st.td}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(s);
                    }}
                  >
                    <button style={st.editBtn}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              fontSize: 11,
              color: "#bbb",
              marginTop: 10,
              textAlign: "right",
            }}
          >
            Showing {filtered.length} of {staff.length} staff member
            {staff.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileOpen && (
        <HRStaffProfile
          staff={editingStaff?.id ? editingStaff : null}
          tenantId={tenantId}
          allStaff={staff}
          onClose={closeProfile}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
