// src/components/hq/HQForecast.js v1.0 — WP-FORECAST-v1
// 30-day projection · stock depletion · restock spend · cash flow
// All data from: order_items (velocity), inventory_items (AVCO), expenses, eod_cash_ups

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { ChartCard } from "../viz";

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#6B7280",
  ink300: "#9CA3AF",
  ink150: "#E5E7EB",
  ink075: "#F4F4F3",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  successBg: "#F0FDF4",
  warningBg: "#FFFBEB",
  dangerBg: "#FEF2F2",
  primary: "#6366F1",
};

const fmtZar = (n) =>
  n >= 1000000
    ? `R${(n / 1000000).toFixed(1)}m`
    : n >= 1000
      ? `R${Math.round(n).toLocaleString("en-ZA")}`
      : `R${n.toFixed(0)}`;

const sCard = {
  background: "#FFFFFF",
  border: `1px solid ${T.ink150}`,
  borderRadius: 10,
  overflow: "hidden",
};

const sLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.ink400,
  fontFamily: T.font,
};

export default function HQForecast() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [velocity, setVelocity] = useState(null); // { revenue, cogs, gp, orders, days }
  const [depletion, setDepletion] = useState([]); // per-SKU depletion data
  const [opexMonthly, setOpexMonthly] = useState(0);
  const [currentCash, setCurrentCash] = useState(null);
  const [dataWindow, setDataWindow] = useState(0); // days of order_items data

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const d30Iso = d30.toISOString();

    // 1. Velocity: order_items last 30 days
    try {
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, created_at, order_items(quantity, line_total, product_metadata)")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", d30Iso)
        .limit(2000);

      const orders = recentOrders || [];
      let totalRev = 0, totalCogs = 0, totalOrders = orders.length;

      // Count distinct days with orders
      const daySet = new Set();
      orders.forEach((o) => {
        daySet.add(o.created_at?.slice(0, 10));
        (o.order_items || []).forEach((oi) => {
          totalRev += parseFloat(oi.line_total) || 0;
          const avco = parseFloat(oi.product_metadata?.weighted_avg_cost || 0);
          totalCogs += (oi.quantity || 0) * avco;
        });
      });

      const days = Math.max(daySet.size, 1);
      setDataWindow(days);
      setVelocity({
        revenue: totalRev,
        cogs: totalCogs,
        gp: totalRev - totalCogs,
        orders: totalOrders,
        days,
        dailyRev: totalRev / days,
        dailyCogs: totalCogs / days,
        dailyGP: (totalRev - totalCogs) / days,
        dailyOrders: totalOrders / days,
      });
    } catch (_) {
      setVelocity(null);
    }

    // 2. Stock depletion: order_items velocity per item vs inventory
    try {
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, order_items(quantity, product_metadata)")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", d30Iso)
        .limit(2000);

      const velMap = {};
      (recentOrders || []).forEach((o) => {
        (o.order_items || []).forEach((oi) => {
          const iid = oi.product_metadata?.item_id;
          if (iid) velMap[iid] = (velMap[iid] || 0) + (oi.quantity || 0);
        });
      });

      const { data: items } = await supabase
        .from("inventory_items")
        .select("id, name, category, quantity_on_hand, sell_price, weighted_avg_cost")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .gt("quantity_on_hand", 0);

      const depletionData = (items || [])
        .filter((i) => velMap[i.id] > 0)
        .map((i) => {
          const velocity30 = velMap[i.id] || 0;
          const dailyVel = velocity30 / 30;
          const daysLeft = dailyVel > 0 ? Math.round(i.quantity_on_hand / dailyVel) : null;
          const dailyRev = dailyVel * (i.sell_price || 0);
          const restockUnits = Math.max(0, Math.ceil(dailyVel * 30) - i.quantity_on_hand);
          const restockCost = restockUnits * (i.weighted_avg_cost || 0);
          return {
            name: i.name,
            category: i.category,
            onHand: i.quantity_on_hand,
            dailyVel: Math.round(dailyVel * 100) / 100,
            daysLeft,
            dailyRev: Math.round(dailyRev),
            restockUnits,
            restockCost: Math.round(restockCost),
            urgency: daysLeft === null ? "ok" : daysLeft < 7 ? "critical" : daysLeft < 14 ? "warning" : "ok",
          };
        })
        .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

      setDepletion(depletionData);
    } catch (_) {
      setDepletion([]);
    }

    // 3. Monthly OPEX average
    try {
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount_zar, expense_date, category")
        .eq("tenant_id", tenantId)
        .in("category", ["opex", "wages", "tax", "other"]);

      if (expenses?.length) {
        const months = new Set(expenses.map((e) => e.expense_date?.slice(0, 7)));
        const total = expenses.reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);
        setOpexMonthly(months.size > 0 ? total / months.size : total);
      }
    } catch (_) {}

    // 4. Current cash position from latest EOD
    try {
      const { data } = await supabase
        .from("eod_cash_ups")
        .select("counted_cash, cashup_date")
        .eq("tenant_id", tenantId)
        .order("cashup_date", { ascending: false })
        .limit(1);
      if (data?.[0]) setCurrentCash(parseFloat(data[0].counted_cash) || 0);
    } catch (_) {}

    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: T.ink500, fontFamily: T.font }}>
        <style>{`@keyframes fc-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 28, height: 28, border: `2px solid ${T.ink150}`, borderTopColor: T.primary, borderRadius: "50%", animation: "fc-spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <span style={{ ...sLabel }}>Loading forecast…</span>
      </div>
    );
  }

  if (!velocity) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink500, fontFamily: T.font }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>Insufficient data for forecasting</div>
        <div style={{ fontSize: 12, color: T.ink300 }}>Run the sales simulator or record real POS sales to generate velocity data.</div>
      </div>
    );
  }

  const confidence = dataWindow >= 14 ? "High" : dataWindow >= 7 ? "Medium" : "Low";
  const confidenceColor = dataWindow >= 14 ? T.success : dataWindow >= 7 ? T.warning : T.danger;

  // Projections
  const projRev = velocity.dailyRev * 30;
  const projCogs = velocity.dailyCogs * 30;
  const projGP = projRev - projCogs;
  const projMargin = projRev > 0 ? (projGP / projRev) * 100 : 0;
  const projNet = projGP - opexMonthly;

  // Restock totals
  const restockItems = depletion.filter((d) => d.daysLeft !== null && d.daysLeft < 30);
  const totalRestockCost = restockItems.reduce((s, d) => s + d.restockCost, 0);

  // Cash flow
  const cashAfter = currentCash !== null
    ? currentCash + projRev - projCogs - opexMonthly - totalRestockCost
    : null;

  return (
    <div style={{ fontFamily: T.font, display: "grid", gap: 20 }}>
      {/* Confidence badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...sLabel }}>30-Day Forecast</span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 3,
          background: confidenceColor + "18", color: confidenceColor,
        }}>
          {confidence} confidence · {dataWindow}d data
        </span>
      </div>

      {/* ── SECTION 1: Revenue + GP + Net Projection ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {[
          { label: "Projected Revenue", value: projRev, color: T.primary },
          { label: "Projected COGS", value: projCogs, color: T.danger },
          { label: "Projected Gross Profit", value: projGP, sub: `${projMargin.toFixed(1)}% margin`, color: T.success },
          { label: "Monthly OPEX", value: opexMonthly, color: T.warning },
          { label: "Projected Net Income", value: projNet, color: projNet >= 0 ? T.success : T.danger },
        ].map((tile) => (
          <div key={tile.label} style={{ ...sCard, padding: "16px 18px" }}>
            <div style={{ ...sLabel, marginBottom: 8 }}>{tile.label}</div>
            <div style={{
              fontSize: 24, fontWeight: 600, color: tile.color, fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em", lineHeight: 1,
            }}>
              {fmtZar(Math.abs(tile.value))}
            </div>
            {tile.sub && <div style={{ fontSize: 10, color: T.ink400, marginTop: 4 }}>{tile.sub}</div>}
            <div style={{ fontSize: 10, color: T.ink300, marginTop: 4 }}>
              {fmtZar(Math.abs(tile.value / 30))}/day
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 2: Stock Depletion ── */}
      <ChartCard title="Stock Depletion Forecast" subtitle="Sorted by urgency — days until empty" height="auto">
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 70px 70px 70px 70px 60px",
            gap: 4, padding: "8px 0 4px", ...sLabel,
          }}>
            <span>Product</span>
            <span style={{ textAlign: "right" }}>On Hand</span>
            <span style={{ textAlign: "right" }}>Sell/day</span>
            <span style={{ textAlign: "right" }}>Empty in</span>
            <span style={{ textAlign: "right" }}>Rev/day</span>
            <span style={{ textAlign: "right" }}>Urgency</span>
          </div>
          {depletion.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: T.ink400, fontSize: 12 }}>
              No velocity data — run simulator or record sales
            </div>
          ) : (
            <>
              {depletion.filter((d) => d.urgency !== "ok").map((d, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "2fr 70px 70px 70px 70px 60px",
                  gap: 4, padding: "6px 0", borderBottom: `1px solid ${T.ink075}`, fontSize: 12, alignItems: "center",
                }}>
                  <span style={{ color: T.ink900, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                  <span style={{ textAlign: "right", color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{d.onHand}</span>
                  <span style={{ textAlign: "right", color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{d.dailyVel}</span>
                  <span style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: d.urgency === "critical" ? T.danger : T.warning }}>
                    {d.daysLeft}d
                  </span>
                  <span style={{ textAlign: "right", color: T.ink500, fontVariantNumeric: "tabular-nums" }}>{fmtZar(d.dailyRev)}</span>
                  <span style={{ textAlign: "right" }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                      background: d.urgency === "critical" ? T.dangerBg : T.warningBg,
                      color: d.urgency === "critical" ? T.danger : T.warning,
                    }}>
                      {d.urgency === "critical" ? "CRITICAL" : "ORDER"}
                    </span>
                  </span>
                </div>
              ))}
              {depletion.filter((d) => d.urgency === "ok").length > 0 && (
                <div style={{ padding: "8px 0", fontSize: 11, color: T.ink300 }}>
                  + {depletion.filter((d) => d.urgency === "ok").length} items with 14+ days of stock
                </div>
              )}
            </>
          )}
        </div>
      </ChartCard>

      {/* ── SECTION 3: Restock Spend ── */}
      <div style={{ ...sCard, padding: "16px 18px" }}>
        <div style={{ ...sLabel, marginBottom: 10 }}>Restock Spend Forecast — Next 30 Days</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 10, color: T.ink400, marginBottom: 2 }}>Items needing restock</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: T.ink900, fontVariantNumeric: "tabular-nums" }}>
              {restockItems.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: T.ink400, marginBottom: 2 }}>Estimated restock cost</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: T.danger, fontVariantNumeric: "tabular-nums" }}>
              {fmtZar(totalRestockCost)}
            </div>
          </div>
          {currentCash !== null && (
            <div>
              <div style={{ fontSize: 10, color: T.ink400, marginBottom: 2 }}>Cash available (last EOD)</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: T.success, fontVariantNumeric: "tabular-nums" }}>
                {fmtZar(currentCash)}
              </div>
            </div>
          )}
          {currentCash !== null && (
            <div>
              <div style={{ fontSize: 10, color: T.ink400, marginBottom: 2 }}>Headroom</div>
              <div style={{
                fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                color: currentCash - totalRestockCost >= 0 ? T.success : T.danger,
              }}>
                {fmtZar(currentCash - totalRestockCost)}
              </div>
            </div>
          )}
        </div>
        {currentCash !== null && (
          <div style={{
            marginTop: 10, fontSize: 11, fontWeight: 600,
            color: currentCash >= totalRestockCost ? T.success : T.danger,
          }}>
            {currentCash >= totalRestockCost
              ? "✓ Adequate cash for planned restocking"
              : `⚠ Shortfall of ${fmtZar(totalRestockCost - currentCash)} — review restock priorities`}
          </div>
        )}
      </div>

      {/* ── SECTION 4: Cash Flow Projection ── */}
      <ChartCard title="Cash Flow Projection — Next 30 Days" subtitle="Based on velocity + OPEX + restock" height="auto">
        <div style={{ padding: "8px 16px 16px" }}>
          {[
            { label: "Opening Cash (last EOD)", value: currentCash, color: T.ink900 },
            { label: "+ Projected Revenue", value: projRev, color: T.success, prefix: "+" },
            { label: "− Projected COGS", value: -projCogs, color: T.danger, prefix: "−" },
            { label: "− Projected OPEX", value: -opexMonthly, color: T.danger, prefix: "−" },
            { label: "− Planned Restock", value: -totalRestockCost, color: T.warning, prefix: "−" },
          ].map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: i < 4 ? `1px solid ${T.ink075}` : "none", fontSize: 13,
            }}>
              <span style={{ color: T.ink500 }}>{row.label}</span>
              <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", color: row.color }}>
                {row.value === null ? "—" : `${row.prefix || ""}${fmtZar(Math.abs(row.value))}`}
              </span>
            </div>
          ))}
          <div style={{
            display: "flex", justifyContent: "space-between", padding: "10px 0 0",
            borderTop: `2px solid ${T.ink150}`, marginTop: 4, fontSize: 15, fontWeight: 700,
          }}>
            <span style={{ color: T.ink900 }}>Projected Closing Cash</span>
            <span style={{
              fontVariantNumeric: "tabular-nums",
              color: cashAfter === null ? T.ink300 : cashAfter >= 0 ? T.success : T.danger,
            }}>
              {cashAfter === null ? "—" : fmtZar(cashAfter)}
            </span>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
