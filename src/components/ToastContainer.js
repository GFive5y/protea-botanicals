// src/components/ToastContainer.js — NuAi SC-04
// Bottom-center toast stack. Subscribes to toast.js singleton.
// Place once in TenantPortal and AppShell — nowhere else.

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "../services/toast";

// ── Type config ───────────────────────────────────────────────────────────
const TYPE = {
  success: { icon: "✓", accent: "#2D6A4F", bg: "#1A1A1A" },
  error: { icon: "✕", accent: "#EF4444", bg: "#1A1A1A" },
  warning: { icon: "⚠", accent: "#D97706", bg: "#1A1A1A" },
  info: { icon: "ℹ", accent: "#3B82F6", bg: "#1A1A1A" },
};

// ── Single toast item ──────────────────────────────────────────────────────
function ToastItem({ t, onDismiss }) {
  const cfg = TYPE[t.type] || TYPE.info;
  const hasUndo = typeof t.undo === "function";
  const [progress, setProgress] = useState(100);
  const [undone, setUndone] = useState(false);
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!t.duration) return; // error toasts — no timer
    const tick = 50;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / t.duration) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(intervalRef.current);
        onDismiss();
      }
    }, tick);
    return () => clearInterval(intervalRef.current);
  }, [t.duration, onDismiss]);

  const handleUndo = useCallback(async () => {
    if (undone) return;
    setUndone(true);
    clearInterval(intervalRef.current);
    try {
      await t.undo();
    } catch {}
    onDismiss();
  }, [undone, t, onDismiss]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: cfg.bg,
        borderRadius: 10,
        padding: "11px 14px",
        minWidth: 280,
        maxWidth: 440,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        borderLeft: `3.5px solid ${cfg.accent}`,
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
        position: "relative",
        overflow: "hidden",
        animation:
          "nuai-toast-in 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        pointerEvents: "all",
        cursor: "default",
      }}
    >
      {/* Type icon */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: cfg.accent,
          flexShrink: 0,
          width: 16,
          textAlign: "center",
        }}
      >
        {cfg.icon}
      </span>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: "#F5F5F5",
          lineHeight: 1.4,
        }}
      >
        {t.message}
      </span>

      {/* Undo button */}
      {hasUndo && !undone && (
        <button
          onClick={handleUndo}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 5,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "inherit",
            transition: "background 0.12s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.22)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "rgba(255,255,255,0.12)")
          }
        >
          Undo
        </button>
      )}

      {/* Dismiss × */}
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.35)",
          fontSize: 15,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          fontFamily: "inherit",
          lineHeight: 1,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "rgba(255,255,255,0.8)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "rgba(255,255,255,0.35)")
        }
      >
        ×
      </button>

      {/* Progress bar — only when duration > 0 */}
      {t.duration > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            background: cfg.accent,
            width: `${progress}%`,
            opacity: 0.5,
            transition: "width 0.05s linear",
          }}
        />
      )}
    </div>
  );
}

// ── Container — bottom-centre stack ───────────────────────────────────────
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = toast.subscribe((t) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { ...t, id }]);
    });
    return unsub;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes nuai-toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 44 /* clears the 28px system footer */,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </>
  );
}
