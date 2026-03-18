// src/components/shop/ShopOverview.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SHOP OVERVIEW — Phase 2F (Task 24)
//
// Scoped KPI dashboard for shop admins. Shows:
//   - Product count (their QR codes)
//   - Total scans
//   - Customer count
//   - Loyalty points issued
//   - Recent scans table
//   - Recent shipments to this shop
//
// All queries filtered by tenant_id. No cost data exposed.
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

function KPICard({ label, value, sub, color = C.primaryDark, icon }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color}`,
        borderRadius: "2px",
        padding: "20px",
        flex: "1 1 200px",
        minWidth: "180px",
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
          marginBottom: "8px",
        }}
      >
        {icon && <span style={{ marginRight: "6px" }}>{icon}</span>}
        {label}
      </div>
      <div
        style={{
          fontSize: "32px",
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
            fontSize: "12px",
            color: C.muted,
            fontFamily: FONTS.body,
            marginTop: "6px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ShopOverview() {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState({
    products: 0,
    scans: 0,
    customers: 0,
    claimed: 0,
    loyaltyPoints: 0,
    claimRate: "0",
  });
  const [recentScans, setRecentScans] = useState([]);
  const [recentShipments, setRecentShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      // Product count
      const r1 = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if (r1.error) console.error("[ShopOverview] products count:", r1.error);
      const productCount = r1.count || 0;

      // Claimed count
      const r1b = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "claimed");
      if (r1b.error) console.error("[ShopOverview] claimed count:", r1b.error);
      const claimedCount = r1b.count || 0;

      // Scan count
      const r2 = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if (r2.error) console.error("[ShopOverview] scans count:", r2.error);

      // Customer count (role = customer within this tenant)
      const r3 = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("role", "customer");
      if (r3.error) console.error("[ShopOverview] customers count:", r3.error);

      // Loyalty points — LL-050: only safe columns
      const r4 = await supabase
        .from("loyalty_transactions")
        .select("points, transaction_type")
        .eq("tenant_id", tenantId)
        .eq("transaction_type", "earn");
      if (r4.error) console.error("[ShopOverview] loyalty:", r4.error);
      const totalPoints = (r4.data || []).reduce(
        (sum, t) => sum + (t.points || 0),
        0,
      );

      const claimRate =
        productCount > 0
          ? ((claimedCount / productCount) * 100).toFixed(1)
          : "0";

      setStats({
        products: productCount,
        scans: r2.count || 0,
        customers: r3.count || 0,
        claimed: claimedCount,
        loyaltyPoints: totalPoints,
        claimRate,
      });

      // Recent scans (last 10)
      const r5 = await supabase
        .from("scans")
        .select("id, scan_date, source, product_id")
        .eq("tenant_id", tenantId)
        .order("scan_date", { ascending: false })
        .limit(10);
      if (r5.error) console.error("[ShopOverview] recent scans:", r5.error);
      setRecentScans(r5.data || []);

      // Recent shipments TO this shop
      const r6 = await supabase
        .from("shipments")
        .select(
          "id, shipment_number, status, shipped_date, estimated_arrival, destination_name",
        )
        .eq("destination_tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (r6.error) console.error("[ShopOverview] shipments:", r6.error);
      setRecentShipments(r6.data || []);
    } catch (err) {
      console.error("[ShopOverview] loadData error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          Loading overview…
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* ── KPI Row 1 ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <KPICard
          icon="📦"
          label="Products"
          value={stats.products}
          sub={`${stats.claimed} claimed`}
          color={C.primaryDark}
        />
        <KPICard
          icon="📱"
          label="Total Scans"
          value={stats.scans}
          color={C.accentGreen}
        />
        <KPICard
          icon="👥"
          label="Customers"
          value={stats.customers}
          color={C.blue}
        />
        <KPICard
          icon="🎯"
          label="Loyalty Points Issued"
          value={stats.loyaltyPoints.toLocaleString()}
          sub={`${stats.claimRate}% claim rate`}
          color={C.gold}
        />
      </div>

      {/* ── Two-Column: Recent Scans + Shipments ────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        {/* Recent Scans */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              background: C.warmBg,
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.primaryDark,
                fontFamily: FONTS.body,
              }}
            >
              Recent Scans
            </span>
          </div>
          {recentScans.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: C.muted,
                fontSize: "13px",
              }}
            >
              No scans yet
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr>
                  {["Date", "Source", "Product ID"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 14px",
                        textAlign: "left",
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: C.muted,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentScans.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      background: i % 2 === 0 ? C.white : C.bg,
                    }}
                  >
                    <td style={{ padding: "8px 14px", color: C.text }}>
                      {fmtDate(s.scan_date)}
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <span
                        style={{
                          background: "rgba(82,183,136,0.12)",
                          color: C.accentGreen,
                          padding: "2px 8px",
                          borderRadius: "2px",
                          fontSize: "9px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {s.source || "direct"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        fontFamily: "monospace",
                        fontSize: "10px",
                        color: C.muted,
                      }}
                    >
                      {s.product_id?.substring(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Shipments */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${C.border}`,
              background: C.warmBg,
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.primaryDark,
                fontFamily: FONTS.body,
              }}
            >
              Incoming Shipments
            </span>
          </div>
          {recentShipments.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: C.muted,
                fontSize: "13px",
              }}
            >
              No shipments yet
            </div>
          ) : (
            <div>
              {recentShipments.map((sh) => (
                <div
                  key={sh.id}
                  style={{
                    padding: "12px 20px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: C.text,
                      }}
                    >
                      {sh.shipment_number}
                    </div>
                    <div style={{ fontSize: "11px", color: C.muted }}>
                      {sh.shipped_date
                        ? `Shipped ${fmtDate(sh.shipped_date)}`
                        : "Preparing"}
                      {sh.estimated_arrival &&
                        ` · ETA ${fmtDate(sh.estimated_arrival)}`}
                    </div>
                  </div>
                  <span
                    style={{
                      background:
                        sh.status === "delivered" || sh.status === "confirmed"
                          ? "rgba(82,183,136,0.12)"
                          : sh.status === "shipped" ||
                              sh.status === "in_transit"
                            ? "rgba(181,147,90,0.12)"
                            : "rgba(136,136,136,0.12)",
                      color:
                        sh.status === "delivered" || sh.status === "confirmed"
                          ? C.accentGreen
                          : sh.status === "shipped" ||
                              sh.status === "in_transit"
                            ? C.gold
                            : C.muted,
                      padding: "3px 10px",
                      borderRadius: "2px",
                      fontSize: "9px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {sh.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
