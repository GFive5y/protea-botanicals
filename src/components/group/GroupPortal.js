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

// ─── Nav items ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",  label: "Network Dashboard" },
  { id: "transfers",  label: "Stock Transfers" },
  { id: "compare",    label: "Compare Stores" },
  { id: "financials", label: "Combined P&L" },
  { id: "loyalty",    label: "Shared Loyalty", disabled: true }, // Phase 2+
  { id: "settings",   label: "Group Settings" },
];

export default function GroupPortal() {
  const { tenantId } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState(null);
  const [groupType, setGroupType] = useState(null);
  const [members, setMembers] = useState([]);

  // Active tab from ?tab= query param — default "dashboard"
  const params = new URLSearchParams(location.search);
  const activeTab = params.get("tab") || "dashboard";

  // ── Fetch the user's group + members ──────────────────────────────────────
  const fetchGroup = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      // Step 1: find a group where this tenant is a member
      const { data: membershipData, error: membershipErr } = await supabase
        .from("tenant_group_members")
        .select("group_id, role, tenant_groups(id, name, group_type)")
        .eq("tenant_id", tenantId)
        .limit(1);

      if (membershipErr) throw membershipErr;

      if (!membershipData || membershipData.length === 0) {
        // No group found — render empty state
        setGroupId(null);
        setGroupName(null);
        setGroupType(null);
        setMembers([]);
        return;
      }

      const membership = membershipData[0];
      const group = membership.tenant_groups;
      setGroupId(group.id);
      setGroupName(group.name);
      setGroupType(group.group_type);

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

        {/* Member store list */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: T.pad.lg,
            display: "flex",
            flexDirection: "column",
            gap: T.gap.sm,
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
          </div>
          {members.map((m) => (
            <div
              key={m.tenant_id}
              style={{
                fontSize: T.text.sm,
                color: T.ink700,
                padding: `${T.pad.xs}px 0`,
              }}
            >
              <div style={{ fontWeight: T.weight.medium }}>
                {m.tenants?.name || "Unnamed store"}
              </div>
              <div
                style={{
                  fontSize: T.text.xs,
                  color: T.ink400,
                  marginTop: 2,
                }}
              >
                {m.role} · {m.tenants?.industry_profile || "unknown"}
              </div>
            </div>
          ))}
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
          <PlaceholderTab
            title="Network Dashboard"
            description="NuAi insight bar · 4 combined KPI tiles · store comparison grid · quick actions. Coming in Phase 3."
          />
        )}
        {activeTab === "transfers" && (
          <PlaceholderTab
            title="Stock Transfers"
            description="Move stock between group stores. Reuses existing stock_transfers infrastructure. Coming in Phase 4."
          />
        )}
        {activeTab === "compare" && (
          <PlaceholderTab
            title="Compare Stores"
            description="Side-by-side comparison of revenue, margin, top products, stock efficiency. Coming in later phase."
          />
        )}
        {activeTab === "financials" && (
          <PlaceholderTab
            title="Combined P&L"
            description="Consolidated P&L across all group stores. Read-only. Coming in later phase."
          />
        )}
        {activeTab === "loyalty" && (
          <PlaceholderTab
            title="Shared Loyalty"
            description="Customer earns at Store A, redeems at Store B. Requires loyalty_group_id schema addition. Phase 2."
          />
        )}
        {activeTab === "settings" && (
          <PlaceholderTab
            title="Group Settings"
            description="Manage group membership, add/remove stores, configure group type. Coming in later phase."
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
