// src/pages/Redeem.js — v1.2 WP3 Cream Redesign
// ─────────────────────────────────────────────────────────────────────────────
// v1.0  Initial build — standalone page with own wrapper, footer, fonts
// v1.1  PageShell integration — removed duplicate wrapper/footer/font-import,
//       adjusted padding for 900px PageShell container, imported C from tokens,
//       simplified loading state
// v1.2  WP3 Cream Redesign — white cards (#e8e0d4 border), gold points cost,
//       refined hero, EARNED/SPENT badges, dark footer, mobile responsive.
//       ALL data logic preserved exactly from v1.1.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { C } from "../styles/tokens";

// CSS classes — font @import removed (PageShell handles Google Fonts)
const sharedStyles = `
  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 12px 32px;
    background: ${C.green};
    color: white;
    border: none;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }
  .pb-btn:hover { background: ${C.mid}; }
  .pb-btn:disabled { background: #ccc; cursor: not-allowed; }
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

  // Simplified loading state — PageShell provides background
  if (loading)
    return (
      <>
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
              color: C.muted,
              letterSpacing: "0.2em",
              fontSize: "12px",
              textTransform: "uppercase",
            }}
          >
            Loading...
          </p>
        </div>
      </>
    );

  return (
    <>
      <style>{sharedStyles}</style>

      {/* ─── HERO ─── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.green} 0%, ${C.mid} 100%)`,
          padding: "clamp(40px, 6vw, 64px) 24px",
          textAlign: "center",
          borderRadius: "2px",
          animation: "redeemFadeUp 0.4s ease",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "10px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: C.accent,
          }}
        >
          Loyalty Rewards
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(30px, 5vw, 48px)",
            fontWeight: 300,
            color: C.cream,
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
        {/* Points display in hero */}
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
          <span
            className="shop-font"
            style={{
              fontSize: "clamp(36px, 8vw, 56px)",
              fontWeight: 300,
              color: C.accent,
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
              background: "rgba(82,183,136,0.08)",
              border: "1px solid rgba(82,183,136,0.25)",
              borderRadius: "2px",
              padding: "14px 24px",
              marginBottom: "20px",
              animation: "redeemFadeUp 0.3s ease",
            }}
          >
            <p
              className="body-font"
              style={{ color: C.green, fontSize: "14px", margin: 0 }}
            >
              ✓ {success}
            </p>
          </div>
        )}
        {error && (
          <div
            style={{
              background: "rgba(181,147,90,0.08)",
              border: "1px solid rgba(181,147,90,0.25)",
              borderRadius: "2px",
              padding: "14px 24px",
              marginBottom: "20px",
            }}
          >
            <p
              className="body-font"
              style={{ color: "#b5935a", fontSize: "14px", margin: 0 }}
            >
              {error}
            </p>
          </div>
        )}

        {/* ─── SECTION LABEL ─── */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
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
                  background: "white",
                  border: `1px solid ${canAfford ? "#e8e0d4" : "#f0ebe2"}`,
                  borderRadius: "2px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  overflow: "hidden",
                  opacity: canAfford ? 1 : 0.6,
                  animation: `redeemFadeUp ${0.3 + i * 0.07}s ease`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Card content */}
                <div style={{ padding: "24px 24px 0" }}>
                  {/* Icon + Category */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{reward.icon}</span>
                    {canAfford && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "#52b788",
                          background: "rgba(82,183,136,0.08)",
                          padding: "3px 10px",
                          borderRadius: 2,
                        }}
                      >
                        Available
                      </span>
                    )}
                    {!canAfford && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "#888",
                          background: "rgba(136,136,136,0.08)",
                          padding: "3px 10px",
                          borderRadius: 2,
                        }}
                      >
                        {reward.cost - points} pts needed
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3
                    className="shop-font"
                    style={{
                      fontSize: "20px",
                      fontWeight: 400,
                      color: C.text,
                      marginBottom: "8px",
                      lineHeight: 1.3,
                    }}
                  >
                    {reward.name}
                  </h3>

                  {/* Description */}
                  <p
                    className="body-font"
                    style={{
                      fontSize: "13px",
                      color: C.muted,
                      fontWeight: 300,
                      lineHeight: 1.6,
                      marginBottom: "20px",
                    }}
                  >
                    {reward.desc}
                  </p>
                </div>

                {/* Cost + button footer */}
                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid #f4f0e8",
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
                      color: "#b5935a",
                      fontWeight: 600,
                    }}
                  >
                    {reward.cost}{" "}
                    <span
                      style={{ fontSize: 12, fontWeight: 400, color: "#888" }}
                    >
                      pts
                    </span>
                  </span>
                  <button
                    className="pb-btn"
                    style={{
                      padding: "8px 20px",
                      background: canAfford ? C.green : "#ccc",
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
            background: "#f4f0e8",
            borderRadius: 2,
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
              color: "#1a1a1a",
              margin: "0 0 12px",
            }}
          >
            Want to check your full transaction history?
          </p>
          <button
            className="pb-btn"
            style={{
              background: "transparent",
              color: "#1b4332",
              border: "1px solid #1b4332",
            }}
            onClick={() => navigate("/loyalty")}
            onMouseEnter={(e) => {
              e.target.style.background = "#1b4332";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#1b4332";
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
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 18,
              fontWeight: 300,
              color: "#fff",
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
                  letterSpacing: "0.2em",
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
