// src/components/hq/POSScreen.js — v1.0
// WP-POS: Simple POS till screen for cannabis retail budtenders
// Product grid → tap → qty → cart → Cash / Card / Online → INSERT order
//
// LL-131: tenantId passed as prop — never hardcoded
// LL-174: CATEGORY_LABELS, CATEGORY_ICONS imported from ProductWorlds.js — never local
// LL-177: Uses main supabase client (authenticated HQ user — not storefrontDb)
//         POS is a staff-facing tool, RLS applies to authenticated role
// Rule 0F: tenant_id on every INSERT (orders, order_items, stock_movements)
//
// Orders table columns confirmed from payfast-checkout edge fn (April 1, 2026):
//   id, user_id, tenant_id, order_ref, status, total, currency,
//   payment_method, items_count, notes, created_at, updated_at
// order_items: id, order_id, product_name, quantity, unit_price, line_total,
//              product_metadata, created_at
// stock_movements: item_id, tenant_id, movement_type, quantity, reference, notes, unit_cost

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import {
  CANNABIS_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from "./ProductWorlds";

// ── Design tokens (mirrors TenantPortal.js) ───────────────────────────────
const T = {
  bg: "#FAFAF9",
  border: "#ECEAE6",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  danger: "#DC2626",
  dangerLit: "#FEF2F2",
  amber: "#D97706",
  amberLit: "#FFFBEB",
  ink900: "#0D0D0D",
  ink500: "#474747",
  ink400: "#6B6B6B",
  ink300: "#999999",
  ink150: "#E2E2E2",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
};

// ── Payment method config ─────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", emoji: "💵", color: "#059669" },
  { id: "card", label: "Card", emoji: "💳", color: "#2563EB" },
  { id: "online", label: "Online", emoji: "📱", color: "#7C3AED" },
];

// ── Category filter pills (All + cannabis categories) ─────────────────────
const FILTER_CATS = [
  { id: "all", label: "All", icon: "🛒" },
  ...CANNABIS_CATEGORIES.map((c) => ({
    id: c,
    label: CATEGORY_LABELS[c] || c,
    icon: CATEGORY_ICONS[c] || "📦",
  })),
];

// ── Format ZAR ────────────────────────────────────────────────────────────
function zar(n) {
  return `R${(Number(n) || 0).toFixed(2)}`;
}

// ── Generate order ref ────────────────────────────────────────────────────
function genOrderRef() {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const seq =
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    String(d.getSeconds()).padStart(2, "0");
  return `POS-${ymd}-${seq}`;
}

// ── Main component ────────────────────────────────────────────────────────
export default function POSScreen({ tenantId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [cart, setCart] = useState([]); // [{ item, qty }]
  const [payMethod, setPayMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null); // { orderRef, total, payMethod, items }
  const [error, setError] = useState(null);
  const [qtyModal, setQtyModal] = useState(null); // item being qty-adjusted
  const [qtyInput, setQtyInput] = useState("1");
  const searchRef = useRef(null);

  // ── Customer lookup ───────────────────────────────────────────────────────
  const [customerPhone, setCustomerPhone] = useState("");
  const [customer, setCustomer] = useState(null); // user_profiles row
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // ── Cash tendered + change ────────────────────────────────────────────────
  const [tendered, setTendered] = useState("");

  // ── Session status (read-only — EODCashUp opens sessions) ────────────────
  const [activeSession, setActiveSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // ── Load products ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("inventory_items")
      .select(
        "id, name, category, sell_price, weighted_avg_cost, quantity_on_hand, image_url, is_active",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .gt("sell_price", 0)
      .order("category")
      .order("name");
    if (!err) setProducts(data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Check for open pos_session today ─────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    const checkSession = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("pos_sessions")
        .select("id, opening_float, session_date")
        .eq("tenant_id", tenantId)
        .eq("session_date", todayStr)
        .eq("status", "open")
        .maybeSingle();
      setActiveSession(data || null);
      setSessionChecked(true);
    };
    checkSession();
  }, [tenantId]);

  // ── Filter products ───────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchCat = catFilter === "all" || p.category === catFilter;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (CATEGORY_LABELS[p.category] || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const cartTotal = cart.reduce(
    (sum, { item, qty }) => sum + item.sell_price * qty,
    0,
  );
  const cartCount = cart.reduce((sum, { qty }) => sum + qty, 0);

  // eslint-disable-next-line no-unused-vars -- kept: direct-tap shortcut for future single-SKU mode
  function addToCart(item) {
    if ((item.quantity_on_hand || 0) <= 0) return; // sold out guard
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        const maxQty = item.quantity_on_hand || 99;
        updated[idx] = {
          ...updated[idx],
          qty: Math.min(updated[idx].qty + 1, maxQty),
        };
        return updated;
      }
      return [...prev, { item, qty: 1 }];
    });
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  }

  function updateQty(itemId, qty) {
    const parsed = parseInt(qty, 10);
    if (isNaN(parsed) || parsed <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.item.id === itemId
          ? { ...c, qty: Math.min(parsed, c.item.quantity_on_hand || 99) }
          : c,
      ),
    );
  }

  function clearCart() {
    setCart([]);
    setPayMethod("cash");
    setError(null);
    setTendered("");
  }

  // ── Customer lookup ───────────────────────────────────────────────────────
  async function lookupCustomer() {
    if (!customerPhone.trim()) return;
    setCustomerSearching(true);
    setCustomerNotFound(false);
    setCustomer(null);
    const phone = customerPhone.trim().replace(/\s+/g, "");
    const { data } = await supabase
      .from("user_profiles")
      .select("id, full_name, phone, loyalty_points, loyalty_tier")
      .eq("tenant_id", tenantId)
      .ilike("phone", `%${phone}%`)
      .limit(1)
      .maybeSingle();
    if (data) {
      setCustomer(data);
    } else {
      setCustomerNotFound(true);
    }
    setCustomerSearching(false);
  }

  function clearCustomer() {
    setCustomer(null);
    setCustomerPhone("");
    setCustomerNotFound(false);
  }

  // ── Points: 10pts per R1 spent — configurable from loyalty_config later ──
  function calcPoints(total) {
    return Math.floor(total * 10);
  }

  async function awardLoyaltyPoints(userId, orderRef, total) {
    const pts = calcPoints(total);
    if (pts <= 0) return 0;
    try {
      await supabase.from("loyalty_transactions").insert({
        user_id: userId,
        tenant_id: tenantId,
        points: pts,
        transaction_type: "earned",
        reference: orderRef,
        notes: `POS sale — ${payMethod}`,
        created_at: new Date().toISOString(),
      });
      await supabase
        .from("user_profiles")
        .update({ loyalty_points: (customer.loyalty_points || 0) + pts })
        .eq("id", userId);
      return pts;
    } catch (e) {
      console.warn("[POS] loyalty award failed:", e.message);
      return 0;
    }
  }

  // ── Complete sale ─────────────────────────────────────────────────────────
  async function completeSale() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const orderId = crypto.randomUUID();
      const orderRef = genOrderRef();
      const now = new Date().toISOString();
      const total = cartTotal.toFixed(2);

      // 1 — INSERT order (status = 'paid' immediately for POS cash/card sales)
      const { error: orderErr } = await supabase.from("orders").insert({
        id: orderId,
        user_id: customer?.id || null, // linked if found, null for walk-in
        tenant_id: tenantId, // LL-131, Rule 0F
        order_ref: orderRef,
        status: "paid",
        total,
        currency: "ZAR",
        payment_method: payMethod,
        items_count: cart.length,
        notes: "POS sale",
        created_at: now,
        updated_at: now,
      });
      if (orderErr) throw new Error("Order insert failed: " + orderErr.message);

      // 2 — INSERT order_items
      const orderItems = cart.map(({ item, qty }) => ({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_name: item.name,
        quantity: qty,
        unit_price: item.sell_price.toFixed(2),
        line_total: (item.sell_price * qty).toFixed(2),
        product_metadata: {
          item_id: item.id,
          category: item.category,
          weighted_avg_cost: item.weighted_avg_cost,
        },
        created_at: now,
      }));
      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsErr) {
        console.warn("[POS] order_items insert warning:", itemsErr.message);
        // Non-fatal — order is primary
      }

      // 3 — INSERT stock_movements + UPDATE quantity_on_hand for each line
      for (const { item, qty } of cart) {
        const newQty = Math.max(0, (item.quantity_on_hand || 0) - qty);
        // Stock movement (negative = outbound)
        await supabase.from("stock_movements").insert({
          item_id: item.id,
          tenant_id: tenantId,
          movement_type: "sale_pos",
          quantity: -qty,
          reference: orderRef,
          notes: `POS ${payMethod} sale`,
          unit_cost: item.weighted_avg_cost || null,
        });
        // Deduct stock
        await supabase
          .from("inventory_items")
          .update({ quantity_on_hand: newQty })
          .eq("id", item.id);
      }

      // 4 — Award loyalty points if customer linked
      let pointsEarned = 0;
      if (customer?.id) {
        pointsEarned = await awardLoyaltyPoints(customer.id, orderRef, cartTotal);
      }

      // 5 — Show receipt
      setReceipt({
        orderRef,
        total: cartTotal,
        payMethod,
        items: cart.map(({ item, qty }) => ({
          name: item.name,
          qty,
          price: item.sell_price,
        })),
        customer: customer
          ? {
              name: customer.full_name,
              pointsEarned,
              newBalance: (customer.loyalty_points || 0) + pointsEarned,
              tier: customer.loyalty_tier,
            }
          : null,
      });
      clearCart();
      clearCustomer();
      load(); // refresh stock levels
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Qty modal ─────────────────────────────────────────────────────────────
  function openQtyModal(item) {
    const existing = cart.find((c) => c.item.id === item.id);
    setQtyInput(String(existing?.qty ?? 1));
    setQtyModal(item);
  }

  function confirmQtyModal() {
    const qty = parseInt(qtyInput, 10);
    if (!qtyModal) return;
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(qtyModal.id);
    } else {
      setCart((prev) => {
        const idx = prev.findIndex((c) => c.item.id === qtyModal.id);
        const capped = Math.min(qty, qtyModal.quantity_on_hand || 99);
        if (idx >= 0) {
          const u = [...prev];
          u[idx] = { ...u[idx], qty: capped };
          return u;
        }
        return [...prev, { item: qtyModal, qty: capped }];
      });
    }
    setQtyModal(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 120px)",
        background: T.bg,
        fontFamily: T.font,
        overflow: "hidden",
        gap: 0,
      }}
    >
      {/* ═══════════════════════════════════════════════════
          LEFT — Product grid
      ════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRight: `1px solid ${T.border}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px 10px",
            borderBottom: `1px solid ${T.border}`,
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🛒</span>
            <span style={{ fontWeight: 700, fontSize: 17, color: T.ink900 }}>
              POS Till
            </span>
            {sessionChecked && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: activeSession ? T.accentLit : T.amberLit,
                  color: activeSession ? T.accentMid : T.amber,
                }}
              >
                {activeSession ? "● Session open" : "⚠ No session"}
              </span>
            )}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: T.ink400,
                background: T.accentLit,
                padding: "2px 8px",
                borderRadius: 99,
              }}
            >
              {products.length} products
            </span>
          </div>

          {/* Search */}
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: T.font,
              color: T.ink900,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Category filter pills */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 10,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            {FILTER_CATS.map((fc) => (
              <button
                key={fc.id}
                onClick={() => setCatFilter(fc.id)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 99,
                  border: `1.5px solid ${catFilter === fc.id ? T.accent : T.border}`,
                  background: catFilter === fc.id ? T.accent : "#fff",
                  color: catFilter === fc.id ? "#fff" : T.ink500,
                  fontSize: 12,
                  fontWeight: catFilter === fc.id ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: T.font,
                }}
              >
                {fc.icon} {fc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            alignContent: "start",
          }}
        >
          {loading ? (
            <div
              style={{
                gridColumn: "1/-1",
                textAlign: "center",
                padding: 48,
                color: T.ink400,
              }}
            >
              Loading products…
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                gridColumn: "1/-1",
                textAlign: "center",
                padding: 48,
                color: T.ink400,
                fontSize: 14,
              }}
            >
              No products match your filter.
            </div>
          ) : (
            filtered.map((item) => {
              const soldOut = (item.quantity_on_hand || 0) <= 0;
              const inCart = cart.find((c) => c.item.id === item.id);
              return (
                <ProductCard
                  key={item.id}
                  item={item}
                  soldOut={soldOut}
                  inCart={inCart}
                  onTap={() => (soldOut ? null : openQtyModal(item))}
                  T={T}
                />
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT — Cart + checkout
      ════════════════════════════════════════════════════ */}
      <div
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Cart header */}
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15, color: T.ink900 }}>
            🧾 Cart{cartCount > 0 && ` (${cartCount})`}
          </span>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              style={{
                background: "none",
                border: "none",
                color: T.danger,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {cart.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: T.ink300,
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
              Tap a product to add it
            </div>
          ) : (
            cart.map(({ item, qty }) => (
              <CartLine
                key={item.id}
                item={item}
                qty={qty}
                onQtyChange={(v) => updateQty(item.id, v)}
                onRemove={() => removeFromCart(item.id)}
                T={T}
              />
            ))
          )}
        </div>

        {/* Customer lookup */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 14px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.ink400,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Customer (optional)
          </div>
          {customer ? (
            <div
              style={{
                background: T.accentLit,
                border: `1px solid ${T.accentMid}30`,
                borderRadius: 8,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>
                  {customer.full_name || customer.phone}
                </div>
                <div style={{ fontSize: 11, color: T.accentMid }}>
                  {customer.loyalty_tier || "Bronze"} · {customer.loyalty_points || 0} pts
                  {cart.length > 0 && (
                    <span style={{ color: T.accent, fontWeight: 700 }}>
                      {" "}+{calcPoints(cartTotal)} this sale
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={clearCustomer}
                style={{
                  background: "none", border: "none",
                  color: T.ink300, cursor: "pointer", fontSize: 14, padding: "0 2px",
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                placeholder="Phone number…"
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  border: `1px solid ${customerNotFound ? "#FCA5A5" : T.border}`,
                  borderRadius: 7,
                  fontSize: 13,
                  fontFamily: T.font,
                  color: T.ink900,
                  outline: "none",
                }}
              />
              <button
                onClick={lookupCustomer}
                disabled={customerSearching || !customerPhone.trim()}
                style={{
                  padding: "7px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: T.font,
                  opacity: customerSearching ? 0.6 : 1,
                }}
              >
                {customerSearching ? "…" : "Find"}
              </button>
            </div>
          )}
          {customerNotFound && (
            <div style={{ fontSize: 11, color: T.amber, marginTop: 4 }}>
              Not found — proceeding as walk-in
            </div>
          )}
        </div>

        {/* Payment method selector */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            padding: "12px 14px 8px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.ink400,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Payment method
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setPayMethod(pm.id)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: 8,
                  border: `1.5px solid ${
                    payMethod === pm.id ? pm.color : T.border
                  }`,
                  background: payMethod === pm.id ? pm.color + "15" : "#fff",
                  color: payMethod === pm.id ? pm.color : T.ink500,
                  fontWeight: payMethod === pm.id ? 700 : 400,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: T.font,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 18 }}>{pm.emoji}</span>
                <span>{pm.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Total + complete sale */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: T.ink500 }}>
              Total
            </span>
            <span
              style={{
                fontWeight: 800,
                fontSize: 22,
                color: T.ink900,
                letterSpacing: "-0.03em",
              }}
            >
              {zar(cartTotal)}
            </span>
          </div>

          {/* Cash tendered + change */}
          {payMethod === "cash" && cart.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.ink400, fontWeight: 600, whiteSpace: "nowrap" }}>
                  Tendered R
                </span>
                <input
                  type="number"
                  min={cartTotal}
                  step="10"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder={cartTotal.toFixed(2)}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    border: `1px solid ${T.border}`,
                    borderRadius: 7,
                    fontSize: 14,
                    fontFamily: T.font,
                    fontWeight: 700,
                    color: T.ink900,
                    outline: "none",
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              </div>
              {parseFloat(tendered) >= cartTotal && (
                <div
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: 7,
                    padding: "6px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>Change</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#166534", letterSpacing: "-0.02em" }}>
                    R{(parseFloat(tendered) - cartTotal).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div
              style={{
                background: T.dangerLit,
                border: `1px solid #FCA5A5`,
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                color: T.danger,
                marginBottom: 8,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={completeSale}
            disabled={cart.length === 0 || submitting}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: 10,
              border: "none",
              background:
                cart.length === 0
                  ? T.ink150
                  : PAYMENT_METHODS.find((p) => p.id === payMethod)?.color ||
                    T.accent,
              color: cart.length === 0 ? T.ink400 : "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              fontFamily: T.font,
              letterSpacing: "0.01em",
              transition: "opacity 0.15s",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting
              ? "Processing…"
              : `Complete ${
                  PAYMENT_METHODS.find((p) => p.id === payMethod)?.label || ""
                } Sale`}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          QTY MODAL
      ════════════════════════════════════════════════════ */}
      {qtyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setQtyModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 28,
              width: 300,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              fontFamily: T.font,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 13,
                color: T.ink400,
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              {CATEGORY_ICONS[qtyModal.category] || "📦"}{" "}
              {CATEGORY_LABELS[qtyModal.category] || qtyModal.category}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 17,
                color: T.ink900,
                marginBottom: 6,
              }}
            >
              {qtyModal.name}
            </div>
            <div
              style={{
                fontSize: 15,
                color: T.accentMid,
                fontWeight: 700,
                marginBottom: 18,
              }}
            >
              {zar(qtyModal.sell_price)} each
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 12,
                  color: T.ink400,
                  fontWeight: 400,
                }}
              >
                {qtyModal.quantity_on_hand ?? "?"} in stock
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  color: T.ink400,
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Quantity
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() =>
                    setQtyInput((v) => String(Math.max(1, parseInt(v, 10) - 1)))
                  }
                  style={qtyBtnStyle(T)}
                >
                  −
                </button>
                <input
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  type="number"
                  min="1"
                  max={qtyModal.quantity_on_hand || 99}
                  style={{
                    width: 64,
                    textAlign: "center",
                    border: `1.5px solid ${T.border}`,
                    borderRadius: 8,
                    padding: "8px 0",
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: T.font,
                    color: T.ink900,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() =>
                    setQtyInput((v) =>
                      String(
                        Math.min(
                          parseInt(v, 10) + 1,
                          qtyModal.quantity_on_hand || 99,
                        ),
                      ),
                    )
                  }
                  style={qtyBtnStyle(T)}
                >
                  +
                </button>
              </div>
              {parseInt(qtyInput) > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: T.accentMid,
                    fontWeight: 600,
                  }}
                >
                  Subtotal:{" "}
                  {zar(qtyModal.sell_price * (parseInt(qtyInput, 10) || 0))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setQtyModal(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: "#fff",
                  color: T.ink500,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: T.font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmQtyModal}
                style={{
                  flex: 2,
                  padding: "10px",
                  borderRadius: 8,
                  border: "none",
                  background: T.accent,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: T.font,
                }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          RECEIPT MODAL — shown after successful sale
      ════════════════════════════════════════════════════ */}
      {receipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "28px 28px 22px",
              width: 320,
              boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
              fontFamily: T.font,
            }}
          >
            {/* Success header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>✅</div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: T.ink900,
                  marginBottom: 4,
                }}
              >
                Sale Complete
              </div>
              <div style={{ fontSize: 12, color: T.ink400 }}>
                {receipt.orderRef}
              </div>
            </div>

            {/* Line items */}
            <div
              style={{
                background: "#F9FAFB",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
              }}
            >
              {receipt.items.map((it, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "4px 0",
                    borderBottom:
                      i < receipt.items.length - 1
                        ? `1px solid ${T.border}`
                        : "none",
                  }}
                >
                  <span style={{ color: T.ink500 }}>
                    {it.qty}× {it.name}
                  </span>
                  <span style={{ color: T.ink900, fontWeight: 600 }}>
                    {zar(it.price * it.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 600, color: T.ink500, fontSize: 14 }}>
                Total
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 24,
                  color: T.ink900,
                  letterSpacing: "-0.03em",
                }}
              >
                {zar(receipt.total)}
              </span>
            </div>

            {/* Loyalty points earned */}
            {receipt.customer?.pointsEarned > 0 && (
              <div
                style={{
                  background: T.accentLit,
                  border: `1px solid ${T.accentMid}30`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.accent }}>
                    🌿 {receipt.customer.name || "Customer"} earned points
                  </div>
                  <div style={{ fontSize: 11, color: T.accentMid, marginTop: 1 }}>
                    New balance: {receipt.customer.newBalance} pts
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.accent }}>
                  +{receipt.customer.pointsEarned}
                </div>
              </div>
            )}

            {/* Payment method pill */}
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    PAYMENT_METHODS.find((p) => p.id === receipt.payMethod)
                      ?.color || T.accent,
                  background: "#F0FDF4",
                  padding: "2px 10px",
                  borderRadius: 99,
                }}
              >
                {PAYMENT_METHODS.find((p) => p.id === receipt.payMethod)
                  ?.emoji || ""}{" "}
                {PAYMENT_METHODS.find((p) => p.id === receipt.payMethod)
                  ?.label || receipt.payMethod}
              </span>
            </div>

            {!receipt.customer && (
              <div
                style={{
                  fontSize: 11,
                  color: T.ink400,
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Walk-in sale — no loyalty points awarded
              </div>
            )}
            <button
              onClick={() => setReceipt(null)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: T.accent,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              New Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product card sub-component ────────────────────────────────────────────
function ProductCard({ item, soldOut, inCart, onTap, T }) {
  const stockLow = !soldOut && (item.quantity_on_hand || 0) <= 3;
  return (
    <div
      onClick={onTap}
      style={{
        background: soldOut ? "#F9FAFB" : "#fff",
        border: `1.5px solid ${
          inCart ? T.accent : soldOut ? T.ink150 : T.border
        }`,
        borderRadius: 10,
        padding: "12px 10px 10px",
        cursor: soldOut ? "not-allowed" : "pointer",
        opacity: soldOut ? 0.55 : 1,
        position: "relative",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: inCart ? `0 0 0 2px ${T.accentLit}` : "none",
        userSelect: "none",
      }}
    >
      {/* Category icon */}
      <div style={{ fontSize: 22, marginBottom: 6, textAlign: "center" }}>
        {CATEGORY_ICONS[item.category] || "📦"}
      </div>

      {/* Name */}
      <div
        style={{
          fontWeight: 600,
          fontSize: 12,
          color: T.ink900,
          lineHeight: 1.3,
          marginBottom: 4,
          textAlign: "center",
          minHeight: 30,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item.name}
      </div>

      {/* Price */}
      <div
        style={{
          fontWeight: 800,
          fontSize: 14,
          color: T.accentMid,
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        {zar(item.sell_price)}
      </div>

      {/* Stock badge */}
      <div style={{ textAlign: "center" }}>
        {soldOut ? (
          <span
            style={{
              fontSize: 10,
              background: "#FEF2F2",
              color: T.danger,
              padding: "2px 7px",
              borderRadius: 99,
              fontWeight: 700,
            }}
          >
            Sold Out
          </span>
        ) : stockLow ? (
          <span
            style={{
              fontSize: 10,
              background: T.amberLit,
              color: T.amber,
              padding: "2px 7px",
              borderRadius: 99,
              fontWeight: 700,
            }}
          >
            Low: {item.quantity_on_hand}
          </span>
        ) : (
          <span
            style={{
              fontSize: 10,
              background: T.accentLit,
              color: T.accentMid,
              padding: "2px 7px",
              borderRadius: 99,
            }}
          >
            {item.quantity_on_hand} in stock
          </span>
        )}
      </div>

      {/* In-cart badge */}
      {inCart && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: T.accent,
            color: "#fff",
            borderRadius: 99,
            width: 18,
            height: 18,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {inCart.qty}
        </div>
      )}
    </div>
  );
}

// ── Cart line sub-component ───────────────────────────────────────────────
function CartLine({ item, qty, onQtyChange, onRemove, T }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "9px 14px",
        borderBottom: `1px solid ${T.border}`,
        gap: 8,
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 16, flexShrink: 0 }}>
        {CATEGORY_ICONS[item.category] || "📦"}
      </span>

      {/* Name + price */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.ink900,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        <div style={{ fontSize: 11, color: T.ink400 }}>
          {zar(item.sell_price)} ×{" "}
          <span style={{ fontWeight: 700, color: T.accentMid }}>
            {zar(item.sell_price * qty)}
          </span>
        </div>
      </div>

      {/* Qty stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => onQtyChange(qty - 1)} style={miniBtn(T)}>
          −
        </button>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            minWidth: 18,
            textAlign: "center",
            color: T.ink900,
          }}
        >
          {qty}
        </span>
        <button onClick={() => onQtyChange(qty + 1)} style={miniBtn(T)}>
          +
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: T.ink300,
          cursor: "pointer",
          fontSize: 14,
          padding: "0 2px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Micro-style helpers ───────────────────────────────────────────────────
function qtyBtnStyle(T) {
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: `1.5px solid ${T.border}`,
    background: "#fff",
    color: T.ink900,
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: T.font,
  };
}

function miniBtn(T) {
  return {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: `1px solid ${T.border}`,
    background: "#fff",
    color: T.ink900,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: T.font,
    padding: 0,
    lineHeight: 1,
  };
}
