// LottieCharacter.js v1.1 — Lottie-based AI character wrapper
// v1.0  2026-03-01  Created — Lottie integration with state-aware styling
// v1.1  2026-03-01  Moved up from corner (bottom:80px), removed bubble,
//                   added smooth scale-out transition when opening panel

import React, { useRef, useEffect, useState } from "react";
import Lottie from "lottie-react";
import chatbotIdle from "../assets/lottie/chatbot-idle.json";

export default function LottieCharacter({
  isOpen,
  isThinking,
  onClick,
  size = 70,
}) {
  const lottieRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Pulse animation for thinking glow
  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => setPulsePhase((p) => (p + 1) % 360), 40);
    return () => clearInterval(interval);
  }, [isThinking]);

  // Control playback speed based on state
  useEffect(() => {
    if (!lottieRef.current) return;
    if (isThinking) {
      lottieRef.current.setSpeed(1.8);
    } else if (isHovered) {
      lottieRef.current.setSpeed(1.3);
    } else {
      lottieRef.current.setSpeed(1);
    }
  }, [isThinking, isHovered]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        bottom: 80,
        right: 28,
        width: size,
        height: size,
        cursor: "pointer",
        zIndex: 9998,
        borderRadius: "0",
        overflow: "visible",
        background: "transparent",
        boxShadow: "none",
        transition:
          "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
        transform: isOpen
          ? "scale(0) translateY(-40px)"
          : isHovered
            ? "scale(1.15)"
            : "scale(1)",
        opacity: isOpen ? 0 : 1,
        pointerEvents: isOpen ? "none" : "auto",
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={chatbotIdle}
        loop={true}
        autoplay={true}
        style={{
          width: size + 16,
          height: size + 16,
          marginTop: -4,
          marginLeft: -8,
        }}
      />

      {/* Thinking dots below character */}
      {isThinking && !isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#00d4ff",
                animation: `lottie-dot-pulse 1s ease-in-out infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes lottie-dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
