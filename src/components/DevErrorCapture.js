// src/components/DevErrorCapture.js — WP-AI-UNIFIED Dev Mode
// React Error Boundary + console.error interceptor
// Captures errors into window.__proteaDevErrors[] for ProteaAI Dev tab
// Only active when isHQ = true (mounted inside AppShell)

import React from "react";

// ── Global error buffer — max 20 entries, newest first ───────────────────────
if (!window.__proteaDevErrors) {
  window.__proteaDevErrors = [];
}

function pushError(entry) {
  window.__proteaDevErrors = [
    { ...entry, ts: new Date().toISOString() },
    ...window.__proteaDevErrors,
  ].slice(0, 20);
  // Notify any listeners (ProteaAI Dev tab polls this)
  window.dispatchEvent(new CustomEvent("protea-dev-error", { detail: entry }));
}

// ── Console interceptor — installed once ─────────────────────────────────────
let consolePatched = false;
export function patchConsole() {
  if (consolePatched) return;
  consolePatched = true;

  const originalError = console.error.bind(console);
  console.error = (...args) => {
    originalError(...args);
    const msg = args
      .map((a) => {
        if (typeof a === "string") return a;
        if (a instanceof Error) return `${a.message}\n${a.stack || ""}`;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");

    // Filter out React internal noise that isn't actionable
    const noise = [
      "Warning: Each child in a list",
      "Warning: validateDOMNesting",
      "Warning: React does not recognize",
      "Download the React DevTools",
    ];
    if (noise.some((n) => msg.includes(n))) return;

    pushError({ type: "console.error", message: msg.slice(0, 800) });
  };

  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (e) => {
    const msg =
      e.reason?.message || String(e.reason) || "Unhandled promise rejection";
    pushError({ type: "unhandledrejection", message: msg.slice(0, 800) });
  });

  // Catch global JS errors
  window.addEventListener("error", (e) => {
    const msg = `${e.message} (${e.filename}:${e.lineno})`;
    pushError({ type: "window.error", message: msg.slice(0, 800) });
  });
}

// ── React Error Boundary ──────────────────────────────────────────────────────
export default class DevErrorCapture extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    // Patch console on first mount
    patchConsole();
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const msg = `${error.message}\n\nComponent stack:\n${info.componentStack}`;
    pushError({ type: "React.ErrorBoundary", message: msg.slice(0, 1200) });
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div
          style={{
            margin: 24,
            padding: 20,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#991B1B",
              marginBottom: 8,
            }}
          >
            ⚠ Component crashed — captured in ProteaAI Dev tab
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#7F1D1D",
              fontFamily: "monospace",
              background: "#FFF1F2",
              padding: "10px 12px",
              borderRadius: 4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {err?.message || "Unknown error"}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 12,
              padding: "6px 14px",
              background: "#991B1B",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
