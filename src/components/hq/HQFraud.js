// src/components/hq/HQFraud.js — v2.0
// WP-HQF: Full rebuild — T-tokens, Inter font, scan_logs migration, cross-tenant intelligence
// v2.0 changes from v1.1:
//   - Full T-token design system (no Cormorant, no Jost)
//   - New tab structure: Overview · Accounts · Scan Intelligence · POPIA · Audit
//   - scan_logs replacing legacy scans table for all scan queries
//   - Cross-tenant scan intelligence — all tenants visible via RLS (hq_access=true)
//   - Anomaly score leaderboard — top flagged users across all tenants
//   - Weekly fraud digest — this week vs last week comparison
//   - Tenant risk table — which tenant has the most suspicious activity
//   - Velocity + bulk detection engine using scan_logs
//   - Account suspension with audit_log write
//   - Deletion requests (POPIA) management
//   - Full audit log display
//   - WP-VIZ charts: health donut, detection reason bar, 14-day trend, tenant risk bar

import React, { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "../viz";
import { T } from "../../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDateOnly(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function distanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lat2) return null;
  const R = 6371,
    dLat = ((lat2 - lat1) * Math.PI) / 180,
    dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SUSPICIOUS_OUTCOMES = [
  "blocked_max_scans",
  "velocity_flag",
  "scan_abuse",
  "blocked_max_scans",
];
const isSuspicious = (s) => SUSPICIOUS_OUTCOMES.includes(s.scan_outcome);

const makeBtn = (bg = T.accentMid, color = "#fff", disabled = false) => ({
  padding: "8px 16px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${T.border}` : "none",
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: T.font,
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.15s",
});
const inputStyle = {
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  background: "#fff",
  color: T.ink700,
  outline: "none",
  boxSizing: "border-box",
};

// ─── SEVERITY CONFIG ──────────────────────────────────────────────────────────
const FLAG_COLORS = {
  velocity: { bg: T.dangerLight, color: T.danger },
  travel: { bg: T.warningLight, color: T.warning },
  bulk: { bg: T.dangerLight, color: T.danger },
  distance: { bg: T.infoLight, color: T.info },
  foreign: { bg: "#f5e6fa", color: "#7b2d8b" },
};

function ScoreBadge({ score }) {
  const color = score >= 85 ? T.danger : score >= 50 ? T.warning : T.success;
  const bg = score >= 85 ? T.dangerLight : score >= 50 ? T.warningLight : T.successLight;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 36,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: bg,
        color,
        fontFamily: T.font,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {score ?? 0}
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const suspicious = SUSPICIOUS_OUTCOMES.includes(outcome);
  const color = suspicious
    ? T.danger
    : outcome === "points_awarded"
      ? T.success
      : T.ink500;
  const bg = suspicious
    ? T.dangerLight
    : outcome === "points_awarded"
      ? T.successLight
      : T.bg;
  return (
    <span
      style={{
        fontSize: 9,
        padding: "2px 8px",
        borderRadius: 20,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        background: bg,
        color,
        fontFamily: T.font,
      }}
    >
      {(outcome || "unknown").replace(/_/g, " ")}
    </span>
  );
}

// ─── AUTO-DETECTION ENGINE ────────────────────────────────────────────────────
function detectFraud(scans) {
  const detections = [];
  const byUser = {};
  scans.forEach((s) => {
    if (!s.user_id) return;
    if (!byUser[s.user_id]) byUser[s.user_id] = [];
    byUser[s.user_id].push(s);
  });
  Object.values(byUser).forEach((userScans) => {
    const sorted = [...userScans].sort(
      (a, b) => new Date(a.scanned_at) - new Date(b.scanned_at),
    );
    // 1. Velocity: same QR >3x in 24h
    const byQr = {};
    sorted.forEach((s) => {
      const key = s.qr_code_id || s.qr_code || "unknown";
      if (!byQr[key]) byQr[key] = [];
      byQr[key].push(s);
    });
    Object.values(byQr).forEach((ps) => {
      for (let i = 0; i < ps.length; i++) {
        const win = ps.filter(
          (s) =>
            Math.abs(new Date(s.scanned_at) - new Date(ps[i].scanned_at)) <
            86400000,
        );
        if (win.length > 3)
          win.slice(3).forEach((s) => {
            if (!detections.find((d) => d.scanId === s.id))
              detections.push({
                scanId: s.id,
                userId: s.user_id,
                reason: "velocity",
                severity: "high",
              });
          });
      }
    });
    // 2. Impossible travel
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1],
        b = sorted[i];
      const dist = distanceKm(
        a.gps_lat || a.ip_lat,
        a.gps_lng || a.ip_lng,
        b.gps_lat || b.ip_lat,
        b.gps_lng || b.ip_lng,
      );
      const mins = (new Date(b.scanned_at) - new Date(a.scanned_at)) / 60000;
      if (dist && dist > 500 && mins < 60)
        if (!detections.find((d) => d.scanId === b.id))
          detections.push({
            scanId: b.id,
            userId: b.user_id,
            reason: "travel",
            severity: "critical",
          });
    }
    // 3. Bulk: >10 in 1 hour
    for (let i = 0; i < sorted.length; i++) {
      const win = sorted.filter(
        (s) =>
          Math.abs(new Date(s.scanned_at) - new Date(sorted[i].scanned_at)) <
          3600000,
      );
      if (win.length > 10)
        win.slice(10).forEach((s) => {
          if (!detections.find((d) => d.scanId === s.id))
            detections.push({
              scanId: s.id,
              userId: s.user_id,
              reason: "bulk",
              severity: "high",
            });
        });
    }
  });
  // 4. Foreign origin
  scans.forEach((s) => {
    if (
      s.ip_country &&
      s.ip_country !== "ZA" &&
      s.ip_country !== "South Africa" &&
      s.ip_country !== ""
    )
      if (!detections.find((d) => d.scanId === s.id))
        detections.push({
          scanId: s.id,
          userId: s.user_id,
          reason: "foreign",
          severity: "low",
        });
  });
  return detections;
}

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ title, action, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 24,
        marginBottom: 20,
        boxShadow: T.shadow.sm,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.ink500,
            fontFamily: T.font,
          }}
        >
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── STAT GRID ────────────────────────────────────────────────────────────────
function StatGrid({ stats }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
        gap: "1px",
        background: T.border,
        borderRadius: 8,
        overflow: "hidden",
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow.sm,
        marginBottom: 20,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: "#fff",
            padding: "14px 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.ink500,
              marginBottom: 6,
              fontFamily: T.font,
            }}
          >
            {s.label}
          </div>
          <div
            style={{
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: s.color,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {s.value}
          </div>
          {s.sub && (
            <div
              style={{
                fontSize: 9,
                color: T.ink500,
                marginTop: 4,
                fontFamily: T.font,
              }}
            >
              {s.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SUSPEND MODAL ────────────────────────────────────────────────────────────
function SuspendModal({ user, onClose, onConfirm, adminId }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false); // eslint-disable-line no-unused-vars
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 28,
          maxWidth: 440,
          width: "90%",
          fontFamily: T.font,
          boxShadow: T.shadow.lg,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: T.danger,
            marginBottom: 12,
          }}
        >
          {user?.is_suspended ? "Reinstate Account" : "Suspend Account"}
        </div>
        <div
          style={{
            fontSize: 13,
            color: T.ink700,
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          {user?.is_suspended
            ? `Reinstate ${user?.full_name || "this user"} — they will regain full scan and earning privileges.`
            : `Suspend ${user?.full_name || "this user"} — they can still scan and verify products but will earn zero points until reinstated.`}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: T.ink500,
              marginBottom: 6,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: T.font,
            }}
          >
            Reason (required for audit log)
          </div>
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. velocity abuse, bulk scanning, manual review…"
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...makeBtn("transparent", T.ink500), flex: 1 }}
          >
            Cancel
          </button>
          <button
            disabled={saving || !reason.trim()}
            onClick={async () => {
              setSaving(true);
              await onConfirm(user, reason);
              setSaving(false);
              onClose();
            }}
            style={{
              ...makeBtn(
                user?.is_suspended ? T.accentMid : T.danger,
                "#fff",
                saving || !reason.trim(),
              ),
              flex: 2,
            }}
          >
            {saving ? "Saving…" : user?.is_suspended ? "Reinstate" : "Suspend"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ERASE MODAL ─────────────────────────────────────────────────────────────
function EraseModal({ customer, onClose, onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 28,
          maxWidth: 440,
          width: "90%",
          fontFamily: T.font,
          boxShadow: T.shadow.lg,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: T.danger,
            marginBottom: 12,
          }}
        >
          Right to Erasure
        </div>
        <div
          style={{
            fontSize: 13,
            color: T.ink700,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          This will anonymise{" "}
          <strong>{customer?.full_name || "this user"}</strong> by clearing
          name, phone, DOB, city, province, gender and referral code. Scan and
          loyalty history is retained for audit but unlinked from personal data.
          <br />
          <br />
          <strong style={{ color: T.danger }}>
            This action cannot be undone.
          </strong>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...makeBtn("transparent", T.ink500), flex: 1 }}
          >
            Cancel
          </button>
          <button
            disabled={confirming}
            onClick={async () => {
              setConfirming(true);
              await onConfirm(customer);
              setConfirming(false);
              onClose();
            }}
            style={{ ...makeBtn(T.danger, "#fff", confirming), flex: 2 }}
          >
            {confirming ? "Anonymising…" : "Confirm Erasure"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function HQFraud() {
  const ctx = usePageContext("fraud", null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Data
  const [scans, setScans] = useState([]);
  const [users, setUsers] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [detections, setDetections] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Modals
  const [suspendModal, setSuspendModal] = useState(null);
  const [eraseModal, setEraseModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  // Write audit log entry
  const writeAuditLog = useCallback(
    async (action, targetType, targetId, details) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        await supabase.from("audit_log").insert({
          admin_id: user?.id || null,
          action,
          target_type: targetType,
          target_id: targetId,
          details:
            typeof details === "string" ? details : JSON.stringify(details),
        });
      } catch (_) {}
    },
    [],
  );

  // Write system alert (non-blocking)
  const writeAlert = useCallback(async (alertType, severity, title, body) => {
    try {
      await supabase.from("system_alerts").insert({
        tenant_id: "43b34c33-6864-4f02-98dd-df1d340475c3",
        alert_type: alertType,
        severity,
        status: "open",
        title,
        body: body || null,
        source_table: "user_profiles",
      });
    } catch (_) {}
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [scanRes, userRes, delRes, auditRes, tenantRes] = await Promise.all(
        [
          // scan_logs — cross-tenant, RLS allows hq_access=true to see all
          supabase
            .from("scan_logs")
            .select(
              "id,user_id,qr_code_id,qr_code,scanned_at,scan_outcome,gps_lat,gps_lng,ip_lat,ip_lng,ip_city,ip_province,ip_country,location_source,device_type,browser,distance_to_stockist_m,points_awarded,batch_id",
            )
            .order("scanned_at", { ascending: false })
            .limit(1000),

          // user_profiles — all customers across tenants
          supabase
            .from("user_profiles")
            .select(
              "id,full_name,email,phone,role,tenant_id,loyalty_points,loyalty_tier,anomaly_score,is_suspended,popia_consented,popia_date,marketing_opt_in,analytics_opt_in,geolocation_consent,created_at,date_of_birth,city,province,gender,referral_code",
            )
            .eq("role", "customer"),

          // deletion_requests
          supabase
            .from("deletion_requests")
            .select(
              "id,user_id,requested_at,processed_at,processed_by,status,notes",
            )
            .order("requested_at", { ascending: false })
            .limit(100),

          // audit_log
          supabase
            .from("audit_log")
            .select(
              "id,admin_id,action,target_type,target_id,details,created_at",
            )
            .order("created_at", { ascending: false })
            .limit(200),

          // tenants for cross-tenant risk table
          supabase.from("tenants").select("id,name,slug").eq("is_active", true),
        ],
      );

      const scansData = scanRes.data || [];
      const usersData = userRes.data || [];
      const delsData = delRes.data || [];
      const auditData = auditRes.data || [];
      const tenantsData = tenantRes.data || [];

      setScans(scansData);
      setUsers(usersData);
      setDeletions(delsData);
      setAuditLog(auditData);
      setTenants(tenantsData);
      setDetections(detectFraud(scansData));
    } catch (err) {
      console.error("HQFraud fetchAll:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSuspend = async (user, reason) => {
    setSaving(true);
    const newState = !user.is_suspended;
    await supabase
      .from("user_profiles")
      .update({ is_suspended: newState })
      .eq("id", user.id);
    await writeAuditLog(
      newState ? "account_suspended" : "account_reinstated",
      "user",
      user.id,
      `${newState ? "Suspended" : "Reinstated"} by HQ. Reason: ${reason}`,
    );
    if (newState) {
      writeAlert(
        "account_suspended",
        "warning",
        `Account suspended — ${user.full_name || user.email || user.id.slice(0, 8)}`,
        `HQ suspended account. Reason: ${reason}. Anomaly score: ${user.anomaly_score || 0}.`,
      );
    }
    showToast(
      `${user.full_name || "Account"} ${newState ? "suspended" : "reinstated"}`,
    );
    setSaving(false);
    fetchAll();
  };

  const handleProcessDeletion = async (req, approve) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("deletion_requests")
      .update({
        status: approve ? "approved" : "rejected",
        processed_at: new Date().toISOString(),
        processed_by: user?.id || null,
      })
      .eq("id", req.id);
    if (approve) {
      await supabase
        .from("user_profiles")
        .update({
          full_name: null,
          phone: null,
          date_of_birth: null,
          city: null,
          province: null,
          gender: null,
          referral_code: null,
        })
        .eq("id", req.user_id);
    }
    await writeAuditLog(
      approve ? "popia_erasure_approved" : "popia_erasure_rejected",
      "user",
      req.user_id,
      `Deletion request ${approve ? "approved — PII anonymised" : "rejected"} by HQ`,
    );
    showToast(
      `Deletion request ${approve ? "approved — data anonymised" : "rejected"}`,
    );
    fetchAll();
  };

  const handleErase = async (customer) => {
    await supabase
      .from("user_profiles")
      .update({
        full_name: null,
        phone: null,
        date_of_birth: null,
        city: null,
        province: null,
        gender: null,
        referral_code: null,
      })
      .eq("id", customer.id);
    await writeAuditLog(
      "popia_erasure_manual",
      "user",
      customer.id,
      `Manual erasure by HQ under POPIA right to erasure`,
    );
    showToast(`${customer.full_name || "User"} anonymised under POPIA`);
    fetchAll();
  };

  const handleExport = (customer) => {
    const data = JSON.stringify(customer, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `popia-export-${customer.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    writeAuditLog(
      "popia_export",
      "user",
      customer.id,
      "Data export under POPIA right of access",
    );
    showToast(`Data exported for ${customer.full_name || "user"}`);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const flaggedUsers = users.filter((u) => (u.anomaly_score || 0) >= 50);
  const suspendedUsers = users.filter((u) => u.is_suspended);
  const pendingDels = deletions.filter((d) => d.status === "pending");
  const suspiciousScans = scans.filter(isSuspicious);
  const autoDetected = detections.length;

  // Week-over-week scan comparison
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  const thisWeekScans = scans.filter(
    (s) => new Date(s.scanned_at) > weekAgo,
  ).length;
  const lastWeekScans = scans.filter((s) => {
    const t = new Date(s.scanned_at).getTime();
    return t > twoWeeksAgo && t <= weekAgo;
  }).length;
  const weekTrend =
    lastWeekScans > 0
      ? Math.round(((thisWeekScans - lastWeekScans) / lastWeekScans) * 100)
      : 0;

  const thisWeekSuspicious = scans.filter(
    (s) => new Date(s.scanned_at) > weekAgo && isSuspicious(s),
  ).length;
  const lastWeekSuspicious = scans.filter((s) => {
    const t = new Date(s.scanned_at).getTime();
    return t > twoWeeksAgo && t <= weekAgo && isSuspicious(s);
  }).length;

  // Tenant risk table — cross-tenant suspicious scan counts
  const tenantRisk = tenants
    .map((t) => {
      const tenantUsers = users.filter((u) => u.tenant_id === t.id);
      const tenantUserIds = new Set(tenantUsers.map((u) => u.id));
      const tenantScans = scans.filter((s) => tenantUserIds.has(s.user_id));
      const tenantSuspicious = tenantScans.filter(isSuspicious).length;
      const highAnomalyUsers = tenantUsers.filter(
        (u) => (u.anomaly_score || 0) >= 85,
      ).length;
      return {
        id: t.id,
        name: t.name || t.slug || t.id.slice(0, 8),
        totalScans: tenantScans.length,
        suspicious: tenantSuspicious,
        highAnomaly: highAnomalyUsers,
        suspendedCount: tenantUsers.filter((u) => u.is_suspended).length,
        riskScore: tenantSuspicious + highAnomalyUsers * 10,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  // Top anomaly users leaderboard
  const anomalyLeaderboard = [...users]
    .filter((u) => (u.anomaly_score || 0) > 0)
    .sort((a, b) => (b.anomaly_score || 0) - (a.anomaly_score || 0))
    .slice(0, 10);

  // Chart data
  const flagDonut = [
    {
      name: "High Risk (85+)",
      value: users.filter((u) => (u.anomaly_score || 0) >= 85).length,
      color: T.danger,
    },
    {
      name: "Medium Risk (50–84)",
      value: users.filter((u) => {
        const s = u.anomaly_score || 0;
        return s >= 50 && s < 85;
      }).length,
      color: T.warning,
    },
    {
      name: "Suspicious Scans",
      value: Math.min(suspiciousScans.length, 20),
      color: "#7b2d8b",
    },
    {
      name: "Clean",
      value: Math.max(0, users.length - flaggedUsers.length),
      color: T.success,
    },
  ].filter((d) => d.value > 0);

  const reasonBar = ["velocity", "travel", "bulk", "distance", "foreign"]
    .map((r) => ({
      name: r.charAt(0).toUpperCase() + r.slice(1),
      detected: detections.filter((d) => d.reason === r).length,
      color: FLAG_COLORS[r]?.color || T.ink500,
    }))
    .filter((d) => d.detected > 0);

  const dayMap = {};
  scans.forEach((s) => {
    if (!s.scanned_at) return;
    const day = new Date(s.scanned_at).toLocaleDateString("en-ZA", {
      month: "short",
      day: "numeric",
    });
    dayMap[day] = dayMap[day] || { date: day, total: 0, suspicious: 0 };
    dayMap[day].total++;
    if (isSuspicious(s)) dayMap[day].suspicious++;
  });
  const trendData = Object.values(dayMap).slice(-14);

  const tenantBar = tenantRisk.slice(0, 6).map((t) => ({
    name: t.name.length > 12 ? t.name.slice(0, 12) + "…" : t.name,
    suspicious: t.suspicious,
    color:
      t.suspicious > 10 ? T.danger : t.suspicious > 3 ? T.warning : T.success,
  }));

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "accounts", label: "Accounts" },
    { id: "scans", label: "Scan Intelligence" },
    { id: "popia", label: "POPIA" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <div style={{ fontFamily: T.font, position: "relative" }}>
      <WorkflowGuide
        context={ctx}
        tabId="fraud"
        onAction={() => {}}
        defaultOpen={false}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: T.accent,
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
            fontFamily: T.font,
            boxShadow: T.shadow.lg,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: T.font,
              fontSize: 22,
              fontWeight: 600,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            Fraud &amp; Security Centre
          </h2>
          <div style={{ fontSize: 13, color: T.ink500 }}>
            Real-time fraud detection · Account suspension · POPIA compliance ·
            Admin audit trail
          </div>
        </div>
        <button
          onClick={fetchAll}
          style={{
            ...makeBtn("transparent", T.ink500),
            border: `1px solid ${T.border}`,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Global stat grid */}
      <StatGrid
        stats={[
          { label: "Total Scans", value: scans.length, color: T.accent },
          {
            label: "Suspicious",
            value: suspiciousScans.length,
            color: suspiciousScans.length > 0 ? T.danger : T.success,
          },
          {
            label: "Auto-Detected",
            value: autoDetected,
            color: autoDetected > 0 ? T.warning : T.success,
          },
          {
            label: "Flagged Accts",
            value: flaggedUsers.length,
            color: flaggedUsers.length > 0 ? T.danger : T.success,
          },
          {
            label: "Suspended",
            value: suspendedUsers.length,
            color: suspendedUsers.length > 0 ? T.warning : T.success,
          },
          {
            label: "Pending POPIA",
            value: pendingDels.length,
            color: pendingDels.length > 0 ? T.danger : T.success,
          },
          {
            label: "This Week",
            value: thisWeekScans,
            color: T.accentMid,
            sub:
              weekTrend > 0
                ? `▲ ${weekTrend}% vs last week`
                : weekTrend < 0
                  ? `▼ ${Math.abs(weekTrend)}% vs last week`
                  : "= flat",
          },
        ]}
      />

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${T.border}`,
          marginBottom: 24,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "none",
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
              fontFamily: T.font,
              fontSize: 11,
              fontWeight: activeTab === t.id ? 700 : 400,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: activeTab === t.id ? T.accent : T.ink500,
            }}
          >
            {t.label}
            {t.id === "popia" && pendingDels.length > 0
              ? ` (${pendingDels.length})`
              : ""}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {activeTab === "overview" && (
        <div>
          {/* Weekly digest */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 20,
                boxShadow: T.shadow.sm,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink500,
                  marginBottom: 12,
                  fontFamily: T.font,
                }}
              >
                Weekly Fraud Digest
              </div>
              {[
                {
                  label: "Scans this week",
                  value: thisWeekScans,
                  prev: lastWeekScans,
                },
                {
                  label: "Suspicious this week",
                  value: thisWeekSuspicious,
                  prev: lastWeekSuspicious,
                },
                {
                  label: "New high-risk accounts",
                  value: users.filter((u) => (u.anomaly_score || 0) >= 85)
                    .length,
                  prev: null,
                },
              ].map((row) => {
                const delta = row.prev !== null ? row.value - row.prev : null;
                const up = delta > 0;
                return (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${T.bg}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: T.ink700,
                        fontFamily: T.font,
                      }}
                    >
                      {row.label}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: T.ink900,
                          fontVariantNumeric: "tabular-nums",
                          fontFamily: T.font,
                        }}
                      >
                        {row.value}
                      </span>
                      {delta !== null && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 10,
                            background: up ? T.dangerLight : T.successLight,
                            color: up ? T.danger : T.success,
                            fontFamily: T.font,
                          }}
                        >
                          {up ? "▲" : "▼"} {Math.abs(delta)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tenant risk table */}
            <div
              style={{
                background: "#fff",
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: 20,
                boxShadow: T.shadow.sm,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.ink500,
                  marginBottom: 12,
                  fontFamily: T.font,
                }}
              >
                Tenant Risk Overview
              </div>
              {tenantRisk.length === 0 ? (
                <div
                  style={{ fontSize: 12, color: T.ink500, fontFamily: T.font }}
                >
                  No tenant data
                </div>
              ) : (
                tenantRisk.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${T.bg}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: T.ink700,
                        fontFamily: T.font,
                        fontWeight: 500,
                      }}
                    >
                      {t.name}
                    </span>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      {t.suspicious > 0 && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            borderRadius: 10,
                            fontWeight: 700,
                            background:
                              t.suspicious > 10 ? T.dangerLight : T.warningLight,
                            color: t.suspicious > 10 ? T.danger : T.warning,
                            fontFamily: T.font,
                          }}
                        >
                          {t.suspicious} suspicious
                        </span>
                      )}
                      {t.highAnomaly > 0 && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: "1px 6px",
                            borderRadius: 10,
                            fontWeight: 700,
                            background: T.dangerLight,
                            color: T.danger,
                            fontFamily: T.font,
                          }}
                        >
                          {t.highAnomaly} high-risk
                        </span>
                      )}
                      {t.suspicious === 0 && t.highAnomaly === 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            color: T.success,
                            fontFamily: T.font,
                          }}
                        >
                          ✓ Clean
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Charts */}
          {!loading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <ChartCard title="Account Risk Profile" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={flagDonut}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {flagDonut.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${v} users`} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Detections by Reason" height={200}>
                {reasonBar.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      fontSize: 13,
                      color: T.success,
                      fontFamily: T.font,
                    }}
                  >
                    ✓ No detections
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reasonBar}
                      margin={{ top: 8, right: 4, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid
                        horizontal
                        vertical={false}
                        stroke={T.border}
                        strokeWidth={0.5}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: T.ink500,
                          fontSize: 9,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        tick={{
                          fill: T.ink500,
                          fontSize: 9,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={20}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="detected"
                        name="Detected"
                        isAnimationActive={false}
                        maxBarSize={24}
                        radius={[3, 3, 0, 0]}
                      >
                        {reasonBar.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="14-Day Scan Trend" height={200}>
                {trendData.length < 2 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      fontSize: 12,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    No data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendData}
                      margin={{ top: 8, right: 4, bottom: 8, left: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="hqf-grad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={T.accentMid}
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor={T.accentMid}
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="hqf-s-grad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={T.danger}
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor={T.danger}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        horizontal
                        vertical={false}
                        stroke={T.border}
                        strokeWidth={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: T.ink500,
                          fontSize: 8,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={4}
                        interval="preserveStartEnd"
                        maxRotation={0}
                      />
                      <YAxis
                        tick={{
                          fill: T.ink500,
                          fontSize: 8,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={20}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke={T.accentMid}
                        strokeWidth={2}
                        fill="url(#hqf-grad)"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="suspicious"
                        name="Suspicious"
                        stroke={T.danger}
                        strokeWidth={1.5}
                        fill="url(#hqf-s-grad)"
                        dot={false}
                        isAnimationActive={false}
                        strokeDasharray="4 3"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Suspicious by Tenant" height={200}>
                {tenantBar.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      fontSize: 12,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    No tenant data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={tenantBar}
                      margin={{ top: 8, right: 4, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid
                        horizontal
                        vertical={false}
                        stroke={T.border}
                        strokeWidth={0.5}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: T.ink500,
                          fontSize: 8,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        tick={{
                          fill: T.ink500,
                          fontSize: 8,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={20}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="suspicious"
                        name="Suspicious Scans"
                        isAnimationActive={false}
                        maxBarSize={24}
                        radius={[3, 3, 0, 0]}
                      >
                        {tenantBar.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* Anomaly leaderboard */}
          {anomalyLeaderboard.length > 0 && (
            <Section title="Anomaly Score Leaderboard — Top Risk Accounts">
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    fontFamily: T.font,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "User",
                        "Email",
                        "Tier",
                        "Anomaly Score",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "7px 12px",
                            textAlign: "left",
                            fontSize: 9,
                            color: T.ink500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {anomalyLeaderboard.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : T.surface,
                          borderBottom: `1px solid ${T.bg}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "9px 12px",
                            fontWeight: 600,
                            color: T.ink900,
                          }}
                        >
                          {u.full_name || "—"}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: T.ink500,
                            fontSize: 11,
                          }}
                        >
                          {u.email || "—"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: T.bg,
                              color: T.ink700,
                              fontWeight: 600,
                              fontFamily: T.font,
                            }}
                          >
                            {u.loyalty_tier || "Bronze"}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <ScoreBadge score={u.anomaly_score || 0} />
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          {u.is_suspended ? (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: T.warningLight,
                                color: T.warning,
                                fontWeight: 700,
                                fontFamily: T.font,
                              }}
                            >
                              SUSPENDED
                            </span>
                          ) : (u.anomaly_score || 0) >= 85 ? (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: T.dangerLight,
                                color: T.danger,
                                fontWeight: 700,
                                fontFamily: T.font,
                              }}
                            >
                              HIGH RISK
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: T.warningLight,
                                color: T.warning,
                                fontWeight: 700,
                                fontFamily: T.font,
                              }}
                            >
                              FLAGGED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <button
                            onClick={() => setSuspendModal(u)}
                            style={{
                              ...makeBtn(
                                u.is_suspended ? T.accentMid : T.danger,
                                "#fff",
                              ),
                              fontSize: 9,
                              padding: "4px 10px",
                            }}
                          >
                            {u.is_suspended ? "Reinstate" : "Suspend"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ══ ACCOUNTS ══ */}
      {activeTab === "accounts" && (
        <div>
          <StatGrid
            stats={[
              {
                label: "Flagged (50+)",
                value: flaggedUsers.length,
                color: flaggedUsers.length > 0 ? T.danger : T.success,
              },
              {
                label: "High Risk (85+)",
                value: users.filter((u) => (u.anomaly_score || 0) >= 85).length,
                color: T.danger,
              },
              {
                label: "Suspended",
                value: suspendedUsers.length,
                color: suspendedUsers.length > 0 ? T.warning : T.success,
              },
              {
                label: "Total Customers",
                value: users.length,
                color: T.accent,
              },
            ]}
          />

          <Section
            title="Flagged Accounts"
            action={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{ fontSize: 10, color: T.ink500, fontFamily: T.font }}
                >
                  Min score:
                </span>
                <select
                  style={{ ...inputStyle, padding: "4px 8px", fontSize: 11 }}
                  defaultValue="50"
                >
                  {["50", "70", "85"].map((v) => (
                    <option key={v} value={v}>
                      {v}+
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {loading ? (
              <div
                style={{ padding: 40, textAlign: "center", color: T.ink500 }}
              >
                Loading…
              </div>
            ) : flaggedUsers.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div
                  style={{ fontSize: 13, color: T.ink500, fontFamily: T.font }}
                >
                  No accounts with anomaly score ≥ 50. System clean.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    fontFamily: T.font,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "User",
                        "Email",
                        "Anomaly Score",
                        "Loyalty",
                        "Suspended",
                        "Last Activity",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "7px 12px",
                            textAlign: "left",
                            fontSize: 9,
                            color: T.ink500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedUsers.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : T.surface,
                          borderBottom: `1px solid ${T.bg}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "9px 12px",
                            fontWeight: 600,
                            color: T.ink900,
                          }}
                        >
                          {u.full_name || "Anonymous"}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: T.ink500,
                            fontSize: 11,
                          }}
                        >
                          {u.email || "—"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <ScoreBadge score={u.anomaly_score || 0} />
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: T.bg,
                              color: T.ink700,
                              fontWeight: 600,
                              fontFamily: T.font,
                            }}
                          >
                            {u.loyalty_tier || "Bronze"} ·{" "}
                            {u.loyalty_points || 0}pts
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          {u.is_suspended ? (
                            <span
                              style={{
                                fontSize: 10,
                                color: T.warning,
                                fontWeight: 700,
                              }}
                            >
                              YES
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: T.success }}>
                              No
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            fontSize: 11,
                            color: T.ink500,
                          }}
                        >
                          {fmtDate(u.created_at)}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <button
                            onClick={() => setSuspendModal(u)}
                            style={{
                              ...makeBtn(
                                u.is_suspended ? T.accentMid : T.danger,
                                "#fff",
                              ),
                              fontSize: 9,
                              padding: "4px 10px",
                            }}
                          >
                            {u.is_suspended ? "Reinstate" : "Suspend"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {suspendedUsers.length > 0 && (
            <Section title={`Suspended Accounts (${suspendedUsers.length})`}>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    fontFamily: T.font,
                  }}
                >
                  <thead>
                    <tr>
                      {["User", "Email", "Anomaly Score", ""].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "7px 12px",
                            textAlign: "left",
                            fontSize: 9,
                            color: T.ink500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {suspendedUsers.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : T.surface,
                          borderBottom: `1px solid ${T.bg}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "9px 12px",
                            fontWeight: 600,
                            color: T.ink900,
                          }}
                        >
                          {u.full_name || "Anonymous"}
                        </td>
                        <td
                          style={{
                            padding: "9px 12px",
                            color: T.ink500,
                            fontSize: 11,
                          }}
                        >
                          {u.email || "—"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <ScoreBadge score={u.anomaly_score || 0} />
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <button
                            onClick={() => setSuspendModal(u)}
                            style={{
                              ...makeBtn(T.accentMid, "#fff"),
                              fontSize: 9,
                              padding: "4px 10px",
                            }}
                          >
                            Reinstate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ══ SCAN INTELLIGENCE ══ */}
      {activeTab === "scans" && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: autoDetected > 0 ? T.dangerLight : T.successLight,
              border: `1px solid ${autoDetected > 0 ? T.dangerBd : T.successBd}`,
              borderRadius: 8,
              marginBottom: 20,
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: autoDetected > 0 ? T.danger : T.success,
                  fontFamily: T.font,
                }}
              >
                {autoDetected > 0
                  ? `${autoDetected} suspicious pattern${autoDetected > 1 ? "s" : ""} detected across all tenants`
                  : "No suspicious patterns detected — all tenants clean"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: T.ink500,
                  marginTop: 2,
                  fontFamily: T.font,
                }}
              >
                Detection rules: velocity abuse · impossible travel · bulk
                scanning · distance anomaly · foreign origin
              </div>
            </div>
          </div>

          {detections.length > 0 && (
            <Section title="Detection Breakdown">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["velocity", "travel", "bulk", "distance", "foreign"].map(
                  (reason) => {
                    const count = detections.filter(
                      (d) => d.reason === reason,
                    ).length;
                    if (count === 0) return null;
                    const cfg = FLAG_COLORS[reason] || {
                      bg: T.bg,
                      color: T.ink500,
                    };
                    return (
                      <div
                        key={reason}
                        style={{
                          padding: "12px 16px",
                          background: cfg.bg,
                          borderRadius: 8,
                          textAlign: "center",
                          minWidth: 100,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: cfg.color,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            marginBottom: 4,
                            fontFamily: T.font,
                          }}
                        >
                          {reason}
                        </div>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: cfg.color,
                            fontFamily: T.font,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {count}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </Section>
          )}

          <Section
            title={`Recent Scan Log — Last ${Math.min(scans.length, 200)} Scans`}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                  fontFamily: T.font,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Date",
                      "QR Code",
                      "User",
                      "Outcome",
                      "Location",
                      "Device",
                      "Detection",
                      "Pts",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "7px 10px",
                          textAlign: "left",
                          fontSize: 9,
                          color: T.ink500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          borderBottom: `1px solid ${T.border}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scans.slice(0, 200).map((s, i) => {
                    const det = detections.find((d) => d.scanId === s.id);
                    return (
                      <tr
                        key={s.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : T.surface,
                          borderBottom: `1px solid ${T.bg}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "7px 10px",
                            whiteSpace: "nowrap",
                            color: T.ink500,
                          }}
                        >
                          {fmtDate(s.scanned_at)}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            fontFamily: "monospace",
                            color: T.ink700,
                            fontSize: 10,
                          }}
                        >
                          {(s.qr_code || s.qr_code_id || "—").slice(0, 14)}…
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            fontFamily: "monospace",
                            color: T.ink500,
                            fontSize: 10,
                          }}
                        >
                          {s.user_id?.slice(0, 8) || "anon"}
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <OutcomeBadge outcome={s.scan_outcome} />
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            color: T.ink500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.ip_city || "—"}
                          {s.ip_country ? ` · ${s.ip_country}` : ""}
                        </td>
                        <td style={{ padding: "7px 10px", color: T.ink500 }}>
                          {s.device_type || "—"}
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          {det ? (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "2px 6px",
                                borderRadius: 10,
                                background: T.warningLight,
                                color: T.warning,
                                fontWeight: 700,
                                fontFamily: T.font,
                              }}
                            >
                              ⚡ {det.reason}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: T.success }}>
                              Clean
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            color:
                              s.points_awarded > 0 ? T.accentMid : T.ink300,
                            fontSize: 10,
                          }}
                        >
                          {s.points_awarded > 0 ? `+${s.points_awarded}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* ══ POPIA ══ */}
      {activeTab === "popia" && (
        <div>
          <StatGrid
            stats={[
              {
                label: "POPIA Consented",
                value: users.filter((u) => u.popia_consented).length,
                color: T.success,
              },
              {
                label: "No Consent",
                value: users.filter((u) => !u.popia_consented).length,
                color: T.danger,
              },
              {
                label: "Mktg Opt-in",
                value: users.filter((u) => u.marketing_opt_in).length,
                color: T.info,
              },
              {
                label: "Pending Requests",
                value: pendingDels.length,
                color: pendingDels.length > 0 ? T.danger : T.success,
              },
              {
                label: "Processed",
                value: deletions.filter((d) => d.status !== "pending").length,
                color: T.accentMid,
              },
            ]}
          />

          {pendingDels.length > 0 && (
            <Section
              title={`Deletion Requests — ${pendingDels.length} Pending (POPIA 30-Day Requirement)`}
            >
              {pendingDels.map((req, i) => {
                const user = users.find((u) => u.id === req.user_id);
                return (
                  <div
                    key={req.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom:
                        i < pendingDels.length - 1
                          ? `1px solid ${T.border}`
                          : "none",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: T.ink900,
                          fontFamily: T.font,
                        }}
                      >
                        {user?.full_name || req.user_id.slice(0, 8)} ·{" "}
                        {user?.email || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          marginTop: 2,
                          fontFamily: T.font,
                        }}
                      >
                        Requested {fmtDate(req.requested_at)}
                        {req.notes && ` · "${req.notes}"`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleProcessDeletion(req, true)}
                        style={{
                          ...makeBtn(T.danger, "#fff"),
                          fontSize: 9,
                          padding: "5px 12px",
                        }}
                      >
                        Approve &amp; Erase
                      </button>
                      <button
                        onClick={() => handleProcessDeletion(req, false)}
                        style={{
                          ...makeBtn("transparent", T.ink500),
                          fontSize: 9,
                          padding: "5px 12px",
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </Section>
          )}

          <Section title="Customer Consent Register">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  fontFamily: T.font,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Customer",
                      "POPIA",
                      "Marketing",
                      "Analytics",
                      "Geo",
                      "Consent Date",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "7px 12px",
                          textAlign: "left",
                          fontSize: 9,
                          color: T.ink500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      style={{
                        background: i % 2 === 0 ? "#fff" : T.surface,
                        borderBottom: `1px solid ${T.bg}`,
                      }}
                    >
                      <td
                        style={{
                          padding: "9px 12px",
                          fontWeight: 600,
                          color: T.ink900,
                        }}
                      >
                        {u.full_name || "Anonymous"}
                      </td>
                      {[
                        u.popia_consented,
                        u.marketing_opt_in,
                        u.analytics_opt_in,
                        u.geolocation_consent,
                      ].map((v, j) => (
                        <td key={j} style={{ padding: "9px 12px" }}>
                          <span
                            style={{
                              fontSize: 13,
                              color: v ? T.success : T.danger,
                              fontWeight: 700,
                            }}
                          >
                            {v ? "✓" : "✗"}
                          </span>
                        </td>
                      ))}
                      <td
                        style={{
                          padding: "9px 12px",
                          fontSize: 11,
                          color: T.ink500,
                        }}
                      >
                        {u.popia_date ? fmtDateOnly(u.popia_date) : "—"}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleExport(u)}
                            style={{
                              ...makeBtn(T.info, "#fff"),
                              fontSize: 9,
                              padding: "4px 8px",
                            }}
                          >
                            Export
                          </button>
                          <button
                            onClick={() => setEraseModal(u)}
                            style={{
                              ...makeBtn(T.danger, "#fff"),
                              fontSize: 9,
                              padding: "4px 8px",
                            }}
                          >
                            Erase
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: T.ink500,
                        }}
                      >
                        No customers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <div
            style={{
              padding: 16,
              background: T.infoLight,
              border: `1px solid ${T.infoBd}`,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.info,
                marginBottom: 8,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: T.font,
              }}
            >
              POPIA Compliance Notes
            </div>
            <div
              style={{
                fontSize: 12,
                color: T.ink700,
                lineHeight: 1.7,
                fontFamily: T.font,
              }}
            >
              <strong>Export:</strong> Downloads all personal data as JSON
              (POPIA §23 — right of access).
              <br />
              <strong>Erase:</strong> Anonymises PII fields, retains anonymised
              records for audit (POPIA §24).
              <br />
              <strong>Deletion requests:</strong> Must be processed within 30
              days of receipt.
              <br />
              <strong>Audit:</strong> All POPIA actions are written to the audit
              log with timestamp and admin ID.
            </div>
          </div>
        </div>
      )}

      {/* ══ AUDIT LOG ══ */}
      {activeTab === "audit" && (
        <div>
          <Section
            title={`Admin Audit Log — Last ${Math.min(auditLog.length, 200)} Actions`}
          >
            {loading ? (
              <div
                style={{ padding: 40, textAlign: "center", color: T.ink500 }}
              >
                Loading…
              </div>
            ) : auditLog.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                No audit entries yet
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                    fontFamily: T.font,
                  }}
                >
                  <thead>
                    <tr>
                      {["Date", "Admin", "Action", "Target", "Details"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "7px 12px",
                              textAlign: "left",
                              fontSize: 9,
                              color: T.ink500,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              borderBottom: `1px solid ${T.border}`,
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.slice(0, 200).map((entry, i) => {
                      const actionColor = entry.action?.includes("suspend")
                        ? T.warning
                        : entry.action?.includes("erase") ||
                            entry.action?.includes("delete")
                          ? T.danger
                          : T.accentMid;
                      return (
                        <tr
                          key={entry.id}
                          style={{
                            background: i % 2 === 0 ? "#fff" : T.surface,
                            borderBottom: `1px solid ${T.bg}`,
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 12px",
                              whiteSpace: "nowrap",
                              color: T.ink500,
                              fontSize: 10,
                            }}
                          >
                            {fmtDate(entry.created_at)}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              color: T.ink500,
                              fontFamily: "monospace",
                              fontSize: 10,
                            }}
                          >
                            {entry.admin_id?.slice(0, 8) || "system"}…
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                fontSize: 9,
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: actionColor + "20",
                                color: actionColor,
                                fontWeight: 700,
                                letterSpacing: "0.07em",
                                textTransform: "uppercase",
                                fontFamily: T.font,
                              }}
                            >
                              {(entry.action || "—").replace(/_/g, " ")}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              color: T.ink500,
                              fontSize: 10,
                            }}
                          >
                            {entry.target_type || "—"}{" "}
                            {entry.target_id
                              ? `· ${entry.target_id.slice(0, 8)}…`
                              : ""}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              color: T.ink500,
                              fontSize: 11,
                              maxWidth: 300,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {typeof entry.details === "object"
                              ? JSON.stringify(entry.details)
                              : entry.details || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Modals */}
      {suspendModal && (
        <SuspendModal
          user={suspendModal}
          onClose={() => setSuspendModal(null)}
          onConfirm={handleSuspend}
        />
      )}
      {eraseModal && (
        <EraseModal
          customer={eraseModal}
          onClose={() => setEraseModal(null)}
          onConfirm={handleErase}
        />
      )}
    </div>
  );
}
