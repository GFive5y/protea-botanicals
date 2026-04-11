// src/components/group/GroupSettings.js
// WP-TENANT-GROUPS Phase 5 — Group identity, membership, and settings.
//
// Single-page settings surface for the franchise network:
//   1. Group Details (name / type / royalty rate)  — owner-only edits
//   2. Member Stores (read-only role display + owner-only remove)
//   3. Add a Store   (by tenant_id; email invite is Phase 5b — LL-243)
//   4. Danger Zone   (leave network — guarded)
//
// Props (from GroupPortal.js):
//   groupId         string
//   groupName       string
//   groupType       string
//   members[]       [{ tenant_id, role, joined_at, tenants: {...} }]
//   onGroupUpdated  () => void  — refetches GroupPortal state
//   onNavigate      (tabId) => void
//
// LL-206: direct useTenant destructure · LL-238: T.* tokens only
// LL-243: Email-based invite NOT supported — gap documented in UI

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { T } from "../../styles/tokens";

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_TYPES = [
  { value: "franchise", label: "Franchise" },
  { value: "corporate", label: "Corporate" },
  { value: "cooperative", label: "Cooperative" },
];

const OWNER_ROLES = ["franchisor", "owner"];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function industryBadgeTokens(profile) {
  switch (profile) {
    case "cannabis_dispensary":
      return { bg: T.infoLight, fg: T.infoText, label: "Dispensary" };
    case "cannabis_retail":
      return { bg: T.accentLight, fg: T.accentText, label: "Retail" };
    case "food_beverage":
      return { bg: T.warningLight, fg: T.warningText, label: "Food & Bev" };
    case "general_retail":
      return { bg: T.neutralLight, fg: T.neutralText, label: "Retail" };
    default:
      return { bg: T.neutralLight, fg: T.neutralText, label: profile || "—" };
  }
}

function roleBadgeTokens(role) {
  if (OWNER_ROLES.includes(role)) {
    return { bg: T.successLight, fg: T.successText, label: role };
  }
  return { bg: T.neutralLight, fg: T.neutralText, label: role || "member" };
}

function Pill({ bg, fg, children }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: fg,
        padding: `2px ${T.pad.sm}px`,
        borderRadius: T.radius.full,
        fontSize: T.text.xs,
        fontWeight: T.weight.medium,
        textTransform: "capitalize",
      }}
    >
      {children}
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function GroupSettings({
  groupId,
  groupName,
  groupType,
  members,
  onGroupUpdated,
  onNavigate,
}) {
  // eslint-disable-next-line no-unused-vars
  void onNavigate; // reserved for future cross-tab actions

  const { tenantId } = useTenant(); // LL-206 direct form

  // Identify the current user's role in the group. A user's "tenant" maps to
  // exactly one membership row; we look it up by tenant_id.
  const myMembership = (members || []).find((m) => m.tenant_id === tenantId);
  const myRole = myMembership?.role || null;
  const isOwner = OWNER_ROLES.includes(myRole);

  // Editable fields (initialised from props for name/type, fetched for royalty)
  const [editName, setEditName] = useState(groupName || "");
  const [editType, setEditType] = useState(groupType || "franchise");
  const [editRoyalty, setEditRoyalty] = useState(0);

  const [royaltyLoading, setRoyaltyLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add-member form state
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);

  // Remove confirm state (tenant_id being removed)
  const [removing, setRemoving] = useState(null);
  const [removingSelf, setRemovingSelf] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Keep local edit fields in sync if parent refetches
  useEffect(() => {
    setEditName(groupName || "");
  }, [groupName]);
  useEffect(() => {
    setEditType(groupType || "franchise");
  }, [groupType]);

  // Fetch royalty_percentage on mount (GroupPortal doesn't select it)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!groupId) return;
      setRoyaltyLoading(true);
      try {
        const { data, error } = await supabase
          .from("tenant_groups")
          .select("royalty_percentage")
          .eq("id", groupId)
          .single();
        if (error) throw error;
        if (!cancelled) {
          setEditRoyalty(Number(data?.royalty_percentage ?? 0));
        }
      } catch (err) {
        console.error("[GroupSettings] fetchRoyalty:", err);
      } finally {
        if (!cancelled) setRoyaltyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveGroup() {
    if (!isOwner) return;
    const name = editName.trim();
    if (!name) {
      showToast("Network name cannot be empty", "error");
      return;
    }
    const royalty = parseFloat(editRoyalty);
    if (Number.isNaN(royalty) || royalty < 0 || royalty > 100) {
      showToast("Royalty must be between 0 and 100", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_groups")
        .update({
          name,
          group_type: editType,
          royalty_percentage: royalty,
        })
        .eq("id", groupId);
      if (error) throw error;
      showToast("Group settings saved");
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      console.error("[GroupSettings] handleSaveGroup:", err);
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(memberTenantId) {
    // Hard guards
    if (!memberTenantId) return;
    if ((members || []).length <= 1) {
      showToast(
        "Cannot remove the last member of the network",
        "error",
      );
      return;
    }
    const target = (members || []).find((m) => m.tenant_id === memberTenantId);
    const isSelfRemoval = memberTenantId === tenantId;

    // Only owners may remove OTHER members. Self-removal is allowed only
    // through the Danger Zone "Leave network" action, which also guards
    // against the group owner leaving (they must transfer first).
    if (!isSelfRemoval && !isOwner) {
      showToast("Only the network owner can remove members", "error");
      return;
    }
    if (isSelfRemoval && isOwner) {
      showToast(
        "Network owners cannot leave — transfer ownership first",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("tenant_id", memberTenantId);
      if (error) throw error;

      const name = target?.tenants?.name || "Store";
      showToast(
        isSelfRemoval ? "You have left the network" : name + " removed from network",
      );
      setRemoving(null);
      setRemovingSelf(false);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      console.error("[GroupSettings] handleRemoveMember:", err);
      showToast("Remove failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember() {
    if (!isOwner) {
      showToast("Only the network owner can add members", "error");
      return;
    }
    const input = addInput.trim();
    if (!input) {
      showToast("Paste a Store ID first", "error");
      return;
    }
    if (!UUID_REGEX.test(input)) {
      showToast("That does not look like a valid Store ID", "error");
      return;
    }
    if ((members || []).some((m) => m.tenant_id === input)) {
      showToast("That store is already a member", "error");
      return;
    }

    setAdding(true);
    try {
      // Verify the tenant exists (RLS may still block, but a 0-row result
      // gives a cleaner error than a FK violation from the INSERT).
      const { data: tenantRow, error: tErr } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("id", input)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!tenantRow) {
        showToast("No store found with that ID", "error");
        setAdding(false);
        return;
      }

      const { error: insErr } = await supabase
        .from("tenant_group_members")
        .insert({
          group_id: groupId,
          tenant_id: input,
          role: "franchisee",
        });
      if (insErr) throw insErr;

      showToast(tenantRow.name + " added to the network");
      setAddInput("");
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      console.error("[GroupSettings] handleAddMember:", err);
      showToast("Add failed: " + err.message, "error");
    } finally {
      setAdding(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const canLeave =
    !!myMembership && !isOwner && (members || []).length > 1;
  const leaveBlockedReason = !myMembership
    ? null
    : isOwner
      ? "As the network owner, you cannot leave. Transfer ownership first or contact NuAi support."
      : (members || []).length <= 1
        ? "You are the only member. Add another store before leaving."
        : null;

  // ── Shared style fragments ───────────────────────────────────────────────

  const sectionLabelStyle = {
    fontSize: T.text.xs,
    fontWeight: T.weight.semibold,
    color: T.ink600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: T.gap.sm,
  };

  const cardStyle = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.lg,
    padding: T.inset.card,
  };

  const labelStyle = {
    fontSize: T.text.sm,
    fontWeight: T.weight.medium,
    color: T.ink700,
    marginBottom: T.gap.xs,
  };

  const inputStyle = {
    padding: T.pad.md,
    borderRadius: T.radius.md,
    border: `1px solid ${T.border}`,
    fontSize: T.text.base,
    fontFamily: T.font,
    background: T.surface,
    color: T.ink900,
    width: "100%",
  };

  const readOnlyInputStyle = {
    ...inputStyle,
    background: T.surfaceAlt,
    color: T.ink400,
    cursor: "not-allowed",
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: T.font }}>
      {/* ── Page header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: T.page.sectionGap }}>
        <div
          style={{
            fontSize: T.text["3xl"],
            fontWeight: T.weight.bold,
            color: T.ink900,
            marginBottom: T.gap.xs,
          }}
        >
          Group Settings
        </div>
        <div style={{ fontSize: T.text.base, color: T.ink600 }}>
          {groupName} · <span style={{ textTransform: "capitalize" }}>{groupType}</span>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: T.gap.xl,
            right: T.gap.xl,
            background:
              toast.type === "error" ? T.dangerLight : T.successLight,
            color: toast.type === "error" ? T.dangerText : T.successText,
            border: `1px solid ${
              toast.type === "error" ? T.dangerBorder : T.success
            }`,
            borderRadius: T.radius.md,
            padding: `${T.pad.md}px ${T.pad.lg}px`,
            fontSize: T.text.base,
            fontWeight: T.weight.medium,
            boxShadow: T.shadow.lg,
            zIndex: T.z.toast,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── SECTION 1 — Group Identity ─────────────────────────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        <div style={sectionLabelStyle}>Group Details</div>
        <div style={cardStyle}>
          {/* Field 1 — Network name */}
          <div style={{ marginBottom: T.gap.lg }}>
            <div style={labelStyle}>Network name</div>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={!isOwner || saving}
              style={isOwner ? inputStyle : readOnlyInputStyle}
            />
          </div>

          {/* Field 2 — Group type */}
          <div style={{ marginBottom: T.gap.lg }}>
            <div style={labelStyle}>Group type</div>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              disabled={!isOwner || saving}
              style={isOwner ? inputStyle : readOnlyInputStyle}
            >
              {GROUP_TYPES.map((gt) => (
                <option key={gt.value} value={gt.value}>
                  {gt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Field 3 — Royalty percentage */}
          <div style={{ marginBottom: T.gap.lg }}>
            <div style={labelStyle}>Royalty rate</div>
            <div
              style={{
                fontSize: T.text.xs,
                color: T.ink600,
                marginBottom: T.gap.sm,
              }}
            >
              Stored for future royalty calculations. Not yet applied
              automatically.
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: T.gap.sm,
                maxWidth: 240,
              }}
            >
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={royaltyLoading ? "" : editRoyalty}
                placeholder={royaltyLoading ? "Loading…" : "0"}
                onChange={(e) => setEditRoyalty(e.target.value)}
                disabled={!isOwner || saving || royaltyLoading}
                style={isOwner ? inputStyle : readOnlyInputStyle}
              />
              <div
                style={{
                  fontSize: T.text.lg,
                  color: T.ink600,
                  fontWeight: T.weight.medium,
                }}
              >
                %
              </div>
            </div>
          </div>

          {/* Save button or read-only note */}
          <div
            style={{
              marginTop: T.gap.xl,
              paddingTop: T.gap.lg,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            {isOwner ? (
              <button
                type="button"
                onClick={handleSaveGroup}
                disabled={saving || royaltyLoading}
                style={{
                  background: T.accent,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: T.radius.md,
                  padding: `${T.pad.md}px ${T.pad.xl}px`,
                  fontFamily: T.font,
                  fontSize: T.text.base,
                  fontWeight: T.weight.semibold,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            ) : (
              <div
                style={{
                  fontSize: T.text.xs,
                  color: T.ink400,
                  fontStyle: "italic",
                }}
              >
                Only the group owner can edit these settings.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION 2 — Member Stores ──────────────────────────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        <div style={sectionLabelStyle}>Member Stores</div>
        <div
          style={{
            fontSize: T.text.sm,
            color: T.ink600,
            marginBottom: T.gap.md,
          }}
        >
          {(members || []).length} store
          {(members || []).length !== 1 ? "s" : ""} in this network
        </div>

        <div style={{ ...cardStyle, padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: T.text.sm,
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    color: T.ink600,
                    background: T.surfaceAlt,
                  }}
                >
                  <th
                    style={{
                      padding: `${T.pad.md}px ${T.pad.lg}px`,
                      fontWeight: T.weight.semibold,
                    }}
                  >
                    Store
                  </th>
                  <th
                    style={{
                      padding: `${T.pad.md}px ${T.pad.lg}px`,
                      fontWeight: T.weight.semibold,
                    }}
                  >
                    Profile
                  </th>
                  <th
                    style={{
                      padding: `${T.pad.md}px ${T.pad.lg}px`,
                      fontWeight: T.weight.semibold,
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      padding: `${T.pad.md}px ${T.pad.lg}px`,
                      fontWeight: T.weight.semibold,
                    }}
                  >
                    Member since
                  </th>
                  <th
                    style={{
                      padding: `${T.pad.md}px ${T.pad.lg}px`,
                      fontWeight: T.weight.semibold,
                      textAlign: "right",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {(members || []).map((m) => {
                  const isSelf = m.tenant_id === tenantId;
                  const industry = industryBadgeTokens(
                    m.tenants?.industry_profile,
                  );
                  const roleT = roleBadgeTokens(m.role);
                  const canRemove =
                    isOwner &&
                    (members || []).length > 1 &&
                    !isSelf &&
                    !OWNER_ROLES.includes(m.role);
                  const isConfirming = removing === m.tenant_id;

                  return (
                    <React.Fragment key={m.tenant_id}>
                      <tr
                        style={{
                          borderTop: `1px solid ${T.border}`,
                          color: T.ink900,
                        }}
                      >
                        <td
                          style={{
                            padding: `${T.pad.md}px ${T.pad.lg}px`,
                            fontWeight: T.weight.medium,
                          }}
                        >
                          {m.tenants?.name || "Unnamed store"}
                          {isSelf && (
                            <span
                              style={{
                                marginLeft: T.gap.sm,
                                fontSize: T.text.xs,
                                color: T.ink400,
                                fontWeight: T.weight.normal,
                              }}
                            >
                              (you)
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: `${T.pad.md}px ${T.pad.lg}px`,
                          }}
                        >
                          <Pill bg={industry.bg} fg={industry.fg}>
                            {industry.label}
                          </Pill>
                        </td>
                        <td
                          style={{
                            padding: `${T.pad.md}px ${T.pad.lg}px`,
                          }}
                        >
                          <Pill bg={roleT.bg} fg={roleT.fg}>
                            {roleT.label}
                          </Pill>
                        </td>
                        <td
                          style={{
                            padding: `${T.pad.md}px ${T.pad.lg}px`,
                            color: T.ink600,
                          }}
                        >
                          {formatDate(m.joined_at)}
                        </td>
                        <td
                          style={{
                            padding: `${T.pad.md}px ${T.pad.lg}px`,
                            textAlign: "right",
                          }}
                        >
                          {canRemove ? (
                            <button
                              type="button"
                              onClick={() =>
                                setRemoving(
                                  isConfirming ? null : m.tenant_id,
                                )
                              }
                              disabled={saving}
                              style={{
                                background: T.dangerLight,
                                color: T.dangerText,
                                border: `1px solid ${T.dangerBorder}`,
                                borderRadius: T.radius.md,
                                padding: `${T.pad.xs}px ${T.pad.md}px`,
                                fontFamily: T.font,
                                fontSize: T.text.sm,
                                fontWeight: T.weight.medium,
                                cursor: saving ? "not-allowed" : "pointer",
                                opacity: saving ? 0.5 : 1,
                              }}
                            >
                              {isConfirming ? "Cancel" : "Remove"}
                            </button>
                          ) : (
                            <span style={{ color: T.ink400 }}>—</span>
                          )}
                        </td>
                      </tr>
                      {isConfirming && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              padding: `${T.pad.md}px ${T.pad.lg}px`,
                              background: T.warningLight,
                              borderTop: `1px solid ${T.warningBorder}`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: T.text.sm,
                                color: T.warningText,
                                marginBottom: T.gap.md,
                              }}
                            >
                              Remove{" "}
                              <strong>
                                {m.tenants?.name || "this store"}
                              </strong>{" "}
                              from this network? This does not delete the
                              store — it only removes it from the group.
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: T.gap.md,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveMember(m.tenant_id)
                                }
                                disabled={saving}
                                style={{
                                  background: T.danger,
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: T.radius.md,
                                  padding: `${T.pad.sm}px ${T.pad.lg}px`,
                                  fontFamily: T.font,
                                  fontSize: T.text.sm,
                                  fontWeight: T.weight.semibold,
                                  cursor: saving ? "not-allowed" : "pointer",
                                  opacity: saving ? 0.5 : 1,
                                }}
                              >
                                Confirm Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => setRemoving(null)}
                                disabled={saving}
                                style={{
                                  background: T.surface,
                                  color: T.ink700,
                                  border: `1px solid ${T.border}`,
                                  borderRadius: T.radius.md,
                                  padding: `${T.pad.sm}px ${T.pad.lg}px`,
                                  fontFamily: T.font,
                                  fontSize: T.text.sm,
                                  fontWeight: T.weight.medium,
                                  cursor: saving ? "not-allowed" : "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — Add Existing Store (OWNER-ONLY) ────────────── */}
      {/* Per Phase 5 addendum: franchisee members have no visibility of   */}
      {/* the Add Store form. The entire section is hidden unless isOwner. */}
      {isOwner && (
        <section style={{ marginBottom: T.page.sectionGap }}>
          <div style={sectionLabelStyle}>Add a Store</div>

          {/* Info note */}
          <div
            style={{
              background: T.infoLight,
              border: `1px solid ${T.info}`,
              borderRadius: T.radius.md,
              padding: T.inset.card,
              marginBottom: T.gap.lg,
              color: T.infoText,
              fontSize: T.text.sm,
              lineHeight: 1.6,
            }}
          >
            <strong>ℹ How this works.</strong> To add a store you need its
            Store ID (a UUID). The store must already exist on NuAi.
            Contact NuAi support or the store owner to get their Store ID.
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Store ID</div>
            <div
              style={{
                display: "flex",
                gap: T.gap.lg,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                placeholder="Paste Store ID (tenant_id UUID)"
                disabled={adding}
                style={{
                  ...inputStyle,
                  flex: 1,
                  minWidth: 280,
                  fontFamily: T.fontMono,
                  fontSize: T.text.sm,
                }}
              />
              <button
                type="button"
                onClick={handleAddMember}
                disabled={adding || !addInput.trim()}
                style={{
                  background: T.accentLight,
                  color: T.accentText,
                  border: `1px solid ${T.accent}`,
                  borderRadius: T.radius.md,
                  padding: `${T.pad.md}px ${T.pad.lg}px`,
                  fontFamily: T.font,
                  fontSize: T.text.base,
                  fontWeight: T.weight.semibold,
                  cursor:
                    adding || !addInput.trim() ? "not-allowed" : "pointer",
                  opacity: adding || !addInput.trim() ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {adding ? "Adding…" : "Add to Network"}
              </button>
            </div>
          </div>

          {/* Shortfall note — LL-243 gap recorded in the UI itself */}
          <div
            style={{
              fontSize: T.text.xs,
              color: T.ink400,
              marginTop: T.gap.md,
              fontStyle: "italic",
            }}
          >
            Want to invite a new store by email? This feature is coming in
            a future release. For now, new stores must be registered on
            NuAi first.
          </div>
        </section>
      )}

      {/* ── SECTION 4 — Danger Zone ────────────────────────────────── */}
      <section style={{ marginBottom: T.page.sectionGap }}>
        <div
          style={{
            ...sectionLabelStyle,
            color: T.dangerText,
          }}
        >
          Danger Zone
        </div>
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.dangerBorder}`,
            borderRadius: T.radius.lg,
            padding: T.inset.card,
          }}
        >
          <div
            style={{
              fontSize: T.text.base,
              fontWeight: T.weight.semibold,
              color: T.ink900,
              marginBottom: T.gap.xs,
            }}
          >
            Leave this network
          </div>
          <div
            style={{
              fontSize: T.text.sm,
              color: T.ink600,
              marginBottom: T.gap.lg,
              lineHeight: 1.6,
            }}
          >
            Remove yourself from this franchise network. You will lose
            access to the Group Portal for this network. This does not
            affect your store.
          </div>

          {canLeave ? (
            removingSelf ? (
              <div style={{ display: "flex", gap: T.gap.md, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(tenantId)}
                  disabled={saving}
                  style={{
                    background: T.danger,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: T.radius.md,
                    padding: `${T.pad.md}px ${T.pad.lg}px`,
                    fontFamily: T.font,
                    fontSize: T.text.base,
                    fontWeight: T.weight.semibold,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? "Leaving…" : "Confirm — Leave Network"}
                </button>
                <button
                  type="button"
                  onClick={() => setRemovingSelf(false)}
                  disabled={saving}
                  style={{
                    background: T.surface,
                    color: T.ink700,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius.md,
                    padding: `${T.pad.md}px ${T.pad.lg}px`,
                    fontFamily: T.font,
                    fontSize: T.text.base,
                    fontWeight: T.weight.medium,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRemovingSelf(true)}
                style={{
                  background: T.dangerLight,
                  color: T.dangerText,
                  border: `1px solid ${T.dangerBorder}`,
                  borderRadius: T.radius.md,
                  padding: `${T.pad.md}px ${T.pad.lg}px`,
                  fontFamily: T.font,
                  fontSize: T.text.base,
                  fontWeight: T.weight.semibold,
                  cursor: "pointer",
                }}
              >
                Leave Network
              </button>
            )
          ) : (
            <div
              style={{
                fontSize: T.text.xs,
                color: T.ink400,
                fontStyle: "italic",
              }}
            >
              {leaveBlockedReason ||
                "You are not a member of this network."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
