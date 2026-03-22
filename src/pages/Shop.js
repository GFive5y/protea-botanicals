// src/pages/Shop.js v4.3
// v4.3: WP-N Unified Client Header — ClientHeader replaces NavBar injection from App.js.
//       Added: import ClientHeader + <ClientHeader variant="light" /> as first element.
//       App.js /shop route must be simplified to: <Route path="/shop" element={<Shop />} />
//       Zero impact on all other Shop functionality.
// v4.2: WP-K Publish to Shop — reads sell_price from inventory_items
//       Price is no longer hardcoded. buildProductFromInventory uses
//       item.sell_price from DB. fetchProducts SELECT includes sell_price.
//       Zero impact on all other Shop functionality.
// v4.1: WP-J Mobile Responsiveness — 375px pass
//       - shop-loyalty-inner: reduces loyalty CTA section padding on mobile
//       - shop-loyalty-btns: stacks loyalty CTA buttons full-width on mobile
//       All existing 768px + 480px breakpoints preserved from v4.0.
//       Zero impact on desktop layout or admin COGS warning logic.
// v4.0: WP-H ADMIN COGS WARNING — checks if any finished_product is priced
//       below its calculated COGS (hardware + terpene + other_cost_zar).
//       Banner visible to admin/hq roles only. Dismissible per session.
//       Zero impact on customer-facing shop experience.
// v3.0: FULL VERIFICATION IN MODAL — StrainModal with donut chart, full COA,
//       terpene profile, "What These Numbers Mean" cards, Eybna attribution.
// v2.9: STRAIN MODAL — frosted glass in-page overlay modal.
// v2.8: LIVE INVENTORY — queries inventory_items (category: "finished_product").
// v2.7: CART INTEGRATION — useCart, addToCart, cart badge in NavBar.

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { supabase } from "../services/supabaseClient";
import ClientHeader from "../components/ClientHeader";
import { useTenant } from "../services/tenantService";

// ── Distillate COA ────────────────────────────────────────────────────────────
const DISTILLATE_COA = {
  labId: "JB26-046-01",
  sampleId: "D9DSOL160126",
  lab: "Ecogreen Analytics (Pty) Ltd.",
  labLocation: "Somerset West, Western Cape",
  accreditation: "SANAS T1045 · SAHPRA Licensed · ILAC-MRA",
  reportedDate: "2026/01/23",
  method: "HPLC with UV detection (ME-EA-001)",
  cannabinoids: [
    { name: "D9-THC", value: 93.5527, highlight: true },
    { name: "D8-THC", value: 3.088, highlight: false },
    { name: "CBD", value: 0.9756, highlight: false },
    { name: "CBN", value: 0.7809, highlight: false },
    { name: "CBG", value: 0.0868, highlight: false },
    { name: "CBDA", value: 0.043, highlight: false },
    { name: "THCA", value: 0.0001, highlight: false },
  ],
  totals: [
    { name: "Total THC", value: "93.55%" },
    { name: "Total CBD", value: "1.01%" },
    { name: "Total Cannabinoids", value: "98.53%" },
  ],
  otherTests: [
    { name: "Residual Solvents", status: "pending" },
    { name: "Heavy Metals", status: "pending" },
    { name: "Pesticides", status: "pending" },
    { name: "Mycotoxins", status: "pending" },
    { name: "Microbials", status: "pending" },
  ],
};

// ── Strain Detail Data ────────────────────────────────────────────────────────
const STRAINS_DETAIL = {
  "pineapple-express": {
    description:
      "Bright pineapple and citrus notes blend with earthy pine for a vibrant, tropical, and refreshing aroma experience. A combination of exotic sweet pineapple flavor with cedar and pine notes, as well as fine fruity undertones. One of the most recognised sativa profiles in the world.",
    dominantTerpenes: [
      {
        name: "Myrcene",
        role: "Earthy base · Relaxing undercurrent",
        color: "#2d6a4f",
      },
      {
        name: "Caryophyllene",
        role: "Spicy pine · Anti-inflammatory",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Citrus lift · Mood elevation",
        color: "#e8a020",
      },
      {
        name: "Ocimene",
        role: "Sweet tropical · Floral brightness",
        color: "#4a9eba",
      },
    ],
    aroma: "Pineapple · Citrus · Cedar · Pine · Tropical Fruit",
    flavour: "Sweet Pineapple · Earthy Pine · Fresh Citrus",
    eybnaLine: "Pure Terpenes Line",
    lineCode: "6-11-0002",
    eybnaDescription:
      "Eybna's Pure Terpenes Line captures strain-authentic aromatic profiles using only botanical-derived terpenes, without any additives or cutting agents.",
  },
  "gelato-41": {
    description:
      "Gelato #41 combines Sunset Sherbert and Thin Mint genetics, delivering a sweet and earthy aroma with notes of lavender and pine. Dominated by caryophyllene, limonene and myrcene, this dessert-forward strain delivers creative euphoria that melts into deep body relaxation.",
    dominantTerpenes: [
      {
        name: "Caryophyllene",
        role: "Peppery spice · Anti-inflammatory",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Citrus zest · Stress relief",
        color: "#e8c020",
      },
      {
        name: "Myrcene",
        role: "Musky floral · Calming sedation",
        color: "#2d6a4f",
      },
      { name: "Linalool", role: "Lavender · Sleep support", color: "#9b6b9e" },
    ],
    aroma: "Sweet Cream · Lavender · Earthy Pine · Berry · Vanilla",
    flavour: "Creamy Dessert · Citrus · Sweet Earth · Mint Finish",
    eybnaLine: "Palate Line",
    lineCode: "8-13-0002",
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  "cinnamon-kush-cake": {
    description:
      "Sweet and spicy cinnamon bun with deep kush notes. An indica-dominant strain that delivers warm, spiced comfort with a vanilla and earthy peppermint base. The Live Line captures the aromatic peak of the cannabis plant at harvest, expressing its most pure and pungent flavours.",
    dominantTerpenes: [
      {
        name: "Caryophyllene",
        role: "Warm spice · Analgesic properties",
        color: "#c0764a",
      },
      {
        name: "Myrcene",
        role: "Earthy kush · Sedative body effect",
        color: "#2d6a4f",
      },
      {
        name: "Linalool",
        role: "Floral sweetness · Sleep support",
        color: "#9b6b9e",
      },
      {
        name: "Terpinolene",
        role: "Vanilla pine · Herbal warmth",
        color: "#b5935a",
      },
    ],
    aroma: "Cinnamon · Vanilla · Kush · Earthy Spice · Baked Dough",
    flavour: "Spiced Cinnamon Bun · Earthy Peppermint · Vanilla Kush",
    eybnaLine: "Live Line",
    lineCode: "7-803-0002",
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  "sweet-watermelon": {
    description:
      "A vibrant tropical flavour that balances sweet and tart notes with a refreshing, juicy finish. Sweet Watermelon from Eybna's Enhancer Line is designed to amplify and elevate extract profiles with a bright, clean fruit character that enhances the overall sensory experience.",
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Fresh citrus lift · Mood boost",
        color: "#e8c020",
      },
      {
        name: "Ocimene",
        role: "Sweet tropical · Floral notes",
        color: "#52b788",
      },
      {
        name: "Myrcene",
        role: "Fruity base · Smooth body effect",
        color: "#2d6a4f",
      },
      {
        name: "Linalool",
        role: "Floral sweetness · Gentle calm",
        color: "#9b6b9e",
      },
    ],
    aroma: "Sweet Watermelon · Fresh Citrus · Tropical Fruit · Floral",
    flavour: "Juicy Watermelon · Sweet Tart · Fresh Finish",
    eybnaLine: "Enhancer Line",
    lineCode: "10-520-0002",
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  zkz: {
    description:
      "An award-winning, California-bred strain that is a cross between famously fruity genetics, producing a unique sensory experience. ZKZ is known for its sweet and candy-like flavour, characterised by strong fruity notes and ripe strawberry. One of the most celebrated profiles in the premium cannabis market.",
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Sweet candy citrus · Euphoria",
        color: "#e8c020",
      },
      {
        name: "Caryophyllene",
        role: "Fruity spice · Anti-anxiety",
        color: "#b5935a",
      },
      {
        name: "Linalool",
        role: "Floral sweetness · Balance",
        color: "#9b6b9e",
      },
      { name: "Myrcene", role: "Ripe berry · Smooth body", color: "#2d6a4f" },
    ],
    aroma: "Candy · Ripe Strawberry · Sweet Fruit · Citrus · Berry",
    flavour: "Sweet Candy · Fruity · Ripe Strawberry · Citrus Finish",
    eybnaLine: "Live Plus+ Line",
    lineCode: "14-501-0002",
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
  "wedding-cake": {
    description:
      "Wedding Cake, also known as Pink Cookies, is a cross of Triangle Kush and Animal Mints that delivers a rich, tangy vanilla profile with earthy pepper undertones. Known for its dessert-like sweetness layered over a peppery kush base, this indica-dominant hybrid produces powerful euphoria paired with full-body relaxation.",
    dominantTerpenes: [
      {
        name: "Caryophyllene",
        role: "Peppery warmth · Anti-inflammatory",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Tangy sweetness · Mood elevation",
        color: "#e8c020",
      },
      {
        name: "Myrcene",
        role: "Earthy vanilla · Body relaxation",
        color: "#2d6a4f",
      },
      {
        name: "Linalool",
        role: "Floral depth · Calming finish",
        color: "#9b6b9e",
      },
    ],
    aroma: "Vanilla · Pepper · Earthy Kush · Sweet Dough · Tangy Citrus",
    flavour: "Rich Vanilla · Peppery Earth · Sweet Cream · Tangy Finish",
    eybnaLine: "Pure Terpenes Line",
    lineCode: "6-23-0002",
    eybnaDescription:
      "Eybna's Pure Terpenes Line captures strain-authentic aromatic profiles using only botanical-derived terpenes, without any additives or cutting agents.",
  },
  "peaches-and-cream": {
    description:
      "A luxurious indica-dominant hybrid that wraps ripe stone fruit sweetness in a velvety cream finish. Peaches & Cream from Eybna's Palate Line delivers a rich, dessert-forward sensory experience with a smooth, calming body effect that builds gradually into deep contentment.",
    dominantTerpenes: [
      {
        name: "Myrcene",
        role: "Ripe peach · Sedating warmth",
        color: "#2d6a4f",
      },
      {
        name: "Caryophyllene",
        role: "Creamy spice · Anti-anxiety",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Stone fruit brightness · Uplift",
        color: "#e8a020",
      },
      {
        name: "Linalool",
        role: "Floral cream · Smooth calm",
        color: "#9b6b9e",
      },
    ],
    aroma: "Ripe Peach · Vanilla Cream · Sweet Fruit · Floral · Honey",
    flavour: "Juicy Peach · Smooth Cream · Sweet Vanilla · Soft Finish",
    eybnaLine: "Palate Line",
    lineCode: "8-09-0002",
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  "purple-punch": {
    description:
      "A pure indica born from Larry OG and Granddaddy Purple, Purple Punch delivers a one-two combination of grape candy sweetness and blueberry muffin richness. This strain is renowned for its deeply sedating body effect that melts tension and guides you gently into rest.",
    dominantTerpenes: [
      { name: "Myrcene", role: "Grape musk · Deep sedation", color: "#2d6a4f" },
      {
        name: "Caryophyllene",
        role: "Berry spice · Pain relief",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Sweet candy lift · Mood balance",
        color: "#e8c020",
      },
      {
        name: "Pinene",
        role: "Pine clarity · Mental freshness",
        color: "#4a9e6a",
      },
    ],
    aroma: "Grape Candy · Blueberry · Vanilla · Earthy Kush · Berry",
    flavour: "Sweet Grape · Blueberry Muffin · Berry Punch · Vanilla",
    eybnaLine: "Palate Line",
    lineCode: "8-08-0002",
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  mimosa: {
    description:
      "A sparkling cross of Clementine and Purple Punch, Mimosa bursts with bright tangerine and tropical citrus notes over a subtle berry undertone. This sativa-dominant hybrid is the perfect wake-and-bake profile — uplifting, focused and brimming with daytime energy.",
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Bright citrus · Energising uplift",
        color: "#e8c020",
      },
      {
        name: "Myrcene",
        role: "Tropical fruit · Smooth base",
        color: "#2d6a4f",
      },
      {
        name: "Caryophyllene",
        role: "Subtle spice · Anti-anxiety",
        color: "#b5935a",
      },
      {
        name: "Linalool",
        role: "Berry floral · Gentle balance",
        color: "#9b6b9e",
      },
    ],
    aroma: "Tangerine · Tropical Citrus · Berry · Champagne · Floral",
    flavour: "Bright Orange · Sweet Citrus · Berry Undertone · Clean Finish",
    eybnaLine: "Palate Line",
    lineCode: "8-06-0002",
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  rntz: {
    description:
      "RNTZ (Runtz) is a celebrated cross of Zkittlez and Gelato that has taken the global cannabis scene by storm. Known for its candy-sweet fruit medley and creamy finish, this balanced hybrid delivers euphoric mental clarity alongside smooth physical relaxation — a true 50/50 experience.",
    dominantTerpenes: [
      {
        name: "Caryophyllene",
        role: "Sweet spice · Stress relief",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Candy citrus · Mood elevation",
        color: "#e8c020",
      },
      {
        name: "Linalool",
        role: "Creamy floral · Gentle calm",
        color: "#9b6b9e",
      },
      {
        name: "Myrcene",
        role: "Fruity body · Smooth finish",
        color: "#2d6a4f",
      },
    ],
    aroma: "Candy Fruit · Sweet Cream · Tropical · Citrus · Berry",
    flavour: "Sweet Candy · Creamy Fruit · Citrus Zest · Smooth Finish",
    eybnaLine: "Live Line",
    lineCode: "9-513-0002",
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  "blue-zushi": {
    description:
      "Blue Zushi is a rare and highly sought-after exotic strain known for its complex aroma that blends sweet berry notes with a distinctive fuel-forward gas character. This indica-dominant hybrid delivers a powerful, enveloping body high with a euphoric mental haze that makes it a connoisseur favourite.",
    dominantTerpenes: [
      {
        name: "Myrcene",
        role: "Berry musk · Deep body sedation",
        color: "#2d6a4f",
      },
      {
        name: "Caryophyllene",
        role: "Gassy spice · Pain relief",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Sweet berry lift · Euphoria",
        color: "#e8c020",
      },
      {
        name: "Ocimene",
        role: "Exotic floral · Aromatic depth",
        color: "#4a9eba",
      },
    ],
    aroma: "Sweet Berry · Fuel Gas · Exotic Fruit · Earth · Candy",
    flavour: "Berry Candy · Gassy Undertone · Sweet Cream · Earthy Finish",
    eybnaLine: "Live Line",
    lineCode: "7-806-0002",
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  mac: {
    description:
      "Miracle Alien Cookies (MAC) is a legendary cross of Alien Cookies with a Colombian and Starfighter hybrid. Renowned for its sharp citrus and sour floral aroma underscored by a diesel earthiness, MAC delivers a cerebral rush of creative energy that transitions into a calm, focused body state.",
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Sour citrus · Creative energy",
        color: "#e8c020",
      },
      {
        name: "Caryophyllene",
        role: "Diesel spice · Anti-inflammatory",
        color: "#b5935a",
      },
      {
        name: "Myrcene",
        role: "Earthy base · Grounding calm",
        color: "#2d6a4f",
      },
      {
        name: "Terpinolene",
        role: "Floral pine · Herbal complexity",
        color: "#7a9a5a",
      },
    ],
    aroma: "Sour Citrus · Diesel · Floral · Earthy Pine · Herbal",
    flavour: "Sharp Citrus · Sour Cream · Diesel Earth · Floral Finish",
    eybnaLine: "Live Line",
    lineCode: "7-804-0002",
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  "pear-jam": {
    description:
      "A luscious fruit-forward enhancer profile that captures the essence of ripe pear preserves with a jammy sweetness and soft floral finish. Pear Jam from Eybna's Enhancer Line adds rich, natural fruit dimension to extract profiles — smooth, sweet and effortlessly satisfying.",
    dominantTerpenes: [
      {
        name: "Myrcene",
        role: "Ripe pear · Smooth body feel",
        color: "#2d6a4f",
      },
      {
        name: "Limonene",
        role: "Sweet fruit lift · Brightness",
        color: "#e8c020",
      },
      {
        name: "Ocimene",
        role: "Jammy floral · Aromatic sweetness",
        color: "#52b788",
      },
      {
        name: "Linalool",
        role: "Soft floral · Gentle relaxation",
        color: "#9b6b9e",
      },
    ],
    aroma: "Ripe Pear · Sweet Jam · Floral · Honey · Green Fruit",
    flavour: "Juicy Pear · Jammy Sweetness · Soft Floral · Clean Finish",
    eybnaLine: "Enhancer Line",
    lineCode: "10-566-0002",
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  "melon-lychee": {
    description:
      "An exotic tropical fusion that pairs sweet honeydew melon with fragrant lychee and a hint of rose. Melon Lychee from Eybna's Enhancer Line delivers one of the most refreshing and aromatic enhancer profiles available — perfect for adding bright, tropical complexity to any extract.",
    dominantTerpenes: [
      {
        name: "Ocimene",
        role: "Tropical lychee · Sweet floral",
        color: "#52b788",
      },
      {
        name: "Limonene",
        role: "Melon brightness · Mood boost",
        color: "#e8c020",
      },
      {
        name: "Myrcene",
        role: "Sweet melon base · Smoothness",
        color: "#2d6a4f",
      },
      {
        name: "Linalool",
        role: "Rose floral · Gentle balance",
        color: "#9b6b9e",
      },
    ],
    aroma: "Honeydew Melon · Lychee · Rose · Tropical Fruit · Floral",
    flavour: "Sweet Melon · Fragrant Lychee · Tropical · Floral Finish",
    eybnaLine: "Enhancer Line",
    lineCode: "10-564-0002",
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  "tutti-frutti": {
    description:
      "A vibrant, candy-inspired enhancer that delivers a playful medley of mixed tropical fruits and sweet confectionery notes. Tutti Frutti from Eybna's Enhancer Line is designed for those who want their extract to pop with colour, sweetness and an unmistakably fun, fruit-forward character.",
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Candy citrus · Energising burst",
        color: "#e8c020",
      },
      {
        name: "Myrcene",
        role: "Mixed fruit · Sweet body feel",
        color: "#2d6a4f",
      },
      {
        name: "Ocimene",
        role: "Tropical candy · Floral pop",
        color: "#52b788",
      },
      {
        name: "Terpinolene",
        role: "Fruity herbal · Playful lift",
        color: "#b5935a",
      },
    ],
    aroma: "Mixed Fruit Candy · Tropical · Sweet Berry · Citrus · Bubblegum",
    flavour: "Tutti Frutti Candy · Sweet Tropical · Berry Mix · Playful Finish",
    eybnaLine: "Enhancer Line",
    lineCode: "10-521-0002",
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  "purple-crack": {
    description:
      "Purple Crack brings together the explosive sativa energy of Green Crack with the deep berry richness of a purple lineage. The result is a high-intensity, focus-driven profile with sweet grape and earthy pine notes. From the Live Plus+ Line, this is peak terpene complexity for daytime productivity.",
    dominantTerpenes: [
      {
        name: "Myrcene",
        role: "Berry grape · Grounding base",
        color: "#2d6a4f",
      },
      {
        name: "Caryophyllene",
        role: "Earthy spice · Anti-anxiety",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Citrus spark · Mental clarity",
        color: "#e8c020",
      },
      {
        name: "Pinene",
        role: "Pine focus · Alertness boost",
        color: "#4a9e6a",
      },
    ],
    aroma: "Sweet Grape · Pine · Earthy Berry · Citrus · Mango",
    flavour: "Berry Burst · Earthy Pine · Sweet Citrus · Crisp Finish",
    eybnaLine: "Live Plus+ Line",
    lineCode: "14-09-0002",
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
  "lemonhead-plus": {
    description:
      "Lemonhead+ is an intensified lemon-forward profile that hits with bright, sour citrus and a sharp zesty bite. Built on the Live Plus+ platform, this sativa-dominant profile captures the unmistakable punch of fresh lemon peel with herbal and pine undertones — engineered for maximum daytime energy and mental clarity.",
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Sour lemon blast · Peak energy",
        color: "#e8c020",
      },
      {
        name: "Caryophyllene",
        role: "Zesty pepper · Anti-stress",
        color: "#b5935a",
      },
      {
        name: "Myrcene",
        role: "Citrus base · Smooth grounding",
        color: "#2d6a4f",
      },
      {
        name: "Terpinolene",
        role: "Herbal pine · Bright complexity",
        color: "#7a9a5a",
      },
    ],
    aroma: "Fresh Lemon · Sour Citrus · Pine · Herbal · Zesty Peel",
    flavour: "Sharp Lemon · Sour Zest · Herbal Pine · Clean Bright Finish",
    eybnaLine: "Live Plus+ Line",
    lineCode: "15-05-0002",
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
  "sherblato-plus": {
    description:
      "Sherblato+ fuses the creamy sherbert sweetness of Sunset Sherbert with the rich dessert complexity of Gelato. The Live Plus+ formulation intensifies every layer — sweet berry cream, vanilla frosting and a subtle fuel note on the exhale. This is premium evening indulgence at its most sophisticated.",
    dominantTerpenes: [
      {
        name: "Caryophyllene",
        role: "Creamy spice · Deep relaxation",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Berry sweetness · Euphoric lift",
        color: "#e8c020",
      },
      {
        name: "Myrcene",
        role: "Sherbert cream · Body sedation",
        color: "#2d6a4f",
      },
      {
        name: "Linalool",
        role: "Vanilla floral · Sleep support",
        color: "#9b6b9e",
      },
    ],
    aroma: "Berry Cream · Vanilla Frosting · Sweet Sherbert · Fuel · Candy",
    flavour: "Creamy Sherbert · Sweet Berry · Vanilla · Smooth Exhale",
    eybnaLine: "Live Plus+ Line",
    lineCode: "15-10-0002",
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
};

// ── Strain Visual Metadata ────────────────────────────────────────────────────
const STRAINS = [
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

const STRAINS_BY_LENGTH = [...STRAINS].sort(
  (a, b) => b.name.length - a.name.length,
);
const DEFAULT_STRAIN = {
  id: "unknown",
  name: "Unknown",
  line: "Other",
  lineShort: "Other",
  type: "Hybrid",
  typeColor: "#474747",
  accentColor: "#aaaaaa",
  gradientFrom: "#2a2a2a",
  gradientTo: "#4a4a4a",
  icon: "●",
  tagline: "Premium Cannabis Product.",
  effects: [],
};

function buildFoodProduct(item) {
  const allergens = item.allergen_flags
    ? Object.entries(item.allergen_flags)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : [];
  const daysToExpiry = item.expiry_date
    ? Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000)
    : null;
  return {
    id: item.id,
    inventory_item_id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    price: parseFloat(item.sell_price) || 0,
    quantity_on_hand: item.quantity_on_hand,
    allergens,
    ingredients_notes: item.ingredients_notes || null,
    shelf_life_days: item.shelf_life_days || null,
    storage_instructions: item.storage_instructions || null,
    expiry_date: item.expiry_date || null,
    daysToExpiry,
    description: item.description || null,
  };
}

function buildGeneralProduct(item) {
  return {
    id: item.id,
    inventory_item_id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    price: parseFloat(item.sell_price) || 0,
    quantity_on_hand: item.quantity_on_hand,
    description: item.description || null,
    storage_instructions: item.storage_instructions || null,
  };
}

function buildProductFromInventory(item) {
  const lowerName = item.name.toLowerCase();
  const matchedStrain = STRAINS_BY_LENGTH.find((s) =>
    lowerName.startsWith(s.name.toLowerCase()),
  );
  const is2ml = /2\.?0?\s*ml/i.test(item.name);
  const is3ml = /3\.?0?\s*ml/i.test(item.name);
  const isPostless = /post.?less|postless/i.test(item.name);
  const isVapePen = /\bvape\b|\bdisposable\b|\baio\b/i.test(item.name);
  const displayName = matchedStrain
    ? matchedStrain.name
    : item.name
        .replace(/\d+\.?\d*\s*ml\s*/i, "")
        .replace(/cartridge|disposable|pen|pod|post.?less/i, "")
        .trim() || item.name;
  const strain = matchedStrain || {
    ...DEFAULT_STRAIN,
    id: item.id,
    name: displayName,
  };
  let format, formatShort, badge;
  if (is3ml) {
    format = "3ml Disposable Pen";
    formatShort = "3ml Pen";
    badge = "All-in-One";
  } else if (is2ml) {
    format = "2ml Disposable Pen";
    formatShort = "2ml Pen";
    badge = "All-in-One";
  } else if (isPostless) {
    format = "1ml Post-less Cartridge";
    formatShort = "1ml Postless";
    badge = "Post-less";
  } else if (isVapePen) {
    format = "1ml Disposable Vape";
    formatShort = "1ml Vape";
    badge = "All-in-One";
  } else {
    format = "1ml Cartridge";
    formatShort = "1ml Cart";
    badge = "510 Thread";
  }
  return {
    id: item.id,
    inventory_item_id: item.id,
    strainId: strain.id,
    name: displayName,
    strain,
    format,
    formatShort,
    price: parseFloat(item.sell_price) || 0,
    thc: "93.55%",
    badge,
    quantity_on_hand: item.quantity_on_hand,
    sku: item.sku,
  };
}

// ── Coming Soon ───────────────────────────────────────────────────────────────
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

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
function CannabinoidDonut({ cannabinoids, accentColor }) {
  const total = cannabinoids.reduce((sum, c) => sum + c.value, 0);
  const size = 200,
    strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const sliceColors = [
    accentColor,
    "#8b9a7b",
    "#b5935a",
    "#7b8a9e",
    "#a0a0a0",
    "#c0b8a8",
    "#d0d0d0",
  ];
  let cumulativePercent = 0;
  const slices = cannabinoids.map((c, i) => {
    const percent = (c.value / total) * 100;
    const dashLength = (percent / 100) * circumference;
    const dashGap = circumference - dashLength;
    const offset = -(cumulativePercent / 100) * circumference;
    cumulativePercent += percent;
    return {
      ...c,
      percent,
      dashLength,
      dashGap,
      offset,
      color: sliceColors[i] || "#ccc",
    };
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 32,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {slices.map((s) => (
            <circle
              key={s.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${s.dashLength} ${s.dashGap}`}
              strokeDashoffset={s.offset}
              style={{ transition: "all 1s ease" }}
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="shop-font"
            style={{
              fontSize: 30,
              fontWeight: 300,
              color: "#1a1a1a",
              lineHeight: 1,
            }}
          >
            {cannabinoids[0].value.toFixed(1)}%
          </span>
          <span
            className="body-font"
            style={{
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "#888",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            D9-THC
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 160,
        }}
      >
        {slices.map((s) => (
          <div
            key={s.name}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span
              className="body-font"
              style={{
                fontSize: 12,
                color: "#1a1a1a",
                fontWeight: s.highlight ? 600 : 300,
                flex: 1,
              }}
            >
              {s.name}
            </span>
            <span
              className="body-font"
              style={{
                fontSize: 12,
                color: s.highlight ? accentColor : "#888",
                fontWeight: s.highlight ? 600 : 400,
              }}
            >
              {s.value.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const shopStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .shop-card { background: white; border: 1px solid #e8e0d4; border-radius: 2px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
  .shop-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .shop-btn { font-family: 'Jost', sans-serif; padding: 11px 28px; background: #1b4332; color: white; border: none; border-radius: 2px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; font-weight: 500; display: inline-block; text-decoration: none; text-align: center; }
  .shop-btn:hover { background: #2d6a4f; }
  .shop-btn-outline { font-family: 'Jost', sans-serif; padding: 10px 24px; background: transparent; border: 1px solid #1b4332; color: #1b4332; border-radius: 2px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-weight: 500; text-decoration: none; text-align: center; display: inline-block; }
  .shop-btn-outline:hover { background: #1b4332; color: white; }
  .shop-filter-btn { font-family: 'Jost', sans-serif; padding: 8px 20px; border: 1px solid #d8d0c4; border-radius: 2px; background: white; color: #666; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-weight: 400; white-space: nowrap; }
  .shop-filter-btn:hover { border-color: #1b4332; color: #1b4332; }
  .shop-filter-btn.active { background: #1b4332; color: white; border-color: #1b4332; }
  .shop-effect-tag { font-family: 'Jost', sans-serif; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 10px; border-radius: 2px; font-weight: 400; }
  .shop-format-badge { font-family: 'Jost', sans-serif; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 12px; border-radius: 2px; font-weight: 500; }
  .cs-card { background: #f9f7f2; border: 1px dashed #d8d0c4; border-radius: 2px; padding: 40px 28px; text-align: center; transition: border-color 0.2s; }
  .cs-card:hover { border-color: #b5935a; }
  .shop-footer-link { font-family: 'Jost', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #555; text-decoration: none; transition: color 0.2s; }
  .shop-footer-link:hover { color: #52b788; }
  .section-divider { width: 100%; height: 1px; background: linear-gradient(to right, transparent, #e0d8cc, transparent); margin: 36px 0; }
  .strain-modal-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(6,14,9,0.75); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: modalFadeIn 0.25s ease forwards; }
  .strain-modal-card { background: #faf9f6; border-radius: 4px; width: 100%; max-width: 820px; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 32px 80px rgba(0,0,0,0.55); animation: modalSlideUp 0.3s ease forwards; display: flex; flex-direction: column; }
  .strain-modal-card::-webkit-scrollbar { width: 4px; }
  .strain-modal-card::-webkit-scrollbar-track { background: #f0ebe3; }
  .strain-modal-card::-webkit-scrollbar-thumb { background: #c8bfb0; border-radius: 2px; }
  .modal-close-btn { position: absolute; top: 16px; right: 16px; z-index: 10; width: 36px; height: 36px; border-radius: 2px; background: rgba(0,0,0,0.3); border: none; color: white; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; font-family: 'Jost', sans-serif; line-height: 1; }
  .modal-close-btn:hover { background: rgba(0,0,0,0.55); }
  .modal-card { background: white; border: 1px solid #e8e0d4; border-radius: 2px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .modal-terpene-card { background: white; border: 1px solid #e8e0d4; border-radius: 2px; padding: 20px 18px; position: relative; overflow: hidden; }
  .modal-verify-link { font-family: 'Jost', sans-serif; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.55); text-decoration: none; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 2px; transition: color 0.2s, border-color 0.2s; }
  .modal-verify-link:hover { color: white; border-color: rgba(255,255,255,0.5); }
  .what-numbers-card { background: white; border: 1px solid #e8e0d4; border-radius: 2px; padding: 24px 22px; }
  @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up   { animation: fadeUp 0.6s ease forwards; }
  .fade-up-2 { animation: fadeUp 0.6s 0.1s ease forwards; opacity: 0; }
  .fade-up-3 { animation: fadeUp 0.6s 0.2s ease forwards; opacity: 0; }

  /* ── WP-J: Mobile Responsiveness ──────────────────────────────────────── */
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
    .strain-modal-card { max-height: 94vh; }
    .modal-footer-row { flex-direction: column !important; gap: 10px !important; }
    .modal-footer-row .shop-btn { width: 100%; text-align: center; }
    /* Loyalty CTA — reduce padding */
    .shop-loyalty-inner { padding: 36px 20px !important; }
    /* Loyalty CTA buttons — stack full-width */
    .shop-loyalty-btns { flex-direction: column !important; width: 100% !important; }
    .shop-loyalty-btns .shop-btn { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
  }
  @media (max-width: 480px) {
    .shop-hero-inner { padding: 32px 16px 36px !important; }
    .shop-body-inner { padding: 24px 16px !important; }
    .shop-grid { grid-template-columns: 1fr !important; }
    .shop-hero-title { font-size: 32px !important; }
    .strain-modal-overlay { padding: 0; align-items: flex-end; }
    .strain-modal-card { border-radius: 4px 4px 0 0; max-height: 94vh; }
    /* Loyalty CTA — further reduce padding on very small screens */
    .shop-loyalty-inner { padding: 28px 16px !important; }
  }
`;

// ── StrainModal v3.0 ──────────────────────────────────────────────────────────
function StrainModal({ strain, product, onClose, onAddToCart }) {
  const detail = STRAINS_DETAIL[strain.id] || {};

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const divider = (
    <div
      style={{
        height: 1,
        background:
          "linear-gradient(to right, transparent, #e0d8cc, transparent)",
        margin: "4px 0 28px",
      }}
    />
  );

  return (
    <div className="strain-modal-overlay" onClick={handleBackdrop}>
      <div className="strain-modal-card">
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* A. Hero */}
        <div
          style={{
            background: `linear-gradient(160deg, ${strain.gradientFrom} 0%, ${strain.gradientTo} 60%, ${strain.gradientFrom}dd 100%)`,
            padding: "36px 32px 32px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ marginBottom: 8 }}>
            <span
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: strain.accentColor,
                fontWeight: 500,
              }}
            >
              {detail.eybnaLine || strain.line} · Product Profile
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 2,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                background: "rgba(82,183,136,0.15)",
                color: "#52b788",
                border: "1px solid rgba(82,183,136,0.3)",
              }}
            >
              ✓ Lab Verified
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 2,
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              QR Authenticated
            </span>
          </div>
          <h2
            className="shop-font"
            style={{
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 300,
              color: "#faf9f6",
              lineHeight: 1,
              marginBottom: 10,
              letterSpacing: "0.03em",
            }}
          >
            {strain.name}
          </h2>
          <p
            className="body-font"
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 16,
              fontWeight: 300,
            }}
          >
            {strain.tagline}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "4px 12px",
                borderRadius: 2,
                color: strain.typeColor,
                background: `${strain.typeColor}18`,
                border: `1px solid ${strain.typeColor}40`,
                fontWeight: 400,
              }}
            >
              {strain.type}
            </span>
            {strain.effects.map((e) => (
              <span
                key={e}
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "4px 12px",
                  borderRadius: 2,
                  color: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  fontWeight: 400,
                }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: "32px 32px 0", overflowY: "auto" }}>
          {/* B. About */}
          {detail.description && (
            <div style={{ marginBottom: 28 }}>
              <span
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: strain.accentColor,
                }}
              >
                About This Strain
              </span>
              <p
                className="body-font"
                style={{
                  fontSize: 14,
                  lineHeight: 1.85,
                  color: "#555",
                  fontWeight: 300,
                  marginTop: 10,
                }}
              >
                {detail.description}
              </p>
              {(detail.aroma || detail.flavour) && (
                <div
                  style={{
                    display: "flex",
                    gap: 40,
                    marginTop: 20,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    ["Aroma", detail.aroma],
                    ["Flavour", detail.flavour],
                  ].map(
                    ([label, val]) =>
                      val && (
                        <div key={label}>
                          <p
                            className="body-font"
                            style={{
                              fontSize: 10,
                              letterSpacing: "0.3em",
                              color: strain.accentColor,
                              textTransform: "uppercase",
                              marginBottom: 6,
                            }}
                          >
                            {label}
                          </p>
                          <p
                            className="body-font"
                            style={{
                              fontSize: 13,
                              color: "#666",
                              fontWeight: 300,
                            }}
                          >
                            {val}
                          </p>
                        </div>
                      ),
                  )}
                </div>
              )}
            </div>
          )}
          {divider}

          {/* C. COA */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
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
                  }}
                >
                  Certificate of Analysis
                </span>
                <h3
                  className="shop-font"
                  style={{
                    fontSize: "clamp(22px, 3vw, 32px)",
                    fontWeight: 300,
                    color: "#1a1a1a",
                    marginTop: 6,
                  }}
                >
                  Distillate Lab Results
                </h3>
              </div>
              <div className="modal-card" style={{ padding: "10px 18px" }}>
                <p
                  className="body-font"
                  style={{
                    fontSize: 9,
                    color: "#aaa",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    marginBottom: 3,
                  }}
                >
                  Lab ID
                </p>
                <p
                  className="body-font"
                  style={{ fontSize: 13, color: "#52b788", fontWeight: 500 }}
                >
                  {DISTILLATE_COA.labId}
                </p>
                <p
                  className="body-font"
                  style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}
                >
                  {DISTILLATE_COA.reportedDate}
                </p>
              </div>
            </div>
            <div
              className="modal-card"
              style={{
                padding: "16px 22px",
                marginBottom: 16,
                display: "flex",
                gap: 28,
                flexWrap: "wrap",
                borderLeft: "3px solid #52b788",
              }}
            >
              {[
                ["Laboratory", DISTILLATE_COA.lab],
                ["Location", DISTILLATE_COA.labLocation],
                ["Accreditation", DISTILLATE_COA.accreditation],
                ["Method", DISTILLATE_COA.method],
              ].map(([label, val]) => (
                <div key={label}>
                  <p
                    className="body-font"
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.25em",
                      color: "#aaa",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </p>
                  <p
                    className="body-font"
                    style={{ fontSize: 12, color: "#555", fontWeight: 300 }}
                  >
                    {val}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="modal-card"
              style={{ padding: "32px 28px", marginBottom: 16 }}
            >
              <p
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  color: "#aaa",
                  textTransform: "uppercase",
                  marginBottom: 28,
                  textAlign: "center",
                }}
              >
                Cannabinoid Profile
              </p>
              <CannabinoidDonut
                cannabinoids={DISTILLATE_COA.cannabinoids}
                accentColor={strain.accentColor}
              />
              <div
                style={{
                  borderTop: "1px solid #e8e0d4",
                  marginTop: 28,
                  paddingTop: 24,
                  display: "flex",
                  gap: 32,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {DISTILLATE_COA.totals.map((t) => (
                  <div key={t.name} style={{ textAlign: "center" }}>
                    <p
                      className="body-font"
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.25em",
                        color: "#aaa",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {t.name}
                    </p>
                    <p
                      className="shop-font"
                      style={{
                        fontSize: 28,
                        color: "#1b4332",
                        fontWeight: 300,
                      }}
                    >
                      {t.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  color: "#aaa",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Additional Testing
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {DISTILLATE_COA.otherTests.map((t) => (
                  <div
                    key={t.name}
                    className="modal-card"
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="body-font"
                      style={{ fontSize: 12, color: "#555" }}
                    >
                      {t.name}
                    </span>
                    <span
                      className="body-font"
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: 2,
                        background: "rgba(181,147,90,0.1)",
                        color: "#b5935a",
                        border: "1px solid rgba(181,147,90,0.2)",
                      }}
                    >
                      Pending
                    </span>
                  </div>
                ))}
              </div>
              <p
                className="body-font"
                style={{
                  fontSize: 11,
                  color: "#bbb",
                  marginTop: 12,
                  fontStyle: "italic",
                  fontWeight: 300,
                }}
              >
                Additional testing for residual solvents, heavy metals,
                pesticides and microbials will be completed on subsequent
                batches and published here.
              </p>
            </div>
          </div>
          {divider}

          {/* D. Terpenes */}
          {detail.dominantTerpenes?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <span
                className="body-font"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: strain.accentColor,
                }}
              >
                Eybna {detail.eybnaLine}
              </span>
              <h3
                className="shop-font"
                style={{
                  fontSize: "clamp(22px, 3vw, 32px)",
                  fontWeight: 300,
                  color: "#1a1a1a",
                  marginTop: 6,
                  marginBottom: 10,
                }}
              >
                Terpene Profile
              </h3>
              {detail.eybnaDescription && (
                <p
                  className="body-font"
                  style={{
                    fontSize: 13,
                    color: "#888",
                    fontWeight: 300,
                    marginBottom: 18,
                    maxWidth: 540,
                  }}
                >
                  {detail.eybnaDescription}
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {detail.dominantTerpenes.map((t, i) => (
                  <div key={t.name} className="modal-terpene-card">
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: t.color,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <h4
                        className="shop-font"
                        style={{
                          fontSize: 18,
                          fontWeight: 400,
                          color: "#1a1a1a",
                          margin: 0,
                        }}
                      >
                        {t.name}
                      </h4>
                      <span
                        className="body-font"
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.2em",
                          color: "#ccc",
                          textTransform: "uppercase",
                          paddingTop: 3,
                        }}
                      >
                        #{i + 1}
                      </span>
                    </div>
                    <p
                      className="body-font"
                      style={{
                        fontSize: 12,
                        color: "#888",
                        lineHeight: 1.6,
                        fontWeight: 300,
                        margin: 0,
                      }}
                    >
                      {t.role}
                    </p>
                    <div
                      style={{
                        marginTop: 12,
                        height: 2,
                        background: "#f0ebe3",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${90 - i * 12}%`,
                          height: "100%",
                          background: t.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {detail.eybnaDescription && (
                <div
                  className="modal-card"
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      className="body-font"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.2em",
                        color: "#bbb",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Terpene Supplier
                    </p>
                    <p
                      className="body-font"
                      style={{ fontSize: 13, color: "#555", marginBottom: 3 }}
                    >
                      <strong style={{ color: "#1a1a1a" }}>Eybna GmbH</strong> ·
                      Berlin, Germany
                    </p>
                    <p
                      className="body-font"
                      style={{ fontSize: 11, color: "#bbb", fontWeight: 300 }}
                    >
                      Product Code: {detail.lineCode} · Pharmaceutical-grade
                      botanical-derived terpenes.
                    </p>
                  </div>
                  <span
                    className="body-font"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      padding: "4px 12px",
                      borderRadius: 2,
                      background: "rgba(82,183,136,0.1)",
                      color: "#52b788",
                      border: "1px solid rgba(82,183,136,0.2)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✓ Certified Supplier
                  </span>
                </div>
              )}
            </div>
          )}
          {divider}

          {/* E. What These Numbers Mean */}
          <div style={{ marginBottom: 28 }}>
            <span
              className="body-font"
              style={{
                fontSize: 10,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#aaa",
              }}
            >
              Understanding Your Product
            </span>
            <h3
              className="shop-font"
              style={{
                fontSize: "clamp(20px, 3vw, 30px)",
                fontWeight: 300,
                color: "#1a1a1a",
                marginTop: 6,
                marginBottom: 18,
              }}
            >
              What These Numbers Mean
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
              }}
            >
              {[
                {
                  icon: "◈",
                  title: "93.55% Total THC",
                  color: "#52b788",
                  body: "This is pharmaceutical-grade distillate. Most commercial cannabis products range from 60–80% THC. Our distillate exceeds 93%, meaning less product is needed for a consistent, controlled effect.",
                },
                {
                  icon: "◉",
                  title: "The Entourage Effect",
                  color: strain.accentColor,
                  body: "The minor cannabinoids CBN (0.78%), CBD (0.98%) and CBG (0.09%) work synergistically with THC and terpenes to shape the overall experience — this is the entourage effect.",
                },
                {
                  icon: "✻",
                  title: "Terpene Blending",
                  color: "#b5935a",
                  body: `The ${strain.name} terpene profile from Eybna is blended with the distillate to recreate the authentic strain experience. Terpenes determine aroma, flavour and modulate the effect profile.`,
                },
                {
                  icon: "△",
                  title: "CO₂ Extracted",
                  color: "#4a9eba",
                  body: "Our distillate is produced using supercritical CO₂ extraction — the cleanest method available. Zero solvent residue, no heavy metals from equipment, no pesticides from source material.",
                },
              ].map((item) => (
                <div key={item.title} className="what-numbers-card">
                  <div
                    style={{
                      fontSize: 22,
                      color: item.color,
                      marginBottom: 12,
                    }}
                  >
                    {item.icon}
                  </div>
                  <h4
                    className="shop-font"
                    style={{
                      fontSize: 18,
                      color: "#1a1a1a",
                      marginBottom: 10,
                      fontWeight: 400,
                    }}
                  >
                    {item.title}
                  </h4>
                  <p
                    className="body-font"
                    style={{
                      fontSize: 12,
                      color: "#777",
                      lineHeight: 1.75,
                      fontWeight: 300,
                      margin: 0,
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 8 }} />
        </div>

        {/* F. Sticky footer */}
        <div
          style={{
            background: `linear-gradient(135deg, ${strain.gradientFrom}, ${strain.gradientTo})`,
            padding: "20px 32px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <Link
            to={`/verify/${strain.id}`}
            className="modal-verify-link"
            onClick={onClose}
          >
            Full verification page →
          </Link>
          <div
            className="modal-footer-row"
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {product && (
              <span
                className="body-font"
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: 300,
                }}
              >
                R{product.price.toLocaleString()} · {product.formatShort}
              </span>
            )}
            <button
              className="shop-btn"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "10px 20px",
              }}
              onClick={onClose}
            >
              Close
            </button>
            {product && (
              <button
                className="shop-btn"
                style={{
                  background: "#52b788",
                  color: "#0e1a14",
                  fontWeight: 600,
                  padding: "10px 24px",
                }}
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shop Component ────────────────────────────────────────────────────────────
export default function Shop() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { industryProfile } = useTenant();
  const isFoodBev = industryProfile === "food_beverage";
  const isGeneral =
    industryProfile === "general_retail" || industryProfile === "mixed_retail";

  const [filter, setFilter] = useState("all");
  const [cartToast, setCartToast] = useState(null);
  const [selectedStrain, setSelectedStrain] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [liveProducts, setLiveProducts] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // ── WP-H: Admin below-COGS warning ──────────────────────────────────
  const [cogsWarnings, setCogsWarnings] = useState([]);
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    const checkCogsWarnings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role !== "admin" && profile?.role !== "hq") return;

        const [pricingRes, cogsRes, suppRes, fxRes] = await Promise.all([
          supabase
            .from("product_pricing")
            .select("product_cogs_id, channel, sell_price_zar")
            .eq("channel", "retail"),
          supabase
            .from("product_cogs")
            .select(
              "id, product_name, sku, hardware_item_id, hardware_qty, terpene_item_id, terpene_qty_g, other_cost_zar",
            ),
          supabase.from("supplier_products").select("id, unit_price_usd"),
          supabase
            .from("fx_rates")
            .select("rate")
            .eq("currency_pair", "USD/ZAR")
            .order("fetched_at", { ascending: false })
            .limit(1),
        ]);

        const usdZar = fxRes.data?.[0]?.rate || 18.5;
        const warnings = [];

        (pricingRes.data || []).forEach((p) => {
          if (!p.sell_price_zar) return;
          const recipe = (cogsRes.data || []).find(
            (r) => r.id === p.product_cogs_id,
          );
          if (!recipe) return;
          const hw = (suppRes.data || []).find(
            (s) => s.id === recipe.hardware_item_id,
          );
          const tp = (suppRes.data || []).find(
            (s) => s.id === recipe.terpene_item_id,
          );
          const hwCost = hw
            ? parseFloat(recipe.hardware_qty || 1) *
              parseFloat(hw.unit_price_usd) *
              usdZar
            : 0;
          const tpCost = tp
            ? parseFloat(recipe.terpene_qty_g || 0) *
              (parseFloat(tp.unit_price_usd) / 50) *
              usdZar
            : 0;
          const cogs = hwCost + tpCost + parseFloat(recipe.other_cost_zar || 0);
          if (parseFloat(p.sell_price_zar) < cogs) {
            warnings.push({
              name: recipe.product_name,
              sku: recipe.sku,
              sellPrice: parseFloat(p.sell_price_zar).toFixed(2),
              cogs: cogs.toFixed(2),
            });
          }
        });
        setCogsWarnings(warnings);
      } catch {
        /* non-admin or missing data — silently skip */
      }
    };
    checkCogsWarnings();
  }, []);
  // ── End WP-H ─────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingInventory(true);
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select(
            "id, name, sku, category, unit, quantity_on_hand, cost_price, sell_price, allergen_flags, ingredients_notes, shelf_life_days, storage_instructions, expiry_date, description",
          )
          .eq("category", "finished_product")
          .eq("is_active", true)
          .gt("quantity_on_hand", 0)
          .order("name");
        if (error) {
          console.error("[Shop] Inventory fetch error:", error);
          setLiveProducts([]);
          return;
        }
        setLiveProducts(
          (data || []).map(
            industryProfile === "food_beverage"
              ? buildFoodProduct
              : industryProfile === "general_retail" ||
                  industryProfile === "mixed_retail"
                ? buildGeneralProduct
                : buildProductFromInventory,
          ),
        );
      } catch (err) {
        console.error("[Shop] Fetch error:", err);
        setLiveProducts([]);
      } finally {
        setLoadingInventory(false);
      }
    };
    fetchProducts();
  }, [industryProfile]);

  const handleAddToCart = (product) => {
    addToCart(product);
    setCartToast(product.name + " — " + product.formatShort);
    setTimeout(() => setCartToast(null), 2200);
  };

  const handleViewProfile = (product) => {
    if (STRAINS_DETAIL[product.strainId]) {
      setSelectedStrain(product.strain);
      setSelectedProduct(product);
    } else {
      navigate(`/verify/${product.strainId}`);
    }
  };

  const handleCloseModal = () => {
    setSelectedStrain(null);
    setSelectedProduct(null);
  };

  const showVapes =
    filter === "all" ||
    filter === "vapes" ||
    FILTER_OPTIONS.find((f) => f.key === filter)?.line;
  const showCS = filter === "all" || filter === "coming-soon";
  const lineFilter = FILTER_OPTIONS.find((f) => f.key === filter)?.line;
  const filteredVapes = lineFilter
    ? liveProducts.filter((p) => p.strain.line === lineFilter)
    : showVapes
      ? liveProducts
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
      {/* ── WP-N: Unified Client Header ── */}
      <ClientHeader variant="light" />

      <style>{shopStyles}</style>

      {/* ── ADMIN: Below-COGS Warning Banner (WP-H) ── */}
      {cogsWarnings.length > 0 && !warningDismissed && (
        <div
          style={{
            background: "#FFF3E0",
            borderBottom: "2px solid #FF8F00",
            padding: "12px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            position: "relative",
            zIndex: 100,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#E65100",
              }}
            >
              Admin: {cogsWarnings.length} product
              {cogsWarnings.length > 1 ? "s" : ""} priced below COGS
            </span>
            {cogsWarnings.map((w) => (
              <span
                key={w.sku || w.name}
                style={{
                  fontFamily: "Jost, sans-serif",
                  fontSize: 12,
                  color: "#BF360C",
                  background: "rgba(191,54,12,0.08)",
                  padding: "3px 10px",
                  borderRadius: 2,
                  border: "1px solid rgba(191,54,12,0.2)",
                }}
              >
                {w.name} — R{w.sellPrice} sell / R{w.cogs} cost
              </span>
            ))}
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            style={{
              background: "none",
              border: "1px solid #E65100",
              borderRadius: 2,
              padding: "5px 14px",
              cursor: "pointer",
              fontFamily: "Jost, sans-serif",
              fontSize: 11,
              color: "#E65100",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

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
            {isFoodBev
              ? "Fresh ingredients · Allergen-aware · Traceable sourcing"
              : isGeneral
                ? "Quality products · Verified stock · Fast delivery"
                : "Premium cannabis vapes · 18 Eybna terpene strains · Lab verified"}
          </p>
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
          {(isFoodBev
            ? [
                { key: "all", label: "All Products" },
                { key: "coming-soon", label: "Coming Soon" },
              ]
            : isGeneral
              ? [
                  { key: "all", label: "All Products" },
                  { key: "coming-soon", label: "Coming Soon" },
                ]
              : FILTER_OPTIONS
          ).map((f) => (
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
            {loadingInventory ? (
              "Loading products..."
            ) : (
              <>
                Showing {totalShowing}{" "}
                {totalShowing === 1 ? "product" : "products"}
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
              </>
            )}
          </span>
        </div>

        {loadingInventory ? (
          <div
            style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}
          >
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
              🌿
            </div>
            <p
              className="body-font"
              style={{ fontSize: 13, fontWeight: 300, margin: 0 }}
            >
              Loading inventory...
            </p>
          </div>
        ) : (
          <>
            {filteredVapes.length > 0 && (
              <>
                {filter === "all" && filteredCS.length > 0 && (
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
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: 24,
                    marginBottom: 48,
                  }}
                >
                  {filteredVapes.map((product) =>
                    isFoodBev ? (
                      <FoodShopCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                      />
                    ) : isGeneral ? (
                      <GeneralShopCard
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                      />
                    ) : (
                      <VapeCard
                        key={product.id}
                        product={product}
                        navigate={navigate}
                        onAddToCart={handleAddToCart}
                        onViewProfile={handleViewProfile}
                      />
                    ),
                  )}
                </div>
              </>
            )}
            {filteredVapes.length === 0 && showVapes && !showCS && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
                  🌿
                </div>
                <p
                  className="body-font"
                  style={{ color: "#888", fontSize: 15, fontWeight: 300 }}
                >
                  No vape products currently in stock. Check back soon!
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
          </>
        )}

        {filteredCS.length > 0 && !loadingInventory && (
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

        {totalShowing === 0 && !loadingInventory && (
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

      {/* ── LOYALTY CTA ── */}
      {/* v4.1: shop-loyalty-inner + shop-loyalty-btns classes for mobile responsiveness */}
      <div style={{ background: "linear-gradient(135deg, #1b4332, #2d6a4f)" }}>
        <div
          className="shop-loyalty-inner"
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
          <div
            className="shop-loyalty-btns"
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
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

      {/* ── STRAIN MODAL ── */}
      {selectedStrain && (
        <StrainModal
          strain={selectedStrain}
          product={selectedProduct}
          onClose={handleCloseModal}
          onAddToCart={handleAddToCart}
        />
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

// ── VapeCard ──────────────────────────────────────────────────────────────────
function FoodShopCard({ product, onAddToCart }) {
  const allergens = product.allergens || [];
  const isExpired = product.daysToExpiry !== null && product.daysToExpiry < 0;
  const expiryWarning =
    product.daysToExpiry !== null && product.daysToExpiry <= 30 && !isExpired;
  return (
    <div className="shop-card">
      <div
        style={{
          height: 6,
          background: "linear-gradient(to right, #52b788, #2d6a4f)",
        }}
      />
      <div style={{ padding: "20px 24px 24px" }}>
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
            {product.category ? product.category.replace(/_/g, " ") : "Product"}
          </span>
          {product.shelf_life_days && (
            <span
              className="shop-format-badge"
              style={{
                background: "rgba(181,147,90,0.08)",
                color: "#b5935a",
                border: "1px solid rgba(181,147,90,0.2)",
              }}
            >
              {product.shelf_life_days} day shelf life
            </span>
          )}
        </div>
        <h3
          className="shop-font"
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: "#1a1a1a",
            margin: "0 0 4px",
            lineHeight: 1.2,
          }}
        >
          {product.name}
        </h3>
        {product.sku && (
          <p
            className="body-font"
            style={{
              fontSize: 11,
              color: "#aaa",
              margin: "0 0 12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            SKU: {product.sku}
          </p>
        )}
        {allergens.length > 0 && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 10px",
              background: "#fff8e7",
              border: "1px solid #f0c36d",
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#b5935a",
                fontWeight: 700,
                marginBottom: 5,
              }}
            >
              Contains Allergens
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {allergens.map((a) => (
                <span
                  key={a}
                  className="shop-effect-tag"
                  style={{
                    background: "#fff3cd",
                    color: "#856404",
                    border: "1px solid #ffc10740",
                    fontSize: 9,
                  }}
                >
                  {a.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
        {product.expiry_date && (
          <div
            style={{
              marginBottom: 12,
              fontSize: 11,
              padding: "5px 8px",
              borderRadius: 2,
              background: isExpired
                ? "#fdf0ef"
                : expiryWarning
                  ? "#fff3e8"
                  : "#f0faf5",
              color: isExpired
                ? "#c0392b"
                : expiryWarning
                  ? "#e67e22"
                  : "#2d6a4f",
              border: `1px solid ${isExpired ? "#c0392b30" : expiryWarning ? "#e67e2230" : "#52b78830"}`,
            }}
          >
            {isExpired
              ? "Expired"
              : expiryWarning
                ? `Expires in ${product.daysToExpiry} days`
                : `Best before ${new Date(product.expiry_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`}
          </div>
        )}
        {product.description && (
          <p
            className="body-font"
            style={{
              fontSize: 12,
              color: "#888",
              fontWeight: 300,
              lineHeight: 1.6,
              margin: "0 0 14px",
            }}
          >
            {product.description}
          </p>
        )}
        {product.ingredients_notes && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 10px",
              background: "#f4f0e8",
              borderRadius: 2,
              fontSize: 12,
              color: "#666",
              lineHeight: 1.5,
            }}
          >
            <strong
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 3,
                color: "#888",
              }}
            >
              Ingredients
            </strong>
            {product.ingredients_notes}
          </div>
        )}
        {product.storage_instructions && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 10px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 2,
              fontSize: 11,
              color: "#1e3a5f",
            }}
          >
            <strong
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 3,
              }}
            >
              Storage
            </strong>
            {product.storage_instructions}
          </div>
        )}
        <div style={{ height: 1, background: "#f0ebe0", marginBottom: 16 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span
            className="shop-font"
            style={{ fontSize: 26, fontWeight: 400, color: "#b5935a" }}
          >
            R{product.price.toLocaleString()}
          </span>
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
  );
}

function GeneralShopCard({ product, onAddToCart }) {
  return (
    <div className="shop-card">
      <div
        style={{
          height: 6,
          background: "linear-gradient(to right, #1b4332, #2d6a4f)",
        }}
      />
      <div style={{ padding: "20px 24px 24px" }}>
        <div style={{ marginBottom: 14 }}>
          <span
            className="shop-format-badge"
            style={{
              background: "rgba(27,67,50,0.06)",
              color: "#1b4332",
              border: "1px solid rgba(27,67,50,0.15)",
            }}
          >
            {product.category ? product.category.replace(/_/g, " ") : "Product"}
          </span>
        </div>
        <h3
          className="shop-font"
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: "#1a1a1a",
            margin: "0 0 4px",
            lineHeight: 1.2,
          }}
        >
          {product.name}
        </h3>
        {product.sku && (
          <p
            className="body-font"
            style={{
              fontSize: 11,
              color: "#aaa",
              margin: "0 0 12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            SKU: {product.sku}
          </p>
        )}
        {product.description && (
          <p
            className="body-font"
            style={{
              fontSize: 12,
              color: "#888",
              fontWeight: 300,
              lineHeight: 1.6,
              margin: "0 0 14px",
            }}
          >
            {product.description}
          </p>
        )}
        {product.storage_instructions && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 10px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 2,
              fontSize: 11,
              color: "#1e3a5f",
            }}
          >
            <strong
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 3,
              }}
            >
              Storage
            </strong>
            {product.storage_instructions}
          </div>
        )}
        <div style={{ height: 1, background: "#f0ebe0", marginBottom: 16 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span
            className="shop-font"
            style={{ fontSize: 26, fontWeight: 400, color: "#b5935a" }}
          >
            R{product.price.toLocaleString()}
          </span>
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
  );
}

function VapeCard({ product, navigate, onAddToCart, onViewProfile }) {
  const s = product.strain;
  const is2ml = product.format.includes("2ml");
  const isPostless = product.badge === "Post-less";
  return (
    <div className="shop-card">
      <div
        style={{
          height: 6,
          background: `linear-gradient(to right, ${s.gradientFrom}, ${s.gradientTo})`,
        }}
      />
      <div style={{ padding: "20px 24px 24px" }}>
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
                : isPostless
                  ? "rgba(74,110,190,0.08)"
                  : "rgba(27,67,50,0.06)",
              color: is2ml ? "#b5935a" : isPostless ? "#4a6ebe" : "#1b4332",
              border: `1px solid ${is2ml ? "rgba(181,147,90,0.2)" : isPostless ? "rgba(74,110,190,0.2)" : "rgba(27,67,50,0.15)"}`,
            }}
          >
            {product.badge} · {product.formatShort}
          </span>
        </div>
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
        <div style={{ height: 1, background: "#f0ebe0", marginBottom: 18 }} />
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
            <button
              className="shop-btn-outline"
              style={{ padding: "8px 16px", fontSize: 10 }}
              onClick={() => onViewProfile(product)}
            >
              View Profile
            </button>
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
