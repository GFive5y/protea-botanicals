/**
 * NuAi Design Token System — Single Source of Truth
 * WP-DS-1 · Created 11 April 2026
 *
 * RULES:
 * - Import T from here. Never define T locally in a component.
 * - To change a colour platform-wide: change it here only.
 * - To add a new token: add here first, then use in component.
 * - Do NOT import this file into locked files (ProteaAI.js,
 *   StockItemModal.js, PlatformBar.js, supabaseClient.js)
 *
 * USAGE:
 *   import { T } from "../styles/tokens";
 *   import { getTokens } from "../styles/tokens"; // profile-aware
 *
 * FILE LAYOUT:
 *   1. NEW — WP-DS-1 T tokens + profileOverrides + helpers (below)
 *   2. LEGACY — C tokens + makeBtn + form styles + LS keys (bottom)
 *      The legacy section is load-bearing infrastructure with 4+ live
 *      C consumers (CheckoutPage, Redeem, WholesalePortal, PageShell)
 *      plus widespread use of LS / makeBtn / TIER_COLORS / BANNER_H /
 *      POINTS_PER_SCAN. Do NOT delete. Migration in WP-DS-2.
 */

// ═══════════════════════════════════════════════════════════════════════════
// NEW — WP-DS-1 BASE TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const T = {

  // Typography
  font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",

  // Type scale (px values for inline styles)
  text: {
    xs:   11,
    sm:   12,
    base: 14,
    md:   15,
    lg:   16,
    xl:   18,
    "2xl": 22,
    "3xl": 28,
    "4xl": 36,
  },

  // Font weights
  weight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  // Spacing scale (8px grid — all values multiples of 4)
  space: {
    0:  0,
    1:  4,
    2:  8,
    3:  12,
    4:  16,
    5:  20,
    6:  24,
    7:  32,
    8:  40,
    9:  48,
    10: 64,
    11: 80,
    12: 96,
  },

  // Border radius
  radius: {
    sm:   4,
    md:   8,
    lg:   12,
    xl:   16,
    full: 9999,
  },

  // Shadows
  shadow: {
    sm:   "0 1px 2px rgba(0,0,0,0.06)",
    md:   "0 1px 4px rgba(0,0,0,0.08)",
    lg:   "0 4px 12px rgba(0,0,0,0.10)",
    xl:   "0 8px 24px rgba(0,0,0,0.12)",
  },

  // Z-index scale
  z: {
    base:    0,
    raised:  10,
    overlay: 100,
    modal:   200,
    toast:   300,
    max:     9999,
  },

  // ─── BACKGROUNDS ─────────────────────────────────────────────
  bg:           "#f8f9fa",   // page background
  surface:      "#ffffff",   // card / panel surface
  surfaceAlt:   "#f1f3f5",   // alternate surface (zebra, sidebar)
  surfaceHover: "#e9ecef",   // hover state on surface

  // ─── BORDERS ─────────────────────────────────────────────────
  border:       "#dee2e6",   // default border
  borderMid:    "#ced4da",   // stronger border
  borderStrong: "#adb5bd",   // emphasis border

  // ─── TEXT ────────────────────────────────────────────────────
  ink900: "#212529",   // primary text
  ink700: "#495057",   // secondary text
  ink600: "#6c757d",   // muted text / labels
  ink400: "#adb5bd",   // disabled / placeholder
  ink200: "#dee2e6",   // very subtle text

  // ─── BRAND / ACCENT ──────────────────────────────────────────
  // Cannabis retail default — overridden per profile in getTokens()
  accent:       "#2d6a4f",   // primary brand green
  accentMid:    "#40916c",   // mid green
  accentLight:  "#d8f3dc",   // light green background
  accentText:   "#1b4332",   // text on light green bg

  // ─── SEMANTIC — SUCCESS ───────────────────────────────────────
  success:      "#27ae60",
  successMid:   "#2ecc71",
  successLight: "#eafaf1",
  successText:  "#1a6b3c",

  // ─── SEMANTIC — WARNING ───────────────────────────────────────
  warning:      "#e67e22",
  warningMid:   "#f39c12",
  warningLight: "#fef9f0",
  warningText:  "#7d4a00",

  // ─── SEMANTIC — DANGER ───────────────────────────────────────
  danger:       "#c0392b",
  dangerMid:    "#e74c3c",
  dangerLight:  "#fdf0ef",
  dangerText:   "#7b1a11",

  // ─── SEMANTIC — INFO ─────────────────────────────────────────
  info:         "#2980b9",
  infoMid:      "#3498db",
  infoLight:    "#eaf4fb",
  infoText:     "#14527a",

  // ─── SEMANTIC — NEUTRAL ───────────────────────────────────────
  neutral:      "#6c757d",
  neutralLight: "#f1f3f5",
  neutralText:  "#212529",

  // ─── DARK SURFACES ───────────────────────────────────────────
  // Added WP-DS-2 (PageShell migration). No dark-surface token
  // existed in WP-DS-1 base T. Required by: PageShell footer,
  // Redeem.js dark footer band, future modal overlays (WP-DS-4),
  // ambient danger state (WP-DS-5).
  surfaceDark:    "#1a1a1a",   // dark footer / dark hero surfaces
  surfaceDarkAlt: "#060e09",   // deepest surface (e.g. Redeem.js footer)

  // ─── BRAND ACCENTS ───────────────────────────────────────────
  // Added WP-DS-2 (PageShell migration). Protea Botanicals brand
  // gold — distinct from T.warning (which is WCAG warning orange).
  // Used for brand name treatment, footer hover highlights, and
  // luxury accent moments that are NOT semantic warnings.
  brandGold:      "#b5935a",   // Protea Botanicals brand accent (warm gold)
};

// ─── PROFILE-AWARE TOKEN OVERRIDES ────────────────────────────
// Each profile overrides only brand/accent tokens.
// All other tokens (spacing, radius, type, semantic) stay identical.

export const profileOverrides = {

  cannabis_retail: {
    // Default — deep confident green
    accent:      "#2d6a4f",
    accentMid:   "#40916c",
    accentLight: "#d8f3dc",
    accentText:  "#1b4332",
    brandLabel:  "NuAi Cannabis",
  },

  cannabis_dispensary: {
    // Clinical — trust language of healthcare
    accent:      "#1565c0",
    accentMid:   "#1976d2",
    accentLight: "#e3f2fd",
    accentText:  "#0d3c7a",
    brandLabel:  "NuAi Medical",
  },

  food_beverage: {
    // Warm — kitchen and hospitality
    accent:      "#7b3f00",
    accentMid:   "#a0522d",
    accentLight: "#fdf0e8",
    accentText:  "#4a2500",
    brandLabel:  "NuAi Kitchen",
  },

  general_retail: {
    // Confident charcoal — clean and neutral
    accent:      "#37474f",
    accentMid:   "#546e7a",
    accentLight: "#eceff1",
    accentText:  "#1c313a",
    brandLabel:  "NuAi Retail",
  },
};

// ─── HELPER — get merged tokens for a given industry profile ──
// Usage: const tokens = getTokens(industryProfile);
// HQ operator: call getTokens() with no argument — returns base T.

export const getTokens = (profile) => {
  if (!profile || !profileOverrides[profile]) return T;
  return { ...T, ...profileOverrides[profile] };
};

// ─── HELPER — semantic colour by severity ─────────────────────
// Usage: const { bg, text, border } = getSeverityTokens("critical");
// Used by ActionCentre, StatusPill, alerts.

export const getSeverityTokens = (severity) => {
  switch (severity) {
    case "critical": return {
      bg:     T.dangerLight,
      text:   T.dangerText,
      border: T.danger,
      dot:    T.danger,
    };
    case "warn":
    case "warning": return {
      bg:     T.warningLight,
      text:   T.warningText,
      border: T.warning,
      dot:    T.warning,
    };
    case "success": return {
      bg:     T.successLight,
      text:   T.successText,
      border: T.success,
      dot:    T.success,
    };
    case "info": return {
      bg:     T.infoLight,
      text:   T.infoText,
      border: T.info,
      dot:    T.info,
    };
    default: return {
      bg:     T.neutralLight,
      text:   T.neutralText,
      border: T.border,
      dot:    T.neutral,
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY — MIGRATION IN PROGRESS (WP-DS-2)
// ═══════════════════════════════════════════════════════════════════════════
//
// Everything below this banner is the pre-WP-DS-1 token system.
// It is STILL LOAD-BEARING. Do not remove.
//
// Live C consumers (4 files — priority migration targets for WP-DS-2):
//   - src/pages/CheckoutPage.js       (imports { C })
//   - src/pages/Redeem.js             (imports { C })
//   - src/pages/WholesalePortal.js    (imports { C })
//   - src/components/PageShell.js     (imports { FONTS, C })
//
// Live non-C consumers of this file (widespread, also covered in WP-DS-2):
//   - src/App.js                      (LS.ROLE + LS.DEV_MODE — auth persistence)
//   - src/pages/AdminDashboard.js
//   - src/pages/AdminQrGenerator.js   (deprecated 91c452f, still imported — removal pending)
//   - src/components/hq/HQFraud.js
//   - src/components/hq/HQDocuments.js
//   - src/components/AdminCustomerEngagement.js
//   - src/components/AdminShipments.js
//   - src/components/AdminFraudSecurity.js
//   - src/components/AdminBatchManager.js
//   - src/components/AdminNotifications.js
//   - src/components/AdminProductionModule.js
//
// The earlier WP-DS-1 planning doc stated "AdminQrGenerator.js was the last
// consumer — deprecated 91c452f". That claim was FALSE — see the list above.
// The correction is documented in docs/WP-DESIGN-SYSTEM.md alongside the
// WP-DS-1 status update.
//
// WP-DS-2 will migrate these consumers to import from T one file at a time.
// Until WP-DS-2 ships, every legacy export below must remain byte-for-byte
// identical to avoid runtime crashes on /checkout, /redeem, /wholesale, and
// every PageShell-wrapped route.
// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL DESIGN SYSTEM — Protea Botanicals QR Tracking System (legacy)
// All colours, fonts, button factory, form styles, and constants live here.
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
