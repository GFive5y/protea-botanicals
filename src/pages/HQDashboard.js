// src/pages/HQDashboard.js v4.1
// WP-Z: PlatformBar replaces AlertsBar — wired below LiveFXBar
// ★ v4.0: WP-NAV Sub-B
//   - useLocation + useEffect: reads ?tab= query param → syncs activeTab
//   - Header simplified — h1 + "All Tabs Live" badge removed, sidebar provides context
//   - Horizontal tab bar removed — sidebar handles all tab routing
//   - Tenant switcher retained in header
// v3.8: WP-X — LiveFXBar injected above tab content on every tab
// v3.7: Removed "Production" tab — "HQ Production" is the canonical tab
// v3.6: Tab 3 now renders HQProduction
// v3.5: WP-8 Fraud tab added (17th tab)
// v3.4: Loyalty tab added (WP-O)
// v3.3: All ERP tabs — procurement, costing, pricing, p&l, reorder, documents
// v3.1: Supply Chain + Production + Distribution + Shops

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTenant } from "../services/tenantService";

// ── Phase 2B ──────────────────────────────────────────────────────────────────
import HQOverview from "../components/hq/HQOverview";
import ShopManager from "../components/hq/ShopManager";

// ── Phase 2C ──────────────────────────────────────────────────────────────────
import SupplyChain from "../components/hq/SupplyChain";

// ── Phase 2D ──────────────────────────────────────────────────────────────────
import Distribution from "../components/hq/Distribution";

// ── Phase 2E ──────────────────────────────────────────────────────────────────
import HQAnalytics from "../components/hq/HQAnalytics";

// ── Phase 2F ──────────────────────────────────────────────────────────────────
import RetailerHealth from "../components/hq/RetailerHealth";

// ── Import ERP (WP-A through WP-H) ───────────────────────────────────────────
import HQSuppliers from "../components/hq/HQSuppliers";
import HQPurchaseOrders from "../components/hq/HQPurchaseOrders";
import HQCogs from "../components/hq/HQCogs";
import HQPricing from "../components/hq/HQPricing";
import HQProfitLoss from "../components/hq/HQProfitLoss";
import HQReorderScoring from "../components/hq/HQReorderScoring";
import HQDocuments from "../components/hq/HQDocuments";
import HQMedical from "../components/hq/HQMedical";
import HQWholesaleOrders from "../components/hq/HQWholesaleOrders";
import HQProduction from "../components/hq/HQProduction";
import HQStock from "../components/hq/HQStock";
import HQTransfer from "../components/hq/HQTransfer";
import HQFoodIngredients from "../components/hq/HQFoodIngredients";
import HQRecipeEngine from "../components/hq/HQRecipeEngine";
import HQHaccp from "../components/hq/HQHaccp";
import HQFoodSafety from "../components/hq/HQFoodSafety";

// ── WP-O ─────────────────────────────────────────────────────────────────────
import HQLoyalty from "../components/hq/HQLoyalty";

// ── WP-8 ─────────────────────────────────────────────────────────────────────
import HQFraud from "../components/hq/HQFraud";
import HQInvoices from "../components/hq/HQInvoices";
import HQTenants from "../components/hq/HQTenants";

// ── WP-X: Live FX Bar (untouched — permanent) ────────────────────────────────
import LiveFXBar from "../components/hq/LiveFXBar";

// ── WP-Z: Platform Intelligence Bar ──────────────────────────────────────────
import PlatformBar from "../components/PlatformBar";
import { PlatformBarProvider } from "../contexts/PlatformBarContext";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#faf9f6",
  warmBg: "#f4f0e8",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#474747",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c62828",
};

const TABS = [
  // Operations
  { id: "overview", label: "Overview", icon: "📊", ready: true },
  { id: "supply-chain", label: "Supply Chain", icon: "📦", ready: true },
  { id: "suppliers", label: "Suppliers", icon: "🌍", ready: true },
  { id: "procurement", label: "Procurement", icon: "🛒", ready: true },
  { id: "invoices", label: "Invoices", icon: "🧾", ready: true },
  { id: "tenants", label: "Tenants", icon: "🏢", ready: true },
  { id: "hq-production", label: "Production", icon: "⚗️", ready: true },
  { id: "hq-stock", label: "HQ Stock", icon: "=", ready: true },
  { id: "hq-transfers", label: "Transfers", icon: "=", ready: true },
  { id: "hq-ingredients", label: "Ingredients", icon: "=", ready: true },
  { id: "hq-recipes", label: "Recipes", icon: "=", ready: true },
  { id: "hq-haccp", label: "HACCP", icon: "=", ready: true },
  { id: "hq-food-safety", label: "Food Safety", icon: "=", ready: true },
  { id: "distribution", label: "Distribution", icon: "🚚", ready: true },
  // Finance
  { id: "pricing", label: "Pricing", icon: "💲", ready: true },
  { id: "costing", label: "Costing", icon: "🧮", ready: true },
  { id: "pl", label: "P&L", icon: "📉", ready: true },
  // Intelligence
  { id: "analytics", label: "Analytics", icon: "📈", ready: true },
  { id: "retailer-health", label: "Retailer Health", icon: "🏆", ready: true },
  { id: "reorder", label: "Reorder", icon: "🔔", ready: true },
  // Platform
  { id: "loyalty", label: "Loyalty", icon: "💎", ready: true },
  {
    id: "fraud",
    label: "Fraud & Security",
    icon: "🛡️",
    ready: true,
    alert: true,
  },
  { id: "documents", label: "Documents", icon: "📄", ready: true },
  { id: "medical", label: "Medical", ready: true },
  { id: "wholesale-orders", label: "Wholesale Orders", ready: true },
  // People
  { id: "shops", label: "Shops", icon: "🏪", ready: true },
];

export default function HQDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { tenant, allTenants, tenantName, isHQ, switchTenant } = useTenant();
  const location = useLocation();

  // ★ v4.0: sync ?tab= query param from sidebar navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && TABS.find((t) => t.id === tab)) {
      setActiveTab(tab);
    } else if (!tab && location.pathname === "/hq") {
      setActiveTab("overview");
    }
  }, [location.search, location.pathname]);

  const handleNavigate = (tabId) => {
    if (TABS.find((t) => t.id === tabId)) setActiveTab(tabId);
  };

  return (
    <PlatformBarProvider>
      <div style={{ fontFamily: "Jost, sans-serif", color: C.text }}>
        {/* ── Header — simplified, sidebar provides tier/role context ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Outfit', 'Helvetica Neue', Arial, sans-serif",
                fontSize: "24px",
                fontWeight: 300,
                color: C.primaryDark,
                margin: "0 0 2px",
              }}
            >
              HQ Command Centre
            </h1>
            <p
              style={{
                color: C.muted,
                fontSize: "13px",
                fontWeight: 300,
                margin: 0,
              }}
            >
              {tenantName || "Protea Botanicals HQ"} — {allTenants.length}{" "}
              tenant
              {allTenants.length !== 1 ? "s" : ""} registered
            </p>
          </div>

          {/* Tenant Switcher — retained */}
          {isHQ && allTenants.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  const selected = allTenants.find(
                    (t) => t.id === e.target.value,
                  );
                  if (selected) switchTenant(selected);
                }}
                style={{
                  padding: "6px 10px",
                  border: "1px solid " + C.border,
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

        {/* ★ v4.0: Tab navigation removed — sidebar handles all tab routing */}

        {/* ── Tab Content ── */}
        <div>
          {/* v3.8: LiveFXBar — UNTOUCHED, permanent, never in scope */}
          <LiveFXBar />
          {/* WP-Z: PlatformBar — replaces AlertsBar, wired immediately below LiveFXBar */}
          <PlatformBar role="hq" tenantId={tenant?.id} onNavigate={() => {}} />

          {activeTab === "overview" && (
            <HQOverview onNavigate={handleNavigate} />
          )}
          {activeTab === "supply-chain" && <SupplyChain />}
          {activeTab === "distribution" && <Distribution />}
          {activeTab === "shops" && <ShopManager />}
          {activeTab === "analytics" && <HQAnalytics />}
          {activeTab === "retailer-health" && <RetailerHealth />}
          {activeTab === "suppliers" && <HQSuppliers />}
          {activeTab === "procurement" && <HQPurchaseOrders />}
          {activeTab === "invoices" && <HQInvoices />}
          {activeTab === "tenants" && <HQTenants />}
          {activeTab === "costing" && <HQCogs />}
          {activeTab === "pricing" && <HQPricing />}
          {activeTab === "pl" && <HQProfitLoss />}
          {activeTab === "reorder" && <HQReorderScoring />}
          {activeTab === "documents" && <HQDocuments />}
          {activeTab === "medical" && <HQMedical />}
          {activeTab === "wholesale-orders" && <HQWholesaleOrders />}
          {activeTab === "hq-production" && <HQProduction />}
          {activeTab === "hq-stock" && <HQStock />}
          {activeTab === "hq-transfers" && <HQTransfer />}
          {activeTab === "hq-ingredients" && <HQFoodIngredients />}
          {activeTab === "hq-recipes" && <HQRecipeEngine />}
          {activeTab === "hq-haccp" && <HQHaccp />}
          {activeTab === "hq-food-safety" && <HQFoodSafety />}
          {activeTab === "loyalty" && <HQLoyalty />}
          {activeTab === "fraud" && <HQFraud />}
        </div>
      </div>
    </PlatformBarProvider>
  );
}
