// src/components/MoleculeCarousel.js v1.3
// v1.3: Uses onSelect(molId) callback instead of navigate.
//       Parent controls what happens on click (modal, nav, etc).
// v1.2: Single card, no dots.
// v1.1: Floating cards + flip.
import { useState, useEffect, useRef, useCallback } from "react";
import Delta9THCMolecule from "./Delta9THCMolecule";
import Delta8THCMolecule from "./Delta8THCMolecule";
import Delta10THCMolecule from "./Delta10THCMolecule";
import THCaMolecule from "./THCaMolecule";
import CBDMolecule from "./CBDMolecule";
import CBGMolecule from "./CBGMolecule";
import CBNMolecule from "./CBNMolecule";

const ITEMS = [
  {
    id: "d9-thc",
    name: "Δ9-THC",
    color: "#52b788",
    Component: Delta9THCMolecule,
  },
  {
    id: "d8-thc",
    name: "Δ8-THC",
    color: "#3B82F6",
    Component: Delta8THCMolecule,
  },
  { id: "thca", name: "THCa", color: "#EAB308", Component: THCaMolecule },
  { id: "cbd", name: "CBD", color: "#52b788", Component: CBDMolecule },
  { id: "cbn", name: "CBN", color: "#8B5CF6", Component: CBNMolecule },
  { id: "cbg", name: "CBG", color: "#F97316", Component: CBGMolecule },
  {
    id: "d10-thc",
    name: "Δ10-THC",
    color: "#EF4444",
    Component: Delta10THCMolecule,
  },
];

const TOTAL = ITEMS.length;
const AUTO_INTERVAL = 7000;

export default function MoleculeCarousel({ onSelect }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [flipDir, setFlipDir] = useState(1);
  const paused = useRef(false);

  const mol = ITEMS[index];
  const { Component } = mol;

  const advance = useCallback(
    (dir) => {
      if (phase !== "idle") return;
      setFlipDir(dir);
      setPhase("flip-out");
      setTimeout(() => {
        setIndex((prev) => (prev + dir + TOTAL) % TOTAL);
        setPhase("flip-in");
        setTimeout(() => setPhase("idle"), 600);
      }, 450);
    },
    [phase],
  );

  useEffect(() => {
    const tick = () => {
      if (!paused.current && phase === "idle") advance(1);
    };
    const id = setInterval(tick, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, [advance, phase]);

  const handleHover = () => {
    paused.current = true;
    setHovered(true);
  };
  const handleLeave = () => {
    paused.current = false;
    setHovered(false);
  };

  let animName = "mol-float";
  let animDur = "4s";
  let animTiming = "ease-in-out";
  let animFill = "none";
  let animIter = "infinite";

  if (phase === "flip-out") {
    animName = flipDir === 1 ? "mol-flip-out-fwd" : "mol-flip-out-back";
    animDur = "0.45s";
    animTiming = "ease-in";
    animFill = "forwards";
    animIter = "1";
  } else if (phase === "flip-in") {
    animName = flipDir === 1 ? "mol-flip-in-fwd" : "mol-flip-in-back";
    animDur = "0.6s";
    animTiming = "ease-out";
    animFill = "forwards";
    animIter = "1";
  }

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      <style>{`
        @keyframes mol-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes mol-flip-out-fwd {
          0% { transform: perspective(800px) rotateY(0deg) scale(1); opacity: 1; }
          35% { transform: perspective(800px) rotateY(0deg) scale(0.94) translateZ(-30px); opacity: 1; }
          100% { transform: perspective(800px) rotateY(85deg) scale(0.88); opacity: 0; }
        }
        @keyframes mol-flip-out-back {
          0% { transform: perspective(800px) rotateY(0deg) scale(1); opacity: 1; }
          35% { transform: perspective(800px) rotateY(0deg) scale(0.94) translateZ(-30px); opacity: 1; }
          100% { transform: perspective(800px) rotateY(-85deg) scale(0.88); opacity: 0; }
        }
        @keyframes mol-flip-in-fwd {
          0% { transform: perspective(800px) rotateY(-85deg) scale(0.88); opacity: 0; }
          50% { transform: perspective(800px) rotateY(-4deg) scale(1.01); opacity: 1; }
          75% { transform: perspective(800px) rotateY(2deg) scale(1); opacity: 1; }
          100% { transform: perspective(800px) rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes mol-flip-in-back {
          0% { transform: perspective(800px) rotateY(85deg) scale(0.88); opacity: 0; }
          50% { transform: perspective(800px) rotateY(4deg) scale(1.01); opacity: 1; }
          75% { transform: perspective(800px) rotateY(-2deg) scale(1); opacity: 1; }
          100% { transform: perspective(800px) rotateY(0deg) scale(1); opacity: 1; }
        }
        .mol-single-card {
          box-shadow: 0 8px 28px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.03);
          transition: box-shadow 0.35s ease, border-color 0.3s ease, transform 0.35s ease;
        }
        .mol-single-card:hover {
          box-shadow: 0 20px 48px rgba(0,0,0,0.10), 0 6px 16px rgba(0,0,0,0.05);
          transform: translateY(-8px) scale(1.03) !important;
        }
        .mol-arrow {
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .mol-arrow:hover {
          background: rgba(45,106,79,0.12) !important;
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(45,106,79,0.15);
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          width: "100%",
        }}
      >
        <button
          className="mol-arrow"
          onClick={() => advance(-1)}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "1px solid #e8e0d4",
            background: "rgba(255,255,255,0.9)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#2d6a4f",
            fontSize: "20px",
            fontWeight: 300,
          }}
          aria-label="Previous molecule"
        >
          ‹
        </button>

        <div
          key={`${mol.id}-${index}-${phase}`}
          className={phase === "idle" ? "mol-single-card" : ""}
          onMouseEnter={() => phase === "idle" && handleHover()}
          onMouseLeave={handleLeave}
          onClick={() => phase === "idle" && onSelect && onSelect(mol.id)}
          style={{
            width: "320px",
            maxWidth: "100%",
            background: "#fff",
            border: `1px solid ${hovered && phase === "idle" ? mol.color : "#e8e0d4"}`,
            borderRadius: "6px",
            padding: "24px 20px 20px",
            cursor: phase === "idle" ? "pointer" : "default",
            transformStyle: "preserve-3d",
            willChange: "transform, opacity",
            animation: `${animName} ${animDur} ${animTiming} 0s ${animIter} ${animFill}`,
            perspective: "800px",
            minHeight: "240px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ pointerEvents: "none", width: "100%" }}>
            <Component showControls={false} compact={true} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "14px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: mol.color,
                flexShrink: 0,
                boxShadow: `0 0 6px ${mol.color}44`,
              }}
            />
            <span
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "12px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: hovered && phase === "idle" ? 600 : 400,
                color: hovered && phase === "idle" ? mol.color : "#555",
                transition: "font-weight 0.2s, color 0.2s",
              }}
            >
              {mol.name}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              textAlign: "center",
              color: mol.color,
              marginTop: "8px",
              opacity: hovered && phase === "idle" ? 0.8 : 0,
              transform:
                hovered && phase === "idle"
                  ? "translateY(0)"
                  : "translateY(4px)",
              transition: "opacity 0.3s, transform 0.3s",
            }}
          >
            View Details →
          </div>
        </div>

        <button
          className="mol-arrow"
          onClick={() => advance(1)}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "1px solid #e8e0d4",
            background: "rgba(255,255,255,0.9)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#2d6a4f",
            fontSize: "20px",
            fontWeight: 300,
          }}
          aria-label="Next molecule"
        >
          ›
        </button>
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: "16px",
          fontFamily: "'Jost', sans-serif",
          fontSize: "10px",
          letterSpacing: "0.2em",
          color: "#bbb",
        }}
      >
        {index + 1} / {TOTAL}
      </div>
    </div>
  );
}
