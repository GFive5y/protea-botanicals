// src/components/CBNMolecule.js v1.0
// Standalone CBN (Cannabinol) animated molecule for embedding in any page.
// Geometry: Extracted from Inkscape SVG source (stroke-based line segments).
// CBN has 3 fused aromatic rings (fully conjugated, unlike THCa cyclohexene).
// Effects: Additive polygon overlays (no dimming). 4 zones cycle randomly.
// Architecture matches Delta9THCMolecule.js v1.1 exactly.
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ GEOMETRY — INKSCAPE SOURCE — DO NOT MODIFY ═══
// ViewBox: 0 0 646 375 (normalized from bounding box)

const BOND_SEGMENTS = [
  // Ring C (right hexagon, g4741)
  [213.7,230.9, 213.7,297.7],
  [272.6,332.6, 214.7,299.2],
  [214.7,229.2, 272.6,195.8],
  [274.2,195.8, 332.1,229.2],
  [333.2,230.9, 333.2,297.7],
  [332.3,299.2, 274.4,332.6],
  // Ring A (left hexagon, g17751)
  [32.0,127.7, 32.0,194.5],
  [90.8,229.4, 32.9,196.0],
  [32.9,126.0, 90.8,92.6],
  [92.5,92.6, 150.4,126.0],
  [151.5,127.7, 151.5,194.5],
  [150.6,196.0, 92.7,229.4],
  // Ring B / junction bonds
  [315.4,292.4, 278.3,313.9],
  [276.9,213.8, 314.1,235.3],
  [228.1,286.5, 228.1,243.6],
  // Chain bonds (right)
  [392.2,333.2, 334.4,299.7],
  [394.1,333.2, 452.0,299.7],
  [453.7,299.7, 511.6,333.1],
  [513.8,332.8, 571.6,299.4],
  [573.5,299.4, 631.4,332.8],
  // OH bond
  [273.8,153.3, 273.8,193.5],
  // O-bridge bond
  [176.5,320.6, 211.3,300.5],
  // Ring junction (Ring C → Ring A)
  [211.9,228.2, 154.0,194.7],
  // Ring A vertical (aromatic)
  [91.4,296.4, 91.4,229.6],
  // Methyl stem
  [93.9,89.4, 93.9,22.5],
  // Ring A → Ring B connectors
  [133.7,189.2, 96.6,210.6],
  [95.2,110.6, 132.3,132.0],
  // Ring A inner double bond indicators
  [46.4,183.2, 46.4,140.4],
  // O-side bonds
  [92.5,298.0, 127.3,318.1],
  [89.6,299.5, 56.2,357.4],
  [89.4,296.9, 22.5,296.9],
];

// Ring zone polygons
// Ring A: Aromatic benzene (upper-left)
const RING_A = "32.5,127.0 91.6,92.6 150.9,127.0 151.0,195.2 91.8,229.4 32.5,195.2";
// Ring B: Open-top pyran bridge (center)
const RING_B = "150.9,127.0 150.9,195.2 210.2,229.4 269.4,195.2 269.4,127.0";
const RING_B_OPEN = true;
// Ring C: Aromatic benzene (lower-right)
const RING_C = "214.2,230.0 273.3,195.8 332.7,230.0 332.8,298.4 273.5,332.6 214.2,298.4";
const RING_PATHS = [RING_A, RING_B, RING_C];
const ZONE_NAMES = ["Ring A", "Ring B", "Ring C", "Chain"];

const TIERS = {
  light:  { opacity: 0.22 },
  medium: { opacity: 0.38 },
  dark:   { opacity: 0.55 },
  solid:  { opacity: 0.78 },
};

function lighten(hex, amt) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `#${[r,g,b].map(c => Math.min(255,Math.round(c+(255-c)*amt)).toString(16).padStart(2,"0")).join("")}`;
}

// ═══ GEOMETRY RENDERER ═══
function Geo({ color, sw = 5 }) {
  return (
    <g stroke={color} strokeWidth={sw} strokeLinecap="square" strokeLinejoin="miter" fill="none">
      {BOND_SEGMENTS.map((s, i) => (
        <line key={`b${i}`} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} />
      ))}
    </g>
  );
}

// ═══ TEXT LABELS ═══
function AtomLabels({ color }) {
  return (
    <g fill={color} fontFamily="'Bitstream Vera Sans', Arial, sans-serif" fontWeight="normal" fontSize="45">
      {/* OH group */}
      <text x="273.7" y="148.6" textAnchor="middle">O</text>
      <text x="306.5" y="148.5" textAnchor="middle">H</text>
      {/* O in pyran ring */}
      <text x="151.3" y="344.8" textAnchor="middle">O</text>
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
    const dur = 1800, t0 = performance.now();
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
    if (!animate) { setZone(null); setSweep(0); return; }
    const rm = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (rm) return;
    let last = -1;
    const go = () => {
      if (!alive.current) return;
      let n;
      do { n = Math.floor(Math.random() * 4); } while (n === last);
      last = n; setZone(n); setSweep(0);
      if (n === 3) {
        doSweep(() => {
          const t1 = setTimeout(() => {
            if (!alive.current) return;
            setZone(null); setSweep(0);
            const t2 = setTimeout(go, 800 + Math.random() * 1000);
            timers.current.push(t2);
          }, 600);
          timers.current.push(t1);
        });
      } else {
        const t1 = setTimeout(() => {
          if (!alive.current) return;
          setZone(null);
          const t2 = setTimeout(go, 800 + Math.random() * 1000);
          timers.current.push(t2);
        }, 1500 + Math.random() * 500);
        timers.current.push(t1);
      }
    };
    const t0 = setTimeout(go, 400);
    timers.current.push(t0);
    return () => { alive.current = false; clear(); };
  }, [animate, doSweep, clear]);

  const bright = lighten(color, 0.45);

  return (
    <svg viewBox="0 0 646 375" width="100%" style={{ display: "block" }}>
      <defs>
        <filter id="cbn-glo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="cbn-cc">
          <rect x="333" y="0" width={310 * (zone === 3 ? sweep : 0)} height="375" />
        </clipPath>
      </defs>

      {/* Base molecule */}
      <g opacity={opacity}>
        <Geo color={color} />
        <AtomLabels color={color} />
      </g>

      {/* Ring glow overlay */}
      {zone !== null && zone < 3 && (
        zone === 1 ? (
          <polyline points={RING_PATHS[1]} fill="none" stroke={bright}
            strokeWidth="4" strokeLinejoin="round" filter="url(#cbn-glo)" opacity="0.95" />
        ) : (
          <polygon points={RING_PATHS[zone]} fill="none" stroke={bright}
            strokeWidth="4" strokeLinejoin="round" filter="url(#cbn-glo)" opacity="0.95" />
        )
      )}

      {/* Chain sweep overlay */}
      {zone === 3 && sweep > 0 && (
        <g clipPath="url(#cbn-cc)" opacity={0.9 * sweep} filter="url(#cbn-glo)">
          <Geo color={bright} sw={6} />
          <AtomLabels color={bright} />
        </g>
      )}
    </svg>
  );
}

// ═══ EXPORTED COMPONENT ═══
export default function CBNMolecule({ onClick, showControls = true, compact = false }) {
  const [tier, setTier] = useState("dark");
  const [color, setColor] = useState("#8B5CF6");
  const [hovered, setHovered] = useState(false);

  const colors = [
    { hex: "#8B5CF6", name: "Purple" },
    { hex: "#52b788", name: "Green" },
    { hex: "#3B82F6", name: "Blue" },
    { hex: "#EF4444", name: "Red" },
    { hex: "#EAB308", name: "Gold" },
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
        <div style={{ textAlign: "center", marginBottom: compact ? "8px" : "12px" }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: compact ? "14px" : "15px", fontWeight: 300, color: "#1a1a1a",
            letterSpacing: "0.06em",
          }}>
            Cannabinol
          </div>
          <div style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "9px", letterSpacing: "0.25em",
            textTransform: "uppercase", color: "#aaa", marginTop: "2px",
          }}>
            Living Molecule
          </div>
        </div>

        <MoleculeRenderer color={color} opacity={TIERS[tier].opacity} animate={true} />

        {onClick && hovered && (
          <div style={{
            position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)",
            fontFamily: "'Jost', sans-serif", fontSize: "9px",
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: "#6d28d9", opacity: 0.7, whiteSpace: "nowrap",
            background: "rgba(250,249,246,0.85)", padding: "2px 10px",
            borderRadius: "2px",
          }}>
            Explore All Molecules →
          </div>
        )}
      </div>

      {showControls && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "16px", marginTop: "16px", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: "4px" }}>
            {Object.keys(TIERS).map(k => (
              <button key={k} onClick={(e) => { e.stopPropagation(); setTier(k); }} style={{
                padding: "4px 10px", fontSize: "9px",
                fontFamily: "'Jost', sans-serif", fontWeight: tier === k ? 600 : 400,
                letterSpacing: "0.12em", textTransform: "uppercase",
                border: `1px solid ${tier === k ? color : "#e8e0d4"}`,
                borderRadius: "2px",
                background: tier === k ? color : "transparent",
                color: tier === k ? "#fff" : "#888",
                cursor: "pointer", transition: "all 0.2s",
              }}>
                {k}
              </button>
            ))}
          </div>
          <div style={{ width: "1px", height: "16px", background: "#e8e0d4" }} />
          <div style={{ display: "flex", gap: "4px" }}>
            {colors.map(c => (
              <button key={c.hex} onClick={(e) => { e.stopPropagation(); setColor(c.hex); }} title={c.name}
                style={{
                  width: "20px", height: "20px", borderRadius: "2px",
                  border: color === c.hex ? `2px solid ${c.hex}` : "1px solid #e8e0d4",
                  background: c.hex, cursor: "pointer", padding: 0,
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
