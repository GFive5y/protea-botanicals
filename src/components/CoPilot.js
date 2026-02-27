// src/components/CoPilot.js
// Protea Botanicals — AI Co-Pilot Chat Widget
// Version: v1.0
// Status: NEW (not locked)
// Purpose: Floating chat widget for developer AI assistance
// Dependencies: React 18, copilotService.js
// Design: tokens.js (Cormorant Garamond headings, Jost body, 2px radius)

import React, { useState, useRef, useEffect } from "react";

// ─── Design tokens (inline fallbacks if tokens.js import unavailable) ───
// TODO: Replace these with `import { colors, fonts } from '../tokens';`
//       once you confirm the exact export shape of your tokens.js v2.
const T = {
  fontHeading: "'Cormorant Garamond', serif",
  fontBody: "'Jost', sans-serif",
  radius: "2px",
  letterSpacing: "0.2em",
  gold: "#C8A951",
  dark: "#1A1A1A",
  offWhite: "#FAF9F6",
  midGrey: "#888",
  borderLight: "#E0DDD5",
  shadow: "0 4px 24px rgba(0,0,0,0.18)",
};

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = {
  // Floating trigger button (bottom-right)
  fab: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "56px",
    height: "56px",
    borderRadius: T.radius,
    background: T.dark,
    color: T.gold,
    border: `1px solid ${T.gold}`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontFamily: T.fontBody,
    boxShadow: T.shadow,
    zIndex: 9999,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },

  // Chat panel
  panel: {
    position: "fixed",
    bottom: "92px",
    right: "24px",
    width: "380px",
    maxHeight: "520px",
    background: T.offWhite,
    border: `1px solid ${T.borderLight}`,
    borderRadius: T.radius,
    boxShadow: T.shadow,
    display: "flex",
    flexDirection: "column",
    zIndex: 9999,
    overflow: "hidden",
  },

  // Header bar
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    background: T.dark,
    borderBottom: `1px solid ${T.gold}`,
  },
  headerTitle: {
    fontFamily: T.fontHeading,
    fontSize: "16px",
    fontWeight: 600,
    color: T.gold,
    letterSpacing: "0.08em",
    margin: 0,
  },
  headerSub: {
    fontFamily: T.fontBody,
    fontSize: "10px",
    color: T.midGrey,
    letterSpacing: T.letterSpacing,
    textTransform: "uppercase",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: T.midGrey,
    fontSize: "18px",
    cursor: "pointer",
    padding: "0 0 0 12px",
    fontFamily: T.fontBody,
  },

  // Messages area
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "14px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minHeight: "200px",
    maxHeight: "340px",
  },

  // Individual message bubbles
  msgUser: {
    alignSelf: "flex-end",
    background: T.dark,
    color: T.offWhite,
    padding: "10px 14px",
    borderRadius: T.radius,
    fontFamily: T.fontBody,
    fontSize: "13px",
    lineHeight: "1.5",
    maxWidth: "85%",
    wordBreak: "break-word",
  },
  msgAi: {
    alignSelf: "flex-start",
    background: "#EDEAE2",
    color: T.dark,
    padding: "10px 14px",
    borderRadius: T.radius,
    fontFamily: T.fontBody,
    fontSize: "13px",
    lineHeight: "1.5",
    maxWidth: "85%",
    wordBreak: "break-word",
  },
  msgSystem: {
    alignSelf: "center",
    color: T.midGrey,
    fontFamily: T.fontBody,
    fontSize: "11px",
    fontStyle: "italic",
    textAlign: "center",
    padding: "4px 0",
  },

  // Tool call indicator
  msgTool: {
    alignSelf: "flex-start",
    background: "transparent",
    border: `1px dashed ${T.borderLight}`,
    color: T.midGrey,
    padding: "6px 12px",
    borderRadius: T.radius,
    fontFamily: "'Courier New', monospace",
    fontSize: "11px",
    maxWidth: "85%",
  },

  // Input area
  inputArea: {
    display: "flex",
    gap: "8px",
    padding: "12px 18px",
    borderTop: `1px solid ${T.borderLight}`,
    background: "#fff",
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    border: `1px solid ${T.borderLight}`,
    borderRadius: T.radius,
    fontFamily: T.fontBody,
    fontSize: "13px",
    outline: "none",
    background: T.offWhite,
    color: T.dark,
  },
  sendBtn: {
    padding: "10px 16px",
    background: T.dark,
    color: T.gold,
    border: `1px solid ${T.gold}`,
    borderRadius: T.radius,
    fontFamily: T.fontBody,
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: T.letterSpacing,
    textTransform: "uppercase",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  // Provider toggle (small pill in header)
  providerToggle: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  providerBtn: (active) => ({
    background: active ? T.gold : "transparent",
    color: active ? T.dark : T.midGrey,
    border: `1px solid ${active ? T.gold : T.midGrey}`,
    borderRadius: T.radius,
    fontFamily: T.fontBody,
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 8px",
    cursor: "pointer",
  }),

  // Loading dots
  loading: {
    alignSelf: "flex-start",
    color: T.midGrey,
    fontFamily: T.fontBody,
    fontSize: "13px",
    padding: "10px 14px",
  },
};

// ─── Welcome message ────────────────────────────────────────────────────
const WELCOME_MSG = {
  role: "system",
  content:
    "Protea Co-Pilot ready. Ask about routes, DB tables, errors, or system health.",
};

// ─── Component ──────────────────────────────────────────────────────────
export default function CoPilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("grok"); // 'grok' | 'claude'
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // ── Send message ────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Add user message
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Import dynamically to avoid issues if service not yet created
      const { sendMessage } = await import("../services/copilotService");
      const response = await sendMessage({
        message: text,
        provider,
        history: messages.filter((m) => m.role !== "system"),
      });

      // Response may include tool calls + final answer
      if (response.toolCalls && response.toolCalls.length > 0) {
        response.toolCalls.forEach((tc) => {
          setMessages((prev) => [
            ...prev,
            { role: "tool", content: `⚙ ${tc.name}(${tc.args || ""})` },
          ]);
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer || "No response received.",
        },
      ]);
    } catch (err) {
      console.error("[CoPilot] Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err.message || "Failed to reach AI backend. Is the Edge Function deployed?"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Keyboard handler ────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render message bubble ───────────────────────────────────────────
  const renderMessage = (msg, idx) => {
    switch (msg.role) {
      case "user":
        return (
          <div key={idx} style={styles.msgUser}>
            {msg.content}
          </div>
        );
      case "assistant":
        return (
          <div key={idx} style={styles.msgAi}>
            {msg.content}
          </div>
        );
      case "tool":
        return (
          <div key={idx} style={styles.msgTool}>
            {msg.content}
          </div>
        );
      case "system":
        return (
          <div key={idx} style={styles.msgSystem}>
            {msg.content}
          </div>
        );
      default:
        return null;
    }
  };

  // ── FAB (collapsed state) ───────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        style={styles.fab}
        onClick={() => setIsOpen(true)}
        title="Open AI Co-Pilot"
        aria-label="Open AI Co-Pilot"
      >
        ⚡
      </button>
    );
  }

  // ── Chat panel (expanded state) ─────────────────────────────────────
  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.headerTitle}>Co-Pilot</h3>
          <p style={styles.headerSub}>Protea Dev Assistant</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Provider toggle */}
          <div style={styles.providerToggle}>
            <button
              style={styles.providerBtn(provider === "grok")}
              onClick={() => setProvider("grok")}
            >
              Grok
            </button>
            <button
              style={styles.providerBtn(provider === "claude")}
              onClick={() => setProvider("claude")}
            >
              Claude
            </button>
          </div>
          {/* Close */}
          <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, idx) => renderMessage(msg, idx))}
        {loading && <div style={styles.loading}>Thinking…</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about routes, DB, errors…"
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: loading ? 0.5 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={handleSend}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
