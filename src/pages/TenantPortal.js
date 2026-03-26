// src/pages/TenantPortal.js — WP-TENANT Session 3
// v1.0 — Tenant management portal (Tier 1 — non-operator management access)
// Renders the same HQ tab components but:
//   - Scoped to the logged-in user's tenant_id (RLS enforces this)
//   - Platform section hidden (no Tenants, no Fraud, no SaaS billing)
//   - Food & Bev hidden for cannabis_retail industry profile
//   - Header shows tenant brand name, not "HQ Command Centre"
//   - "← HQ" back button for operator users (is_operator = true)
//
// DO NOT MODIFY HQDashboard.js — this is a separate file.
// Tab components are reused unchanged — RLS scopes their data automatically.

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "../services/tenantService";

// ── Shared components ─────────────────────────────────────────────────────
import AppShell from "../components/AppShell";
import NavSidebar from "../components/NavSidebar";
import ProteaAI from "../components/ProteaAI";
import DevErrorCapture from "../components/DevErrorCapture";
import PlatformBar from "../components/PlatformBar";

// ── HQ Tab components (reused — RLS scopes data to tenant automatically) ─
import HQOverview from "../components/hq/HQOverview";
import HQSupplyChain from "../components/hq/SupplyChain";
import HQSuppliers from "../components/hq/HQSuppliers";
import HQPurchaseOrders from "../components/hq/HQPurchaseOrders";
import HQProduction from "../components/hq/HQProduction";
import HQStock from "../components/hq/HQStock";
import HQTransfer from "../components/hq/HQTransfer";
import Distribution from "../components/hq/Distribution";
import HQPricing from "../components/hq/HQPricing";
import HQCogs from "../components/hq/HQCogs";
import HQProfitLoss from "../components/hq/HQProfitLoss";
import HQInvoices from "../components/hq/HQInvoices";
import HQDocuments from "../components/hq/HQDocuments";
import HQAnalytics from "../components/hq/HQAnalytics";
import HQRetailerHealth from "../components/hq/RetailerHealth";
import HQReorderScoring from "../components/hq/HQReorderScoring";
import HQWholesaleOrders from "../components/hq/HQWholesaleOrders";
import HQLoyalty from "../components/hq/HQLoyalty";
import HRStaffDirectory from "../components/hq/HRStaffDirectory";
import ShopManager from "../components/hq/ShopManager";

// ── Theme ─────────────────────────────────────────────────────────────────
const T = {
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  ink900: "#0D0D0D",
  ink400: "#6B6B6B",
  ink150: "#E2E2E2",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
};

// ── Tab definitions per industry profile ─────────────────────────────────
// cannabis_retail: full cannabis stack, no food & bev, no platform admin
// food_beverage:   food stack — handled in HQDashboard (operator builds for them)
// general_retail:  basic ops stack

const CANNABIS_TABS = [
  // OPERATIONS
  { id: "overview", label: "Overview", section: "OPERATIONS", icon: "○" },
  {
    id: "supply-chain",
    label: "Supply chain",
    section: "OPERATIONS",
    icon: "◇",
  },
  { id: "suppliers", label: "Suppliers", section: "OPERATIONS", icon: "○" },
  { id: "procurement", label: "Procurement", section: "OPERATIONS", icon: "◇" },
  { id: "production", label: "Production", section: "OPERATIONS", icon: "○" },
  { id: "stock", label: "HQ Stock", section: "OPERATIONS", icon: "≡" },
  { id: "transfers", label: "Transfers", section: "OPERATIONS", icon: "≡" },
  {
    id: "distribution",
    label: "Distribution",
    section: "OPERATIONS",
    icon: "●",
  },
  // FINANCE
  { id: "pricing", label: "Pricing", section: "FINANCE", icon: "●" },
  { id: "costing", label: "Costing", section: "FINANCE", icon: "⊞" },
  { id: "pl", label: "P&L", section: "FINANCE", icon: "≡" },
  { id: "invoices", label: "Invoices", section: "FINANCE", icon: "⊟" },
  { id: "documents", label: "Documents", section: "FINANCE", icon: "≡" },
  // INTELLIGENCE
  { id: "analytics", label: "Analytics", section: "INTELLIGENCE", icon: "▲" },
  {
    id: "retailer-health",
    label: "Retailer health",
    section: "INTELLIGENCE",
    icon: "⊕",
  },
  { id: "reorder", label: "Reorder", section: "INTELLIGENCE", icon: "○" },
  // PLATFORM (tenant-level only — no Tenants/Fraud/Medical)
  {
    id: "wholesale-orders",
    label: "Wholesale Orders",
    section: "PLATFORM",
    icon: "⊞",
  },
  { id: "loyalty", label: "Loyalty", section: "PLATFORM", icon: "◆" },
  // PEOPLE
  { id: "hr", label: "HR", section: "PEOPLE", icon: "○" },
  { id: "shops", label: "Shops", section: "PEOPLE", icon: "○" },
];

const GENERAL_TABS = [
  { id: "overview", label: "Overview", section: "OPERATIONS", icon: "○" },
  {
    id: "supply-chain",
    label: "Supply chain",
    section: "OPERATIONS",
    icon: "◇",
  },
  { id: "suppliers", label: "Suppliers", section: "OPERATIONS", icon: "○" },
  { id: "procurement", label: "Procurement", section: "OPERATIONS", icon: "◇" },
  { id: "stock", label: "HQ Stock", section: "OPERATIONS", icon: "≡" },
  {
    id: "distribution",
    label: "Distribution",
    section: "OPERATIONS",
    icon: "●",
  },
  { id: "pricing", label: "Pricing", section: "FINANCE", icon: "●" },
  { id: "costing", label: "Costing", section: "FINANCE", icon: "⊞" },
  { id: "pl", label: "P&L", section: "FINANCE", icon: "≡" },
  { id: "invoices", label: "Invoices", section: "FINANCE", icon: "⊟" },
  { id: "documents", label: "Documents", section: "FINANCE", icon: "≡" },
  { id: "analytics", label: "Analytics", section: "INTELLIGENCE", icon: "▲" },
  { id: "loyalty", label: "Loyalty", section: "PLATFORM", icon: "◆" },
  { id: "hr", label: "HR", section: "PEOPLE", icon: "○" },
  { id: "shops", label: "Shops", section: "PEOPLE", icon: "○" },
];

function getTabsForProfile(profile) {
  if (profile === "cannabis_retail" || profile === "cannabis_dispensary")
    return CANNABIS_TABS;
  return GENERAL_TABS;
}

// ── Industry profile badge ────────────────────────────────────────────────
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
  food_beverage: { label: "Food & Beverage", color: "#92400E", bg: "#FFFBEB" },
  general_retail: { label: "General Retail", color: "#1E3A5F", bg: "#EFF6FF" },
  mixed_retail: { label: "Mixed Retail", color: "#6B21A8", bg: "#FAF5FF" },
};

// ── Tab renderer ──────────────────────────────────────────────────────────
function renderTab(tabId, tenantId) {
  switch (tabId) {
    case "overview":
      return <HQOverview />;
    case "supply-chain":
      return <HQSupplyChain />;
    case "suppliers":
      return <HQSuppliers />;
    case "procurement":
      return <HQPurchaseOrders />;
    case "production":
      return <HQProduction />;
    case "stock":
      return <HQStock />;
    case "transfers":
      return <HQTransfer />;
    case "distribution":
      return <Distribution />;
    case "pricing":
      return <HQPricing />;
    case "costing":
      return <HQCogs />;
    case "pl":
      return <HQProfitLoss />;
    case "invoices":
      return <HQInvoices />;
    case "documents":
      return <HQDocuments />;
    case "analytics":
      return <HQAnalytics />;
    case "retailer-health":
      return <HQRetailerHealth tenantId={tenantId} />;
    case "reorder":
      return <HQReorderScoring />;
    case "wholesale-orders":
      return <HQWholesaleOrders />;
    case "loyalty":
      return <HQLoyalty />;
    case "hr":
      return <HRStaffDirectory />;
    case "shops":
      return <ShopManager />;
    default:
      return (
        <div style={{ padding: 40, color: T.ink400, fontFamily: T.font }}>
          Tab not found: {tabId}
        </div>
      );
  }
}

// ── Main component ────────────────────────────────────────────────────────
export default function TenantPortal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, tenantId, industryProfile, isOperator } = useTenant();

  const tabs = getTabsForProfile(industryProfile);
  const defaultTab = tabs[0]?.id || "overview";
  const activeTab = searchParams.get("tab") || defaultTab;

  const setActiveTab = useCallback(
    (tabId) => {
      setSearchParams({ tab: tabId }, { replace: true });
    },
    [setSearchParams],
  );

  // Ensure active tab is valid for this profile
  useEffect(() => {
    const validIds = tabs.map((t) => t.id);
    if (!validIds.includes(activeTab)) {
      setActiveTab(defaultTab);
    }
  }, [activeTab, tabs, defaultTab, setActiveTab]);

  const profileBadge =
    PROFILE_BADGE[industryProfile] || PROFILE_BADGE.general_retail;

  // Group tabs by section for sidebar rendering
  const sections = tabs.reduce((acc, tab) => {
    if (!acc[tab.section]) acc[tab.section] = [];
    acc[tab.section].push(tab);
    return acc;
  }, {});

  const tenantName = tenant?.name || "Tenant Portal";

  return (
    <DevErrorCapture>
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          fontFamily: T.font,
        }}
      >
        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <div
          style={{
            width: 220,
            minWidth: 220,
            background: "#fff",
            borderRight: `1px solid ${T.ink150}`,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {/* Tenant header */}
          <div
            style={{
              padding: "20px 16px 12px",
              borderBottom: `1px solid ${T.ink150}`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: T.accent,
                fontFamily: T.font,
                marginBottom: 4,
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
                  display: "block",
                  marginTop: 10,
                  fontSize: 10,
                  color: T.ink400,
                  background: "transparent",
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontFamily: T.font,
                  width: "100%",
                  textAlign: "left",
                }}
              >
                ← HQ Operator View
              </button>
            )}
          </div>

          {/* Nav sections */}
          <div style={{ flex: 1, padding: "8px 0" }}>
            {Object.entries(sections).map(([section, sectionTabs]) => (
              <div key={section}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: T.ink400,
                    padding: "12px 16px 4px",
                  }}
                >
                  {section}
                </div>
                {sectionTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "8px 16px",
                      background:
                        activeTab === tab.id ? "#E8F5EE" : "transparent",
                      borderLeft:
                        activeTab === tab.id
                          ? `3px solid ${T.accentMid}`
                          : "3px solid transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: T.font,
                      fontSize: 13,
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      color: activeTab === tab.id ? T.accent : "#444",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 11, opacity: 0.6, minWidth: 14 }}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* ProteaAI button */}
          <div
            style={{ padding: "12px 16px", borderTop: `1px solid ${T.ink150}` }}
          >
            <div style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
              Tenant ID: {tenantId?.slice(0, 8)}…
            </div>
          </div>
        </div>

        {/* ── Main content ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", background: "#FAFAF9" }}>
          {/* Platform bar */}
          <PlatformBar tenantId={tenantId} />

          {/* Content */}
          <div
            style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}
          >
            {renderTab(activeTab, tenantId)}
          </div>
        </div>

        {/* ProteaAI floating */}
        <ProteaAI />
      </div>
    </DevErrorCapture>
  );
}
