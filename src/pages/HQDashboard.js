// src/pages/HQDashboard.js — Protea Botanicals v3.3
// v3.3: WP-K — SystemHealthProvider wraps all tabs (shared live data layer)
// v3.2: WP-I — Documents tab added (14th tab, HQDocuments.js)
// v3.1: WP-H — pass onNavigate to HQOverview (ERP quick-action tiles)
// v3.0: Reorder & Scoring tab (WP-F+G)
// v2.9: P&L tab (WP-E)

import { useState } from "react";
import { useTenant } from "../services/tenantService";
import { SystemHealthProvider } from "../services/systemHealthContext";

import HQOverview from "../components/hq/HQOverview";
import ShopManager from "../components/hq/ShopManager";
import SupplyChain from "../components/hq/SupplyChain";
import HQProduction from "../components/hq/HQProduction";
import Distribution from "../components/hq/Distribution";
import HQAnalytics from "../components/hq/HQAnalytics";
import RetailerHealth from "../components/hq/RetailerHealth";
import HQSuppliers from "../components/hq/HQSuppliers";
import HQPurchaseOrders from "../components/hq/HQPurchaseOrders";
import HQCogs from "../components/hq/HQCogs";
import HQPricing from "../components/hq/HQPricing";
import HQProfitLoss from "../components/hq/HQProfitLoss";
import HQReorderScoring from "../components/hq/HQReorderScoring";
import HQDocuments from "../components/hq/HQDocuments";

const C = {
  primaryDark: "#1b4332",
  accentGreen: "#52b788",
  text: "#1a1a1a",
  muted: "#888888",
  border: "#e8e0d4",
  white: "#ffffff",
};

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "supply-chain", label: "Supply Chain", icon: "📦" },
  { id: "production", label: "Production", icon: "🔧" },
  { id: "distribution", label: "Distribution", icon: "🚚" },
  { id: "shops", label: "Shops", icon: "🏪" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "retailer-health", label: "Retailer Health", icon: "🏆" },
  { id: "suppliers", label: "Suppliers", icon: "🌍" },
  { id: "procurement", label: "Procurement", icon: "🛒" },
  { id: "costing", label: "Costing", icon: "🧮" },
  { id: "pricing", label: "Pricing", icon: "💰" },
  { id: "pl", label: "P&L", icon: "📉" },
  { id: "reorder", label: "Reorder", icon: "🔔" },
  { id: "documents", label: "Documents", icon: "📄" },
];

export default function HQDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { tenant, allTenants, tenantName, isHQ, switchTenant } = useTenant();

  return (
    // ── SystemHealthProvider wraps ALL tabs ──
    // Every child component can now call useSystemHealth() to get
    // live, consistent stats without independent fetches.
    // Realtime subscriptions auto-refresh all stats on any DB change.
    <SystemHealthProvider>
      <div style={{ fontFamily: "Jost, sans-serif", color: C.text }}>
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "28px",
                  fontWeight: 300,
                  color: C.primaryDark,
                  margin: 0,
                }}
              >
                HQ Command Centre
              </h1>
              <span
                style={{
                  background: "rgba(82,183,136,0.15)",
                  color: C.accentGreen,
                  padding: "3px 10px",
                  borderRadius: "2px",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                All Tabs Live
              </span>
            </div>
            {isHQ && allTenants.length > 1 && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: C.muted,
                  }}
                >
                  Viewing:
                </span>
                <select
                  value={tenant?.id || ""}
                  onChange={(e) => {
                    const s = allTenants.find((t) => t.id === e.target.value);
                    if (s) switchTenant(s);
                  }}
                  style={{
                    padding: "6px 10px",
                    border: `1px solid ${C.border}`,
                    borderRadius: "2px",
                    fontFamily: "Jost, sans-serif",
                    fontSize: "12px",
                    color: C.text,
                    background: C.white,
                    cursor: "pointer",
                  }}
                >
                  {allTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p
            style={{
              color: C.muted,
              fontSize: "13px",
              fontWeight: 300,
              margin: 0,
            }}
          >
            {tenantName || "Protea Botanicals HQ"} — {allTenants.length} tenant
            {allTenants.length !== 1 ? "s" : ""} registered
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "4px",
            borderBottom: `1px solid ${C.border}`,
            marginBottom: "28px",
            overflowX: "auto",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? C.white : "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? `2px solid ${C.primaryDark}`
                    : "2px solid transparent",
                padding: "12px 20px",
                fontFamily: "Jost, sans-serif",
                fontSize: "11px",
                fontWeight: activeTab === tab.id ? 600 : 400,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: activeTab === tab.id ? C.primaryDark : C.muted,
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "14px" }}>{tab.icon}</span>
              {tab.label}
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: C.accentGreen,
                  display: "inline-block",
                }}
              />
            </button>
          ))}
        </div>

        <div>
          {activeTab === "overview" && (
            <HQOverview onNavigate={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === "supply-chain" && <SupplyChain />}
          {activeTab === "production" && <HQProduction />}
          {activeTab === "distribution" && <Distribution />}
          {activeTab === "shops" && <ShopManager />}
          {activeTab === "analytics" && <HQAnalytics />}
          {activeTab === "retailer-health" && <RetailerHealth />}
          {activeTab === "suppliers" && <HQSuppliers />}
          {activeTab === "procurement" && <HQPurchaseOrders />}
          {activeTab === "costing" && <HQCogs />}
          {activeTab === "pricing" && <HQPricing />}
          {activeTab === "pl" && <HQProfitLoss />}
          {activeTab === "reorder" && (
            <HQReorderScoring onNavigate={(tab) => setActiveTab(tab)} />
          )}
          {activeTab === "documents" && <HQDocuments />}
        </div>
      </div>
    </SystemHealthProvider>
  );
}
