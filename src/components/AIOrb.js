// src/components/AIOrb.js — v1.0
// Protea Botanicals — WP-Y
// Canvas-based AI orb. Replaces robot in CoPilot header.
// Props: active (bool) — idle shows water ripples, active shows spinning arc
// No dependencies. Pure Canvas2D.

import { useEffect, useRef } from "react";

const TAU = Math.PI * 2;

function drawTrack(ctx, cx, cy, r, sw) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = "#0c2845";
  ctx.lineWidth = sw;
  ctx.stroke();
}

function drawArc(ctx, cx, cy, r, sw, startAngle, arcLen, segments) {
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const fadeT = Math.max(0, (t - 0.25) / 0.75);
    const opacity = Math.pow(fadeT, 0.5);
    if (opacity < 0.005) continue;
    const a0 = startAngle + t * arcLen;
    const a1 = startAngle + ((i + 1) / segments) * arcLen;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.strokeStyle = `rgba(70,165,255,${opacity})`;
    ctx.lineWidth = sw;
    ctx.lineCap = "butt";
    ctx.stroke();
  }
}

function drawHead(ctx, cx, cy, r, angle, size) {
  const x = cx + Math.cos(angle) * r;
  const y = cy + Math.sin(angle) * r;
  const headR = size * 0.052;
  const g = ctx.createRadialGradient(x, y, 0, x, y, headR * 2.6);
  g.addColorStop(0, "rgba(220,242,255,1)");
  g.addColorStop(0.25, "rgba(140,210,255,0.9)");
  g.addColorStop(0.6, "rgba(60,150,240,0.4)");
  g.addColorStop(1, "rgba(20,90,200,0)");
  ctx.beginPath();
  ctx.arc(x, y, headR * 2.6, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, headR, 0, TAU);
  ctx.fillStyle = "rgba(225,245,255,0.98)";
  ctx.fill();
}

function drawIdleFrame(ctx, size, ripPhase) {
  const cx = size / 2,
    cy = size / 2;
  const r = size * 0.32,
    sw = size * 0.145;
  ctx.clearRect(0, 0, size, size);
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  bg.addColorStop(0, "#0c1a2e");
  bg.addColorStop(1, "#060c18");
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, TAU);
  ctx.fillStyle = bg;
  ctx.fill();
  drawTrack(ctx, cx, cy, r, sw);
  for (let i = 0; i < 3; i++) {
    const phase = (ripPhase + i / 3) % 1;
    const ripR = r + phase * (size * 0.14);
    const opacity = Math.sin(phase * Math.PI) * 0.4;
    if (opacity < 0.01) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, ripR, 0, TAU);
    ctx.strokeStyle = `rgba(25,95,195,${opacity})`;
    ctx.lineWidth = 1.2 * (1 - phase);
    ctx.stroke();
  }
}

function drawActiveFrame(ctx, size, angle) {
  const cx = size / 2,
    cy = size / 2;
  const r = size * 0.32,
    sw = size * 0.145;
  ctx.clearRect(0, 0, size, size);
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  bg.addColorStop(0, "#0c1a2e");
  bg.addColorStop(1, "#060c18");
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, TAU);
  ctx.fillStyle = bg;
  ctx.fill();
  drawTrack(ctx, cx, cy, r, sw);
  drawArc(ctx, cx, cy, r, sw, angle - TAU, TAU, 80);
  drawHead(ctx, cx, cy, r, angle, size);
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

    // HiDPI — crisp on retina screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const loop = () => {
      const s = stateRef.current;
      s.angle = (s.angle + 0.035) % TAU;
      s.ripPhase = (s.ripPhase + 0.004) % 1;
      if (s.active) {
        drawActiveFrame(ctx, size, s.angle);
      } else {
        drawIdleFrame(ctx, size, s.ripPhase);
      }
      s.raf = requestAnimationFrame(loop);
    };

    loop();
    const state = stateRef.current;
    return () => cancelAnimationFrame(state.raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: "50%", display: "block", flexShrink: 0 }}
    />
  );
}
