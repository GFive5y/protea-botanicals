// src/components/GlobalSearch.js
// WP-SEARCH v1.0 — Global Command Palette
// Position: above breadcrumb in TenantPortal main column
// Trigger: visible bar (always) + Ctrl+K / Cmd+K shortcut
// Scope v1: admin/owner = all 8 types (products, brands, categories,
//           staff, customers, suppliers, orders, navigation)
// Match highlighting: brand green (#1A3D2B), fontWeight 600
// Navigation: onNavigate (tab only) | onNavigateWithFilter (tab + pre-filter)

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../services/supabaseClient";
import {
  Search, Package, Tag, LayoutGrid, User, Users,
  Truck, ShoppingCart, ArrowRight, X,
} from "lucide-react";

const T = {
  accent: "#1A3D2B", accentMid: "#2D6A4F", accentLit: "#E8F5EE",
  ink900: "#0D0D0D", ink700: "#2C2C2C", ink500: "#474747",
  ink400: "#6B6B6B", ink300: "#999999", ink150: "#E2E2E2",
  ink075: "#F4F4F3", ink050: "#FAFAF9",
  border: "#ECEAE6",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
};

const ROLE_TYPES = {
  admin:      ["products","brands","categories","staff","customers","suppliers","orders","nav"],
  management: ["products","brands","categories","customers","suppliers","orders","nav"],
  hr:         ["staff","nav"],
  staff:      ["products","brands","categories","nav"],
  retailer:   ["products","brands","categories","nav"],
  customer:   ["nav"],
};

const CATEGORY_LABELS = {
  flower: "Flower", accessory: "Accessory", concentrate: "Concentrate",
  edible: "Edible", hardware: "Hardware",
  raw_material: "Raw Material", finished_product: "Finished Product",
};

const NAV_ITEMS = [
  { id: "overview",      label: "Dashboard",        section: "Home" },
  { id: "stock",         label: "Stock",             section: "Inventory" },
  { id: "catalog",       label: "Smart Catalog",     section: "Inventory" },
  { id: "suppliers",     label: "Suppliers",         section: "Ordering" },
  { id: "procurement",   label: "Purchase Orders",   section: "Ordering" },
  { id: "documents",     label: "Documents",         section: "Ordering" },
  { id: "trading",       label: "Daily Trading",     section: "Daily Operations" },
  { id: "cashup",        label: "Cash-Up",           section: "Daily Operations" },
  { id: "pos",           label: "POS Till",          section: "Sales" },
  { id: "pricing",       label: "Pricing",           section: "Sales" },
  { id: "loyalty",       label: "Loyalty",           section: "Sales" },
  { id: "invoices",      label: "Invoices",          section: "Sales" },
  { id: "customers",     label: "Customer 360",      section: "Customers" },
  { id: "qr-codes",      label: "QR Codes",          section: "Customers" },
  { id: "comms",         label: "Messaging",         section: "Customers" },
  { id: "pl",            label: "Profit & Loss",     section: "Reports" },
  { id: "expenses",      label: "Expenses",          section: "Reports" },
  { id: "analytics",     label: "Analytics",         section: "Reports" },
  { id: "reorder",       label: "Reorder",           section: "Reports" },
  { id: "balance-sheet", label: "Balance Sheet",     section: "Reports" },
  { id: "staff",         label: "Staff",             section: "Team" },
  { id: "roster",        label: "Roster",            section: "Team" },
  { id: "timesheets",    label: "Timesheets",        section: "Team" },
  { id: "leave",         label: "Leave",             section: "Team" },
  { id: "contracts",     label: "Contracts",         section: "Team" },
  { id: "payroll",       label: "Payroll",           section: "Team" },
  { id: "hr-calendar",   label: "HR Calendar",       section: "Team" },
];

const TYPE_CFG = {
  product:  { Icon: Package,      color: "#1A3D2B", bg: "#E8F5EE", label: "Product"  },
  brand:    { Icon: Tag,          color: "#1E3A5F", bg: "#EFF6FF", label: "Brand"    },
  category: { Icon: LayoutGrid,   color: "#374151", bg: "#F9FAFB", label: "Category" },
  staff:    { Icon: User,         color: "#166534", bg: "#F0FDF4", label: "Staff"    },
  customer: { Icon: Users,        color: "#1E3A5F", bg: "#EFF6FF", label: "Customer" },
  supplier: { Icon: Truck,        color: "#92400E", bg: "#FFFBEB", label: "Supplier" },
  order:    { Icon: ShoppingCart, color: "#1E3A5F", bg: "#EFF6FF", label: "Order"    },
  nav:      { Icon: ArrowRight,   color: "#6B6B6B", bg: "#F4F4F3", label: "Go to"   },
};

function HL({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: "transparent", color: "#1A3D2B", fontWeight: 600 }}>{part}</mark>
          : part
      )}
    </>
  );
}

export default function GlobalSearch({ tenantId, role, onNavigate, onNavigateWithFilter }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({
    products: [], brands: [], categories: [],
    staff: [], customers: [], suppliers: [], orders: [], nav: [],
  });
  const [selIdx, setSelIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const allowedTypes = ROLE_TYPES[role] || ROLE_TYPES.staff;

  // Ctrl+K / Cmd+K + nuai:open-search from breadcrumb trigger
  useEffect(() => {
    const keyHandler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", keyHandler);
    window.addEventListener("nuai:open-search", openHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("nuai:open-search", openHandler);
    };
  }, []);

  // Auto-focus + reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelIdx(0);
      setResults({ products: [], brands: [], categories: [], staff: [], customers: [], suppliers: [], orders: [], nav: [] });
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults({ products: [], brands: [], categories: [], staff: [], customers: [], suppliers: [], orders: [], nav: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const term = `%${q.trim()}%`;
    try {
      const run = (p) => allowedTypes.includes(p);
      const none = Promise.resolve({ data: [] });

      const settled = await Promise.allSettled([
        run("products")
          ? supabase.from("inventory_items").select("id,name,sku,category,subcategory,brand,quantity_on_hand,sell_price")
              .eq("tenant_id", tenantId).eq("is_active", true)
              .or(`name.ilike.${term},sku.ilike.${term},brand.ilike.${term},description.ilike.${term}`)
              .limit(4)
          : none,
        run("brands")
          ? supabase.from("inventory_items").select("brand").eq("tenant_id", tenantId).eq("is_active", true)
              .ilike("brand", term).not("brand", "is", null).limit(20)
          : none,
        run("categories")
          ? supabase.from("inventory_items").select("category,subcategory").eq("tenant_id", tenantId).eq("is_active", true)
              .or(`subcategory.ilike.${term},category.ilike.${term}`).limit(20)
          : none,
        run("staff")
          ? supabase.from("staff_profiles").select("id,full_name,preferred_name,job_title,department,status,employment_type")
              .eq("tenant_id", tenantId)
              .or(`full_name.ilike.${term},preferred_name.ilike.${term},job_title.ilike.${term}`)
              .limit(4)
          : none,
        run("customers")
          ? supabase.from("user_profiles").select("id,full_name,email,phone,loyalty_points")
              .eq("tenant_id", tenantId).eq("role", "customer")
              .or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
              .limit(4)
          : none,
        run("suppliers")
          ? supabase.from("suppliers").select("id,name,contact_name,phone")
              .eq("tenant_id", tenantId)
              .or(`name.ilike.${term},contact_name.ilike.${term}`)
              .limit(4)
          : none,
        run("orders")
          ? supabase.from("purchase_orders").select("id,po_number,status,total_amount")
              .eq("tenant_id", tenantId).ilike("po_number", term).limit(4)
          : none,
      ]);

      const get = (i) => (settled[i].status === "fulfilled" ? settled[i].value?.data || [] : []);

      const rawBrands = get(1);
      const uniqueBrands = [...new Set(rawBrands.map((r) => r.brand).filter(Boolean))].slice(0, 4);

      const rawCats = get(2);
      const catMap = {};
      rawCats.forEach((r) => {
        const key = r.subcategory ? `${r.category}::${r.subcategory}` : r.category;
        if (!catMap[key]) catMap[key] = { category: r.category, subcategory: r.subcategory || null };
      });
      const uniqueCats = Object.values(catMap).slice(0, 4);

      const qt = q.toLowerCase().trim();
      const navMatches = NAV_ITEMS.filter(
        (n) => n.label.toLowerCase().includes(qt) || n.section.toLowerCase().includes(qt)
      ).slice(0, 3);

      setResults({
        products: get(0),
        brands: uniqueBrands.map((b) => ({ brand: b })),
        categories: uniqueCats,
        staff: get(3),
        customers: get(4),
        suppliers: get(5),
        orders: get(6),
        nav: navMatches,
      });
    } catch (err) {
      console.error("GlobalSearch error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, allowedTypes]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Build flat list for keyboard nav
  const SECTIONS = [
    { key: "products",   label: "Products",     type: "product"  },
    { key: "brands",     label: "Brands",       type: "brand"    },
    { key: "categories", label: "Categories",   type: "category" },
    { key: "staff",      label: "Staff",        type: "staff"    },
    { key: "customers",  label: "Customers",    type: "customer" },
    { key: "suppliers",  label: "Suppliers",    type: "supplier" },
    { key: "orders",     label: "Orders",       type: "order"    },
    { key: "nav",        label: "Navigate to",  type: "nav"      },
  ];
  let cursor = 0;
  const sectionsWithIdx = SECTIONS.map((sec) => {
    const items = results[sec.key] || [];
    const startIdx = cursor;
    cursor += items.length;
    return { ...sec, items, startIdx };
  });
  const totalResults = cursor;

  // Keyboard nav when modal open
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, totalResults - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        // Find selected item
        for (const sec of sectionsWithIdx) {
          const localIdx = selIdx - sec.startIdx;
          if (localIdx >= 0 && localIdx < sec.items.length) {
            handleSelect(sec.type, sec.items[localIdx]);
            break;
          }
        }
      }
      if (e.key === "Escape") {
        if (query) { setQuery(""); setSelIdx(0); }
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selIdx, totalResults, query]);

  function handleSelect(type, d) {
    setOpen(false);
    switch (type) {
      case "product":  onNavigateWithFilter("catalog",      { q: d.name });                                              break;
      case "brand":    onNavigateWithFilter("catalog",      { q: d.brand });                                             break;
      case "category": onNavigateWithFilter("stock",        { category: d.category, subcategory: d.subcategory });       break;
      case "staff":    onNavigateWithFilter("staff",        { q: d.preferred_name || d.full_name });                     break;
      case "customer": onNavigateWithFilter("customers",    { q: d.full_name || d.phone || d.email });                   break;
      case "supplier": onNavigate("suppliers");                                                                           break;
      case "order":    onNavigate("procurement");                                                                         break;
      case "nav":      onNavigate(d.id);                                                                                 break;
      default: break;
    }
  }

  function fmtPrice(p) {
    if (!p || parseFloat(p) <= 0) return "No price";
    return `R${parseFloat(p).toFixed(2)}`;
  }

  return (
    <>
      {/* ── OVERLAY MODAL ── trigger lives in TenantPortal breadcrumb */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.42)",
            zIndex: 500,
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "10vh",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              width: "100%", maxWidth: 640, margin: "0 16px",
              background: "#fff",
              borderRadius: 12,
              border: `1px solid ${T.ink150}`,
              overflow: "hidden",
              maxHeight: "70vh",
              display: "flex", flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 18px",
              borderBottom: `0.5px solid ${T.border}`,
              flexShrink: 0,
            }}>
              <Search size={17} color={loading ? T.accentMid : T.ink300} strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelIdx(0); }}
                placeholder="Search products, brands, categories, staff, customers, orders…"
                style={{
                  flex: 1, border: "none", outline: "none",
                  background: "transparent", fontSize: 16,
                  color: T.ink900, fontFamily: T.font,
                }}
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setSelIdx(0); inputRef.current?.focus(); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: T.ink400, display: "flex", alignItems: "center", padding: 4,
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
              <button
                onClick={() => {
                  if (query) {
                    setQuery("");
                    setSelIdx(0);
                    inputRef.current?.focus();
                  } else {
                    setOpen(false);
                  }
                }}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  background: T.ink075,
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 3,
                  color: T.ink500,
                  fontFamily: "monospace",
                  cursor: "pointer",
                }}
              >
                Esc
              </button>
            </div>

            {/* Results area */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {(!query || query.trim().length < 2) ? (
                <div style={{
                  padding: "28px 18px", color: T.ink300, fontSize: 13,
                  fontFamily: T.font, textAlign: "center",
                }}>
                  Start typing to search across products, brands, staff, customers and more…
                </div>
              ) : loading ? (
                <div style={{ padding: "28px 18px", color: T.ink300, fontSize: 13, fontFamily: T.font, textAlign: "center" }}>
                  Searching…
                </div>
              ) : totalResults === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.ink700, marginBottom: 6, fontFamily: T.font }}>
                    No results for "{query}"
                  </div>
                  <div style={{ fontSize: 12, color: T.ink400, fontFamily: T.font }}>
                    Try a product name, SKU, brand, staff name, or customer phone number.
                  </div>
                </div>
              ) : (
                <div>
                  {sectionsWithIdx.map((sec) => {
                    if (sec.items.length === 0) return null;
                    const cfg = TYPE_CFG[sec.type];
                    return (
                      <div key={sec.key}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", color: T.ink400,
                          padding: "8px 18px 3px", fontFamily: T.font,
                        }}>
                          {sec.label}
                        </div>
                        {sec.items.map((item, i) => {
                          const absIdx = sec.startIdx + i;
                          const isSelected = absIdx === selIdx;
                          let primary = "";
                          let secondary = "";
                          switch (sec.type) {
                            case "product":
                              primary = item.name;
                              secondary = [
                                CATEGORY_LABELS[item.category] || item.category,
                                item.subcategory,
                                `${item.quantity_on_hand ?? 0} in stock`,
                                fmtPrice(item.sell_price),
                                item.sku,
                              ].filter(Boolean).join(" · ");
                              break;
                            case "brand":
                              primary = item.brand;
                              secondary = "View all " + item.brand + " products in catalog";
                              break;
                            case "category":
                              primary = item.subcategory
                                ? item.subcategory.replace(/_/g, " ")
                                : (CATEGORY_LABELS[item.category] || item.category);
                              secondary = item.subcategory
                                ? `${CATEGORY_LABELS[item.category] || item.category} · Filter Stock`
                                : "Filter Stock by this category";
                              break;
                            case "staff":
                              primary = item.preferred_name || item.full_name;
                              secondary = [item.job_title, item.department, item.status, item.employment_type]
                                .filter(Boolean).join(" · ");
                              break;
                            case "customer":
                              primary = item.full_name || item.phone || item.email;
                              secondary = [item.phone, item.email, `${item.loyalty_points ?? 0} pts`]
                                .filter(Boolean).join(" · ");
                              break;
                            case "supplier":
                              primary = item.name;
                              secondary = [item.contact_name, item.phone].filter(Boolean).join(" · ");
                              break;
                            case "order":
                              primary = item.po_number;
                              secondary = [item.status, item.total_amount ? `R${parseFloat(item.total_amount).toFixed(2)}` : null]
                                .filter(Boolean).join(" · ");
                              break;
                            case "nav":
                              primary = item.label;
                              secondary = item.section;
                              break;
                            default: break;
                          }
                          return (
                            <div
                              key={i}
                              onMouseEnter={() => setSelIdx(absIdx)}
                              onClick={() => handleSelect(sec.type, item)}
                              style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "9px 18px", cursor: "pointer",
                                background: isSelected ? T.accentLit : "transparent",
                                borderLeft: `3px solid ${isSelected ? T.accent : "transparent"}`,
                              }}
                            >
                              <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: cfg.bg, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <cfg.Icon size={15} color={cfg.color} strokeWidth={1.75} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: T.ink900, fontFamily: T.font }}>
                                  <HL text={primary} query={query} />
                                </div>
                                {secondary && (
                                  <div style={{
                                    fontSize: 11, color: T.ink400, fontFamily: T.font,
                                    marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>
                                    {secondary}
                                  </div>
                                )}
                              </div>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: "2px 7px",
                                borderRadius: 4, background: cfg.bg, color: cfg.color,
                                flexShrink: 0, fontFamily: T.font,
                                textTransform: "uppercase", letterSpacing: "0.06em",
                              }}>
                                {cfg.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {totalResults > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "10px 18px",
                borderTop: `0.5px solid ${T.border}`,
                flexShrink: 0, background: T.ink050,
              }}>
                {[["↑↓", "navigate"], ["↵", "open"], ["Esc", "close"]].map(([k, lbl]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{
                      fontSize: 10, padding: "1px 5px", background: "#fff",
                      border: `1px solid ${T.ink150}`, borderRadius: 3,
                      color: T.ink500, fontFamily: "monospace", fontWeight: 600,
                    }}>{k}</span>
                    <span style={{ fontSize: 11, color: T.ink400, fontFamily: T.font }}>{lbl}</span>
                  </div>
                ))}
                <div style={{ marginLeft: "auto", fontSize: 11, color: T.ink300, fontFamily: T.font }}>
                  {totalResults} result{totalResults !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
