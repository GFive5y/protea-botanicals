// src/components/group/GroupPortal.js
// WP-TENANT-GROUPS Phase 2 — skeleton: sidebar nav + tab router
// Prerequisite: WP-DS-6 Phase 1 tokens (d93ef9e) — all layout via T.*
//
// This is the root component for /group-portal. It:
//   1. Fetches the user's group on mount (tenant_group_members → tenant_groups)
//   2. Renders a sidebar (T.sidebar.expanded) with nav + member list
//   3. Routes tab content via ?tab= query param (default "dashboard")
//   4. Shows placeholders for each tab — real components arrive in Phase 3+
//   5. Shows an empty state if the tenant is not in any group
//
// Tabs: dashboard | transfers | compare | financials | loyalty | settings
// Container: T.container.wide (1400px centred)
// Tokens: T.sidebar.expanded · T.inset.page · T.page.sectionGap · T.inset.card

import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTenant } from "../../services/tenantService";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
import NetworkDashboard from "./NetworkDashboard";
import GroupTransfer from "./GroupTransfer";
import GroupSettings from "./GroupSettings";
import StoreComparison from "./StoreComparison";
import CombinedPL from "./CombinedPL";
import RevenueIntelligence from "./RevenueIntelligence";
import StockIntelligence from "./StockIntelligence";
import CustomerIntelligence from "./CustomerIntelligence";
import NetworkIntelligence from "./NetworkIntelligence";

// ─── Industry profile badge map ──────────────────────────────────────────────
const PROFILE_BADGE = {
  cannabis_retail:     { label: "RETAIL",     bg: "#E8F5EE", color: "#1A3D2B" },
  cannabis_dispensary: { label: "DISPENSARY", bg: "#EFF6FF", color: "#1E3A5F" },
  food_beverage:       { label: "F&B",        bg: "#FFFBEB", color: "#92400E" },
  general_retail:      { label: "GENERAL",    bg: "#F5F5F5", color: "#424242" },
  operator:            { label: "HQ",         bg: "#F3F0FF", color: "#4C1D95" },
};

// ─── Nav items ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",  label: "Network Dashboard" },
  { id: "transfers",  label: "Stock Transfers" },
  { id: "compare",    label: "Compare Stores" },
  { id: "financials", label: "Combined P&L" },
  { id: "revenue",    label: "Revenue Intelligence" },
  { id: "stock",      label: "Stock Intelligence" },
  { id: "customers",  label: "Customer Intelligence" },
  { id: "network",    label: "Network Intelligence" },
  { id: "loyalty",    label: "Shared Loyalty", disabled: true }, // Phase 2+
  { id: "settings",   label: "Group Settings" },
];

export default function GroupPortal() {
  const { tenantId, isHQ, switchTenant, allTenants } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState(null);
  const [groupType, setGroupType] = useState(null);
  const [groupRoyaltyPct, setGroupRoyaltyPct] = useState(0);
  const [members, setMembers] = useState([]);
  const [switchingTo, setSwitchingTo] = useState(null); // tenant_id being switched to

  // Active tab from ?tab= query param — default "dashboard"
  const params = new URLSearchParams(location.search);
  const activeTab = params.get("tab") || "dashboard";

  // ── Fetch the user's group + members ──────────────────────────────────────
  const fetchGroup = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      // Step 1: find a group where this tenant is a member. royalty_percentage
      // is included in the subselect so Module 6 NetworkIntelligence can use
      // it via the groupMeta prop without a second round-trip (WP-A6 Step 0
      // confirmed the column exists on tenant_groups as numeric).
      const { data: membershipData, error: membershipErr } = await supabase
        .from("tenant_group_members")
        .select("group_id, role, tenant_groups(id, name, group_type, royalty_percentage)")
        .eq("tenant_id", tenantId)
        .limit(1);

      if (membershipErr) throw membershipErr;

      if (!membershipData || membershipData.length === 0) {
        // No group found — render empty state
        setGroupId(null);
        setGroupName(null);
        setGroupType(null);
        setGroupRoyaltyPct(0);
        setMembers([]);
        return;
      }

      const membership = membershipData[0];
      const group = membership.tenant_groups;
      setGroupId(group.id);
      setGroupName(group.name);
      setGroupType(group.group_type);
      setGroupRoyaltyPct(parseFloat(group.royalty_percentage) || 0);

      // Step 2: fetch all members of the group (joined to tenants for store names)
      const { data: memberData, error: memberErr } = await supabase
        .from("tenant_group_members")
        .select("tenant_id, role, joined_at, tenants(name, industry_profile)")
        .eq("group_id", group.id)
        .order("joined_at", { ascending: true });

      if (memberErr) throw memberErr;
      setMembers(memberData || []);
    } catch (err) {
      console.error("[GroupPortal] fetchGroup failed:", err);
      setError(err.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // ── Tab switcher ──────────────────────────────────────────────────────────
  const handleNavClick = (tabId) => {
    navigate(`/group-portal?tab=${tabId}`);
  };

  // ── Store switcher (HQ only) ─────────────────────────────────────────────
  // Finds the full tenant object from allTenants (already loaded by TenantService
  // for HQ users). Falls back to a Supabase fetch if not yet in allTenants.
  const handleStoreSwitch = async (memberTenantId, memberTenantName) => {
    if (!isHQ || switchingTo) return;
    setSwitchingTo(memberTenantId);
    try {
      let tenantObj = (allTenants || []).find((t) => t.id === memberTenantId);
      if (!tenantObj) {
        const { data } = await import("../../services/supabaseClient").then(
          (m) => m.supabase.from("tenants").select("*").eq("id", memberTenantId).single()
        );
        tenantObj = data;
      }
      if (tenantObj) {
        await switchTenant(tenantObj);
        navigate("/tenant-portal");
      }
    } catch (err) {
      console.error("[GroupPortal] store switch failed:", err);
    } finally {
      setSwitchingTo(null);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: T.font,
          fontSize: T.text.base,
          color: T.ink600,
        }}
      >
        Loading network…
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          maxWidth: T.container.wide,
          margin: "0 auto",
          padding: T.inset.page,
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            background: T.dangerLight,
            border: `1px solid ${T.dangerBorder}`,
            borderRadius: T.radius.md,
            padding: T.inset.card,
            color: T.dangerText,
            fontSize: T.text.base,
          }}
        >
          <strong>Could not load network:</strong> {error}
        </div>
      </div>
    );
  }

  // ── Empty state: tenant is not part of any group ──────────────────────────
  if (!groupId) {
    return (
      <div
        style={{
          maxWidth: T.container.wide,
          margin: "0 auto",
          padding: T.inset.page,
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            padding: T.pad.xl,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: T.text["2xl"],
              fontWeight: T.weight.semibold,
              color: T.ink900,
              marginBottom: T.gap.md,
            }}
          >
            You are not part of any group yet
          </div>
          <div
            style={{
              fontSize: T.text.base,
              color: T.ink600,
              lineHeight: 1.6,
            }}
          >
            The Group Portal is where franchise owners manage multiple stores
            from one place. Ask your franchisor to add you to their network,
            or contact NuAi support to create a new group.
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout: sidebar + content ────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: T.container.wide,
        margin: "0 auto",
        minHeight: "calc(100vh - 56px)", // 56px reserved for top nav bar
        display: "flex",
        flexDirection: "row",
        fontFamily: T.font,
        background: T.bg,
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: T.sidebar.expanded,
          flexShrink: 0,
          background: T.surface,
          borderRight: `1px solid ${T.border}`,
          padding: T.inset.card,
          display: "flex",
          flexDirection: "column",
          gap: T.gap.xl,
        }}
      >
        {/* Group brand header */}
        <div>
          <div
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.semibold,
              color: T.ink400,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: T.gap.xs,
            }}
          >
            {groupType}
          </div>
          <div
            style={{
              fontSize: T.text.lg,
              fontWeight: T.weight.bold,
              color: T.ink900,
              marginBottom: T.gap.sm,
            }}
          >
            {groupName}
          </div>
          <div
            style={{
              fontSize: T.text.sm,
              color: T.ink600,
            }}
          >
            {members.length} store{members.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Nav items */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: T.gap.xs,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isDisabled = !!item.disabled;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => !isDisabled && handleNavClick(item.id)}
                disabled={isDisabled}
                style={{
                  textAlign: "left",
                  padding: `${T.pad.sm}px ${T.pad.md}px`,
                  borderRadius: T.radius.md,
                  border: "none",
                  background: isActive ? T.accentLight : "transparent",
                  color: isDisabled
                    ? T.ink400
                    : isActive
                      ? T.accentText
                      : T.ink700,
                  fontFamily: T.font,
                  fontSize: T.text.sm,
                  fontWeight: isActive ? T.weight.semibold : T.weight.medium,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.6 : 1,
                }}
              >
                {item.label}
                {isDisabled && (
                  <span
                    style={{
                      fontSize: T.text.xs,
                      marginLeft: T.gap.sm,
                      color: T.ink400,
                    }}
                  >
                    · Phase 2
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Member store list — clickable for HQ users (switchTenant) */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: T.pad.lg,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: T.text.xs,
              fontWeight: T.weight.semibold,
              color: T.ink400,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: T.gap.xs,
            }}
          >
            My Stores
            {isHQ && (
              <span style={{ marginLeft: 6, fontSize: 9, color: T.ink400, fontWeight: 400, textTransform: "none" }}>
                · click to switch
              </span>
            )}
          </div>
          {members.map((m) => {
            const isActive    = m.tenant_id === tenantId;
            const isSwitching = switchingTo === m.tenant_id;
            const badge       = PROFILE_BADGE[m.tenants?.industry_profile] || PROFILE_BADGE.general_retail;
            const canSwitch   = isHQ && !isActive && !switchingTo;
            return (
              <button
                key={m.tenant_id}
                type="button"
                disabled={!canSwitch}
                onClick={() => canSwitch && handleStoreSwitch(m.tenant_id, m.tenants?.name)}
                title={isHQ && !isActive ? `Switch to ${m.tenants?.name || "this store"}` : undefined}
                style={{
                  textAlign: "left",
                  background: isActive ? T.accentLight : "transparent",
                  border: `1px solid ${isActive ? T.accentBd : "transparent"}`,
                  borderRadius: T.radius.md,
                  padding: "8px 10px",
                  cursor: canSwitch ? "pointer" : "default",
                  opacity: switchingTo && !isSwitching ? 0.45 : 1,
                  transition: "background 0.15s, opacity 0.15s",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                  <span style={{
                    fontSize: T.text.sm,
                    fontWeight: isActive ? T.weight.semibold : T.weight.medium,
                    color: isActive ? T.accentText : T.ink700,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {isSwitching ? "Switching\u2026" : (m.tenants?.name || "Unnamed store")}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 5px",
                    borderRadius: 3, flexShrink: 0,
                    background: badge.bg, color: badge.color,
                    letterSpacing: "0.05em",
                  }}>
                    {badge.label}
                  </span>
                </div>
                <div style={{ fontSize: T.text.xs, color: isActive ? T.accentMid : T.ink400, marginTop: 2 }}>
                  {m.role}{isActive ? " \u00b7 viewing" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: T.inset.page,
          display: "flex",
          flexDirection: "column",
          gap: T.page.sectionGap,
          overflow: "auto",
        }}
      >
        {activeTab === "dashboard" && (
          <NetworkDashboard
            groupId={groupId}
            groupName={groupName}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "transfers" && (
          <GroupTransfer
            groupId={groupId}
            groupName={groupName}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "compare" && (
          <StoreComparison
            groupId={groupId}
            groupName={groupName}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "financials" && (
          <CombinedPL
            groupId={groupId}
            groupName={groupName}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "revenue" && (
          <RevenueIntelligence
            groupId={groupId}
            groupName={groupName}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "stock" && (
          <StockIntelligence
            groupId={groupId}
            groupName={groupName}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "customers" && (
          <CustomerIntelligence
            groupId={groupId}
            groupName={groupName}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "network" && (
          <NetworkIntelligence
            groupId={groupId}
            groupName={groupName}
            groupMeta={{ royaltyPct: groupRoyaltyPct, groupName }}
            members={members}
            onNavigate={handleNavClick}
          />
        )}
        {activeTab === "loyalty" && (
          <PlaceholderTab
            title="Shared Loyalty"
            description="Customer earns at Store A, redeems at Store B. Requires loyalty_group_id schema addition. Phase 2."
          />
        )}
        {activeTab === "settings" && (
          <GroupSettings
            groupId={groupId}
            groupName={groupName}
            groupType={groupType}
            members={members}
            onGroupUpdated={fetchGroup}
            onNavigate={handleNavClick}
          />
        )}
      </main>
    </div>
  );
}

// ─── Placeholder tab component ───────────────────────────────────────────────
function PlaceholderTab({ title, description }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        padding: T.inset.modal,
        boxShadow: T.shadow.sm,
      }}
    >
      <div
        style={{
          fontSize: T.text["2xl"],
          fontWeight: T.weight.bold,
          color: T.ink900,
          marginBottom: T.gap.md,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: T.text.base,
          color: T.ink600,
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
    </div>
  );
}
