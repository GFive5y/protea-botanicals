// src/components/hq/StockAIAnalysis.js v1.0 — WP-BIB Session 6
// AI stock intelligence drawer — calls Anthropic API with live item data
// Profile-adaptive report: cannabis / food_beverage / general_retail

import React, { useState, useEffect } from "react";

const T = {
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
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const PROFILE_CONTEXT = {
  cannabis_retail:
    "cannabis retail business selling vape cartridges, edibles, flower and related products",
  cannabis_dispensary:
    "licensed cannabis dispensary dispensing to registered patients under Section 21",
  food_beverage:
    "food and beverage business with perishable products, allergen requirements and shelf-life management",
  general_retail: "general retail business selling finished consumer products",
  mixed_retail:
    "mixed retail business with multiple product categories including cannabis and general goods",
};

export default function StockAIAnalysis({
  item,
  industryProfile,
  movements,
  onClose,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const recentMovements = (movements || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  const totalIn = recentMovements
    .filter((m) => m.quantity > 0)
    .reduce((s, m) => s + parseFloat(m.quantity || 0), 0);
  const totalOut = recentMovements
    .filter((m) => m.quantity < 0)
    .reduce((s, m) => s + Math.abs(parseFloat(m.quantity || 0)), 0);

  const daysSinceLastMovement = item.last_movement_at
    ? Math.floor((new Date() - new Date(item.last_movement_at)) / 86400000)
    : null;

  const avgDailyOut = (() => {
    const outMovements = recentMovements.filter(
      (m) => m.quantity < 0 && m.movement_type === "sale_out",
    );
    if (outMovements.length < 2) return null;
    const oldest = new Date(outMovements[outMovements.length - 1].created_at);
    const newest = new Date(outMovements[0].created_at);
    const days = Math.max(1, (newest - oldest) / 86400000);
    return (
      Math.abs(outMovements.reduce((s, m) => s + parseFloat(m.quantity), 0)) /
      days
    );
  })();

  const daysUntilStockout =
    avgDailyOut && item.quantity_on_hand > 0
      ? Math.floor(item.quantity_on_hand / avgDailyOut)
      : null;

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const profileContext =
      PROFILE_CONTEXT[industryProfile] || PROFILE_CONTEXT.general_retail;
    const isCannabis = [
      "cannabis_retail",
      "cannabis_dispensary",
      "mixed_retail",
    ].includes(industryProfile);
    const isFoodBev = industryProfile === "food_beverage";

    const itemContext = {
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      quantity_on_hand: item.quantity_on_hand,
      reserved_qty: item.reserved_qty || 0,
      available: Math.max(
        0,
        (item.quantity_on_hand || 0) - (item.reserved_qty || 0),
      ),
      reorder_level: item.reorder_level,
      max_stock_level: item.max_stock_level,
      cost_price: item.cost_price,
      weighted_avg_cost: item.weighted_avg_cost,
      sell_price: item.sell_price,
      margin_pct:
        item.sell_price && item.cost_price
          ? (
              ((item.sell_price - item.cost_price) / item.sell_price) *
              100
            ).toFixed(1)
          : null,
      expiry_date: item.expiry_date || null,
      shelf_life_days: item.shelf_life_days || null,
      medium_type: item.medium_type || null,
      storage_instructions: item.storage_instructions || null,
      allergens: item.allergen_flags
        ? Object.entries(item.allergen_flags)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : [],
      days_since_last_movement: daysSinceLastMovement,
      avg_daily_units_sold: avgDailyOut ? avgDailyOut.toFixed(2) : null,
      days_until_stockout: daysUntilStockout,
      total_in_recent: totalIn.toFixed(2),
      total_out_recent: totalOut.toFixed(2),
      movement_count: recentMovements.length,
    };

    const systemPrompt = `You are a stock intelligence analyst for a ${profileContext}.
Analyse the provided stock item data and generate a concise, actionable intelligence report.

Format your response as JSON with this exact structure:
{
  "headline": "One sentence summary of the most important insight",
  "status": "healthy|warning|critical",
  "insights": [
    { "type": "stock|cost|sales|expiry|compliance", "title": "Short title", "detail": "One or two sentences of actionable insight" }
  ],
  "recommendation": "The single most important action to take right now",
  "risk": "low|medium|high"
}

Rules:
- Maximum 4 insights, minimum 2
- Be specific with numbers from the data
- ${isCannabis ? "Include insights about strain performance and compliance if relevant" : ""}
- ${isFoodBev ? "Prioritise expiry and allergen insights for food safety" : ""}
- If the item is dead stock (no movement in 60+ days), flag it prominently
- If margin is below 20%, flag as a pricing concern
- Return ONLY the JSON object, no other text`;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/ai-copilot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `${systemPrompt}\n\nAnalyse this stock item: ${JSON.stringify(itemContext, null, 2)}`,
              },
            ],
            userContext: { role: "admin" },
          }),
        },
      );

      const data = await response.json();
      const text = data.reply || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setReport(parsed);
    } catch (err) {
      setError("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const statusColors = {
    healthy: { bg: T.successBg, border: T.successBd, color: T.success },
    warning: { bg: T.warningBg, border: T.warningBd, color: T.warning },
    critical: { bg: T.dangerBg, border: T.dangerBd, color: T.danger },
  };

  const insightColors = {
    stock: { bg: T.infoBg, color: T.info },
    cost: { bg: "#FFF8E1", color: "#F57F17" },
    sales: { bg: T.accentLit, color: T.accentMid },
    expiry: { bg: T.warningBg, color: T.warning },
    compliance: { bg: "#F3E5F5", color: "#6A1B9A" },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 1100,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "520px",
          maxWidth: "100vw",
          background: "#fff",
          zIndex: 1101,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
          overflowY: "auto",
          fontFamily: T.fontUi,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.ink150}`,
            background: T.accentLit,
            position: "sticky",
            top: 0,
            zIndex: 1,
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
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.accentMid,
                  marginBottom: 4,
                }}
              >
                AI Stock Intelligence
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.accent }}>
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.accentMid,
                  fontFamily: T.fontData,
                  marginTop: 2,
                }}
              >
                {item.sku} · {item.category?.replace(/_/g, " ")} ·{" "}
                {item.quantity_on_hand} {item.unit} on hand
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: T.ink400,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: T.ink500,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: `2px solid ${T.ink150}`,
                  borderTopColor: T.accentMid,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: T.accentMid }}
              >
                Analysing stock intelligence…
              </div>
              <div style={{ fontSize: 11, color: T.ink400, marginTop: 6 }}>
                Reviewing movements, margins and trends
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "16px",
                background: T.dangerBg,
                border: `1px solid ${T.dangerBd}`,
                borderRadius: 6,
                fontSize: 13,
                color: T.danger,
              }}
            >
              ⚠ {error}
              <button
                onClick={generateReport}
                style={{
                  marginLeft: 12,
                  fontSize: 11,
                  color: T.danger,
                  background: "none",
                  border: `1px solid ${T.dangerBd}`,
                  borderRadius: 3,
                  cursor: "pointer",
                  padding: "2px 8px",
                }}
              >
                Retry
              </button>
            </div>
          )}

          {report && (
            <>
              {/* Status headline */}
              <div
                style={{
                  padding: "16px 18px",
                  background: statusColors[report.status]?.bg || T.ink075,
                  border: `1px solid ${statusColors[report.status]?.border || T.ink150}`,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: statusColors[report.status]?.color || T.ink700,
                      lineHeight: 1.5,
                    }}
                  >
                    {report.headline}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: 3,
                      background: statusColors[report.status]?.bg,
                      color: statusColors[report.status]?.color,
                      border: `1px solid ${statusColors[report.status]?.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {report.status}
                  </span>
                </div>
              </div>

              {/* Insights */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.ink400,
                    marginBottom: 10,
                  }}
                >
                  Insights
                </div>
                {(report.insights || []).map((insight, i) => {
                  const ic = insightColors[insight.type] || {
                    bg: T.ink075,
                    color: T.ink700,
                  };
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "12px 14px",
                        marginBottom: 8,
                        background: ic.bg,
                        border: `1px solid ${ic.color}20`,
                        borderLeft: `3px solid ${ic.color}`,
                        borderRadius: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: ic.color,
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {insight.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: T.ink700,
                          lineHeight: 1.6,
                        }}
                      >
                        {insight.detail}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommendation */}
              <div
                style={{
                  padding: "14px 16px",
                  background: T.accentLit,
                  border: `1px solid ${T.accentBd}`,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.accentMid,
                    marginBottom: 6,
                  }}
                >
                  Recommended Action
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T.accent,
                    fontWeight: 600,
                    lineHeight: 1.6,
                  }}
                >
                  {report.recommendation}
                </div>
              </div>

              {/* Key metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 1,
                  background: T.ink150,
                  borderRadius: 6,
                  overflow: "hidden",
                  border: `1px solid ${T.ink150}`,
                  marginBottom: 16,
                }}
              >
                {[
                  [
                    "On Hand",
                    `${item.quantity_on_hand} ${item.unit}`,
                    item.quantity_on_hand <= 0 ? T.danger : T.success,
                  ],
                  [
                    "Avg Daily Out",
                    avgDailyOut
                      ? `${avgDailyOut.toFixed(1)} ${item.unit}/day`
                      : "—",
                    T.info,
                  ],
                  [
                    "Days to Stockout",
                    daysUntilStockout !== null
                      ? `${daysUntilStockout} days`
                      : "—",
                    daysUntilStockout !== null && daysUntilStockout < 7
                      ? T.danger
                      : daysUntilStockout !== null && daysUntilStockout < 14
                        ? T.warning
                        : T.success,
                  ],
                  [
                    "AVCO Cost",
                    item.weighted_avg_cost
                      ? `R${parseFloat(item.weighted_avg_cost).toFixed(2)}`
                      : "—",
                    T.ink700,
                  ],
                  [
                    "Sell Price",
                    item.sell_price
                      ? `R${parseFloat(item.sell_price).toFixed(2)}`
                      : "—",
                    T.ink700,
                  ],
                  [
                    "Margin",
                    item.sell_price && item.cost_price
                      ? `${(((item.sell_price - item.cost_price) / item.sell_price) * 100).toFixed(1)}%`
                      : "—",
                    (() => {
                      if (!item.sell_price || !item.cost_price) return T.ink400;
                      const m =
                        ((item.sell_price - item.cost_price) /
                          item.sell_price) *
                        100;
                      return m >= 35
                        ? T.success
                        : m >= 20
                          ? T.warning
                          : T.danger;
                    })(),
                  ],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    style={{ background: "#fff", padding: "12px 14px" }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: T.ink400,
                        marginBottom: 4,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontData,
                        fontSize: 15,
                        fontWeight: 600,
                        color,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={generateReport}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "transparent",
                  border: `1px solid ${T.accentBd}`,
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.accentMid,
                  cursor: "pointer",
                  fontFamily: T.fontUi,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                ↻ Regenerate Analysis
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
