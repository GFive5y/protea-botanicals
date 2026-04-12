// StockReceiveModal.js — v2.0
// WP-STOCK-RECEIVE-S3 — Product World item picker
// Step 2 rebuilt: category sidebar + world-aware attributes + new product flow
// Writes: stock_receipts, stock_receipt_lines, stock_movements (purchase_in)
// Updates: inventory_items (qty, weighted_avg_cost, cost_price, batch, expiry)
// AVCO: ((Qold × Aold) + (Qin × Cin)) / (Qold + Qin)

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import {
  PRODUCT_WORLDS,
  itemMatchesWorld,
  defaultsForWorld,
} from "./ProductWorlds";
import { T } from "../../styles/tokens";
const MONO = "'DM Mono','Courier New',monospace";

// ─── AVCO helper ─────────────────────────────────────────────────────────────
function calcNewAvco(currentQty, currentAvco, incomingQty, incomingCost) {
  const cq = parseFloat(currentQty) || 0;
  const ca = parseFloat(currentAvco) || 0;
  const iq = parseFloat(incomingQty) || 0;
  const ic = parseFloat(incomingCost) || 0;
  if (iq <= 0) return ca;
  if (cq <= 0) return ic;
  return (cq * ca + iq * ic) / (cq + iq);
}

// ─── RCV reference generator ─────────────────────────────────────────────────
function genReference() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `RCV-${ymd}-${rnd}`;
}

// ─── Needs expiry? ────────────────────────────────────────────────────────────
function needsExpiry(item) {
  if (!item) return false;
  const cat = (item.category || "").toLowerCase();
  return cat === "edible" || cat === "finished_product" || cat === "food";
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepDots({ step }) {
  const steps = ["Delivery Info", "Add Items", "Review", "Complete"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 24,
      }}
    >
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        return (
          <React.Fragment key={idx}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: done
                    ? T.accentMid
                    : active
                      ? T.accentDark
                      : T.border,
                  color: done || active ? "#fff" : T.ink500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: T.font,
                  transition: "background .2s",
                }}
              >
                {done ? "✓" : idx}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: active ? T.accentDark : T.ink500,
                  fontFamily: T.font,
                  fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 4px",
                  marginBottom: 18,
                  background: done ? T.accentMid : T.border,
                  transition: "background .2s",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Delivery Info ───────────────────────────────────────────────────
function Step1({ data, onChange, onNext, vatRegistered, supplierVatRegistered, onSupplierVatChange }) {
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    supabase
      .from("suppliers")
      .select("id,name,currency,vat_registered")
      .order("name")
      .then(({ data: rows }) => setSuppliers(rows || []));
  }, []);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <h3
        style={{
          margin: "0 0 18px",
          fontSize: "16px",
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Delivery Information
      </h3>

      <label style={labelStyle}>Supplier</label>
      <select
        value={data.supplier_id}
        onChange={(e) => {
          onChange("supplier_id", e.target.value);
          const selected = suppliers.find((s) => s.id === e.target.value);
          if (selected) {
            onSupplierVatChange(selected.vat_registered ?? null);
            onChange("input_vat_amount", "");
          } else {
            onSupplierVatChange(null);
          }
        }}
        style={inputStyle}
      >
        <option value="">— Select supplier —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <label style={labelStyle}>
        Received Date <span style={{ color: T.danger }}>*</span>
      </label>
      <input
        type="date"
        value={data.received_at}
        max={today}
        onChange={(e) => onChange("received_at", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Invoice Number</label>
      <input
        type="text"
        placeholder="e.g. INV-2024-0042"
        value={data.invoice_number}
        onChange={(e) => onChange("invoice_number", e.target.value)}
        style={inputStyle}
      />

      {/* VAT input section — only for VAT-registered tenants */}
      {vatRegistered && (() => {
        const selectedSupplier = suppliers.find((s) => s.id === data.supplier_id);
        const isImport = selectedSupplier?.currency && selectedSupplier.currency !== "ZAR";
        const supplierNotVat = supplierVatRegistered === false;

        if (isImport) {
          return (
            <div style={{ padding: "10px 12px", background: T.warningLight, border: `1px solid ${T.warning}40`, borderRadius: 4, marginBottom: 14, fontSize: 11, color: T.warning, fontFamily: T.font, lineHeight: 1.5 }}>
              <strong>Import delivery</strong> — supplier VAT does not apply. Record customs clearance VAT (import VAT paid to SARS) via <strong>Expenses Manager</strong> using category <em>Tax</em>.
            </div>
          );
        }

        if (supplierNotVat) {
          return (
            <div style={{ padding: "10px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, marginBottom: 14, fontSize: 11, color: T.ink500, fontFamily: T.font }}>
              Supplier is not VAT-registered — no input VAT applicable.
            </div>
          );
        }

        return (
          <div>
            <label style={labelStyle}>Input VAT (R)</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14 }}>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={data.input_vat_amount} onChange={(e) => onChange("input_vat_amount", e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
              <button type="button" title="Enter VAT amount from supplier invoice" style={{ padding: "8px 10px", background: T.accentBg, border: `1px solid ${T.accentLight}40`, borderRadius: 4, cursor: "pointer", fontFamily: T.font, fontSize: 11, fontWeight: 600, color: T.accentDark, whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => {}}>Enter from invoice</button>
            </div>
            <div style={{ fontSize: 10, color: T.ink500, fontFamily: T.font, marginTop: -10, marginBottom: 14 }}>
              VAT amount from supplier's tax invoice. Leave 0 if not applicable. Auto-filled by Smart Capture when processing invoices.
            </div>
          </div>
        );
      })()}

      <label style={labelStyle}>Reference</label>
      <input
        type="text"
        placeholder="Internal reference (optional)"
        value={data.reference}
        onChange={(e) => onChange("reference", e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Notes</label>
      <textarea
        rows={3}
        placeholder="Delivery condition, driver, temperature, etc."
        value={data.notes}
        onChange={(e) => onChange("notes", e.target.value)}
        style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
      />

      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}
      >
        <button
          onClick={onNext}
          disabled={!data.received_at}
          style={primaryBtn(!!data.received_at)}
        >
          Next: Add Items →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Add Items ───────────────────────────────────────────────────────
// ─── Step 2 — Add Items (WP-STOCK-RECEIVE-S3: product world picker) ──────────
function Step2({
  lines,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onNext,
  onBack,
  tenantId,
}) {
  // World sidebar selection — excludes "all" (not useful in receive context)
  const WORLDS = useMemo(
    () => PRODUCT_WORLDS.filter((w) => w.id !== "all"),
    [],
  );
  const [activeWorld, setActiveWorld] = useState(WORLDS[0]);
  const [query, setQuery] = useState("");
  const [worldItems, setWorldItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // New product inline form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    cost_per_unit: "",
  });
  const [savingNew, setSavingNew] = useState(false);
  const [newProductError, setNewProductError] = useState("");

  // Load items for the selected world
  const loadWorldItems = useCallback(
    async (world) => {
      if (!tenantId) return;
      setLoading(true);
      setQuery("");
      try {
        let qb = supabase
          .from("inventory_items")
          .select(
            "id,name,sku,brand,category,subcategory,variant_value,strain_type,weight_grams,tags,quantity_on_hand,weighted_avg_cost,cost_price,sell_price,expiry_date,batch_lot_number,unit",
          )
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name");
        if (world.enums && world.enums.length > 0) {
          qb = qb.in("category", world.enums);
        }
        const { data } = await qb.limit(200);
        let items = data || [];
        // Further filter by subs if world has them
        if (world.subs && world.subs.length > 0) {
          items = items.filter((i) => world.subs.includes(i.subcategory));
        }
        setWorldItems(items);
      } finally {
        setLoading(false);
      }
    },
    [tenantId],
  );

  useEffect(() => {
    loadWorldItems(activeWorld);
  }, [activeWorld, loadWorldItems]);

  const filteredItems = useMemo(() => {
    if (!query) return worldItems;
    const q = query.toLowerCase();
    return worldItems.filter(
      (i) =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.sku || "").toLowerCase().includes(q) ||
        (i.brand || "").toLowerCase().includes(q) ||
        (i.variant_value || "").toLowerCase().includes(q),
    );
  }, [worldItems, query]);

  function addItem(item) {
    if (lines.find((l) => l.item_id === item.id)) return;
    const avco = calcNewAvco(
      item.quantity_on_hand,
      item.weighted_avg_cost,
      1,
      item.cost_price || 0,
    );
    onAddLine({
      item_id: item.id,
      item,
      qty_received: "",
      cost_per_unit: item.cost_price ? String(item.cost_price) : "",
      batch_lot: item.batch_lot_number || "",
      expiry_date: item.expiry_date || "",
      preview_avco: avco,
      is_new: false,
    });
  }

  function updateLineField(idx, field, value) {
    const line = lines[idx];
    let preview_avco = line.preview_avco || 0;
    if (field === "qty_received" || field === "cost_per_unit") {
      const qty =
        field === "qty_received"
          ? parseFloat(value)
          : parseFloat(line.qty_received);
      const cost =
        field === "cost_per_unit"
          ? parseFloat(value)
          : parseFloat(line.cost_per_unit);
      preview_avco = calcNewAvco(
        line.item.quantity_on_hand,
        line.item.weighted_avg_cost,
        qty,
        cost,
      );
    }
    onUpdateLine(idx, { ...line, [field]: value, preview_avco });
  }

  async function createAndAddNewProduct() {
    if (!newProduct.name.trim()) {
      setNewProductError("Product name is required.");
      return;
    }
    if (
      !newProduct.cost_per_unit ||
      parseFloat(newProduct.cost_per_unit) <= 0
    ) {
      setNewProductError("Cost per unit is required to set AVCO correctly.");
      return;
    }
    setSavingNew(true);
    setNewProductError("");
    try {
      const defaults = defaultsForWorld(activeWorld);
      const sku =
        newProduct.sku.trim() ||
        `${defaults.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          tenant_id: tenantId,
          name: newProduct.name.trim(),
          sku,
          category: defaults.category,
          subcategory: defaults.subcategory || null,
          quantity_on_hand: 0,
          is_active: true,
          cost_price: parseFloat(newProduct.cost_per_unit),
        })
        .select(
          "id,name,sku,brand,category,subcategory,variant_value,strain_type,weight_grams,tags,quantity_on_hand,weighted_avg_cost,cost_price,sell_price,expiry_date,batch_lot_number,unit",
        )
        .single();
      if (error) throw error;
      // Add to world items list + add as delivery line
      setWorldItems((prev) => [data, ...prev]);
      onAddLine({
        item_id: data.id,
        item: data,
        qty_received: "",
        cost_per_unit: newProduct.cost_per_unit,
        batch_lot: "",
        expiry_date: "",
        preview_avco: parseFloat(newProduct.cost_per_unit),
        is_new: true,
      });
      setNewProduct({ name: "", sku: "", cost_per_unit: "" });
      setShowNewProduct(false);
    } catch (err) {
      setNewProductError(err.message);
    } finally {
      setSavingNew(false);
    }
  }

  const canProceed =
    lines.length > 0 &&
    lines.every((l) => l.qty_received && parseFloat(l.qty_received) > 0);

  return (
    <div>
      <h3
        style={{
          margin: "0 0 4px",
          fontSize: 16,
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Add Items
      </h3>
      <p
        style={{
          margin: "0 0 14px",
          fontSize: 12,
          color: T.ink500,
          fontFamily: T.font,
        }}
      >
        Browse by product category, then select items to add to this delivery.
      </p>

      {/* ── Two-column layout: world sidebar + item list ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* World sidebar */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            overflow: "hidden",
            height: "fit-content",
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {WORLDS.map((world) => {
            const active = activeWorld.id === world.id;
            const count = worldItems.length; // only meaningful for active world
            return (
              <button
                key={world.id}
                onClick={() => {
                  setActiveWorld(world);
                  setShowNewProduct(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  background: active ? T.accentBg : "transparent",
                  borderLeft: active
                    ? `3px solid ${T.accentMid}`
                    : "3px solid transparent",
                  fontFamily: T.font,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{world.icon}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      color: active ? T.accentDark : T.ink600,
                    }}
                  >
                    {world.label}
                  </span>
                </span>
                {active && count > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: T.accentMid,
                      color: "#fff",
                      padding: "1px 5px",
                      borderRadius: 8,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Item list */}
        <div>
          {/* Search within world */}
          <input
            type="text"
            placeholder={`Search ${activeWorld.label}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />

          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              maxHeight: 250,
              overflowY: "auto",
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: 16,
                  fontSize: 12,
                  color: T.ink500,
                  fontFamily: T.font,
                  textAlign: "center",
                }}
              >
                Loading {activeWorld.label}…
              </div>
            ) : filteredItems.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  fontSize: 12,
                  color: T.ink500,
                  fontFamily: T.font,
                  textAlign: "center",
                }}
              >
                No {activeWorld.label} items found.
                <br />
                <span
                  onClick={() => setShowNewProduct(true)}
                  style={{
                    color: T.accentMid,
                    cursor: "pointer",
                    fontWeight: 600,
                    marginTop: 4,
                    display: "inline-block",
                  }}
                >
                  + Add as new product →
                </span>
              </div>
            ) : (
              filteredItems.map((item) => {
                const alreadyAdded = !!lines.find((l) => l.item_id === item.id);
                const noPrice = !(item.sell_price > 0);
                return (
                  <div
                    key={item.id}
                    onClick={() => !alreadyAdded && addItem(item)}
                    style={{
                      padding: "9px 12px",
                      borderBottom: `1px solid ${T.bg}`,
                      cursor: alreadyAdded ? "default" : "pointer",
                      background: alreadyAdded ? T.accentBg : "transparent",
                      fontFamily: T.font,
                      opacity: alreadyAdded ? 0.7 : 1,
                      transition: "background .1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!alreadyAdded)
                        e.currentTarget.style.background = T.accentBg;
                    }}
                    onMouseLeave={(e) => {
                      if (!alreadyAdded)
                        e.currentTarget.style.background = "transparent";
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
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: T.ink900,
                          }}
                        >
                          {item.name}
                        </span>
                        {alreadyAdded && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              fontWeight: 700,
                              background: T.accentMid,
                              color: "#fff",
                              padding: "1px 5px",
                              borderRadius: 3,
                            }}
                          >
                            ADDED
                          </span>
                        )}
                        {item.is_new && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              fontWeight: 700,
                              background: T.warning,
                              color: "#fff",
                              padding: "1px 5px",
                              borderRadius: 3,
                            }}
                          >
                            NEW
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {noPrice && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: T.warningLight,
                              color: T.warning,
                              border: `1px solid ${T.warning}40`,
                            }}
                          >
                            NO PRICE
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: T.ink500 }}>
                          {item.quantity_on_hand ?? 0} on hand
                        </span>
                      </div>
                    </div>
                    <div
                      style={{ fontSize: 10, color: T.ink500, marginTop: 2 }}
                    >
                      {item.sku}
                      {item.brand ? ` · ${item.brand}` : ""}
                      {item.variant_value ? ` · ${item.variant_value}` : ""}
                      {item.weighted_avg_cost > 0
                        ? ` · AVCO R${Number(item.weighted_avg_cost).toFixed(2)}`
                        : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New product trigger */}
          {!showNewProduct ? (
            <button
              onClick={() => setShowNewProduct(true)}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "7px 0",
                border: `1px dashed ${T.border}`,
                borderRadius: 4,
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                color: T.ink500,
                fontFamily: T.font,
                letterSpacing: "0.04em",
              }}
            >
              + New product from supplier — not in system yet
            </button>
          ) : (
            <div
              style={{
                marginTop: 8,
                padding: "12px 14px",
                background: T.warningLight,
                border: `1px solid ${T.warning}40`,
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.warning,
                  marginBottom: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                New {activeWorld.label} product
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 120px auto",
                  gap: 8,
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>
                    Name <span style={{ color: T.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Premium Bubble Hash 5g"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, name: e.target.value }))
                    }
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>
                    SKU (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generate if empty"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct((p) => ({ ...p, sku: e.target.value }))
                    }
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>
                    Cost/unit (R) <span style={{ color: T.danger }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={newProduct.cost_per_unit}
                    onChange={(e) =>
                      setNewProduct((p) => ({
                        ...p,
                        cost_per_unit: e.target.value,
                      }))
                    }
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={createAndAddNewProduct}
                    disabled={savingNew}
                    style={{
                      ...primaryBtn(true),
                      padding: "7px 12px",
                      fontSize: 11,
                      opacity: savingNew ? 0.6 : 1,
                    }}
                  >
                    {savingNew ? "…" : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewProduct(false);
                      setNewProductError("");
                    }}
                    style={{ ...ghostBtn, padding: "7px 10px", fontSize: 11 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {newProductError && (
                <p
                  style={{
                    fontSize: 11,
                    color: T.danger,
                    margin: "6px 0 0",
                    fontFamily: T.font,
                  }}
                >
                  {newProductError}
                </p>
              )}
              <p
                style={{
                  fontSize: 10,
                  color: T.warning,
                  margin: "6px 0 0",
                  fontFamily: T.font,
                }}
              >
                Product will be created in <strong>{activeWorld.label}</strong>{" "}
                category. Complete the full profile (attributes, sell price)
                from the Items tab after receiving.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Added delivery lines ── */}
      {lines.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.ink500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
              fontFamily: T.font,
            }}
          >
            Delivery Lines — {lines.length} item{lines.length !== 1 ? "s" : ""}
          </div>
          {lines.map((line, idx) => {
            // Get world-specific attributes for this item
            const itemWorld =
              PRODUCT_WORLDS.find(
                (w) => w.id !== "all" && itemMatchesWorld(line.item, w),
              ) || PRODUCT_WORLDS[1];

            return (
              <div
                key={line.item_id}
                style={{
                  background: line.is_new ? T.warningLight : T.bg,
                  border: `1px solid ${line.is_new ? T.warning + "40" : T.border}`,
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: 8,
                }}
              >
                {/* Line header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.ink900,
                        fontFamily: T.font,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {line.item.name}
                      {line.is_new && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            background: T.warning,
                            color: "#fff",
                            padding: "1px 5px",
                            borderRadius: 3,
                          }}
                        >
                          NEW PRODUCT
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.ink500,
                        fontFamily: T.font,
                        marginTop: 2,
                      }}
                    >
                      {line.item.sku}
                      {line.item.category ? ` · ${line.item.category}` : ""}
                      {line.item.subcategory
                        ? ` / ${line.item.subcategory}`
                        : ""}
                      {" · "}
                      {line.item.quantity_on_hand ?? 0} on hand
                    </div>
                    {/* No sell price warning */}
                    {!(line.item.sell_price > 0) && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          color: T.warning,
                          fontFamily: T.font,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        ⚠ No sell price set — margin will show as 100% until
                        priced in the Pricing tab
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveLine(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: T.danger,
                      fontSize: 16,
                      padding: 4,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Core fields: qty + cost always first */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>
                      Qty Received <span style={{ color: T.danger }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      placeholder="0"
                      value={line.qty_received}
                      onChange={(e) =>
                        updateLineField(idx, "qty_received", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>
                      Cost Per Unit (R)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.cost_per_unit}
                      onChange={(e) =>
                        updateLineField(idx, "cost_per_unit", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>
                      Batch / Lot
                    </label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={line.batch_lot}
                      onChange={(e) =>
                        updateLineField(idx, "batch_lot", e.target.value)
                      }
                      style={{ ...inputStyle, marginBottom: 0 }}
                    />
                  </div>
                  {needsExpiry(line.item) && (
                    <div>
                      <label style={{ ...labelStyle, marginBottom: 4 }}>
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={line.expiry_date}
                        onChange={(e) =>
                          updateLineField(idx, "expiry_date", e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: 0 }}
                      />
                    </div>
                  )}
                </div>

                {/* World-specific attribute fields */}
                {itemWorld.receiveAttrs.length > 0 && (
                  <div
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: 4,
                      padding: "8px 10px",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: T.ink500,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                        fontFamily: T.font,
                      }}
                    >
                      {itemWorld.icon} {itemWorld.label} details
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {itemWorld.receiveAttrs.map((attr) => (
                        <div key={attr.key}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>
                            {attr.label}
                          </label>
                          {attr.type === "select" ? (
                            <select
                              value={line[attr.key] || ""}
                              onChange={(e) =>
                                updateLineField(idx, attr.key, e.target.value)
                              }
                              style={{ ...inputStyle, marginBottom: 0 }}
                            >
                              <option value="">— select —</option>
                              {attr.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt || "—"}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder={attr.placeholder || ""}
                              value={line[attr.key] || ""}
                              onChange={(e) =>
                                updateLineField(idx, attr.key, e.target.value)
                              }
                              style={{ ...inputStyle, marginBottom: 0 }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AVCO preview */}
                {line.qty_received && line.cost_per_unit && (
                  <div
                    style={{
                      background: T.accentBg,
                      border: `1px solid ${T.accentLight}40`,
                      borderRadius: 4,
                      padding: "6px 10px",
                      fontSize: 11,
                      color: T.accentDark,
                      fontFamily: T.font,
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      New AVCO:{" "}
                      <strong>R{(line.preview_avco || 0).toFixed(2)}</strong>
                    </span>
                    <span>
                      Line total:{" "}
                      <strong>
                        R
                        {(
                          parseFloat(line.qty_received || 0) *
                          parseFloat(line.cost_per_unit || 0)
                        ).toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      New on-hand:{" "}
                      <strong>
                        {(
                          parseFloat(line.item.quantity_on_hand || 0) +
                          parseFloat(line.qty_received || 0)
                        ).toFixed(3)}
                      </strong>
                    </span>
                    {line.item.sell_price > 0 && line.cost_per_unit > 0 && (
                      <span style={{ color: T.accentMid }}>
                        Margin:{" "}
                        <strong>
                          {Math.round(
                            ((line.item.sell_price -
                              parseFloat(line.cost_per_unit)) /
                              line.item.sell_price) *
                              100,
                          )}
                          %
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 20,
        }}
      >
        <button onClick={onBack} style={ghostBtn}>
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          style={primaryBtn(canProceed)}
        >
          Next: Review →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 — Review & Confirm ────────────────────────────────────────────────
function Step3({ deliveryInfo, lines, onConfirm, onBack, saving }) {
  const totalValue = lines.reduce((sum, l) => {
    return (
      sum + parseFloat(l.qty_received || 0) * parseFloat(l.cost_per_unit || 0)
    );
  }, 0);

  return (
    <div>
      <h3
        style={{
          margin: "0 0 4px",
          fontSize: "16px",
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Review Delivery
      </h3>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: "12px",
          color: T.ink500,
          fontFamily: T.font,
        }}
      >
        Confirm all quantities and costs are correct before posting.
      </p>

      {/* Delivery meta */}
      <div
        style={{
          background: T.bg,
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: "12px",
          fontFamily: T.font,
          color: T.ink600,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 16px",
        }}
      >
        <span>
          <strong>Date:</strong> {deliveryInfo.received_at}
        </span>
        {deliveryInfo.invoice_number && (
          <span>
            <strong>Invoice:</strong> {deliveryInfo.invoice_number}
          </span>
        )}
        {deliveryInfo.reference && (
          <span>
            <strong>Ref:</strong> {deliveryInfo.reference}
          </span>
        )}
        {deliveryInfo.notes && (
          <span style={{ gridColumn: "1/-1" }}>
            <strong>Notes:</strong> {deliveryInfo.notes}
          </span>
        )}
        {parseFloat(deliveryInfo.input_vat_amount) > 0 && (
          <span>
            <strong>Input VAT:</strong>{" "}
            R{parseFloat(deliveryInfo.input_vat_amount).toFixed(2)}
            <span style={{ fontSize: 10, color: T.ink500, marginLeft: 4 }}>
              (claimed — trigger auto-writes to VAT ledger)
            </span>
          </span>
        )}
      </div>

      {/* Lines table */}
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            fontFamily: T.font,
          }}
        >
          <thead>
            <tr style={{ background: T.bg }}>
              {[
                "Item",
                "Qty",
                "Cost/Unit",
                "New AVCO",
                "New On-Hand",
                "Line Total",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    color: T.ink500,
                    fontWeight: 600,
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => {
              const newAvco = calcNewAvco(
                line.item.quantity_on_hand,
                line.item.weighted_avg_cost,
                parseFloat(line.qty_received),
                parseFloat(line.cost_per_unit),
              );
              const lineTotal =
                parseFloat(line.qty_received || 0) *
                parseFloat(line.cost_per_unit || 0);
              const newOnHand =
                parseFloat(line.item.quantity_on_hand || 0) +
                parseFloat(line.qty_received || 0);
              return (
                <tr
                  key={line.item_id}
                  style={{
                    borderBottom: `1px solid ${T.bg}`,
                    background: i % 2 === 0 ? T.surface : T.bg + "60",
                  }}
                >
                  <td style={{ padding: "9px 10px" }}>
                    <div style={{ fontWeight: 600, color: T.ink900 }}>
                      {line.item.name}
                    </div>
                    <div style={{ fontSize: "10px", color: T.ink500 }}>
                      {line.item.sku}
                    </div>
                  </td>
                  <td style={{ padding: "9px 10px", color: T.ink900 }}>
                    {line.qty_received}
                  </td>
                  <td style={{ padding: "9px 10px", color: T.ink900 }}>
                    R{parseFloat(line.cost_per_unit || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <span style={{ color: T.accentDark, fontWeight: 600 }}>
                      R{newAvco.toFixed(2)}
                    </span>
                    <div style={{ fontSize: "10px", color: T.ink500 }}>
                      was R
                      {parseFloat(line.item.weighted_avg_cost || 0).toFixed(2)}
                    </div>
                  </td>
                  <td style={{ padding: "9px 10px", color: T.ink900 }}>
                    {newOnHand.toFixed(3)}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      fontWeight: 600,
                      color: T.ink900,
                    }}
                  >
                    R{lineTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${T.border}` }}>
              <td
                colSpan={5}
                style={{
                  padding: "10px 10px",
                  fontWeight: 700,
                  textAlign: "right",
                  color: T.ink600,
                  fontSize: "13px",
                  fontFamily: T.font,
                }}
              >
                Total Delivery Value:
              </td>
              <td
                style={{
                  padding: "10px 10px",
                  fontWeight: 700,
                  color: T.accentDark,
                  fontSize: "15px",
                }}
              >
                R{totalValue.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Warning */}
      <div
        style={{
          background: T.warningLight,
          border: `1px solid ${T.warning}40`,
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 20,
          fontSize: "12px",
          color: T.warning,
          fontFamily: T.font,
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "16px" }}>⚠️</span>
        <span>
          <strong>This action cannot be undone.</strong> Posting will update
          stock levels, recalculate AVCO, and write permanent stock movement
          records. Verify all quantities and costs before confirming.
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={onBack} style={ghostBtn} disabled={saving}>
          ← Back
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          style={primaryBtn(!saving)}
        >
          {saving ? "Posting…" : "✓ Confirm & Post Delivery"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4 — Complete ────────────────────────────────────────────────────────
function Step4({
  receiptRef,
  lines,
  totalValue,
  deliveryInfo,
  onClose,
  newProductCount,
}) {
  function handlePrint() {
    const w = window.open("", "_blank", "width=800,height=600");
    w.document.write(`
      <html><head><title>Receipt ${receiptRef}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; font-size: 12px; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .total { font-weight: bold; font-size: 14px; text-align: right; padding: 12px 8px 0; }
      </style></head><body>
      <h2>Stock Receipt</h2>
      <div class="meta">
        <strong>${receiptRef}</strong><br/>
        Date: ${deliveryInfo.received_at}
        ${deliveryInfo.invoice_number ? ` · Invoice: ${deliveryInfo.invoice_number}` : ""}
        ${deliveryInfo.reference ? ` · Ref: ${deliveryInfo.reference}` : ""}
      </div>
      <table>
        <thead><tr>
          <th>Item</th><th>SKU</th><th>Qty</th><th>Cost/Unit</th><th>Total</th>
        </tr></thead>
        <tbody>
          ${lines
            .map(
              (l) => `<tr>
            <td>${l.item.name}</td>
            <td>${l.item.sku}</td>
            <td>${l.qty_received}</td>
            <td>R${parseFloat(l.cost_per_unit || 0).toFixed(2)}</td>
            <td>R${(parseFloat(l.qty_received || 0) * parseFloat(l.cost_per_unit || 0)).toFixed(2)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      <div class="total">Total: R${totalValue.toFixed(2)}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: T.successLight,
          border: `2px solid ${T.success}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: "28px",
        }}
      >
        ✓
      </div>

      <h3
        style={{
          margin: "0 0 6px",
          fontSize: "18px",
          fontFamily: T.font,
          fontWeight: 700,
          color: T.ink900,
        }}
      >
        Delivery Posted
      </h3>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: "13px",
          color: T.ink500,
          fontFamily: T.font,
        }}
      >
        Stock levels, AVCO, and movement records have been updated.
      </p>

      <div
        style={{
          background: T.accentBg,
          border: `1px solid ${T.accentLight}40`,
          borderRadius: 8,
          padding: "16px 24px",
          display: "inline-block",
          marginBottom: 24,
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontFamily: T.font,
            color: T.ink500,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          Receipt Reference
        </div>
        <div
          style={{
            fontSize: "20px",
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            color: T.accentDark,
            letterSpacing: "0.05em",
          }}
        >
          {receiptRef}
        </div>
        <div
          style={{
            fontSize: "11px",
            fontFamily: T.font,
            color: T.ink500,
            marginTop: 6,
          }}
        >
          {lines.length} item{lines.length !== 1 ? "s" : ""} ·{" "}
          <strong>R{totalValue.toFixed(2)}</strong> total ·{" "}
          {deliveryInfo.received_at}
        </div>
      </div>

      {/* Summary lines with margin preview */}
      <div style={{ marginBottom: 24 }}>
        {lines.map((l) => {
          const cost = parseFloat(l.cost_per_unit || 0);
          const qty = parseFloat(l.qty_received || 0);
          const lineTotal = qty * cost;
          const newAvco = calcNewAvco(
            l.item.quantity_on_hand,
            l.item.weighted_avg_cost,
            qty,
            cost,
          );
          const sell = parseFloat(l.item.sell_price || 0);
          const margin =
            sell > 0 && newAvco > 0 ? ((sell - newAvco) / sell) * 100 : null;
          const marginColor =
            margin === null
              ? T.ink300
              : margin >= 50
                ? T.success
                : margin >= 30
                  ? T.warning
                  : T.danger;

          return (
            <div
              key={l.item_id}
              style={{
                padding: "8px 0",
                borderBottom: `1px solid ${T.bg}`,
                fontFamily: T.font,
              }}
            >
              {/* Row 1: item name + line cost */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                }}
              >
                <span style={{ color: T.ink900, fontWeight: 500 }}>
                  {l.item.name}
                </span>
                <span style={{ color: T.ink600 }}>
                  {qty} × R{cost.toFixed(2)} = R{lineTotal.toFixed(2)}
                </span>
              </div>
              {/* Row 2: AVCO → Sell → Margin (only if sell price set) */}
              {sell > 0 ? (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 3,
                    fontSize: "11px",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: T.ink500 }}>
                    AVCO{" "}
                    <span
                      style={{
                        fontFamily: "'DM Mono','Courier New',monospace",
                        color: T.ink700,
                      }}
                    >
                      R{newAvco.toFixed(2)}
                    </span>
                  </span>
                  <span style={{ color: T.ink300 }}>→</span>
                  <span style={{ color: T.ink500 }}>
                    Sell{" "}
                    <span
                      style={{
                        fontFamily: "'DM Mono','Courier New',monospace",
                        color: T.ink700,
                      }}
                    >
                      R{sell.toFixed(2)}
                    </span>
                  </span>
                  <span style={{ color: T.ink300 }}>→</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: marginColor,
                      fontFamily: "'DM Mono','Courier New',monospace",
                    }}
                  >
                    {margin === null ? "—" : `${Math.round(margin)}%`}
                    {margin !== null && margin >= 40 && " ✓"}
                    {margin !== null && margin < 30 && " ⚠"}
                  </span>
                </div>
              ) : (
                <div
                  style={{ fontSize: "11px", color: T.ink300, marginTop: 3 }}
                >
                  No sell price — set via Pricing tab to see margin
                </div>
              )}
            </div>
          );
        })}

        {/* Aggregate strip */}
        {(() => {
          const priced = lines.filter(
            (l) => parseFloat(l.item.sell_price || 0) > 0,
          );
          if (priced.length === 0) return null;
          const margins = priced
            .map((l) => {
              const newAvco = calcNewAvco(
                l.item.quantity_on_hand,
                l.item.weighted_avg_cost,
                parseFloat(l.qty_received || 0),
                parseFloat(l.cost_per_unit || 0),
              );
              const sell = parseFloat(l.item.sell_price || 0);
              return sell > 0 && newAvco > 0
                ? ((sell - newAvco) / sell) * 100
                : null;
            })
            .filter((m) => m !== null);
          const avgMargin =
            margins.length > 0
              ? margins.reduce((s, m) => s + m, 0) / margins.length
              : null;
          const healthy = margins.filter((m) => m >= 40).length;
          const compressed = margins.filter((m) => m < 30).length;
          return (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 6,
                background: compressed > 0 ? T.warningLight : T.successLight,
                border: `1px solid ${compressed > 0 ? T.warningBd : T.successBd}`,
                display: "flex",
                gap: 20,
                fontSize: "12px",
                fontFamily: T.font,
              }}
            >
              {avgMargin !== null && (
                <span
                  style={{
                    color: compressed > 0 ? T.warning : T.success,
                    fontWeight: 700,
                  }}
                >
                  Avg margin {Math.round(avgMargin)}%
                </span>
              )}
              {healthy > 0 && (
                <span style={{ color: T.success }}>{healthy} healthy ✓</span>
              )}
              {compressed > 0 && (
                <span style={{ color: T.warning }}>
                  {compressed} compressed — review pricing
                </span>
              )}
              {lines.filter((l) => !(parseFloat(l.item.sell_price || 0) > 0))
                .length > 0 && (
                <span style={{ color: T.ink500 }}>
                  {
                    lines.filter(
                      (l) => !(parseFloat(l.item.sell_price || 0) > 0),
                    ).length
                  }{" "}
                  unpriced
                </span>
              )}
            </div>
          );
        })()}
      </div>

      {/* New products alert — LL-169: visible trigger, full dev later */}
      {newProductCount > 0 && (
        <div
          style={{
            background: T.warningLight,
            border: `1px solid ${T.warning}40`,
            borderRadius: 6,
            padding: "12px 16px",
            marginBottom: 16,
            fontFamily: T.font,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: T.warning,
                marginBottom: 2,
              }}
            >
              {newProductCount} new product{newProductCount !== 1 ? "s" : ""}{" "}
              added to your catalogue
            </div>
            <div style={{ fontSize: 11, color: T.warning, opacity: 0.85 }}>
              These items were created with basic details only. Complete their
              profiles in the Items tab — add sell price, variant, strain type,
              and other attributes so they appear correctly in your shop.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={handlePrint} style={{ ...ghostBtn, fontSize: "12px" }}>
          🖨 Print Receipt
        </button>
        <button onClick={onClose} style={primaryBtn(true)}>
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#4A4540",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
  fontFamily: "'Inter', sans-serif",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontSize: "13px",
  border: "1px solid #DDD9D3",
  borderRadius: 4,
  fontFamily: "'Inter', sans-serif",
  color: "#1C1A17",
  background: "#FFFFFF",
  marginBottom: 14,
  outline: "none",
  transition: "border-color .15s",
};

function primaryBtn(enabled) {
  return {
    padding: "8px 20px",
    background: enabled ? "#4A7C2F" : "#C8C3BC",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    fontFamily: "'Inter', sans-serif",
    transition: "background .15s",
  };
}

const ghostBtn = {
  padding: "8px 16px",
  background: "transparent",
  color: "#4A4540",
  border: "1px solid #DDD9D3",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function StockReceiveModal({
  onClose,
  onComplete,
  tenantId: tenantIdProp,
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [deliveryInfo, setDeliveryInfo] = useState({
    supplier_id: "",
    received_at: new Date().toISOString().split("T")[0],
    invoice_number: "",
    reference: "",
    notes: "",
    input_vat_amount: "",
  });

  const [lines, setLines] = useState([]);
  const [receiptRef, setReceiptRef] = useState("");
  const [totalValue, setTotalValue] = useState(0);
  const [vatRegistered, setVatRegistered] = useState(false);
  const [supplierVatRegistered, setSupplierVatRegistered] = useState(null);

  useEffect(() => {
    if (!tenantIdProp) return;
    supabase
      .from("tenant_config")
      .select("vat_registered")
      .eq("tenant_id", tenantIdProp)
      .maybeSingle()
      .then(({ data }) => setVatRegistered(!!data?.vat_registered));
  }, [tenantIdProp]);

  function updateDelivery(field, value) {
    setDeliveryInfo((prev) => ({ ...prev, [field]: value }));
  }

  function addLine(line) {
    setLines((prev) => [...prev, line]);
  }

  function updateLine(idx, line) {
    setLines((prev) => prev.map((l, i) => (i === idx ? line : l)));
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirm() {
    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const tenant_id = tenantIdProp;
      const ref = genReference();

      const tv = lines.reduce(
        (sum, l) =>
          sum +
          parseFloat(l.qty_received || 0) * parseFloat(l.cost_per_unit || 0),
        0,
      );

      // 1. Insert stock_receipt
      const { data: receipt, error: receiptErr } = await supabase
        .from("stock_receipts")
        .insert({
          tenant_id,
          supplier_id: deliveryInfo.supplier_id || null,
          reference: ref,
          invoice_number: deliveryInfo.invoice_number || null,
          received_at: new Date(deliveryInfo.received_at).toISOString(),
          received_by: user.id,
          notes: deliveryInfo.notes || null,
          total_value_zar: tv,
          input_vat_amount: deliveryInfo.input_vat_amount
            ? parseFloat(deliveryInfo.input_vat_amount)
            : 0,
          status: "confirmed",
        })
        .select("id")
        .single();

      if (receiptErr) throw receiptErr;

      // 2. For each line: write movement FIRST, then update inventory_items
      for (const line of lines) {
        const qty = parseFloat(line.qty_received);
        const cost = parseFloat(line.cost_per_unit || 0);
        const item = line.item;

        const newAvco = calcNewAvco(
          item.quantity_on_hand,
          item.weighted_avg_cost,
          qty,
          cost,
        );
        const newQty = parseFloat(item.quantity_on_hand || 0) + qty;

        // a) stock_movements (purchase_in)
        const { error: movErr } = await supabase
          .from("stock_movements")
          .insert({
            tenant_id,
            item_id: line.item_id,
            movement_type: "purchase_in",
            quantity: qty,
            unit_cost: cost,
            reference: ref,
            notes: `Receipt ${ref}${deliveryInfo.invoice_number ? " · " + deliveryInfo.invoice_number : ""}`,
          });
        if (movErr) throw movErr;

        // b) update inventory_items
        const updatePayload = {
          quantity_on_hand: newQty,
          weighted_avg_cost: newAvco,
          cost_price: cost > 0 ? cost : item.cost_price,
        };
        if (line.batch_lot) updatePayload.batch_lot_number = line.batch_lot;
        if (line.expiry_date) updatePayload.expiry_date = line.expiry_date;

        const { error: itemErr } = await supabase
          .from("inventory_items")
          .update(updatePayload)
          .eq("id", line.item_id);
        if (itemErr) throw itemErr;

        // c) stock_receipt_lines
        const { error: lineErr } = await supabase
          .from("stock_receipt_lines")
          .insert({
            receipt_id: receipt.id,
            item_id: line.item_id,
            qty_received: qty,
            cost_per_unit: cost,
            batch_lot: line.batch_lot || null,
            expiry_date: line.expiry_date || null,
            new_avco: newAvco,
          });
        if (lineErr) throw lineErr;
      }

      setReceiptRef(ref);
      setTotalValue(tv);
      setStep(4);
    } catch (err) {
      console.error("StockReceiveModal confirm error:", err);
      setError(err.message || "Failed to post delivery. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(28,26,23,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 4) onClose();
      }}
    >
      <div
        style={{
          background: T.surface,
          borderRadius: 10,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
          padding: "28px 28px 24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontFamily: T.font,
                color: T.ink500,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 2,
              }}
            >
              WP-STOCK-RECEIVE
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontFamily: T.font,
                fontWeight: 800,
                color: T.ink900,
              }}
            >
              📦 Receive Delivery
            </h2>
          </div>
          {step !== 4 && (
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
                color: T.ink500,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ×
            </button>
          )}
        </div>

        <StepDots step={step} />

        {error && (
          <div
            style={{
              background: T.dangerLight,
              border: `1px solid ${T.danger}40`,
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: "12px",
              color: T.danger,
              fontFamily: T.font,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {step === 1 && (
          <Step1
            data={deliveryInfo}
            onChange={updateDelivery}
            onNext={() => setStep(2)}
            vatRegistered={vatRegistered}
            supplierVatRegistered={supplierVatRegistered}
            onSupplierVatChange={setSupplierVatRegistered}
          />
        )}
        {step === 2 && (
          <Step2
            lines={lines}
            onAddLine={addLine}
            onUpdateLine={updateLine}
            onRemoveLine={removeLine}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            tenantId={tenantIdProp}
          />
        )}
        {step === 3 && (
          <Step3
            deliveryInfo={deliveryInfo}
            lines={lines}
            onConfirm={confirm}
            onBack={() => setStep(2)}
            saving={saving}
          />
        )}
        {step === 4 && (
          <Step4
            receiptRef={receiptRef}
            lines={lines}
            totalValue={totalValue}
            deliveryInfo={deliveryInfo}
            onClose={onComplete || onClose}
            newProductCount={lines.filter((l) => l.is_new).length}
          />
        )}
      </div>
    </div>
  );
}
