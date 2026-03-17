// src/components/AdminQRCodes.js v2.2
// WP-GUIDE-C: InfoTooltip injected — qr-claim-rate, qr-scan-actions, qr-hmac
// v2.1: admin-qr context wired (WP-GUIDE-A)
// v2.0: Full QR engine — 6 types, scan action stack, banner library, 3-step wizard
// Replaces: AdminQrList.js (retired) + extracts generator from AdminQrGenerator.js
//
// Tabs: QR REGISTRY | GENERATE | BANNERS
// Column note: existing DB column is `qr_type` (not `type`)

import React, { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import InfoTooltip from "./InfoTooltip";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

// ── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  brown: "#7c3a10",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  text: "#1a1a1a",
  error: "#c0392b",
  success: "#27ae60",
  warning: "#e67e22",
  lightGreen: "#eafaf1",
  lightRed: "#fdf0ef",
  lightGold: "#fef9ec",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ── QR Type definitions ──────────────────────────────────────────────────────
const QR_TYPES = [
  {
    value: "product_insert",
    icon: "📦",
    label: "Product Insert",
    batchRequired: true,
    defaultPoints: 10,
    desc: "Inside every product box",
  },
  {
    value: "packaging_exterior",
    icon: "🌐",
    label: "Exterior Packaging",
    batchRequired: false,
    defaultPoints: 0,
    desc: "Outside box / shelf label",
  },
  {
    value: "promotional",
    icon: "📣",
    label: "Promotional",
    batchRequired: false,
    defaultPoints: 10,
    desc: "Flyer, billboard, social",
  },
  {
    value: "event",
    icon: "🎪",
    label: "Event Check-in",
    batchRequired: false,
    defaultPoints: 20,
    desc: "Event QR — shared or individual",
  },
  {
    value: "wearable",
    icon: "👕",
    label: "Wearable / Merch",
    batchRequired: false,
    defaultPoints: 0,
    desc: "T-shirt, tote, merch",
  },
  {
    value: "retail_display",
    icon: "🏪",
    label: "Retail Display",
    batchRequired: false,
    defaultPoints: 0,
    desc: "In-store POS card",
  },
];

const TYPE_MAP = Object.fromEntries(QR_TYPES.map((t) => [t.value, t]));

// ── Shared style helpers ─────────────────────────────────────────────────────
const btn = (bg = C.mid, color = C.white, disabled = false) => ({
  background: disabled ? C.muted : bg,
  color,
  border: "none",
  borderRadius: 2,
  padding: "10px 20px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontFamily: FONTS.body,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.18s",
});
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  fontSize: 13,
  fontFamily: FONTS.body,
  color: C.text,
  background: C.white,
  boxSizing: "border-box",
  outline: "none",
};
const label = (mb = 8) => ({
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: C.accent,
  fontFamily: FONTS.body,
  marginBottom: mb,
  display: "block",
});
const card = (extra = {}) => ({
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  padding: 20,
  ...extra,
});

// ── HMAC signing helper ──────────────────────────────────────────────────────
async function callSignQr(productCode, batchId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/sign-qr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.REACT_APP_SUPABASE_ANON_KEY || "",
    },
    body: JSON.stringify({ product_code: productCode, batch_id: batchId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.signed_qr;
}

// Generate a simple code for non-product types
function genPromoCode(type, campaign) {
  const slug = campaign
    ? campaign
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10)
    : "promo";
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PB-${type.substring(0, 4).toUpperCase()}-${slug}-${rand}`;
}

// Fetch next product code number
async function fetchNextCode() {
  try {
    const { data } = await supabase
      .from("qr_codes")
      .select("qr_code")
      .like("qr_code", "PB-001-2026-%")
      .order("qr_code", { ascending: false })
      .limit(50);
    if (!data || !data.length) return "0001";
    let max = 0;
    for (const p of data) {
      const parts = (p.qr_code || "").split(".")[0].split("-");
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return String(max + 1).padStart(4, "0");
  } catch {
    return "0001";
  }
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL PANEL (right slide-in)
// ═══════════════════════════════════════════════════════════════════════════════
function DetailPanel({
  code,
  onClose,
  onEdit,
  onDelete,
  onTogglePause,
  domain,
}) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  const typeInfo = TYPE_MAP[code.qr_type] || {
    icon: "❓",
    label: code.qr_type,
  };
  const scanUrl = `${domain}/scan/${code.qr_code}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(scanUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPng = () => {
    const svg = document.querySelector("#dp-qr-svg svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = `protea-qr-${code.qr_code?.slice(0, 20)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const actions = Array.isArray(code.scan_actions)
    ? code.scan_actions
    : code.scan_actions
      ? JSON.parse(code.scan_actions)
      : [];

  const actionSummary = actions.map((a, i) => {
    switch (a.action) {
      case "award_points":
        return `${i + 1}. Award ${a.points} pts${a.one_time ? " (one-time)" : ` (cooldown ${a.cooldown_hrs}h)`}`;
      case "show_banner":
        return `${i + 1}. Show Banner`;
      case "show_product":
        return `${i + 1}. Show Product Info${a.show_coa ? " + COA" : ""}`;
      case "event_checkin":
        return `${i + 1}. Event Check-in: ${a.event_name || ""}`;
      case "custom_message":
        return `${i + 1}. Custom Message: "${a.headline || ""}"`;
      case "redirect":
        return `${i + 1}. Redirect → ${a.url}${a.delay_ms ? ` (${a.delay_ms}ms)` : ""}`;
      case "loyalty_signup":
        return `${i + 1}. Loyalty Sign-up`;
      default:
        return `${i + 1}. ${a.action}`;
    }
  });

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 200,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 380,
          height: "100vh",
          background: C.white,
          borderLeft: `1px solid ${C.border}`,
          overflowY: "auto",
          zIndex: 201,
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontFamily: FONTS.heading,
                color: C.green,
                fontWeight: 600,
              }}
            >
              {typeInfo.icon} {typeInfo.label}
            </div>
            {code.campaign_name && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {code.campaign_name}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: C.muted,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* QR Image */}
        <div
          id="dp-qr-svg"
          onClick={() => setShowFullscreen(true)}
          style={{
            textAlign: "center",
            cursor: "zoom-in",
            marginBottom: 16,
            padding: 16,
            background: C.cream,
            borderRadius: 2,
          }}
        >
          <QRCodeSVG
            value={scanUrl}
            size={180}
            level="H"
            includeMargin
            bgColor="#fff"
            fgColor={C.green}
          />
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              marginTop: 6,
              letterSpacing: "0.1em",
            }}
          >
            CLICK TO ENLARGE
          </div>
        </div>

        {/* Status badges */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {code.hmac_signed && (
            <span style={{ ...badgeSt(C.lightGreen, C.success) }}>
              🔒 SIGNED
            </span>
          )}
          <span
            style={{
              ...badgeSt(
                code.is_active ? C.lightGreen : "#f5f5f5",
                code.is_active ? C.success : C.muted,
              ),
            }}
          >
            {code.is_active ? "● ACTIVE" : "○ PAUSED"}
          </span>
          <span style={{ ...badgeSt(C.cream, C.blue) }}>
            {code.status || "in_stock"}
          </span>
          {code.claimed && (
            <span style={{ ...badgeSt("#f0f0ff", C.blue) }}>✓ CLAIMED</span>
          )}
        </div>

        {/* QR Code string */}
        <div style={{ marginBottom: 16 }}>
          <span style={label()}>QR Code String</span>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              wordBreak: "break-all",
              padding: "8px 10px",
              background: C.cream,
              borderRadius: 2,
              border: `1px solid ${C.border}`,
            }}
          >
            {code.qr_code}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {[
            ["Total Scans", code.scan_count || 0],
            ["Points Value", code.points_value || 0],
            [
              "Last Scan",
              code.last_scan_at ? fmtDate(code.last_scan_at) : "Never",
            ],
            [
              "Expires",
              code.expires_at ? fmtDate(code.expires_at) : "No expiry",
            ],
            ["Max Scans", code.max_scans || "Unlimited"],
            ["Cooldown", code.cooldown_hrs ? `${code.cooldown_hrs}h` : "None"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                background: C.cream,
                borderRadius: 2,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  fontFamily: FONTS.body,
                }}
              >
                {k}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.green,
                  fontFamily: FONTS.heading,
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Batch */}
        {code.batches && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              background: C.lightGreen,
              borderRadius: 2,
              border: `1px solid ${C.accent}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.mid,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Linked Batch
            </div>
            <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>
              {code.batches.product_name}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {code.batches.batch_number}
            </div>
          </div>
        )}

        {/* Scan actions */}
        {actionSummary.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span style={label()}>Scan Actions</span>
            {actionSummary.map((a, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: C.text,
                  padding: "4px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {a}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => window.open(scanUrl, "_blank")}
              style={{ ...btn(C.accent), flex: 1 }}
            >
              🔍 Test Scan
            </button>
            <button
              onClick={copyUrl}
              style={{ ...btn(copied ? C.accent : C.mid), flex: 1 }}
            >
              {copied ? "✓ Copied" : "Copy URL"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={downloadPng} style={{ ...btn(C.gold), flex: 1 }}>
              Download PNG
            </button>
            <button
              onClick={() => onTogglePause(code)}
              style={{
                ...btn(code.is_active ? C.warning : C.success),
                flex: 1,
              }}
            >
              {code.is_active ? "Pause" : "Resume"}
            </button>
          </div>
          <button onClick={() => onEdit(code)} style={btn(C.blue)}>
            ✏ Edit in Generator
          </button>
          <button onClick={() => onDelete(code)} style={btn(C.error)}>
            Delete
          </button>
        </div>
      </div>

      {/* Fullscreen QR modal */}
      {showFullscreen && (
        <div
          onClick={() => setShowFullscreen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              background: C.white,
              padding: 32,
              borderRadius: 4,
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeSVG
              value={scanUrl}
              size={512}
              level="H"
              includeMargin
              bgColor="#fff"
              fgColor={C.green}
            />
            <div
              style={{
                marginTop: 16,
                fontFamily: FONTS.heading,
                fontSize: 18,
                color: C.green,
              }}
            >
              {code.batches?.product_name ||
                code.campaign_name ||
                typeInfo.label}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: C.muted,
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              {code.qr_code}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                marginTop: 16,
              }}
            >
              <button onClick={() => window.print()} style={btn(C.green)}>
                🖨 Print
              </button>
              <button onClick={downloadPng} style={btn(C.gold)}>
                Download 512px PNG
              </button>
              <button
                onClick={() => setShowFullscreen(false)}
                style={btn(C.muted)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function badgeSt(bg, color) {
  return {
    background: bg,
    color,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    padding: "3px 8px",
    borderRadius: 20,
    fontFamily: FONTS.body,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function RegistryTab({ batches }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [signedFilter, setSignedFilter] = useState("all");
  const [selectedCode, setSelectedCode] = useState(null);
  const [collapsedTypes, setCollapsedTypes] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const domain = window.location.origin;

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("qr_codes")
      .select(`*, batches(batch_number, product_name, strain)`)
      .order("created_at", { ascending: false });
    if (!error) setCodes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Stats
  const stats = {
    total: codes.length,
    signed: codes.filter((c) => c.hmac_signed).length,
    unsigned: codes.filter((c) => !c.hmac_signed).length,
    claimed: codes.filter((c) => c.claimed).length,
    available: codes.filter((c) => !c.claimed && c.is_active).length,
    scans: codes.reduce((s, c) => s + (c.scan_count || 0), 0),
    active: codes.filter((c) => c.is_active).length,
    paused: codes.filter((c) => !c.is_active).length,
    expired: codes.filter(
      (c) => c.expires_at && new Date() > new Date(c.expires_at),
    ).length,
  };

  // Stats strip data — tooltip ids/props attached where needed
  const statItems = [
    { k: "Total", v: stats.total, col: C.green },
    {
      k: "🔒 Signed",
      v: stats.signed,
      col: C.mid,
      tooltipId: "qr-hmac",
    },
    { k: "Unsigned", v: stats.unsigned, col: C.muted },
    {
      k: "Claimed",
      v: stats.claimed,
      col: C.blue,
      tooltipId: "qr-claim-rate",
      tooltipTitle: "What is claim rate?",
      tooltipBody:
        "Claim rate is the percentage of active QR codes that have been scanned at least once by a customer. A high claim rate means your loyalty programme is being actively discovered — customers are finding and scanning their product QR codes. A low rate may mean QR codes aren't visible, customers don't know to scan them, or distribution hasn't reached end consumers yet.",
    },
    { k: "Available", v: stats.available, col: C.success },
    { k: "Total Scans", v: stats.scans, col: C.gold },
    { k: "Active", v: stats.active, col: C.accent },
    { k: "Paused", v: stats.paused, col: C.warning },
    { k: "Expired", v: stats.expired, col: C.error },
  ];

  // Filter
  const filtered = codes.filter((c) => {
    if (search) {
      const s = search.toLowerCase();
      const match =
        (c.qr_code || "").toLowerCase().includes(s) ||
        (c.campaign_name || "").toLowerCase().includes(s) ||
        (c.batches?.product_name || "").toLowerCase().includes(s) ||
        (c.batches?.batch_number || "").toLowerCase().includes(s);
      if (!match) return false;
    }
    if (typeFilter !== "all" && c.qr_type !== typeFilter) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "paused" && c.is_active) return false;
      if (statusFilter === "claimed" && !c.claimed) return false;
      if (statusFilter === "available" && (c.claimed || !c.is_active))
        return false;
      if (
        statusFilter === "expired" &&
        (!c.expires_at || new Date() <= new Date(c.expires_at))
      )
        return false;
    }
    if (signedFilter === "signed" && !c.hmac_signed) return false;
    if (signedFilter === "unsigned" && c.hmac_signed) return false;
    return true;
  });

  // Group by qr_type → batch/campaign
  const grouped = {};
  QR_TYPES.forEach((t) => {
    grouped[t.value] = {};
  });
  filtered.forEach((c) => {
    const type = c.qr_type || "product_insert";
    if (!grouped[type]) grouped[type] = {};
    const grpKey =
      c.batches?.batch_number || c.campaign_name || "— Ungrouped —";
    if (!grouped[type][grpKey]) grouped[type][grpKey] = [];
    grouped[type][grpKey].push(c);
  });

  const toggleType = (type) =>
    setCollapsedTypes((p) => ({ ...p, [type]: !p[type] }));
  const toggleGroup = (key) =>
    setCollapsedGroups((p) => ({ ...p, [key]: !p[key] }));

  const handleTogglePause = async (code) => {
    await supabase
      .from("qr_codes")
      .update({ is_active: !code.is_active })
      .eq("id", code.id);
    setCodes((prev) =>
      prev.map((c) =>
        c.id === code.id ? { ...c, is_active: !code.is_active } : c,
      ),
    );
    if (selectedCode?.id === code.id)
      setSelectedCode((p) => ({ ...p, is_active: !p.is_active }));
  };

  const handleDelete = async (code) => {
    await supabase.from("qr_codes").delete().eq("id", code.id);
    setCodes((prev) => prev.filter((c) => c.id !== code.id));
    if (selectedCode?.id === code.id) setSelectedCode(null);
    setDeleteTarget(null);
  };

  return (
    <div>
      {/* Stats strip */}
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}
      >
        {statItems.map(
          ({ k, v, col, tooltipId, tooltipTitle, tooltipBody }) => (
            <div
              key={k}
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: "10px 14px",
                minWidth: 80,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: col,
                  fontFamily: FONTS.heading,
                }}
              >
                {v}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: C.muted,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontFamily: FONTS.body,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                {k}
                {tooltipId && (
                  <InfoTooltip
                    id={tooltipId}
                    title={tooltipTitle}
                    body={tooltipBody}
                    position="top"
                  />
                )}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}
      >
        <input
          style={{ ...inputStyle, flex: "2 1 220px" }}
          placeholder="Search code, product, campaign…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {[
          [
            "typeFilter",
            typeFilter,
            setTypeFilter,
            [
              ["all", "All Types"],
              ...QR_TYPES.map((t) => [t.value, `${t.icon} ${t.label}`]),
            ],
          ],
          [
            "statusFilter",
            statusFilter,
            setStatusFilter,
            [
              ["all", "All Status"],
              ["active", "Active"],
              ["paused", "Paused"],
              ["claimed", "Claimed"],
              ["available", "Available"],
              ["expired", "Expired"],
            ],
          ],
          [
            "signedFilter",
            signedFilter,
            setSignedFilter,
            [
              ["all", "All"],
              ["signed", "🔒 Signed"],
              ["unsigned", "Unsigned"],
            ],
          ],
        ].map(([key, val, setter, opts]) => (
          <select
            key={key}
            style={{ ...inputStyle, flex: "1 1 140px", cursor: "pointer" }}
            value={val}
            onChange={(e) => setter(e.target.value)}
          >
            {opts.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        ))}
        <button onClick={fetchCodes} style={btn(C.mid)}>
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div
          style={{
            color: C.muted,
            fontFamily: FONTS.body,
            fontSize: 13,
            padding: 20,
          }}
        >
          Loading QR codes…
        </div>
      )}

      {/* Registry Tree */}
      {!loading && (
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {QR_TYPES.map((type) => {
            const grps = grouped[type.value] || {};
            const total = Object.values(grps).flat().length;
            const collapsed = collapsedTypes[type.value];

            return (
              <div
                key={type.value}
                style={{ borderBottom: `1px solid ${C.border}` }}
              >
                {/* Type header */}
                <div
                  onClick={() => toggleType(type.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    background: C.cream,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{type.icon}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: FONTS.body,
                      color: C.green,
                      flex: 1,
                    }}
                  >
                    {type.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      fontFamily: FONTS.body,
                    }}
                  >
                    ({total} code{total !== 1 ? "s" : ""})
                  </span>
                  <span style={{ color: C.muted }}>
                    {collapsed ? "▸" : "▾"}
                  </span>
                </div>

                {!collapsed &&
                  Object.entries(grps).map(([grpKey, items]) => {
                    const grpCollapsed =
                      collapsedGroups[`${type.value}::${grpKey}`];
                    return (
                      <div
                        key={grpKey}
                        style={{ borderTop: `1px solid ${C.border}` }}
                      >
                        {/* Batch/campaign sub-header */}
                        <div
                          onClick={() =>
                            toggleGroup(`${type.value}::${grpKey}`)
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "9px 16px 9px 36px",
                            background: "#f8f7f4",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.text,
                              fontFamily: FONTS.body,
                              flex: 1,
                            }}
                          >
                            {grpKey}
                          </span>
                          <span style={{ fontSize: 10, color: C.muted }}>
                            {items.length} code{items.length !== 1 ? "s" : ""}
                          </span>
                          <span style={{ color: C.muted, fontSize: 11 }}>
                            {grpCollapsed ? "▸" : "▾"}
                          </span>
                        </div>

                        {!grpCollapsed &&
                          items.map((code) => (
                            <CodeRow
                              key={code.id}
                              code={code}
                              onSelect={() => setSelectedCode(code)}
                              selected={selectedCode?.id === code.id}
                              onTogglePause={() => handleTogglePause(code)}
                              onDelete={() => setDeleteTarget(code)}
                            />
                          ))}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail panel */}
      {selectedCode && (
        <DetailPanel
          code={selectedCode}
          onClose={() => setSelectedCode(null)}
          onEdit={() => {}}
          onDelete={(code) => setDeleteTarget(code)}
          onTogglePause={handleTogglePause}
          domain={domain}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 2,
              padding: 32,
              maxWidth: 380,
              width: "90%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontFamily: FONTS.heading,
                color: C.error,
                marginBottom: 12,
              }}
            >
              Confirm Delete
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
              This will permanently delete:
            </div>
            <code
              style={{
                fontSize: 11,
                wordBreak: "break-all",
                background: C.cream,
                padding: "6px 10px",
                borderRadius: 2,
                display: "block",
                marginBottom: 20,
              }}
            >
              {deleteTarget.qr_code}
            </code>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={btn(C.muted)}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={btn(C.error)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeRow({ code, onSelect, selected, onTogglePause, onDelete }) {
  const isExpired = code.expires_at && new Date() > new Date(code.expires_at);

  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px 10px 52px",
        borderTop: `1px solid ${C.border}`,
        cursor: "pointer",
        background: selected ? "#f0faf4" : isExpired ? "#fafafa" : C.white,
        transition: "background 0.12s",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: code.is_active ? C.accent : C.muted,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: C.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {code.qr_code}
        </div>
      </div>
      {code.hmac_signed && (
        <span style={badgeSt(C.lightGreen, C.success)}>🔒</span>
      )}
      {code.claimed && <span style={badgeSt("#f0f0ff", C.blue)}>CLAIMED</span>}
      {isExpired && <span style={badgeSt(C.lightRed, C.error)}>EXPIRED</span>}
      <span
        style={{
          fontSize: 11,
          color: C.gold,
          fontWeight: 600,
          fontFamily: FONTS.body,
          minWidth: 40,
          textAlign: "right",
        }}
      >
        {code.points_value || 0}pts
      </span>
      <span
        style={{
          fontSize: 11,
          color: C.muted,
          fontFamily: FONTS.body,
          minWidth: 50,
          textAlign: "right",
        }}
      >
        {code.scan_count || 0} scans
      </span>
      <span
        style={{
          fontSize: 11,
          color: C.muted,
          fontFamily: FONTS.body,
          minWidth: 70,
          textAlign: "right",
        }}
      >
        {fmtDate(code.last_scan_at || code.distributed_at)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePause();
        }}
        style={{
          ...btn(
            code.is_active ? "#fff8ec" : C.lightGreen,
            code.is_active ? C.warning : C.success,
          ),
          padding: "4px 8px",
          fontSize: 9,
        }}
      >
        {code.is_active ? "Pause" : "Resume"}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{ ...btn("#fff0f0", C.error), padding: "4px 8px", fontSize: 9 }}
      >
        Delete
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE TAB — 3-step wizard
// ═══════════════════════════════════════════════════════════════════════════════
function GenerateTab({ batches, banners, onGenerated, initialBatchId }) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("product_insert");
  const [campaignName, setCampaignName] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || "");
  const [isBulk, setIsBulk] = useState(false);
  const [bulkQty, setBulkQty] = useState("10");

  // Action builder state
  const [doPoints, setDoPoints] = useState(true);
  const [points, setPoints] = useState("10");
  const [oneTime, setOneTime] = useState(true);
  const [cooldownHrs, setCooldownHrs] = useState("0");
  const [doBanner, setDoBanner] = useState(false);
  const [bannerId, setBannerId] = useState(banners[0]?.id || "");
  const [doProduct, setDoProduct] = useState(true);
  const [showCoa, setShowCoa] = useState(true);
  const [doCustomMsg, setDoCustomMsg] = useState(false);
  const [msgHeadline, setMsgHeadline] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgCta, setMsgCta] = useState("Shop Now");
  const [msgCtaUrl, setMsgCtaUrl] = useState("/shop");
  const [doEventCheckin, setDoEventCheckin] = useState(false);
  const [eventName, setEventName] = useState("");
  const [doRedirect, setDoRedirect] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("/shop");
  const [redirectDelay, setRedirectDelay] = useState("3000");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxScans, setMaxScans] = useState("");

  // Step 3
  const [domain, setDomain] = useState(
    window.location.origin || "http://localhost:3000",
  );
  const [productCode, setProductCode] = useState("0001");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const qrRef = useRef(null);

  useEffect(() => {
    fetchNextCode().then(setProductCode);
    if (batches.length) setSelectedBatchId(batches[0].id);
    if (banners.length) setBannerId(banners[0].id);
  }, [batches, banners]);

  useEffect(() => {
    if (initialBatchId && batches.length > 0) {
      setSelectedBatchId(initialBatchId);
      setSelectedType("product_insert");
      setStep(1);
    }
  }, [initialBatchId, batches]);

  useEffect(() => {
    const t = QR_TYPES.find((t) => t.value === selectedType);
    if (t) {
      setPoints(String(t.defaultPoints));
      setDoProduct(t.batchRequired);
      setDoEventCheckin(t.value === "event");
      setDoRedirect(
        t.value === "packaging_exterior" ||
          t.value === "wearable" ||
          t.value === "retail_display",
      );
    }
  }, [selectedType]);

  const buildActionStack = () => {
    const actions = [];
    if (doPoints)
      actions.push({
        action: "award_points",
        points: parseInt(points) || 10,
        one_time: oneTime,
        cooldown_hrs: parseInt(cooldownHrs) || 0,
      });
    if (doBanner && bannerId)
      actions.push({ action: "show_banner", banner_id: bannerId });
    if (doProduct) actions.push({ action: "show_product", show_coa: showCoa });
    if (doEventCheckin && eventName)
      actions.push({ action: "event_checkin", event_name: eventName });
    if (doCustomMsg && msgHeadline)
      actions.push({
        action: "custom_message",
        headline: msgHeadline,
        body: msgBody,
        cta: msgCta,
        cta_url: msgCtaUrl,
      });
    if (doRedirect && redirectUrl)
      actions.push({
        action: "redirect",
        url: redirectUrl,
        delay_ms: parseInt(redirectDelay) || 3000,
      });
    return actions;
  };

  const generateOne = async (codeNum, batchId) => {
    let qrCode;
    if (selectedType === "product_insert" && batchId) {
      const fullCode = `PB-001-2026-${String(codeNum).padStart(4, "0")}`;
      qrCode = await callSignQr(fullCode, batchId);
    } else {
      qrCode = genPromoCode(selectedType, campaignName);
    }
    const actions = buildActionStack();
    const pointsVal = doPoints ? parseInt(points) || 0 : 0;

    const payload = {
      qr_code: qrCode,
      qr_type: selectedType,
      batch_id: batchId || null,
      campaign_name: campaignName || null,
      scan_actions: actions,
      points_value: pointsVal,
      is_active: true,
      status: "in_stock",
      claimed: false,
      scan_count: 0,
      hmac_signed: selectedType === "product_insert",
      max_scans: maxScans ? parseInt(maxScans) : null,
      cooldown_hrs: parseInt(cooldownHrs) || 0,
      expires_at: expiresAt || null,
      source_label: "generator",
    };

    const { error } = await supabase.from("qr_codes").insert(payload);
    if (error) throw error;
    return { qrCode, url: `${domain}/scan/${qrCode}` };
  };

  const handleGenerate = async () => {
    setGenError("");
    setGenerating(true);
    setGeneratedCodes([]);
    if (
      QR_TYPES.find((t) => t.value === selectedType)?.batchRequired &&
      !selectedBatchId
    ) {
      setGenError("Please select a batch for this QR type.");
      setGenerating(false);
      return;
    }

    try {
      if (!isBulk) {
        const result = await generateOne(
          parseInt(productCode),
          selectedBatchId,
        );
        setGeneratedCodes([result]);
      } else {
        const qty = Math.min(parseInt(bulkQty) || 10, 200);
        const results = [];
        for (let i = 0; i < qty; i++) {
          const result = await generateOne(
            parseInt(productCode) + i,
            selectedBatchId,
          );
          results.push(result);
          await new Promise((r) => setTimeout(r, 80));
        }
        setGeneratedCodes(results);
        if (onGenerated) onGenerated();
      }
    } catch (err) {
      setGenError(err.message || "Generation failed. Check console.");
    } finally {
      setGenerating(false);
    }
  };

  const typeReq = QR_TYPES.find((t) => t.value === selectedType);

  // Step indicator
  const StepBar = () => (
    <div
      style={{
        display: "flex",
        gap: 0,
        marginBottom: 28,
        borderBottom: `2px solid ${C.border}`,
      }}
    >
      {[
        ["1", "Purpose"],
        ["2", "Scan Actions"],
        ["3", "Generate"],
      ].map(([n, lbl]) => (
        <button
          key={n}
          onClick={() => step >= parseInt(n) && setStep(parseInt(n))}
          style={{
            padding: "10px 20px",
            border: "none",
            background: "none",
            cursor: step >= parseInt(n) ? "pointer" : "default",
            borderBottom:
              step === parseInt(n)
                ? `2px solid ${C.mid}`
                : "2px solid transparent",
            marginBottom: -2,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color:
              step === parseInt(n)
                ? C.mid
                : step > parseInt(n)
                  ? C.accent
                  : C.muted,
            fontFamily: FONTS.body,
          }}
        >
          {n}. {lbl}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <StepBar />

      {/* STEP 1 — Purpose */}
      {step === 1 && (
        <div>
          <span style={label()}>QR Type</span>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            {QR_TYPES.map((t) => (
              <div
                key={t.value}
                onClick={() => setSelectedType(t.value)}
                style={{
                  ...card({
                    padding: "14px 16px",
                    flex: "1 1 140px",
                    cursor: "pointer",
                    minWidth: 130,
                    border: `2px solid ${selectedType === t.value ? C.accent : C.border}`,
                    background:
                      selectedType === t.value ? C.lightGreen : C.white,
                  }),
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.text,
                    fontFamily: FONTS.body,
                    marginBottom: 4,
                  }}
                >
                  {t.label}
                </div>
                <div style={{ fontSize: 10, color: C.muted }}>{t.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <span style={label()}>Campaign Name (optional)</span>
            <input
              style={inputStyle}
              placeholder="e.g. Cape Town Launch March 2026"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>

          {typeReq?.batchRequired && (
            <div style={{ marginBottom: 20 }}>
              <span style={label()}>Linked Batch</span>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                <option value="">— Select batch —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} — {b.product_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <span style={label()}>Quantity</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={() => setIsBulk(false)}
                style={btn(
                  isBulk ? "#f0f0f0" : C.green,
                  isBulk ? C.text : C.white,
                )}
              >
                Single
              </button>
              <button
                onClick={() => setIsBulk(true)}
                style={btn(
                  !isBulk ? "#f0f0f0" : C.green,
                  !isBulk ? C.text : C.white,
                )}
              >
                Bulk
              </button>
              {isBulk && (
                <input
                  style={{ ...inputStyle, width: 100 }}
                  value={bulkQty}
                  placeholder="10"
                  onChange={(e) =>
                    setBulkQty(e.target.value.replace(/\D/g, ""))
                  }
                />
              )}
              {isBulk && (
                <span style={{ fontSize: 11, color: C.muted }}>
                  codes (max 200)
                </span>
              )}
            </div>
          </div>

          <button onClick={() => setStep(2)} style={btn(C.green)}>
            Next: Scan Actions →
          </button>
        </div>
      )}

      {/* STEP 2 — Scan Actions */}
      {step === 2 && (
        <div>
          {/* Section header with scan-actions tooltip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 16,
              fontFamily: FONTS.body,
              fontSize: 12,
              fontWeight: 700,
              color: C.green,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Configure Scan Actions
            <InfoTooltip id="qr-scan-actions" position="top" />
          </div>

          <ActionToggle
            label="🎯 Award Points"
            checked={doPoints}
            onChange={setDoPoints}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              <div style={{ flex: "1 1 80px" }}>
                <span style={label(4)}>Points</span>
                <input
                  style={inputStyle}
                  value={points}
                  onChange={(e) => setPoints(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div style={{ flex: "1 1 100px" }}>
                <span style={label(4)}>Cooldown hrs</span>
                <input
                  style={inputStyle}
                  value={cooldownHrs}
                  onChange={(e) =>
                    setCooldownHrs(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <label
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    fontSize: 12,
                    color: C.text,
                    fontFamily: FONTS.body,
                    cursor: "pointer",
                    paddingBottom: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={(e) => setOneTime(e.target.checked)}
                  />
                  One-time only
                </label>
              </div>
            </div>
          </ActionToggle>

          <ActionToggle
            label="🪧 Show Banner"
            checked={doBanner}
            onChange={setDoBanner}
          >
            <select
              style={{ ...inputStyle, marginTop: 10 }}
              value={bannerId}
              onChange={(e) => setBannerId(e.target.value)}
            >
              <option value="">— Select banner —</option>
              {banners
                .filter((b) => b.is_active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </ActionToggle>

          {typeReq?.batchRequired && (
            <ActionToggle
              label="📋 Show Product Info"
              checked={doProduct}
              onChange={setDoProduct}
            >
              <label
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  marginTop: 10,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                }}
              >
                <input
                  type="checkbox"
                  checked={showCoa}
                  onChange={(e) => setShowCoa(e.target.checked)}
                />
                Include COA link
              </label>
            </ActionToggle>
          )}

          <ActionToggle
            label="🎪 Event Check-in"
            checked={doEventCheckin}
            onChange={setDoEventCheckin}
          >
            <input
              style={{ ...inputStyle, marginTop: 10 }}
              placeholder="Event name e.g. Cape Town Launch 2026"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </ActionToggle>

          <ActionToggle
            label="💬 Custom Message"
            checked={doCustomMsg}
            onChange={setDoCustomMsg}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 10,
              }}
            >
              <input
                style={inputStyle}
                placeholder="Headline"
                value={msgHeadline}
                onChange={(e) => setMsgHeadline(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Body text"
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="CTA text"
                value={msgCta}
                onChange={(e) => setMsgCta(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="CTA URL"
                value={msgCtaUrl}
                onChange={(e) => setMsgCtaUrl(e.target.value)}
              />
            </div>
          </ActionToggle>

          <ActionToggle
            label="🔗 Redirect to URL"
            checked={doRedirect}
            onChange={setDoRedirect}
          >
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                style={{ ...inputStyle, flex: 2 }}
                placeholder="/shop or https://…"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Delay ms"
                value={redirectDelay}
                onChange={(e) =>
                  setRedirectDelay(e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          </ActionToggle>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <span style={label()}>Expiry (optional)</span>
              <input
                type="datetime-local"
                style={inputStyle}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <span style={label()}>Max Scans (blank = unlimited)</span>
              <input
                style={inputStyle}
                placeholder="e.g. 1000"
                value={maxScans}
                onChange={(e) => setMaxScans(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={btn(C.muted)}>
              ← Back
            </button>
            <button onClick={() => setStep(3)} style={btn(C.green)}>
              Next: Generate →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Generate */}
      {step === 3 && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 2 }}>
              <span style={label()}>Domain</span>
              <input
                style={inputStyle}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            {selectedType === "product_insert" && (
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={label()}>
                    {isBulk ? "Start Code" : "Product Code"} (4-digit)
                  </span>
                  <InfoTooltip id="qr-hmac" position="top" />
                </div>
                <input
                  style={inputStyle}
                  value={productCode}
                  maxLength={4}
                  onChange={(e) =>
                    setProductCode(
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                />
                <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                  → PB-001-2026-{productCode.padStart(4, "0")} · HMAC signed
                </div>
              </div>
            )}
          </div>

          {/* Preview card */}
          <div style={{ ...card({ marginBottom: 20 }) }}>
            <span style={label()}>Preview — What Customer Sees</span>
            <div
              style={{
                background: C.green,
                color: C.white,
                padding: 16,
                borderRadius: 2,
                maxWidth: 280,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  color: C.accent,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                {QR_TYPES.find((t) => t.value === selectedType)?.icon}{" "}
                {QR_TYPES.find((t) => t.value === selectedType)?.label}
              </div>
              {doPoints && (
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  🎯 +{points} loyalty points
                </div>
              )}
              {doBanner && (
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                  🪧 Banner:{" "}
                  {banners.find((b) => b.id === bannerId)?.name || "—"}
                </div>
              )}
              {doProduct && (
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                  📋 Product info{showCoa ? " + COA" : ""}
                </div>
              )}
              {doEventCheckin && (
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                  🎪 Check-in: {eventName || "—"}
                </div>
              )}
              {doCustomMsg && (
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                  💬 {msgHeadline || "Custom message"}
                </div>
              )}
              {doRedirect && (
                <div style={{ fontSize: 11, opacity: 0.8 }}>
                  🔗 Redirect → {redirectUrl}{" "}
                  {redirectDelay ? `(${redirectDelay}ms)` : ""}
                </div>
              )}
            </div>
          </div>

          {genError && (
            <div
              style={{
                background: C.lightRed,
                border: `1px solid ${C.error}`,
                borderRadius: 2,
                padding: "12px 16px",
                fontSize: 13,
                color: C.error,
                marginBottom: 16,
              }}
            >
              ⚠ {genError}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button onClick={() => setStep(2)} style={btn(C.muted)}>
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={btn(C.green, C.white, generating)}
            >
              {generating
                ? `Generating${isBulk ? ` (${generatedCodes.length}/${bulkQty})` : "…"}`
                : `Generate${isBulk ? ` ${bulkQty} Codes` : " QR Code"}`}
            </button>
          </div>

          {/* Generated output */}
          {generatedCodes.length > 0 && (
            <div ref={qrRef}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.success,
                    fontFamily: FONTS.body,
                  }}
                >
                  ✓ {generatedCodes.length} code
                  {generatedCodes.length !== 1 ? "s" : ""} generated
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {generatedCodes.slice(0, 12).map((g, i) => (
                  <div
                    key={i}
                    style={{ ...card({ padding: 16, textAlign: "center" }) }}
                  >
                    <QRCodeSVG
                      value={g.url}
                      size={120}
                      level="H"
                      includeMargin
                      bgColor="#fff"
                      fgColor={C.green}
                    />
                    <div
                      style={{
                        fontSize: 9,
                        color: C.muted,
                        marginTop: 6,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                        maxWidth: 130,
                      }}
                    >
                      {g.qrCode.slice(0, 30)}
                      {g.qrCode.length > 30 ? "…" : ""}
                    </div>
                    <button
                      onClick={() => window.open(g.url, "_blank")}
                      style={{
                        ...btn(C.accent),
                        padding: "4px 10px",
                        fontSize: 9,
                        marginTop: 8,
                      }}
                    >
                      Test
                    </button>
                  </div>
                ))}
                {generatedCodes.length > 12 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      alignSelf: "center",
                    }}
                  >
                    + {generatedCodes.length - 12} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionToggle({ label: lbl, checked, onChange, children }) {
  return (
    <div
      style={{
        border: `1px solid ${checked ? C.accent : C.border}`,
        borderRadius: 2,
        padding: 14,
        marginBottom: 10,
        background: checked ? C.lightGreen : C.white,
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: FONTS.body,
          fontSize: 13,
          fontWeight: 600,
          color: C.text,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        {lbl}
      </label>
      {checked && children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BANNERS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function BannersTab({ banners, onRefresh }) {
  const [editBanner, setEditBanner] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const emptyBanner = {
    name: "",
    headline: "",
    body: "",
    cta_text: "Learn More",
    cta_link: "/shop",
    bg_color: "#1b4332",
    text_color: "#ffffff",
    image_url: "",
    is_active: true,
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...editBanner };
    delete payload.created_at;
    if (payload.id) {
      await supabase.from("qr_banners").update(payload).eq("id", payload.id);
    } else {
      await supabase.from("qr_banners").insert(payload);
    }
    setSaving(false);
    setEditBanner(null);
    setCreating(false);
    onRefresh();
  };

  const handleDelete = async (b) => {
    await supabase.from("qr_banners").delete().eq("id", b.id);
    setDeleteTarget(null);
    onRefresh();
  };

  const toggleActive = async (b) => {
    await supabase
      .from("qr_banners")
      .update({ is_active: !b.is_active })
      .eq("id", b.id);
    onRefresh();
  };

  if (editBanner || creating) {
    const eb = editBanner || emptyBanner;
    return (
      <div style={{ maxWidth: 600 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => {
              setEditBanner(null);
              setCreating(false);
            }}
            style={btn(C.muted)}
          >
            ← Back
          </button>
          <h2
            style={{
              fontFamily: FONTS.heading,
              fontSize: 20,
              color: C.green,
              margin: 0,
            }}
          >
            {editBanner ? "Edit Banner" : "New Banner"}
          </h2>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}
        >
          <div>
            {[
              ["Admin Label", "name", "text"],
              ["Headline", "headline", "text"],
              ["Body Text", "body", "text"],
              ["CTA Button Text", "cta_text", "text"],
              ["CTA Link", "cta_link", "text"],
              ["Image URL (optional)", "image_url", "text"],
            ].map(([lbl, field]) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <span style={label(4)}>{lbl}</span>
                <input
                  style={inputStyle}
                  value={eb[field] || ""}
                  onChange={(e) =>
                    setEditBanner((p) => ({
                      ...(p || emptyBanner),
                      [field]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div>
                <span style={label(4)}>Background Colour</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={eb.bg_color || "#1b4332"}
                    onChange={(e) =>
                      setEditBanner((p) => ({
                        ...(p || emptyBanner),
                        bg_color: e.target.value,
                      }))
                    }
                    style={{
                      width: 40,
                      height: 36,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={eb.bg_color || ""}
                    onChange={(e) =>
                      setEditBanner((p) => ({
                        ...(p || emptyBanner),
                        bg_color: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <span style={label(4)}>Text Colour</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={eb.text_color || "#ffffff"}
                    onChange={(e) =>
                      setEditBanner((p) => ({
                        ...(p || emptyBanner),
                        text_color: e.target.value,
                      }))
                    }
                    style={{
                      width: 40,
                      height: 36,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={eb.text_color || ""}
                    onChange={(e) =>
                      setEditBanner((p) => ({
                        ...(p || emptyBanner),
                        text_color: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={btn(C.green, C.white, saving)}
            >
              {saving ? "Saving…" : "Save Banner"}
            </button>
          </div>

          {/* Live preview */}
          <div>
            <span style={label()}>Live Preview</span>
            <BannerPreview banner={editBanner || emptyBanner} />
          </div>
        </div>
      </div>
    );
  }

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
        <h2
          style={{
            fontFamily: FONTS.heading,
            fontSize: 20,
            color: C.green,
            margin: 0,
          }}
        >
          Banner Library
        </h2>
        <button
          onClick={() => {
            setCreating(true);
            setEditBanner({ ...emptyBanner });
          }}
          style={btn(C.green)}
        >
          + New Banner
        </button>
      </div>

      {banners.length === 0 && (
        <div
          style={{
            color: C.muted,
            fontFamily: FONTS.body,
            fontSize: 13,
            padding: 40,
            textAlign: "center",
            border: `1px solid ${C.border}`,
            borderRadius: 2,
          }}
        >
          No banners yet. Create your first banner above, or run the migration
          SQL to seed 2 starters.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {banners.map((b) => (
          <div
            key={b.id}
            style={{
              ...card({ padding: 0, overflow: "hidden" }),
              display: "flex",
            }}
          >
            <div style={{ flex: 1 }}>
              <BannerPreview banner={b} compact />
            </div>
            <div
              style={{
                width: 220,
                padding: 16,
                borderLeft: `1px solid ${C.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: C.text,
                  fontFamily: FONTS.body,
                }}
              >
                {b.name}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: b.is_active ? C.success : C.muted,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: b.is_active ? C.success : C.muted,
                  }}
                >
                  {b.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <button
                onClick={() => setEditBanner({ ...b })}
                style={btn(C.blue)}
              >
                Edit
              </button>
              <button
                onClick={() => toggleActive(b)}
                style={btn(b.is_active ? C.warning : C.success)}
              >
                {b.is_active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => setDeleteTarget(b)} style={btn(C.error)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 2,
              padding: 28,
              maxWidth: 360,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontFamily: FONTS.heading,
                color: C.error,
                marginBottom: 10,
              }}
            >
              Delete Banner?
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
              "{deleteTarget.name}" will be permanently deleted.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={btn(C.muted)}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={btn(C.error)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BannerPreview({ banner, compact = false }) {
  if (!banner) return null;
  return (
    <div
      style={{
        background: banner.bg_color || "#1b4332",
        color: banner.text_color || "#fff",
        padding: compact ? "16px 20px" : "24px 28px",
        minHeight: compact ? 80 : 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {banner.headline && (
        <div
          style={{
            fontFamily: FONTS.heading,
            fontSize: compact ? 16 : 20,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {banner.headline}
        </div>
      )}
      {banner.body && (
        <div
          style={{
            fontSize: compact ? 11 : 13,
            opacity: 0.85,
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          {banner.body}
        </div>
      )}
      {banner.cta_text && (
        <div
          style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.2)",
            padding: "6px 14px",
            borderRadius: 2,
            fontSize: compact ? 10 : 12,
            fontWeight: 600,
            letterSpacing: "0.1em",
            alignSelf: "flex-start",
          }}
        >
          {banner.cta_text} →
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT v2.2 — WP-GUIDE-C: InfoTooltip injected
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminQRCodes() {
  const [tab, setTab] = useState("registry");
  const [batches, setBatches] = useState([]);
  const [banners, setBanners] = useState([]);
  const ctx = usePageContext("admin-qr", null);

  const fetchBatches = useCallback(async () => {
    const { data } = await supabase
      .from("batches")
      .select("id, batch_number, product_name, strain")
      .order("batch_number", { ascending: false });
    setBatches(data || []);
  }, []);

  const fetchBanners = useCallback(async () => {
    const { data } = await supabase
      .from("qr_banners")
      .select("*")
      .order("created_at", { ascending: false });
    setBanners(data || []);
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchBanners();
  }, [fetchBatches, fetchBanners]);

  const TABS = [
    { key: "registry", label: "QR Registry" },
    { key: "generate", label: "Generate" },
    { key: "banners", label: "🪧 Banners" },
  ];

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <WorkflowGuide
        context={ctx}
        tabId="admin-qr"
        onAction={() => {}}
        defaultOpen={true}
      />
      <div
        style={{
          fontFamily: FONTS.heading,
          fontSize: 26,
          fontWeight: 400,
          color: C.green,
          marginBottom: 4,
        }}
      >
        QR Engine v2.0
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
        6 QR types · Scan action stack · Banner library · HMAC-signed product
        codes
      </div>

      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 32,
          borderBottom: `2px solid ${C.border}`,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom:
                tab === t.key ? `2px solid ${C.mid}` : "2px solid transparent",
              marginBottom: -2,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: tab === t.key ? C.mid : C.muted,
              fontFamily: FONTS.body,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "registry" && <RegistryTab batches={batches} />}
      {tab === "generate" && (
        <GenerateTab
          batches={batches}
          banners={banners}
          onGenerated={() => {
            setTab("registry");
          }}
        />
      )}
      {tab === "banners" && (
        <BannersTab banners={banners} onRefresh={fetchBanners} />
      )}
    </div>
  );
}
