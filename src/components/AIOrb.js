// src/components/AIOrb.js — v2.1
// Protea Botanicals — WP-Y
// Pure transparent canvas. No background. No track.
// Bright blue glowing arc fading to nothing. Smaller tight head.

import { useEffect, useRef } from "react";

const TAU = Math.PI * 2;

function drawArc(ctx, cx, cy, r, sw, angle, segments) {
  const arcLen = TAU * 0.75;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const fadeT = Math.max(0, (t - 0.3) / 0.7);
    const opacity = Math.pow(fadeT, 0.45);
    if (opacity < 0.004) continue;
    const a0 = angle - arcLen + t * arcLen;
    const a1 = angle - arcLen + ((i + 1) / segments) * arcLen;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.strokeStyle = `rgba(55,160,255,${opacity})`;
    ctx.lineWidth = sw;
    ctx.lineCap = "butt";
    ctx.stroke();
  }
}

function drawGlow(ctx, cx, cy, r, sw, angle) {
  const x = cx + Math.cos(angle) * r;
  const y = cy + Math.sin(angle) * r;
  const g = ctx.createRadialGradient(x, y, 0, x, y, sw * 1.8);
  g.addColorStop(0, "rgba(120,200,255,0.9)");
  g.addColorStop(0.35, "rgba(55,160,255,0.45)");
  g.addColorStop(1, "rgba(0,60,180,0)");
  ctx.beginPath();
  ctx.arc(x, y, sw * 1.8, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, sw * 0.35, 0, TAU);
  ctx.fillStyle = "rgba(220,245,255,0.98)";
  ctx.fill();
}

function drawRipple(ctx, cx, cy, r, phase) {
  for (let i = 0; i < 3; i++) {
    const p = (phase + i / 3) % 1;
    const ripR = r + p * r * 0.55;
    const opacity = Math.sin(p * Math.PI) * 0.35;
    if (opacity < 0.01) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, ripR, 0, TAU);
    ctx.strokeStyle = `rgba(55,160,255,${opacity})`;
    ctx.lineWidth = 1.0 * (1 - p);
    ctx.stroke();
  }
}

export default function AIOrb({ active = false, size = 36 }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ angle: 0, ripPhase: 0, raf: null, active });

  useEffect(() => {
    stateRef.current.active = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.36;
    const sw = size * 0.09;
    const loop = () => {
      const s = stateRef.current;
      s.angle = (s.angle + 0.038) % TAU;
      s.ripPhase = (s.ripPhase + 0.004) % 1;
      ctx.clearRect(0, 0, size, size);
      if (s.active) {
        drawArc(ctx, cx, cy, r, sw, s.angle, 72);
        drawGlow(ctx, cx, cy, r, sw, s.angle);
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.strokeStyle = "rgba(55,140,240,0.18)";
        ctx.lineWidth = sw;
        ctx.stroke();
        drawRipple(ctx, cx, cy, r, s.ripPhase);
      }
      s.raf = requestAnimationFrame(loop);
    };
    loop();
    const state = stateRef.current;
    return () => cancelAnimationFrame(state.raf);
  }, [size]);

  return <canvas ref={canvasRef} style={{ display: "block", flexShrink: 0 }} />;
}
