// src/pages/Shop.js v2.9
// v2.9: STRAIN MODAL (DEC-018) — "View Profile" link in VapeCard replaced
//       with frosted glass in-page overlay modal. No page navigation on click.
//       Scroll position on Shop page preserved. Modal shows: strain hero,
//       description, aroma/flavour, terpene profile, COA summary, Eybna info.
//       STRAINS_DETAIL + DISTILLATE_COA extracted inline from
//       ProductVerification.js v2.3 (ProductVerification.js unchanged — locked).
//       StrainModal component added to this file.
//       Body scroll locks while modal is open. Backdrop click closes modal.
// v2.8: LIVE INVENTORY — Task A-4 (Automation WP). Shop page now queries
//       inventory_items (category: "finished_product") instead of using hardcoded
//       VAPE_PRODUCTS array. STRAINS array kept as visual metadata lookup (DEC-019).
//       Each inventory item is matched to a strain for gradients, effects, icons.
//       inventory_item_id added to product objects for Task A-5 cart deduction.
//       Products with no strain match use generic styling. Empty inventory = no vapes shown.
// v2.7: CART INTEGRATION — Import useCart from CartContext, call addToCart(product)
//       on "Add to Cart" click. Toast now says "added to cart" (not "coming soon").
//       Cart badge in NavBar updates in real time.
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { supabase } from "../services/supabaseClient";

// ── Distillate COA (extracted from ProductVerification.js v2.3 — DO NOT EDIT) ──
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
    { name: "D8-THC", value: 3.088 },
    { name: "CBD", value: 0.9756 },
    { name: "CBN", value: 0.7809 },
    { name: "CBG", value: 0.0868 },
    { name: "CBDA", value: 0.043 },
    { name: "THCA", value: 0.0001 },
  ],
  totals: [
    { name: "Total THC", value: "93.55%" },
    { name: "Total CBD", value: "1.01%" },
    { name: "Total Cannabinoids", value: "98.53%" },
  ],
};

// ── Strain Detail Data (extracted from ProductVerification.js v2.3 — DO NOT EDIT) ─
// Visual metadata lives in STRAINS array below (DEC-019).
// This object holds CONTENT data: description, terpenes, aroma, flavour, Eybna info.
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

// ── Strain Data (EXTRACTED DIRECTLY from ProductVerification.js v2.3) ────────
// Source of truth for VISUAL METADATA ONLY (DEC-019).
// Inventory determines WHAT shows; this array determines HOW it looks.
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

// ── Strain matching helpers ─────────────────────────────────────────────────
const STRAINS_BY_LENGTH = [...STRAINS].sort(
  (a, b) => b.name.length - a.name.length,
);

const DEFAULT_STRAIN = {
  id: "unknown",
  name: "Unknown",
  line: "Other",
  lineShort: "Other",
  type: "Hybrid",
  typeColor: "#888888",
  accentColor: "#aaaaaa",
  gradientFrom: "#2a2a2a",
  gradientTo: "#4a4a4a",
  icon: "●",
  tagline: "Premium Cannabis Product.",
  effects: [],
};

function buildProductFromInventory(item) {
  const lowerName = item.name.toLowerCase();
  const matchedStrain = STRAINS_BY_LENGTH.find((s) =>
    lowerName.startsWith(s.name.toLowerCase()),
  );
  const is2ml = /2\.?0?\s*ml/i.test(item.name);
  const displayName = matchedStrain
    ? matchedStrain.name
    : item.name
        .replace(/\d+\.?\d*\s*ml\s*/i, "")
        .replace(/cartridge|disposable|pen|pod/i, "")
        .trim() || item.name;
  const strain = matchedStrain || {
    ...DEFAULT_STRAIN,
    id: item.id,
    name: displayName,
  };
  return {
    id: item.id,
    inventory_item_id: item.id,
    strainId: strain.id,
    name: displayName,
    strain,
    format: is2ml ? "2ml Disposable Pen" : "1ml Cartridge",
    formatShort: is2ml ? "2ml Pen" : "1ml Cart",
    price: is2ml ? 1600 : 800,
    thc: "93.55%",
    badge: is2ml ? "All-in-One" : "510 Thread",
    quantity_on_hand: item.quantity_on_hand,
    sku: item.sku,
  };
}

// ── Coming Soon Categories ──────────────────────────────────────────────────
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
    text-transform: uppercase; padding: 3px 10px; border-radius: 2px; font-weight: 400;
  }
  .shop-format-badge {
    font-family: 'Jost', sans-serif; font-size: 10px; letter-spacing: 0.15em;
    text-transform: uppercase; padding: 4px 12px; border-radius: 2px; font-weight: 500;
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
  /* ── Modal styles ── */
  .strain-modal-overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(6, 14, 9, 0.72);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: modalFadeIn 0.25s ease forwards;
  }
  .strain-modal-card {
    background: #faf9f6; border-radius: 4px; width: 100%; max-width: 780px;
    max-height: 88vh; overflow-y: auto; position: relative;
    box-shadow: 0 32px 80px rgba(0,0,0,0.5);
    animation: modalSlideUp 0.3s ease forwards;
  }
  .strain-modal-card::-webkit-scrollbar { width: 4px; }
  .strain-modal-card::-webkit-scrollbar-track { background: #f0ebe3; }
  .strain-modal-card::-webkit-scrollbar-thumb { background: #c8bfb0; border-radius: 2px; }
  .modal-close-btn {
    position: absolute; top: 16px; right: 16px; z-index: 10;
    width: 36px; height: 36px; border-radius: 2px;
    background: rgba(0,0,0,0.25); border: none; color: white;
    font-size: 18px; cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    transition: background 0.2s; font-family: 'Jost', sans-serif;
    line-height: 1;
  }
  .modal-close-btn:hover { background: rgba(0,0,0,0.5); }
  .modal-terpene-card {
    background: white; border: 1px solid #e8e0d4; border-radius: 2px;
    padding: 20px 18px; position: relative; overflow: hidden;
  }
  .modal-view-profile-link {
    font-family: 'Jost', sans-serif; font-size: 11px; letter-spacing: 0.2em;
    text-transform: uppercase; color: rgba(255,255,255,0.6); text-decoration: none;
    border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 2px;
    transition: color 0.2s, border-color 0.2s;
  }
  .modal-view-profile-link:hover { color: white; border-color: rgba(255,255,255,0.5); }
  @keyframes modalFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
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
    .strain-modal-card { max-height: 92vh; }
    .modal-footer-row { flex-direction: column !important; gap: 10px !important; }
    .modal-footer-row .shop-btn { width: 100%; text-align: center; }
  }
  @media (max-width: 480px) {
    .shop-hero-inner { padding: 32px 16px 36px !important; }
    .shop-body-inner { padding: 24px 16px !important; }
    .shop-grid { grid-template-columns: 1fr !important; }
    .shop-hero-title { font-size: 32px !important; }
    .strain-modal-overlay { padding: 0; align-items: flex-end; }
    .strain-modal-card { border-radius: 4px 4px 0 0; max-height: 94vh; }
  }
`;

// ── StrainModal Component ─────────────────────────────────────────────────────
function StrainModal({ strain, product, onClose, onAddToCart }) {
  const detail = STRAINS_DETAIL[strain.id] || {};

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape key
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

  return (
    <div className="strain-modal-overlay" onClick={handleBackdrop}>
      <div className="strain-modal-card">
        {/* Close button */}
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        {/* ── A. Hero strip ── */}
        <div
          style={{
            background: `linear-gradient(160deg, ${strain.gradientFrom} 0%, ${strain.gradientTo} 60%, ${strain.gradientFrom}dd 100%)`,
            padding: "36px 32px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* subtle radial glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ marginBottom: 10 }}>
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

        {/* ── Modal body ── */}
        <div style={{ padding: "32px 32px 0" }}>
          {/* ── B. About ── */}
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
            </div>
          )}

          {/* ── C. Aroma & Flavour ── */}
          {(detail.aroma || detail.flavour) && (
            <>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, #e0d8cc, transparent)",
                  margin: "4px 0 24px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 40,
                  marginBottom: 28,
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
                            marginBottom: 8,
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
            </>
          )}

          {/* ── D. Terpene Profile ── */}
          {detail.dominantTerpenes && detail.dominantTerpenes.length > 0 && (
            <>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, #e0d8cc, transparent)",
                  margin: "4px 0 24px",
                }}
              />
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
                  Terpene Profile
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: 12,
                    marginTop: 14,
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
              </div>
            </>
          )}

          {/* ── E. COA Summary ── */}
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, #e0d8cc, transparent)",
              margin: "4px 0 24px",
            }}
          />
          <div style={{ marginBottom: 28 }}>
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
            <div
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: 2,
                borderLeft: "3px solid #52b788",
                padding: "20px 24px",
                marginTop: 14,
              }}
            >
              {/* THC highlight */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <span
                  className="shop-font"
                  style={{
                    fontSize: 40,
                    fontWeight: 300,
                    color: "#1b4332",
                    lineHeight: 1,
                  }}
                >
                  93.55%
                </span>
                <span
                  className="body-font"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#888",
                  }}
                >
                  D9-THC
                </span>
              </div>
              {/* Totals row */}
              <div
                style={{
                  display: "flex",
                  gap: 32,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {DISTILLATE_COA.totals.map((t) => (
                  <div key={t.name}>
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
                      {t.name}
                    </p>
                    <p
                      className="shop-font"
                      style={{
                        fontSize: 22,
                        color: "#1b4332",
                        fontWeight: 300,
                      }}
                    >
                      {t.value}
                    </p>
                  </div>
                ))}
              </div>
              {/* Lab info */}
              <div
                style={{
                  borderTop: "1px solid #f0ebe3",
                  paddingTop: 14,
                  display: "flex",
                  gap: 28,
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["Lab", DISTILLATE_COA.lab],
                  ["Lab ID", DISTILLATE_COA.labId],
                  ["Accreditation", DISTILLATE_COA.accreditation],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p
                      className="body-font"
                      style={{
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        color: "#bbb",
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </p>
                    <p
                      className="body-font"
                      style={{ fontSize: 12, color: "#666", fontWeight: 300 }}
                    >
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── F. Eybna Line ── */}
          {detail.eybnaDescription && (
            <>
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, #e0d8cc, transparent)",
                  margin: "4px 0 24px",
                }}
              />
              <div
                style={{
                  background: "white",
                  border: "1px solid #e8e0d4",
                  borderRadius: 2,
                  padding: "18px 22px",
                  marginBottom: 28,
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
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
                    style={{ fontSize: 13, color: "#555", marginBottom: 4 }}
                  >
                    <strong style={{ color: "#1a1a1a" }}>Eybna GmbH</strong> ·
                    Berlin, Germany
                  </p>
                  <p
                    className="body-font"
                    style={{
                      fontSize: 13,
                      color: "#777",
                      lineHeight: 1.7,
                      fontWeight: 300,
                    }}
                  >
                    {detail.eybnaDescription}
                  </p>
                  {detail.lineCode && (
                    <p
                      className="body-font"
                      style={{
                        fontSize: 11,
                        color: "#bbb",
                        marginTop: 6,
                        fontWeight: 300,
                      }}
                    >
                      Product Code: {detail.lineCode} · Pharmaceutical-grade
                      botanical-derived terpenes.
                    </p>
                  )}
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
            </>
          )}
        </div>

        {/* ── G. Footer ── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${strain.gradientFrom}, ${strain.gradientTo})`,
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Link
            to={`/verify/${strain.id}`}
            className="modal-view-profile-link"
            onClick={onClose}
          >
            Full verification page →
          </Link>
          <div
            className="modal-footer-row"
            style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            <button
              className="shop-btn"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "10px 22px",
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
                }}
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
              >
                Add to Cart — R{product.price.toLocaleString()}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Shop() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [filter, setFilter] = useState("all");
  const [cartToast, setCartToast] = useState(null);
  const [selectedStrain, setSelectedStrain] = useState(null); // v2.9: modal state
  const [selectedProduct, setSelectedProduct] = useState(null); // v2.9: product for modal CTA

  // ── v2.8: Live inventory state ─────────────────────────────────────
  const [liveProducts, setLiveProducts] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // ── v2.8: Fetch finished products from inventory ───────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingInventory(true);
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("id, name, sku, category, unit, quantity_on_hand, cost_price")
          .eq("category", "finished_product")
          .eq("is_active", true)
          .gt("quantity_on_hand", 0)
          .order("name");

        if (error) {
          console.error("[Shop] Inventory fetch error:", error);
          setLiveProducts([]);
          return;
        }

        const products = (data || []).map((item) =>
          buildProductFromInventory(item),
        );
        setLiveProducts(products);
        console.log(
          `[Shop] Loaded ${products.length} products from ${(data || []).length} inventory items`,
        );
      } catch (err) {
        console.error("[Shop] Fetch error:", err);
        setLiveProducts([]);
      } finally {
        setLoadingInventory(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = (product) => {
    addToCart(product);
    setCartToast(product.name + " — " + product.formatShort);
    setTimeout(() => setCartToast(null), 2200);
  };

  // v2.9: Open modal with strain + product context
  const handleViewProfile = (product) => {
    const detail = STRAINS_DETAIL[product.strainId];
    if (detail) {
      setSelectedStrain(product.strain);
      setSelectedProduct(product);
    } else {
      // Fallback: no detail data — navigate to verify page
      navigate(`/verify/${product.strainId}`);
    }
  };

  const handleCloseModal = () => {
    setSelectedStrain(null);
    setSelectedProduct(null);
  };

  // Filter logic
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

        {/* ── VAPE GRID ── */}
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
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(300px, 1fr))",
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
                      onViewProfile={handleViewProfile}
                    />
                  ))}
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

        {/* ── COMING SOON GRID ── */}
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

        {/* Empty state */}
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

      {/* ── v2.9: STRAIN MODAL ── */}
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

// ── Vape Product Card ─────────────────────────────────────────────────────────
// v2.9: "View Profile" is now a button (not Link) — opens StrainModal via onViewProfile prop.
function VapeCard({ product, navigate, onAddToCart, onViewProfile }) {
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
            {/* v2.9: button instead of Link — opens StrainModal */}
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
