// src/components/viz/PipelineStages.js
// WP-VISUAL-SYSTEM — Horizontal pipeline status flow (clickable stages)
// Used in Distribution, Admin Dashboard, HQ Purchase Orders

const T = {
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#888888",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const STATUS_STYLES = {
  complete: {
    bg: T.successBg,
    bd: T.successBd,
    color: T.success,
    dot: T.success,
  },
  active: {
    bg: T.accentLit,
    bd: T.accentBd,
    color: T.accent,
    dot: T.accentMid,
  },
  pending: {
    bg: T.warningBg,
    bd: T.warningBd,
    color: T.warning,
    dot: T.warning,
  },
  overdue: { bg: T.dangerBg, bd: T.dangerBd, color: T.danger, dot: T.danger },
  draft: { bg: T.infoBg, bd: T.infoBd, color: T.info, dot: T.info },
  cancelled: { bg: T.dangerBg, bd: T.dangerBd, color: T.danger, dot: T.danger },
  idle: { bg: T.ink075, bd: T.ink150, color: T.ink500, dot: T.ink400 },
};

/**
 * PipelineStages — horizontal clickable pipeline status row
 *
 * @param {Array}    stages    — [{ id, label, count, status, sublabel }]
 *   status: "complete" | "active" | "pending" | "overdue" | "draft" | "cancelled" | "idle"
 *   count: number shown in the cell (optional)
 *   sublabel: small text below count (optional)
 * @param {string}   active    — id of currently selected stage (highlighted)
 * @param {function} onSelect  — (id) => void — called on cell click
 * @param {boolean}  showArrows — show → connectors between stages (default true)
 */
export default function PipelineStages({
  stages = [],
  active,
  onSelect,
  showArrows = true,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        overflowX: "auto",
        paddingBottom: 2,
      }}
    >
      {stages.map((stage, i) => {
        const s = STATUS_STYLES[stage.status] || STATUS_STYLES.idle;
        const isActive = active === stage.id;
        const isClickable = !!onSelect;

        return (
          <div key={stage.id} style={{ display: "flex", alignItems: "center" }}>
            {/* Stage cell */}
            <div
              onClick={() => isClickable && onSelect(stage.id)}
              style={{
                background: isActive ? s.bg : "#fff",
                border: `1.5px solid ${isActive ? s.bd : T.ink150}`,
                borderRadius: 6,
                padding: "10px 16px",
                cursor: isClickable ? "pointer" : "default",
                minWidth: 100,
                textAlign: "center",
                boxShadow: isActive ? T.shadow : "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (isClickable && !isActive)
                  e.currentTarget.style.borderColor = s.bd;
              }}
              onMouseLeave={(e) => {
                if (isClickable && !isActive)
                  e.currentTarget.style.borderColor = T.ink150;
              }}
            >
              {/* Status dot + label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  marginBottom: stage.count !== undefined ? 4 : 0,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: s.dot,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: T.fontUi,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: isActive ? s.color : T.ink400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </span>
              </div>

              {/* Count */}
              {stage.count !== undefined && (
                <div
                  style={{
                    fontFamily: T.fontUi,
                    fontSize: 22,
                    fontWeight: 400,
                    color: isActive ? s.color : T.ink700,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stage.count}
                </div>
              )}

              {/* Sublabel */}
              {stage.sublabel && (
                <div
                  style={{
                    fontFamily: T.fontUi,
                    fontSize: 10,
                    color: T.ink400,
                    marginTop: 2,
                  }}
                >
                  {stage.sublabel}
                </div>
              )}
            </div>

            {/* Arrow connector */}
            {showArrows && i < stages.length - 1 && (
              <div
                style={{
                  color: T.ink300,
                  fontSize: 16,
                  padding: "0 6px",
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                →
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
