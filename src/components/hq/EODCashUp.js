// src/components/hq/EODCashUp.js — v1.0
// WP-EOD Session D — End of Day Cash Reconciliation
//
// FLEXIBILITY DESIGN:
//   All thresholds read from tenant_config.settings — never hardcoded.
//   Change any value in the DB → takes effect immediately, no code change needed.
//   Keys: eod_cash_variance_tolerance | eod_escalation_threshold |
//         eod_default_float | eod_approver_role
//
// DB tables: pos_sessions, eod_cash_ups (migration: wp_eod_tables_and_config)
// Pattern: standalone, reads tenantId from useTenant()
// Rule 0F: tenant_id on every INSERT

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { usePageContext } from "../../hooks/usePageContext";
import { T } from "../../styles/tokens";
const MONO = "'DM Mono','Courier New',monospace";

// Design tokens: imported from ../../styles/tokens

// ── Style helpers ─────────────────────────────────────────────────────────────
const sCard = {
  background: "#fff",
  border: `1px solid ${T.border}`,
  borderRadius: "4px",
  padding: "20px",
  marginBottom: "16px",
};
const sLabel = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink500,
  fontFamily: T.font,
  marginBottom: "6px",
  display: "block",
};
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: "4px",
  fontSize: "15px",
  fontFamily: MONO,
  color: T.ink900,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontVariantNumeric: "tabular-nums",
};
const sBtn = (variant = "primary") => ({
  padding: "9px 20px",
  borderRadius: "3px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: T.font,
  border: "none",
  background:
    variant === "primary"
      ? T.accentMid
      : variant === "danger"
        ? T.danger
        : variant === "ghost"
          ? "transparent"
          : T.bg,
  color:
    variant === "primary"
      ? "#fff"
      : variant === "danger"
        ? "#fff"
        : variant === "ghost"
          ? T.ink500
          : T.ink700,
  ...(variant === "ghost" ? { border: `1px solid ${T.border}` } : {}),
});

// ── SA denomination config ────────────────────────────────────────────────────
const DENOMS = [
  { label: "R200", value: 200, type: "note" },
  { label: "R100", value: 100, type: "note" },
  { label: "R50", value: 50, type: "note" },
  { label: "R20", value: 20, type: "note" },
  { label: "R10", value: 10, type: "note" },
  { label: "R5", value: 5, type: "coin" },
  { label: "R2", value: 2, type: "coin" },
  { label: "R1", value: 1, type: "coin" },
];

// ── Formatters ────────────────────────────────────────────────────────────────
function zar(n, decimals = 2) {
  return `R${(Number(n) || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Status helpers ────────────────────────────────────────────────────────────
function statusStyle(status) {
  if (status === "balanced")
    return {
      background: T.successLight,
      color: T.success,
      border: `1px solid ${T.successBd}`,
    };
  if (status === "flagged")
    return {
      background: T.warningLight,
      color: T.warning,
      border: `1px solid ${T.warningBd}`,
    };
  if (status === "escalated")
    return {
      background: T.dangerLight,
      color: T.danger,
      border: `1px solid ${T.dangerBd}`,
    };
  return {};
}
function varianceColour(variance, tolerance, escalation) {
  const abs = Math.abs(variance);
  if (abs <= tolerance) return T.success;
  if (abs <= escalation) return T.warning;
  return T.danger;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function EODCashUp() {
  usePageContext("hq-eod", null); // ProteaAI tab context — MANDATORY

  const { tenantId } = useTenant();

  // ── Config (from tenant_config.settings — all thresholds configurable) ──────
  const [cfg, setCfg] = useState({
    tolerance: 50,
    escalation: 200,
    defaultFloat: 500,
    approverRole: "owner",
  });

  // ── Today state ──────────────────────────────────────────────────────────────
  const [todayDone, setTodayDone] = useState(null);
  const [systemCash, setSystemCash] = useState(0);
  const [cardTotal, setCardTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);

  // ── Step flow ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [openingFloat, setOpeningFloat] = useState("");
  const [countMode, setCountMode] = useState("denomination");
  const [denomCounts, setDenomCounts] = useState(
    Object.fromEntries(DENOMS.map((d) => [d.value, ""])),
  );
  const [lumpSum, setLumpSum] = useState("");
  const [reason, setReason] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // ── History ──────────────────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const todayStr = today();
    const ts = new Date();
    ts.setHours(0, 0, 0, 0);
    const te = new Date(ts);
    te.setDate(te.getDate() + 1);

    const [cfgRes, cashUpRes, ordersRes, sessionRes] = await Promise.all([
      supabase
        .from("tenant_config")
        .select("settings")
        .eq("tenant_id", tenantId)
        .single(),
      supabase
        .from("eod_cash_ups")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("cashup_date", todayStr)
        .maybeSingle(),
      supabase
        .from("orders")
        .select("total, payment_method")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", ts.toISOString())
        .lt("created_at", te.toISOString()),
      supabase
        .from("pos_sessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("session_date", todayStr)
        .eq("status", "open")
        .maybeSingle(),
    ]);

    const s = cfgRes.data?.settings || {};
    const resolved = {
      tolerance: s.eod_cash_variance_tolerance ?? 50,
      escalation: s.eod_escalation_threshold ?? 200,
      defaultFloat: s.eod_default_float ?? 500,
      approverRole: s.eod_approver_role ?? "owner",
    };
    setCfg(resolved);
    setOpeningFloat(String(resolved.defaultFloat));
    setTodayDone(cashUpRes.data || null);

    const orders = ordersRes.data || [];
    setSystemCash(
      orders
        .filter((o) => o.payment_method === "cash")
        .reduce((s, o) => s + (Number(o.total) || 0), 0),
    );
    setCardTotal(
      orders
        .filter((o) => o.payment_method !== "cash")
        .reduce((s, o) => s + (Number(o.total) || 0), 0),
    );

    const sess = sessionRes.data || null;
    setActiveSession(sess);
    if (sess) setOpeningFloat(String(sess.opening_float));

    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const denomTotal = DENOMS.reduce(
    (sum, d) => sum + (parseInt(denomCounts[d.value], 10) || 0) * d.value,
    0,
  );
  const countedCash =
    countMode === "denomination" ? denomTotal : parseFloat(lumpSum) || 0;
  const float = parseFloat(openingFloat) || 0;
  const netExpected = systemCash + float;
  const variance = countedCash - netExpected;
  const absVar = Math.abs(variance);
  const varColour = varianceColour(variance, cfg.tolerance, cfg.escalation);
  const computedStatus =
    absVar <= cfg.tolerance
      ? "balanced"
      : absVar <= cfg.escalation
        ? "flagged"
        : "escalated";
  const reasonRequired = computedStatus !== "balanced";
  const canSubmit =
    step === 3 &&
    countedCash > 0 &&
    (!reasonRequired || reason.trim().length > 0);

  // ── Open session (Step 1 → 2) ─────────────────────────────────────────────────
  async function openSession() {
    if (!tenantId || !openingFloat || parseFloat(openingFloat) < 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("pos_sessions")
        .insert({
          tenant_id: tenantId,
          session_date: today(),
          opening_float: parseFloat(openingFloat),
          status: "open",
        })
        .select()
        .single();
      if (err) throw err;
      setActiveSession(data);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submit cash-up (Step 3 → done) ───────────────────────────────────────────
  async function submitCashUp() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (activeSession) {
        await supabase
          .from("pos_sessions")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("id", activeSession.id);
      }
      const { error: err } = await supabase.from("eod_cash_ups").insert({
        tenant_id: tenantId,
        pos_session_id: activeSession?.id || null,
        cashup_date: today(),
        system_cash_total: systemCash,
        opening_float: float,
        counted_cash: countedCash,
        status: computedStatus,
        reason: reason.trim() || null,
        notes: sessionNotes.trim() || null,
      });
      if (err) throw err;
      await load();
      setStep(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── History ───────────────────────────────────────────────────────────────────
  async function loadHistory() {
    setHistLoading(true);
    const { data } = await supabase
      .from("eod_cash_ups")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("cashup_date", { ascending: false })
      .limit(30);
    setHistory(data || []);
    setHistLoading(false);
  }
  useEffect(() => {
    if (showHistory && tenantId) loadHistory();
  }, [showHistory, tenantId]); // eslint-disable-line

  if (loading)
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          fontFamily: T.font,
          color: T.ink500,
        }}
      >
        Loading cash-up data…
      </div>
    );

  return (
    <div
      style={{
        fontFamily: T.font,
        color: T.ink900,
        maxWidth: 720,
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: T.ink900,
              fontFamily: T.font,
            }}
          >
            Daily Cash Reconciliation
          </h2>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12,
              color: T.ink500,
              fontFamily: T.font,
            }}
          >
            {new Date().toLocaleDateString("en-ZA", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ConfigBadge label="Tolerance" value={`±${zar(cfg.tolerance, 0)}`} />
          <ConfigBadge
            label="Escalation"
            value={`±${zar(cfg.escalation, 0)}`}
          />
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={sBtn("ghost")}
          >
            {showHistory ? "Close History" : "📋 History"}
          </button>
        </div>
      </div>

      {showHistory && <HistoryPanel loading={histLoading} history={history} />}

      {todayDone && !showHistory && (
        <TodayDoneCard
          cashup={todayDone}
          systemCash={systemCash}
          cardTotal={cardTotal}
        />
      )}

      {!todayDone && !showHistory && (
        <>
          <StepIndicator current={step} />

          {error && (
            <div
              style={{
                background: T.dangerLight,
                border: `1px solid ${T.dangerBd}`,
                borderRadius: 4,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                color: T.danger,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Step 1 — Set float */}
          {step === 1 && (
            <div style={sCard}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink900,
                  marginBottom: 16,
                }}
              >
                Step 1 — Set opening float
              </div>
              <InfoRow
                label="Cash sales recorded today"
                value={zar(systemCash)}
              />
              <InfoRow
                label="Card sales today (informational)"
                value={zar(cardTotal)}
              />
              <div
                style={{ height: 1, background: T.border, margin: "16px 0" }}
              />
              <label style={sLabel}>
                Opening float (cash in drawer at start of day)
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  maxWidth: 260,
                }}
              >
                <span
                  style={{ color: T.ink500, fontFamily: MONO, fontSize: 15 }}
                >
                  R
                </span>
                <input
                  style={{ ...sInput, maxWidth: 200 }}
                  type="number"
                  min="0"
                  step="50"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder={String(cfg.defaultFloat)}
                />
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: T.ink500,
                  marginTop: 6,
                  fontFamily: T.font,
                }}
              >
                Default from tenant settings: {zar(cfg.defaultFloat, 0)} ·
                Adjust anytime via Tenant Config → settings.eod_default_float
              </p>
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={openSession}
                  disabled={submitting || !openingFloat}
                  style={sBtn()}
                >
                  {submitting ? "Opening…" : "Open Till & Count Cash →"}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Count cash */}
          {step === 2 && (
            <div style={sCard}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink900,
                  marginBottom: 4,
                }}
              >
                Step 2 — Count the cash drawer
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: T.ink500,
                  marginBottom: 16,
                  fontFamily: T.font,
                }}
              >
                Count every note and coin in the drawer.
              </p>
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                <ModeBtn
                  active={countMode === "denomination"}
                  onClick={() => setCountMode("denomination")}
                  label="By denomination"
                />
                <ModeBtn
                  active={countMode === "lumpsum"}
                  onClick={() => setCountMode("lumpsum")}
                  label="Lump sum"
                />
              </div>
              {countMode === "denomination" ? (
                <DenomInput
                  counts={denomCounts}
                  onChange={setDenomCounts}
                  total={denomTotal}
                />
              ) : (
                <div style={{ maxWidth: 300 }}>
                  <label style={sLabel}>Total cash counted (rand)</label>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        color: T.ink500,
                        fontFamily: MONO,
                        fontSize: 15,
                      }}
                    >
                      R
                    </span>
                    <input
                      style={{ ...sInput, maxWidth: 200 }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={lumpSum}
                      onChange={(e) => setLumpSum(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={sBtn("ghost")}>
                  ← Back
                </button>
                <button
                  onClick={() => countedCash > 0 && setStep(3)}
                  disabled={countedCash <= 0}
                  style={sBtn()}
                >
                  Reconcile →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Reconcile */}
          {step === 3 && (
            <div style={sCard}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink900,
                  marginBottom: 16,
                }}
              >
                Step 3 — Reconciliation
              </div>

              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <RecRow label="Cash sales (system)" value={zar(systemCash)} />
                <RecRow label="Opening float" value={zar(float)} />
                <div
                  style={{ height: 1, background: T.border, margin: "10px 0" }}
                />
                <RecRow
                  label="Expected in drawer"
                  value={zar(netExpected)}
                  bold
                />
                <RecRow label="You counted" value={zar(countedCash)} bold />
                <div
                  style={{ height: 1, background: T.border, margin: "10px 0" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.ink900,
                      fontFamily: T.font,
                    }}
                  >
                    Variance
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      fontFamily: MONO,
                      fontWeight: 600,
                      color: varColour,
                    }}
                  >
                    {variance >= 0 ? "+" : ""}
                    {zar(variance)}
                    <span
                      style={{
                        fontSize: 11,
                        marginLeft: 8,
                        fontFamily: T.font,
                        fontWeight: 400,
                      }}
                    >
                      {variance > 0
                        ? "OVER"
                        : variance < 0
                          ? "SHORT"
                          : "BALANCED"}
                    </span>
                  </span>
                </div>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 4,
                  marginBottom: 16,
                  fontSize: 12,
                  fontFamily: T.font,
                  ...statusStyle(computedStatus),
                }}
              >
                {computedStatus === "balanced" &&
                  `✅ Within tolerance (±${zar(cfg.tolerance, 0)}) — no reason required`}
                {computedStatus === "flagged" &&
                  `⚠️ Variance exceeds ±${zar(cfg.tolerance, 0)} — reason required before close`}
                {computedStatus === "escalated" &&
                  `🚨 Variance exceeds ±${zar(cfg.escalation, 0)} — escalated · ${cfg.approverRole} approval required`}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: T.ink500,
                  marginBottom: 16,
                  fontFamily: T.font,
                }}
              >
                Card sales today: {zar(cardTotal)} · Card terminals self-balance
                — no manual count required
              </div>

              {reasonRequired && (
                <div style={{ marginBottom: 16 }}>
                  <label style={sLabel}>Reason for variance *</label>
                  <textarea
                    style={{
                      ...sInput,
                      fontSize: 13,
                      minHeight: 80,
                      resize: "vertical",
                    }}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain the variance (e.g. till counting error, customer paid wrong amount, etc.)"
                  />
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={sLabel}>Notes (optional)</label>
                <input
                  style={sInput}
                  type="text"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Any additional notes for this session…"
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep(2)} style={sBtn("ghost")}>
                  ← Recount
                </button>
                <button
                  onClick={submitCashUp}
                  disabled={!canSubmit || submitting}
                  style={sBtn(
                    computedStatus === "escalated" ? "danger" : "primary",
                  )}
                >
                  {submitting
                    ? "Closing…"
                    : computedStatus === "escalated"
                      ? "Close Day (Escalated)"
                      : "Close Day →"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  const steps = ["Set Float", "Count Cash", "Reconcile"];
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        marginBottom: 20,
        alignItems: "center",
      }}
    >
      {steps.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: done ? T.accentMid : active ? T.accent : T.border,
                  color: done || active ? "#fff" : T.ink500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {done ? "✓" : n}
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: active ? T.accentMid : T.ink500,
                  fontFamily: T.font,
                  fontWeight: active ? 700 : 400,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: current > n ? T.accentMid : T.border,
                  margin: "0 8px",
                  marginBottom: 16,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 6,
        fontSize: 13,
        fontFamily: T.font,
      }}
    >
      <span style={{ color: T.ink500 }}>{label}</span>
      <span style={{ fontFamily: MONO, color: T.ink900, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function RecRow({ label, value, bold }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 8,
        fontSize: bold ? 14 : 13,
        fontFamily: T.font,
      }}
    >
      <span
        style={{
          color: bold ? T.ink900 : T.ink500,
          fontWeight: bold ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: MONO,
          color: T.ink900,
          fontWeight: bold ? 700 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ConfigBadge({ label, value }) {
  return (
    <div
      style={{
        background: T.infoLight,
        border: `1px solid ${T.infoBd}`,
        borderRadius: 3,
        padding: "3px 8px",
        fontSize: 10,
        fontFamily: T.font,
        color: T.info,
      }}
    >
      <span style={{ fontWeight: 400 }}>{label}: </span>
      <span style={{ fontWeight: 700, fontFamily: MONO }}>{value}</span>
    </div>
  );
}

function ModeBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 3,
        border: `1px solid ${active ? T.accentMid : T.border}`,
        background: active ? T.accentMid : "transparent",
        color: active ? "#fff" : T.ink500,
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: T.font,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </button>
  );
}

function DenomInput({ counts, onChange, total }) {
  const notes = DENOMS.filter((d) => d.type === "note");
  const coins = DENOMS.filter((d) => d.type === "coin");
  const handleChange = (value, count) =>
    onChange((prev) => ({ ...prev, [value]: count }));
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: T.ink500,
          fontFamily: T.font,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        Notes
      </div>
      {notes.map((d) => (
        <DenomRow
          key={d.value}
          denom={d}
          count={counts[d.value]}
          onChange={handleChange}
        />
      ))}
      <div
        style={{
          fontSize: 11,
          color: T.ink500,
          fontFamily: T.font,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          margin: "12px 0 8px",
        }}
      >
        Coins
      </div>
      {coins.map((d) => (
        <DenomRow
          key={d.value}
          denom={d}
          count={counts[d.value]}
          onChange={handleChange}
        />
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
          padding: "10px 12px",
          background: T.accentLight,
          border: `1px solid ${T.accentBd}`,
          borderRadius: 4,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: T.accentMid,
            fontFamily: T.font,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Total counted
        </span>
        <span
          style={{
            fontSize: 20,
            fontFamily: MONO,
            fontWeight: 600,
            color: T.accent,
          }}
        >{`R${total.toLocaleString("en-ZA")}`}</span>
      </div>
    </div>
  );
}

function DenomRow({ denom, count, onChange }) {
  const subtotal = (parseInt(count, 10) || 0) * denom.value;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 6,
      }}
    >
      <span
        style={{
          width: 40,
          fontSize: 13,
          fontFamily: MONO,
          fontWeight: 600,
          color: T.ink700,
        }}
      >
        {denom.label}
      </span>
      <span
        style={{ fontSize: 11, color: T.ink500, width: 20, fontFamily: T.font }}
      >
        ×
      </span>
      <input
        type="number"
        min="0"
        step="1"
        value={count}
        onChange={(e) => onChange(denom.value, e.target.value)}
        style={{ ...sInput, width: 80, textAlign: "center", fontSize: 14 }}
        placeholder="0"
      />
      <span
        style={{ fontSize: 11, color: T.ink500, width: 12, fontFamily: T.font }}
      >
        =
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 13,
          color: subtotal > 0 ? T.ink900 : T.ink300,
          minWidth: 80,
          textAlign: "right",
        }}
      >
        {subtotal > 0 ? `R${subtotal.toLocaleString("en-ZA")}` : "—"}
      </span>
    </div>
  );
}

function TodayDoneCard({ cashup, systemCash, cardTotal }) {
  const varAbs = Math.abs(Number(cashup.variance));
  return (
    <div style={{ ...sCard }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 20 }}>
          {cashup.status === "balanced"
            ? "✅"
            : cashup.status === "flagged"
              ? "⚠️"
              : "🚨"}
        </span>
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: T.ink900,
              fontFamily: T.font,
            }}
          >
            Day closed
          </div>
          <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font }}>
            Reconciled at{" "}
            {new Date(cashup.created_at).toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            padding: "4px 10px",
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: T.font,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            ...statusStyle(cashup.status),
          }}
        >
          {cashup.status}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <SummaryKPI
          label="Float"
          value={`R${Number(cashup.opening_float).toLocaleString("en-ZA")}`}
        />
        <SummaryKPI
          label="System cash"
          value={`R${Number(cashup.system_cash_total).toLocaleString("en-ZA")}`}
        />
        <SummaryKPI
          label="Expected"
          value={`R${(Number(cashup.system_cash_total) + Number(cashup.opening_float)).toLocaleString("en-ZA")}`}
        />
        <SummaryKPI
          label="Counted"
          value={`R${Number(cashup.counted_cash).toLocaleString("en-ZA")}`}
        />
        <SummaryKPI
          label="Variance"
          value={
            (Number(cashup.variance) >= 0 ? "+" : "") +
            `R${Math.abs(Number(cashup.variance)).toLocaleString("en-ZA")}`
          }
          colour={
            varAbs === 0 ? T.success : varAbs <= 50 ? T.success : T.warning
          }
        />
        <SummaryKPI
          label="Card (info)"
          value={`R${Number(cardTotal).toLocaleString("en-ZA")}`}
        />
      </div>
      {cashup.reason && (
        <div
          style={{
            fontSize: 12,
            color: T.warning,
            background: T.warningLight,
            border: `1px solid ${T.warningBd}`,
            borderRadius: 4,
            padding: "8px 12px",
          }}
        >
          Reason: {cashup.reason}
        </div>
      )}
    </div>
  );
}

function SummaryKPI({ label, value, colour }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: T.ink500,
          fontFamily: T.font,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontFamily: MONO,
          fontWeight: 600,
          color: colour || T.ink900,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function HistoryPanel({ loading, history }) {
  if (loading)
    return (
      <div
        style={{
          padding: "24px 0",
          textAlign: "center",
          color: T.ink500,
          fontSize: 13,
          fontFamily: T.font,
        }}
      >
        Loading history…
      </div>
    );
  if (history.length === 0)
    return (
      <div
        style={{
          padding: "24px 0",
          textAlign: "center",
          color: T.ink500,
          fontSize: 13,
          fontFamily: T.font,
        }}
      >
        No cash-ups recorded yet.
      </div>
    );
  return (
    <div style={{ marginBottom: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.surface }}>
            {[
              "Date",
              "System Cash",
              "Float",
              "Counted",
              "Variance",
              "Status",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.ink500,
                  borderBottom: `2px solid ${T.border}`,
                  fontFamily: T.font,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => {
            const v = Number(row.variance);
            return (
              <tr
                key={row.id}
                style={{ background: i % 2 === 0 ? "#fff" : T.surface }}
              >
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 13,
                    fontFamily: T.font,
                    color: T.ink900,
                  }}
                >
                  {fmtDate(row.cashup_date)}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 13,
                    fontFamily: MONO,
                  }}
                >{`R${Number(row.system_cash_total).toLocaleString("en-ZA")}`}</td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 13,
                    fontFamily: MONO,
                    color: T.ink500,
                  }}
                >{`R${Number(row.opening_float).toLocaleString("en-ZA")}`}</td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 13,
                    fontFamily: MONO,
                  }}
                >{`R${Number(row.counted_cash).toLocaleString("en-ZA")}`}</td>
                <td
                  style={{
                    padding: "9px 12px",
                    fontSize: 13,
                    fontFamily: MONO,
                    fontWeight: 600,
                    color: Math.abs(v) <= 50 ? T.success : T.warning,
                  }}
                >
                  {v >= 0 ? "+" : ""}
                  {`R${Math.abs(v).toLocaleString("en-ZA")}`}
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: T.font,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      ...statusStyle(row.status),
                    }}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
