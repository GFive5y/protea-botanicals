// src/pages/TenantPortal.js — v2.1 SmartBar
// Manufacturer/Distributor model: Procurement → Production → Distribution → Sales → Intelligence → People
// Collapsible sections · Role-adaptive · Cannabis/Nicotine/General profiles
// DO NOT MODIFY HQDashboard.js — this is a separate file.

import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "../services/tenantService";
import PlatformBar from "../components/PlatformBar";
import ProteaAI from "../components/ProteaAI";
import DevErrorCapture from "../components/DevErrorCapture";
import { PlatformBarProvider } from "../contexts/PlatformBarContext";
import LiveFXBar from "../components/hq/LiveFXBar";

// ── Tab components ────────────────────────────────────────────────────────
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

// ── Design tokens ─────────────────────────────────────────────────────────
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

// ── Waterfall — Manufacturer/Distributor model ────────────────────────────
// Buy → Make → Distribute → Sell → Understand → People
// No duplicates. No retail-specific tabs. Pure vape brand model.

const WATERFALL = [
  {
    id: "home",
    label: "Home",
    emoji: "🏠",
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
    emoji: "🛒",
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
    id: "production",
    label: "Production",
    emoji: "⚗️",
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
    emoji: "🚚",
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
    emoji: "💻",
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
    emoji: "📊",
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
    ],
  },
  {
    id: "people",
    label: "People",
    emoji: "👥",
    color: "#374151",
    roles: ["owner", "manager"],
    tabs: [
      {
        id: "staff",
        label: "Staff",
        desc: "Directory · profiles · timesheets",
      },
    ],
  },
];

// Role → visible sections
const ROLE_SECTIONS = {
  owner: [
    "home",
    "procurement",
    "production",
    "distribution",
    "sales",
    "intelligence",
    "people",
  ],
  manager: [
    "home",
    "procurement",
    "production",
    "distribution",
    "sales",
    "people",
  ],
  production: ["home", "production"],
  staff: ["home", "sales"],
};

// Profile badge config
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

// ── Tab renderer ──────────────────────────────────────────────────────────
function renderTab(tabId) {
  switch (tabId) {
    case "overview":
      return <HQOverview />;
    case "suppliers":
      return <HQSuppliers />;
    case "procurement":
      return <HQPurchaseOrders />;
    case "supply-chain":
      return <SupplyChain />;
    case "documents":
      return <HQDocuments />;
    case "hq-production":
      return <HQProduction />;
    case "stock":
      return <HQStock />;
    case "wholesale-orders":
      return <HQWholesaleOrders />;
    case "invoices":
      return <HQInvoices />;
    case "retailer-health":
      return <RetailerHealth />;
    case "transfers":
      return <HQTransfer />;
    case "pricing":
      return <HQPricing />;
    case "loyalty":
      return <HQLoyalty />;
    case "pl":
      return <HQProfitLoss />;
    case "costing":
      return <HQCogs />;
    case "analytics":
      return <HQAnalytics />;
    case "reorder":
      return <HQReorderScoring />;
    case "staff":
      return <HRStaffDirectory />;
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

// ── Sidebar section ───────────────────────────────────────────────────────
function SidebarSection({ section, activeTab, onSelect, defaultOpen }) {
  const isActiveSection = section.tabs.some((t) => t.id === activeTab);
  const [open, setOpen] = useState(
    defaultOpen || section.alwaysOpen || isActiveSection,
  );
  const effectiveOpen = open || isActiveSection;

  return (
    <div>
      {!section.alwaysOpen && (
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            background: isActiveSection ? `${section.color}12` : "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: T.font,
            textAlign: "left",
            marginTop: 2,
          }}
        >
          <span style={{ fontSize: 13 }}>{section.emoji}</span>
          <span
            style={{
              flex: 1,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: isActiveSection ? section.color : T.ink400,
            }}
          >
            {section.label}
          </span>
          <span
            style={{
              fontSize: 8,
              color: T.ink300,
              transform: effectiveOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
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
                  padding: section.alwaysOpen
                    ? "9px 16px"
                    : "7px 16px 7px 36px",
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
                {section.alwaysOpen && (
                  <span style={{ marginRight: 8, fontSize: 13 }}>
                    {section.emoji}
                  </span>
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

// ── Main ──────────────────────────────────────────────────────────────────
export default function TenantPortal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, tenantId, industryProfile, isOperator } = useTenant();

  const activeTab = searchParams.get("tab") || "overview";

  const setActiveTab = useCallback(
    (tabId) => {
      setSearchParams({ tab: tabId }, { replace: true });
    },
    [setSearchParams],
  );

  const role = "owner";
  const visibleSectionIds = ROLE_SECTIONS[role] || ROLE_SECTIONS.owner;
  const visibleSections = WATERFALL.filter((s) =>
    visibleSectionIds.includes(s.id),
  );

  const profileBadge =
    PROFILE_BADGE[industryProfile] || PROFILE_BADGE.general_retail;
  const tenantName = tenant?.name || "My Business";

  const activeSection = WATERFALL.find((s) =>
    s.tabs.some((t) => t.id === activeTab),
  );
  const activeTabDef = activeSection?.tabs.find((t) => t.id === activeTab);

  return (
    <DevErrorCapture>
      <PlatformBarProvider>
        <div
          style={{
            display: "flex",
            height: "100vh",
            overflow: "hidden",
            fontFamily: T.font,
            background: T.bg,
          }}
        >
          {/* ── SIDEBAR ─────────────────────────────────────────── */}
          <div
            style={{
              width: 220,
              minWidth: 220,
              background: T.sidebar,
              borderRight: `1px solid ${T.border}`,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                padding: "18px 16px 14px",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
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

            <div style={{ flex: 1, paddingTop: 6, paddingBottom: 16 }}>
              {visibleSections.map((section, i) => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  activeTab={activeTab}
                  onSelect={setActiveTab}
                  defaultOpen={i <= 1}
                />
              ))}
            </div>

            <div
              style={{
                padding: "10px 16px 14px",
                borderTop: `1px solid ${T.border}`,
                fontSize: 10,
                color: T.ink300,
              }}
            >
              {tenantId?.slice(0, 8)}…
            </div>
          </div>

          {/* ── MAIN CONTENT ──────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderBottom: `1px solid ${T.border}`,
                padding: "0 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: 48,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {activeSection && (
                  <>
                    <span style={{ fontSize: 12, color: T.ink300 }}>
                      {activeSection.emoji} {activeSection.label}
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

            <LiveFXBar />
            <PlatformBar
              role="tenant"
              tenantId={tenantId}
              onNavigate={() => {}}
            />

            <div
              style={{
                flex: 1,
                padding: "24px 28px",
                maxWidth: 1400,
                width: "100%",
                margin: "0 auto",
                boxSizing: "border-box",
              }}
            >
              {renderTab(activeTab)}
            </div>
          </div>

          <ProteaAI />
        </div>
      </PlatformBarProvider>
    </DevErrorCapture>
  );
}
