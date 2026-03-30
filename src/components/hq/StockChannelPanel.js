// StockChannelPanel.js v1.0
// WP-STOCK-CHANNEL — Live reservation breakdown by sales channel
// Shows per-item: on_hand / online held / wholesale held / retail held / available
// Answers: "what is actually available right now across all 3 channels?"
// LL-115: stock_reservations uses inventory_item_id (NOT item_id)
// LL-160: tenantId as PROP

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

// Channel display config
const CHANNEL = {
  online: {
    label: "Online Shop",
    color: T.info,
    bg: T.infoBg,
    bd: T.infoBd,
    icon: "🌐",
  },
  wholesale: {
    label: "Wholesale",
    color: T.warning,
    bg: T.warningBg,
    bd: T.warningBd,
    icon: "📦",
  },
  retail: {
    label: "Physical Store",
    color: T.accentMid,
    bg: T.accentLit,
    bd: T.accentBd,
    icon: "🏪",
  },
  transfer: {
    label: "Transfer Hold",
    color: T.ink500,
    bg: T.ink075,
    bd: T.ink150,
    icon: "🔄",
  },
  unknown: {
    label: "Untagged",
    color: T.ink400,
    bg: T.ink075,
    bd: T.ink150,
    icon: "?",
  },
};

const sTh = {
  textAlign: "left",
  padding: "9px 12px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
  fontFamily: T.font,
  whiteSpace: "nowrap",
  background: T.ink050,
};
const sTd = {
  padding: "9px 12px",
  borderBottom: `1px solid ${T.ink150}`,
  fontSize: "13px",
  fontFamily: T.font,
  color: T.ink700,
  verticalAlign: "middle",
};

const fmt = (n) => (n == null ? 0 : parseFloat(n) || 0);
const fmtN = (n) =>
  Number(n || 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 });

export default function StockChannelPanel({ tenantId }) {
  const [reservations, setReservations] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // Fetch active reservations for this tenant
    const { data: resData } = await supabase
      .from("stock_reservations")
      .select(
        "id, inventory_item_id, quantity_reserved, channel, order_reference, reserved_by, created_at",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    const res = resData || [];

    if (res.length === 0) {
      setReservations([]);
      setItems([]);
      setLoading(false);
      return;
    }

    // Fetch item details for items that have reservations
    const itemIds = [
      ...new Set(res.map((r) => r.inventory_item_id).filter(Boolean)),
    ];
    const { data: itemData } = await supabase
      .from("inventory_items")
      .select("id, name, sku, category, unit, quantity_on_hand, reserved_qty")
      .in("id", itemIds);

    setReservations(res);
    setItems(itemData || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Build per-item breakdown ──────────────────────────────────────────────

  const itemMap = items.reduce((acc, i) => {
    acc[i.id] = i;
    return acc;
  }, {});

  // Group reservations by item, then by channel
  const byItem = {};
  reservations.forEach((r) => {
    const id = r.inventory_item_id;
    if (!byItem[id])
      byItem[id] = {
        online: 0,
        wholesale: 0,
        retail: 0,
        transfer: 0,
        unknown: 0,
        refs: [],
      };
    const ch = r.channel || "unknown";
    byItem[id][ch] = (byItem[id][ch] || 0) + fmt(r.quantity_reserved);
    if (r.order_reference) byItem[id].refs.push({ ch, ref: r.order_reference });
  });

  // Channel totals across all items
  const totals = {
    online: 0,
    wholesale: 0,
    retail: 0,
    transfer: 0,
    unknown: 0,
  };
  Object.values(byItem).forEach((b) => {
    Object.keys(totals).forEach((ch) => {
      totals[ch] += b[ch] || 0;
    });
  });
  const totalHeld = Object.values(totals).reduce((s, v) => s + v, 0);
  const activeChannels = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);

  // Items list sorted by total reserved desc
  const itemList = Object.entries(byItem)
    .map(([id, breakdown]) => ({
      id,
      item: itemMap[id],
      breakdown,
      totalHeld: Object.keys(totals).reduce(
        (s, ch) => s + (breakdown[ch] || 0),
        0,
      ),
    }))
    .sort((a, b) => b.totalHeld - a.totalHeld);

  const displayed = showAll ? itemList : itemList.slice(0, 8);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div
        style={{
          background: "#fff",
          border: `1px solid ${T.ink150}`,
          borderRadius: 6,
          padding: "20px",
          boxShadow: T.shadow,
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: T.ink300,
            margin: 0,
            fontFamily: T.font,
          }}
        >
          Loading channel stock data…
        </p>
      </div>
    );

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.ink150}`,
        borderRadius: 6,
        boxShadow: T.shadow,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: `1px solid ${T.ink150}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.ink400,
              fontFamily: T.font,
            }}
          >
            Channel Stock Hold
          </div>
          <div
            style={{
              fontSize: 12,
              color: T.ink300,
              marginTop: 2,
              fontFamily: T.font,
            }}
          >
            Live view of stock held per sales channel · prevents double-selling
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={load}
            style={{
              padding: "5px 12px",
              border: `1px solid ${T.ink150}`,
              borderRadius: 3,
              background: "transparent",
              color: T.ink500,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {totalHeld === 0 ? (
        /* No reservations state */
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.success,
              fontFamily: T.font,
              marginBottom: 4,
            }}
          >
            No active stock holds
          </div>
          <div style={{ fontSize: 12, color: T.ink300, fontFamily: T.font }}>
            All inventory is available. Holds appear here when online checkouts,
            wholesale orders, or in-store sales create reservations.
          </div>
        </div>
      ) : (
        <>
          {/* Channel summary strip */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${T.ink150}`,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {activeChannels.map((ch) => {
              const cfg = CHANNEL[ch] || CHANNEL.unknown;
              return (
                <div
                  key={ch}
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.bd}`,
                    borderRadius: 6,
                    padding: "10px 16px",
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: cfg.color,
                      fontFamily: T.font,
                      marginBottom: 4,
                    }}
                  >
                    {cfg.icon} {cfg.label}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 400,
                      color: cfg.color,
                      fontFamily: T.mono,
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fmtN(totals[ch])}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: cfg.color,
                      fontFamily: T.font,
                      marginTop: 2,
                      opacity: 0.7,
                    }}
                  >
                    units held
                  </div>
                </div>
              );
            })}

            {/* Explainer note for untagged */}
            {totals.unknown > 0 && (
              <div
                style={{
                  background: T.warningBg,
                  border: `1px solid ${T.warningBd}`,
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 11,
                  color: T.warning,
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ⚠ {fmtN(totals.unknown)} units in legacy holds (no channel tag).
                These are older reservations created before the channel system
                was added.
              </div>
            )}
          </div>

          {/* How it works banner */}
          <div
            style={{
              padding: "10px 20px",
              background: T.infoBg,
              borderBottom: `1px solid ${T.infoBd}`,
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.info,
                fontFamily: T.font,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              How it works
            </span>
            {[
              {
                icon: "🌐",
                label: "Online",
                desc: "Soft hold at checkout · releases if abandoned",
              },
              {
                icon: "📦",
                label: "Wholesale",
                desc: "Reserved on order confirm · released on shipment",
              },
              {
                icon: "🏪",
                label: "Physical store",
                desc: "Direct deduct at till · no advance hold (WP-POS pending)",
              },
            ].map(({ icon, label, desc }) => (
              <span
                key={label}
                style={{ fontSize: 11, color: T.info, fontFamily: T.font }}
              >
                {icon} <strong>{label}</strong> — {desc}
              </span>
            ))}
          </div>

          {/* Per-item table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                fontFamily: T.font,
              }}
            >
              <thead>
                <tr>
                  <th style={sTh}>Item</th>
                  <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                  {activeChannels.map((ch) => {
                    const cfg = CHANNEL[ch] || CHANNEL.unknown;
                    return (
                      <th
                        key={ch}
                        style={{ ...sTh, textAlign: "right", color: cfg.color }}
                      >
                        {cfg.icon} {cfg.label.split(" ")[0]}
                      </th>
                    );
                  })}
                  <th style={{ ...sTh, textAlign: "right", color: T.success }}>
                    Available
                  </th>
                  <th style={sTh}>Order Refs</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(
                  ({ id, item, breakdown, totalHeld: itemHeld }, idx) => {
                    if (!item) return null;
                    const onHand = fmt(item.quantity_on_hand);
                    const available = Math.max(0, onHand - itemHeld);
                    const isRisky = available === 0;
                    const isLow = available > 0 && available < itemHeld * 0.2;

                    return (
                      <tr
                        key={id}
                        style={{
                          background: isRisky
                            ? T.dangerBg
                            : idx % 2 === 0
                              ? "#fff"
                              : T.ink050,
                          borderLeft: isRisky
                            ? `3px solid ${T.danger}`
                            : isLow
                              ? `3px solid ${T.warning}`
                              : "3px solid transparent",
                        }}
                      >
                        {/* Item name */}
                        <td style={{ ...sTd, minWidth: 180 }}>
                          <div style={{ fontWeight: 600, color: T.ink700 }}>
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: T.ink300,
                              fontFamily: T.mono,
                              marginTop: 2,
                            }}
                          >
                            {item.sku}
                          </div>
                          {isRisky && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 6px",
                                borderRadius: 2,
                                background: T.dangerBg,
                                color: T.danger,
                                border: `1px solid ${T.dangerBd}`,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                display: "inline-block",
                                marginTop: 3,
                              }}
                            >
                              FULLY HELD
                            </span>
                          )}
                        </td>

                        {/* On Hand */}
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.mono,
                            fontWeight: 600,
                            color: T.ink700,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtN(onHand)} {item.unit || ""}
                        </td>

                        {/* Per-channel holds */}
                        {activeChannels.map((ch) => {
                          const cfg = CHANNEL[ch] || CHANNEL.unknown;
                          const held = breakdown[ch] || 0;
                          return (
                            <td
                              key={ch}
                              style={{
                                ...sTd,
                                textAlign: "right",
                                fontFamily: T.mono,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {held > 0 ? (
                                <span
                                  style={{ fontWeight: 700, color: cfg.color }}
                                >
                                  {fmtN(held)}
                                </span>
                              ) : (
                                <span style={{ color: T.ink150 }}>—</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Available */}
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.mono,
                            fontWeight: 700,
                            color: isRisky
                              ? T.danger
                              : isLow
                                ? T.warning
                                : T.success,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtN(available)} {item.unit || ""}
                          {itemHeld > 0 && (
                            <div
                              style={{
                                fontSize: 9,
                                color: T.ink400,
                                fontWeight: 400,
                              }}
                            >
                              {fmtN(itemHeld)} held
                            </div>
                          )}
                        </td>

                        {/* Order references */}
                        <td style={{ ...sTd, fontSize: 11 }}>
                          {breakdown.refs && breakdown.refs.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              {breakdown.refs.slice(0, 3).map((r, i) => {
                                const cfg = CHANNEL[r.ch] || CHANNEL.unknown;
                                return (
                                  <span
                                    key={i}
                                    style={{
                                      fontSize: 9,
                                      padding: "1px 6px",
                                      borderRadius: 2,
                                      background: cfg.bg,
                                      color: cfg.color,
                                      border: `1px solid ${cfg.bd}`,
                                      fontWeight: 600,
                                      fontFamily: T.mono,
                                    }}
                                  >
                                    {r.ref}
                                  </span>
                                );
                              })}
                              {breakdown.refs.length > 3 && (
                                <span style={{ fontSize: 9, color: T.ink300 }}>
                                  +{breakdown.refs.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: T.ink150 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {/* Show more / footer */}
          <div
            style={{
              padding: "10px 20px",
              borderTop: `1px solid ${T.ink150}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>
              {itemList.length} item{itemList.length !== 1 ? "s" : ""} with
              active holds · {fmtN(totalHeld)} total units reserved
            </span>
            {itemList.length > 8 && (
              <button
                onClick={() => setShowAll((p) => !p)}
                style={{
                  fontSize: 11,
                  color: T.accentMid,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font,
                  fontWeight: 600,
                }}
              >
                {showAll
                  ? "Show less ▲"
                  : `Show all ${itemList.length} items ▼`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
