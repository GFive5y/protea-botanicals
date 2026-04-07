// src/pages/TenantPortal.js — v2.5 AIFixture
// CHANGES FROM v2.4 — exactly 2:
//   1. Import AIFixture
//   2. Replace dead "+" AI pill with AIFixture + slimmer account strip
//      AIFixture: proactive daily brief, cycling insights, NuAI typographic mark

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "../services/tenantService";
import PlatformBar from "../components/PlatformBar";
import ProteaAI from "../components/ProteaAI";
import DevErrorCapture from "../components/DevErrorCapture";
import { PlatformBarProvider } from "../contexts/PlatformBarContext";
import ToastContainer from "../components/ToastContainer";

import HQOverview from "../components/hq/HQOverview";
import SupplyChain from "../components/hq/SupplyChain";
import HQSuppliers from "../components/hq/HQSuppliers";
import HQPurchaseOrders from "../components/hq/HQPurchaseOrders";
import HQDocuments from "../components/hq/HQDocuments";
import HQProduction from "../components/hq/HQProduction";
import HQStock from "../components/hq/HQStock";
import HQCogs from "../components/hq/HQCogs";
import HQWholesaleOrders from "../components/hq/HQWholesaleOrders";
import HQTransfer from "../components/hq/HQTransfer";
import RetailerHealth from "../components/hq/RetailerHealth";
import HQPricing from "../components/hq/HQPricing";
import HQLoyalty from "../components/hq/HQLoyalty";
import HQProfitLoss from "../components/hq/HQProfitLoss";
import HQAnalytics from "../components/hq/HQAnalytics";
import HQReorderScoring from "../components/hq/HQReorderScoring";
import HQInvoices from "../components/hq/HQInvoices";
import HRStaffDirectory from "../components/hq/HRStaffDirectory";
import AdminQRCodes from "../components/AdminQRCodes";
import AdminCustomerEngagement from "../components/AdminCustomerEngagement";
import AdminCommsCenter from "../components/AdminCommsCenter";
import POSScreen from "../components/hq/POSScreen";
import ExpenseManager from "../components/hq/ExpenseManager";
import SmartInventory from "../components/hq/SmartInventory";
import HQTradingDashboard from "../components/hq/HQTradingDashboard";
import EODCashUp from "../components/hq/EODCashUp";
import HQBalanceSheet from "../components/hq/HQBalanceSheet";
import HQFixedAssets from "../components/hq/HQFixedAssets";
import HQJournals from "../components/hq/HQJournals";
import HQVat from "../components/hq/HQVat";
import HQForecast from "../components/hq/HQForecast";
import HRRoster from "../components/hq/HRRoster";
import HRLeave from "../components/hq/HRLeave";
import HRTimesheets from "../components/hq/HRTimesheets";
import HRContracts from "../components/hq/HRContracts";
import HRCalendar from "../components/hq/HRCalendar";
import HRPayroll from "../components/hq/HRPayroll";
import GlobalSearch from "../components/GlobalSearch";
import AIFixture from "../components/AIFixture";
import AccountBubble from "../components/AccountBubble";
import {
  Home, Package, ShoppingCart, Activity, ShoppingBag,
  User, Users, TrendingUp, Briefcase, Layers, Truck,
} from "lucide-react";

const T = {
  bg: "#FAFAF9",
  sidebar: "#ffffff",
  border: "#ECEAE6",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  ink900: "#0D0D0D",
  ink500: "#474747",
  ink400: "#6B6B6B",
  ink300: "#999999",
  ink150: "#E2E2E2",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
};

// Shared inner constraint — matches FX bar exactly
const INNER = {
  maxWidth: 1400,
  width: "100%",
  margin: "0 auto",
};

const WATERFALL = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    color: "#1A3D2B",
    alwaysOpen: true,
    roles: ["owner", "manager", "staff", "production"],
    tabs: [
      {
        id: "overview",
        label: "Dashboard",
        desc: "Live KPIs \u00b7 alerts \u00b7 quick actions",
      },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    color: "#1E3A5F",
    roles: ["owner", "manager"],
    tabs: [
      {
        id: "suppliers",
        label: "Suppliers",
        desc: "Eybna \u00b7 Steamups \u00b7 China hardware",
      },
      {
        id: "procurement",
        label: "Purchase Orders",
        desc: "Import POs \u00b7 landed cost \u00b7 FX",
      },
      {
        id: "documents",
        label: "Documents",
        desc: "Upload invoice \u2192 auto-process",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Activity,
    color: "#1A3D2B",
    roles: ["owner", "manager"],
    tabs: [
      {
        id: "trading",
        label: "Daily Trading",
        desc: "Today\u2019s revenue \u00b7 top sellers \u00b7 30-day chart",
      },
      {
        id: "cashup",
        label: "Cash-Up",
        desc: "End of day \u00b7 till reconciliation \u00b7 variance",
      },
    ],
  },
  {
    id: "production",
    label: "Production",
    icon: Layers,
    color: "#5B21B6",
    roles: ["owner", "manager", "production"],
    tabs: [
      {
        id: "hq-production",
        label: "Production Runs",
        desc: "New batch \u00b7 BOM \u00b7 yield \u00b7 COA",
      },
      { id: "stock", label: "Stock", desc: "Inventory \u00b7 movements \u00b7 AVCO" },
      {
        id: "supply-chain",
        label: "Material Pipeline",
        desc: "What is available to produce with",
      },
    ],
  },
  {
    id: "distribution",
    label: "Distribution",
    icon: Truck,
    color: "#92400E",
    roles: ["owner", "manager"],
    tabs: [
      {
        id: "wholesale-orders",
        label: "Wholesale Orders",
        desc: "B2B orders \u00b7 reserve \u00b7 ship",
      },
      {
        id: "invoices",
        label: "Invoices",
        desc: "Tax invoices \u00b7 payment tracking \u00b7 aged debtors",
      },
      {
        id: "retailer-health",
        label: "Retailer Health",
        desc: "Dispensary performance \u00b7 sell-through",
      },
      {
        id: "transfers",
        label: "Transfers",
        desc: "Stock movements between locations",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingBag,
    color: "#065F46",
    roles: ["owner", "manager", "staff"],
    tabs: [
      {
        id: "pricing",
        label: "Pricing",
        desc: "Channel prices \u00b7 margins \u00b7 scenarios",
      },
      {
        id: "loyalty",
        label: "Loyalty",
        desc: "Points \u00b7 tiers \u00b7 campaigns \u00b7 referrals",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: TrendingUp,
    color: "#991B1B",
    roles: ["owner"],
    tabs: [
      { id: "pl", label: "P&L", desc: "Live revenue \u00b7 COGS \u00b7 net margin \u00b7 margin by product" },
      {
        id: "costing",
        label: "Costing",
        desc: "Recipe COGS \u00b7 per-SKU margin \u00b7 FX impact",
      },
      {
        id: "analytics",
        label: "Analytics",
        desc: "Scans \u00b7 geo \u00b7 acquisition \u00b7 churn",
      },
      {
        id: "reorder",
        label: "Reorder",
        desc: "Stock alerts \u00b7 procurement triggers",
      },
      {
        id: "balance-sheet",
        label: "Balance Sheet",
        desc: "Assets \u00b7 liabilities \u00b7 cash flow",
      },
      {
        id: "fixed-assets",
        label: "Fixed Assets",
        desc: "PPE register \u00b7 depreciation \u00b7 NBV",
      },
      {
        id: "journals",
        label: "Journals",
        desc: "Accruals \u00b7 PAYE \u00b7 prepayments \u00b7 corrections",
      },
      {
        id: "vat",
        label: "VAT",
        desc: "VAT201 returns \u00b7 output \u00b7 input \u00b7 SARS filing",
      },
      {
        id: "forecast",
        label: "Forecast",
        desc: "30-day projection \u00b7 stock depletion \u00b7 cash flow",
      },
    ],
  },
  {
    id: "people",
    label: "People",
    icon: Briefcase,
    color: "#374151",
    roles: ["owner", "manager"],
    tabs: [
      {
        id: "staff",
        label: "Staff",
        desc: "Directory \u00b7 profiles \u00b7 timesheets",
      },
      {
        id: "hr-dashboard",
        label: "HR Dashboard \u2192",
        desc: "Calendar \u00b7 timesheets \u00b7 leave \u00b7 contracts \u00b7 payroll",
      },
    ],
  },
];

const CANNABIS_RETAIL_WATERFALL = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    color: "#1A3D2B",
    alwaysOpen: true,
    tabs: [
      {
        id: "overview",
        label: "Dashboard",
        desc: "Action queue \u00b7 KPIs \u00b7 alerts",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    color: "#1A3D2B",
    tabs: [
      {
        id: "stock",
        label: "Stock",
        desc: "Inventory \u00b7 movements \u00b7 AVCO \u00b7 margins",
      },
      {
        id: "catalog",
        label: "Catalog",
        desc: "Tile \u00b7 list \u00b7 detail \u00b7 cascading filters",
      },
    ],
  },
  {
    id: "procurement",
    label: "Ordering",
    icon: ShoppingCart,
    color: "#1E3A5F",
    tabs: [
      {
        id: "suppliers",
        label: "Suppliers",
        desc: "Local SA suppliers \u00b7 contacts",
      },
      {
        id: "procurement",
        label: "Purchase Orders",
        desc: "ZAR local POs \u00b7 receive delivery",
      },
      {
        id: "documents",
        label: "Documents",
        desc: "Upload invoice \u2192 AI extracts costs",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Activity,
    color: "#1A3D2B",
    tabs: [
      {
        id: "trading",
        label: "Daily Trading",
        desc: "Today\u2019s revenue \u00b7 top sellers \u00b7 30-day chart",
      },
      {
        id: "cashup",
        label: "Cash-Up",
        desc: "End of day \u00b7 till reconciliation \u00b7 variance",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingBag,
    color: "#065F46",
    tabs: [
      {
        id: "pos",
        label: "POS Till",
        desc: "Budtender till \u00b7 cash \u00b7 card \u00b7 online sales",
      },
      {
        id: "pricing",
        label: "Pricing",
        desc: "Sell prices \u00b7 margins \u00b7 scenarios",
      },
      {
        id: "loyalty",
        label: "Loyalty",
        desc: "Points \u00b7 tiers \u00b7 campaigns \u00b7 referrals",
      },
      {
        id: "invoices",
        label: "Invoices",
        desc: "AR receivables \u00b7 AP payables \u00b7 aged",
      },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: User,
    color: "#1E3A5F",
    tabs: [
      {
        id: "customers",
        label: "Profiles",
        desc: "Customer profiles \u00b7 loyalty \u00b7 churn risk \u00b7 engagement",
      },
      {
        id: "qr-codes",
        label: "QR Codes",
        desc: "Generate \u00b7 batch \u00b7 print \u00b7 scan analytics",
      },
      {
        id: "comms",
        label: "Messaging",
        desc: "Customer messages \u00b7 support \u00b7 broadcast",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Reports",
    icon: TrendingUp,
    color: "#991B1B",
    tabs: [
      {
        id: "pl",
        label: "Profit & Loss",
        desc: "Live revenue \u00b7 COGS \u00b7 net margin \u00b7 margin by product",
      },
      {
        id: "expenses",
        label: "Expenses",
        desc: "OPEX tracking \u00b7 categories \u00b7 P&L feed",
      },
      {
        id: "analytics",
        label: "Analytics",
        desc: "Scans \u00b7 customer data \u00b7 trends",
      },
      {
        id: "reorder",
        label: "Reorder",
        desc: "Stock alerts \u00b7 procurement triggers",
      },
      {
        id: "balance-sheet",
        label: "Balance Sheet",
        desc: "Assets \u00b7 liabilities \u00b7 cash flow",
      },
      {
        id: "costing",
        label: "Costing",
        desc: "Per-SKU margin \u00b7 recipe COGS \u00b7 FX impact",
      },
      {
        id: "forecast",
        label: "Forecast",
        desc: "30-day projection \u00b7 stock depletion \u00b7 cash flow",
      },
    ],
  },
  {
    id: "people",
    label: "Team",
    icon: Briefcase,
    color: "#374151",
    tabs: [
      { id: "staff", label: "Staff", desc: "Directory \u00b7 profiles" },
      { id: "roster", label: "Roster", desc: "Who\u2019s working this week \u00b7 shift schedule" },
      { id: "timesheets", label: "Timesheets", desc: "Track hours \u00b7 approve \u00b7 lock" },
      { id: "leave", label: "Leave", desc: "Leave requests \u00b7 balances \u00b7 approval" },
      { id: "contracts", label: "Contracts", desc: "Employment contracts \u00b7 probation" },
      { id: "payroll", label: "Payroll", desc: "Pay runs \u00b7 payslips" },
      { id: "hr-calendar", label: "Calendar", desc: "HR calendar \u00b7 public holidays \u00b7 diary" },
    ],
  },
];

const CANNABIS_ROLE_SECTIONS = {
  staff:      ["home", "sales", "customers"],
  hr:         ["home", "people"],
  management: ["home", "inventory", "operations", "sales", "customers", "people"],
  admin:      ["home", "inventory", "procurement", "operations", "sales", "customers", "intelligence", "people"],
  retailer:   ["home", "sales", "customers"],
  customer:   ["home"],
};

function getCannabisSections(waterfall, role) {
  const allowed = CANNABIS_ROLE_SECTIONS[role] || CANNABIS_ROLE_SECTIONS["admin"];
  return waterfall.filter(s => allowed.includes(s.id));
}

function getWaterfall(industryProfile) {
  if (industryProfile === "cannabis_retail" || industryProfile === "cannabis_dispensary") {
    return CANNABIS_RETAIL_WATERFALL;
  }
  return WATERFALL;
}

const ROLE_SECTIONS = {
  owner:      ["home", "procurement", "operations", "production", "distribution", "sales", "intelligence", "people"],
  manager:    ["home", "procurement", "operations", "production", "distribution", "sales", "people"],
  production: ["home", "production"],
  staff:      ["home", "sales"],
};

const PROFILE_BADGE = {
  cannabis_retail:    { label: "Cannabis Retail",    color: "#2D6A4F", bg: "#E8F5EE" },
  cannabis_dispensary:{ label: "Cannabis Dispensary", color: "#166534", bg: "#F0FDF4" },
  nicotine_retail:    { label: "Nicotine Retail",    color: "#1E3A5F", bg: "#EFF6FF" },
  food_beverage:      { label: "Food & Beverage",    color: "#92400E", bg: "#FFFBEB" },
  general_retail:     { label: "General Retail",     color: "#374151", bg: "#F9FAFB" },
  mixed_retail:       { label: "Mixed Retail",       color: "#6B21A8", bg: "#FAF5FF" },
  operator:           { label: "Operator",            color: "#991B1B", bg: "#FEF2F2" },
};

function renderTab(tabId, tenantId, industryProfile, onTabChange, searchKey, searchFilter) {
  switch (tabId) {
    case "overview":       return <HQOverview />;
    case "suppliers":      return <HQSuppliers />;
    case "procurement":    return <HQPurchaseOrders tenantId={tenantId} industryProfile={industryProfile} />;
    case "supply-chain":   return <SupplyChain />;
    case "documents":      return <HQDocuments />;
    case "hq-production":  return <HQProduction />;
    case "stock":          return <HQStock key={searchKey} initialCategory={searchFilter?.category} initialSubcategory={searchFilter?.subcategory} />;
    case "catalog":        return <SmartInventory key={searchKey} tenantId={tenantId} initialSearch={searchFilter?.q} initialCategory={searchFilter?.category} initialSubcategory={searchFilter?.subcategory} />;
    case "wholesale-orders": return <HQWholesaleOrders />;
    case "invoices":       return <HQInvoices tenantId={tenantId} />;
    case "retailer-health":return <RetailerHealth />;
    case "transfers":      return <HQTransfer />;
    case "pricing":        return <HQPricing />;
    case "loyalty":        return <HQLoyalty />;
    case "pos":            return <POSScreen tenantId={tenantId} />;
    case "expenses":       return <ExpenseManager tenantId={tenantId} onClose={() => onTabChange("pl")} onSaved={() => {}} />;
    case "pl":             return <HQProfitLoss />;
    case "costing":        return <HQCogs />;
    case "analytics":      return <HQAnalytics />;
    case "reorder":        return <HQReorderScoring />;
    case "staff":          return <HRStaffDirectory key={searchKey} tenantId={tenantId} initialSearch={searchFilter?.q} />;
    case "qr-codes":       return <AdminQRCodes tenantId={tenantId} />;
    case "customers":      return <AdminCustomerEngagement key={searchKey} tenantId={tenantId} initialSearch={searchFilter?.q} />;
    case "comms":          return <AdminCommsCenter tenantId={tenantId} />;
    case "trading":        return <HQTradingDashboard tenantId={tenantId} />;
    case "cashup":         return <EODCashUp tenantId={tenantId} />;
    case "balance-sheet":  return <HQBalanceSheet />;
    case "fixed-assets":   return <HQFixedAssets />;
    case "journals":       return <HQJournals />;
    case "vat":            return <HQVat />;
    case "forecast":       return <HQForecast />;
    case "roster":         return <HRRoster tenantId={tenantId} readOnly={false} />;
    case "timesheets":     return <HRTimesheets tenantId={tenantId} />;
    case "leave":          return <HRLeave tenantId={tenantId} />;
    case "contracts":      return <HRContracts tenantId={tenantId} />;
    case "payroll":        return <HRPayroll tenantId={tenantId} />;
    case "hr-calendar":    return <HRCalendar tenantId={tenantId} />;
    default:
      return (
        <div style={{ padding: 64, textAlign: "center", color: T.ink400, fontFamily: T.font }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83D\uDD27"}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink500, marginBottom: 6 }}>{tabId} \u2014 coming soon</div>
          <div style={{ fontSize: 13, color: T.ink400 }}>This module is in development.</div>
        </div>
      );
  }
}

function SidebarSection({ section, activeTab, onSelect, defaultOpen, collapsed, onExpand }) {
  const isActiveSection = section.tabs.some((t) => t.id === activeTab);
  const [open, setOpen] = useState(defaultOpen || section.alwaysOpen || isActiveSection);
  const effectiveOpen = open || isActiveSection;
  const NavIcon = section.icon;
  const [hovering, setHovering] = useState(false);

  if (collapsed) {
    return (
      <div style={{ padding: "1px 0", position: "relative" }}>
        <button
          onClick={onExpand}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "11px 0",
            background: isActiveSection ? `${section.color}14` : hovering ? `${section.color}09` : "transparent",
            border: "none",
            boxShadow: isActiveSection ? `inset 3px 0 0 ${section.color}` : "none",
            cursor: "pointer",
            transition: "background 0.15s, box-shadow 0.15s",
          }}
        >
          {NavIcon && (
            <NavIcon
              size={18}
              strokeWidth={hovering || isActiveSection ? 2.1 : 1.75}
              color={isActiveSection ? section.color : hovering ? section.color : T.ink400}
            />
          )}
        </button>
        {hovering && (
          <div style={{
            position: "absolute",
            left: "calc(100% + 10px)",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#1A3D2B",
            color: "#fff",
            padding: "5px 12px",
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            zIndex: 400,
            pointerEvents: "none",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>
            {section.label}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {!section.alwaysOpen && (
        <button
          onClick={() => {
            if (!effectiveOpen) { setOpen(true); onSelect(section.tabs[0].id); }
            else { setOpen(false); }
          }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            background: hovering ? `${section.color}08` : "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: T.font,
            textAlign: "left",
            marginTop: 2,
            transition: "background 0.15s",
          }}
        >
          {NavIcon && (
            <NavIcon
              size={14}
              strokeWidth={hovering || isActiveSection ? 2.1 : 1.75}
              color={isActiveSection || hovering ? section.color : T.ink400}
              style={{ flexShrink: 0 }}
            />
          )}
          <span style={{
            flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: isActiveSection || hovering ? section.color : T.ink400,
            transition: "color 0.15s",
          }}>
            {section.label}
          </span>
          <span style={{
            fontSize: 8, color: hovering ? section.color : T.ink300,
            transform: effectiveOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s, color 0.15s", display: "inline-block",
          }}>{"\u25B6"}</span>
        </button>
      )}
      {effectiveOpen && (
        <div style={{ paddingBottom: section.alwaysOpen ? 0 : 4 }}>
          {section.tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                title={tab.desc}
                style={{
                  display: "flex", alignItems: "center", width: "100%",
                  padding: section.alwaysOpen ? "9px 16px" : "7px 16px 7px 36px",
                  background: active ? T.accentLit : "transparent",
                  border: "none",
                  boxShadow: active ? `inset 3px 0 0 ${section.color}` : "none",
                  cursor: "pointer", fontFamily: T.font, textAlign: "left",
                }}
              >
                {section.alwaysOpen && NavIcon && (
                  <NavIcon size={14} strokeWidth={1.75} color={active ? section.color : T.ink500} style={{ marginRight: 8, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? section.color : T.ink500 }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PORTAL_CSS = `
  @media (max-width: 768px) {
    .portal-sidebar { display: none !important; }
    .portal-hamburger { display: flex !important; }
  }
  @media (min-width: 769px) {
    .portal-hamburger { display: none !important; }
    .portal-drawer { display: none !important; }
  }
  .portal-sidebar { scrollbar-width: none; }
  .portal-sidebar::-webkit-scrollbar { width: 0px; background: transparent; }
  .portal-sidebar:hover { scrollbar-width: thin; scrollbar-color: #E2E2E2 transparent; }
  .portal-sidebar:hover::-webkit-scrollbar { width: 4px; }
  .portal-sidebar:hover::-webkit-scrollbar-track { background: transparent; }
  .portal-sidebar:hover::-webkit-scrollbar-thumb { background: #E2E2E2; border-radius: 2px; }
  .ai-pane { left: 56px !important; }
  .ai-pane.nav-open { left: 220px !important; }
  .ai-pane.open { z-index: 200 !important; }
`;

export default function TenantPortal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, tenantId, industryProfile, isOperator, role: userRole } = useTenant();

  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = useCallback(
    (tabId) => setSearchParams({ tab: tabId }, { replace: true }),
    [setSearchParams],
  );
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [aiOpen, setAiOpen]           = useState(false);
  const [bubbleOpen, setBubbleOpen]   = useState(false);
  const [acctRect, setAcctRect]       = useState(null);
  const acctRef                       = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    import("../services/supabaseClient").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    });
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchFilter, setSearchFilter]         = useState(null);
  const [searchKey, setSearchKey]               = useState(0);

  const handleNavigateWithFilter = useCallback((tabId, filter) => {
    setSearchFilter(filter);
    setSearchKey((k) => k + 1);
    setSearchParams({ tab: tabId }, { replace: true });
    setDrawerOpen(false);
  }, [setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => setSearchFilter(null), 800);
    return () => clearTimeout(t);
  }, [searchKey]);

  // nuai:open-ai — backward-compatible event listener kept for other callers
  useEffect(() => {
    const handler = () => setAiOpen(true);
    window.addEventListener("nuai:open-ai", handler);
    return () => window.removeEventListener("nuai:open-ai", handler);
  }, []);

  // Close account bubble on outside click
  useEffect(() => {
    if (!bubbleOpen) return;
    const handler = (e) => {
      if (acctRef.current && acctRef.current.contains(e.target)) return;
      const bubble = document.getElementById("tp-acct-bubble");
      if (bubble && bubble.contains(e.target)) return;
      setBubbleOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bubbleOpen]);

  const handleTabSelect = useCallback(
    (tabId) => {
      setSearchParams({ tab: tabId }, { replace: true });
      setDrawerOpen(false);
    },
    [setSearchParams],
  );

  const activeWaterfall = getWaterfall(industryProfile);
  const visibleSections =
    activeWaterfall === CANNABIS_RETAIL_WATERFALL
      ? getCannabisSections(activeWaterfall, userRole)
      : activeWaterfall.filter((s) =>
          (ROLE_SECTIONS[userRole] || ROLE_SECTIONS.owner).includes(s.id)
        );

  const profileBadge = PROFILE_BADGE[industryProfile] || PROFILE_BADGE.general_retail;
  const tenantName   = tenant?.name || "My Business";
  const activeSection = activeWaterfall.find((s) => s.tabs.some((t) => t.id === activeTab));
  const activeTabDef  = activeSection?.tabs.find((t) => t.id === activeTab);
  const fullBleed     = activeTab === "catalog";

  return (
    <DevErrorCapture>
      <PlatformBarProvider>
        <style>{PORTAL_CSS}</style>
        <div style={{
          display: "flex", height: "100vh", overflow: "hidden",
          fontFamily: T.font, background: T.bg, position: "relative",
        }}>

          {/* \u2500\u2500 SIDEBAR \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          <div
            className="portal-sidebar"
            style={{
              width: sidebarCollapsed ? 56 : 220,
              minWidth: sidebarCollapsed ? 56 : 220,
              height: "100vh",
              background: T.sidebar,
              display: "flex", flexDirection: "column",
              overflowX: sidebarCollapsed ? "visible" : "hidden",
              overflowY: sidebarCollapsed ? "visible" : "auto",
              transition: "width 0.2s ease, min-width 0.2s ease",
            }}
          >
            {/* Header */}
            <div style={{
              padding: sidebarCollapsed ? "14px 0" : "18px 16px 14px",
              display: "flex", alignItems: "center",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              minHeight: 52, transition: "padding 0.2s ease",
            }}>
              {sidebarCollapsed ? (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  title="Open navigation"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <rect x="0" y="0"  width="16" height="1.5" rx="0.75" fill={T.accentMid} />
                    <rect x="0" y="5"  width="16" height="1.5" rx="0.75" fill={T.accentMid} />
                    <rect x="0" y="10" width="16" height="1.5" rx="0.75" fill={T.accentMid} />
                  </svg>
                </button>
              ) : (
                <div style={{ width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 6, lineHeight: 1.3 }}>
                      {tenantName}
                    </div>
                    <div style={{
                      display: "inline-block", fontSize: 9, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 20,
                      background: profileBadge.bg, color: profileBadge.color,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>
                      {profileBadge.label}
                    </div>
                    {isOperator && (
                      <button
                        onClick={() => navigate("/hq")}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          marginTop: 10, fontSize: 11, color: T.ink400,
                          background: "transparent", border: `1px solid ${T.ink150}`,
                          borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                          fontFamily: T.font, width: "100%",
                        }}
                      >
                        \u2190 HQ Operator View
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    title="Collapse sidebar"
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: T.ink400, fontSize: 15, lineHeight: 1,
                      padding: "2px 4px", flexShrink: 0, marginTop: 1,
                    }}
                  >{"\u2715"}</button>
                </div>
              )}
            </div>

            {/* Nav sections */}
            <div style={{ flex: 1, paddingTop: 6, paddingBottom: 8 }}>
              {visibleSections.map((section, i) => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  activeTab={activeTab}
                  onSelect={handleTabSelect}
                  defaultOpen={i <= 1}
                  collapsed={sidebarCollapsed}
                  onExpand={() => setSidebarCollapsed(false)}
                />
              ))}
            </div>

            {/* \u2500\u2500 NuAI FIXTURE \u2014 intelligent AI entry point \u2500\u2500\u2500\u2500\u2500 */}
            <AIFixture
              tenantId={tenantId}
              tenantName={tenantName}
              role={userRole}
              collapsed={sidebarCollapsed}
              onOpen={() => setAiOpen(true)}
            />

            {/* Account strip */}
            <div
              ref={acctRef}
              style={{
                padding: "8px 0",
                borderTop: `1px solid ${T.border}`,
                display: "flex", alignItems: "center", gap: 8,
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {bubbleOpen && (
                <AccountBubble
                  tenantId={tenantId}
                  tenantName={tenantName}
                  industryProfile={industryProfile}
                  role={userRole}
                  currentUser={currentUser}
                  collapsed={sidebarCollapsed}
                  anchorRect={acctRect}
                  onClose={() => setBubbleOpen(false)}
                />
              )}
              <button
                title={currentUser?.email || "Account"}
                onClick={() => {
                  if (!bubbleOpen) setAcctRect(acctRef.current?.getBoundingClientRect() || null);
                  setBubbleOpen(v => !v);
                }}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: bubbleOpen ? T.accent : T.accentMid,
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, color: "#fff", fontSize: 10, fontWeight: 700,
                  fontFamily: T.font, letterSpacing: "0.04em", textTransform: "uppercase",
                  transition: "background 0.15s",
                }}
              >
                {currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : "??"}
              </button>
            </div>
          </div>

          {/* \u2500\u2500 MAIN CONTENT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <GlobalSearch
              tenantId={tenantId}
              role={userRole}
              onNavigate={setActiveTab}
              onNavigateWithFilter={handleNavigateWithFilter}
            />

            {/* Breadcrumb */}
            <div style={{ background: "#fff", flexShrink: 0 }}>
              <div style={{ ...INNER, padding: "0 24px", height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    className="portal-hamburger"
                    onClick={() => setDrawerOpen(true)}
                    style={{
                      display: "none", alignItems: "center", justifyContent: "center",
                      width: 34, height: 34, background: "transparent",
                      border: `1px solid ${T.border}`, borderRadius: 6,
                      cursor: "pointer", flexShrink: 0, padding: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.ink500} strokeWidth="2" strokeLinecap="round">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveTab("overview")}
                    style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.ink400, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.ink400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                    Home
                  </button>
                  {activeSection && activeSection.id !== "home" && (
                    <>
                      <span style={{ color: T.ink150, fontSize: 12 }}>{"\u203A"}</span>
                      <button onClick={() => setActiveTab(activeSection.tabs[0].id)} style={{ fontSize: 12, color: T.ink400, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}>
                        {activeSection.label}
                      </button>
                    </>
                  )}
                  <span style={{ color: T.ink150, fontSize: 12 }}>{"\u203A"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink900 }}>{activeTabDef?.label || activeTab}</span>
                  {activeTabDef?.desc && (
                    <span style={{ fontSize: 11, color: T.ink300, marginLeft: 2 }}>{"\u00b7"} {activeTabDef.desc}</span>
                  )}
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("nuai:open-search"))}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 20px", background: "#FAFAF9",
                    border: `1px solid ${T.ink150}`, borderRadius: 7,
                    cursor: "pointer", fontFamily: T.font, flexShrink: 0,
                    whiteSpace: "nowrap", lineHeight: 1, minWidth: 260,
                    justifyContent: "space-between",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.ink300} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <span style={{ fontSize: 12, color: T.ink400 }}>Search products, staff, orders{"\u2026"}</span>
                  <span style={{ fontSize: 10, padding: "1px 6px", background: "#fff", border: `1px solid ${T.ink150}`, borderRadius: 3, color: T.ink400, fontFamily: "monospace", fontWeight: 600 }}>Ctrl+K</span>
                </button>
              </div>
            </div>

            {/* Platform bar */}
            <div style={{ ...INNER, overflow: "hidden", padding: "0 24px", flexShrink: 0 }}>
              <PlatformBar role="tenant" tenantId={tenantId} onNavigate={() => {}} />
            </div>

            {/* Content */}
            {fullBleed ? (
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#faf9f6" }}>
                <div style={{ ...INNER, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "12px 24px 0", boxSizing: "border-box" }}>
                  {renderTab(activeTab, tenantId, industryProfile, setActiveTab, searchKey, searchFilter)}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", background: "#faf9f6" }}>
                <div style={{ ...INNER, padding: "24px 28px", boxSizing: "border-box" }}>
                  {renderTab(activeTab, tenantId, industryProfile, setActiveTab, searchKey, searchFilter)}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{
              height: 28, flexShrink: 0, borderTop: `1px solid ${T.border}`,
              background: "#faf9f6", display: "flex", alignItems: "center",
              padding: "0 20px", gap: 16,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#2D6A4F", letterSpacing: "0.08em", textTransform: "uppercase" }}>NuAi</span>
              <span style={{ fontSize: 10, color: "#999" }}>v0.1 {"\u00b7"} dev</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: "#999" }}>
                {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2D6A4F", display: "inline-block" }} title="Connected" />
            </div>
          </div>

          {/* Mobile drawer */}
          {drawerOpen && (
            <div className="portal-drawer" style={{ position: "absolute", inset: 0, zIndex: 300, display: "flex" }}>
              <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)" }} />
              <div style={{
                position: "relative", width: 240, background: T.sidebar,
                borderRight: `1px solid ${T.border}`, display: "flex",
                flexDirection: "column", overflowY: "auto", zIndex: 1,
              }}>
                <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 5 }}>{tenantName}</div>
                    <div style={{ display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: profileBadge.bg, color: profileBadge.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {profileBadge.label}
                    </div>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.ink400, fontSize: 17, lineHeight: 1, padding: 4, marginTop: 2 }}>{"\u2715"}</button>
                </div>
                <div style={{ flex: 1, paddingTop: 6, paddingBottom: 16 }}>
                  {visibleSections.map((section, i) => (
                    <SidebarSection key={section.id} section={section} activeTab={activeTab} onSelect={handleTabSelect} defaultOpen={i <= 1} />
                  ))}
                </div>
                <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.ink300 }}>
                  {tenantId?.slice(0, 8)}{"\u2026"}
                </div>
              </div>
            </div>
          )}

          <ProteaAI
            isOpen={aiOpen}
            onClose={() => setAiOpen(false)}
            navExpanded={!sidebarCollapsed}
            tenantId={tenantId}
            role={userRole}
            isHQ={false}
            tenantName={tenantName}
          />
        </div>
        <ToastContainer />
      </PlatformBarProvider>
    </DevErrorCapture>
  );
}
