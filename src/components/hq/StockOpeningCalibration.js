// src/components/hq/StockOpeningCalibration.js v1.0
// WP-STOCK-AVCO — Opening stock cost calibration
// AI-assisted: ProteaAI reviews each item's suggested cost against SA market rates
// Writes: UPDATE inventory_items SET weighted_avg_cost, cost_price
// Does NOT create stock movements (this is a cost basis calibration, not a delivery)
// LL-160: tenantId as PROP — never from useTenant() directly
// LL-173: Component is new, no existing code modified

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { PRODUCT_WORLDS } from "./ProductWorlds";

// ── Design tokens (mirrors HQStock palette) ─────────────────────────────────
const T = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
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
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.12)",
};

const fmt = (n) =>
  n == null || isNaN(n)
    ? "—"
    : "R" +
      Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const fmtPct = (n) => (n == null || isNaN(n) ? "—" : `${Math.round(n)}%`);

const calcMargin = (sell, cost) => {
  if (!sell || sell <= 0 || !cost || cost <= 0) return null;
  return ((sell - cost) / sell) * 100;
};

const marginColor = (pct) => {
  if (pct == null) return T.ink300;
  if (pct >= 55) return T.success;
  if (pct >= 35) return T.warning;
  return T.danger;
};

// ── World icon mapping ───────────────────────────────────────────────────────
const WORLD_ICON = {
  flower: "🌿",
  hash: "🟤",
  concentrate: "💎",
  vape: "💨",
  preroll: "🚬",
  edible: "🍬",
  seeds: "🌱",
  substrate: "🪨",
  nutrients: "🧪",
  equipment: "⚙️",
  wellness: "💊",
  papers: "📄",
  accessories: "🔧",
  merch: "👕",
};

// ── Suggested cost from sell price (60% margin target) ──────────────────────
const suggestCost = (sellPrice) => {
  if (!sellPrice || sellPrice <= 0) return 0;
  return parseFloat((sellPrice * 0.4).toFixed(2));
};

// ── Group items by ProductWorld ──────────────────────────────────────────────
function groupByWorld(items) {
  const groups = {};
  for (const item of items) {
    let worldId = "accessories"; // fallback
    for (const w of PRODUCT_WORLDS) {
      if (!w.enums) continue;
      const catMatch = w.enums.includes(item.category);
      const subMatch = !w.subs || w.subs.includes(item.subcategory);
      if (catMatch && subMatch) {
        worldId = w.id;
        break;
      }
      if (catMatch) {
        worldId = w.id;
      } // partial match — keep looking
    }
    if (!groups[worldId]) groups[worldId] = [];
    groups[worldId].push(item);
  }
  return groups;
}

// ── AI review via Anthropic API ──────────────────────────────────────────────
async function runAIReview(items, costs) {
  const payload = items.slice(0, 80).map((item) => ({
    name: item.name,
    sku: item.sku,
    category: item.category,
    subcategory: item.subcategory || "",
    sell_price: item.sell_price,
    suggested_cost: costs[item.id] ?? suggestCost(item.sell_price),
    variant: item.variant_value || "",
  }));

  const prompt = `You are a South African cannabis wholesale expert reviewing opening stock costs for a licensed recreational dispensary in 2026.

Review these ${payload.length} inventory items. For each item, check if the suggested_cost is realistic given SA wholesale market rates.

ITEMS:
${JSON.stringify(payload, null, 2)}

SA WHOLESALE BENCHMARKS (2026):
- Flower 1g (budget): R15-25 cost, Flower 1g (premium): R40-70 cost
- Flower 3.5g: R55-120 cost, Flower 7g: R100-200 cost
- Pre-roll single: R20-35 cost
- Vape cart 0.5ml: R80-130 cost, Vape cart 1ml: R150-220 cost
- Vape disposable: R100-160 cost
- Edibles/gummies 10-pack: R35-60 cost, Chocolate: R30-55 cost
- Concentrate/wax/shatter 1g: R100-200 cost
- Hash 1g: R50-90 cost, Bubble hash 3.5g: R150-250 cost
- CBD tincture 30ml: R70-120 cost, CBD oil 1000mg: R90-150 cost
- Rolling papers: R5-15 cost, Grinder: R40-80 cost
- Nutrients (liquid 1L): R60-120 cost

Respond ONLY in valid JSON. No markdown, no backticks, no preamble.
Format: {"reviews": [{"sku": "...", "adjusted_cost": 45.00, "flag": "ok|high|low|check", "note": "brief reason (max 8 words)"}]}

Rules:
- flag "ok": cost looks right for SA market
- flag "high": cost seems above typical SA wholesale (may squeeze margin)  
- flag "low": cost seems below typical SA wholesale (may be unrealistically cheap)
- flag "check": unusual item or pricing worth double-checking
- adjusted_cost: your recommended cost (can equal suggested_cost if ok)
- Keep notes concise — they appear in the UI as tooltips`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return parsed.reviews || [];
}

// ── Main component ───────────────────────────────────────────────────────────
export default function StockOpeningCalibration({
  tenantId,
  onClose,
  onComplete,
}) {
  const [items, setItems] = useState([]);
  const [costs, setCosts] = useState({}); // { [itemId]: cost }
  const [aiReviews, setAiReviews] = useState({}); // { [sku]: review }
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedWorld, setExpandedWorld] = useState(null);
  const [toast, setToast] = useState("");

  // Load items with no AVCO
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("inventory_items")
      .select(
        "id,name,sku,category,subcategory,variant_value,sell_price,weighted_avg_cost,cost_price,quantity_on_hand,brand,unit",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("category")
      .order("name");

    const uncalibrated = (data || []).filter(
      (i) => !(i.weighted_avg_cost > 0) && i.sell_price > 0,
    );
    setItems(uncalibrated);

    // Pre-fill suggested costs
    const initialCosts = {};
    for (const item of uncalibrated) {
      initialCosts[item.id] = suggestCost(item.sell_price);
    }
    setCosts(initialCosts);
    setLoading(false);

    // Auto-expand first world
    const groups = groupByWorld(uncalibrated);
    const firstKey = Object.keys(groups)[0];
    if (firstKey) setExpandedWorld(firstKey);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => groupByWorld(items), [items]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 5000);
  };

  // AI review
  const handleAIReview = async () => {
    setAiLoading(true);
    try {
      const reviews = await runAIReview(items, costs);
      const reviewMap = {};
      for (const r of reviews) {
        reviewMap[r.sku] = r;
      }
      setAiReviews(reviewMap);

      // Apply AI-adjusted costs where flag !== "ok"
      const updatedCosts = { ...costs };
      let adjusted = 0;
      for (const item of items) {
        const review = reviewMap[item.sku];
        if (review && review.adjusted_cost > 0 && review.flag !== "ok") {
          updatedCosts[item.id] = parseFloat(review.adjusted_cost.toFixed(2));
          adjusted++;
        }
      }
      setCosts(updatedCosts);
      showToast(
        `AI reviewed ${reviews.length} items · ${adjusted} costs adjusted`,
      );
    } catch (err) {
      console.error("[StockOpeningCalibration] AI review error:", err);
      showToast(
        "AI review failed — check console. Manual costs are unaffected.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  // Apply 60% margin to all
  const handleApplyAll = () => {
    const updated = {};
    for (const item of items) {
      updated[item.id] = suggestCost(item.sell_price);
    }
    setCosts(updated);
    showToast("60% margin applied to all items");
  };

  // Confirm — batch UPDATE
  const handleConfirm = async () => {
    setSaving(true);
    let success = 0;
    let failed = 0;
    for (const item of items) {
      const cost = parseFloat(costs[item.id] || 0);
      if (cost <= 0) continue;
      const { error } = await supabase
        .from("inventory_items")
        .update({
          weighted_avg_cost: cost,
          cost_price: cost,
        })
        .eq("id", item.id)
        .eq("tenant_id", tenantId);
      if (error) {
        console.error("[Calibration] Update failed:", item.name, error);
        failed++;
      } else success++;
    }
    setSaving(false);
    if (failed === 0) {
      setSaved(true);
      showToast(`✓ ${success} items calibrated — margins are now live`);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
    } else {
      showToast(`${success} updated · ${failed} failed — check console`);
    }
  };

  const totalItems = items.length;
  const totalValue = items.reduce(
    (s, i) => s + (i.quantity_on_hand || 0) * (costs[i.id] || 0),
    0,
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 900,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: 0,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: T.accent,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontFamily: T.font,
            fontWeight: 500,
            boxShadow: T.shadowLg,
            zIndex: 1000,
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}

      <div
        style={{
          width: "min(920px, 100vw)",
          height: "100vh",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          boxShadow: T.shadowLg,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${T.ink150}`,
            background: "#fff",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  fontFamily: T.font,
                  marginBottom: 4,
                }}
              >
                WP-STOCK-AVCO
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontFamily: T.font,
                  fontWeight: 600,
                  color: T.ink900,
                }}
              >
                Opening Stock Calibration
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: T.ink500,
                  fontFamily: T.font,
                }}
              >
                Set cost basis for {totalItems} items — AI will validate against
                SA wholesale benchmarks
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: T.ink400,
                lineHeight: 1,
                padding: "4px 8px",
              }}
            >
              ×
            </button>
          </div>

          {/* Stats strip */}
          {!loading && (
            <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
              {[
                {
                  label: "Items to calibrate",
                  value: totalItems,
                  color: totalItems > 0 ? T.warning : T.success,
                },
                {
                  label: "Estimated total cost",
                  value: fmt(totalValue),
                  color: T.ink900,
                },
                { label: "Target margin", value: "60%", color: T.success },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    style={{
                      fontSize: 18,
                      fontFamily: T.mono,
                      fontWeight: 400,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: T.ink400,
                      fontFamily: T.font,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {!loading && !saved && totalItems > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleAIReview}
                disabled={aiLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: aiLoading ? T.ink150 : T.accent,
                  color: "#fff",
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: aiLoading ? "default" : "pointer",
                  letterSpacing: "0.04em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {aiLoading ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Reviewing with AI…
                  </>
                ) : (
                  "✦ AI Review Costs"
                )}
              </button>
              <button
                onClick={handleApplyAll}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: `1px solid ${T.accentBd}`,
                  background: T.accentLit,
                  color: T.accent,
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply 60% margin to all
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 4,
                    border: `1px solid ${T.ink150}`,
                    background: "none",
                    color: T.ink500,
                    fontFamily: T.font,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 4,
                    border: "none",
                    background: saving ? T.ink300 : T.accentMid,
                    color: "#fff",
                    fontFamily: T.font,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: saving ? "default" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : `Confirm ${totalItems} items →`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: T.ink400,
                fontFamily: T.font,
                fontSize: 13,
              }}
            >
              Loading uncalibrated items…
            </div>
          ) : saved ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <div
                style={{
                  fontSize: 18,
                  fontFamily: T.font,
                  fontWeight: 600,
                  color: T.success,
                  marginBottom: 8,
                }}
              >
                {totalItems} items calibrated
              </div>
              <div
                style={{ fontSize: 13, color: T.ink500, fontFamily: T.font }}
              >
                Weighted average costs are now live. Margins, P&L, and
                intelligence panels will update.
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div
                style={{
                  fontSize: 16,
                  fontFamily: T.font,
                  fontWeight: 600,
                  color: T.success,
                }}
              >
                All priced items have AVCO set
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: T.ink400,
                  fontFamily: T.font,
                  marginTop: 6,
                }}
              >
                No calibration needed — receive a delivery to update costs going
                forward.
              </div>
            </div>
          ) : (
            <>
              {/* AI explanation banner */}
              {Object.keys(aiReviews).length > 0 && (
                <div
                  style={{
                    background: T.infoBg,
                    border: `1px solid ${T.infoBd}`,
                    borderRadius: 6,
                    padding: "10px 14px",
                    marginBottom: 14,
                    fontSize: 12,
                    color: T.info,
                    fontFamily: T.font,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ flexShrink: 0, fontWeight: 700 }}>✦ AI</span>
                  <span>
                    Reviewed {Object.keys(aiReviews).length} items against SA
                    2026 wholesale benchmarks. Costs flagged{" "}
                    <strong>high</strong> or <strong>low</strong> were adjusted
                    automatically. Check individual rows for AI notes. You can
                    override any cost before confirming.
                  </span>
                </div>
              )}

              {/* World groups */}
              {Object.entries(groups).map(([worldId, worldItems]) => {
                const world = PRODUCT_WORLDS.find((w) => w.id === worldId);
                const isOpen = expandedWorld === worldId;
                const allHaveAI = worldItems.every((i) => aiReviews[i.sku]);
                const flagCount = worldItems.filter(
                  (i) =>
                    aiReviews[i.sku]?.flag && aiReviews[i.sku].flag !== "ok",
                ).length;

                return (
                  <div
                    key={worldId}
                    style={{
                      marginBottom: 8,
                      border: `1px solid ${T.ink150}`,
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    {/* World header */}
                    <button
                      onClick={() => setExpandedWorld(isOpen ? null : worldId)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: isOpen ? T.accentLit : T.ink050,
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>
                        {WORLD_ICON[worldId] || "📦"}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontFamily: T.font,
                          fontWeight: 600,
                          color: isOpen ? T.accent : T.ink700,
                        }}
                      >
                        {world?.label || worldId}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.ink400,
                          fontFamily: T.font,
                        }}
                      >
                        {worldItems.length} item
                        {worldItems.length !== 1 ? "s" : ""}
                      </span>
                      {flagCount > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 3,
                            background: T.warningBg,
                            color: T.warning,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          {flagCount} AI flag{flagCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: T.ink300 }}>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {/* Items table */}
                    {isOpen && (
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontFamily: T.font,
                        }}
                      >
                        <thead>
                          <tr style={{ background: T.ink050 }}>
                            {[
                              "Item",
                              "Variant",
                              "Sell price",
                              "Cost (edit)",
                              "Margin",
                              allHaveAI ? "AI note" : "",
                            ].map(
                              (h) =>
                                h && (
                                  <th
                                    key={h}
                                    style={{
                                      padding: "7px 12px",
                                      textAlign: "left",
                                      fontSize: 9,
                                      fontWeight: 700,
                                      letterSpacing: "0.1em",
                                      textTransform: "uppercase",
                                      color: T.ink400,
                                      borderBottom: `1px solid ${T.ink150}`,
                                    }}
                                  >
                                    {h}
                                  </th>
                                ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {worldItems.map((item) => {
                            const cost =
                              costs[item.id] ?? suggestCost(item.sell_price);
                            const margin = calcMargin(item.sell_price, cost);
                            const review = aiReviews[item.sku];
                            const flagColor =
                              {
                                ok: T.success,
                                high: T.warning,
                                low: T.danger,
                                check: T.info,
                              }[review?.flag] || T.ink300;

                            return (
                              <tr
                                key={item.id}
                                style={{
                                  borderBottom: `1px solid ${T.ink075}`,
                                }}
                              >
                                <td style={{ padding: "9px 12px" }}>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 500,
                                      color: T.ink900,
                                    }}
                                  >
                                    {item.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: T.ink400,
                                      fontFamily: T.mono,
                                    }}
                                  >
                                    {item.sku}
                                  </div>
                                </td>
                                <td
                                  style={{
                                    padding: "9px 12px",
                                    fontSize: 11,
                                    color: T.ink500,
                                  }}
                                >
                                  {item.variant_value ||
                                    item.subcategory ||
                                    "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "9px 12px",
                                    fontSize: 12,
                                    fontFamily: T.mono,
                                    color: T.ink700,
                                  }}
                                >
                                  {fmt(item.sell_price)}
                                </td>
                                <td style={{ padding: "9px 12px" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <span
                                      style={{ fontSize: 12, color: T.ink500 }}
                                    >
                                      R
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={cost || ""}
                                      onChange={(e) => {
                                        const val =
                                          parseFloat(e.target.value) || 0;
                                        setCosts((prev) => ({
                                          ...prev,
                                          [item.id]: val,
                                        }));
                                      }}
                                      style={{
                                        width: 80,
                                        padding: "4px 8px",
                                        border: `1px solid ${review?.flag && review.flag !== "ok" ? T.warningBd : T.ink150}`,
                                        borderRadius: 3,
                                        fontFamily: T.mono,
                                        fontSize: 12,
                                        color: T.ink900,
                                        background:
                                          review?.flag && review.flag !== "ok"
                                            ? T.warningBg
                                            : "#fff",
                                      }}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: "9px 12px" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 3,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      fontFamily: T.mono,
                                      color: marginColor(margin),
                                      background:
                                        margin == null
                                          ? T.ink075
                                          : margin >= 55
                                            ? T.successBg
                                            : margin >= 35
                                              ? T.warningBg
                                              : T.dangerBg,
                                    }}
                                  >
                                    {margin == null ? "—" : fmtPct(margin)}
                                  </span>
                                </td>
                                {allHaveAI && (
                                  <td style={{ padding: "9px 12px" }}>
                                    {review ? (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: flagColor,
                                          fontFamily: T.font,
                                        }}
                                      >
                                        <strong
                                          style={{
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                          }}
                                        >
                                          {review.flag}
                                        </strong>
                                        {review.note ? ` · ${review.note}` : ""}
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          color: T.ink300,
                                        }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
