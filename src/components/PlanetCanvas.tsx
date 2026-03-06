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

  const toLevel = (value: number) => Math.max(0, Math.min(1, value / 32));
  const waterLevel = toLevel(wi.water);
  const vegetationLevel = toLevel(wi.vegetation);
  const lifeLevel = toLevel(wi.life);
  const civilizationLevel = toLevel(wi.civilization);
  const pollutionLevel = toLevel(wi.pollution);

  const worldStage = (() => {
    if (pollutionLevel > 0.62) return 'Smog Choked';
    if (civilizationLevel > 0.58) return 'Industrial Age';
    if (lifeLevel > 0.52 && vegetationLevel > 0.45) return 'Living World';
    if (waterLevel > 0.42 || vegetationLevel > 0.32) return 'Awakening Biosphere';
    return 'Barren Frontier';
  })();

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
      const baseR = Math.round(118 + heatLevel * 76 - waterLevel * 52 + pollLevel * 36);
      const baseG = Math.round(88 + vegLevel * 122 + waterLevel * 32 - pollLevel * 28);
      const baseB = Math.round(74 + waterLevel * 144 + coldLevel * 92 - heatLevel * 28);
      ctx.fillStyle = `rgb(${clamp(baseR, 0, 255)},${clamp(baseG, 0, 255)},${clamp(baseB, 0, 255)})`;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      const patchCount = Math.floor(2 + development * 72 + waterLevel * 16 + vegLevel * 16);
      for (let i = 0; i < patchCount; i++) {
        const patch = terrainPatches[i];
        const px = cx + patch.x * Math.cos(phase) - patch.y * Math.sin(phase);
        const py = cy + patch.x * Math.sin(phase) + patch.y * Math.cos(phase);

        let patchColor: string;
        const wetBias = waterLevel * 0.75;
        const greenBias = vegLevel * 0.95 + lifeLevel * 0.4;
        const dryBias = heatLevel * 0.6 + (1 - waterLevel) * 0.2;

        if (patch.bias < wetBias) {
          patchColor = `rgba(24, 98, ${Math.round(166 + waterLevel * 82)}, ${0.4 + waterLevel * 0.38})`;
        } else if (patch.bias < wetBias + greenBias) {
          patchColor = `rgba(18, ${Math.round(122 + lifeLevel * 86)}, 42, ${0.42 + vegLevel * 0.35})`;
        } else if (patch.bias < wetBias + greenBias + dryBias) {
          patchColor = `rgba(${Math.round(146 + heatLevel * 58)}, ${Math.round(108 - waterLevel * 22)}, 68, 0.38)`;
        } else {
          patchColor = 'rgba(98, 90, 82, 0.32)';
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

      if (development < 0.18) {
        const dustAlpha = 0.22 - development * 0.7;
        ctx.fillStyle = `rgba(148, 120, 88, ${Math.max(0, dustAlpha)})`;
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
      <div className="planet-label">Your World: {worldStage}</div>
      <div className="planet-metrics" aria-label="World influence levels">
        <span>Water {wi.water}</span>
        <span>Life {wi.life}</span>
        <span>Green {wi.vegetation}</span>
        <span>Civ {wi.civilization}</span>
        <span>Pollution {wi.pollution}</span>
      </div>
    </div>
  );
}
