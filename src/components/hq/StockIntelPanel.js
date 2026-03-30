// src/components/hq/StockIntelPanel.js — v2.0
// WP-STOCK-OVERVIEW Phase 2 — Intelligence Panels + Movement Heatmap
//
// Zone 4: Best Sellers · Margin Heroes · Fast Movers · Dead Stock
// Zone 5: 12-week × 7-day movement velocity heatmap
// Zone 6: AI Insights — Phase 3 placeholder (LL-169: stays visible)
//
// Props:
//   items      — array   — from HQStock items state
//   movements  — array   — from HQStock movements state (last 100)
//   tenantId   — string  — PROP only (LL-160)
//   onNavigate — fn(tab) — jump to HQStock tab
//   onOpenItem — fn(item)— open StockItemPanel drawer

import React, { useState, useMemo } from "react";

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
};

const CATEGORY_LABELS = {
  finished_product: "Finished Product",
  raw_material: "Raw Material",
  terpene: "Terpene",
  hardware: "Hardware",
  packaging: "Packaging",
  concentrate: "Concentrate",
  flower: "Flower",
  edible: "Edible",
  topical: "Topical",
  accessory: "Accessory",
  equipment: "Equipment",
  other: "Other",
};

const fmt = (n) =>
  n == null
    ? "—"
    : "R" +
      Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const SectionLabel = ({ children }) => (
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
    {children}
  </div>
);

const StatusBadge = ({ label, color, bg, bd }) => (
  <span
    style={{
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      padding: "2px 5px",
      borderRadius: 3,
      background: bg,
      color,
      border: `1px solid ${bd}`,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    {label}
  </span>
);

function IntelPanel({
  title,
  icon,
  badge,
  badgeColor,
  rows,
  emptyMsg,
  footerLabel,
  onFooter,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid " + T.ink150,
        borderRadius: 6,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid " + T.ink150,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: T.ink075,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.ink700,
            fontFamily: T.font,
          }}
        >
          {icon} {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 3,
              background: badgeColor?.bg || T.accentLit,
              color: badgeColor?.color || T.accentMid,
              border: `1px solid ${badgeColor?.bd || T.accentBd}`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ flex: 1, padding: "6px 0" }}>
        {rows.length === 0 ? (
          <div
            style={{
              padding: "20px 14px",
              fontSize: 12,
              color: T.ink300,
              fontFamily: T.font,
              textAlign: "center",
            }}
          >
            {emptyMsg}
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={idx}
              onClick={() => row.onClick?.()}
              style={{
                padding: "7px 14px",
                cursor: row.onClick ? "pointer" : "default",
                borderBottom:
                  idx < rows.length - 1 ? "1px solid " + T.ink075 : "none",
                transition: "background .1s",
              }}
              onMouseEnter={(e) => {
                if (row.onClick) e.currentTarget.style.background = T.accentLit;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: idx === 0 ? T.accentMid : T.ink300,
                    fontFamily: T.mono,
                    width: 14,
                    flexShrink: 0,
                    textAlign: "right",
                  }}
                >
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: T.ink700,
                        fontFamily: T.font,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.name}
                    </span>
                    {idx === 0 && row.badge && <StatusBadge {...row.badge} />}
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: T.ink150,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${row.pct}%`,
                        borderRadius: 2,
                        background: row.barColor || T.accentMid,
                        transition: "width .4s",
                      }}
                    />
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: T.mono,
                    fontVariantNumeric: "tabular-nums",
                    color: row.valueColor || T.ink700,
                    flexShrink: 0,
                    textAlign: "right",
                    minWidth: 50,
                  }}
                >
                  {row.value}
                </span>
              </div>
              {row.sub && (
                <div
                  style={{
                    fontSize: 10,
                    color: T.ink400,
                    fontFamily: T.font,
                    marginLeft: 22,
                    marginTop: 1,
                  }}
                >
                  {row.sub}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {footerLabel && (
        <div
          style={{ borderTop: "1px solid " + T.ink150, padding: "8px 14px" }}
        >
          <button
            onClick={onFooter}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: T.accentMid,
              fontFamily: T.font,
              padding: 0,
            }}
          >
            {footerLabel} →
          </button>
        </div>
      )}
    </div>
  );
}

function HeatmapTooltip({ cell, x, y }) {
  if (!cell) return null;
  const d = new Date(cell.date + "T00:00:00");
  const label = d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <div
      style={{
        position: "fixed",
        left: x + 10,
        top: y - 40,
        zIndex: 9999,
        background: T.ink900,
        color: "#fff",
        borderRadius: 5,
        padding: "6px 10px",
        fontSize: 11,
        fontFamily: T.font,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      {cell.count === 0 ? (
        <div style={{ color: "#aaa" }}>No activity</div>
      ) : (
        <>
          <div>
            {cell.count} movement{cell.count !== 1 ? "s" : ""}
          </div>
          {cell.saleOuts > 0 && (
            <div style={{ color: T.accentBd }}>
              {cell.saleOuts} sale{cell.saleOuts !== 1 ? "s" : ""}
            </div>
          )}
          {cell.purchases > 0 && (
            <div style={{ color: "#86efac" }}>
              {cell.purchases} receipt{cell.purchases !== 1 ? "s" : ""}
            </div>
          )}
          {cell.adjustments > 0 && (
            <div style={{ color: "#fcd34d" }}>
              {cell.adjustments} adjustment{cell.adjustments !== 1 ? "s" : ""}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const Zone6Placeholder = () => (
  <div
    style={{
      background: "#fff",
      border: "1px solid " + T.ink150,
      borderRadius: 6,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "12px 20px",
        borderBottom: "1px solid " + T.ink150,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: T.ink075,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink400,
        }}
      >
        Zone 6 — AI Insights
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "2px 7px",
          borderRadius: 3,
          background: T.infoBg,
          color: T.info,
          border: "1px solid " + T.infoBd,
        }}
      >
        Phase 3
      </span>
    </div>
    <div
      style={{
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: T.infoBg,
          border: "1px solid " + T.infoBd,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: T.info,
          flexShrink: 0,
        }}
      >
        ◌
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink700 }}>
          ProteaAI-powered contextual stock insights
        </div>
        <div style={{ fontSize: 11, color: T.ink400, marginTop: 2 }}>
          3 insights per load · severity dots · action links · 30-min cache ·
          ai-copilot EF only (LL-120)
        </div>
      </div>
    </div>
  </div>
);

export default function StockIntelPanel({
  items = [],
  movements = [],
  tenantId, // LL-160: always a prop
  onNavigate = () => {},
  onOpenItem = () => {},
}) {
  const [catFilter, setCatFilter] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const activeItems = useMemo(
    () => items.filter((i) => i.is_active !== false),
    [items],
  );
  const categories = useMemo(
    () =>
      [...new Set(activeItems.map((i) => i.category).filter(Boolean))].sort(),
    [activeItems],
  );
  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 30 * 86400000), []);

  const saleOuts = useMemo(
    () =>
      movements.filter(
        (m) =>
          m.movement_type === "sale_out" &&
          new Date(m.created_at) > thirtyDaysAgo,
      ),
    [movements, thirtyDaysAgo],
  );

  // Best Sellers
  const bestSellers = useMemo(() => {
    const soldMap = {};
    saleOuts.forEach((m) => {
      soldMap[m.item_id] =
        (soldMap[m.item_id] || 0) + Math.abs(m.quantity || 0);
    });
    const ranked = Object.entries(soldMap)
      .map(([id, units]) => ({ item: items.find((i) => i.id === id), units }))
      .filter((x) => x.item && (!catFilter || x.item.category === catFilter))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
    const max = ranked[0]?.units || 1;
    return ranked.map(({ item, units }, idx) => ({
      name: item.name,
      value: `${units} units`,
      pct: Math.round((units / max) * 100),
      sub: CATEGORY_LABELS[item.category] || item.category,
      barColor: T.accentMid,
      badge:
        idx === 0
          ? { label: "HOT", color: T.danger, bg: T.dangerBg, bd: T.dangerBd }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [saleOuts, items, catFilter, onOpenItem]);

  // Margin Heroes
  const marginHeroes = useMemo(() => {
    const ranked = activeItems
      .filter(
        (i) =>
          (i.quantity_on_hand || 0) > 0 &&
          i.sell_price > 0 &&
          i.weighted_avg_cost > 0 &&
          (!catFilter || i.category === catFilter),
      )
      .map((i) => ({
        item: i,
        margin: ((i.sell_price - i.weighted_avg_cost) / i.sell_price) * 100,
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);
    const max = ranked[0]?.margin || 1;
    return ranked.map(({ item, margin }, idx) => ({
      name: item.name,
      value: `${Math.round(margin)}%`,
      pct: Math.round((margin / max) * 100),
      sub: `${fmt(item.sell_price)} sell · ${fmt(item.weighted_avg_cost)} cost`,
      barColor: margin > 60 ? T.success : margin > 40 ? T.accentMid : T.warning,
      valueColor:
        margin > 60 ? T.success : margin > 40 ? T.accentMid : T.warning,
      badge:
        idx === 0
          ? {
              label: "PUSH",
              color: T.success,
              bg: T.successBg,
              bd: T.successBd,
            }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [activeItems, catFilter, onOpenItem]);

  // Fast Movers
  const fastMovers = useMemo(() => {
    const ranked = activeItems
      .filter((i) => (i.quantity_on_hand || 0) > 0)
      .map((i) => {
        const unitsSold = saleOuts
          .filter((m) => m.item_id === i.id)
          .reduce((s, m) => s + Math.abs(m.quantity || 0), 0);
        const velocity = unitsSold / 30;
        const daysLeft =
          velocity > 0 ? Math.floor(i.quantity_on_hand / velocity) : null;
        return { item: i, velocity, daysLeft, unitsSold };
      })
      .filter(
        (x) => x.velocity > 0 && (!catFilter || x.item.category === catFilter),
      )
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
    const minDays = ranked[0]?.daysLeft || 1;
    return ranked.map(({ item, daysLeft, unitsSold }, idx) => {
      const urgent = daysLeft <= 7,
        warn = daysLeft <= 14;
      return {
        name: item.name,
        value: `${daysLeft}d left`,
        pct: Math.max(
          5,
          Math.min(100, Math.round((minDays / Math.max(daysLeft, 1)) * 100)),
        ),
        sub: `${unitsSold} units/30d · ${item.quantity_on_hand} on hand`,
        barColor: urgent ? T.danger : warn ? T.warning : T.accentMid,
        valueColor: urgent ? T.danger : warn ? T.warning : T.ink700,
        badge:
          idx === 0
            ? {
                label: urgent ? "REORDER" : "WATCH",
                color: urgent ? T.danger : T.warning,
                bg: urgent ? T.dangerBg : T.warningBg,
                bd: urgent ? T.dangerBd : T.warningBd,
              }
            : null,
        onClick: () => onOpenItem(item),
      };
    });
  }, [activeItems, saleOuts, catFilter, onOpenItem]);

  // Dead Stock
  const DEAD_THRESHOLD = 45;
  const deadCutoff = useMemo(
    () => new Date(Date.now() - DEAD_THRESHOLD * 86400000),
    [],
  );
  const deadStock = useMemo(() => {
    const ranked = activeItems
      .filter(
        (i) =>
          (i.quantity_on_hand || 0) > 0 &&
          i.last_movement_at &&
          new Date(i.last_movement_at) < deadCutoff &&
          (!catFilter || i.category === catFilter),
      )
      .map((i) => ({
        item: i,
        daysDead: Math.floor(
          (Date.now() - new Date(i.last_movement_at)) / 86400000,
        ),
        tiedUpValue: (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
      }))
      .sort((a, b) => b.daysDead - a.daysDead)
      .slice(0, 5);
    const max = ranked[0]?.daysDead || 1;
    return ranked.map(({ item, daysDead, tiedUpValue }, idx) => ({
      name: item.name,
      value: fmt(tiedUpValue),
      pct: Math.round((daysDead / max) * 100),
      sub: `${daysDead} days idle · ${item.quantity_on_hand} units`,
      barColor: T.warning,
      valueColor: T.warning,
      badge:
        idx === 0
          ? {
              label: "IDLE",
              color: T.warning,
              bg: T.warningBg,
              bd: T.warningBd,
            }
          : null,
      onClick: () => onOpenItem(item),
    }));
  }, [activeItems, deadCutoff, catFilter, onOpenItem]);

  // Heatmap
  const HEATMAP_COLORS = [
    T.ink150,
    T.accentBd,
    "#6aab85",
    T.accentMid,
    T.accent,
  ];
  const heatmapCells = useMemo(() => {
    const dayMap = {};
    movements.forEach((m) => {
      const key = (m.created_at || "").split("T")[0];
      if (!key) return;
      if (!dayMap[key])
        dayMap[key] = { count: 0, saleOuts: 0, purchases: 0, adjustments: 0 };
      dayMap[key].count++;
      if (m.movement_type === "sale_out") dayMap[key].saleOuts++;
      if (m.movement_type === "purchase_in") dayMap[key].purchases++;
      if (m.movement_type === "adjustment") dayMap[key].adjustments++;
    });
    return Array.from({ length: 84 }, (_, i) => {
      const d = new Date(Date.now() - (83 - i) * 86400000);
      const key = d.toISOString().split("T")[0];
      const data = dayMap[key] || {
        count: 0,
        saleOuts: 0,
        purchases: 0,
        adjustments: 0,
      };
      return {
        date: key,
        ...data,
        level:
          data.count === 0
            ? 0
            : data.count <= 2
              ? 1
              : data.count <= 5
                ? 2
                : data.count <= 10
                  ? 3
                  : 4,
      };
    });
  }, [movements]);
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < 12; i++) w.push(heatmapCells.slice(i * 7, i * 7 + 7));
    return w;
  }, [heatmapCells]);
  const totalMovements = heatmapCells.reduce((s, c) => s + c.count, 0);
  const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Zone 4 — Category pills + 2×2 intel grid */}
      <div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <SectionLabel>Filter by category</SectionLabel>
          <div style={{ flex: 1 }} />
          {[null, ...categories].map((cat) => {
            const active = catFilter === cat;
            const label = cat === null ? "All" : CATEGORY_LABELS[cat] || cat;
            const count =
              cat === null
                ? activeItems.length
                : activeItems.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat || "all"}
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  fontFamily: T.font,
                  border: "1.5px solid " + (active ? T.accentMid : T.ink150),
                  background: active ? T.accentMid : "#fff",
                  color: active ? "#fff" : T.ink700,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {label} <span style={{ opacity: 0.7 }}>×{count}</span>
              </button>
            );
          })}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <IntelPanel
            title="Best Sellers"
            icon="🔥"
            badge={saleOuts.length > 0 ? "last 30d" : null}
            rows={bestSellers}
            emptyMsg={
              saleOuts.length === 0
                ? "No sales recorded yet — process your first sale to see best sellers"
                : "No sales in this category"
            }
            footerLabel="View movements"
            onFooter={() => onNavigate("movements")}
          />

          <IntelPanel
            title="Margin Heroes"
            icon="💰"
            badge={
              marginHeroes.length > 0 ? `${marginHeroes.length} priced` : null
            }
            badgeColor={{ color: T.success, bg: T.successBg, bd: T.successBd }}
            rows={marginHeroes}
            emptyMsg="Set prices and receive a delivery to see real margins"
            footerLabel="Open pricing"
            onFooter={() => onNavigate("pricing")}
          />

          <IntelPanel
            title="Fast Movers"
            icon="⚡"
            badge={fastMovers.length > 0 ? "days remaining" : null}
            rows={fastMovers}
            emptyMsg="No sales velocity data — process sales to see stock runway"
            footerLabel="View movements"
            onFooter={() => onNavigate("movements")}
          />

          <IntelPanel
            title="Dead Stock"
            icon="📦"
            badge={deadStock.length > 0 ? `${DEAD_THRESHOLD}d+ idle` : null}
            badgeColor={{ color: T.warning, bg: T.warningBg, bd: T.warningBd }}
            rows={deadStock}
            emptyMsg={`No items idle for ${DEAD_THRESHOLD}+ days — your stock is moving`}
            footerLabel="Get strategy"
            onFooter={() => onNavigate("items")}
          />
        </div>
      </div>

      {/* Zone 5 — Heatmap */}
      <div
        style={{
          background: "#fff",
          border: "1px solid " + T.ink150,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid " + T.ink150,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SectionLabel>Movement Velocity — 12 weeks</SectionLabel>
          <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>
            {totalMovements} movements in window
          </span>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Day labels */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                marginRight: 2,
              }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  style={{
                    height: 14,
                    width: 28,
                    fontSize: 9,
                    color: T.ink300,
                    fontFamily: T.font,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            {/* 12 week columns */}
            <div style={{ display: "flex", gap: 3, flex: 1 }}>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    flex: 1,
                  }}
                >
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      onMouseEnter={(e) => {
                        setHoverCell(cell);
                        setHoverPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoverCell(null)}
                      onMouseMove={(e) =>
                        setHoverPos({ x: e.clientX, y: e.clientY })
                      }
                      style={{
                        height: 14,
                        borderRadius: 2,
                        background: HEATMAP_COLORS[cell.level],
                        cursor: cell.count > 0 ? "pointer" : "default",
                        transition: "opacity .1s",
                        opacity: hoverCell?.date === cell.date ? 0.7 : 1,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Week labels */}
          <div
            style={{ display: "flex", gap: 3, marginTop: 6, marginLeft: 34 }}
          >
            {weeks.map((week, wi) => {
              const d = new Date(week[0].date + "T00:00:00");
              return (
                <div
                  key={wi}
                  style={{
                    flex: 1,
                    fontSize: 9,
                    color: T.ink300,
                    fontFamily: T.font,
                    textAlign: "center",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {wi % 3 === 0
                    ? d.toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <span style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
              Less
            </span>
            {HEATMAP_COLORS.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: color,
                }}
              />
            ))}
            <span style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
              More
            </span>
            <span
              style={{
                fontSize: 10,
                color: T.ink300,
                fontFamily: T.font,
                marginLeft: 8,
              }}
            >
              Based on last 100 movements loaded
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoverCell && hoverCell.count > 0 && (
        <HeatmapTooltip cell={hoverCell} x={hoverPos.x} y={hoverPos.y} />
      )}

      {/* Zone 6 — Phase 3 placeholder (LL-169) */}
      <Zone6Placeholder />
    </div>
  );
}
