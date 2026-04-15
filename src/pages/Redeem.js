// src/pages/Redeem.js — v1.3 WP-N ClientHeader Integration
// ─────────────────────────────────────────────────────────────────────────────
// v1.3  WP-N: ClientHeader variant="light" added to all render branches.
//       PageShell removed — Google Fonts @import and .shop-font / .body-font
//       class definitions restored into sharedStyles (were provided by PageShell).
//       All v1.2 data logic and layout preserved exactly.
// v1.2  WP3 Cream Redesign — white cards (#e8e0d4 border), gold points cost,
//       refined hero, EARNED/SPENT badges, dark footer, mobile responsive.
// v1.1  PageShell integration — removed duplicate wrapper/footer/font-import.
// v1.0  Initial build.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { T } from "../styles/tokens";
import ClientHeader from "../components/ClientHeader";

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500;600&display=swap');

  /* Font utility classes (previously provided by PageShell) */
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font  { font-family: 'Jost', sans-serif; }

  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 12px 32px;
    background: ${T.accent};
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }
  .pb-btn:hover { background: ${T.accentMid}; }
  .pb-btn:disabled { background: #dee2e6; cursor: not-allowed; }
  .reward-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
  .reward-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
  @keyframes redeemFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .redeem-footer-link { transition: color 0.2s; }
  .redeem-footer-link:hover { color: #52b788 !important; }
`;

const REWARDS = [
  {
    id: 1,
    name: "10% Off Next Order",
    cost: 200,
    icon: "🏷️",
    desc: "Receive a unique discount code for 10% off your next purchase.",
  },
  {
    id: 2,
    name: "Free Terpene Sample",
    cost: 350,
    icon: "🌿",
    desc: "Choose any 2ml terpene sample from our collection, shipped free.",
  },
  {
    id: 3,
    name: "Premium Cart Upgrade",
    cost: 500,
    icon: "✨",
    desc: "Upgrade your next cart purchase to premium 2ml at no extra cost.",
  },
  {
    id: 4,
    name: "Free Delivery",
    cost: 150,
    icon: "📦",
    desc: "Free delivery on your next online order, no minimum spend.",
  },
  {
    id: 5,
    name: "R100 Store Credit",
    cost: 400,
    icon: "💎",
    desc: "R100 credit applied directly to your account for any purchase.",
  },
  {
    id: 6,
    name: "VIP Tasting Bundle",
    cost: 1000,
    icon: "⭐",
    desc: "Exclusive curated bundle of our top 5 products, reserved for VIP members.",
  },
];

export default function Redeem() {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/account");
      return;
    }
    const { data } = await supabase
      .from("user_profiles")
      .select("loyalty_points")
      .eq("id", user.id)
      .single();
    setPoints(data?.loyalty_points || 0);
    setLoading(false);
  };

  const handleRedeem = async (reward) => {
    if (points < reward.cost) return;
    setRedeeming(reward.id);
    setError("");
    setSuccess("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: err } = await supabase.rpc("redeem_reward", {
      uid: user.id,
      cost: reward.cost,
      reward_name: reward.name,
    });
    if (err) setError("Redemption failed. Please try again.");
    else {
      setPoints((p) => p - reward.cost);
      setSuccess(`"${reward.name}" redeemed! Check your email for details.`);
    }
    setRedeeming(null);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <ClientHeader variant="light" />
        <style>{sharedStyles}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "120px 0",
          }}
        >
          <p
            className="body-font"
            style={{
              color: T.ink600,
              letterSpacing: "0.08em",
              fontSize: "12px",
              textTransform: "uppercase",
            }}
          >
            Loading...
          </p>
        </div>
      </>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <>
      <ClientHeader variant="light" />
      <style>{sharedStyles}</style>

      {/* ─── HERO ─── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentMid} 100%)`,
          padding: "clamp(40px, 6vw, 64px) 24px",
          textAlign: "center",
          borderRadius: T.radius.sm,
          animation: "redeemFadeUp 0.4s ease",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: T.accentLight,
          }}
        >
          Loyalty Rewards
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(30px, 5vw, 48px)",
            fontWeight: 300,
            color: T.bg,
            margin: "12px 0 8px",
          }}
        >
          Redeem Points
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "14px",
            fontWeight: 300,
            marginBottom: 16,
          }}
        >
          Exchange your loyalty points for exclusive rewards.
        </p>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
          <span
            className="shop-font"
            style={{
              fontSize: "clamp(36px, 8vw, 56px)",
              fontWeight: 300,
              color: T.accentLight,
              lineHeight: 1,
            }}
          >
            {points.toLocaleString()}
          </span>
          <span
            className="body-font"
            style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}
          >
            points available
          </span>
        </div>
      </div>

      <div style={{ padding: "40px 0 0" }}>
        {/* ─── MESSAGES ─── */}
        {success && (
          <div
            style={{
              background: T.accentLight,
              border: `1px solid ${T.accentBd}`,
              borderRadius: T.radius.sm,
              padding: "14px 24px",
              marginBottom: "20px",
              animation: "redeemFadeUp 0.3s ease",
            }}
          >
            <p
              className="body-font"
              style={{ color: T.accent, fontSize: "14px", margin: 0 }}
            >
              ✓ {success}
            </p>
          </div>
        )}
        {error && (
          <div
            style={{
              background: T.warningLight,
              border: `1px solid ${T.warningBd}`,
              borderRadius: T.radius.sm,
              padding: "14px 24px",
              marginBottom: "20px",
            }}
          >
            <p
              className="body-font"
              style={{ color: T.brandGold, fontSize: "14px", margin: 0 }}
            >
              {error}
            </p>
          </div>
        )}

        {/* ─── SECTION LABEL ─── */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: T.accent,
            marginBottom: 16,
          }}
        >
          Available Rewards
        </div>

        {/* ─── REWARDS GRID ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: 40,
          }}
        >
          {REWARDS.map((reward, i) => {
            const canAfford = points >= reward.cost;
            return (
              <div
                key={reward.id}
                className={canAfford ? "reward-card" : ""}
                style={{
                  background: T.surface,
                  border: `1px solid ${canAfford ? T.border : T.border}`,
                  borderRadius: T.radius.sm,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                  opacity: canAfford ? 1 : 0.6,
                  animation: `redeemFadeUp ${0.3 + i * 0.07}s ease`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ padding: "24px 24px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{reward.icon}</span>
                    {canAfford ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: T.accent,
                          background: T.accentLight,
                          padding: "3px 10px",
                          borderRadius: T.radius.sm,
                        }}
                      >
                        Available
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: T.ink600,
                          background: T.bg,
                          padding: "3px 10px",
                          borderRadius: T.radius.sm,
                        }}
                      >
                        {reward.cost - points} pts needed
                      </span>
                    )}
                  </div>
                  <h3
                    className="shop-font"
                    style={{
                      fontSize: "20px",
                      fontWeight: 400,
                      color: T.ink900,
                      marginBottom: "8px",
                      lineHeight: 1.3,
                    }}
                  >
                    {reward.name}
                  </h3>
                  <p
                    className="body-font"
                    style={{
                      fontSize: "13px",
                      color: T.ink600,
                      fontWeight: 300,
                      lineHeight: 1.6,
                      marginBottom: "20px",
                    }}
                  >
                    {reward.desc}
                  </p>
                </div>
                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: `1px solid ${T.bg}`,
                    marginTop: "auto",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="shop-font"
                    style={{
                      fontSize: "22px",
                      color: T.brandGold,
                      fontWeight: 600,
                    }}
                  >
                    {reward.cost}{" "}
                    <span
                      style={{ fontSize: 12, fontWeight: 400, color: T.ink600 }}
                    >
                      pts
                    </span>
                  </span>
                  <button
                    className="pb-btn"
                    style={{
                      padding: "8px 20px",
                      background: canAfford ? T.accent : "#ccc",
                    }}
                    disabled={!canAfford || redeeming === reward.id}
                    onClick={() => handleRedeem(reward)}
                  >
                    {redeeming === reward.id
                      ? "..."
                      : canAfford
                        ? "Redeem"
                        : "Locked"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── LOYALTY CTA ─── */}
        <div
          style={{
            background: T.bg,
            borderRadius: T.radius.sm,
            padding: "clamp(20px, 3vw, 32px)",
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          <p
            className="shop-font"
            style={{
              fontSize: 20,
              fontWeight: 400,
              color: T.ink900,
              margin: "0 0 12px",
            }}
          >
            Want to check your full transaction history?
          </p>
          <button
            className="pb-btn"
            style={{
              background: "transparent",
              color: T.accentText,
              border: `1px solid ${T.accentText}`,
            }}
            onClick={() => navigate("/loyalty")}
            onMouseEnter={(e) => {
              e.target.style.background = T.accentText;
              e.target.style.color = T.surface;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = T.accentText;
            }}
          >
            View Loyalty Dashboard
          </button>
        </div>

        {/* ─── EARN MORE CTA ─── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <button className="pb-btn" onClick={() => navigate("/scan")}>
            Earn More Points
          </button>
        </div>

        {/* ─── SECTION DIVIDER ─── */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, #e8e0d4, transparent)",
            margin: "0 0 40px",
          }}
        />

        {/* ─── DARK FOOTER ─── */}
        <div
          style={{
            background: T.ink900,
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
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 18,
              fontWeight: 300,
              color: T.surface,
              margin: "0 0 16px",
              letterSpacing: "0.08em",
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
              { label: "Rewards", to: "/redeem" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="redeem-footer-link"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  textDecoration: "none",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "'Jost', sans-serif",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 11,
              marginTop: 20,
              letterSpacing: "0.08em",
            }}
          >
            © 2026 Protea Botanicals. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
