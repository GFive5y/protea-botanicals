// src/pages/Loyalty.js v5.6
// Protea Botanicals — Phase 1 Communications build
// v5.6 changes from v5.5:
//   - Fetches user's current monthly rank via get_user_monthly_rank() RPC
//   - Shows rank badge in the tier perks card (e.g. "#4 this month")
//   - Adds 🏆 Leaderboard link button below the tier perks card
//   All v5.5 config/referral/tier/transaction logic — unchanged

import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import ClientHeader from "../components/ClientHeader";
import LoyaltyBadges from "../components/LoyaltyBadges";

const DEFAULT_CONFIG = {
  pts_qr_scan: 10,
  pts_per_r100_online: 2.0,
  online_bonus_pct: 50,
  mult_bronze: 1.0,
  mult_silver: 1.25,
  mult_gold: 1.5,
  mult_platinum: 2.0,
  threshold_silver: 200,
  threshold_gold: 500,
  threshold_platinum: 1000,
  redemption_value_zar: 0.1,
  pts_referral_referrer: 100,
  pts_referral_referee: 50,
  pts_expiry_months: 24,
};

function getTierFromConfig(pts, cfg) {
  if (pts >= cfg.threshold_platinum)
    return {
      name: "Platinum",
      color: "#7b68ee",
      bg: "rgba(123,104,238,0.12)",
      icon: "💎",
      nextTier: null,
      nextMin: null,
      mult: cfg.mult_platinum,
    };
  if (pts >= cfg.threshold_gold)
    return {
      name: "Gold",
      color: "#b5935a",
      bg: "rgba(181,147,90,0.15)",
      icon: "🥇",
      nextTier: "Platinum",
      nextMin: cfg.threshold_platinum,
      mult: cfg.mult_gold,
    };
  if (pts >= cfg.threshold_silver)
    return {
      name: "Silver",
      color: "#8e9ba8",
      bg: "rgba(136,136,136,0.12)",
      icon: "🥈",
      nextTier: "Gold",
      nextMin: cfg.threshold_gold,
      mult: cfg.mult_silver,
    };
  return {
    name: "Bronze",
    color: "#a0674b",
    bg: "rgba(160,103,75,0.12)",
    icon: "🥉",
    nextTier: "Silver",
    nextMin: cfg.threshold_silver,
    mult: cfg.mult_bronze,
  };
}

function formatDateTime(dateStr, fallback) {
  const str = dateStr || fallback;
  if (!str) return "Date unknown";
  try {
    const d = new Date(str);
    const date = d.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} · ${time}`;
  } catch {
    return "Date unknown";
  }
}

function generateCode(fullName) {
  const name =
    (fullName || "USER")
      .split(" ")[0]
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 6) || "USER";
  const num = Math.floor(Math.random() * 90 + 10);
  return `${name}${num}`;
}

const injectedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500;600&display=swap');
  @keyframes loyaltyFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes loyaltyProgressFill { from { width: 0%; } }
  @keyframes loyaltySpin { to { transform: rotate(360deg); } }
  .loyalty-txn-row { transition: box-shadow 0.2s ease, transform 0.2s ease; }
  .loyalty-txn-row:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
  .loyalty-tab-btn { transition: color 0.2s, border-color 0.2s; cursor: pointer; }
  .loyalty-tab-btn:hover { color: #1b4332 !important; }
  .loyalty-footer-link { transition: color 0.2s; }
  .loyalty-footer-link:hover { color: #52b788 !important; }
  .loyalty-copy-btn:hover { opacity: 0.8 !important; }
  @media (max-width: 600px) {
    .loyalty-browse-btn { width: 100% !important; box-sizing: border-box !important; }
  }
`;

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  warm: "#f4f0e8",
  border: "#e8e0d4",
  text: "#1a1a1a",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  blue: "#2c4a6e",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', sans-serif",
};

export default function Loyalty() {
  const [points, setPoints] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [referralCode, setReferralCode] = useState(null);
  const [referralUses, setReferralUses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("history");
  const [freshScan, setFreshScan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState(null);
  const [referralBanner, setReferralBanner] = useState(null);
  // v5.6: monthly rank
  const [monthlyRank, setMonthlyRank] = useState(null); // { rank, monthly_points }

  const location = useLocation();
  const navigate = useNavigate();

  const fetchLoyaltyData = useCallback(async () => {
    try {
      setError(null);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate("/account?return=/loyalty");
        return;
      }

      const [cfgRes, profileRes, txnRes] = await Promise.all([
        supabase.from("loyalty_config").select("*").single(),
        supabase.from("user_profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("loyalty_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false, nullsFirst: false })
          .limit(50),
      ]);

      const cfg = cfgRes.data || DEFAULT_CONFIG;
      setConfig(cfg);
      if (profileRes.error) {
        setPoints(0);
      } else {
        setPoints(profileRes.data?.loyalty_points || 0);
        setProfile(profileRes.data);
      }
      setUserId(user.id);
      setTransactions(txnRes.data || []);

      // v5.6: fetch monthly rank
      try {
        const { data: rankData } = await supabase.rpc("get_user_monthly_rank", {
          p_user_id: user.id,
        });
        if (rankData && rankData.length > 0) setMonthlyRank(rankData[0]);
        else setMonthlyRank(null);
      } catch (_) {
        setMonthlyRank(null);
      }

      // Ensure referral code exists
      const prof = profileRes.data;
      if (prof) {
        let code = prof.referral_code;
        if (!code) {
          const { data: existing } = await supabase
            .from("referral_codes")
            .select("code, uses_count")
            .eq("owner_id", user.id)
            .eq("is_active", true)
            .maybeSingle();
          if (existing) {
            code = existing.code;
            setReferralUses(existing.uses_count || 0);
            await supabase
              .from("user_profiles")
              .update({ referral_code: code })
              .eq("id", user.id);
          } else {
            let newCode = generateCode(prof.full_name),
              attempts = 0;
            while (attempts < 5) {
              const { error: insertErr } = await supabase
                .from("referral_codes")
                .insert({ code: newCode, owner_id: user.id });
              if (!insertErr) {
                await supabase
                  .from("user_profiles")
                  .update({ referral_code: newCode })
                  .eq("id", user.id);
                code = newCode;
                break;
              }
              newCode = generateCode(prof.full_name) + attempts;
              attempts++;
            }
          }
        } else {
          const { data: refData } = await supabase
            .from("referral_codes")
            .select("uses_count")
            .eq("code", code)
            .maybeSingle();
          setReferralUses(refData?.uses_count || 0);
        }
        setReferralCode(code || null);
      }

      // Notification banners
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data: bannerMsg } = await supabase
        .from("customer_messages")
        .select("id, subject, content, type")
        .eq("user_id", user.id)
        .in("type", ["referral_reward", "tier_upgrade", "streak_bonus"])
        .eq("read", false)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bannerMsg) {
        setReferralBanner(bannerMsg);
        setTimeout(async () => {
          await supabase
            .from("customer_messages")
            .update({ read: true })
            .eq("id", bannerMsg.id);
          setReferralBanner(null);
        }, 8000);
      }
    } catch (err) {
      console.error("Loyalty error:", err);
      setError(
        "Something went wrong loading your loyalty data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchLoyaltyData();
  }, [fetchLoyaltyData]);
  useEffect(() => {
    if (!loading) fetchLoyaltyData();
  }, [location.key]); // eslint-disable-line
  useEffect(() => {
    const handleFocus = () => {
      if (!loading) fetchLoyaltyData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchLoyaltyData, loading]);
  useEffect(() => {
    if (location.state?.freshScan) {
      setFreshScan(true);
      window.history.replaceState({}, document.title);
      const t = setTimeout(() => setFreshScan(false), 5000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  const tier =
    points !== null
      ? getTierFromConfig(points, config)
      : getTierFromConfig(0, config);
  const progress = tier.nextMin
    ? Math.min(100, Math.round(((points || 0) / tier.nextMin) * 100))
    : 100;
  const pointsToNext = tier.nextMin ? tier.nextMin - (points || 0) : 0;

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const shareWhatsApp = () => {
    if (!referralCode) return;
    const msg = `🌿 Hey! I use Protea Botanicals' loyalty programme and earn great rewards. Sign up with my referral code *${referralCode}* at checkout and you'll get ${config.pts_referral_referee} bonus points on your first order! 👉 https://proteabotanicals.co.za`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return (
      <>
        <ClientHeader variant="light" />
        <style>{injectedStyles}</style>
        <div
          style={{
            fontFamily: F.body,
            padding: "20px",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: C.white,
                border: "1px solid #e8e0d4",
                borderRadius: 2,
                padding: "16px 18px",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 22,
                  background: "#e8e0d4",
                  borderRadius: 2,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "55%",
                    height: 12,
                    background: "#e8e0d4",
                    borderRadius: 2,
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    width: "30%",
                    height: 10,
                    background: "#e8e0d4",
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ClientHeader variant="light" />
        <style>{injectedStyles}</style>
        <div
          style={{
            fontFamily: F.body,
            padding: "20px",
            maxWidth: 800,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: C.white,
              border: "1px solid #e8e0d4",
              borderRadius: 2,
              padding: "40px 24px",
              marginTop: 40,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2
              style={{
                fontFamily: F.heading,
                fontSize: 24,
                fontWeight: 400,
                color: C.text,
                marginBottom: 12,
              }}
            >
              Unable to Load Loyalty Data
            </h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchLoyaltyData();
              }}
              style={{
                background: C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                padding: "12px 32px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: F.body,
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ClientHeader variant="light" />
      <style>{injectedStyles}</style>
      <div
        style={{
          fontFamily: F.body,
          padding: "20px 20px 0",
          maxWidth: 800,
          margin: "0 auto",
          color: C.text,
        }}
      >
        {/* Notification banner */}
        {referralBanner && (
          <div
            style={{
              background:
                referralBanner.type === "tier_upgrade"
                  ? "linear-gradient(135deg, #1b4332, #2d6a4f)"
                  : referralBanner.type === "streak_bonus"
                    ? "#fff8e7"
                    : "linear-gradient(135deg, #b5935a, #a07840)",
              border:
                referralBanner.type === "streak_bonus"
                  ? "2px solid #b5935a"
                  : "none",
              borderRadius: 2,
              padding: "16px 24px",
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              animation: "loyaltyFadeUp 0.4s ease",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ fontSize: 28, flexShrink: 0 }}>
              {referralBanner.type === "tier_upgrade"
                ? "🏆"
                : referralBanner.type === "streak_bonus"
                  ? "🔥"
                  : "🎉"}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    referralBanner.type === "streak_bonus" ? "#b5935a" : "#fff",
                  marginBottom: 4,
                }}
              >
                {referralBanner.subject}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color:
                    referralBanner.type === "streak_bonus"
                      ? "#666"
                      : "rgba(255,255,255,0.8)",
                  lineHeight: 1.5,
                }}
              >
                {referralBanner.content?.split("\n")[0]}
              </div>
            </div>
            <button
              onClick={() => setReferralBanner(null)}
              style={{
                background: "none",
                border: "none",
                color:
                  referralBanner.type === "streak_bonus"
                    ? "#b5935a"
                    : "rgba(255,255,255,0.6)",
                fontSize: 18,
                cursor: "pointer",
                flexShrink: 0,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {freshScan && (
          <div
            style={{
              background: "rgba(82,183,136,0.08)",
              border: "1px solid rgba(82,183,136,0.25)",
              borderRadius: 2,
              padding: "14px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "loyaltyFadeUp 0.4s ease",
            }}
          >
            <span style={{ fontSize: 18, color: "#52b788" }}>✓</span>
            <span style={{ color: C.green, fontWeight: 500, fontSize: 14 }}>
              Points added! Your loyalty balance has been updated.
            </span>
          </div>
        )}

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#52b788",
              marginBottom: 8,
            }}
          >
            Loyalty Programme
          </div>
          <h1
            style={{
              fontFamily: F.heading,
              fontSize: "clamp(30px, 5vw, 40px)",
              fontWeight: 300,
              color: C.text,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Your Rewards
          </h1>
        </div>

        {/* Points card */}
        <div
          style={{
            background: C.white,
            border: "1px solid #e8e0d4",
            borderRadius: 2,
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            padding: "clamp(28px,4vw,40px) clamp(24px,3vw,32px)",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
            animation: "loyaltyFadeUp 0.5s ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 120,
              height: 120,
              background:
                "linear-gradient(135deg, transparent 50%, rgba(82,183,136,0.04) 50%)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#52b788",
              }}
            >
              Total Points
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              Current Tier
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: F.heading,
                fontSize: "clamp(48px,10vw,72px)",
                fontWeight: 300,
                color: "#52b788",
                lineHeight: 1,
              }}
            >
              {points || 0}
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "7px 20px",
                borderRadius: 2,
                background: tier.bg,
                border: `1px solid ${tier.color}`,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: tier.color,
                }}
              >
                {tier.icon} {tier.name}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, color: "#52b788", fontWeight: 500 }}>
              {tier.name}
            </span>
            {tier.nextTier ? (
              <span style={{ fontSize: 12, color: C.muted }}>
                {pointsToNext} pts to {tier.nextTier}
              </span>
            ) : (
              <span
                style={{ fontSize: 12, color: tier.color, fontWeight: 500 }}
              >
                ✦ Maximum tier reached
              </span>
            )}
          </div>
          <div
            style={{
              background: "#f4f0e8",
              borderRadius: 2,
              height: 5,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(90deg, #52b788, #2d6a4f)",
                height: "100%",
                borderRadius: 2,
                width: `${progress}%`,
                transition: "width 1s ease-out",
              }}
            />
          </div>
        </div>

        {/* ── TIER PERKS CARD (v5.5) + v5.6: rank badge ── */}
        <div
          style={{
            background: tier.bg,
            border: `1px solid ${tier.color}40`,
            borderLeft: `4px solid ${tier.color}`,
            borderRadius: 2,
            padding: "16px 20px",
            marginBottom: 16,
            animation: "loyaltyFadeUp 0.6s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: tier.color,
              }}
            >
              Your {tier.name} Tier Benefits
            </div>
            {/* v5.6: Monthly rank badge */}
            {monthlyRank && (
              <div
                style={{
                  background: "rgba(255,255,255,0.7)",
                  border: `1px solid ${tier.color}40`,
                  borderRadius: 20,
                  padding: "3px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: tier.color,
                }}
              >
                🏆 #{monthlyRank.rank} this month ·{" "}
                {Number(monthlyRank.monthly_points || 0).toLocaleString()} pts
              </div>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {[
              {
                icon: "✕",
                label: `${tier.mult}× points multiplier`,
                desc: `Every purchase earns ${tier.mult}× base points`,
              },
              {
                icon: "📦",
                label: `${config.pts_qr_scan * tier.mult} pts per QR scan`,
                desc: `Base ${config.pts_qr_scan} × ${tier.mult} tier bonus`,
              },
              {
                icon: "🛒",
                label: `${Math.round((400 / 100) * config.pts_per_r100_online * (1 + config.online_bonus_pct / 100) * tier.mult)} pts / R400 online`,
                desc: `Including ${config.online_bonus_pct}% online bonus`,
              },
              {
                icon: "🤝",
                label: `${config.pts_referral_referrer} pts per referral`,
                desc: `When your friend makes their first order`,
              },
            ].map((perk, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.6)",
                  borderRadius: 2,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: tier.color,
                    marginBottom: 3,
                  }}
                >
                  {perk.icon} {perk.label}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{perk.desc}</div>
              </div>
            ))}
          </div>
          {tier.nextTier && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: C.muted,
                borderTop: `1px solid ${tier.color}30`,
                paddingTop: 10,
              }}
            >
              🏆 Reach{" "}
              <strong style={{ color: tier.color }}>{tier.nextTier}</strong> at{" "}
              {tier.nextMin} pts to unlock{" "}
              {
                {
                  Silver: `${config.mult_silver}×`,
                  Gold: `${config.mult_gold}×`,
                  Platinum: `${config.mult_platinum}×`,
                }[tier.nextTier]
              }{" "}
              multiplier — {pointsToNext} pts to go
            </div>
          )}
        </div>

        {/* v5.6: Leaderboard link */}
        <div
          style={{ marginBottom: 24, animation: "loyaltyFadeUp 0.65s ease" }}
        >
          <Link
            to="/leaderboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: C.white,
              border: "1px solid #e8e0d4",
              borderRadius: 2,
              padding: "12px 20px",
              textDecoration: "none",
              fontFamily: F.body,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.green,
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            🏆 View Monthly Leaderboard
            {monthlyRank && (
              <span
                style={{
                  background: "rgba(82,183,136,0.12)",
                  color: "#52b788",
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                #{monthlyRank.rank}
              </span>
            )}
            <span style={{ color: "#52b788", fontSize: 14 }}>→</span>
          </Link>
        </div>

        {/* Referral Code Card */}
        {referralCode && (
          <div
            style={{
              background: C.white,
              border: "1px solid #e8e0d4",
              borderRadius: 2,
              padding: "20px 24px",
              marginBottom: 24,
              animation: "loyaltyFadeUp 0.7s ease",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#52b788",
                marginBottom: 4,
              }}
            >
              Share & Earn
            </div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 20,
                color: C.green,
                marginBottom: 8,
              }}
            >
              Your Referral Code
            </div>
            <div
              style={{
                fontSize: 13,
                color: C.muted,
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              Share your code with friends. You earn{" "}
              <strong style={{ color: C.gold }}>
                {config.pts_referral_referrer} pts
              </strong>{" "}
              when they place their first order, and they get{" "}
              <strong style={{ color: C.gold }}>
                {config.pts_referral_referee} pts
              </strong>{" "}
              as a welcome bonus.
              {referralUses > 0 && (
                <span style={{ color: C.accent, fontWeight: 600 }}>
                  {" "}
                  You've earned from {referralUses} referral
                  {referralUses !== 1 ? "s" : ""} so far!
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: "#f4f0e8",
                  border: "2px dashed #e8e0d4",
                  borderRadius: 4,
                  padding: "12px 24px",
                  fontFamily: "monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: C.green,
                }}
              >
                {referralCode}
              </div>
              <button
                className="loyalty-copy-btn"
                onClick={copyCode}
                style={{
                  padding: "12px 20px",
                  background: copied ? C.accent : C.green,
                  color: C.white,
                  border: "none",
                  borderRadius: 2,
                  fontFamily: F.body,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy Code"}
              </button>
              <button
                onClick={shareWhatsApp}
                style={{
                  padding: "12px 20px",
                  background: "#25D366",
                  color: C.white,
                  border: "none",
                  borderRadius: 2,
                  fontFamily: F.body,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                💬 Share via WhatsApp
              </button>
            </div>
            {config.pts_expiry_months > 0 && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
                Points expire after {config.pts_expiry_months} months of
                inactivity.
              </div>
            )}
          </div>
        )}

        {/* Refresh */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchLoyaltyData();
            }}
            style={{
              background: "transparent",
              color: C.green,
              border: "1px solid #1b4332",
              borderRadius: 2,
              padding: "10px 28px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: F.body,
            }}
          >
            Refresh Loyalty Data
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid #e8e0d4",
            marginBottom: 24,
          }}
        >
          {[
            { key: "history", label: "Transaction History" },
            { key: "badges", label: "🏅 Badges" },
            { key: "spend", label: "Spend Points" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className="loyalty-tab-btn"
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #1b4332"
                    : "2px solid transparent",
                padding: "12px 24px",
                marginBottom: -1,
                fontSize: 12,
                fontWeight: activeTab === tab.key ? 600 : 400,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: activeTab === tab.key ? C.green : C.muted,
                fontFamily: F.body,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transaction History */}
        {activeTab === "history" && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#52b788",
                marginBottom: 14,
              }}
            >
              Recent Activity
            </div>
            {transactions.length === 0 ? (
              <div
                style={{
                  background: C.white,
                  border: "1px solid #e8e0d4",
                  borderRadius: 2,
                  textAlign: "center",
                  padding: "48px 20px",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: C.text,
                  }}
                >
                  No transactions yet
                </p>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                  Scan a product QR code to start earning points!
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/scan")}
                  style={{
                    background: C.green,
                    color: C.white,
                    border: "none",
                    borderRadius: 2,
                    padding: "12px 32px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: F.body,
                  }}
                >
                  Scan Now
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {transactions.map((txn, i) => {
                  const rawType = (txn.transaction_type || "").toUpperCase();
                  const isSpent = rawType === "SPENT" || rawType === "REDEEMED";
                  const type = isSpent ? "SPENT" : "EARNED";
                  const displayPoints = txn.points || 0;
                  let description = txn.description || "";
                  if (!description && rawType === "SCAN")
                    description = "Scanned QR code";
                  if (!description)
                    description = isSpent ? "Points redeemed" : "Points earned";
                  const isFresh = freshScan && i === 0;
                  const hasMultiplier =
                    txn.multiplier_applied && txn.multiplier_applied > 1;
                  const tierAtTime = txn.tier_at_time;
                  return (
                    <div
                      key={txn.id || i}
                      className="loyalty-txn-row"
                      style={{
                        background: C.white,
                        border: "1px solid #e8e0d4",
                        borderLeft: isFresh
                          ? "3px solid #52b788"
                          : "1px solid #e8e0d4",
                        borderRadius: 2,
                        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        animation: `loyaltyFadeUp ${0.3 + i * 0.04}s ease`,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 2,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                            minWidth: 55,
                            textAlign: "center",
                            background:
                              type === "EARNED"
                                ? "rgba(82,183,136,0.12)"
                                : "rgba(181,147,90,0.12)",
                            color: type === "EARNED" ? "#52b788" : "#b5935a",
                            marginTop: 2,
                          }}
                        >
                          {type}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 400,
                              color: C.text,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {description}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              marginTop: 2,
                            }}
                          >
                            {formatDateTime(
                              txn.transaction_date,
                              txn.created_at,
                            )}
                          </div>
                          {hasMultiplier && tierAtTime && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#7b68ee",
                                marginTop: 3,
                                fontWeight: 600,
                              }}
                            >
                              ✦ {tierAtTime} {txn.multiplier_applied}× bonus
                              applied
                            </div>
                          )}
                          {txn.channel && txn.channel !== "unknown" && (
                            <div
                              style={{
                                fontSize: 10,
                                color:
                                  txn.channel === "referral" ? C.gold : C.muted,
                                marginTop: 1,
                                fontWeight:
                                  txn.channel === "referral" ? 600 : 400,
                              }}
                            >
                              {{
                                qr_scan: "📱 QR Scan",
                                online_purchase: "🛒 Online Purchase",
                                referral: "🤝 Referral Reward",
                                profile_completion: "👤 Profile",
                                PROFILE_COMPLETION: "👤 Profile",
                                survey: "📋 Survey Bonus",
                              }[txn.channel] || txn.channel.replace(/_/g, " ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          fontFamily: F.heading,
                          color: type === "EARNED" ? "#52b788" : "#b5935a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {type === "EARNED" ? "+" : "-"}
                        {displayPoints} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === "badges" && (
          <div style={{ animation: "loyaltyFadeUp 0.3s ease" }}>
            <LoyaltyBadges userId={userId} profile={profile} />
          </div>
        )}

        {/* Spend Points Tab */}
        {activeTab === "spend" && (
          <div style={{ animation: "loyaltyFadeUp 0.3s ease" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
                borderRadius: 2,
                padding: "clamp(28px,4vw,40px)",
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "#52b788",
                  marginBottom: 8,
                }}
              >
                Rewards Store
              </div>
              <h2
                style={{
                  fontFamily: F.heading,
                  fontSize: "clamp(22px,4vw,30px)",
                  fontWeight: 300,
                  color: C.white,
                  margin: "0 0 8px",
                }}
              >
                Redeem Your Points
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                  marginBottom: 16,
                  maxWidth: 400,
                  margin: "0 auto 16px",
                }}
              >
                You have{" "}
                <strong style={{ color: "#52b788" }}>{points || 0}</strong>{" "}
                points available.
                {config.redemption_value_zar && (
                  <span
                    style={{ display: "block", marginTop: 4, fontSize: 12 }}
                  >
                    Each point = R{config.redemption_value_zar.toFixed(2)} →{" "}
                    {points || 0} pts = R
                    {((points || 0) * config.redemption_value_zar).toFixed(2)}{" "}
                    off
                  </span>
                )}
              </p>
              <button
                type="button"
                className="loyalty-browse-btn"
                onClick={() => navigate("/redeem")}
                disabled={(points || 0) < (config.min_pts_to_redeem || 50)}
                style={{
                  background:
                    (points || 0) >= (config.min_pts_to_redeem || 50)
                      ? "#52b788"
                      : "rgba(255,255,255,0.15)",
                  color: C.white,
                  border: "none",
                  borderRadius: 2,
                  padding: "12px 36px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor:
                    (points || 0) >= (config.min_pts_to_redeem || 50)
                      ? "pointer"
                      : "not-allowed",
                  fontFamily: F.body,
                }}
              >
                Browse Rewards →
              </button>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 10,
                }}
              >
                Minimum {config.min_pts_to_redeem || 50} points to redeem.
                {config.pts_expiry_months
                  ? ` Points expire after ${config.pts_expiry_months} months of inactivity.`
                  : " Points never expire."}
              </p>
            </div>
          </div>
        )}

        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, #e8e0d4, transparent)",
            margin: "40px 0",
          }}
        />

        {/* Dark footer */}
        <div
          style={{
            background: "#060e09",
            marginLeft: "calc(-50vw + 50%)",
            marginRight: "calc(-50vw + 50%)",
            width: "100vw",
            padding: "40px 20px",
            textAlign: "center",
            marginBottom: -40,
          }}
        >
          <p
            style={{
              fontFamily: F.heading,
              fontSize: 18,
              fontWeight: 300,
              color: C.white,
              margin: "0 0 16px",
              letterSpacing: "0.1em",
            }}
          >
            Protea Botanicals
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Home", to: "/" },
              { label: "Shop", to: "/shop" },
              { label: "Loyalty", to: "/loyalty" },
              { label: "Leaderboard", to: "/leaderboard" },
              { label: "Rewards", to: "/redeem" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="loyalty-footer-link"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  textDecoration: "none",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontFamily: F.body,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 10,
              marginTop: 20,
              letterSpacing: "0.1em",
            }}
          >
            © 2026 Protea Botanicals. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
