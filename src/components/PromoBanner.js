// src/components/PromoBanner.js
// v1.0 — February 27, 2026
// Dismissible promo banner triggered by ?promo= query param
// Persists dismissal per promo code via localStorage
// Uses inline styles + tokens.js design system (NO Tailwind)

import { useState, useEffect } from "react";

// Promo content config — add new campaigns here
const PROMO_CONTENT = {
  "preregister-1000": {
    headline: "Pre-Register & Earn 1,000 Bonus Points",
    body: "Be among the first 100 members. Scan any product after launch to activate your bonus.",
    cta: "Create Account",
    ctaLink: "/account",
  },
  "launch-special": {
    headline: "Launch Special — Double Points",
    body: "Every scan earns 20 points instead of 10. Limited time only.",
    cta: "Start Scanning",
    ctaLink: "/scan",
  },
};

const DEFAULT_PROMO = {
  headline: "Special Offer",
  body: "You have a special promotion waiting. Create an account to claim it.",
  cta: "Get Started",
  ctaLink: "/account",
};

export default function PromoBanner({ promo, onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState(null);

  useEffect(() => {
    if (!promo) return;

    try {
      const key = `protea_promo_dismissed_${promo}`;
      if (localStorage.getItem(key) === "true") return;
    } catch (e) {
      // If localStorage unavailable, still show the banner
    }

    const promoContent = PROMO_CONTENT[promo] || {
      ...DEFAULT_PROMO,
      headline: `Promo: ${promo.replace(/-/g, " ")}`,
    };

    setContent(promoContent);
    setVisible(true);
  }, [promo]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(`protea_promo_dismissed_${promo}`, "true");
    } catch (e) {
      /* proceed */
    }
    setVisible(false);
  };

  const handleCta = () => {
    handleDismiss();
    if (onNavigate && content?.ctaLink) {
      onNavigate(content.ctaLink);
    }
  };

  if (!visible || !content) return null;

  // === STYLES ===
  const banner = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    backgroundColor: "#1b4332",
    borderTop: "1px solid rgba(82, 183, 136, 0.3)",
    padding: "18px 24px",
    fontFamily: "'Jost', sans-serif",
  };

  const inner = {
    maxWidth: 640,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  };

  const textBlock = {
    flex: 1,
    minWidth: 0,
  };

  const headlineStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: "#52b788",
    marginBottom: 3,
    letterSpacing: "0.05em",
  };

  const bodyStyle = {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.4,
  };

  const btnGroup = {
    display: "flex",
    gap: 8,
    flexShrink: 0,
    alignItems: "center",
  };

  const ctaBtn = {
    padding: "10px 20px",
    backgroundColor: "#52b788",
    color: "#1b4332",
    border: "none",
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    whiteSpace: "nowrap",
  };

  const closeBtn = {
    padding: "8px 10px",
    backgroundColor: "transparent",
    color: "rgba(255,255,255,0.4)",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
  };

  return (
    <div style={banner}>
      <div style={inner}>
        <div style={textBlock}>
          <div style={headlineStyle}>{content.headline}</div>
          <div style={bodyStyle}>{content.body}</div>
        </div>
        <div style={btnGroup}>
          <button onClick={handleCta} style={ctaBtn}>
            {content.cta}
          </button>
          <button onClick={handleDismiss} style={closeBtn} aria-label="Dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
