// src/pages/ScanResult.js v3.2
// v3.2: First-scan-only enforcement UI (DEC-026)
//       - isRescan flag derived from result.rescan
//       - Rescan path: green hero + "Previously Verified" badge
//       - Rescan path: info card replaces points card
//       - Rescan path: COA + Browse Shop + Scan Another CTAs kept
//       - Red "Unverified" page now reserved for HMAC failures only
// v3.1: Fix 1 — added authentic:true check compatibility with scanService v7.0
//       Fix 2 — useRef guard prevents React StrictMode double-invoke claiming product twice

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authenticateQR } from "../services/scanService";
import {
  requestGPSLocation,
  findNearestStockist,
  saveGPSConsent,
} from "../services/geoService";
import { supabase } from "../services/supabaseClient";

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .sr-btn {
    font-family: 'Jost', sans-serif; padding: 12px 28px; border: none;
    border-radius: 2px; font-size: 11px; letter-spacing: 0.2em;
    text-transform: uppercase; cursor: pointer; transition: all 0.2s;
    font-weight: 500; text-decoration: none; display: inline-block; text-align: center;
  }
  .sr-btn-green { background: #1b4332; color: white; }
  .sr-btn-green:hover { background: #2d6a4f; }
  .sr-btn-outline { background: transparent; border: 1px solid #1b4332; color: #1b4332; }
  .sr-btn-outline:hover { background: #1b4332; color: white; }
  .sr-btn-gold { background: #b5935a; color: white; }
  .sr-btn-gold:hover { background: #9a7a48; }
  .sr-card {
    background: white; border: 1px solid #e8e0d4; border-radius: 2px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  }
  .sr-badge {
    display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px;
    border-radius: 2px; font-family: 'Jost', sans-serif; font-size: 10px;
    letter-spacing: 0.15em; text-transform: uppercase; font-weight: 500;
  }
  .gps-prompt {
    animation: slideUp 0.4s ease forwards;
    border-left: 3px solid #b5935a;
  }
  .stockist-card {
    animation: slideUp 0.4s 0.2s ease forwards; opacity: 0;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .pulse { animation: pulse 1.5s infinite; }
  @media (max-width: 600px) {
    .sr-inner { padding: 24px 16px !important; }
    .sr-hero-inner { padding: 32px 16px 36px !important; }
    .sr-cta-row { flex-direction: column !important; }
    .sr-cta-row .sr-btn { width: 100%; text-align: center; }
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function ScanResult() {
  const { qrCode } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsState, setGpsState] = useState("idle");
  const [stockist, setStockist] = useState(null);
  const [stockistLoading, setStockistLoading] = useState(false);
  const [scanLocation, setScanLocation] = useState(null);
  const [user, setUser] = useState(null);

  // ── FIX 2: Ref guard — prevents StrictMode double-invoke ──────────────────
  const hasRun = useRef(false);

  // ── Authenticate QR on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function run() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      const res = await authenticateQR(qrCode);
      setResult(res);
      setLoading(false);

      // Only prompt for GPS on a genuine first scan, not rescans
      if (
        (res.success || res.authentic) &&
        !res.rescan &&
        u &&
        res.requiresGPSPrompt
      ) {
        setTimeout(() => setGpsState("prompting"), 2000);
      }
    }
    run();
  }, [qrCode]);

  // ── GPS grant handler ──────────────────────────────────────────────────────
  const handleGrantGPS = useCallback(async () => {
    setGpsState("requesting");
    const gps = await requestGPSLocation();
    if (!gps) {
      setGpsState("denied");
      return;
    }
    setGpsState("updating");
    setScanLocation({ lat: gps.lat, lng: gps.lng, source: "gps" });

    if (user) await saveGPSConsent(user.id, true);

    setStockistLoading(true);
    const near = await findNearestStockist(gps.lat, gps.lng);
    setStockist(near);
    setStockistLoading(false);
    setGpsState("granted");
  }, [user]);

  const handleDenyGPS = useCallback(async () => {
    setGpsState("denied");
    if (user) await saveGPSConsent(user.id, false);
  }, [user]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <style>{styles}</style>
        <div style={{ textAlign: "center" }}>
          <div className="pulse" style={{ fontSize: 48, marginBottom: 16 }}>
            🔍
          </div>
          <p
            className="body-font"
            style={{
              fontSize: 13,
              color: "#888",
              fontWeight: 300,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Verifying product…
          </p>
        </div>
      </div>
    );
  }

  // ── FIX 1: check both result.success and result.authentic ────────────────
  const isAuthentic = result?.success || result?.authentic;

  // v3.2: rescan flag — product IS authentic but already claimed
  const isRescan = result?.rescan === true;

  // ── Not authentic (counterfeit / not found / error) ───────────────────────
  if (!isAuthentic) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          fontFamily: "'Jost', sans-serif",
        }}
      >
        <style>{styles}</style>
        <div
          className="sr-inner"
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 24 }}>⚠</div>
          <h1
            className="shop-font"
            style={{
              fontSize: 36,
              fontWeight: 300,
              color: "#1a1a1a",
              marginBottom: 12,
            }}
          >
            Unverified Product
          </h1>
          <p
            className="body-font"
            style={{
              fontSize: 14,
              color: "#888",
              fontWeight: 300,
              lineHeight: 1.7,
              marginBottom: 32,
              maxWidth: 420,
              margin: "0 auto 32px",
            }}
          >
            {result?.error ||
              result?.message ||
              "This QR code could not be verified. If you believe this is an error, please contact us."}
          </p>
          <div
            className="sr-card"
            style={{
              padding: "20px 24px",
              marginBottom: 32,
              borderLeft: "3px solid #dc2626",
              textAlign: "left",
            }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#dc2626",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              What this means
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 13,
                color: "#666",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              This product may be counterfeit or the QR code may have been
              tampered with. Do not consume this product. All authentic Protea
              Botanicals products carry a digitally signed QR code.
            </p>
          </div>
          <button
            className="sr-btn sr-btn-green"
            onClick={() => navigate("/scan")}
          >
            Scan Another Code
          </button>
        </div>
      </div>
    );
  }

  // Pull batch from whichever path supplied it
  const batch = result?.batch || result?.product?.batches;
  const { pointsEarned, anomalyFlags, userProfile } = result;

  // ── RESCAN PAGE (v3.2) ────────────────────────────────────────────────────
  if (isRescan) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          fontFamily: "'Jost', sans-serif",
        }}
      >
        <style>{styles}</style>

        {/* ── HERO: Previously Verified ── */}
        <div
          style={{
            background:
              "linear-gradient(160deg, #1b4332 0%, #2d6a4f 60%, #1b4332dd 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div
            className="sr-hero-inner"
            style={{
              maxWidth: 720,
              margin: "0 auto",
              padding: "48px 32px 44px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                className="sr-badge"
                style={{
                  background: "rgba(82,183,136,0.15)",
                  color: "#52b788",
                  border: "1px solid rgba(82,183,136,0.3)",
                }}
              >
                ✓ Authentic Product
              </span>
              <span
                className="sr-badge"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                🔄 Previously Verified
              </span>
            </div>

            <h1
              className="shop-font"
              style={{
                fontSize: "clamp(36px, 7vw, 60px)",
                fontWeight: 300,
                color: "#faf9f6",
                lineHeight: 1,
                marginBottom: 8,
                letterSpacing: "0.03em",
              }}
            >
              {batch?.product_name || "Verified Product"}
            </h1>
            <p
              className="body-font"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                marginBottom: 0,
                fontWeight: 300,
              }}
            >
              Batch {batch?.batch_number || "—"} · QR Authenticated
            </p>
          </div>
        </div>

        {/* ── BODY ── */}
        <div
          className="sr-inner"
          style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px" }}
        >
          {/* Rescan info card — replaces the points card */}
          <div
            className="sr-card"
            style={{
              padding: "24px 28px",
              marginBottom: 20,
              borderLeft: "3px solid #52b788",
              background: "#f5faf7",
            }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#52b788",
                marginBottom: 8,
              }}
            >
              Previously Scanned
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 14,
                color: "#1a1a1a",
                fontWeight: 400,
                marginBottom: 6,
                lineHeight: 1.6,
              }}
            >
              This product has already been verified.
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 13,
                color: "#666",
                fontWeight: 300,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              No additional points are awarded — loyalty points are earned on
              the first scan only. You can still view the Certificate of
              Analysis below.
            </p>
          </div>

          {/* Product details */}
          <div
            className="sr-card"
            style={{ padding: "24px 28px", marginBottom: 20 }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#52b788",
                marginBottom: 14,
              }}
            >
              Product Details
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "16px 24px",
              }}
            >
              {[
                ["Product", batch?.product_name],
                ["Batch", batch?.batch_number],
                [
                  "THC Content",
                  batch?.thc_content ? `${batch.thc_content}%` : null,
                ],
                ["Lab Certified", batch?.lab_certified ? "Yes" : "No"],
                ["Organic", batch?.organic ? "Yes" : "No"],
              ]
                .filter(([, v]) => v)
                .map(([label, val]) => (
                  <div key={label}>
                    <p
                      className="body-font"
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: "#aaa",
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      className="body-font"
                      style={{
                        fontSize: 14,
                        color: "#1a1a1a",
                        fontWeight: 400,
                      }}
                    >
                      {val}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* COA button */}
          <div
            className="sr-card"
            style={{
              padding: "20px 28px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "#52b788",
                  marginBottom: 4,
                }}
              >
                Certificate of Analysis
              </p>
              <p
                className="body-font"
                style={{ fontSize: 13, color: "#555", fontWeight: 300 }}
              >
                Full cannabinoid profile · Lab verified · SANAS accredited
              </p>
            </div>
            <a
              href={batch?.coa_url || "https://example.com/coa/PB-001-2026.pdf"}
              target="_blank"
              rel="noopener noreferrer"
              className="sr-btn sr-btn-green"
            >
              📄 View COA
            </a>
          </div>

          {/* CTA row */}
          <div
            className="sr-cta-row"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <Link
              to="/shop"
              className="sr-btn sr-btn-outline"
              style={{ flex: 1, minWidth: 140 }}
            >
              Browse Shop
            </Link>
            <button
              className="sr-btn"
              style={{
                flex: 1,
                minWidth: 140,
                background: "transparent",
                border: "1px solid #d8d0c4",
                color: "#888",
                fontFamily: "'Jost', sans-serif",
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                borderRadius: 2,
              }}
              onClick={() => navigate("/scan")}
            >
              Scan Another
            </button>
          </div>

          {/* Strain profile link */}
          {batch?.strain_id && (
            <div style={{ textAlign: "center" }}>
              <Link
                to={`/verify/${batch.strain_id}`}
                className="body-font"
                style={{
                  fontSize: 11,
                  color: "#aaa",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  borderBottom: "1px solid #ddd",
                  paddingBottom: 2,
                }}
              >
                View full strain profile →
              </Link>
            </div>
          )}
        </div>

        {/* Footer strip */}
        <div
          style={{ background: "#060e09", padding: "24px 32px", marginTop: 32 }}
        >
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <span
              className="shop-font"
              style={{ fontSize: 16, color: "#faf9f6", letterSpacing: "0.2em" }}
            >
              Protea <span style={{ color: "#52b788" }}>Botanicals</span>
            </span>
            <p
              className="body-font"
              style={{
                fontSize: 10,
                color: "#333",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Lab Verified · QR Authenticated · South Africa
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── FIRST SCAN PAGE (unchanged from v3.1) ─────────────────────────────────
  const { isFirstScan } = result;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        fontFamily: "'Jost', sans-serif",
      }}
    >
      <style>{styles}</style>

      {/* ── HERO: Authenticated ── */}
      <div
        style={{
          background:
            "linear-gradient(160deg, #1b4332 0%, #2d6a4f 60%, #1b4332dd 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          className="sr-hero-inner"
          style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px 44px" }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              className="sr-badge"
              style={{
                background: "rgba(82,183,136,0.15)",
                color: "#52b788",
                border: "1px solid rgba(82,183,136,0.3)",
              }}
            >
              ✓ Authentic Product
            </span>
            {isFirstScan && (
              <span
                className="sr-badge"
                style={{
                  background: "rgba(181,147,90,0.15)",
                  color: "#e8c870",
                  border: "1px solid rgba(181,147,90,0.3)",
                }}
              >
                ★ First Scan
              </span>
            )}
            {!isFirstScan && (
              <span
                className="sr-badge"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Previously Verified
              </span>
            )}
          </div>

          <h1
            className="shop-font"
            style={{
              fontSize: "clamp(36px, 7vw, 60px)",
              fontWeight: 300,
              color: "#faf9f6",
              lineHeight: 1,
              marginBottom: 8,
              letterSpacing: "0.03em",
            }}
          >
            {batch?.product_name || "Verified Product"}
          </h1>
          <p
            className="body-font"
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: 0,
              fontWeight: 300,
            }}
          >
            Batch {batch?.batch_number || "—"} · QR Authenticated
          </p>
        </div>
      </div>

      {/* ── BODY ── */}
      <div
        className="sr-inner"
        style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px" }}
      >
        {/* Anomaly warning */}
        {anomalyFlags?.length > 0 && (
          <div
            className="sr-card"
            style={{
              padding: "16px 20px",
              marginBottom: 20,
              borderLeft: "3px solid #f59e0b",
            }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#f59e0b",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Scan Notice
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 13,
                color: "#666",
                fontWeight: 300,
                margin: 0,
              }}
            >
              {anomalyFlags.includes("daily_cap") &&
                "Daily scan limit reached — no additional points awarded today. "}
              {anomalyFlags.includes("velocity") &&
                "This code has been scanned many times recently. "}
              Points are awarded on first verified scan only.
            </p>
          </div>
        )}

        {/* Points earned */}
        {user && (
          <div
            className="sr-card"
            style={{
              padding: "24px 28px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  marginBottom: 6,
                }}
              >
                {isFirstScan && anomalyFlags?.length === 0
                  ? "Points Earned"
                  : "Points"}
              </p>
              <p
                className="shop-font"
                style={{
                  fontSize: 40,
                  fontWeight: 300,
                  color: "#1b4332",
                  lineHeight: 1,
                }}
              >
                {isFirstScan && anomalyFlags?.length === 0
                  ? `+${pointsEarned}`
                  : "0"}
              </p>
              <p
                className="body-font"
                style={{
                  fontSize: 11,
                  color: "#aaa",
                  marginTop: 4,
                  fontWeight: 300,
                }}
              >
                {isFirstScan && anomalyFlags?.length === 0
                  ? "Added to your balance"
                  : isFirstScan
                    ? "Withheld — scan limit reached"
                    : "Already claimed on first scan"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  marginBottom: 6,
                }}
              >
                Your Total
              </p>
              <p
                className="shop-font"
                style={{
                  fontSize: 32,
                  fontWeight: 300,
                  color: "#b5935a",
                  lineHeight: 1,
                }}
              >
                {(userProfile?.loyalty_points || 0) +
                  (isFirstScan && anomalyFlags?.length === 0
                    ? pointsEarned
                    : 0)}
              </p>
              <p
                className="body-font"
                style={{
                  fontSize: 11,
                  color: "#aaa",
                  marginTop: 4,
                  fontWeight: 300,
                }}
              >
                {(userProfile?.loyalty_tier || "bronze").toUpperCase()} tier
              </p>
            </div>
          </div>
        )}

        {!user && (
          <div
            className="sr-card"
            style={{
              padding: "24px 28px",
              marginBottom: 20,
              borderLeft: "3px solid #b5935a",
              background: "#faf5ed",
            }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 13,
                color: "#666",
                fontWeight: 300,
                marginBottom: 16,
                lineHeight: 1.7,
              }}
            >
              <strong style={{ color: "#1a1a1a", fontWeight: 500 }}>
                Create a free account
              </strong>{" "}
              to claim 10 loyalty points for this scan and unlock exclusive
              rewards.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="sr-btn sr-btn-green"
                onClick={() => navigate("/account")}
              >
                Create Account
              </button>
              <button
                className="sr-btn sr-btn-outline"
                onClick={() => navigate("/account?mode=login")}
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* Product details */}
        <div
          className="sr-card"
          style={{ padding: "24px 28px", marginBottom: 20 }}
        >
          <p
            className="body-font"
            style={{
              fontSize: 10,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#52b788",
              marginBottom: 14,
            }}
          >
            Product Details
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "16px 24px",
            }}
          >
            {[
              ["Product", batch?.product_name],
              ["Batch", batch?.batch_number],
              [
                "THC Content",
                batch?.thc_content ? `${batch.thc_content}%` : null,
              ],
              ["Lab Certified", batch?.lab_certified ? "Yes" : "No"],
              ["Organic", batch?.organic ? "Yes" : "No"],
            ]
              .filter(([, v]) => v)
              .map(([label, val]) => (
                <div key={label}>
                  <p
                    className="body-font"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: "#aaa",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    className="body-font"
                    style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 400 }}
                  >
                    {val}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {/* COA button */}
        <div
          className="sr-card"
          style={{
            padding: "20px 28px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#52b788",
                marginBottom: 4,
              }}
            >
              Certificate of Analysis
            </p>
            <p
              className="body-font"
              style={{ fontSize: 13, color: "#555", fontWeight: 300 }}
            >
              Full cannabinoid profile · Lab verified · SANAS accredited
            </p>
          </div>
          <a
            href={batch?.coa_url || "https://example.com/coa/PB-001-2026.pdf"}
            target="_blank"
            rel="noopener noreferrer"
            className="sr-btn sr-btn-green"
          >
            📄 View COA
          </a>
        </div>

        {/* ── GPS CONSENT PROMPT ── */}
        {gpsState === "prompting" && (
          <div
            className="sr-card gps-prompt"
            style={{
              padding: "20px 24px",
              marginBottom: 20,
              background: "#faf5ed",
            }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#b5935a",
                marginBottom: 8,
              }}
            >
              Optional · Location
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 14,
                color: "#1a1a1a",
                fontWeight: 400,
                marginBottom: 6,
              }}
            >
              Find your nearest stockist
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 13,
                color: "#666",
                fontWeight: 300,
                lineHeight: 1.65,
                marginBottom: 16,
              }}
            >
              Enable location to see the closest dispensary carrying Protea
              Botanicals products and get personalised strain recommendations
              for your area.
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 11,
                color: "#bbb",
                fontWeight: 300,
                marginBottom: 16,
                fontStyle: "italic",
              }}
            >
              Your location is never stored permanently and is never shared with
              third parties. You can withdraw consent at any time in your
              account settings.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="sr-btn sr-btn-gold" onClick={handleGrantGPS}>
                Enable Location
              </button>
              <button
                className="sr-btn"
                style={{
                  background: "transparent",
                  border: "1px solid #d8d0c4",
                  color: "#888",
                  padding: "12px 24px",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Jost', sans-serif",
                  borderRadius: 2,
                }}
                onClick={handleDenyGPS}
              >
                No Thanks
              </button>
            </div>
          </div>
        )}

        {gpsState === "requesting" && (
          <div
            className="sr-card"
            style={{
              padding: "20px 24px",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            <p
              className="body-font pulse"
              style={{ fontSize: 13, color: "#888", fontWeight: 300 }}
            >
              Requesting location…
            </p>
          </div>
        )}

        {gpsState === "denied" && (
          <div
            className="sr-card"
            style={{ padding: "16px 20px", marginBottom: 20 }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 12,
                color: "#aaa",
                fontWeight: 300,
                margin: 0,
              }}
            >
              Location disabled. You can enable it anytime in{" "}
              <Link
                to="/account"
                style={{
                  color: "#b5935a",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                your account settings
              </Link>
              .
            </p>
          </div>
        )}

        {/* ── NEAREST STOCKIST CARD ── */}
        {stockistLoading && (
          <div
            className="sr-card"
            style={{
              padding: "20px 24px",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            <p
              className="body-font pulse"
              style={{ fontSize: 13, color: "#888", fontWeight: 300 }}
            >
              Finding nearest stockist…
            </p>
          </div>
        )}

        {stockist && !stockistLoading && (
          <div
            className="sr-card stockist-card"
            style={{
              padding: "24px 28px",
              marginBottom: 20,
              borderLeft: "3px solid #52b788",
            }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#52b788",
                marginBottom: 10,
              }}
            >
              Nearest Stockist
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  className="shop-font"
                  style={{
                    fontSize: 24,
                    fontWeight: 400,
                    color: "#1a1a1a",
                    marginBottom: 4,
                  }}
                >
                  {stockist.name}
                </p>
                <p
                  className="body-font"
                  style={{ fontSize: 13, color: "#666", fontWeight: 300 }}
                >
                  {stockist.location_city && `${stockist.location_city}, `}
                  {stockist.location_province}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  className="shop-font"
                  style={{
                    fontSize: 32,
                    fontWeight: 300,
                    color: "#1b4332",
                    lineHeight: 1,
                  }}
                >
                  {stockist.distance_m < 1000
                    ? `${stockist.distance_m}m`
                    : `${(stockist.distance_m / 1000).toFixed(1)}km`}
                </p>
                <p
                  className="body-font"
                  style={{
                    fontSize: 10,
                    color: "#aaa",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  from your location
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── IP-INFERRED LOCATION ── */}
        {(gpsState === "idle" || gpsState === "denied") &&
          result?.userProfile?.city && (
            <div
              className="sr-card"
              style={{
                padding: "14px 20px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 16, color: "#aaa" }}>📍</span>
              <p
                className="body-font"
                style={{
                  fontSize: 12,
                  color: "#aaa",
                  fontWeight: 300,
                  margin: 0,
                }}
              >
                Scan detected near{" "}
                <strong style={{ color: "#555", fontWeight: 500 }}>
                  {result.userProfile.city}
                </strong>
                {result.userProfile.province &&
                  `, ${result.userProfile.province}`}
              </p>
            </div>
          )}

        {/* ── PROFILE COMPLETION NUDGE ── */}
        {user && userProfile && !userProfile.profile_complete && (
          <div
            className="sr-card"
            style={{
              padding: "20px 24px",
              marginBottom: 20,
              background: "#f0f9f4",
              borderLeft: "3px solid #52b788",
            }}
          >
            <p
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#52b788",
                marginBottom: 6,
              }}
            >
              Earn 50 Bonus Points
            </p>
            <p
              className="body-font"
              style={{
                fontSize: 13,
                color: "#555",
                fontWeight: 300,
                marginBottom: 14,
                lineHeight: 1.65,
              }}
            >
              Complete your profile to unlock personalised strain
              recommendations and earn 50 bonus points.
            </p>
            <Link
              to="/account?tab=profile"
              className="sr-btn sr-btn-green"
              style={{ fontSize: 10 }}
            >
              Complete Profile
            </Link>
          </div>
        )}

        {/* CTA row */}
        <div
          className="sr-cta-row"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <Link
            to="/shop"
            className="sr-btn sr-btn-outline"
            style={{ flex: 1, minWidth: 140 }}
          >
            Browse Shop
          </Link>
          <Link
            to="/loyalty"
            className="sr-btn sr-btn-green"
            style={{ flex: 1, minWidth: 140 }}
          >
            My Points
          </Link>
          <button
            className="sr-btn"
            style={{
              flex: 1,
              minWidth: 140,
              background: "transparent",
              border: "1px solid #d8d0c4",
              color: "#888",
              fontFamily: "'Jost', sans-serif",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              borderRadius: 2,
            }}
            onClick={() => navigate("/scan")}
          >
            Scan Another
          </button>
        </div>

        {/* Strain profile link */}
        {batch?.strain_id && (
          <div style={{ textAlign: "center" }}>
            <Link
              to={`/verify/${batch.strain_id}`}
              className="body-font"
              style={{
                fontSize: 11,
                color: "#aaa",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderBottom: "1px solid #ddd",
                paddingBottom: 2,
              }}
            >
              View full strain profile →
            </Link>
          </div>
        )}
      </div>

      {/* Footer strip */}
      <div
        style={{ background: "#060e09", padding: "24px 32px", marginTop: 32 }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span
            className="shop-font"
            style={{ fontSize: 16, color: "#faf9f6", letterSpacing: "0.2em" }}
          >
            Protea <span style={{ color: "#52b788" }}>Botanicals</span>
          </span>
          <p
            className="body-font"
            style={{
              fontSize: 10,
              color: "#333",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Lab Verified · QR Authenticated · South Africa
          </p>
        </div>
      </div>
    </div>
  );
}
