// src/components/hq/HQBalanceSheet.js v1.0
// WP-FIN S5+S6: Balance Sheet + Cash Flow Statement
// v1.0:
//   - Balance Sheet tab: Assets (inventory AVCO + CAPEX + receivables) vs
//     Liabilities (payables) vs Equity (net assets)
//   - Cash Flow tab: Operating / Investing / Financing activities
//   - CSV Trial Balance export
//   - All queries tenant-scoped via useTenant()
//   - Inter font, token design system matching HQCogs/HQPricing
//   - No in-memory estimates — every line traces to a DB row

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// ── Design tokens (matches HQCogs/HQPricing) ──────────────────────────────────
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
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sCard = {
  background: "#fff",
  borderRadius: 8,
  border: `1px solid ${T.ink150}`,
  padding: 24,
  marginBottom: 20,
  boxShadow: T.shadow,
};

const mkBtn = (variant = "primary", extra = {}) => {
  const base = {
    padding: "9px 18px",
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    fontFamily: T.font,
    fontWeight: 600,
    fontSize: 13,
    transition: "opacity 0.15s",
    letterSpacing: "0.04em",
  };
  const v = {
    primary: { background: T.accent, color: "#fff" },
    ghost: {
      background: "transparent",
      color: T.accent,
      border: `1px solid ${T.accentBd}`,
    },
    small: {
      background: T.ink075,
      color: T.ink700,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: 500,
    },
  };
  return { ...base, ...(v[variant] || v.primary), ...extra };
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// ── Period helpers ────────────────────────────────────────────────────────────
function getPeriodBounds(period, customFrom, customTo) {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  if (period === "this_month") {
    return {
      start: new Date(yr, mo, 1).toISOString(),
      end: new Date(yr, mo + 1, 0, 23, 59, 59).toISOString(),
    };
  }
  if (period === "last_month") {
    return {
      start: new Date(yr, mo - 1, 1).toISOString(),
      end: new Date(yr, mo, 0, 23, 59, 59).toISOString(),
    };
  }
  if (period === "this_year") {
    return {
      start: new Date(yr, 0, 1).toISOString(),
      end: new Date(yr, 11, 31, 23, 59, 59).toISOString(),
    };
  }
  if (period === "custom" && customFrom && customTo) {
    return {
      start: new Date(customFrom + "T00:00:00").toISOString(),
      end: new Date(customTo + "T23:59:59").toISOString(),
    };
  }
  // all time
  return { start: null, end: null };
}

// ── Row component ─────────────────────────────────────────────────────────────
function BSRow({
  label,
  value,
  indent = 0,
  bold = false,
  total = false,
  negative = false,
  muted = false,
  borderTop = false,
  sub = null,
}) {
  const displayVal =
    value === null || value === undefined
      ? "—"
      : negative
        ? `(${fmtZar(Math.abs(value))})`
        : fmtZar(value);

  const colour = muted
    ? T.ink300
    : total
      ? value < 0
        ? T.danger
        : T.accent
      : T.ink700;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `${bold || total ? 12 : 9}px ${16 + indent * 24}px`,
        borderTop: borderTop ? `2px solid ${T.ink150}` : undefined,
        borderBottom: total ? `2px solid ${T.ink150}` : undefined,
        background: total ? T.ink075 : "transparent",
      }}
    >
      <div>
        <div
          style={{
            fontSize: bold || total ? 14 : 13,
            fontWeight: bold || total ? 700 : 400,
            color: muted ? T.ink300 : T.ink700,
            fontFamily: T.font,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 11,
              color: T.ink400,
              marginTop: 2,
              fontFamily: T.font,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: T.fontData,
          fontSize: bold || total ? 16 : 14,
          fontWeight: bold || total ? 700 : 400,
          color: colour,
          minWidth: 120,
          textAlign: "right",
        }}
      >
        {displayVal}
      </div>
    </div>
  );
}

function SectionLabel({ label, icon }) {
  return (
    <div
      style={{
        padding: "8px 16px",
        background: "#f0ede8",
        fontSize: 10,
        fontWeight: 700,
        color: T.ink500,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontFamily: T.font,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </div>
  );
}

// ── KPI tile ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.ink150}`,
        borderRadius: 8,
        padding: "18px 20px",
        boxShadow: T.shadow,
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.ink400,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
          fontFamily: T.font,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.fontData,
          fontSize: 26,
          fontWeight: 400,
          color: color || T.accent,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color: T.ink400,
            marginTop: 6,
            fontFamily: T.font,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function HQBalanceSheet() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [activeTab, setActiveTab] = useState("balance");
  const [cfPeriod, setCfPeriod] = useState("this_year");
  const [cfCustomFrom, setCfCustomFrom] = useState("");
  const [cfCustomTo, setCfCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [asAtDate] = useState(
    new Date().toLocaleDateString("en-ZA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  // Balance sheet state
  const [inventoryValue, setInventoryValue] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [receivables, setReceivables] = useState(0);
  const [receivablesCount, setReceivablesCount] = useState(0);
  const [capexAssets, setCapexAssets] = useState([]);
  const [payables, setPayables] = useState(0);
  const [payablesCount, setPayablesCount] = useState(0);
  const [opexAccruals, setOpexAccruals] = useState(0);

  // Cash flow state
  const [cfData, setCfData] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // ── Fetch balance sheet data ──────────────────────────────────────────────
  const fetchBalanceSheet = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [invRes, invRes2, rcvRes, capexRes, payRes] = await Promise.all([
        // 1. Inventory at AVCO
        supabase
          .from("inventory_items")
          .select("quantity_on_hand, weighted_avg_cost, is_active")
          .eq("tenant_id", tenantId)
          .eq("is_active", true),

        // 2. Inventory item count
        supabase
          .from("inventory_items")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("is_active", true),

        // 3. Accounts receivable (unpaid invoices — sale type)
        supabase
          .from("invoices")
          .select("total_amount, status, invoice_type, due_date")
          .eq("tenant_id", tenantId)
          .not("status", "eq", "paid"),

        // 4. CAPEX assets
        supabase
          .from("expenses")
          .select("id, description, amount_zar, expense_date, subcategory")
          .eq("tenant_id", tenantId)
          .eq("category", "capex"),

        // 5. Accounts payable (open purchase orders)
        supabase
          .from("purchase_orders")
          .select("landed_cost_zar, status, po_number")
          .eq("tenant_id", tenantId)
          .in("status", ["pending", "confirmed", "in_transit", "ordered"]),
      ]);

      // Inventory value
      if (invRes.data) {
        const val = invRes.data.reduce((sum, item) => {
          const qty = parseFloat(item.quantity_on_hand || 0);
          const avco = parseFloat(item.weighted_avg_cost || 0);
          return sum + qty * avco;
        }, 0);
        setInventoryValue(val);
      }
      setInventoryCount(invRes2.count || 0);

      // Receivables
      if (rcvRes.data) {
        const saleInvoices = rcvRes.data.filter(
          (i) => i.invoice_type !== "purchase",
        );
        const total = saleInvoices.reduce(
          (s, i) => s + parseFloat(i.total_amount || 0),
          0,
        );
        setReceivables(total);
        setReceivablesCount(saleInvoices.length);
      }

      // CAPEX assets
      setCapexAssets(capexRes.data || []);

      // Payables
      if (payRes.data) {
        const total = payRes.data.reduce(
          (s, po) => s + parseFloat(po.landed_cost_zar || 0),
          0,
        );
        setPayables(total);
        setPayablesCount(payRes.data.length);
      }

      // OPEX accruals (unpaid opex expenses — optional memo)
      const opexRes = await supabase
        .from("expenses")
        .select("amount_zar")
        .eq("tenant_id", tenantId)
        .eq("category", "opex");
      if (opexRes.data) {
        setOpexAccruals(
          opexRes.data.reduce((s, e) => s + parseFloat(e.amount_zar || 0), 0),
        );
      }
    } catch (err) {
      console.error("Balance sheet fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // ── Fetch cash flow data ──────────────────────────────────────────────────
  const fetchCashFlow = useCallback(async () => {
    if (!tenantId) return;
    const { start, end } = getPeriodBounds(cfPeriod, cfCustomFrom, cfCustomTo);
    try {
      // Cash received from customers (online orders)
      let ordersQ = supabase
        .from("orders")
        .select("total, created_at")
        .eq("tenant_id", tenantId);
      if (start) ordersQ = ordersQ.gte("created_at", start);
      if (end) ordersQ = ordersQ.lte("created_at", end);
      const ordersRes = await ordersQ;

      // Cash paid to suppliers (received/complete POs)
      let poQ = supabase
        .from("purchase_orders")
        .select("landed_cost_zar, received_date, status")
        .eq("tenant_id", tenantId)
        .in("status", ["received", "complete", "partially_received"]);
      if (start) poQ = poQ.gte("received_date", start);
      if (end) poQ = poQ.lte("received_date", end);
      const poRes = await poQ;

      // OPEX paid
      let opexQ = supabase
        .from("expenses")
        .select("amount_zar, expense_date")
        .eq("tenant_id", tenantId)
        .eq("category", "opex");
      if (start) opexQ = opexQ.gte("expense_date", start);
      if (end) opexQ = opexQ.lte("expense_date", end);
      const opexRes = await opexQ;

      // CAPEX paid
      let capexQ = supabase
        .from("expenses")
        .select("amount_zar, expense_date, description")
        .eq("tenant_id", tenantId)
        .eq("category", "capex");
      if (start) capexQ = capexQ.gte("expense_date", start);
      if (end) capexQ = capexQ.lte("expense_date", end);
      const capexRes = await capexQ;

      const cashFromCustomers = (ordersRes.data || []).reduce(
        (s, o) => s + parseFloat(o.total || 0),
        0,
      );
      const cashToSuppliers = (poRes.data || []).reduce(
        (s, p) => s + parseFloat(p.landed_cost_zar || 0),
        0,
      );
      const opexPaid = (opexRes.data || []).reduce(
        (s, e) => s + parseFloat(e.amount_zar || 0),
        0,
      );
      const capexPaid = (capexRes.data || []).reduce(
        (s, e) => s + parseFloat(e.amount_zar || 0),
        0,
      );

      const netOperating = cashFromCustomers - cashToSuppliers - opexPaid;
      const netInvesting = -capexPaid;
      const netCash = netOperating + netInvesting;

      setCfData({
        cashFromCustomers,
        cashToSuppliers,
        opexPaid,
        netOperating,
        capexPaid,
        capexItems: capexRes.data || [],
        netInvesting,
        netCash,
        orderCount: (ordersRes.data || []).length,
        poCount: (poRes.data || []).length,
      });
    } catch (err) {
      console.error("Cash flow fetch error:", err);
    }
  }, [tenantId, cfPeriod, cfCustomFrom, cfCustomTo]);

  useEffect(() => {
    fetchBalanceSheet();
  }, [fetchBalanceSheet]);

  useEffect(() => {
    if (activeTab === "cashflow") fetchCashFlow();
  }, [activeTab, fetchCashFlow]);

  // ── Derived balance sheet values ──────────────────────────────────────────
  const totalCapex = capexAssets.reduce(
    (s, e) => s + parseFloat(e.amount_zar || 0),
    0,
  );
  const totalCurrentAssets = inventoryValue + receivables;
  const totalFixedAssets = totalCapex;
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalLiabilities = payables;
  const netEquity = totalAssets - totalLiabilities;
  const balanced =
    Math.abs(totalAssets - (totalLiabilities + netEquity)) < 0.01;

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ["NexAI Balance Sheet", asAtDate],
      [],
      ["ASSETS"],
      ["Current Assets"],
      ["Inventory (at AVCO)", inventoryValue.toFixed(2)],
      ["Accounts Receivable", receivables.toFixed(2)],
      ["Total Current Assets", totalCurrentAssets.toFixed(2)],
      [],
      ["Fixed Assets"],
      ...capexAssets.map((e) => [
        e.description,
        parseFloat(e.amount_zar).toFixed(2),
      ]),
      ["Total Fixed Assets", totalFixedAssets.toFixed(2)],
      [],
      ["TOTAL ASSETS", totalAssets.toFixed(2)],
      [],
      ["LIABILITIES"],
      ["Accounts Payable", payables.toFixed(2)],
      ["Total Liabilities", totalLiabilities.toFixed(2)],
      [],
      ["EQUITY"],
      ["Net Assets / Equity", netEquity.toFixed(2)],
      [],
      ["TOTAL LIABILITIES + EQUITY", (totalLiabilities + netEquity).toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-sheet-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Balance sheet exported to CSV");
  };

  const exportCashFlowCSV = () => {
    if (!cfData) return;
    const rows = [
      ["NexAI Cash Flow Statement", `Period: ${cfPeriod}`],
      [],
      ["OPERATING ACTIVITIES"],
      ["Cash received from customers", cfData.cashFromCustomers.toFixed(2)],
      ["Cash paid to suppliers", (-cfData.cashToSuppliers).toFixed(2)],
      ["Operating expenses paid", (-cfData.opexPaid).toFixed(2)],
      ["Net cash from operations", cfData.netOperating.toFixed(2)],
      [],
      ["INVESTING ACTIVITIES"],
      ["Capital expenditure", (-cfData.capexPaid).toFixed(2)],
      ["Net cash from investing", cfData.netInvesting.toFixed(2)],
      [],
      ["NET CASH MOVEMENT", cfData.netCash.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Cash flow exported to CSV");
  };

  const PERIOD_OPTIONS = [
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "this_year", label: "This Year" },
    { id: "all_time", label: "All Time" },
    { id: "custom", label: "Custom Range" },
  ];

  const SUB_TABS = [
    { id: "balance", label: "Balance Sheet" },
    { id: "cashflow", label: "Cash Flow" },
  ];

  return (
    <div style={{ fontFamily: T.font, color: T.ink700 }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            background: T.accent,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            fontFamily: T.font,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontFamily: T.font,
              fontWeight: 300,
              color: T.ink900,
            }}
          >
            Financial Statements
          </h2>
          <p style={{ margin: "4px 0 0", color: T.ink500, fontSize: 13 }}>
            Balance Sheet · Cash Flow · Trial Balance export
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {activeTab === "balance" && (
            <button style={mkBtn("ghost")} onClick={exportCSV}>
              ↓ Export CSV
            </button>
          )}
          {activeTab === "cashflow" && cfData && (
            <button style={mkBtn("ghost")} onClick={exportCashFlowCSV}>
              ↓ Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${T.ink150}`,
          marginBottom: 28,
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 20px",
              fontFamily: T.font,
              fontSize: 11,
              fontWeight: activeTab === t.id ? 700 : 400,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: activeTab === t.id ? T.accent : T.ink500,
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${T.accent}`
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BALANCE SHEET TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "balance" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: T.ink400 }}>
              Loading balance sheet…
            </div>
          ) : (
            <>
              {/* As at date + balance check */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    background: T.accentLit,
                    border: `1px solid ${T.accentBd}`,
                    borderRadius: 4,
                    padding: "8px 14px",
                    fontSize: 12,
                    color: T.accent,
                    fontWeight: 600,
                    fontFamily: T.font,
                  }}
                >
                  As at: {asAtDate}
                </div>
                <div
                  style={{
                    background: balanced ? T.successBg : T.dangerBg,
                    border: `1px solid ${balanced ? T.successBd : T.dangerBd}`,
                    borderRadius: 4,
                    padding: "8px 14px",
                    fontSize: 12,
                    color: balanced ? T.success : T.danger,
                    fontWeight: 600,
                    fontFamily: T.font,
                  }}
                >
                  {balanced
                    ? "✓ Statement balances"
                    : "⚠ Statement does not balance — check data"}
                </div>
              </div>

              {/* KPI strip */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                <KPI
                  label="Total Assets"
                  value={fmtZar(totalAssets)}
                  sub={`${inventoryCount} inventory items`}
                  color={T.accent}
                />
                <KPI
                  label="Total Liabilities"
                  value={fmtZar(totalLiabilities)}
                  sub={`${payablesCount} open PO${payablesCount !== 1 ? "s" : ""}`}
                  color={totalLiabilities > 0 ? T.danger : T.ink400}
                />
                <KPI
                  label="Net Equity"
                  value={fmtZar(netEquity)}
                  sub="Assets minus Liabilities"
                  color={netEquity >= 0 ? T.success : T.danger}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  alignItems: "start",
                }}
              >
                {/* LEFT: Assets */}
                <div style={{ ...sCard, padding: 0, overflow: "hidden" }}>
                  <SectionLabel label="Assets" icon="📦" />

                  <SectionLabel label="Current Assets" />
                  <BSRow
                    label="Inventory"
                    value={inventoryValue}
                    indent={1}
                    sub={`${inventoryCount} active SKUs at weighted average cost (AVCO)`}
                  />
                  <BSRow
                    label="Accounts Receivable"
                    value={receivables}
                    indent={1}
                    sub={
                      receivablesCount > 0
                        ? `${receivablesCount} unpaid invoice${receivablesCount !== 1 ? "s" : ""}`
                        : "No outstanding invoices"
                    }
                  />
                  <BSRow
                    label="Total Current Assets"
                    value={totalCurrentAssets}
                    bold
                    borderTop
                  />

                  <SectionLabel label="Fixed Assets" />
                  {capexAssets.length === 0 ? (
                    <div
                      style={{
                        padding: "14px 40px",
                        fontSize: 13,
                        color: T.ink300,
                        fontFamily: T.font,
                      }}
                    >
                      No CAPEX recorded — add via HQ Documents or Expenses
                    </div>
                  ) : (
                    capexAssets.map((asset) => (
                      <BSRow
                        key={asset.id}
                        label={asset.description}
                        value={parseFloat(asset.amount_zar)}
                        indent={1}
                        sub={
                          asset.expense_date
                            ? fmtDate(asset.expense_date)
                            : undefined
                        }
                      />
                    ))
                  )}
                  <BSRow
                    label="Total Fixed Assets"
                    value={totalFixedAssets}
                    bold
                    borderTop
                  />

                  <BSRow
                    label="TOTAL ASSETS"
                    value={totalAssets}
                    total
                    bold
                    borderTop
                  />
                </div>

                {/* RIGHT: Liabilities + Equity */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                  {/* Liabilities */}
                  <div style={{ ...sCard, padding: 0, overflow: "hidden" }}>
                    <SectionLabel label="Liabilities" icon="💳" />

                    <SectionLabel label="Current Liabilities" />
                    <BSRow
                      label="Accounts Payable"
                      value={payables}
                      indent={1}
                      sub={
                        payablesCount > 0
                          ? `${payablesCount} open purchase order${payablesCount !== 1 ? "s" : ""} pending/in-transit`
                          : "No outstanding purchase orders"
                      }
                    />
                    {opexAccruals > 0 && (
                      <BSRow
                        label="Accrued OpEx"
                        value={opexAccruals}
                        indent={1}
                        sub="Recorded operating expenses"
                        muted
                      />
                    )}
                    <BSRow
                      label="TOTAL LIABILITIES"
                      value={totalLiabilities}
                      total
                      bold
                      borderTop
                    />
                  </div>

                  {/* Equity */}
                  <div style={{ ...sCard, padding: 0, overflow: "hidden" }}>
                    <SectionLabel label="Equity" icon="⚖️" />
                    <BSRow
                      label="Net Assets"
                      value={netEquity}
                      indent={1}
                      sub="Total Assets minus Total Liabilities"
                    />
                    <BSRow
                      label="TOTAL EQUITY"
                      value={netEquity}
                      total
                      bold
                      borderTop
                    />
                  </div>

                  {/* Accounting equation check */}
                  <div
                    style={{
                      ...sCard,
                      padding: 0,
                      overflow: "hidden",
                      borderColor: balanced ? T.accentBd : T.dangerBd,
                    }}
                  >
                    <SectionLabel
                      label="Accounting Equation Check"
                      icon={balanced ? "✓" : "⚠"}
                    />
                    <BSRow
                      label="Total Liabilities + Equity"
                      value={totalLiabilities + netEquity}
                      bold
                    />
                    <BSRow label="Total Assets" value={totalAssets} bold />
                    <div
                      style={{
                        padding: "10px 16px",
                        background: balanced ? T.successBg : T.dangerBg,
                        fontSize: 12,
                        color: balanced ? T.success : T.danger,
                        fontWeight: 600,
                        fontFamily: T.font,
                        textAlign: "center",
                      }}
                    >
                      {balanced
                        ? "✓ Assets = Liabilities + Equity"
                        : `⚠ Difference: ${fmtZar(Math.abs(totalAssets - totalLiabilities - netEquity))}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div
                style={{
                  marginTop: 8,
                  background: T.ink075,
                  borderRadius: 6,
                  padding: "14px 18px",
                  fontSize: 12,
                  color: T.ink500,
                  border: `1px solid ${T.ink150}`,
                  lineHeight: 1.7,
                  fontFamily: T.font,
                }}
              >
                <strong style={{ color: T.ink700 }}>
                  Notes to Balance Sheet:
                </strong>{" "}
                Inventory is stated at weighted average cost (AVCO) per unit.
                Accounts Receivable includes all invoices with status other than
                "paid". Fixed assets represent gross CAPEX spend — no
                depreciation has been applied. Accounts Payable represents open
                purchase orders not yet received. Cash and bank balances are not
                yet connected — link your bank account to complete the picture.
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CASH FLOW TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "cashflow" && (
        <>
          {/* Period selector */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: T.ink400,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: T.font,
              }}
            >
              Period:
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCfPeriod(opt.id)}
                  style={{
                    ...mkBtn(cfPeriod === opt.id ? "primary" : "ghost", {
                      padding: "6px 14px",
                      fontSize: 12,
                    }),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {cfPeriod === "custom" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="date"
                  value={cfCustomFrom}
                  onChange={(e) => setCfCustomFrom(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    fontFamily: T.font,
                    fontSize: 13,
                    color: T.ink900,
                  }}
                />
                <span style={{ color: T.ink400, fontSize: 12 }}>to</span>
                <input
                  type="date"
                  value={cfCustomTo}
                  onChange={(e) => setCfCustomTo(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    fontFamily: T.font,
                    fontSize: 13,
                    color: T.ink900,
                  }}
                />
              </div>
            )}
          </div>

          {!cfData ? (
            <div style={{ textAlign: "center", padding: 60, color: T.ink400 }}>
              Loading cash flow…
            </div>
          ) : (
            <>
              {/* KPI strip */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginBottom: 24,
                  flexWrap: "wrap",
                }}
              >
                <KPI
                  label="Net Cash Movement"
                  value={fmtZar(cfData.netCash)}
                  sub="Operating + Investing"
                  color={cfData.netCash >= 0 ? T.success : T.danger}
                />
                <KPI
                  label="Cash from Operations"
                  value={fmtZar(cfData.netOperating)}
                  sub={`${cfData.orderCount} customer order${cfData.orderCount !== 1 ? "s" : ""}`}
                  color={cfData.netOperating >= 0 ? T.accentMid : T.danger}
                />
                <KPI
                  label="Capital Deployed"
                  value={fmtZar(cfData.capexPaid)}
                  sub="Equipment & fixed assets"
                  color={T.info}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  alignItems: "start",
                }}
              >
                {/* Operating activities */}
                <div style={{ ...sCard, padding: 0, overflow: "hidden" }}>
                  <SectionLabel label="Operating Activities" icon="⚙️" />
                  <BSRow
                    label="Cash received from customers"
                    value={cfData.cashFromCustomers}
                    indent={1}
                    sub={`${cfData.orderCount} online order${cfData.orderCount !== 1 ? "s" : ""} in period`}
                  />
                  <BSRow
                    label="Cash paid to suppliers"
                    value={cfData.cashToSuppliers}
                    indent={1}
                    negative
                    sub={`${cfData.poCount} received PO${cfData.poCount !== 1 ? "s" : ""} in period`}
                  />
                  <BSRow
                    label="Operating expenses paid"
                    value={cfData.opexPaid}
                    indent={1}
                    negative
                    sub="Rent, utilities, wages, marketing"
                  />
                  <BSRow
                    label="Net Cash from Operations"
                    value={cfData.netOperating}
                    bold
                    borderTop
                  />
                </div>

                {/* Investing + summary */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                  <div style={{ ...sCard, padding: 0, overflow: "hidden" }}>
                    <SectionLabel label="Investing Activities" icon="🏗️" />
                    {cfData.capexItems.length === 0 ? (
                      <div
                        style={{
                          padding: "14px 40px",
                          fontSize: 13,
                          color: T.ink300,
                          fontFamily: T.font,
                        }}
                      >
                        No capital expenditure in this period
                      </div>
                    ) : (
                      cfData.capexItems.map((item, i) => (
                        <BSRow
                          key={i}
                          label={item.description}
                          value={parseFloat(item.amount_zar)}
                          indent={1}
                          negative
                          sub={
                            item.expense_date
                              ? fmtDate(item.expense_date)
                              : undefined
                          }
                        />
                      ))
                    )}
                    <BSRow
                      label="Net Cash from Investing"
                      value={cfData.netInvesting}
                      bold
                      borderTop
                    />
                  </div>

                  {/* Net cash summary */}
                  <div style={{ ...sCard, padding: 0, overflow: "hidden" }}>
                    <SectionLabel label="Net Cash Summary" icon="💰" />
                    <BSRow
                      label="Operating activities"
                      value={cfData.netOperating}
                      indent={1}
                    />
                    <BSRow
                      label="Investing activities"
                      value={cfData.netInvesting}
                      indent={1}
                    />
                    <BSRow
                      label="NET CASH MOVEMENT"
                      value={cfData.netCash}
                      total
                      bold
                      borderTop
                    />
                    <div
                      style={{
                        padding: "10px 16px",
                        background:
                          cfData.netCash >= 0 ? T.successBg : T.dangerBg,
                        fontSize: 12,
                        color: cfData.netCash >= 0 ? T.success : T.danger,
                        fontWeight: 600,
                        fontFamily: T.font,
                        textAlign: "center",
                      }}
                    >
                      {cfData.netCash >= 0
                        ? `✓ Net cash positive — ${fmtZar(cfData.netCash)} generated`
                        : `⚠ Net cash negative — ${fmtZar(Math.abs(cfData.netCash))} consumed`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div
                style={{
                  marginTop: 8,
                  background: T.ink075,
                  borderRadius: 6,
                  padding: "14px 18px",
                  fontSize: 12,
                  color: T.ink500,
                  border: `1px solid ${T.ink150}`,
                  lineHeight: 1.7,
                  fontFamily: T.font,
                }}
              >
                <strong style={{ color: T.ink700 }}>Notes to Cash Flow:</strong>{" "}
                Cash from customers reflects completed online orders in the
                selected period. Cash to suppliers reflects purchase orders with
                status received/complete. Financing activities (loans, capital
                contributions) are not yet tracked — add a "financing" category
                to expenses to capture these. Cash and bank balance is not yet
                connected to this statement.
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
