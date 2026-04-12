// src/components/AdminQRCodes.js v2.4
// WP-VIZ: Donut (codes by type) + Grouped Bar (scans vs claims) + HBar (claim rate) added
// WP-VISUAL: T tokens, Inter font, flush stat grid, underline tabs, no Cormorant/Jost
// WP-GUIDE-C: InfoTooltip injected — qr-claim-rate, qr-scan-actions, qr-hmac
// v2.2 — InfoTooltip injected
// v2.1 — admin-qr context wired
// v2.0 — Full QR engine: 6 types, scan action stack, banner library, 3-step wizard

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../services/supabaseClient";
import WorkflowGuide from "./WorkflowGuide";
import { usePageContext } from "../hooks/usePageContext";
import InfoTooltip from "./InfoTooltip";
import { ChartCard, ChartTooltip } from "./viz";
import { useTenant } from "../services/tenantService";
import { T } from "../styles/tokens";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)
// Legacy aliases
const C = {
  green: T.accent,
  mid: T.accentMid,
  accent: "#52b788",
  gold: "#b5935a",
  blue: T.info,
  brown: "#7c3a10",
  cream: T.surface,
  warm: T.bg,
  border: T.border,
  muted: T.ink500,
  white: "#fff",
  text: T.ink700,
  error: T.danger,
  success: T.success,
  warning: T.warning,
  lightGreen: T.accentLight,
  lightRed: T.dangerLight,
  lightGold: T.warningLight,
};
const FONTS = { heading: T.font, body: T.font };

// ─── QR TYPE DEFINITIONS ─────────────────────────────────────────────────────
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

// ─── STYLE HELPERS ────────────────────────────────────────────────────────────
const mkBtn = (bg = T.accentMid, color = "#fff", disabled = false) => ({
  background: disabled ? T.ink300 : bg,
  color,
  border: bg === "transparent" ? `1px solid ${T.border}` : "none",
  borderRadius: 4,
  padding: "9px 18px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  fontFamily: T.font,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
  transition: "opacity 0.15s",
});
const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  color: T.ink700,
  background: "#fff",
  boxSizing: "border-box",
  outline: "none",
};
const sectionLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink500,
  fontFamily: T.font,
  marginBottom: 8,
  display: "block",
};
const cardBase = (extra = {}) => ({
  background: "#fff",
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: 20,
  boxShadow: T.shadow.sm,
  ...extra,
});

// ─── HMAC + CODE HELPERS ─────────────────────────────────────────────────────
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
  return (await res.json()).signed_qr;
}
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
async function fetchNextCode() {
  try {
    const { count } = await supabase
      .from("qr_codes")
      .select("id", { count: "exact", head: true });
    return String((count || 0) + 1).padStart(4, "0");
  } catch {
    return String(Math.floor(Math.random() * 9000) + 1000);
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

// ─── BADGE HELPER ─────────────────────────────────────────────────────────────
function Badge({ children, bg, color, border }) {
  return (
    <span
      style={{
        background: bg,
        color,
        border: `1px solid ${border || color + "40"}`,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: 20,
        fontFamily: T.font,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL PANEL
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
        return `${i + 1}. Award ${a.points} pts${a.one_time ? " (one-time)" : `(cooldown ${a.cooldown_hrs}h)`}`;
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
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 380,
          height: "100vh",
          background: "#fff",
          borderLeft: `1px solid ${T.border}`,
          overflowY: "auto",
          zIndex: 201,
          padding: 24,
          boxSizing: "border-box",
          fontFamily: T.font,
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
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink900 }}>
              {typeInfo.icon} {typeInfo.label}
            </div>
            {code.campaign_name && (
              <div style={{ fontSize: 12, color: T.ink500, marginTop: 2 }}>
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
              color: T.ink500,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* QR image */}
        <div
          id="dp-qr-svg"
          onClick={() => setShowFullscreen(true)}
          style={{
            textAlign: "center",
            cursor: "zoom-in",
            marginBottom: 16,
            padding: 16,
            background: T.bg,
            borderRadius: 8,
          }}
        >
          <QRCodeSVG
            value={scanUrl}
            size={180}
            level="H"
            includeMargin
            bgColor="#fff"
            fgColor={T.accent}
          />
          <div
            style={{
              fontSize: 10,
              color: T.ink500,
              marginTop: 6,
              letterSpacing: "0.08em",
              fontFamily: T.font,
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
            <Badge bg={T.successLight} color={T.success} border={T.successBd}>
              SIGNED
            </Badge>
          )}
          <Badge
            bg={code.is_active ? T.successLight : T.bg}
            color={code.is_active ? T.success : T.ink500}
          >
            {code.is_active ? "ACTIVE" : "PAUSED"}
          </Badge>
          <Badge bg={T.infoLight} color={T.info} border={T.infoBd}>
            {code.status || "in_stock"}
          </Badge>
          {code.claimed && (
            <Badge bg={T.infoLight} color={T.info} border={T.infoBd}>
              CLAIMED
            </Badge>
          )}
        </div>

        {/* QR string */}
        <div style={{ marginBottom: 16 }}>
          <span style={sectionLabel}>QR Code String</span>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              wordBreak: "break-all",
              padding: "8px 10px",
              background: T.bg,
              borderRadius: 4,
              border: `1px solid ${T.border}`,
            }}
          >
            {code.qr_code}
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1px",
            background: T.border,
            borderRadius: 6,
            overflow: "hidden",
            border: `1px solid ${T.border}`,
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
            <div key={k} style={{ background: "#fff", padding: "10px 12px" }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                {k}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.accent,
                  fontFamily: T.font,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Linked batch */}
        {code.batches && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              background: T.accentLight,
              borderRadius: 6,
              border: `1px solid ${T.accentBd}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: T.accentMid,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: T.font,
              }}
            >
              Linked Batch
            </div>
            <div style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>
              {code.batches.product_name}
            </div>
            <div style={{ fontSize: 11, color: T.ink500 }}>
              {code.batches.batch_number}
            </div>
          </div>
        )}

        {/* Action stack */}
        {actionSummary.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Scan Actions</span>
            {actionSummary.map((a, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: T.ink700,
                  padding: "5px 0",
                  borderBottom: `1px solid ${T.bg}`,
                  fontFamily: T.font,
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
              style={{ ...mkBtn(T.accentMid), flex: 1 }}
            >
              Test Scan
            </button>
            <button
              onClick={copyUrl}
              style={{ ...mkBtn(copied ? T.success : T.info), flex: 1 }}
            >
              {copied ? "Copied!" : "Copy URL"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={downloadPng}
              style={{ ...mkBtn("#b5935a"), flex: 1 }}
            >
              Download PNG
            </button>
            <button
              onClick={() => onTogglePause(code)}
              style={{
                ...mkBtn(code.is_active ? T.warning : T.success),
                flex: 1,
              }}
            >
              {code.is_active ? "Pause" : "Resume"}
            </button>
          </div>
          <button onClick={() => onEdit(code)} style={mkBtn(T.info)}>
            Edit in Generator
          </button>
          <button onClick={() => onDelete(code)} style={mkBtn(T.danger)}>
            Delete
          </button>
        </div>
      </div>

      {/* Fullscreen modal */}
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
              background: "#fff",
              padding: 32,
              borderRadius: 8,
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
              fgColor={T.accent}
            />
            <div
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: 600,
                color: T.accent,
                fontFamily: T.font,
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
                color: T.ink500,
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
              <button onClick={() => window.print()} style={mkBtn(T.accent)}>
                Print
              </button>
              <button onClick={downloadPng} style={mkBtn("#b5935a")}>
                Download 512px PNG
              </button>
              <button
                onClick={() => setShowFullscreen(false)}
                style={mkBtn("transparent", T.ink500)}
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

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function RegistryTab({ batches, tenantId }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanLogsTotal, setScanLogsTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [signedFilter, setSignedFilter] = useState("all");
  const [selectedCode, setSelectedCode] = useState(null);
  const [collapsedTypes, setCollapsedTypes] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const domain = window.location.origin;

  // GAP-02: write a system_alert (non-blocking, fire-and-forget)
  const writeAlert = useCallback(
    async (alertType, severity, title, body) => {
      try {
        await supabase.from("system_alerts").insert({
          tenant_id: tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3",
          alert_type: alertType,
          severity,
          status: "open",
          title,
          body: body || null,
          source_table: "qr_codes",
        });
      } catch (_) {}
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [tenantId],
  );

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    const tid = tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3";
    const { data, error } = await supabase
      .from("qr_codes")
      .select("*, batches(batch_number, product_name, strain)")
      // Show codes for this tenant + legacy codes with no tenant assigned
      // Use or() filter: tenant_id = tid OR tenant_id IS NULL
      .or(`tenant_id.eq.${tid},tenant_id.is.null`)
      .order("created_at", { ascending: false });
    const { count: scanLogsCount } = await supabase
      .from("scan_logs")
      .select("id", { count: "exact", head: true });
    if (!error) {
      const fetched = data || [];
      setCodes(fetched);
      setScanLogsTotal(scanLogsCount || 0);
      // GAP-02: alert when active unclaimed pool is critically low
      const poolAvailable = fetched.filter(
        (c) => c.is_active && !c.claimed,
      ).length;
      if (poolAvailable < 10) {
        writeAlert(
          "qr_pool_low",
          poolAvailable === 0 ? "critical" : "warning",
          `QR pool ${poolAvailable === 0 ? "exhausted" : "running low"} — ${poolAvailable} active unclaimed code${poolAvailable !== 1 ? "s" : ""} remaining`,
          "Generate new QR codes in the Generate tab to replenish the pool.",
        );
      }
    }
    setLoading(false);
  }, [writeAlert]);
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const stats = {
    total: codes.length,
    signed: codes.filter((c) => c.hmac_signed).length,
    unsigned: codes.filter((c) => !c.hmac_signed).length,
    claimed: codes.filter((c) => c.claimed).length,
    available: codes.filter((c) => !c.claimed && c.is_active).length,
    scans: scanLogsTotal,
    active: codes.filter((c) => c.is_active).length,
    paused: codes.filter((c) => !c.is_active).length,
    expired: codes.filter(
      (c) => c.expires_at && new Date() > new Date(c.expires_at),
    ).length,
  };

  const claimRate =
    stats.total > 0 ? ((stats.claimed / stats.total) * 100).toFixed(1) : "0.0";

  const filtered = codes.filter((c) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !(
          (c.qr_code || "").toLowerCase().includes(s) ||
          (c.campaign_name || "").toLowerCase().includes(s) ||
          (c.batches?.product_name || "").toLowerCase().includes(s) ||
          (c.batches?.batch_number || "").toLowerCase().includes(s)
        )
      )
        return false;
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

  const grouped = {};
  QR_TYPES.forEach((t) => {
    grouped[t.value] = {};
  });
  filtered.forEach((c) => {
    const type = c.qr_type || "product_insert";
    if (!grouped[type]) grouped[type] = {};
    const key = c.batches?.batch_number || c.campaign_name || "— Ungrouped —";
    if (!grouped[type][key]) grouped[type][key] = [];
    grouped[type][key].push(c);
  });

  const toggleType = (t) => setCollapsedTypes((p) => ({ ...p, [t]: !p[t] }));
  const toggleGroup = (key) =>
    setCollapsedGroups((p) => ({ ...p, [key]: !p[key] }));

  const handleTogglePause = async (code) => {
    await supabase
      .from("qr_codes")
      .update({ is_active: !code.is_active })
      .eq("id", code.id);
    setCodes((p) =>
      p.map((c) =>
        c.id === code.id ? { ...c, is_active: !code.is_active } : c,
      ),
    );
    if (selectedCode?.id === code.id)
      setSelectedCode((p) => ({ ...p, is_active: !p.is_active }));
  };
  const handleDelete = async (code) => {
    await supabase.from("qr_codes").delete().eq("id", code.id);
    setCodes((p) => p.filter((c) => c.id !== code.id));
    if (selectedCode?.id === code.id) setSelectedCode(null);
    setDeleteTarget(null);
  };

  return (
    <div>
      {/* ── FLUSH STAT GRID ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))",
          gap: "1px",
          background: T.border,
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total", value: stats.total, color: T.accent },
          {
            label: "Signed",
            value: stats.signed,
            color: T.accentMid,
            tooltipId: "qr-hmac",
          },
          { label: "Unsigned", value: stats.unsigned, color: T.ink500 },
          {
            label: "Claimed",
            value: stats.claimed,
            color: T.info,
            tooltipId: "qr-claim-rate",
          },
          {
            label: "Claim Rate",
            value: `${claimRate}%`,
            color: parseFloat(claimRate) >= 50 ? T.success : T.warning,
          },
          { label: "Available", value: stats.available, color: T.success },
          { label: "Total Scans", value: stats.scans, color: "#b5935a" },
          { label: "Active", value: stats.active, color: T.accentMid },
          { label: "Paused", value: stats.paused, color: T.warning },
          {
            label: "Expired",
            value: stats.expired,
            color: stats.expired > 0 ? T.danger : T.ink500,
          },
        ].map(({ label: lbl, value, color, tooltipId }) => (
          <div
            key={lbl}
            style={{
              background: "#fff",
              padding: "12px 14px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 400,
                color,
                fontFamily: T.font,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 9,
                color: T.ink500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: T.font,
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
            >
              {lbl}
              {tooltipId && <InfoTooltip id={tooltipId} position="top" />}
            </div>
          </div>
        ))}
      </div>

      {/* ── WP-VIZ CHARTS ── */}
      {!loading &&
        codes.length > 0 &&
        (() => {
          // Chart data derived from loaded codes
          const typeData = QR_TYPES.map((t) => {
            const items = codes.filter((c) => c.qr_type === t.value);
            return {
              name: t.label,
              icon: t.icon,
              count: items.length,
              scans: items.reduce((s, c) => s + (c.scan_count || 0), 0),
              claimed: items.filter((c) => c.claimed).length,
              points: items.reduce((s, c) => s + (c.points_value || 0), 0),
            };
          }).filter((d) => d.count > 0);

          const DONUT_COLORS = [
            T.accent,
            T.accentMid,
            T.info,
            "#b5935a",
            T.warning,
            T.danger,
          ];

          const claimBarData = typeData
            .map((d) => ({
              name: d.icon,
              rate:
                d.count > 0
                  ? parseFloat(((d.claimed / d.count) * 100).toFixed(1))
                  : 0,
              label: d.name,
            }))
            .sort((a, b) => b.rate - a.rate);

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Donut — codes by type */}
              <ChartCard title="QR Codes by Type" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {typeData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${v} codes`} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Grouped bar — scans vs claims by type */}
              <ChartCard title="Scans vs Claims by Type" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={typeData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.border}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="icon"
                      tick={{
                        fill: T.ink500,
                        fontSize: 12,
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
                      dataKey="scans"
                      name="Scans"
                      fill={T.accent}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                      maxBarSize={20}
                    />
                    <Bar
                      dataKey="claimed"
                      name="Claimed"
                      fill={T.info}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                      maxBarSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Horizontal bar — claim rate by type */}
              <ChartCard title="Claim Rate % by Type" height={200}>
                <div
                  style={{
                    padding: "8px 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    height: "100%",
                    justifyContent: "center",
                  }}
                >
                  {claimBarData.map((d, i) => (
                    <div
                      key={d.name}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ fontSize: 14, width: 20, flexShrink: 0 }}>
                        {d.name}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 16,
                          background: T.bg,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(d.rate, 100)}%`,
                            background:
                              d.rate >= 50
                                ? T.success
                                : d.rate >= 25
                                  ? T.accentMid
                                  : T.warning,
                            borderRadius: 3,
                            transition: "width 0.5s",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 4,
                          }}
                        >
                          {d.rate >= 15 && (
                            <span
                              style={{
                                fontSize: 9,
                                color: "#fff",
                                fontWeight: 700,
                                fontFamily: T.font,
                              }}
                            >
                              {d.rate}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          fontFamily: T.font,
                          minWidth: 32,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {d.rate < 15 ? `${d.rate}%` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          );
        })()}

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
            (v) => setTypeFilter(v),
            [
              ["all", "All Types"],
              ...QR_TYPES.map((t) => [t.value, `${t.icon} ${t.label}`]),
            ],
          ],
          [
            "statusFilter",
            statusFilter,
            (v) => setStatusFilter(v),
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
            (v) => setSignedFilter(v),
            [
              ["all", "All"],
              ["signed", "Signed"],
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
        <button onClick={fetchCodes} style={mkBtn(T.accentMid)}>
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div
          style={{
            color: T.ink500,
            fontFamily: T.font,
            fontSize: 13,
            padding: 20,
          }}
        >
          Loading QR codes…
        </div>
      )}

      {/* Registry tree */}
      {!loading && (
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 8,
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
                style={{ borderBottom: `1px solid ${T.border}` }}
              >
                {/* Type header */}
                <div
                  onClick={() => toggleType(type.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    background: T.bg,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{type.icon}</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      fontFamily: T.font,
                      color: T.accent,
                      flex: 1,
                    }}
                  >
                    {type.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    ({total} code{total !== 1 ? "s" : ""})
                  </span>
                  <span style={{ color: T.ink500 }}>
                    {collapsed ? "▸" : "▾"}
                  </span>
                </div>

                {!collapsed &&
                  Object.entries(grps).map(([grpKey, items]) => {
                    const grpCollapsed =
                      collapsedGroups[`${type.value}::${grpKey}`];
                    const claimedCount = items.filter((c) => c.claimed).length;
                    const scanTotal = items.reduce(
                      (s, c) => s + (c.scan_count || 0),
                      0,
                    );
                    return (
                      <div
                        key={grpKey}
                        style={{ borderTop: `1px solid ${T.border}` }}
                      >
                        <div
                          onClick={() =>
                            toggleGroup(`${type.value}::${grpKey}`)
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "9px 16px 9px 36px",
                            background: "#f8f8f8",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: T.ink700,
                              fontFamily: T.font,
                              flex: 1,
                            }}
                          >
                            {grpKey}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: T.ink500,
                              fontFamily: T.font,
                            }}
                          >
                            {items.length} codes · {claimedCount} claimed ·{" "}
                            {scanTotal} scans
                          </span>
                          <span style={{ color: T.ink500, fontSize: 11 }}>
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

      {selectedCode && (
        <DetailPanel
          code={selectedCode}
          onClose={() => setSelectedCode(null)}
          onEdit={() => {}}
          onDelete={(c) => setDeleteTarget(c)}
          onTogglePause={handleTogglePause}
          domain={domain}
        />
      )}

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
              background: "#fff",
              borderRadius: 8,
              padding: 32,
              maxWidth: 380,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontFamily: T.font,
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
              Confirm Delete
            </div>
            <div style={{ fontSize: 13, color: T.ink500, marginBottom: 8 }}>
              This will permanently delete:
            </div>
            <code
              style={{
                fontSize: 11,
                wordBreak: "break-all",
                background: T.bg,
                padding: "6px 10px",
                borderRadius: 4,
                display: "block",
                marginBottom: 20,
              }}
            >
              {deleteTarget.qr_code}
            </code>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={mkBtn("transparent", T.ink500)}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={mkBtn(T.danger)}
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
        borderTop: `1px solid ${T.border}`,
        cursor: "pointer",
        background: selected ? T.accentLight : isExpired ? "#fafafa" : "#fff",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = T.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = selected
          ? T.accentLight
          : isExpired
            ? "#fafafa"
            : "#fff";
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: code.is_active ? T.accentMid : T.ink300,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            color: T.ink700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {code.qr_code}
        </div>
      </div>
      {code.hmac_signed && (
        <Badge bg={T.successLight} color={T.success} border={T.successBd}>
          SIGNED
        </Badge>
      )}
      {code.claimed && (
        <Badge bg={T.infoLight} color={T.info} border={T.infoBd}>
          CLAIMED
        </Badge>
      )}
      {isExpired && (
        <Badge bg={T.dangerLight} color={T.danger} border={T.dangerBd}>
          EXPIRED
        </Badge>
      )}
      <span
        style={{
          fontSize: 11,
          color: "#b5935a",
          fontWeight: 600,
          fontFamily: T.font,
          minWidth: 50,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {code.points_value || 0}pts
      </span>
      <span
        style={{
          fontSize: 11,
          color: T.ink500,
          fontFamily: T.font,
          minWidth: 55,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {code.scan_count || 0} scans
      </span>
      <span
        style={{
          fontSize: 11,
          color: T.ink500,
          fontFamily: T.font,
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
          ...mkBtn(
            code.is_active ? T.warningLight : T.successLight,
            code.is_active ? T.warning : T.success,
          ),
          border: `1px solid ${code.is_active ? T.warningBd : T.successBd}`,
          padding: "3px 8px",
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
        style={{
          ...mkBtn(T.dangerLight, T.danger),
          border: `1px solid ${T.dangerBd}`,
          padding: "3px 8px",
          fontSize: 9,
        }}
      >
        Delete
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE TAB — 3-step wizard
// ═══════════════════════════════════════════════════════════════════════════════
function GenerateTab({
  batches,
  banners,
  onGenerated,
  initialBatchId,
  tenantId,
}) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("retail_display");
  const [campaignName, setCampaignName] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || "");
  // Inventory item link (dispensary model — no batches needed)
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemSearch, setShowItemSearch] = useState(false);
  const selectedInventoryItem = inventoryItems.find(
    (i) => i.id === selectedItemId,
  );
  const [isBulk, setIsBulk] = useState(false);
  const [bulkQty, setBulkQty] = useState("10");
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
  const [maxScans, setMaxScans] = useState("1");
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

  // Fetch inventory items for dispensary-model linking
  useEffect(() => {
    const tid = tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3";
    supabase
      .from("inventory_items")
      .select("id,name,sku,category,sell_price,brand,quantity_on_hand")
      .eq("tenant_id", tid)
      .eq("is_active", true)
      .gt("sell_price", 0)
      .order("category")
      .order("name")
      .limit(300)
      .then(({ data }) => setInventoryItems(data || []));
  }, [tenantId]);

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
        ["packaging_exterior", "wearable", "retail_display"].includes(t.value),
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
      inventory_item_id: selectedItemId || null,
      tenant_id: tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3",
      campaign_name: campaignName || selectedInventoryItem?.name || null,
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
      setGenError("Select a batch for this QR type.");
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
          results.push(
            await generateOne(parseInt(productCode) + i, selectedBatchId),
          );
          await new Promise((r) => setTimeout(r, 80));
        }
        setGeneratedCodes(results);
        if (onGenerated) onGenerated();
      }
    } catch (err) {
      setGenError(err.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const typeReq = QR_TYPES.find((t) => t.value === selectedType);

  // Step indicator — underline style
  const StepBar = () => (
    <div
      style={{
        display: "flex",
        gap: 0,
        marginBottom: 28,
        borderBottom: `2px solid ${T.border}`,
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
                ? `2px solid ${T.accent}`
                : "2px solid transparent",
            marginBottom: -2,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:
              step === parseInt(n)
                ? T.accent
                : step > parseInt(n)
                  ? T.accentMid
                  : T.ink500,
            fontFamily: T.font,
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

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <span style={sectionLabel}>QR Type</span>
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
                  ...cardBase({
                    padding: "14px 16px",
                    flex: "1 1 140px",
                    cursor: "pointer",
                    minWidth: 130,
                    border: `2px solid ${selectedType === t.value ? T.accentBd : T.border}`,
                    background: selectedType === t.value ? T.accentLight : "#fff",
                    borderRadius: 8,
                  }),
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.ink700,
                    fontFamily: T.font,
                    marginBottom: 4,
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{ fontSize: 10, color: T.ink500, fontFamily: T.font }}
                >
                  {t.desc}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>
              Link to Inventory Item{" "}
              <span
                style={{ fontSize: 9, color: T.accentMid, fontWeight: 500 }}
              >
                (dispensary — optional)
              </span>
            </span>
            {selectedInventoryItem ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: T.accentLight,
                  border: `1px solid ${T.accentBd}`,
                  borderRadius: 7,
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {CAT_ICON[selectedInventoryItem.category] || "🌿"}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 12, fontWeight: 600, color: T.accent }}
                  >
                    {selectedInventoryItem.name}
                  </div>
                  <div style={{ fontSize: 10, color: T.accentMid }}>
                    {CAT_LABEL[selectedInventoryItem.category] ||
                      selectedInventoryItem.category}{" "}
                    · {selectedInventoryItem.sku} · R
                    {parseFloat(selectedInventoryItem.sell_price).toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedItemId("");
                    setItemSearch("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: T.ink500,
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 32 }}
                  placeholder="Search products to link… (type name or SKU)"
                  value={itemSearch}
                  onFocus={() => setShowItemSearch(true)}
                  onBlur={() => setTimeout(() => setShowItemSearch(false), 180)}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemSearch(true);
                  }}
                />
                {showItemSearch && itemSearch.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: `1px solid ${T.border}`,
                      borderRadius: 6,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      zIndex: 50,
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {inventoryItems
                      .filter(
                        (i) =>
                          i.name
                            .toLowerCase()
                            .includes(itemSearch.toLowerCase()) ||
                          (i.sku || "")
                            .toLowerCase()
                            .includes(itemSearch.toLowerCase()),
                      )
                      .slice(0, 12)
                      .map((i) => (
                        <div
                          key={i.id}
                          onMouseDown={() => {
                            setSelectedItemId(i.id);
                            setItemSearch("");
                            setShowItemSearch(false);
                            if (!campaignName) setCampaignName(i.name);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: `1px solid ${T.bg}`,
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.background = T.accentLight)
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span style={{ fontSize: 14 }}>
                            {CAT_ICON[i.category] || "🌿"}
                          </span>
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: T.ink900,
                              }}
                            >
                              {i.name}
                            </div>
                            <div style={{ fontSize: 10, color: T.ink500 }}>
                              {CAT_LABEL[i.category] || i.category} · {i.sku} ·
                              R{parseFloat(i.sell_price).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    {inventoryItems.filter(
                      (i) =>
                        i.name
                          .toLowerCase()
                          .includes(itemSearch.toLowerCase()) ||
                        (i.sku || "")
                          .toLowerCase()
                          .includes(itemSearch.toLowerCase()),
                    ).length === 0 && (
                      <div
                        style={{
                          padding: "12px",
                          fontSize: 11,
                          color: T.ink500,
                          textAlign: "center",
                        }}
                      >
                        No items found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={sectionLabel}>Campaign Name (optional)</span>
            <input
              style={inputStyle}
              placeholder="e.g. Cape Town Launch March 2026"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
          </div>
          {typeReq?.batchRequired && (
            <div style={{ marginBottom: 16 }}>
              <span style={sectionLabel}>Linked Batch</span>
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
            <span style={sectionLabel}>Quantity</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={() => setIsBulk(false)}
                style={mkBtn(
                  isBulk ? T.bg : T.accent,
                  isBulk ? T.ink700 : "#fff",
                )}
              >
                Single
              </button>
              <button
                onClick={() => setIsBulk(true)}
                style={mkBtn(
                  !isBulk ? T.bg : T.accent,
                  !isBulk ? T.ink700 : "#fff",
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
                <span
                  style={{ fontSize: 11, color: T.ink500, fontFamily: T.font }}
                >
                  codes (max 200)
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setStep(2)} style={mkBtn(T.accent)}>
            Next: Scan Actions →
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 16,
            }}
          >
            <span style={{ ...sectionLabel, marginBottom: 0 }}>
              Configure Scan Actions
            </span>
            <InfoTooltip id="qr-scan-actions" position="top" />
          </div>

          <ActionToggle
            label="Award Points"
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
                <span style={sectionLabel}>Points</span>
                <input
                  style={inputStyle}
                  value={points}
                  onChange={(e) => setPoints(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div style={{ flex: "1 1 100px" }}>
                <span style={sectionLabel}>Cooldown hrs</span>
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
                    color: T.ink700,
                    fontFamily: T.font,
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
            label="Show Banner"
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
              label="Show Product Info"
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
                  fontFamily: T.font,
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
            label="Event Check-in"
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
            label="Custom Message"
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
            label="Redirect to URL"
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
              <span style={sectionLabel}>Expiry (optional)</span>
              <input
                type="datetime-local"
                style={inputStyle}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <span style={sectionLabel}>Max Scans (blank = unlimited)</span>
              <input
                style={inputStyle}
                placeholder="e.g. 1000"
                value={maxScans}
                onChange={(e) => setMaxScans(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStep(1)}
              style={mkBtn("transparent", T.ink500)}
            >
              ← Back
            </button>
            <button onClick={() => setStep(3)} style={mkBtn(T.accent)}>
              Next: Generate →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 2 }}>
              <span style={sectionLabel}>Domain</span>
              <input
                style={inputStyle}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            {selectedType === "product_insert" && (
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={sectionLabel}>
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
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink500,
                    marginTop: 4,
                    fontFamily: T.font,
                  }}
                >
                  → PB-001-2026-{productCode.padStart(4, "0")} · HMAC signed
                </div>
              </div>
            )}
          </div>

          {/* Preview card */}
          <div style={{ ...cardBase({ marginBottom: 20 }) }}>
            <span style={sectionLabel}>Preview — What Customer Sees</span>
            <div
              style={{
                background: T.accent,
                color: "#fff",
                padding: 16,
                borderRadius: 8,
                maxWidth: 280,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: T.accentBd,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  fontFamily: T.font,
                }}
              >
                {QR_TYPES.find((t) => t.value === selectedType)?.icon}{" "}
                {QR_TYPES.find((t) => t.value === selectedType)?.label}
              </div>
              {doPoints && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 4,
                    fontFamily: T.font,
                  }}
                >
                  +{points} loyalty points
                </div>
              )}
              {doBanner && (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginBottom: 4,
                    fontFamily: T.font,
                  }}
                >
                  Banner: {banners.find((b) => b.id === bannerId)?.name || "—"}
                </div>
              )}
              {doProduct && (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginBottom: 4,
                    fontFamily: T.font,
                  }}
                >
                  Product info{showCoa ? " + COA" : ""}
                </div>
              )}
              {doEventCheckin && (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginBottom: 4,
                    fontFamily: T.font,
                  }}
                >
                  Check-in: {eventName || "—"}
                </div>
              )}
              {doCustomMsg && (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginBottom: 4,
                    fontFamily: T.font,
                  }}
                >
                  {msgHeadline || "Custom message"}
                </div>
              )}
              {doRedirect && (
                <div style={{ fontSize: 11, opacity: 0.8, fontFamily: T.font }}>
                  Redirect → {redirectUrl}{" "}
                  {redirectDelay ? `(${redirectDelay}ms)` : ""}
                </div>
              )}
            </div>
          </div>

          {genError && (
            <div
              style={{
                background: T.dangerLight,
                border: `1px solid ${T.dangerBd}`,
                borderRadius: 6,
                padding: "12px 16px",
                fontSize: 13,
                color: T.danger,
                marginBottom: 16,
                fontFamily: T.font,
              }}
            >
              {genError}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button
              onClick={() => setStep(2)}
              style={mkBtn("transparent", T.ink500)}
            >
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={mkBtn(T.accent, "#fff", generating)}
            >
              {generating
                ? `Generating${isBulk ? ` (${generatedCodes.length}/${bulkQty})` : "…"}`
                : `Generate${isBulk ? ` ${bulkQty} Codes` : " QR Code"}`}
            </button>
          </div>

          {generatedCodes.length > 0 && (
            <div ref={qrRef}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.success,
                    fontFamily: T.font,
                  }}
                >
                  {generatedCodes.length} code
                  {generatedCodes.length !== 1 ? "s" : ""} generated
                </span>
              </div>
              {/* Generated QR grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
                  gap: 12,
                }}
              >
                {generatedCodes.slice(0, 12).map((g, i) => (
                  <div
                    key={i}
                    style={{
                      ...cardBase({ padding: 16, textAlign: "center" }),
                    }}
                  >
                    <QRCodeSVG
                      value={g.url}
                      size={120}
                      level="H"
                      includeMargin
                      bgColor="#fff"
                      fgColor={T.accent}
                    />
                    <div
                      style={{
                        fontSize: 9,
                        color: T.ink500,
                        marginTop: 6,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                        maxWidth: 140,
                      }}
                    >
                      {g.qrCode.slice(0, 30)}
                      {g.qrCode.length > 30 ? "…" : ""}
                    </div>
                    <button
                      onClick={() => window.open(g.url, "_blank")}
                      style={{
                        ...mkBtn(T.accentMid),
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
                      color: T.ink500,
                      alignSelf: "center",
                      fontFamily: T.font,
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
        border: `1px solid ${checked ? T.accentBd : T.border}`,
        borderRadius: 6,
        padding: 14,
        marginBottom: 10,
        background: checked ? T.accentLight : "#fff",
        transition: "all 0.15s",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: T.font,
          fontSize: 13,
          fontWeight: 600,
          color: T.ink700,
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
    bg_color: T.accent,
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
    const fld = (lbl, field) => (
      <div key={field} style={{ marginBottom: 14 }}>
        <span style={sectionLabel}>{lbl}</span>
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
    );
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
            style={mkBtn("transparent", T.ink500)}
          >
            ← Back
          </button>
          <h2
            style={{
              fontFamily: T.font,
              fontSize: 18,
              fontWeight: 600,
              color: T.ink900,
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
            {fld("Admin Label", "name")}
            {fld("Headline", "headline")}
            {fld("Body Text", "body")}
            {fld("CTA Button Text", "cta_text")}
            {fld("CTA Link", "cta_link")}
            {fld("Image URL (optional)", "image_url")}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              {[
                ["Background Colour", "bg_color", "#1b4332"],
                ["Text Colour", "text_color", "#ffffff"],
              ].map(([lbl, field, def]) => (
                <div key={field}>
                  <span style={sectionLabel}>{lbl}</span>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="color"
                      value={eb[field] || def}
                      onChange={(e) =>
                        setEditBanner((p) => ({
                          ...(p || emptyBanner),
                          [field]: e.target.value,
                        }))
                      }
                      style={{
                        width: 40,
                        height: 34,
                        border: `1px solid ${T.border}`,
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    />
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={eb[field] || ""}
                      onChange={(e) =>
                        setEditBanner((p) => ({
                          ...(p || emptyBanner),
                          [field]: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={mkBtn(T.accent, "#fff", saving)}
            >
              {saving ? "Saving…" : "Save Banner"}
            </button>
          </div>
          <div>
            <span style={sectionLabel}>Live Preview</span>
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
            fontFamily: T.font,
            fontSize: 18,
            fontWeight: 600,
            color: T.ink900,
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
          style={mkBtn(T.accent)}
        >
          + New Banner
        </button>
      </div>
      {banners.length === 0 && (
        <div
          style={{
            color: T.ink500,
            fontFamily: T.font,
            fontSize: 13,
            padding: 40,
            textAlign: "center",
            border: `1px dashed ${T.border}`,
            borderRadius: 8,
          }}
        >
          No banners yet. Create your first banner above.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {banners.map((b) => (
          <div
            key={b.id}
            style={{
              ...cardBase({ padding: 0, overflow: "hidden" }),
              display: "flex",
            }}
          >
            <div style={{ flex: 1 }}>
              <BannerPreview banner={b} compact />
            </div>
            <div
              style={{
                width: 200,
                padding: 16,
                borderLeft: `1px solid ${T.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.ink900,
                  fontFamily: T.font,
                }}
              >
                {b.name}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: b.is_active ? T.success : T.ink300,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: b.is_active ? T.success : T.ink500,
                    fontFamily: T.font,
                  }}
                >
                  {b.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <button
                onClick={() => setEditBanner({ ...b })}
                style={mkBtn(T.info)}
              >
                Edit
              </button>
              <button
                onClick={() => toggleActive(b)}
                style={mkBtn(b.is_active ? T.warning : T.success)}
              >
                {b.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => setDeleteTarget(b)}
                style={mkBtn(T.danger)}
              >
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
              background: "#fff",
              borderRadius: 8,
              padding: 28,
              maxWidth: 360,
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: T.danger,
                marginBottom: 10,
              }}
            >
              Delete Banner?
            </div>
            <div style={{ fontSize: 13, color: T.ink500, marginBottom: 20 }}>
              "{deleteTarget.name}" will be permanently deleted.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={mkBtn("transparent", T.ink500)}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={mkBtn(T.danger)}
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
        background: banner.bg_color || T.accent,
        color: banner.text_color || "#fff",
        padding: compact ? "14px 18px" : "24px 28px",
        minHeight: compact ? 80 : 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        fontFamily: T.font,
      }}
    >
      {banner.headline && (
        <div
          style={{
            fontSize: compact ? 15 : 20,
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
            background: "rgba(255,255,255,0.18)",
            padding: "5px 14px",
            borderRadius: 4,
            fontSize: compact ? 10 : 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
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
// PRINT SHEET TAB — smart multi-product label designer + print engine
// ═══════════════════════════════════════════════════════════════════════════════
const PRINT_LAYOUTS = [
  {
    key: "shelf_3x3",
    label: "Shelf Labels",
    icon: "🏷",
    desc: "9 per A4 — category · name · price · QR",
    cols: 3,
    rows: 3,
  },
  {
    key: "insert_1",
    label: "Product Insert",
    icon: "📦",
    desc: "1 per A4 — full info, brand, COA link",
    cols: 1,
    rows: 1,
  },
  {
    key: "promo_4x2",
    label: "Promo Strip",
    icon: "🎯",
    desc: "8 per A4 — campaign name, points, QR",
    cols: 4,
    rows: 2,
  },
  {
    key: "batch_sheet",
    label: "Delivery Batch",
    icon: "📋",
    desc: "All codes for one delivery on one sheet",
    cols: 3,
    rows: 4,
  },
];

const CAT_ICON = {
  flower: "🌸",
  concentrate: "💎",
  edible: "🍬",
  accessory: "🔧",
  finished_product: "🌿",
  hardware: "⚙️",
  raw_material: "🧪",
}; // valid DB enums only
const CAT_LABEL = {
  flower: "Flower",
  concentrate: "Concentrate",
  edible: "Edible",
  accessory: "Accessory",
  finished_product: "Finished Product",
  hardware: "Hardware",
  raw_material: "Raw Material",
}; // valid DB enums only

function PrintTab({ tenantId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [layout, setLayout] = useState("shelf_3x3");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [printItems, setPrintItems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showOnlyNoQr, setShowOnlyNoQr] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, qrRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select(
            "id,name,sku,category,sell_price,brand,quantity_on_hand,description",
          )
          .eq("tenant_id", tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3")
          .eq("is_active", true)
          .gt("sell_price", 0)
          .order("category")
          .order("name"),
        supabase
          .from("qr_codes")
          .select("inventory_item_id,qr_code,is_active,scan_count")
          .eq("tenant_id", tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3")
          .not("inventory_item_id", "is", null),
      ]);
      const qrMap = {};
      (qrRes.data || []).forEach((q) => {
        if (!qrMap[q.inventory_item_id]) qrMap[q.inventory_item_id] = [];
        qrMap[q.inventory_item_id].push(q);
      });
      setItems(
        (invRes.data || []).map((i) => ({ ...i, qrCodes: qrMap[i.id] || [] })),
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const filtered = items.filter((i) => {
    if (catFilter !== "all" && i.category !== catFilter) return false;
    if (showOnlyNoQr && i.qrCodes.length > 0) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const toggle = (id) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () => {
    if (filtered.every((i) => selected.has(i.id))) setSelected(new Set());
    else setSelected(new Set(filtered.map((i) => i.id)));
  };
  const selectedItems = items.filter((i) => selected.has(i.id));

  const handleGenerate = async () => {
    if (!selectedItems.length) return;
    setGenerating(true);
    const domain = window.location.origin;
    const out = [];
    for (const item of selectedItems) {
      let qrCode = item.qrCodes.find((q) => q.is_active)?.qr_code;
      if (!qrCode) {
        const prefix = tenantId?.slice(0, 2)?.toUpperCase() || "MR";
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        qrCode = `${prefix}-${item.sku || rand}-${Date.now().toString(36).toUpperCase()}`;
        await supabase.from("qr_codes").insert({
          qr_code: qrCode,
          qr_type: "retail_display",
          inventory_item_id: item.id,
          tenant_id: tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3",
          campaign_name: item.name,
          is_active: true,
          status: "in_stock",
          claimed: false,
          scan_count: 0,
          scan_actions: JSON.stringify([
            { action: "award_points", points: 10, one_time: false },
          ]),
          points_value: 10,
          hmac_signed: false,
          source_label: "print_sheet",
        });
      }
      out.push({ ...item, qrCode, scanUrl: `${domain}/scan/${qrCode}` });
    }
    setPrintItems(out);
    setShowPreview(true);
    setGenerating(false);
    fetchItems();
  };

  const lyt = PRINT_LAYOUTS.find((l) => l.key === layout) || PRINT_LAYOUTS[0];
  const perPage = lyt.cols * lyt.rows;

  const triggerPrint = () => {
    const printWin = window.open("", "_blank");
    const gridCols =
      layout === "insert_1"
        ? 1
        : layout === "promo_4x2"
          ? 4
          : layout === "batch_sheet"
            ? 3
            : 3;
    const qrSize =
      layout === "insert_1" ? 180 : layout === "promo_4x2" ? 72 : 88;
    const minH =
      layout === "insert_1"
        ? "260px"
        : layout === "promo_4x2"
          ? "120px"
          : "150px";
    const gap = layout === "insert_1" ? "0" : "6px";

    const pages = [];
    for (let p = 0; p < printItems.length; p += perPage) {
      const chunk = printItems.slice(p, p + perPage);
      pages.push(
        chunk
          .map((item) => {
            const svgEl = document.querySelector(`#print-qr-${item.id}`);
            const svgStr = svgEl
              ? new XMLSerializer().serializeToString(svgEl)
              : "";
            const descHtml =
              layout === "insert_1" && item.description
                ? `<div class="desc">${item.description.slice(0, 160)}</div>`
                : "";
            const brandHtml = item.brand
              ? `<div class="brand">${item.brand}</div>`
              : "";
            return `<div class="card">
          <div class="cat">${(item.category || "").replace(/_/g, " ").toUpperCase()}</div>
          ${brandHtml}
          <div class="qr">${svgStr.replace(/width="[^"]*"/, `width="${qrSize}"`).replace(/height="[^"]*"/, `height="${qrSize}"`)}</div>
          <div class="name">${item.name}</div>
          <div class="price">R${parseFloat(item.sell_price).toFixed(2)}</div>
          ${descHtml}
          <div class="scan-hint">Scan to earn points</div>
          <div class="url">${item.scanUrl}</div>
        </div>`;
          })
          .join(""),
      );
    }

    printWin.document
      .write(`<!DOCTYPE html><html><head><title>QR Labels — ${lyt.label}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}
  @page{size:A4 portrait;margin:10mm}
  body{background:#fff}
  .page{
    display:grid;
    grid-template-columns:repeat(${gridCols},1fr);
    gap:${gap};
    page-break-after:always;
    align-items:start;
  }
  .page:last-child{page-break-after:auto}
  .card{
    border:1px solid #d0d0c8;
    border-radius:6px;
    padding:8px 6px;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:3px;
    background:#fff;
    min-height:${minH};
    overflow:hidden;
  }
  .cat{font-size:7px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2D6A4F;margin-bottom:1px}
  .brand{font-size:8px;font-weight:600;color:#52b788;letter-spacing:.06em;text-transform:uppercase}
  .qr{margin:3px 0;line-height:0}
  .qr svg{display:block}
  .name{font-size:${gridCols === 1 ? "13px" : gridCols === 4 ? "8px" : "10px"};font-weight:600;text-align:center;color:#111;line-height:1.3;max-width:100%}
  .price{font-size:${gridCols === 1 ? "18px" : gridCols === 4 ? "11px" : "13px"};font-weight:700;color:#1A3D2B}
  .desc{font-size:8px;color:#555;text-align:center;line-height:1.4;margin-top:2px}
  .scan-hint{font-size:7px;color:#aaa;margin-top:auto;padding-top:3px}
  .url{font-size:6px;color:#bbb;word-break:break-all;text-align:center}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{page-break-after:always}
    .page:last-child{page-break-after:auto}
  }
</style></head><body>${pages.map((p) => `<div class="page">${p}</div>`).join("")}</body></html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 800);
  };

  const sCard = {
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    overflow: "hidden",
    fontFamily: T.font,
  };
  const sBtnSm = (bg = T.accent, col = "#fff") => ({
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: 600,
    background: bg,
    color: col,
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
    fontFamily: T.font,
    letterSpacing: "0.04em",
  });

  return (
    <div
      style={{ display: "flex", gap: 20, fontFamily: T.font, minHeight: 600 }}
    >
      {/* LEFT — item selector */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{
              flex: 1,
              minWidth: 160,
              padding: "7px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontFamily: T.font,
            }}
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontSize: 12,
              fontFamily: T.font,
            }}
          >
            <option value="all">All categories</option>
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: T.ink500,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showOnlyNoQr}
              onChange={(e) => setShowOnlyNoQr(e.target.checked)}
            />
            No QR yet
          </label>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 11, color: T.ink500 }}>
            {filtered.length} products · {selected.size} selected
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={toggleAll} style={sBtnSm(T.border, T.ink700)}>
              {filtered.every((i) => selected.has(i.id))
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>
        </div>
        <div style={{ ...sCard, maxHeight: 520, overflowY: "auto" }}>
          {loading ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: T.ink300,
                fontSize: 12,
              }}
            >
              Loading inventory…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: T.ink300,
                fontSize: 12,
              }}
            >
              No products match
            </div>
          ) : (
            filtered.map((item) => {
              const sel = selected.has(item.id);
              const hasQr = item.qrCodes.length > 0;
              const activeQr = item.qrCodes.find((q) => q.is_active);
              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderBottom: `1px solid ${T.bg}`,
                    cursor: "pointer",
                    background: sel ? T.accentLight : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: `2px solid ${sel ? T.accent : T.ink300}`,
                      borderRadius: 4,
                      background: sel ? T.accent : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {sel && (
                      <span
                        style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 16, flexShrink: 0 }}>
                    {CAT_ICON[item.category] || "🌿"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: sel ? 600 : 400,
                        color: T.ink900,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 10, color: T.ink500 }}>
                      {CAT_LABEL[item.category] || item.category} · {item.sku}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.accent,
                      fontFamily: "monospace",
                      flexShrink: 0,
                    }}
                  >
                    R{parseFloat(item.sell_price).toFixed(0)}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {hasQr ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 8,
                          background: activeQr ? T.successLight : T.warningLight,
                          color: activeQr ? T.success : T.warning,
                        }}
                      >
                        {activeQr ? `${item.qrCodes.length} QR` : "PAUSED"}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 8,
                          background: T.bg,
                          color: T.ink500,
                        }}
                      >
                        NO QR
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT — layout picker + preview + actions */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Layout picker */}
        <div style={sCard}>
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${T.border}`,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.ink500,
            }}
          >
            Print layout
          </div>
          {PRINT_LAYOUTS.map((l) => (
            <div
              key={l.key}
              onClick={() => setLayout(l.key)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderBottom: `1px solid ${T.bg}`,
                cursor: "pointer",
                background: layout === l.key ? T.accentLight : "transparent",
              }}
            >
              <div style={{ fontSize: 18, flexShrink: 0 }}>{l.icon}</div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: layout === l.key ? 600 : 400,
                    color: layout === l.key ? T.accent : T.ink700,
                  }}
                >
                  {l.label}
                </div>
                <div style={{ fontSize: 10, color: T.ink500, lineHeight: 1.4 }}>
                  {l.desc}
                </div>
              </div>
              {layout === l.key && (
                <div
                  style={{ marginLeft: "auto", fontSize: 14, color: T.accent }}
                >
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ ...sCard, padding: 14 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              ["Selected", selected.size],
              ["Per page", lyt.cols * lyt.rows],
              [
                "New QR to generate",
                selectedItems.filter((i) => !i.qrCodes.find((q) => q.is_active))
                  .length,
              ],
              [
                "Existing QR reused",
                selectedItems.filter((i) => i.qrCodes.find((q) => q.is_active))
                  .length,
              ],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  background: T.surface,
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 300,
                    color: T.accent,
                    lineHeight: 1,
                  }}
                >
                  {v}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: T.ink500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginTop: 3,
                  }}
                >
                  {k}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleGenerate}
            disabled={!selected.size || generating}
            style={{
              ...sBtnSm(
                selected.size ? T.accent : T.border,
                selected.size ? "#fff" : T.ink500,
              ),
              padding: "12px 16px",
              fontSize: 13,
              borderRadius: 8,
            }}
          >
            {generating
              ? "Generating QR codes…"
              : `Generate & Preview (${selected.size})`}
          </button>
          {/* Hidden full-resolution QRs for print — all items, off-screen */}
          {showPreview && printItems.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: -9999,
                top: -9999,
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              {printItems.map((item) => (
                <div key={`fullqr-${item.id}`} id={`print-qr-${item.id}`}>
                  <QRCodeSVG
                    value={item.scanUrl}
                    size={200}
                    level="H"
                    bgColor="#fff"
                    fgColor={T.accent}
                  />
                </div>
              ))}
            </div>
          )}
          {showPreview && printItems.length > 0 && (
            <button
              onClick={triggerPrint}
              style={{
                ...sBtnSm("#b5935a"),
                padding: "12px 16px",
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              🖨 Print / Save as PDF
            </button>
          )}
          {showPreview && (
            <button
              onClick={() => setShowPreview(false)}
              style={{
                ...sBtnSm(T.surface, T.ink500),
                padding: "10px 16px",
                fontSize: 11,
                borderRadius: 8,
              }}
            >
              ← Back to selector
            </button>
          )}
        </div>

        {/* Live preview */}
        {showPreview && printItems.length > 0 && (
          <div style={{ ...sCard, overflow: "hidden" }}>
            <div
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${T.border}`,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.ink500,
              }}
            >
              Preview — {lyt.label}
            </div>
            <div
              style={{
                padding: 10,
                background: T.surface,
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(lyt.cols, 3)},1fr)`,
                gap: 6,
              }}
            >
              {printItems
                .slice(0, lyt.cols * Math.min(lyt.rows, 2))
                .map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#fff",
                      border: `1px solid ${T.border}`,
                      borderRadius: 6,
                      padding: "8px 6px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: T.accentMid,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {CAT_LABEL[item.category] || item.category}
                    </div>
                    <div id={`print-qr-${item.id}`}>
                      <QRCodeSVG
                        value={item.scanUrl}
                        size={52}
                        level="H"
                        bgColor="#fff"
                        fgColor={T.accent}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        textAlign: "center",
                        color: T.ink900,
                        lineHeight: 1.3,
                        maxWidth: 72,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{ fontSize: 11, fontWeight: 700, color: T.accent }}
                    >
                      R{parseFloat(item.sell_price).toFixed(0)}
                    </div>
                  </div>
                ))}
              {printItems.length > lyt.cols * 2 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: T.ink500,
                    fontStyle: "italic",
                  }}
                >
                  +{printItems.length - lyt.cols * 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY & SETTINGS TAB — surfaces ALL hidden QR system functionality
// ═══════════════════════════════════════════════════════════════════════════════
function SecurityTab({ tenantId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [resolving, setResolving] = useState(null);

  const DEFAULT_SETTINGS = {
    velocity_window_seconds: 60,
    velocity_scan_threshold: 3,
    velocity_anomaly_increment: 20,
    max_anomaly_score: 100,
    fraud_flag_threshold: 70,
    pool_low_threshold: 10,
    pool_critical_threshold: 0,
    default_max_scans: null,
    default_cooldown_hrs: 0,
    default_points: 10,
    default_one_time: true,
    gps_prompt_enabled: true,
    gps_prompt_delay_ms: 2500,
    tier_upgrade_whatsapp: true,
    tier_upgrade_message: true,
    streak_bonus_enabled: true,
    pts_streak_bonus: 200,
    streak_interval: 5,
    mult_cat_flower: 2.0,
    mult_cat_vape: 1.75,
    mult_cat_edible: 1.5,
    mult_cat_seeds: 3.0,
    mult_cat_accessories: 0.75,
    mult_cat_wellness: 1.5,
    mult_cat_merch: 2.0,
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, alertRes, usersRes] = await Promise.all([
        supabase
          .from("qr_security_settings")
          .select("*")
          .eq("tenant_id", tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3")
          .single(),
        supabase
          .from("system_alerts")
          .select("*")
          .in("alert_type", [
            "velocity_flag",
            "scan_abuse",
            "suspended_scan",
            "qr_pool_low",
          ])
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("user_profiles")
          .select(
            "id,full_name,email,anomaly_score,is_suspended,loyalty_points,last_active_at",
          )
          .gt("anomaly_score", 0)
          .order("anomaly_score", { ascending: false })
          .limit(10),
      ]);
      setSettings(cfgRes.data || DEFAULT_SETTINGS);
      setAlerts(alertRes.data || []);
      setFlaggedUsers(usersRes.data || []);
    } catch (_) {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("qr_security_settings")
        .select("id")
        .eq("tenant_id", tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3")
        .single();
      if (existing?.id) {
        await supabase
          .from("qr_security_settings")
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("qr_security_settings")
          .insert({
            ...settings,
            tenant_id: tenantId || "43b34c33-6864-4f02-98dd-df1d340475c3",
          });
      }
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  const toggleSuspend = async (user) => {
    setResolving(user.id);
    await supabase
      .from("user_profiles")
      .update({
        is_suspended: !user.is_suspended,
        anomaly_score: user.is_suspended ? 0 : user.anomaly_score,
      })
      .eq("id", user.id);
    fetchAll();
    setResolving(null);
  };

  const resetScore = async (user) => {
    setResolving(user.id);
    await supabase
      .from("user_profiles")
      .update({ anomaly_score: 0 })
      .eq("id", user.id);
    fetchAll();
    setResolving(null);
  };

  const resolveAlert = async (alert) => {
    await supabase
      .from("system_alerts")
      .update({ status: "resolved" })
      .eq("id", alert.id);
    setAlerts((p) => p.filter((a) => a.id !== alert.id));
  };

  const upd = (k, v) => setSettings((p) => ({ ...p, [k]: v }));

  if (loading)
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: T.ink300,
          fontSize: 12,
        }}
      >
        Loading security settings…
      </div>
    );

  const sSec = {
    background: "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    marginBottom: 20,
    overflow: "hidden",
    fontFamily: T.font,
  };
  const sSecH = {
    padding: "12px 16px",
    borderBottom: `1px solid ${T.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };
  const sSecHT = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: T.ink700,
  };
  const sRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: `1px solid ${T.bg}`,
  };
  const sLabel = { fontSize: 12, color: T.ink700, fontWeight: 500 };
  const sSub = { fontSize: 10, color: T.ink500, marginTop: 2 };
  const sNum = {
    width: 72,
    padding: "5px 8px",
    border: `1px solid ${T.border}`,
    borderRadius: 5,
    fontSize: 12,
    fontFamily: "monospace",
    textAlign: "right",
  };
  const sToggle = (on) => ({
    width: 36,
    height: 20,
    borderRadius: 10,
    background: on ? T.accent : T.border,
    position: "relative",
    cursor: "pointer",
    transition: "background 0.2s",
    border: "none",
    flexShrink: 0,
  });
  const sDot = (on) => ({
    position: "absolute",
    top: 3,
    left: on ? 17 : 3,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#fff",
    transition: "left 0.2s",
  });

  const Toggle = ({ val, onChange }) => (
    <button onClick={() => onChange(!val)} style={sToggle(val)}>
      <div style={sDot(val)} />
    </button>
  );

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* LEFT COLUMN */}
        <div>
          {/* Fraud detection */}
          <div style={sSec}>
            <div style={sSecH}>
              <span style={sSecHT}>🛡 Fraud & Velocity Detection</span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 8,
                  background: T.dangerLight,
                  color: T.danger,
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Velocity window</div>
                <div style={sSub}>
                  Scan count is measured within this window
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={settings.velocity_window_seconds}
                  onChange={(e) =>
                    upd("velocity_window_seconds", +e.target.value)
                  }
                  style={sNum}
                />
                <span style={{ fontSize: 10, color: T.ink500 }}>seconds</span>
              </div>
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Rapid scan threshold</div>
                <div style={sSub}>Scans within window before anomaly flags</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={settings.velocity_scan_threshold}
                  onChange={(e) =>
                    upd("velocity_scan_threshold", +e.target.value)
                  }
                  style={sNum}
                />
                <span style={{ fontSize: 10, color: T.ink500 }}>scans</span>
              </div>
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Anomaly score increment</div>
                <div style={sSub}>
                  Added to user score per velocity flag (max 100)
                </div>
              </div>
              <input
                type="number"
                value={settings.velocity_anomaly_increment}
                onChange={(e) =>
                  upd("velocity_anomaly_increment", +e.target.value)
                }
                style={sNum}
              />
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Flag threshold</div>
                <div style={sSub}>
                  Score at which user appears in fraud dashboard
                </div>
              </div>
              <input
                type="number"
                value={settings.fraud_flag_threshold}
                onChange={(e) => upd("fraud_flag_threshold", +e.target.value)}
                style={sNum}
              />
            </div>
            <div style={sRow}>
              <div>
                <div style={sLabel}>Pool low alert</div>
                <div style={sSub}>
                  Alert fires when unclaimed codes drop below
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={settings.pool_low_threshold}
                  onChange={(e) => upd("pool_low_threshold", +e.target.value)}
                  style={sNum}
                />
                <span style={{ fontSize: 10, color: T.ink500 }}>codes</span>
              </div>
            </div>
          </div>

          {/* Streak & Notifications */}
          <div style={sSec}>
            <div style={sSecH}>
              <span style={sSecHT}>🔥 Streak Bonus</span>
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Streak bonus enabled</div>
                <div style={sSub}>
                  Award bonus points for weekly scan streaks
                </div>
              </div>
              <Toggle
                val={settings.streak_bonus_enabled}
                onChange={(v) => upd("streak_bonus_enabled", v)}
              />
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Streak interval</div>
                <div style={sSub}>Scans per week to trigger bonus</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={settings.streak_interval}
                  onChange={(e) => upd("streak_interval", +e.target.value)}
                  style={sNum}
                />
                <span style={{ fontSize: 10, color: T.ink500 }}>scans</span>
              </div>
            </div>
            <div style={sRow}>
              <div>
                <div style={sLabel}>Streak bonus points</div>
                <div style={sSub}>Points awarded on streak trigger</div>
              </div>
              <input
                type="number"
                value={settings.pts_streak_bonus}
                onChange={(e) => upd("pts_streak_bonus", +e.target.value)}
                style={sNum}
              />
            </div>
          </div>

          {/* Notifications */}
          <div style={sSec}>
            <div style={sSecH}>
              <span style={sSecHT}>📲 Automated Notifications</span>
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>WhatsApp on tier upgrade</div>
                <div style={sSub}>
                  Fires send-notification EF when tier changes
                </div>
              </div>
              <Toggle
                val={settings.tier_upgrade_whatsapp}
                onChange={(v) => upd("tier_upgrade_whatsapp", v)}
              />
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>In-app tier upgrade message</div>
                <div style={sSub}>
                  Writes to customer_messages on tier change
                </div>
              </div>
              <Toggle
                val={settings.tier_upgrade_message}
                onChange={(v) => upd("tier_upgrade_message", v)}
              />
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>GPS location prompt</div>
                <div style={sSub}>Ask mobile users for GPS 2.5s after scan</div>
              </div>
              <Toggle
                val={settings.gps_prompt_enabled}
                onChange={(v) => upd("gps_prompt_enabled", v)}
              />
            </div>
            <div style={sRow}>
              <div>
                <div style={sLabel}>GPS prompt delay</div>
                <div style={sSub}>
                  Milliseconds after scan before GPS prompt
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={settings.gps_prompt_delay_ms}
                  onChange={(e) => upd("gps_prompt_delay_ms", +e.target.value)}
                  style={sNum}
                />
                <span style={{ fontSize: 10, color: T.ink500 }}>ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Category multipliers */}
          <div style={sSec}>
            <div style={sSecH}>
              <span style={sSecHT}>✨ Category Point Multipliers</span>
              <span style={{ fontSize: 9, color: T.ink500 }}>
                Applied silently at scan time
              </span>
            </div>
            {[
              ["flower", "🌸 Flower", "mult_cat_flower"],
              ["vape", "💨 Vape", "mult_cat_vape"],
              ["edible", "🍬 Edible", "mult_cat_edible"],
              ["seeds_clones", "🌱 Seeds / Clones", "mult_cat_seeds"],
              ["accessories", "🔧 Accessories", "mult_cat_accessories"],
              ["wellness", "💊 Wellness", "mult_cat_wellness"],
              ["merch", "👕 Merch / Lifestyle", "mult_cat_merch"],
            ].map(([, label, key]) => {
              const val = settings[key] || 1.0;
              const color =
                val >= 2
                  ? T.success
                  : val >= 1.25
                    ? T.warning
                    : val < 1
                      ? T.danger
                      : T.ink500;
              return (
                <div
                  key={key}
                  style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}
                >
                  <div style={sLabel}>{label}</div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.25"
                      value={val}
                      onChange={(e) => upd(key, parseFloat(e.target.value))}
                      style={{ width: 80, accentColor: T.accent }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color,
                        fontFamily: "monospace",
                        width: 36,
                        textAlign: "right",
                      }}
                    >
                      {val}×
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scan defaults */}
          <div style={sSec}>
            <div style={sSecH}>
              <span style={sSecHT}>⚙️ Scan Defaults</span>
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Default points per scan</div>
                <div style={sSub}>
                  Used when code has no explicit points_value
                </div>
              </div>
              <input
                type="number"
                value={settings.default_points}
                onChange={(e) => upd("default_points", +e.target.value)}
                style={sNum}
              />
            </div>
            <div style={{ ...sRow, borderBottom: `1px solid ${T.bg}` }}>
              <div>
                <div style={sLabel}>Default one-time scan</div>
                <div style={sSub}>New codes default to single-use</div>
              </div>
              <Toggle
                val={settings.default_one_time}
                onChange={(v) => upd("default_one_time", v)}
              />
            </div>
            <div style={sRow}>
              <div>
                <div style={sLabel}>Default cooldown</div>
                <div style={sSub}>Hours between repeat scans (0 = none)</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={settings.default_cooldown_hrs}
                  onChange={(e) => upd("default_cooldown_hrs", +e.target.value)}
                  style={sNum}
                />
                <span style={{ fontSize: 10, color: T.ink500 }}>hrs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 24,
        }}
      >
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "10px 28px",
            background: T.accent,
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <div style={sSec}>
          <div style={sSecH}>
            <span style={sSecHT}>🚨 Recent Security Alerts</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 8,
                background: T.dangerLight,
                color: T.danger,
              }}
            >
              {alerts.length}
            </span>
          </div>
          {alerts.map((a) => (
            <div key={a.id} style={{ ...sRow, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: a.severity === "critical" ? T.danger : T.warning,
                  }}
                >
                  {a.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink500,
                    marginTop: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {a.body?.slice(0, 120)}
                </div>
                <div style={{ fontSize: 9, color: T.ink300, marginTop: 3 }}>
                  {new Date(a.created_at).toLocaleString("en-ZA")}
                </div>
              </div>
              <button
                onClick={() => resolveAlert(a)}
                style={{
                  marginLeft: 12,
                  padding: "4px 10px",
                  fontSize: 10,
                  background: T.bg,
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  color: T.ink500,
                  flexShrink: 0,
                }}
              >
                Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Flagged users */}
      {flaggedUsers.length > 0 && (
        <div style={sSec}>
          <div style={sSecH}>
            <span style={sSecHT}>⚠ Anomaly Scores — Flagged Users</span>
            <span style={{ fontSize: 10, color: T.ink500 }}>
              Score &gt; 0 · sorted highest first
            </span>
          </div>
          {flaggedUsers.map((u) => {
            const score = u.anomaly_score || 0;
            const color =
              score >= 70 ? T.danger : score >= 40 ? T.warning : T.ink500;
            return (
              <div key={u.id} style={{ ...sRow, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 12, fontWeight: 500, color: T.ink900 }}
                  >
                    {u.full_name || u.email || u.id.slice(0, 8)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 120,
                        height: 6,
                        background: T.border,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(score, 100)}%`,
                          height: "100%",
                          background: color,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color,
                        fontFamily: "monospace",
                      }}
                    >
                      {score}/100
                    </span>
                    {u.is_suspended && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 8,
                          background: T.dangerLight,
                          color: T.danger,
                        }}
                      >
                        SUSPENDED
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => resetScore(u)}
                    disabled={resolving === u.id}
                    style={{
                      padding: "4px 10px",
                      fontSize: 10,
                      background: T.infoLight,
                      border: `1px solid ${T.infoBd}`,
                      borderRadius: 5,
                      cursor: "pointer",
                      color: T.info,
                    }}
                  >
                    Reset score
                  </button>
                  <button
                    onClick={() => toggleSuspend(u)}
                    disabled={resolving === u.id}
                    style={{
                      padding: "4px 10px",
                      fontSize: 10,
                      background: u.is_suspended ? T.successLight : T.dangerLight,
                      border: `1px solid ${u.is_suspended ? T.successBd : T.dangerBd}`,
                      borderRadius: 5,
                      cursor: "pointer",
                      color: u.is_suspended ? T.success : T.danger,
                    }}
                  >
                    {u.is_suspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminQRCodes({
  initialBatchId,
  initialTab,
  tenantId: tenantIdProp,
}) {
  const { tenantId: ctxTenantId } = useTenant();
  const tenantId = tenantIdProp || ctxTenantId;
  const [tab, setTab] = useState(initialTab || "registry");
  const [batches, setBatches] = useState([]);
  const [banners, setBanners] = useState([]);
  const ctx = usePageContext("admin-qr", null);

  // Read ?sub= from URL to deep-link into a specific sub-tab (e.g. ?sub=generate)
  const location = useLocation();
  useEffect(() => {
    const sub = new URLSearchParams(location.search).get("sub");
    const validKeys = ["registry", "generate", "print", "security", "banners"];
    if (sub && validKeys.includes(sub)) setTab(sub);
  }, [location.search]);

  const fetchBatches = useCallback(async () => {
    const { data } = await supabase
      .from("batches")
      .select("id,batch_number,product_name,strain")
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
    { key: "print", label: "🖨 Print Sheet" },
    { key: "security", label: "🛡 Security & Settings" },
    { key: "banners", label: "Banners" },
  ];

  return (
    <div style={{ fontFamily: T.font }}>
      {/* WorkflowGuide — always first */}
      <WorkflowGuide
        context={ctx}
        tabId="admin-qr"
        onAction={() => {}}
        defaultOpen={true}
      />

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <h2
          style={{
            fontFamily: T.font,
            fontSize: 22,
            fontWeight: 600,
            color: T.ink900,
            margin: "0 0 4px",
          }}
        >
          QR Engine v2.0
        </h2>
        <div style={{ fontSize: 13, color: T.ink500, marginBottom: 24 }}>
          6 QR types · HMAC-signed · Action stack · Smart print · Fraud
          detection · Velocity anomaly scoring · Category multipliers · Streak
          engine
        </div>
      </div>

      {/* Underline tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 28,
          borderBottom: `2px solid ${T.border}`,
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
                tab === t.key
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
              fontSize: 11,
              fontWeight: tab === t.key ? 700 : 400,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: tab === t.key ? T.accent : T.ink500,
              fontFamily: T.font,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "registry" && (
        <RegistryTab batches={batches} tenantId={tenantId} />
      )}
      {tab === "generate" && (
        <GenerateTab
          batches={batches}
          banners={banners}
          tenantId={tenantId}
          onGenerated={() => setTab("registry")}
          initialBatchId={initialBatchId}
        />
      )}
      {tab === "print" && <PrintTab tenantId={tenantId} />}
      {tab === "security" && <SecurityTab tenantId={tenantId} />}
      {tab === "banners" && (
        <BannersTab banners={banners} onRefresh={fetchBanners} />
      )}
    </div>
  );
}
