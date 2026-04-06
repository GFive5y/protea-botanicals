// src/pages/HQDashboard.js v4.3
// WP-EOD: EODCashUp tab added (hq-eod)
// WP-DAILY-OPS: HQTradingDashboard + POSScreen wired (aa51b74)
// WP-FNB S8: HQFoodIntelligence tab added
// WP-Z: PlatformBar replaces AlertsBar — wired below LiveFXBar
// ★ v4.0: WP-NAV Sub-B — sidebar handles all tab routing

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTenant } from "../services/tenantService";

import HQOverview from "../components/hq/HQOverview";
import ShopManager from "../components/hq/ShopManager";
import SupplyChain from "../components/hq/SupplyChain";
import Distribution from "../components/hq/Distribution";
import HQAnalytics from "../components/hq/HQAnalytics";
import GeoAnalyticsDashboard from "../components/hq/GeoAnalyticsDashboard";
import RetailerHealth from "../components/hq/RetailerHealth";
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
import HQTradingDashboard from "../components/hq/HQTradingDashboard";
import POSScreen from "../components/hq/POSScreen";
import EODCashUp from "../components/hq/EODCashUp";
import HQFoodIngredients from "../components/hq/HQFoodIngredients";
import HQRecipeEngine from "../components/hq/HQRecipeEngine";
import HQHaccp from "../components/hq/HQHaccp";
import HQFoodSafety from "../components/hq/HQFoodSafety";
import HQNutritionLabel from "../components/hq/HQNutritionLabel";
import HQColdChain from "../components/hq/HQColdChain";
import HQRecall from "../components/hq/HQRecall";
import HQFoodIntelligence from "../components/hq/HQFoodIntelligence";
import HQLoyalty from "../components/hq/HQLoyalty";
import HQBalanceSheet from "../components/hq/HQBalanceSheet";
import HQFraud from "../components/hq/HQFraud";
import HQInvoices from "../components/hq/HQInvoices";
import HQTenants from "../components/hq/HQTenants";
import LiveFXBar from "../components/hq/LiveFXBar";
import PlatformBar from "../components/PlatformBar";
import { PlatformBarProvider } from "../contexts/PlatformBarContext";

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
  { id: "overview", label: "Overview", icon: "📊", ready: true },
  { id: "supply-chain", label: "Supply Chain", icon: "📦", ready: true },
  { id: "suppliers", label: "Suppliers", icon: "🌍", ready: true },
  { id: "procurement", label: "Procurement", icon: "🛒", ready: true },
  { id: "invoices", label: "Invoices", icon: "🧾", ready: true },
  { id: "tenants", label: "Tenants", icon: "🏢", ready: true },
  { id: "hq-production", label: "Production", icon: "⚗️", ready: true },
  { id: "hq-stock", label: "HQ Stock", icon: "=", ready: true },
  { id: "hq-transfers", label: "Transfers", icon: "=", ready: true },
  { id: "hq-trading", label: "Daily Trading", icon: "📊", ready: true },
  { id: "hq-pos", label: "POS Till", icon: "🛒", ready: true },
  { id: "hq-eod", label: "Cash-Up", icon: "💰", ready: true },
  { id: "hq-ingredients", label: "Ingredients", icon: "=", ready: true },
  { id: "hq-recipes", label: "Recipes", icon: "=", ready: true },
  { id: "hq-haccp", label: "HACCP", icon: "=", ready: true },
  { id: "hq-food-safety", label: "Food Safety", icon: "=", ready: true },
  { id: "hq-nutrition", label: "Nutrition Labels", icon: "=", ready: true },
  { id: "hq-cold-chain", label: "Cold Chain", icon: "=", ready: true },
  { id: "hq-recall", label: "Recall & Trace", icon: "=", ready: true },
  {
    id: "hq-food-intelligence",
    label: "Food Intelligence",
    icon: "=",
    ready: true,
  },
  { id: "distribution", label: "Distribution", icon: "🚚", ready: true },
  { id: "pricing", label: "Pricing", icon: "💲", ready: true },
  { id: "costing", label: "Costing", icon: "🧮", ready: true },
  { id: "pl", label: "P&L", icon: "📉", ready: true },
  { id: "balance-sheet", label: "Balance Sheet", icon: "⚖️", ready: true },
  { id: "analytics", label: "Analytics", icon: "📈", ready: true },
  { id: "geo-analytics", label: "Geo Analytics", icon: "🗺️", ready: true },
  { id: "retailer-health", label: "Retailer Health", icon: "🏆", ready: true },
  { id: "reorder", label: "Reorder", icon: "🔔", ready: true },
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
  { id: "shops", label: "Shops", icon: "🏪", ready: true },
];

export default function HQDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars -- isHQ kept for future HQ-only feature gates (LL-172)
  const { tenant, allTenants, tenantName, isHQ, isOperator, switchTenant } =
    useTenant();
  const location = useLocation();

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
              tenant{allTenants.length !== 1 ? "s" : ""} registered
            </p>
          </div>

          {isOperator && allTenants.length > 1 && (
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
                  if (!selected) return;
                  switchTenant(selected);
                  if (selected.industry_profile === "operator") {
                    navigate("/hq");
                  } else {
                    navigate("/tenant-portal");
                  }
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
              {tenant?.domain && (
                <a
                  href={`https://${tenant.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    background: "#0A0A0A",
                    color: "#00E87A",
                    border: "1px solid rgba(0,232,122,0.3)",
                    borderRadius: "2px",
                    fontFamily: "Jost, sans-serif",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  ↗ View live site
                </a>
              )}
            </div>
          )}
        </div>

        <div>
          <LiveFXBar />
          <PlatformBar role="hq" tenantId={tenant?.id} onNavigate={() => {}} />

          {activeTab === "overview" && (
            <HQOverview onNavigate={handleNavigate} />
          )}
          {activeTab === "supply-chain" && <SupplyChain />}
          {activeTab === "distribution" && <Distribution />}
          {activeTab === "shops" && <ShopManager />}
          {activeTab === "analytics" && <HQAnalytics />}
          {activeTab === "geo-analytics" && <GeoAnalyticsDashboard />}
          {activeTab === "retailer-health" && <RetailerHealth />}
          {activeTab === "suppliers" && <HQSuppliers />}
          {activeTab === "procurement" && <HQPurchaseOrders />}
          {activeTab === "invoices" && <HQInvoices />}
          {activeTab === "tenants" && <HQTenants />}
          {activeTab === "costing" && <HQCogs />}
          {activeTab === "pricing" && <HQPricing />}
          {activeTab === "pl" && <HQProfitLoss />}
          {activeTab === "balance-sheet" && <HQBalanceSheet />}
          {activeTab === "reorder" && <HQReorderScoring />}
          {activeTab === "documents" && <HQDocuments />}
          {activeTab === "medical" && <HQMedical />}
          {activeTab === "wholesale-orders" && <HQWholesaleOrders />}
          {activeTab === "hq-production" && <HQProduction />}
          {activeTab === "hq-stock" && <HQStock />}
          {activeTab === "hq-transfers" && <HQTransfer />}
          {activeTab === "hq-trading" && <HQTradingDashboard />}
          {activeTab === "hq-pos" && <POSScreen tenantId={tenant?.id} />}
          {activeTab === "hq-eod" && <EODCashUp />}
          {activeTab === "hq-ingredients" && <HQFoodIngredients />}
          {activeTab === "hq-recipes" && <HQRecipeEngine />}
          {activeTab === "hq-haccp" && <HQHaccp />}
          {activeTab === "hq-food-safety" && <HQFoodSafety />}
          {activeTab === "hq-nutrition" && <HQNutritionLabel />}
          {activeTab === "hq-cold-chain" && <HQColdChain />}
          {activeTab === "hq-recall" && <HQRecall />}
          {activeTab === "hq-food-intelligence" && (
            <HQFoodIntelligence tenantId={tenant?.id} role="hq" />
          )}
          {activeTab === "loyalty" && <HQLoyalty />}
          {activeTab === "fraud" && <HQFraud />}
        </div>
      </div>
    </PlatformBarProvider>
  );
}
