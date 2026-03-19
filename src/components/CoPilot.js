// src/components/CoPilot.js v3.0
// WP-Y: AI CoPilot — Dual Mode: Script (free) + AI (Claude)
//
// v3.0 CHANGES:
//   1. Two modes: Script (🔇 zero tokens) + AI (🤖 Claude)
//   2. usePageContext integration — live business data from current route
//   3. Proactive Insights panel — surfaces warnings on open, no typing needed
//   4. Dynamic suggestions from live context data
//   5. Script mode local response engine (zero API calls)
//   6. Mode persisted to localStorage
//   7. Compressed pageContext injected into AI mode system prompt
//
// v2.5: Revert LottieCharacter size 120 → 80
// v2.4: Hide/show toggle — bot hidden by default
// v2.3: Frosted glass panel, gradient fade borders, Lottie bot
// v2.2: AnimatedAICharacter
// v2.1: Page-specific suggestion prompts
// v2.0: Slide-in sidebar, conversation history, role-aware

import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import { RoleContext } from "../App";
import { useTenant } from "../services/tenantService";
import { usePageContext } from "../hooks/usePageContext";
import {
  sendMessage,
  buildUserContext,
  generateScriptResponse,
  getContextSuggestions,
} from "../services/copilotService";
import LottieCharacter from "./LottieCharacter";
import AIOrb from "./AIOrb";

// ─── ROUTE → CONTEXT ID MAP ───────────────────────────────────────────────────
// Maps the current route to the appropriate usePageContext query key.
// Extends automatically as new context queries are registered.

const ROUTE_CONTEXT_MAP = {
  "/hq": "overview",
  "/admin": "overview",
  "/hr": "hr-staff",
  "/staff": "hr-staff",
  "/loyalty": "loyalty",
};

function getContextId(pathname) {
  if (!pathname || pathname === "/") return null;
  const segment = "/" + (pathname.split("/")[1] || "");
  return ROUTE_CONTEXT_MAP[segment] || null;
}

// ─── THEME ───────────────────────────────────────────────────────────────────

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  white: "#fff",
  border: "#e0dbd2",
  muted: "#888",
  text: "#1a1a1a",
  error: "#c0392b",
  amber: "#f59e0b",
};

const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

const PANEL_WIDTH = 370;

// ─── STATUS COLOURS ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ok: {
    bg: "rgba(82,183,136,0.12)",
    border: "rgba(82,183,136,0.35)",
    color: "#52b788",
    icon: "✅",
  },
  info: {
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.35)",
    color: "#60a5fa",
    icon: "ℹ️",
  },
  warn: {
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
    color: "#f59e0b",
    icon: "⚠️",
  },
  critical: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    color: "#ef4444",
    icon: "🔴",
  },
  setup: {
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.35)",
    color: "#a78bfa",
    icon: "🔧",
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getWelcome(role) {
  switch (role) {
    case "admin":
      return "Hey! I can help with system health, staff, stock, scan analytics, or anything on your dashboard. What do you need?";
    case "hr":
      return "Hello! I can help with staff records, leave management, payroll, disciplinary matters, or HR performance. What's on your mind?";
    case "retailer":
      return "Welcome! I can help with your orders, stock availability, or product information for your customers.";
    case "customer":
      return "Hi there! I can recommend strains, check your loyalty points, explain products, or help with anything Protea-related.";
    default:
      return "Welcome to Protea Botanicals! I can help you explore our premium vape strains, explain how our loyalty programme works, or answer any questions.";
  }
}

function renderMessageContent(text) {
  if (!text) return null;
  const parts = text.split("\n").map((line, i) => {
    let processed = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    if (/^\s*[-•→]\s/.test(processed)) {
      const bullet = processed.match(/^\s*([-•→])\s/)?.[1] || "•";
      processed = processed.replace(/^\s*[-•→]\s/, "");
      return (
        <div
          key={i}
          style={{
            paddingLeft: "14px",
            textIndent: "-10px",
            marginBottom: "3px",
          }}
        >
          <span style={{ color: bullet === "→" ? C.gold : C.accent }}>
            {bullet === "→" ? "→" : "•"}
          </span>{" "}
          <span dangerouslySetInnerHTML={{ __html: processed }} />
        </div>
      );
    }
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: processed }} />
        {i < text.split("\n").length - 1 && <br />}
      </span>
    );
  });
  return <>{parts}</>;
}

// ─── PROACTIVE INSIGHT CARD ───────────────────────────────────────────────────

function InsightCard({ warning, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.25)",
        borderLeft: "3px solid rgba(245,158,11,0.7)",
        borderRadius: "8px",
        padding: "9px 12px",
        fontSize: "12px",
        color: "#555",
        cursor: "pointer",
        lineHeight: 1.5,
        marginBottom: "6px",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(245,158,11,0.14)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "rgba(245,158,11,0.08)")
      }
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: C.amber,
          letterSpacing: "0.05em",
        }}
      >
        LIVE INSIGHT{" "}
      </span>
      {warning.replace(/^⚠\s*/, "")}
    </div>
  );
}

// ─── STATUS PILL ─────────────────────────────────────────────────────────────

function StatusPill({ status, headline }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ok;
  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: "8px",
        padding: "7px 12px",
        fontSize: "12px",
        color: cfg.color,
        fontWeight: 600,
        marginBottom: "10px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        lineHeight: 1.4,
      }}
    >
      <span>{cfg.icon}</span>
      <span
        style={{ color: "#444", fontWeight: 400, flex: 1, fontSize: "11.5px" }}
      >
        {headline}
      </span>
    </div>
  );
}

// ─── MODE TOGGLE ─────────────────────────────────────────────────────────────

function ModeToggle({ mode, onToggle }) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(0,0,0,0.15)",
        borderRadius: "20px",
        padding: "2px",
        gap: "1px",
      }}
    >
      <button
        onClick={() => mode !== "script" && onToggle()}
        title="Script mode — free, reads live data"
        style={{
          padding: "4px 10px",
          borderRadius: "18px",
          border: "none",
          cursor: mode === "script" ? "default" : "pointer",
          background:
            mode === "script" ? "rgba(255,255,255,0.2)" : "transparent",
          color: mode === "script" ? C.white : "rgba(255,255,255,0.45)",
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: FONTS.body,
          letterSpacing: "0.06em",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        🔇 Script
      </button>
      <button
        onClick={() => mode !== "ai" && onToggle()}
        title="AI mode — full Claude intelligence"
        style={{
          padding: "4px 10px",
          borderRadius: "18px",
          border: "none",
          cursor: mode === "ai" ? "default" : "pointer",
          background: mode === "ai" ? "rgba(255,255,255,0.2)" : "transparent",
          color: mode === "ai" ? C.white : "rgba(255,255,255,0.45)",
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: FONTS.body,
          letterSpacing: "0.06em",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        🤖 AI
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CoPilot() {
  const { role, userEmail } = useContext(RoleContext);
  const { tenantId } = useTenant();
  const location = useLocation();

  // ── Mode ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState(
    () => localStorage.getItem("copilot_mode") || "script",
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === "script" ? "ai" : "script";
      localStorage.setItem("copilot_mode", next);
      return next;
    });
  }, []);

  // ── Panel state ───────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [botVisible, setBotVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── Live context from current route ──────────────────────────────────────
  const contextId = getContextId(location.pathname);
  const pageCtx = usePageContext(contextId, tenantId);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Focus input on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ── Welcome message ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && messages.length === 0 && !hasInteracted) {
      setMessages([
        { role: "assistant", content: getWelcome(role), timestamp: new Date() },
      ]);
    }
  }, [isOpen, role, messages.length, hasInteracted]);

  // ── Clear on role change ──────────────────────────────────────────────────
  useEffect(() => {
    if (hasInteracted) return;
    setMessages([]);
  }, [role, hasInteracted]);

  // ── SEND HANDLER ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;

      setInput("");
      setHasInteracted(true);

      const userMessage = { role: "user", content: msg, timestamp: new Date() };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      // ── SCRIPT MODE: local response engine ───────────────────────────────
      if (mode === "script") {
        const scriptReply = generateScriptResponse(msg, pageCtx);

        if (scriptReply) {
          // Small delay for UX realism
          await new Promise((r) => setTimeout(r, 320));
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: scriptReply,
              timestamp: new Date(),
              isScript: true,
            },
          ]);
          setLoading(false);
          return;
        }

        // Script mode can't handle this query → suggest AI mode
        await new Promise((r) => setTimeout(r, 200));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "💡 This question needs deeper analysis.\n\nSwitch to **AI mode** (toggle above) to ask Claude directly — it has full access to your live business data and can answer complex questions.",
            timestamp: new Date(),
            isUpgrade: true,
          },
        ]);
        setLoading(false);
        return;
      }

      // ── AI MODE: full Claude via Edge Function ────────────────────────────
      try {
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const userContext = await buildUserContext(
          { role, userEmail },
          location.pathname,
          pageCtx,
        );
        const result = await sendMessage(apiMessages, userContext);

        if (result.reply) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: result.reply, timestamp: new Date() },
          ]);
        } else if (result.error) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Sorry, I ran into an issue: ${result.error}`,
              timestamp: new Date(),
              isError: true,
            },
          ]);
        }
      } catch (err) {
        console.error("[CoPilot] Send error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm having trouble connecting right now. Please try again in a moment.",
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [
      input,
      loading,
      messages,
      role,
      userEmail,
      location.pathname,
      mode,
      pageCtx,
    ],
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      { role: "assistant", content: getWelcome(role), timestamp: new Date() },
    ]);
    setHasInteracted(false);
  };

  // ── Suggestions ───────────────────────────────────────────────────────────
  const suggestions = getContextSuggestions(
    pageCtx && !pageCtx.loading ? pageCtx : null,
    role,
    location.pathname,
  );

  // ── Hide on scan result pages ─────────────────────────────────────────────
  const hiddenPaths = ["/scan/"];
  const shouldHide = hiddenPaths.some(
    (p) => location.pathname.startsWith(p) && location.pathname !== "/scan",
  );

  // ── Proactive insights available? ─────────────────────────────────────────
  const hasInsights =
    !hasInteracted &&
    pageCtx &&
    !pageCtx.loading &&
    pageCtx.warnings?.length > 0 &&
    role !== "customer";

  return (
    <>
      {/* ── Bot toggle ── */}
      {!shouldHide && (
        <>
          {botVisible ? (
            <div
              style={{
                position: "fixed",
                bottom: 24,
                right: 24,
                zIndex: 9998,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              {/* Insight pulse badge */}
              {hasInsights && !isOpen && (
                <div
                  style={{
                    background: "rgba(245,158,11,0.9)",
                    color: "#fff",
                    borderRadius: "20px",
                    padding: "3px 10px",
                    fontSize: "10px",
                    fontWeight: 700,
                    fontFamily: FONTS.body,
                    letterSpacing: "0.06em",
                    animation: "copilot-pulse 2s ease-in-out infinite",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => setIsOpen(true)}
                >
                  ⚠ {pageCtx.warnings.length} live insight
                  {pageCtx.warnings.length > 1 ? "s" : ""}
                </div>
              )}
              <button
                onClick={() => setBotVisible(false)}
                title="Hide assistant"
                style={{
                  background: "rgba(27,67,50,0.75)",
                  border: "none",
                  color: "rgba(255,255,255,0.75)",
                  borderRadius: "12px",
                  padding: "3px 10px",
                  fontSize: "10px",
                  cursor: "pointer",
                  fontFamily: FONTS.body,
                  letterSpacing: "0.08em",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background = "rgba(27,67,50,0.95)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.background = "rgba(27,67,50,0.75)")
                }
              >
                hide ✕
              </button>
              <LottieCharacter
                isOpen={isOpen}
                isThinking={loading}
                onClick={() => setIsOpen(true)}
                size={80}
              />
            </div>
          ) : (
            <button
              onClick={() => setBotVisible(true)}
              title="Show AI assistant"
              style={{
                position: "fixed",
                bottom: 80,
                right: 0,
                zIndex: 9998,
                background: "rgba(27,67,50,0.88)",
                border: "none",
                color: C.accent,
                borderRadius: "8px 0 0 8px",
                padding: "12px 7px",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
                boxShadow: "-2px 2px 12px rgba(0,0,0,0.18)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.15s, padding 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(27,67,50,1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(27,67,50,0.88)")
              }
            >
              <AIOrb active={loading} size={22} />
              {hasInsights && (
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: C.amber,
                    flexShrink: 0,
                    animation: "copilot-pulse 2s ease-in-out infinite",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: "9px",
                  fontFamily: FONTS.body,
                  letterSpacing: "0.1em",
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  color: "rgba(255,255,255,0.6)",
                  textTransform: "uppercase",
                }}
              >
                AI
              </span>
            </button>
          )}
        </>
      )}

      {/* ── Backdrop ── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.05)",
            animation: "copilot-backdrop-in 0.15s ease-out",
          }}
        />
      )}

      {/* ── Main panel ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: `${PANEL_WIDTH}px`,
          maxWidth: "90vw",
          zIndex: 10000,
          background: "rgba(250, 249, 246, 0.55)",
          backdropFilter: "blur(12px) saturate(1.2)",
          WebkitBackdropFilter: "blur(12px) saturate(1.2)",
          display: "flex",
          flexDirection: "column",
          fontFamily: FONTS.body,
          transform: isOpen
            ? "translateX(0)"
            : `translateX(${PANEL_WIDTH + 10}px)`,
          transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
          boxShadow: isOpen
            ? "-20px 0 60px rgba(0,0,0,0.12), -4px 0 20px rgba(0,0,0,0.06)"
            : "none",
        }}
      >
        {/* Left edge fade */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: -30,
            bottom: 0,
            width: 30,
            background:
              "linear-gradient(to right, transparent, rgba(250,249,246,0.3))",
            pointerEvents: "none",
          }}
        />

        {/* ── Header ── */}
        <div
          style={{
            background: "rgba(27, 67, 50, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "12px 14px 10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxShadow: "0 4px 20px rgba(27, 67, 50, 0.15)",
          }}
        >
          {/* Left: Lottie + title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AIOrb active={loading} size={44} />
            <div>
              <div
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: C.accent,
                  marginBottom: "1px",
                  opacity: 0.8,
                }}
              >
                Protea Botanicals
              </div>
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: "17px",
                  fontWeight: 600,
                  color: C.white,
                }}
              >
                AI Assistant
              </div>
            </div>
          </div>

          {/* Right: mode toggle + actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "6px",
            }}
          >
            <ModeToggle mode={mode} onToggle={toggleMode} />
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontFamily: FONTS.body,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background = "rgba(255,255,255,0.15)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.background = "rgba(255,255,255,0.08)")
                }
              >
                🗑
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "16px",
                  lineHeight: 1,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background = "rgba(255,255,255,0.15)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.background = "rgba(255,255,255,0.08)")
                }
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* ── Messages area ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background:
              "linear-gradient(to bottom, rgba(27,67,50,0.04) 0%, transparent 40px)",
          }}
        >
          {/* ── Proactive Insights (script mode + live warnings) ── */}
          {!hasInteracted &&
            messages.length <= 1 &&
            pageCtx &&
            !pageCtx.loading &&
            role !== "customer" && (
              <div style={{ marginBottom: "4px" }}>
                {/* Status headline pill */}
                {pageCtx.status && pageCtx.headline && (
                  <StatusPill
                    status={pageCtx.status}
                    headline={pageCtx.headline}
                  />
                )}

                {/* Warning insight cards */}
                {pageCtx.warnings?.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    {pageCtx.warnings.slice(0, 3).map((warning, i) => (
                      <InsightCard
                        key={i}
                        warning={warning}
                        onClick={() =>
                          handleSend("What issues need my attention?")
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* ── Message bubbles ── */}
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  padding: "11px 15px",
                  borderRadius:
                    msg.role === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  background:
                    msg.role === "user"
                      ? "rgba(27, 67, 50, 0.85)"
                      : msg.isError
                        ? "rgba(255, 240, 238, 0.85)"
                        : msg.isUpgrade
                          ? "rgba(245,158,11,0.08)"
                          : msg.isScript
                            ? "rgba(255, 255, 255, 0.72)"
                            : "rgba(255, 255, 255, 0.65)",
                  backdropFilter: msg.role === "user" ? "none" : "blur(10px)",
                  WebkitBackdropFilter:
                    msg.role === "user" ? "none" : "blur(10px)",
                  color:
                    msg.role === "user"
                      ? C.white
                      : msg.isError
                        ? "#c0392b"
                        : msg.isUpgrade
                          ? "#92400e"
                          : C.text,
                  fontSize: "13px",
                  lineHeight: "1.6",
                  border:
                    msg.role === "user"
                      ? "none"
                      : msg.isUpgrade
                        ? "1px solid rgba(245,158,11,0.3)"
                        : "1px solid rgba(224, 219, 210, 0.4)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  position: "relative",
                }}
              >
                {/* Script mode indicator */}
                {msg.isScript && (
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "rgba(82,183,136,0.6)",
                      textTransform: "uppercase",
                      marginBottom: "5px",
                    }}
                  >
                    🔇 Live Data
                  </div>
                )}
                {msg.role === "user"
                  ? msg.content
                  : renderMessageContent(msg.content)}
              </div>
            </div>
          ))}

          {/* ── Loading dots ── */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.65)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(224, 219, 210, 0.4)",
                  padding: "12px 20px",
                  borderRadius: "16px 16px 16px 4px",
                  display: "flex",
                  gap: "5px",
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((dot) => (
                  <div
                    key={dot}
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: C.accent,
                      animation: `copilot-dot 1.2s ease-in-out ${dot * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Suggestion chips ── */}
          {!hasInteracted && messages.length <= 1 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
                marginTop: "4px",
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  style={{
                    background: "rgba(255, 255, 255, 0.55)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(224, 219, 210, 0.4)",
                    borderRadius: "20px",
                    padding: "7px 13px",
                    fontSize: "12px",
                    color: C.mid,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                    transition: "all 0.15s",
                    lineHeight: 1.3,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(212, 237, 218, 0.6)";
                    e.target.style.borderColor = C.accent;
                    e.target.style.color = C.green;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.55)";
                    e.target.style.borderColor = "rgba(224, 219, 210, 0.4)";
                    e.target.style.color = C.mid;
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Mode hint (first open, AI mode) ── */}
          {!hasInteracted &&
            messages.length <= 1 &&
            mode === "ai" &&
            contextId && (
              <div
                style={{
                  fontSize: "10px",
                  color: "rgba(82,183,136,0.7)",
                  textAlign: "center",
                  marginTop: "4px",
                  fontStyle: "italic",
                }}
              >
                🤖 AI mode active — Claude has access to your live{" "}
                {contextId.replace(/-/g, " ")} data
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ── */}
        <div
          style={{
            borderTop: "none",
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            flexShrink: 0,
            boxShadow: "0 -4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "script"
                  ? "Ask about status, issues, actions…"
                  : "Ask me anything…"
              }
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "1px solid rgba(224, 219, 210, 0.5)",
                borderRadius: "20px",
                fontSize: "13px",
                fontFamily: FONTS.body,
                background: "rgba(250, 249, 246, 0.6)",
                resize: "none",
                outline: "none",
                lineHeight: "1.4",
                maxHeight: "100px",
                overflowY: "auto",
                boxSizing: "border-box",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.accent;
                e.target.style.background = "rgba(255, 255, 255, 0.8)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(224, 219, 210, 0.5)";
                e.target.style.background = "rgba(250, 249, 246, 0.6)";
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background:
                  loading || !input.trim()
                    ? "rgba(224, 219, 210, 0.5)"
                    : C.green,
                color: C.white,
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              ↑
            </button>
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(136, 136, 136, 0.6)",
              textAlign: "center",
              marginTop: "7px",
              letterSpacing: "0.05em",
            }}
          >
            {mode === "script"
              ? "🔇 Script mode · free · reads live data"
              : "🤖 AI mode · powered by Claude · uses tokens"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes copilot-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes copilot-backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes copilot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}
