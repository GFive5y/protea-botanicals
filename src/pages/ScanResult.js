// src/pages/ScanResult.js v4.7
// Protea Botanicals — WP-T: Regulatory batch provenance on scan result
// v4.7 changes from v4.6:
//   - batches select extended: lab_certified, expiry_date, thc_content, cbd_content, lab_name
//   - ProductCard now shows: Lab Certified badge, Expiry date, THC/CBD %, lab name
//   - Expiry warning shown if batch expires within 90 days
// v4.6 changes from v4.5:
//   - After fetching profile, checks is_suspended flag
//   - Suspended users: scan is logged (outcome: suspended_blocked),
//     points are NOT awarded, SuspendedCard shown instead of points card
//   - All other v4.5 logic — campaigns, survey, streak — unchanged

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import ClientHeader from "../components/ClientHeader";
import SurveyWidget from "../components/SurveyWidget";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`;

const DEFAULT_LOYALTY_CONFIG = {
  pts_streak_bonus: 200,
  streak_interval: 5,
  pts_qr_scan: 10,
  mult_bronze: 1.0,
  mult_silver: 1.25,
  mult_gold: 1.5,
  mult_platinum: 2.0,
  threshold_silver: 200,
  threshold_gold: 500,
  threshold_platinum: 1000,
  redemption_value_zar: 0.1,
  breakage_rate: 0.3,
};

function getTierLabel(pts, cfg) {
  if (pts >= cfg.threshold_platinum) return "Platinum";
  if (pts >= cfg.threshold_gold) return "Gold";
  if (pts >= cfg.threshold_silver) return "Silver";
  return "Bronze";
}
function getTierMult(tier, cfg) {
  return (
    {
      Bronze: cfg.mult_bronze,
      Silver: cfg.mult_silver,
      Gold: cfg.mult_gold,
      Platinum: cfg.mult_platinum,
    }[tier] || 1.0
  );
}
function getTierColor(tier) {
  return (
    {
      Bronze: "#a0674b",
      Silver: "#8e9ba8",
      Gold: "#b5935a",
      Platinum: "#7b68ee",
    }[tier] || "#52b788"
  );
}

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  text: "#1a1a1a",
  muted: "#474747",
  border: "#e0dbd2",
  white: "#fff",
  error: "#c0392b",
  success: "#27ae60",
  warning: "#e67e22",
  lightGreen: "#eafaf1",
  lightRed: "#fdf0ef",
};

function detectDevice() {
  const ua = navigator.userAgent || "";
  const device = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
    ? "mobile"
    : /Tablet|iPad/i.test(ua)
      ? "tablet"
      : "desktop";
  const browser =
    /Chrome/i.test(ua) && !/Edge/i.test(ua)
      ? "Chrome"
      : /Firefox/i.test(ua)
        ? "Firefox"
        : /Safari/i.test(ua) && !/Chrome/i.test(ua)
          ? "Safari"
          : /Edge/i.test(ua)
            ? "Edge"
            : "Other";
  return { device, browser, userAgent: ua.slice(0, 200) };
}
async function fetchIpGeo() {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      ip_lat: d.latitude || null,
      ip_lng: d.longitude || null,
      ip_city: d.city || null,
      ip_province: d.region || null,
      ip_country: d.country_code || "ZA",
    };
  } catch {
    return null;
  }
}
function requestGps() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          gps_lat: pos.coords.latitude,
          gps_lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

const pill = (bg, color) => ({
  display: "inline-block",
  background: bg,
  color,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  padding: "4px 12px",
  borderRadius: 20,
  fontFamily: "Jost, sans-serif",
});
const actionBtn = (bg = C.green, color = C.white) => ({
  display: "block",
  width: "100%",
  padding: "13px 20px",
  background: bg,
  color,
  border: "none",
  borderRadius: 2,
  fontFamily: "Jost, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: "pointer",
  textAlign: "center",
  transition: "opacity 0.18s",
});
const card = (extra = {}) => ({
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 2,
  padding: 20,
  marginBottom: 12,
  ...extra,
});

const QR_TYPE_LABELS = {
  product_insert: { icon: "📦", label: "Product Insert" },
  packaging_exterior: { icon: "🌐", label: "Exterior Packaging" },
  promotional: { icon: "📣", label: "Promotional" },
  event: { icon: "🎪", label: "Event" },
  wearable: { icon: "👕", label: "Wearable / Merch" },
  retail_display: { icon: "🏪", label: "Retail Display" },
};

// ── v4.6: Suspended Account Card ─────────────────────────────────────────────
function SuspendedCard({ navigate }) {
  return (
    <div
      style={card({
        background: C.lightRed,
        border: `1px solid ${C.error}40`,
        textAlign: "center",
      })}
    >
      <div style={{ fontSize: 36, marginBottom: 10 }}>🚫</div>
      <div
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 20,
          fontWeight: 600,
          color: C.error,
          marginBottom: 8,
        }}
      >
        Account Suspended
      </div>
      <div
        style={{
          fontSize: 13,
          color: C.muted,
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        Your account has been temporarily suspended. You can still scan and
        verify products, but points cannot be awarded until your account is
        reinstated.
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        If you believe this is an error, please contact us via the Support tab
        in your account.
      </div>
      <button
        onClick={() => navigate("/account")}
        style={{
          ...actionBtn("#f0ebe3", C.muted),
          width: "auto",
          display: "inline-block",
          padding: "10px 24px",
        }}
      >
        Contact Support →
      </button>
    </div>
  );
}

// ── v4.5: Campaign Banner ─────────────────────────────────────────────────────
function CampaignBanner({ campaign }) {
  if (!campaign) return null;
  const mult = parseFloat(campaign.multiplier) || 2;
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #b5935a, #8a6c3a)",
        borderRadius: 2,
        padding: "16px 20px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ fontSize: 28, flexShrink: 0 }}>🎉</div>
      <div>
        <div
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 2,
          }}
        >
          {mult}× Points Active — {campaign.name}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
          All points earned today are multiplied ×{mult}. Ends{" "}
          {new Date(campaign.end_date).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
          })}
          .
        </div>
      </div>
    </div>
  );
}

function BannerDisplay({ banner }) {
  const navigate = useNavigate();
  if (!banner) return null;
  return (
    <div
      style={{
        background: banner.bg_color || C.green,
        color: banner.text_color || C.white,
        padding: "24px 28px",
        borderRadius: 2,
        marginBottom: 12,
      }}
    >
      {banner.headline && (
        <div
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {banner.headline}
        </div>
      )}
      {banner.body && (
        <div
          style={{
            fontSize: 13,
            opacity: 0.85,
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          {banner.body}
        </div>
      )}
      {banner.cta_text && banner.cta_link && (
        <button
          onClick={() => navigate(banner.cta_link)}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            color: "inherit",
            borderRadius: 2,
            padding: "8px 20px",
            fontFamily: "Jost, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {banner.cta_text} →
        </button>
      )}
    </div>
  );
}

function ProductCard({ batch, showCoa }) {
  if (!batch) return null;

  const daysToExpiry = batch.expiry_date
    ? Math.ceil((new Date(batch.expiry_date) - new Date()) / 86400000)
    : null;
  const expiryWarning = daysToExpiry !== null && daysToExpiry <= 90;
  const isExpired = daysToExpiry !== null && daysToExpiry < 0;

  return (
    <div style={card({ borderLeft: `3px solid ${C.accent}` })}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: C.accent,
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        Verified Product
      </div>
      <div
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 20,
          fontWeight: 600,
          color: C.green,
          marginBottom: 4,
        }}
      >
        {batch.product_name}
      </div>
      {batch.strain && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
          Strain: {batch.strain.replace(/-/g, " ")}
        </div>
      )}

      {/* Authenticity + batch badges */}
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <span style={pill(C.lightGreen, C.success)}>✓ Authentic</span>
        <span style={pill(C.cream, C.blue)}>Batch {batch.batch_number}</span>
        {batch.volume && (
          <span style={pill(C.cream, C.muted)}>{batch.volume}</span>
        )}
        {batch.lab_certified && (
          <span style={pill("#eafaf1", "#1b4332")}>🔬 Lab Certified</span>
        )}
      </div>

      {/* Lab details */}
      {(batch.thc_content || batch.cbd_content || batch.lab_name) && (
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 12,
            padding: "10px 12px",
            background: "#f8faf8",
            borderRadius: 2,
            border: "1px solid #e0dbd2",
          }}
        >
          {batch.thc_content && (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#888",
                  marginBottom: 2,
                }}
              >
                THC
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "Cormorant Garamond, serif",
                  color: "#1b4332",
                }}
              >
                {parseFloat(batch.thc_content).toFixed(1)}%
              </div>
            </div>
          )}
          {batch.cbd_content && (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#888",
                  marginBottom: 2,
                }}
              >
                CBD
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "Cormorant Garamond, serif",
                  color: "#2c4a6e",
                }}
              >
                {parseFloat(batch.cbd_content).toFixed(1)}%
              </div>
            </div>
          )}
          {batch.lab_name && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#888",
                  marginBottom: 2,
                }}
              >
                Lab
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                {batch.lab_name}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expiry */}
      {batch.expiry_date && (
        <div
          style={{
            fontSize: 12,
            marginBottom: 10,
            padding: "6px 10px",
            borderRadius: 2,
            background: isExpired
              ? "#fdf0ef"
              : expiryWarning
                ? "#fff3e8"
                : "#f0faf5",
            color: isExpired
              ? "#c0392b"
              : expiryWarning
                ? "#e67e22"
                : "#2d6a4f",
            border: `1px solid ${isExpired ? "#c0392b40" : expiryWarning ? "#e67e2240" : "#52b78840"}`,
          }}
        >
          {isExpired
            ? "⚠ Batch expired"
            : expiryWarning
              ? `⚠ Expires in ${daysToExpiry} days — ${new Date(batch.expiry_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`
              : `✓ Best before ${new Date(batch.expiry_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`}
        </div>
      )}

      {/* COA link */}
      {showCoa && batch.coa_document_id && (
        <a
          href={`/documents/${batch.coa_document_id}`}
          style={{
            fontSize: 12,
            color: C.accent,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          📄 View Certificate of Analysis →
        </a>
      )}
    </div>
  );
}

function PointsCard({
  pointsAwarded,
  totalPoints,
  skipped,
  skipReason,
  tierLabel,
  multiplier,
  basePoints,
  campaignMult,
}) {
  if (skipped) {
    return (
      <div style={card({ background: C.cream })}>
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
          {skipReason}
        </div>
      </div>
    );
  }
  const tierColor = getTierColor(tierLabel);
  const showMultiplier = multiplier && multiplier > 1 && tierLabel;
  const showCampaign = campaignMult && campaignMult > 1;
  return (
    <div
      style={card({
        background: C.lightGreen,
        border: `1px solid ${C.accent}`,
        textAlign: "center",
      })}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: C.accent,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        Points Earned
      </div>
      <div
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 48,
          fontWeight: 700,
          color: C.green,
          lineHeight: 1,
        }}
      >
        +{pointsAwarded}
      </div>
      {showMultiplier && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 10, color: C.muted }}>
            {basePoints} base
          </span>
          <span
            style={{
              background: tierColor,
              color: C.white,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 10,
            }}
          >
            {tierLabel} {multiplier}×
          </span>
          {showCampaign && (
            <span
              style={{
                background: C.gold,
                color: C.white,
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
              }}
            >
              Campaign {campaignMult}×
            </span>
          )}
          <span style={{ fontSize: 10, color: C.muted }}>
            = {pointsAwarded} pts
          </span>
        </div>
      )}
      <div style={{ fontSize: 12, color: C.mid, marginTop: 8 }}>
        Your total: <strong>{totalPoints}</strong> pts
      </div>
      {showMultiplier && (
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          🏆 {tierLabel} tier bonus active — earn more at every tier
        </div>
      )}
    </div>
  );
}

function CustomMessageCard({ action, navigate }) {
  return (
    <div style={card({ textAlign: "center" })}>
      {action.headline && (
        <div
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: 22,
            fontWeight: 600,
            color: C.green,
            marginBottom: 8,
          }}
        >
          {action.headline}
        </div>
      )}
      {action.body && (
        <div
          style={{
            fontSize: 13,
            color: C.muted,
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          {action.body}
        </div>
      )}
      {action.cta && action.cta_url && (
        <button
          onClick={() => navigate(action.cta_url)}
          style={{
            ...actionBtn(C.accent, C.green),
            width: "auto",
            display: "inline-block",
            padding: "10px 24px",
          }}
        >
          {action.cta}
        </button>
      )}
    </div>
  );
}
function EventCheckinCard({ eventName, checkedIn }) {
  return (
    <div
      style={card({
        textAlign: "center",
        background: checkedIn ? C.lightGreen : C.cream,
      })}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>🎪</div>
      <div
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 20,
          fontWeight: 600,
          color: C.green,
          marginBottom: 4,
        }}
      >
        {checkedIn ? "Checked In!" : "Event"}
      </div>
      <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>
        {eventName}
      </div>
      {checkedIn && (
        <div style={{ fontSize: 12, color: C.success, marginTop: 8 }}>
          ✓ Your attendance has been recorded
        </div>
      )}
    </div>
  );
}
function GuardScreen({ type }) {
  const navigate = useNavigate();
  const msgs = {
    not_found: {
      icon: "❓",
      title: "Code Not Found",
      body: "This QR code isn't in our system.",
    },
    inactive: {
      icon: "⏸",
      title: "Code Inactive",
      body: "This QR code has been paused.",
    },
    expired: {
      icon: "⏰",
      title: "Code Expired",
      body: "This QR code has expired.",
    },
    max_scans: {
      icon: "🔒",
      title: "Scan Limit Reached",
      body: "This QR code has reached its maximum number of scans.",
    },
    error: {
      icon: "⚠️",
      title: "Something Went Wrong",
      body: "We couldn't process this code. Please try again.",
    },
  };
  const m = msgs[type] || msgs.error;
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{m.icon}</div>
      <div
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 26,
          color: C.green,
          marginBottom: 12,
        }}
      >
        {m.title}
      </div>
      <div
        style={{
          fontSize: 14,
          color: C.muted,
          lineHeight: 1.6,
          marginBottom: 28,
          maxWidth: 340,
          margin: "0 auto 28px",
        }}
      >
        {m.body}
      </div>
      <button
        onClick={() => navigate("/")}
        style={{
          ...actionBtn(C.green),
          width: "auto",
          display: "inline-block",
          padding: "12px 28px",
        }}
      >
        Go to Home
      </button>
    </div>
  );
}
function GpsConsentBanner({ onAllow, onDeny }) {
  return (
    <div
      style={{
        background: C.warm,
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        padding: 16,
        marginBottom: 12,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 18,
          fontWeight: 600,
          color: C.green,
          marginBottom: 6,
        }}
      >
        📍 Improve Your Experience
      </div>
      <div
        style={{
          fontSize: 12,
          color: C.muted,
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        Allow location access so we can show you the nearest stockist and
        improve our service. Your precise location is never stored permanently.
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          onClick={onAllow}
          style={{
            ...actionBtn(C.accent, C.green),
            width: "auto",
            padding: "8px 20px",
          }}
        >
          Allow
        </button>
        <button
          onClick={onDeny}
          style={{
            ...actionBtn("#f0f0f0", C.muted),
            width: "auto",
            padding: "8px 20px",
          }}
        >
          No Thanks
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function ScanResult() {
  const { qrCode } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [guardType, setGuardType] = useState("error");
  const [qrRecord, setQrRecord] = useState(null);
  const [user, setUser] = useState(null);
  // loyaltyConfig fetched fresh inside executeScan — no top-level state needed

  // v4.6: suspension state
  const [isSuspended, setIsSuspended] = useState(false);

  // v4.5: campaign state
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaignMultUsed, setCampaignMultUsed] = useState(1);

  const [banner, setBanner] = useState(null);
  const [showProduct, setShowProduct] = useState(false);
  const [showCoa, setShowCoa] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [basePointsAwarded, setBasePointsAwarded] = useState(0);
  const [tierMultiplierUsed, setTierMultiplierUsed] = useState(1);
  const [tierLabelUsed, setTierLabelUsed] = useState("Bronze");
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsSkipped, setPointsSkipped] = useState(false);
  const [pointsSkipReason, setPointsSkipReason] = useState("");
  const [customMessages, setCustomMessages] = useState([]);
  const [eventCheckins, setEventCheckins] = useState([]);
  const [hasPoints, setHasPoints] = useState(false);
  const [hadPointsAction, setHadPointsAction] = useState(false);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const [scanLogId, setScanLogId] = useState(null);
  const [streakBonus, setStreakBonus] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [surveyBonusAwarded, setSurveyBonusAwarded] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  }, []);

  const writeScanLog = useCallback(
    async ({
      qrId,
      qrCodeStr,
      userId,
      outcome,
      pointsAmt,
      skipped,
      skipReason,
      qrType,
      campaignName,
      batchId,
      ipGeo,
      deviceInfo,
    }) => {
      try {
        const payload = {
          qr_code_id: qrId || null,
          qr_code: qrCodeStr,
          user_id: userId || null,
          scan_outcome: outcome,
          points_awarded: pointsAmt || 0,
          points_skipped: skipped || false,
          skip_reason: skipReason || null,
          qr_type: qrType || null,
          campaign_name: campaignName || null,
          batch_id: batchId || null,
          ip_lat: ipGeo?.ip_lat || null,
          ip_lng: ipGeo?.ip_lng || null,
          ip_city: ipGeo?.ip_city || null,
          ip_province: ipGeo?.ip_province || null,
          ip_country: ipGeo?.ip_country || "ZA",
          location_source: ipGeo ? "ip" : "none",
          device_type: deviceInfo?.device || null,
          browser: deviceInfo?.browser || null,
          user_agent: deviceInfo?.userAgent || null,
        };
        const { data, error } = await supabase
          .from("scan_logs")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          console.error("scan_log insert error:", error);
          return null;
        }
        return data?.id || null;
      } catch (err) {
        console.error("writeScanLog error:", err);
        return null;
      }
    },
    [],
  );

  const writeLoyaltyTransaction = useCallback(
    async ({
      userId,
      points,
      balanceAfter,
      qrCodeStr,
      description,
      scanLogId,
      multiplierApplied,
      tierAtTime,
    }) => {
      try {
        await supabase.from("loyalty_transactions").insert({
          user_id: userId,
          transaction_type: "EARNED",
          points,
          balance_after: balanceAfter,
          source: "qr_scan",
          source_id: qrCodeStr,
          description,
          scan_log_id: scanLogId || null,
          transaction_date: new Date().toISOString(),
          multiplier_applied: multiplierApplied || 1.0,
          tier_at_time: tierAtTime || "Bronze",
          channel: "qr_scan",
        });
      } catch (err) {
        console.error("writeLoyaltyTransaction error:", err);
      }
    },
    [],
  );

  const updateScanLogWithGps = useCallback(async (logId, gpsData) => {
    if (!logId || !gpsData) return;
    try {
      await supabase
        .from("scan_logs")
        .update({
          gps_lat: gpsData.gps_lat,
          gps_lng: gpsData.gps_lng,
          location_source: "gps",
        })
        .eq("id", logId);
    } catch (err) {
      console.error("GPS update error:", err);
    }
  }, []);

  // GAP-02: write a system_alert (non-blocking, fire-and-forget)
  const writeAlert = useCallback(
    async (alertType, severity, title, body, sourceId) => {
      try {
        await supabase.from("system_alerts").insert({
          tenant_id: "43b34c33-6864-4f02-98dd-df1d340475c3",
          alert_type: alertType,
          severity,
          status: "open",
          title,
          body,
          source_table: "scan_logs",
          source_id: sourceId || null,
        });
      } catch (_) {}
    },
    [],
  );

  const executeScan = useCallback(async () => {
    setPhase("loading");
    if (!qrCode) {
      setGuardType("not_found");
      setPhase("guard");
      return;
    }

    const [ipGeo, deviceInfo] = await Promise.all([
      fetchIpGeo(),
      Promise.resolve(detectDevice()),
    ]);

    let config = DEFAULT_LOYALTY_CONFIG;
    try {
      const { data: cfgData } = await supabase
        .from("loyalty_config")
        .select("*")
        .single();
      if (cfgData) config = cfgData;
    } catch (_) {}

    // v4.5: Fetch active campaign
    let campaign = null;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: camps } = await supabase
        .from("double_points_campaigns")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(1);
      if (camps && camps.length > 0) campaign = camps[0];
    } catch (_) {}
    setActiveCampaign(campaign);
    const campaignMult = campaign ? parseFloat(campaign.multiplier) || 1 : 1;

    try {
      const { data: qrRows, error: qrErr } = await supabase
        .from("qr_codes")
        .select(
          "*, batches(batch_number, product_name, strain, volume, coa_document_id, lab_certified, lab_name, expiry_date, thc_content, cbd_content)",
        )
        .eq("qr_code", qrCode)
        .limit(1);
      if (qrErr || !qrRows || qrRows.length === 0) {
        await writeScanLog({
          qrCodeStr: qrCode,
          outcome: "not_found",
          deviceInfo,
          ipGeo,
        });
        setGuardType("not_found");
        setPhase("guard");
        return;
      }

      const qr = qrRows[0];
      setQrRecord(qr);

      if (!qr.is_active) {
        await writeScanLog({
          qrId: qr.id,
          qrCodeStr: qrCode,
          qrType: qr.qr_type,
          outcome: "blocked_inactive",
          deviceInfo,
          ipGeo,
        });
        setGuardType("inactive");
        setPhase("guard");
        return;
      }
      if (qr.expires_at && new Date() > new Date(qr.expires_at)) {
        await writeScanLog({
          qrId: qr.id,
          qrCodeStr: qrCode,
          qrType: qr.qr_type,
          outcome: "blocked_expired",
          deviceInfo,
          ipGeo,
        });
        setGuardType("expired");
        setPhase("guard");
        return;
      }
      if (qr.max_scans != null && (qr.scan_count || 0) >= qr.max_scans) {
        await writeScanLog({
          qrId: qr.id,
          qrCodeStr: qrCode,
          qrType: qr.qr_type,
          outcome: "blocked_max_scans",
          deviceInfo,
          ipGeo,
        });
        writeAlert(
          "scan_abuse",
          "warning",
          "Max scan limit exceeded",
          `QR code ${qrCode} has been scanned ${(qr.scan_count || 0) + 1} times — limit is ${qr.max_scans}. IP: ${ipGeo?.ip_city || "unknown"}.`,
          qr.id,
        );
        setGuardType("max_scans");
        setPhase("guard");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      let profile = null;
      if (currentUser) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        profile = prof;

        // v4.6: Suspension check — log scan but skip all points logic
        if (profile?.is_suspended) {
          setIsSuspended(true);
          setShowProduct(true);
          setShowCoa(true);
          writeAlert(
            "suspended_scan",
            "warning",
            "Suspended account attempted scan",
            `User ${currentUser.id} (suspended) scanned QR ${qrCode}. IP: ${ipGeo?.ip_city || "unknown"}.`,
            qr.id,
          );
          await supabase
            .from("qr_codes")
            .update({
              scan_count: (qr.scan_count || 0) + 1,
              last_scan_at: new Date().toISOString(),
            })
            .eq("id", qr.id);
          await writeScanLog({
            qrId: qr.id,
            qrCodeStr: qrCode,
            userId: currentUser.id,
            outcome: "suspended_blocked",
            pointsAmt: 0,
            skipped: true,
            skipReason: "account_suspended",
            qrType: qr.qr_type,
            campaignName: qr.campaign_name,
            batchId: qr.batch_id,
            ipGeo,
            deviceInfo,
          });
          setPhase("done");
          return;
        }
      }

      let actions = [];
      if (Array.isArray(qr.scan_actions)) {
        actions = qr.scan_actions;
      } else if (qr.scan_actions) {
        try {
          actions = JSON.parse(qr.scan_actions);
        } catch {
          actions = [];
        }
      }
      if (actions.length === 0 && qr.qr_type === "product_insert") {
        actions = [
          {
            action: "award_points",
            points: config.pts_qr_scan || 10,
            one_time: true,
          },
          { action: "show_product", show_coa: true },
        ];
      }

      let pointsAwardedAmt = 0,
        pointsWasSkipped = false,
        pointsWasSkipReason = "",
        pendingRedirect = null;

      for (const action of actions) {
        switch (action.action) {
          case "award_points": {
            if (!currentUser) {
              pointsWasSkipped = true;
              pointsWasSkipReason = "not_logged_in";
              setHadPointsAction(true);
              break;
            }
            const basePoints =
              config.pts_qr_scan || action.points || qr.points_value || 10;
            const currentPts = profile?.loyalty_points || 0;
            const userTier = getTierLabel(currentPts, config);
            const multiplier = getTierMult(userTier, config);
            const finalPoints = Math.round(
              basePoints * multiplier * campaignMult,
            );

            if (action.one_time && qr.claimed) {
              pointsWasSkipped = true;
              pointsWasSkipReason = "already_claimed";
              setCustomMessages((prev) => [
                ...prev,
                {
                  action: "custom_message",
                  headline: null,
                  body: "✓ You've already earned points from this product — check your loyalty balance for your total.",
                  cta: "View My Points",
                  cta_url: "/loyalty",
                },
              ]);
              break;
            }
            if (!action.one_time && action.cooldown_hrs && qr.last_scan_at) {
              const hrs =
                (Date.now() - new Date(qr.last_scan_at).getTime()) / 3600000;
              if (hrs < action.cooldown_hrs) {
                const remaining = Math.ceil(action.cooldown_hrs - hrs);
                pointsWasSkipped = true;
                pointsWasSkipReason = "cooldown";
                setCustomMessages((prev) => [
                  ...prev,
                  {
                    action: "custom_message",
                    headline: null,
                    body: `⏱ Scan cooldown active — you can earn points again in ${remaining}h.`,
                    cta: null,
                    cta_url: null,
                  },
                ]);
                break;
              }
            }

            setHasPoints(true);
            setHadPointsAction(true);
            const newTotal = currentPts + finalPoints;
            const { error: ptErr } = await supabase
              .from("user_profiles")
              .update({ loyalty_points: newTotal })
              .eq("id", currentUser.id);
            if (!ptErr) {
              pointsAwardedAmt = finalPoints;
              setPointsAwarded(finalPoints);
              setBasePointsAwarded(basePoints);
              setTierMultiplierUsed(multiplier);
              setTierLabelUsed(userTier);
              setCampaignMultUsed(campaignMult);
              setTotalPoints(newTotal);

              const newTier = getTierLabel(newTotal, config);
              if (newTier !== userTier) {
                await supabase
                  .from("user_profiles")
                  .update({ loyalty_tier: newTier })
                  .eq("id", currentUser.id);
                try {
                  await fetch(`${SUPABASE_FUNCTIONS_URL}/send-notification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "whatsapp",
                      trigger: "tier_upgrade",
                      recipient: {
                        phone: profile?.phone || "",
                        name: profile?.full_name || "",
                      },
                      data: {
                        old_tier: userTier,
                        new_tier: newTier,
                        points: newTotal,
                      },
                    }),
                  });
                } catch (_) {}
                const tierIcons = { Silver: "🥈", Gold: "🥇", Platinum: "💎" };
                const tierMults = {
                  Silver: "1.25×",
                  Gold: "1.5×",
                  Platinum: "2×",
                };
                await supabase.from("customer_messages").insert({
                  user_id: currentUser.id,
                  subject: `${tierIcons[newTier] || "🏆"} You've reached ${newTier} tier!`,
                  content: `Congratulations! 🎉 You've just unlocked ${newTier} tier status.\n\nYour new earning rate: ${tierMults[newTier] || "2×"} points on every purchase and QR scan. 🌿`,
                  type: "tier_upgrade",
                  read: false,
                  created_at: new Date().toISOString(),
                });
              }
              if (action.one_time && !qr.claimed) {
                await supabase
                  .from("qr_codes")
                  .update({
                    claimed: true,
                    claimed_by: currentUser.id,
                    claimed_at: new Date().toISOString(),
                  })
                  .eq("id", qr.id);
              }
            }
            break;
          }
          case "show_banner": {
            if (action.banner_id) {
              const { data: bannerData } = await supabase
                .from("qr_banners")
                .select("*")
                .eq("id", action.banner_id)
                .single();
              if (bannerData) setBanner(bannerData);
            }
            break;
          }
          case "show_product": {
            setShowProduct(true);
            setShowCoa(action.show_coa !== false);
            break;
          }
          case "event_checkin": {
            setEventCheckins((prev) => [
              ...prev,
              {
                eventName: action.event_name || "Event",
                checkedIn: !!currentUser,
              },
            ]);
            break;
          }
          case "custom_message": {
            setCustomMessages((prev) => [...prev, action]);
            break;
          }
          case "redirect": {
            pendingRedirect = { url: action.url, delay: action.delay_ms || 0 };
            break;
          }
          case "loyalty_signup": {
            if (!currentUser) {
              setCustomMessages((prev) => [
                ...prev,
                {
                  action: "custom_message",
                  headline: "Join Our Loyalty Program",
                  body: "Create a free account to earn and track your points.",
                  cta: "Sign Up Free",
                  cta_url: "/account",
                },
              ]);
            }
            break;
          }
          default:
            break;
        }
      }

      setPointsSkipped(pointsWasSkipped);
      setPointsSkipReason(pointsWasSkipReason);

      await supabase
        .from("qr_codes")
        .update({
          scan_count: (qr.scan_count || 0) + 1,
          last_scan_at: new Date().toISOString(),
        })
        .eq("id", qr.id);

      const productLabel =
        qr.batches?.product_name || qr.campaign_name || qr.qr_type;
      const logId = await writeScanLog({
        qrId: qr.id,
        qrCodeStr: qrCode,
        userId: currentUser?.id || null,
        outcome: pointsWasSkipped ? "already_claimed" : "points_awarded",
        pointsAmt: pointsAwardedAmt,
        skipped: pointsWasSkipped,
        skipReason: pointsWasSkipReason,
        qrType: qr.qr_type,
        campaignName: qr.campaign_name,
        batchId: qr.batch_id,
        ipGeo,
        deviceInfo,
      });
      setScanLogId(logId);

      if (pointsAwardedAmt > 0 && currentUser) {
        const currentPts = profile?.loyalty_points || 0;
        await writeLoyaltyTransaction({
          userId: currentUser.id,
          points: pointsAwardedAmt,
          balanceAfter: currentPts + pointsAwardedAmt,
          qrCodeStr: qrCode,
          description: `Scanned ${productLabel}${campaign ? ` (${campaign.multiplier}× campaign)` : ""}`,
          scanLogId: logId,
          multiplierApplied: tierMultiplierUsed * campaignMult,
          tierAtTime: tierLabelUsed,
        });
      }

      // Streak + scan count
      if (currentUser && pointsAwardedAmt > 0) {
        try {
          const sevenDaysAgo = new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
          const { count: weekCount } = await supabase
            .from("scan_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", currentUser.id)
            .eq("scan_outcome", "points_awarded")
            .gte("scanned_at", sevenDaysAgo);
          const STREAK_BONUS_PTS = config.pts_streak_bonus || 200,
            STREAK_INTERVAL = config.streak_interval || 5;
          if (weekCount && weekCount % STREAK_INTERVAL === 0) {
            const { data: freshPts } = await supabase
              .from("user_profiles")
              .select("loyalty_points")
              .eq("id", currentUser.id)
              .single();
            const afterStreak =
              (freshPts?.loyalty_points || 0) + STREAK_BONUS_PTS;
            await supabase
              .from("user_profiles")
              .update({ loyalty_points: afterStreak })
              .eq("id", currentUser.id);
            await supabase.from("loyalty_transactions").insert({
              user_id: currentUser.id,
              transaction_type: "EARNED",
              points: STREAK_BONUS_PTS,
              balance_after: afterStreak,
              source: "streak_bonus",
              description: `Streak bonus — ${weekCount} scans this week!`,
              transaction_date: new Date().toISOString(),
              channel: "streak_bonus",
              multiplier_applied: 1.0,
              tier_at_time: getTierLabel(freshPts?.loyalty_points || 0, config),
            });
            await supabase.from("customer_messages").insert({
              user_id: currentUser.id,
              subject: `🔥 Streak Bonus — +${STREAK_BONUS_PTS} pts!`,
              content: `You're on fire! 🔥 You've scanned ${weekCount} products this week and earned a ${STREAK_BONUS_PTS}-point streak bonus. Keep scanning every week to keep the streak alive and stack those bonus points. 🌿`,
              type: "streak_bonus",
              read: false,
              created_at: new Date().toISOString(),
            });
            setStreakBonus(STREAK_BONUS_PTS);
            setStreakCount(weekCount);
            setTotalPoints(afterStreak);
          }
          const { count: lifetimeCount } = await supabase
            .from("scan_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", currentUser.id)
            .eq("scan_outcome", "points_awarded");
          setTotalScans(lifetimeCount || 0);
        } catch (streakErr) {
          console.error("Streak/scan count error:", streakErr);
        }
      }

      if (currentUser && deviceInfo?.device === "mobile") {
        setTimeout(() => setShowGpsPrompt(true), 2500);
      }
      if (pendingRedirect) {
        setTimeout(() => {
          if (pendingRedirect.url.startsWith("http")) {
            window.location.href = pendingRedirect.url;
          } else {
            navigate(pendingRedirect.url);
          }
        }, pendingRedirect.delay);
      }
      setPhase("done");
    } catch (err) {
      console.error("Scan engine error:", err);
      await writeScanLog({
        qrCodeStr: qrCode,
        outcome: "error",
        deviceInfo,
        ipGeo,
      });
      setGuardType("error");
      setPhase("guard");
    }
  }, [
    qrCode,
    navigate,
    writeScanLog,
    writeLoyaltyTransaction,
    writeAlert,
    tierMultiplierUsed,
    tierLabelUsed,
  ]);

  useEffect(() => {
    executeScan();
  }, [executeScan]);

  const handleGpsAllow = async () => {
    setShowGpsPrompt(false);
    const gpsData = await requestGps();
    if (gpsData && scanLogId) await updateScanLogWithGps(scanLogId, gpsData);
  };
  const handleGpsDeny = () => setShowGpsPrompt(false);

  const typeInfo = qrRecord
    ? QR_TYPE_LABELS[qrRecord.qr_type] || {
        icon: "🔍",
        label: qrRecord.qr_type,
      }
    : { icon: "🔍", label: "QR Code" };

  return (
    <>
      <style>
        {FONTS}
        {`
        @keyframes sr-fadein { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .sr-card { animation: sr-fadein 0.35s ease both; }
        @keyframes sr-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .sr-pts { animation: sr-pulse 0.6s ease 0.3s 2; }
      `}
      </style>
      <ClientHeader variant="light" />
      <div
        style={{
          minHeight: "100vh",
          background: C.cream,
          fontFamily: "Jost, sans-serif",
        }}
      >
        <div
          style={{ maxWidth: 500, margin: "0 auto", padding: "32px 20px 60px" }}
        >
          {phase === "loading" && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
              <div
                style={{ fontSize: 14, color: C.muted, letterSpacing: "0.1em" }}
              >
                Verifying code…
              </div>
            </div>
          )}
          {phase === "guard" && <GuardScreen type={guardType} />}
          {phase === "done" && (
            <>
              <div
                className="sr-card"
                style={{ textAlign: "center", marginBottom: 20 }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    color: C.accent,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  {typeInfo.icon} {typeInfo.label}
                </div>
                {qrRecord?.campaign_name && (
                  <div
                    style={{
                      fontFamily: "Cormorant Garamond, serif",
                      fontSize: 22,
                      color: C.green,
                      fontWeight: 600,
                    }}
                  >
                    {qrRecord.campaign_name}
                  </div>
                )}
              </div>

              {/* v4.6: Suspension card — replaces points flow entirely */}
              {isSuspended && (
                <div className="sr-card" style={{ animationDelay: "0.05s" }}>
                  <SuspendedCard navigate={navigate} />
                </div>
              )}

              {!isSuspended && (
                <>
                  {activeCampaign && (
                    <div
                      className="sr-card"
                      style={{ animationDelay: "0.02s" }}
                    >
                      <CampaignBanner campaign={activeCampaign} />
                    </div>
                  )}
                  {hasPoints && (
                    <div
                      className="sr-card sr-pts"
                      style={{ animationDelay: "0.05s" }}
                    >
                      <PointsCard
                        pointsAwarded={pointsAwarded}
                        totalPoints={totalPoints}
                        skipped={pointsSkipped}
                        skipReason={pointsSkipReason}
                        tierLabel={tierLabelUsed}
                        multiplier={tierMultiplierUsed}
                        basePoints={basePointsAwarded}
                        campaignMult={
                          campaignMultUsed > 1 ? campaignMultUsed : null
                        }
                      />
                    </div>
                  )}
                  {streakBonus > 0 && (
                    <div
                      className="sr-card"
                      style={{
                        animationDelay: "0.08s",
                        background: "#fff8e7",
                        border: "2px solid #b5935a",
                        borderRadius: 2,
                        padding: "18px 20px",
                        marginBottom: 12,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 6 }}>🔥</div>
                      <div
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#b5935a",
                          marginBottom: 4,
                        }}
                      >
                        Streak Bonus!
                      </div>
                      <div
                        style={{
                          fontFamily: "Cormorant Garamond, serif",
                          fontSize: 36,
                          fontWeight: 700,
                          color: "#1b4332",
                          lineHeight: 1,
                        }}
                      >
                        +{streakBonus} pts
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#888", marginTop: 6 }}
                      >
                        {streakCount} scans this week — keep the streak alive!
                        🌿
                      </div>
                    </div>
                  )}
                  {user && (
                    <SurveyWidget
                      userId={user.id}
                      totalScans={totalScans}
                      onComplete={(bonusPts) => {
                        setSurveyBonusAwarded(bonusPts);
                        setTotalPoints((prev) => prev + bonusPts);
                      }}
                    />
                  )}
                  {!user && hadPointsAction && (
                    <div
                      className="sr-card"
                      style={{
                        animationDelay: "0.35s",
                        ...card({ background: C.warm, textAlign: "center" }),
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: C.text,
                          marginBottom: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        <strong>Sign in to earn points</strong> — your scan was
                        verified but points require an account.
                      </div>
                      <button
                        onClick={() => navigate("/account")}
                        style={actionBtn(C.green)}
                      >
                        Create Account / Sign In
                      </button>
                    </div>
                  )}
                  {user && pointsAwarded > 0 && (
                    <div className="sr-card" style={{ animationDelay: "0.4s" }}>
                      <button
                        onClick={() => navigate("/loyalty")}
                        style={actionBtn(C.mid)}
                      >
                        View My Loyalty Points
                      </button>
                    </div>
                  )}
                </>
              )}

              {banner && (
                <div className="sr-card" style={{ animationDelay: "0.1s" }}>
                  <BannerDisplay banner={banner} />
                </div>
              )}
              {showProduct && qrRecord?.batches && (
                <div className="sr-card" style={{ animationDelay: "0.15s" }}>
                  <ProductCard batch={qrRecord.batches} showCoa={showCoa} />
                </div>
              )}
              {eventCheckins.map((ec, i) => (
                <div
                  key={i}
                  className="sr-card"
                  style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                >
                  <EventCheckinCard
                    eventName={ec.eventName}
                    checkedIn={ec.checkedIn}
                  />
                </div>
              ))}
              {customMessages.map((msg, i) => (
                <div
                  key={i}
                  className="sr-card"
                  style={{ animationDelay: `${0.25 + i * 0.05}s` }}
                >
                  <CustomMessageCard action={msg} navigate={navigate} />
                </div>
              ))}
              {showGpsPrompt && (
                <div className="sr-card" style={{ animationDelay: "0s" }}>
                  <GpsConsentBanner
                    onAllow={handleGpsAllow}
                    onDeny={handleGpsDeny}
                  />
                </div>
              )}

              <div
                className="sr-card"
                style={{
                  animationDelay: "0.45s",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                <button
                  onClick={() => navigate("/scan")}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.accent,
                    cursor: "pointer",
                    fontFamily: "Jost, sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  ← Scan Another Code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
