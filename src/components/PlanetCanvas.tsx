import { useRef, useEffect } from 'react';
import type { WorldInfluence } from '../types';
import './PlanetCanvas.css';

interface PlanetCanvasProps {
  worldInfluence: WorldInfluence;
  seed: number;
}

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0xffffffff;
  };
}

export function PlanetCanvas({ worldInfluence: wi, seed }: PlanetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 520;
    const H = 520;
    const cx = W / 2;
    const cy = H / 2;
    const r = 220;

    const rng = seededRandom(seed);
    const terrainPatches: { x: number; y: number; radius: number; bias: number }[] = [];
    for (let i = 0; i < 90; i++) {
      terrainPatches.push({
        x: (rng() * 2 - 1) * r,
        y: (rng() * 2 - 1) * r,
        radius: 6 + rng() * 38,
        bias: rng(),
      });
    }

    const starPositions: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 200; i++) {
      starPositions.push({ x: rng() * W, y: rng() * H, r: rng() * 1.5 });
    }

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const draw = (t: number) => {
      const phase = t * 0.0003;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, W, H);

      for (const star of starPositions) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 + star.x);
        ctx.globalAlpha = twinkle * 0.8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      const waterLevel = clamp(Math.max(0, wi.water) / 32, 0, 1);
      const heatLevel = clamp(Math.max(0, wi.heat) / 32, 0, 1);
      const coldLevel = clamp(Math.max(0, wi.cold) / 32, 0, 1);
      const vegLevel = clamp(Math.max(0, wi.vegetation) / 32, 0, 1);
      const pollLevel = clamp(Math.max(0, wi.pollution) / 32, 0, 1);
      const civLevel = clamp(Math.max(0, wi.civilization) / 32, 0, 1);
      const magicLevel = clamp(Math.max(0, wi.magic) / 32, 0, 1);
      const lifeLevel = clamp(Math.max(0, wi.life) / 32, 0, 1);
      const atmosLevel = clamp(Math.max(0, wi.atmosphere) / 32, 0, 1);

      const development = clamp(
        waterLevel * 0.9 + vegLevel * 1.2 + lifeLevel + civLevel * 0.9 + atmosLevel * 0.6,
        0,
        1
      );

      // Start from a mostly bare rocky world and shift color with discovered influence.
      const baseR = Math.round(116 + heatLevel * 58 - waterLevel * 36 + pollLevel * 24);
      const baseG = Math.round(96 + vegLevel * 92 + waterLevel * 26 - pollLevel * 20);
      const baseB = Math.round(82 + waterLevel * 112 + coldLevel * 78 - heatLevel * 22);
      ctx.fillStyle = `rgb(${clamp(baseR, 0, 255)},${clamp(baseG, 0, 255)},${clamp(baseB, 0, 255)})`;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      const patchCount = Math.floor(4 + development * 42 + waterLevel * 8 + vegLevel * 10);
      for (let i = 0; i < patchCount; i++) {
        const patch = terrainPatches[i];
        const px = cx + patch.x * Math.cos(phase) - patch.y * Math.sin(phase);
        const py = cy + patch.x * Math.sin(phase) + patch.y * Math.cos(phase);

        let patchColor: string;
        const wetBias = waterLevel * 0.75;
        const greenBias = vegLevel * 0.95 + lifeLevel * 0.4;
        const dryBias = heatLevel * 0.6 + (1 - waterLevel) * 0.2;

        if (patch.bias < wetBias) {
          patchColor = `rgba(26, 94, ${Math.round(160 + waterLevel * 80)}, ${0.35 + waterLevel * 0.35})`;
        } else if (patch.bias < wetBias + greenBias) {
          patchColor = `rgba(24, ${Math.round(120 + lifeLevel * 70)}, 44, ${0.35 + vegLevel * 0.35})`;
        } else if (patch.bias < wetBias + greenBias + dryBias) {
          patchColor = `rgba(${Math.round(138 + heatLevel * 52)}, ${Math.round(110 - waterLevel * 20)}, 72, 0.35)`;
        } else {
          patchColor = 'rgba(96, 88, 80, 0.28)';
        }

        ctx.fillStyle = patchColor;
        ctx.beginPath();
        ctx.ellipse(px, py, patch.radius, patch.radius * 0.65, phase, 0, Math.PI * 2);
        ctx.fill();
      }

      if (coldLevel > 0.05) {
        const iceSize = coldLevel * 40;
        const iceAlpha = Math.min(0.9, coldLevel * 2);
        ctx.fillStyle = `rgba(220,240,255,${iceAlpha})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy - r + iceSize * 0.5, r * 0.8, iceSize, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, cy + r - iceSize * 0.5, r * 0.7, iceSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pollLevel > 0.05) {
        ctx.fillStyle = `rgba(66, 58, 44, ${pollLevel * 0.62})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      if (civLevel > 0.05) {
        const rng2 = seededRandom(seed + 42);
        const numCities = Math.floor(6 + civLevel * 36);
        for (let i = 0; i < numCities; i++) {
          const angle = rng2() * Math.PI * 2 + phase;
          const dist = rng2() * r * 0.8;
          const lx = cx + Math.cos(angle) * dist;
          const ly = cy + Math.sin(angle) * dist;
          ctx.fillStyle = `rgba(255,240,120,${0.4 + rng2() * 0.5})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 1 + rng2() * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      if (atmosLevel > 0.01 || pollLevel > 0.05) {
        const haloColor = pollLevel > 0.15
          ? `rgba(120,80,20,${Math.min(0.4, atmosLevel * 0.3 + pollLevel * 0.2)})`
          : `rgba(100,150,255,${Math.min(0.3, atmosLevel * 0.25)})`;
        const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, r + 15);
        grad.addColorStop(0, haloColor);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 15, 0, Math.PI * 2);
        ctx.fill();
      }

      if (magicLevel > 0.05) {
        const glowPulse = 0.5 + 0.5 * Math.sin(t * 0.002);
        const grad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r + 20);
        grad.addColorStop(0, `rgba(150,100,255,0)`);
        grad.addColorStop(0.8, `rgba(150,100,255,${magicLevel * 0.2 * glowPulse})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
        ctx.fill();
      }

      const rimGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.5, cx, cy, r);
      rimGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
      rimGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      rimGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = rimGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [wi, seed]);

  return (
    <div className="planet-container">
      <canvas ref={canvasRef} width={520} height={520} className="planet-canvas" />
      <div className="planet-label">Your World</div>
    </div>
  );
}
