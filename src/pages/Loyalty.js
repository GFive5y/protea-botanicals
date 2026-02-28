// src/pages/Loyalty.js
// Protea Botanicals — Loyalty Programme Page
// v5.2 — WP3 Cream Redesign: white cards (#e8e0d4 border), Cormorant+Jost typography,
//        green/gold accents, EARNED/SPENT badges, dark footer. Mobile responsive.
//        ALL data logic preserved exactly from v5.1.
// v5.1 — Timestamp fix: fallback to created_at for legacy entries with NULL transaction_date.
//        Show "Date unknown" instead of blank. Version aligned with registry.
// v4.0 — Production-ready: ALWAYS fetches real Supabase data, NO dev mock override
// Tiers: Bronze (0–99), Silver (100–499), Gold (500+)

import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

// ─── TIER CONFIGURATION ───
const TIERS = [
  {
    name: "Bronze",
    min: 0,
    max: 99,
    color: "#b5935a",
    bg: "rgba(181,147,90,0.12)",
    nextTier: "Silver",
    nextMin: 100,
  },
  {
    name: "Silver",
    min: 100,
    max: 499,
    color: "#888888",
    bg: "rgba(136,136,136,0.12)",
    nextTier: "Gold",
    nextMin: 500,
  },
  {
    name: "Gold",
    min: 500,
    max: Infinity,
    color: "#e8c870",
    bg: "rgba(232,200,112,0.15)",
    nextTier: null,
    nextMin: null,
  },
];

function getTier(points) {
  const tier =
    TIERS.find((t) => points >= t.min && points <= t.max) || TIERS[0];
  const progress = tier.nextMin
    ? Math.min(100, Math.round((points / tier.nextMin) * 100))
    : 100;
  const pointsToNext = tier.nextMin ? tier.nextMin - points : 0;
  return { ...tier, progress, pointsToNext };
}

// ─── DATE FORMATTER ───
// v5.1: accepts fallback date for legacy entries with NULL transaction_date
// Includes time (HH:MM) for full timestamp display
function formatDate(dateStr, fallbackDateStr) {
  const str = dateStr || fallbackDateStr;
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

// ─── INJECTED STYLES ───
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
`;

export default function Loyalty() {
  const [points, setPoints] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("history");
  const [freshScan, setFreshScan] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // ─── FETCH REAL DATA FROM SUPABASE ───
  const fetchLoyaltyData = useCallback(async () => {
    try {
      setError(null);

      // 1. Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.warn("Loyalty: No authenticated user, redirecting to /account");
        navigate("/account?return=/loyalty");
        return;
      }

      // 2. Fetch user profile (points total)
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("loyalty_points, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(
          "Loyalty: Profile fetch error:",
          profileError.message,
          profileError.code,
          profileError.details,
        );
        // Don't block the page — show 0 points and continue
        setPoints(0);
      } else {
        setPoints(profile?.loyalty_points || 0);
      }

      // 3. Fetch transaction history
      // v5.1: nullsFirst:false pushes legacy NULL transaction_date rows to bottom
      const { data: txns, error: txnError } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false, nullsFirst: false })
        .limit(50);

      if (txnError) {
        console.error(
          "Loyalty: Transaction fetch error:",
          txnError.message,
          txnError.code,
          txnError.details,
        );
        setTransactions([]);
      } else {
        setTransactions(txns || []);
      }
    } catch (err) {
      console.error("Loyalty: Unexpected error:", err);
      setError(
        "Something went wrong loading your loyalty data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ─── INITIAL LOAD + REFETCH ON NAVIGATION ───
  useEffect(() => {
    fetchLoyaltyData();
  }, [fetchLoyaltyData]);

  // Refetch when navigating back from ScanResult (location changes)
  useEffect(() => {
    if (!loading) {
      fetchLoyaltyData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Refetch when window regains focus (user returns from another tab/page)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading) fetchLoyaltyData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchLoyaltyData, loading]);

  // Check for fresh scan state passed from ScanResult
  useEffect(() => {
    if (location.state?.freshScan) {
      setFreshScan(true);
      // Clear the state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setFreshScan(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // ─── COMPUTED VALUES ───
  const tier = getTier(points || 0);

  // ─── LOADING SKELETON ───
  if (loading) {
    return (
      <>
        <style>{injectedStyles}</style>
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            padding: "40px 20px",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                width: 140,
                height: 10,
                background: "#e8e0d4",
                borderRadius: 2,
                marginBottom: 12,
              }}
            />
            <div
              style={{
                width: 240,
                height: 28,
                background: "#e8e0d4",
                borderRadius: 2,
              }}
            />
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e8e0d4",
              borderRadius: 2,
              padding: "40px 32px",
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 100,
                height: 48,
                background: "#e8e0d4",
                borderRadius: 2,
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{
                width: 80,
                height: 12,
                background: "#e8e0d4",
                borderRadius: 2,
                margin: "0 auto",
              }}
            />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "#fff",
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

  // ─── ERROR STATE ───
  if (error) {
    return (
      <>
        <style>{injectedStyles}</style>
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            padding: "40px 20px",
            maxWidth: 800,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e8e0d4",
              borderRadius: 2,
              padding: "40px 24px",
              marginTop: 40,
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 24,
                fontWeight: 400,
                color: "#1a1a1a",
                marginBottom: 12,
              }}
            >
              Unable to Load Loyalty Data
            </h2>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
              {error}
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchLoyaltyData();
              }}
              style={{
                background: "#1b4332",
                color: "#fff",
                border: "none",
                borderRadius: 2,
                padding: "12px 32px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Jost', sans-serif",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── MAIN RENDER ───
  return (
    <>
      <style>{injectedStyles}</style>

      <div
        style={{
          fontFamily: "'Jost', sans-serif",
          padding: "40px 20px 0",
          maxWidth: 800,
          margin: "0 auto",
          color: "#1a1a1a",
        }}
      >
        {/* ─── FRESH SCAN BANNER ─── */}
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
            <span style={{ color: "#1b4332", fontWeight: 500, fontSize: 14 }}>
              Points added! Your loyalty balance has been updated.
            </span>
          </div>
        )}

        {/* ─── PAGE HEADER ─── */}
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
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(30px, 5vw, 40px)",
              fontWeight: 300,
              color: "#1a1a1a",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Your Rewards
          </h1>
        </div>

        {/* ─── POINTS CARD ─── */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e8e0d4",
            borderRadius: 2,
            boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            padding: "clamp(28px, 4vw, 40px) clamp(24px, 3vw, 32px)",
            marginBottom: 32,
            position: "relative",
            overflow: "hidden",
            animation: "loyaltyFadeUp 0.5s ease",
          }}
        >
          {/* Decorative corner */}
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
                color: "#888",
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
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(48px, 10vw, 72px)",
                fontWeight: 300,
                color: "#52b788",
                lineHeight: 1,
              }}
            >
              {points}
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
                {tier.name}
              </span>
            </div>
          </div>

          {/* Progress bar */}
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
            {tier.nextTier && (
              <span style={{ fontSize: 12, color: "#888" }}>
                {tier.pointsToNext} pts to {tier.nextTier}
              </span>
            )}
            {!tier.nextTier && (
              <span style={{ fontSize: 12, color: "#e8c870", fontWeight: 500 }}>
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
                width: `${tier.progress}%`,
                transition: "width 1s ease-out",
                animation: "loyaltyProgressFill 1.2s ease-out",
              }}
            />
          </div>
        </div>

        {/* ─── REFRESH BUTTON ─── */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchLoyaltyData();
            }}
            style={{
              background: "transparent",
              color: "#1b4332",
              border: "1px solid #1b4332",
              borderRadius: 2,
              padding: "10px 28px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Jost', sans-serif",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#1b4332";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#1b4332";
            }}
          >
            Refresh Loyalty Data
          </button>
        </div>

        {/* ─── TABS ─── */}
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
                color: activeTab === tab.key ? "#1b4332" : "#888888",
                fontFamily: "'Jost', sans-serif",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TRANSACTION HISTORY TAB ─── */}
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
                  background: "#fff",
                  border: "1px solid #e8e0d4",
                  borderRadius: 2,
                  textAlign: "center",
                  padding: "48px 20px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    marginBottom: 8,
                    color: "#1a1a1a",
                  }}
                >
                  No transactions yet
                </p>
                <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
                  Scan a product QR code to start earning points!
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/scan")}
                  style={{
                    background: "#1b4332",
                    color: "#fff",
                    border: "none",
                    borderRadius: 2,
                    padding: "12px 32px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    fontFamily: "'Jost', sans-serif",
                  }}
                >
                  Scan Now
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {transactions.map((txn, i) => {
                  // Normalise transaction type (handle legacy "scan", "earned", "EARNED", "SPENT" etc.)
                  const rawType = (txn.transaction_type || "").toUpperCase();
                  const isEarned =
                    rawType === "EARNED" ||
                    rawType === "SCAN" ||
                    rawType === "EARNED_POINTS";
                  const isSpent = rawType === "SPENT" || rawType === "REDEEMED";
                  const type = isSpent ? "SPENT" : "EARNED";
                  const displayPoints = txn.points || 0;

                  // Description fallback for legacy entries
                  let description = txn.description || "";
                  if (!description && rawType === "SCAN") {
                    description = "Scanned QR code";
                  }
                  if (!description) {
                    description = isSpent ? "Points redeemed" : "Points earned";
                  }

                  const isFresh = freshScan && i === 0;

                  return (
                    <div
                      key={txn.id || i}
                      className="loyalty-txn-row"
                      style={{
                        background: "#fff",
                        border: "1px solid #e8e0d4",
                        borderLeft: isFresh
                          ? "3px solid #52b788"
                          : "1px solid #e8e0d4",
                        borderRadius: 2,
                        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        animation: `loyaltyFadeUp ${0.3 + i * 0.04}s ease`,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Left: badge + description */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
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
                          }}
                        >
                          {type}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 400,
                              color: "#1a1a1a",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {description}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#888888",
                              marginTop: 2,
                            }}
                          >
                            {/* v5.1: fallback to created_at for legacy NULL transaction_date */}
                            {formatDate(txn.transaction_date, txn.created_at)}
                          </div>
                        </div>
                      </div>
                      {/* Right: points */}
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
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

        {/* ─── SPEND POINTS TAB ─── */}
        {activeTab === "spend" && (
          <div style={{ animation: "loyaltyFadeUp 0.3s ease" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
                borderRadius: 2,
                padding: "clamp(28px, 4vw, 40px)",
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
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(22px, 4vw, 30px)",
                  fontWeight: 300,
                  color: "#fff",
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
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                You have <strong style={{ color: "#52b788" }}>{points}</strong>{" "}
                points available.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  marginBottom: 20,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 2,
                    padding: "12px 24px",
                    minWidth: 80,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 28,
                      fontWeight: 300,
                      color: "#faf9f6",
                    }}
                  >
                    {points}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.5)",
                      marginTop: 2,
                    }}
                  >
                    Points
                  </div>
                </div>
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 2,
                    padding: "12px 24px",
                    minWidth: 80,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: 28,
                      fontWeight: 300,
                      color: tier.color,
                    }}
                  >
                    {tier.name}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.5)",
                      marginTop: 2,
                    }}
                  >
                    Tier
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/redeem")}
                style={{
                  background:
                    points >= 50 ? "#52b788" : "rgba(255,255,255,0.15)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 2,
                  padding: "12px 36px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: points >= 50 ? "pointer" : "not-allowed",
                  fontFamily: "'Jost', sans-serif",
                  transition: "transform 0.2s",
                }}
                disabled={points < 50}
                onMouseEnter={(e) => {
                  if (points >= 50)
                    e.target.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
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
                Minimum 50 points to redeem. Points never expire.
              </p>
            </div>

            {tier.nextTier && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e8e0d4",
                  borderRadius: 2,
                  padding: "20px 24px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.35em",
                    textTransform: "uppercase",
                    color: "#52b788",
                    marginBottom: 10,
                  }}
                >
                  Progress to {tier.nextTier}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    fontSize: 13,
                    color: "#1a1a1a",
                  }}
                >
                  <span>{tier.pointsToNext} more points needed</span>
                  <span style={{ color: "#888" }}>{tier.progress}%</span>
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
                      width: `${tier.progress}%`,
                      transition: "width 1s ease-out",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── SECTION DIVIDER ─── */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, #e8e0d4, transparent)",
            margin: "40px 0",
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
                className="loyalty-footer-link"
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
