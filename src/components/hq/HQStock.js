// src/components/hq/HQStock.js
// WP-BIB Session 1: HQ raw material stock intelligence — 4-panel view
// Panels: Raw Materials / Terpenes / Hardware & Packaging / Finished Goods
// Profile-adaptive panel labels. Reorder level alerts. Per-item movements drawer.
// Tables: inventory_items (HQ tenant only), stock_movements
// RULE 0G: useTenant() called inside this component — not inherited from parent

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// HQ master tenant — raw materials always belong to HQ
const HQ_TENANT_ID = "43b34c33-6864-4f02-98dd-df1d340475c3";

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
};

// Profile-adaptive panel labels — never hardcode cannabis terminology (LL-067)
const PANEL_LABELS = {
  cannabis_retail: {
    p1: "Raw Materials & Concentrates",
    p2: "Terpenes",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
  cannabis_dispensary: {
    p1: "Raw Materials & Concentrates",
    p2: "Terpenes",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
  food_beverage: {
    p1: "Ingredients",
    p2: "Flavourings & Botanicals",
    p3: "Packaging & Equipment",
    p4: "Finished Goods",
  },
  general_retail: {
    p1: "Raw Materials",
    p2: "Botanicals & Additives",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
  mixed_retail: {
    p1: "Raw Materials",
    p2: "Terpenes & Flavourings",
    p3: "Hardware & Packaging",
    p4: "Finished Goods",
  },
};

// Categories grouped per panel
const PANEL_CATS = {
  p1: ["raw_material", "concentrate", "flower"],
  p2: ["terpene"],
  p3: ["hardware", "packaging", "equipment"],
  p4: ["finished_product"],
};
const PANEL_CATS_BY_PROFILE = {
  cannabis_retail: {
    p1: ["raw_material", "concentrate", "flower"],
    p2: ["terpene"],
    p3: ["hardware", "packaging", "equipment"],
    p4: ["finished_product"],
  },
  cannabis_dispensary: {
    p1: ["raw_material", "concentrate", "flower"],
    p2: ["terpene"],
    p3: ["hardware", "packaging", "equipment"],
    p4: ["finished_product"],
  },
  food_beverage: {
    p1: ["raw_material"],
    p2: ["terpene", "accessory"],
    p3: ["packaging", "equipment"],
    p4: ["finished_product"],
  },
  general_retail: {
    p1: ["raw_material", "accessory"],
    p2: ["other"],
    p3: ["packaging", "equipment", "hardware"],
    p4: ["finished_product"],
  },
  mixed_retail: {
    p1: ["raw_material", "concentrate", "flower"],
    p2: ["terpene", "accessory"],
    p3: ["hardware", "packaging", "equipment"],
    p4: ["finished_product"],
  },
};

// Profiles where cannabis-specific fields (medium_type badge) are shown
const CANNABIS_PROFILES = [
  "cannabis_retail",
  "cannabis_dispensary",
  "mixed_retail",
];

const fmt = (n) =>
  n == null
    ? "—"
    : "R" +
      Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const fmtQty = (n, unit) =>
  n == null
    ? "—"
    : `${Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}${unit ? " " + unit : ""}`;

// ─────────────────────────────────────────────────────────────────────────────

export default function HQStock() {
  // RULE 0G: useTenant() must be called inside this component
  const { industryProfile } = useTenant();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openPanels, setOpenPanels] = useState({
    p1: true,
    p2: true,
    p3: false,
    p4: false,
  });
  const [movItem, setMovItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movLoading, setMovLoading] = useState(false);

  const labels = PANEL_LABELS[industryProfile] || PANEL_LABELS.general_retail;
  const isCannabis = CANNABIS_PROFILES.includes(industryProfile);
  const isFoodBev = industryProfile === "food_beverage";

  // ── Data load ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from("inventory_items")
        .select("*, suppliers(name)")
        .eq("tenant_id", HQ_TENANT_ID)
        .order("name");
      if (e) throw e;
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMovements = async (item) => {
    setMovItem(item);
    setMovements([]);
    setMovLoading(true);
    try {
      const { data } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setMovements(data || []);
    } finally {
      setMovLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const togglePanel = (key) => setOpenPanels((p) => ({ ...p, [key]: !p[key] }));

  const cats =
    PANEL_CATS_BY_PROFILE[industryProfile] ||
    PANEL_CATS_BY_PROFILE.cannabis_retail;
  const panelItems = (key) =>
    items.filter((i) => cats[key].includes(i.category));

  const isLow = (item) =>
    item.reorder_level != null &&
    (item.quantity_on_hand || 0) <= item.reorder_level;

  // shelf_life_days used as proxy for freshness warning (food_bev only)
  // Per-batch expiry dates come in Session 3
  const shelfWarning = (item) => {
    if (!isFoodBev || item.shelf_life_days == null) return null;
    if (item.shelf_life_days < 7) return "danger";
    if (item.shelf_life_days < 14) return "warning";
    return null;
  };

  // ── Styles ─────────────────────────────────────────────────────────────────

  const sCard = {
    background: T.ink050,
    border: "1px solid " + T.ink150,
    borderRadius: "4px",
    padding: "12px 14px",
    marginBottom: "6px",
  };

  const sMetricBase = {
    borderRadius: "3px",
    padding: "3px 8px",
    fontSize: "11px",
    fontFamily: "'DM Mono','Courier New',monospace",
    whiteSpace: "nowrap",
  };

  const sMetric = (variant) => {
    const map = {
      default: {
        background: T.ink075,
        border: "1px solid " + T.ink150,
        color: T.ink500,
      },
      danger: {
        background: T.dangerBg,
        border: "1px solid " + T.dangerBd,
        color: T.danger,
      },
      warning: {
        background: T.warningBg,
        border: "1px solid " + T.warningBd,
        color: T.warning,
      },
      success: {
        background: T.successBg,
        border: "1px solid " + T.successBd,
        color: T.success,
      },
      accent: {
        background: T.accentLit,
        border: "1px solid " + T.accentBd,
        color: T.accentMid,
      },
    };
    return { ...sMetricBase, ...(map[variant] || map.default) };
  };

  const sBadge = (variant) => ({
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderRadius: "2px",
    padding: "1px 6px",
    ...(variant === "danger"
      ? {
          background: T.dangerBg,
          color: T.danger,
          border: "1px solid " + T.dangerBd,
        }
      : {}),
    ...(variant === "warning"
      ? {
          background: T.warningBg,
          color: T.warning,
          border: "1px solid " + T.warningBd,
        }
      : {}),
    ...(variant === "accent"
      ? {
          background: T.accentLit,
          color: T.accentMid,
          border: "1px solid " + T.accentBd,
        }
      : {}),
  });

  const sBtn = {
    padding: "3px 10px",
    fontSize: "11px",
    fontFamily: T.font,
    background: "transparent",
    border: "1px solid " + T.ink150,
    borderRadius: "2px",
    cursor: "pointer",
    color: T.ink500,
  };

  const sPanelHead = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: T.ink075,
    border: "1px solid " + T.ink150,
    borderRadius: "4px",
    marginBottom: "4px",
    cursor: "pointer",
    userSelect: "none",
  };

  // ── Item row ───────────────────────────────────────────────────────────────

  const renderItem = (item) => {
    const low = isLow(item);
    const shelf = shelfWarning(item);
    const availQty = (item.quantity_on_hand || 0) - (item.reserved_qty || 0);
    const totalVal =
      (item.quantity_on_hand || 0) * (item.weighted_avg_cost || 0);

    return (
      <div
        key={item.id}
        style={{
          ...sCard,
          borderLeft: low ? "3px solid " + T.danger : "3px solid transparent",
        }}
      >
        {/* Name row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: T.ink700,
                fontFamily: T.font,
              }}
            >
              {item.name}
            </span>
            {item.sku && (
              <span
                style={{
                  fontSize: "11px",
                  color: T.ink300,
                  fontFamily: "'DM Mono','Courier New',monospace",
                }}
              >
                {item.sku}
              </span>
            )}
            {isCannabis && item.medium_type && (
              <span style={sBadge("accent")}>
                {item.medium_type.replace(/_/g, " ")}
              </span>
            )}
            {low && <span style={sBadge("danger")}>LOW STOCK</span>}
            {isFoodBev && shelf === "danger" && (
              <span style={sBadge("danger")}>EXPIRY RISK</span>
            )}
            {isFoodBev && shelf === "warning" && (
              <span style={sBadge("warning")}>SHORT SHELF</span>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button style={sBtn} onClick={() => loadMovements(item)}>
              Movements
            </button>
            <button
              style={{
                ...sBtn,
                color: T.ink300,
                borderColor: T.ink150,
                cursor: "not-allowed",
              }}
              title="AI Analyse — wire in later session"
              disabled
            >
              AI Analyse
            </button>
          </div>
        </div>

        {/* Metrics row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            marginBottom: "6px",
          }}
        >
          <span style={sMetric(low ? "danger" : "default")}>
            ON HAND: {fmtQty(item.quantity_on_hand, item.unit)}
          </span>
          {(item.reserved_qty || 0) > 0 && (
            <span style={sMetric("warning")}>
              RESERVED: {fmtQty(item.reserved_qty, item.unit)}
            </span>
          )}
          <span style={sMetric(availQty < 0 ? "danger" : "default")}>
            AVAIL: {fmtQty(availQty, item.unit)}
          </span>
          {(item.weighted_avg_cost || 0) > 0 && (
            <span style={sMetric("default")}>
              AVCO: {fmt(item.weighted_avg_cost)}/{item.unit || "unit"}
            </span>
          )}
          {(item.weighted_avg_cost || 0) > 0 && (
            <span style={sMetric("default")}>VALUE: {fmt(totalVal)}</span>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {item.suppliers?.name && (
            <span style={{ fontSize: "11px", color: T.ink400 }}>
              Supplier: {item.suppliers.name}
            </span>
          )}
          {low && item.reorder_level != null && (
            <span style={{ fontSize: "11px", color: T.danger }}>
              Reorder level: {fmtQty(item.reorder_level, item.unit)}
            </span>
          )}
          {isFoodBev && item.shelf_life_days != null && (
            <span
              style={{
                fontSize: "11px",
                color: shelf
                  ? shelf === "danger"
                    ? T.danger
                    : T.warning
                  : T.ink400,
              }}
            >
              Shelf life: {item.shelf_life_days} days
            </span>
          )}
          {isFoodBev && item.storage_instructions && (
            <span style={{ fontSize: "11px", color: T.ink400 }}>
              Storage: {item.storage_instructions}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ── Panel ──────────────────────────────────────────────────────────────────

  const renderPanel = (key, label) => {
    const pItems = panelItems(key);
    const open = openPanels[key];
    const lowCount = pItems.filter(isLow).length;
    const totalVal = pItems.reduce(
      (sum, i) => sum + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
      0,
    );

    return (
      <div style={{ marginBottom: "16px" }} key={key}>
        <div style={sPanelHead} onClick={() => togglePanel(key)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: T.ink700,
                fontFamily: T.font,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: T.ink300,
                fontFamily: "'DM Mono','Courier New',monospace",
              }}
            >
              {pItems.length} item{pItems.length !== 1 ? "s" : ""}
            </span>
            {totalVal > 0 && (
              <span style={{ fontSize: "11px", color: T.ink400 }}>
                {fmt(totalVal)} total value
              </span>
            )}
            {lowCount > 0 && (
              <span style={sBadge("danger")}>{lowCount} LOW</span>
            )}
          </div>
          <span
            style={{ fontSize: "12px", color: T.ink300, marginLeft: "8px" }}
          >
            {open ? "▲" : "▼"}
          </span>
        </div>

        {open && (
          <div>
            {pItems.length === 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  color: T.ink300,
                  padding: "8px 14px",
                  margin: 0,
                }}
              >
                No items in this category.
              </p>
            ) : (
              pItems.map(renderItem)
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Movements drawer ───────────────────────────────────────────────────────

  const renderMovementsDrawer = () => {
    if (!movItem) return null;
    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.15)",
            zIndex: 999,
          }}
          onClick={() => setMovItem(null)}
        />
        {/* Drawer */}
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "400px",
            height: "100vh",
            background: "#fff",
            borderLeft: "1px solid " + T.ink150,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            fontFamily: T.font,
          }}
        >
          {/* Drawer header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid " + T.ink150,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{ fontSize: "13px", fontWeight: 600, color: T.ink700 }}
              >
                {movItem.name}
              </div>
              <div
                style={{ fontSize: "11px", color: T.ink300, marginTop: "2px" }}
              >
                Last 10 movements
              </div>
            </div>
            <button
              style={{
                ...sBtn,
                fontSize: "18px",
                padding: "0 6px",
                lineHeight: 1,
              }}
              onClick={() => setMovItem(null)}
            >
              ×
            </button>
          </div>

          {/* Current stock summary */}
          <div
            style={{
              padding: "10px 20px",
              background: T.ink075,
              borderBottom: "1px solid " + T.ink150,
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={sMetric("default")}>
              ON HAND: {fmtQty(movItem.quantity_on_hand, movItem.unit)}
            </span>
            <span style={sMetric("default")}>
              AVAIL:{" "}
              {fmtQty(
                (movItem.quantity_on_hand || 0) - (movItem.reserved_qty || 0),
                movItem.unit,
              )}
            </span>
          </div>

          {/* Movement list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {movLoading ? (
              <p style={{ fontSize: "12px", color: T.ink300 }}>Loading...</p>
            ) : movements.length === 0 ? (
              <p style={{ fontSize: "12px", color: T.ink300 }}>
                No movements recorded.
              </p>
            ) : (
              movements.map((m) => {
                const qty = m.quantity || 0;
                const isPos = qty >= 0;
                return (
                  <div key={m.id} style={{ ...sCard, marginBottom: "6px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: T.ink700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {(m.movement_type || "").replace(/_/g, " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontFamily: "'DM Mono','Courier New',monospace",
                          color: isPos ? T.success : T.danger,
                          fontWeight: 600,
                        }}
                      >
                        {isPos ? "+" : ""}
                        {fmtQty(qty, movItem.unit)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "4px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "11px", color: T.ink300 }}>
                        {m.created_at
                          ? new Date(m.created_at).toLocaleDateString("en-ZA", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                      {m.reference && (
                        <span style={{ fontSize: "11px", color: T.ink400 }}>
                          {m.reference}
                        </span>
                      )}
                      {m.unit_cost > 0 && (
                        <span style={{ fontSize: "11px", color: T.ink300 }}>
                          {fmt(m.unit_cost)}/unit
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <p
        style={{
          padding: "32px 0",
          color: T.ink300,
          fontSize: "13px",
          fontFamily: T.font,
        }}
      >
        Loading HQ stock...
      </p>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "16px",
          background: T.dangerBg,
          border: "1px solid " + T.dangerBd,
          borderRadius: "4px",
          color: T.danger,
          fontSize: "13px",
          fontFamily: T.font,
        }}
      >
        Error loading stock: {error}
      </div>
    );
  }

  const lowTotal = items.filter(isLow).length;
  const totalVal = items.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
    0,
  );

  return (
    <div style={{ fontFamily: T.font, color: T.ink700, maxWidth: "960px" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Outfit','Helvetica Neue',Arial,sans-serif",
              fontSize: "18px",
              fontWeight: 400,
              color: T.ink900,
              margin: "0 0 4px",
            }}
          >
            HQ Stock
          </h2>
          <p style={{ fontSize: "12px", color: T.ink300, margin: 0 }}>
            {items.length} item{items.length !== 1 ? "s" : ""} &middot; Total
            value: {fmt(totalVal)}
            {lowTotal > 0 && (
              <span
                style={{ color: T.danger, fontWeight: 600, marginLeft: "10px" }}
              >
                {lowTotal} below reorder level
              </span>
            )}
          </p>
        </div>
        <button
          style={{
            ...sBtn,
            background: T.accentMid,
            color: "#fff",
            borderColor: T.accentMid,
            padding: "6px 16px",
            fontSize: "12px",
          }}
          onClick={load}
        >
          Refresh
        </button>
      </div>

      {/* 4 Panels — in order */}
      {renderPanel("p1", labels.p1)}
      {renderPanel("p2", labels.p2)}
      {renderPanel("p3", labels.p3)}
      {renderPanel("p4", labels.p4)}

      {/* Movements drawer */}
      {renderMovementsDrawer()}
    </div>
  );
}
