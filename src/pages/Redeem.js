// src/pages/Redeem.js — v1.1 PageShell integration
// ─────────────────────────────────────────────────────────────────────────────
// v1.0  Initial build — standalone page with own wrapper, footer, fonts
// v1.1  PageShell integration — removed duplicate wrapper/footer/font-import,
//       adjusted padding for 900px PageShell container, imported C from tokens,
//       simplified loading state
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { C } from "../styles/tokens";

// CSS classes only — font @import removed (PageShell handles Google Fonts)
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
  .reward-card { transition: transform 0.2s, box-shadow 0.2s; }
  .reward-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.08) !important; }
`;

const REWARDS = [
  {
    id: 1,
    name: "10% Off Next Order",
    cost: 200,
    icon: "◇",
    desc: "Receive a unique discount code for 10% off your next purchase.",
  },
  {
    id: 2,
    name: "Free Terpene Sample",
    cost: 350,
    icon: "❋",
    desc: "Choose any 2ml terpene sample from our collection, shipped free.",
  },
  {
    id: 3,
    name: "Premium Cart Upgrade",
    cost: 500,
    icon: "◈",
    desc: "Upgrade your next cart purchase to premium 2ml at no extra cost.",
  },
  {
    id: 4,
    name: "Free Delivery",
    cost: 150,
    icon: "○",
    desc: "Free delivery on your next online order, no minimum spend.",
  },
  {
    id: 5,
    name: "R100 Store Credit",
    cost: 400,
    icon: "△",
    desc: "R100 credit applied directly to your account for any purchase.",
  },
  {
    id: 6,
    name: "VIP Tasting Bundle",
    cost: 1000,
    icon: "◉",
    desc: "Exclusive curated bundle of our top 5 products, reserved for Reserve members.",
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

      {/* Hero — sits inside PageShell's 900px content area */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.green} 0%, ${C.mid} 100%)`,
          padding: "64px 24px",
          textAlign: "center",
          borderRadius: "2px",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: C.accent,
          }}
        >
          LOYALTY REWARDS
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 300,
            color: C.cream,
            margin: "12px 0",
          }}
        >
          Redeem Points
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "15px",
            fontWeight: 300,
          }}
        >
          Exchange your loyalty points for exclusive rewards.
        </p>
      </div>

      <div style={{ padding: "48px 0" }}>
        {/* Points Balance */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.green}, ${C.mid})`,
            borderRadius: "2px",
            padding: "32px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "40px",
            boxShadow: "0 4px 16px rgba(27,67,50,0.2)",
          }}
        >
          <div>
            <p
              className="body-font"
              style={{
                color: C.accent,
                fontSize: "11px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Available Points
            </p>
            <p
              className="shop-font"
              style={{
                color: "white",
                fontSize: "56px",
                fontWeight: 300,
                lineHeight: 1,
              }}
            >
              {points.toLocaleString()}
            </p>
          </div>
          <button
            className="pb-btn"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
            onClick={() => navigate("/loyalty")}
          >
            View History
          </button>
        </div>

        {/* Messages */}
        {success && (
          <div
            style={{
              background: "#e8f5e9",
              border: `1px solid ${C.mid}`,
              borderRadius: "2px",
              padding: "16px 24px",
              marginBottom: "24px",
            }}
          >
            <p className="body-font" style={{ color: C.mid, fontSize: "14px" }}>
              ✓ {success}
            </p>
          </div>
        )}
        {error && (
          <div
            style={{
              background: "#fdecea",
              border: `1px solid ${C.error}`,
              borderRadius: "2px",
              padding: "16px 24px",
              marginBottom: "24px",
            }}
          >
            <p
              className="body-font"
              style={{ color: C.error, fontSize: "14px" }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Rewards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "20px",
          }}
        >
          {REWARDS.map((reward) => {
            const canAfford = points >= reward.cost;
            return (
              <div
                key={reward.id}
                className="reward-card"
                style={{
                  background: "white",
                  border: `1px solid ${canAfford ? "#e8e0d4" : "#f0ebe2"}`,
                  borderRadius: "2px",
                  overflow: "hidden",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                  opacity: canAfford ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    background: canAfford
                      ? `linear-gradient(135deg, ${C.green}, ${C.mid})`
                      : "linear-gradient(135deg, #555, #777)",
                    padding: "32px",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "40px",
                      color: canAfford ? C.accent : "#aaa",
                    }}
                  >
                    {reward.icon}
                  </span>
                </div>
                <div style={{ padding: "24px" }}>
                  <h3
                    className="shop-font"
                    style={{
                      fontSize: "20px",
                      fontWeight: 400,
                      color: C.text,
                      marginBottom: "8px",
                    }}
                  >
                    {reward.name}
                  </h3>
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="shop-font"
                      style={{
                        fontSize: "22px",
                        color: C.mid,
                        fontWeight: 600,
                      }}
                    >
                      {reward.cost} pts
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
                      {redeeming === reward.id ? "..." : "Redeem"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <button className="pb-btn" onClick={() => navigate("/scan")}>
            Earn More Points
          </button>
        </div>
      </div>
    </>
  );
}
