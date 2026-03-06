// src/components/TerpeneModal.js
// Extracted from TerpenePage.js v3.1 so the modal can be used in-place on
// Landing.js without route navigation (DEC-024).
// Exports: TERPENES (data array), TerpIcon (SVG renderer), default TerpeneModal
// Used by: Landing.js (in-place overlay), TerpenePage.js (standalone page modal)

import { useEffect } from "react";

// ═══ TERPENE DATA ═══
export const TERPENES = [
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

// ═══ SVG ICON RENDERER ═══
export function TerpIcon({ type, color, size = 40 }) {
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

// ═══ TERPENE MODAL ═══
// Props:
//   terpene   — terpene object from TERPENES array
//   onClose   — callback to close the modal
//   fromUrl   — true when opened via /terpenes/:id direct URL (disables backdrop click)
export default function TerpeneModal({ terpene, onClose, fromUrl = false }) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape key closes (only when not opened via direct URL)
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
    <>
      <style>{`
        @keyframes terp-modal-bg {
          from { background: rgba(250,249,246,0); backdrop-filter: blur(0px); }
          to   { background: rgba(250,249,246,0.72); backdrop-filter: blur(14px); }
        }
        @keyframes terp-modal-box {
          from { opacity: 0; transform: scale(0.9) translateY(24px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes terp-fade-in {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 0.6; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
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
        }}
      >
        {/* Modal card — stops backdrop click bubbling */}
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
          }}
        >
          {/* Close button */}
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
              e.currentTarget.style.background = "#f5f0e6";
              e.currentTarget.style.transform = "rotate(90deg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "rotate(0deg)";
            }}
          >
            ✕
          </button>

          {/* Header */}
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

          {/* Stats row */}
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

          {/* Body */}
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

            {/* Effects */}
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

            {/* Found in */}
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
    </>
  );
}
