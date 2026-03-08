// src/components/AdminFraudSecurity.js
// v1.0 — March 2026
// WP8 — Fraud Detection, Security & POPIA
//
// Features:
//   FRAUD DETECTION
//   - Auto-flag patterns from scans table:
//       • Velocity abuse: same user scans same product >3x in 24h
//       • Impossible travel: 2 scans >500km apart within 1 hour
//       • Bulk scanning: >10 scans in 1 hour by one user
//       • Distance anomaly: scan >50km from nearest stockist
//       • Foreign origin: ip_country not ZA
//   - Flagged scan log: show scan_flagged=true records
//   - Manual flag / unflag with reason
//   - Flag stats strip: total flagged, by reason, resolution rate
//
//   SECURITY
//   - Scan audit log (recent 100 scans with all metadata)
//   - Device/browser/OS breakdown
//   - Geographic heatmap data (city/province breakdown)
//
//   POPIA
//   - Consent status per customer (popia_consented, marketing_opt_in, analytics_opt_in)
//   - Non-consented customer list
//   - Data export: download customer profile as JSON
//   - Right to erasure: anonymise user (nullify PII fields)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightRed: "#fdf0ef",
  orange: "#e67e22",
  lightOrange: "#fef3e0",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  lightGreen: "#eafaf1",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', sans-serif",
};

// ── Helpers ───────────────────────────────────────────────────────────────
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
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const inputStyle = {
  padding: "9px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: F.body,
  background: C.white,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};
const makeBtn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "8px 16px",
  backgroundColor: disabled ? "#ccc" : bg,
  color,
  border: bg === "transparent" ? `1px solid ${C.border}` : "none",
  borderRadius: 2,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: F.body,
  opacity: disabled ? 0.6 : 1,
});

const sLabel = {
  fontSize: "9px",
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "10px",
  fontFamily: F.body,
  fontWeight: 700,
};

// ── Flag reason badge ─────────────────────────────────────────────────────
const FLAG_COLORS = {
  velocity: { bg: C.lightRed, color: C.red },
  travel: { bg: C.lightOrange, color: C.orange },
  bulk: { bg: C.lightRed, color: C.red },
  distance: { bg: C.lightBlue, color: C.blue },
  foreign: { bg: "#f5e6fa", color: "#7b2d8b" },
  manual: { bg: "#f0f0f0", color: "#555" },
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
        borderRadius: 2,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {reason || "Manual"}
    </span>
  );
}

// ── Auto-detection engine ─────────────────────────────────────────────────
function detectFraud(scans) {
  const detections = []; // { scanId, reason, severity }

  // Group scans by user
  const byUser = {};
  scans.forEach((s) => {
    if (!s.user_id) return;
    if (!byUser[s.user_id]) byUser[s.user_id] = [];
    byUser[s.user_id].push(s);
  });

  Object.values(byUser).forEach((userScans) => {
    // Sort by date
    const sorted = [...userScans].sort(
      (a, b) => new Date(a.scan_date) - new Date(b.scan_date),
    );

    // 1. Velocity: same product >3x in 24h
    const byProduct = {};
    sorted.forEach((s) => {
      if (!byProduct[s.product_id]) byProduct[s.product_id] = [];
      byProduct[s.product_id].push(s);
    });
    Object.values(byProduct).forEach((ps) => {
      for (let i = 0; i < ps.length; i++) {
        const window = ps.filter(
          (s) =>
            Math.abs(new Date(s.scan_date) - new Date(ps[i].scan_date)) <
            86400000,
        );
        if (window.length > 3) {
          window.slice(3).forEach((s) => {
            if (!detections.find((d) => d.scanId === s.id))
              detections.push({
                scanId: s.id,
                reason: "velocity",
                severity: "high",
              });
          });
        }
      }
    });

    // 2. Impossible travel: >500km in <60min
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1],
        b = sorted[i];
      const lat1 = a.gps_lat || a.ip_lat,
        lng1 = a.gps_lng || a.ip_lng;
      const lat2 = b.gps_lat || b.ip_lat,
        lng2 = b.gps_lng || b.ip_lng;
      const dist = distanceKm(lat1, lng1, lat2, lng2);
      const mins = (new Date(b.scan_date) - new Date(a.scan_date)) / 60000;
      if (dist && dist > 500 && mins < 60) {
        if (!detections.find((d) => d.scanId === b.id))
          detections.push({
            scanId: b.id,
            reason: "travel",
            severity: "critical",
          });
      }
    }

    // 3. Bulk scanning: >10 in 1 hour
    for (let i = 0; i < sorted.length; i++) {
      const window = sorted.filter(
        (s) =>
          Math.abs(new Date(s.scan_date) - new Date(sorted[i].scan_date)) <
          3600000,
      );
      if (window.length > 10) {
        window.slice(10).forEach((s) => {
          if (!detections.find((d) => d.scanId === s.id))
            detections.push({ scanId: s.id, reason: "bulk", severity: "high" });
        });
      }
    }
  });

  // 4. Distance anomaly: >50km from stockist
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

// ── Section wrapper ───────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <div style={sLabel}>{title}</div>
      {children}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────
function Stat({ label, value, color = C.green, sub }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 2,
        padding: "14px 16px",
        textAlign: "center",
        flex: 1,
        minWidth: 110,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: F.heading,
          fontSize: 28,
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Flag Modal ────────────────────────────────────────────────────────────
function FlagModal({ scan, onClose, onSave }) {
  const [reason, setReason] = useState(scan?.flag_reason || "");
  const [flagged, setFlagged] = useState(scan?.scan_flagged || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(scan.id, flagged, reason);
    setSaving(false);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 2,
          padding: 28,
          maxWidth: 460,
          width: "90%",
          fontFamily: F.body,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontFamily: F.heading, fontSize: 22, color: C.green }}>
            Flag Scan
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: C.muted,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          Scan ID:{" "}
          <code style={{ fontSize: 11 }}>{scan?.id?.slice(0, 16)}…</code>
          <br />
          Product: <strong>{scan?.product_id?.slice(0, 8)}…</strong> ·{" "}
          {fmtDate(scan?.scan_date)}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={flagged}
              onChange={(e) => setFlagged(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Mark as Flagged
          </label>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginBottom: 6,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Reason
          </div>
          <input
            style={{ ...inputStyle, width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. suspicious velocity, manual review…"
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...makeBtn("transparent", C.muted), flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...makeBtn(C.green, C.white, saving), flex: 2 }}
          >
            {saving ? "Saving…" : "Save Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── POPIA Erasure Confirm Modal ───────────────────────────────────────────
function EraseModal({ customer, onClose, onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 2,
          padding: 28,
          maxWidth: 440,
          width: "90%",
          fontFamily: F.body,
        }}
      >
        <div
          style={{
            fontFamily: F.heading,
            fontSize: 22,
            color: C.red,
            marginBottom: 12,
          }}
        >
          ⚠ Right to Erasure
        </div>
        <div
          style={{
            fontSize: 13,
            color: C.text,
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          This will anonymise{" "}
          <strong>{customer?.full_name || "this user"}</strong> by clearing
          their name, phone, date of birth, city, province, gender and referral
          code. Their scan and loyalty history will remain for audit purposes
          but will be unlinked from personal data.
          <br />
          <br />
          <strong style={{ color: C.red }}>
            This action cannot be undone.
          </strong>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ ...makeBtn("transparent", C.muted), flex: 1 }}
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
            style={{ ...makeBtn(C.red, C.white, confirming), flex: 2 }}
          >
            {confirming ? "Anonymising…" : "Confirm Erasure"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminFraudSecurity() {
  const [activeTab, setActiveTab] = useState("fraud");
  const [scans, setScans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flagModal, setFlagModal] = useState(null);
  const [eraseModal, setEraseModal] = useState(null);
  const [toast, setToast] = useState("");
  const [scanFilter, setScanFilter] = useState("flagged");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [scanRes, custRes] = await Promise.all([
        supabase
          .from("scans")
          .select(
            "id,user_id,product_id,scan_date,source,gps_lat,gps_lng,ip_lat,ip_lng,ip_city,ip_province,ip_country,location_source,device_type,browser,os,is_first_scan,scan_flagged,flag_reason,distance_to_stockist_m",
          )
          .order("scan_date", { ascending: false })
          .limit(500),
        supabase
          .from("user_profiles")
          .select(
            "id,full_name,phone,email,popia_consented,popia_date,marketing_opt_in,analytics_opt_in,geolocation_consent,date_of_birth,city,province,gender,referral_code,created_at",
          )
          .eq("role", "customer"),
      ]);

      const allScans = scanRes.data || [];
      const allCusts = custRes.data || [];
      setScans(allScans);
      setCustomers(allCusts);
      setDetections(detectFraud(allScans));
    } catch (err) {
      console.error("FraudSecurity fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Run auto-detection + write flags to DB ────────────────────────────
  const handleAutoFlag = async () => {
    setRunning(true);
    let flagged = 0;
    for (const det of detections) {
      const scan = scans.find((s) => s.id === det.scanId);
      if (scan && !scan.scan_flagged) {
        const { error } = await supabase
          .from("scans")
          .update({
            scan_flagged: true,
            flag_reason: det.reason,
          })
          .eq("id", det.scanId);
        if (!error) flagged++;
      }
    }
    setRunning(false);
    showToast(`✓ ${flagged} scans auto-flagged and saved`);
    fetchAll();
  };

  // ── Manual flag / unflag ──────────────────────────────────────────────
  const handleSaveFlag = async (scanId, flagged, reason) => {
    await supabase
      .from("scans")
      .update({ scan_flagged: flagged, flag_reason: reason })
      .eq("id", scanId);
    showToast(`✓ Scan ${flagged ? "flagged" : "cleared"}`);
    fetchAll();
  };

  // ── POPIA erasure ─────────────────────────────────────────────────────
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
      `✓ ${customer.full_name || "User"} anonymised under POPIA right to erasure`,
    );
    fetchAll();
  };

  // ── Export customer data as JSON ──────────────────────────────────────
  const handleExport = (customer) => {
    const data = JSON.stringify(customer, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `popia-export-${customer.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ Data exported for ${customer.full_name || "user"}`);
  };

  // ── Computed stats ────────────────────────────────────────────────────
  const flaggedScans = scans.filter((s) => s.scan_flagged);
  const autoDetected = detections.length;
  const consentedCount = customers.filter((c) => c.popia_consented).length;
  const noConsentCount = customers.length - consentedCount;
  const marketingOptIn = customers.filter((c) => c.marketing_opt_in).length;

  // Device breakdown
  const deviceBreakdown = scans.reduce((acc, s) => {
    const k = s.device_type || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // Province breakdown
  const provinceBreakdown = scans.reduce((acc, s) => {
    const k = s.ip_province || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // Country breakdown
  const countryBreakdown = scans.reduce((acc, s) => {
    const k = s.ip_country || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // ── Filtered scan list ────────────────────────────────────────────────
  let displayedScans = [...scans];
  if (scanFilter === "flagged")
    displayedScans = displayedScans.filter((s) => s.scan_flagged);
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
        (s.flag_reason || "").toLowerCase().includes(q) ||
        (s.ip_city || "").toLowerCase().includes(q) ||
        (s.ip_country || "").toLowerCase().includes(q) ||
        (s.device_type || "").toLowerCase().includes(q) ||
        (s.id || "").toLowerCase().includes(q),
    );
  }

  const TABS = [
    { id: "fraud", label: "🚨 Fraud Detection" },
    { id: "audit", label: "🔍 Audit Log" },
    { id: "popia", label: "🔒 POPIA Compliance" },
  ];

  return (
    <div style={{ fontFamily: F.body, position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.green,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 2000,
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
              fontFamily: F.heading,
              color: C.green,
              fontSize: 24,
              margin: 0,
            }}
          >
            Fraud &amp; Security
          </h2>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Automated fraud detection · Scan audit · POPIA compliance management
          </div>
        </div>
        <button onClick={fetchAll} style={makeBtn("transparent", C.muted)}>
          ↻ Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}
      >
        <Stat label="Total Scans" value={scans.length} color={C.green} />
        <Stat
          label="Flagged"
          value={flaggedScans.length}
          color={flaggedScans.length > 0 ? C.red : C.accent}
        />
        <Stat
          label="Auto-Detected"
          value={autoDetected}
          color={autoDetected > 0 ? C.orange : C.accent}
        />
        <Stat
          label="POPIA Consented"
          value={consentedCount}
          color={C.accent}
          sub={`${noConsentCount} without consent`}
        />
        <Stat label="Marketing Opt-in" value={marketingOptIn} color={C.blue} />
        <Stat label="Customers" value={customers.length} color={C.green} />
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${C.border}`,
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
                  ? `2px solid ${C.green}`
                  : "2px solid transparent",
              marginBottom: "-1px",
              cursor: "pointer",
              fontFamily: F.body,
              fontSize: 11,
              fontWeight: activeTab === t.id ? 700 : 400,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: activeTab === t.id ? C.green : C.muted,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ FRAUD DETECTION ══════ */}
      {activeTab === "fraud" && (
        <div>
          {/* Auto-detect banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: autoDetected > 0 ? C.lightRed : C.lightGreen,
              border: `1px solid ${autoDetected > 0 ? C.red : C.accent}`,
              borderRadius: 2,
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
                  color: autoDetected > 0 ? C.red : C.green,
                }}
              >
                {autoDetected > 0
                  ? `⚠ ${autoDetected} suspicious pattern${autoDetected > 1 ? "s" : ""} detected`
                  : "✓ No new suspicious patterns detected"}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Detection rules: velocity abuse · impossible travel · bulk
                scanning · distance anomaly · foreign origin
              </div>
            </div>
            {autoDetected > 0 && (
              <button
                onClick={handleAutoFlag}
                disabled={running}
                style={makeBtn(C.red, C.white, running)}
              >
                {running ? "Flagging…" : `🚩 Auto-Flag ${autoDetected} Scans`}
              </button>
            )}
          </div>

          {/* Detection breakdown */}
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
                          padding: "10px 16px",
                          background: cfg.bg,
                          borderRadius: 2,
                          textAlign: "center",
                          minWidth: 100,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: cfg.color,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          {reason}
                        </div>
                        <div
                          style={{
                            fontFamily: F.heading,
                            fontSize: 28,
                            color: cfg.color,
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

          {/* Flagged scan list */}
          <Section title="Scan Flags">
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
                  gap: 0,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                {[
                  { key: "flagged", label: `Flagged (${flaggedScans.length})` },
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
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      fontFamily: F.body,
                      backgroundColor: scanFilter === f.key ? C.green : C.white,
                      color: scanFilter === f.key ? C.white : C.muted,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
                {displayedScans.length} records
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
                Loading…
              </div>
            ) : displayedScans.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
                {scanFilter === "flagged"
                  ? "✓ No flagged scans"
                  : "No scans found"}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "Scan Date",
                        "Product",
                        "User",
                        "Location",
                        "Device",
                        "Flag Reason",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 10px",
                            textAlign: "left",
                            fontSize: 9,
                            color: C.muted,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            borderBottom: `2px solid ${C.border}`,
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
                            background: i % 2 === 0 ? C.white : C.cream,
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <td
                            style={{
                              padding: "9px 10px",
                              whiteSpace: "nowrap",
                              fontSize: 11,
                              color: C.muted,
                            }}
                          >
                            {fmtDate(s.scan_date)}
                          </td>
                          <td
                            style={{
                              padding: "9px 10px",
                              fontSize: 11,
                              color: C.text,
                              fontFamily: "monospace",
                            }}
                          >
                            {s.product_id?.slice(0, 8)}…
                          </td>
                          <td
                            style={{
                              padding: "9px 10px",
                              fontSize: 11,
                              color: C.muted,
                              fontFamily: "monospace",
                            }}
                          >
                            {s.user_id?.slice(0, 8) || "anon"}
                          </td>
                          <td
                            style={{
                              padding: "9px 10px",
                              fontSize: 11,
                              color: C.muted,
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
                              color: C.muted,
                            }}
                          >
                            {s.device_type || "—"}
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            {s.scan_flagged && (
                              <FlagBadge reason={s.flag_reason} />
                            )}
                            {!s.scan_flagged && det && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  background: C.lightOrange,
                                  color: C.orange,
                                  fontWeight: 700,
                                  borderRadius: 2,
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                }}
                              >
                                ⚡ {det.reason}
                              </span>
                            )}
                            {!s.scan_flagged && !det && (
                              <span style={{ fontSize: 11, color: C.accent }}>
                                ✓ Clean
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            {s.scan_flagged ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  background: C.lightRed,
                                  color: C.red,
                                  fontWeight: 700,
                                  borderRadius: 2,
                                }}
                              >
                                FLAGGED
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  background: C.lightGreen,
                                  color: C.accent,
                                  fontWeight: 700,
                                  borderRadius: 2,
                                }}
                              >
                                OK
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            <button
                              onClick={() => setFlagModal(s)}
                              style={{
                                ...makeBtn("transparent", C.mid),
                                fontSize: 9,
                                padding: "4px 8px",
                              }}
                            >
                              {s.scan_flagged ? "Edit" : "Flag"}
                            </button>
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

      {/* ══════ AUDIT LOG ══════ */}
      {activeTab === "audit" && (
        <div>
          {/* Device + Geographic breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <Section title="Device Breakdown">
              {Object.entries(deviceBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{k}</span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 5,
                          background: C.border,
                          borderRadius: 3,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(v / scans.length) * 100}%`,
                            background: C.accent,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: C.accent,
                          minWidth: 24,
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  </div>
                ))}
              {Object.keys(deviceBreakdown).length === 0 && (
                <div style={{ fontSize: 12, color: C.muted }}>No data</div>
              )}
            </Section>

            <Section title="Province Breakdown">
              {Object.entries(provinceBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{k}</span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 80,
                          height: 5,
                          background: C.border,
                          borderRadius: 3,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(v / scans.length) * 100}%`,
                            background: C.blue,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: C.blue,
                          minWidth: 24,
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  </div>
                ))}
              {Object.keys(provinceBreakdown).length === 0 && (
                <div style={{ fontSize: 12, color: C.muted }}>No data</div>
              )}
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
                          color: foreign ? C.red : C.text,
                        }}
                      >
                        {k} {foreign ? "⚠" : ""}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: foreign ? C.red : C.accent,
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  );
                })}
              {Object.keys(countryBreakdown).length === 0 && (
                <div style={{ fontSize: 12, color: C.muted }}>No data</div>
              )}
            </Section>
          </div>

          {/* Full scan log */}
          <Section
            title={`Scan Audit Log — Last ${Math.min(scans.length, 100)} Scans`}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Date",
                      "Product",
                      "Source",
                      "City",
                      "Country",
                      "Device",
                      "OS",
                      "Browser",
                      "First?",
                      "Flagged",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "7px 10px",
                          textAlign: "left",
                          fontSize: 9,
                          color: C.muted,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          borderBottom: `2px solid ${C.border}`,
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
                        background: i % 2 === 0 ? C.white : C.cream,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <td
                        style={{
                          padding: "7px 10px",
                          whiteSpace: "nowrap",
                          color: C.muted,
                        }}
                      >
                        {fmtDate(s.scan_date)}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          fontFamily: "monospace",
                          color: C.text,
                        }}
                      >
                        {s.product_id?.slice(0, 8)}…
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted }}>
                        {s.source || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted }}>
                        {s.ip_city || "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          color:
                            s.ip_country && s.ip_country !== "ZA"
                              ? C.red
                              : C.muted,
                        }}
                      >
                        {s.ip_country || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted }}>
                        {s.device_type || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted }}>
                        {s.os || "—"}
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted }}>
                        {s.browser || "—"}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        {s.is_first_scan ? (
                          <span style={{ color: C.accent, fontWeight: 700 }}>
                            ✓
                          </span>
                        ) : (
                          <span style={{ color: C.muted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        {s.scan_flagged ? (
                          <span style={{ color: C.red, fontWeight: 700 }}>
                            ⚠
                          </span>
                        ) : (
                          <span style={{ color: C.accent }}>✓</span>
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

      {/* ══════ POPIA ══════ */}
      {activeTab === "popia" && (
        <div>
          {/* Consent overview */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <Stat
              label="POPIA Consented"
              value={consentedCount}
              color={C.accent}
              sub={`of ${customers.length} customers`}
            />
            <Stat
              label="No Consent"
              value={noConsentCount}
              color={noConsentCount > 0 ? C.red : C.accent}
            />
            <Stat
              label="Marketing Opt-in"
              value={marketingOptIn}
              color={C.blue}
            />
            <Stat
              label="Analytics Opt-in"
              value={customers.filter((c) => c.analytics_opt_in).length}
              color={C.gold}
            />
            <Stat
              label="Geo Consent"
              value={customers.filter((c) => c.geolocation_consent).length}
              color={C.mid}
            />
          </div>

          {/* No consent alert */}
          {noConsentCount > 0 && (
            <div
              style={{
                padding: "12px 16px",
                background: C.lightRed,
                border: `1px solid ${C.red}`,
                borderRadius: 2,
                marginBottom: 20,
                fontSize: 13,
                color: C.red,
                fontWeight: 600,
              }}
            >
              ⚠ {noConsentCount} customer{noConsentCount > 1 ? "s" : ""} without
              POPIA consent recorded
            </div>
          )}

          {/* Customer POPIA table */}
          <Section title="Customer Consent Register">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
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
                          color: C.muted,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          borderBottom: `2px solid ${C.border}`,
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
                        background: i % 2 === 0 ? C.white : C.cream,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
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
                              color: v ? C.accent : C.red,
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
                          color: C.muted,
                        }}
                      >
                        {c.popia_date ? fmtDate(c.popia_date) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleExport(c)}
                            style={{
                              ...makeBtn(C.blue, C.white),
                              fontSize: 9,
                              padding: "4px 8px",
                            }}
                          >
                            Export
                          </button>
                          <button
                            onClick={() => setEraseModal(c)}
                            style={{
                              ...makeBtn(C.red, C.white),
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
                          color: C.muted,
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

          {/* POPIA info box */}
          <div
            style={{
              padding: 16,
              background: C.lightBlue,
              border: `1px solid ${C.blue}40`,
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.blue,
                marginBottom: 8,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              📋 POPIA Compliance Notes
            </div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
              <strong>Export:</strong> Downloads all personal data held for a
              customer as JSON (POPIA §23 — right of access).
              <br />
              <strong>Erase:</strong> Anonymises PII fields while retaining
              anonymised transaction records for audit integrity (POPIA §24 —
              right to correction/deletion).
              <br />
              <strong>Consent:</strong> POPIA consent is captured at
              registration. Marketing and analytics opt-ins are separate
              voluntary consents.
              <br />
              <strong>Retention:</strong> Scan and loyalty data without linked
              PII is retained for business analytics under legitimate interest.
            </div>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {flagModal && (
        <FlagModal
          scan={flagModal}
          onClose={() => setFlagModal(null)}
          onSave={handleSaveFlag}
        />
      )}

      {/* Erase Modal */}
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
