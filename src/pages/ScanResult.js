// src/pages/ScanResult.js v4.2
// Protea Botanicals — WP-M QR Engine v2.0
// March 2026
// ★ v4.2 changes (from v4.1):
//   - WP-N: Replaced manual green <header> with <ClientHeader variant="light" />
//   - All scan engine logic, logging, GPS flow unchanged from v4.1
// ★ v4.1: scan_logs, loyalty_transactions, IP geo, GPS opt-in, device detection, scan_outcome

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import ClientHeader from "../components/ClientHeader";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`;

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  text: "#1a1a1a",
  muted: "#888888",
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

// ── Sub-components ───────────────────────────────────────────────────────────

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
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}
      >
        <span style={pill(C.lightGreen, C.success)}>✓ Authentic</span>
        <span style={pill(C.cream, C.blue)}>Batch {batch.batch_number}</span>
        {batch.volume && (
          <span style={pill(C.cream, C.muted)}>{batch.volume}</span>
        )}
      </div>
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

function PointsCard({ pointsAwarded, totalPoints, skipped, skipReason }) {
  if (skipped) {
    return (
      <div style={card({ background: C.cream })}>
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
          {skipReason}
        </div>
      </div>
    );
  }
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
      <div style={{ fontSize: 12, color: C.mid, marginTop: 8 }}>
        Your total: <strong>{totalPoints}</strong> pts
      </div>
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

  const [banner, setBanner] = useState(null);
  const [showProduct, setShowProduct] = useState(false);
  const [showCoa, setShowCoa] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsSkipped, setPointsSkipped] = useState(false);
  const [pointsSkipReason, setPointsSkipReason] = useState("");
  const [customMessages, setCustomMessages] = useState([]);
  const [eventCheckins, setEventCheckins] = useState([]);
  const [hasPoints, setHasPoints] = useState(false);

  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const [scanLogId, setScanLogId] = useState(null);

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

    try {
      const { data: qrRows, error: qrErr } = await supabase
        .from("qr_codes")
        .select(
          `*, batches(batch_number, product_name, strain, volume, coa_document_id)`,
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
            points: qr.points_value || 10,
            one_time: true,
          },
          { action: "show_product", show_coa: true },
        ];
      }

      let pointsAwardedAmt = 0;
      let pointsWasSkipped = false;
      let pointsWasSkipReason = "";
      let pendingRedirect = null;

      for (const action of actions) {
        switch (action.action) {
          case "award_points": {
            setHasPoints(true);
            if (!currentUser) {
              setPointsSkipped(true);
              setPointsSkipReason("Sign in to earn points on this scan.");
              pointsWasSkipped = true;
              pointsWasSkipReason = "not_logged_in";
              break;
            }
            const pts = action.points || qr.points_value || 10;
            if (
              action.one_time &&
              qr.claimed &&
              qr.claimed_by === currentUser.id
            ) {
              setPointsSkipped(true);
              setPointsSkipReason(
                "You've already claimed points from this code.",
              );
              pointsWasSkipped = true;
              pointsWasSkipReason = "already_claimed";
              break;
            }
            if (!action.one_time && action.cooldown_hrs && qr.last_scan_at) {
              const hrs =
                (Date.now() - new Date(qr.last_scan_at).getTime()) / 3600000;
              if (hrs < action.cooldown_hrs) {
                const remaining = Math.ceil(action.cooldown_hrs - hrs);
                setPointsSkipped(true);
                setPointsSkipReason(
                  `Cooldown active — try again in ${remaining}h.`,
                );
                pointsWasSkipped = true;
                pointsWasSkipReason = "cooldown";
                break;
              }
            }
            const currentPts = profile?.loyalty_points || 0;
            const newTotal = currentPts + pts;
            const { error: ptErr } = await supabase
              .from("user_profiles")
              .update({ loyalty_points: newTotal })
              .eq("id", currentUser.id);
            if (!ptErr) {
              pointsAwardedAmt = pts;
              setPointsAwarded(pts);
              setTotalPoints(newTotal);
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
        outcome: "success",
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
          description: `Scanned ${productLabel}`,
          scanLogId: logId,
        });
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
  }, [qrCode, navigate, writeScanLog, writeLoyaltyTransaction]);

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
        @keyframes sr-fadein {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-card { animation: sr-fadein 0.35s ease both; }
        @keyframes sr-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .sr-pts { animation: sr-pulse 0.6s ease 0.3s 2; }
        `}
      </style>

      {/* ── WP-N: light variant — cream unscrolled → green on scroll ── */}
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
                  />
                </div>
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

              {!user && hasPoints && (
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
