// src/components/hq/HQFraud.js — v1.0
// WP-8: Fraud Detection, Security & POPIA Compliance Dashboard
// 5 sub-tabs: Flagged Accounts | Scan Velocity | Suspended | Deletion Requests | Audit Log
// Inline styles only. Fonts: Cormorant Garamond + Jost.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── COLOURS ────────────────────────────────────────────────────────────────
const C = {
  bg: "#f9f8f5",
  card: "#ffffff",
  border: "#e8e4dc",
  green: "#2d4a2d",
  greenPale: "#e8f5e9",
  greenLight: "#52b788",
  red: "#c62828",
  redPale: "#FFEBEE",
  amber: "#F57F17",
  amberPale: "#FFF8E1",
  blue: "#1565C0",
  bluePale: "#E3F2FD",
  purple: "#6A1B9A",
  purplePale: "#F3E5F5",
  text: "#1a1a1a",
  textMid: "#4a4a4a",
  textLight: "#888888",
  white: "#ffffff",
};

const FD = "'Cormorant Garamond', Georgia, serif";
const FB = "'Jost', 'Helvetica Neue', Arial, sans-serif";

// ─── SHARED UI ───────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, accent, action }) {
  const ac = accent || C.green;
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${ac}10, ${ac}04)`,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          borderLeft: `4px solid ${ac}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FD,
              fontSize: 17,
              fontWeight: 600,
              color: C.green,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontFamily: FB,
                fontSize: 12,
                color: C.textLight,
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function Badge({ label, colour, bg }) {
  return (
    <span
      style={{
        background: bg || `${colour}20`,
        color: colour,
        border: `1px solid ${colour}40`,
        borderRadius: 20,
        padding: "2px 10px",
        fontFamily: FB,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

function ActionBtn({ label, colour, onClick, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: small ? "5px 12px" : "8px 18px",
        background: colour || C.green,
        border: "none",
        borderRadius: 7,
        fontFamily: FB,
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        color: C.white,
        cursor: "pointer",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
      onMouseLeave={(e) => (e.target.style.opacity = "1")}
    >
      {label}
    </button>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "36px 20px",
        fontFamily: FB,
        color: C.textLight,
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{message}</div>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        zIndex: 9999,
        background: type === "error" ? C.red : C.green,
        color: C.white,
        padding: "13px 20px",
        borderRadius: 10,
        fontFamily: FB,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      {type === "error" ? "✗ " : "✓ "}
      {msg}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtAgo(d) {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000),
    h = Math.floor(ms / 3600000),
    dy = Math.floor(ms / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
}

// ─── WRITE AUDIT LOG HELPER ──────────────────────────────────────────────────
async function writeAuditLog(action, targetType, targetId, details) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      admin_id: user?.id || null,
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || null,
    });
  } catch (err) {
    console.error("Audit log write error:", err);
  }
}

// ─── TAB 1: FLAGGED ACCOUNTS ─────────────────────────────────────────────────
function TabFlagged({ showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(50);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "id, full_name, email, anomaly_score, churn_risk, is_suspended, flag_reasons, last_active_at, loyalty_points, total_scans",
        )
        .gte("anomaly_score", threshold)
        .order("anomaly_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      showToast("Failed to load flagged accounts: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [threshold, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSuspend = async (user) => {
    if (
      !window.confirm(
        `Suspend ${user.full_name || user.email}? They will no longer earn loyalty points.`,
      )
    )
      return;
    try {
      const reason =
        window.prompt("Suspension reason (shown in audit log):") ||
        "Flagged by HQ";
      const {
        data: { user: admin },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("user_profiles")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_by: admin?.id,
          suspension_reason: reason,
        })
        .eq("id", user.id);
      if (error) throw error;
      await writeAuditLog("SUSPEND_ACCOUNT", "user", user.id, {
        reason,
        email: user.email,
      });
      showToast(`${user.full_name || user.email} suspended`);
      load();
    } catch (err) {
      showToast("Suspend failed: " + err.message, "error");
    }
  };

  const handleReinstate = async (user) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .eq("id", user.id);
      if (error) throw error;
      await writeAuditLog("REINSTATE_ACCOUNT", "user", user.id, {
        email: user.email,
      });
      showToast(`${user.full_name || user.email} reinstated`);
      load();
    } catch (err) {
      showToast("Reinstate failed: " + err.message, "error");
    }
  };

  const handleDismiss = async (user) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ anomaly_score: 0, flag_reasons: [] })
        .eq("id", user.id);
      if (error) throw error;
      await writeAuditLog("DISMISS_FLAG", "user", user.id, {
        email: user.email,
      });
      showToast("Flag dismissed");
      load();
    } catch (err) {
      showToast("Dismiss failed: " + err.message, "error");
    }
  };

  const scoreColour = (s) => (s >= 80 ? C.red : s >= 60 ? C.amber : C.blue);

  return (
    <div>
      <SectionCard
        title="Flagged Accounts"
        subtitle="Accounts with elevated anomaly scores — review and take action"
        accent={C.red}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: FB, fontSize: 12, color: C.textLight }}>
              Min score:
            </span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              style={{
                padding: "4px 8px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontFamily: FB,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {[30, 50, 70, 90].map((v) => (
                <option key={v} value={v}>
                  {v}+
                </option>
              ))}
            </select>
            <ActionBtn
              label="↻ Refresh"
              colour={C.green}
              onClick={load}
              small
            />
          </div>
        }
      >
        {loading ? (
          <EmptyState icon="⏳" message="Loading flagged accounts..." />
        ) : accounts.length === 0 ? (
          <EmptyState
            icon="✅"
            message={`No accounts with anomaly score ≥ ${threshold}. System clean.`}
          />
        ) : (
          accounts.map((acc, i) => (
            <div
              key={acc.id}
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                padding: "14px 16px",
                marginBottom: 8,
                borderRadius: 10,
                background: acc.is_suspended
                  ? C.redPale
                  : i % 2 === 0
                    ? C.white
                    : C.bg,
                border: `1px solid ${acc.is_suspended ? C.red + "40" : C.border}`,
              }}
            >
              {/* Score badge */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: scoreColour(acc.anomaly_score),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: FD,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.white,
                  }}
                >
                  {acc.anomaly_score || 0}
                </span>
              </div>

              {/* User info */}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div
                  style={{
                    fontFamily: FB,
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.text,
                    marginBottom: 2,
                  }}
                >
                  {acc.full_name || "Anonymous"}
                  {acc.is_suspended && (
                    <span
                      style={{
                        marginLeft: 8,
                        background: C.red,
                        color: C.white,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 10,
                      }}
                    >
                      SUSPENDED
                    </span>
                  )}
                </div>
                <div
                  style={{ fontFamily: FB, fontSize: 12, color: C.textLight }}
                >
                  {acc.email}
                </div>
                <div
                  style={{
                    fontFamily: FB,
                    fontSize: 11,
                    color: C.textLight,
                    marginTop: 2,
                  }}
                >
                  {acc.total_scans || 0} scans · {acc.loyalty_points || 0} pts ·
                  last active {fmtAgo(acc.last_active_at)}
                </div>
                {/* Flag reasons */}
                {acc.flag_reasons && acc.flag_reasons.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    {acc.flag_reasons.map((r, j) => (
                      <Badge key={j} label={r} colour={C.red} />
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {acc.is_suspended ? (
                  <ActionBtn
                    label="✓ Reinstate"
                    colour={C.green}
                    onClick={() => handleReinstate(acc)}
                    small
                  />
                ) : (
                  <ActionBtn
                    label="🚫 Suspend"
                    colour={C.red}
                    onClick={() => handleSuspend(acc)}
                    small
                  />
                )}
                <ActionBtn
                  label="✕ Dismiss"
                  colour={C.textLight}
                  onClick={() => handleDismiss(acc)}
                  small
                />
              </div>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}

// ─── TAB 2: SCAN VELOCITY ─────────────────────────────────────────────────────
function TabVelocity({ showToast }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_scan_velocity_flags");
      if (error) throw error;
      setFlags(data || []);
    } catch (err) {
      showToast("Failed to load velocity data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFlag = async (flag) => {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("flag_reasons, anomaly_score")
        .eq("id", flag.user_id)
        .maybeSingle();
      const existing = profile?.flag_reasons || [];
      const reason = `Rapid scans: ${flag.peak_scans} in 60s`;
      if (!existing.includes(reason)) {
        const newScore = Math.min(100, (profile?.anomaly_score || 0) + 30);
        await supabase
          .from("user_profiles")
          .update({
            flag_reasons: [...existing, reason],
            anomaly_score: newScore,
          })
          .eq("id", flag.user_id);
        await writeAuditLog("ADD_FLAG", "user", flag.user_id, { reason });
        showToast("Account flagged and score updated");
        load();
      } else {
        showToast("Already flagged for this reason", "error");
      }
    } catch (err) {
      showToast("Flag failed: " + err.message, "error");
    }
  };

  return (
    <div>
      <SectionCard
        title="⚡ Scan Velocity Flags"
        subtitle="Users with 3+ scans within a 60-second window in the last 7 days"
        accent={C.amber}
        action={
          <ActionBtn label="↻ Refresh" colour={C.green} onClick={load} small />
        }
      >
        {loading ? (
          <EmptyState icon="⏳" message="Analysing scan patterns..." />
        ) : flags.length === 0 ? (
          <EmptyState
            icon="✅"
            message="No rapid scan patterns detected in the last 7 days."
          />
        ) : (
          <>
            <div
              style={{
                fontFamily: FB,
                fontSize: 12,
                color: C.textLight,
                marginBottom: 14,
                padding: "8px 12px",
                background: C.amberPale,
                borderRadius: 8,
                border: `1px solid ${C.amber}30`,
              }}
            >
              ⚠ These users triggered rapid scan detection. This may indicate QR
              screenshot sharing or automated scanning. Review before flagging —
              some may be legitimate testers.
            </div>
            {flags.map((f, i) => (
              <div
                key={f.user_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  marginBottom: 8,
                  borderRadius: 10,
                  background: i % 2 === 0 ? C.white : C.bg,
                  border: `1px solid ${C.border}`,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: C.amber,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FD,
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.white,
                    }}
                  >
                    {f.peak_scans}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div
                    style={{
                      fontFamily: FB,
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    {f.display_name}
                  </div>
                  <div
                    style={{ fontFamily: FB, fontSize: 12, color: C.textLight }}
                  >
                    {f.user_email}
                  </div>
                  <div
                    style={{
                      fontFamily: FB,
                      fontSize: 11,
                      color: C.textLight,
                      marginTop: 2,
                    }}
                  >
                    Peak: {f.peak_scans} scans in 60s ·{" "}
                    {fmtDate(f.window_start)}
                    {f.anomaly_score > 0 && (
                      <span
                        style={{ marginLeft: 8, color: C.red, fontWeight: 600 }}
                      >
                        Score: {f.anomaly_score}
                      </span>
                    )}
                  </div>
                </div>
                <ActionBtn
                  label="⚑ Flag Account"
                  colour={C.amber}
                  onClick={() => handleFlag(f)}
                  small
                />
              </div>
            ))}
          </>
        )}
      </SectionCard>
    </div>
  );
}

// ─── TAB 3: SUSPENDED ACCOUNTS ────────────────────────────────────────────────
function TabSuspended({ showToast }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "id, full_name, email, suspended_at, suspension_reason, anomaly_score, loyalty_points",
        )
        .eq("is_suspended", true)
        .order("suspended_at", { ascending: false });
      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      showToast("Failed to load suspended accounts: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReinstate = async (acc) => {
    if (
      !window.confirm(
        `Reinstate ${acc.full_name || acc.email}? They will resume earning loyalty points.`,
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .eq("id", acc.id);
      if (error) throw error;
      await writeAuditLog("REINSTATE_ACCOUNT", "user", acc.id, {
        email: acc.email,
      });
      showToast(`${acc.full_name || acc.email} reinstated`);
      load();
    } catch (err) {
      showToast("Reinstate failed: " + err.message, "error");
    }
  };

  return (
    <div>
      <SectionCard
        title="🚫 Suspended Accounts"
        subtitle="These users can scan and browse but earn zero loyalty points"
        accent={C.red}
        action={
          <ActionBtn label="↻ Refresh" colour={C.green} onClick={load} small />
        }
      >
        {loading ? (
          <EmptyState icon="⏳" message="Loading..." />
        ) : accounts.length === 0 ? (
          <EmptyState
            icon="✅"
            message="No suspended accounts. All users are in good standing."
          />
        ) : (
          accounts.map((acc, i) => (
            <div
              key={acc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                marginBottom: 8,
                borderRadius: 10,
                background: C.redPale,
                border: `1px solid ${C.red}30`,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: C.red,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: C.white, fontSize: 18 }}>🚫</span>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div
                  style={{
                    fontFamily: FB,
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.text,
                  }}
                >
                  {acc.full_name || "Anonymous"}
                </div>
                <div
                  style={{ fontFamily: FB, fontSize: 12, color: C.textLight }}
                >
                  {acc.email}
                </div>
                <div
                  style={{
                    fontFamily: FB,
                    fontSize: 11,
                    color: C.textLight,
                    marginTop: 2,
                  }}
                >
                  Suspended {fmtAgo(acc.suspended_at)} ·{" "}
                  {acc.loyalty_points || 0} pts frozen
                </div>
                {acc.suspension_reason && (
                  <div
                    style={{
                      fontFamily: FB,
                      fontSize: 12,
                      color: C.red,
                      marginTop: 3,
                      fontStyle: "italic",
                    }}
                  >
                    Reason: {acc.suspension_reason}
                  </div>
                )}
              </div>
              <ActionBtn
                label="✓ Reinstate"
                colour={C.green}
                onClick={() => handleReinstate(acc)}
                small
              />
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}

// ─── TAB 4: DELETION REQUESTS ─────────────────────────────────────────────────
function TabDeletion({ showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deletion_requests")
        .select("*, user_profiles(full_name, email)")
        .order("requested_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      showToast("Failed to load deletion requests: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleProcess = async (req, status) => {
    const notes =
      status === "approved"
        ? window.prompt(
            "Confirmation notes (e.g. data deleted via Supabase dashboard):",
          ) || "Data deletion processed"
        : window.prompt("Rejection reason:") || "Request rejected";
    try {
      const {
        data: { user: admin },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("deletion_requests")
        .update({
          status,
          processed_at: new Date().toISOString(),
          processed_by: admin?.id,
          notes,
        })
        .eq("id", req.id);
      if (error) throw error;
      await writeAuditLog(
        status === "approved" ? "APPROVE_DELETION" : "REJECT_DELETION",
        "user",
        req.user_id,
        { notes },
      );
      showToast(`Request ${status}`);
      load();
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div>
      <SectionCard
        title="🗑️ Data Deletion Requests"
        subtitle="POPIA compliance — requests must be processed within 30 days"
        accent={C.purple}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {pendingCount > 0 && (
              <Badge label={`${pendingCount} pending`} colour={C.red} />
            )}
            <ActionBtn
              label="↻ Refresh"
              colour={C.green}
              onClick={load}
              small
            />
          </div>
        }
      >
        {loading ? (
          <EmptyState icon="⏳" message="Loading deletion requests..." />
        ) : requests.length === 0 ? (
          <EmptyState icon="✅" message="No deletion requests on record." />
        ) : (
          requests.map((req) => {
            const name = req.user_profiles?.full_name || "Anonymous";
            const email = req.user_profiles?.email || req.user_id;
            const isPending = req.status === "pending";
            const daysAgo = Math.floor(
              (Date.now() - new Date(req.requested_at)) / 86400000,
            );
            const overdue = isPending && daysAgo > 25;
            return (
              <div
                key={req.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  marginBottom: 8,
                  borderRadius: 10,
                  background: overdue
                    ? C.redPale
                    : isPending
                      ? C.purplePale
                      : C.bg,
                  border: `1px solid ${overdue ? C.red + "40" : isPending ? C.purple + "30" : C.border}`,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FB,
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.text,
                      }}
                    >
                      {name}
                    </span>
                    <Badge
                      label={req.status.toUpperCase()}
                      colour={
                        req.status === "pending"
                          ? C.amber
                          : req.status === "approved"
                            ? C.green
                            : C.red
                      }
                    />
                    {overdue && <Badge label="OVERDUE" colour={C.red} />}
                  </div>
                  <div
                    style={{ fontFamily: FB, fontSize: 12, color: C.textLight }}
                  >
                    {email}
                  </div>
                  <div
                    style={{
                      fontFamily: FB,
                      fontSize: 11,
                      color: C.textLight,
                      marginTop: 2,
                    }}
                  >
                    Requested {fmtDate(req.requested_at)} · {daysAgo} day
                    {daysAgo !== 1 ? "s" : ""} ago
                    {req.notes && <span> · {req.notes}</span>}
                  </div>
                </div>
                {isPending && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <ActionBtn
                      label="✓ Approve"
                      colour={C.green}
                      onClick={() => handleProcess(req, "approved")}
                      small
                    />
                    <ActionBtn
                      label="✕ Reject"
                      colour={C.red}
                      onClick={() => handleProcess(req, "rejected")}
                      small
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background: C.purplePale,
            borderRadius: 8,
            fontFamily: FB,
            fontSize: 12,
            color: C.textMid,
            lineHeight: 1.6,
          }}
        >
          <strong>POPIA obligation:</strong> Data deletion requests must be
          processed within <strong>30 days</strong>. Approved requests require
          manual deletion of the user's data from the Supabase Auth dashboard
          and user_profiles table. After deletion, update the request status to
          "approved" and add confirmation notes.
        </div>
      </SectionCard>
    </div>
  );
}

// ─── TAB 5: AUDIT LOG ────────────────────────────────────────────────────────
function TabAuditLog({ showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const ACTION_TYPES = [
    { value: "all", label: "All Actions" },
    { value: "SUSPEND_ACCOUNT", label: "Suspensions" },
    { value: "REINSTATE_ACCOUNT", label: "Reinstatements" },
    { value: "DISMISS_FLAG", label: "Dismissed Flags" },
    { value: "ADD_FLAG", label: "Added Flags" },
    { value: "APPROVE_DELETION", label: "Deletion Approvals" },
    { value: "REJECT_DELETION", label: "Deletion Rejections" },
  ];

  const ACTION_COLOURS = {
    SUSPEND_ACCOUNT: C.red,
    REINSTATE_ACCOUNT: C.green,
    DISMISS_FLAG: C.textLight,
    ADD_FLAG: C.amber,
    APPROVE_DELETION: C.purple,
    REJECT_DELETION: C.red,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_log")
        .select("*, user_profiles!fk_audit_log_user_profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") query = query.eq("action", filter);
      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      showToast("Failed to load audit log: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <SectionCard
        title="📋 Admin Audit Log"
        subtitle="Every admin action is recorded here — immutable record"
        accent={C.blue}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: "4px 8px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontFamily: FB,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ActionBtn label="↻" colour={C.green} onClick={load} small />
          </div>
        }
      >
        {loading ? (
          <EmptyState icon="⏳" message="Loading audit log..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon="📋"
            message="No audit entries yet. Admin actions will appear here."
          />
        ) : (
          <div style={{ fontFamily: FB }}>
            {logs.map((log, i) => {
              const adminName =
                log.user_profiles?.full_name ||
                log.user_profiles?.email ||
                "System";
              const colour = ACTION_COLOURS[log.action] || C.textMid;
              return (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 14px",
                    marginBottom: 4,
                    borderRadius: 8,
                    background: i % 2 === 0 ? C.white : C.bg,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: colour,
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{ fontSize: 13, fontWeight: 600, color: colour }}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 11, color: C.textLight }}>
                        by {adminName}
                      </span>
                      {log.target_type && (
                        <Badge label={log.target_type} colour={C.blue} />
                      )}
                    </div>
                    {log.details && (
                      <div
                        style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}
                      >
                        {Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </div>
                    )}
                    <div
                      style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}
                    >
                      {fmtDate(log.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: HQFraud v1.0
// ═════════════════════════════════════════════════════════════════════════════
export default function HQFraud() {
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({
    flagged: 0,
    suspended: 0,
    deletions: 0,
  });

  function showToast(msg, type = "success") {
    setToast({ msg, type });
  }

  // Load badge counts for tab headers
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [flaggedRes, suspendedRes, deletionRes] = await Promise.all([
          supabase
            .from("user_profiles")
            .select("id", { count: "exact", head: true })
            .gte("anomaly_score", 50),
          supabase
            .from("user_profiles")
            .select("id", { count: "exact", head: true })
            .eq("is_suspended", true),
          supabase
            .from("deletion_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);
        setCounts({
          flagged: flaggedRes.count || 0,
          suspended: suspendedRes.count || 0,
          deletions: deletionRes.count || 0,
        });
      } catch (_) {}
    };
    loadCounts();
  }, [activeTab]); // refresh counts when switching tabs

  const TABS = [
    { label: "🚨 Flagged", badge: counts.flagged },
    { label: "⚡ Velocity", badge: 0 },
    { label: "🚫 Suspended", badge: counts.suspended },
    { label: "🗑️ Deletions", badge: counts.deletions },
    { label: "📋 Audit Log", badge: 0 },
  ];

  return (
    <div style={{ fontFamily: FB, background: C.bg, minHeight: "100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div
        style={{
          padding: "24px 28px 0",
          borderBottom: `1px solid ${C.border}`,
          background: C.white,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontFamily: FD,
              fontSize: 28,
              fontWeight: 700,
              color: C.green,
              margin: 0,
            }}
          >
            🛡️ Fraud & Security Centre
          </h1>
          <p
            style={{
              fontFamily: FB,
              fontSize: 13,
              color: C.textLight,
              margin: "4px 0 0",
            }}
          >
            Real-time fraud detection, account suspension, POPIA compliance and
            admin audit trail.
          </p>
        </div>

        {/* Summary strip */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Flagged Accounts",
              value: counts.flagged,
              colour: counts.flagged > 0 ? C.red : C.green,
            },
            {
              label: "Suspended",
              value: counts.suspended,
              colour: counts.suspended > 0 ? C.red : C.green,
            },
            {
              label: "Pending Deletions",
              value: counts.deletions,
              colour: counts.deletions > 0 ? C.amber : C.green,
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: C.white,
                border: `1px solid ${s.colour}25`,
                borderTop: `3px solid ${s.colour}`,
                borderRadius: 8,
                padding: "10px 18px",
                textAlign: "center",
                minWidth: 120,
              }}
            >
              <div
                style={{
                  fontFamily: FD,
                  fontSize: 24,
                  fontWeight: 700,
                  color: s.colour,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: FB,
                  fontSize: 11,
                  color: C.textLight,
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === i
                    ? `3px solid ${C.red}`
                    : "3px solid transparent",
                fontFamily: FB,
                fontSize: 13,
                fontWeight: activeTab === i ? 600 : 400,
                color: activeTab === i ? C.red : C.textMid,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span
                  style={{
                    background: C.red,
                    color: C.white,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    lineHeight: "14px",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: "24px 28px", maxWidth: 900 }}>
        {activeTab === 0 && <TabFlagged showToast={showToast} />}
        {activeTab === 1 && <TabVelocity showToast={showToast} />}
        {activeTab === 2 && <TabSuspended showToast={showToast} />}
        {activeTab === 3 && <TabDeletion showToast={showToast} />}
        {activeTab === 4 && <TabAuditLog showToast={showToast} />}
      </div>

      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
