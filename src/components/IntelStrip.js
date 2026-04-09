// src/components/IntelStrip.js
// WP-AINS Phase 3 — IntelStrip
// Horizontal pills bar between PlatformBar and page content.
// 4-6 SQL-computed pills specific to the current tab.
// No LLM. Loads on tab change. Each pill is clickable (Phase 6).

const T = {
  font:       "'Inter','Helvetica Neue',Arial,sans-serif",
  ink400:     "#6B6B6B",
  ink150:     "#E2E2E2",
  border:     "#ECEAE6",
  accent:     "#1A3D2B",
  success:    "#1A3D2B",
  successBg:  "#E8F5EE",
  successBd:  "#A7D9B8",
  warning:    "#92400E",
  warningBg:  "#FFFBEB",
  warningBd:  "#FDE68A",
  danger:     "#991B1B",
  dangerBg:   "#FEF2F2",
  dangerBd:   "#FECACA",
  info:       "#1E3A5F",
  infoBg:     "#EFF6FF",
  infoBd:     "#BFDBFE",
};

function pillColors(variant) {
  switch (variant) {
    case "success": return { bg: T.successBg, bd: T.successBd, val: T.success };
    case "warning": return { bg: T.warningBg, bd: T.warningBd, val: T.warning };
    case "danger":  return { bg: T.dangerBg,  bd: T.dangerBd,  val: T.danger  };
    case "info":    return { bg: T.infoBg,    bd: T.infoBd,    val: T.info    };
    default:        return { bg: "#F4F4F3",   bd: T.ink150,    val: "#2C2C2C" };
  }
}

const STRIP_CSS = `
@keyframes intel-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
.intel-pill-btn:hover { border-color: #1A3D2B !important; }
`;

if (typeof document !== "undefined" && !document.getElementById("intel-strip-css")) {
  const s = document.createElement("style");
  s.id = "intel-strip-css";
  s.textContent = STRIP_CSS;
  document.head.appendChild(s);
}

export default function IntelStrip({ pills, loading, onPillClick }) {
  if (!loading && (!pills || pills.length === 0)) return null;

  return (
    <div style={{
      background: "#ffffff",
      borderBottom: `1px solid ${T.border}`,
      padding: "8px 24px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      flexShrink: 0,
      fontFamily: T.font,
      minHeight: 44,
    }}>
      {loading ? (
        [1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            height: 28, width: 80 + i * 14, borderRadius: 20,
            background: "#F4F4F3",
            animation: "intel-pulse 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.12}s`,
          }} />
        ))
      ) : (
        pills.map((pill, i) => {
          const c = pillColors(pill.variant);
          return (
            <button
              key={i}
              className="intel-pill-btn"
              onClick={() => onPillClick && onPillClick(pill.context)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          6,
                background:   c.bg,
                border:       `0.5px solid ${c.bd}`,
                borderRadius: 20,
                padding:      "4px 12px",
                cursor:       onPillClick ? "pointer" : "default",
                fontFamily:   T.font,
                transition:   "border-color 0.12s",
                flexShrink:   0,
              }}
            >
              <span style={{
                fontSize:  10,
                color:     T.ink400,
                fontFamily: T.font,
                whiteSpace: "nowrap",
              }}>
                {pill.label}
              </span>
              <span style={{
                fontSize:   11,
                fontWeight: 600,
                color:      c.val,
                fontFamily: T.font,
                whiteSpace: "nowrap",
              }}>
                {pill.value}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
