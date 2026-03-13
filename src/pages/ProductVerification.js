// src/pages/ProductVerification.js v2.4
// v2.4: WP-N — Added <ClientHeader variant="light" /> to all render branches
// v2.3: UX/UI REDESIGN (WP1) — Cream background matching Landing page aesthetic.
//       Hero gradient retained but limited to hero section only.
//       Body sections: cream bg (#faf9f6), dark text, white cards.
//       Horizontal cannabinoid bars REPLACED with SVG donut chart.
//       All strain data, COA data, terpene profiles UNCHANGED.
// v2.2: Added 13 Eybna strain profiles (total: 18).
// v2.1: Removed custom nav — NavBar in App.js handles navigation + auth state.

import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import ClientHeader from "../components/ClientHeader";

// ── Distillate COA Data (Ecogreen Analytics — Lab ID: JB26-046-01) ──────────
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

// ── Strain Database ───────────────────────────────────────────────────────────
const STRAINS = {
  "pineapple-express": {
    id: "pineapple-express",
    name: "Pineapple Express",
    line: "Pure Terpenes Line",
    lineCode: "6-11-0002",
    type: "Sativa-Dominant Hybrid",
    typeColor: "#52b788",
    accentColor: "#e8a020",
    gradientFrom: "#1b4332",
    gradientTo: "#2d6a4f",
    icon: "⬡",
    tagline: "Vibrant. Tropical. Energising.",
    description:
      "Bright pineapple and citrus notes blend with earthy pine for a vibrant, tropical, and refreshing aroma experience. A combination of exotic sweet pineapple flavor with cedar and pine notes, as well as fine fruity undertones. One of the most recognised sativa profiles in the world.",
    effects: ["Euphoric", "Creative", "Uplifting", "Energising", "Focused"],
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
    eybnaDescription:
      "Eybna's Pure Terpenes Line captures strain-authentic aromatic profiles using only botanical-derived terpenes, without any additives or cutting agents.",
  },
  "gelato-41": {
    id: "gelato-41",
    name: "Gelato #41",
    line: "Palate Line",
    lineCode: "8-13-0002",
    type: "Indica-Dominant Hybrid",
    typeColor: "#9b6b9e",
    accentColor: "#c084d4",
    gradientFrom: "#2a1a3e",
    gradientTo: "#5a2d7a",
    icon: "◉",
    tagline: "Sweet. Creamy. Deeply Relaxing.",
    description:
      "Gelato #41 combines Sunset Sherbert and Thin Mint genetics, delivering a sweet and earthy aroma with notes of lavender and pine. Dominated by caryophyllene, limonene and myrcene, this dessert-forward strain delivers creative euphoria that melts into deep body relaxation.",
    effects: ["Relaxing", "Euphoric", "Creative", "Happy", "Sleepy"],
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
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  "cinnamon-kush-cake": {
    id: "cinnamon-kush-cake",
    name: "Cinnamon Kush Cake",
    line: "Live Line",
    lineCode: "7-803-0002",
    type: "Indica-Dominant",
    typeColor: "#c0764a",
    accentColor: "#d4894a",
    gradientFrom: "#2a1a0e",
    gradientTo: "#7c3a10",
    icon: "◈",
    tagline: "Warm. Spiced. Evening Comfort.",
    description:
      "Sweet and spicy cinnamon bun with deep kush notes. An indica-dominant strain that delivers warm, spiced comfort with a vanilla and earthy peppermint base. The Live Line captures the aromatic peak of the cannabis plant at harvest, expressing its most pure and pungent flavours.",
    effects: [
      "Deeply Relaxing",
      "Sedating",
      "Body Calm",
      "Sleep Aid",
      "Stress Relief",
    ],
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
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  "sweet-watermelon": {
    id: "sweet-watermelon",
    name: "Sweet Watermelon",
    line: "Enhancer Line",
    lineCode: "10-520-0002",
    type: "Sativa-Hybrid",
    typeColor: "#e05a7a",
    accentColor: "#f07090",
    gradientFrom: "#1a1a2e",
    gradientTo: "#6a1a3a",
    icon: "◎",
    tagline: "Fresh. Juicy. Uplifting.",
    description:
      "A vibrant tropical flavour that balances sweet and tart notes with a refreshing, juicy finish. Sweet Watermelon from Eybna's Enhancer Line is designed to amplify and elevate extract profiles with a bright, clean fruit character that enhances the overall sensory experience.",
    effects: ["Uplifting", "Refreshing", "Happy", "Social", "Light Euphoria"],
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
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  zkz: {
    id: "zkz",
    name: "ZKZ",
    line: "Live Plus+ Line",
    lineCode: "14-501-0002",
    type: "Balanced Hybrid",
    typeColor: "#4a9eba",
    accentColor: "#5ab8d4",
    gradientFrom: "#0a1a2e",
    gradientTo: "#1a4a6e",
    icon: "◇",
    tagline: "Sweet. Candy. Award-Winning.",
    description:
      "An award-winning, California-bred strain that is a cross between famously fruity genetics, producing a unique sensory experience. ZKZ is known for its sweet and candy-like flavour, characterised by strong fruity notes and ripe strawberry. One of the most celebrated profiles in the premium cannabis market.",
    effects: ["Euphoric", "Relaxing", "Happy", "Creative", "Balanced"],
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
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
  "wedding-cake": {
    id: "wedding-cake",
    name: "Wedding Cake",
    line: "Pure Terpenes Line",
    lineCode: "6-23-0002",
    type: "Indica-Dominant Hybrid",
    typeColor: "#c9a84c",
    accentColor: "#e8c870",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a5a2a",
    icon: "⬡",
    tagline: "Rich. Vanilla. Deeply Euphoric.",
    description:
      "Wedding Cake, also known as Pink Cookies, is a cross of Triangle Kush and Animal Mints that delivers a rich, tangy vanilla profile with earthy pepper undertones. Known for its dessert-like sweetness layered over a peppery kush base, this indica-dominant hybrid produces powerful euphoria paired with full-body relaxation.",
    effects: ["Euphoric", "Relaxing", "Happy", "Appetite", "Calm"],
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
    eybnaDescription:
      "Eybna's Pure Terpenes Line captures strain-authentic aromatic profiles using only botanical-derived terpenes, without any additives or cutting agents.",
  },
  "peaches-and-cream": {
    id: "peaches-and-cream",
    name: "Peaches & Cream",
    line: "Palate Line",
    lineCode: "8-09-0002",
    type: "Indica-Dominant Hybrid",
    typeColor: "#e8946a",
    accentColor: "#f0a878",
    gradientFrom: "#2e1a1a",
    gradientTo: "#6a3a2a",
    icon: "◉",
    tagline: "Lush. Creamy. Blissful.",
    description:
      "A luxurious indica-dominant hybrid that wraps ripe stone fruit sweetness in a velvety cream finish. Peaches & Cream from Eybna's Palate Line delivers a rich, dessert-forward sensory experience with a smooth, calming body effect that builds gradually into deep contentment.",
    effects: ["Relaxing", "Happy", "Euphoric", "Calm", "Sleepy"],
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
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  "purple-punch": {
    id: "purple-punch",
    name: "Purple Punch",
    line: "Palate Line",
    lineCode: "8-08-0002",
    type: "Indica",
    typeColor: "#7b4f9e",
    accentColor: "#a06cc8",
    gradientFrom: "#1a0e2e",
    gradientTo: "#4a2070",
    icon: "◉",
    tagline: "Grape. Berry. Knockout Calm.",
    description:
      "A pure indica born from Larry OG and Granddaddy Purple, Purple Punch delivers a one-two combination of grape candy sweetness and blueberry muffin richness. This strain is renowned for its deeply sedating body effect that melts tension and guides you gently into rest.",
    effects: ["Sedating", "Relaxing", "Sleepy", "Happy", "Body Calm"],
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
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  mimosa: {
    id: "mimosa",
    name: "Mimosa",
    line: "Palate Line",
    lineCode: "8-06-0002",
    type: "Sativa-Dominant Hybrid",
    typeColor: "#e8b830",
    accentColor: "#f0d060",
    gradientFrom: "#2e2a0e",
    gradientTo: "#6a5a1a",
    icon: "◉",
    tagline: "Bright. Citrus. Morning Energy.",
    description:
      "A sparkling cross of Clementine and Purple Punch, Mimosa bursts with bright tangerine and tropical citrus notes over a subtle berry undertone. This sativa-dominant hybrid is the perfect wake-and-bake profile — uplifting, focused and brimming with daytime energy.",
    effects: ["Energising", "Uplifting", "Focused", "Happy", "Creative"],
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
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  rntz: {
    id: "rntz",
    name: "RNTZ",
    line: "Live Line",
    lineCode: "9-513-0002",
    type: "Balanced Hybrid",
    typeColor: "#d4644a",
    accentColor: "#e87860",
    gradientFrom: "#2e0e0e",
    gradientTo: "#6a2020",
    icon: "◈",
    tagline: "Sweet. Fruity. Perfectly Balanced.",
    description:
      "RNTZ (Runtz) is a celebrated cross of Zkittlez and Gelato that has taken the global cannabis scene by storm. Known for its candy-sweet fruit medley and creamy finish, this balanced hybrid delivers euphoric mental clarity alongside smooth physical relaxation — a true 50/50 experience.",
    effects: ["Euphoric", "Relaxing", "Happy", "Creative", "Balanced"],
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
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  "blue-zushi": {
    id: "blue-zushi",
    name: "Blue Zushi",
    line: "Live Line",
    lineCode: "7-806-0002",
    type: "Indica-Dominant Hybrid",
    typeColor: "#4a6ebe",
    accentColor: "#6a8ed8",
    gradientFrom: "#0e1a2e",
    gradientTo: "#1a3a6a",
    icon: "◈",
    tagline: "Exotic. Gassy. Deep Relaxation.",
    description:
      "Blue Zushi is a rare and highly sought-after exotic strain known for its complex aroma that blends sweet berry notes with a distinctive fuel-forward gas character. This indica-dominant hybrid delivers a powerful, enveloping body high with a euphoric mental haze that makes it a connoisseur favourite.",
    effects: ["Deeply Relaxing", "Euphoric", "Sleepy", "Happy", "Body High"],
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
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  mac: {
    id: "mac",
    name: "MAC",
    line: "Live Line",
    lineCode: "7-804-0002",
    type: "Balanced Hybrid",
    typeColor: "#8ab84a",
    accentColor: "#a0d060",
    gradientFrom: "#1a2e0e",
    gradientTo: "#3a5a1a",
    icon: "◈",
    tagline: "Citrus. Floral. Alien Potency.",
    description:
      "Miracle Alien Cookies (MAC) is a legendary cross of Alien Cookies with a Colombian and Starfighter hybrid. Renowned for its sharp citrus and sour floral aroma underscored by a diesel earthiness, MAC delivers a cerebral rush of creative energy that transitions into a calm, focused body state.",
    effects: ["Creative", "Uplifting", "Focused", "Relaxing", "Happy"],
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
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  "pear-jam": {
    id: "pear-jam",
    name: "Pear Jam",
    line: "Enhancer Line",
    lineCode: "10-566-0002",
    type: "Hybrid",
    typeColor: "#8aba4a",
    accentColor: "#a8d468",
    gradientFrom: "#1a2e1a",
    gradientTo: "#3a6a2a",
    icon: "◎",
    tagline: "Ripe. Jammy. Smooth.",
    description:
      "A luscious fruit-forward enhancer profile that captures the essence of ripe pear preserves with a jammy sweetness and soft floral finish. Pear Jam from Eybna's Enhancer Line adds rich, natural fruit dimension to extract profiles — smooth, sweet and effortlessly satisfying.",
    effects: ["Relaxing", "Happy", "Smooth", "Social", "Gentle Calm"],
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
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  "melon-lychee": {
    id: "melon-lychee",
    name: "Melon Lychee",
    line: "Enhancer Line",
    lineCode: "10-564-0002",
    type: "Sativa-Hybrid",
    typeColor: "#50b890",
    accentColor: "#6ad4a8",
    gradientFrom: "#0e2e2a",
    gradientTo: "#1a5a4a",
    icon: "◎",
    tagline: "Tropical. Exotic. Refreshing.",
    description:
      "An exotic tropical fusion that pairs sweet honeydew melon with fragrant lychee and a hint of rose. Melon Lychee from Eybna's Enhancer Line delivers one of the most refreshing and aromatic enhancer profiles available — perfect for adding bright, tropical complexity to any extract.",
    effects: ["Uplifting", "Refreshing", "Happy", "Social", "Light Euphoria"],
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
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  "tutti-frutti": {
    id: "tutti-frutti",
    name: "Tutti Frutti",
    line: "Enhancer Line",
    lineCode: "10-521-0002",
    type: "Sativa-Hybrid",
    typeColor: "#e06a90",
    accentColor: "#f080a8",
    gradientFrom: "#2e1a2a",
    gradientTo: "#6a2a5a",
    icon: "◎",
    tagline: "Candy. Fruity. Playful.",
    description:
      "A vibrant, candy-inspired enhancer that delivers a playful medley of mixed tropical fruits and sweet confectionery notes. Tutti Frutti from Eybna's Enhancer Line is designed for those who want their extract to pop with colour, sweetness and an unmistakably fun, fruit-forward character.",
    effects: ["Uplifting", "Happy", "Energising", "Social", "Creative"],
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
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  "purple-crack": {
    id: "purple-crack",
    name: "Purple Crack",
    line: "Live Plus+ Line",
    lineCode: "14-09-0002",
    type: "Sativa-Dominant Hybrid",
    typeColor: "#9a5ab8",
    accentColor: "#b478d0",
    gradientFrom: "#1a0e2e",
    gradientTo: "#3a1a6a",
    icon: "◇",
    tagline: "Berry. Electric. Intense Focus.",
    description:
      "Purple Crack brings together the explosive sativa energy of Green Crack with the deep berry richness of a purple lineage. The result is a high-intensity, focus-driven profile with sweet grape and earthy pine notes. From the Live Plus+ Line, this is peak terpene complexity for daytime productivity.",
    effects: ["Focused", "Energising", "Uplifting", "Creative", "Alert"],
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
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
  "lemonhead-plus": {
    id: "lemonhead-plus",
    name: "Lemonhead+",
    line: "Live Plus+ Line",
    lineCode: "15-05-0002",
    type: "Sativa-Dominant",
    typeColor: "#d4c020",
    accentColor: "#e8d840",
    gradientFrom: "#2e2e0a",
    gradientTo: "#5a5a1a",
    icon: "◇",
    tagline: "Zesty. Sharp. Pure Sativa Energy.",
    description:
      "Lemonhead+ is an intensified lemon-forward profile that hits with bright, sour citrus and a sharp zesty bite. Built on the Live Plus+ platform, this sativa-dominant profile captures the unmistakable punch of fresh lemon peel with herbal and pine undertones — engineered for maximum daytime energy and mental clarity.",
    effects: ["Energising", "Focused", "Uplifting", "Creative", "Alert"],
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
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
  "sherblato-plus": {
    id: "sherblato-plus",
    name: "Sherblato+",
    line: "Live Plus+ Line",
    lineCode: "15-10-0002",
    type: "Indica-Dominant Hybrid",
    typeColor: "#c06090",
    accentColor: "#d878a8",
    gradientFrom: "#2e0e1e",
    gradientTo: "#6a1a4a",
    icon: "◇",
    tagline: "Creamy. Sweet. Luxurious Calm.",
    description:
      "Sherblato+ fuses the creamy sherbert sweetness of Sunset Sherbert with the rich dessert complexity of Gelato. The Live Plus+ formulation intensifies every layer — sweet berry cream, vanilla frosting and a subtle fuel note on the exhale. This is premium evening indulgence at its most sophisticated.",
    effects: ["Relaxing", "Euphoric", "Happy", "Sleepy", "Body Calm"],
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
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
};

// ── SVG Donut Chart Component ─────────────────────────────────────────────────
function CannabinoidDonut({ cannabinoids, accentColor }) {
  const total = cannabinoids.reduce((sum, c) => sum + c.value, 0);
  const size = 220;
  const strokeWidth = 32;
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
        gap: 48,
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
              fontSize: 36,
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
              fontSize: 10,
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
          gap: 8,
          minWidth: 180,
        }}
      >
        {slices.map((s) => (
          <div
            key={s.name}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span
              className="body-font"
              style={{
                fontSize: 13,
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
                fontSize: 13,
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
const pageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap');
  .shop-font  { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font  { font-family: 'Jost', sans-serif; }
  .pb-btn { font-family: 'Jost', sans-serif; padding: 13px 36px; background: #1b4332; color: white; border: none; border-radius: 2px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; }
  .pb-btn:hover { background: #2d6a4f; }
  .pb-btn-outline { font-family: 'Jost', sans-serif; padding: 13px 36px; background: transparent; border: 1px solid rgba(255,255,255,0.35); color: white; border-radius: 2px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
  .pb-btn-outline:hover { background: rgba(255,255,255,0.1); }
  .strain-nav-btn { transition: all 0.2s; }
  .strain-nav-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
  .coa-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 2px; font-family: 'Jost', sans-serif; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 500; }
  .effect-tag { font-family: 'Jost', sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 5px 14px; border-radius: 2px; border: 1px solid; font-weight: 400; }
  .section-divider { width: 100%; height: 1px; background: linear-gradient(to right, transparent, #e0d8cc, transparent); margin: 48px 0; }
  .card { background: white; border: 1px solid #e8e0d4; border-radius: 2px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
  .pv-footer-link { font-family: 'Jost', sans-serif; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #555; text-decoration: none; transition: color 0.2s; }
  .pv-footer-link:hover { color: #52b788; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up   { animation: fadeUp 0.7s ease forwards; }
  .fade-up-2 { animation: fadeUp 0.7s 0.15s ease forwards; opacity: 0; }
  .fade-up-3 { animation: fadeUp 0.7s 0.3s ease forwards; opacity: 0; }
  .fade-up-4 { animation: fadeUp 0.7s 0.45s ease forwards; opacity: 0; }
  @media (max-width: 768px) {
    .pv-hero-inner { padding: 40px 20px 48px !important; }
    .pv-body-inner { padding: 40px 20px !important; }
    .pv-cta-banner { padding: 36px 24px !important; flex-direction: column !important; text-align: center; }
    .pv-cta-buttons { align-items: stretch !important; width: 100%; }
    .pv-footer-outer { padding: 36px 20px !important; }
    .pv-footer-wrap { flex-direction: column !important; text-align: center; }
    .pv-footer-nav { justify-content: center !important; }
    .pv-hero-title { font-size: 42px !important; }
  }
  @media (max-width: 480px) {
    .pv-hero-inner { padding: 32px 16px 40px !important; }
    .pv-body-inner { padding: 32px 16px !important; }
    .pv-hero-title { font-size: 32px !important; }
    .pv-lab-details { gap: 20px !important; }
    .pv-cta-banner { padding: 28px 16px !important; }
  }
`;

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProductVerification() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const strain = STRAINS[productId];
  const allStrains = Object.values(STRAINS);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  // ── Not Found ─────────────────────────────────────────────────────────────
  if (!strain) {
    return (
      <>
        <ClientHeader variant="light" />
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            minHeight: "100vh",
            background: "#faf9f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <style>{pageStyles}</style>
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <h1
              className="shop-font"
              style={{
                fontSize: 32,
                color: "#1a1a1a",
                fontWeight: 300,
                marginBottom: 12,
              }}
            >
              Strain Not Found
            </h1>
            <p
              className="body-font"
              style={{
                color: "#888",
                fontSize: 15,
                marginBottom: 32,
                fontWeight: 300,
              }}
            >
              The product ID "{productId}" doesn't match any of our strains.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button className="pb-btn" onClick={() => navigate("/shop")}>
                Browse Our Shop
              </button>
              <button
                className="pb-btn"
                style={{
                  background: "transparent",
                  color: "#1b4332",
                  border: "1px solid #1b4332",
                }}
                onClick={() => navigate("/")}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <>
      <ClientHeader variant="light" />
      <div
        style={{
          fontFamily: "'Jost', sans-serif",
          minHeight: "100vh",
          background: "#faf9f6",
          color: "#1a1a1a",
        }}
      >
        <style>{pageStyles}</style>

        {/* ── HERO ── */}
        <div
          style={{
            background: `linear-gradient(160deg, ${strain.gradientFrom} 0%, ${strain.gradientTo} 60%, ${strain.gradientFrom}dd 100%)`,
            position: "relative",
            overflow: "hidden",
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
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: `${strain.accentColor}10`,
              pointerEvents: "none",
            }}
          />

          <div
            className="pv-hero-inner"
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "60px 40px 64px",
            }}
          >
            <div
              className="fade-up"
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              <span
                className="coa-badge"
                style={{
                  background: "rgba(82,183,136,0.15)",
                  color: "#52b788",
                  border: "1px solid rgba(82,183,136,0.3)",
                }}
              >
                ✓ Lab Verified
              </span>
              <span
                className="coa-badge"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                QR Authenticated
              </span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.4em",
                  textTransform: "uppercase",
                  color: strain.accentColor,
                  fontWeight: 500,
                }}
              >
                {strain.eybnaLine} · Product Authentication
              </span>
            </div>
            <h1
              className="shop-font fade-up-2 pv-hero-title"
              style={{
                fontSize: "clamp(48px, 8vw, 84px)",
                fontWeight: 300,
                color: "#faf9f6",
                lineHeight: 1,
                marginBottom: 16,
                letterSpacing: "0.03em",
              }}
            >
              {strain.name}
            </h1>
            <p
              className="body-font fade-up-3"
              style={{
                fontSize: "clamp(14px, 2vw, 17px)",
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                marginBottom: 28,
                fontWeight: 300,
              }}
            >
              {strain.tagline}
            </p>
            <div
              className="fade-up-4"
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                className="effect-tag"
                style={{
                  color: strain.typeColor,
                  borderColor: `${strain.typeColor}55`,
                  background: `${strain.typeColor}12`,
                }}
              >
                {strain.type}
              </span>
              {strain.effects.map((e) => (
                <span
                  key={e}
                  className="effect-tag"
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div
          className="pv-body-inner"
          style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 40px" }}
        >
          {/* About */}
          <div style={{ marginBottom: 64 }}>
            <span
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: strain.accentColor,
              }}
            >
              About This Strain
            </span>
            <h2
              className="shop-font"
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 300,
                color: "#1a1a1a",
                marginTop: 8,
                marginBottom: 20,
              }}
            >
              {strain.name}
            </h2>
            <p
              className="body-font"
              style={{
                maxWidth: 640,
                fontSize: 16,
                lineHeight: 1.85,
                color: "#555",
                fontWeight: 300,
              }}
            >
              {strain.description}
            </p>
            <div
              style={{
                display: "flex",
                gap: 48,
                marginTop: 32,
                flexWrap: "wrap",
              }}
            >
              {[
                ["Aroma", strain.aroma],
                ["Flavour", strain.flavour],
              ].map(([label, val]) => (
                <div key={label}>
                  <p
                    className="body-font"
                    style={{
                      fontSize: "10px",
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
                    style={{ fontSize: 14, color: "#666", fontWeight: 300 }}
                  >
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="section-divider" />

          {/* COA */}
          <div style={{ marginBottom: 64 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 40,
              }}
            >
              <div>
                <span
                  className="body-font"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.35em",
                    textTransform: "uppercase",
                    color: "#52b788",
                  }}
                >
                  Certificate of Analysis
                </span>
                <h2
                  className="shop-font"
                  style={{
                    fontSize: "clamp(28px, 4vw, 44px)",
                    fontWeight: 300,
                    color: "#1a1a1a",
                    marginTop: 8,
                  }}
                >
                  Distillate Lab Results
                </h2>
              </div>
              <div className="card" style={{ padding: "12px 20px" }}>
                <p
                  className="body-font"
                  style={{
                    fontSize: "10px",
                    color: "#aaa",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Lab ID
                </p>
                <p
                  className="body-font"
                  style={{ fontSize: 14, color: "#52b788", fontWeight: 500 }}
                >
                  {DISTILLATE_COA.labId}
                </p>
                <p
                  className="body-font"
                  style={{ fontSize: "11px", color: "#aaa", marginTop: 2 }}
                >
                  {DISTILLATE_COA.reportedDate}
                </p>
              </div>
            </div>

            <div
              className="card pv-lab-details"
              style={{
                padding: "20px 28px",
                marginBottom: 24,
                display: "flex",
                gap: 40,
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
                      fontSize: "9px",
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
                    style={{ fontSize: 13, color: "#555", fontWeight: 300 }}
                  >
                    {val}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="card"
              style={{ padding: "40px 36px", marginBottom: 20 }}
            >
              <p
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.3em",
                  color: "#aaa",
                  textTransform: "uppercase",
                  marginBottom: 32,
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
                  marginTop: 36,
                  paddingTop: 28,
                  display: "flex",
                  gap: 48,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {DISTILLATE_COA.totals.map((t) => (
                  <div key={t.name} style={{ textAlign: "center" }}>
                    <p
                      className="body-font"
                      style={{
                        fontSize: "9px",
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
                        fontSize: 32,
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
                  fontSize: "10px",
                  letterSpacing: "0.3em",
                  color: "#aaa",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Additional Testing
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                {DISTILLATE_COA.otherTests.map((t) => (
                  <div
                    key={t.name}
                    className="card"
                    style={{
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="body-font"
                      style={{ fontSize: 13, color: "#555" }}
                    >
                      {t.name}
                    </span>
                    <span
                      className="coa-badge"
                      style={{
                        background: "rgba(181,147,90,0.1)",
                        color: "#b5935a",
                        border: "1px solid rgba(181,147,90,0.2)",
                        fontSize: "9px",
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
                  fontSize: 12,
                  color: "#bbb",
                  marginTop: 14,
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

          <div className="section-divider" />

          {/* Terpene Profile */}
          <div style={{ marginBottom: 64 }}>
            <div style={{ marginBottom: 40 }}>
              <span
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: strain.accentColor,
                }}
              >
                Eybna {strain.eybnaLine}
              </span>
              <h2
                className="shop-font"
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 300,
                  color: "#1a1a1a",
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                Terpene Profile
              </h2>
              <p
                className="body-font"
                style={{
                  fontSize: 14,
                  color: "#888",
                  fontWeight: 300,
                  maxWidth: 560,
                }}
              >
                {strain.eybnaDescription}
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {strain.dominantTerpenes.map((t, i) => (
                <div
                  key={t.name}
                  className="card"
                  style={{
                    padding: "28px 24px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
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
                      marginBottom: 12,
                    }}
                  >
                    <h3
                      className="shop-font"
                      style={{
                        fontSize: 22,
                        fontWeight: 400,
                        color: "#1a1a1a",
                      }}
                    >
                      {t.name}
                    </h3>
                    <span
                      className="body-font"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.2em",
                        color: "#ccc",
                        textTransform: "uppercase",
                        paddingTop: 4,
                      }}
                    >
                      #{i + 1}
                    </span>
                  </div>
                  <p
                    className="body-font"
                    style={{
                      fontSize: 13,
                      color: "#888",
                      lineHeight: 1.6,
                      fontWeight: 300,
                    }}
                  >
                    {t.role}
                  </p>
                  <div
                    style={{
                      marginTop: 16,
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
                        transition: "width 1s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div
              className="card"
              style={{
                padding: "20px 28px",
                display: "flex",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1 }}>
                <p
                  className="body-font"
                  style={{
                    fontSize: "10px",
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
                  style={{ fontSize: 14, color: "#555" }}
                >
                  <strong style={{ color: "#1a1a1a" }}>Eybna GmbH</strong> ·
                  Berlin, Germany ·{" "}
                  <span style={{ color: "#aaa" }}>www.eybna.com</span>
                </p>
                <p
                  className="body-font"
                  style={{
                    fontSize: 12,
                    color: "#bbb",
                    marginTop: 4,
                    fontWeight: 300,
                  }}
                >
                  Product Code: {strain.lineCode} · Pharmaceutical-grade
                  botanical-derived terpenes. COA available on request.
                </p>
              </div>
              <span
                className="coa-badge"
                style={{
                  background: "rgba(82,183,136,0.1)",
                  color: "#52b788",
                  border: "1px solid rgba(82,183,136,0.2)",
                }}
              >
                ✓ Certified Supplier
              </span>
            </div>
          </div>

          <div className="section-divider" />

          {/* What These Numbers Mean */}
          <div style={{ marginBottom: 64 }}>
            <span
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#aaa",
              }}
            >
              Understanding Your Product
            </span>
            <h2
              className="shop-font"
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 300,
                color: "#1a1a1a",
                marginTop: 8,
                marginBottom: 40,
              }}
            >
              What These Numbers Mean
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {[
                {
                  icon: "◈",
                  title: "93.55% Total THC",
                  color: "#52b788",
                  body: "This is a pharmaceutical-grade distillate. Most commercial cannabis products range from 60–80% THC. Our distillate exceeds 93%, meaning less product is needed for a consistent, controlled effect.",
                },
                {
                  icon: "◉",
                  title: "The Entourage Effect",
                  color: strain.accentColor,
                  body: "The minor cannabinoids CBN (0.78%), CBD (0.98%) and CBG (0.09%) work synergistically with THC and terpenes to shape the overall experience — this is known as the entourage effect.",
                },
                {
                  icon: "✦",
                  title: "Terpene Blending",
                  color: "#b5935a",
                  body: `The ${strain.name} terpene profile from Eybna is blended with the distillate to recreate the authentic strain experience. Terpenes determine aroma, flavour and modulate the effect profile.`,
                },
                {
                  icon: "△",
                  title: "CO₂ Extracted",
                  color: "#4a9eba",
                  body: "Our distillate is produced using supercritical CO₂ extraction — the cleanest method available. Zero solvent residue, no heavy metals from equipment, and no pesticides from the source material.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="card"
                  style={{ padding: "28px 24px" }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      color: item.color,
                      marginBottom: 14,
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3
                    className="shop-font"
                    style={{
                      fontSize: 20,
                      color: "#1a1a1a",
                      marginBottom: 12,
                      fontWeight: 400,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="body-font"
                    style={{
                      fontSize: 13,
                      color: "#777",
                      lineHeight: 1.75,
                      fontWeight: 300,
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="section-divider" />

          {/* Loyalty CTA */}
          <div
            className="pv-cta-banner"
            style={{
              background: `linear-gradient(135deg, ${strain.gradientFrom}, ${strain.gradientTo})`,
              borderRadius: 2,
              padding: "52px 48px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 32,
              marginBottom: 64,
            }}
          >
            <div>
              <p
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.35em",
                  color: strain.accentColor,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Loyalty Programme
              </p>
              <h2
                className="shop-font"
                style={{
                  fontSize: "clamp(24px, 3vw, 40px)",
                  fontWeight: 300,
                  color: "#faf9f6",
                  marginBottom: 12,
                }}
              >
                Earn Points on This Purchase
              </h2>
              <p
                className="body-font"
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 300,
                  maxWidth: 440,
                }}
              >
                Scan the unique loyalty QR code found inside your product
                packaging to earn points and unlock exclusive rewards.
              </p>
            </div>
            <div
              className="pv-cta-buttons"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <button
                className="pb-btn"
                style={{
                  background: "#52b788",
                  color: "#0e1a14",
                  fontWeight: 600,
                }}
                onClick={() => navigate("/scan")}
              >
                Scan Loyalty Code
              </button>
              <button
                className="pb-btn-outline"
                onClick={() => navigate("/loyalty")}
              >
                View My Points
              </button>
            </div>
          </div>

          {/* Other Strains */}
          <div>
            <span
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#aaa",
              }}
            >
              Our Range
            </span>
            <h2
              className="shop-font"
              style={{
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 300,
                color: "#1a1a1a",
                marginTop: 8,
                marginBottom: 28,
              }}
            >
              Explore Other Strains
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {allStrains.map((s) => {
                const isActive = s.id === strain.id;
                return (
                  <div
                    key={s.id}
                    className="strain-nav-btn"
                    onClick={() => !isActive && navigate(`/verify/${s.id}`)}
                    style={{
                      background: isActive ? "#fff" : "#f4f0e8",
                      border: isActive
                        ? `2px solid ${s.accentColor}`
                        : "1px solid transparent",
                      borderRadius: 2,
                      padding: "20px 20px",
                      cursor: isActive ? "default" : "pointer",
                      boxShadow: isActive
                        ? `0 4px 16px ${s.accentColor}22`
                        : "none",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: s.accentColor,
                        marginBottom: 10,
                        opacity: isActive ? 1 : 0.6,
                      }}
                    />
                    <p
                      className="shop-font"
                      style={{
                        fontSize: 17,
                        color: "#1a1a1a",
                        marginBottom: 4,
                      }}
                    >
                      {s.name}
                    </p>
                    <p
                      className="body-font"
                      style={{
                        fontSize: "10px",
                        color: "#aaa",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.eybnaLine.split(" ")[0]} Line
                    </p>
                    {isActive && (
                      <span
                        className="body-font"
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 12,
                          fontSize: "8px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: s.accentColor,
                          fontWeight: 600,
                        }}
                      >
                        Viewing
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          className="pv-footer-outer"
          style={{ background: "#060e09", padding: "48px 40px", marginTop: 48 }}
        >
          <div
            className="pv-footer-wrap"
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            <div>
              <span
                className="shop-font"
                style={{
                  fontSize: 20,
                  color: "#faf9f6",
                  letterSpacing: "0.2em",
                }}
              >
                PROTEA
              </span>
              <span
                className="shop-font"
                style={{
                  fontSize: 20,
                  color: "#52b788",
                  letterSpacing: "0.2em",
                }}
              >
                {" "}
                BOTANICALS
              </span>
              <p
                className="body-font"
                style={{
                  fontSize: 12,
                  color: "#555",
                  marginTop: 8,
                  fontWeight: 300,
                }}
              >
                Premium Botanical Extracts · South Africa
              </p>
            </div>
            <div
              className="pv-footer-nav"
              style={{ display: "flex", gap: 28, flexWrap: "wrap" }}
            >
              {[
                ["Home", "/"],
                ["Scan & Earn", "/scan"],
                ["Shop", "/shop"],
                ["Wholesale", "/wholesale"],
              ].map(([label, path]) => (
                <Link key={label} to={path} className="pv-footer-link">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div
            style={{
              maxWidth: 1100,
              margin: "24px auto 0",
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p
              className="body-font"
              style={{ fontSize: 11, color: "#333", fontWeight: 300 }}
            >
              © 2026 Protea Botanicals. Lab testing by Ecogreen Analytics (Pty)
              Ltd, Somerset West. Terpenes by Eybna GmbH, Berlin. This product
              is intended for adult use only. Keep out of reach of children.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
