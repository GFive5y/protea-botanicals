// HRStaffDirectory.js v1.0
// Protea Botanicals · HR Module · Staff Directory
// WP-HR-2 · March 2026
// NEW FILE — src/components/hr/HRStaffDirectory.js

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import HRStaffProfile from "./HRStaffProfile";

const STATUS_CONFIG = {
  active: { label: "Active", bg: "#e8f5e9", color: "#2e7d32" },
  on_leave: { label: "On Leave", bg: "#fff8e1", color: "#f57f17" },
  terminated: { label: "Terminated", bg: "#fdecea", color: "#c62828" },
  suspended: { label: "Suspended", bg: "#fff3e0", color: "#e65100" },
};

const EMP_TYPE_CONFIG = {
  full_time: { label: "Full Time", bg: "#e3f2fd", color: "#1565c0" },
  part_time: { label: "Part Time", bg: "#ede7f6", color: "#4527a0" },
  contractor: { label: "Contractor", bg: "#f3e5f5", color: "#6a1b9a" },
  casual: { label: "Casual", bg: "#f5f5f5", color: "#616161" },
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
        fontFamily: "'Jost', sans-serif",
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
  wrapper: { fontFamily: "'Jost', sans-serif" },
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
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    color: "#2d2d2d",
    outline: "none",
    background: "#fff",
  },
  filterSelect: {
    padding: "9px 14px",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    color: "#555",
    background: "#fff",
    cursor: "pointer",
    outline: "none",
  },
  addBtn: {
    padding: "9px 20px",
    background: "#3d6b35",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    whiteSpace: "nowrap",
    marginLeft: "auto",
  },
  statsRow: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  statCard: {
    padding: "10px 16px",
    background: "#fff",
    border: "1px solid #e8e4de",
    borderRadius: 8,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  statNum: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#2d2d2d",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    border: "1px solid #ece8e2",
    borderRadius: 8,
    overflow: "hidden",
  },
  th: {
    padding: "11px 16px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid #ece8e2",
    background: "#faf8f5",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 16px",
    borderBottom: "1px solid #f5f2ee",
    verticalAlign: "middle",
    fontSize: 13,
  },
  nameCell: { display: "flex", alignItems: "center", gap: 12 },
  staffName: {
    fontWeight: 600,
    color: "#2d2d2d",
    fontSize: 14,
    lineHeight: 1.3,
  },
  staffMeta: { fontSize: 11, color: "#aaa", marginTop: 2 },
  deptDot: (dept) => ({
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: DEPT_COLORS[dept] || "#aaa",
    marginRight: 5,
    verticalAlign: "middle",
  }),
  editBtn: {
    padding: "5px 14px",
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 5,
    fontSize: 12,
    color: "#555",
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 500,
  },
  emptyState: {
    padding: "60px 24px",
    textAlign: "center",
    background: "#fff",
    border: "1px solid #ece8e2",
    borderRadius: 8,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 18,
    fontWeight: 600,
    color: "#aaa",
    margin: "0 0 8px 0",
  },
  emptyText: { fontSize: 13, color: "#bbb", margin: "0 0 20px 0" },
  loading: {
    padding: "40px",
    textAlign: "center",
    color: "#aaa",
    fontSize: 13,
  },
  error: {
    padding: "14px 16px",
    background: "#fdecea",
    color: "#c62828",
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 13,
  },
};

export default function HRStaffDirectory({ tenantId, user }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
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
            { num: counts.active, label: "Active", color: "#2e7d32" },
            { num: counts.on_leave, label: "On Leave", color: "#f57f17" },
            { num: counts.terminated, label: "Terminated", color: "#c62828" },
          ].map(({ num, label, color }) => (
            <div key={label} style={st.statCard}>
              <div style={{ ...st.statNum, color: color || "#2d2d2d" }}>
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
        <div style={st.emptyState}>
          <div style={st.emptyIcon}>👥</div>
          <h3 style={st.emptyTitle}>No staff records yet</h3>
          <p style={st.emptyText}>
            Add your first team member to get started with HR management.
          </p>
          <button style={st.addBtn} onClick={openNew}>
            + Add First Staff Member
          </button>
        </div>
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
