// src/components/CoPilot.js v2.0
// Protea Botanicals — AI Assistant Sidebar Panel
// v2.0: Slide-in sidebar, conversation history, role-aware, branded design

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

function getSuggestions(role) {
  switch (role) {
    case "admin":
      return [
        "System health check",
        "Scan analytics this week",
        "Show all users",
        "How are promo QR codes performing?",
      ];
    case "retailer":
      return [
        "Check my orders",
        "What strains are available?",
        "Best sellers for my shop?",
        "Wholesale pricing",
      ];
    case "customer":
      return [
        "What strain helps with sleep?",
        "Check my loyalty points",
        "Difference between Cart and Pen?",
        "How does QR scanning work?",
      ];
    default:
      return [
        "What strains do you have?",
        "How does the loyalty programme work?",
        "Tell me about your products",
        "What makes Protea different?",
      ];
  }
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
      {!shouldHide && (
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Close assistant" : "Open assistant"}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 10001,
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: isOpen
              ? C.mid
              : `linear-gradient(135deg, ${C.green} 0%, ${C.mid} 100%)`,
            color: C.white,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            boxShadow: "0 4px 20px rgba(27,67,50,0.35)",
            transition: "all 0.3s ease",
          }}
        >
          {isOpen ? "\u2715" : "\uD83C\uDF3F"}
        </button>
      )}

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.15)",
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: `${PANEL_WIDTH}px`,
          maxWidth: "90vw",
          zIndex: 10000,
          background: C.cream,
          borderLeft: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          fontFamily: FONTS.body,
          transform: isOpen
            ? "translateX(0)"
            : `translateX(${PANEL_WIDTH + 10}px)`,
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isOpen ? "-8px 0 30px rgba(0,0,0,0.1)" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: C.green,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: C.accent,
                marginBottom: "2px",
              }}
            >
              Protea Botanicals
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontSize: "18px",
                fontWeight: 600,
                color: C.white,
              }}
            >
              AI Assistant
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleClearChat}
              title="Clear conversation"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: "2px",
                fontSize: "12px",
                fontFamily: FONTS.body,
              }}
            >
              🗑
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: "2px",
                fontSize: "16px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
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
                  background:
                    msg.role === "user"
                      ? C.green
                      : msg.isError
                        ? "#fff0ee"
                        : C.white,
                  color:
                    msg.role === "user"
                      ? C.white
                      : msg.isError
                        ? C.error
                        : C.text,
                  fontSize: "13px",
                  lineHeight: "1.6",
                  border:
                    msg.role === "user"
                      ? "none"
                      : `1px solid ${msg.isError ? "#f0c0b0" : C.border}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
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
                  background: C.white,
                  border: `1px solid ${C.border}`,
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
              {getSuggestions(role).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
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
                    e.target.style.borderColor = C.accent;
                    e.target.style.background = C.lightGreen;
                    e.target.style.color = C.green;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = C.border;
                    e.target.style.background = C.white;
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

        {/* Input */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: "12px 16px",
            background: C.white,
            flexShrink: 0,
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
                border: `1px solid ${C.border}`,
                borderRadius: "20px",
                fontSize: "13px",
                fontFamily: FONTS.body,
                background: C.cream,
                resize: "none",
                outline: "none",
                lineHeight: "1.4",
                maxHeight: "100px",
                overflowY: "auto",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.border)}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: loading || !input.trim() ? C.border : C.green,
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
              color: C.muted,
              textAlign: "center",
              marginTop: "8px",
              letterSpacing: "0.05em",
            }}
          >
            Powered by Claude AI · Protea Botanicals
          </div>
        </div>
      </div>

      <style>{`@keyframes copilot-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }`}</style>
    </>
  );
}
