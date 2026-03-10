// src/components/hq/SupplyChain.js — Protea Botanicals v2.0
// ─────────────────────────────────────────────────────────────────────────────
// SUPPLY CHAIN TAB — WP-K update
//
// v2.0: Consumes SystemHealthContext — stats now come from the shared live
//       data layer instead of independent fetch. Stats guaranteed consistent
//       with Overview, Analytics, Production at all times.
//       Realtime: any DB change auto-refreshes stats across all tabs.
// v1.0: Initial HQ Supply Chain wrapper around StockControl
//
// Architecture: Thin wrapper that imports StockControl and adds
// HQ-specific context (header, summary stats, cross-tenant future).
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useSystemHealth } from "../../services/systemHealthContext";
import StockControl from "../StockControl";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  bg: "#faf9f6",
  warmBg: "#f4f0e8",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#888888",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
  blue: "#2c4a6e",
};

export default function SupplyChain() {
  // ── Consume shared live stats — no independent fetch needed ───────────
  const { stats, loading: statsLoading } = useSystemHealth();
  const { inventory, purchaseOrders } = stats;

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "22px",
              fontWeight: 300,
              color: C.primaryDark,
              margin: 0,
            }}
          >
            Supply Chain Management
          </h2>
          <span
            style={{
              background: "rgba(82,183,136,0.15)",
              color: C.accentGreen,
              padding: "2px 8px",
              borderRadius: "2px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Phase 2C
          </span>
        </div>
        <p
          style={{
            color: C.muted,
            fontSize: "13px",
            fontWeight: 300,
            margin: 0,
          }}
        >
          Inventory, suppliers, purchase orders & stock movements — all from HQ.
        </p>
      </div>

      {/* ── Summary Stats Bar — from SystemHealthContext ────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <MiniStat
          label="Active SKUs"
          value={statsLoading ? "—" : inventory.totalActive}
          color={C.accentGreen}
        />
        <MiniStat
          label="Low Stock"
          value={statsLoading ? "—" : inventory.lowStock}
          color={inventory.lowStock > 0 ? C.gold : C.accentGreen}
          alert={inventory.lowStock > 0}
          subtext={
            inventory.outOfStock > 0
              ? `${inventory.outOfStock} out of stock`
              : null
          }
        />
        <MiniStat
          label="Open POs"
          value={statsLoading ? "—" : purchaseOrders.open}
          color={C.blue}
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
          color={C.primaryDark}
          subtext={
            inventory.stockCost > 0
              ? `Cost: R${(inventory.stockCost / 1000).toFixed(0)}k`
              : null
          }
        />
      </div>

      {/* ── Out of stock alert banner ───────────────────────────────── */}
      {!statsLoading && inventory.outOfStock > 0 && (
        <div
          style={{
            background: "#fdf0ef",
            border: `1px solid ${C.red}30`,
            borderLeft: `3px solid ${C.red}`,
            borderRadius: "2px",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
          }}
        >
          <span style={{ color: C.red, fontWeight: 700 }}>
            ● {inventory.outOfStock} items out of stock
          </span>
          <span style={{ color: C.muted }}>
            {stats.alerts.outOfStockItems
              .slice(0, 3)
              .map((i) => i.name)
              .join(", ")}
            {stats.alerts.outOfStockItems.length > 3 &&
              ` +${stats.alerts.outOfStockItems.length - 3} more`}
          </span>
        </div>
      )}

      {/* ── Supply Chain Flow Visual ────────────────────────────────── */}
      <div
        style={{
          background: C.warmBg,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          padding: "12px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "11px",
          color: C.muted,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          flexWrap: "wrap",
        }}
      >
        <FlowStep label="★ Procure" active />
        <Arrow />
        <FlowStep label="★ Receive & Store" active />
        <Arrow />
        <FlowStep label="Produce (Production tab)" />
        <Arrow />
        <FlowStep label="Distribute (Phase 2D)" />
        <Arrow />
        <FlowStep label="★ Customer Scans" active />
      </div>

      {/* ── StockControl Module (full existing functionality) ───────── */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          padding: "24px",
        }}
      >
        <StockControl />
      </div>
    </div>
  );
}

// ── Flow step pill ─────────────────────────────────────────────────────
function FlowStep({ label, active = false }) {
  return (
    <span
      style={{
        background: active ? "#52b788" : "#f4f0e8",
        color: active ? "#ffffff" : "#888888",
        padding: "4px 12px",
        borderRadius: "2px",
        fontWeight: active ? 700 : 400,
        border: active ? "none" : "1px dashed #e8e0d4",
      }}
    >
      {label}
    </span>
  );
}

function Arrow() {
  return <span style={{ color: "#e8e0d4", fontSize: "16px" }}>→</span>;
}

// ── Mini stat card ─────────────────────────────────────────────────────
function MiniStat({ label, value, color, alert = false, subtext = null }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${alert ? "#b5935a" : "#e8e0d4"}`,
        borderTop: `3px solid ${color}`,
        borderRadius: "2px",
        padding: "12px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#888888",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "28px",
          fontWeight: 300,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subtext && (
        <div
          style={{
            fontSize: "10px",
            color: "#888888",
            marginTop: "4px",
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
