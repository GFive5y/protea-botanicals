// src/pages/Shop.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { id: "all", label: "All Products", icon: "◎" },
  { id: "vapes", label: "Vapes & Cartridges", icon: "◈" },
  { id: "wellness", label: "Health & Wellness", icon: "❋" },
  { id: "edibles", label: "Edibles", icon: "⬡" },
  { id: "creams", label: "Creams & Salves", icon: "◉" },
  { id: "candles", label: "Candles", icon: "○" },
  { id: "terpenes", label: "Terpenes", icon: "◇" },
  { id: "accessories", label: "Accessories", icon: "△" },
];

const PRODUCTS = [
  // ── Vapes — real strain products (replaces 3 generic originals) ───────────
  {
    id: 101,
    name: "Pineapple Express — 1ml Cart",
    category: "vapes",
    price: 180,
    desc: "Bright pineapple and citrus with earthy pine. Energising and creative. 93.55% THC distillate, CO₂ extracted.",
    badge: "Best Seller",
    verifyId: "pineapple-express",
    line: "Pure Terpenes Line",
    type: "Sativa-Dominant",
    typeColor: "#52b788",
    gradientFrom: "#1b4332",
    gradientTo: "#2d6a4f",
    icon: "⬡",
    thc: "93.55%",
    effects: ["Uplifting", "Creative", "Energising"],
  },
  {
    id: 102,
    name: "Gelato #41 — 1ml Cart",
    category: "vapes",
    price: 180,
    desc: "Sweet cream, lavender and earthy pine. Euphoric body relaxation with creative uplift. Perfect for evenings.",
    badge: "Popular",
    verifyId: "gelato-41",
    line: "Palate Line",
    type: "Indica-Dominant",
    typeColor: "#9b6b9e",
    gradientFrom: "#2a1a3e",
    gradientTo: "#5a2d7a",
    icon: "◉",
    thc: "93.55%",
    effects: ["Relaxing", "Euphoric", "Happy"],
  },
  {
    id: 103,
    name: "Cinnamon Kush Cake — 1ml Cart",
    category: "vapes",
    price: 180,
    desc: "Warm spiced cinnamon bun with deep kush notes. Deep body sedation and sleep support. Night-time use.",
    badge: "New",
    verifyId: "cinnamon-kush-cake",
    line: "Live Line",
    type: "Indica",
    typeColor: "#c0764a",
    gradientFrom: "#2a1a0e",
    gradientTo: "#7c3a10",
    icon: "◈",
    thc: "93.55%",
    effects: ["Sedating", "Body Calm", "Sleep Aid"],
  },
  {
    id: 104,
    name: "Sweet Watermelon — 1ml Cart",
    category: "vapes",
    price: 180,
    desc: "Vibrant juicy watermelon with tropical citrus. Light, social and uplifting. Great for daytime use.",
    badge: null,
    verifyId: "sweet-watermelon",
    line: "Enhancer Line",
    type: "Sativa-Hybrid",
    typeColor: "#e05a7a",
    gradientFrom: "#1a1a2e",
    gradientTo: "#6a1a3a",
    icon: "◎",
    thc: "93.55%",
    effects: ["Uplifting", "Social", "Refreshing"],
  },
  {
    id: 105,
    name: "ZKZ — 1ml Cart",
    category: "vapes",
    price: 180,
    desc: "Award-winning candy sweetness with ripe strawberry and fruity notes. Balanced euphoria and relaxation.",
    badge: "Premium",
    verifyId: "zkz",
    line: "Live Plus+ Line",
    type: "Balanced Hybrid",
    typeColor: "#4a9eba",
    gradientFrom: "#0a1a2e",
    gradientTo: "#1a4a6e",
    icon: "◇",
    thc: "93.55%",
    effects: ["Euphoric", "Balanced", "Happy"],
  },
  {
    id: 106,
    name: "Pineapple Express — 2ml Pen",
    category: "vapes",
    price: 280,
    desc: "Full 2ml disposable vape pen with Pineapple Express profile. Ceramic coil, no burn taste. Lab verified.",
    badge: "Best Seller",
    verifyId: "pineapple-express",
    line: "Pure Terpenes Line",
    type: "Sativa-Dominant",
    typeColor: "#52b788",
    gradientFrom: "#1b4332",
    gradientTo: "#2d6a4f",
    icon: "⬡",
    thc: "93.55%",
    effects: ["Uplifting", "Creative", "Energising"],
  },
  {
    id: 107,
    name: "Gelato #41 — 2ml Pen",
    category: "vapes",
    price: 280,
    desc: "Full 2ml disposable pen with Gelato #41 profile. Consistent dosing, ceramic coil.",
    badge: "Popular",
    verifyId: "gelato-41",
    line: "Palate Line",
    type: "Indica-Dominant",
    typeColor: "#9b6b9e",
    gradientFrom: "#2a1a3e",
    gradientTo: "#5a2d7a",
    icon: "◉",
    thc: "93.55%",
    effects: ["Relaxing", "Euphoric", "Happy"],
  },
  {
    id: 108,
    name: "ZKZ — 2ml Pen",
    category: "vapes",
    price: 280,
    desc: "Full 2ml disposable pen with award-winning ZKZ candy profile. Premium Live Plus+ terpenes.",
    badge: "Premium",
    verifyId: "zkz",
    line: "Live Plus+ Line",
    type: "Balanced Hybrid",
    typeColor: "#4a9eba",
    gradientFrom: "#0a1a2e",
    gradientTo: "#1a4a6e",
    icon: "◇",
    thc: "93.55%",
    effects: ["Euphoric", "Balanced", "Happy"],
  },

  // ── All other categories — identical to original ──────────────────────────
  {
    id: 4,
    name: "CBD Wellness Drops",
    category: "wellness",
    price: 320,
    desc: "High-potency CBD tincture in MCT oil. Third-party lab tested. 1000mg per 30ml.",
    badge: "Popular",
  },
  {
    id: 5,
    name: "Sleep Support Capsules",
    category: "wellness",
    price: 260,
    desc: "CBN + CBD formula designed for deep, restful sleep. 30 capsules.",
    badge: null,
  },
  {
    id: 6,
    name: "Cannabis-Infused Gummies",
    category: "edibles",
    price: 160,
    desc: "Precisely dosed 10mg THC gummies. Consistent, delicious and discreet.",
    badge: "New",
  },
  {
    id: 7,
    name: "CBD Dark Chocolate",
    category: "edibles",
    price: 120,
    desc: "50mg CBD per bar. Single-origin dark chocolate with botanical extract.",
    badge: null,
  },
  {
    id: 8,
    name: "Recovery Body Salve",
    category: "creams",
    price: 240,
    desc: "1000mg CBD infused salve with arnica and lavender. For muscle recovery.",
    badge: "Popular",
  },
  {
    id: 9,
    name: "Face & Body Cream",
    category: "creams",
    price: 290,
    desc: "CBD-enriched moisturiser with rosehip oil. Hydrating and anti-inflammatory.",
    badge: null,
  },
  {
    id: 10,
    name: "Botanical Soy Candle",
    category: "candles",
    price: 180,
    desc: "Hand-poured soy wax infused with terpenes. 40-hour burn time.",
    badge: null,
  },
  {
    id: 11,
    name: "Terpene Candle Gift Set",
    category: "candles",
    price: 380,
    desc: "Set of 3 terpene-infused candles: Myrcene, Limonene and Linalool.",
    badge: "Gift",
  },
  {
    id: 12,
    name: "Myrcene Terpene 5ml",
    category: "terpenes",
    price: 140,
    desc: "Pure pharmaceutical-grade Myrcene. COA included. For personal blending.",
    badge: null,
  },
  {
    id: 13,
    name: "Terpene Blend Kit",
    category: "terpenes",
    price: 480,
    desc: "6 x 2ml terpene sampler kit with effects guide and COA certificates.",
    badge: "New",
  },
  {
    id: 14,
    name: "510 Cartridge Battery",
    category: "accessories",
    price: 120,
    desc: "Variable voltage 510 thread battery. USB-C charging, preheat mode.",
    badge: null,
  },
  {
    id: 15,
    name: "Premium Carrying Case",
    category: "accessories",
    price: 160,
    desc: "Smell-proof hardshell case. Holds 2 carts + battery. Discreet.",
    badge: null,
  },
];

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const navigate = useNavigate();

  const filtered =
    activeCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#faf9f6",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');
        .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Jost', sans-serif; }
        .cat-btn { transition: all 0.2s ease; }
        .cat-btn:hover { background: #2d6a4f !important; color: white !important; }
        .product-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .product-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(0,0,0,0.1) !important; }
        .verify-btn { transition: all 0.2s; }
        .verify-btn:hover { background: #2d6a4f !important; color: white !important; }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          background: "#1b4332",
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div
          onClick={() => navigate("/")}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ color: "#52b788", fontSize: "20px" }}>🌿</span>
          <span
            className="shop-font"
            style={{
              color: "#faf9f6",
              fontSize: "20px",
              letterSpacing: "0.15em",
            }}
          >
            PROTEA BOTANICALS
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {[
            ["Home", "/"],
            ["Scan & Earn", "/scan"],
            ["Wholesale", "/wholesale"],
          ].map(([label, path]) => (
            <span
              key={label}
              className="body-font"
              onClick={() => navigate(path)}
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "12px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
          padding: "64px 40px",
          textAlign: "center",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
          }}
        >
          PREMIUM SELECTION
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "12px 0",
          }}
        >
          Our Products
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "15px",
            fontWeight: 300,
          }}
        >
          Lab certified. CO₂ extracted. QR verified.
        </p>
      </div>

      {/* Category Filter */}
      <div
        style={{
          background: "#f4f0e8",
          padding: "24px 40px",
          borderBottom: "1px solid #e0d8cc",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="cat-btn body-font"
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "8px 20px",
                background: activeCategory === cat.id ? "#2d6a4f" : "white",
                color: activeCategory === cat.id ? "white" : "#555",
                border: `1px solid ${activeCategory === cat.id ? "#2d6a4f" : "#ddd"}`,
                borderRadius: "2px",
                fontSize: "12px",
                letterSpacing: "0.1em",
                cursor: "pointer",
                fontWeight: activeCategory === cat.id ? 500 : 300,
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "60px 24px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {filtered.map((product) => (
            <div
              key={product.id}
              className="product-card"
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: "2px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                position: "relative",
              }}
            >
              {/* ── Vape: strain-specific hero ── */}
              {product.verifyId ? (
                <div
                  style={{
                    height: "200px",
                    background: `linear-gradient(135deg, ${product.gradientFrom}, ${product.gradientTo})`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -30,
                      right: -30,
                      width: 110,
                      height: 110,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.05)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -20,
                      left: -20,
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "44px",
                      color: "rgba(255,255,255,0.45)",
                      marginBottom: "8px",
                    }}
                  >
                    {product.icon}
                  </span>
                  {/* THC badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      left: "12px",
                      background: "rgba(0,0,0,0.4)",
                      backdropFilter: "blur(6px)",
                      borderRadius: "2px",
                      padding: "4px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      className="body-font"
                      style={{
                        fontSize: "9px",
                        color: "#52b788",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                      }}
                    >
                      THC
                    </span>
                    <span
                      className="shop-font"
                      style={{
                        fontSize: "15px",
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      {product.thc}
                    </span>
                  </div>
                  {/* Type badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "12px",
                      background: `${product.typeColor}25`,
                      border: `1px solid ${product.typeColor}55`,
                      borderRadius: "2px",
                      padding: "3px 8px",
                    }}
                  >
                    <span
                      className="body-font"
                      style={{
                        fontSize: "9px",
                        color: product.typeColor,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {product.type}
                    </span>
                  </div>
                </div>
              ) : (
                /* ── Standard: original colour logic ── */
                <div
                  style={{
                    height: "200px",
                    background: `linear-gradient(135deg, ${
                      product.category === "wellness"
                        ? "#2c4a6e, #4a7fb5"
                        : product.category === "edibles"
                          ? "#5a2d0c, #8b4513"
                          : product.category === "creams"
                            ? "#4a2040, #8b4a7a"
                            : product.category === "candles"
                              ? "#5a4a1a, #b5935a"
                              : product.category === "terpenes"
                                ? "#1a4a2a, #52b788"
                                : "#2a2a2a, #555"
                    })`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "48px",
                    opacity: 0.9,
                  }}
                >
                  <span>
                    {product.category === "wellness"
                      ? "❋"
                      : product.category === "edibles"
                        ? "⬡"
                        : product.category === "creams"
                          ? "◉"
                          : product.category === "candles"
                            ? "○"
                            : product.category === "terpenes"
                              ? "◇"
                              : "△"}
                  </span>
                </div>
              )}

              {/* Badge */}
              {product.badge && (
                <div
                  className="body-font"
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background:
                      product.badge === "New"
                        ? "#2d6a4f"
                        : product.badge === "Popular"
                          ? "#b5935a"
                          : product.badge === "Best Seller"
                            ? "#1b4332"
                            : product.badge === "Premium"
                              ? "#2c4a6e"
                              : product.badge === "Gift"
                                ? "#9b6b9e"
                                : "#4a7fb5",
                    color: "white",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: "2px",
                  }}
                >
                  {product.badge}
                </div>
              )}

              {/* Content */}
              <div style={{ padding: "24px" }}>
                {/* Eybna line — vapes only */}
                {product.verifyId && (
                  <p
                    className="body-font"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.25em",
                      color: "#bbb",
                      textTransform: "uppercase",
                      marginBottom: "5px",
                    }}
                  >
                    {product.line}
                  </p>
                )}

                <h3
                  className="shop-font"
                  style={{
                    fontSize: "20px",
                    fontWeight: 400,
                    color: "#1a1a1a",
                    marginBottom: "8px",
                  }}
                >
                  {product.name}
                </h3>

                {/* Effects tags — vapes only */}
                {product.effects && (
                  <div
                    style={{
                      display: "flex",
                      gap: "5px",
                      flexWrap: "wrap",
                      marginBottom: "10px",
                    }}
                  >
                    {product.effects.map((e) => (
                      <span
                        key={e}
                        className="body-font"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "2px",
                          background: `${product.typeColor}15`,
                          color: product.typeColor,
                          border: `1px solid ${product.typeColor}35`,
                        }}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                )}

                <p
                  className="body-font"
                  style={{
                    fontSize: "13px",
                    color: "#888",
                    lineHeight: 1.6,
                    fontWeight: 300,
                    marginBottom: "20px",
                  }}
                >
                  {product.desc}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    className="shop-font"
                    style={{
                      fontSize: "22px",
                      color: "#2d6a4f",
                      fontWeight: 600,
                    }}
                  >
                    R{product.price}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {/* View Profile — vapes only */}
                    {product.verifyId && (
                      <button
                        className="body-font verify-btn"
                        onClick={() => navigate(`/verify/${product.verifyId}`)}
                        style={{
                          padding: "8px 12px",
                          background: "transparent",
                          color: "#2d6a4f",
                          border: "1px solid #2d6a4f",
                          borderRadius: "2px",
                          fontSize: "10px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        View Profile
                      </button>
                    )}
                    <button
                      className="body-font"
                      style={{
                        padding: "8px 20px",
                        background: "#1b4332",
                        color: "white",
                        border: "none",
                        borderRadius: "2px",
                        fontSize: "11px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#2d6a4f")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "#1b4332")
                      }
                      onClick={() => navigate("/account")}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px", color: "#aaa" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>◎</div>
            <p className="body-font">No products in this category yet.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          background: "#1a1a1a",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#faf9f6", letterSpacing: "0.2em" }}
        >
          PROTEA
        </span>
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#52b788", letterSpacing: "0.2em" }}
        >
          {" "}
          BOTANICALS
        </span>
        <p
          className="body-font"
          onClick={() => navigate("/")}
          style={{
            fontSize: "11px",
            color: "#555",
            marginTop: "12px",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </p>
      </footer>
    </div>
  );
}
