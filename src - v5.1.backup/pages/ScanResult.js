// src/pages/ScanResult.js
// ─────────────────────────────────────────────────────────────────────────────
// Standalone page — route: /scan/:qrCode
//
// Key fix: NO_AUTH state "Sign In" button passes ?return=/scan/:qrCode
// so after login the user lands back here to claim their points.
//
// Dev mode fix: reads localStorage 'protea_dev_mode' to mock a user
// session for testing without real Supabase auth.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { RoleContext } from "../App";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`;

const POINTS = Number(process.env.REACT_APP_POINTS_PER_SCAN) || 10;
const RATE_MS = 5000;

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  text: "#1a1a1a",
  muted: "#888888",
  error: "#c0392b",
  border: "#e0dbd2",
};

const S = {
  LOADING: "loading",
  SUCCESS: "success",
  ALREADY: "already",
  INVALID: "invalid",
  NO_AUTH: "no_auth",
  RATE: "rate",
  ERROR: "error",
};

// ── Dev mock user for testing ─────────────────────────────────────────────────
const DEV_MOCK_USER = {
  id: "dev-mock-user-id",
  email: "customer@protea.dev",
};

export default function ScanResult() {
  const { qrCode } = useParams();
  const navigate = useNavigate();
  const { isDevMode } = useContext(RoleContext);

  const [status, setStatus] = useState(S.LOADING);
  const [detail, setDetail] = useState("");
  const [points, setPoints] = useState(0);
  const [batchNum, setBatch] = useState("");
  const [newTotal, setTotal] = useState(null);
  const processedRef = useRef(false);

  const processScan = useCallback(async () => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Rate limit
    const key = `scan_rl_${qrCode}`;
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last < RATE_MS) {
      setStatus(S.RATE);
      return;
    }
    sessionStorage.setItem(key, Date.now());

    // ── Auth check — real Supabase OR dev mock ────────────────────────────
    let user = null;
    const {
      data: { user: realUser },
    } = await supabase.auth.getUser();

    if (realUser) {
      user = realUser;
    } else if (
      isDevMode ||
      localStorage.getItem("protea_dev_mode") === "true"
    ) {
      // Dev mode: use mock user so the full scan flow can be tested
      user = DEV_MOCK_USER;
    }

    if (!user) {
      setStatus(S.NO_AUTH);
      return;
    }

    if (!qrCode) {
      setStatus(S.INVALID);
      return;
    }

    try {
      // Look up product
      const { data: product, error: fe } = await supabase
        .from("products")
        .select("id, qr_code, claimed, batches(batch_number)")
        .eq("qr_code", decodeURIComponent(qrCode))
        .single();

      if (fe || !product) {
        setStatus(S.INVALID);
        setDetail(
          `No product found for "${qrCode}". Make sure you're scanning the inside-packaging QR.`,
        );
        return;
      }

      setBatch(product.batches?.batch_number || qrCode);

      if (product.claimed) {
        setStatus(S.ALREADY);
        setDetail(
          "This QR code has already been redeemed. Each code can only earn points once.",
        );
        return;
      }

      // ── Dev mode: skip Supabase writes, show success with mock data ─────
      if (user.id === DEV_MOCK_USER.id) {
        setPoints(POINTS);
        setTotal(340 + POINTS); // mock running total
        setStatus(S.SUCCESS);
        return;
      }

      // Atomic claim
      const { error: ce, data: claimed } = await supabase
        .from("products")
        .update({
          claimed: true,
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", product.id)
        .eq("claimed", false)
        .select();

      if (ce || !claimed?.length) {
        setStatus(S.ALREADY);
        setDetail("This code was just claimed in another session.");
        return;
      }

      // Insert transaction
      await supabase.from("loyalty_transactions").insert({
        user_id: user.id,
        transaction_type: "EARNED",
        points: POINTS,
        product_id: product.id,
        description: `Scanned ${product.batches?.batch_number || qrCode}`,
        transaction_date: new Date().toISOString(),
      });

      // Increment points via RPC
      const { error: rpcErr } = await supabase.rpc("increment_loyalty_points", {
        p_user_id: user.id,
        p_points: POINTS,
      });

      if (rpcErr) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("loyalty_points")
          .eq("id", user.id)
          .single();
        const updated = (prof?.loyalty_points || 0) + POINTS;
        await supabase
          .from("user_profiles")
          .update({ loyalty_points: updated })
          .eq("id", user.id);
        setTotal(updated);
      } else {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("loyalty_points")
          .eq("id", user.id)
          .single();
        setTotal(prof?.loyalty_points || null);
      }

      setPoints(POINTS);
      setStatus(S.SUCCESS);
    } catch (err) {
      console.error("[ScanResult]", err);
      setStatus(S.ERROR);
      setDetail(err.message || "Unexpected error. Please try again.");
    }
  }, [qrCode, isDevMode]);

  useEffect(() => {
    processScan();
  }, [processScan]);

  // ── Return URL for post-login bounce-back ──────────────────────────────────
  const returnUrl = `/scan/${encodeURIComponent(qrCode || "")}`;

  // ── SUCCESS — full-screen celebration ────────────────────────────────────
  if (status === S.SUCCESS) {
    return (
      <>
        <style>
          {FONTS}
          {`
          @keyframes pb-pop { 0%{transform:scale(0.7);opacity:0;} 70%{transform:scale(1.05);} 100%{transform:scale(1);opacity:1;} }
          @keyframes pb-float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
          @keyframes pb-confetti { 0%{transform:translateY(-20px) rotate(0deg);opacity:1;} 100%{transform:translateY(100vh) rotate(720deg);opacity:0;} }
          .pb-confetti { position:fixed; width:8px; height:8px; animation:pb-confetti linear forwards; pointer-events:none; }
        `}
        </style>

        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="pb-confetti"
            style={{
              left: `${4 + ((i * 4.1) % 96)}%`,
              top: "-10px",
              background: ["#52b788", "#b5935a", "#1b4332", "#fff", "#e67e22"][
                i % 5
              ],
              animationDuration: `${1.5 + (i % 5) * 0.3}s`,
              animationDelay: `${(i % 8) * 0.1}s`,
              borderRadius: i % 3 === 0 ? "50%" : "1px",
            }}
          />
        ))}

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            background: `linear-gradient(145deg, ${C.green} 0%, #0d2e1f 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "Jost, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              background: "#fff",
              padding: "48px 40px",
              textAlign: "center",
              animation: "pb-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                marginBottom: "4px",
                lineHeight: 1,
                animation: "pb-float 2s ease-in-out infinite",
              }}
            >
              🏆
            </div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: C.accent,
                fontWeight: "600",
                marginBottom: "12px",
              }}
            >
              Points Earned
            </div>
            <div
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "72px",
                fontWeight: "700",
                color: C.green,
                lineHeight: 1,
                marginBottom: "4px",
              }}
            >
              +{points}
            </div>
            <div
              style={{ fontSize: "16px", color: C.muted, marginBottom: "24px" }}
            >
              loyalty points
            </div>

            {batchNum && (
              <div
                style={{
                  background: C.cream,
                  border: `1px solid ${C.border}`,
                  padding: "10px 16px",
                  fontSize: "12px",
                  color: C.muted,
                  marginBottom: "16px",
                }}
              >
                Verified: <strong style={{ color: C.text }}>{batchNum}</strong>
              </div>
            )}

            {newTotal !== null && (
              <div
                style={{
                  background: `linear-gradient(90deg, ${C.green}, ${C.mid})`,
                  padding: "14px 20px",
                  marginBottom: "28px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: C.accent,
                    marginBottom: "4px",
                  }}
                >
                  Your New Total
                </div>
                <div
                  style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "36px",
                    fontWeight: "700",
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  {newTotal}
                  <span
                    style={{
                      fontSize: "14px",
                      color: C.accent,
                      marginLeft: "6px",
                      fontFamily: "Jost, sans-serif",
                    }}
                  >
                    pts
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() =>
                navigate("/loyalty", { state: { freshScan: true } })
              }
              style={{
                background: C.green,
                color: "#fff",
                border: "none",
                padding: "14px 32px",
                width: "100%",
                fontFamily: "Jost, sans-serif",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              View My Loyalty Points →
            </button>
            <button
              onClick={() => navigate("/scan")}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                padding: "10px 24px",
                width: "100%",
                fontFamily: "Jost, sans-serif",
                fontSize: "11px",
                color: C.muted,
                cursor: "pointer",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Scan Another Product
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── ALL OTHER STATES ───────────────────────────────────────────────────────
  const configs = {
    [S.LOADING]: {
      spinner: true,
      title: "Verifying QR Code…",
      desc: "Checking authenticity and claiming your points.",
      bg: "#fff",
      border: C.border,
      actions: [],
    },
    [S.ALREADY]: {
      icon: "🔒",
      title: "Already Redeemed",
      desc: detail || "This QR code has already been claimed.",
      bg: "#fff8f0",
      border: "#f0c8a0",
      actions: [
        {
          label: "Scan Another Code",
          color: C.gold,
          onClick: () => navigate("/scan"),
        },
        {
          label: "View Loyalty Points",
          color: C.mid,
          onClick: () => navigate("/loyalty"),
          outline: true,
        },
      ],
    },
    [S.NO_AUTH]: {
      icon: "🔐",
      title: "Sign In to Earn Points",
      desc: "Your QR code is still valid — sign in and you'll be taken straight back to claim your points.",
      bg: "#f5f0fa",
      border: "#c8aae8",
      actions: [
        // ✅ KEY FIX: passes ?return= so login bounces back here
        {
          label: "Sign In",
          color: "#5a2d82",
          onClick: () =>
            navigate(`/account?return=${encodeURIComponent(returnUrl)}`),
        },
        {
          label: "Create Account",
          color: C.mid,
          onClick: () =>
            navigate(`/account?return=${encodeURIComponent(returnUrl)}`),
          outline: true,
        },
      ],
    },
    [S.RATE]: {
      icon: "⏳",
      title: "Please Wait",
      desc: "This code was just attempted. Wait a few seconds and try again.",
      bg: "#fffbf0",
      border: "#f0dfa0",
      actions: [
        {
          label: "Try Again",
          color: C.gold,
          onClick: () => {
            processedRef.current = false;
            processScan();
          },
        },
      ],
    },
    [S.INVALID]: {
      icon: "⚠️",
      title: "Code Not Recognised",
      desc:
        detail ||
        "This QR code isn't in our system. Make sure you're scanning the inside-packaging code.",
      bg: "#fef0ee",
      border: "#e8b4ad",
      actions: [
        {
          label: "Scan Again",
          color: C.error,
          onClick: () => navigate("/scan"),
        },
      ],
    },
    [S.ERROR]: {
      icon: "❌",
      title: "Something Went Wrong",
      desc: detail || "Please check your connection and try again.",
      bg: "#fef0ee",
      border: "#e8b4ad",
      actions: [
        {
          label: "Retry",
          color: C.error,
          onClick: () => {
            processedRef.current = false;
            processScan();
          },
        },
        {
          label: "Scan Again",
          color: C.mid,
          onClick: () => navigate("/scan"),
          outline: true,
        },
      ],
    },
  };

  const cfg = configs[status] || configs[S.ERROR];

  return (
    <>
      <style>
        {FONTS}
        {`
        @keyframes pb-spin { to{transform:rotate(360deg);} }
        @keyframes pb-fadein { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
      `}
      </style>
      <div
        style={{
          minHeight: "100vh",
          background: C.cream,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          fontFamily: "Jost, sans-serif",
        }}
      >
        <div style={{ width: "100%", maxWidth: "480px", marginBottom: "16px" }}>
          <button
            onClick={() => navigate("/scan")}
            style={{
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              fontFamily: "Jost, sans-serif",
              fontSize: "12px",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            ← Back to Scanner
          </button>
        </div>

        <div style={{ marginBottom: "12px", textAlign: "center" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: C.accent,
              marginBottom: "4px",
            }}
          >
            QR Code
          </div>
          <code
            style={{
              fontSize: "12px",
              background: C.cream,
              border: `1px solid ${C.border}`,
              padding: "3px 10px",
            }}
          >
            {decodeURIComponent(qrCode || "—")}
          </code>
        </div>

        <div
          style={{
            maxWidth: "480px",
            width: "100%",
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            padding: "40px 32px",
            textAlign: "center",
            animation: "pb-fadein 0.3s ease both",
          }}
        >
          {cfg.spinner ? (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: `3px solid ${C.accent}`,
                borderTopColor: "transparent",
                margin: "0 auto 20px",
                animation: "pb-spin 0.8s linear infinite",
              }}
            />
          ) : (
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              {cfg.icon}
            </div>
          )}

          <h2
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "26px",
              fontWeight: "600",
              color: C.green,
              marginBottom: "12px",
            }}
          >
            {cfg.title}
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: C.muted,
              lineHeight: "1.6",
              marginBottom: cfg.actions.length ? "28px" : 0,
            }}
          >
            {cfg.desc}
          </p>

          {cfg.actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                background: a.outline ? "transparent" : a.color,
                color: a.outline ? a.color : "#fff",
                border: a.outline ? `1px solid ${a.color}` : "none",
                padding: "12px 24px",
                width: "100%",
                fontFamily: "Jost, sans-serif",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                marginBottom: i < cfg.actions.length - 1 ? "10px" : 0,
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
