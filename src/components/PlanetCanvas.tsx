import { useEffect, useRef } from 'react';
import type { WorldInfluence } from '../types';
import './PlanetCanvas.css';

interface PlanetCanvasProps {
  worldInfluence: WorldInfluence;
  seed: number;
  discoveredElements?: Set<string>;
}

interface SurfacePoint {
  x: number;
  y: number;
  z: number;
  alpha: number;
  scale: number;
  visible: boolean;
}

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toLevel(value: number) {
  return clamp(value / 32, 0, 1);
}

function projectToSphere(
  cx: number,
  cy: number,
  radius: number,
  longitude: number,
  latitude: number,
  phase: number,
  yScale = 0.9,
): SurfacePoint {
  const lon = longitude + phase;
  const lat = clamp(latitude, -1.25, 1.25);
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);

  // z is positive on the front hemisphere.
  const z = Math.cos(lon) * cosLat;
  const x = cx + Math.sin(lon) * cosLat * radius;
  const y = cy + sinLat * radius * yScale;
  const visible = z > -0.06;
  const alpha = clamp((z + 0.06) / 1.06, 0, 1);
  const scale = 0.45 + 0.55 * clamp((z + 1) / 2, 0, 1);

  return { x, y, z, alpha, scale, visible };
}

function drawPatch(ctx: CanvasRenderingContext2D, p: SurfacePoint, rx: number, ry: number, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx * p.scale, ry * p.scale, rotation, 0, Math.PI * 2);
  ctx.fill();
}

export function PlanetCanvas({ worldInfluence: wi, seed, discoveredElements }: PlanetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const wiRef = useRef(wi);
  const discoveredRef = useRef(discoveredElements);
  wiRef.current = wi;
  discoveredRef.current = discoveredElements;

  const waterLevel = toLevel(wi.water);
  const vegetationLevel = toLevel(wi.vegetation);
  const lifeLevel = toLevel(wi.life);
  const civilizationLevel = toLevel(wi.civilization);
  const pollutionLevel = toLevel(wi.pollution);
  const brightnessLevel = toLevel(wi.brightness);
  const earthyLevel = toLevel(wi.earthy);
  const airLevel = toLevel(wi.air);

  const worldStage = (() => {
    if (brightnessLevel < 0.1) return 'Lightless Rock';
    if (pollutionLevel > 0.62) return 'Smog Choked';
    if (earthyLevel > 0.5 && lifeLevel < 0.2) return 'Rugged Frontier';
    if (airLevel > 0.55 && toLevel(wi.atmosphere) > 0.3) return 'Wind-Swept World';
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
    const r = 212;

    const rng = seededRandom(seed);

    const stars = Array.from({ length: 140 }, () => ({
      x: rng() * W,
      y: rng() * H,
      radius: 0.3 + rng() * 1.3,
      twinkle: rng() * Math.PI * 2,
    }));

    const continents = Array.from({ length: 12 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.8,
      rx: 22 + rng() * 58,
      ry: 14 + rng() * 42,
      rot: (rng() - 0.5) * 1.6,
    }));

    const clouds = Array.from({ length: 26 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.4,
      rx: 20 + rng() * 52,
      ry: 8 + rng() * 20,
      drift: 0.4 + rng() * 0.8,
    }));

    const cityPoints = Array.from({ length: 36 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.2,
      strength: 0.5 + rng() * 0.9,
    }));

    const forests = Array.from({ length: 28 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.7,
      size: 0.5 + rng() * 1.2,
    }));

    const has = (id: string) => !!discoveredRef.current?.has(id);

    const draw = (t: number) => {
      const w = wiRef.current;
      const water = toLevel(w.water);
      const heat = toLevel(w.heat);
      const cold = toLevel(w.cold);
      const veg = toLevel(w.vegetation);
      const civ = toLevel(w.civilization);
      const pollution = toLevel(w.pollution);
      const bright = toLevel(w.brightness);
      const atmosphere = toLevel(w.atmosphere);
      const magic = toLevel(w.magic);

      const phase = t * 0.0002;
      const cloudPhase = phase * 1.25;

      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.8);
      bg.addColorStop(0, '#08142b');
      bg.addColorStop(0.62, '#050b17');
      bg.addColorStop(1, '#020409');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      for (const s of stars) {
        const twinkle = 0.35 + 0.65 * Math.sin(t * 0.001 + s.twinkle);
        ctx.globalAlpha = twinkle * 0.75;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const oceanR = Math.round(18 + (1 - water) * 35 + heat * 16);
      const oceanG = Math.round(34 + water * 48 + (1 - water) * 8);
      const oceanB = Math.round(74 + water * 120 + cold * 28);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      const bodyGrad = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.38, r * 0.14, cx, cy, r * 1.15);
      bodyGrad.addColorStop(0, `rgb(${clamp(oceanR + 20, 0, 255)}, ${clamp(oceanG + 24, 0, 255)}, ${clamp(oceanB + 28, 0, 255)})`);
      bodyGrad.addColorStop(0.62, `rgb(${oceanR}, ${oceanG}, ${oceanB})`);
      bodyGrad.addColorStop(1, `rgb(${Math.max(8, oceanR - 42)}, ${Math.max(12, oceanG - 36)}, ${Math.max(22, oceanB - 34)})`);
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      const landR = Math.round(58 + bright * 55 + heat * 18);
      const landG = Math.round(66 + veg * 92 - pollution * 26);
      const landB = Math.round(38 + cold * 28);

      for (const c of continents) {
        const p = projectToSphere(cx, cy, r * 0.98, c.lon, c.lat, phase);
        if (!p.visible) continue;
        ctx.fillStyle = `rgba(${clamp(landR, 30, 220)}, ${clamp(landG, 30, 220)}, ${clamp(landB, 20, 160)}, ${0.26 + p.alpha * 0.56})`;
        drawPatch(ctx, p, c.rx, c.ry, c.rot);

        if (veg > 0.08) {
          ctx.fillStyle = `rgba(28, ${90 + Math.round(veg * 92)}, 38, ${0.08 + p.alpha * 0.2 * veg})`;
          drawPatch(ctx, p, c.rx * 0.64, c.ry * 0.55, c.rot * 1.2);
        }
      }

      if (has('forest') || veg > 0.35) {
        for (const f of forests) {
          const p = projectToSphere(cx, cy, r * 0.99, f.lon, f.lat, phase);
          if (!p.visible) continue;
          ctx.fillStyle = `rgba(24, ${88 + Math.round(veg * 88)}, 30, ${0.05 + p.alpha * 0.25})`;
          drawPatch(ctx, p, 12 * f.size, 7 * f.size, 0.2);
        }
      }

      if (cold > 0.05 || has('ice') || has('snow')) {
        ctx.fillStyle = `rgba(228, 240, 255, ${0.1 + cold * 0.48})`;
        const north = projectToSphere(cx, cy, r * 0.98, -phase * 0.12, -1.12, 0);
        const south = projectToSphere(cx, cy, r * 0.98, phase * 0.1, 1.12, 0);
        drawPatch(ctx, north, r * 0.55, r * 0.16, 0);
        drawPatch(ctx, south, r * 0.5, r * 0.14, 0);
      }

      if (pollution > 0.05) {
        ctx.fillStyle = `rgba(70, 58, 40, ${pollution * 0.34})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      if (atmosphere > 0.05 || water > 0.06) {
        const maxClouds = Math.floor(8 + atmosphere * 14 + water * 7);
        for (let i = 0; i < maxClouds && i < clouds.length; i++) {
          const cloud = clouds[i];
          const p = projectToSphere(cx, cy, r * 1.015, cloud.lon, cloud.lat, cloudPhase * cloud.drift, 0.92);
          if (!p.visible) continue;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + p.alpha * (0.2 + atmosphere * 0.15)})`;
          drawPatch(ctx, p, cloud.rx, cloud.ry, 0.08);
        }
      }

      if (civ > 0.05) {
        const cityCount = Math.floor(3 + civ * 22);
        for (let i = 0; i < cityCount && i < cityPoints.length; i++) {
          const city = cityPoints[i];
          const p = projectToSphere(cx, cy, r * 0.985, city.lon, city.lat, phase);
          if (!p.visible) continue;
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7 * city.strength * p.scale);
          glow.addColorStop(0, `rgba(255, 234, 155, ${0.2 + p.alpha * 0.45})`);
          glow.addColorStop(1, 'rgba(255, 180, 80, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7 * city.strength * p.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const terminator = phase + Math.PI * 0.72;
      const nightGrad = ctx.createLinearGradient(
        cx + Math.sin(terminator) * r * 1.2,
        cy + Math.cos(terminator) * r * 0.8,
        cx - Math.sin(terminator) * r * 1.2,
        cy - Math.cos(terminator) * r * 0.8,
      );
      nightGrad.addColorStop(0, 'rgba(0, 0, 16, 0)');
      nightGrad.addColorStop(0.46, 'rgba(0, 0, 16, 0)');
      nightGrad.addColorStop(0.6, `rgba(0, 0, 16, ${0.2 + (1 - bright) * 0.26})`);
      nightGrad.addColorStop(1, `rgba(0, 0, 16, ${0.48 + (1 - bright) * 0.25})`);
      ctx.fillStyle = nightGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      const shapeGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.33, r * 0.1, cx, cy, r * 1.08);
      shapeGrad.addColorStop(0, `rgba(255, 255, 230, ${0.05 + bright * 0.1})`);
      shapeGrad.addColorStop(0.72, 'rgba(0, 0, 0, 0)');
      shapeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = shapeGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      ctx.restore();

      const limb = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.4, r * 0.1, cx, cy, r * 1.12);
      limb.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      limb.addColorStop(0.48, 'rgba(255, 255, 255, 0)');
      limb.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
      ctx.strokeStyle = limb;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      if (atmosphere > 0.03 || pollution > 0.05) {
        const haloColor = pollution > 0.15
          ? `rgba(135, 98, 56, ${Math.min(0.32, atmosphere * 0.2 + pollution * 0.2)})`
          : `rgba(110, 168, 255, ${Math.min(0.28, atmosphere * 0.24 + water * 0.06)})`;
        const halo = ctx.createRadialGradient(cx, cy, r - 3, cx, cy, r + 20);
        halo.addColorStop(0, haloColor);
        halo.addColorStop(1, 'transparent');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
        ctx.fill();
      }

      if (magic > 0.05) {
        const pulse = 0.55 + 0.45 * Math.sin(t * 0.0025);
        const magicHalo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + 28);
        magicHalo.addColorStop(0, 'rgba(155, 110, 255, 0)');
        magicHalo.addColorStop(0.85, `rgba(155, 110, 255, ${magic * 0.2 * pulse})`);
        magicHalo.addColorStop(1, 'rgba(155, 110, 255, 0)');
        ctx.fillStyle = magicHalo;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 28, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [seed]);

  return (
    <div className="planet-container">
      <canvas ref={canvasRef} width={520} height={520} className="planet-canvas" />
      <div className="planet-label">Your World: {worldStage}</div>
      <div className="planet-metrics" aria-label="World influence levels">
        <span>Water {wi.water}</span>
        <span>Life {wi.life}</span>
        <span>Green {wi.vegetation}</span>
        <span>Brightness {wi.brightness}</span>
        <span>Earthy {wi.earthy}</span>
        <span>Air {wi.air}</span>
        <span>Civ {wi.civilization}</span>
        <span>Pollution {wi.pollution}</span>
      </div>
    </div>
  );
}
