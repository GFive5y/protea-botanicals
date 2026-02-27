// src/pages/ScanPage.js
// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE page — must be placed OUTSIDE the shared NavBar layout in App.js
// (same tier as Landing.js and Shop.js)
//
// Layout:
//   • Slim top bar — logo left, auth-aware right (username+settings+logout OR sign-in)
//   • Hero section — "Scan to Earn" headline
//   • Three animated method cards — Camera Scan / Upload QR Image / Enter Code
//   • Active method expands inline below the cards
//   • QR detection navigates to /scan/:qrCode
//
// Auth-aware header logic:
//   • Logged out: "Sign In to Earn Points" button → /account
//   • Logged in: username pill + ⚙ settings icon + 🛒 basket stub + Log Out
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../services/supabaseClient";

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
};

// ── Normalize a scanned value → extract bare QR code ─────────────────────────
// Handles full URLs like https://protea-botanicals.co.za/scan/PROTEA-PE-001
const extractQRCode = (raw) => {
  const trimmed = raw.trim();
  // If it looks like a URL, extract the last path segment
  if (trimmed.startsWith("http")) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || trimmed;
    } catch {
      return trimmed.split("/").pop() || trimmed;
    }
  }
  return trimmed;
};

// ── Method card definitions ───────────────────────────────────────────────────
const METHODS = [
  {
    id: "camera",
    icon: "📷",
    title: "Camera Scan",
    desc: "Point your camera at the QR code inside the packaging",
    note: "Requires HTTPS",
  },
  {
    id: "upload",
    icon: "📁",
    title: "Upload QR Image",
    desc: "Choose a photo of the QR code from your device",
    note: "Works everywhere",
  },
  {
    id: "manual",
    icon: "⌨️",
    title: "Enter Code",
    desc: "Type or paste the code printed below the QR",
    note: "Universal fallback",
  },
];

export default function ScanPage() {
  const navigate = useNavigate();

  // Auth state
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  // UI state
  const [activeMethod, setActiveMethod] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [scanMsg, setScanMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  // Camera refs
  const cameraRef = useRef(null);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setUserEmail(session.user.email || "");
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      setUserEmail(session?.user?.email || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Navigate to scan result ──────────────────────────────────────────────
  const goToResult = useCallback(
    (rawCode) => {
      const code = extractQRCode(rawCode);
      if (!code) return;
      navigate(`/scan/${encodeURIComponent(code)}`);
    },
    [navigate],
  );

  // ── Camera scanner lifecycle ─────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (scannerRef.current) return; // already running
    try {
      const scanner = new Html5Qrcode("pb-camera-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          stopCamera();
          goToResult(decodedText);
        },
        () => {}, // ignore per-frame errors
      );
      setScanMsg("");
    } catch (err) {
      setScanMsg(
        err?.message?.includes("permission")
          ? "Camera permission denied. Please allow camera access and try again."
          : "Camera unavailable. Try Upload or Enter Code instead.",
      );
      scannerRef.current = null;
    }
  }, [goToResult]);

  const stopCamera = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          scannerRef.current = null;
        });
    }
  }, []);

  // Start camera when method = 'camera'
  useEffect(() => {
    if (activeMethod === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeMethod, startCamera, stopCamera]);

  // ── Upload handler ───────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setScanMsg("");

    try {
      const scanner = new Html5Qrcode("pb-upload-scratch");
      const result = await scanner.scanFile(file, true);
      await scanner.clear();
      goToResult(result);
    } catch (err) {
      setScanMsg(
        "Could not read a QR code from that image. Try a clearer photo, or use Enter Code.",
      );
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Manual submit ────────────────────────────────────────────────────────
  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      setScanMsg("Please enter a code.");
      return;
    }
    goToResult(code);
  };

  // ── Select method ────────────────────────────────────────────────────────
  const selectMethod = (id) => {
    setScanMsg("");
    setManualCode("");
    setActiveMethod((prev) => (prev === id ? null : id));
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("protea_role");
    localStorage.removeItem("protea_dev_mode");
    setUser(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>
        {FONTS}
        {`
        @keyframes pb-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pb-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(82,183,136,0.4); }
          50%       { box-shadow: 0 0 0 8px rgba(82,183,136,0); }
        }
        .pb-method-card {
          cursor: pointer;
          transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
          animation: pb-fadein 0.4s ease both;
        }
        .pb-method-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(27,67,50,0.12);
        }
        .pb-method-card.active {
          border-color: #52b788 !important;
          box-shadow: 0 0 0 2px rgba(82,183,136,0.3) !important;
        }
        .pb-expand {
          animation: pb-fadein 0.25s ease both;
        }
        #pb-camera-reader video { border-radius: 4px; }
        #pb-camera-reader img   { display: none; }
        /* Hide the default html5-qrcode UI chrome */
        #pb-camera-reader > div:last-child { display: none !important; }
        #pb-upload-scratch { display: none; }
        .pb-scan-btn {
          background: #1b4332; color: #fff;
          border: none; border-radius: 2px;
          padding: 12px 28px;
          font-family: Jost, sans-serif;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase;
          cursor: pointer; transition: background 0.15s;
          width: 100%;
        }
        .pb-scan-btn:hover { background: #2d6a4f; }
        .pb-scan-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pb-input {
          width: 100%; padding: 12px 14px;
          border: 1px solid #e0dbd2; border-radius: 2px;
          font-family: Jost, sans-serif; font-size: 14px;
          color: #1a1a1a; background: #fdfcfa;
          box-sizing: border-box; outline: none;
          transition: border-color 0.15s;
        }
        .pb-input:focus { border-color: #52b788; }
        @media (max-width: 600px) {
          .pb-cards { flex-direction: column !important; }
          .pb-method-card { min-width: unset !important; }
        }
      `}
      </style>

      <div
        style={{
          minHeight: "100vh",
          background: C.cream,
          fontFamily: "Jost, sans-serif",
        }}
      >
        {/* ── Slim auth-aware header ─────────────────────────────────────── */}
        <header
          style={{
            background: C.green,
            padding: "0 24px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "18px",
              fontWeight: "600",
              color: "#fff",
              letterSpacing: "0.06em",
              padding: 0,
            }}
          >
            Protea Botanicals
          </button>

          {/* Auth right side */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Username pill */}
              <button
                onClick={() => navigate("/my-account")}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "20px",
                  padding: "5px 14px",
                  fontFamily: "Jost, sans-serif",
                  fontSize: "11px",
                  fontWeight: "500",
                  color: "#fff",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  maxWidth: "160px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                ● {userEmail.split("@")[0]}
              </button>
              {/* Loyalty icon */}
              <button
                onClick={() => navigate("/loyalty")}
                title="My Loyalty Points"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: 1,
                  padding: "4px",
                }}
              >
                ⭐
              </button>
              {/* Settings icon */}
              <button
                onClick={() => navigate("/my-account")}
                title="Account Settings"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  lineHeight: 1,
                  padding: "4px",
                }}
              >
                ⚙️
              </button>
              {/* Log out */}
              <button
                onClick={handleLogout}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "2px",
                  padding: "5px 12px",
                  fontFamily: "Jost, sans-serif",
                  fontSize: "10px",
                  fontWeight: "600",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/account")}
              style={{
                background: C.accent,
                border: "none",
                borderRadius: "2px",
                padding: "8px 20px",
                fontFamily: "Jost, sans-serif",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: C.green,
                cursor: "pointer",
              }}
            >
              Sign In to Earn Points
            </button>
          )}
        </header>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div
          style={{
            background: `linear-gradient(160deg, ${C.green} 0%, ${C.mid} 100%)`,
            padding: "48px 24px 40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: C.accent,
              marginBottom: "10px",
              fontWeight: "600",
            }}
          >
            Loyalty QR Scanner
          </div>
          <h1
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(28px, 5vw, 42px)",
              fontWeight: "600",
              color: "#fff",
              margin: "0 0 12px",
              letterSpacing: "0.03em",
            }}
          >
            Scan to Earn Points
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.7)",
              maxWidth: "420px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            {user
              ? "Choose a scanning method below. Each product QR earns you 10 loyalty points."
              : "Sign in first, then scan the QR code inside your product packaging."}
          </p>

          {/* Not logged in nudge */}
          {!user && (
            <div
              style={{
                marginTop: "20px",
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "2px",
                padding: "10px 20px",
              }}
            >
              <span
                style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)" }}
              >
                You can still scan to verify product authenticity
              </span>
            </div>
          )}
        </div>

        {/* ── Method cards ──────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            padding: "40px 20px 60px",
          }}
        >
          <div
            className="pb-cards"
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "8px",
            }}
          >
            {METHODS.map((m, i) => (
              <div
                key={m.id}
                className={`pb-method-card${activeMethod === m.id ? " active" : ""}`}
                onClick={() => selectMethod(m.id)}
                style={{
                  flex: 1,
                  minWidth: "160px",
                  background: "#fff",
                  border: `1px solid ${activeMethod === m.id ? C.accent : C.border}`,
                  borderRadius: "2px",
                  padding: "24px 20px",
                  textAlign: "center",
                  animationDelay: `${i * 0.08}s`,
                  userSelect: "none",
                }}
              >
                <div
                  style={{
                    fontSize: "28px",
                    marginBottom: "10px",
                    lineHeight: 1,
                  }}
                >
                  {m.icon}
                </div>
                <div
                  style={{
                    fontFamily: "Jost, sans-serif",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: activeMethod === m.id ? C.green : C.text,
                    marginBottom: "6px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {m.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: C.muted,
                    lineHeight: "1.5",
                    marginBottom: "10px",
                  }}
                >
                  {m.desc}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: activeMethod === m.id ? C.accent : "#ccc",
                    fontWeight: "600",
                  }}
                >
                  {m.note}
                </div>
                {/* Active indicator dot */}
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background:
                      activeMethod === m.id ? C.accent : "transparent",
                    margin: "10px auto 0",
                    animation:
                      activeMethod === m.id ? "pb-pulse 1.5s infinite" : "none",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Error / info message */}
          {scanMsg && (
            <div
              style={{
                background: "#fff8ec",
                border: `1px solid #f0c860`,
                borderRadius: "2px",
                padding: "12px 16px",
                fontSize: "13px",
                color: "#7a5010",
                marginTop: "12px",
                lineHeight: "1.5",
              }}
            >
              ⚠ {scanMsg}
            </div>
          )}

          {/* ── Expanded panels ─────────────────────────────────────────── */}

          {/* Camera */}
          {activeMethod === "camera" && (
            <div
              className="pb-expand"
              style={{
                marginTop: "20px",
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: C.accent,
                  marginBottom: "16px",
                  fontWeight: "600",
                }}
              >
                Camera Active
              </div>
              {/* html5-qrcode mounts here */}
              <div
                id="pb-camera-reader"
                style={{
                  maxWidth: "300px",
                  margin: "0 auto 16px",
                  background: "#000",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              />
              <p
                style={{
                  fontSize: "12px",
                  color: C.muted,
                  textAlign: "center",
                  marginBottom: "16px",
                }}
              >
                Hold the inside-packaging QR code steady in the frame
              </p>
              <button
                className="pb-scan-btn"
                onClick={() => setActiveMethod(null)}
              >
                Cancel Camera
              </button>
            </div>
          )}

          {/* Upload */}
          {activeMethod === "upload" && (
            <div
              className="pb-expand"
              style={{
                marginTop: "20px",
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: C.accent,
                  marginBottom: "16px",
                  fontWeight: "600",
                }}
              >
                Upload QR Image
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: C.muted,
                  marginBottom: "20px",
                  lineHeight: "1.6",
                }}
              >
                Take a clear photo of the QR code (inside the packaging) and
                select it below. The QR must be visible and in focus.
              </p>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${C.border}`,
                  borderRadius: "2px",
                  padding: "36px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: uploading ? C.warm : "#fdfcfa",
                  transition: "background 0.2s",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                  {uploading ? "⏳" : "📁"}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: C.text,
                    fontWeight: "500",
                    marginBottom: "4px",
                  }}
                >
                  {uploading ? "Reading QR code…" : "Click to select image"}
                </div>
                <div style={{ fontSize: "11px", color: C.muted }}>
                  JPG, PNG, WEBP — max 10MB
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />

              {/* Hidden div for html5-qrcode file scanning */}
              <div id="pb-upload-scratch" />

              <button
                className="pb-scan-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Processing…" : "Choose Photo"}
              </button>
            </div>
          )}

          {/* Manual entry */}
          {activeMethod === "manual" && (
            <div
              className="pb-expand"
              style={{
                marginTop: "20px",
                background: "#fff",
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: C.accent,
                  marginBottom: "16px",
                  fontWeight: "600",
                }}
              >
                Enter Code Manually
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: C.muted,
                  marginBottom: "20px",
                  lineHeight: "1.6",
                }}
              >
                The code is printed in small text below or beside the QR code on
                the inside of your packaging. It looks like:{" "}
                <code
                  style={{
                    background: C.warm,
                    padding: "2px 6px",
                    borderRadius: "2px",
                    fontSize: "12px",
                  }}
                >
                  PROTEA-PE-001
                </code>
              </p>
              <form onSubmit={handleManualSubmit}>
                <input
                  className="pb-input"
                  type="text"
                  placeholder="e.g. PROTEA-PE-001"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  autoFocus
                  style={{ marginBottom: "12px" }}
                />
                <button
                  type="submit"
                  className="pb-scan-btn"
                  disabled={!manualCode.trim()}
                >
                  Verify & Claim Points
                </button>
              </form>
            </div>
          )}

          {/* Bottom hint */}
          <div
            style={{
              marginTop: "40px",
              textAlign: "center",
              fontSize: "12px",
              color: C.muted,
              lineHeight: "1.6",
            }}
          >
            <strong style={{ color: C.text }}>Which QR code?</strong>
            <br />
            Use the QR code <em>inside</em> the product packaging — not the
            outer box.
            <br />
            The outer box QR verifies authenticity at{" "}
            <button
              onClick={() => navigate("/verify")}
              style={{
                background: "none",
                border: "none",
                color: C.accent,
                cursor: "pointer",
                fontFamily: "Jost, sans-serif",
                fontSize: "12px",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              /verify
            </button>
            .
          </div>
        </div>
      </div>
    </>
  );
}
