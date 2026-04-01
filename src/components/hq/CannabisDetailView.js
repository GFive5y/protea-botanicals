// src/components/hq/CannabisDetailView.js — v1.0
// WP-SMARTSTOCK-UI Phase 1 · April 1, 2026
//
// Modern Excel-style detail view for HQStock CannabisItemsView.
// "A lot of lines impress no one" — rows have personality, not just data.
// Think Linear / Airtable / Vercel dashboard, not MS Excel 2003.
//
// Features:
//   Sortable column headers (click = asc, click = desc, click = reset)
//   Per-column filter dropdowns (checkbox list, range slider, boolean)
//   Multi-row selection (checkbox, Ctrl+click, Shift+click)
//   Bulk actions: Set Price, Set Category, Set Active, Set Featured, Delete
//   Status-coloured left border per row (green/amber/red/grey)
//   Row click → StockItemPanel (side panel)
//   Double-click → StockItemModal (full edit)
//   Column show/hide (right-click header)
//   52px row height, generous typography
//
// LL-131: tenantId as prop — never hardcoded
// LL-174: CATEGORY_LABELS, CATEGORY_ICONS from ProductWorlds.js
// Rule 0F: tenant_id on every INSERT
// LL-178: Additive only — does not replace anything in HQStock

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import {
  PRODUCT_WORLDS,
  // eslint-disable-next-line no-unused-vars -- kept: world-specific cell rendering (Phase 2)
  CATEGORY_LABELS,
  // eslint-disable-next-line no-unused-vars -- kept: world-specific cell rendering (Phase 2)
  CATEGORY_ICONS,
  itemMatchesWorld,
} from "./ProductWorlds";

// ── Design tokens (matches HQStock T object) ─────────────────────────────
const T = {
  bg: "#FAFAF9",
  white: "#FFFFFF",
  border: "#ECEAE6",
  borderMid: "#D4D0CB",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentXlit: "#F0FAF4",
  danger: "#DC2626",
  dangerLit: "#FEF2F2",
  amber: "#D97706",
  amberLit: "#FFFBEB",
  blue: "#2563EB",
  blueLit: "#EFF6FF",
  purple: "#7C3AED",
  purpleLit: "#F5F3FF",
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#474747",
  ink400: "#6B6B6B",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink50: "#F7F7F7",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
};

// ── Status logic (single source — determines left border colour) ──────────
function getStatus(item) {
  const qty = item.quantity_on_hand || 0;
  const price = item.sell_price || 0;
  const reorder = item.reorder_level || 0;
  if (!item.is_active) return "hidden";
  if (item.expiry_date && new Date(item.expiry_date) < new Date())
    return "expired";
  if (price <= 0) return "no_price";
  if (qty <= 0) return "sold_out";
  if (reorder > 0 && qty <= reorder) return "low_stock";
  return "live";
}
const STATUS_META = {
  live: { label: "Live", color: "#2D6A4F", bg: "#E8F5EE" },
  sold_out: { label: "Sold Out", color: "#D97706", bg: "#FFFBEB" },
  low_stock: { label: "Low Stock", color: "#D97706", bg: "#FFFBEB" },
  hidden: { label: "Hidden", color: "#9CA3AF", bg: "#F3F4F6" },
  no_price: { label: "No Price", color: "#DC2626", bg: "#FEF2F2" },
  expired: { label: "Expired", color: "#7C3AED", bg: "#F5F3FF" },
};

// ── Margin calculation ────────────────────────────────────────────────────
function calcMargin(sell, cost) {
  if (!sell || !cost || sell <= 0 || cost <= 0) return null;
  return ((sell - cost) / sell) * 100;
}
function marginColor(m) {
  if (m === null) return T.ink300;
  if (m >= 50) return T.accentMid;
  if (m >= 30) return T.amber;
  return T.danger;
}

// ── Formatters ────────────────────────────────────────────────────────────
const zar = (n) => (n != null ? `R${Number(n).toFixed(2)}` : "—");
const pct = (n) => (n != null ? `${Number(n).toFixed(1)}%` : "—");

// ── Column definitions ────────────────────────────────────────────────────
const ALL_COLS = [
  {
    key: "name",
    label: "Name / SKU",
    w: 240,
    type: "text",
    sortable: true,
    defaultVisible: true,
  },
  {
    key: "world",
    label: "Category",
    w: 150,
    type: "list",
    sortable: true,
    defaultVisible: true,
  },
  {
    key: "variant_value",
    label: "Variant",
    w: 120,
    type: "text",
    sortable: true,
    defaultVisible: true,
  },
  {
    key: "quantity_on_hand",
    label: "On Hand",
    w: 90,
    type: "number",
    sortable: true,
    defaultVisible: true,
    align: "right",
  },
  {
    key: "sell_price",
    label: "Sell Price",
    w: 100,
    type: "number",
    sortable: true,
    defaultVisible: true,
    align: "right",
  },
  {
    key: "_margin",
    label: "Margin",
    w: 90,
    type: "number",
    sortable: true,
    defaultVisible: true,
    align: "right",
  },
  {
    key: "weighted_avg_cost",
    label: "Avg Cost",
    w: 100,
    type: "number",
    sortable: true,
    defaultVisible: true,
    align: "right",
  },
  {
    key: "brand",
    label: "Brand",
    w: 120,
    type: "list",
    sortable: true,
    defaultVisible: false,
  },
  {
    key: "sku",
    label: "SKU",
    w: 120,
    type: "text",
    sortable: true,
    defaultVisible: false,
  },
  {
    key: "is_active",
    label: "Active",
    w: 80,
    type: "boolean",
    sortable: true,
    defaultVisible: false,
  },
  {
    key: "is_featured",
    label: "Featured",
    w: 85,
    type: "boolean",
    sortable: true,
    defaultVisible: false,
  },
  {
    key: "reorder_level",
    label: "Reorder",
    w: 85,
    type: "number",
    sortable: true,
    defaultVisible: false,
    align: "right",
  },
  {
    key: "_actions",
    label: "",
    w: 80,
    type: "actions",
    sortable: false,
    defaultVisible: true,
    align: "center",
  },
];

// ── Main component ────────────────────────────────────────────────────────
export default function CannabisDetailView({
  items, // already filtered by cat/brand/search from CannabisItemsView
  allItems, // unfiltered active items (for stats)
  tenantId,
  onOpenPanel, // (item) → opens StockItemPanel
  onOpenEdit, // (item) → opens StockItemModal
  onRefresh, // reload items from Supabase
}) {
  // ── Sort state ──────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // ── Column filter state ─────────────────────────────────────────────────
  const [colFilters, setColFilters] = useState({}); // { key: value }
  const [openFilter, setOpenFilter] = useState(null); // which col dropdown is open
  const filterRef = useRef(null);

  // ── Column visibility ───────────────────────────────────────────────────
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = sessionStorage.getItem("nuai_detail_cols");
      return saved
        ? JSON.parse(saved)
        : ALL_COLS.filter((c) => c.defaultVisible).map((c) => c.key);
    } catch {
      return ALL_COLS.filter((c) => c.defaultVisible).map((c) => c.key);
    }
  });
  const [colMenu, setColMenu] = useState(null); // { x, y } for right-click menu

  // ── Multi-select ────────────────────────────────────────────────────────
  const [selected, setSelected] = useState(new Set());
  const [lastSelected, setLastSelected] = useState(null);

  // ── Bulk action state ───────────────────────────────────────────────────
  const [bulkAction, setBulkAction] = useState(null); // null | 'price' | 'category' | 'active' | 'featured' | 'delete'
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState(null);

  // ── Persist column config ────────────────────────────────────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem("nuai_detail_cols", JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setOpenFilter(null);
      }
      setColMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Sorted + column-filtered items ──────────────────────────────────────
  const rows = useMemo(() => {
    let list = [...items];

    // Apply column filters
    Object.entries(colFilters).forEach(([key, filter]) => {
      if (!filter) return;
      if (key === "world") {
        if (filter !== "all") {
          const world = PRODUCT_WORLDS.find((w) => w.id === filter);
          if (world) list = list.filter((i) => itemMatchesWorld(i, world));
        }
      } else if (key === "_margin") {
        const { min, max } = filter;
        list = list.filter((i) => {
          const m = calcMargin(i.sell_price, i.weighted_avg_cost);
          if (m === null) return false;
          if (min != null && m < min) return false;
          if (max != null && m > max) return false;
          return true;
        });
      } else if (
        typeof filter === "object" &&
        ("min" in filter || "max" in filter)
      ) {
        const { min, max } = filter;
        list = list.filter((i) => {
          const v = Number(i[key]);
          if (min != null && v < min) return false;
          if (max != null && v > max) return false;
          return true;
        });
      } else if (typeof filter === "boolean") {
        list = list.filter((i) => Boolean(i[key]) === filter);
      } else if (Array.isArray(filter)) {
        if (filter.length > 0)
          list = list.filter((i) => filter.includes(String(i[key] ?? "")));
      } else {
        const q = String(filter).toLowerCase();
        list = list.filter((i) =>
          String(i[key] ?? "")
            .toLowerCase()
            .includes(q),
        );
      }
    });

    // Sort
    list.sort((a, b) => {
      let av =
        sortKey === "_margin"
          ? calcMargin(a.sell_price, a.weighted_avg_cost)
          : sortKey === "world"
            ? PRODUCT_WORLDS.find((w) => itemMatchesWorld(a, w))?.label || ""
            : a[sortKey];
      let bv =
        sortKey === "_margin"
          ? calcMargin(b.sell_price, b.weighted_avg_cost)
          : sortKey === "world"
            ? PRODUCT_WORLDS.find((w) => itemMatchesWorld(b, w))?.label || ""
            : b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      return av < bv
        ? sortDir === "asc"
          ? -1
          : 1
        : av > bv
          ? sortDir === "asc"
            ? 1
            : -1
          : 0;
    });

    return list;
  }, [items, colFilters, sortKey, sortDir]);

  // ── Sort handler ─────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) {
        if (sortDir === "asc") setSortDir("desc");
        else {
          setSortKey("name");
          setSortDir("asc");
        }
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey, sortDir],
  );

  // ── Selection handlers ────────────────────────────────────────────────────
  const toggleRow = useCallback(
    (itemId, e) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (e?.shiftKey && lastSelected) {
          const ids = rows.map((r) => r.id);
          const a = ids.indexOf(lastSelected);
          const b = ids.indexOf(itemId);
          const [lo, hi] = a < b ? [a, b] : [b, a];
          ids.slice(lo, hi + 1).forEach((id) => next.add(id));
        } else if (e?.ctrlKey || e?.metaKey) {
          if (next.has(itemId)) next.delete(itemId);
          else next.add(itemId);
        } else {
          if (next.has(itemId)) next.delete(itemId);
          else next.add(itemId);
        }
        return next;
      });
      setLastSelected(itemId);
    },
    [rows, lastSelected],
  );

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const selectedItems = rows.filter((r) => selected.has(r.id));

  const executeBulk = async () => {
    if (selectedItems.length === 0 || !bulkAction) return;
    setBulkSaving(true);
    setBulkError(null);
    try {
      const ids = selectedItems.map((i) => i.id);
      if (bulkAction === "price") {
        const val = parseFloat(bulkValue);
        if (isNaN(val) || val <= 0) throw new Error("Enter a valid price.");
        await supabase
          .from("inventory_items")
          .update({ sell_price: val, updated_at: new Date().toISOString() })
          .in("id", ids);
      } else if (bulkAction === "active_on") {
        await supabase
          .from("inventory_items")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .in("id", ids);
      } else if (bulkAction === "active_off") {
        await supabase
          .from("inventory_items")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in("id", ids);
      } else if (bulkAction === "featured_on") {
        await supabase
          .from("inventory_items")
          .update({ is_featured: true, updated_at: new Date().toISOString() })
          .in("id", ids);
      } else if (bulkAction === "featured_off") {
        await supabase
          .from("inventory_items")
          .update({ is_featured: false, updated_at: new Date().toISOString() })
          .in("id", ids);
      } else if (bulkAction === "delete_soft") {
        // Soft delete: items with no stock movements → hard delete. Others → hidden.
        const { data: movs } = await supabase
          .from("stock_movements")
          .select("item_id")
          .in("item_id", ids);
        const withMov = new Set((movs || []).map((m) => m.item_id));
        const softIds = ids.filter((id) => withMov.has(id));
        const hardIds = ids.filter((id) => !withMov.has(id));
        if (softIds.length) {
          await supabase
            .from("inventory_items")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in("id", softIds);
        }
        if (hardIds.length) {
          await supabase.from("inventory_items").delete().in("id", hardIds);
        }
      }
      setSelected(new Set());
      setBulkAction(null);
      setBulkValue("");
      onRefresh();
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Active column list ────────────────────────────────────────────────────
  const activeCols = ALL_COLS.filter((c) => visibleCols.includes(c.key));

  // ── Total table width ─────────────────────────────────────────────────────
  const tableWidth = 36 + activeCols.reduce((s, c) => s + c.w, 0); // 36 = checkbox col

  // ── Filter dropdown data ──────────────────────────────────────────────────
  function getFilterOptions(colKey) {
    if (colKey === "world")
      return PRODUCT_WORLDS.filter((w) => w.id !== "all").map((w) => ({
        value: w.id,
        label: w.label,
        count: items.filter((i) => itemMatchesWorld(i, w)).length,
      }));
    const vals = [
      ...new Set(items.map((i) => String(i[colKey] ?? "")).filter(Boolean)),
    ].sort();
    return vals.map((v) => ({
      value: v,
      label: v,
      count: items.filter((i) => String(i[colKey] ?? "") === v).length,
    }));
  }
  function getNumericRange(colKey) {
    const vals = items
      .map((i) =>
        colKey === "_margin"
          ? calcMargin(i.sell_price, i.weighted_avg_cost)
          : Number(i[colKey]),
      )
      .filter((v) => v != null && !isNaN(v));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }

  const activeFilterCount = Object.values(colFilters).filter(
    (v) => v && (Array.isArray(v) ? v.length > 0 : true),
  ).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: T.font, position: "relative" }} ref={filterRef}>
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: T.ink400 }}>
          <strong style={{ color: T.ink900 }}>{rows.length}</strong> items
          {activeFilterCount > 0 && (
            <span style={{ color: T.blue }}>
              {" "}
              · {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}{" "}
              active
            </span>
          )}
        </span>

        {activeFilterCount > 0 && (
          <button onClick={() => setColFilters({})} style={microBtn(T)}>
            Clear filters ×
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {/* Column config trigger */}
          <button
            onClick={(e) => {
              const rect = e.target.getBoundingClientRect();
              setColMenu({ x: rect.right, y: rect.bottom + 4 });
            }}
            style={microBtn(T)}
          >
            Columns
            {visibleCols.length < ALL_COLS.length - 1
              ? ` (${visibleCols.length})`
              : ""}
          </button>
        </div>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            background: T.accent,
            borderRadius: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
            {selected.size} item{selected.size !== 1 ? "s" : ""} selected
          </span>

          {/* Bulk action buttons */}
          {[
            { id: "price", label: "Set Price" },
            { id: "active_on", label: "Show All" },
            { id: "active_off", label: "Hide All" },
            { id: "featured_on", label: "Feature All" },
            { id: "featured_off", label: "Unfeature All" },
            { id: "delete_soft", label: "Delete" },
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setBulkAction(a.id);
                setBulkError(null);
                setBulkValue("");
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.3)",
                background:
                  bulkAction === a.id
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.1)",
                color: a.id === "delete_soft" ? "#FCA5A5" : "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              {a.label}
            </button>
          ))}

          {/* Inline input for price */}
          {bulkAction === "price" && (
            <input
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="New price (R)"
              autoFocus
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                fontSize: 13,
                width: 140,
                fontFamily: T.font,
              }}
            />
          )}

          {/* Confirm / error */}
          {bulkAction && (
            <button
              onClick={executeBulk}
              disabled={bulkSaving}
              style={{
                padding: "5px 14px",
                borderRadius: 6,
                border: "none",
                background: "#fff",
                color: T.accent,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: T.font,
                opacity: bulkSaving ? 0.7 : 1,
              }}
            >
              {bulkSaving ? "Saving…" : "Confirm"}
            </button>
          )}

          {bulkError && (
            <span style={{ fontSize: 11, color: "#FCA5A5" }}>
              ⚠ {bulkError}
            </span>
          )}

          <button
            onClick={() => {
              setSelected(new Set());
              setBulkAction(null);
            }}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Clear ×
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: T.white,
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            minWidth: tableWidth,
            tableLayout: "fixed",
          }}
        >
          {/* Column widths */}
          <colgroup>
            <col style={{ width: 36 }} />
            {activeCols.map((c) => (
              <col key={c.key} style={{ width: c.w }} />
            ))}
          </colgroup>

          {/* Header */}
          <thead>
            <tr
              style={{
                background: "#F7F6F4",
                borderBottom: `1.5px solid ${T.borderMid}`,
              }}
            >
              {/* Select all */}
              <th
                style={{
                  width: 36,
                  padding: "0 0 0 12px",
                  textAlign: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: T.accent,
                    cursor: "pointer",
                  }}
                />
              </th>

              {activeCols.map((col) => {
                const isSorted = sortKey === col.key;
                const hasFilter =
                  colFilters[col.key] &&
                  (Array.isArray(colFilters[col.key])
                    ? colFilters[col.key].length > 0
                    : true);
                const isOpen = openFilter === col.key;
                return (
                  <th
                    key={col.key}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setColMenu({
                        x: e.clientX,
                        y: e.clientY,
                        trigger: "header",
                      });
                    }}
                    style={{
                      padding: "0 10px",
                      height: 36,
                      textAlign: col.align || "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: isSorted ? T.accentMid : T.ink400,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      background: isSorted ? T.accentXlit : "transparent",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      position: "relative",
                    }}
                  >
                    {col.type !== "actions" ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0,
                          cursor: col.sortable ? "pointer" : "default",
                        }}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <span style={{ flex: 1 }}>{col.label}</span>
                        {isSorted && (
                          <span style={{ fontSize: 10, marginLeft: 4 }}>
                            {sortDir === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                        {col.type !== "actions" && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFilter(isOpen ? null : col.key);
                            }}
                            style={{
                              marginLeft: 4,
                              fontSize: 9,
                              cursor: "pointer",
                              color: hasFilter ? T.blue : T.ink300,
                              padding: "1px 3px",
                              borderRadius: 3,
                              background: hasFilter ? T.blueLit : "transparent",
                            }}
                          >
                            {hasFilter ? "●" : "▾"}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {/* Filter dropdown */}
                    {isOpen && (
                      <FilterDropdown
                        col={col}
                        items={items}
                        value={colFilters[col.key]}
                        onChange={(v) =>
                          setColFilters((p) => ({ ...p, [col.key]: v }))
                        }
                        onClose={() => setOpenFilter(null)}
                        getOptions={getFilterOptions}
                        getRange={getNumericRange}
                        T={T}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={activeCols.length + 1}
                  style={{
                    padding: 48,
                    textAlign: "center",
                    color: T.ink400,
                    fontSize: 13,
                  }}
                >
                  No items match your current filters.
                </td>
              </tr>
            ) : (
              rows.map((item, idx) => {
                const status = getStatus(item);
                const meta = STATUS_META[status];
                const m = calcMargin(item.sell_price, item.weighted_avg_cost);
                const isSelected = selected.has(item.id);
                const world = PRODUCT_WORLDS.find(
                  (w) => w.id !== "all" && itemMatchesWorld(item, w),
                );
                const rowBg = isSelected
                  ? "#EFF6FF"
                  : idx % 2 === 0
                    ? T.white
                    : T.bg;

                return (
                  <tr
                    key={item.id}
                    onClick={(e) => {
                      if (e.target.type === "checkbox") return;
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        toggleRow(item.id, e);
                      } else {
                        onOpenPanel(item);
                      }
                    }}
                    style={{
                      background: rowBg,
                      borderBottom: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${isSelected ? T.blue : meta.color}`,
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = T.accentXlit;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = rowBg;
                    }}
                  >
                    {/* Checkbox */}
                    <td
                      style={{
                        width: 36,
                        padding: "0 0 0 12px",
                        textAlign: "center",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleRow(item.id, e)}
                        style={{
                          width: 14,
                          height: 14,
                          accentColor: T.accent,
                          cursor: "pointer",
                        }}
                      />
                    </td>

                    {activeCols.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "0 10px",
                          height: 52,
                          textAlign: col.align || "left",
                          verticalAlign: "middle",
                          overflow: "hidden",
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onOpenEdit(item);
                        }}
                      >
                        <CellContent
                          col={col}
                          item={item}
                          world={world}
                          m={m}
                          meta={meta}
                          status={status}
                          onOpenPanel={onOpenPanel}
                          onOpenEdit={onOpenEdit}
                          T={T}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Column visibility menu (right-click) ─────────────────────── */}
      {colMenu && (
        <div
          style={{
            position: "fixed",
            top: colMenu.y,
            left: Math.min(colMenu.x, window.innerWidth - 200),
            background: T.white,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            zIndex: 500,
            padding: "6px 0",
            minWidth: 180,
            fontFamily: T.font,
          }}
        >
          <div
            style={{
              padding: "4px 14px 6px",
              fontSize: 10,
              fontWeight: 700,
              color: T.ink400,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Show / hide columns
          </div>
          {ALL_COLS.filter((c) => c.type !== "actions").map((col) => (
            <label
              key={col.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 14px",
                cursor: "pointer",
                fontSize: 13,
                color: T.ink700,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = T.accentXlit)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <input
                type="checkbox"
                checked={visibleCols.includes(col.key)}
                onChange={() => {
                  setVisibleCols((prev) =>
                    prev.includes(col.key)
                      ? prev.filter((k) => k !== col.key)
                      : [...prev, col.key],
                  );
                }}
                style={{ accentColor: T.accent }}
              />
              {col.label}
            </label>
          ))}
          <div
            style={{ borderTop: `1px solid ${T.border}`, margin: "4px 0" }}
          />
          <button
            onClick={() => {
              setVisibleCols(
                ALL_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
              );
              setColMenu(null);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "5px 14px",
              border: "none",
              background: "none",
              textAlign: "left",
              fontSize: 12,
              color: T.ink400,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cell Content renderer ─────────────────────────────────────────────────
function CellContent({
  col,
  item,
  world,
  m,
  meta,
  status,
  onOpenPanel,
  onOpenEdit,
  T,
}) {
  const [hover, setHover] = useState(false);

  if (col.key === "name") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>
          {world?.icon || "📦"}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.ink900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
            {item.is_featured && (
              <span style={{ fontSize: 10, marginLeft: 6, color: "#D97706" }}>
                ★
              </span>
            )}
          </div>
          {(item.sku || item.brand) && (
            <div
              style={{
                fontSize: 11,
                color: T.ink400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 1,
              }}
            >
              {[item.sku, item.brand].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        {/* Status badge — subtle, inline */}
        <span
          style={{
            padding: "2px 7px",
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
            background: meta.bg,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
      </div>
    );
  }

  if (col.key === "world") {
    return world ? (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 9px",
          borderRadius: 99,
          background: T.accentLit,
          color: T.accentMid,
          fontSize: 11.5,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 13 }}>{world.icon}</span>
        {world.label}
      </span>
    ) : (
      <span style={{ color: T.ink300, fontSize: 12 }}>—</span>
    );
  }

  if (col.key === "quantity_on_hand") {
    const qty = item.quantity_on_hand || 0;
    return (
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color:
            qty === 0
              ? T.danger
              : qty <= (item.reorder_level || 0)
                ? T.amber
                : T.ink900,
        }}
      >
        {qty}
      </span>
    );
  }

  if (col.key === "sell_price") {
    return (
      <span style={{ fontSize: 13, fontWeight: 600, color: T.ink900 }}>
        {zar(item.sell_price)}
      </span>
    );
  }

  if (col.key === "_margin") {
    return m !== null ? (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 28,
            height: 4,
            borderRadius: 2,
            background: T.ink150,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(m, 100)}%`,
              background: marginColor(m),
              borderRadius: 2,
            }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: marginColor(m),
            minWidth: 40,
            textAlign: "right",
          }}
        >
          {pct(m)}
        </span>
      </div>
    ) : (
      <span style={{ color: T.ink300, fontSize: 12 }}>—</span>
    );
  }

  if (col.key === "weighted_avg_cost") {
    return (
      <span style={{ fontSize: 12, color: T.ink500 }}>
        {zar(item.weighted_avg_cost)}
      </span>
    );
  }

  if (col.key === "is_active") {
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 700,
          background: item.is_active ? T.accentLit : T.dangerLit,
          color: item.is_active ? T.accentMid : T.danger,
        }}
      >
        {item.is_active ? "Active" : "Hidden"}
      </span>
    );
  }

  if (col.key === "is_featured") {
    return item.is_featured ? (
      <span style={{ color: T.amber, fontSize: 13 }}>★ Yes</span>
    ) : (
      <span style={{ color: T.ink300, fontSize: 12 }}>—</span>
    );
  }

  if (col.key === "_actions") {
    return (
      <div
        style={{
          display: "flex",
          gap: 4,
          justifyContent: "center",
          opacity: hover ? 1 : 0,
          transition: "opacity 0.12s",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <ActionBtn
          label="✎"
          title="Open details"
          onClick={() => onOpenPanel(item)}
          color={T.accentMid}
          T={T}
        />
        <ActionBtn
          label="⊞"
          title="Full edit"
          onClick={() => onOpenEdit(item)}
          color={T.blue}
          T={T}
        />
      </div>
    );
  }

  const val = item[col.key];
  return (
    <span
      style={{
        fontSize: 12,
        color: T.ink700,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "block",
      }}
    >
      {val ?? "—"}
    </span>
  );
}

// ── Filter dropdown ───────────────────────────────────────────────────────
function FilterDropdown({
  col,
  items,
  value,
  onChange,
  onClose,
  getOptions,
  getRange,
  T,
}) {
  const isNum = col.type === "number";
  const isBool = col.type === "boolean";
  const [search, setSearch] = useState("");

  const range = isNum ? getRange(col.key) : null;
  const [localMin, setLocalMin] = useState(range?.min ?? 0);
  const [localMax, setLocalMax] = useState(range?.max ?? 100);

  const options =
    !isNum && !isBool
      ? getOptions(col.key).filter(
          (o) =>
            !search || o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : [];
  const checked = Array.isArray(value) ? value : [];

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        zIndex: 600,
        width: 220,
        padding: 12,
        fontFamily: T.font,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.ink400,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}
      >
        Filter: {col.label}
      </div>

      {isNum && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              value={localMin}
              onChange={(e) => setLocalMin(Number(e.target.value))}
              placeholder="Min"
              style={{ ...smallInput(T), width: "50%" }}
            />
            <input
              type="number"
              value={localMax}
              onChange={(e) => setLocalMax(Number(e.target.value))}
              placeholder="Max"
              style={{ ...smallInput(T), width: "50%" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                onChange({ min: localMin, max: localMax });
                onClose();
              }}
              style={filterApplyBtn(T)}
            >
              Apply
            </button>
            <button
              onClick={() => {
                onChange(null);
                onClose();
              }}
              style={filterClearBtn(T)}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {isBool && (
        <div>
          {[
            { v: null, l: "All" },
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ].map(({ v, l }) => (
            <label
              key={l}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                fontSize: 13,
                cursor: "pointer",
                color: T.ink700,
              }}
            >
              <input
                type="radio"
                checked={value === v}
                onChange={() => {
                  onChange(v);
                  if (v !== null) onClose();
                }}
                style={{ accentColor: T.accent }}
              />
              {l}
            </label>
          ))}
        </div>
      )}

      {!isNum && !isBool && (
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ ...smallInput(T), marginBottom: 8 }}
          />
          <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 8 }}>
            {options.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 0",
                  fontSize: 12.5,
                  cursor: "pointer",
                  color: T.ink700,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked.includes(opt.value)}
                  onChange={() => {
                    const next = checked.includes(opt.value)
                      ? checked.filter((v) => v !== opt.value)
                      : [...checked, opt.value];
                    onChange(next.length ? next : null);
                  }}
                  style={{ accentColor: T.accent, flexShrink: 0 }}
                />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </span>
                <span style={{ fontSize: 10, color: T.ink300, flexShrink: 0 }}>
                  {opt.count}
                </span>
              </label>
            ))}
            {options.length === 0 && (
              <div style={{ color: T.ink400, fontSize: 12 }}>No matches</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                onChange(options.map((o) => o.value));
              }}
              style={filterApplyBtn(T)}
            >
              All
            </button>
            <button
              onClick={() => {
                onChange(null);
                onClose();
              }}
              style={filterClearBtn(T)}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Micro-components ──────────────────────────────────────────────────────
function ActionBtn({ label, title, onClick, color, T }) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: `1px solid ${h ? color : T.border}`,
        background: h ? color + "15" : T.white,
        color: h ? color : T.ink400,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: T.font,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────
function microBtn(T) {
  return {
    padding: "5px 12px",
    borderRadius: 6,
    border: `1px solid ${T.border}`,
    background: T.white,
    color: T.ink500,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: T.font,
    whiteSpace: "nowrap",
  };
}
function smallInput(T) {
  return {
    width: "100%",
    padding: "6px 8px",
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: T.font,
    color: T.ink900,
    outline: "none",
  };
}
function filterApplyBtn(T) {
  return {
    ...microBtn(T),
    background: T.accent,
    color: "#fff",
    border: "none",
    fontWeight: 700,
  };
}
function filterClearBtn(T) {
  return { ...microBtn(T), color: T.ink400 };
}
