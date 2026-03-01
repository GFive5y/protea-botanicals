// src/components/CoPilot.js v2.3
// Protea Botanicals — AI Assistant Sidebar Panel
// v2.0: Slide-in sidebar, conversation history, role-aware, branded design
// v2.1: Page-specific suggestion prompts — getSuggestions(role, pathname)
// v2.2: WP-002 — Replace static floating button with AnimatedAICharacter
// v2.3: WP-003 — Frosted glass panel, gradient fade borders, Lottie bot
//       in header when open, aggressive fade-in transition, no hard edges.

import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import { RoleContext } from "../App";
import { sendMessage, buildUserContext } from "../services/copilotService";
import LottieCharacter from "./LottieCharacter";
import Lottie from "lottie-react";
import chatbotIdle from "../assets/lottie/chatbot-idle.json";

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
  lightGreen: "#d4edda",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};
const PANEL_WIDTH = 370;

function getWelcome(role) {
  switch (role) {
    case "admin":
      return "Hey! I can help with system health, user stats, scan analytics, or database queries. What do you need?";
    case "retailer":
      return "Welcome! I can help with your orders, stock availability, or product information for your customers.";
    case "customer":
      return "Hi there! I can recommend strains, check your loyalty points, explain products, or help with anything Protea-related.";
    default:
      return "Welcome to Protea Botanicals! I can help you explore our premium vape strains, explain how our loyalty programme works, or answer any questions.";
  }
}

// Page-specific prompts — shown based on current route
const PAGE_SUGGESTIONS = {
  "/": [
    "What products do you offer?",
    "How does the loyalty programme work?",
    "Tell me about your strains",
    "What makes Protea different?",
  ],
  "/shop": [
    "How do I place an order?",
    "Do you offer delivery?",
    "Cart or Pen — what's the difference?",
    "What payment methods do you accept?",
  ],
  "/loyalty": [
    "Check my loyalty points",
    "How do I earn more points?",
    "What rewards can I redeem?",
    "What tier am I on?",
  ],
  "/verify": [
    "Tell me about this strain",
    "What are the terpenes in this?",
    "Is this good for sleep or focus?",
    "How was this product tested?",
  ],
  "/scan": [
    "How do I scan a QR code?",
    "What happens after I scan?",
    "Why should I scan my product?",
    "How many points per scan?",
  ],
  "/redeem": [
    "How do I redeem my points?",
    "What rewards are available?",
    "Where can I use my voucher?",
    "How long until my voucher expires?",
  ],
  "/wholesale": [
    "What's your wholesale pricing?",
    "Minimum order quantity?",
    "How do I become a stockist?",
    "What strains are available wholesale?",
  ],
  "/admin": [
    "System health check",
    "Scan analytics this week",
    "Show all users",
    "How are promo QR codes performing?",
  ],
};

// Role-based fallbacks (used when no page match)
const ROLE_SUGGESTIONS = {
  admin: [
    "System health check",
    "Scan analytics this week",
    "Show all users",
    "How are promo QR codes performing?",
  ],
  retailer: [
    "Check my orders",
    "What strains are available?",
    "Best sellers for my shop?",
    "Wholesale pricing",
  ],
  customer: [
    "What strain helps with sleep?",
    "Check my loyalty points",
    "Difference between Cart and Pen?",
    "How does QR scanning work?",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "What strains do you have?",
  "How does the loyalty programme work?",
  "Tell me about your products",
  "What makes Protea different?",
];

function getSuggestions(role, pathname) {
  // Admin always gets admin prompts regardless of page
  if (role === "admin") return ROLE_SUGGESTIONS.admin;

  // Check for exact page match first
  if (PAGE_SUGGESTIONS[pathname]) return PAGE_SUGGESTIONS[pathname];

  // Check for prefix match (e.g. /verify/purple-punch → /verify)
  const prefix = "/" + (pathname.split("/")[1] || "");
  if (prefix !== pathname && PAGE_SUGGESTIONS[prefix])
    return PAGE_SUGGESTIONS[prefix];

  // Fall back to role-based, then default
  return ROLE_SUGGESTIONS[role] || DEFAULT_SUGGESTIONS;
}

function renderMessageContent(text) {
  if (!text) return null;
  const parts = text.split("\n").map((line, i) => {
    let processed = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^\s*[-•]\s/.test(processed)) {
      processed = processed.replace(/^\s*[-•]\s/, "");
      return (
        <div
          key={i}
          style={{
            paddingLeft: "16px",
            textIndent: "-10px",
            marginBottom: "2px",
          }}
        >
          <span style={{ color: C.accent }}>•</span>{" "}
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

export default function CoPilot() {
  const { role, userEmail } = useContext(RoleContext);
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const headerLottieRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !hasInteracted) {
      setMessages([
        { role: "assistant", content: getWelcome(role), timestamp: new Date() },
      ]);
    }
  }, [isOpen, role, messages.length, hasInteracted]);

  useEffect(() => {
    if (hasInteracted) return;
    setMessages([]);
  }, [role, hasInteracted]);

  const handleSend = useCallback(
    async (text) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;

      setInput("");
      setHasInteracted(true);

      const userMessage = { role: "user", content: msg, timestamp: new Date() };
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const userContext = await buildUserContext(
          { role, userEmail },
          location.pathname,
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
    [input, loading, messages, role, userEmail, location.pathname],
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

  const hiddenPaths = ["/scan/"];
  const shouldHide = hiddenPaths.some(
    (p) => location.pathname.startsWith(p) && location.pathname !== "/scan",
  );

  return (
    <>
      {/* ── v2.3: Lottie floating character (bottom-right, hides when panel open) ── */}
      {!shouldHide && (
        <LottieCharacter
          isOpen={isOpen}
          isThinking={loading}
          onClick={() => setIsOpen(true)}
          size={120}
        />
      )}

      {/* ── Backdrop overlay — frosted, aggressive fade-in ── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.05)",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            transition: "opacity 0.15s ease",
            animation: "copilot-backdrop-in 0.15s ease-out",
          }}
        />
      )}

      {/* ── Main panel — frosted glass ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: `${PANEL_WIDTH}px`,
          maxWidth: "90vw",
          zIndex: 10000,
          // Frosted glass: semi-transparent with blur
          background: "rgba(250, 249, 246, 0.55)",
          backdropFilter: "blur(12px) saturate(1.2)",
          WebkitBackdropFilter: "blur(12px) saturate(1.2)",
          // No hard border — subtle gradient shadow instead
          borderLeft: "none",
          display: "flex",
          flexDirection: "column",
          fontFamily: FONTS.body,
          transform: isOpen
            ? "translateX(0)"
            : `translateX(${PANEL_WIDTH + 10}px)`,
          transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
          // Soft shadow instead of hard border
          boxShadow: isOpen
            ? "-20px 0 60px rgba(0,0,0,0.12), -4px 0 20px rgba(0,0,0,0.06)"
            : "none",
        }}
      >
        {/* ── Left edge gradient fade (replaces hard border) ── */}
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

        {/* ── Header with Lottie bot ── */}
        <div
          style={{
            // Frosted header — slightly more opaque green
            background: "rgba(27, 67, 50, 0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "12px 20px 12px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            // Bottom fade instead of hard border
            boxShadow: "0 4px 20px rgba(27, 67, 50, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Lottie bot in header when panel is open */}
            <div
              style={{
                width: 52,
                height: 52,
                flexShrink: 0,
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "scale(1)" : "scale(0.5)",
                transition:
                  "opacity 0.3s ease 0.15s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s",
              }}
            >
              <Lottie
                lottieRef={headerLottieRef}
                animationData={chatbotIdle}
                loop={true}
                autoplay={true}
                style={{ width: 60, height: 60, marginTop: -2, marginLeft: -4 }}
              />
            </div>
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
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              onClick={handleClearChat}
              title="Clear conversation"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: "6px 8px",
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
                padding: "6px 10px",
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

        {/* ── Messages area — frosted, transparent ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            // Subtle inner top fade from header
            background:
              "linear-gradient(to bottom, rgba(27,67,50,0.04) 0%, transparent 40px)",
          }}
        >
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
                  maxWidth: "85%",
                  padding: "12px 16px",
                  borderRadius:
                    msg.role === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                  // Frosted message bubbles
                  background:
                    msg.role === "user"
                      ? "rgba(27, 67, 50, 0.85)"
                      : msg.isError
                        ? "rgba(255, 240, 238, 0.85)"
                        : "rgba(255, 255, 255, 0.65)",
                  backdropFilter: msg.role === "user" ? "none" : "blur(10px)",
                  WebkitBackdropFilter:
                    msg.role === "user" ? "none" : "blur(10px)",
                  color:
                    msg.role === "user"
                      ? C.white
                      : msg.isError
                        ? C.error
                        : C.text,
                  fontSize: "13px",
                  lineHeight: "1.6",
                  // Soft borders instead of hard lines
                  border:
                    msg.role === "user"
                      ? "none"
                      : msg.isError
                        ? "1px solid rgba(240, 192, 176, 0.4)"
                        : "1px solid rgba(224, 219, 210, 0.4)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {msg.role === "user"
                  ? msg.content
                  : renderMessageContent(msg.content)}
              </div>
            </div>
          ))}

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

          {!hasInteracted && messages.length <= 1 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              {getSuggestions(role, location.pathname).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  style={{
                    background: "rgba(255, 255, 255, 0.55)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(224, 219, 210, 0.4)",
                    borderRadius: "20px",
                    padding: "8px 14px",
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
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area — frosted bottom bar ── */}
        <div
          style={{
            // Top fade instead of hard border
            borderTop: "none",
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.5)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            flexShrink: 0,
            // Top shadow fade
            boxShadow: "0 -4px 16px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
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
              marginTop: "8px",
              letterSpacing: "0.05em",
            }}
          >
            Powered by Claude AI · Protea Botanicals
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
      `}</style>
    </>
  );
}
