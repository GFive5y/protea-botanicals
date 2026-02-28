// src/components/hq/SupplyChain.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SUPPLY CHAIN TAB — Phase 2C
//
// Purpose: Integrates the existing StockControl.js module into the HQ
// Command Centre. This provides HQ users with full access to:
//   - Inventory overview (stock value, low stock alerts, category breakdown)
//   - Inventory items CRUD (add, edit, deactivate)
//   - Stock movements (record in/out, view history)
//   - Purchase orders (create PO, track status, auto-receive stock)
//   - Suppliers (add, edit, view)
//
// Architecture: This is a thin wrapper that imports StockControl and adds
// HQ-specific context (header, summary stats, future: cross-tenant view).
//
// Design: Cream aesthetic (Section 7 of handover).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
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
  const [summaryStats, setSummaryStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Fetch high-level supply chain stats for header ──────────────────
  useEffect(() => {
    async function fetchSummary() {
      setLoadingStats(true);
      try {
        let totalItems = 0,
          lowStockCount = 0,
          openPOs = 0,
          supplierCount = 0;

        // Total active items
        try {
          const r = await supabase
            .from("inventory_items")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true);
          totalItems = r.count || 0;
        } catch (e) {
          console.warn("[SupplyChain] items count:", e.message);
        }

        // Low stock count (quantity_on_hand below reorder_level)
        try {
          const r = await supabase
            .from("inventory_items")
            .select("id, quantity_on_hand, reorder_level")
            .eq("is_active", true)
            .gt("reorder_level", 0);
          if (r.data) {
            lowStockCount = r.data.filter(
              (i) => i.quantity_on_hand <= i.reorder_level,
            ).length;
          }
        } catch (e) {
          console.warn("[SupplyChain] low stock:", e.message);
        }

        // Open purchase orders
        try {
          const r = await supabase
            .from("purchase_orders")
            .select("id", { count: "exact", head: true })
            .not("status", "in", '("received","cancelled")');
          openPOs = r.count || 0;
        } catch (e) {
          console.warn("[SupplyChain] open POs:", e.message);
        }

        // Active suppliers
        try {
          const r = await supabase
            .from("suppliers")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true);
          supplierCount = r.count || 0;
        } catch (e) {
          console.warn("[SupplyChain] suppliers:", e.message);
        }

        setSummaryStats({ totalItems, lowStockCount, openPOs, supplierCount });
      } catch (err) {
        console.error("[SupplyChain] Summary fetch error:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchSummary();
  }, []);

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

      {/* ── Summary Stats Bar ───────────────────────────────────────── */}
      {!loadingStats && summaryStats && (
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
            value={summaryStats.totalItems}
            color={C.accentGreen}
          />
          <MiniStat
            label="Low Stock"
            value={summaryStats.lowStockCount}
            color={summaryStats.lowStockCount > 0 ? C.gold : C.accentGreen}
            alert={summaryStats.lowStockCount > 0}
          />
          <MiniStat
            label="Open POs"
            value={summaryStats.openPOs}
            color={C.blue}
          />
          <MiniStat
            label="Suppliers"
            value={summaryStats.supplierCount}
            color={C.primaryDark}
          />
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
        <span
          style={{
            background: C.accentGreen,
            color: C.white,
            padding: "4px 12px",
            borderRadius: "2px",
            fontWeight: 700,
          }}
        >
          ★ Procure
        </span>
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <span
          style={{
            background: C.accentGreen,
            color: C.white,
            padding: "4px 12px",
            borderRadius: "2px",
            fontWeight: 700,
          }}
        >
          ★ Receive & Store
        </span>
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <span
          style={{
            background: C.warmBg,
            color: C.muted,
            padding: "4px 12px",
            borderRadius: "2px",
            border: `1px dashed ${C.border}`,
          }}
        >
          Produce (Production tab)
        </span>
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <span
          style={{
            background: C.warmBg,
            color: C.muted,
            padding: "4px 12px",
            borderRadius: "2px",
            border: `1px dashed ${C.border}`,
          }}
        >
          Distribute (Phase 2D)
        </span>
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <span
          style={{
            background: C.accentGreen,
            color: C.white,
            padding: "4px 12px",
            borderRadius: "2px",
            fontWeight: 700,
          }}
        >
          ★ Customer Scans
        </span>
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

// ── Mini stat card for summary bar ──────────────────────────────────────
function MiniStat({ label, value, color, alert = false }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${alert ? C.gold : C.border}`,
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
          color: C.muted,
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
    </div>
  );
}
