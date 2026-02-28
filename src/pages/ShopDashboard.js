// src/pages/ShopDashboard.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SHOP DASHBOARD — Phase 2F
//
// Scoped admin dashboard for shop tenants. Shows only this shop's data.
// Tab structure: Overview, Inventory, Analytics, Settings
//
// This replaces AdminDashboard for shop admin users (non-HQ).
// HQ users still see the original AdminDashboard at /admin.
//
// Uses TenantProvider context for tenant_id scoping.
// Design: Cream aesthetic per Section 7 of handover.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useTenant } from "../services/tenantService";

// Shop sub-components
import ShopOverview from "../components/shop/ShopOverview";
import ShopInventory from "../components/shop/ShopInventory";
import ShopAnalytics from "../components/shop/ShopAnalytics";
import ShopSettings from "../components/shop/ShopSettings";

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
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

function TabBtn({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.primaryDark : "transparent",
        color: active ? C.white : C.primaryDark,
        border: "none",
        borderBottom: active
          ? `3px solid ${C.accentGreen}`
          : "3px solid transparent",
        borderRadius: 0,
        padding: "12px 20px",
        cursor: "pointer",
        fontFamily: FONTS.body,
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function ShopDashboard() {
  const { tenant, tenantName, loading: tenantLoading } = useTenant();
  const [tab, setTab] = useState("overview");

  if (tenantLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          fontFamily: FONTS.body,
          color: C.primaryDark,
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: `3px solid ${C.border}`,
            borderTopColor: C.primaryDark,
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes protea-spin { to { transform: rotate(360deg); } }`}</style>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          Loading shop…
        </span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* ── Dashboard Header ─── */}
      <div
        style={{
          background: C.primaryDark,
          padding: "20px 32px",
          borderRadius: "2px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{
              color: C.accentGreen,
              fontSize: "11px",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Shop Dashboard
          </span>
          <h1
            style={{
              color: C.white,
              fontFamily: FONTS.heading,
              fontSize: "24px",
              margin: "4px 0 0",
              fontWeight: 300,
            }}
          >
            {tenantName || "Your Shop"}
          </h1>
        </div>

        {/* Tenant badge */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {tenant?.branding?.logo_url && (
            <img
              src={tenant.branding.logo_url}
              alt="Logo"
              style={{
                width: "28px",
                height: "28px",
                objectFit: "contain",
                borderRadius: "2px",
              }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
          <span
            style={{
              background: "rgba(181,147,90,0.2)",
              color: C.gold,
              padding: "3px 10px",
              borderRadius: "2px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Shop
          </span>
        </div>
      </div>

      {/* ── Tab Navigation ─── */}
      <div
        style={{
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          gap: "0",
          overflowX: "auto",
          marginBottom: "24px",
          borderRadius: "2px",
        }}
      >
        <TabBtn
          active={tab === "overview"}
          label="Overview"
          onClick={() => setTab("overview")}
        />
        <TabBtn
          active={tab === "inventory"}
          label="Inventory"
          onClick={() => setTab("inventory")}
        />
        <TabBtn
          active={tab === "analytics"}
          label="Analytics"
          onClick={() => setTab("analytics")}
        />
        <TabBtn
          active={tab === "settings"}
          label="Settings"
          onClick={() => setTab("settings")}
        />
      </div>

      {/* ── Tab Content ─── */}
      <div>
        {tab === "overview" && <ShopOverview />}
        {tab === "inventory" && <ShopInventory />}
        {tab === "analytics" && <ShopAnalytics />}
        {tab === "settings" && <ShopSettings />}
      </div>
    </div>
  );
}
