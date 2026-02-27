// src/styles/tokens.js
// ─────────────────────────────────────────────────────────────────────────────
// Protea Botanicals — single source of truth for design tokens.
// Import in every page: import { C, makeBtn, FONTS, label, sectionLabel } from '../styles/tokens';
// ─────────────────────────────────────────────────────────────────────────────

/** Google Fonts import string — add <style>{FONTS}</style> at top of every component */
export const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`;

/** Colour palette */
export const C = {
  green: "#1b4332", // primary dark — navbars, hero, primary buttons
  mid: "#2d6a4f", // hover states, secondary bg
  accent: "#52b788", // highlights, active, COA verified
  gold: "#b5935a", // prices, wholesale accent
  blue: "#2c4a6e", // info states, scan button
  brown: "#7c3a10", // wholesaler colour
  orange: "#e67e22", // dev mode banner, warnings
  cream: "#faf9f6", // page background
  warm: "#f4f0e8", // alternate section background
  footer: "#1a1a1a", // footer background
  text: "#1a1a1a", // primary body text
  muted: "#888888", // secondary / description text
  border: "#e0dbd2", // card / input borders
  error: "#c0392b", // error states
};

/**
 * Button style factory — keeps buttons consistent across all files.
 * @param {string} bg      - Background colour
 * @param {string} color   - Text colour (default #fff)
 * @param {object} extra   - Additional style overrides
 */
export const makeBtn = (bg, color = "#fff", extra = {}) => ({
  background: bg,
  color,
  border: "none",
  borderRadius: "2px",
  padding: "11px 24px",
  fontFamily: "Jost, sans-serif",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "opacity 0.15s",
  ...extra,
});

/** Shared input style */
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
  outline: "none",
};

/** Shared label style */
export const label = {
  fontSize: "11px",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: C.muted,
  fontWeight: "600",
  display: "block",
  marginBottom: "6px",
};

/** Section label (green accent, 0.35em spacing) */
export const sectionLabel = {
  fontSize: "11px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: "8px",
};

/** localStorage key prefix — avoids collisions with other apps */
export const LS = {
  ROLE: "protea_role",
  DEV_MODE: "protea_dev_mode",
};

/** Tier colour map */
export const TIER_COLORS = {
  bronze: "#cd7f32",
  silver: "#9e9e9e",
  gold: C.gold,
};
