// src/components/hq/ShopManager.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SHOP MANAGER — Phase 2B
//
// Full tenant CRUD:
//   - List all tenants with status, user count, stats
//   - Create new shop tenant (name, slug auto-generated)
//   - Toggle active/inactive
//   - View tenant details + assigned users
//   - Edit tenant name/slug/branding
//
// Design: Cream aesthetic per Section 7 of handover.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

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
  red: "#c0392b",
};

export default function ShopManager() {
  const { reload: reloadTenants } = useTenant();
  const [tenants, setTenants] = useState([]);
  const [tenantUsers, setTenantUsers] = useState({}); // { tenantId: [users] }
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  // ── Fetch all tenants + user counts ─────────────────────────────────
  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("type", { ascending: false })
        .order("name");

      if (error) throw error;

      // For each tenant, count users
      const userCounts = {};
      if (data && data.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("tenant_id, role");

        if (profiles) {
          profiles.forEach((p) => {
            if (!p.tenant_id) return;
            if (!userCounts[p.tenant_id])
              userCounts[p.tenant_id] = {
                total: 0,
                admin: 0,
                customer: 0,
                retailer: 0,
              };
            userCounts[p.tenant_id].total++;
            userCounts[p.tenant_id][p.role] =
              (userCounts[p.tenant_id][p.role] || 0) + 1;
          });
        }
      }

      setTenants(data || []);
      setTenantUsers(userCounts);
    } catch (err) {
      console.error("[ShopManager] Fetch error:", err);
      showMessage("error", "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // ── Toggle tenant active/inactive ───────────────────────────────────
  const toggleTenantActive = async (tenant) => {
    if (tenant.type === "hq") {
      showMessage("error", "Cannot deactivate HQ tenant");
      return;
    }

    try {
      const { error } = await supabase
        .from("tenants")
        .update({ is_active: !tenant.is_active })
        .eq("id", tenant.id);

      if (error) throw error;

      showMessage(
        "success",
        `${tenant.name} ${tenant.is_active ? "deactivated" : "activated"}`,
      );
      fetchTenants();
      reloadTenants();
    } catch (err) {
      console.error("[ShopManager] Toggle error:", err);
      showMessage("error", "Failed to update tenant status");
    }
  };

  // ── Delete tenant (only non-HQ, inactive tenants) ──────────────────
  const deleteTenant = async (tenant) => {
    if (tenant.type === "hq") {
      showMessage("error", "Cannot delete HQ tenant");
      return;
    }
    if (tenant.is_active) {
      showMessage("error", "Deactivate the tenant before deleting");
      return;
    }

    const userCount = tenantUsers[tenant.id]?.total || 0;
    if (userCount > 0) {
      showMessage("error", `Cannot delete — ${userCount} users still assigned`);
      return;
    }

    if (!window.confirm(`Delete "${tenant.name}"? This cannot be undone.`))
      return;

    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenant.id);

      if (error) throw error;

      showMessage("success", `${tenant.name} deleted`);
      setExpandedTenant(null);
      fetchTenants();
      reloadTenants();
    } catch (err) {
      console.error("[ShopManager] Delete error:", err);
      showMessage("error", "Failed to delete tenant");
    }
  };

  // ── Load users for expanded tenant ─────────────────────────────────
  const loadTenantUsersList = async (tenantId) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, full_name, role, loyalty_points, loyalty_tier")
      .eq("tenant_id", tenantId)
      .order("role");
    return data || [];
  };

  // ── Expand tenant detail ───────────────────────────────────────────
  const handleExpand = async (tenantId) => {
    if (expandedTenant === tenantId) {
      setExpandedTenant(null);
      return;
    }
    setExpandedTenant(tenantId);
  };

  // ── Message helper ─────────────────────────────────────────────────
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            border: `3px solid ${C.border}`,
            borderTopColor: C.primaryDark,
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Loading shops…
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* ── Message Toast ───────────────────────────────────────── */}
      {message && (
        <div
          style={{
            background:
              message.type === "success" ? "rgba(82,183,136,0.1)" : "#fdf2f2",
            border: `1px solid ${message.type === "success" ? C.accentGreen : "#fecaca"}`,
            borderRadius: "2px",
            padding: "10px 16px",
            marginBottom: "16px",
            color: message.type === "success" ? C.primaryDark : C.red,
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {message.type === "success" ? "✓" : "✕"} {message.text}
          </span>
          <button
            onClick={() => setMessage(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              fontSize: "16px",
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Header + Create Button ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <p style={{ color: C.muted, fontSize: "13px", margin: 0 }}>
            {tenants.length} tenant{tenants.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: C.primaryDark,
            color: C.white,
            border: "none",
            borderRadius: "2px",
            padding: "10px 20px",
            cursor: "pointer",
            fontFamily: "Jost, sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.target.style.background = C.primaryMid)}
          onMouseLeave={(e) => (e.target.style.background = C.primaryDark)}
        >
          {showCreateForm ? "✕ Cancel" : "+ New Shop"}
        </button>
      </div>

      {/* ── Create Form ─────────────────────────────────────────── */}
      {showCreateForm && (
        <CreateTenantForm
          onCreated={() => {
            setShowCreateForm(false);
            fetchTenants();
            reloadTenants();
            showMessage("success", "New shop created");
          }}
          onError={(msg) => showMessage("error", msg)}
        />
      )}

      {/* ── Tenant List ─────────────────────────────────────────── */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        {tenants.map((tenant, i) => (
          <TenantRow
            key={tenant.id}
            tenant={tenant}
            userCount={
              tenantUsers[tenant.id] || {
                total: 0,
                admin: 0,
                customer: 0,
                retailer: 0,
              }
            }
            isExpanded={expandedTenant === tenant.id}
            isLast={i === tenants.length - 1}
            onToggleExpand={() => handleExpand(tenant.id)}
            onToggleActive={() => toggleTenantActive(tenant)}
            onDelete={() => deleteTenant(tenant)}
            loadUsers={() => loadTenantUsersList(tenant.id)}
          />
        ))}
        {tenants.length === 0 && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: C.muted,
              fontSize: "13px",
            }}
          >
            No tenants found
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Tenant Form ──────────────────────────────────────────────────

function CreateTenantForm({ onCreated, onError }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate slug from name (unless manually edited)
  const handleNameChange = (val) => {
    setName(val);
    if (!slugEdited) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      );
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      onError("Shop name is required");
      return;
    }
    if (!slug.trim()) {
      onError("Slug is required");
      return;
    }
    if (slug.length < 3) {
      onError("Slug must be at least 3 characters");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("tenants").insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        type: "shop",
        branding: {
          primary_color: "#1b4332",
          accent_color: "#b5935a",
          logo: null,
        },
      });

      if (error) {
        if (error.code === "23505") {
          onError(`Slug "${slug}" already exists — choose a different one`);
        } else {
          throw error;
        }
        return;
      }

      onCreated();
    } catch (err) {
      console.error("[ShopManager] Create error:", err);
      onError("Failed to create shop");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: C.warmBg,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "24px",
        marginBottom: "20px",
      }}
    >
      <h4
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "18px",
          fontWeight: 300,
          color: C.primaryDark,
          margin: "0 0 16px 0",
        }}
      >
        Create New Shop
      </h4>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div>
          <label style={labelStyle}>Shop Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Green Leaf Dispensary"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Slug (URL identifier)
            {!slugEdited && (
              <span
                style={{ color: C.muted, fontWeight: 300, marginLeft: "4px" }}
              >
                auto
              </span>
            )}
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder="e.g. green-leaf"
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12px" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background: C.primaryDark,
            color: C.white,
            border: "none",
            borderRadius: "2px",
            padding: "10px 24px",
            cursor: submitting ? "wait" : "pointer",
            fontFamily: "Jost, sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Creating…" : "Create Shop"}
        </button>
        <p
          style={{
            color: C.muted,
            fontSize: "11px",
            margin: "auto 0",
            fontStyle: "italic",
          }}
        >
          New shops start as active. Assign users after creation.
        </p>
      </div>
    </div>
  );
}

// ── Tenant Row (expandable) ─────────────────────────────────────────────

function TenantRow({
  tenant,
  userCount,
  isExpanded,
  isLast,
  onToggleExpand,
  onToggleActive,
  onDelete,
  loadUsers,
}) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const handleExpand = async () => {
    onToggleExpand();
    if (!isExpanded) {
      setLoadingUsers(true);
      const data = await loadUsers();
      setUsers(data);
      setLoadingUsers(false);
    }
  };

  return (
    <div
      style={{
        borderBottom: isLast ? "none" : `1px solid ${C.border}`,
      }}
    >
      {/* ── Main Row ──────────────────────────────────────────── */}
      <div
        onClick={handleExpand}
        style={{
          padding: "14px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 120px 100px 80px 120px",
          alignItems: "center",
          cursor: "pointer",
          transition: "background 0.1s",
          background: isExpanded ? C.warmBg : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.background = "#fefdfb";
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.background = "transparent";
        }}
      >
        {/* Name + Type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: C.text,
            }}
          >
            {tenant.name}
          </span>
          <span
            style={{
              background:
                tenant.type === "hq"
                  ? "rgba(82,183,136,0.15)"
                  : "rgba(181,147,90,0.15)",
              color: tenant.type === "hq" ? C.accentGreen : C.gold,
              padding: "2px 8px",
              borderRadius: "2px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {tenant.type}
          </span>
        </div>

        {/* Slug */}
        <span
          style={{ fontFamily: "monospace", fontSize: "11px", color: C.muted }}
        >
          {tenant.slug}
        </span>

        {/* Users */}
        <span style={{ fontSize: "12px", color: C.text }}>
          {userCount.total} user{userCount.total !== 1 ? "s" : ""}
        </span>

        {/* Status */}
        <span
          style={{
            color: tenant.is_active ? C.accentGreen : C.red,
            fontSize: "11px",
            fontWeight: 500,
          }}
        >
          {tenant.is_active ? "● Active" : "○ Off"}
        </span>

        {/* Expand arrow */}
        <span
          style={{
            textAlign: "right",
            color: C.muted,
            fontSize: "12px",
            transform: isExpanded ? "rotate(90deg)" : "none",
            transition: "transform 0.15s",
            display: "inline-block",
          }}
        >
          ▸
        </span>
      </div>

      {/* ── Expanded Detail ───────────────────────────────────── */}
      {isExpanded && (
        <div
          style={{
            background: C.warmBg,
            padding: "16px 20px 20px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {/* Left: Tenant Info */}
            <div>
              <h4
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  margin: "0 0 10px 0",
                }}
              >
                Tenant Details
              </h4>
              <div style={{ fontSize: "12px", lineHeight: 1.8, color: C.text }}>
                <div>
                  <strong>ID:</strong>{" "}
                  <code style={{ fontSize: "10px", color: C.muted }}>
                    {tenant.id}
                  </code>
                </div>
                <div>
                  <strong>Slug:</strong> {tenant.slug}
                </div>
                <div>
                  <strong>Type:</strong> {tenant.type}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {tenant.created_at
                    ? new Date(tenant.created_at).toLocaleDateString()
                    : "—"}
                </div>
                <div>
                  <strong>Users:</strong> {userCount.admin} admin,{" "}
                  {userCount.customer} customer, {userCount.retailer} retailer
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                {tenant.type !== "hq" && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleActive();
                      }}
                      style={{
                        background: tenant.is_active
                          ? "rgba(192,57,43,0.1)"
                          : "rgba(82,183,136,0.1)",
                        color: tenant.is_active ? C.red : C.accentGreen,
                        border: `1px solid ${tenant.is_active ? "#fecaca" : C.accentGreen}`,
                        borderRadius: "2px",
                        padding: "6px 14px",
                        cursor: "pointer",
                        fontFamily: "Jost, sans-serif",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {tenant.is_active ? "Deactivate" : "Activate"}
                    </button>
                    {!tenant.is_active && userCount.total === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        style={{
                          background: "rgba(192,57,43,0.1)",
                          color: C.red,
                          border: "1px solid #fecaca",
                          borderRadius: "2px",
                          padding: "6px 14px",
                          cursor: "pointer",
                          fontFamily: "Jost, sans-serif",
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right: Users List */}
            <div>
              <h4
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  margin: "0 0 10px 0",
                }}
              >
                Assigned Users
              </h4>
              {loadingUsers ? (
                <span style={{ color: C.muted, fontSize: "12px" }}>
                  Loading…
                </span>
              ) : users.length === 0 ? (
                <span
                  style={{
                    color: C.muted,
                    fontSize: "12px",
                    fontStyle: "italic",
                  }}
                >
                  No users assigned
                </span>
              ) : (
                <div style={{ fontSize: "12px" }}>
                  {users.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "4px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <span>{u.full_name || "Unnamed"}</span>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            background:
                              u.role === "admin"
                                ? "rgba(181,147,90,0.15)"
                                : "rgba(82,183,136,0.15)",
                            color: u.role === "admin" ? C.gold : C.accentGreen,
                            padding: "1px 6px",
                            borderRadius: "2px",
                            fontSize: "9px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                          }}
                        >
                          {u.role}
                        </span>
                        {u.loyalty_points > 0 && (
                          <span style={{ color: C.gold, fontSize: "11px" }}>
                            {u.loyalty_points} pts
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────────

const labelStyle = {
  display: "block",
  fontFamily: "Jost, sans-serif",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#888",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e8e0d4",
  borderRadius: "2px",
  fontFamily: "Jost, sans-serif",
  fontSize: "13px",
  color: "#1a1a1a",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};
