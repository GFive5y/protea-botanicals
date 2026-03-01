// src/components/Delta8THCMolecule.js v1.0
// Standalone Delta-8-THC animated molecule for embedding in any page.
// Geometry: Extracted from ChemDraw SVG source (32 filled bond paths).
// Effects: Additive polygon overlays (no dimming). 4 zones cycle randomly.
// Architecture matches Delta9THCMolecule.js v1.1 exactly.
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ GEOMETRY — CHEMDRAW SOURCE — DO NOT MODIFY ═══
// Original SVG: viewBox="0 0 131 75"
// Transform: matrix(0.05 0 0 0.05 -212 -112)

const BOND_PATHS = [
  "M 4600.61,3393.82 L 4540.61,3393.82 L 4542.15,3381.78 L 4599.07,3381.78 L 4600.61,3393.82 Z",
  "M 4593.13,3335.28 L 4548.09,3335.28 L 4549.63,3323.25 L 4591.59,3323.25 L 4593.13,3335.28 Z",
  "M 4585.65,3276.75 L 4555.58,3276.75 L 4557.11,3264.72 L 4584.11,3264.72 L 4585.65,3276.75 Z",
  "M 4578.17,3218.22 L 4563.06,3218.22 L 4564.6,3206.18 L 4576.63,3206.18 L 4578.17,3218.22 Z",
  "M 4731.69,3530.04 L 4725.68,3540.46 L 4572.81,3452.2 L 4570.61,3443.98 L 4572.22,3437.97 L 4731.69,3530.04 Z",
  "M 5063.37,3440.51 L 5069.39,3443.98 L 5069.39,3450.93 L 4914.48,3540.36 L 4908.47,3529.95 L 5063.37,3440.51 Z",
  "M 5063.37,3188.23 L 5069.39,3156.02 L 5075.4,3159.49 L 5075.4,3440.51 L 5069.39,3443.98 L 5063.37,3440.51 L 5063.37,3188.23 Z",
  "M 5115.21,3185.94 L 5127.24,3185.94 L 5127.24,3414.06 L 5115.21,3414.06 L 5115.21,3185.94 Z",
  "M 4819.72,3019.14 L 4820,3012.03 L 4826.02,3008.24 L 5094.28,3134.7 L 5069.39,3156.02 L 5063.37,3188.23 L 4819.72,3019.14 Z",
  "M 4570.61,3162.96 L 4570.61,3149.07 L 4813.98,3008.56 L 4820,3012.03 L 4819.72,3019.14 L 4570.61,3162.96 Z",
  "M 5318.78,3581.02 L 5318.78,3594.91 L 5069.39,3450.93 L 5069.39,3443.98 L 5075.4,3440.51 L 5318.78,3581.02 Z",
  "M 5562.15,3440.51 L 5568.16,3443.98 L 5568.16,3450.93 L 5318.78,3594.91 L 5318.78,3581.02 L 5562.15,3440.51 Z",
  "M 5513.32,3408.85 L 5519.34,3419.27 L 5321.78,3533.33 L 5315.77,3522.91 L 5513.32,3408.85 Z",
  "M 5562.15,3159.49 L 5574.18,3152.54 L 5574.18,3440.51 L 5568.16,3443.98 L 5562.15,3440.51 L 5562.15,3159.49 Z",
  "M 5318.78,3018.98 L 5318.78,3012.03 L 5324.79,3008.56 L 5574.18,3152.54 L 5562.15,3159.49 L 5318.78,3018.98 Z",
  "M 5315.77,3077.09 L 5321.78,3066.67 L 5519.34,3180.73 L 5513.32,3191.15 L 5315.77,3077.09 Z",
  "M 5075.4,3159.49 L 5069.39,3156.02 L 5094.28,3134.7 L 5312.76,3008.56 L 5318.78,3012.03 L 5318.78,3018.98 L 5075.4,3159.49 Z",
  "M 5312.76,2834.41 L 5324.79,2834.41 L 5324.79,3008.56 L 5318.78,3012.03 L 5312.76,3008.56 L 5312.76,2834.41 Z",
  "M 4813.98,2727.54 L 4826.02,2720.59 L 4826.02,3008.24 L 4820,3012.03 L 4813.98,3008.56 L 4813.98,2727.54 Z",
  "M 4570.61,2587.02 L 4570.61,2580.08 L 4576.63,2576.61 L 4826.02,2720.59 L 4813.98,2727.54 L 4570.61,2587.02 Z",
  "M 4327.24,2727.54 L 4315.21,2720.59 L 4564.6,2576.61 L 4570.61,2580.08 L 4570.61,2587.02 L 4327.24,2727.54 Z",
  "M 4376.07,2759.2 L 4370.05,2748.78 L 4567.6,2634.72 L 4573.62,2645.14 L 4376.07,2759.2 Z",
  "M 4327.24,3008.56 L 4315.21,3015.5 L 4315.21,2720.59 L 4327.24,2727.54 L 4327.24,3008.56 Z",
  "M 4570.61,3149.07 L 4570.61,3162.96 L 4315.21,3015.5 L 4327.24,3008.56 L 4570.61,3149.07 Z",
  "M 4282.64,3450 L 4282.64,3437.97 L 4572.22,3437.97 L 4570.61,3443.98 L 4560.19,3450 L 4282.64,3450 Z",
  "M 4431.84,3696.38 L 4421.42,3690.36 L 4560.19,3450 L 4570.61,3443.98 L 4572.81,3452.2 L 4431.84,3696.38 Z",
  "M 4564.6,2292.11 L 4576.63,2292.11 L 4576.63,2576.61 L 4570.61,2580.08 L 4564.6,2576.61 L 4564.6,2292.11 Z",
  "M 5817.55,3581.02 L 5817.55,3594.91 L 5568.16,3450.93 L 5568.16,3443.98 L 5574.18,3440.51 L 5817.55,3581.02 Z",
  "M 6066.94,3437.04 L 6066.94,3450.93 L 5817.55,3594.91 L 5817.55,3581.02 L 6066.94,3437.04 Z",
  "M 6316.33,3581.02 L 6316.33,3594.91 L 6066.94,3450.93 L 6066.94,3437.04 L 6316.33,3581.02 Z",
  "M 6565.72,3437.04 L 6565.72,3450.93 L 6316.33,3594.91 L 6316.33,3581.02 L 6565.72,3437.04 Z",
  "M 6818.11,3582.76 L 6812.1,3593.18 L 6565.72,3450.93 L 6565.72,3437.04 L 6818.11,3582.76 Z",
];

// ChemDraw matrix transform
const GEO_TRANSFORM = "matrix(0.05 0 0 0.05 -212 -112)";

// Ring zone polygons (in viewBox coordinates 0 0 131 75)
// Ring A: Cyclohexene (left) — atoms [6,15,27,28,29,32]
const RING_A = "16.6,48.7 29.0,38.6 28.9,24.2 16.5,17.0 4.1,24.2 4.1,38.6";
// Ring B: Pyran (center) — bridges Ring A → Ring C through O atom
const RING_B = "29.0,38.6 41.4,45.8 41.4,60.2 29.0,67.4 16.5,60.2 16.6,48.7";
// Ring C: Cyclohexene (right) — atoms [23,22,19,18,9,junction]
const RING_C = "53.9,38.6 66.4,45.8 66.4,60.2 53.9,67.3 41.4,60.2 41.4,45.8";
const RING_PATHS = [RING_A, RING_B, RING_C];
const ZONE_NAMES = ["Ring A", "Ring B", "Ring C", "Chain"];

const TIERS = {
  light: { opacity: 0.22 },
  medium: { opacity: 0.38 },
  dark: { opacity: 0.55 },
  solid: { opacity: 0.78 },
};

function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `#${[r, g, b]
    .map((c) =>
      Math.min(255, Math.round(c + (255 - c) * amt))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

// ═══ GEOMETRY RENDERER ═══
function Geo({ color, stroke = "none", sw = 0 }) {
  return (
    <g transform={GEO_TRANSFORM}>
      {BOND_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={color}
          stroke={stroke}
          strokeWidth={sw / 0.05}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

// ═══ TEXT LABELS (O and OH from ChemDraw) ═══
function AtomLabels({ color }) {
  return (
    <g
      fill={color}
      fontFamily="Helvetica, Arial"
      fontSize="10"
      fontWeight="normal"
      fontStyle="normal"
    >
      <text x="25.5" y="71.0">
        O
      </text>
      <text x="50.4" y="27.8">
        OH
      </text>
    </g>
  );
}

// ═══ ANIMATED MOLECULE RENDERER ═══
function MoleculeRenderer({ color, opacity, animate }) {
  const [zone, setZone] = useState(null);
  const [sweep, setSweep] = useState(0);
  const timers = useRef([]);
  const raf = useRef(null);
  const alive = useRef(true);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  const doSweep = useCallback((done) => {
    const dur = 1800,
      t0 = performance.now();
    const tick = (now) => {
      if (!alive.current) return;
      const p = Math.min((now - t0) / dur, 1);
      setSweep(1 - Math.pow(1 - p, 3));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else done?.();
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!animate) {
      setZone(null);
      setSweep(0);
      return;
    }
    const rm =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (rm) return;
    let last = -1;
    const go = () => {
      if (!alive.current) return;
      let n;
      do {
        n = Math.floor(Math.random() * 4);
      } while (n === last);
      last = n;
      setZone(n);
      setSweep(0);
      if (n === 3) {
        doSweep(() => {
          const t1 = setTimeout(() => {
            if (!alive.current) return;
            setZone(null);
            setSweep(0);
            const t2 = setTimeout(go, 800 + Math.random() * 1000);
            timers.current.push(t2);
          }, 600);
          timers.current.push(t1);
        });
      } else {
        const t1 = setTimeout(
          () => {
            if (!alive.current) return;
            setZone(null);
            const t2 = setTimeout(go, 800 + Math.random() * 1000);
            timers.current.push(t2);
          },
          1500 + Math.random() * 500,
        );
        timers.current.push(t1);
      }
    };
    const t0 = setTimeout(go, 400);
    timers.current.push(t0);
    return () => {
      alive.current = false;
      clear();
    };
  }, [animate, doSweep, clear]);

  const bright = lighten(color, 0.45);

  return (
    <svg viewBox="0 0 131 75" width="100%" style={{ display: "block" }}>
      <defs>
        <filter id="d8-glo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Chain sweep clip — right side from Ring C outward */}
        <clipPath id="d8-cc">
          <rect
            x="66"
            y="0"
            width={65 * (zone === 3 ? sweep : 0)}
            height="75"
          />
        </clipPath>
      </defs>

      {/* Base molecule */}
      <g opacity={opacity}>
        <Geo color={color} />
        <AtomLabels color={color} />
      </g>

      {/* Ring glow overlay */}
      {zone !== null && zone < 3 && (
        <polygon
          points={RING_PATHS[zone]}
          fill="none"
          stroke={bright}
          strokeWidth="0.8"
          strokeLinejoin="round"
          filter="url(#d8-glo)"
          opacity="0.95"
        />
      )}

      {/* Chain sweep overlay */}
      {zone === 3 && sweep > 0 && (
        <g clipPath="url(#d8-cc)" opacity={0.9 * sweep} filter="url(#d8-glo)">
          <Geo color={bright} stroke={bright} sw={0.5} />
          <AtomLabels color={bright} />
        </g>
      )}
    </svg>
  );
}

// ═══ EXPORTED COMPONENT ═══
// Props: onClick (optional), showControls (default true), compact (default false)
export default function Delta8THCMolecule({
  onClick,
  showControls = true,
  compact = false,
}) {
  const [tier, setTier] = useState("dark");
  const [color, setColor] = useState("#3B82F6");
  const [hovered, setHovered] = useState(false);

  const colors = [
    { hex: "#3B82F6", name: "Blue" },
    { hex: "#52b788", name: "Green" },
    { hex: "#EF4444", name: "Red" },
    { hex: "#EAB308", name: "Gold" },
    { hex: "#8B5CF6", name: "Purple" },
    { hex: "#14B8A6", name: "Teal" },
  ];

  return (
    <div style={{ width: "100%" }}>
      {/* Clickable molecule area */}
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: onClick ? "pointer" : "default",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          transform: onClick && hovered ? "translateY(-4px)" : "none",
          borderRadius: "4px",
          position: "relative",
        }}
      >
        {/* Title */}
        <div
          style={{
            textAlign: "center",
            marginBottom: compact ? "8px" : "12px",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: compact ? "14px" : "15px",
              fontWeight: 300,
              color: "#1a1a1a",
              letterSpacing: "0.06em",
            }}
          >
            Δ8-Tetrahydrocannabinol
          </div>
          <div
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#aaa",
              marginTop: "2px",
            }}
          >
            Living Molecule
          </div>
        </div>

        {/* SVG */}
        <MoleculeRenderer
          color={color}
          opacity={TIERS[tier].opacity}
          animate={true}
        />

        {/* Hover hint */}
        {onClick && hovered && (
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "'Jost', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#1d4ed8",
              opacity: 0.7,
              whiteSpace: "nowrap",
              background: "rgba(250,249,246,0.85)",
              padding: "2px 10px",
              borderRadius: "2px",
            }}
          >
            Explore All Molecules →
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            {Object.keys(TIERS).map((k) => (
              <button
                key={k}
                onClick={(e) => {
                  e.stopPropagation();
                  setTier(k);
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: "9px",
                  fontFamily: "'Jost', sans-serif",
                  fontWeight: tier === k ? 600 : 400,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  border: `1px solid ${tier === k ? color : "#e8e0d4"}`,
                  borderRadius: "2px",
                  background: tier === k ? color : "transparent",
                  color: tier === k ? "#fff" : "#888",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <div
            style={{ width: "1px", height: "16px", background: "#e8e0d4" }}
          />
          <div style={{ display: "flex", gap: "4px" }}>
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={(e) => {
                  e.stopPropagation();
                  setColor(c.hex);
                }}
                title={c.name}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "2px",
                  border:
                    color === c.hex
                      ? `2px solid ${c.hex}`
                      : "1px solid #e8e0d4",
                  background: c.hex,
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: color === c.hex ? `0 0 6px ${c.hex}44` : "none",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
