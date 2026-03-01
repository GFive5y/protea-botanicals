// src/components/CBDMolecule.js v1.0
// Standalone CBD (Cannabidiol) animated molecule for embedding in any page.
// Geometry: Extracted from SVG source (stroke-based line segments).
// CBD has 2 separate rings (cyclohexene + benzene) — NOT fused like THC.
// Effects: Additive polygon overlays (no dimming). 3 zones cycle randomly.
// Architecture matches Delta9THCMolecule.js v1.1 exactly.
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ GEOMETRY — SVG SOURCE — DO NOT MODIFY ═══
// ViewBox: 0 0 670 375

// Bond segments [x1, y1, x2, y2]
const BOND_SEGMENTS = [
  // Ring A (cyclohexene - left)
  [138.6, 178.3, 80.9, 211.7],
  [138.6, 178.3, 138.6, 111.7],
  [80.9, 211.7, 23.2, 178.3],
  [138.6, 111.7, 80.9, 78.3],
  [23.2, 178.3, 23.2, 111.7],
  [80.9, 78.3, 23.2, 111.7],
  // Ring A double bond (inner)
  [125.2, 118.0, 82.2, 93.1],
  // Ring A substituents
  [80.9, 211.7, 80.9, 278.3],
  [80.9, 278.3, 23.2, 311.7],
  [80.9, 278.3, 138.6, 311.7],
  // Second double bond indicator (inner)
  [94.4, 272.0, 144.8, 301.1],
  // Bridge bond (Ring A → Ring B)
  [254.1, 245.0, 138.6, 178.3],
  // Ring B (benzene - right)
  [254.1, 245.0, 311.8, 211.7],
  [254.1, 245.0, 254.1, 311.7],
  [311.8, 211.7, 369.6, 245.0],
  [254.1, 311.7, 311.8, 345.0],
  [369.6, 245.0, 369.6, 311.7],
  [311.8, 345.0, 369.6, 311.7],
  // Ring B double bonds (inner)
  [266.3, 253.5, 266.3, 303.2],
  [313.1, 226.5, 356.1, 251.4],
  [313.1, 330.2, 356.1, 305.3],
  // Substituents
  [254.1, 311.7, 219.7, 331.6],
  [311.8, 211.7, 311.8, 172.9],
  [80.9, 78.3, 80.9, 11.7],
  // Pentyl chain
  [369.6, 311.7, 427.4, 345.0],
  [427.4, 345.0, 485.2, 311.7],
  [485.2, 311.7, 543.0, 345.0],
  [543.0, 345.0, 600.8, 311.7],
  [600.8, 311.7, 658.6, 345.0],
];

// Wedge bond hash lines (stereochemistry)
const WEDGE_LINES = [
  [171.8, 163.6, 168.0, 156.9],
  [160.6, 168.6, 158.1, 164.2],
  [149.4, 173.6, 148.1, 171.4],
];

// Wedge bond fill (triangle from original SVG)
const WEDGE_PATH = "M 80.9,211.7 L 41.9,229.0 L 44.1,232.8 L 46.3,236.7 Z";

// Ring zone polygons (in viewBox 0 0 670 375)
// Ring A: Cyclohexene (left)
const RING_A =
  "138.6,178.3 80.9,211.7 23.2,178.3 23.2,111.7 80.9,78.3 138.6,111.7";
// Ring B: Benzene (right)
const RING_B =
  "254.1,245.0 311.8,211.7 369.6,245.0 369.6,311.7 311.8,345.0 254.1,311.7";
const RING_PATHS = [RING_A, RING_B];
const ZONE_NAMES = ["Ring A", "Ring B", "Chain"];

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
function Geo({ color, sw = 3.3 }) {
  return (
    <g
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {BOND_SEGMENTS.map((s, i) => (
        <line key={`b${i}`} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
      ))}
      {WEDGE_LINES.map((s, i) => (
        <line key={`w${i}`} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
      ))}
      <path d={WEDGE_PATH} fill={color} stroke="none" />
    </g>
  );
}

// ═══ TEXT LABELS ═══
function AtomLabels({ color }) {
  // Text positions computed from SVG matrix transform
  // matrix(4.63, 0, 0, 4.63, -1153.77, -419.48) + inner translate
  return (
    <g fill={color} fontFamily="Arial, sans-serif" fontWeight="normal">
      {/* CH₂ hydrogen (methylidene, upper-left) */}
      <text x="6.3" y="263.9" fontSize="33">
        H
      </text>
      {/* OH group near bridge bond */}
      <text x="179.7" y="163.9" fontSize="33">
        H
      </text>
      {/* Lower OH group */}
      <text x="145.2" y="363.9" fontSize="33">
        H
      </text>
      <text x="178.5" y="363.9" fontSize="33">
        O
      </text>
      {/* Upper OH group on Ring B */}
      <text x="293.0" y="163.9" fontSize="33">
        O
      </text>
      <text x="329.7" y="163.9" fontSize="33">
        H
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
        n = Math.floor(Math.random() * 3);
      } while (n === last);
      last = n;
      setZone(n);
      setSweep(0);
      if (n === 2) {
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
    <svg viewBox="0 0 670 375" width="100%" style={{ display: "block" }}>
      <defs>
        <filter id="cbd-glo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Chain sweep clip — right from Ring B outward */}
        <clipPath id="cbd-cc">
          <rect
            x="370"
            y="0"
            width={300 * (zone === 2 ? sweep : 0)}
            height="375"
          />
        </clipPath>
      </defs>

      {/* Base molecule */}
      <g opacity={opacity}>
        <Geo color={color} />
        <AtomLabels color={color} />
      </g>

      {/* Ring glow overlay */}
      {zone !== null && zone < 2 && (
        <polygon
          points={RING_PATHS[zone]}
          fill="none"
          stroke={bright}
          strokeWidth="3"
          strokeLinejoin="round"
          filter="url(#cbd-glo)"
          opacity="0.95"
        />
      )}

      {/* Chain sweep overlay */}
      {zone === 2 && sweep > 0 && (
        <g clipPath="url(#cbd-cc)" opacity={0.9 * sweep} filter="url(#cbd-glo)">
          <Geo color={bright} sw={4} />
          <AtomLabels color={bright} />
        </g>
      )}
    </svg>
  );
}

// ═══ EXPORTED COMPONENT ═══
export default function CBDMolecule({
  onClick,
  showControls = true,
  compact = false,
}) {
  const [tier, setTier] = useState("dark");
  const [color, setColor] = useState("#52b788");
  const [hovered, setHovered] = useState(false);

  const colors = [
    { hex: "#52b788", name: "Green" },
    { hex: "#3B82F6", name: "Blue" },
    { hex: "#EF4444", name: "Red" },
    { hex: "#EAB308", name: "Gold" },
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
            Cannabidiol
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
              color: "#2d6a4f",
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
