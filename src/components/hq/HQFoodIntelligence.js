// HQFoodIntelligence.js — WP-FNB S8
// Food Intelligence Dashboard — pure aggregation of S1–S7 data
// No new DB tables. Reads: food_recipes, food_recipe_lines, food_ingredients,
// production_runs, haccp_log_entries, haccp_control_points, haccp_nonconformances,
// document_log (food safety), temperature_logs, cold_chain_locations, recall_events

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── T TOKEN SYSTEM (locked — WP-VISUAL-SYSTEM v1.0) ─────────────────────────
const T = {
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentBd: "#A7D9B8",
  accentLit: "#E8F5EE",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  ink900: "#0F172A",
  ink700: "#334155",
  ink500: "#64748B",
  ink400: "#94A3B8",
  ink300: "#CBD5E1",
  ink150: "#E2E8F0",
  ink050: "#F8FAFC",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.10)",
  display: {
    fontFamily: "Inter,sans-serif",
    fontSize: 36,
    fontWeight: 300,
    letterSpacing: "-0.03em",
    fontVariantNumeric: "tabular-nums",
  },
  title: {
    fontFamily: "Inter,sans-serif",
    fontSize: 22,
    fontWeight: 400,
    letterSpacing: "-0.01em",
  },
  heading: {
    fontFamily: "Inter,sans-serif",
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0,
  },
  kpi: {
    fontFamily: "Inter,sans-serif",
    fontSize: 24,
    fontWeight: 400,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  kpiSm: {
    fontFamily: "Inter,sans-serif",
    fontSize: 18,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    fontVariantNumeric: "tabular-nums",
  },
  body: {
    fontFamily: "Inter,sans-serif",
    fontSize: 13,
    fontWeight: 400,
    letterSpacing: 0,
  },
  label: {
    fontFamily: "Inter,sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
  },
  caption: {
    fontFamily: "Inter,sans-serif",
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: 0,
  },
  data: {
    fontFamily: "Inter,sans-serif",
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: 0,
    fontVariantNumeric: "tabular-nums",
  },
};

const badgeMap = {
  good: { bg: T.successBg, bd: T.successBd, color: T.success },
  warning: { bg: T.warningBg, bd: T.warningBd, color: T.warning },
  critical: { bg: T.dangerBg, bd: T.dangerBd, color: T.danger },
  info: { bg: T.infoBg, bd: T.infoBd, color: T.info },
};

const SA_ALLERGENS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soybeans",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
];

// ─── SHARED MICRO-COMPONENTS ─────────────────────────────────────────────────

function Badge({ label, variant = "info" }) {
  const s = badgeMap[variant] || badgeMap.info;
  return (
    <span
      style={{
        ...T.label,
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 3,
        background: s.bg,
        border: `1px solid ${s.bd}`,
        color: s.color,
      }}
    >
      {label}
    </span>
  );
}

function KpiTile({ label, value, sub, variant }) {
  const color =
    variant === "danger"
      ? T.danger
      : variant === "warning"
        ? T.warning
        : variant === "success"
          ? T.success
          : T.ink900;
  return (
    <div style={{ background: "#fff", padding: "18px 20px" }}>
      <div style={{ ...T.label, color: T.ink500, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ ...T.kpi, color, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ ...T.caption, color: T.ink500 }}>{sub}</div>}
    </div>
  );
}

function CardShell({ title, badge, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: `1px solid ${T.ink150}`,
        padding: 20,
        boxShadow: T.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ ...T.heading, color: T.ink900 }}>{title}</div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 6, background: T.ink150, borderRadius: 3 }}>
      <div
        style={{
          height: 6,
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: color,
          borderRadius: 3,
          transition: "width .4s",
        }}
      />
    </div>
  );
}

function ScoreRow({ score, label }) {
  const color = score >= 85 ? T.success : score >= 65 ? T.warning : T.danger;
  const bg = score >= 85 ? T.successBg : score >= 65 ? T.warningBg : T.dangerBg;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: bg,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...T.kpiSm,
          color,
          fontWeight: 600,
        }}
      >
        {score}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            ...T.body,
            color: T.ink700,
            fontWeight: 500,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <ProgressBar pct={score} color={color} />
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div
      style={{
        ...T.body,
        color: T.ink500,
        padding: "20px 0",
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}

// ─── DETAIL CARDS ─────────────────────────────────────────────────────────────

function ComplianceCard({ d }) {
  const overall = d.overallCompliance;
  const variant =
    overall >= 85 ? "good" : overall >= 65 ? "warning" : "critical";
  const bigColor =
    overall >= 85 ? T.success : overall >= 65 ? T.warning : T.danger;
  return (
    <CardShell
      title="Compliance Score"
      badge={
        <Badge
          label={
            overall >= 85 ? "HEALTHY" : overall >= 65 ? "AT RISK" : "CRITICAL"
          }
          variant={variant}
        />
      }
    >
      <div style={{ ...T.display, color: bigColor, marginBottom: 18 }}>
        {overall}%
      </div>
      <ScoreRow score={d.haccpPass ?? 0} label="HACCP Pass Rate" />
      <ScoreRow score={d.certScore ?? 0} label="Certificate Validity" />
      <ScoreRow score={d.coldScore ?? 0} label="Cold Chain Health" />
      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          background: T.ink050,
          borderRadius: 6,
          ...T.caption,
          color: T.ink500,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {d.expiredCerts > 0 && (
          <div style={{ color: T.danger }}>
            ⚠ {d.expiredCerts} expired cert{d.expiredCerts > 1 ? "s" : ""} —
            action required
          </div>
        )}
        {d.expiringSoonCerts > 0 && (
          <div style={{ color: T.warning }}>
            △ {d.expiringSoonCerts} cert{d.expiringSoonCerts > 1 ? "s" : ""}{" "}
            expiring within 30 days
          </div>
        )}
        {d.openNcrs > 0 && (
          <div style={{ color: T.warning }}>
            △ {d.openNcrs} open HACCP non-conformance{d.openNcrs > 1 ? "s" : ""}{" "}
            unresolved
          </div>
        )}
        {d.expiredCerts === 0 &&
          d.expiringSoonCerts === 0 &&
          d.openNcrs === 0 && (
            <div style={{ color: T.success }}>
              ✓ All compliance indicators clear
            </div>
          )}
      </div>
    </CardShell>
  );
}

function AllergenCard({ d }) {
  const top = d.allergenCounts.filter((a) => a.count > 0).slice(0, 8);
  const maxCount = top.length > 0 ? top[0].count : 1;
  const highRisk = d.allergenMatrix.filter(
    (r) => r.allergens.length >= 4,
  ).length;
  return (
    <CardShell
      title="Allergen Risk Map"
      badge={
        <Badge
          label={`${d.recipeCount} RECIPE${d.recipeCount !== 1 ? "S" : ""}`}
          variant="info"
        />
      }
    >
      {top.length === 0 ? (
        <EmptyState message="No allergen data. Add recipes with allergen flags in the Recipes tab." />
      ) : (
        <>
          <div style={{ ...T.caption, color: T.ink500, marginBottom: 12 }}>
            Allergens ranked by recipe exposure — {highRisk} recipe
            {highRisk !== 1 ? "s" : ""} carry 4+ allergens
          </div>
          {top.map((a) => {
            const barColor =
              a.count >= 4 ? T.danger : a.count >= 2 ? T.warning : T.accentMid;
            return (
              <div key={a.key} style={{ marginBottom: 9 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 3,
                  }}
                >
                  <span style={{ ...T.body, color: T.ink700 }}>{a.label}</span>
                  <span style={{ ...T.data, color: T.ink500 }}>
                    {a.count} recipe{a.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <ProgressBar
                  pct={(a.count / maxCount) * 100}
                  color={barColor}
                />
              </div>
            );
          })}
          {d.allergenMatrix.length > 0 && (
            <div
              style={{
                marginTop: 12,
                ...T.caption,
                color: T.ink500,
                borderTop: `1px solid ${T.ink150}`,
                paddingTop: 10,
              }}
            >
              {d.allergenMatrix.filter((r) => r.allergens.length === 0).length}{" "}
              recipe
              {d.allergenMatrix.filter((r) => r.allergens.length === 0)
                .length !== 1
                ? "s"
                : ""}{" "}
              declared allergen-free
            </div>
          )}
        </>
      )}
    </CardShell>
  );
}

function CostCard({ d }) {
  const costs = d.costData;
  if (costs.length === 0) {
    return (
      <CardShell
        title="Recipe Cost Trends"
        badge={<Badge label="NO COST DATA" variant="info" />}
      >
        <EmptyState message="No recipe cost data. Add BOM to recipes in the Recipes tab." />
      </CardShell>
    );
  }
  const maxCost = Math.max(...costs.map((c) => c.cost));
  const minCost = Math.min(...costs.map((c) => c.cost));
  const avgCost = costs.reduce((s, c) => s + c.cost, 0) / costs.length;
  return (
    <CardShell
      title="Recipe Cost Trends"
      badge={<Badge label={`AVG R${avgCost.toFixed(2)}`} variant="info" />}
    >
      <div style={{ ...T.caption, color: T.ink500, marginBottom: 12 }}>
        Cost per unit (R) — {costs.length} recipes with BOM data
      </div>
      {/* Bar chart */}
      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "flex-end",
          height: 72,
          marginBottom: 6,
        }}
      >
        {costs.map((c, i) => {
          const barColor =
            c.cost > avgCost * 1.25
              ? T.danger
              : c.cost > avgCost
                ? T.warning
                : T.accentMid;
          return (
            <div
              key={i}
              title={`${c.name}: R${c.cost.toFixed(2)}`}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(6, (c.cost / maxCost) * 64)}px`,
                  background: barColor,
                  borderRadius: "3px 3px 0 0",
                  transition: "height .4s",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {costs.map((c, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              ...T.caption,
              color: T.ink500,
              textAlign: "center",
              fontSize: 9,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.name}
          </div>
        ))}
      </div>
      {/* Min / Avg / Max strip */}
      <div
        style={{
          borderTop: `1px solid ${T.ink150}`,
          paddingTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
        }}
      >
        {[
          { lab: "LOWEST", val: `R${minCost.toFixed(2)}`, col: T.success },
          { lab: "AVERAGE", val: `R${avgCost.toFixed(2)}`, col: T.ink700 },
          { lab: "HIGHEST", val: `R${maxCost.toFixed(2)}`, col: T.danger },
        ].map(({ lab, val, col }) => (
          <div key={lab} style={{ textAlign: "center" }}>
            <div style={{ ...T.label, color: T.ink400, marginBottom: 2 }}>
              {lab}
            </div>
            <div style={{ ...T.data, color: col, fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function ColdChainCard({ d }) {
  const cc = d.coldChain;
  const variant =
    cc.critBreaches > 0 ? "critical" : cc.warnBreaches > 0 ? "warning" : "good";
  return (
    <CardShell
      title="Cold Chain Health"
      badge={
        <Badge
          label={
            cc.critBreaches > 0
              ? "BREACHES"
              : cc.warnBreaches > 0
                ? "WARNINGS"
                : "ALL CLEAR"
          }
          variant={variant}
        />
      }
    >
      {/* Breach summary tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {[
          {
            lab: "CRITICAL",
            val: cc.critBreaches,
            active: cc.critBreaches > 0,
            activeBg: T.dangerBg,
            activeBd: T.dangerBd,
            activeCol: T.danger,
          },
          {
            lab: "WARNINGS",
            val: cc.warnBreaches,
            active: cc.warnBreaches > 0,
            activeBg: T.warningBg,
            activeBd: T.warningBd,
            activeCol: T.warning,
          },
        ].map(({ lab, val, active, activeBg, activeBd, activeCol }) => (
          <div
            key={lab}
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              background: active ? activeBg : T.successBg,
              border: `1px solid ${active ? activeBd : T.successBd}`,
            }}
          >
            <div style={{ ...T.label, color: active ? activeCol : T.success }}>
              {lab}
            </div>
            <div
              style={{
                ...T.kpiSm,
                color: active ? activeCol : T.success,
                margin: "2px 0",
              }}
            >
              {val}
            </div>
            <div style={{ ...T.caption, color: T.ink500 }}>
              {lab === "CRITICAL" ? "temp breaches" : "exceedances"}
            </div>
          </div>
        ))}
      </div>
      {/* Location health */}
      {cc.coldHealthByLocation.length === 0 ? (
        <div style={{ ...T.caption, color: T.ink500 }}>
          No locations configured. Use "Load Default Locations" in the Cold
          Chain tab.
        </div>
      ) : (
        <>
          <div style={{ ...T.label, color: T.ink400, marginBottom: 8 }}>
            LOCATION HEALTH
          </div>
          {cc.coldHealthByLocation.map((loc, i) => {
            const barColor =
              loc.pct >= 95 ? T.success : loc.pct >= 80 ? T.warning : T.danger;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    ...T.body,
                    color: T.ink700,
                    width: 110,
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loc.name}
                </div>
                <div style={{ flex: 1 }}>
                  <ProgressBar pct={loc.pct} color={barColor} />
                </div>
                <div
                  style={{
                    ...T.data,
                    color: T.ink500,
                    width: 38,
                    textAlign: "right",
                  }}
                >
                  {loc.pct}%
                </div>
              </div>
            );
          })}
        </>
      )}
      <div style={{ marginTop: 10, ...T.caption, color: T.ink500 }}>
        {cc.totalReadings} total readings analysed
      </div>
    </CardShell>
  );
}

function RecallCard({ d }) {
  const r = d.recalls;
  const variant =
    r.openRecalls.length > 0
      ? "critical"
      : r.recallScore >= 80
        ? "good"
        : "warning";
  return (
    <CardShell
      title="Recall Readiness"
      badge={
        <Badge
          label={
            r.openRecalls.length > 0
              ? "ACTIVE RECALL"
              : `SCORE ${r.recallScore}%`
          }
          variant={variant}
        />
      }
    >
      {/* Active recall banner */}
      {r.openRecalls.length > 0 && (
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 6,
            padding: "10px 12px",
            marginBottom: 12,
          }}
        >
          <div style={{ ...T.label, color: T.danger, marginBottom: 4 }}>
            ACTIVE RECALL IN PROGRESS
          </div>
          {r.openRecalls.map((rc, i) => (
            <div key={i} style={{ ...T.body, color: T.danger }}>
              Class {rc.severity_class?.toUpperCase() || "—"} — initiated{" "}
              {rc.initiated_at?.slice(0, 10)}
            </div>
          ))}
        </div>
      )}

      {/* Readiness score bar */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ ...T.label, color: T.ink400 }}>READINESS SCORE</span>
          <span style={{ ...T.data, color: T.ink700 }}>
            {r.recallScore} / 100
          </span>
        </div>
        <ProgressBar
          pct={r.recallScore}
          color={
            r.recallScore >= 80
              ? T.success
              : r.recallScore >= 50
                ? T.warning
                : T.danger
          }
        />
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          {
            lab: "OPEN",
            val: r.openRecalls.length,
            col: r.openRecalls.length > 0 ? T.danger : T.success,
          },
          { lab: "CLOSED", val: r.closedRecalls.length, col: T.ink700 },
          { lab: "DRILLS", val: r.drills.length, col: T.ink700 },
        ].map(({ lab, val, col }) => (
          <div
            key={lab}
            style={{
              textAlign: "center",
              padding: "10px 8px",
              background: T.ink050,
              borderRadius: 6,
            }}
          >
            <div style={{ ...T.kpiSm, color: col }}>{val}</div>
            <div
              style={{ ...T.label, color: T.ink400, fontSize: 9, marginTop: 2 }}
            >
              {lab}
            </div>
          </div>
        ))}
      </div>

      {/* Last drill */}
      <div
        style={{ padding: "10px 12px", background: T.ink050, borderRadius: 6 }}
      >
        <div style={{ ...T.label, color: T.ink400, marginBottom: 4 }}>
          LAST MOCK DRILL
        </div>
        {r.lastDrill ? (
          <div
            style={{
              ...T.body,
              color:
                r.daysSinceDrill > 180
                  ? T.danger
                  : r.daysSinceDrill > 90
                    ? T.warning
                    : T.success,
            }}
          >
            {r.daysSinceDrill} days ago (
            {r.lastDrill.initiated_at?.slice(0, 10)})
            {r.daysSinceDrill > 180 && " — OVERDUE, schedule immediately"}
            {r.daysSinceDrill > 90 && r.daysSinceDrill <= 180 && " — due soon"}
            {r.daysSinceDrill <= 90 && " — within recommended 90-day window"}
          </div>
        ) : (
          <div style={{ ...T.body, color: T.warning }}>
            No drill on record — schedule one via Recall tab
          </div>
        )}
      </div>
    </CardShell>
  );
}

function WasteCard({ d }) {
  const w = d.waste;
  const variant =
    w.avgYield === null
      ? "info"
      : w.avgYield >= 92
        ? "good"
        : w.avgYield >= 80
          ? "warning"
          : "critical";
  const maxWaste =
    w.wasteByRun.length > 0
      ? Math.max(1, ...w.wasteByRun.map((r) => r.wastePct))
      : 1;
  return (
    <CardShell
      title="Waste Estimate"
      badge={
        <Badge
          label={w.avgYield !== null ? `AVG YIELD ${w.avgYield}%` : "NO DATA"}
          variant={variant}
        />
      }
    >
      {w.wasteByRun.length === 0 ? (
        <EmptyState message="No production runs with planned vs actual quantities found." />
      ) : (
        <>
          {/* Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                background: T.ink050,
              }}
            >
              <div style={{ ...T.label, color: T.ink400, marginBottom: 2 }}>
                AVG YIELD
              </div>
              <div
                style={{
                  ...T.kpiSm,
                  color:
                    w.avgYield >= 90
                      ? T.success
                      : w.avgYield >= 80
                        ? T.warning
                        : T.danger,
                }}
              >
                {w.avgYield}%
              </div>
              <div style={{ ...T.caption, color: T.ink500 }}>
                {w.avgYield >= 92
                  ? "Target met"
                  : w.avgYield >= 80
                    ? "Below target"
                    : "High waste — investigate"}
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                background: T.ink050,
              }}
            >
              <div style={{ ...T.label, color: T.ink400, marginBottom: 2 }}>
                RUNS ANALYSED
              </div>
              <div style={{ ...T.kpiSm, color: T.ink700 }}>{w.totalRuns}</div>
              <div style={{ ...T.caption, color: T.ink500 }}>
                with yield data
              </div>
            </div>
          </div>

          {/* Per-run waste bars */}
          <div style={{ ...T.label, color: T.ink400, marginBottom: 8 }}>
            WASTE % PER RUN (RECENT)
          </div>
          {w.wasteByRun.slice(0, 6).map((run, i) => {
            const barColor =
              run.wastePct > 15
                ? T.danger
                : run.wastePct > 8
                  ? T.warning
                  : T.accentMid;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 7,
                }}
              >
                <div
                  style={{
                    ...T.caption,
                    color: T.ink500,
                    width: 62,
                    flexShrink: 0,
                  }}
                >
                  {run.date || "—"}
                </div>
                <div style={{ flex: 1 }}>
                  <ProgressBar
                    pct={(run.wastePct / maxWaste) * 100}
                    color={barColor}
                  />
                </div>
                <div
                  style={{
                    ...T.data,
                    color: run.wastePct > 15 ? T.danger : T.ink500,
                    width: 36,
                    textAlign: "right",
                  }}
                >
                  {run.wastePct}%
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 8, ...T.caption, color: T.ink500 }}>
            Waste target: &lt;8% per run · Trigger investigation: &gt;15%
          </div>
        </>
      )}
    </CardShell>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function HQFoodIntelligence({ tenantId, role }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const [
        recipesRes,
        haccpCpsRes,
        haccpLogsRes,
        haccpNcrsRes,
        certsRes,
        tempLogsRes,
        coldLocRes,
        recallRes,
        productionRes,
      ] = await Promise.all([
        supabase
          .from("food_recipes")
          .select("id,name,allergen_flags,cost_per_unit,status,created_at")
          .eq("tenant_id", tenantId),
        supabase
          .from("haccp_control_points")
          .select("id,hazard_type,status")
          .eq("tenant_id", tenantId),
        supabase
          .from("haccp_log_entries")
          .select("id,is_within_limit,created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("haccp_nonconformances")
          .select("id,severity,status,created_at")
          .eq("tenant_id", tenantId),
        supabase
          .from("document_log")
          .select("id,food_doc_type,cert_expiry_date,document_name")
          .eq("tenant_id", tenantId)
          .eq("is_food_safety_doc", true),
        supabase
          .from("temperature_logs")
          .select("id,is_breach,breach_severity,recorded_at,location_id")
          .eq("tenant_id", tenantId)
          .order("recorded_at", { ascending: false })
          .limit(300),
        supabase
          .from("cold_chain_locations")
          .select("id,name,location_type")
          .eq("tenant_id", tenantId),
        supabase
          .from("recall_events")
          .select("id,status,severity_class,initiated_at,closed_at,is_drill")
          .eq("tenant_id", tenantId)
          .order("initiated_at", { ascending: false }),
        supabase
          .from("production_runs")
          .select("id,planned_qty,actual_units,batch_yield_pct,created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const recipes = recipesRes.data || [];
      const ccps = haccpCpsRes.data || [];
      const haccpLogs = haccpLogsRes.data || [];
      const ncrs = haccpNcrsRes.data || [];
      const certs = certsRes.data || [];
      const tempLogs = tempLogsRes.data || [];
      const coldLocs = coldLocRes.data || [];
      const recalls = recallRes.data || [];
      const runs = productionRes.data || [];

      const now = new Date();

      // ── COMPLIANCE SCORES ────────────────────────────────────────────────
      const haccpPass =
        haccpLogs.length > 0
          ? Math.round(
              (haccpLogs.filter((l) => l.is_within_limit).length /
                haccpLogs.length) *
                100,
            )
          : null;

      const expiredCerts = certs.filter(
        (c) => c.cert_expiry_date && new Date(c.cert_expiry_date) < now,
      );
      const expiringSoonCerts = certs.filter((c) => {
        if (!c.cert_expiry_date) return false;
        const diff = (new Date(c.cert_expiry_date) - now) / 86400000;
        return diff >= 0 && diff <= 30;
      });
      const certScore =
        certs.length === 0
          ? null
          : Math.round(
              ((certs.length - expiredCerts.length) / certs.length) * 100,
            );

      const breachCount = tempLogs.filter((t) => t.is_breach).length;
      const coldScore =
        tempLogs.length === 0
          ? null
          : Math.round(
              ((tempLogs.length - breachCount) / tempLogs.length) * 100,
            );

      const scores = [haccpPass, certScore, coldScore].filter(
        (s) => s !== null,
      );
      const overallCompliance =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

      // ── ALLERGEN RISK MAP ────────────────────────────────────────────────
      const allergenMatrix = recipes.map((r) => {
        const flags = r.allergen_flags || {};
        return {
          id: r.id,
          name: r.name,
          allergens: SA_ALLERGENS.filter((a) => flags[a]),
        };
      });
      const allergenCounts = SA_ALLERGENS.map((a) => ({
        key: a,
        count: allergenMatrix.filter((r) => r.allergens.includes(a)).length,
        label: a.charAt(0).toUpperCase() + a.slice(1),
      })).sort((a, b) => b.count - a.count);

      // ── COST TRENDS ──────────────────────────────────────────────────────
      const costData = [...recipes]
        .filter((r) => r.cost_per_unit > 0)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(-12)
        .map((r) => ({
          name: r.name.length > 12 ? r.name.slice(0, 12) + "…" : r.name,
          cost: Number(r.cost_per_unit),
        }));

      // ── COLD CHAIN ───────────────────────────────────────────────────────
      const critBreaches = tempLogs.filter(
        (t) => t.is_breach && t.breach_severity === "critical",
      ).length;
      const warnBreaches = tempLogs.filter(
        (t) => t.is_breach && t.breach_severity === "warning",
      ).length;
      const coldHealthByLocation = coldLocs.map((loc) => {
        const locLogs = tempLogs.filter((t) => t.location_id === loc.id);
        const locBreaches = locLogs.filter((t) => t.is_breach).length;
        return {
          name: loc.name,
          type: loc.location_type,
          total: locLogs.length,
          breaches: locBreaches,
          pct:
            locLogs.length > 0
              ? Math.round(
                  ((locLogs.length - locBreaches) / locLogs.length) * 100,
                )
              : 100,
        };
      });

      // ── RECALL READINESS ─────────────────────────────────────────────────
      const openRecalls = recalls.filter(
        (r) => r.status === "open" || r.status === "active",
      );
      const closedRecalls = recalls.filter((r) => r.status === "closed");
      const drills = recalls.filter((r) => r.is_drill);
      const lastDrill = drills[0] || null;
      const daysSinceDrill = lastDrill
        ? Math.round((now - new Date(lastDrill.initiated_at)) / 86400000)
        : null;
      const recallScore = Math.min(
        100,
        (openRecalls.length === 0
          ? 40
          : Math.max(0, 40 - openRecalls.length * 20)) +
          (daysSinceDrill !== null
            ? daysSinceDrill <= 90
              ? 30
              : daysSinceDrill <= 180
                ? 15
                : 0
            : 0) +
          (certScore !== null ? Math.round(certScore * 0.3) : 0),
      );

      // ── WASTE ESTIMATE ───────────────────────────────────────────────────
      const runsWithData = runs.filter(
        (r) => r.planned_qty > 0 && r.actual_units !== null,
      );
      const avgYield =
        runsWithData.length > 0
          ? Math.round(
              runsWithData.reduce(
                (s, r) => s + (r.actual_units / r.planned_qty) * 100,
                0,
              ) / runsWithData.length,
            )
          : null;
      const wasteByRun = runsWithData.slice(0, 10).map((r) => ({
        id: r.id,
        planned: r.planned_qty,
        actual: r.actual_units,
        waste: r.planned_qty - r.actual_units,
        wastePct: Math.max(
          0,
          Math.round((1 - r.actual_units / r.planned_qty) * 100),
        ),
        date: r.created_at?.slice(0, 10) || "",
      }));

      setData({
        // KPI strip
        overallCompliance,
        recipeCount: recipes.length,
        haccpPass,
        certScore,
        coldScore,
        openNcrs: ncrs.filter((n) => n.status !== "closed").length,
        ccpCount: ccps.length,
        // Panel data
        allergenMatrix,
        allergenCounts,
        costData,
        coldChain: {
          critBreaches,
          warnBreaches,
          coldHealthByLocation,
          totalReadings: tempLogs.length,
        },
        recalls: {
          openRecalls,
          closedRecalls,
          drills,
          lastDrill,
          daysSinceDrill,
          recallScore,
        },
        waste: { avgYield, wasteByRun, totalRuns: runsWithData.length },
        // For AI brief
        expiredCerts: expiredCerts.length,
        expiringSoonCerts: expiringSoonCerts.length,
        totalCerts: certs.length,
        haccpLogCount: haccpLogs.length,
        openNcrCount: ncrs.filter((n) => n.status !== "closed").length,
      });
    } catch (err) {
      console.error("HQFoodIntelligence fetch error:", err);
      setFetchError(
        "Failed to load intelligence data. Check console for details.",
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── AI INSIGHTS ────────────────────────────────────────────────────────────
  async function fetchAiInsight() {
    if (!data) return;
    setAiLoading(true);
    setAiInsight("");
    try {
      const prompt = `You are a food safety and manufacturing compliance expert reviewing a South African food production operation regulated under R638 and FSCA requirements.

LIVE OPERATIONAL DATA:
- Overall Compliance Score: ${data.overallCompliance}%
- HACCP pass rate: ${data.haccpPass !== null ? data.haccpPass + "%" : "No log data"}  (${data.haccpLogCount} log entries analysed, ${data.ccpCount} CCPs registered)
- Certificate validity: ${data.certScore !== null ? data.certScore + "%" : "No cert data"} — ${data.expiredCerts} expired, ${data.expiringSoonCerts} expiring within 30 days (${data.totalCerts} total)
- Cold chain health: ${data.coldScore !== null ? data.coldScore + "%" : "No readings"} — ${data.coldChain.critBreaches} critical breaches, ${data.coldChain.warnBreaches} warnings in recent readings
- Open HACCP NCRs (non-conformances): ${data.openNcrCount}
- Recall readiness score: ${data.recalls.recallScore}%
- Open recalls: ${data.recalls.openRecalls.length}
- Last mock drill: ${data.recalls.daysSinceDrill !== null ? data.recalls.daysSinceDrill + " days ago" : "No drill on record"}
- Average production yield: ${data.waste.avgYield !== null ? data.waste.avgYield + "%" : "No data"} across ${data.waste.totalRuns} runs
- Active recipes: ${data.recipeCount}

Write a concise, practical 3-paragraph Food & Beverage intelligence brief for the operations manager.
Paragraph 1 (2-3 sentences): Overall health assessment — honest, specific to the numbers.
Paragraph 2 (2-3 sentences): Top risks requiring attention — reference actual data points.
Paragraph 3 (1-2 sentences): One or two recommended next actions — concrete and actionable.
Use plain language. No markdown formatting, no bullet points, no headers. Just clean prose.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const json = await response.json();
      const text =
        json.content?.find((b) => b.type === "text")?.text ||
        "Unable to generate insight at this time.";
      setAiInsight(text);
    } catch (err) {
      setAiInsight(
        "Unable to load AI insight. Check your connection and try again.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  // ── RENDER STATES ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{ padding: 40, textAlign: "center", ...T.body, color: T.ink500 }}
      >
        Loading Food Intelligence…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 8,
            padding: "16px 20px",
            ...T.body,
            color: T.danger,
          }}
        >
          {fetchError}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{ padding: 40, textAlign: "center", ...T.body, color: T.ink500 }}
      >
        No food & beverage data found. Ensure the F&amp;B module migrations have
        been run.
      </div>
    );
  }

  const complianceVariant =
    data.overallCompliance >= 85
      ? "success"
      : data.overallCompliance >= 65
        ? "warning"
        : "danger";

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: "24px 28px",
        fontFamily: "Inter, sans-serif",
        background: T.ink050,
        minHeight: "100vh",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ ...T.title, color: T.ink900 }}>Food Intelligence</div>
          <div style={{ ...T.caption, color: T.ink500, marginTop: 3 }}>
            Aggregated view across S1–S7 · Refreshed{" "}
            {new Date().toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={fetchAll}
            style={{
              ...T.body,
              background: "#fff",
              border: `1px solid ${T.ink150}`,
              borderRadius: 6,
              padding: "8px 14px",
              cursor: "pointer",
              color: T.ink700,
            }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={fetchAiInsight}
            disabled={aiLoading}
            style={{
              ...T.body,
              background: T.accent,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: aiLoading ? "wait" : "pointer",
              opacity: aiLoading ? 0.75 : 1,
            }}
          >
            {aiLoading ? "⟳ Analysing…" : "✦ AI Insights"}
          </button>
        </div>
      </div>

      {/* ── AI INSIGHT PANEL ── */}
      {(aiInsight || aiLoading) && (
        <div
          style={{
            background: T.accentLit,
            border: `1px solid ${T.accentBd}`,
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 24,
          }}
        >
          <div style={{ ...T.label, color: T.accentMid, marginBottom: 8 }}>
            ✦ AI Intelligence Brief
          </div>
          {aiLoading ? (
            <div style={{ ...T.body, color: T.ink500 }}>
              Generating analysis from live data…
            </div>
          ) : (
            <div
              style={{
                ...T.body,
                color: T.ink700,
                lineHeight: 1.75,
                whiteSpace: "pre-line",
              }}
            >
              {aiInsight}
            </div>
          )}
        </div>
      )}

      {/* ── KPI STRIP ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1px",
          background: T.ink150,
          border: `1px solid ${T.ink150}`,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: T.shadow,
          marginBottom: 24,
        }}
      >
        <KpiTile
          label="Overall Compliance"
          value={`${data.overallCompliance}%`}
          sub="HACCP + certs + cold chain"
          variant={complianceVariant}
        />
        <KpiTile
          label="Active Recipes"
          value={data.recipeCount}
          sub="in ingredient library"
        />
        <KpiTile
          label="HACCP Pass Rate"
          value={data.haccpPass !== null ? `${data.haccpPass}%` : "—"}
          sub={`${data.haccpLogCount} log entries`}
          variant={
            data.haccpPass === null
              ? null
              : data.haccpPass >= 95
                ? "success"
                : data.haccpPass >= 80
                  ? "warning"
                  : "danger"
          }
        />
        <KpiTile
          label="Cold Chain Health"
          value={data.coldScore !== null ? `${data.coldScore}%` : "—"}
          sub={`${data.coldChain.critBreaches} critical breach${data.coldChain.critBreaches !== 1 ? "es" : ""}`}
          variant={
            data.coldScore === null
              ? null
              : data.coldScore >= 95
                ? "success"
                : data.coldScore >= 80
                  ? "warning"
                  : "danger"
          }
        />
        <KpiTile
          label="Recall Readiness"
          value={`${data.recalls.recallScore}%`}
          sub={
            data.recalls.openRecalls.length > 0
              ? `${data.recalls.openRecalls.length} open recall`
              : "No open recalls"
          }
          variant={
            data.recalls.recallScore >= 80
              ? "success"
              : data.recalls.recallScore >= 50
                ? "warning"
                : "danger"
          }
        />
        <KpiTile
          label="Open NCRs"
          value={data.openNcrs}
          sub="HACCP non-conformances"
          variant={
            data.openNcrs === 0
              ? "success"
              : data.openNcrs <= 3
                ? "warning"
                : "danger"
          }
        />
      </div>

      {/* ── DETAIL CARDS — 2-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ComplianceCard d={data} />
        <AllergenCard d={data} />
        <CostCard d={data} />
        <ColdChainCard d={data} />
        <RecallCard d={data} />
        <WasteCard d={data} />
      </div>
    </div>
  );
}
