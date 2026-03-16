// src/components/WorkflowGuide.js — v1.0
// Protea Botanicals — WP-X System Intelligence Layer
// Reusable contextual onboarding + workflow guide for Admin and HQ tabs.
// Dismissable, never blocks UI, remembers state via localStorage per tab.

import { useState, useEffect } from "react";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  amber: "#f39c12",
  border: "#e8e0d4",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ─── Step status colours ────────────────────────────────────────────────────
function stepBg(status) {
  if (status === "auto") return "rgba(82,183,136,0.07)";
  if (status === "optional") return "rgba(136,136,136,0.05)";
  return "rgba(27,67,50,0.04)";
}
function stepBorder(status) {
  if (status === "auto") return "rgba(82,183,136,0.22)";
  if (status === "optional") return "#e8e0d4";
  return "rgba(27,67,50,0.12)";
}
function stepNumBg(status) {
  if (status === "auto") return C.accent;
  if (status === "optional") return C.muted;
  return C.green;
}

// ─── Sub-tab button ─────────────────────────────────────────────────────────
function InnerTab({ id, label, badge, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        background: "none",
        border: "none",
        borderBottom: active ? `2px solid ${C.green}` : "2px solid transparent",
        padding: "6px 14px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: active ? C.green : C.muted,
        cursor: "pointer",
        fontFamily: F.body,
        marginBottom: -1,
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "color 0.15s",
      }}
    >
      {label}
      {badge > 0 && (
        <span
          style={{
            background: "rgba(243,156,18,0.2)",
            color: C.amber,
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 8,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function WorkflowGuide({
  title,
  description,
  steps = [],
  warnings = [],
  dataFlow = [],
  tips = [],
  storageKey,
  defaultOpen = false,
  // aiContext reserved for WP-Y integration
}) {
  const lsKey = `wb_guide_${storageKey || (title || "").replace(/\s+/g, "_").toLowerCase()}`;

  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(lsKey);
      return saved !== null ? saved === "true" : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });
  const [innerTab, setInnerTab] = useState("workflow");

  useEffect(() => {
    try {
      localStorage.setItem(lsKey, String(open));
    } catch {}
  }, [open, lsKey]);

  const visibleTabs = [
    { id: "workflow", label: "📋 Workflow", show: steps.length > 0, badge: 0 },
    {
      id: "dataflow",
      label: "🔄 Data Flow",
      show: dataFlow.length > 0,
      badge: 0,
    },
    {
      id: "warnings",
      label: "⚠ Rules",
      show: warnings.length > 0,
      badge: warnings.length,
    },
    { id: "tips", label: "💡 Tips", show: tips.length > 0, badge: 0 },
  ].filter((t) => t.show);

  // keep innerTab valid when tabs change
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.id === innerTab)) {
      setInnerTab(visibleTabs[0].id);
    }
  }, [innerTab, visibleTabs]);

  return (
    <div
      style={{
        marginBottom: 16,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${C.accent}`,
        borderRadius: 2,
        background: C.white,
        fontFamily: F.body,
        overflow: "hidden",
      }}
    >
      {/* ── Collapsed bar ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: open ? "rgba(82,183,136,0.06)" : "transparent",
          border: "none",
          padding: "9px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontFamily: F.body,
          textAlign: "left",
          borderBottom: open ? `1px solid ${C.border}` : "none",
          transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: C.accent, lineHeight: 1 }}>
            ℹ
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.mid,
            }}
          >
            How this tab works
          </span>
          {warnings.length > 0 && !open && (
            <span
              style={{
                background: "rgba(243,156,18,0.15)",
                color: C.amber,
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: 10,
                letterSpacing: "0.08em",
              }}
            >
              {warnings.length} rule{warnings.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 9,
              color: C.muted,
              letterSpacing: "0.08em",
              opacity: 0.5,
              fontStyle: "italic",
            }}
          >
            💬 AI assist — coming soon
          </span>
          <span style={{ color: C.muted, fontSize: 11, lineHeight: 1 }}>
            {open ? "▲" : "▾"}
          </span>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {open && (
        <div style={{ padding: "16px 20px 20px" }}>
          {/* Title + description */}
          {(title || description) && (
            <div style={{ marginBottom: 14 }}>
              {title && (
                <div
                  style={{
                    fontFamily: F.heading,
                    fontSize: 18,
                    fontWeight: 600,
                    color: C.green,
                    marginBottom: 4,
                  }}
                >
                  {title}
                </div>
              )}
              {description && (
                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    lineHeight: 1.7,
                    maxWidth: 700,
                  }}
                >
                  {description}
                </div>
              )}
            </div>
          )}

          {/* Inner tab bar */}
          {visibleTabs.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: `1px solid ${C.border}`,
                marginBottom: 14,
              }}
            >
              {visibleTabs.map((t) => (
                <InnerTab
                  key={t.id}
                  id={t.id}
                  label={t.label}
                  badge={t.badge}
                  active={innerTab === t.id}
                  onClick={setInnerTab}
                />
              ))}
            </div>
          )}

          {/* ── Workflow steps ── */}
          {(innerTab === "workflow" ||
            (visibleTabs.length === 1 && visibleTabs[0].id === "workflow")) &&
            steps.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {steps.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "9px 13px",
                      background: stepBg(step.status),
                      border: `1px solid ${stepBorder(step.status)}`,
                      borderRadius: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: stepNumBg(step.status),
                        color: C.white,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: step.status === "auto" ? 10 : 10,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {step.status === "auto" ? "⚡" : step.number || i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: C.green,
                          marginBottom: step.desc ? 2 : 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        {step.label}
                        {step.status === "optional" && (
                          <span
                            style={{
                              fontSize: 9,
                              color: C.muted,
                              fontWeight: 400,
                            }}
                          >
                            OPTIONAL
                          </span>
                        )}
                        {step.status === "auto" && (
                          <span
                            style={{
                              fontSize: 9,
                              color: C.accent,
                              fontWeight: 600,
                            }}
                          >
                            AUTO
                          </span>
                        )}
                      </div>
                      {step.desc && (
                        <div
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            lineHeight: 1.55,
                          }}
                        >
                          {step.desc}
                        </div>
                      )}
                    </div>
                    {step.link && (
                      <a
                        href={step.link}
                        style={{
                          fontSize: 9,
                          color: C.accent,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textDecoration: "none",
                          textTransform: "uppercase",
                          flexShrink: 0,
                          padding: "3px 8px",
                          border: `1px solid ${C.accent}`,
                          borderRadius: 2,
                          marginTop: 1,
                        }}
                      >
                        Go →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

          {/* ── Data Flow ── */}
          {innerTab === "dataflow" && dataFlow.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dataFlow.map((item, i) => {
                const isIn = item.direction === "in";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "8px 12px",
                      background: isIn
                        ? "rgba(82,183,136,0.06)"
                        : "rgba(44,74,110,0.05)",
                      border: `1px solid ${isIn ? "rgba(82,183,136,0.2)" : "rgba(44,74,110,0.15)"}`,
                      borderRadius: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: isIn ? C.accent : C.blue,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                        minWidth: 26,
                        paddingTop: 2,
                        fontFamily: F.body,
                      }}
                    >
                      {isIn ? "IN" : "OUT"}
                    </span>
                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.green,
                        }}
                      >
                        {item.from}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: C.muted,
                          margin: "0 6px",
                        }}
                      >
                        →
                      </span>
                      <span style={{ fontSize: 12, color: C.green }}>
                        {item.to}
                      </span>
                      {item.note && (
                        <div
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            marginTop: 2,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Warnings / Rules ── */}
          {innerTab === "warnings" && warnings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 12px",
                    background: "rgba(243,156,18,0.05)",
                    border: "1px solid rgba(243,156,18,0.22)",
                    borderLeft: "3px solid #f39c12",
                    borderRadius: 2,
                  }}
                >
                  <span
                    style={{ fontSize: 12, flexShrink: 0, lineHeight: 1.5 }}
                  >
                    ⚠
                  </span>
                  <span
                    style={{ fontSize: 12, color: "#7d5a00", lineHeight: 1.6 }}
                  >
                    {w}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Tips ── */}
          {innerTab === "tips" && tips.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tips.map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 12px",
                    background: "rgba(44,74,110,0.05)",
                    border: "1px solid rgba(44,74,110,0.13)",
                    borderRadius: 2,
                  }}
                >
                  <span
                    style={{ fontSize: 12, flexShrink: 0, lineHeight: 1.5 }}
                  >
                    💡
                  </span>
                  <span
                    style={{ fontSize: 12, color: C.blue, lineHeight: 1.6 }}
                  >
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
