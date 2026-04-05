// src/components/AIFixture.js — v1.1
// WP-AI-PRESENCE · NuAI · April 2026
// The NuAI intelligence fixture. Replaces the "+" AI pill in TenantPortal sidebar.
//
// Behaviour:
//   - 1 EF call per day per tenant (sessionStorage cache: nuai:brief:{id}:{YYYY-MM-DD})
//   - Fetches OOS count + zero-price count from inventory_items for context
//   - Cycles: "Ask anything" → insight → "Ask anything" → insight → ... → settles
//   - Collapsed mode: shows "AI" mark in brand green
//   - Expanded mode: shows "NuAI · [cycling text with animated dots in placeholder state]"
//   - Click anywhere → onOpen() → ProteaAI panel
//   - Graceful fallback: if canUseAI=false or EF fails → static "Ask anything..."
//
// Rules followed:
//   LL-120: ai-copilot EF only — never api.anthropic.com directly
//   LL-095: useTenantConfig for canUseAI check
//   Rule 0G: useTenant called inside this component (via useTenantConfig)

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenantConfig } from "../hooks/useTenantConfig";

const T = {
  accent:    "#1A3D2B",
  accentMid: "#2D6A4F",
  ink700:    "#2C2C2C",
  ink400:    "#6B6B6B",
  ink150:    "#E2E2E2",
  border:    "#ECEAE6",
  font:      "'Inter','Helvetica Neue',Arial,sans-serif",
};

const PLACEHOLDER = "Ask anything";
const FADE_MS     = 350;
const INSIGHT_MS  = 6000;
const GAP_MS      = 3500;

const sleep    = ms => new Promise(r => setTimeout(r, ms));
const todayKey = id => `nuai:brief:${id}:${new Date().toISOString().slice(0, 10)}`;

// Inject animated-dot keyframe once at module load — no external CSS file needed
if (typeof document !== "undefined" && !document.getElementById("nuai-dot-style")) {
  const s = document.createElement("style");
  s.id = "nuai-dot-style";
  s.textContent = `@keyframes nuai-dot{0%,80%,100%{opacity:.2;transform:translateY(0)}40%{opacity:.8;transform:translateY(-2px)}}`;
  document.head.appendChild(s);
}

export default function AIFixture({ tenantId, tenantName, role, collapsed, onOpen }) {
  const { canUseAI } = useTenantConfig();

  const [text, setText]           = useState(PLACEHOLDER);
  const [isPlaceholder, setIsPlh] = useState(true);
  const [visible, setVisible]     = useState(true);
  const fetched                   = useRef(false);

  // Cycle through insights, alternating with placeholder
  const cycle = useCallback(async (insights, signal) => {
    for (const item of insights) {
      if (signal.aborted) return;

      // Fade out → show insight
      setVisible(false);
      await sleep(FADE_MS);
      if (signal.aborted) return;
      setText(item.text);
      setIsPlh(false);
      setVisible(true);
      await sleep(INSIGHT_MS);
      if (signal.aborted) return;

      // Fade out → back to placeholder
      setVisible(false);
      await sleep(FADE_MS);
      if (signal.aborted) return;
      setText(PLACEHOLDER);
      setIsPlh(true);
      setVisible(true);
      await sleep(GAP_MS);
    }
    // All insights shown → settled on placeholder
  }, []);

  useEffect(() => {
    if (!tenantId || !canUseAI || fetched.current) return;
    fetched.current = true;

    const ctrl   = new AbortController();
    const signal = ctrl.signal;

    (async () => {
      // 1. Check today's sessionStorage cache
      let insights = null;
      try {
        const raw = sessionStorage.getItem(todayKey(tenantId));
        if (raw) insights = JSON.parse(raw);
      } catch (_) {}

      // 2. Fetch context + call EF if not cached
      if (!insights) {
        try {
          const [{ count: oos }, { count: noPrice }] = await Promise.all([
            supabase
              .from("inventory_items")
              .select("*", { count: "exact", head: true })
              .eq("tenant_id", tenantId)
              .eq("is_active", true)
              .eq("quantity_on_hand", 0),
            supabase
              .from("inventory_items")
              .select("*", { count: "exact", head: true })
              .eq("tenant_id", tenantId)
              .eq("is_active", true)
              .or("sell_price.is.null,sell_price.eq.0"),
          ]);

          if (signal.aborted) return;

          const SUPA = process.env.REACT_APP_SUPABASE_URL;
          const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;

          const res = await fetch(`${SUPA}/functions/v1/ai-copilot`, {
            method:  "POST",
            headers: {
              "Content-Type":  "application/json",
              Authorization:   `Bearer ${ANON}`,
            },
            body: JSON.stringify({
              messages: [{
                role:    "user",
                content:
`You are the NuAI intelligence system for ${tenantName || "this business"}.
Generate exactly 3 short business insights. Rules:
- Each must be under 55 characters
- Specific and factual — use the exact numbers provided
- No generic advice or platitudes
Return ONLY a JSON array, no markdown, no explanation:
[{"text":"..."},{"text":"..."},{"text":"..."}]

Current data:
- Items out of stock: ${oos ?? 0}
- Items with no sell price: ${noPrice ?? 0}
- User role: ${role || "admin"}
- Business: ${tenantName || "retail store"}`,
              }],
              userContext: { role: role || "admin" },
            }),
          });

          if (signal.aborted) return;

          const json  = await res.json();
          const match = (json?.reply || "").match(/\[[\s\S]*?\]/);
          if (match) {
            const arr = JSON.parse(match[0]);
            if (Array.isArray(arr) && arr.length) {
              insights = arr.filter(i => typeof i?.text === "string" && i.text.trim());
            }
          }

          // Cache for rest of today
          if (insights?.length) {
            try {
              sessionStorage.setItem(todayKey(tenantId), JSON.stringify(insights));
            } catch (_) {}
          }
        } catch (_) {
          // Silent fail → fixture stays on "Ask anything..." permanently
        }
      }

      if (signal.aborted || !insights?.length) return;

      // 3. Initial pause, then cycle once
      await sleep(GAP_MS);
      await cycle(insights, signal);
      // After cycle: settled on "Ask anything..." → no further action
    })();

    return () => ctrl.abort();
  }, [tenantId, canUseAI, role, tenantName, cycle]);

  // —— COLLAPSED MODE ——————————————————————————————————————————
  if (collapsed) {
    return (
      <button
        onClick={onOpen}
        title="NuAI — Ask anything"
        style={{
          width:           "100%",
          height:          40,
          border:          "none",
          borderTop:       `1px solid ${T.border}`,
          background:      "transparent",
          cursor:          "pointer",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
          fontFamily:      T.font,
        }}
      >
        <span style={{
          fontSize:      10,
          fontWeight:    800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color:         T.accent,
          fontFamily:    T.font,
        }}>
          AI
        </span>
      </button>
    );
  }

  // —— EXPANDED MODE ———————————————————————————————————————————
  return (
    <button
      onClick={onOpen}
      title="NuAI — Ask anything"
      style={{
        width:      "100%",
        height:     44,
        border:     "none",
        borderTop:  `1px solid ${T.border}`,
        background: "transparent",
        cursor:     "pointer",
        display:    "flex",
        alignItems: "center",
        gap:        10,
        padding:    "0 16px",
        flexShrink: 0,
        textAlign:  "left",
        fontFamily: T.font,
      }}
    >
      {/* NuAI mark */}
      <span style={{
        fontSize:      10,
        fontWeight:    800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color:         T.accent,
        flexShrink:    0,
        fontFamily:    T.font,
      }}>
        NuAI
      </span>

      {/* Separator */}
      <div style={{
        width:      1,
        height:     13,
        background: T.ink150,
        flexShrink: 0,
      }} />

      {/* Cycling text — placeholder shows animated dots, insights render static */}
      <span style={{
        flex:        1,
        fontSize:    12,
        color:       isPlaceholder ? T.ink400 : T.ink700,
        fontFamily:  T.font,
        overflow:    "hidden",
        whiteSpace:  "nowrap",
        opacity:     visible ? 1 : 0,
        transition:  `opacity ${FADE_MS}ms ease`,
        display:     "flex",
        alignItems:  "center",
      }}>
        {isPlaceholder ? (
          <>
            <span style={{ fontFamily: T.font, fontSize: 12 }}>Ask anything</span>
            {[0, 0.18, 0.36].map((delay, i) => (
              <span
                key={i}
                style={{
                  display:        "inline-block",
                  fontSize:       12,
                  color:          T.ink400,
                  fontFamily:     T.font,
                  animation:      `nuai-dot 1.4s ease-in-out ${delay}s infinite`,
                  marginLeft:     "1px",
                }}
              >.</span>
            ))}
          </>
        ) : (
          <span style={{
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}>
            {text}
          </span>
        )}
      </span>
    </button>
  );
}
