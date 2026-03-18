// src/styles/tokens.js
// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL DESIGN SYSTEM — Protea Botanicals QR Tracking System
// All colours, fonts, button factory, form styles, and constants live here.
// Import this everywhere instead of repeating C / btn / styles.
// ─────────────────────────────────────────────────────────────────────────────

export const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');
`;

// ── Colour palette ──────────────────────────────────────────────────────────
export const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  orange: "#e67e22",
  cream: "#faf9f6",
  footer: "#1a1a1a",
  text: "#1a1a1a",
  muted: "#474747",
  error: "#c0392b",
  warm: "#f4f0e8",
  border: "#e0dbd2",
};

// ── Button factory ──────────────────────────────────────────────────────────
export const makeBtn = (bg, color = "#fff", extra = {}) => ({
  background: bg,
  color,
  border: "none",
  borderRadius: "2px",
  padding: "10px 20px",
  fontFamily: "Jost, sans-serif",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "all 0.2s",
  ...extra,
});

// ── Common form & UI styles ─────────────────────────────────────────────────
export const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontFamily: "Jost, sans-serif",
  fontSize: "14px",
  color: C.text,
  background: "#fdfcfa",
  boxSizing: "border-box",
  marginBottom: "12px",
};

export const labelStyle = {
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: C.muted,
  fontWeight: "600",
  display: "block",
  marginBottom: "6px",
};

export const sectionLabel = {
  fontSize: "11px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "16px",
};

// ── Loyalty tier colours ────────────────────────────────────────────────────
export const TIER_COLORS = {
  bronze: "#cd7f32",
  silver: "#9e9e9e",
  gold: C.gold,
};

// ── LocalStorage keys (prefixed to avoid conflicts) ─────────────────────────
export const LS = {
  ROLE: "protea_role",
  DEV_MODE: "protea_dev_mode",
};

// ── Constants ───────────────────────────────────────────────────────────────
export const BANNER_H = 40; // TEST MODE banner height
export const POINTS_PER_SCAN =
  Number(process.env.REACT_APP_POINTS_PER_SCAN) || 10;

export default {
  FONTS,
  C,
  makeBtn,
  inputStyle,
  labelStyle,
  sectionLabel,
  TIER_COLORS,
  LS,
  BANNER_H,
  POINTS_PER_SCAN,
};
