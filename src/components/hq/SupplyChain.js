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
import { useSystemHealth } from "../../services/systemHealthContext";
import StockControl from "../StockControl";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink300: "#B0B0B0",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
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
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

export default function SupplyChain() {
  const { stats, loading: statsLoading } = useSystemHealth();
  const { inventory, purchaseOrders } = stats;
  const ctx = usePageContext("hq-supply-chain", null);

  return (
    <div style={{ fontFamily: T.fontUi }}>
      <WorkflowGuide
        context={ctx}
        tabId="hq-supply-chain"
        onAction={() => {}}
        defaultOpen={false}
      />
      {/* ── Header ── */}
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            fontFamily: T.fontUi,
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
          background: T.ink150,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
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

      {/* ── Out of stock alert ── */}
      {!statsLoading && inventory.outOfStock > 0 && (
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: "6px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <circle cx="8" cy="8" r="6" stroke={T.danger} strokeWidth="1.5" />
            <path
              d="M8 5v3M8 10.5v.5"
              stroke={T.danger}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: T.danger }}>
              {inventory.outOfStock} item{inventory.outOfStock !== 1 ? "s" : ""}{" "}
              out of stock
            </div>
            <div
              style={{
                fontSize: "12px",
                color: T.danger,
                opacity: 0.8,
                marginTop: 2,
              }}
            >
              {stats.alerts.outOfStockItems
                .slice(0, 3)
                .map((i) => i.name)
                .join(", ")}
              {stats.alerts.outOfStockItems.length > 3 &&
                ` +${stats.alerts.outOfStockItems.length - 3} more`}
            </div>
          </div>
        </div>
      )}

      {/* ── Supply Chain flow ── */}
      <div
        style={{
          background: T.ink075,
          border: `1px solid ${T.ink150}`,
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
          border: `1px solid ${T.ink150}`,
          borderRadius: "6px",
          padding: "24px",
          boxShadow: T.shadow,
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
        background: active ? T.accent : "#ffffff",
        color: active ? "#ffffff" : T.ink500,
        padding: "4px 12px",
        borderRadius: "3px",
        fontFamily: T.fontUi,
        fontSize: "11px",
        fontWeight: active ? 600 : 400,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        border: active ? "none" : `1px solid ${T.ink150}`,
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
          color: T.ink400,
          marginBottom: "6px",
          fontFamily: T.fontUi,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.fontData,
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
            fontFamily: T.fontUi,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
