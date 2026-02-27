// src/components/AgeGate.js
// v1.0 — February 27, 2026
// Discreet 21+ age verification modal for Landing page
// localStorage persistence — shows once per browser
// Uses inline styles + tokens.js design system (NO Tailwind)

import { useState, useEffect } from "react";

const STORAGE_KEY = "protea_age_verified";

export default function AgeGate({ children }) {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        setVerified(true);
      }
    } catch (e) {
      // Private browsing or storage blocked — show gate anyway
      console.log("AgeGate: localStorage unavailable, showing gate");
    }
    setChecking(false);
  }, []);

  const handleYes = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
      // Proceed even if storage fails
    }
    setVerified(true);
  };

  const handleNo = () => {
    window.location.href = "https://www.google.com";
  };

  // Don't flash the gate while checking localStorage
  if (checking) return null;

  // Already verified — render children normally
  if (verified) return children;

  // === STYLES ===
  const overlay = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Jost', sans-serif",
  };

  const container = {
    textAlign: "center",
    maxWidth: 380,
    padding: "48px 32px",
  };

  const brandMark = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: 28,
    fontWeight: 300,
    color: "#52b788",
    letterSpacing: "0.15em",
    marginBottom: 40,
  };

  const question = {
    fontSize: 20,
    fontWeight: 300,
    color: "#ffffff",
    marginBottom: 44,
    lineHeight: 1.5,
  };

  const btnRow = {
    display: "flex",
    gap: 16,
    justifyContent: "center",
  };

  const btnYes = {
    padding: "14px 48px",
    backgroundColor: "#2d6a4f",
    color: "#ffffff",
    border: "none",
    borderRadius: 2,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    transition: "background-color 0.2s",
  };

  const btnNo = {
    padding: "14px 48px",
    backgroundColor: "transparent",
    color: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 2,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    transition: "border-color 0.2s",
  };

  const legal = {
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
    marginTop: 40,
    letterSpacing: "0.05em",
  };

  return (
    <>
      <div style={overlay}>
        <div style={container}>
          <div style={brandMark}>PROTEA BOTANICALS</div>
          <div style={question}>Are you 21 years or older?</div>
          <div style={btnRow}>
            <button
              onClick={handleYes}
              style={btnYes}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#1b4332";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#2d6a4f";
              }}
            >
              YES — ENTER
            </button>
            <button
              onClick={handleNo}
              style={btnNo}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.2)";
              }}
            >
              NO
            </button>
          </div>
          <div style={legal}>
            By entering you confirm you meet the legal age requirement in your
            jurisdiction.
          </div>
        </div>
      </div>
    </>
  );
}
