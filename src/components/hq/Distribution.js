// src/components/hq/Distribution.js — Protea Botanicals v1.3 — WP-THEME-2: Inter font + WorkflowGuide
// v1.2: Import PO Cost Integration
// ─────────────────────────────────────────────────────────────────────────────
// DISTRIBUTION TAB — Phase 2D
//
// Features:
//   - View all shipments (filterable by status)
//   - Create shipment (select destination shop, add items)
//   - Status progression: preparing → shipped → in_transit → delivered → confirmed
//   - v1.1: Auto-transfer inventory on delivery (Task A-3)
//   - ★ v1.2: Import PO Cost Integration
//       - Fetches received import POs on load (po_status not in draft/cancelled)
//       - In create form: auto-populates unit_cost from landed_cost_per_unit_zar
//         of the most recent received PO for each inventory item selected
//       - In shipment card expanded view: shows cost analysis panel with
//         landed cost vs inferred sell price → implied margin per line item
//       - Summary bar shows total shipment value vs estimated landed cost
//
// Tables used:
//   - shipments, shipment_items, tenants, inventory_items, production_batches
//   - stock_movements (insert for audit trail)
//   - purchase_orders (read, for landed cost lookup — v1.2)
//   - purchase_order_items (read, for landed_cost_per_unit_zar — v1.2)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import { ChartCard, ChartTooltip } from "../viz";
import { T } from "../../styles/tokens";

// ── Design Tokens (migrated to shared tokens.js) ─────────────────────────
// Legacy C/F aliases — preserve all internal logic
const C = {
  bg: T.surface,
  warmBg: T.bg,
  primaryDark: T.accent,
  primaryMid: T.accentMid,
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: T.ink900,
  muted: T.ink500,
  border: T.border,
  white: "#fff",
  red: T.danger,
  blue: T.info,
  orange: T.warning,
};
const F = { heading: T.font, body: T.font };

const sLabel = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#374151",
  marginBottom: "4px",
  fontFamily: F.body,
};
const sCard = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)",
};
const sBtn = (variant = "primary") => ({
  padding: "8px 16px",
  background: variant === "primary" ? C.primaryDark : "transparent",
  color: variant === "primary" ? C.white : C.primaryMid,
  border: variant === "primary" ? "none" : `1px solid ${C.primaryMid}`,
  borderRadius: "2px",
  fontSize: "10px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: F.body,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontSize: "13px",
  fontFamily: F.body,
  background: C.white,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };

const STATUS_CONFIG = {
  preparing: { label: "Preparing", color: C.blue, bg: "rgba(44,74,110,0.1)" },
  shipped: { label: "Shipped", color: C.gold, bg: "rgba(181,147,90,0.1)" },
  in_transit: {
    label: "In Transit",
    color: C.gold,
    bg: "rgba(181,147,90,0.1)",
  },
  delivered: {
    label: "Delivered",
    color: C.accentGreen,
    bg: "rgba(82,183,136,0.1)",
  },
  confirmed: {
    label: "Confirmed",
    color: C.primaryDark,
    bg: "rgba(27,67,50,0.1)",
  },
  cancelled: { label: "Cancelled", color: C.red, bg: "rgba(192,57,43,0.1)" },
};
const NEXT_STATUSES = {
  preparing: ["shipped", "cancelled"],
  shipped: ["in_transit", "delivered", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["confirmed"],
  confirmed: [],
  cancelled: [],
};

const HQ_TENANT_ID = "43b34c33-6864-4f02-98dd-df1d340475c3";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Distribution() {
  const [shipments, setShipments] = useState([]);
  const [shops, setShops] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [productionBatches, setProductionBatches] = useState([]);
  const [importPOs, setImportPOs] = useState([]); // v1.2
  const [landedCostMap, setLandedCostMap] = useState({}); // v1.2: { inventoryItemId → landed_cost_per_unit_zar }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const ctx = usePageContext("hq-distribution", null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedShipment, setExpandedShipment] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shipmentsRes, shopsRes, itemsRes, batchesRes, posRes] =
        await Promise.all([
          supabase
            .from("shipments")
            .select("*, shipment_items(*)")
            .order("created_at", { ascending: false }),
          supabase
            .from("tenants")
            .select("id, name, slug, type, is_active")
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("inventory_items")
            .select(
              "id, name, sku, category, unit, quantity_on_hand, cost_price",
            )
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("production_batches")
            .select(
              "id, batch_code, strain_name, product_type, size_ml, status, actual_quantity",
            )
            .in("status", ["completed", "in_progress"])
            .order("created_at", { ascending: false }),
          // v1.2: Fetch received import POs with their items for landed cost lookup
          supabase
            .from("purchase_orders")
            .select(
              "id, po_number, po_status, landed_cost_zar, expected_arrival, actual_arrival, purchase_order_items(id, item_id, quantity_ordered, landed_cost_per_unit_zar, unit_price_usd)",
            )
            .not("po_status", "in", '("draft","cancelled")')
            .order("created_at", { ascending: false }),
        ]);

      if (shipmentsRes.error) throw shipmentsRes.error;
      if (shopsRes.error) throw shopsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (batchesRes.error) throw batchesRes.error;

      setShipments(shipmentsRes.data || []);
      setShops(shopsRes.data || []);
      setInventoryItems(itemsRes.data || []);
      setProductionBatches(batchesRes.data || []);

      // v1.2: Build landed cost map from most recent received PO per item
      const pos = posRes.data || [];
      setImportPOs(pos);

      const lcMap = {};
      // Process in reverse-chronological order so first assignment = most recent
      for (const po of pos) {
        for (const poi of po.purchase_order_items || []) {
          if (
            poi.item_id &&
            poi.landed_cost_per_unit_zar &&
            !lcMap[poi.item_id]
          ) {
            lcMap[poi.item_id] = {
              landedCost: poi.landed_cost_per_unit_zar,
              poNumber: po.po_number,
              poStatus: po.po_status,
            };
          }
        }
      }
      setLandedCostMap(lcMap);
    } catch (err) {
      console.error("[Distribution] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredShipments =
    statusFilter === "all"
      ? shipments
      : shipments.filter((s) => s.status === statusFilter);

  const preparing = shipments.filter((s) => s.status === "preparing").length;
  const inTransit = shipments.filter((s) =>
    ["shipped", "in_transit"].includes(s.status),
  ).length;
  const delivered = shipments.filter((s) =>
    ["delivered", "confirmed"].includes(s.status),
  ).length;
  const totalItems = shipments.reduce(
    (sum, s) =>
      sum +
      (s.shipment_items || []).reduce(
        (iSum, item) => iSum + (item.quantity || 0),
        0,
      ),
    0,
  );

  if (error) {
    return (
      <div style={{ ...sCard, margin: "20px 0" }}>
        <div style={sLabel}>Error Loading Distribution Data</div>
        <p style={{ fontSize: "13px", color: C.red, margin: "8px 0 0" }}>
          {error}
        </p>
        <button onClick={fetchData} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <WorkflowGuide
        context={ctx}
        tabId="hq-distribution"
        onAction={() => {}}
        defaultOpen={false}
      />
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontFamily: F.heading,
              fontSize: "22px",
              fontWeight: 600,
              color: C.primaryDark,
              margin: 0,
            }}
          >
            Distribution & Shipments
          </h2>
          <span
            style={{
              background: "rgba(82,183,136,0.15)",
              color: C.accentGreen,
              padding: "2px 8px",
              borderRadius: "2px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Phase 2D
          </span>
        </div>
        <p
          style={{
            color: C.muted,
            fontSize: "13px",
            fontWeight: 400,
            margin: 0,
          }}
        >
          Track outbound shipments to shops — items, quantities, courier,
          delivery status and landed costs.
        </p>
      </div>

      {/* Supply Chain Flow */}
      <div
        style={{
          background: C.warmBg,
          border: `1px solid ${C.border}`,
          borderRadius: "2px",
          padding: "12px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontSize: "11px",
          color: C.muted,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          flexWrap: "wrap",
        }}
      >
        <FlowStep label="Procure" done />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="Receive & Store" done />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="Produce" done />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="★ Distribute" active />
        <span style={{ color: C.border, fontSize: "16px" }}>→</span>
        <FlowStep label="Customer Scans" done />
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1px",
          background: T.border,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.border}`,
          boxShadow: T.shadow.sm,
          marginBottom: "24px",
        }}
      >
        <MiniStat label="Preparing" value={preparing} color={C.blue} />
        <MiniStat label="In Transit" value={inTransit} color={C.gold} />
        <MiniStat label="Delivered" value={delivered} color={C.accentGreen} />
        <MiniStat
          label="Total Items Shipped"
          value={totalItems.toLocaleString()}
          color={C.primaryDark}
        />
      </div>

      {/* ── CHARTS: Shipment pipeline + Items by destination ── */}
      {!loading &&
        shipments.length > 0 &&
        (() => {
          const statusOrder = [
            "preparing",
            "shipped",
            "in_transit",
            "delivered",
            "confirmed",
            "cancelled",
          ];
          const statusLabels = {
            preparing: "Preparing",
            shipped: "Shipped",
            in_transit: "In Transit",
            delivered: "Delivered",
            confirmed: "Confirmed",
            cancelled: "Cancelled",
          };
          const statusColors = {
            preparing: T.info,
            shipped: "#b5935a",
            in_transit: "#b5935a",
            delivered: "#52b788",
            confirmed: T.accent,
            cancelled: T.danger,
          };
          const pipelineData = statusOrder
            .map((s) => ({
              status: statusLabels[s],
              count: shipments.filter((sh) => sh.status === s).length,
              color: statusColors[s],
            }))
            .filter((d) => d.count > 0);

          const destMap = {};
          shipments.forEach((s) => {
            const dest = (s.destination_name || "Unknown")
              .split(" ")
              .slice(0, 2)
              .join(" ");
            destMap[dest] =
              (destMap[dest] || 0) +
              (s.shipment_items || []).reduce(
                (sum, i) => sum + (i.quantity || 0),
                0,
              );
          });
          const destData = Object.entries(destMap)
            .map(([name, items]) => ({ name, items }))
            .sort((a, b) => b.items - a.items)
            .slice(0, 6);

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <ChartCard title="Shipment Pipeline" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.border}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="status"
                      tick={{
                        fill: T.ink500,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink500,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={24}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v) =>
                            `${v} shipment${v !== 1 ? "s" : ""}`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      name="Shipments"
                      isAnimationActive={false}
                      maxBarSize={36}
                      radius={[3, 3, 0, 0]}
                    >
                      {pipelineData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Items Shipped by Destination" height={200}>
                {destData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={destData}
                      layout="vertical"
                      margin={{ top: 8, right: 32, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid
                        horizontal
                        vertical={false}
                        stroke={T.border}
                        strokeWidth={0.5}
                      />
                      <XAxis
                        type="number"
                        tick={{
                          fill: T.ink500,
                          fontSize: 10,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{
                          fill: T.ink500,
                          fontSize: 10,
                          fontFamily: T.font,
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        content={
                          <ChartTooltip formatter={(v) => `${v} units`} />
                        }
                      />
                      <Bar
                        dataKey="items"
                        name="Units"
                        fill={T.accentMid}
                        isAnimationActive={false}
                        maxBarSize={20}
                        radius={[0, 3, 3, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: T.ink500,
                      fontFamily: T.font,
                    }}
                  >
                    No destination data
                  </div>
                )}
              </ChartCard>
            </div>
          );
        })()}

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {[
            "all",
            "preparing",
            "shipped",
            "in_transit",
            "delivered",
            "confirmed",
            "cancelled",
          ].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                background: statusFilter === s ? C.primaryDark : C.white,
                color: statusFilter === s ? C.white : C.muted,
                border: `1px solid ${statusFilter === s ? C.primaryDark : C.border}`,
                borderRadius: "2px",
                fontSize: "10px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: F.body,
                fontWeight: statusFilter === s ? 600 : 400,
              }}
            >
              {s === "all"
                ? `All (${shipments.length})`
                : `${STATUS_CONFIG[s]?.label || s} (${shipments.filter((sh) => sh.status === s).length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={sBtn()}
        >
          {showCreateForm ? "Cancel" : "+ New Shipment"}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateShipmentForm
          shops={shops}
          inventoryItems={inventoryItems}
          productionBatches={productionBatches}
          importPOs={importPOs}
          landedCostMap={landedCostMap}
          existingCount={shipments.length}
          onCreated={() => {
            setShowCreateForm(false);
            fetchData();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Shipment List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>🚚</div>
          Loading distribution data...
        </div>
      ) : filteredShipments.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            color: C.muted,
            padding: "60px 40px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>
            🚚
          </div>
          <p style={{ fontSize: "13px", margin: 0 }}>
            {shipments.length === 0
              ? "No shipments yet. Create your first shipment to start tracking distribution."
              : "No shipments match the selected filter."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {filteredShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              landedCostMap={landedCostMap}
              expanded={expandedShipment === shipment.id}
              onToggle={() =>
                setExpandedShipment(
                  expandedShipment === shipment.id ? null : shipment.id,
                )
              }
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE SHIPMENT FORM — v1.2: auto-populates landed cost from import POs
// ═══════════════════════════════════════════════════════════════════════════
function CreateShipmentForm({
  shops,
  inventoryItems,
  productionBatches,
  importPOs,
  landedCostMap,
  existingCount,
  onCreated,
  onCancel,
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    destination_tenant_id: "",
    destination_name: "",
    courier: "",
    tracking_number: "",
    estimated_arrival: "",
    notes: "",
  });
  const [items, setItems] = useState([
    {
      inventory_item_id: "",
      production_batch_id: "",
      item_name: "",
      sku: "",
      quantity: "",
      unit: "pcs",
      unit_cost: "",
      landedCostRef: null,
    },
  ]);

  const shopTenants = shops.filter((s) => s.type === "shop");

  const set = (key, val) => {
    setForm((p) => {
      const updated = { ...p, [key]: val };
      if (key === "destination_tenant_id" && val) {
        const shop = shops.find((s) => s.id === val);
        if (shop) updated.destination_name = shop.name;
      }
      return updated;
    });
  };

  const setItem = (idx, key, val) => {
    setItems((prev) => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };

      if (key === "inventory_item_id" && val) {
        const item = inventoryItems.find((i) => i.id === val);
        if (item) {
          arr[idx].item_name = item.name;
          arr[idx].sku = item.sku;
          arr[idx].unit = item.unit || "pcs";

          // v1.2: Auto-populate from landed cost map (most recent PO)
          const lc = landedCostMap[val];
          if (lc && lc.landedCost) {
            arr[idx].unit_cost = lc.landedCost.toFixed(2);
            arr[idx].landedCostRef = lc;
          } else {
            arr[idx].unit_cost = item.cost_price || "";
            arr[idx].landedCostRef = null;
          }
        }
      }
      if (key === "production_batch_id" && val) {
        const batch = productionBatches.find((b) => b.id === val);
        if (batch) {
          arr[idx].item_name =
            `${batch.strain_name} ${batch.size_ml}ml ${batch.product_type}`;
          arr[idx].sku = batch.batch_code;
          arr[idx].unit = "pcs";
        }
      }
      return arr;
    });
  };

  const addItem = () =>
    setItems((p) => [
      ...p,
      {
        inventory_item_id: "",
        production_batch_id: "",
        item_name: "",
        sku: "",
        quantity: "",
        unit: "pcs",
        unit_cost: "",
        landedCostRef: null,
      },
    ]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));

  const generateShipmentNumber = () => {
    const d = new Date();
    return `SH-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(existingCount + 1).padStart(3, "0")}`;
  };

  const handleCreate = async () => {
    if (!form.destination_name.trim()) {
      alert("Destination is required. Select a shop or enter a name.");
      return;
    }
    const validItems = items.filter((i) => i.item_name.trim() && i.quantity);
    if (validItems.length === 0) {
      alert("Add at least one item to the shipment.");
      return;
    }

    setSaving(true);
    try {
      const shipmentId = crypto.randomUUID();
      const shipmentNumber = generateShipmentNumber();

      let userId = null;
      try {
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id || null;
      } catch (e) {}

      const { error: shipErr } = await supabase.from("shipments").insert({
        id: shipmentId,
        tenant_id: HQ_TENANT_ID,
        shipment_number: shipmentNumber,
        destination_tenant_id: form.destination_tenant_id || null,
        destination_name: form.destination_name.trim(),
        status: "preparing",
        courier: form.courier.trim() || null,
        tracking_number: form.tracking_number.trim() || null,
        estimated_arrival: form.estimated_arrival || null,
        notes: form.notes.trim() || null,
        created_by: userId,
      });
      if (shipErr) throw shipErr;

      const itemRows = validItems.map((i) => ({
        shipment_id: shipmentId,
        inventory_item_id: i.inventory_item_id || null,
        production_batch_id: i.production_batch_id || null,
        item_name: i.item_name.trim(),
        sku: i.sku || null,
        quantity: parseInt(i.quantity),
        unit: i.unit,
        unit_cost: i.unit_cost ? parseFloat(i.unit_cost) : null,
        total_cost:
          i.unit_cost && i.quantity
            ? parseFloat(i.unit_cost) * parseInt(i.quantity)
            : null,
      }));
      const { error: itemErr } = await supabase
        .from("shipment_items")
        .insert(itemRows);
      if (itemErr) throw itemErr;

      onCreated();
    } catch (err) {
      alert("Error creating shipment: " + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const totalCost = items.reduce(
    (sum, i) =>
      sum + (parseInt(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0),
    0,
  );
  const landedItemsCount = items.filter((i) => i.landedCostRef).length;

  return (
    <div
      style={{
        ...sCard,
        marginBottom: "20px",
        borderLeft: `3px solid ${C.accentGreen}`,
      }}
    >
      <div style={{ ...sLabel, marginBottom: "16px" }}>New Shipment</div>

      {/* Destination */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Destination Shop
          </label>
          {shopTenants.length > 0 ? (
            <select
              style={sSelect}
              value={form.destination_tenant_id}
              onChange={(e) => set("destination_tenant_id", e.target.value)}
            >
              <option value="">— Select shop or enter manually —</option>
              {shopTenants.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: "11px", color: C.muted, padding: "8px 0" }}>
              No shop tenants yet — enter destination manually below
            </div>
          )}
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Destination Name *
          </label>
          <input
            style={sInput}
            value={form.destination_name}
            onChange={(e) => set("destination_name", e.target.value)}
            placeholder="e.g. Green Leaf Dispensary"
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Courier
          </label>
          <input
            style={sInput}
            value={form.courier}
            onChange={(e) => set("courier", e.target.value)}
            placeholder="e.g. The Courier Guy, DPD"
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Tracking Number
          </label>
          <input
            style={sInput}
            value={form.tracking_number}
            onChange={(e) => set("tracking_number", e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: C.muted,
              display: "block",
              marginBottom: "4px",
            }}
          >
            Estimated Arrival
          </label>
          <input
            style={sInput}
            type="date"
            value={form.estimated_arrival}
            onChange={(e) => set("estimated_arrival", e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            fontSize: "11px",
            color: C.muted,
            display: "block",
            marginBottom: "4px",
          }}
        >
          Notes
        </label>
        <input
          style={sInput}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional shipment notes"
        />
      </div>

      {/* v1.2: Landed cost notice */}
      {landedItemsCount > 0 && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px 12px",
            background: "rgba(82,183,136,0.08)",
            border: `1px solid ${C.accentGreen}30`,
            borderRadius: "2px",
            fontSize: "11px",
            color: C.primaryDark,
          }}
        >
          ✓{" "}
          <strong>
            {landedItemsCount} item{landedItemsCount !== 1 ? "s" : ""}
          </strong>{" "}
          auto-priced from import PO landed costs
        </div>
      )}

      {/* Shipment items */}
      <div style={{ ...sLabel, marginBottom: "8px" }}>Shipment Items</div>

      {items.map((item, idx) => (
        <div key={idx}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.5fr 1fr 0.8fr 0.8fr auto",
              gap: "8px",
              marginBottom: "4px",
              alignItems: "end",
            }}
          >
            <div>
              {idx === 0 && (
                <label
                  style={{
                    fontSize: "10px",
                    color: C.muted,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  From Inventory (optional)
                </label>
              )}
              <select
                style={sSelect}
                value={item.inventory_item_id}
                onChange={(e) =>
                  setItem(idx, "inventory_item_id", e.target.value)
                }
              >
                <option value="">— Manual entry —</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.quantity_on_hand} {i.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              {idx === 0 && (
                <label
                  style={{
                    fontSize: "10px",
                    color: C.muted,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Item Name
                </label>
              )}
              <input
                style={sInput}
                value={item.item_name}
                onChange={(e) => setItem(idx, "item_name", e.target.value)}
                placeholder="Name"
              />
            </div>
            <div>
              {idx === 0 && (
                <label
                  style={{
                    fontSize: "10px",
                    color: C.muted,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Quantity
                </label>
              )}
              <input
                style={sInput}
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => setItem(idx, "quantity", e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              {idx === 0 && (
                <label
                  style={{
                    fontSize: "10px",
                    color: C.muted,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Unit
                </label>
              )}
              <select
                style={sSelect}
                value={item.unit}
                onChange={(e) => setItem(idx, "unit", e.target.value)}
              >
                <option value="pcs">pcs</option>
                <option value="ml">ml</option>
                <option value="g">g</option>
                <option value="bottles">bottles</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
            <div>
              {idx === 0 && (
                <label
                  style={{
                    fontSize: "10px",
                    color: C.muted,
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Cost (R)
                </label>
              )}
              <input
                style={{
                  ...sInput,
                  borderColor: item.landedCostRef ? C.accentGreen : C.border,
                }}
                type="number"
                step="0.01"
                value={item.unit_cost}
                onChange={(e) => setItem(idx, "unit_cost", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(idx)}
                  style={{
                    ...sBtn("outline"),
                    padding: "8px",
                    color: C.red,
                    borderColor: C.red,
                    fontSize: "11px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {/* v1.2: Show landed cost source */}
          {item.landedCostRef && (
            <div
              style={{
                marginBottom: "8px",
                marginLeft: "4px",
                fontSize: "10px",
                color: C.accentGreen,
              }}
            >
              ✓ Landed cost from {item.landedCostRef.poNumber} (
              {item.landedCostRef.poStatus})
            </div>
          )}
        </div>
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
        }}
      >
        <button
          onClick={addItem}
          style={{ ...sBtn("outline"), fontSize: "9px" }}
        >
          + Add Item
        </button>
        {totalCost > 0 && (
          <span
            style={{ fontSize: "12px", color: C.primaryDark, fontWeight: 600 }}
          >
            Shipment Value: R{totalCost.toFixed(2)}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "20px",
          borderTop: `1px solid ${C.border}`,
          paddingTop: "16px",
        }}
      >
        <button onClick={onCancel} style={sBtn("outline")}>
          Cancel
        </button>
        <button onClick={handleCreate} disabled={saving} style={sBtn()}>
          {saving ? "Creating..." : "Create Shipment"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHIPMENT CARD — v1.2: includes cost analysis panel
// ═══════════════════════════════════════════════════════════════════════════
function ShipmentCard({
  shipment,
  landedCostMap,
  expanded,
  onToggle,
  onRefresh,
}) {
  const [updating, setUpdating] = useState(false);

  const statusCfg = STATUS_CONFIG[shipment.status] || STATUS_CONFIG.preparing;
  const items = shipment.shipment_items || [];
  const totalItems = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);
  const nextStatuses = NEXT_STATUSES[shipment.status] || [];

  // v1.2: Calculate cost analysis metrics
  const costAnalysis = (() => {
    if (items.length === 0 || !landedCostMap) return null;

    let totalLandedCost = 0;
    let landedCount = 0;
    const lineAnalysis = [];

    for (const si of items) {
      const lc = si.inventory_item_id
        ? landedCostMap[si.inventory_item_id]
        : null;
      const landedCostPerUnit = lc?.landedCost || si.unit_cost || 0;
      const sellCostPerUnit = si.unit_cost || 0;
      const qty = si.quantity || 0;

      if (landedCostPerUnit > 0) {
        totalLandedCost += landedCostPerUnit * qty;
        landedCount++;
      }

      const impliedMargin =
        sellCostPerUnit > 0 && landedCostPerUnit > 0
          ? ((sellCostPerUnit - landedCostPerUnit) / sellCostPerUnit) * 100
          : null;

      lineAnalysis.push({
        name: si.item_name,
        qty,
        landedCostPerUnit,
        sellCostPerUnit,
        impliedMargin,
        hasLandedData: !!lc,
        poRef: lc?.poNumber,
      });
    }

    if (landedCount === 0) return null;

    const shipmentMargin =
      totalCost > 0 && totalLandedCost > 0
        ? ((totalCost - totalLandedCost) / totalCost) * 100
        : null;

    return { lineAnalysis, totalLandedCost, shipmentMargin, landedCount };
  })();

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const updates = { status: newStatus };
      if (newStatus === "shipped")
        updates.shipped_date = new Date().toISOString().split("T")[0];
      if (newStatus === "delivered")
        updates.delivered_date = new Date().toISOString().split("T")[0];
      if (newStatus === "confirmed")
        updates.confirmed_date = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("shipments")
        .update(updates)
        .eq("id", shipment.id);
      if (error) throw error;

      // Task A-3: Auto-transfer inventory on delivery
      if (newStatus === "delivered") {
        const shipItems = shipment.shipment_items || [];
        const transferErrors = [];
        const destTenantId = shipment.destination_tenant_id;

        for (const si of shipItems) {
          const qty = si.quantity || 0;
          if (qty <= 0) continue;
          try {
            if (si.inventory_item_id) {
              const { data: hqItem, error: hqReadErr } = await supabase
                .from("inventory_items")
                .select("quantity_on_hand")
                .eq("id", si.inventory_item_id)
                .single();
              if (hqReadErr) {
                transferErrors.push(
                  `${si.item_name} (HQ read): ${hqReadErr.message}`,
                );
              } else if (hqItem) {
                await supabase
                  .from("inventory_items")
                  .update({
                    quantity_on_hand: (hqItem.quantity_on_hand || 0) - qty,
                  })
                  .eq("id", si.inventory_item_id);
                await supabase.from("stock_movements").insert({
                  id: crypto.randomUUID(),
                  item_id: si.inventory_item_id,
                  quantity: -qty,
                  movement_type: "shipment_out",
                  reference: shipment.shipment_number,
                  notes: `Shipped to ${shipment.destination_name} (${shipment.shipment_number})`,
                  tenant_id: HQ_TENANT_ID,
                });
              }
            }

            if (destTenantId) {
              const { data: shopItems } = await supabase
                .from("inventory_items")
                .select("id, quantity_on_hand")
                .eq("tenant_id", destTenantId)
                .ilike("name", si.item_name)
                .limit(1);
              let shopItemId;
              if (shopItems && shopItems.length > 0) {
                shopItemId = shopItems[0].id;
                await supabase
                  .from("inventory_items")
                  .update({
                    quantity_on_hand:
                      (shopItems[0].quantity_on_hand || 0) + qty,
                  })
                  .eq("id", shopItemId);
              } else {
                shopItemId = crypto.randomUUID();
                await supabase.from("inventory_items").insert({
                  id: shopItemId,
                  tenant_id: destTenantId,
                  name: si.item_name,
                  sku: si.sku || null,
                  category: "finished_product",
                  quantity_on_hand: qty,
                  unit: si.unit || "pcs",
                  cost_price: si.unit_cost || null,
                  is_active: true,
                });
              }
              if (shopItemId) {
                await supabase.from("stock_movements").insert({
                  id: crypto.randomUUID(),
                  item_id: shopItemId,
                  quantity: qty,
                  movement_type: "shipment_in",
                  reference: shipment.shipment_number,
                  notes: `Received from HQ (${shipment.shipment_number})`,
                  tenant_id: destTenantId,
                });
              }
            }
          } catch (itemErr) {
            transferErrors.push(
              `${si.item_name}: ${itemErr.message || "Unknown error"}`,
            );
          }
        }

        if (transferErrors.length > 0) {
          alert(
            "Shipment marked as delivered, but some inventory transfers failed:\n\n" +
              transferErrors.join("\n"),
          );
        }
      }

      onRefresh();
    } catch (err) {
      alert("Error updating status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={sCard}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontFamily: F.heading,
                fontSize: "18px",
                fontWeight: 600,
                color: C.text,
              }}
            >
              {shipment.shipment_number}
            </span>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "2px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 600,
                background: statusCfg.bg,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.color}35`,
              }}
            >
              {statusCfg.label}
            </span>
          </div>
          <div style={{ fontSize: "13px", color: C.muted }}>
            → {shipment.destination_name} · {totalItems} items
            {shipment.courier && <span> · {shipment.courier}</span>}
            {totalCost > 0 && (
              <span style={{ color: C.primaryDark, fontWeight: 600 }}>
                {" "}
                · R{totalCost.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: C.muted }}>
            {new Date(shipment.created_at).toLocaleDateString()}
          </span>
          <span
            style={{
              fontSize: "14px",
              color: C.muted,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {/* Items table */}
          {items.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ ...sLabel, marginBottom: "8px" }}>
                Shipment Items
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  fontFamily: F.body,
                }}
              >
                <thead>
                  <tr>
                    {["Item", "SKU", "Qty", "Unit Cost", "Total"].map(
                      (h, i) => (
                        <th
                          key={h}
                          style={{
                            textAlign: i >= 2 ? "right" : "left",
                            padding: "8px",
                            fontSize: "9px",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: C.muted,
                            borderBottom: `2px solid ${C.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          fontWeight: 500,
                        }}
                      >
                        {item.item_name}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          color: C.muted,
                          fontSize: "11px",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.sku || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {item.quantity} {item.unit}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                        }}
                      >
                        {item.unit_cost ? `R${item.unit_cost.toFixed(2)}` : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: `1px solid ${C.border}`,
                          textAlign: "right",
                        }}
                      >
                        {item.total_cost
                          ? `R${item.total_cost.toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {totalCost > 0 && (
                  <tfoot>
                    <tr>
                      <td
                        colSpan="4"
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontWeight: 600,
                          fontSize: "11px",
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Total:
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: C.primaryDark,
                        }}
                      >
                        R{totalCost.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* ── v1.2: Cost Analysis Panel ──────────────────────────── */}
          {costAnalysis && (
            <CostAnalysisPanel
              analysis={costAnalysis}
              totalShipmentCost={totalCost}
            />
          )}
          {/* ── end v1.2 ───────────────────────────────────────────── */}

          {/* Shipment details */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
              fontSize: "11px",
              color: C.muted,
              marginBottom: "16px",
            }}
          >
            <DetailItem label="Destination" value={shipment.destination_name} />
            <DetailItem label="Courier" value={shipment.courier} />
            <DetailItem label="Tracking" value={shipment.tracking_number} />
            <DetailItem
              label="Created"
              value={new Date(shipment.created_at).toLocaleString()}
            />
            {shipment.shipped_date && (
              <DetailItem label="Shipped" value={shipment.shipped_date} />
            )}
            {shipment.estimated_arrival && (
              <DetailItem label="ETA" value={shipment.estimated_arrival} />
            )}
            {shipment.delivered_date && (
              <DetailItem label="Delivered" value={shipment.delivered_date} />
            )}
            {shipment.confirmed_date && (
              <DetailItem label="Confirmed" value={shipment.confirmed_date} />
            )}
          </div>

          {shipment.notes && (
            <div
              style={{
                fontSize: "12px",
                color: C.muted,
                fontStyle: "italic",
                marginBottom: "16px",
                padding: "8px 12px",
                background: C.warmBg,
                borderRadius: "2px",
              }}
            >
              {shipment.notes}
            </div>
          )}

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                borderTop: `1px solid ${C.border}`,
                paddingTop: "12px",
              }}
            >
              {nextStatuses
                .filter((s) => s !== "cancelled")
                .map((ns) => {
                  const cfg = STATUS_CONFIG[ns];
                  return (
                    <button
                      key={ns}
                      onClick={() => handleStatusChange(ns)}
                      disabled={updating}
                      style={{ ...sBtn(), background: cfg.color }}
                    >
                      {updating ? "Updating..." : `→ ${cfg.label}`}
                    </button>
                  );
                })}
              {nextStatuses.includes("cancelled") && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel this shipment? This cannot be undone.",
                      )
                    )
                      handleStatusChange("cancelled");
                  }}
                  disabled={updating}
                  style={{
                    ...sBtn("outline"),
                    color: C.red,
                    borderColor: C.red,
                  }}
                >
                  Cancel Shipment
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COST ANALYSIS PANEL — v1.2
// Shows landed cost vs sell-out cost per line item, implied margin
// ═══════════════════════════════════════════════════════════════════════════
function CostAnalysisPanel({ analysis, totalShipmentCost }) {
  const { lineAnalysis, totalLandedCost, shipmentMargin } = analysis;

  const mColor = (pct) => {
    if (pct === null) return C.muted;
    if (pct >= 35) return C.accentGreen;
    if (pct >= 20) return C.gold;
    return C.red;
  };

  return (
    <div
      style={{
        marginBottom: "16px",
        padding: "16px",
        background: "rgba(44,74,110,0.04)",
        border: `1px solid ${C.blue}25`,
        borderRadius: "2px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div style={{ ...sLabel, color: C.blue }}>Import Cost Analysis</div>
        {shipmentMargin !== null && (
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: mColor(shipmentMargin),
                marginBottom: "2px",
              }}
            >
              Implied Margin
            </div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: "20px",
                color: mColor(shipmentMargin),
                fontWeight: 600,
              }}
            >
              {shipmentMargin.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        {[
          {
            label: "Sell-Out Value",
            value: `R${totalShipmentCost.toFixed(2)}`,
            color: C.primaryDark,
          },
          {
            label: "Landed Cost",
            value: `R${totalLandedCost.toFixed(2)}`,
            color: C.blue,
          },
          {
            label: "Gross Profit",
            value:
              shipmentMargin !== null
                ? `R${(totalShipmentCost - totalLandedCost).toFixed(2)}`
                : "—",
            color: mColor(shipmentMargin),
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              padding: "8px 12px",
              background: C.white,
              borderRadius: "2px",
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.muted,
                marginBottom: "3px",
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: "16px",
                color: k.color,
                fontWeight: 600,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Per-line breakdown */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "11px",
          fontFamily: F.body,
        }}
      >
        <thead>
          <tr>
            {[
              "Item",
              "Qty",
              "Landed Cost/Unit",
              "Sell Cost/Unit",
              "Margin",
              "PO Ref",
            ].map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: i >= 1 ? "right" : "left",
                  padding: "6px 8px",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
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
          {lineAnalysis.map((row, i) => (
            <tr key={i}>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  fontWeight: 500,
                }}
              >
                {row.name}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  textAlign: "right",
                  color: C.muted,
                }}
              >
                {row.qty}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  textAlign: "right",
                }}
              >
                {row.landedCostPerUnit > 0 ? (
                  <span style={{ color: C.blue }}>
                    {row.hasLandedData ? "✓ " : ""}R
                    {row.landedCostPerUnit.toFixed(2)}
                  </span>
                ) : (
                  <span style={{ color: C.muted }}>—</span>
                )}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  textAlign: "right",
                }}
              >
                {row.sellCostPerUnit > 0 ? (
                  `R${row.sellCostPerUnit.toFixed(2)}`
                ) : (
                  <span style={{ color: C.muted }}>—</span>
                )}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  textAlign: "right",
                  fontWeight: 700,
                  color: mColor(row.impliedMargin),
                }}
              >
                {row.impliedMargin !== null ? (
                  `${row.impliedMargin.toFixed(1)}%`
                ) : (
                  <span style={{ color: C.muted }}>—</span>
                )}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: `1px solid ${C.border}`,
                  textAlign: "right",
                  fontSize: "10px",
                  color: C.muted,
                }}
              >
                {row.poRef || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: "10px", color: C.muted, marginTop: "8px" }}>
        ✓ = Landed cost from import PO · Margin = (Sell − Landed) / Sell
      </div>
    </div>
  );
}

// ── Helper components ───────────────────────────────────────────────────
function FlowStep({ label, done, active }) {
  if (active)
    return (
      <span
        style={{
          background: T.accentLight,
          color: T.accent,
          padding: "4px 12px",
          borderRadius: "3px",
          fontWeight: 700,
          border: `1px solid ${T.accentBd}`,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontSize: "11px",
          fontFamily: T.font,
        }}
      >
        {label}
      </span>
    );
  if (done)
    return (
      <span
        style={{
          background: T.bg,
          color: T.ink500,
          padding: "4px 12px",
          borderRadius: "3px",
          fontWeight: 400,
          border: `1px solid ${T.border}`,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontSize: "11px",
          fontFamily: T.font,
        }}
      >
        ✓ {label}
      </span>
    );
  return (
    <span
      style={{
        background: C.warmBg,
        color: C.muted,
        padding: "4px 12px",
        borderRadius: "2px",
        border: `1px dashed ${C.border}`,
      }}
    >
      {label}
    </span>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: "#fff", padding: "16px 18px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T.ink500,
          marginBottom: "6px",
          fontFamily: T.font,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T.font,
          fontSize: "26px",
          fontWeight: 600,
          color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "12px", color: C.text, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}
