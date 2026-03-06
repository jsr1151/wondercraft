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

    const W = 200;
    const H = 200;
    const cx = W / 2;
    const cy = H / 2;
    const r = 88;

    const rng = seededRandom(seed);
    const terrainPatches: { x: number; y: number; r: number; type: number }[] = [];
    for (let i = 0; i < 30; i++) {
      terrainPatches.push({
        x: (rng() * 2 - 1) * r,
        y: (rng() * 2 - 1) * r,
        r: 10 + rng() * 30,
        type: rng(),
      });
    }
    const starPositions: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 80; i++) {
      starPositions.push({ x: rng() * W, y: rng() * H, r: rng() * 1.5 });
    }

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

      const waterLevel = Math.max(0, wi.water) / 30;
      const heatLevel = Math.max(0, wi.heat) / 30;
      const coldLevel = Math.max(0, wi.cold) / 30;
      const vegLevel = Math.max(0, wi.vegetation) / 30;
      const pollLevel = Math.max(0, wi.pollution) / 30;
      const civLevel = Math.max(0, wi.civilization) / 30;
      const magicLevel = Math.max(0, wi.magic) / 30;
      const lifeLevel = Math.max(0, wi.life) / 30;

      const baseR = Math.round(139 - waterLevel * 80 + heatLevel * 60);
      const baseG = Math.round(100 + waterLevel * 30 + vegLevel * 50);
      const baseB = Math.round(80 + waterLevel * 120 + coldLevel * 80);
      ctx.fillStyle = `rgb(${Math.min(255,Math.max(0,baseR))},${Math.min(255,Math.max(0,baseG))},${Math.min(255,Math.max(0,baseB))})`;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      for (const patch of terrainPatches) {
        const px = cx + patch.x * Math.cos(phase) - patch.y * Math.sin(phase);
        const py = cy + patch.x * Math.sin(phase) + patch.y * Math.cos(phase);

        let patchColor: string;
        if (patch.type < 0.3 + vegLevel * 0.4) {
          const g = Math.round(100 + lifeLevel * 80);
          patchColor = `rgba(30,${Math.min(255,g)},40,0.7)`;
        } else if (patch.type < 0.5 + waterLevel * 0.3) {
          patchColor = `rgba(20,80,${Math.round(160 + waterLevel * 60)},0.8)`;
        } else if (patch.type < 0.7) {
          const lR = Math.round(120 + heatLevel * 60);
          const lG = Math.round(90 + vegLevel * 30);
          patchColor = `rgba(${Math.min(255,lR)},${Math.min(255,lG)},60,0.7)`;
        } else {
          patchColor = `rgba(100,90,80,0.6)`;
        }

        ctx.fillStyle = patchColor;
        ctx.beginPath();
        ctx.ellipse(px, py, patch.r, patch.r * 0.7, phase, 0, Math.PI * 2);
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
        ctx.fillStyle = `rgba(60,50,20,${pollLevel * 0.6})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      if (civLevel > 0.05) {
        const rng2 = seededRandom(seed + 42);
        const numCities = Math.floor(civLevel * 20);
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

      const atmosLevel = Math.max(0, wi.atmosphere) / 30;
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
      <canvas ref={canvasRef} width={200} height={200} className="planet-canvas" />
      <div className="planet-label">Your World</div>
    </div>
  );
}
