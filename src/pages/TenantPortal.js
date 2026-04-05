// src/pages/TenantPortal.js — v2.4 ScrollFix (definitive)
// CHANGES FROM v2.1 — exactly 3:
//   1. FX wrapper: + flexShrink: 0
//   2. fullBleed: "catalog" only (not "stock")
//   3. ALL content areas use two-div pattern:
//      outer = full-width flex (scrollbar at screen edge / overflow:hidden for catalog)
//      inner = maxWidth:1400 + margin:"0 auto" → aligns with FX bar on ANY screen width

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "../services/tenantService";
import PlatformBar from "../components/PlatformBar";
import ProteaAI from "../components/ProteaAI";
import DevErrorCapture from "../components/DevErrorCapture";
import { PlatformBarProvider } from "../contexts/PlatformBarContext";
import LiveFXBar from "../components/hq/LiveFXBar";
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
import HRRoster from "../components/hq/HRRoster";
import HRLeave from "../components/hq/HRLeave";
import HRTimesheets from "../components/hq/HRTimesheets";
import HRContracts from "../components/hq/HRContracts";
import HRCalendar from "../components/hq/HRCalendar";
import HRPayroll from "../components/hq/HRPayroll";
import GlobalSearch from "../components/GlobalSearch";
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
        desc: "Live KPIs · alerts · quick actions",
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
        desc: "Eybna · Steamups · China hardware",
      },
      {
        id: "procurement",
        label: "Purchase Orders",
        desc: "Import POs · landed cost · FX",
      },
      {
        id: "documents",
        label: "Documents",
        desc: "Upload invoice → auto-process",
      },
    ],
  },
  {
    id: "operations",
    label: "Daily Operations",
    icon: Activity,
    color: "#1A3D2B",
    roles: ["owner", "manager"],
    tabs: [
      {
        id: "trading",
        label: "Daily Trading",
        desc: "Today's revenue · top sellers · 30-day chart",
      },
      {
        id: "cashup",
        label: "Cash-Up",
        desc: "End of day · till reconciliation · variance",
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
        desc: "New batch · BOM · yield · COA",
      },
      { id: "stock", label: "Stock", desc: "Inventory · movements · AVCO" },
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
        desc: "B2B orders · reserve · ship",
      },
      {
        id: "invoices",
        label: "Invoices",
        desc: "Tax invoices · payment tracking · aged debtors",
      },
      {
        id: "retailer-health",
        label: "Retailer Health",
        desc: "Dispensary performance · sell-through",
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
        desc: "Channel prices · margins · scenarios",
      },
      {
        id: "loyalty",
        label: "Loyalty",
        desc: "Points · tiers · campaigns · referrals",
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
      { id: "pl", label: "P&L", desc: "Live profit & loss · actual COGS · FX" },
      {
        id: "costing",
        label: "Costing",
        desc: "Recipe COGS · per-SKU margin · FX impact",
      },
      {
        id: "analytics",
        label: "Analytics",
        desc: "Scans · geo · acquisition · churn",
      },
      {
        id: "reorder",
        label: "Reorder",
        desc: "Stock alerts · procurement triggers",
      },
      {
        id: "balance-sheet",
        label: "Balance Sheet",
        desc: "Assets · liabilities · cash flow",
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
        desc: "Directory · profiles · timesheets",
      },
      {
        id: "hr-dashboard",
        label: "HR Dashboard →",
        desc: "Calendar · timesheets · leave · contracts · payroll",
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
        desc: "Action queue · KPIs · alerts",
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
        desc: "Inventory · movements · AVCO · margins",
      },
      {
        id: "catalog",
        label: "Smart Catalog",
        desc: "Tile · list · detail view · cascading filters",
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
        desc: "Local SA suppliers · contacts",
      },
      {
        id: "procurement",
        label: "Purchase Orders",
        desc: "ZAR local POs · receive delivery",
      },
      {
        id: "documents",
        label: "Documents",
        desc: "Upload invoice → AI extracts costs",
      },
    ],
  },
  {
    id: "operations",
    label: "Daily Operations",
    icon: Activity,
    color: "#1A3D2B",
    tabs: [
      {
        id: "trading",
        label: "Daily Trading",
        desc: "Today's revenue · top sellers · 30-day chart",
      },
      {
        id: "cashup",
        label: "Cash-Up",
        desc: "End of day · till reconciliation · variance",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales & Customers",
    icon: ShoppingBag,
    color: "#065F46",
    tabs: [
      {
        id: "pos",
        label: "POS Till",
        desc: "Budtender till · cash · card · online sales",
      },
      {
        id: "pricing",
        label: "Pricing",
        desc: "Sell prices · margins · scenarios",
      },
      {
        id: "loyalty",
        label: "Loyalty",
        desc: "Points · tiers · campaigns · referrals",
      },
      {
        id: "invoices",
        label: "Invoices",
        desc: "AR receivables · AP payables · aged",
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
        label: "Customer 360",
        desc: "Profiles · loyalty · churn risk · engagement",
      },
      {
        id: "qr-codes",
        label: "QR Codes",
        desc: "Generate · batch · print · scan analytics",
      },
      {
        id: "comms",
        label: "Messaging",
        desc: "Customer messages · support · broadcast",
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
        desc: "Live revenue · COGS · net margin",
      },
      {
        id: "expenses",
        label: "Expenses",
        desc: "OPEX tracking · categories · P&L feed",
      },
      {
        id: "analytics",
        label: "Analytics",
        desc: "Scans · customer data · trends",
      },
      {
        id: "reorder",
        label: "Reorder",
        desc: "Stock alerts · procurement triggers",
      },
      {
        id: "balance-sheet",
        label: "Balance Sheet",
        desc: "Assets · liabilities · cash flow",
      },
    ],
  },
  {
    id: "people",
    label: "Team",
    icon: Briefcase,
    color: "#374151",
    tabs: [
      {
        id: "staff",
        label: "Staff",
        desc: "Directory · profiles",
      },
      {
        id: "roster",
        label: "Roster",
        desc: "Who's working this week · shift schedule",
      },
      {
        id: "timesheets",
        label: "Timesheets",
        desc: "Track hours · approve · lock",
      },
      {
        id: "leave",
        label: "Leave",
        desc: "Leave requests · balances · approval",
      },
      {
        id: "contracts",
        label: "Contracts",
        desc: "Employment contracts · probation",
      },
      {
        id: "payroll",
        label: "Payroll",
        desc: "Pay runs · payslips",
      },
      {
        id: "hr-calendar",
        label: "Calendar",
        desc: "HR calendar · public holidays · diary",
      },
    ],
  },
];

// Role-based section visibility for cannabis retail
// staff     → till + customers only
// management/hr → no financial intelligence
// admin/owner   → everything
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
  if (
    industryProfile === "cannabis_retail" ||
    industryProfile === "cannabis_dispensary"
  ) {
    return CANNABIS_RETAIL_WATERFALL;
  }
  return WATERFALL;
}

const ROLE_SECTIONS = {
  owner: [
    "home",
    "procurement",
    "operations",
    "production",
    "distribution",
    "sales",
    "intelligence",
    "people",
  ],
  manager: [
    "home",
    "procurement",
    "operations",
    "production",
    "distribution",
    "sales",
    "people",
  ],
  production: ["home", "production"],
  staff: ["home", "sales"],
};

const PROFILE_BADGE = {
  cannabis_retail: {
    label: "Cannabis Retail",
    color: "#2D6A4F",
    bg: "#E8F5EE",
  },
  cannabis_dispensary: {
    label: "Cannabis Dispensary",
    color: "#166534",
    bg: "#F0FDF4",
  },
  nicotine_retail: {
    label: "Nicotine Retail",
    color: "#1E3A5F",
    bg: "#EFF6FF",
  },
  food_beverage: { label: "Food & Beverage", color: "#92400E", bg: "#FFFBEB" },
  general_retail: { label: "General Retail", color: "#374151", bg: "#F9FAFB" },
  mixed_retail: { label: "Mixed Retail", color: "#6B21A8", bg: "#FAF5FF" },
  operator: { label: "Operator", color: "#991B1B", bg: "#FEF2F2" },
};

function renderTab(tabId, tenantId, industryProfile, onTabChange, searchKey, searchFilter) {
  switch (tabId) {
    case "overview":
      return <HQOverview />;
    case "suppliers":
      return <HQSuppliers />;
    case "procurement":
      return (
        <HQPurchaseOrders
          tenantId={tenantId}
          industryProfile={industryProfile}
        />
      );
    case "supply-chain":
      return <SupplyChain />;
    case "documents":
      return <HQDocuments />;
    case "hq-production":
      return <HQProduction />;
    case "stock":
      return <HQStock key={searchKey} initialCategory={searchFilter?.category} initialSubcategory={searchFilter?.subcategory} />;
    case "catalog":
      return <SmartInventory key={searchKey} tenantId={tenantId} initialSearch={searchFilter?.q} initialCategory={searchFilter?.category} initialSubcategory={searchFilter?.subcategory} />;
    case "wholesale-orders":
      return <HQWholesaleOrders />;
    case "invoices":
      return <HQInvoices tenantId={tenantId} />;
    case "retailer-health":
      return <RetailerHealth />;
    case "transfers":
      return <HQTransfer />;
    case "pricing":
      return <HQPricing />;
    case "loyalty":
      return <HQLoyalty />;
    case "pos":
      return <POSScreen tenantId={tenantId} />;
    case "expenses":
      return (
        <ExpenseManager
          tenantId={tenantId}
          onClose={() => onTabChange("pl")}
          onSaved={() => {}}
        />
      );
    case "pl":
      return <HQProfitLoss />;
    case "costing":
      return <HQCogs />;
    case "analytics":
      return <HQAnalytics />;
    case "reorder":
      return <HQReorderScoring />;
    case "staff":
      return <HRStaffDirectory key={searchKey} tenantId={tenantId} initialSearch={searchFilter?.q} />;
    case "qr-codes":
      return <AdminQRCodes tenantId={tenantId} />;
    case "customers":
      return <AdminCustomerEngagement key={searchKey} tenantId={tenantId} initialSearch={searchFilter?.q} />;
    case "comms":
      return <AdminCommsCenter tenantId={tenantId} />;
    case "trading":
      return <HQTradingDashboard tenantId={tenantId} />;
    case "cashup":
      return <EODCashUp tenantId={tenantId} />;
    case "balance-sheet":
      return <HQBalanceSheet />;
    case "roster":
      return <HRRoster tenantId={tenantId} readOnly={false} />;
    case "timesheets":
      return <HRTimesheets tenantId={tenantId} />;
    case "leave":
      return <HRLeave tenantId={tenantId} />;
    case "contracts":
      return <HRContracts tenantId={tenantId} />;
    case "payroll":
      return <HRPayroll tenantId={tenantId} />;
    case "hr-calendar":
      return <HRCalendar tenantId={tenantId} />;
    default:
      return (
        <div
          style={{
            padding: 64,
            textAlign: "center",
            color: T.ink400,
            fontFamily: T.font,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔧</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: T.ink500,
              marginBottom: 6,
            }}
          >
            {tabId} — coming soon
          </div>
          <div style={{ fontSize: 13, color: T.ink400 }}>
            This module is in development.
          </div>
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

  // ── COLLAPSED: icon-only strip with hover label ───────────────
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
            borderLeft: isActiveSection ? `3px solid ${section.color}` : "3px solid transparent",
            cursor: "pointer",
            transition: "background 0.15s",
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
          <div
            style={{
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
            }}
          >
            {section.label}
          </div>
        )}
      </div>
    );
  }

  // ── EXPANDED: full sidebar with hover effects ─────────────────
  return (
    <div>
      {!section.alwaysOpen && (
        <button
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            background: isActiveSection
              ? `${section.color}12`
              : hovering ? `${section.color}08` : "transparent",
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
          <span
            style={{
              flex: 1,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: isActiveSection || hovering ? section.color : T.ink400,
              transition: "color 0.15s",
            }}
          >
            {section.label}
          </span>
          <span
            style={{
              fontSize: 8,
              color: hovering ? section.color : T.ink300,
              transform: effectiveOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s, color 0.15s",
              display: "inline-block",
            }}
          >
            ▶
          </span>
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
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: section.alwaysOpen ? "9px 16px" : "7px 16px 7px 36px",
                  background: active ? T.accentLit : "transparent",
                  border: "none",
                  borderLeftStyle: "solid",
                  borderLeftWidth: 3,
                  borderLeftColor: active ? section.color : "transparent",
                  cursor: "pointer",
                  fontFamily: T.font,
                  textAlign: "left",
                }}
              >
                {section.alwaysOpen && NavIcon && (
                  <NavIcon
                    size={14}
                    strokeWidth={1.75}
                    color={active ? section.color : T.ink500}
                    style={{ marginRight: 8, flexShrink: 0 }}
                  />
                )}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? section.color : T.ink500,
                  }}
                >
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
`;

export default function TenantPortal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, tenantId, industryProfile, isOperator, role: userRole } = useTenant();

  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = useCallback(
    (tabId) => {
      setSearchParams({ tab: tabId }, { replace: true });
    },
    [setSearchParams],
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchFilter, setSearchFilter] = useState(null);
  const [searchKey, setSearchKey] = useState(0);
  const handleNavigateWithFilter = useCallback((tabId, filter) => {
    setSearchFilter(filter);
    setSearchKey((k) => k + 1);
    setSearchParams({ tab: tabId }, { replace: true });
    setDrawerOpen(false);
  }, [setSearchParams]);

  // Clear searchFilter after destination mounts — prevents stale filter
  // on subsequent same-tab navigation
  useEffect(() => {
    const t = setTimeout(() => setSearchFilter(null), 800);
    return () => clearTimeout(t);
  }, [searchKey]);
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

  const profileBadge =
    PROFILE_BADGE[industryProfile] || PROFILE_BADGE.general_retail;
  const tenantName = tenant?.name || "My Business";
  const activeSection = activeWaterfall.find((s) =>
    s.tabs.some((t) => t.id === activeTab),
  );
  const activeTabDef = activeSection?.tabs.find((t) => t.id === activeTab);

  // Only catalog needs fullBleed (SmartInventory manages its own internal scroll)
  const fullBleed = activeTab === "catalog";

  return (
    <DevErrorCapture>
      <PlatformBarProvider>
        <style>{PORTAL_CSS}</style>
        <div
          style={{
            display: "flex",
            height: "100vh",
            overflow: "hidden",
            fontFamily: T.font,
            background: T.bg,
            position: "relative",
          }}
        >
          {/* ── SIDEBAR — desktop only (hidden on mobile via CSS) ── */}
          <div
            className="portal-sidebar"
            style={{
              width: sidebarCollapsed ? 56 : 220,
              minWidth: sidebarCollapsed ? 56 : 220,
              background: T.sidebar,
              borderRight: `1px solid ${T.border}`,
              display: "flex",
              flexDirection: "column",
              overflowY: sidebarCollapsed ? "visible" : "auto",
              overflow: sidebarCollapsed ? "visible" : undefined,
              transition: "width 0.2s ease, min-width 0.2s ease",
            }}
          >
            <div
              style={{
                padding: sidebarCollapsed ? "14px 0" : "18px 16px 14px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                minHeight: 52,
                transition: "padding 0.2s ease",
              }}
            >
              {sidebarCollapsed ? (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: T.accentMid,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.accent,
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {tenantName}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: profileBadge.bg,
                      color: profileBadge.color,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {profileBadge.label}
                  </div>
                  {isOperator && (
                    <button
                      onClick={() => navigate("/hq")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 10,
                        fontSize: 11,
                        color: T.ink400,
                        background: "transparent",
                        border: `1px solid ${T.ink150}`,
                        borderRadius: 6,
                        padding: "5px 10px",
                        cursor: "pointer",
                        fontFamily: T.font,
                        width: "100%",
                      }}
                    >
                      ← HQ Operator View
                    </button>
                  )}
                </div>
              )}
            </div>
            <div style={{ flex: 1, paddingTop: 6, paddingBottom: 16 }}>
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
            <div
              style={{
                padding: sidebarCollapsed ? "10px 0 14px" : "10px 16px 14px",
                borderTop: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "space-between",
                gap: 8,
              }}
            >
              {!sidebarCollapsed && (
                <span style={{ fontSize: 10, color: T.ink300 }}>
                  {tenantId?.slice(0, 8)}…
                </span>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                style={{
                  background: "transparent",
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.ink400,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {sidebarCollapsed ? (
                    <polyline points="9 18 15 12 9 6" />
                  ) : (
                    <polyline points="15 18 9 12 15 6" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* ── MAIN CONTENT ──────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* ── GLOBAL SEARCH ── above everything, always visible */}
            <GlobalSearch
              tenantId={tenantId}
              role={userRole}
              onNavigate={setActiveTab}
              onNavigateWithFilter={handleNavigateWithFilter}
            />
            {/* Breadcrumb — unchanged */}
            <div
              style={{
                background: "#fff",
                borderBottom: `1px solid ${T.border}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  ...INNER,
                  padding: "0 24px",
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className="portal-hamburger"
                    onClick={() => setDrawerOpen(true)}
                    style={{
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      background: "transparent",
                      border: `1px solid ${T.border}`,
                      borderRadius: 6,
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={T.ink500} strokeWidth="2" strokeLinecap="round">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="21" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                  {activeSection && (
                    <>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 12,
                          color: T.ink300,
                        }}
                      >
                        {(() => {
                          const BreadIcon = activeSection.icon;
                          return BreadIcon ? (
                            <BreadIcon size={12} strokeWidth={1.75} color={T.ink300} />
                          ) : null;
                        })()}
                        {activeSection.label}
                      </span>
                      <span style={{ color: T.ink150 }}>›</span>
                    </>
                  )}
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: T.ink900 }}
                  >
                    {activeTabDef?.label || activeTab}
                  </span>
                  {activeTabDef?.desc && (
                    <span
                      style={{ fontSize: 11, color: T.ink300, marginLeft: 4 }}
                    >
                      · {activeTabDef.desc}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* FX + Platform bar — CHANGE 1: + flexShrink:0 */}
            <div
              style={{
                ...INNER,
                overflow: "hidden",
                padding: "0 24px",
                flexShrink: 0,
              }}
            >
              <LiveFXBar />
              <PlatformBar
                role="tenant"
                tenantId={tenantId}
                onNavigate={() => {}}
              />
            </div>

            {/* ── CONTENT — CHANGE 2+3 ─────────────────────────
                Both modes use same INNER constraint (maxWidth:1400 margin:0 auto)
                so content ALWAYS aligns with FX bar on any screen width.
                Catalog: outer overflow:hidden, inner flex column fills height
                Others:  outer overflowY:auto (scrollbar at screen edge), inner just pads
            */}
            {fullBleed ? (
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  background: "#faf9f6",
                }}
              >
                <div
                  style={{
                    ...INNER,
                    flex: 1,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    padding: "12px 24px 0",
                    boxSizing: "border-box",
                  }}
                >
                  {renderTab(activeTab, tenantId, industryProfile, setActiveTab, searchKey, searchFilter)}
                </div>
              </div>
            ) : (
              <div
                style={{ flex: 1, overflowY: "auto", background: "#faf9f6" }}
              >
                <div
                  style={{
                    ...INNER,
                    padding: "24px 28px",
                    boxSizing: "border-box",
                  }}
                >
                  {renderTab(activeTab, tenantId, industryProfile, setActiveTab, searchKey, searchFilter)}
                </div>
              </div>
            )}

            {/* Footer — unchanged */}
            <div
              style={{
                height: 28,
                flexShrink: 0,
                borderTop: `1px solid ${T.border}`,
                background: "#faf9f6",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#2D6A4F",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                NuAi
              </span>
              <span style={{ fontSize: 10, color: "#999" }}>v0.1 · dev</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: "#999" }}>
                {new Date().toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#2D6A4F",
                  display: "inline-block",
                }}
                title="Connected"
              />
            </div>
          </div>

          {drawerOpen && (
            <div
              className="portal-drawer"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 300,
                display: "flex",
              }}
            >
              <div
                onClick={() => setDrawerOpen(false)}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.38)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: 240,
                  background: T.sidebar,
                  borderRight: `1px solid ${T.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflowY: "auto",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    padding: "14px 16px 12px",
                    borderBottom: `1px solid ${T.border}`,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 5 }}>
                      {tenantName}
                    </div>
                    <div style={{
                      display: "inline-block",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: profileBadge.bg,
                      color: profileBadge.color,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}>
                      {profileBadge.label}
                    </div>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: T.ink400,
                      fontSize: 17,
                      lineHeight: 1,
                      padding: 4,
                      marginTop: 2,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, paddingTop: 6, paddingBottom: 16 }}>
                  {visibleSections.map((section, i) => (
                    <SidebarSection
                      key={section.id}
                      section={section}
                      activeTab={activeTab}
                      onSelect={handleTabSelect}
                      defaultOpen={i <= 1}
                    />
                  ))}
                </div>
                <div style={{
                  padding: "10px 16px 14px",
                  borderTop: `1px solid ${T.border}`,
                  fontSize: 10,
                  color: T.ink300,
                }}>
                  {tenantId?.slice(0, 8)}…
                </div>
              </div>
            </div>
          )}
          <ProteaAI />
        </div>
        <ToastContainer />
      </PlatformBarProvider>
    </DevErrorCapture>
  );
}
