// src/pages/Shop.js v2.7
// v2.7: CART INTEGRATION — Import useCart from CartContext, call addToCart(product)
//       on "Add to Cart" click. Toast now says "added to cart" (not "coming soon").
//       Cart badge in NavBar updates in real time.
// v2.6: ADD TO CART FIX — Removed navigate("/account") which chain-redirected to /loyalty
//       via role-based redirect. Now shows inline toast "added — cart coming soon".
//       No navigation away from shop page. Ready for CartContext integration (WP next).
// v2.5: STRAIN DATA FIX — All 18 strains now extracted DIRECTLY from ProductVerification.js v2.3.
//       69 field mismatches corrected (types, colors, gradients, icons, lines, taglines).
//       Cinnamon Kush Cake → Live Line (was wrongly Pure Terpenes).
//       Sweet Watermelon → Enhancer Line (was wrongly Palate).
//       ZKZ → Live Plus+ Line (was wrongly Live).
//       All typeColors, accentColors, gradients, icons now 1:1 with PV.js.
// v2.4: WP2 UX/UI REDESIGN — Cream background matching Landing + ProductVerification aesthetic.
//       Premium botanical feel: cream bg (#faf9f6), white cards, subtle accents.
//       Category filter bar, refined product cards with strain gradients as accents.
//       Mobile responsive @768px + @480px. All 36 vapes + 6 Coming Soon preserved.
// v2.3: 36 vape products (18 strains × 2 formats) + 6 Coming Soon category cards.
//       Pricing: R800 (1ml Cart), R1,600 (2ml Pen).
// v2.1: Removed custom nav — NavBar in App.js handles navigation + auth state.
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

// ── Strain Data (EXTRACTED DIRECTLY from ProductVerification.js v2.3) ────────
// Source of truth: PV.js STRAINS object — every field is a 1:1 copy.
const STRAINS = [
  // ── Pure Terpenes Line (2 strains) ──
  {
    id: "pineapple-express",
    name: "Pineapple Express",
    line: "Pure Terpenes Line",
    lineShort: "Pure Terpenes",
    type: "Sativa-Dominant Hybrid",
    typeColor: "#52b788",
    accentColor: "#e8a020",
    gradientFrom: "#1b4332",
    gradientTo: "#2d6a4f",
    icon: "⬡",
    tagline: "Vibrant. Tropical. Energising.",
    effects: ["Euphoric", "Creative", "Uplifting"],
  },
  {
    id: "wedding-cake",
    name: "Wedding Cake",
    line: "Pure Terpenes Line",
    lineShort: "Pure Terpenes",
    type: "Indica-Dominant Hybrid",
    typeColor: "#c9a84c",
    accentColor: "#e8c870",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a5a2a",
    icon: "⬡",
    tagline: "Rich. Vanilla. Deeply Euphoric.",
    effects: ["Euphoric", "Relaxing", "Happy"],
  },

  // ── Palate Line (4 strains) ──
  {
    id: "gelato-41",
    name: "Gelato #41",
    line: "Palate Line",
    lineShort: "Palate",
    type: "Indica-Dominant Hybrid",
    typeColor: "#9b6b9e",
    accentColor: "#c084d4",
    gradientFrom: "#2a1a3e",
    gradientTo: "#5a2d7a",
    icon: "◉",
    tagline: "Sweet. Creamy. Deeply Relaxing.",
    effects: ["Relaxing", "Euphoric", "Creative"],
  },
  {
    id: "peaches-and-cream",
    name: "Peaches & Cream",
    line: "Palate Line",
    lineShort: "Palate",
    type: "Indica-Dominant Hybrid",
    typeColor: "#e8946a",
    accentColor: "#f0a878",
    gradientFrom: "#2e1a1a",
    gradientTo: "#6a3a2a",
    icon: "◉",
    tagline: "Lush. Creamy. Blissful.",
    effects: ["Relaxing", "Happy", "Euphoric"],
  },
  {
    id: "purple-punch",
    name: "Purple Punch",
    line: "Palate Line",
    lineShort: "Palate",
    type: "Indica",
    typeColor: "#7b4f9e",
    accentColor: "#a06cc8",
    gradientFrom: "#1a0e2e",
    gradientTo: "#4a2070",
    icon: "◉",
    tagline: "Grape. Berry. Knockout Calm.",
    effects: ["Sedating", "Relaxing", "Sleepy"],
  },
  {
    id: "mimosa",
    name: "Mimosa",
    line: "Palate Line",
    lineShort: "Palate",
    type: "Sativa-Dominant Hybrid",
    typeColor: "#e8b830",
    accentColor: "#f0d060",
    gradientFrom: "#2e2a0e",
    gradientTo: "#6a5a1a",
    icon: "◉",
    tagline: "Bright. Citrus. Morning Energy.",
    effects: ["Energising", "Uplifting", "Focused"],
  },

  // ── Live Line (4 strains) ──
  {
    id: "cinnamon-kush-cake",
    name: "Cinnamon Kush Cake",
    line: "Live Line",
    lineShort: "Live",
    type: "Indica-Dominant",
    typeColor: "#c0764a",
    accentColor: "#d4894a",
    gradientFrom: "#2a1a0e",
    gradientTo: "#7c3a10",
    icon: "◈",
    tagline: "Warm. Spiced. Evening Comfort.",
    effects: ["Deeply Relaxing", "Sedating", "Body Calm"],
  },
  {
    id: "rntz",
    name: "RNTZ",
    line: "Live Line",
    lineShort: "Live",
    type: "Balanced Hybrid",
    typeColor: "#d4644a",
    accentColor: "#e87860",
    gradientFrom: "#2e0e0e",
    gradientTo: "#6a2020",
    icon: "◈",
    tagline: "Sweet. Fruity. Perfectly Balanced.",
    effects: ["Euphoric", "Relaxing", "Happy"],
  },
  {
    id: "blue-zushi",
    name: "Blue Zushi",
    line: "Live Line",
    lineShort: "Live",
    type: "Indica-Dominant Hybrid",
    typeColor: "#4a6ebe",
    accentColor: "#6a8ed8",
    gradientFrom: "#0e1a2e",
    gradientTo: "#1a3a6a",
    icon: "◈",
    tagline: "Exotic. Gassy. Deep Relaxation.",
    effects: ["Deeply Relaxing", "Euphoric", "Sleepy"],
  },
  {
    id: "mac",
    name: "MAC",
    line: "Live Line",
    lineShort: "Live",
    type: "Balanced Hybrid",
    typeColor: "#8ab84a",
    accentColor: "#a0d060",
    gradientFrom: "#1a2e0e",
    gradientTo: "#3a5a1a",
    icon: "◈",
    tagline: "Citrus. Floral. Alien Potency.",
    effects: ["Creative", "Uplifting", "Focused"],
  },

  // ── Enhancer Line (4 strains) ──
  {
    id: "sweet-watermelon",
    name: "Sweet Watermelon",
    line: "Enhancer Line",
    lineShort: "Enhancer",
    type: "Sativa-Hybrid",
    typeColor: "#e05a7a",
    accentColor: "#f07090",
    gradientFrom: "#1a1a2e",
    gradientTo: "#6a1a3a",
    icon: "◎",
    tagline: "Fresh. Juicy. Uplifting.",
    effects: ["Uplifting", "Refreshing", "Happy"],
  },
  {
    id: "pear-jam",
    name: "Pear Jam",
    line: "Enhancer Line",
    lineShort: "Enhancer",
    type: "Hybrid",
    typeColor: "#8aba4a",
    accentColor: "#a8d468",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a6a2a",
    icon: "◎",
    tagline: "Ripe. Jammy. Smooth.",
    effects: ["Relaxing", "Happy", "Smooth"],
  },
  {
    id: "melon-lychee",
    name: "Melon Lychee",
    line: "Enhancer Line",
    lineShort: "Enhancer",
    type: "Sativa-Hybrid",
    typeColor: "#50b890",
    accentColor: "#6ad4a8",
    gradientFrom: "#0e2e2a",
    gradientTo: "#1a5a4a",
    icon: "◎",
    tagline: "Tropical. Exotic. Refreshing.",
    effects: ["Uplifting", "Refreshing", "Happy"],
  },
  {
    id: "tutti-frutti",
    name: "Tutti Frutti",
    line: "Enhancer Line",
    lineShort: "Enhancer",
    type: "Sativa-Hybrid",
    typeColor: "#e06a90",
    accentColor: "#f080a8",
    gradientFrom: "#2e1a2a",
    gradientTo: "#6a2a5a",
    icon: "◎",
    tagline: "Candy. Fruity. Playful.",
    effects: ["Uplifting", "Happy", "Energising"],
  },

  // ── Live Plus+ Line (4 strains) ──
  {
    id: "zkz",
    name: "ZKZ",
    line: "Live Plus+ Line",
    lineShort: "Live Plus+",
    type: "Balanced Hybrid",
    typeColor: "#4a9eba",
    accentColor: "#5ab8d4",
    gradientFrom: "#0a1a2e",
    gradientTo: "#1a4a6e",
    icon: "◇",
    tagline: "Sweet. Candy. Award-Winning.",
    effects: ["Euphoric", "Relaxing", "Happy"],
  },
  {
    id: "purple-crack",
    name: "Purple Crack",
    line: "Live Plus+ Line",
    lineShort: "Live Plus+",
    type: "Sativa-Dominant Hybrid",
    typeColor: "#9a5ab8",
    accentColor: "#b478d0",
    gradientFrom: "#1a0e2e",
    gradientTo: "#3a1a6a",
    icon: "◇",
    tagline: "Berry. Electric. Intense Focus.",
    effects: ["Focused", "Energising", "Uplifting"],
  },
  {
    id: "lemonhead-plus",
    name: "Lemonhead+",
    line: "Live Plus+ Line",
    lineShort: "Live Plus+",
    type: "Sativa-Dominant",
    typeColor: "#d4c020",
    accentColor: "#e8d840",
    gradientFrom: "#2e2e0a",
    gradientTo: "#5a5a1a",
    icon: "◇",
    tagline: "Zesty. Sharp. Pure Sativa Energy.",
    effects: ["Energising", "Focused", "Uplifting"],
  },
  {
    id: "sherblato-plus",
    name: "Sherblato+",
    line: "Live Plus+ Line",
    lineShort: "Live Plus+",
    type: "Indica-Dominant Hybrid",
    typeColor: "#c06090",
    accentColor: "#d878a8",
    gradientFrom: "#2e0e1e",
    gradientTo: "#6a1a4a",
    icon: "◇",
    tagline: "Creamy. Sweet. Luxurious Calm.",
    effects: ["Relaxing", "Euphoric", "Sleepy"],
  },
];

// ── Product Catalog (36 vapes + 6 Coming Soon) ──────────────────────────────
const VAPE_PRODUCTS = [];
STRAINS.forEach((s) => {
  VAPE_PRODUCTS.push({
    id: `${s.id}-1ml`,
    strainId: s.id,
    name: s.name,
    strain: s,
    format: "1ml Cartridge",
    formatShort: "1ml Cart",
    price: 800,
    thc: "93.55%",
    badge: "510 Thread",
  });
  VAPE_PRODUCTS.push({
    id: `${s.id}-2ml`,
    strainId: s.id,
    name: s.name,
    strain: s,
    format: "2ml Disposable Pen",
    formatShort: "2ml Pen",
    price: 1600,
    thc: "93.55%",
    badge: "All-in-One",
  });
});

const COMING_SOON = [
  {
    id: "cs-wellness",
    category: "Wellness",
    icon: "🌿",
    description:
      "CBD tinctures, balms & wellness supplements crafted from premium botanicals.",
  },
  {
    id: "cs-edibles",
    category: "Edibles",
    icon: "🍯",
    description:
      "Artisan-crafted edibles — gummies, chocolates & infused treats.",
  },
  {
    id: "cs-creams",
    category: "Topicals",
    icon: "✦",
    description:
      "Luxurious CBD creams, serums & body care for targeted relief.",
  },
  {
    id: "cs-candles",
    category: "Candles",
    icon: "🕯",
    description: "Terpene-infused candles for aromatherapy and ambiance.",
  },
  {
    id: "cs-terpenes",
    category: "Terpenes",
    icon: "💧",
    description:
      "Eybna botanical terpene blends for connoisseurs and formulators.",
  },
  {
    id: "cs-accessories",
    category: "Accessories",
    icon: "⚙",
    description: "Premium vaping accessories, storage & lifestyle essentials.",
  },
];

const FILTER_OPTIONS = [
  { key: "all", label: "All Products" },
  { key: "vapes", label: "Vapes" },
  { key: "pure-terpenes", label: "Pure Terpenes", line: "Pure Terpenes Line" },
  { key: "palate", label: "Palate", line: "Palate Line" },
  { key: "live", label: "Live", line: "Live Line" },
  { key: "enhancer", label: "Enhancer", line: "Enhancer Line" },
  { key: "live-plus", label: "Live Plus+", line: "Live Plus+ Line" },
  { key: "coming-soon", label: "Coming Soon" },
];

// ── Styles ───────────────────────────────────────────────────────────────────
const shopStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .shop-card {
    background: white; border: 1px solid #e8e0d4; border-radius: 2px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04); overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .shop-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .shop-btn {
    font-family: 'Jost', sans-serif; padding: 11px 28px; background: #1b4332;
    color: white; border: none; border-radius: 2px; font-size: 11px;
    letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;
    transition: background 0.2s; font-weight: 500; display: inline-block;
    text-decoration: none; text-align: center;
  }
  .shop-btn:hover { background: #2d6a4f; }
  .shop-btn-outline {
    font-family: 'Jost', sans-serif; padding: 10px 24px; background: transparent;
    border: 1px solid #1b4332; color: #1b4332; border-radius: 2px;
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    cursor: pointer; transition: all 0.2s; font-weight: 500;
    text-decoration: none; text-align: center; display: inline-block;
  }
  .shop-btn-outline:hover { background: #1b4332; color: white; }
  .shop-filter-btn {
    font-family: 'Jost', sans-serif; padding: 8px 20px; border: 1px solid #d8d0c4;
    border-radius: 2px; background: white; color: #666; font-size: 11px;
    letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer;
    transition: all 0.2s; font-weight: 400; white-space: nowrap;
  }
  .shop-filter-btn:hover { border-color: #1b4332; color: #1b4332; }
  .shop-filter-btn.active { background: #1b4332; color: white; border-color: #1b4332; }
  .shop-effect-tag {
    font-family: 'Jost', sans-serif; font-size: 10px; letter-spacing: 0.1em;
    text-transform: uppercase; padding: 3px 10px; border-radius: 2px;
    font-weight: 400;
  }
  .shop-format-badge {
    font-family: 'Jost', sans-serif; font-size: 10px; letter-spacing: 0.15em;
    text-transform: uppercase; padding: 4px 12px; border-radius: 2px;
    font-weight: 500;
  }
  .cs-card {
    background: #f9f7f2; border: 1px dashed #d8d0c4; border-radius: 2px;
    padding: 40px 28px; text-align: center; transition: border-color 0.2s;
  }
  .cs-card:hover { border-color: #b5935a; }
  .shop-footer-link {
    font-family: 'Jost', sans-serif; font-size: 12px; letter-spacing: 0.2em;
    text-transform: uppercase; color: #555; text-decoration: none; transition: color 0.2s;
  }
  .shop-footer-link:hover { color: #52b788; }
  .section-divider {
    width: 100%; height: 1px;
    background: linear-gradient(to right, transparent, #e0d8cc, transparent); margin: 48px 0;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up   { animation: fadeUp 0.6s ease forwards; }
  .fade-up-2 { animation: fadeUp 0.6s 0.1s ease forwards; opacity: 0; }
  .fade-up-3 { animation: fadeUp 0.6s 0.2s ease forwards; opacity: 0; }
  @media (max-width: 768px) {
    .shop-hero-inner { padding: 40px 20px 44px !important; }
    .shop-body-inner { padding: 32px 20px !important; }
    .shop-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; }
    .shop-filter-bar { gap: 6px !important; padding: 0 16px !important; }
    .shop-filter-btn { padding: 6px 14px !important; font-size: 10px !important; }
    .shop-hero-title { font-size: 42px !important; }
    .shop-footer-outer { padding: 36px 20px !important; }
    .shop-footer-wrap { flex-direction: column !important; text-align: center; }
    .shop-footer-nav { justify-content: center !important; }
    .shop-stats-row { flex-direction: column !important; gap: 12px !important; }
  }
  @media (max-width: 480px) {
    .shop-hero-inner { padding: 32px 16px 36px !important; }
    .shop-body-inner { padding: 24px 16px !important; }
    .shop-grid { grid-template-columns: 1fr !important; }
    .shop-hero-title { font-size: 32px !important; }
  }
`;

// ── Component ────────────────────────────────────────────────────────────────
export default function Shop() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [filter, setFilter] = useState("all");
  const [cartToast, setCartToast] = useState(null);

  const handleAddToCart = (product) => {
    addToCart(product);
    setCartToast(product.name + " — " + product.formatShort);
    setTimeout(() => setCartToast(null), 2200);
  };

  // Filter logic
  const showVapes =
    filter === "all" ||
    filter === "vapes" ||
    FILTER_OPTIONS.find((f) => f.key === filter)?.line;
  const showCS = filter === "all" || filter === "coming-soon";
  const lineFilter = FILTER_OPTIONS.find((f) => f.key === filter)?.line;

  const filteredVapes = lineFilter
    ? VAPE_PRODUCTS.filter((p) => p.strain.line === lineFilter)
    : showVapes
      ? VAPE_PRODUCTS
      : [];

  const filteredCS = showCS ? COMING_SOON : [];

  const totalShowing = filteredVapes.length + filteredCS.length;

  return (
    <div
      style={{
        fontFamily: "'Jost', sans-serif",
        minHeight: "100vh",
        background: "#faf9f6",
        color: "#1a1a1a",
      }}
    >
      <style>{shopStyles}</style>

      {/* ── HERO ── */}
      <div
        style={{
          background:
            "linear-gradient(160deg, #1b4332 0%, #2d6a4f 60%, #1b4332dd 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.04) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(82,183,136,0.06)",
            pointerEvents: "none",
          }}
        />

        <div
          className="shop-hero-inner"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "56px 40px 52px",
          }}
        >
          <div className="fade-up" style={{ marginBottom: 12 }}>
            <span
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: "#52b788",
                fontWeight: 500,
              }}
            >
              Protea Botanicals · Online Store
            </span>
          </div>

          <h1
            className="shop-font fade-up-2 shop-hero-title"
            style={{
              fontSize: "clamp(48px, 8vw, 72px)",
              fontWeight: 300,
              color: "#faf9f6",
              lineHeight: 1,
              marginBottom: 14,
              letterSpacing: "0.03em",
            }}
          >
            Shop
          </h1>

          <p
            className="body-font fade-up-3"
            style={{
              fontSize: "clamp(14px, 2vw, 16px)",
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 0,
              fontWeight: 300,
              maxWidth: 600,
            }}
          >
            Premium cannabis vapes · 18 Eybna terpene strains · Lab verified
          </p>

          {/* Stats row */}
          <div
            className="shop-stats-row"
            style={{
              display: "flex",
              gap: 32,
              marginTop: 28,
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "18", label: "Strains" },
              { value: "93.55%", label: "D9-THC" },
              { value: "5", label: "Eybna Lines" },
              { value: "R800+", label: "From" },
            ].map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <span
                  className="shop-font"
                  style={{
                    fontSize: 28,
                    fontWeight: 300,
                    color: "#faf9f6",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </span>
                <span
                  className="body-font"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.35)",
                    marginTop: 4,
                    fontWeight: 400,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{ background: "#f4f0e8", borderBottom: "1px solid #e8e0d4" }}>
        <div
          className="shop-filter-bar"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "16px 40px",
            display: "flex",
            gap: 8,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              className={`shop-filter-btn${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div
        className="shop-body-inner"
        style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 40px" }}
      >
        {/* Result count */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <span
            className="body-font"
            style={{ fontSize: 13, color: "#888", fontWeight: 300 }}
          >
            Showing {totalShowing} {totalShowing === 1 ? "product" : "products"}
            {filter !== "all" && (
              <>
                {" "}
                ·{" "}
                <span
                  style={{
                    color: "#1b4332",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                  onClick={() => setFilter("all")}
                >
                  Clear filter
                </span>
              </>
            )}
          </span>
        </div>

        {/* ── VAPE GRID ── */}
        {filteredVapes.length > 0 && (
          <>
            {(filter === "all" || filter === "coming-soon") &&
              filteredCS.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <span
                    className="body-font"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.35em",
                      textTransform: "uppercase",
                      color: "#52b788",
                      fontWeight: 500,
                    }}
                  >
                    Vape Collection
                  </span>
                </div>
              )}
            <div
              className="shop-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 24,
                marginBottom: 48,
              }}
            >
              {filteredVapes.map((product) => (
                <VapeCard
                  key={product.id}
                  product={product}
                  navigate={navigate}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </>
        )}

        {/* ── COMING SOON GRID ── */}
        {filteredCS.length > 0 && (
          <>
            {filteredVapes.length > 0 && <div className="section-divider" />}
            <div style={{ marginBottom: 16 }}>
              <span
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "#b5935a",
                  fontWeight: 500,
                }}
              >
                Coming Soon
              </span>
            </div>
            <div
              className="shop-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 24,
                marginBottom: 48,
              }}
            >
              {filteredCS.map((cs) => (
                <div key={cs.id} className="cs-card">
                  <div style={{ fontSize: 36, marginBottom: 16 }}>
                    {cs.icon}
                  </div>
                  <span
                    className="shop-format-badge"
                    style={{
                      background: "rgba(181,147,90,0.12)",
                      color: "#b5935a",
                      border: "1px solid rgba(181,147,90,0.25)",
                      marginBottom: 12,
                      display: "inline-block",
                    }}
                  >
                    Coming Soon
                  </span>
                  <h3
                    className="shop-font"
                    style={{
                      fontSize: 24,
                      fontWeight: 300,
                      color: "#1a1a1a",
                      margin: "12px 0 8px",
                    }}
                  >
                    {cs.category}
                  </h3>
                  <p
                    className="body-font"
                    style={{
                      fontSize: 13,
                      color: "#888",
                      fontWeight: 300,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {cs.description}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {totalShowing === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p
              className="body-font"
              style={{ color: "#888", fontSize: 15, fontWeight: 300 }}
            >
              No products match this filter.
            </p>
            <button
              className="shop-btn"
              style={{ marginTop: 16 }}
              onClick={() => setFilter("all")}
            >
              Show All Products
            </button>
          </div>
        )}
      </div>

      {/* ── LOYALTY CTA BANNER ── */}
      <div style={{ background: "linear-gradient(135deg, #1b4332, #2d6a4f)" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "48px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <span
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#52b788",
                fontWeight: 500,
              }}
            >
              Protea Rewards
            </span>
            <h2
              className="shop-font"
              style={{
                fontSize: 32,
                fontWeight: 300,
                color: "#faf9f6",
                margin: "8px 0 4px",
              }}
            >
              Earn Points on Every Purchase
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                fontWeight: 300,
                margin: 0,
              }}
            >
              Scan your product QR code to earn loyalty points and unlock
              exclusive rewards.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="shop-btn"
              style={{ background: "white", color: "#1b4332" }}
              onClick={() => navigate("/loyalty")}
            >
              My Points
            </button>
            <button
              className="shop-btn"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
              }}
              onClick={() => navigate("/redeem")}
            >
              Redeem Rewards
            </button>
          </div>
        </div>
      </div>

      {/* ── CART TOAST ── */}
      {cartToast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1b4332",
            color: "white",
            padding: "14px 32px",
            borderRadius: 2,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "fadeUp 0.3s ease forwards",
            maxWidth: "90vw",
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span>
          <span
            className="body-font"
            style={{ fontSize: 13, fontWeight: 400, letterSpacing: "0.05em" }}
          >
            {cartToast} added to cart
          </span>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div
        className="shop-footer-outer"
        style={{ background: "#060e09", padding: "48px 40px 36px" }}
      >
        <div
          className="shop-footer-wrap"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              className="shop-font"
              style={{
                fontSize: 20,
                color: "#faf9f6",
                fontWeight: 300,
                letterSpacing: "0.08em",
              }}
            >
              Protea Botanicals
            </span>
            <p
              className="body-font"
              style={{
                fontSize: 12,
                color: "#555",
                fontWeight: 300,
                marginTop: 8,
              }}
            >
              Premium Cannabis · South Africa
            </p>
          </div>
          <nav
            className="shop-footer-nav"
            style={{ display: "flex", gap: 24, flexWrap: "wrap" }}
          >
            <Link to="/" className="shop-footer-link">
              Home
            </Link>
            <Link to="/shop" className="shop-footer-link">
              Shop
            </Link>
            <Link to="/loyalty" className="shop-footer-link">
              Loyalty
            </Link>
            <Link to="/redeem" className="shop-footer-link">
              Rewards
            </Link>
          </nav>
        </div>
        <div
          style={{
            maxWidth: 1100,
            margin: "24px auto 0",
            borderTop: "1px solid #1a2a1a",
            paddingTop: 20,
          }}
        >
          <p
            className="body-font"
            style={{
              fontSize: 10,
              color: "#444",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              textAlign: "center",
              margin: 0,
            }}
          >
            © 2026 Protea Botanicals · Lab Verified · QR Authenticated
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Vape Product Card ────────────────────────────────────────────────────────
function VapeCard({ product, navigate, onAddToCart }) {
  const s = product.strain;
  const is2ml = product.format.includes("2ml");

  return (
    <div className="shop-card">
      {/* Strain gradient accent strip */}
      <div
        style={{
          height: 6,
          background: `linear-gradient(to right, ${s.gradientFrom}, ${s.gradientTo})`,
        }}
      />

      <div style={{ padding: "20px 24px 24px" }}>
        {/* Top row: line + format badges */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span
            className="shop-format-badge"
            style={{
              background: "rgba(82,183,136,0.08)",
              color: "#52b788",
              border: "1px solid rgba(82,183,136,0.2)",
            }}
          >
            {s.lineShort}
          </span>
          <span
            className="shop-format-badge"
            style={{
              background: is2ml
                ? "rgba(181,147,90,0.08)"
                : "rgba(27,67,50,0.06)",
              color: is2ml ? "#b5935a" : "#1b4332",
              border: `1px solid ${is2ml ? "rgba(181,147,90,0.2)" : "rgba(27,67,50,0.15)"}`,
            }}
          >
            {product.badge} · {product.formatShort}
          </span>
        </div>

        {/* Strain name + icon */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 16, color: s.accentColor }}>{s.icon}</span>
          <h3
            className="shop-font"
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: "#1a1a1a",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {s.name}
          </h3>
        </div>

        {/* Tagline */}
        <p
          className="body-font"
          style={{
            fontSize: 12,
            color: "#888",
            fontWeight: 300,
            letterSpacing: "0.12em",
            margin: "4px 0 14px",
            textTransform: "uppercase",
          }}
        >
          {s.tagline}
        </p>

        {/* Type + THC badges */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <span
            className="shop-effect-tag"
            style={{
              background: `${s.typeColor}12`,
              color: s.typeColor,
              border: `1px solid ${s.typeColor}30`,
            }}
          >
            {s.type}
          </span>
          <span
            className="shop-effect-tag"
            style={{
              background: "rgba(82,183,136,0.08)",
              color: "#2d6a4f",
              border: "1px solid rgba(82,183,136,0.2)",
            }}
          >
            THC {product.thc}
          </span>
        </div>

        {/* Effect tags */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {s.effects.map((e) => (
            <span
              key={e}
              className="shop-effect-tag"
              style={{
                background: "#f4f0e8",
                color: "#666",
                border: "1px solid #e8e0d4",
              }}
            >
              {e}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#f0ebe0", marginBottom: 18 }} />

        {/* Price + actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <span
              className="shop-font"
              style={{
                fontSize: 28,
                fontWeight: 400,
                color: "#b5935a",
                letterSpacing: "0.02em",
              }}
            >
              R{product.price.toLocaleString()}
            </span>
            <span
              className="body-font"
              style={{
                fontSize: 11,
                color: "#aaa",
                marginLeft: 6,
                fontWeight: 300,
              }}
            >
              {product.formatShort}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to={`/verify/${s.id}`}
              className="shop-btn-outline"
              style={{ padding: "8px 16px", fontSize: 10 }}
            >
              View Profile
            </Link>
            <button
              className="shop-btn"
              style={{ padding: "8px 18px", fontSize: 10 }}
              onClick={() => onAddToCart(product)}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
