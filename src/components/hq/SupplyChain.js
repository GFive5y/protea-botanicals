// src/components/hq/SupplyChain.js — v3.1 — WP-THEME-2: Inter font + WorkflowGuide + usePageContext
// v3.0 — WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond
//   - DM Mono for metric values
//   - Coloured top borders removed from stat cards
//   - Star emoji removed from flow steps
//   - "Phase 2C" badge removed (sidebar provides context)
//   - Out-of-stock alert uses standard danger template
// v2.0: SystemHealthContext — shared live data layer

import React from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useSystemHealth } from "../../services/systemHealthContext";
import StockControl from "../StockControl";
import { usePageContext } from "../../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "../viz";
import ActionCentre from "../shared/ActionCentre";
import { T } from "../../styles/tokens";

// Design tokens: imported from ../../styles/tokens

export default function SupplyChain() {
  const { stats, loading: statsLoading } = useSystemHealth();
  const { inventory, purchaseOrders } = stats;
  const ctx = usePageContext("hq-supply-chain", null);

  // Build ActionCentre alerts: out-of-stock items (critical) + ctx.warnings (warn)
  const outOfStockItems = stats?.alerts?.outOfStockItems || [];
  const stockAlerts = !statsLoading
    ? outOfStockItems.map((i) => ({
        severity: "critical",
        message: `${i.name || "Unnamed"} — out of stock`,
      }))
    : [];
  const ctxAlerts =
    ctx && !ctx.loading
      ? (ctx.warnings || []).map((w) => ({
          severity: "warn",
          message: String(w).replace(/^⚠\s*/, ""),
        }))
      : [];
  const allAlerts = [...stockAlerts, ...ctxAlerts];

  return (
    <div style={{ fontFamily: T.font }}>
      {/* WorkflowGuide hidden on this tab: ctx.warnings folded into ActionCentre below */}
      {allAlerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <ActionCentre title="Supply Chain Alerts" alerts={allAlerts} />
        </div>
      )}
      {/* ── Header ── */}
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            fontFamily: T.font,
            fontSize: "22px",
            fontWeight: 300,
            color: T.ink900,
            margin: "0 0 4px",
          }}
        >
          Supply Chain Management
        </h2>
        <p
          style={{
            color: T.ink500,
            fontSize: "13px",
            fontWeight: 400,
            margin: 0,
          }}
        >
          Inventory, suppliers, purchase orders & stock movements — all from HQ.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px",
          background: T.border,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          marginBottom: "20px",
        }}
      >
        <MiniStat
          label="Active SKUs"
          value={statsLoading ? "—" : inventory.totalActive}
          semantic="success"
        />
        <MiniStat
          label="Low Stock"
          value={statsLoading ? "—" : inventory.lowStock}
          semantic={inventory.lowStock > 0 ? "warning" : "success"}
          subtext={
            inventory.outOfStock > 0
              ? `${inventory.outOfStock} out of stock`
              : null
          }
        />
        <MiniStat
          label="Open POs"
          value={statsLoading ? "—" : purchaseOrders.open}
          semantic="info"
          subtext={
            purchaseOrders.inTransit > 0
              ? `${purchaseOrders.inTransit} in transit`
              : null
          }
        />
        <MiniStat
          label="Stock Value"
          value={
            statsLoading
              ? "—"
              : `R${(inventory.stockValueSell / 1000).toFixed(0)}k`
          }
          semantic={null}
          subtext={
            inventory.stockCost > 0
              ? `Cost: R${(inventory.stockCost / 1000).toFixed(0)}k`
              : null
          }
        />
      </div>

      {/* ── CHARTS: Inventory health + PO pipeline ── */}
      {!statsLoading &&
        (() => {
          const inv = inventory;
          const normal = Math.max(
            0,
            inv.totalActive - inv.lowStock - inv.outOfStock,
          );
          const healthData = [
            { name: "Healthy", value: normal },
            { name: "Low Stock", value: inv.lowStock },
            { name: "Out of Stock", value: inv.outOfStock },
          ].filter((d) => d.value > 0);
          const HEALTH_COLOURS = [T.success, T.warning, T.danger];

          const po = stats.purchaseOrders;
          const poData = [
            { name: "Open", value: po.open - po.inTransit },
            { name: "In Transit", value: po.inTransit },
            { name: "Completed", value: po.completed || 0 },
          ].filter((d) => d.value > 0);
          const PO_COLOURS = [T.info, T.warning, T.accentMid];

          if (inv.totalActive === 0 && po.open === 0) return null;
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <ChartCard title="Inventory Health" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      dataKey="value"
                      paddingAngle={4}
                      isAnimationActive={false}
                    >
                      {healthData.map((_, i) => (
                        <Cell key={i} fill={HEALTH_COLOURS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip formatter={(v) => `${v} SKUs`} />}
                    />
                    <Legend
                      iconSize={8}
                      iconType="square"
                      formatter={(v) => (
                        <span
                          style={{
                            fontSize: 11,
                            color: T.ink500,
                            fontFamily: T.font,
                          }}
                        >
                          {v}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Purchase Order Pipeline" height={200}>
                {poData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={poData}
                      margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid
                        horizontal
                        vertical={false}
                        stroke={T.border}
                        strokeWidth={0.5}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: T.ink500,
                          fontSize: 10,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        dy={6}
                      />
                      <YAxis
                        tick={{
                          fill: T.ink500,
                          fontSize: 10,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={
                          <ChartTooltip
                            formatter={(v) => `${v} PO${v !== 1 ? "s" : ""}`}
                          />
                        }
                      />
                      <Bar
                        dataKey="value"
                        name="POs"
                        isAnimationActive={false}
                        maxBarSize={40}
                        radius={[3, 3, 0, 0]}
                      >
                        {poData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PO_COLOURS[i % PO_COLOURS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    No purchase orders yet
                  </div>
                )}
              </ChartCard>
            </div>
          );
        })()}

      {/* ── Supply Chain flow ── */}
      <div
        style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: "6px",
          padding: "12px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <FlowStep label="Procure" active />
        <Arrow />
        <FlowStep label="Receive & Store" active />
        <Arrow />
        <FlowStep label="Produce" />
        <Arrow />
        <FlowStep label="Distribute" />
        <Arrow />
        <FlowStep label="Customer Scans" active />
      </div>

      {/* ── StockControl ── */}
      <div
        style={{
          background: "#ffffff",
          border: `1px solid ${T.border}`,
          borderRadius: "6px",
          padding: "24px",
          boxShadow: T.shadow.sm,
        }}
      >
        <StockControl />
      </div>
    </div>
  );
}

function FlowStep({ label, active = false }) {
  return (
    <span
      style={{
        background: active ? T.accentLight : "#ffffff",
        color: active ? T.accent : T.ink500,
        padding: "4px 12px",
        borderRadius: "3px",
        fontFamily: T.font,
        fontSize: "11px",
        fontWeight: active ? 700 : 400,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        border: `1px solid ${active ? T.accentBd : T.border}`,
      }}
    >
      {label}
    </span>
  );
}

function Arrow() {
  return <span style={{ color: T.ink300, fontSize: "14px" }}>→</span>;
}

const SEMANTIC = {
  success: { text: "#166534" },
  warning: { text: "#92400E" },
  danger: { text: "#991B1B" },
  info: { text: "#1E3A5F" },
};

function MiniStat({ label, value, semantic, subtext }) {
  const color = semantic ? SEMANTIC[semantic].text : T.ink700;
  return (
    <div style={{ background: "#ffffff", padding: "16px 18px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink500,
          marginBottom: "6px",
          fontFamily: T.font,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.font,
          fontSize: "26px",
          fontWeight: 400,
          color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {subtext && (
        <div
          style={{
            fontSize: "11px",
            color: T.ink500,
            marginTop: "4px",
            fontFamily: T.font,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
