// src/components/hq/HQStock.js v3.0 — WP-STOCK-PRO S3c
// HQ stock intelligence — profile-adaptive layout
// food_beverage: tabbed command centre (Overview | Items | Movements)
//   matching Admin Stock paradigm — searchable table, sortable columns,
//   food KPI strip, expiry colouring, temp zone, allergen count, lot#,
//   FEFO alert, cold chain panel, AVCO drift, Quick Adjust, Add/Edit
// All other profiles: accordion (preserved exactly from v2.0)
// Tables: inventory_items (HQ tenant only), stock_movements, suppliers
// RULE 0G: useTenant() called inside this component

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import StockItemModal from "../StockItemModal";

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
  mono: "'DM Mono','Courier New',monospace",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.font,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sSelect = { ...sInput, cursor: "pointer" };
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
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
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
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink150}`,
  fontSize: "13px",
  fontFamily: T.font,
  verticalAlign: "middle",
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

const sBtn = (v = "primary") => ({
  padding: "7px 16px",
  background: v === "primary" ? T.accentMid : "transparent",
  color: v === "primary" ? "#fff" : T.accentMid,
  border: v === "primary" ? "none" : `1px solid ${T.accentBd}`,
  borderRadius: "3px",
  fontSize: "12px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.font,
});

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
    info: {
      background: T.infoBg,
      border: "1px solid " + T.infoBd,
      color: T.info,
    },
  };
  return { ...sMetricBase, ...(map[variant] || map.default) };
};

const sBadgeBase = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRadius: "2px",
  padding: "1px 6px",
};
const sBadge = (v) => ({
  ...sBadgeBase,
  ...(v === "danger"
    ? {
        background: T.dangerBg,
        color: T.danger,
        border: "1px solid " + T.dangerBd,
      }
    : {}),
  ...(v === "warning"
    ? {
        background: T.warningBg,
        color: T.warning,
        border: "1px solid " + T.warningBd,
      }
    : {}),
  ...(v === "accent"
    ? {
        background: T.accentLit,
        color: T.accentMid,
        border: "1px solid " + T.accentBd,
      }
    : {}),
  ...(v === "info"
    ? { background: T.infoBg, color: T.info, border: "1px solid " + T.infoBd }
    : {}),
  ...(v === "default"
    ? { background: T.ink075, color: T.ink500, border: "1px solid " + T.ink150 }
    : {}),
  ...(v === "success"
    ? {
        background: T.successBg,
        color: T.success,
        border: "1px solid " + T.successBd,
      }
    : {}),
});

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

const CANNABIS_PROFILES = [
  "cannabis_retail",
  "cannabis_dispensary",
  "mixed_retail",
];

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
  medical_consumable: "Medical Consumable",
  accessory: "Accessory",
  ingredient: "Ingredient",
  equipment: "Equipment",
  other: "Other",
};

const FOOD_CATS = [
  "raw_material",
  "accessory",
  "packaging",
  "equipment",
  "finished_product",
  "ingredient",
  "other",
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
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const expiryStatus = (item) => {
  if (!item.expiry_date) return null;
  const days = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000);
  if (days < 0)
    return { label: "EXPIRED", variant: "danger", days, color: T.danger };
  if (days < 7)
    return { label: `${days}d LEFT`, variant: "danger", days, color: T.danger };
  if (days < 30)
    return { label: `${days}d`, variant: "warning", days, color: T.warning };
  return {
    label: fmtDate(item.expiry_date),
    variant: "ok",
    days,
    color: T.ink400,
  };
};

const tempInfo = (zone) =>
  ({
    frozen: {
      label: "FRZ",
      bg: "#EFF6FF",
      color: "#1D4ED8",
      border: "#BFDBFE",
    },
    refrigerated: {
      label: "REF",
      bg: "#F0FDF4",
      color: "#166534",
      border: "#BBF7D0",
    },
    ambient: { label: "AMB", bg: T.ink075, color: T.ink500, border: T.ink150 },
  })[zone] || null;

const countAllergens = (flags) =>
  !flags || typeof flags !== "object"
    ? 0
    : Object.values(flags).filter(Boolean).length;
const isLowFn = (item) =>
  item.reorder_level != null &&
  (item.quantity_on_hand || 0) <= item.reorder_level;

export default function HQStock() {
  const { industryProfile } = useTenant();

  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subTab, setSubTab] = useState("overview");
  const [openPanels, setOpenPanels] = useState({
    p1: true,
    p2: true,
    p3: false,
    p4: false,
  });

  const [movItem, setMovItem] = useState(null);
  const [movList, setMovList] = useState([]);
  const [movLoading, setMovLoading] = useState(false);

  const [modalItem, setModalItem] = useState(undefined);
  const [modalSaving, setModalSaving] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const isFoodBev = industryProfile === "food_beverage";
  const isCannabis = CANNABIS_PROFILES.includes(industryProfile);
  const labels = PANEL_LABELS[industryProfile] || PANEL_LABELS.general_retail;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: iData, error: iErr }, { data: sData }, { data: mData }] =
        await Promise.all([
          supabase
            .from("inventory_items")
            .select("*, suppliers(name)")
            .eq("tenant_id", HQ_TENANT_ID)
            .order("name"),
          supabase
            .from("suppliers")
            .select("id, name")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("stock_movements")
            .select("*")
            .eq("tenant_id", HQ_TENANT_ID)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);
      if (iErr) throw iErr;
      setItems(iData || []);
      setSuppliers(sData || []);
      setMovements(mData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMovForItem = async (item) => {
    setMovItem(item);
    setMovList([]);
    setMovLoading(true);
    try {
      const { data } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(25);
      setMovList(data || []);
    } finally {
      setMovLoading(false);
    }
  };

  const handleSave = async (payload) => {
    setModalSaving(true);
    try {
      if (modalItem) {
        const { error: e } = await supabase
          .from("inventory_items")
          .update(payload)
          .eq("id", modalItem.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from("inventory_items")
          .insert(payload);
        if (e) throw e;
      }
      setModalItem(undefined);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setModalSaving(false);
    }
  };

  const handleAdjust = async (item) => {
    const delta = parseFloat(adjustQty);
    if (!delta || isNaN(delta)) {
      setAdjustError("Enter a quantity (+ to add, - to remove).");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Reason is required for audit trail.");
      return;
    }
    setAdjustSaving(true);
    setAdjustError("");
    try {
      const newQty = Math.max(0, (item.quantity_on_hand || 0) + delta);
      await supabase
        .from("stock_movements")
        .insert({
          item_id: item.id,
          tenant_id: HQ_TENANT_ID,
          movement_type: "adjustment",
          quantity: delta,
          reference: `ADJ-HQ-${Date.now()}`,
          notes: adjustReason.trim(),
          unit_cost: item.weighted_avg_cost || null,
        });
      await supabase
        .from("inventory_items")
        .update({ quantity_on_hand: newQty })
        .eq("id", item.id);
      setAdjustOpen(null);
      setAdjustQty("");
      setAdjustReason("");
      load();
    } catch (err) {
      setAdjustError(err.message);
    } finally {
      setAdjustSaving(false);
    }
  };

  const openAdj = (id) => {
    setAdjustOpen(id);
    setAdjustQty("");
    setAdjustReason("");
    setAdjustError("");
  };
  const closeAdj = () => {
    setAdjustOpen(null);
    setAdjustQty("");
    setAdjustReason("");
    setAdjustError("");
  };

  const foodKPIs = isFoodBev
    ? (() => {
        const now = new Date();
        let expired = 0,
          exp7 = 0,
          exp30 = 0,
          noExp = 0,
          allergens = 0,
          cold = 0,
          low = 0,
          cost = 0;
        items.forEach((i) => {
          if (isLowFn(i)) low++;
          cost += (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0);
          if (i.expiry_date) {
            const d = Math.ceil((new Date(i.expiry_date) - now) / 86400000);
            if (d < 0) expired++;
            else if (d < 7) exp7++;
            else if (d < 30) exp30++;
          } else if (!["packaging", "equipment"].includes(i.category)) noExp++;
          if (countAllergens(i.allergen_flags) > 0) allergens++;
          if (i.temperature_zone && i.temperature_zone !== "ambient") cold++;
        });
        return { expired, exp7, exp30, noExp, allergens, cold, low, cost };
      })()
    : null;

  const renderMovDrawer = () => {
    if (!movItem) return null;
    const expiry = isFoodBev ? expiryStatus(movItem) : null;
    return (
      <>
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.15)",
            zIndex: 999,
          }}
          onClick={() => setMovItem(null)}
        />
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "420px",
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
                Last 25 movements · {movItem.sku}
              </div>
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: T.ink300,
              }}
              onClick={() => setMovItem(null)}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              padding: "10px 20px",
              background: T.ink075,
              borderBottom: "1px solid " + T.ink150,
              display: "flex",
              gap: "10px",
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
            {expiry && (
              <span
                style={sMetric(
                  expiry.variant === "ok" ? "default" : expiry.variant,
                )}
              >
                EXP: {fmtDate(movItem.expiry_date)}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {movLoading ? (
              <p style={{ fontSize: "12px", color: T.ink300 }}>Loading...</p>
            ) : movList.length === 0 ? (
              <p style={{ fontSize: "12px", color: T.ink300 }}>
                No movements recorded.
              </p>
            ) : (
              movList.map((m) => {
                const qty = m.quantity || 0;
                const pos = qty >= 0;
                return (
                  <div key={m.id} style={{ ...sCard, marginBottom: "6px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
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
                          fontFamily: T.mono,
                          color: pos ? T.success : T.danger,
                          fontWeight: 600,
                        }}
                      >
                        {pos ? "+" : ""}
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
                        {fmtDate(m.created_at)}
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
                      {m.notes && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: T.ink400,
                            fontStyle: "italic",
                          }}
                        >
                          {m.notes}
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

  const renderAdjust = (item) =>
    adjustOpen !== item.id ? null : (
      <div
        style={{
          marginTop: "10px",
          padding: "12px 14px",
          background: T.warningBg,
          border: "1px solid " + T.warningBd,
          borderRadius: "4px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: T.warning,
            marginBottom: "8px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Stock Adjustment — {item.name}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr auto",
            gap: "8px",
            alignItems: "flex-end",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "10px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Qty (+/−)
            </label>
            <input
              type="number"
              step="0.01"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. -5 or +10"
              style={{
                padding: "7px 10px",
                border: "1px solid " + T.warningBd,
                borderRadius: "3px",
                fontSize: "13px",
                fontFamily: T.font,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "10px",
                color: T.ink500,
                display: "block",
                marginBottom: "4px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Reason (audit trail) *
            </label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Stock take correction, Spoilage"
              style={{
                padding: "7px 10px",
                border: "1px solid " + T.warningBd,
                borderRadius: "3px",
                fontSize: "13px",
                fontFamily: T.font,
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => handleAdjust(item)}
            disabled={adjustSaving}
            style={{
              ...sBtn(),
              padding: "7px 16px",
              whiteSpace: "nowrap",
              opacity: adjustSaving ? 0.6 : 1,
            }}
          >
            {adjustSaving ? "Saving..." : "Confirm"}
          </button>
        </div>
        {adjustError && (
          <p style={{ fontSize: "11px", color: T.danger, margin: "6px 0 0" }}>
            {adjustError}
          </p>
        )}
        <p style={{ fontSize: "10px", color: T.warning, margin: "6px 0 0" }}>
          Current: {fmtQty(item.quantity_on_hand, item.unit)} · Written to
          stock_movements (adjustment) for full audit trail.
        </p>
      </div>
    );

  // ── FOOD OVERVIEW ─────────────────────────────────────────────────────────
  const FoodOverview = () => {
    if (!foodKPIs) return null;
    const expiring = items
      .filter((i) => {
        const e = expiryStatus(i);
        return e && (e.variant === "danger" || e.variant === "warning");
      })
      .sort((a, b) =>
        (a.expiry_date || "9999") < (b.expiry_date || "9999") ? -1 : 1,
      );
    const coldItems = items.filter(
      (i) => i.temperature_zone && i.temperature_zone !== "ambient",
    );
    const lowItems = items.filter(isLowFn);
    const drifted = items.filter(
      (i) =>
        i.weighted_avg_cost &&
        i.cost_price &&
        Math.abs((i.weighted_avg_cost - i.cost_price) / i.cost_price) > 0.05,
    );

    return (
      <div style={{ display: "grid", gap: "20px" }}>
        {/* KPI grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
            gap: "1px",
            background: T.ink150,
            borderRadius: "6px",
            overflow: "hidden",
            border: "1px solid " + T.ink150,
          }}
        >
          {[
            {
              label: "Expired",
              value: foodKPIs.expired,
              top: foodKPIs.expired > 0 ? T.danger : T.ink150,
              note: "remove immediately",
            },
            {
              label: "Expiring <7d",
              value: foodKPIs.exp7,
              top: foodKPIs.exp7 > 0 ? T.danger : T.ink150,
              note: "urgent action",
            },
            {
              label: "Expiring <30d",
              value: foodKPIs.exp30,
              top: foodKPIs.exp30 > 0 ? T.warning : T.ink150,
              note: "use first (FEFO)",
            },
            {
              label: "No Expiry Set",
              value: foodKPIs.noExp,
              top: foodKPIs.noExp > 0 ? T.warning : T.ink150,
              note: "edit items to add",
            },
            {
              label: "Allergen Items",
              value: foodKPIs.allergens,
              top: T.accentMid,
              note: "declared",
            },
            {
              label: "Cold Chain",
              value: foodKPIs.cold,
              top: T.info,
              note: "REF / FRZ items",
            },
            {
              label: "Low Stock",
              value: foodKPIs.low,
              top: foodKPIs.low > 0 ? T.warning : T.ink150,
              note: "below reorder level",
            },
            {
              label: "Total Value",
              value: fmt(foodKPIs.cost),
              top: T.ink150,
              note: "AVCO-weighted",
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                background: "#fff",
                padding: "16px 18px",
                borderTop: "3px solid " + k.top,
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 400,
                  color: T.ink900,
                  fontFamily: T.mono,
                  lineHeight: 1,
                  marginBottom: "4px",
                  letterSpacing: "-0.02em",
                }}
              >
                {k.value}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: T.ink400,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {k.label}
              </div>
              <div
                style={{ fontSize: "10px", color: T.ink300, marginTop: "2px" }}
              >
                {k.note}
              </div>
            </div>
          ))}
        </div>

        {/* FEFO alert */}
        {expiring.length > 0 && (
          <div
            style={{
              background: T.warningBg,
              border: "1px solid " + T.warningBd,
              borderRadius: "6px",
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: "12px",
              }}
            >
              FEFO Alert — {expiring.length} item
              {expiring.length !== 1 ? "s" : ""} expiring soon · use or reorder
              first
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Item",
                    "Category",
                    "On Hand",
                    "Expiry",
                    "Days Left",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "6px 10px",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.warning,
                        borderBottom: "1px solid " + T.warningBd,
                        fontWeight: 700,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiring.map((item) => {
                  const ex = expiryStatus(item);
                  return (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          fontWeight: 600,
                          color: T.ink700,
                        }}
                      >
                        {item.name}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          color: T.ink500,
                          fontSize: "11px",
                        }}
                      >
                        {CATEGORY_LABELS[item.category] || item.category}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          fontFamily: T.mono,
                        }}
                      >
                        {fmtQty(item.quantity_on_hand, item.unit)}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                          fontFamily: T.mono,
                          color: ex?.color,
                        }}
                      >
                        {fmtDate(item.expiry_date)}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                        }}
                      >
                        <span style={sBadge(ex?.variant || "default")}>
                          {ex?.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          borderBottom: "1px solid " + T.warningBd,
                        }}
                      >
                        <button
                          style={{
                            ...sBtn(),
                            padding: "3px 10px",
                            fontSize: "10px",
                          }}
                          onClick={() => setModalItem(item)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Cold chain */}
        {coldItems.length > 0 && (
          <div
            style={{
              background: T.infoBg,
              border: "1px solid " + T.infoBd,
              borderRadius: "6px",
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.info,
                marginBottom: "12px",
              }}
            >
              Cold Chain — {coldItems.length} item
              {coldItems.length !== 1 ? "s" : ""} requiring temperature control
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                gap: "8px",
              }}
            >
              {coldItems.map((item) => {
                const ti = tempInfo(item.temperature_zone);
                const ex = expiryStatus(item);
                return (
                  <div
                    key={item.id}
                    style={{
                      background: "#fff",
                      border: "1px solid " + T.infoBd,
                      borderRadius: "4px",
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: T.ink700,
                        }}
                      >
                        {item.name}
                      </span>
                      {ti && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            background: ti.bg,
                            color: ti.color,
                            border: "1px solid " + ti.border,
                            borderRadius: "2px",
                            padding: "1px 6px",
                          }}
                        >
                          {ti.label}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      <span style={sMetric("default")}>
                        {fmtQty(item.quantity_on_hand, item.unit)}
                      </span>
                      {ex && (
                        <span
                          style={sMetric(
                            ex.variant === "ok" ? "default" : ex.variant,
                          )}
                        >
                          EXP: {fmtDate(item.expiry_date)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Low stock */}
        {lowItems.length > 0 && (
          <div
            style={{
              background: T.warningBg,
              border: "1px solid " + T.warningBd,
              borderRadius: "6px",
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: "12px",
              }}
            >
              Low Stock — {lowItems.length} item
              {lowItems.length !== 1 ? "s" : ""} below reorder level
            </div>
            {lowItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid " + T.warningBd,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: T.ink900,
                    }}
                  >
                    {item.name}
                  </span>
                  {item.suppliers?.name && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: T.ink400,
                        marginLeft: "8px",
                      }}
                    >
                      {item.suppliers.name}
                    </span>
                  )}
                </div>
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontFamily: T.mono,
                      color: T.danger,
                      fontWeight: 700,
                    }}
                  >
                    {fmtQty(item.quantity_on_hand, item.unit)}
                  </span>
                  <span style={{ fontSize: "11px", color: T.ink400 }}>
                    min {fmtQty(item.reorder_level, item.unit)}
                  </span>
                  {item.reorder_qty && (
                    <span style={{ fontSize: "11px", color: T.warning }}>
                      order {fmtQty(item.reorder_qty, item.unit)}
                    </span>
                  )}
                  {item.supplier_id && (
                    <span
                      style={{
                        ...sBadgeBase,
                        background: T.infoBg,
                        color: T.info,
                        border: "1px solid " + T.infoBd,
                      }}
                    >
                      → Raise PO
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AVCO drift */}
        {drifted.length > 0 && (
          <div
            style={{
              background: T.warningBg,
              border: "1px solid " + T.warningBd,
              borderRadius: "6px",
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.warning,
                marginBottom: "10px",
              }}
            >
              AVCO Cost Drift — {drifted.length} item
              {drifted.length !== 1 ? "s" : ""} where real cost differs from
              recorded by &gt;5%
            </div>
            {drifted.map((item) => {
              const drift =
                ((item.weighted_avg_cost - item.cost_price) / item.cost_price) *
                100;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid " + T.warningBd,
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: T.ink900,
                    }}
                  >
                    {item.name}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: T.ink400,
                        fontFamily: T.mono,
                      }}
                    >
                      Recorded: {fmt(item.cost_price)}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: T.warning,
                        fontFamily: T.mono,
                      }}
                    >
                      AVCO: {fmt(item.weighted_avg_cost)}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: drift > 0 ? T.danger : T.success,
                        fontFamily: T.mono,
                      }}
                    >
                      {drift > 0 ? "↑" : "↓"} {Math.abs(drift).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── FOOD ITEMS TABLE ──────────────────────────────────────────────────────
  const FoodItems = () => {
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("all");
    const [tempFilter, setTempFilter] = useState("all");
    const [allergenFilter, setAllergenFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name");

    const filtered = items
      .filter((i) => {
        if (catFilter !== "all" && i.category !== catFilter) return false;
        if (
          tempFilter !== "all" &&
          (i.temperature_zone || "ambient") !== tempFilter
        )
          return false;
        if (allergenFilter === "has" && countAllergens(i.allergen_flags) === 0)
          return false;
        if (allergenFilter === "none" && countAllergens(i.allergen_flags) > 0)
          return false;
        if (search) {
          const q = search.toLowerCase();
          if (
            !i.name?.toLowerCase().includes(q) &&
            !i.sku?.toLowerCase().includes(q) &&
            !(i.batch_lot_number || "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "expiry")
          return (a.expiry_date || "9999") < (b.expiry_date || "9999") ? -1 : 1;
        if (sortBy === "low")
          return isLowFn(a) === isLowFn(b) ? 0 : isLowFn(a) ? -1 : 1;
        if (sortBy === "avco")
          return (b.weighted_avg_cost || 0) - (a.weighted_avg_cost || 0);
        return (a.name || "").localeCompare(b.name || "");
      });

    return (
      <div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <input
            type="text"
            placeholder="Search name, SKU, lot number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...sInput, width: "240px" }}
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{ ...sSelect, width: "155px" }}
          >
            <option value="all">All Categories</option>
            {FOOD_CATS.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABELS[k] || k}
              </option>
            ))}
          </select>
          <select
            value={tempFilter}
            onChange={(e) => setTempFilter(e.target.value)}
            style={{ ...sSelect, width: "150px" }}
          >
            <option value="all">All Temp Zones</option>
            <option value="ambient">AMB – Ambient</option>
            <option value="refrigerated">REF – Refrigerated</option>
            <option value="frozen">FRZ – Frozen</option>
          </select>
          <select
            value={allergenFilter}
            onChange={(e) => setAllergenFilter(e.target.value)}
            style={{ ...sSelect, width: "140px" }}
          >
            <option value="all">All Allergens</option>
            <option value="has">Has Allergens</option>
            <option value="none">No Allergens</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ ...sSelect, width: "150px" }}
          >
            <option value="name">Sort: Name A–Z</option>
            <option value="expiry">Sort: Expiry (FEFO)</option>
            <option value="low">Sort: Low Stock First</option>
            <option value="avco">Sort: AVCO High–Low</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "12px", color: T.ink400 }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
          <button style={sBtn()} onClick={() => setModalItem(null)}>
            + Add Item
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid " + T.ink150,
            borderRadius: "6px",
            overflow: "auto",
            boxShadow: T.shadow,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Name / SKU</th>
                <th style={sTh}>Category</th>
                <th style={{ ...sTh, textAlign: "center" }}>Temp</th>
                <th style={{ ...sTh, textAlign: "right" }}>On Hand</th>
                <th style={{ ...sTh, textAlign: "right" }}>Available</th>
                <th style={{ ...sTh, textAlign: "right" }}>AVCO / unit</th>
                <th style={sTh}>Expiry</th>
                <th style={{ ...sTh, textAlign: "center" }}>⚠</th>
                <th style={sTh}>Lot / Batch</th>
                <th style={sTh}>Reorder</th>
                <th style={sTh}>Supplier</th>
                <th style={sTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="12"
                    style={{
                      ...sTd,
                      textAlign: "center",
                      color: T.ink300,
                      padding: "40px",
                    }}
                  >
                    No items match your filters.{" "}
                    <span
                      style={{
                        color: T.accentMid,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      onClick={() => setModalItem(null)}
                    >
                      Add the first one →
                    </span>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const low = isLowFn(item);
                  const avail =
                    (item.quantity_on_hand || 0) - (item.reserved_qty || 0);
                  const expiry = expiryStatus(item);
                  const ti = tempInfo(item.temperature_zone);
                  const ac = countAllergens(item.allergen_flags);
                  const isAdj = adjustOpen === item.id;
                  const rowBg =
                    expiry?.variant === "danger" || low ? "#FFF9F9" : "#fff";
                  const leftBorder =
                    low || expiry?.variant === "danger"
                      ? "3px solid " + T.danger
                      : expiry?.variant === "warning"
                        ? "3px solid " + T.warning
                        : "3px solid transparent";

                  return (
                    <React.Fragment key={item.id}>
                      <tr style={{ background: rowBg, borderLeft: leftBorder }}>
                        <td style={{ ...sTd, minWidth: "180px" }}>
                          <div style={{ fontWeight: 600, color: T.ink700 }}>
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: T.ink300,
                              fontFamily: T.mono,
                              marginTop: "2px",
                            }}
                          >
                            {item.sku}
                          </div>
                          {low && (
                            <span
                              style={{
                                ...sBadge("danger"),
                                marginTop: "3px",
                                display: "inline-block",
                              }}
                            >
                              LOW
                            </span>
                          )}
                        </td>
                        <td style={sTd}>
                          <span
                            style={{
                              fontSize: "9px",
                              padding: "2px 7px",
                              borderRadius: "3px",
                              background: T.ink075,
                              color: T.ink500,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              fontWeight: 700,
                            }}
                          >
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                        </td>
                        <td style={{ ...sTd, textAlign: "center" }}>
                          {ti ? (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                background: ti.bg,
                                color: ti.color,
                                border: "1px solid " + ti.border,
                                borderRadius: "2px",
                                padding: "2px 6px",
                              }}
                            >
                              {ti.label}
                            </span>
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.mono,
                            fontWeight: 600,
                            color: low ? T.danger : T.ink700,
                          }}
                        >
                          {fmtQty(item.quantity_on_hand, item.unit)}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.mono,
                            fontWeight: 700,
                            color: avail <= 0 ? T.danger : T.success,
                          }}
                        >
                          {fmtQty(avail, item.unit)}
                          {(item.reserved_qty || 0) > 0 && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "9px",
                                color: T.warning,
                                fontWeight: 600,
                              }}
                            >
                              {item.reserved_qty} held
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            textAlign: "right",
                            fontFamily: T.mono,
                            fontSize: "12px",
                            color: T.ink500,
                          }}
                        >
                          {item.weighted_avg_cost ? (
                            fmt(item.weighted_avg_cost) +
                            "/" +
                            (item.unit || "u")
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                          {expiry ? (
                            expiry.variant !== "ok" ? (
                              <span style={sBadge(expiry.variant)}>
                                {expiry.label}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: T.ink400,
                                  fontFamily: T.mono,
                                }}
                              >
                                {fmtDate(item.expiry_date)}
                              </span>
                            )
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, textAlign: "center" }}>
                          {ac > 0 ? (
                            <span style={sBadge("warning")}>⚠ {ac}</span>
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...sTd,
                            fontSize: "11px",
                            color: T.ink400,
                            fontFamily: T.mono,
                          }}
                        >
                          {item.batch_lot_number || (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, fontSize: "11px" }}>
                          {item.reorder_level != null ? (
                            <span style={{ color: low ? T.danger : T.ink400 }}>
                              {fmtQty(item.reorder_level, item.unit)}
                              {item.reorder_qty && (
                                <span style={{ color: T.warning }}>
                                  →{fmtQty(item.reorder_qty, item.unit)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td
                          style={{ ...sTd, fontSize: "11px", color: T.ink400 }}
                        >
                          {item.suppliers?.name || (
                            <span style={{ color: T.ink300 }}>—</span>
                          )}
                        </td>
                        <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              style={{
                                padding: "3px 8px",
                                fontSize: "10px",
                                fontFamily: T.font,
                                fontWeight: 600,
                                border: "1px solid " + T.accentBd,
                                color: T.accentMid,
                                background: "transparent",
                                borderRadius: "3px",
                                cursor: "pointer",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                              onClick={() => setModalItem(item)}
                            >
                              Edit
                            </button>
                            <button
                              style={{
                                padding: "3px 8px",
                                fontSize: "10px",
                                fontFamily: T.font,
                                fontWeight: 600,
                                border:
                                  "1px solid " +
                                  (isAdj ? T.dangerBd : T.warningBd),
                                color: isAdj ? T.danger : T.warning,
                                background: "transparent",
                                borderRadius: "3px",
                                cursor: "pointer",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                              onClick={() =>
                                isAdj ? closeAdj() : openAdj(item.id)
                              }
                            >
                              {isAdj ? "Cancel" : "Adjust"}
                            </button>
                            <button
                              style={{
                                padding: "3px 8px",
                                fontSize: "10px",
                                fontFamily: T.font,
                                fontWeight: 600,
                                border: "1px solid " + T.ink150,
                                color: T.ink500,
                                background: "transparent",
                                borderRadius: "3px",
                                cursor: "pointer",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                              onClick={() => loadMovForItem(item)}
                            >
                              Mov
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isAdj && (
                        <tr>
                          <td
                            colSpan="12"
                            style={{
                              padding: "0 12px 12px",
                              background: "#FFF9F9",
                            }}
                          >
                            {renderAdjust(item)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── FOOD MOVEMENTS ────────────────────────────────────────────────────────
  const FoodMovements = () => {
    const [search, setSearch] = useState("");
    const filtered = movements.filter((m) => {
      if (!search) return true;
      const item = items.find((i) => i.id === m.item_id);
      const q = search.toLowerCase();
      return (
        (item?.name || "").toLowerCase().includes(q) ||
        (m.reference || "").toLowerCase().includes(q) ||
        (m.movement_type || "").includes(q)
      );
    });
    return (
      <div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "16px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search movements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...sInput, width: "280px" }}
          />
          <span style={{ fontSize: "12px", color: T.ink400 }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid " + T.ink150,
            borderRadius: "6px",
            overflow: "auto",
            boxShadow: T.shadow,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr style={{ background: T.ink050 }}>
                {[
                  "Date",
                  "Item",
                  "Type",
                  "Qty",
                  "AVCO/unit",
                  "Reference",
                  "Notes",
                ].map((h) => (
                  <th key={h} style={sTh}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      ...sTd,
                      textAlign: "center",
                      color: T.ink300,
                      padding: "32px",
                    }}
                  >
                    No movements found.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 100).map((m) => {
                  const item = items.find((i) => i.id === m.item_id);
                  const qty = m.quantity || 0;
                  const pos = qty >= 0;
                  return (
                    <tr key={m.id}>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink400,
                          fontFamily: T.mono,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(m.created_at)}
                      </td>
                      <td style={{ ...sTd, fontWeight: 500 }}>
                        {item?.name || (
                          <span style={{ color: T.ink300 }}>Unknown</span>
                        )}
                      </td>
                      <td style={sTd}>
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "2px 7px",
                            borderRadius: "3px",
                            background: T.ink075,
                            color: T.ink500,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            fontWeight: 700,
                          }}
                        >
                          {(m.movement_type || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.mono,
                          fontWeight: 700,
                          color: pos ? T.success : T.danger,
                        }}
                      >
                        {pos ? "+" : ""}
                        {fmtQty(qty, item?.unit)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.mono,
                          fontSize: "12px",
                          color: T.ink400,
                        }}
                      >
                        {m.unit_cost ? fmt(m.unit_cost) : "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink400,
                          fontFamily: T.mono,
                        }}
                      >
                        {m.reference || "—"}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink400,
                          fontStyle: m.notes ? "italic" : "normal",
                        }}
                      >
                        {m.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── ACCORDION ITEM (non-food) ─────────────────────────────────────────────
  const renderAccItem = (item) => {
    const low = isLowFn(item);
    const avail = (item.quantity_on_hand || 0) - (item.reserved_qty || 0);
    const totalVal =
      (item.quantity_on_hand || 0) * (item.weighted_avg_cost || 0);
    const isAdj = adjustOpen === item.id;
    return (
      <div
        key={item.id}
        style={{
          ...sCard,
          borderLeft: low ? "3px solid " + T.danger : "3px solid transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
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
              style={{ fontSize: "13px", fontWeight: 600, color: T.ink700 }}
            >
              {item.name}
            </span>
            {item.sku && (
              <span
                style={{
                  fontSize: "11px",
                  color: T.ink300,
                  fontFamily: T.mono,
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
          </div>
          <div style={{ display: "flex", gap: "5px" }}>
            <button
              style={{
                padding: "3px 10px",
                fontSize: "11px",
                fontFamily: T.font,
                background: "transparent",
                border: "1px solid " + T.ink150,
                borderRadius: "2px",
                cursor: "pointer",
                color: T.ink500,
              }}
              onClick={() => loadMovForItem(item)}
            >
              Movements
            </button>
            <button
              style={{
                padding: "3px 10px",
                fontSize: "11px",
                fontFamily: T.font,
                background: "transparent",
                border: "1px solid " + T.accentBd,
                borderRadius: "2px",
                cursor: "pointer",
                color: T.accentMid,
              }}
              onClick={() => setModalItem(item)}
            >
              Edit
            </button>
            <button
              style={{
                padding: "3px 10px",
                fontSize: "11px",
                fontFamily: T.font,
                background: "transparent",
                border: "1px solid " + (isAdj ? T.dangerBd : T.ink150),
                borderRadius: "2px",
                cursor: "pointer",
                color: isAdj ? T.danger : T.ink500,
              }}
              onClick={() => (isAdj ? closeAdj() : openAdj(item.id))}
            >
              {isAdj ? "Cancel" : "Adjust"}
            </button>
          </div>
        </div>
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
          <span style={sMetric(avail < 0 ? "danger" : "default")}>
            AVAIL: {fmtQty(avail, item.unit)}
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
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {item.suppliers?.name && (
            <span style={{ fontSize: "11px", color: T.ink400 }}>
              Supplier: {item.suppliers.name}
            </span>
          )}
          {low && item.reorder_level != null && (
            <span style={{ fontSize: "11px", color: T.danger }}>
              Reorder at: {fmtQty(item.reorder_level, item.unit)}
            </span>
          )}
        </div>
        {renderAdjust(item)}
      </div>
    );
  };

  const renderAccPanel = (key) => {
    const prof =
      PANEL_CATS_BY_PROFILE[industryProfile] ||
      PANEL_CATS_BY_PROFILE.cannabis_retail;
    const pItems = items.filter((i) => prof[key].includes(i.category));
    const open = openPanels[key];
    const lowCount = pItems.filter(isLowFn).length;
    const totalVal = pItems.reduce(
      (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
      0,
    );
    return (
      <div style={{ marginBottom: "16px" }} key={key}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <div
            style={{ ...sPanelHead, flex: 1, marginBottom: 0 }}
            onClick={() => setOpenPanels((p) => ({ ...p, [key]: !p[key] }))}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ fontSize: "13px", fontWeight: 600, color: T.ink700 }}
              >
                {labels[key]}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: T.ink300,
                  fontFamily: T.mono,
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
            <span style={{ fontSize: "12px", color: T.ink300 }}>
              {open ? "▲" : "▼"}
            </span>
          </div>
          <button
            style={{
              ...sBtn(),
              padding: "6px 12px",
              fontSize: "11px",
              whiteSpace: "nowrap",
            }}
            onClick={() => setModalItem(null)}
          >
            + Add Item
          </button>
        </div>
        {open && (
          <div>
            {pItems.length === 0 ? (
              <div
                style={{
                  fontSize: "12px",
                  color: T.ink300,
                  padding: "14px",
                  border: "1px dashed " + T.ink150,
                  borderRadius: "4px",
                  textAlign: "center",
                  background: T.ink050,
                }}
              >
                No items.{" "}
                <span
                  style={{
                    color: T.accentMid,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                  onClick={() => setModalItem(null)}
                >
                  Add the first one →
                </span>
              </div>
            ) : (
              pItems.map(renderAccItem)
            )}
          </div>
        )}
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loading)
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
  if (error)
    return (
      <div
        style={{
          padding: "16px",
          background: T.dangerBg,
          border: "1px solid " + T.dangerBd,
          borderRadius: "4px",
          color: T.danger,
          fontSize: "13px",
        }}
      >
        Error: {error}
      </div>
    );

  const lowTotal = items.filter(isLowFn).length;
  const totalVal = items.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (i.weighted_avg_cost || 0),
    0,
  );

  return (
    <div style={{ fontFamily: T.font, color: T.ink700, maxWidth: "1100px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: isFoodBev ? "0" : "16px",
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
            {items.length} item{items.length !== 1 ? "s" : ""} · Total value:{" "}
            {fmt(totalVal)}
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
            padding: "6px 14px",
            background: "transparent",
            border: "1px solid " + T.ink150,
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "12px",
            fontFamily: T.font,
            color: T.ink500,
          }}
          onClick={load}
        >
          Refresh
        </button>
      </div>

      {isFoodBev ? (
        <>
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid " + T.ink150,
              marginBottom: "24px",
              marginTop: "16px",
            }}
          >
            {[
              { id: "overview", label: "Overview" },
              { id: "items", label: `Items (${items.length})` },
              { id: "movements", label: "Movements" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                style={{
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  borderBottom:
                    subTab === t.id
                      ? "2px solid " + T.accentMid
                      : "2px solid transparent",
                  fontFamily: T.font,
                  fontSize: "11px",
                  fontWeight: subTab === t.id ? 700 : 400,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: subTab === t.id ? T.accentMid : T.ink500,
                  cursor: "pointer",
                  marginBottom: "-1px",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {subTab === "overview" && <FoodOverview />}
          {subTab === "items" && <FoodItems />}
          {subTab === "movements" && <FoodMovements />}
        </>
      ) : (
        <>
          {renderAccPanel("p1")}
          {renderAccPanel("p2")}
          {renderAccPanel("p3")}
          {renderAccPanel("p4")}
        </>
      )}

      {renderMovDrawer()}
      {modalItem !== undefined && (
        <StockItemModal
          item={modalItem || null}
          suppliers={suppliers}
          visibleCategories={Object.keys(CATEGORY_LABELS)}
          onSave={handleSave}
          onCancel={() => setModalItem(undefined)}
          saving={modalSaving}
        />
      )}
    </div>
  );
}
