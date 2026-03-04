// src/components/MoleculePulse.js v4.0
// Pure opacity pulse — NO filters, NO glow divs, NO brightness hacks.
// Wraps molecule component in a div with CSS opacity transition.
// Hover: locks visible, arrows appear. Click: opens modal.
import { useState, useEffect, useRef, useCallback } from "react";
import Delta9THCMolecule from "./Delta9THCMolecule";
import Delta8THCMolecule from "./Delta8THCMolecule";
import Delta10THCMolecule from "./Delta10THCMolecule";
import THCaMolecule from "./THCaMolecule";
import CBDMolecule from "./CBDMolecule";
import CBGMolecule from "./CBGMolecule";
import CBNMolecule from "./CBNMolecule";

const MOLECULES = [
  { id: "d9-thc", name: "Δ9-THC", Component: Delta9THCMolecule },
  { id: "cbd", name: "CBD", Component: CBDMolecule },
  { id: "d8-thc", name: "Δ8-THC", Component: Delta8THCMolecule },
  { id: "thca", name: "THCa", Component: THCaMolecule },
  { id: "cbn", name: "CBN", Component: CBNMolecule },
  { id: "cbg", name: "CBG", Component: CBGMolecule },
  { id: "d10-thc", name: "Δ10-THC", Component: Delta10THCMolecule },
];

const TOTAL = MOLECULES.length;

// Timing (ms) — 10s total cycle
const BRIGHTEN = 3500; // 35% — fade in
const HOLD = 2500; // 25% — stay visible
const DIM = 4000; // 40% — fade out

export default function MoleculePulse({ onSelect }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("brighten"); // brighten | hold | dim
  const [hovered, setHovered] = useState(false);
  const [sliding, setSliding] = useState(false);
  const timerRef = useRef(null);
  const phaseRef = useRef("brighten");

  const mol = MOLECULES[index];
  const { Component } = mol;

  // ═══ PULSE CYCLE ═══
  const nextPhase = useCallback(() => {
    if (phaseRef.current === "brighten") {
      phaseRef.current = "hold";
      setPhase("hold");
      timerRef.current = setTimeout(nextPhase, HOLD);
    } else if (phaseRef.current === "hold") {
      phaseRef.current = "dim";
      setPhase("dim");
      timerRef.current = setTimeout(nextPhase, DIM);
    } else {
      // Dim complete → swap molecule, start brighten
      phaseRef.current = "brighten";
      setPhase("brighten");
      setIndex((prev) => (prev + 1) % TOTAL);
      timerRef.current = setTimeout(nextPhase, BRIGHTEN);
    }
  }, []);

  useEffect(() => {
    if (hovered) {
      clearTimeout(timerRef.current);
      return;
    }
    let remaining;
    if (phaseRef.current === "brighten") remaining = BRIGHTEN;
    else if (phaseRef.current === "hold") remaining = HOLD;
    else remaining = DIM;
    timerRef.current = setTimeout(nextPhase, remaining);
    return () => clearTimeout(timerRef.current);
  }, [hovered, nextPhase, index]);

  // ═══ CAROUSEL NAV ═══
  const advance = useCallback(
    (dir) => {
      if (sliding) return;
      setSliding(true);
      setIndex((prev) => (prev + dir + TOTAL) % TOTAL);
      phaseRef.current = "hold";
      setPhase("hold");
      setTimeout(() => setSliding(false), 400);
    },
    [sliding],
  );

  // ═══ OPACITY + TRANSITION ═══
  let wrapperOpacity, transitionDuration;
  if (hovered) {
    wrapperOpacity = 1;
    transitionDuration = "0.3s";
  } else if (phase === "brighten") {
    wrapperOpacity = 1;
    transitionDuration = `${BRIGHTEN / 1000}s`;
  } else if (phase === "hold") {
    wrapperOpacity = 1;
    transitionDuration = "0.1s";
  } else {
    // dim
    wrapperOpacity = 0;
    transitionDuration = `${DIM / 1000}s`;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "500px",
        margin: "0 auto",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <style>{`
        .mp-btn {
          transition: opacity 0.35s, left 0.35s, right 0.35s, transform 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .mp-btn:hover {
          background: rgba(45,106,79,0.15) !important;
          transform: translateY(-50%) scale(1.15);
          box-shadow: 0 4px 16px rgba(45,106,79,0.25);
        }
      `}</style>

      {/* Molecule — just opacity, nothing else */}
      <div
        style={{
          opacity: wrapperOpacity,
          transition: `opacity ${transitionDuration} ease`,
          minHeight: "280px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: hovered ? "pointer" : "default",
        }}
        onClick={() => {
          if (onSelect) onSelect(mol.id);
        }}
      >
        <div style={{ pointerEvents: "none", width: "100%" }}>
          <Component showControls={false} compact={true} />
        </div>
      </div>

      {/* Left arrow */}
      <button
        className="mp-btn"
        onClick={(e) => {
          e.stopPropagation();
          advance(-1);
        }}
        style={{
          position: "absolute",
          left: hovered ? "-50px" : "-70px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "1px solid #e8e0d4",
          background: "rgba(255,255,255,0.92)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2d6a4f",
          fontSize: "22px",
          fontWeight: 300,
          zIndex: 10,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.35s, left 0.35s",
        }}
        aria-label="Previous"
      >
        ‹
      </button>

      {/* Right arrow */}
      <button
        className="mp-btn"
        onClick={(e) => {
          e.stopPropagation();
          advance(1);
        }}
        style={{
          position: "absolute",
          right: hovered ? "-50px" : "-70px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "1px solid #e8e0d4",
          background: "rgba(255,255,255,0.92)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2d6a4f",
          fontSize: "22px",
          fontWeight: 300,
          zIndex: 10,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.35s, right 0.35s",
        }}
        aria-label="Next"
      >
        ›
      </button>

      {/* Name + indicator — always visible */}
      <div style={{ textAlign: "center", marginTop: "4px" }}>
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "13px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#777",
            fontWeight: 400,
          }}
        >
          {mol.name}
        </div>
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "#aaa",
            marginTop: "6px",
            opacity: hovered ? 0.9 : 0.35,
            transition: "opacity 0.3s ease",
          }}
        >
          {index + 1} / {TOTAL}
        </div>
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "9px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#2d6a4f",
            marginTop: "6px",
            opacity: hovered ? 0.7 : 0,
            transform: hovered ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.3s ease, transform 0.3s ease",
          }}
        >
          View Details →
        </div>
      </div>
    </div>
  );
}
