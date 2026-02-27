// src/pages/Loyalty.js
// Protea Botanicals — Loyalty Programme Page
// v5.1 — Timestamp fix: fallback to created_at for legacy entries with NULL transaction_date.
//        Show "Date unknown" instead of blank. Version aligned with registry.
// v4.0 — Production-ready: ALWAYS fetches real Supabase data, NO dev mock override
// Design: branded green/cream/gold theme matching v3 visuals exactly
// Tiers: Bronze (0–99), Silver (100–499), Gold (500+)

import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

// ─── TIER CONFIGURATION ───
const TIERS = [
  {
    name: "Bronze",
    min: 0,
    max: 99,
    color: "#cd7f32",
    nextTier: "Silver",
    nextMin: 100,
  },
  {
    name: "Silver",
    min: 100,
    max: 499,
    color: "#888888",
    nextTier: "Gold",
    nextMin: 500,
  },
  {
    name: "Gold",
    min: 500,
    max: Infinity,
    color: "#b5935a",
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

// ─── STYLES ───
const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');
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
        <style>{fonts}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "#faf9f6",
            fontFamily: "'Jost', sans-serif",
            padding: "40px 20px",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                width: 180,
                height: 14,
                background: "#e0dbd2",
                borderRadius: 2,
                marginBottom: 12,
              }}
            />
            <div
              style={{
                width: 260,
                height: 36,
                background: "#e0dbd2",
                borderRadius: 2,
              }}
            />
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
              borderRadius: 12,
              padding: "40px 32px",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 120,
                height: 60,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 4,
              }}
            />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: "20px 0",
                borderBottom: "1px solid #e0dbd2",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 26,
                  background: "#e0dbd2",
                  borderRadius: 4,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "60%",
                    height: 14,
                    background: "#e0dbd2",
                    borderRadius: 2,
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    width: "30%",
                    height: 12,
                    background: "#e0dbd2",
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
        <style>{fonts}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "#faf9f6",
            fontFamily: "'Jost', sans-serif",
            padding: "40px 20px",
            maxWidth: 800,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#fce4ec",
              border: "1px solid #e0dbd2",
              borderRadius: 8,
              padding: "32px 24px",
              marginTop: 60,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 24,
                color: "#1a1a1a",
                marginBottom: 12,
              }}
            >
              Unable to Load Loyalty Data
            </h2>
            <p style={{ color: "#888888", fontSize: 15, marginBottom: 24 }}>
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
      <style>{fonts}</style>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(82, 183, 136, 0); }
          50% { box-shadow: 0 0 20px 4px rgba(82, 183, 136, 0.3); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          fontFamily: "'Jost', sans-serif",
          padding: "40px 20px 80px",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        {/* ─── FRESH SCAN BANNER ─── */}
        {freshScan && (
          <div
            style={{
              background: "#e8f5e9",
              border: "1px solid #52b788",
              borderRadius: 8,
              padding: "14px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "slideDown 0.4s ease-out",
            }}
          >
            <span style={{ fontSize: 20 }}>✅</span>
            <span style={{ color: "#1b4332", fontWeight: 500, fontSize: 14 }}>
              Points added! Your loyalty balance has been updated.
            </span>
          </div>
        )}

        {/* ─── PAGE HEADER ─── */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
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
              fontSize: 38,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Your Rewards
          </h1>
        </div>

        {/* ─── POINTS CARD ─── */}
        <div
          style={{
            background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
            borderRadius: 12,
            padding: "36px 32px 28px",
            marginBottom: 40,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circle */}
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#52b788",
              }}
            >
              Total Points
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
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
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 72,
                fontWeight: 700,
                color: "#faf9f6",
                lineHeight: 1,
              }}
            >
              {points}
            </div>
            <div
              style={{
                border: "1.5px solid rgba(255,255,255,0.4)",
                borderRadius: 4,
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#faf9f6",
              }}
            >
              {tier.name}
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
            <span style={{ fontSize: 13, color: "#52b788", fontWeight: 500 }}>
              {tier.name}
            </span>
            {tier.nextTier && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                {tier.pointsToNext} pts to {tier.nextTier}
              </span>
            )}
            {!tier.nextTier && (
              <span style={{ fontSize: 13, color: "#b5935a" }}>
                Maximum tier reached ✨
              </span>
            )}
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: 4,
              height: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(90deg, #52b788, #b5935a)",
                height: "100%",
                borderRadius: 4,
                width: `${tier.progress}%`,
                transition: "width 1s ease-out",
                animation: "progressFill 1.2s ease-out",
              }}
            />
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div
          style={{
            display: "flex",
            gap: 32,
            borderBottom: "2px solid #e0dbd2",
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
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #1b4332"
                    : "2px solid transparent",
                padding: "12px 0",
                marginBottom: -2,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: activeTab === tab.key ? "#1b4332" : "#888888",
                cursor: "pointer",
                fontFamily: "'Jost', sans-serif",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TRANSACTION HISTORY TAB ─── */}
        {activeTab === "history" && (
          <div>
            {transactions.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "#888888",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
                  No transactions yet
                </p>
                <p style={{ fontSize: 14 }}>
                  Scan a product QR code to start earning points!
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/scan")}
                  style={{
                    marginTop: 20,
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
              transactions.map((txn, i) => {
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

                return (
                  <div
                    key={txn.id || i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "18px 0",
                      borderBottom:
                        i < transactions.length - 1
                          ? "1px solid #e0dbd2"
                          : "none",
                      animation:
                        freshScan && i === 0
                          ? "glowPulse 2s ease-in-out 3"
                          : "none",
                      borderRadius: freshScan && i === 0 ? 8 : 0,
                    }}
                  >
                    {/* Type badge */}
                    <div
                      style={{
                        background: type === "EARNED" ? "#2d6a4f" : "#c0392b",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        padding: "5px 12px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        minWidth: 65,
                        textAlign: "center",
                      }}
                    >
                      {type}
                    </div>

                    {/* Description + date */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
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
                        style={{ fontSize: 13, color: "#888888", marginTop: 2 }}
                      >
                        {/* v5.1: fallback to created_at for legacy NULL transaction_date */}
                        {formatDate(txn.transaction_date, txn.created_at)}
                      </div>
                    </div>

                    {/* Points */}
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: type === "EARNED" ? "#1b4332" : "#c0392b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {type === "EARNED" ? "+" : "-"}
                      {displayPoints}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── SPEND POINTS TAB ─── */}
        {activeTab === "spend" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 28,
                fontWeight: 600,
                color: "#1a1a1a",
                marginBottom: 12,
              }}
            >
              Redeem Your Points
            </h2>
            <p style={{ fontSize: 15, color: "#888888", marginBottom: 28 }}>
              You have <strong style={{ color: "#1a1a1a" }}>{points}</strong>{" "}
              points available.
            </p>

            {/* Quick stats */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  border: "1px solid #e0dbd2",
                  borderRadius: 8,
                  padding: "16px 28px",
                  minWidth: 100,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#1a1a1a",
                  }}
                >
                  {points}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#888888",
                    marginTop: 2,
                  }}
                >
                  Points
                </div>
              </div>
              <div
                style={{
                  border: "1px solid #e0dbd2",
                  borderRadius: 8,
                  padding: "16px 28px",
                  minWidth: 100,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 32,
                    fontWeight: 700,
                    color: tier.color,
                  }}
                >
                  {tier.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#888888",
                    marginTop: 2,
                  }}
                >
                  Tier
                </div>
              </div>
            </div>

            {/* Redeem CTA */}
            <button
              type="button"
              onClick={() => navigate("/redeem")}
              style={{
                background:
                  points >= 50
                    ? "linear-gradient(135deg, #b5935a 0%, #d4a96a 100%)"
                    : "#e0dbd2",
                color: points >= 50 ? "#fff" : "#888888",
                border: "none",
                borderRadius: 2,
                padding: "14px 40px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: points >= 50 ? "pointer" : "not-allowed",
                fontFamily: "'Jost', sans-serif",
                width: "100%",
                maxWidth: 400,
                transition: "transform 0.2s",
              }}
              disabled={points < 50}
              onMouseEnter={(e) => {
                if (points >= 50) e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
              }}
            >
              View Rewards Catalogue →
            </button>
            <p style={{ fontSize: 13, color: "#888888", marginTop: 12 }}>
              Minimum 50 points to redeem. Points never expire.
            </p>

            {/* Progress to next tier */}
            {tier.nextTier && (
              <div
                style={{
                  marginTop: 36,
                  border: "1px solid #e0dbd2",
                  borderRadius: 8,
                  padding: "20px 24px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.3em",
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
                    fontSize: 14,
                    color: "#1a1a1a",
                  }}
                >
                  <span>{tier.pointsToNext} more points needed</span>
                  <span style={{ color: "#888888" }}>{tier.progress}%</span>
                </div>
                <div
                  style={{
                    background: "#e0dbd2",
                    borderRadius: 4,
                    height: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "linear-gradient(90deg, #52b788, #b5935a)",
                      height: "100%",
                      borderRadius: 4,
                      width: `${tier.progress}%`,
                      transition: "width 1s ease-out",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
