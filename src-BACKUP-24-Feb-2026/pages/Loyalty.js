// src/pages/Loyalty.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 12px 32px;
    background: #1b4332;
    color: white;
    border: none;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }
  .pb-btn:hover { background: #2d6a4f; }
  .scan-row { transition: background 0.15s; }
  .scan-row:hover { background: #f4f0e8 !important; }
`;

const TIERS = [
  { name: "Seedling", min: 0, max: 199, icon: "○", color: "#888" },
  { name: "Sprout", min: 200, max: 499, icon: "◇", color: "#52b788" },
  { name: "Bloom", min: 500, max: 999, icon: "❋", color: "#b5935a" },
  { name: "Reserve", min: 1000, max: Infinity, icon: "◈", color: "#2d6a4f" },
];

export default function Loyalty() {
  const [profile, setProfile] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/account");
      return;
    }

    const [{ data: prof }, { data: scanData }] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("scans")
        .select("*, qr_codes(*, products(name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setProfile(prof);
    setScans(scanData || []);
    setLoading(false);
  };

  const points = profile?.loyalty_points || 0;
  const tier =
    TIERS.find((t) => points >= t.min && points <= t.max) || TIERS[0];
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const progress = nextTier
    ? ((points - tier.min) / (nextTier.min - tier.min)) * 100
    : 100;

  if (loading)
    return (
      <div
        style={{
          background: "#faf9f6",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <style>{sharedStyles}</style>
        <p
          className="body-font"
          style={{
            color: "#888",
            letterSpacing: "0.2em",
            fontSize: "12px",
            textTransform: "uppercase",
          }}
        >
          Loading...
        </p>
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#faf9f6",
        minHeight: "100vh",
      }}
    >
      <style>{sharedStyles}</style>

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
          padding: "64px 40px",
          textAlign: "center",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
          }}
        >
          REWARDS PROGRAMME
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "12px 0",
          }}
        >
          Your Loyalty
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "15px",
            fontWeight: 300,
          }}
        >
          Scan products, earn points, unlock rewards.
        </p>
      </div>

      <div
        style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px" }}
      >
        {/* Points + Tier Card */}
        <div
          style={{
            background: "white",
            border: "1px solid #e8e0d4",
            borderRadius: "2px",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
              padding: "40px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "24px",
            }}
          >
            <div>
              <p
                className="body-font"
                style={{
                  color: "#52b788",
                  fontSize: "11px",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Total Points
              </p>
              <p
                className="shop-font"
                style={{
                  color: "white",
                  fontSize: "64px",
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                {points.toLocaleString()}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                className="body-font"
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Current Tier
              </p>
              <p style={{ fontSize: "36px" }}>{tier.icon}</p>
              <p
                className="shop-font"
                style={{
                  color: tier.color === "#888" ? "white" : tier.color,
                  fontSize: "24px",
                  fontWeight: 400,
                }}
              >
                {tier.name}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {nextTier && (
            <div
              style={{ padding: "24px 40px", borderTop: "1px solid #e8e0d4" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  className="body-font"
                  style={{ fontSize: "12px", color: "#888" }}
                >
                  {tier.name}
                </span>
                <span
                  className="body-font"
                  style={{ fontSize: "12px", color: "#888" }}
                >
                  {nextTier.min - points} pts to {nextTier.name}
                </span>
              </div>
              <div
                style={{
                  background: "#f4f0e8",
                  borderRadius: "2px",
                  height: "6px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #1b4332, #52b788)",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tier Guide */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {TIERS.map((t) => (
            <div
              key={t.name}
              style={{
                background: t.name === tier.name ? "white" : "#f9f6f0",
                border: `1px solid ${t.name === tier.name ? "#2d6a4f" : "#e8e0d4"}`,
                borderRadius: "2px",
                padding: "20px",
                textAlign: "center",
                boxShadow:
                  t.name === tier.name
                    ? "0 4px 16px rgba(45,106,79,0.12)"
                    : "none",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                {t.icon}
              </div>
              <p
                className="shop-font"
                style={{
                  fontSize: "18px",
                  color: "#1a1a1a",
                  marginBottom: "4px",
                }}
              >
                {t.name}
              </p>
              <p
                className="body-font"
                style={{
                  fontSize: "11px",
                  color: "#aaa",
                  letterSpacing: "0.1em",
                }}
              >
                {t.max === Infinity ? `${t.min}+ pts` : `${t.min}–${t.max} pts`}
              </p>
            </div>
          ))}
        </div>

        {/* Scan History */}
        <div
          style={{
            background: "white",
            border: "1px solid #e8e0d4",
            borderRadius: "2px",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{ padding: "24px 32px", borderBottom: "1px solid #e8e0d4" }}
          >
            <h2
              className="shop-font"
              style={{ fontSize: "24px", fontWeight: 400, color: "#1a1a1a" }}
            >
              Scan History
            </h2>
          </div>

          {scans.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>◎</div>
              <p
                className="body-font"
                style={{ color: "#aaa", fontSize: "14px" }}
              >
                No scans yet. Scan a product to start earning.
              </p>
              <button
                className="pb-btn"
                style={{ marginTop: "24px" }}
                onClick={() => navigate("/scan")}
              >
                Scan a Product
              </button>
            </div>
          ) : (
            scans.map((scan, i) => (
              <div
                key={scan.id}
                className="scan-row"
                style={{
                  padding: "16px 32px",
                  borderBottom:
                    i < scans.length - 1 ? "1px solid #f0ebe2" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "white",
                }}
              >
                <div>
                  <p
                    className="shop-font"
                    style={{
                      fontSize: "17px",
                      color: "#1a1a1a",
                      fontWeight: 400,
                    }}
                  >
                    {scan.qr_codes?.products?.name || "Product"}
                  </p>
                  <p
                    className="body-font"
                    style={{ fontSize: "12px", color: "#aaa", fontWeight: 300 }}
                  >
                    {new Date(scan.created_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className="body-font"
                  style={{
                    color: "#2d6a4f",
                    fontWeight: 500,
                    fontSize: "14px",
                  }}
                >
                  +{scan.qr_codes?.points_value || 10} pts
                </span>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "32px",
            flexWrap: "wrap",
          }}
        >
          <button className="pb-btn" onClick={() => navigate("/scan")}>
            Scan a Product
          </button>
          <button
            className="pb-btn"
            style={{ background: "#b5935a" }}
            onClick={() => navigate("/redeem")}
          >
            Redeem Points
          </button>
        </div>
      </div>

      <footer
        style={{
          background: "#1a1a1a",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#faf9f6", letterSpacing: "0.2em" }}
        >
          PROTEA
        </span>
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#52b788", letterSpacing: "0.2em" }}
        >
          {" "}
          BOTANICALS
        </span>
        <p
          className="body-font"
          onClick={() => navigate("/")}
          style={{
            fontSize: "11px",
            color: "#555",
            marginTop: "12px",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </p>
      </footer>
    </div>
  );
}
