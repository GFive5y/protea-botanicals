// src/theme.js — WP-THEME v1.0
// Protea Botanicals SaaS ERP — Unified Design System
// ─────────────────────────────────────────────────────────────────────────────
// THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL DESIGN TOKENS.
// Every component must import from here. Never hardcode colours, fonts, or
// spacing values inline. If it's not in this file, it doesn't exist.
//
// USAGE:
//   import { T } from '../theme';
//   <div style={{ color: T.ink[700], fontFamily: T.font.ui }} />
//
// SESSIONS: Read this file before touching any component. Do not add new
// colour values without updating this file first.
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  // ── NEUTRAL SCALE ─────────────────────────────────────────────────────────
  // Use these for all text, borders, backgrounds, and non-semantic UI.
  ink: {
    900: "#0D0D0D", // Primary text — headings, critical labels
    700: "#2C2C2C", // Body text — paragraphs, table cells
    500: "#5A5A5A", // Secondary / muted — captions, placeholders
    300: "#999999", // Placeholder text, inactive icons
    150: "#E2E2E2", // Borders, dividers, separators
    75: "#F4F4F3", // Subtle fills — row hover, code blocks
    50: "#FAFAF9", // Card backgrounds (white alternative)
  },
  pageBg: "#F6F6F5", // App chrome background (outside cards)

  // ── SEMANTIC COLOURS ──────────────────────────────────────────────────────
  // STRICT USAGE — see rules below. Never use decoratively.

  success: {
    text: "#166534", // Positive values, confirmed status, completed
    bg: "#F0FDF4",
    bd: "#BBF7D0",
  },

  warning: {
    text: "#92400E", // Needs attention, missing data, approaching limits
    bg: "#FFFBEB",
    bd: "#FDE68A",
  },

  danger: {
    text: "#991B1B", // Errors, critical, overdue, fraud, destructive
    bg: "#FEF2F2",
    bd: "#FECACA",
  },

  info: {
    text: "#1E3A5F", // Counts, reference data, notes — non-actionable
    bg: "#EFF6FF",
    bd: "#BFDBFE",
  },

  // ── BRAND / ACCENT ────────────────────────────────────────────────────────
  // Used for primary CTA buttons and active nav state ONLY.
  // Do not repurpose for status signals.
  accent: {
    dark: "#1A3D2B", // Primary buttons, active nav
    mid: "#2D6A4F", // Hover states
    lit: "#E8F5EE", // Subtle accent backgrounds
    bd: "#A7D9B8", // Accent borders
    text: "#1A3D2B", // Text on accent-lit background
  },

  // ── TYPOGRAPHY ────────────────────────────────────────────────────────────
  font: {
    ui: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    data: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    // ui:   used for ALL text — headings, body, labels, buttons
    // data: used for numeric metric values, codes, IDs, SKUs
    // No Outfit. No DM Mono. No Cormorant Garamond. No Jost.
  },

  // ── TYPE SCALE ────────────────────────────────────────────────────────────
  type: {
    pageTitle: { fontSize: "22px", fontWeight: 300, letterSpacing: "-0.01em" },
    sectionHead: { fontSize: "16px", fontWeight: 500 },
    cardTitle: { fontSize: "13px", fontWeight: 600 },
    label: {
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    },
    body: { fontSize: "13px", fontWeight: 400, lineHeight: "1.6" },
    caption: { fontSize: "11px", fontWeight: 400 },
    metricLg: {
      fontSize: "32px",
      fontWeight: 300,
      letterSpacing: "-0.03em",
      fontVariantNumeric: "tabular-nums",
    },
    metricMd: {
      fontSize: "24px",
      fontWeight: 400,
      letterSpacing: "-0.02em",
      fontVariantNumeric: "tabular-nums",
    },
    metricSm: {
      fontSize: "18px",
      fontWeight: 400,
      letterSpacing: "-0.01em",
      fontVariantNumeric: "tabular-nums",
    },
    code: {
      fontSize: "12px",
      fontWeight: 400,
      fontVariantNumeric: "tabular-nums",
    },
  },

  // ── SPACING ───────────────────────────────────────────────────────────────
  // 4px base unit. Only these values are allowed.
  space: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
  },

  // ── BORDER RADIUS ─────────────────────────────────────────────────────────
  radius: {
    sm: "3px", // Badges, small pills
    md: "6px", // Buttons, alerts, most components
    lg: "10px", // Cards, panels, modals
    xl: "16px", // Floating elements
  },

  // ── SHADOWS ───────────────────────────────────────────────────────────────
  shadow: {
    card: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
    hover: "0 4px 12px rgba(0,0,0,0.08)",
    popover: "0 8px 24px rgba(0,0,0,0.10)",
  },

  // ── BORDER ────────────────────────────────────────────────────────────────
  border: {
    default: "1px solid #E2E2E2",
    subtle: "1px solid #F4F4F3",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT STYLE FACTORIES
// Call these to get consistent inline style objects for common elements.
// ─────────────────────────────────────────────────────────────────────────────

// Page title
export const pageTitle = () => ({
  ...T.type.pageTitle,
  fontFamily: T.font.ui,
  color: T.ink[900],
  margin: 0,
});

// Section heading
export const sectionHeading = () => ({
  ...T.type.sectionHead,
  fontFamily: T.font.ui,
  color: T.ink[900],
  margin: "0 0 16px",
});

// Column label (all-caps, spaced)
export const columnLabel = () => ({
  ...T.type.label,
  fontFamily: T.font.ui,
  color: T.ink[500],
});

// Metric value (DM Mono, large)
export const metricValue = (semantic = null) => ({
  ...T.type.metricLg,
  fontFamily: T.font.data,
  color:
    semantic === "success"
      ? T.success.text
      : semantic === "warning"
        ? T.warning.text
        : semantic === "danger"
          ? T.danger.text
          : T.ink[900],
});

// Card container
export const card = () => ({
  background: "#ffffff",
  borderRadius: T.radius.lg,
  border: T.border.default,
  padding: T.space[5],
  boxShadow: T.shadow.card,
});

// Alert bar (semantic)
export const alertBar = (variant) => {
  const map = {
    success: T.success,
    warning: T.warning,
    danger: T.danger,
    info: T.info,
  };
  const v = map[variant] || T.info;
  return {
    background: v.bg,
    border: `1px solid ${v.bd}`,
    borderRadius: T.radius.md,
    padding: "12px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: T.space[2],
    marginBottom: T.space[3],
    color: v.text,
  };
};

// Badge
export const badge = (variant = "neutral") => {
  const map = {
    success: { background: T.success.bg, color: T.success.text },
    warning: { background: T.warning.bg, color: T.warning.text },
    danger: { background: T.danger.bg, color: T.danger.text },
    info: { background: T.info.bg, color: T.info.text },
    neutral: { background: T.ink[75], color: T.ink[500] },
    accent: { background: T.accent.lit, color: T.accent.text },
  };
  return {
    ...(map[variant] || map.neutral),
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: T.radius.sm,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "2px 7px",
    fontFamily: T.font.ui,
    flexShrink: 0,
  };
};

// Button
export const button = (variant = "primary", size = "md") => {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: T.radius.sm,
    fontFamily: T.font.ui,
    fontSize: size === "sm" ? "10px" : "11px",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "opacity 0.15s, background 0.15s",
    padding: size === "sm" ? "6px 12px" : "9px 16px",
    border: "none",
  };
  const variants = {
    primary: { background: T.accent.dark, color: "#ffffff", border: "none" },
    secondary: {
      background: "transparent",
      color: T.accent.dark,
      border: `1px solid ${T.accent.bd}`,
    },
    ghost: {
      background: "transparent",
      color: T.ink[700],
      border: `1px solid ${T.ink[150]}`,
    },
    danger: {
      background: "transparent",
      color: T.danger.text,
      border: `1px solid ${T.danger.bd}`,
    },
  };
  return { ...base, ...(variants[variant] || variants.primary) };
};

// Sub-tab item
export const subTab = (active = false) => ({
  padding: "10px 16px",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: active ? T.accent.dark : T.ink[400],
  cursor: "pointer",
  borderBottom: active ? `2px solid ${T.accent.dark}` : "2px solid transparent",
  marginBottom: "-1px",
  background: "none",
  borderTop: "none",
  borderLeft: "none",
  borderRight: "none",
  fontFamily: T.font.ui,
  whiteSpace: "nowrap",
  transition: "color 0.15s",
});

// Table header cell
export const tableHeader = () => ({
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink[400],
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: `2px solid ${T.ink[150]}`,
  fontFamily: T.font.ui,
});

// Table data cell
export const tableCell = () => ({
  padding: "11px 12px",
  borderBottom: `1px solid ${T.ink[75]}`,
  color: T.ink[700],
  fontSize: "12px",
  fontFamily: T.font.ui,
});

// Mono data cell (codes, IDs, numbers)
export const tableMonoCell = () => ({
  ...tableCell(),
  fontFamily: T.font.data,
  color: T.ink[900],
});

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR USAGE RULES (enforced in code review)
// ─────────────────────────────────────────────────────────────────────────────
//
// GREEN (accent/success):
//   T.accent.dark   → Primary CTA buttons, active nav item ONLY
//   T.success.text  → Positive metric values, healthy status, completed badge
//   NEVER use as card border colour or decorative fill
//
// AMBER/ORANGE (warning only):
//   T.warning.text  → Non-critical issues, missing data, approaching limits
//   NEVER use for primary CTA buttons or progress indicators
//
// RED (danger only):
//   T.danger.text   → Errors, critical, overdue, fraud, destructive buttons
//   NEVER use for non-urgent highlights
//
// PURPLE: NOT IN THIS SYSTEM — remove from loyalty card
//
// BLUE (info only):
//   T.info.text     → Counts, reference notes, non-actionable data
//   NEVER for warnings or CTA
//
// ICONS: Lucide React, stroke-width 1.5, fill="none", color="currentColor"
//   14px inline · 16px standalone · 20px card header
//   NO emoji anywhere in the authenticated ERP interface
//
// CARDS: Always white bg + T.ink[150] border
//   NO coloured top borders. Semantic state → alert bar or metric value colour
//
// FONTS: T.font.ui for everything · T.font.data for numeric values and codes
//   Cormorant Garamond is retired. Jost is retired.
//
// ─────────────────────────────────────────────────────────────────────────────
