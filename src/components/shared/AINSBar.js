// src/components/shared/AINSBar.js
// WP-DS-6 Phase 2 — Ambient Intelligence Notification System bar
// Shell component — never re-mounts on tab switch (NEW-LL-DS-3)
// Renders: context label + IntelStrip pills + hybrid search + status dots + AI drawer

import { useState, useEffect, useRef, useCallback } from "react";
import { T, profileOverrides } from "../../styles/tokens";
import { supabase } from "../../services/supabaseClient";
import IntelStrip from "../IntelStrip";
import { useHQIntelStrip } from "../../hooks/useHQIntelStrip";
import { useIntelStrip } from "../../hooks/useIntelStrip";

const TAB_LABELS = {
  overview: "Overview", "supply-chain": "Supply Chain", suppliers: "Suppliers",
  procurement: "Procurement", invoices: "Invoices", journals: "Journals",
  "bank-recon": "Bank Recon", "fixed-assets": "Fixed Assets", expenses: "Expenses",
  vat: "VAT", "year-end-close": "Year-End", tenants: "Tenants",
  "hq-production": "Production", "hq-stock": "Stock", "hq-transfers": "Transfers",
  "hq-trading": "Daily Trading", "hq-pos": "POS Till", "hq-eod": "Cash-Up",
  "hq-ingredients": "Ingredients", "hq-recipes": "Recipes", "hq-haccp": "HACCP",
  "hq-food-safety": "Food Safety", "hq-nutrition": "Nutrition", "hq-cold-chain": "Cold Chain",
  "hq-recall": "Recall", "hq-food-intelligence": "Food Intel", distribution: "Distribution",
  pricing: "Pricing", costing: "Costing", pl: "P&L", "balance-sheet": "Balance Sheet",
  forecast: "Forecast", analytics: "Analytics", "geo-analytics": "Geo Analytics",
  "retailer-health": "Retailer Health", reorder: "Reorder", loyalty: "Loyalty",
  fraud: "Fraud & Security", documents: "Documents", "email-logs": "Email Logs",
  medical: "Medical", "wholesale-orders": "Wholesale", shops: "Shops",
  stock: "Stock", catalog: "Smart Catalog", trading: "Daily Trading",
  pos: "POS Till", cashup: "Cash-Up", customers: "Customers",
  "qr-codes": "QR Codes", comms: "Messaging", staff: "Staff",
  roster: "Roster", timesheets: "Timesheets", leave: "Leave",
  contracts: "Contracts", payroll: "Payroll",
};

const PROFILE_LABELS = {
  cannabis_retail: "RETAIL",
  cannabis_dispensary: "DISPENSARY",
  food_beverage: "F&B",
  general_retail: "GENERAL",
  operator: "HQ",
};

const NL_TRIGGERS = ["why", "what", "how", "show", "explain", "compare", "which", "list", "?"];

export default function AINSBar({
  role = "hq",
  activeTab,
  tenantId,
  tenantName,
  industryProfile,
  onNavigate,
  allTenants,
  intelData,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerContent, setDrawerContent] = useState("");
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [vatStatus, setVatStatus] = useState("clear");
  const [aiHealthy, setAiHealthy] = useState(true);
  const drawerInputRef = useRef(null);
  const messagesRef = useRef([]);

  const isHQ = role === "hq";
  const hqStrip = useHQIntelStrip(isHQ ? activeTab : null, tenantId, allTenants);
  const tenantStrip = useIntelStrip(!isHQ ? activeTab : null, tenantId, intelData);
  const { pills, loading: pillsLoading } = isHQ ? hqStrip : tenantStrip;

  // ── Alert count + VAT status (polled every 60s) ───────────────
  const fetchAlerts = useCallback(async () => {
    if (!tenantId) return;
    const [vatTxRes, vatFiledRes, captureRes] = await Promise.allSettled([
      supabase.from("vat_transactions").select("vat_period").eq("tenant_id", tenantId),
      supabase.from("vat_period_filings").select("period_id").eq("tenant_id", tenantId),
      supabase.from("capture_queue")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("is_duplicate", true),
    ]);
    const periods = new Set(
      (vatTxRes.status === "fulfilled" ? vatTxRes.value.data || [] : []).map((r) => r.vat_period)
    );
    const filed = new Set(
      (vatFiledRes.status === "fulfilled" ? vatFiledRes.value.data || [] : []).map((r) => r.period_id)
    );
    const overdueCount = [...periods].filter((p) => !filed.has(p)).length;
    const dupeCount = captureRes.status === "fulfilled" ? captureRes.value.count || 0 : 0;
    setAlertCount(overdueCount + dupeCount);
    setVatStatus(overdueCount > 0 ? "overdue" : "clear");
  }, [tenantId]);

  useEffect(() => {
    fetchAlerts();
    const iv = setInterval(fetchAlerts, 60000);
    return () => clearInterval(iv);
  }, [fetchAlerts]);

  // ── AI drawer — stream from ai-copilot ────────────────────────
  const streamAI = useCallback(async (userMsg, sysOverride, title) => {
    setDrawerOpen(true);
    setDrawerTitle(title);
    setDrawerLoading(true);
    setDrawerContent("");
    messagesRef.current = [{ role: "user", content: userMsg }];

    const SUPA = process.env.REACT_APP_SUPABASE_URL;
    const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;
    try {
      const res = await fetch(`${SUPA}/functions/v1/ai-copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({
          messages: messagesRef.current,
          userContext: { role, tenantId, isHQ },
          systemOverride: sysOverride,
          stream: true,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `API ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const { token } = JSON.parse(raw);
            if (token) {
              full += token;
              setDrawerContent(full);
            }
          } catch {}
        }
      }
      messagesRef.current.push({ role: "assistant", content: full });
      if (!full) setDrawerContent("No response received. Try again.");
      setAiHealthy(true);
    } catch (err) {
      console.error("[AINSBar] ai-copilot error:", err);
      setDrawerContent("AI service unavailable. Try again in a moment.");
      setAiHealthy(false);
    } finally {
      setDrawerLoading(false);
    }
  }, [role, tenantId, isHQ]);

  // ── Pill click → AI analysis ──────────────────────────────────
  const handlePillClick = useCallback((context) => {
    const pill = pills.find((p) => p.context === context);
    if (!pill) return;
    const sysOverride = `You are ProteaAI analysing ${tenantName || "this business"} (${industryProfile || "unknown"}).
Current view: ${TAB_LABELS[activeTab] || activeTab}. Signal: ${pill.label} — ${pill.value}.
The user is a Chartered Accountant conducting business rescue analysis under Companies Act s128.
Provide a 3-paragraph analysis:
1. What this signal means and its severity
2. Why it matters for business rescue and solvency assessment
3. What specific data to investigate next, citing actual figures
Be direct, use financial CA language, reference SA legislation where relevant.`;
    streamAI(
      `Analyse this rescue signal for ${tenantName}: ${pill.label} — ${pill.value}`,
      sysOverride,
      `${pill.label}: ${pill.value}`
    );
  }, [pills, tenantName, industryProfile, activeTab, streamAI]);

  // ── Hybrid search handler ─────────────────────────────────────
  const handleSearch = useCallback((e) => {
    if (e.key !== "Enter" || !searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const isNL = NL_TRIGGERS.some((t) => q.startsWith(t) || q.includes("?"));
    if (isNL) {
      const sysOverride = `You are ProteaAI, an intelligent assistant for ${tenantName || "this business"} (${industryProfile || "unknown"}).
Current view: ${TAB_LABELS[activeTab] || activeTab}. Role: ${role}.
Answer the user's question using your knowledge of the business data. Be specific and cite figures.`;
      streamAI(q, sysOverride, q.length > 50 ? q.slice(0, 47) + "..." : q);
      setSearchQuery("");
    } else {
      const match = Object.entries(TAB_LABELS).find(
        ([, label]) => label.toLowerCase().includes(q)
      );
      if (match && onNavigate) {
        onNavigate(match[0]);
        setSearchQuery("");
      }
    }
  }, [searchQuery, tenantName, industryProfile, activeTab, role, streamAI, onNavigate]);

  // ── Follow-up in drawer ───────────────────────────────────────
  const handleFollowUp = useCallback((msg) => {
    if (!msg.trim()) return;
    messagesRef.current.push({ role: "user", content: msg });
    const sysOverride = `You are ProteaAI continuing a rescue analysis for ${tenantName || "this business"}.
Previous context: ${drawerTitle}. Be direct and specific.`;
    setDrawerLoading(true);
    setDrawerContent("");
    const SUPA = process.env.REACT_APP_SUPABASE_URL;
    const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;
    fetch(`${SUPA}/functions/v1/ai-copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({
        messages: messagesRef.current,
        userContext: { role, tenantId, isHQ },
        systemOverride: sysOverride,
        stream: true,
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`API ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const { token } = JSON.parse(raw);
            if (token) { full += token; setDrawerContent(full); }
          } catch {}
        }
      }
      messagesRef.current.push({ role: "assistant", content: full });
      setDrawerLoading(false);
    }).catch(() => {
      setDrawerContent("AI service unavailable.");
      setDrawerLoading(false);
    });
  }, [tenantName, drawerTitle, role, tenantId, isHQ]);

  const profileLabel = PROFILE_LABELS[industryProfile] || "";
  const tabLabel = TAB_LABELS[activeTab] || activeTab || "";
  const pOvr       = profileOverrides[industryProfile] || {};
  const pBadgeBg   = pOvr.accentLight || T.accentLight;
  const pBadgeText = pOvr.accentText  || T.accentText;
  const pAccent    = pOvr.accent      || T.accent;

  // ── Status dot color ──────────────────────────────────────────
  const dotColor = (status) => {
    if (status === "overdue" || status === "danger") return T.danger;
    if (status === "due-soon" || status === "warning") return T.warning;
    return T.success;
  };

  return (
    <>
      {/* ── AINS BAR ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: T.gap.md,
        padding: `${T.pad.sm}px ${T.page.gutterX}px`,
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        minHeight: 48, flexShrink: 0, fontFamily: T.font,
      }}>
        {/* LEFT — context label */}
        <div style={{ display: "flex", alignItems: "center", gap: T.gap.sm, flexShrink: 0 }}>
          <span style={{ fontSize: 14 }}>&#9889;</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.ink700, whiteSpace: "nowrap" }}>
            {tabLabel}
          </span>
          {tenantName && !isHQ && (
            <span style={{ fontSize: 11, color: T.ink600 }}>
              &middot; {tenantName}
            </span>
          )}
          {profileLabel && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              padding: "2px 6px", borderRadius: T.radius.full,
              background: pBadgeBg, color: pBadgeText,
              whiteSpace: "nowrap",
            }}>
              {profileLabel}
            </span>
          )}
        </div>

        {/* CENTRE — pills */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <IntelStrip pills={pills} loading={pillsLoading} onPillClick={handlePillClick} />
        </div>

        {/* RIGHT — search + status dots */}
        <div style={{ display: "flex", alignItems: "center", gap: T.gap.sm, flexShrink: 0 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search or ask AI..."
            style={{
              width: searchFocused ? 260 : 140,
              padding: `${T.pad.xs}px ${T.pad.sm}px`,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius.md,
              fontSize: 12, fontFamily: T.font,
              color: T.ink700, background: T.bg,
              outline: "none",
              transition: "width 0.2s ease, border-color 0.15s",
              borderColor: searchFocused ? pAccent : T.border,
            }}
          />

          {/* Status dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Alert count */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: alertCount > 0 ? T.danger : "#ccc",
              }} />
              {alertCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -8,
                  fontSize: 8, fontWeight: 700, color: T.surface,
                  background: T.danger, borderRadius: T.radius.full,
                  padding: "0 3px", minWidth: 12, textAlign: "center",
                  lineHeight: "14px",
                }}>
                  {alertCount}
                </span>
              )}
            </div>
            {/* VAT status */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: dotColor(vatStatus),
            }} title={`VAT: ${vatStatus}`} />
            {/* AI health */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: aiHealthy ? T.success : T.danger,
            }} title={aiHealthy ? "AI ready" : "AI unavailable"} />
          </div>
        </div>
      </div>

      {/* ── AI DRAWER ────────────────────────────────────────────── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)",
            zIndex: 999,
          }}
        />
      )}
      <div style={{
        position: "fixed", top: 0, right: drawerOpen ? 0 : -500,
        width: 480, height: "100vh",
        background: T.surface, boxShadow: drawerOpen ? T.shadow.xl : "none",
        zIndex: 1000, transition: "right 0.25s ease",
        display: "flex", flexDirection: "column", fontFamily: T.font,
      }}>
        {/* Drawer header */}
        <div style={{
          padding: T.pad.lg, borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: T.ink900 }}>
            {drawerTitle}
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 18, color: T.ink600, padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        {/* Drawer content */}
        <div style={{ flex: 1, overflow: "auto", padding: T.pad.lg }}>
          {drawerLoading && !drawerContent ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.ink600, fontSize: 13 }}>
              <span style={{ animation: "intel-pulse 1.4s ease-in-out infinite" }}>&#9679;</span>
              Analysing...
            </div>
          ) : (
            <div style={{
              whiteSpace: "pre-wrap", fontFamily: T.font,
              fontSize: 13, lineHeight: 1.7, color: T.ink900,
            }}>
              {drawerContent}
            </div>
          )}
        </div>

        {/* Drawer input */}
        <div style={{
          padding: T.pad.md, borderTop: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <input
            ref={drawerInputRef}
            placeholder="Ask a follow-up..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                handleFollowUp(e.target.value.trim());
                e.target.value = "";
              }
            }}
            style={{
              width: "100%", padding: `${T.pad.sm}px ${T.pad.md}px`,
              border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
              fontSize: 13, fontFamily: T.font, color: T.ink700,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    </>
  );
}
