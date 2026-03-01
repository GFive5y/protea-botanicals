// src/components/THCaMolecule.js v1.0
// Standalone THCa (Tetrahydrocannabinolic Acid) animated molecule.
// Geometry: Extracted from Inkscape SVG source (stroke-based line segments).
// Effects: Additive polygon overlays (no dimming). 4 zones cycle randomly.
// Architecture matches Delta9THCMolecule.js v1.1 exactly.
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ GEOMETRY — INKSCAPE SOURCE — DO NOT MODIFY ═══
// Coordinate system: normalized from Inkscape SVG with group transforms applied.
// ViewBox: 0 0 638 365

// All bond segments as [x1, y1, x2, y2]
// Group 1 (Ring C hexagon, g4741-4 transform)
// Group 2 (Ring A hexagon, g17751 transform)
// Direct paths (layer1 transform only)
// Group 4 (double bond lines, g4531 transform)
const BOND_SEGMENTS = [
  // Ring C (right hexagon)
  [213.7, 230.9, 213.7, 297.7],
  [272.6, 332.6, 214.7, 299.2],
  [214.7, 229.2, 272.6, 195.8],
  [274.2, 195.8, 332.1, 229.2],
  [333.2, 230.9, 333.2, 297.7],
  [332.3, 299.2, 274.4, 332.6],
  // Ring A (left hexagon)
  [32.0, 127.6, 32.0, 194.5],
  [90.8, 229.4, 32.9, 196.0],
  [32.9, 126.0, 90.8, 92.6],
  [92.5, 92.6, 150.4, 126.0],
  [151.5, 127.6, 151.5, 194.5],
  [150.6, 196.0, 92.7, 229.4],
  // Double bond (C=O in carboxylic acid)
  [389.8, 154.0, 389.8, 194.2],
  [399.0, 154.0, 399.0, 194.2],
  // Direct bonds (inter-ring, chain, substituents)
  [315.4, 292.4, 278.3, 313.9],
  [276.9, 213.8, 314.1, 235.3],
  [228.1, 286.5, 228.1, 243.6],
  [392.2, 333.1, 334.4, 299.7],
  [394.1, 333.1, 452.0, 299.7],
  [453.7, 299.7, 511.6, 333.1],
  [273.8, 153.3, 273.8, 193.5],
  [176.5, 320.6, 211.3, 300.5],
  [91.6, 89.3, 91.6, 22.5],
  [95.2, 110.6, 132.3, 132.0],
  [92.8, 297.8, 127.6, 318.0],
  [89.6, 299.5, 56.2, 357.4],
  [89.3, 296.9, 22.5, 296.9],
  [335.6, 228.6, 393.5, 195.2],
  [395.4, 195.2, 430.2, 215.3],
  [513.5, 333.1, 571.4, 299.7],
  [573.1, 299.7, 631.0, 333.1],
];

// Wedge bond indicators (stereochemistry marks)
const WEDGE_SEGMENTS = [
  [93.8, 236.1, 89.1, 236.0],
  [95.3, 249.0, 87.6, 249.0],
  [96.4, 262.0, 86.5, 262.0],
  [97.5, 274.9, 85.4, 274.9],
  [98.8, 287.8, 84.2, 287.8],
];

// Filled wedge path (stereo bond triangle)
const WEDGE_PATH = "M 150.5,194.2 L 215.5,225.7 L 210.9,229.3 L 212.4,237.3 Z";

// Ring zone polygons (in viewBox coordinates 0 0 638 365)
// Ring A: Cyclohexene (upper-left) — 6-membered ring
const RING_A =
  "32.5,126.8 91.6,92.6 150.9,126.8 151.0,195.2 91.8,229.4 32.5,195.2";
// Ring B: Open-top zone (center) — bridges Ring A → Ring C
// Rendered as polyline (no closing top edge) to match molecular topology
const RING_B = "150.9,126.8 150.9,195.2 210.2,229.4 269.4,195.2 269.4,126.8";
const RING_B_OPEN = true;
// Ring C: Cyclohexane (lower-right) — 6-membered ring
const RING_C =
  "214.2,230.0 273.3,195.8 332.7,230.0 332.8,298.4 273.5,332.6 214.2,298.4";
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
function Geo({ color, sw = 5 }) {
  return (
    <g
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="square"
      strokeLinejoin="miter"
      fill="none"
    >
      {BOND_SEGMENTS.map((s, i) => (
        <line key={`b${i}`} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
      ))}
      {WEDGE_SEGMENTS.map((s, i) => (
        <line
          key={`w${i}`}
          x1={s[0]}
          y1={s[1]}
          x2={s[2]}
          y2={s[3]}
          strokeWidth={sw * 0.8}
        />
      ))}
      <path d={WEDGE_PATH} fill={color} stroke="none" />
    </g>
  );
}

// ═══ TEXT LABELS ═══
function AtomLabels({ color }) {
  return (
    <g
      fill={color}
      fontFamily="'Bitstream Vera Sans', Arial, sans-serif"
      fontWeight="normal"
      fontSize="45"
    >
      {/* OH group (hydroxyl on ring) */}
      <text x="273.7" y="148.6" textAnchor="middle">
        O
      </text>
      <text x="306.5" y="148.5" textAnchor="middle">
        H
      </text>
      {/* C=O (carboxylic acid carbonyl) */}
      <text x="394.4" y="148.6" textAnchor="middle">
        O
      </text>
      {/* COOH hydroxyl */}
      <text x="448.9" y="245.1" textAnchor="middle">
        O
      </text>
      <text x="481.7" y="245.0" textAnchor="middle">
        H
      </text>
      {/* O in pyran ring */}
      <text x="151.3" y="344.8" textAnchor="middle">
        O
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
    <svg viewBox="0 0 638 365" width="100%" style={{ display: "block" }}>
      <defs>
        <filter id="thca-glo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Chain sweep clip — right side from Ring C outward */}
        <clipPath id="thca-cc">
          <rect
            x="333"
            y="0"
            width={310 * (zone === 3 ? sweep : 0)}
            height="365"
          />
        </clipPath>
      </defs>

      {/* Base molecule */}
      <g opacity={opacity}>
        <Geo color={color} />
        <AtomLabels color={color} />
      </g>

      {/* Ring glow overlay */}
      {zone !== null &&
        zone < 3 &&
        (zone === 1 ? (
          <polyline
            points={RING_PATHS[1]}
            fill="none"
            stroke={bright}
            strokeWidth="4"
            strokeLinejoin="round"
            filter="url(#thca-glo)"
            opacity="0.95"
          />
        ) : (
          <polygon
            points={RING_PATHS[zone]}
            fill="none"
            stroke={bright}
            strokeWidth="4"
            strokeLinejoin="round"
            filter="url(#thca-glo)"
            opacity="0.95"
          />
        ))}

      {/* Chain sweep overlay */}
      {zone === 3 && sweep > 0 && (
        <g
          clipPath="url(#thca-cc)"
          opacity={0.9 * sweep}
          filter="url(#thca-glo)"
        >
          <Geo color={bright} sw={6} />
          <AtomLabels color={bright} />
        </g>
      )}
    </svg>
  );
}

// ═══ EXPORTED COMPONENT ═══
export default function THCaMolecule({
  onClick,
  showControls = true,
  compact = false,
}) {
  const [tier, setTier] = useState("dark");
  const [color, setColor] = useState("#EAB308");
  const [hovered, setHovered] = useState(false);

  const colors = [
    { hex: "#EAB308", name: "Gold" },
    { hex: "#52b788", name: "Green" },
    { hex: "#3B82F6", name: "Blue" },
    { hex: "#EF4444", name: "Red" },
    { hex: "#8B5CF6", name: "Purple" },
    { hex: "#14B8A6", name: "Teal" },
  ];

  return (
    <div style={{ width: "100%" }}>
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
            Tetrahydrocannabinolic Acid
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

        <MoleculeRenderer
          color={color}
          opacity={TIERS[tier].opacity}
          animate={true}
        />

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
              color: "#a16207",
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
