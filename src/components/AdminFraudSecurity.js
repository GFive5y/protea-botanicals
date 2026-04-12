// src/components/AdminFraudSecurity.js v1.4
// WP-SEC: Migrated from legacy `scans` table to `scan_logs`
//   - fetchAll now queries scan_logs with correct columns
//   - detectFraud updated: scan_date → scanned_at, product_id → qr_code_id
//   - Display: scan_date → scanned_at, product_id → qr_code_id/qr_code
//   - scan_flagged/flag_reason removed (not in scan_logs) — scan_outcome shown instead
//   - is_first_scan → scan_outcome === 'points_awarded'
//   - os column removed (not in scan_logs)
//   - Auto-flag + manual flag write to user_profiles.anomaly_score instead of legacy scans
// WP-VIZ: Flagged vs Clean donut + Detection reason bar + Scan trend area
// WP-GUIDE: WorkflowGuide + usePageContext added
// WP-VISUAL: T tokens, Inter font, flush stat grid, underline tabs

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
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "./viz";
import { T } from "../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)

// Scan outcomes that indicate suspicious activity
const SUSPICIOUS_OUTCOMES = [
  "blocked_max_scans",
  "velocity_flag",
  "scan_abuse",
];
const isSuspicious = (s) => SUSPICIOUS_OUTCOMES.includes(s.scan_outcome);
const isFirstScan = (s) => s.scan_outcome === "points_awarded";

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

// ─── FLAG REASON CONFIG ───────────────────────────────────────────────────────
const FLAG_COLORS = {
  velocity: { bg: T.dangerLight, color: T.danger },
  travel: { bg: T.warningLight, color: T.warning },
  bulk: { bg: T.dangerLight, color: T.danger },
  distance: { bg: T.infoLight, color: T.info },
  foreign: { bg: "#f5e6fa", color: "#7b2d8b" },
  manual: { bg: T.bg, color: T.ink500 },
};
function FlagBadge({ reason }) {
  const key = reason
    ? Object.keys(FLAG_COLORS).find((k) => reason.toLowerCase().includes(k)) ||
      "manual"
    : "manual";
  const cfg = FLAG_COLORS[key];
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 20,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        background: cfg.bg,
        color: cfg.color,
        fontFamily: T.font,
      }}
    >
      {reason || "Manual"}
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
        fontSize: 10,
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
// Uses scan_logs columns: scanned_at, qr_code_id, user_id
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
        const window = ps.filter(
          (s) =>
            Math.abs(new Date(s.scanned_at) - new Date(ps[i].scanned_at)) <
            86400000,
        );
        if (window.length > 3)
          window.slice(3).forEach((s) => {
            if (!detections.find((d) => d.scanId === s.id))
              detections.push({
                scanId: s.id,
                reason: "velocity",
                severity: "high",
              });
          });
      }
    });
    // 2. Impossible travel: >500km in <60min
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
      if (dist && dist > 500 && mins < 60) {
        if (!detections.find((d) => d.scanId === b.id))
          detections.push({
            scanId: b.id,
            reason: "travel",
            severity: "critical",
          });
      }
    }
    // 3. Bulk: >10 in 1 hour
    for (let i = 0; i < sorted.length; i++) {
      const window = sorted.filter(
        (s) =>
          Math.abs(new Date(s.scanned_at) - new Date(sorted[i].scanned_at)) <
          3600000,
      );
      if (window.length > 10)
        window.slice(10).forEach((s) => {
          if (!detections.find((d) => d.scanId === s.id))
            detections.push({ scanId: s.id, reason: "bulk", severity: "high" });
        });
    }
  });
  // 4. Distance anomaly
  scans.forEach((s) => {
    if (s.distance_to_stockist_m && s.distance_to_stockist_m > 50000) {
      if (!detections.find((d) => d.scanId === s.id))
        detections.push({
          scanId: s.id,
          reason: "distance",
          severity: "medium",
        });
    }
  });
  // 5. Foreign origin
  scans.forEach((s) => {
    if (
      s.ip_country &&
      s.ip_country !== "ZA" &&
      s.ip_country !== "South Africa" &&
      s.ip_country !== ""
    ) {
      if (!detections.find((d) => d.scanId === s.id))
        detections.push({ scanId: s.id, reason: "foreign", severity: "low" });
    }
  });
  return detections;
}

// ─── SECTION WRAPPER ─────────────────────────────────────────────────────────
function Section({ title, children }) {
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
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink500,
          marginBottom: 14,
          fontFamily: T.font,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── POPIA ERASURE MODAL ──────────────────────────────────────────────────────
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
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
            fontFamily: T.font,
          }}
        >
          This will anonymise{" "}
          <strong>{customer?.full_name || "this user"}</strong> by clearing
          their name, phone, date of birth, city, province, gender and referral
          code. Their scan and loyalty history will remain for audit purposes
          but will be unlinked from personal data.
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
            onClick={async () => {
              setConfirming(true);
              await onConfirm(customer);
              setConfirming(false);
              onClose();
            }}
            disabled={confirming}
            style={{ ...makeBtn(T.danger, "#fff", confirming), flex: 2 }}
          >
            {confirming ? "Anonymising…" : "Confirm Erasure"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Breakdown bar helper ───────────────────────────────────────────────────────
function BreakdownBar({ entries, color, total }) {
  return (
    <>
      {entries.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 12, color: T.ink700, fontFamily: T.font }}>
            {k}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 80,
                height: 5,
                background: T.border,
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(v / Math.max(total, 1)) * 100}%`,
                  background: color,
                  borderRadius: 3,
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color,
                minWidth: 24,
                fontVariantNumeric: "tabular-nums",
                fontFamily: T.font,
              }}
            >
              {v}
            </span>
          </div>
        </div>
      ))}
      {entries.length === 0 && (
        <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font }}>
          No data
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminFraudSecurity() {
  const ctx = usePageContext("security", null);
  const [activeTab, setActiveTab] = useState("fraud");
  const [scans, setScans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eraseModal, setEraseModal] = useState(null);
  const [toast, setToast] = useState("");
  const [scanFilter, setScanFilter] = useState("suspicious");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);
  const [fraudAlerts, setFraudAlerts] = useState([]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const writeAlert = useCallback(async (alertType, severity, title, body) => {
    try {
      await supabase.from("system_alerts").insert({
        tenant_id: "43b34c33-6864-4f02-98dd-df1d340475c3",
        alert_type: alertType,
        severity,
        status: "open",
        title,
        body: body || null,
        source_table: "scan_logs",
      });
    } catch (_) {}
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [scanRes, custRes] = await Promise.all([
        supabase
          .from("scan_logs")
          .select(
            "id,user_id,qr_code_id,qr_code,scanned_at,scan_outcome,gps_lat,gps_lng,ip_lat,ip_lng,ip_city,ip_province,ip_country,location_source,device_type,browser,distance_to_stockist_m,points_awarded",
          )
          .order("scanned_at", { ascending: false })
          .limit(500),
        supabase
          .from("user_profiles")
          .select(
            "id,full_name,phone,email,popia_consented,popia_date,marketing_opt_in,analytics_opt_in,geolocation_consent,date_of_birth,city,province,gender,referral_code,created_at,anomaly_score,is_suspended",
          )
          .eq("role", "customer"),
      ]);
      setScans(scanRes.data || []);
      setCustomers(custRes.data || []);
      setDetections(detectFraud(scanRes.data || []));
    } catch (err) {
      console.error("FraudSecurity fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchFraudAlerts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("system_alerts")
        .select("id,title,body,severity,status,created_at")
        .in("alert_type", [
          "high_anomaly",
          "account_flagged",
          "velocity_flag",
          "scan_abuse",
        ])
        .in("status", ["open", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(5);
      setFraudAlerts(data || []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchFraudAlerts();
    const sub = supabase
      .channel("admin-fraud-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_alerts" },
        fetchFraudAlerts,
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchFraudAlerts]);

  // Auto-flag: increment anomaly_score on detected users
  const handleAutoFlag = async () => {
    setRunning(true);
    let flagged = 0;
    const flaggedUserIds = new Set(
      detections
        .map((d) => scans.find((s) => s.id === d.scanId)?.user_id)
        .filter(Boolean),
    );
    for (const userId of flaggedUserIds) {
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("anomaly_score")
        .eq("id", userId)
        .single();
      const current = prof?.anomaly_score || 0;
      const newScore = Math.min(current + 20, 100);
      const { error } = await supabase
        .from("user_profiles")
        .update({ anomaly_score: newScore })
        .eq("id", userId);
      if (!error) flagged++;
    }
    setRunning(false);
    showToast(
      `${flagged} account${flagged !== 1 ? "s" : ""} anomaly score incremented`,
    );
    if (flagged > 0) {
      writeAlert(
        "high_anomaly",
        "warning",
        `${flagged} suspicious pattern${flagged > 1 ? "s" : ""} detected`,
        `Auto-detection flagged ${flagged} account${flagged > 1 ? "s" : ""} across ${[
          ...new Set(detections.map((d) => d.reason)),
        ].join(", ")} rules.`,
      );
    }
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
    showToast(
      `${customer.full_name || "User"} anonymised under POPIA right to erasure`,
    );
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
    showToast(`Data exported for ${customer.full_name || "user"}`);
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const suspiciousScans = scans.filter(isSuspicious);
  const autoDetected = detections.length;
  const consentedCount = customers.filter((c) => c.popia_consented).length;
  const noConsentCount = customers.length - consentedCount;
  const marketingOptIn = customers.filter((c) => c.marketing_opt_in).length;

  const deviceBreakdown = scans.reduce((acc, s) => {
    const k = s.device_type || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const provinceBreakdown = scans.reduce((acc, s) => {
    const k = s.ip_province || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const countryBreakdown = scans.reduce((acc, s) => {
    const k = s.ip_country || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // ── Filtered scan list ────────────────────────────────────────────────────
  let displayedScans = [...scans];
  if (scanFilter === "suspicious")
    displayedScans = displayedScans.filter(isSuspicious);
  if (scanFilter === "detected")
    displayedScans = displayedScans.filter((s) =>
      detections.find((d) => d.scanId === s.id),
    );
  if (scanFilter === "foreign")
    displayedScans = displayedScans.filter(
      (s) =>
        s.ip_country &&
        s.ip_country !== "ZA" &&
        s.ip_country !== "South Africa",
    );
  if (search) {
    const q = search.toLowerCase();
    displayedScans = displayedScans.filter(
      (s) =>
        (s.scan_outcome || "").toLowerCase().includes(q) ||
        (s.ip_city || "").toLowerCase().includes(q) ||
        (s.ip_country || "").toLowerCase().includes(q) ||
        (s.device_type || "").toLowerCase().includes(q) ||
        (s.qr_code || "").toLowerCase().includes(q) ||
        (s.id || "").toLowerCase().includes(q),
    );
  }

  const TABS = [
    { id: "fraud", label: "Fraud Detection" },
    { id: "audit", label: "Audit Log" },
    { id: "popia", label: "POPIA Compliance" },
  ];

  return (
    <div style={{ fontFamily: T.font, position: "relative" }}>
      <WorkflowGuide
        context={ctx}
        tabId="security"
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
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
            Fraud &amp; Security
          </h2>
          <div style={{ fontSize: 13, color: T.ink500 }}>
            Automated fraud detection · Scan audit · POPIA compliance management
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

      {/* Fraud alert banners */}
      {fraudAlerts.map((a) => {
        const sev = {
          critical: { bg: T.dangerLight, bd: T.dangerBd, color: T.danger },
          warning: { bg: T.warningLight, bd: T.warningBd, color: T.warning },
          info: { bg: T.infoLight, bd: T.infoBd, color: T.info },
        }[a.severity] || { bg: T.bg, bd: T.border, color: T.ink700 };
        return (
          <div
            key={a.id}
            style={{
              background: sev.bg,
              border: `1px solid ${sev.bd}`,
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 10,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: sev.color,
                  fontFamily: T.font,
                }}
              >
                {a.title}
              </div>
              {a.body && (
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink700,
                    fontFamily: T.font,
                    marginTop: 2,
                  }}
                >
                  {a.body}
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                await supabase
                  .from("system_alerts")
                  .update({ status: "acknowledged" })
                  .eq("id", a.id);
                fetchFraudAlerts();
              }}
              style={{
                ...makeBtn("transparent", sev.color),
                border: `1px solid ${sev.bd}`,
                fontSize: 9,
                padding: "3px 8px",
                flexShrink: 0,
              }}
            >
              Ack
            </button>
          </div>
        );
      })}

      {/* Flush stat grid */}
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
        {[
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
            label: "POPIA Consented",
            value: consentedCount,
            color: T.accentMid,
          },
          {
            label: "No Consent",
            value: noConsentCount,
            color: noConsentCount > 0 ? T.danger : T.success,
          },
          { label: "Mktg Opt-in", value: marketingOptIn, color: T.info },
          { label: "Customers", value: customers.length, color: T.accent },
        ].map((s) => (
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
                fontSize: 10,
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
                fontWeight: 400,
                color: s.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* WP-VIZ CHARTS */}
      {!loading &&
        scans.length > 0 &&
        (() => {
          const flagDonut = [
            {
              name: "Suspicious",
              value: suspiciousScans.length,
              color: T.danger,
            },
            {
              name: "Auto-Detected",
              value: detections.filter(
                (d) =>
                  !isSuspicious(scans.find((s) => s.id === d.scanId) || {}),
              ).length,
              color: T.warning,
            },
            {
              name: "Clean",
              value: Math.max(
                0,
                scans.length - suspiciousScans.length - detections.length,
              ),
              color: T.success,
            },
          ].filter((d) => d.value > 0);

          const reasonBar = [
            "velocity",
            "travel",
            "bulk",
            "distance",
            "foreign",
          ]
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

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <ChartCard title="Scan Health Overview" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={flagDonut}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {flagDonut.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${v} scans`} />}
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
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
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
                          fontSize: 10,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={4}
                      />
                      <YAxis
                        tick={{
                          fill: T.ink500,
                          fontSize: 10,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="detected"
                        name="Detected"
                        isAnimationActive={false}
                        maxBarSize={28}
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

              <ChartCard title="Scan Activity — Last 14 Days" height={200}>
                {trendData.length < 2 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      fontSize: 13,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    No trend data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendData}
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="fs-total-grad"
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
                          id="fs-flag-grad"
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
                          fontSize: 9,
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
                          fontSize: 9,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={22}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={
                          <ChartTooltip
                            formatter={(v, n) =>
                              n === "Suspicious"
                                ? `${v} suspicious`
                                : `${v} scans`
                            }
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke={T.accentMid}
                        strokeWidth={2}
                        fill="url(#fs-total-grad)"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="suspicious"
                        name="Suspicious"
                        stroke={T.danger}
                        strokeWidth={1.5}
                        fill="url(#fs-flag-grad)"
                        dot={false}
                        isAnimationActive={false}
                        strokeDasharray="4 3"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          );
        })()}

      {/* Underline tabs */}
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
              padding: "10px 20px",
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
          </button>
        ))}
      </div>

      {/* ══ FRAUD DETECTION ══ */}
      {activeTab === "fraud" && (
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
                  ? `${autoDetected} suspicious pattern${autoDetected > 1 ? "s" : ""} detected`
                  : "No new suspicious patterns detected"}
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
            {autoDetected > 0 && (
              <button
                onClick={handleAutoFlag}
                disabled={running}
                style={makeBtn(T.danger, "#fff", running)}
              >
                {running ? "Processing…" : `Flag ${autoDetected} Detected`}
              </button>
            )}
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
                    const cfg = FLAG_COLORS[reason];
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
                            fontWeight: 400,
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

          <Section title="Scan Log">
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                style={{ ...inputStyle, width: 200 }}
                placeholder="Search scans…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  borderBottom: `2px solid ${T.border}`,
                  gap: 0,
                }}
              >
                {[
                  {
                    key: "suspicious",
                    label: `Suspicious (${suspiciousScans.length})`,
                  },
                  { key: "detected", label: `Detected (${autoDetected})` },
                  { key: "foreign", label: "Foreign" },
                  { key: "all", label: "All" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setScanFilter(f.key)}
                    style={{
                      padding: "7px 14px",
                      border: "none",
                      background: "transparent",
                      borderBottom:
                        scanFilter === f.key
                          ? `2px solid ${T.accent}`
                          : "2px solid transparent",
                      marginBottom: -2,
                      fontFamily: T.font,
                      fontSize: 10,
                      fontWeight: scanFilter === f.key ? 700 : 400,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: scanFilter === f.key ? T.accent : T.ink500,
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: T.ink500,
                  marginLeft: "auto",
                  fontFamily: T.font,
                }}
              >
                {displayedScans.length} records
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                Loading…
              </div>
            ) : displayedScans.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                {scanFilter === "suspicious"
                  ? "No suspicious scans"
                  : "No scans found"}
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
                        "Scan Date",
                        "QR Code",
                        "User",
                        "Location",
                        "Device",
                        "Outcome",
                        "Detection",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 10px",
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
                    {displayedScans.slice(0, 80).map((s, i) => {
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
                              padding: "9px 10px",
                              whiteSpace: "nowrap",
                              fontSize: 11,
                              color: T.ink500,
                            }}
                          >
                            {fmtDate(s.scanned_at)}
                          </td>
                          <td
                            style={{
                              padding: "9px 10px",
                              fontSize: 10,
                              color: T.ink700,
                              fontFamily: "monospace",
                            }}
                          >
                            {(s.qr_code || s.qr_code_id || "—").slice(0, 16)}…
                          </td>
                          <td
                            style={{
                              padding: "9px 10px",
                              fontSize: 11,
                              color: T.ink500,
                              fontFamily: "monospace",
                            }}
                          >
                            {s.user_id?.slice(0, 8) || "anon"}
                          </td>
                          <td
                            style={{
                              padding: "9px 10px",
                              fontSize: 11,
                              color: T.ink500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.ip_city || "—"}
                            {s.ip_country ? ` · ${s.ip_country}` : ""}
                          </td>
                          <td
                            style={{
                              padding: "9px 10px",
                              fontSize: 11,
                              color: T.ink500,
                            }}
                          >
                            {s.device_type || "—"}
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            <OutcomeBadge outcome={s.scan_outcome} />
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            {det ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  background: T.warningLight,
                                  color: T.warning,
                                  fontWeight: 700,
                                  borderRadius: 20,
                                  letterSpacing: "0.07em",
                                  textTransform: "uppercase",
                                  fontFamily: T.font,
                                }}
                              >
                                ⚡ {det.reason}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: T.success,
                                  fontFamily: T.font,
                                }}
                              >
                                Clean
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            {s.points_awarded > 0 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: T.accentMid,
                                  fontFamily: T.font,
                                }}
                              >
                                +{s.points_awarded}pts
                              </span>
                            )}
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

      {/* ══ AUDIT LOG ══ */}
      {activeTab === "audit" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <Section title="Device Breakdown">
              <BreakdownBar
                entries={Object.entries(deviceBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)}
                color={T.accentMid}
                total={scans.length}
              />
            </Section>
            <Section title="Province Breakdown">
              <BreakdownBar
                entries={Object.entries(provinceBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)}
                color={T.info}
                total={scans.length}
              />
            </Section>
            <Section title="Country / Origin">
              {Object.entries(countryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([k, v]) => {
                  const foreign =
                    k !== "ZA" && k !== "South Africa" && k !== "unknown";
                  return (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: foreign ? T.danger : T.ink700,
                          fontFamily: T.font,
                        }}
                      >
                        {k} {foreign ? "⚠" : ""}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: foreign ? T.danger : T.accentMid,
                          fontFamily: T.font,
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  );
                })}
              {Object.keys(countryBreakdown).length === 0 && (
                <div style={{ fontSize: 12, color: T.ink500 }}>No data</div>
              )}
            </Section>
          </div>

          <Section
            title={`Scan Audit Log — Last ${Math.min(scans.length, 100)} Scans`}
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
                      "Outcome",
                      "City",
                      "Country",
                      "Device",
                      "Browser",
                      "First?",
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
                  {scans.slice(0, 100).map((s, i) => (
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
                      <td style={{ padding: "7px 10px" }}>
                        <OutcomeBadge outcome={s.scan_outcome} />
                      </td>
                      <td style={{ padding: "7px 10px", color: T.ink500 }}>
                        {s.ip_city || "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          color:
                            s.ip_country && s.ip_country !== "ZA"
                              ? T.danger
                              : T.ink500,
                        }}
                      >
                        {s.ip_country || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", color: T.ink500 }}>
                        {s.device_type || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", color: T.ink500 }}>
                        {s.browser || "—"}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        {isFirstScan(s) ? (
                          <span style={{ color: T.success, fontWeight: 700 }}>
                            ✓
                          </span>
                        ) : (
                          <span style={{ color: T.ink300 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* ══ POPIA ══ */}
      {activeTab === "popia" && (
        <div>
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
            {[
              {
                label: "POPIA Consented",
                value: consentedCount,
                color: T.success,
              },
              {
                label: "No Consent",
                value: noConsentCount,
                color: noConsentCount > 0 ? T.danger : T.success,
              },
              { label: "Mktg Opt-in", value: marketingOptIn, color: T.info },
              {
                label: "Analytics Opt-in",
                value: customers.filter((c) => c.analytics_opt_in).length,
                color: "#b5935a",
              },
              {
                label: "Geo Consent",
                value: customers.filter((c) => c.geolocation_consent).length,
                color: T.accentMid,
              },
            ].map((s) => (
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
                    fontSize: 10,
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
                    fontWeight: 400,
                    color: s.color,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {noConsentCount > 0 && (
            <div
              style={{
                padding: "12px 16px",
                background: T.dangerLight,
                border: `1px solid ${T.dangerBd}`,
                borderRadius: 6,
                marginBottom: 20,
                fontSize: 13,
                color: T.danger,
                fontWeight: 600,
                fontFamily: T.font,
              }}
            >
              {noConsentCount} customer{noConsentCount > 1 ? "s" : ""} without
              POPIA consent recorded
            </div>
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
                          padding: "8px 12px",
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
                  {customers.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{
                        background: i % 2 === 0 ? "#fff" : T.surface,
                        borderBottom: `1px solid ${T.bg}`,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          fontWeight: 600,
                          color: T.ink900,
                        }}
                      >
                        {c.full_name || "Anonymous"}
                      </td>
                      {[
                        c.popia_consented,
                        c.marketing_opt_in,
                        c.analytics_opt_in,
                        c.geolocation_consent,
                      ].map((v, j) => (
                        <td key={j} style={{ padding: "10px 12px" }}>
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
                          padding: "10px 12px",
                          fontSize: 11,
                          color: T.ink500,
                        }}
                      >
                        {c.popia_date ? fmtDate(c.popia_date) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleExport(c)}
                            style={{
                              ...makeBtn(T.info, "#fff"),
                              fontSize: 9,
                              padding: "4px 8px",
                            }}
                          >
                            Export
                          </button>
                          <button
                            onClick={() => setEraseModal(c)}
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
                  {customers.length === 0 && (
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
              <strong>Export:</strong> Downloads all personal data held for a
              customer as JSON (POPIA §23 — right of access).
              <br />
              <strong>Erase:</strong> Anonymises PII fields while retaining
              anonymised transaction records for audit integrity (POPIA §24).
              <br />
              <strong>Consent:</strong> POPIA consent captured at registration.
              Marketing and analytics opt-ins are separate.
              <br />
              <strong>Retention:</strong> Scan and loyalty data without linked
              PII retained for analytics under legitimate interest.
            </div>
          </div>
        </div>
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
