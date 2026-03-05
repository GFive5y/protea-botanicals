// src/pages/TerpenePage.js v3.1
// v3.1: Reads useParams :terpeneId — when arriving at /terpenes/:id (e.g. from
//       Landing carousel click), the matching terpene modal auto-opens on mount.
//       Navigating to /terpenes with no param shows the carousel as normal.
//       Only changes: added useParams import + useEffect to set initial modalId.
// v3.0: Two-row infinite carousel: top row drifts RIGHT, bottom row drifts LEFT.
//       Edge fade mask for smooth disappear/appear. Hover pauses + enlarges.
//       Click opens frosted modal with full profile.
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

// ═══ TERPENE DATA ═══
const TERPENES = [
  {
    id: "myrcene",
    name: "Myrcene",
    formula: "C₁₀H₁₆",
    aroma: "Earthy · Musky · Herbal",
    color: "#2d6a4f",
    boilingPoint: "168°C",
    prevalence: "Most common in cannabis",
    effects: ["Relaxing", "Sedative", "Anti-inflammatory", "Analgesic"],
    description:
      "Myrcene is the most abundant terpene in modern cannabis, often comprising over 20% of the terpene profile. It's responsible for the characteristic 'dank' aroma and is also found in mangoes, hops and lemongrass. Myrcene is believed to enhance THC absorption across the blood-brain barrier, intensifying psychoactive effects.",
    foundIn: ["Mangoes", "Hops", "Lemongrass", "Thyme"],
    icon: "leaf",
  },
  {
    id: "limonene",
    name: "Limonene",
    formula: "C₁₀H₁₆",
    aroma: "Citrus · Lemon · Orange",
    color: "#EAB308",
    boilingPoint: "176°C",
    prevalence: "Second most common",
    effects: ["Uplifting", "Mood boost", "Anti-anxiety", "Anti-fungal"],
    description:
      "Limonene is the terpene responsible for bright citrus aromas. Highly concentrated in lemon and orange rinds, it's known for mood-elevating and stress-relieving properties. Research suggests limonene may aid in the absorption of other terpenes through the skin.",
    foundIn: ["Lemon rind", "Orange peel", "Juniper", "Rosemary"],
    icon: "citrus",
  },
  {
    id: "pinene",
    name: "Pinene",
    formula: "C₁₀H₁₆",
    aroma: "Pine · Fresh · Woody",
    color: "#166534",
    boilingPoint: "155°C",
    prevalence: "Most common in nature",
    effects: [
      "Alert",
      "Memory retention",
      "Anti-inflammatory",
      "Bronchodilator",
    ],
    description:
      "Alpha-Pinene is the most widely encountered terpene in the natural world, giving pine forests their characteristic scent. It's a natural bronchodilator and has shown promise in counteracting some of THC's short-term memory impairment.",
    foundIn: ["Pine needles", "Rosemary", "Basil", "Dill"],
    icon: "pine",
  },
  {
    id: "linalool",
    name: "Linalool",
    formula: "C₁₀H₁₈O",
    aroma: "Floral · Lavender · Sweet",
    color: "#9b6b9e",
    boilingPoint: "198°C",
    prevalence: "200+ plant species",
    effects: ["Calming", "Anti-anxiety", "Sleep aid", "Anticonvulsant"],
    description:
      "Linalool is the terpene that gives lavender its unmistakable scent. It has a long history as a sleep aid and calming agent. Modern research confirms significant anxiolytic and sedative properties, valuable in strains targeting anxiety and insomnia.",
    foundIn: ["Lavender", "Birch bark", "Coriander", "Sweet basil"],
    icon: "flower",
  },
  {
    id: "caryophyllene",
    name: "β-Caryophyllene",
    formula: "C₁₅H₂₄",
    aroma: "Spicy · Pepper · Woody",
    color: "#c0764a",
    boilingPoint: "130°C",
    prevalence: "Binds to CB2 receptors",
    effects: [
      "Anti-inflammatory",
      "Analgesic",
      "Gastroprotective",
      "Anti-anxiety",
    ],
    description:
      "Beta-Caryophyllene is unique — it's the only terpene known to directly activate cannabinoid CB2 receptors, functioning as both a terpene and a dietary cannabinoid. Found in black pepper, cloves and cinnamon, it shows powerful anti-inflammatory properties.",
    foundIn: ["Black pepper", "Cloves", "Cinnamon", "Hops"],
    icon: "spice",
  },
  {
    id: "terpinolene",
    name: "Terpinolene",
    formula: "C₁₀H₁₆",
    aroma: "Floral · Piney · Herbal",
    color: "#5a9e7c",
    boilingPoint: "186°C",
    prevalence: "Least common major terpene",
    effects: ["Uplifting", "Creative", "Energetic", "Antibacterial"],
    description:
      "Terpinolene has a multi-layered aroma blending floral, piney and herbal notes. Though less common as a dominant terpene, it appears frequently in sativa-leaning strains and is associated with energetic, creative effects.",
    foundIn: ["Nutmeg", "Tea tree", "Cumin", "Apples"],
    icon: "herb",
  },
  {
    id: "humulene",
    name: "Humulene",
    formula: "C₁₅H₂₄",
    aroma: "Earthy · Woody · Hoppy",
    color: "#8B6914",
    boilingPoint: "106°C",
    prevalence: "In all hops varieties",
    effects: [
      "Appetite suppressant",
      "Anti-inflammatory",
      "Antibacterial",
      "Anti-tumour",
    ],
    description:
      "Humulene gives beer its hoppy aroma. Unlike most cannabis terpenes, it may suppress appetite rather than stimulate it. Research shows promising anti-inflammatory and anti-tumour activity.",
    foundIn: ["Hops", "Sage", "Ginseng", "Coriander"],
    icon: "hop",
  },
  {
    id: "ocimene",
    name: "Ocimene",
    formula: "C₁₀H₁₆",
    aroma: "Sweet · Herbal · Woody",
    color: "#2563EB",
    boilingPoint: "66°C",
    prevalence: "Common in tropical plants",
    effects: ["Antiviral", "Anti-fungal", "Anti-inflammatory", "Decongestant"],
    description:
      "Ocimene is a sweet, herbal terpene found in tropical fruits and plants. It has one of the lowest boiling points of major terpenes. Research highlights antiviral and antifungal properties, making it a key player in plant defence.",
    foundIn: ["Mint", "Parsley", "Orchids", "Kumquats"],
    icon: "wave",
  },
  {
    id: "bisabolol",
    name: "Bisabolol",
    formula: "C₁₅H₂₆O",
    aroma: "Floral · Sweet · Nutty",
    color: "#EC4899",
    boilingPoint: "153°C",
    prevalence: "Primary in chamomile oil",
    effects: [
      "Anti-irritant",
      "Analgesic",
      "Anti-inflammatory",
      "Antibacterial",
    ],
    description:
      "Alpha-Bisabolol is the primary terpene in chamomile and is widely used in skincare for its soothing properties. It enhances absorption of other compounds through the skin, making it valuable in topical formulations.",
    foundIn: ["Chamomile", "Candeia tree", "Sage"],
    icon: "drop",
  },
  {
    id: "geraniol",
    name: "Geraniol",
    formula: "C₁₀H₁₈O",
    aroma: "Rose · Citrus · Sweet",
    color: "#E11D48",
    boilingPoint: "229°C",
    prevalence: "Natural insect repellent",
    effects: ["Neuroprotective", "Antioxidant", "Anti-tumour", "Antibacterial"],
    description:
      "Geraniol gives roses and geraniums their sweet floral scent. It's a remarkably effective natural insect repellent and shows potential neuroprotective properties in preclinical studies.",
    foundIn: ["Roses", "Geraniums", "Lemongrass", "Tobacco"],
    icon: "rose",
  },
  {
    id: "eucalyptol",
    name: "Eucalyptol",
    formula: "C₁₀H₁₈O",
    aroma: "Minty · Cool · Fresh",
    color: "#0891B2",
    boilingPoint: "176°C",
    prevalence: "90% of eucalyptus oil",
    effects: [
      "Decongestant",
      "Anti-inflammatory",
      "Cognitive boost",
      "Analgesic",
    ],
    description:
      "Eucalyptol makes up about 90% of eucalyptus essential oil. It crosses the blood-brain barrier and shows cognitive-enhancing effects. Widely used in cold remedies for its decongestant properties.",
    foundIn: ["Eucalyptus", "Tea tree", "Mugwort", "Bay leaves"],
    icon: "crystal",
  },
  {
    id: "nerolidol",
    name: "Nerolidol",
    formula: "C₁₅H₂₆O",
    aroma: "Woody · Floral · Citrus",
    color: "#7C3AED",
    boilingPoint: "122°C",
    prevalence: "Enhances skin absorption",
    effects: [
      "Anti-parasitic",
      "Anti-fungal",
      "Sedative",
      "Skin penetration enhancer",
    ],
    description:
      "Nerolidol has a complex woody-floral aroma found in jasmine, tea tree and lemongrass. Its most notable property is enhancing skin penetration of other compounds, making it valuable in transdermal formulations.",
    foundIn: ["Jasmine", "Tea tree", "Lemongrass", "Ginger"],
    icon: "spiral",
  },
];

const ROW_TOP = TERPENES.slice(0, 6);
const ROW_BOT = TERPENES.slice(6, 12);

const HEX_W = 140;
const HEX_GAP = 20;
const ITEM_W = HEX_W + HEX_GAP;
const SPEED_TOP = 35;
const SPEED_BOT = 40;

// ═══ SVG ICON RENDERERS ═══
function TerpIcon({ type, color, size = 40 }) {
  const s = size,
    c = s / 2,
    sw = 1.8;
  const icons = {
    leaf: (
      <g>
        <path
          d={`M${c},${s * 0.12} C${s * 0.18},${s * 0.35} ${s * 0.13},${s * 0.65} ${c},${s * 0.88}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${c},${s * 0.12} C${s * 0.82},${s * 0.35} ${s * 0.87},${s * 0.65} ${c},${s * 0.88}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <line
          x1={c}
          y1={s * 0.28}
          x2={c}
          y2={s * 0.88}
          stroke={color}
          strokeWidth={sw * 0.7}
          strokeLinecap="round"
        />
        <line
          x1={s * 0.28}
          y1={s * 0.48}
          x2={c}
          y2={s * 0.42}
          stroke={color}
          strokeWidth={sw * 0.5}
          strokeLinecap="round"
        />
        <line
          x1={s * 0.72}
          y1={s * 0.48}
          x2={c}
          y2={s * 0.42}
          stroke={color}
          strokeWidth={sw * 0.5}
          strokeLinecap="round"
        />
        <line
          x1={s * 0.32}
          y1={s * 0.64}
          x2={c}
          y2={s * 0.57}
          stroke={color}
          strokeWidth={sw * 0.5}
          strokeLinecap="round"
        />
        <line
          x1={s * 0.68}
          y1={s * 0.64}
          x2={c}
          y2={s * 0.57}
          stroke={color}
          strokeWidth={sw * 0.5}
          strokeLinecap="round"
        />
      </g>
    ),
    citrus: (
      <g>
        <circle
          cx={c}
          cy={c}
          r={s * 0.36}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        <circle
          cx={c}
          cy={c}
          r={s * 0.14}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.6}
          opacity="0.4"
        />
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const rad = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={c + Math.cos(rad) * s * 0.14}
              y1={c + Math.sin(rad) * s * 0.14}
              x2={c + Math.cos(rad) * s * 0.34}
              y2={c + Math.sin(rad) * s * 0.34}
              stroke={color}
              strokeWidth={sw * 0.5}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    ),
    pine: (
      <g>
        <polygon
          points={`${c},${s * 0.08} ${s * 0.3},${s * 0.38} ${s * 0.7},${s * 0.38}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <polygon
          points={`${c},${s * 0.26} ${s * 0.2},${s * 0.58} ${s * 0.8},${s * 0.58}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <polygon
          points={`${c},${s * 0.44} ${s * 0.13},${s * 0.78} ${s * 0.87},${s * 0.78}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <line
          x1={c}
          y1={s * 0.78}
          x2={c}
          y2={s * 0.93}
          stroke={color}
          strokeWidth={sw * 1.1}
          strokeLinecap="round"
        />
      </g>
    ),
    flower: (
      <g>
        {[0, 72, 144, 216, 288].map((a) => {
          const rad = (a * Math.PI) / 180;
          return (
            <circle
              key={a}
              cx={c + Math.cos(rad) * s * 0.22}
              cy={c + Math.sin(rad) * s * 0.22}
              r={s * 0.13}
              fill="none"
              stroke={color}
              strokeWidth={sw * 0.8}
            />
          );
        })}
        <circle cx={c} cy={c} r={s * 0.08} fill={color} opacity="0.25" />
      </g>
    ),
    spice: (
      <g>
        <circle
          cx={c}
          cy={c}
          r={s * 0.13}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const rad = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={c + Math.cos(rad) * s * 0.17}
              y1={c + Math.sin(rad) * s * 0.17}
              x2={c + Math.cos(rad) * s * 0.39}
              y2={c + Math.sin(rad) * s * 0.39}
              stroke={color}
              strokeWidth={sw * 0.6}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    ),
    herb: (
      <g>
        <line
          x1={c}
          y1={s * 0.88}
          x2={c}
          y2={s * 0.22}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${c},${s * 0.52} C${s * 0.28},${s * 0.42} ${s * 0.22},${s * 0.22} ${s * 0.34},${s * 0.15}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.8}
          strokeLinecap="round"
        />
        <path
          d={`M${c},${s * 0.42} C${s * 0.72},${s * 0.32} ${s * 0.78},${s * 0.15} ${s * 0.66},${s * 0.1}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.8}
          strokeLinecap="round"
        />
        <path
          d={`M${c},${s * 0.65} C${s * 0.26},${s * 0.58} ${s * 0.18},${s * 0.42} ${s * 0.28},${s * 0.35}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.8}
          strokeLinecap="round"
        />
      </g>
    ),
    hop: (
      <g>
        <circle
          cx={c}
          cy={c}
          r={s * 0.3}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        <ellipse
          cx={c}
          cy={c - s * 0.1}
          rx={s * 0.13}
          ry={s * 0.19}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          transform={`rotate(-15 ${c} ${c})`}
        />
        <ellipse
          cx={c + s * 0.08}
          cy={c + s * 0.08}
          rx={s * 0.13}
          ry={s * 0.19}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          transform={`rotate(45 ${c} ${c})`}
        />
        <ellipse
          cx={c - s * 0.08}
          cy={c + s * 0.08}
          rx={s * 0.13}
          ry={s * 0.19}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          transform={`rotate(-45 ${c} ${c})`}
        />
      </g>
    ),
    wave: (
      <g>
        <path
          d={`M${s * 0.12},${s * 0.33} C${s * 0.28},${s * 0.18} ${s * 0.42},${s * 0.5} ${s * 0.58},${s * 0.33} C${s * 0.74},${s * 0.18} ${s * 0.88},${s * 0.38} ${s * 0.88},${s * 0.38}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${s * 0.12},${s * 0.55} C${s * 0.28},${s * 0.4} ${s * 0.42},${s * 0.72} ${s * 0.58},${s * 0.55} C${s * 0.74},${s * 0.4} ${s * 0.88},${s * 0.6} ${s * 0.88},${s * 0.6}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${s * 0.18},${s * 0.74} C${s * 0.34},${s * 0.6} ${s * 0.48},${s * 0.86} ${s * 0.64},${s * 0.74}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          strokeLinecap="round"
        />
      </g>
    ),
    drop: (
      <g>
        <path
          d={`M${c},${s * 0.12} C${c},${s * 0.12} ${s * 0.23},${s * 0.48} ${s * 0.23},${s * 0.6} C${s * 0.23},${s * 0.8} ${s * 0.36},${s * 0.9} ${c},${s * 0.9} C${s * 0.64},${s * 0.9} ${s * 0.77},${s * 0.8} ${s * 0.77},${s * 0.6} C${s * 0.77},${s * 0.48} ${c},${s * 0.12} ${c},${s * 0.12} Z`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <ellipse
          cx={c - s * 0.06}
          cy={s * 0.62}
          rx={s * 0.06}
          ry={s * 0.08}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.5}
          opacity="0.4"
        />
      </g>
    ),
    rose: (
      <g>
        <circle
          cx={c}
          cy={c * 0.85}
          r={s * 0.1}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        <path
          d={`M${c - s * 0.1},${c * 0.85} C${c - s * 0.3},${c * 0.7} ${c - s * 0.3},${c * 0.48} ${c},${c * 0.38}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.8}
          strokeLinecap="round"
        />
        <path
          d={`M${c + s * 0.1},${c * 0.85} C${c + s * 0.3},${c * 0.7} ${c + s * 0.3},${c * 0.48} ${c},${c * 0.38}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.8}
          strokeLinecap="round"
        />
        <path
          d={`M${c - s * 0.06},${c * 0.48} C${c - s * 0.24},${c * 0.33} ${c - s * 0.16},${c * 0.12} ${c + s * 0.06},${c * 0.18}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.6}
          strokeLinecap="round"
        />
        <path
          d={`M${c + s * 0.06},${c * 0.48} C${c + s * 0.24},${c * 0.33} ${c + s * 0.16},${c * 0.12} ${c - s * 0.06},${c * 0.18}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.6}
          strokeLinecap="round"
        />
        <line
          x1={c}
          y1={c * 0.85 + s * 0.1}
          x2={c}
          y2={s * 0.94}
          stroke={color}
          strokeWidth={sw * 0.7}
          strokeLinecap="round"
        />
      </g>
    ),
    crystal: (
      <g>
        <polygon
          points={`${c},${s * 0.08} ${s * 0.74},${s * 0.28} ${s * 0.74},${s * 0.72} ${c},${s * 0.92} ${s * 0.26},${s * 0.72} ${s * 0.26},${s * 0.28}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <line
          x1={c}
          y1={s * 0.08}
          x2={c}
          y2={s * 0.92}
          stroke={color}
          strokeWidth={sw * 0.5}
          opacity="0.35"
        />
        <line
          x1={s * 0.26}
          y1={s * 0.28}
          x2={s * 0.74}
          y2={s * 0.72}
          stroke={color}
          strokeWidth={sw * 0.5}
          opacity="0.35"
        />
        <line
          x1={s * 0.74}
          y1={s * 0.28}
          x2={s * 0.26}
          y2={s * 0.72}
          stroke={color}
          strokeWidth={sw * 0.5}
          opacity="0.35"
        />
      </g>
    ),
    spiral: (
      <g>
        <path
          d={`M${c},${c} C${c + s * 0.06},${c - s * 0.09} ${c + s * 0.16},${c - s * 0.07} ${c + s * 0.16},${c} C${c + s * 0.16},${c + s * 0.12} ${c + s * 0.06},${c + s * 0.2} ${c - s * 0.06},${c + s * 0.2} C${c - s * 0.22},${c + s * 0.2} ${c - s * 0.3},${c + s * 0.07} ${c - s * 0.3},${c - s * 0.07} C${c - s * 0.3},${c - s * 0.24} ${c - s * 0.14},${c - s * 0.36} ${c + s * 0.07},${c - s * 0.36} C${c + s * 0.3},${c - s * 0.36} ${c + s * 0.4},${c - s * 0.18} ${c + s * 0.4},${c + s * 0.03}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </g>
    ),
  };
  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={{ overflow: "visible" }}
    >
      {icons[type] || icons.leaf}
    </svg>
  );
}

// ═══ HEX SVG ═══
const R = 58;
const CX = 70,
  CY = 78;
const sin60 = Math.sin(Math.PI / 3);
const cos60 = Math.cos(Math.PI / 3);
const VERTS = [
  [CX, CY - R],
  [CX + R * sin60, CY - R * cos60],
  [CX + R * sin60, CY + R * cos60],
  [CX, CY + R],
  [CX - R * sin60, CY + R * cos60],
  [CX - R * sin60, CY - R * cos60],
];
const hexPoints = VERTS.map((v) => `${v[0]},${v[1]}`).join(" ");

function edgePath(i) {
  const a = VERTS[i],
    b = VERTS[(i + 1) % 6];
  return `M${a[0]},${a[1]} L${b[0]},${b[1]}`;
}

const EDGE_OUT = [
  { x: 8, y: -14 },
  { x: 16, y: 0 },
  { x: 8, y: 14 },
  { x: -8, y: 14 },
  { x: -16, y: 0 },
  { x: -8, y: -14 },
];

// ═══ HEX CARD ═══
function TerpHex({
  terpene,
  isHovered,
  isAnyHovered,
  onHover,
  onLeave,
  onClick,
}) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        width: `${HEX_W}px`,
        height: "160px",
        cursor: "pointer",
        position: "relative",
        transition:
          "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.35s",
        transform: isHovered
          ? "scale(1.35)"
          : isAnyHovered
            ? "scale(0.92)"
            : "scale(1)",
        zIndex: isHovered ? 100 : 1,
        filter:
          isAnyHovered && !isHovered
            ? "brightness(0.75) saturate(0.5)"
            : "none",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 140 156"
        width={HEX_W}
        height="156"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter
            id={`gl-${terpene.id}`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points={hexPoints}
          fill={isHovered ? `${terpene.color}12` : "#faf9f6"}
          stroke="none"
          style={{ transition: "fill 0.35s" }}
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={edgePath(i)}
            fill="none"
            stroke={terpene.color}
            strokeWidth={isHovered ? "2.5" : "1.2"}
            strokeLinecap="round"
            filter={isHovered ? `url(#gl-${terpene.id})` : "none"}
            style={{
              transition:
                "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-width 0.3s, opacity 0.3s",
              transform: isHovered
                ? `translate(${EDGE_OUT[i].x}px, ${EDGE_OUT[i].y}px)`
                : "translate(0,0)",
              opacity: isHovered ? 1 : 0.35,
              transformOrigin: `${CX}px ${CY}px`,
            }}
          />
        ))}
        {isHovered && (
          <polygon
            points={VERTS.map(([x, y]) => {
              const dx = x - CX,
                dy = y - CY;
              return `${CX + dx * 1.2},${CY + dy * 1.2}`;
            }).join(" ")}
            fill="none"
            stroke={terpene.color}
            strokeWidth="0.8"
            opacity="0.2"
            strokeLinejoin="round"
            style={{ animation: "terp-pulse 1.5s ease-in-out infinite" }}
          />
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: isHovered
            ? "translate(-50%, -55%) scale(1.2)"
            : "translate(-50%, -55%)",
          transition: "transform 0.4s ease, opacity 0.3s",
          opacity: isHovered ? 1 : 0.6,
        }}
      >
        <TerpIcon
          type={terpene.icon}
          color={terpene.color}
          size={isHovered ? 46 : 40}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: isHovered ? "0px" : "4px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          width: "160px",
          transition: "bottom 0.3s",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isHovered ? "11px" : "9px",
            fontWeight: isHovered ? 600 : 400,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isHovered ? terpene.color : "#999",
            transition: "all 0.3s",
            whiteSpace: "nowrap",
          }}
        >
          {terpene.name}
        </div>
        {isHovered && (
          <div
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "8px",
              letterSpacing: "0.1em",
              color: terpene.color,
              opacity: 0.6,
              marginTop: "2px",
              animation: "terp-fade-in 0.3s ease forwards",
            }}
          >
            {terpene.aroma}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ CONVEYOR ROW ═══
function ConveyorRow({
  items,
  direction,
  speed,
  hoveredId,
  setHoveredId,
  setModalId,
}) {
  const [paused, setPaused] = useState(false);
  const stripW = items.length * ITEM_W;
  const tripled = [...items, ...items, ...items];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setHoveredId(null);
      }}
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        padding: "20px 0",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: `${HEX_GAP}px`,
          width: `${stripW * 3}px`,
          animation: `terp-scroll-${direction} ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {tripled.map((t, i) => (
          <TerpHex
            key={`${t.id}-${i}`}
            terpene={t}
            isHovered={hoveredId === t.id}
            isAnyHovered={hoveredId !== null}
            onHover={() => setHoveredId(t.id)}
            onLeave={() => {}}
            onClick={() => setModalId(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══ MODAL ═══
function TerpeneModal({ terpene, onClose, fromUrl }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    if (fromUrl) return;
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, fromUrl]);

  if (!terpene) return null;

  return (
    <div
      onClick={fromUrl ? undefined : onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "terp-modal-bg 0.35s ease forwards",
        pointerEvents: fromUrl ? "none" : "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e8e0d4",
          boxShadow: "0 32px 80px rgba(0,0,0,0.12)",
          maxWidth: "660px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          animation: "terp-modal-box 0.4s ease 0.1s both",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            border: "1px solid #e8e0d4",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            color: "#888",
            zIndex: 2,
            transition: "background 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#f5f0e6";
            e.target.style.transform = "rotate(90deg)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#fff";
            e.target.style.transform = "rotate(0deg)";
          }}
        >
          ✕
        </button>

        <div
          style={{
            padding: "36px 32px 20px",
            borderBottom: `3px solid ${terpene.color}`,
            background: `linear-gradient(135deg, ${terpene.color}08, ${terpene.color}03)`,
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "12px",
              background: `${terpene.color}10`,
              border: `2px solid ${terpene.color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <TerpIcon type={terpene.icon} color={terpene.color} size={40} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "10px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: terpene.color,
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              Terpene Profile
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "clamp(26px, 4vw, 36px)",
                fontWeight: 300,
                color: "#1a1a1a",
                lineHeight: 1.15,
                marginBottom: "4px",
              }}
            >
              {terpene.name}
            </h2>
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "13px",
                color: "#888",
                fontWeight: 300,
                fontStyle: "italic",
              }}
            >
              {terpene.aroma}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            padding: "14px 32px",
            borderBottom: "1px solid #f0ebe1",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {[
            { l: "Formula", v: terpene.formula },
            { l: "Boiling Point", v: terpene.boilingPoint },
            { l: "Prevalence", v: terpene.prevalence },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center", flex: "1 1 100px" }}>
              <div
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "9px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#aaa",
                  marginBottom: "3px",
                }}
              >
                {s.l}
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "15px",
                  color: "#1a1a1a",
                }}
              >
                {s.v}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "22px 32px 32px" }}>
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "15px",
              lineHeight: 1.85,
              color: "#555",
              fontWeight: 300,
              marginBottom: "22px",
            }}
          >
            {terpene.description}
          </p>
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#aaa",
                marginBottom: "8px",
                fontWeight: 500,
              }}
            >
              Key Effects
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {terpene.effects.map((e) => (
                <span
                  key={e}
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "11px",
                    padding: "4px 10px",
                    borderRadius: "2px",
                    border: `1px solid ${terpene.color}25`,
                    color: terpene.color,
                    background: `${terpene.color}08`,
                    letterSpacing: "0.04em",
                  }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#aaa",
                marginBottom: "8px",
                fontWeight: 500,
              }}
            >
              Also Found In
            </div>
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "14px",
                color: "#555",
                fontWeight: 300,
                lineHeight: 1.8,
              }}
            >
              {terpene.foundIn.join("  ·  ")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN PAGE ═══
export default function TerpenePage() {
  const navigate = useNavigate();
  // v3.1: Read :terpeneId from URL — e.g. /terpenes/myrcene
  const { terpeneId } = useParams();

  const [hoveredId, setHoveredId] = useState(null);
  const [modalId, setModalId] = useState(null);

  // v3.1: If arriving via /terpenes/:id, auto-open that terpene's modal
  useEffect(() => {
    if (terpeneId) {
      const match = TERPENES.find((t) => t.id === terpeneId);
      if (match) {
        const timer = setTimeout(() => setModalId(terpeneId), 80);
        return () => clearTimeout(timer);
      }
    }
  }, [terpeneId]);

  const modalTerp = TERPENES.find((t) => t.id === modalId);

  const stripW_top = ROW_TOP.length * ITEM_W;
  const stripW_bot = ROW_BOT.length * ITEM_W;

  return (
    <div
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: "#faf9f6",
        color: "#1a1a1a",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes terp-scroll-right {
          0% { transform: translateX(-${stripW_top}px); }
          100% { transform: translateX(0px); }
        }
        @keyframes terp-scroll-left {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-${stripW_bot}px); }
        }
        @keyframes terp-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.4; }
        }
        @keyframes terp-fade-in {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 0.6; transform: translateY(0); }
        }
        @keyframes terp-modal-bg {
          from { background: rgba(250,249,246,0); backdrop-filter: blur(0); }
          to { background: rgba(250,249,246,0.7); backdrop-filter: blur(14px); }
        }
        @keyframes terp-modal-box {
          from { opacity: 0; transform: scale(0.9) translateY(24px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Hero */}
      <section
        style={{
          padding: "80px 24px 48px",
          textAlign: "center",
          background:
            "linear-gradient(160deg, #faf9f6 0%, #f0ebe1 40%, #e8f5ee 100%)",
        }}
      >
        <span
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#6b5b9e",
          }}
        >
          THE SCIENCE OF FLAVOUR
        </span>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 300,
            color: "#1a1a1a",
            margin: "12px 0 16px",
            lineHeight: 1.1,
          }}
        >
          Terpene Profiles
        </h1>
        <div
          style={{
            width: "48px",
            height: "2px",
            background: "#6b5b9e",
            margin: "0 auto 20px",
          }}
        />
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "15px",
            color: "#666",
            fontWeight: 300,
            maxWidth: "540px",
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          Terpenes are the aromatic architects of every cannabis experience.
          Hover to explore, click to discover the science.
        </p>
      </section>

      {/* Conveyor rows */}
      <section style={{ padding: "24px 0 16px" }}>
        <ConveyorRow
          items={ROW_TOP}
          direction="right"
          speed={SPEED_TOP}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          setModalId={setModalId}
        />
      </section>
      <section style={{ padding: "0 0 40px" }}>
        <ConveyorRow
          items={ROW_BOT}
          direction="left"
          speed={SPEED_BOT}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          setModalId={setModalId}
        />
      </section>

      {/* Back */}
      <section style={{ padding: "20px 24px 80px", textAlign: "center" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            fontFamily: "'Jost', sans-serif",
            padding: "12px 32px",
            background: "transparent",
            color: "#6b5b9e",
            border: "1px solid #6b5b9e",
            borderRadius: "2px",
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#6b5b9e";
            e.target.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "transparent";
            e.target.style.color = "#6b5b9e";
          }}
        >
          Back to Home
        </button>
      </section>

      {/* Modal — auto-opened when arriving via /terpenes/:id.
           On close: if we came from a direct link (/terpenes/:id), go home.
           If opened by clicking a hex on this page, just close the modal. */}
      {modalTerp && (
        <TerpeneModal
          terpene={modalTerp}
          fromUrl={!!terpeneId}
          onClose={() => {
            setModalId(null);
            if (terpeneId) navigate(-1); // go back to Landing at same scroll position
          }}
        />
      )}
    </div>
  );
}
