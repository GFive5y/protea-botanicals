// src/components/AnimatedAICharacter.js v1.1
// Protea Botanicals — Animated AI Assistant Character (WP-002)
// Pure CSS + inline SVG — ZERO new dependencies
//
// v1.0: Initial abstract botanical (too subtle)
// v1.1: REDESIGN — Cute botanical creature with personality
//        Rounded seed-body, big expressive eyes, leaf sprouts,
//        twig arms, visible smile. Much more characterful.
//
// States: idle → sleep (30s timeout) → hover → active → thinking
// Props: isOpen, isThinking, onClick, size
// Design: Cute botanical creature (Protea plant buddy)

import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Brand colours (from tokens.js) ──────────────────────────────────────────
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  white: "#fff",
  border: "#e0dbd2",
  bark: "#8B6F47",
  barkDark: "#6B5535",
  leafLight: "#7dcea0",
  leafDark: "#2d6a4f",
  eyeWhite: "#f0efe8",
  cheek: "rgba(181, 147, 90, 0.25)",
};

// ── State constants ─────────────────────────────────────────────────────────
const STATES = {
  IDLE: "idle",
  SLEEP: "sleep",
  HOVER: "hover",
  ACTIVE: "active",
  THINKING: "thinking",
};

const SLEEP_TIMEOUT = 30000;

// ── CSS Keyframes ───────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes protea-idle-bob {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
}

@keyframes protea-sleep-bob {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(1px) scale(0.98); }
}

@keyframes protea-hover-perk {
  0% { transform: translateY(0) scale(1); }
  40% { transform: translateY(-6px) scale(1.06); }
  100% { transform: translateY(-2px) scale(1.03); }
}

@keyframes protea-active-bounce {
  0%, 100% { transform: translateY(0px); }
  25% { transform: translateY(-2px); }
  75% { transform: translateY(1px); }
}

@keyframes protea-think-sway {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-2px) rotate(-2deg); }
  75% { transform: translateX(2px) rotate(2deg); }
}

@keyframes protea-glow-pulse {
  0%, 100% { box-shadow: 0 4px 15px rgba(27,67,50,0.3); }
  50% { box-shadow: 0 4px 25px rgba(82,183,136,0.4), 0 0 15px rgba(82,183,136,0.2); }
}

@keyframes protea-zzz-float {
  0% { opacity: 0; transform: translate(0, 0) scale(0.6) rotate(0deg); }
  15% { opacity: 0.6; }
  100% { opacity: 0; transform: translate(12px, -28px) scale(1) rotate(15deg); }
}

@keyframes protea-leaf-sway {
  0%, 100% { transform: rotate(var(--leaf-base, 0deg)); }
  50% { transform: rotate(calc(var(--leaf-base, 0deg) + 8deg)); }
}

@keyframes protea-leaf-perk {
  0% { transform: rotate(var(--leaf-base, 0deg)) scale(1); }
  50% { transform: rotate(calc(var(--leaf-base, 0deg) - 10deg)) scale(1.15); }
  100% { transform: rotate(calc(var(--leaf-base, 0deg) - 5deg)) scale(1.08); }
}

@keyframes protea-arm-wave {
  0%, 100% { transform: rotate(var(--arm-base, 0deg)); }
  25% { transform: rotate(calc(var(--arm-base, 0deg) - 15deg)); }
  75% { transform: rotate(calc(var(--arm-base, 0deg) + 10deg)); }
}

@keyframes protea-arm-rest {
  0%, 100% { transform: rotate(var(--arm-base, 0deg)); }
  50% { transform: rotate(calc(var(--arm-base, 0deg) + 3deg)); }
}

@keyframes protea-think-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1); }
}

@keyframes protea-eye-blink {
  0%, 42%, 46%, 100% { transform: scaleY(1); }
  44% { transform: scaleY(0.1); }
}

@keyframes protea-eye-look {
  0%, 100% { transform: translateX(0); }
  30% { transform: translateX(1.5px); }
  70% { transform: translateX(-1.5px); }
}

@keyframes protea-entrance {
  0% { opacity: 0; transform: scale(0.2) translateY(30px) rotate(-15deg); }
  60% { opacity: 1; transform: scale(1.1) translateY(-4px) rotate(3deg); }
  80% { transform: scale(0.95) translateY(1px) rotate(-1deg); }
  100% { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); }
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// SVG CHARACTER — Cute Botanical Creature
// ═══════════════════════════════════════════════════════════════════════════
function PlantBuddySVG({ state, size }) {
  const isAsleep = state === STATES.SLEEP;
  const isActive = state === STATES.ACTIVE;
  const isThinking = state === STATES.THINKING;
  const isHover = state === STATES.HOVER;
  const isAwake = isActive || isThinking || isHover;

  // Viewbox is 80x90 — character is taller than wide
  const vw = 80;
  const vh = 90;

  return (
    <svg
      width={size * 1.0}
      height={size * 1.125}
      viewBox={`0 0 ${vw} ${vh}`}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        {/* Body gradient — warm bark/wood tone */}
        <radialGradient id="pb-body" cx="45%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#a08060" />
          <stop offset="50%" stopColor={C.bark} />
          <stop offset="100%" stopColor={C.barkDark} />
        </radialGradient>

        {/* Leaf gradient */}
        <linearGradient id="pb-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.leafLight} />
          <stop offset="100%" stopColor={C.leafDark} />
        </linearGradient>

        {/* Leaf 2 — slightly different shade */}
        <linearGradient id="pb-leaf2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={C.accent} />
          <stop offset="100%" stopColor="#3a8f5f" />
        </linearGradient>

        {/* Inner body texture highlight */}
        <radialGradient id="pb-highlight" cx="40%" cy="30%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* ── LEAF SPROUTS (top of head) ── */}
      {/* Main centre leaf */}
      <g
        style={{
          transformOrigin: "40px 22px",
          "--leaf-base": "-5deg",
          animation: isAsleep
            ? "protea-leaf-sway 4s ease-in-out infinite"
            : isHover
              ? "protea-leaf-perk 0.5s ease-out forwards"
              : "protea-leaf-sway 6s ease-in-out infinite",
        }}
      >
        <path
          d="M40 22 Q38 8 42 2 Q46 8 44 22 Z"
          fill="url(#pb-leaf)"
          opacity={isAsleep ? 0.7 : 1}
          style={{ transition: "opacity 0.6s ease" }}
        />
        {/* Leaf vein */}
        <line
          x1="41.5"
          y1="6"
          x2="41.5"
          y2="20"
          stroke={C.mid}
          strokeWidth="0.5"
          opacity="0.4"
        />
      </g>

      {/* Left small leaf */}
      <g
        style={{
          transformOrigin: "33px 24px",
          "--leaf-base": "-25deg",
          animation: isAsleep
            ? "protea-leaf-sway 3.5s ease-in-out 0.3s infinite"
            : isHover
              ? "protea-leaf-perk 0.5s ease-out 0.1s forwards"
              : "protea-leaf-sway 5s ease-in-out 0.8s infinite",
        }}
      >
        <path
          d="M33 24 Q26 16 24 10 Q30 14 35 22 Z"
          fill="url(#pb-leaf2)"
          opacity={isAsleep ? 0.5 : 0.85}
          style={{ transition: "opacity 0.6s ease" }}
        />
      </g>

      {/* Right small leaf */}
      <g
        style={{
          transformOrigin: "49px 24px",
          "--leaf-base": "25deg",
          animation: isAsleep
            ? "protea-leaf-sway 3.8s ease-in-out 0.6s infinite"
            : isHover
              ? "protea-leaf-perk 0.5s ease-out 0.15s forwards"
              : "protea-leaf-sway 5.5s ease-in-out 1.2s infinite",
        }}
      >
        <path
          d="M49 24 Q56 16 58 10 Q52 14 47 22 Z"
          fill="url(#pb-leaf)"
          opacity={isAsleep ? 0.5 : 0.85}
          style={{ transition: "opacity 0.6s ease" }}
        />
      </g>

      {/* ── LEFT ARM (twig) ── */}
      <g
        style={{
          transformOrigin: "22px 52px",
          "--arm-base": "20deg",
          animation: isActive
            ? "protea-arm-wave 1.5s ease-in-out 1"
            : isThinking
              ? "protea-arm-rest 3s ease-in-out infinite"
              : "protea-arm-rest 5s ease-in-out infinite",
        }}
      >
        <path
          d="M22 52 Q14 46 10 42"
          fill="none"
          stroke={C.bark}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Tiny leaf on arm */}
        <path
          d="M12 43 Q9 39 11 37 Q13 39 12 43 Z"
          fill={C.accent}
          opacity={isAsleep ? 0.4 : 0.7}
        />
      </g>

      {/* ── RIGHT ARM (twig) ── */}
      <g
        style={{
          transformOrigin: "60px 52px",
          "--arm-base": "-20deg",
          animation: isActive
            ? "protea-arm-wave 1.5s ease-in-out 0.2s 1"
            : isHover
              ? "protea-arm-wave 0.8s ease-out 1"
              : "protea-arm-rest 5s ease-in-out 1s infinite",
        }}
      >
        <path
          d="M60 52 Q68 46 72 42"
          fill="none"
          stroke={C.bark}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Tiny leaf on arm */}
        <path
          d="M70 43 Q73 39 71 37 Q69 39 70 43 Z"
          fill={C.accent}
          opacity={isAsleep ? 0.4 : 0.7}
        />
      </g>

      {/* ── BODY (rounded seed/bulb shape) ── */}
      <ellipse
        cx="41"
        cy="52"
        rx="20"
        ry="26"
        fill="url(#pb-body)"
        stroke={isAwake ? "rgba(82,183,136,0.3)" : "rgba(139,111,71,0.3)"}
        strokeWidth="0.8"
        style={{ transition: "stroke 0.4s ease" }}
      />

      {/* Body highlight */}
      <ellipse cx="41" cy="52" rx="18" ry="24" fill="url(#pb-highlight)" />

      {/* Subtle bark texture lines */}
      <path
        d="M34 38 Q37 42 34 48"
        fill="none"
        stroke={C.barkDark}
        strokeWidth="0.5"
        opacity="0.2"
      />
      <path
        d="M48 40 Q46 46 49 52"
        fill="none"
        stroke={C.barkDark}
        strokeWidth="0.5"
        opacity="0.15"
      />

      {/* ── FEET (small rounded bumps) ── */}
      <ellipse
        cx="33"
        cy="76"
        rx="6"
        ry="3.5"
        fill={C.barkDark}
        opacity="0.7"
      />
      <ellipse
        cx="49"
        cy="76"
        rx="6"
        ry="3.5"
        fill={C.barkDark}
        opacity="0.7"
      />

      {/* ── EYES ── */}
      {isAsleep ? (
        /* Sleeping — closed eye arcs */
        <g>
          <path
            d="M31 48 Q35 51 39 48"
            fill="none"
            stroke={C.cream}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M43 48 Q47 51 51 48"
            fill="none"
            stroke={C.cream}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      ) : (
        /* Awake — big round eyes */
        <g
          style={{
            animation: !isThinking
              ? "protea-eye-blink 4s ease-in-out infinite"
              : "none",
            transformOrigin: "41px 47px",
          }}
        >
          {/* Left eye white */}
          <ellipse
            cx="34"
            cy="47"
            rx={isHover ? 6 : 5.5}
            ry={isHover ? 6.5 : 6}
            fill={C.eyeWhite}
            stroke="rgba(107,85,53,0.2)"
            strokeWidth="0.5"
            style={{ transition: "rx 0.2s, ry 0.2s" }}
          />
          {/* Left pupil */}
          <g
            style={{
              animation: isThinking
                ? "protea-eye-look 2s ease-in-out infinite"
                : "none",
            }}
          >
            <circle
              cx="35"
              cy={isHover ? 46 : 47}
              r="3"
              fill={C.green}
              style={{ transition: "cy 0.2s" }}
            />
            {/* Pupil highlight */}
            <circle
              cx="36.2"
              cy={isHover ? 45 : 46}
              r="1"
              fill="white"
              opacity="0.8"
            />
            <circle
              cx="34"
              cy={isHover ? 44.5 : 45.5}
              r="0.5"
              fill="white"
              opacity="0.5"
            />
          </g>

          {/* Right eye white */}
          <ellipse
            cx="48"
            cy="47"
            rx={isHover ? 6 : 5.5}
            ry={isHover ? 6.5 : 6}
            fill={C.eyeWhite}
            stroke="rgba(107,85,53,0.2)"
            strokeWidth="0.5"
            style={{ transition: "rx 0.2s, ry 0.2s" }}
          />
          {/* Right pupil */}
          <g
            style={{
              animation: isThinking
                ? "protea-eye-look 2s ease-in-out infinite"
                : "none",
            }}
          >
            <circle
              cx="49"
              cy={isHover ? 46 : 47}
              r="3"
              fill={C.green}
              style={{ transition: "cy 0.2s" }}
            />
            <circle
              cx="50.2"
              cy={isHover ? 45 : 46}
              r="1"
              fill="white"
              opacity="0.8"
            />
            <circle
              cx="48"
              cy={isHover ? 44.5 : 45.5}
              r="0.5"
              fill="white"
              opacity="0.5"
            />
          </g>
        </g>
      )}

      {/* ── CHEEKS (warm blush — visible when happy) ── */}
      {(isActive || isHover) && !isThinking && (
        <>
          <ellipse
            cx="27"
            cy="53"
            rx="4"
            ry="2.5"
            fill={C.cheek}
            opacity="0.6"
          />
          <ellipse
            cx="55"
            cy="53"
            rx="4"
            ry="2.5"
            fill={C.cheek}
            opacity="0.6"
          />
        </>
      )}

      {/* ── MOUTH ── */}
      {isAsleep ? (
        /* Sleeping — tiny peaceful line */
        <line
          x1="38"
          y1="57"
          x2="44"
          y2="57"
          stroke={C.cream}
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.4"
        />
      ) : isThinking ? (
        /* Thinking — small "o" */
        <ellipse
          cx="41"
          cy="57"
          rx="2"
          ry="2.5"
          fill="none"
          stroke={C.cream}
          strokeWidth="1.2"
          opacity="0.6"
        />
      ) : isActive || isHover ? (
        /* Happy — big smile */
        <path
          d="M35 55 Q41 62 47 55"
          fill="none"
          stroke={C.cream}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.8"
        />
      ) : (
        /* Idle — gentle smile */
        <path
          d="M37 56 Q41 59 45 56"
          fill="none"
          stroke={C.cream}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.5"
        />
      )}

      {/* ── SLEEP Zzz ── */}
      {isAsleep && (
        <g>
          {[0, 1, 2].map((i) => (
            <text
              key={i}
              x={56 + i * 2}
              y={38 - i * 4}
              fontSize={8 - i}
              fontFamily="'Jost', sans-serif"
              fontWeight="600"
              fill={C.accent}
              style={{
                animation: `protea-zzz-float 2.8s ease-out ${i * 0.9}s infinite`,
              }}
            >
              z
            </text>
          ))}
        </g>
      )}

      {/* ── THINKING: dots above head ── */}
      {isThinking && (
        <g>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={34 + i * 7}
              cy="14"
              r="2.5"
              fill={C.accent}
              style={{
                animation: `protea-think-dot 1.2s ease-in-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </g>
      )}

      {/* ── ACTIVE: small sparkle near face ── */}
      {isActive && !isThinking && (
        <g opacity="0.5">
          <line
            x1="60"
            y1="36"
            x2="63"
            y2="33"
            stroke={C.gold}
            strokeWidth="1"
            strokeLinecap="round"
          />
          <line
            x1="63"
            y1="36"
            x2="60"
            y2="33"
            stroke={C.gold}
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────────────
function Tooltip({ text, visible }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        right: "0",
        background: C.green,
        color: C.cream,
        padding: "6px 12px",
        borderRadius: "2px",
        fontFamily: "'Jost', sans-serif",
        fontSize: "10px",
        fontWeight: "600",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
        pointerEvents: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {text}
      <div
        style={{
          position: "absolute",
          bottom: "-4px",
          right: "18px",
          width: "8px",
          height: "8px",
          background: C.green,
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — AnimatedAICharacter
// ═══════════════════════════════════════════════════════════════════════════
export default function AnimatedAICharacter({
  isOpen = false,
  isThinking = false,
  onClick = () => {},
  size = 56,
}) {
  const [state, setState] = useState(STATES.IDLE);
  const [showTooltip, setShowTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sleepTimerRef = useRef(null);
  const prevOpenRef = useRef(isOpen);

  // ── Inject keyframes once ───────────────────────────────────────────────
  useEffect(() => {
    const id = "protea-ai-character-keyframes";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
    setTimeout(() => setMounted(true), 50);
  }, []);

  // ── Reset sleep timer ───────────────────────────────────────────────────
  const resetSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev === STATES.IDLE) return STATES.SLEEP;
        return prev;
      });
    }, SLEEP_TIMEOUT);
  }, []);

  // ── Sync with isOpen prop ───────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setState(isThinking ? STATES.THINKING : STATES.ACTIVE);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    } else {
      if (prevOpenRef.current && !isOpen) {
        setState(STATES.IDLE);
        resetSleepTimer();
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, isThinking, resetSleepTimer]);

  // ── Sync with isThinking prop ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setState(isThinking ? STATES.THINKING : STATES.ACTIVE);
    }
  }, [isThinking, isOpen]);

  // ── Start sleep timer on mount ──────────────────────────────────────────
  useEffect(() => {
    resetSleepTimer();
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [resetSleepTimer]);

  // ── Mouse handlers ──────────────────────────────────────────────────────
  const handleMouseEnter = () => {
    if (!isOpen) {
      setState(STATES.HOVER);
      setShowTooltip(true);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (!isOpen) {
      setState(STATES.IDLE);
      setShowTooltip(false);
      resetSleepTimer();
    }
  };

  const handleClick = () => {
    setShowTooltip(false);
    onClick();
  };

  // ── Container animation per state ───────────────────────────────────────
  const getAnimation = () => {
    switch (state) {
      case STATES.SLEEP:
        return "protea-sleep-bob 4s ease-in-out infinite";
      case STATES.HOVER:
        return "protea-hover-perk 0.4s ease-out forwards";
      case STATES.ACTIVE:
        return "protea-active-bounce 2s ease-in-out infinite";
      case STATES.THINKING:
        return "protea-think-sway 2s ease-in-out infinite";
      default:
        return "protea-idle-bob 4s ease-in-out infinite";
    }
  };

  const getTooltipText = () => {
    switch (state) {
      case STATES.SLEEP:
        return "Wake me up!";
      case STATES.HOVER:
        return "Chat with me";
      default:
        return "Ask me anything";
    }
  };

  // Character is slightly taller than wide — give adequate hit area
  const hitSize = size * 1.3;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 10001,
        animation: mounted ? "protea-entrance 0.7s ease-out forwards" : "none",
        opacity: mounted ? undefined : 0,
      }}
    >
      <Tooltip text={getTooltipText()} visible={showTooltip && !isOpen} />

      <button
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        style={{
          width: `${hitSize}px`,
          height: `${hitSize}px`,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          animation: getAnimation(),
          outline: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* Soft circular glow behind character */}
        <div
          style={{
            position: "absolute",
            width: `${size * 0.85}px`,
            height: `${size * 0.85}px`,
            borderRadius: "50%",
            background:
              state === STATES.ACTIVE || state === STATES.THINKING
                ? "radial-gradient(circle, rgba(82,183,136,0.15) 0%, transparent 70%)"
                : state === STATES.HOVER
                  ? "radial-gradient(circle, rgba(82,183,136,0.1) 0%, transparent 70%)"
                  : "none",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -45%)",
            transition: "background 0.4s ease",
            pointerEvents: "none",
            animation:
              state === STATES.ACTIVE || state === STATES.THINKING
                ? "protea-glow-pulse 2.5s ease-in-out infinite"
                : "none",
          }}
        />

        {/* The character SVG */}
        <PlantBuddySVG state={state} size={size} />
      </button>
    </div>
  );
}
