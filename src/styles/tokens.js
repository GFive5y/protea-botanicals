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

  // ─── BORDER ACCENTS ──────────────────────────────────────────
  // Added WP-DS-2/P3 (ActionCentre migration). Mid-tier border
  // colours for pill/badge/alert block outlines — sit between
  // the surface-light backgrounds and the deeper text-tier
  // colours. Required because T had no warning/danger border
  // slots — only light surfaces and bright semantic tiers.
  warningBorder:  "#FDE68A",   // mid-yellow warning border
  dangerBorder:   "#FECACA",   // light-pink danger border

  // WP-DS-6 — Layout & Container Tokens (11 Apr 2026)
  container: {
    narrow:  900,
    default: 1200,
    wide:    1400,
    full:    "100%",
  },
  page: {
    gutterX:     24,
    gutterY:     40,
    sectionGap:  32,
    cardGap:     16,
  },
  sidebar: {
    collapsed:  64,
    expanded:  220,
  },
  breakpoint: {
    mobile:   768,
    tablet:  1024,
    desktop: 1280,
    wide:    1440,
  },
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
// LEGACY — FONTS loader only (final surviving pre-WP-DS-1 export)
// ═══════════════════════════════════════════════════════════════════════════
//
// The WP-DS-1 → WP-DS-2 migration closed all C consumers in Priority 1:
//   - src/pages/CheckoutPage.js    (021b5dd)
//   - src/pages/Redeem.js          (b205c33)
//   - src/pages/WholesalePortal.js (3cff956)
//   - src/components/PageShell.js  (846280c — also added T.surfaceDark/brandGold)
//
// An earlier "Priority 2" claim of 11 additional consumer files was a FALSE
// POSITIVE from identifier-grep (matching local variable definitions rather
// than import statements). Exhaustive `grep "styles/tokens"` across src/ in
// commit 96d8f70 confirmed only the 4 Priority 1 files ever imported from
// this module. See docs/WP-DESIGN-SYSTEM.md for the full retraction and the
// LL-221 "grep imports, not identifiers" lesson.
//
// Archived in this cleanup commit (all had zero consumers, verified safe):
//   C, makeBtn, inputStyle, labelStyle, sectionLabel,
//   TIER_COLORS, LS, BANNER_H, POINTS_PER_SCAN, and the default export.
//
// Only FONTS survives below — last surviving legacy export. PageShell.js is
// its only consumer and is the global font loader for all WithNav routes
// (/loyalty, /redeem, /checkout, /order-success, /wholesale, /account,
// /welcome). Remove when PageShell's font loading is refactored in a future
// session (e.g. switch to a <link rel="stylesheet"> in public/index.html or
// a dedicated font-loading hook).
// ─────────────────────────────────────────────────────────────────────────────

export const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');
`;
