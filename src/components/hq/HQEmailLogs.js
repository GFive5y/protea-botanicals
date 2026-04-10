// src/components/hq/HQEmailLogs.js
// GAP-C02 — HQ cross-tenant email log viewer.
// Reads email_logs table directly. RLS hq_all_email_logs policy must be in place
// (LL-205) so the HQ operator sees rows for ALL tenants.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

const T = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  ink900: "#0D0D0D",
  ink700: "#1F2937",
  ink500: "#6B7280",
  ink300: "#D1D5DB",
  ink150: "#E5E7EB",
  ink075: "#F9FAFB",
  accent: "#4338ca",
  accentLit: "#EEF2FF",
  success: "#059669",
  successBg: "#ECFDF5",
  successBd: "#6EE7B7",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  warning: "#D97706",
  warningBg: "#FFFBEB",
  shadow: "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
};

const TYPE_LABELS = {
  invoice_delivery: "Invoice",
  vat_reminder: "VAT Reminder",
  year_end_notification: "Year-End",
  user_invitation: "Invitation",
  overdue_payment_alert: "Overdue Alert",
  statement_email: "Statement",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "sent", label: "Sent" },
  { id: "failed", label: "Failed" },
];

function StatusBadge({ status }) {
  const ok = status === "sent";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 4,
        background: ok ? T.successBg : T.dangerBg,
        color: ok ? T.success : T.danger,
        border: `1px solid ${ok ? T.successBd : T.dangerBd}`,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: T.font,
      }}
    >
      {status}
    </span>
  );
}

export default function HQEmailLogs() {
  const { allTenants } = useTenant();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const tenantNameById = useMemo(() => {
    const m = {};
    (allTenants || []).forEach((t) => {
      m[t.id] = t.name;
    });
    return m;
  }, [allTenants]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Cross-tenant: no tenant_id filter (HQ pattern, LL-205 RLS bypass).
      const { data, error: err } = await supabase
        .from("email_logs")
        .select(
          "id,tenant_id,type,recipient,subject,status,resend_id,error,metadata,sent_at,created_at",
        )
        .order("sent_at", { ascending: false })
        .limit(500);
      if (err) throw err;
      setLogs(data || []);
    } catch (e) {
      setError(e.message || "Failed to load email logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filter !== "all" && l.status !== filter) return false;
      if (typeFilter !== "all" && l.type !== typeFilter) return false;
      if (tenantFilter !== "all") {
        if (tenantFilter === "_null") {
          if (l.tenant_id) return false;
        } else if (l.tenant_id !== tenantFilter) return false;
      }
      return true;
    });
  }, [logs, filter, typeFilter, tenantFilter]);

  const counts = useMemo(() => {
    const c = { total: logs.length, sent: 0, failed: 0 };
    logs.forEach((l) => {
      if (l.status === "sent") c.sent++;
      else if (l.status === "failed") c.failed++;
    });
    return c;
  }, [logs]);

  const sBtn = (active) => ({
    padding: "6px 14px",
    cursor: "pointer",
    fontFamily: T.font,
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 700,
    borderRadius: 4,
    border: `1px solid ${active ? T.accent : T.ink150}`,
    background: active ? T.accentLit : "#fff",
    color: active ? T.accent : T.ink500,
  });

  return (
    <div style={{ fontFamily: T.font, color: T.ink700 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.ink900 }}>
          Email Logs
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: T.ink500 }}>
          Cross-tenant view of all outbound email · last 500 · GAP-C02
        </p>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: "Total", value: counts.total, color: T.ink900 },
          { label: "Sent", value: counts.sent, color: T.success },
          { label: "Failed", value: counts.failed, color: T.danger },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: "#fff",
              padding: "14px 18px",
              borderRadius: 10,
              boxShadow: T.shadow,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.ink500,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: k.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={sBtn(filter === f.id)}
          >
            {f.label}
          </button>
        ))}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            border: `1px solid ${T.ink150}`,
            borderRadius: 4,
            fontFamily: T.font,
            fontSize: 11,
            color: T.ink700,
            background: "#fff",
          }}
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            border: `1px solid ${T.ink150}`,
            borderRadius: 4,
            fontFamily: T.font,
            fontSize: 11,
            color: T.ink700,
            background: "#fff",
          }}
        >
          <option value="all">All tenants</option>
          <option value="_null">— No tenant —</option>
          {(allTenants || []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button onClick={fetchLogs} style={sBtn(false)}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 6,
            fontSize: 12,
            color: T.danger,
            marginBottom: 12,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          boxShadow: T.shadow,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.ink500 }}>
            Loading email logs…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.ink500 }}>
            No email logs match the current filters.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.ink075, borderBottom: `1px solid ${T.ink150}` }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.ink500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Sent At
                </th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.ink500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Tenant
                </th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.ink500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Type
                </th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.ink500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Recipient
                </th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.ink500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Subject
                </th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.ink500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Status
                </th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 10, fontWeight: 700, color: T.ink500, letterSpacing: "0.06em", textTransform: "uppercase" }}>

                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const isOpen = expanded === l.id;
                return (
                  <React.Fragment key={l.id}>
                    <tr style={{ borderBottom: `1px solid ${T.ink150}` }}>
                      <td style={{ padding: "10px 14px", color: T.ink700, whiteSpace: "nowrap" }}>
                        {new Date(l.sent_at).toLocaleString("en-ZA")}
                      </td>
                      <td style={{ padding: "10px 14px", color: T.ink700 }}>
                        {l.tenant_id ? tenantNameById[l.tenant_id] || l.tenant_id.slice(0, 8) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: T.ink700 }}>
                        {TYPE_LABELS[l.type] || l.type}
                      </td>
                      <td style={{ padding: "10px 14px", color: T.ink700 }}>
                        {l.recipient}
                      </td>
                      <td style={{ padding: "10px 14px", color: T.ink700, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.subject || "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <StatusBadge status={l.status} />
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <button
                          onClick={() => setExpanded(isOpen ? null : l.id)}
                          style={{
                            padding: "4px 10px",
                            background: "transparent",
                            border: `1px solid ${T.ink150}`,
                            borderRadius: 4,
                            fontSize: 10,
                            color: T.ink500,
                            cursor: "pointer",
                            fontFamily: T.font,
                          }}
                        >
                          {isOpen ? "▲" : "▼"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding: "12px 18px", background: T.ink075, borderBottom: `1px solid ${T.ink150}` }}>
                          <div style={{ fontSize: 11, color: T.ink700, lineHeight: 1.7 }}>
                            <div><strong>Resend ID:</strong> {l.resend_id || "—"}</div>
                            {l.error && (
                              <div style={{ color: T.danger }}>
                                <strong>Error:</strong> {l.error}
                              </div>
                            )}
                            <div style={{ marginTop: 6 }}>
                              <strong>Metadata:</strong>
                            </div>
                            <pre style={{ margin: "4px 0 0", padding: 10, background: "#fff", border: `1px solid ${T.ink150}`, borderRadius: 4, fontSize: 10, fontFamily: "DM Mono, monospace", overflow: "auto", maxHeight: 200 }}>
                              {JSON.stringify(l.metadata || {}, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
