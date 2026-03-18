// src/components/shop/ShopAnalytics.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SHOP ANALYTICS — Phase 2F (Task 26)
//
// Scoped analytics for shop admins. Three sub-tabs:
//   - Scans: scan counts, sources, top products, trends
//   - Customers: customer list, loyalty tiers, top earners
//   - Loyalty: points issued/redeemed, redemption rate
//
// All queries filtered by tenant_id.
// LL-050: loyalty_transactions has NO id or created_at.
// LL-049: Always check r.error after Supabase queries.
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
  muted: "#474747",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
  blue: "#2c4a6e",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

function KPICard({ label, value, sub, color = C.primaryDark }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: "2px",
        padding: "16px 20px",
        flex: "1 1 160px",
        minWidth: "140px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          fontFamily: FONTS.body,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 300,
          color,
          fontFamily: FONTS.heading,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "11px",
            color: C.muted,
            fontFamily: FONTS.body,
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, max, color = C.accentGreen }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      style={{
        background: C.warmBg,
        borderRadius: "2px",
        height: "6px",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: color,
          height: "100%",
          width: `${pct}%`,
          borderRadius: "2px",
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

export default function ShopAnalytics() {
  const { tenantId } = useTenant();
  const [subTab, setSubTab] = useState("scans");
  const [loading, setLoading] = useState(true);

  // Scans data
  const [scanStats, setScanStats] = useState({
    total: 0,
    sources: {},
    topProducts: [],
    last30Days: 0,
  });

  // Customer data
  const [customers, setCustomers] = useState([]);
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    tiers: {},
  });

  // Loyalty data
  const [loyaltyStats, setLoyaltyStats] = useState({
    totalEarned: 0,
    totalSpent: 0,
    earnCount: 0,
    spendCount: 0,
    redemptionRate: "0",
  });

  const loadAnalytics = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      // ── Scan Analytics ──────────────────────────────────────
      // Total scans
      const r1 = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if (r1.error) console.error("[ShopAnalytics] scans count:", r1.error);

      // All scans for source breakdown + date analysis
      const r1b = await supabase
        .from("scans")
        .select("id, scan_date, source, product_id")
        .eq("tenant_id", tenantId);
      if (r1b.error) console.error("[ShopAnalytics] scans data:", r1b.error);
      const allScans = r1b.data || [];

      // Source breakdown
      const sources = {};
      allScans.forEach((s) => {
        const src = s.source || "direct";
        sources[src] = (sources[src] || 0) + 1;
      });

      // Last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const last30 = allScans.filter(
        (s) => s.scan_date && new Date(s.scan_date) >= thirtyDaysAgo,
      ).length;

      // Top products by scan count
      const productCounts = {};
      allScans.forEach((s) => {
        if (s.product_id) {
          productCounts[s.product_id] = (productCounts[s.product_id] || 0) + 1;
        }
      });
      const topProductIds = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Get product details for top scanned
      let topProducts = [];
      if (topProductIds.length > 0) {
        const ids = topProductIds.map((p) => p[0]);
        const r1c = await supabase
          .from("products")
          .select("id, qr_code, batches(batch_number, strain)")
          .in("id", ids);
        if (r1c.error)
          console.error("[ShopAnalytics] top products:", r1c.error);
        const productMap = {};
        (r1c.data || []).forEach((p) => {
          productMap[p.id] = p;
        });
        topProducts = topProductIds.map(([id, count]) => ({
          id,
          count,
          qr_code: productMap[id]?.qr_code || id.substring(0, 12),
          strain: productMap[id]?.batches?.strain || "—",
        }));
      }

      setScanStats({
        total: r1.count || 0,
        sources,
        topProducts,
        last30Days: last30,
      });

      // ── Customer Analytics ──────────────────────────────────
      const r2 = await supabase
        .from("user_profiles")
        .select("id, full_name, role, loyalty_points, loyalty_tier")
        .eq("tenant_id", tenantId)
        .eq("role", "customer")
        .order("loyalty_points", { ascending: false });
      if (r2.error) console.error("[ShopAnalytics] customers:", r2.error);
      const custData = r2.data || [];

      const tiers = {};
      custData.forEach((c) => {
        const tier = c.loyalty_tier || "bronze";
        tiers[tier] = (tiers[tier] || 0) + 1;
      });

      setCustomers(custData);
      setCustomerStats({
        total: custData.length,
        tiers,
      });

      // ── Loyalty Analytics ───────────────────────────────────
      // LL-050: Only safe columns: points, transaction_type
      const r3 = await supabase
        .from("loyalty_transactions")
        .select("points, transaction_type")
        .eq("tenant_id", tenantId);
      if (r3.error) console.error("[ShopAnalytics] loyalty:", r3.error);
      const txns = r3.data || [];

      let totalEarned = 0;
      let totalSpent = 0;
      let earnCount = 0;
      let spendCount = 0;

      txns.forEach((t) => {
        if (t.transaction_type === "earn") {
          totalEarned += t.points || 0;
          earnCount++;
        } else if (t.transaction_type === "spend") {
          totalSpent += Math.abs(t.points || 0);
          spendCount++;
        }
      });

      const redemptionRate =
        earnCount > 0 ? ((spendCount / earnCount) * 100).toFixed(1) : "0";

      setLoyaltyStats({
        totalEarned,
        totalSpent,
        earnCount,
        spendCount,
        redemptionRate,
      });
    } catch (err) {
      console.error("[ShopAnalytics] loadAnalytics error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

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
        <style>{`@keyframes protea-spin { to { transform: rotate(360deg); } }`}</style>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Loading analytics…
        </span>
      </div>
    );
  }

  const maxScanSource = Math.max(...Object.values(scanStats.sources), 1);
  const maxProductScan =
    scanStats.topProducts.length > 0 ? scanStats.topProducts[0].count : 1;

  return (
    <div>
      {/* ── Sub-tab nav ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "24px",
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          overflow: "hidden",
          width: "fit-content",
        }}
      >
        {[
          { key: "scans", label: "Scans" },
          { key: "customers", label: "Customers" },
          { key: "loyalty", label: "Loyalty" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              background: subTab === t.key ? C.primaryDark : "transparent",
              color: subTab === t.key ? C.white : C.primaryDark,
              border: "none",
              padding: "10px 24px",
              cursor: "pointer",
              fontFamily: FONTS.body,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════ SCANS SUB-TAB ══════ */}
      {subTab === "scans" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <KPICard
              label="Total Scans"
              value={scanStats.total}
              color={C.accentGreen}
            />
            <KPICard
              label="Last 30 Days"
              value={scanStats.last30Days}
              color={C.primaryDark}
            />
            <KPICard
              label="Scan Sources"
              value={Object.keys(scanStats.sources).length}
              color={C.blue}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {/* Source Breakdown */}
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "20px",
              }}
            >
              <h4
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  margin: "0 0 16px 0",
                }}
              >
                Scan Sources
              </h4>
              {Object.entries(scanStats.sources).length === 0 ? (
                <span
                  style={{
                    color: C.muted,
                    fontSize: "12px",
                    fontStyle: "italic",
                  }}
                >
                  No scan data
                </span>
              ) : (
                Object.entries(scanStats.sources)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <div key={source} style={{ marginBottom: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 500,
                            textTransform: "capitalize",
                            color: C.text,
                          }}
                        >
                          {source}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: C.primaryDark,
                          }}
                        >
                          {count}
                        </span>
                      </div>
                      <ProgressBar
                        value={count}
                        max={maxScanSource}
                        color={C.accentGreen}
                      />
                    </div>
                  ))
              )}
            </div>

            {/* Top Products */}
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "20px",
              }}
            >
              <h4
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  margin: "0 0 16px 0",
                }}
              >
                Top Scanned Products
              </h4>
              {scanStats.topProducts.length === 0 ? (
                <span
                  style={{
                    color: C.muted,
                    fontSize: "12px",
                    fontStyle: "italic",
                  }}
                >
                  No product scan data
                </span>
              ) : (
                scanStats.topProducts.map((p, i) => (
                  <div key={p.id} style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: C.text }}>
                        <span
                          style={{
                            color: C.muted,
                            marginRight: "6px",
                            fontSize: "10px",
                          }}
                        >
                          #{i + 1}
                        </span>
                        {p.strain !== "—" ? p.strain : p.qr_code}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: C.gold,
                        }}
                      >
                        {p.count} scans
                      </span>
                    </div>
                    <ProgressBar
                      value={p.count}
                      max={maxProductScan}
                      color={C.gold}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ CUSTOMERS SUB-TAB ══════ */}
      {subTab === "customers" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <KPICard
              label="Total Customers"
              value={customerStats.total}
              color={C.primaryDark}
            />
            {Object.entries(customerStats.tiers).map(([tier, count]) => (
              <KPICard
                key={tier}
                label={`${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`}
                value={count}
                color={
                  tier === "gold"
                    ? C.gold
                    : tier === "silver"
                      ? C.muted
                      : tier === "platinum"
                        ? C.blue
                        : C.accentGreen
                }
              />
            ))}
          </div>

          {/* Customer Table */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: C.primaryDark }}>
                  {["Customer", "Points", "Tier"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: C.white,
                        fontFamily: FONTS.body,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: C.muted,
                      }}
                    >
                      No customers yet
                    </td>
                  </tr>
                ) : (
                  customers.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: i % 2 === 0 ? C.white : C.bg,
                      }}
                    >
                      <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                        {c.full_name || "Unnamed"}
                      </td>
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 600,
                          fontFamily: FONTS.heading,
                          fontSize: "18px",
                          color: C.gold,
                        }}
                      >
                        {c.loyalty_points || 0}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            background:
                              c.loyalty_tier === "gold"
                                ? "rgba(181,147,90,0.12)"
                                : c.loyalty_tier === "silver"
                                  ? "rgba(136,136,136,0.12)"
                                  : c.loyalty_tier === "platinum"
                                    ? "rgba(44,74,110,0.12)"
                                    : "rgba(82,183,136,0.12)",
                            color:
                              c.loyalty_tier === "gold"
                                ? C.gold
                                : c.loyalty_tier === "silver"
                                  ? C.muted
                                  : c.loyalty_tier === "platinum"
                                    ? C.blue
                                    : C.accentGreen,
                            padding: "3px 10px",
                            borderRadius: "2px",
                            fontSize: "9px",
                            fontWeight: 600,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          {c.loyalty_tier || "bronze"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════ LOYALTY SUB-TAB ══════ */}
      {subTab === "loyalty" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}
          >
            <KPICard
              label="Points Earned"
              value={loyaltyStats.totalEarned.toLocaleString()}
              sub={`${loyaltyStats.earnCount} transactions`}
              color={C.accentGreen}
            />
            <KPICard
              label="Points Redeemed"
              value={loyaltyStats.totalSpent.toLocaleString()}
              sub={`${loyaltyStats.spendCount} redemptions`}
              color={C.gold}
            />
            <KPICard
              label="Redemption Rate"
              value={`${loyaltyStats.redemptionRate}%`}
              sub="redeems per earn"
              color={C.blue}
            />
            <KPICard
              label="Net Points in Circulation"
              value={(
                loyaltyStats.totalEarned - loyaltyStats.totalSpent
              ).toLocaleString()}
              color={C.primaryDark}
            />
          </div>

          {/* Loyalty visual summary */}
          <div
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              padding: "24px",
            }}
          >
            <h4
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
                margin: "0 0 20px 0",
              }}
            >
              Points Flow
            </h4>

            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "12px", color: C.text }}>Earned</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: C.accentGreen,
                  }}
                >
                  {loyaltyStats.totalEarned.toLocaleString()} pts
                </span>
              </div>
              <ProgressBar
                value={loyaltyStats.totalEarned}
                max={loyaltyStats.totalEarned || 1}
                color={C.accentGreen}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "12px", color: C.text }}>
                  Redeemed
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: C.gold,
                  }}
                >
                  {loyaltyStats.totalSpent.toLocaleString()} pts
                </span>
              </div>
              <ProgressBar
                value={loyaltyStats.totalSpent}
                max={loyaltyStats.totalEarned || 1}
                color={C.gold}
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "12px", color: C.text }}>
                  Still in Circulation
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: C.primaryDark,
                  }}
                >
                  {(
                    loyaltyStats.totalEarned - loyaltyStats.totalSpent
                  ).toLocaleString()}{" "}
                  pts
                </span>
              </div>
              <ProgressBar
                value={loyaltyStats.totalEarned - loyaltyStats.totalSpent}
                max={loyaltyStats.totalEarned || 1}
                color={C.primaryDark}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
