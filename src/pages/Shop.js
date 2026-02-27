// src/pages/Shop.js v2.4
// v2.4: "Add to Cart" now functional — calls CartContext.addToCart(product)
//       instead of navigate("/account"). Shows toast notification on add.
//       Added useCart import and toast state. No other changes.
// v2.3: Added 26 new vape products for 13 new strains (1ml Cart + 2ml Pen each).
//       Updated ALL vape pricing: R800 (1ml Cart), R1600 (2ml Pen).
//       Added 2ml Pens for Cinnamon Kush Cake & Sweet Watermelon (previously missing).
//       Total vape products: 36. Coming Soon cards: 6. Grand total: 42.
//       Price display now uses toLocaleString() for R1,600 formatting.
// v2.2: Replaced 12 non-vape placeholder products with 6 "Coming Soon" category cards.
// v2.1: Removed custom nav — NavBar in App.js now handles navigation + auth state.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext"; // v2.4

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
  // ═══════════════════════════════════════════════════════════════════════════
  // VAPES — 1ml Cartridges (R800) ═════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Original 5 strains (1ml) — prices updated v2.3 ───────────────────────
  {
    id: 101,
    name: "Pineapple Express — 1ml Cart",
    category: "vapes",
    price: 800,
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
    price: 800,
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
    price: 800,
    desc: "Warm spiced cinnamon bun with deep kush notes. Deep body sedation and sleep support. Night-time use.",
    badge: null,
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
    price: 800,
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
    price: 800,
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

  // ── 13 New strains (1ml) — added v2.3 ────────────────────────────────────
  {
    id: 109,
    name: "Wedding Cake — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Rich vanilla and tangy pepper over an earthy kush base. Powerful euphoria with full-body relaxation.",
    badge: "New",
    verifyId: "wedding-cake",
    line: "Pure Terpenes Line",
    type: "Indica-Dominant",
    typeColor: "#c9a84c",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a5a2a",
    icon: "⬡",
    thc: "93.55%",
    effects: ["Euphoric", "Relaxing", "Happy"],
  },
  {
    id: 110,
    name: "Peaches & Cream — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Lush stone fruit sweetness wrapped in velvety cream. Smooth calming body effect building into deep contentment.",
    badge: "New",
    verifyId: "peaches-and-cream",
    line: "Palate Line",
    type: "Indica-Dominant",
    typeColor: "#e8946a",
    gradientFrom: "#2e1a1a",
    gradientTo: "#6a3a2a",
    icon: "◉",
    thc: "93.55%",
    effects: ["Relaxing", "Happy", "Calm"],
  },
  {
    id: 111,
    name: "Purple Punch — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Grape candy sweetness with blueberry muffin richness. Deeply sedating body effect for rest and recovery.",
    badge: "New",
    verifyId: "purple-punch",
    line: "Palate Line",
    type: "Indica",
    typeColor: "#7b4f9e",
    gradientFrom: "#1a0e2e",
    gradientTo: "#4a2070",
    icon: "◉",
    thc: "93.55%",
    effects: ["Sedating", "Relaxing", "Sleepy"],
  },
  {
    id: 112,
    name: "Mimosa — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Sparkling tangerine and tropical citrus with a subtle berry undertone. Perfect uplifting daytime profile.",
    badge: "New",
    verifyId: "mimosa",
    line: "Palate Line",
    type: "Sativa-Dominant",
    typeColor: "#e8b830",
    gradientFrom: "#2e2a0e",
    gradientTo: "#6a5a1a",
    icon: "◉",
    thc: "93.55%",
    effects: ["Energising", "Uplifting", "Focused"],
  },
  {
    id: 113,
    name: "RNTZ — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Candy-sweet fruit medley with creamy finish. Zkittlez x Gelato cross — euphoric clarity meets smooth relaxation.",
    badge: "New",
    verifyId: "rntz",
    line: "Live Line",
    type: "Balanced Hybrid",
    typeColor: "#d4644a",
    gradientFrom: "#2e0e0e",
    gradientTo: "#6a2020",
    icon: "◈",
    thc: "93.55%",
    effects: ["Euphoric", "Balanced", "Happy"],
  },
  {
    id: 114,
    name: "Blue Zushi — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Rare exotic blend of sweet berry and distinctive fuel-forward gas. Powerful enveloping body high for connoisseurs.",
    badge: "New",
    verifyId: "blue-zushi",
    line: "Live Line",
    type: "Indica-Dominant",
    typeColor: "#4a6ebe",
    gradientFrom: "#0e1a2e",
    gradientTo: "#1a3a6a",
    icon: "◈",
    thc: "93.55%",
    effects: ["Deeply Relaxing", "Euphoric", "Sleepy"],
  },
  {
    id: 115,
    name: "MAC — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Sharp citrus and sour floral aroma with diesel earthiness. Cerebral creative energy transitioning to calm focus.",
    badge: "New",
    verifyId: "mac",
    line: "Live Line",
    type: "Balanced Hybrid",
    typeColor: "#8ab84a",
    gradientFrom: "#1a2e0e",
    gradientTo: "#3a5a1a",
    icon: "◈",
    thc: "93.55%",
    effects: ["Creative", "Uplifting", "Focused"],
  },
  {
    id: 116,
    name: "Pear Jam — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Ripe pear preserves with jammy sweetness and soft floral finish. Smooth, satisfying and effortlessly social.",
    badge: "New",
    verifyId: "pear-jam",
    line: "Enhancer Line",
    type: "Hybrid",
    typeColor: "#8aba4a",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a6a2a",
    icon: "◎",
    thc: "93.55%",
    effects: ["Relaxing", "Happy", "Smooth"],
  },
  {
    id: 117,
    name: "Melon Lychee — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Exotic honeydew melon with fragrant lychee and a hint of rose. One of the most refreshing enhancer profiles available.",
    badge: "New",
    verifyId: "melon-lychee",
    line: "Enhancer Line",
    type: "Sativa-Hybrid",
    typeColor: "#50b890",
    gradientFrom: "#0e2e2a",
    gradientTo: "#1a5a4a",
    icon: "◎",
    thc: "93.55%",
    effects: ["Uplifting", "Refreshing", "Social"],
  },
  {
    id: 118,
    name: "Tutti Frutti — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Playful candy medley of mixed tropical fruits and sweet confectionery notes. Fun, fruity and energising.",
    badge: "New",
    verifyId: "tutti-frutti",
    line: "Enhancer Line",
    type: "Sativa-Hybrid",
    typeColor: "#e06a90",
    gradientFrom: "#2e1a2a",
    gradientTo: "#6a2a5a",
    icon: "◎",
    thc: "93.55%",
    effects: ["Uplifting", "Happy", "Energising"],
  },
  {
    id: 119,
    name: "Purple Crack — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Explosive sativa energy meets deep berry richness. High-intensity focus with sweet grape and earthy pine notes.",
    badge: "New",
    verifyId: "purple-crack",
    line: "Live Plus+ Line",
    type: "Sativa-Dominant",
    typeColor: "#9a5ab8",
    gradientFrom: "#1a0e2e",
    gradientTo: "#3a1a6a",
    icon: "◇",
    thc: "93.55%",
    effects: ["Focused", "Energising", "Alert"],
  },
  {
    id: 120,
    name: "Lemonhead+ — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Bright sour citrus with a sharp zesty bite. Fresh lemon peel with herbal pine — maximum daytime energy and clarity.",
    badge: "New",
    verifyId: "lemonhead-plus",
    line: "Live Plus+ Line",
    type: "Sativa-Dominant",
    typeColor: "#d4c020",
    gradientFrom: "#2e2e0a",
    gradientTo: "#5a5a1a",
    icon: "◇",
    thc: "93.55%",
    effects: ["Energising", "Focused", "Creative"],
  },
  {
    id: 121,
    name: "Sherblato+ — 1ml Cart",
    category: "vapes",
    price: 800,
    desc: "Creamy sherbert sweetness fused with rich Gelato dessert complexity. Premium evening indulgence at its finest.",
    badge: "New",
    verifyId: "sherblato-plus",
    line: "Live Plus+ Line",
    type: "Indica-Dominant",
    typeColor: "#c06090",
    gradientFrom: "#2e0e1e",
    gradientTo: "#6a1a4a",
    icon: "◇",
    thc: "93.55%",
    effects: ["Relaxing", "Euphoric", "Sleepy"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VAPES — 2ml Disposable Pens (R1600) ═══════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Original 3 strains (2ml) — prices updated v2.3 ───────────────────────
  {
    id: 106,
    name: "Pineapple Express — 2ml Pen",
    category: "vapes",
    price: 1600,
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
    price: 1600,
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
    price: 1600,
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

  // ── 2ml Pens for Cinnamon Kush Cake & Sweet Watermelon (previously missing) ─
  {
    id: 122,
    name: "Cinnamon Kush Cake — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Cinnamon Kush Cake profile. Warm spiced comfort, ceramic coil. Lab verified.",
    badge: null,
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
    id: 123,
    name: "Sweet Watermelon — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Sweet Watermelon profile. Vibrant and refreshing, ceramic coil. Lab verified.",
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

  // ── 13 New strains (2ml) — added v2.3 ────────────────────────────────────
  {
    id: 124,
    name: "Wedding Cake — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Wedding Cake profile. Rich vanilla and pepper, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "wedding-cake",
    line: "Pure Terpenes Line",
    type: "Indica-Dominant",
    typeColor: "#c9a84c",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a5a2a",
    icon: "⬡",
    thc: "93.55%",
    effects: ["Euphoric", "Relaxing", "Happy"],
  },
  {
    id: 125,
    name: "Peaches & Cream — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Peaches & Cream profile. Lush and creamy, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "peaches-and-cream",
    line: "Palate Line",
    type: "Indica-Dominant",
    typeColor: "#e8946a",
    gradientFrom: "#2e1a1a",
    gradientTo: "#6a3a2a",
    icon: "◉",
    thc: "93.55%",
    effects: ["Relaxing", "Happy", "Calm"],
  },
  {
    id: 126,
    name: "Purple Punch — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Purple Punch profile. Grape candy knockout, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "purple-punch",
    line: "Palate Line",
    type: "Indica",
    typeColor: "#7b4f9e",
    gradientFrom: "#1a0e2e",
    gradientTo: "#4a2070",
    icon: "◉",
    thc: "93.55%",
    effects: ["Sedating", "Relaxing", "Sleepy"],
  },
  {
    id: 127,
    name: "Mimosa — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Mimosa profile. Bright citrus morning energy, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "mimosa",
    line: "Palate Line",
    type: "Sativa-Dominant",
    typeColor: "#e8b830",
    gradientFrom: "#2e2a0e",
    gradientTo: "#6a5a1a",
    icon: "◉",
    thc: "93.55%",
    effects: ["Energising", "Uplifting", "Focused"],
  },
  {
    id: 128,
    name: "RNTZ — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with RNTZ (Runtz) profile. Candy-sweet balanced hybrid, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "rntz",
    line: "Live Line",
    type: "Balanced Hybrid",
    typeColor: "#d4644a",
    gradientFrom: "#2e0e0e",
    gradientTo: "#6a2020",
    icon: "◈",
    thc: "93.55%",
    effects: ["Euphoric", "Balanced", "Happy"],
  },
  {
    id: 129,
    name: "Blue Zushi — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Blue Zushi profile. Exotic berry and gas, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "blue-zushi",
    line: "Live Line",
    type: "Indica-Dominant",
    typeColor: "#4a6ebe",
    gradientFrom: "#0e1a2e",
    gradientTo: "#1a3a6a",
    icon: "◈",
    thc: "93.55%",
    effects: ["Deeply Relaxing", "Euphoric", "Sleepy"],
  },
  {
    id: 130,
    name: "MAC — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with MAC profile. Sour citrus and diesel creativity, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "mac",
    line: "Live Line",
    type: "Balanced Hybrid",
    typeColor: "#8ab84a",
    gradientFrom: "#1a2e0e",
    gradientTo: "#3a5a1a",
    icon: "◈",
    thc: "93.55%",
    effects: ["Creative", "Uplifting", "Focused"],
  },
  {
    id: 131,
    name: "Pear Jam — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Pear Jam profile. Ripe jammy sweetness, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "pear-jam",
    line: "Enhancer Line",
    type: "Hybrid",
    typeColor: "#8aba4a",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a6a2a",
    icon: "◎",
    thc: "93.55%",
    effects: ["Relaxing", "Happy", "Smooth"],
  },
  {
    id: 132,
    name: "Melon Lychee — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Melon Lychee profile. Tropical exotic refreshment, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "melon-lychee",
    line: "Enhancer Line",
    type: "Sativa-Hybrid",
    typeColor: "#50b890",
    gradientFrom: "#0e2e2a",
    gradientTo: "#1a5a4a",
    icon: "◎",
    thc: "93.55%",
    effects: ["Uplifting", "Refreshing", "Social"],
  },
  {
    id: 133,
    name: "Tutti Frutti — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Tutti Frutti profile. Playful candy fruit medley, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "tutti-frutti",
    line: "Enhancer Line",
    type: "Sativa-Hybrid",
    typeColor: "#e06a90",
    gradientFrom: "#2e1a2a",
    gradientTo: "#6a2a5a",
    icon: "◎",
    thc: "93.55%",
    effects: ["Uplifting", "Happy", "Energising"],
  },
  {
    id: 134,
    name: "Purple Crack — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Purple Crack profile. Berry electric focus, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "purple-crack",
    line: "Live Plus+ Line",
    type: "Sativa-Dominant",
    typeColor: "#9a5ab8",
    gradientFrom: "#1a0e2e",
    gradientTo: "#3a1a6a",
    icon: "◇",
    thc: "93.55%",
    effects: ["Focused", "Energising", "Alert"],
  },
  {
    id: 135,
    name: "Lemonhead+ — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Lemonhead+ profile. Sharp zesty sativa energy, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "lemonhead-plus",
    line: "Live Plus+ Line",
    type: "Sativa-Dominant",
    typeColor: "#d4c020",
    gradientFrom: "#2e2e0a",
    gradientTo: "#5a5a1a",
    icon: "◇",
    thc: "93.55%",
    effects: ["Energising", "Focused", "Creative"],
  },
  {
    id: 136,
    name: "Sherblato+ — 2ml Pen",
    category: "vapes",
    price: 1600,
    desc: "Full 2ml disposable pen with Sherblato+ profile. Creamy dessert luxury, ceramic coil. Lab verified.",
    badge: "New",
    verifyId: "sherblato-plus",
    line: "Live Plus+ Line",
    type: "Indica-Dominant",
    typeColor: "#c06090",
    gradientFrom: "#2e0e1e",
    gradientTo: "#6a1a4a",
    icon: "◇",
    thc: "93.55%",
    effects: ["Relaxing", "Euphoric", "Sleepy"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMING SOON — Category placeholders (v2.2) ════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "cs-wellness",
    name: "Health & Wellness",
    category: "wellness",
    comingSoon: true,
    icon: "❋",
    gradientFrom: "#2c4a6e",
    gradientTo: "#4a7fb5",
    teaser:
      "CBD tinctures, sleep support capsules and wellness formulations. Lab-tested, pharmaceutical-grade botanical extracts for daily wellbeing.",
  },
  {
    id: "cs-edibles",
    name: "Edibles",
    category: "edibles",
    comingSoon: true,
    icon: "⬡",
    gradientFrom: "#5a2d0c",
    gradientTo: "#8b4513",
    teaser:
      "Precisely dosed gummies, chocolates and infused treats. Consistent potency, premium ingredients, third-party tested.",
  },
  {
    id: "cs-creams",
    name: "Creams & Salves",
    category: "creams",
    comingSoon: true,
    icon: "◉",
    gradientFrom: "#4a2040",
    gradientTo: "#8b4a7a",
    teaser:
      "CBD-infused topicals for recovery, skincare and targeted relief. Formulated with botanical extracts and essential oils.",
  },
  {
    id: "cs-candles",
    name: "Candles",
    category: "candles",
    comingSoon: true,
    icon: "○",
    gradientFrom: "#5a4a1a",
    gradientTo: "#b5935a",
    teaser:
      "Hand-poured soy wax candles infused with Eybna terpene profiles. Aromatherapy meets premium cannabis culture.",
  },
  {
    id: "cs-terpenes",
    name: "Terpenes",
    category: "terpenes",
    comingSoon: true,
    icon: "◇",
    gradientFrom: "#1a4a2a",
    gradientTo: "#52b788",
    teaser:
      "Pure pharmaceutical-grade terpene isolates and custom blends by Eybna. COA included with every product.",
  },
  {
    id: "cs-accessories",
    name: "Accessories",
    category: "accessories",
    comingSoon: true,
    icon: "△",
    gradientFrom: "#2a2a2a",
    gradientTo: "#555555",
    teaser:
      "510 batteries, carrying cases, and premium accessories designed for the Protea Botanicals product range.",
  },
];

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [toast, setToast] = useState(null); // v2.4: toast state
  const navigate = useNavigate();
  const { addToCart } = useCart(); // v2.4

  const filtered =
    activeCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeCategory);

  // v2.4: Add to cart with toast feedback
  const handleAddToCart = (product) => {
    addToCart(product);
    setToast(product.name);
    setTimeout(() => setToast(null), 2500);
  };

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
        @keyframes toast-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toast-slide-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>

      {/* v2.4: Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#1b4332",
            color: "#fff",
            padding: "14px 24px",
            borderRadius: "2px",
            fontFamily: "Jost, sans-serif",
            fontSize: "13px",
            fontWeight: "500",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            animation: "toast-slide-in 0.3s ease",
            maxWidth: "340px",
          }}
        >
          <span style={{ fontSize: "16px" }}>✓</span>
          <span>{toast} added to cart</span>
          <button
            onClick={() => navigate("/cart")}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#b5935a",
              padding: "4px 10px",
              borderRadius: "2px",
              fontSize: "10px",
              fontWeight: "600",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              marginLeft: "4px",
              whiteSpace: "nowrap",
            }}
          >
            View Cart
          </button>
        </div>
      )}

      {/* v2.1: Custom nav removed — NavBar in App.js handles navigation + auth state */}

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
          {filtered.map((product) =>
            product.comingSoon ? (
              /* ── Coming Soon card (v2.2) ── */
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
                <div
                  style={{
                    height: "200px",
                    background: `linear-gradient(135deg, ${product.gradientFrom}, ${product.gradientTo})`,
                    display: "flex",
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
                  <span style={{ fontSize: "52px", opacity: 0.4 }}>
                    {product.icon}
                  </span>
                </div>
                <div
                  className="body-font"
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "#b5935a",
                    color: "white",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: "2px",
                  }}
                >
                  Coming Soon
                </div>
                <div style={{ padding: "24px" }}>
                  <h3
                    className="shop-font"
                    style={{
                      fontSize: "20px",
                      fontWeight: 400,
                      color: "#1a1a1a",
                      marginBottom: "10px",
                    }}
                  >
                    {product.name}
                  </h3>
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
                    {product.teaser}
                  </p>
                  <span
                    className="body-font"
                    style={{
                      fontSize: "12px",
                      color: "#b5935a",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                  >
                    Launching Soon
                  </span>
                </div>
              </div>
            ) : (
              /* ── Vape product card ── */
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
                {/* Strain hero */}
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
                  {product.line && (
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
                      R{product.price.toLocaleString()}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {product.verifyId && (
                        <button
                          className="body-font verify-btn"
                          onClick={() =>
                            navigate(`/verify/${product.verifyId}`)
                          }
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
                      {/* v2.4: functional Add to Cart */}
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
                        onClick={() => handleAddToCart(product)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}
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
