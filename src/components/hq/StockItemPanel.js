// src/components/hq/StockItemPanel.js v1.0 — WP-STOCK-UI Session B
// Item Detail Side Panel — slides open when clicking any product row in HQStock
// 4 tabs: Details · Stock History · QR & Loyalty · AI Analysis
// Read-only view with inline edit fields. No full modal needed.
// cannabis_retail profile only (called from CannabisItemsView)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

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
  purple: "#5B21B6",
  purpleBg: "#F5F3FF",
  purpleBd: "#DDD6FE",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
};

const sInput = {
  padding: "7px 10px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "12px",
  fontFamily: T.font,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  color: T.ink900,
};
const sSelect = { ...sInput, cursor: "pointer" };

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
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const LOYALTY_CATEGORIES = [
  { value: "", label: "— Not set —" },
  { value: "cannabis_flower", label: "Cannabis Flower (2.0×)" },
  { value: "cannabis_vape", label: "Cannabis Vape (1.75×)" },
  { value: "cannabis_edible", label: "Cannabis Edible (1.5×)" },
  { value: "seeds_clones", label: "Seeds & Clones (3.0×)" },
  { value: "grow_supplies", label: "Grow Supplies (1.0×)" },
  { value: "accessories", label: "Accessories (0.75×)" },
  { value: "health_wellness", label: "Health & Wellness (1.5×)" },
  { value: "lifestyle_merch", label: "Lifestyle / Merch (2.0×)" },
];

const AI_QUESTIONS = [
  "What's the ideal sell price for this product?",
  "How does the margin on this item compare to similar products?",
  "Is this item worth keeping in stock based on velocity?",
  "What loyalty multiplier would maximise sales without hurting margin?",
  "Suggest a reorder level based on typical cannabis retail patterns.",
  "Is this product underpriced or overpriced for the SA market?",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, mono }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "7px 0",
        borderBottom: `1px solid ${T.ink075}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: T.ink400,
          fontFamily: T.font,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: T.ink700,
          fontFamily: mono ? T.mono : T.font,
          fontWeight: mono ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: T.ink400,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontFamily: T.font,
        marginTop: 16,
        marginBottom: 8,
        paddingBottom: 4,
        borderBottom: `1px solid ${T.ink150}`,
      }}
    >
      {children}
    </div>
  );
}

function Chip({
  label,
  color = T.accentMid,
  bg = T.accentLit,
  border = T.accentBd,
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: T.font,
        background: bg,
        color,
        border: `1px solid ${border}`,
        marginRight: 4,
        marginBottom: 4,
      }}
    >
      {label}
    </span>
  );
}

// ── TAB 1: Details ────────────────────────────────────────────────────────────

function TabDetails({ item, onEdit, onSave, tenantId }) {
  const margin =
    item.sell_price > 0 && item.cost_price > 0
      ? (((item.sell_price - item.cost_price) / item.sell_price) * 100).toFixed(
          1,
        )
      : null;
  const avail = (item.quantity_on_hand || 0) - (item.reserved_qty || 0);
  const totalValue =
    (item.quantity_on_hand || 0) *
    (item.weighted_avg_cost || item.cost_price || 0);

  // Inline price edit
  const [editPrice, setEditPrice] = useState(false);
  const [sellPrice, setSellPrice] = useState(item.sell_price || 0);
  const [costPrice, setCostPrice] = useState(item.cost_price || 0);
  const [saving, setSaving] = useState(false);

  const liveMargin =
    sellPrice > 0 && costPrice > 0
      ? (((sellPrice - costPrice) / sellPrice) * 100).toFixed(1)
      : null;

  const handleSavePrice = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("inventory_items")
      .update({
        sell_price: parseFloat(sellPrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
      })
      .eq("id", item.id);
    setSaving(false);
    if (!error) {
      setEditPrice(false);
      onSave();
    }
  };

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
      {/* Identity */}
      <SectionLabel>Identity</SectionLabel>
      <Row label="SKU" value={item.sku} mono />
      <Row label="Category" value={item.category?.replace(/_/g, " ")} />
      {item.brand && <Row label="Brand" value={item.brand} />}
      {item.subcategory && (
        <Row label="Subcategory" value={item.subcategory?.replace(/_/g, " ")} />
      )}
      {item.variant_value && (
        <div
          style={{ padding: "7px 0", borderBottom: `1px solid ${T.ink075}` }}
        >
          <span
            style={{
              fontSize: 11,
              color: T.ink400,
              fontFamily: T.font,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Variant
          </span>
          <div style={{ marginTop: 4 }}>
            <Chip
              label={item.variant_value}
              color="#3730A3"
              bg="#EEF2FF"
              border="#C7D2FE"
            />
          </div>
        </div>
      )}
      {item.tags && item.tags.length > 0 && (
        <div
          style={{ padding: "7px 0", borderBottom: `1px solid ${T.ink075}` }}
        >
          <span
            style={{
              fontSize: 11,
              color: T.ink400,
              fontFamily: T.font,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Tags
          </span>
          <div style={{ marginTop: 6 }}>
            {item.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                color={T.purple}
                bg={T.purpleBg}
                border={T.purpleBd}
              />
            ))}
          </div>
        </div>
      )}
      {item.description && <Row label="Notes" value={item.description} />}

      {/* Stock */}
      <SectionLabel>Stock</SectionLabel>
      <Row
        label="On Hand"
        value={fmtQty(item.quantity_on_hand, item.unit)}
        mono
      />
      <Row label="Available" value={fmtQty(avail, item.unit)} mono />
      {(item.reserved_qty || 0) > 0 && (
        <Row
          label="Reserved"
          value={fmtQty(item.reserved_qty, item.unit)}
          mono
        />
      )}
      {item.reorder_level != null && (
        <Row
          label="Reorder Level"
          value={fmtQty(item.reorder_level, item.unit)}
          mono
        />
      )}
      {item.weighted_avg_cost > 0 && (
        <Row label="Stock Value (AVCO)" value={fmt(totalValue)} mono />
      )}
      {item.suppliers?.name && (
        <Row label="Supplier" value={item.suppliers.name} />
      )}

      {/* Pricing */}
      <SectionLabel>Pricing</SectionLabel>
      {!editPrice ? (
        <>
          <Row label="Cost Price" value={fmt(item.cost_price)} mono />
          <Row label="Sell Price" value={fmt(item.sell_price)} mono />
          {item.weighted_avg_cost > 0 && (
            <Row
              label="AVCO"
              value={fmt(item.weighted_avg_cost) + "/" + (item.unit || "u")}
              mono
            />
          )}
          {margin !== null && (
            <div
              style={{
                padding: "7px 0",
                borderBottom: `1px solid ${T.ink075}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: T.ink400,
                  fontFamily: T.font,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Margin
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  fontFamily: T.mono,
                  color:
                    parseFloat(margin) >= 50
                      ? T.success
                      : parseFloat(margin) >= 30
                        ? T.warning
                        : T.danger,
                }}
              >
                {margin}%
              </span>
            </div>
          )}
          <button
            onClick={() => setEditPrice(true)}
            style={{
              marginTop: 10,
              padding: "6px 14px",
              fontSize: 11,
              fontFamily: T.font,
              fontWeight: 600,
              background: "transparent",
              border: `1px solid ${T.accentBd}`,
              color: T.accentMid,
              borderRadius: 3,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Edit Prices
          </button>
        </>
      ) : (
        <div
          style={{
            background: T.ink075,
            border: `1px solid ${T.ink150}`,
            borderRadius: 6,
            padding: "14px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.ink500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Cost (ZAR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                style={sInput}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.ink500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Sell (ZAR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                style={sInput}
              />
            </div>
          </div>
          {liveMargin !== null && (
            <div
              style={{
                fontSize: 12,
                fontFamily: T.mono,
                fontWeight: 700,
                marginBottom: 10,
                color:
                  parseFloat(liveMargin) >= 50
                    ? T.success
                    : parseFloat(liveMargin) >= 30
                      ? T.warning
                      : T.danger,
              }}
            >
              Live margin: {liveMargin}%
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSavePrice}
              disabled={saving}
              style={{
                flex: 1,
                padding: "7px 0",
                fontSize: 11,
                fontFamily: T.font,
                fontWeight: 600,
                background: T.accentMid,
                color: "#fff",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save Prices"}
            </button>
            <button
              onClick={() => setEditPrice(false)}
              style={{
                padding: "7px 14px",
                fontSize: 11,
                fontFamily: T.font,
                background: "transparent",
                border: `1px solid ${T.ink150}`,
                color: T.ink500,
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button
          onClick={onEdit}
          style={{
            width: "100%",
            padding: "10px 0",
            fontSize: 12,
            fontFamily: T.font,
            fontWeight: 600,
            background: T.accent,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Edit Full Item Details
        </button>
      </div>
    </div>
  );
}

// ── TAB 2: Stock History ──────────────────────────────────────────────────────

function TabHistory({ item, tenantId }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState("");

  const loadMovements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setMovements(data || []);
    setLoading(false);
  }, [item.id]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleAdjust = async () => {
    const delta = parseFloat(adjustQty);
    if (!delta || isNaN(delta)) {
      setAdjError("Enter a quantity (+ to add, − to remove).");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjError("Reason required for audit trail.");
      return;
    }
    setAdjSaving(true);
    setAdjError("");
    const newQty = Math.max(0, (item.quantity_on_hand || 0) + delta);
    await supabase.from("stock_movements").insert({
      item_id: item.id,
      tenant_id: tenantId,
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
    setAdjSaving(false);
    setAdjustMode(false);
    setAdjustQty("");
    setAdjustReason("");
    loadMovements();
  };

  const movTypeColor = (type) => {
    if (
      ["purchase_in", "transfer_in", "production_in", "adjustment"].includes(
        type,
      ) &&
      true
    )
      return T.success;
    if (type === "adjustment") return T.warning;
    return T.danger;
  };

  return (
    <div
      style={{
        padding: "16px 20px",
        overflowY: "auto",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Adjust button */}
      {!adjustMode ? (
        <button
          onClick={() => setAdjustMode(true)}
          style={{
            padding: "8px 16px",
            fontSize: 11,
            fontFamily: T.font,
            fontWeight: 600,
            background: "transparent",
            border: `1px solid ${T.warningBd}`,
            color: T.warning,
            borderRadius: 3,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            alignSelf: "flex-start",
          }}
        >
          + Adjust Stock
        </button>
      ) : (
        <div
          style={{
            background: T.warningBg,
            border: `1px solid ${T.warningBd}`,
            borderRadius: 6,
            padding: "14px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.warning,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Stock Adjustment — {item.name}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.ink500,
                  display: "block",
                  marginBottom: 3,
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
                placeholder="-5 or +10"
                style={sInput}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.ink500,
                  display: "block",
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Reason *
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Stock take, Damage, Spoilage"
                style={sInput}
              />
            </div>
          </div>
          {adjError && (
            <p style={{ fontSize: 11, color: T.danger, margin: "0 0 8px" }}>
              {adjError}
            </p>
          )}
          <p style={{ fontSize: 10, color: T.warning, margin: "0 0 10px" }}>
            Current: {fmtQty(item.quantity_on_hand, item.unit)} · Audit trail
            written to stock_movements
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleAdjust}
              disabled={adjSaving}
              style={{
                flex: 1,
                padding: "7px 0",
                fontSize: 11,
                fontFamily: T.font,
                fontWeight: 600,
                background: T.warning,
                color: "#fff",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              {adjSaving ? "Saving..." : "Confirm Adjustment"}
            </button>
            <button
              onClick={() => {
                setAdjustMode(false);
                setAdjError("");
              }}
              style={{
                padding: "7px 14px",
                fontSize: 11,
                fontFamily: T.font,
                background: "transparent",
                border: `1px solid ${T.ink150}`,
                color: T.ink500,
                borderRadius: 3,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Movement history */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.ink400,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontFamily: T.font,
        }}
      >
        Last 30 movements
      </div>
      {loading ? (
        <p style={{ fontSize: 12, color: T.ink300 }}>Loading...</p>
      ) : movements.length === 0 ? (
        <p style={{ fontSize: 12, color: T.ink300 }}>
          No stock movements recorded yet.
        </p>
      ) : (
        movements.map((m) => {
          const qty = m.quantity || 0;
          const pos = qty >= 0;
          return (
            <div
              key={m.id}
              style={{
                background: "#fff",
                border: `1px solid ${T.ink150}`,
                borderRadius: 6,
                padding: "10px 12px",
                borderLeft: `3px solid ${pos ? T.successBd : T.dangerBd}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.ink700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {(m.movement_type || "").replace(/_/g, " ")}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: T.mono,
                    fontWeight: 700,
                    color: pos ? T.success : T.danger,
                  }}
                >
                  {pos ? "+" : ""}
                  {fmtQty(qty, item.unit)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{ fontSize: 10, color: T.ink300, fontFamily: T.mono }}
                >
                  {fmtDateTime(m.created_at)}
                </span>
                {m.reference && (
                  <span style={{ fontSize: 10, color: T.ink400 }}>
                    {m.reference}
                  </span>
                )}
                {m.unit_cost > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: T.ink400,
                      fontFamily: T.mono,
                    }}
                  >
                    {fmt(m.unit_cost)}/unit
                  </span>
                )}
                {m.notes && (
                  <span
                    style={{
                      fontSize: 10,
                      color: T.ink500,
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
  );
}

// ── TAB 3: QR & Loyalty ───────────────────────────────────────────────────────

function TabQRLoyalty({ item, onSave }) {
  const [loyaltyCategory, setLoyaltyCategory] = useState(
    item.loyalty_category || "",
  );
  const [ptsOverride, setPtsOverride] = useState(item.pts_override ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("qr_codes")
      .select("id,qr_code,is_active,claimed,expires_at,created_at")
      .eq("inventory_item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setQrData(data?.[0] || null);
        setQrLoading(false);
      });
  }, [item.id]);

  const handleSaveLoyalty = async () => {
    setSaving(true);
    await supabase
      .from("inventory_items")
      .update({
        loyalty_category: loyaltyCategory || null,
        pts_override: ptsOverride !== "" ? parseFloat(ptsOverride) : null,
      })
      .eq("id", item.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave();
  };

  const currentCat = LOYALTY_CATEGORIES.find(
    (c) => c.value === loyaltyCategory,
  );
  const defaultMult = loyaltyCategory
    ? currentCat?.label?.match(/\((.+)\)/)?.[1]
    : null;
  const effectiveMult =
    ptsOverride !== ""
      ? `${ptsOverride}× (override)`
      : defaultMult || "Not set";

  return (
    <div
      style={{
        padding: "16px 20px",
        overflowY: "auto",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* QR Status */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.ink400,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: T.font,
            marginBottom: 10,
          }}
        >
          QR Code
        </div>
        {qrLoading ? (
          <p style={{ fontSize: 12, color: T.ink300 }}>Loading...</p>
        ) : qrData ? (
          <div
            style={{
              background: "#fff",
              border: `1px solid ${T.ink150}`,
              borderRadius: 6,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink700 }}>
                QR Code Found
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: qrData.is_active ? T.successBg : T.dangerBg,
                  color: qrData.is_active ? T.success : T.danger,
                  border: `1px solid ${qrData.is_active ? T.successBd : T.dangerBd}`,
                }}
              >
                {qrData.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.ink400,
                fontFamily: T.mono,
                marginBottom: 4,
              }}
            >
              {qrData.qr_code}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: T.ink400 }}>
                Created: {fmtDate(qrData.created_at)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: qrData.claimed ? T.warning : T.success,
                }}
              >
                {qrData.claimed ? "⚠ Claimed" : "✓ Unclaimed"}
              </span>
              {qrData.expires_at && (
                <span style={{ fontSize: 10, color: T.ink400 }}>
                  Expires: {fmtDate(qrData.expires_at)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: T.warningBg,
              border: `1px solid ${T.warningBd}`,
              borderRadius: 6,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: T.warning,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              No QR code linked to this item
            </div>
            <p style={{ fontSize: 11, color: T.warning, margin: 0 }}>
              Go to <strong>Admin → QR Codes</strong> to generate and link a QR
              code to this product. Once linked, customers can scan to earn
              loyalty points.
            </p>
          </div>
        )}
      </div>

      {/* Loyalty Category */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.ink400,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: T.font,
            marginBottom: 10,
          }}
        >
          Loyalty Settings
        </div>
        <div
          style={{
            background: T.purpleBg,
            border: `1px solid ${T.purpleBd}`,
            borderRadius: 6,
            padding: "14px",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.purple,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 5,
              }}
            >
              Loyalty Category
            </label>
            <select
              style={{ ...sSelect, border: `1px solid ${T.purpleBd}` }}
              value={loyaltyCategory}
              onChange={(e) => setLoyaltyCategory(e.target.value)}
            >
              {LOYALTY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.purple,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 5,
              }}
            >
              Points Override{" "}
              <span
                style={{
                  textTransform: "none",
                  fontWeight: 400,
                  color: T.ink400,
                }}
              >
                (leave blank to use category rate)
              </span>
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="10"
              value={ptsOverride}
              onChange={(e) => setPtsOverride(e.target.value)}
              placeholder="e.g. 3.0 for a launch promo"
              style={{ ...sInput, border: `1px solid ${T.purpleBd}` }}
            />
          </div>

          <div
            style={{
              background: "#fff",
              borderRadius: 4,
              padding: "8px 12px",
              marginBottom: 12,
              border: `1px solid ${T.purpleBd}`,
            }}
          >
            <div style={{ fontSize: 10, color: T.ink400, fontFamily: T.font }}>
              Effective multiplier for <strong>{item.name}</strong>:
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: T.purple,
                fontFamily: T.mono,
                marginTop: 2,
              }}
            >
              {effectiveMult}
            </div>
          </div>

          <button
            onClick={handleSaveLoyalty}
            disabled={saving}
            style={{
              width: "100%",
              padding: "8px 0",
              fontSize: 11,
              fontFamily: T.font,
              fontWeight: 600,
              background: T.purple,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Loyalty Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TAB 4: AI Analysis ────────────────────────────────────────────────────────

function TabAI({ item }) {
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [selectedQ, setSelectedQ] = useState(null);
  const [customQ, setCustomQ] = useState("");

  const margin =
    item.sell_price > 0 && item.cost_price > 0
      ? (((item.sell_price - item.cost_price) / item.sell_price) * 100).toFixed(
          1,
        )
      : null;

  const buildContext = () =>
    `
You are a cannabis retail business advisor for a South African dispensary called ${item.tenant_name || "Medi Recreational"}.
Analyse the following product and give a concise, practical response (3-5 sentences max):

Product: ${item.name}
SKU: ${item.sku}
Category: ${item.category} → ${item.subcategory || "unset"}
Brand: ${item.brand || "unbranded"}
Variant: ${item.variant_value || "none"}
Tags: ${item.tags?.join(", ") || "none"}
On Hand: ${item.quantity_on_hand} ${item.unit}
Cost Price: R${item.cost_price || 0}
Sell Price: R${item.sell_price || 0}
Margin: ${margin ? margin + "%" : "not set"}
AVCO: R${item.weighted_avg_cost || 0}
Loyalty Category: ${item.loyalty_category || "not set"}
Pts Override: ${item.pts_override || "none"}
Is Active: ${item.is_active}

Be specific, use Rands (ZAR), reference SA cannabis market context where relevant.
`.trim();

  const askAI = async (question) => {
    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);
    setSelectedQ(question);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildContext(),
          messages: [{ role: "user", content: question }],
        }),
      });
      const data = await response.json();
      const text =
        data.content?.map((b) => b.text || "").join("") || "No response.";
      setAiResponse(text);
    } catch (e) {
      setAiError("AI analysis failed. Check your connection.");
    }
    setAiLoading(false);
  };

  const handleCustomAsk = () => {
    if (customQ.trim()) askAI(customQ.trim());
  };

  return (
    <div
      style={{
        padding: "16px 20px",
        overflowY: "auto",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Item context summary */}
      <div
        style={{
          background: T.ink075,
          border: `1px solid ${T.ink150}`,
          borderRadius: 6,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.ink400,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          Analysing
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink700 }}>
          {item.name}
        </div>
        <div
          style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}
        >
          {item.brand && <Chip label={item.brand} />}
          {item.variant_value && (
            <Chip
              label={item.variant_value}
              color="#3730A3"
              bg="#EEF2FF"
              border="#C7D2FE"
            />
          )}
          {margin && (
            <Chip
              label={`${margin}% margin`}
              color={parseFloat(margin) >= 50 ? T.success : T.warning}
              bg={parseFloat(margin) >= 50 ? T.successBg : T.warningBg}
              border={parseFloat(margin) >= 50 ? T.successBd : T.warningBd}
            />
          )}
          <Chip label={`${item.quantity_on_hand || 0} ${item.unit} on hand`} />
        </div>
      </div>

      {/* Suggested questions */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.ink400,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: T.font,
            marginBottom: 8,
          }}
        >
          Suggested Questions
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {AI_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => askAI(q)}
              disabled={aiLoading}
              style={{
                padding: "9px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: T.font,
                textAlign: "left",
                cursor: aiLoading ? "default" : "pointer",
                border: `1.5px solid ${selectedQ === q && aiResponse ? T.accentBd : T.ink150}`,
                background:
                  selectedQ === q && aiResponse ? T.accentLit : "#fff",
                color: T.ink700,
                opacity: aiLoading && selectedQ !== q ? 0.5 : 1,
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Custom question */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={customQ}
          onChange={(e) => setCustomQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCustomAsk()}
          placeholder="Ask anything about this product..."
          style={{ ...sInput, flex: 1 }}
        />
        <button
          onClick={handleCustomAsk}
          disabled={aiLoading || !customQ.trim()}
          style={{
            padding: "7px 14px",
            fontSize: 11,
            fontFamily: T.font,
            fontWeight: 600,
            background: T.accentMid,
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            whiteSpace: "nowrap",
            opacity: aiLoading || !customQ.trim() ? 0.6 : 1,
          }}
        >
          Ask
        </button>
      </div>

      {/* AI Response */}
      {aiLoading && (
        <div
          style={{
            background: T.accentLit,
            border: `1px solid ${T.accentBd}`,
            borderRadius: 6,
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: `2px solid ${T.accentMid}`,
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span
            style={{ fontSize: 12, color: T.accentMid, fontFamily: T.font }}
          >
            Analysing {item.name}...
          </span>
        </div>
      )}
      {aiError && (
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: 6,
            padding: "12px 14px",
            fontSize: 12,
            color: T.danger,
          }}
        >
          {aiError}
        </div>
      )}
      {aiResponse && !aiLoading && (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${T.accentBd}`,
            borderRadius: 6,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.accentMid,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
              fontFamily: T.font,
            }}
          >
            AI Analysis · {item.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: T.ink700,
              fontFamily: T.font,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {aiResponse}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main Panel Component ──────────────────────────────────────────────────────

export default function StockItemPanel({ item, onClose, onEdit, onRefresh }) {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState("details");

  if (!item) return null;

  const TABS = [
    { id: "details", label: "Details" },
    { id: "history", label: "Stock History" },
    { id: "qr", label: "QR & Loyalty" },
    { id: "ai", label: "AI Analysis" },
  ];

  const isLow =
    item.reorder_level != null &&
    (item.quantity_on_hand || 0) <= item.reorder_level;
  const isOut = (item.quantity_on_hand || 0) === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.2)",
          zIndex: 1050,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "460px",
          maxWidth: "100vw",
          background: "#fff",
          zIndex: 1051,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-6px 0 40px rgba(0,0,0,0.12)",
          fontFamily: T.font,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${T.ink150}`,
            background: T.ink050,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: T.ink900,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </h3>
                {isOut && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: T.dangerBg,
                      color: T.danger,
                      border: `1px solid ${T.dangerBd}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    OUT OF STOCK
                  </span>
                )}
                {isLow && !isOut && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: T.warningBg,
                      color: T.warning,
                      border: `1px solid ${T.warningBd}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    LOW STOCK
                  </span>
                )}
                {!item.is_active && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: T.ink075,
                      color: T.ink400,
                      border: `1px solid ${T.ink150}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    INACTIVE
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 10, color: T.ink300, fontFamily: T.mono }}
                >
                  {item.sku}
                </span>
                {item.brand && (
                  <span style={{ fontSize: 10, color: T.ink400 }}>
                    {item.brand}
                  </span>
                )}
                {item.variant_value && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 3,
                      background: "#EEF2FF",
                      color: "#3730A3",
                    }}
                  >
                    {item.variant_value}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: T.ink300,
                padding: "2px 6px",
                lineHeight: 1,
                marginLeft: 8,
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick stats strip */}
          <div
            style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
          >
            <div
              style={{
                padding: "5px 10px",
                background: "#fff",
                border: `1px solid ${T.ink150}`,
                borderRadius: 4,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: T.mono,
                  color: isOut ? T.danger : isLow ? T.warning : T.ink700,
                }}
              >
                {item.quantity_on_hand ?? 0} {item.unit}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: T.ink400,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                On Hand
              </div>
            </div>
            {item.sell_price > 0 && (
              <div
                style={{
                  padding: "5px 10px",
                  background: "#fff",
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 4,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: T.mono,
                    color: T.accentMid,
                  }}
                >
                  {fmt(item.sell_price)}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: T.ink400,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Sell Price
                </div>
              </div>
            )}
            {item.sell_price > 0 && item.cost_price > 0 && (
              <div
                style={{
                  padding: "5px 10px",
                  background: "#fff",
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 4,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: T.mono,
                    color: T.success,
                  }}
                >
                  {(
                    ((item.sell_price - item.cost_price) / item.sell_price) *
                    100
                  ).toFixed(0)}
                  %
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: T.ink400,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Margin
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.ink150}` }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "10px 6px",
                border: "none",
                cursor: "pointer",
                borderBottom:
                  activeTab === tab.id
                    ? `2px solid ${T.accentMid}`
                    : "2px solid transparent",
                background: "none",
                fontFamily: T.font,
                fontSize: 10,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? T.accentMid : T.ink400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeTab === "details" && (
            <TabDetails
              item={item}
              onEdit={onEdit}
              onSave={onRefresh}
              tenantId={tenantId}
            />
          )}
          {activeTab === "history" && (
            <TabHistory item={item} tenantId={tenantId} />
          )}
          {activeTab === "qr" && (
            <TabQRLoyalty item={item} onSave={onRefresh} />
          )}
          {activeTab === "ai" && <TabAI item={item} />}
        </div>
      </div>
    </>
  );
}
