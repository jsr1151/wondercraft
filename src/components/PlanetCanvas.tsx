import { useRef, useEffect } from 'react';
import type { WorldInfluence } from '../types';
import './PlanetCanvas.css';

interface PlanetCanvasProps {
  worldInfluence: WorldInfluence;
  seed: number;
  discoveredElements?: Set<string>;
}

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0xffffffff;
  };
}

/** Draw an organic blob shape using bezier curves */
function drawBlob(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rx: number, ry: number,
  blobSeed: number,
  lobes: number = 7
) {
  const rng = seededRandom(blobSeed);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < lobes; i++) {
    const angle = (i / lobes) * Math.PI * 2;
    const variation = 0.72 + rng() * 0.56;
    points.push({
      x: cx + Math.cos(angle) * rx * variation,
      y: cy + Math.sin(angle) * ry * variation,
    });
  }
  ctx.beginPath();
  const last = points[lobes - 1];
  ctx.moveTo((points[0].x + last.x) / 2, (points[0].y + last.y) / 2);
  for (let i = 0; i < lobes; i++) {
    const next = points[(i + 1) % lobes];
    ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + next.x) / 2, (points[i].y + next.y) / 2);
  }
  ctx.closePath();
}

function tracePlanetPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  earthyLevel: number,
  phase: number
) {
  const roughness = 0.004 + earthyLevel * 0.055;
  const steps = 140;

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const angle = ratio * Math.PI * 2;
    const wave = Math.sin(angle * 7 + phase * 2.3) * 0.6 + Math.cos(angle * 11 - phase * 1.5) * 0.4;
    const radial = radius * (1 + wave * roughness);
    const x = cx + Math.cos(angle) * radial;
    const y = cy + Math.sin(angle) * radial;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function PlanetCanvas({ worldInfluence: wi, seed, discoveredElements }: PlanetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const wiRef = useRef(wi);
  const discoveredRef = useRef(discoveredElements);
  wiRef.current = wi;
  discoveredRef.current = discoveredElements;

  const toLevel = (value: number) => Math.max(0, Math.min(1, value / 32));
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
    const r = 220;

    const rng = seededRandom(seed);
    const terrainPatches: { x: number; y: number; radius: number; bias: number; blobSeed: number }[] = [];
    for (let i = 0; i < 90; i++) {
      terrainPatches.push({
        x: (rng() * 2 - 1) * r,
        y: (rng() * 2 - 1) * r,
        radius: 6 + rng() * 38,
        bias: rng(),
        blobSeed: Math.floor(rng() * 100000),
      });
    }

    const starPositions: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 200; i++) {
      starPositions.push({ x: rng() * W, y: rng() * H, r: rng() * 1.5 });
    }

    // Pre-generate seeded positions for terrain features and landmarks
    const featurePositions: { angle: number; dist: number; size: number; blobSeed: number }[] = [];
    for (let i = 0; i < 40; i++) {
      featurePositions.push({
        angle: rng() * Math.PI * 2,
        dist: 0.15 + rng() * 0.6,
        size: 0.6 + rng() * 0.8,
        blobSeed: Math.floor(rng() * 100000),
      });
    }
    const landmarkPositions: { angle: number; dist: number }[] = [];
    for (let i = 0; i < 12; i++) {
      landmarkPositions.push({
        angle: rng() * Math.PI * 2,
        dist: 0.2 + rng() * 0.5,
      });
    }
    const cloudPositions: { angle: number; dist: number; size: number; blobSeed: number }[] = [];
    for (let i = 0; i < 12; i++) {
      cloudPositions.push({
        angle: rng() * Math.PI * 2,
        dist: 0.08 + rng() * 0.7,
        size: 0.4 + rng() * 1.1,
        blobSeed: Math.floor(rng() * 100000),
      });
    }

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    const draw = (t: number) => {
      const currentWi = wiRef.current;
      const has = (id: string) => !!discoveredRef.current?.has(id);
      const phase = t * 0.001;
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
      tracePlanetPath(ctx, cx, cy, r, clamp(Math.max(0, currentWi.earthy) / 32, 0, 1), phase);
      ctx.clip();

      const waterLevel = clamp(Math.max(0, currentWi.water) / 32, 0, 1);
      const heatLevel = clamp(Math.max(0, currentWi.heat) / 32, 0, 1);
      const coldLevel = clamp(Math.max(0, currentWi.cold) / 32, 0, 1);
      const vegLevel = clamp(Math.max(0, currentWi.vegetation) / 32, 0, 1);
      const pollLevel = clamp(Math.max(0, currentWi.pollution) / 32, 0, 1);
      const civLevel = clamp(Math.max(0, currentWi.civilization) / 32, 0, 1);
      const magicLevel = clamp(Math.max(0, currentWi.magic) / 32, 0, 1);
      const lifeLevel = clamp(Math.max(0, currentWi.life) / 32, 0, 1);
      const atmosLevel = clamp(Math.max(0, currentWi.atmosphere) / 32, 0, 1);
      const brightnessLevel = clamp(Math.max(0, currentWi.brightness) / 32, 0, 1);
      const earthyAmount = clamp(Math.max(0, currentWi.earthy) / 32, 0, 1);
      const airAmount = clamp(Math.max(0, currentWi.air) / 32, 0, 1);

      const development = clamp(
        waterLevel * 0.9 + vegLevel * 1.2 + lifeLevel + civLevel * 0.9 + atmosLevel * 0.6,
        0,
        1
      );

      // Start from a mostly bare rocky world and shift color with discovered influence.
      const baseR = Math.round(52 + brightnessLevel * 85 + heatLevel * 76 - waterLevel * 52 + pollLevel * 30);
      const baseG = Math.round(38 + brightnessLevel * 70 + vegLevel * 122 + waterLevel * 32 - pollLevel * 24);
      const baseB = Math.round(34 + brightnessLevel * 75 + waterLevel * 144 + coldLevel * 92 - heatLevel * 28);
      ctx.fillStyle = `rgb(${clamp(baseR, 0, 255)},${clamp(baseG, 0, 255)},${clamp(baseB, 0, 255)})`;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      if (brightnessLevel < 0.65) {
        const darkness = 0.8 - brightnessLevel;
        ctx.fillStyle = `rgba(6, 8, 20, ${clamp(darkness, 0, 0.78)})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // Spherical lighting – gives 3D depth
      const sphereLight = ctx.createRadialGradient(
        cx - r * 0.35, cy - r * 0.35, r * 0.08,
        cx + r * 0.12, cy + r * 0.12, r * 1.05
      );
      sphereLight.addColorStop(0, `rgba(255, 255, 240, ${0.06 + brightnessLevel * 0.14})`);
      sphereLight.addColorStop(0.45, 'rgba(0, 0, 0, 0)');
      sphereLight.addColorStop(1, `rgba(0, 0, 20, ${0.18 + (1 - brightnessLevel) * 0.15})`);
      ctx.fillStyle = sphereLight;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      const patchCount = Math.floor(2 + development * 72 + waterLevel * 16 + vegLevel * 16 + earthyAmount * 24);
      for (let i = 0; i < patchCount; i++) {
        const patch = terrainPatches[i];
        const px = cx + patch.x * Math.cos(phase) - patch.y * Math.sin(phase);
        const py = cy + patch.x * Math.sin(phase) + patch.y * Math.cos(phase);

        let patchColor: string;
        const wetBias = waterLevel * 0.75;
        const greenBias = vegLevel * 0.95 + lifeLevel * 0.4;
        const dryBias = heatLevel * 0.6 + (1 - waterLevel) * 0.2;

        if (patch.bias < wetBias) {
          patchColor = `rgba(16, 65, ${Math.round(130 + waterLevel * 50)}, ${0.28 + waterLevel * 0.22})`;
        } else if (patch.bias < wetBias + greenBias) {
          const g = Math.round(70 + lifeLevel * 50 + patch.radius * 0.6);
          patchColor = `rgba(${Math.round(12 + patch.radius * 0.25)}, ${g}, ${Math.round(18 + patch.radius * 0.3)}, ${0.25 + vegLevel * 0.22})`;
        } else if (patch.bias < wetBias + greenBias + dryBias) {
          patchColor = `rgba(${Math.round(125 + heatLevel * 35)}, ${Math.round(92 - waterLevel * 12)}, 52, 0.24)`;
        } else {
          patchColor = 'rgba(78, 72, 65, 0.2)';
        }

        ctx.fillStyle = patchColor;
        drawBlob(ctx, px, py, patch.radius, patch.radius * 0.65, patch.blobSeed);
        ctx.fill();
      }

      if (earthyAmount > 0.08) {
        const ridgeCount = Math.floor(5 + earthyAmount * 18);
        for (let i = 0; i < ridgeCount; i++) {
          const rr = seededRandom(seed + i * 31);
          const angle = rr() * Math.PI * 2 + phase * 0.7;
          const dist = rr() * r * 0.75;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          const size = 3 + rr() * (12 + earthyAmount * 10);

          ctx.fillStyle = `rgba(118, 96, 74, ${0.15 + earthyAmount * 0.2})`;
          ctx.beginPath();
          ctx.moveTo(px, py - size);
          ctx.lineTo(px + size * 0.8, py + size * 0.7);
          ctx.lineTo(px - size * 0.9, py + size * 0.6);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (coldLevel > 0.05) {
        const iceSize = coldLevel * 40;
        const iceAlpha = Math.min(0.9, coldLevel * 2);
        ctx.fillStyle = `rgba(220,240,255,${iceAlpha})`;
        drawBlob(ctx, cx, cy - r + iceSize * 0.5, r * 0.8, iceSize, seed + 9999, 10);
        ctx.fill();
        drawBlob(ctx, cx, cy + r - iceSize * 0.5, r * 0.7, iceSize * 0.7, seed + 9998, 10);
        ctx.fill();
      }

      // --- Terrain features (discovery-gated) ---
      // Lakes
      if (has('lake')) {
        for (let i = 0; i < 4; i++) {
          const fp = featurePositions[i];
          const lx = cx + Math.cos(fp.angle + phase) * fp.dist * r;
          const ly = cy + Math.sin(fp.angle + phase) * fp.dist * r;
          const s = 14 + fp.size * 24;
          // Deep water gradient
          const wg = ctx.createRadialGradient(lx - s * 0.12, ly - s * 0.1, s * 0.08, lx, ly, s * 0.85);
          wg.addColorStop(0, 'rgba(10, 45, 140, 0.72)');
          wg.addColorStop(0.45, 'rgba(20, 80, 175, 0.55)');
          wg.addColorStop(1, 'rgba(45, 120, 200, 0.12)');
          ctx.fillStyle = wg;
          drawBlob(ctx, lx, ly, s, s * 0.6, fp.blobSeed, 9);
          ctx.fill();
          // Specular highlight
          ctx.fillStyle = 'rgba(155, 210, 255, 0.22)';
          ctx.beginPath();
          ctx.ellipse(lx - s * 0.18, ly - s * 0.14, s * 0.2, s * 0.07, -0.4, 0, Math.PI * 2);
          ctx.fill();
          // Subtle wave shimmer
          const shimmer = 0.08 + 0.08 * Math.sin(t * 0.002 + fp.angle * 3);
          ctx.fillStyle = `rgba(120, 190, 255, ${shimmer})`;
          ctx.beginPath();
          ctx.ellipse(lx + s * 0.1, ly + s * 0.05, s * 0.3, s * 0.04, fp.angle + phase * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rivers
      if (has('river')) {
        for (let i = 4; i < 7; i++) {
          const fp = featurePositions[i];
          const startAngle = fp.angle + phase;
          const sx = cx + Math.cos(startAngle) * fp.dist * r * 0.4;
          const sy = cy + Math.sin(startAngle) * fp.dist * r * 0.4;
          const ex = cx + Math.cos(startAngle + 0.6) * fp.dist * r * 1.1;
          const ey = cy + Math.sin(startAngle + 0.6) * fp.dist * r * 1.1;
          const mx1 = (sx * 2 + ex) / 3 + Math.cos(startAngle + 1.0) * 25 * fp.size;
          const my1 = (sy * 2 + ey) / 3 + Math.sin(startAngle + 1.0) * 25 * fp.size;
          const mx2 = (sx + ex * 2) / 3 + Math.cos(startAngle + 1.8) * 20 * fp.size;
          const my2 = (sy + ey * 2) / 3 + Math.sin(startAngle + 1.8) * 20 * fp.size;
          // River glow
          ctx.strokeStyle = 'rgba(30, 100, 200, 0.2)';
          ctx.lineWidth = 4 + fp.size * 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(mx1, my1, mx2, my2, ex, ey);
          ctx.stroke();
          // River core
          ctx.strokeStyle = 'rgba(35, 120, 215, 0.6)';
          ctx.lineWidth = 1.5 + fp.size;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(mx1, my1, mx2, my2, ex, ey);
          ctx.stroke();
        }
      }

      // Forest clusters
      if (has('forest')) {
        for (let i = 7; i < 15; i++) {
          const fp = featurePositions[i];
          const fx = cx + Math.cos(fp.angle + phase) * fp.dist * r;
          const fy = cy + Math.sin(fp.angle + phase) * fp.dist * r;
          const s = 10 + fp.size * 18;
          // Dark understory shadow
          ctx.fillStyle = 'rgba(8, 45, 12, 0.45)';
          drawBlob(ctx, fx, fy, s * 1.05, s * 0.85, fp.blobSeed, 7);
          ctx.fill();
          // Tree canopy clusters
          const tRng = seededRandom(fp.blobSeed + 200);
          const count = 6 + Math.floor(fp.size * 10);
          for (let j = 0; j < count; j++) {
            const ox = (tRng() - 0.5) * s * 1.5;
            const oy = (tRng() - 0.5) * s * 1.1;
            const tr = 2.5 + tRng() * 5;
            const green = Math.floor(55 + tRng() * 95);
            ctx.fillStyle = `rgba(${Math.floor(6 + tRng() * 22)}, ${green}, ${Math.floor(10 + tRng() * 20)}, ${0.3 + tRng() * 0.3})`;
            ctx.beginPath();
            ctx.arc(fx + ox, fy + oy, tr, 0, Math.PI * 2);
            ctx.fill();
          }
          // Sunlit canopy highlights
          ctx.fillStyle = 'rgba(50, 160, 60, 0.18)';
          drawBlob(ctx, fx - s * 0.2, fy - s * 0.2, s * 0.5, s * 0.4, fp.blobSeed + 1, 5);
          ctx.fill();
        }
      }

      // Mountain ranges
      if (has('mountain')) {
        for (let i = 15; i < 20; i++) {
          const fp = featurePositions[i];
          const mx = cx + Math.cos(fp.angle + phase * 0.7) * fp.dist * r;
          const my = cy + Math.sin(fp.angle + phase * 0.7) * fp.dist * r;
          const s = 14 + fp.size * 18;
          const mrng = seededRandom(fp.blobSeed);
          const peakCount = 3 + Math.floor(mrng() * 2);
          const rangeWidth = s * 2.5;
          const startX = mx - rangeWidth / 2;
          // Generate peak data
          const peaks: { px: number; peakH: number; slopeL: number; slopeR: number }[] = [];
          for (let p = 0; p < peakCount; p++) {
            peaks.push({
              px: startX + (p + 0.5) * (rangeWidth / peakCount),
              peakH: s * (0.6 + mrng() * 0.5),
              slopeL: my + s * 0.1 * mrng(),
              slopeR: my + s * 0.1 * mrng(),
            });
          }
          // Draw mountain body
          ctx.fillStyle = 'rgba(100, 80, 60, 0.55)';
          ctx.beginPath();
          ctx.moveTo(startX, my + s * 0.5);
          for (const peak of peaks) {
            ctx.lineTo(peak.px - s * 0.25, peak.slopeL);
            ctx.lineTo(peak.px, my - peak.peakH);
            ctx.lineTo(peak.px + s * 0.25, peak.slopeR);
          }
          ctx.lineTo(startX + rangeWidth, my + s * 0.5);
          ctx.closePath();
          ctx.fill();
          // Snow caps
          ctx.fillStyle = 'rgba(230, 240, 255, 0.6)';
          for (const peak of peaks) {
            const capSize = s * 0.25;
            ctx.beginPath();
            ctx.moveTo(peak.px, my - peak.peakH);
            ctx.lineTo(peak.px + capSize * 0.4, my - peak.peakH + capSize);
            ctx.lineTo(peak.px - capSize * 0.4, my - peak.peakH + capSize);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Volcanoes
      if (has('volcano')) {
        for (let i = 20; i < 23; i++) {
          const fp = featurePositions[i];
          const vx = cx + Math.cos(fp.angle + phase * 0.7) * fp.dist * r;
          const vy = cy + Math.sin(fp.angle + phase * 0.7) * fp.dist * r;
          const s = 10 + fp.size * 12;
          ctx.fillStyle = 'rgba(80, 50, 30, 0.6)';
          ctx.beginPath();
          ctx.moveTo(vx, vy - s);
          ctx.lineTo(vx + s * 0.9, vy + s * 0.5);
          ctx.lineTo(vx - s * 0.9, vy + s * 0.5);
          ctx.closePath();
          ctx.fill();
          // Lava glow
          const glowPulse = 0.5 + 0.5 * Math.sin(t * 0.003 + fp.angle);
          ctx.fillStyle = `rgba(255, 80, 20, ${0.4 * glowPulse})`;
          drawBlob(ctx, vx, vy - s * 0.65, s * 0.4, s * 0.3, fp.blobSeed, 5);
          ctx.fill();
        }
      }

      // Deserts
      if (has('desert')) {
        for (let i = 23; i < 27; i++) {
          const fp = featurePositions[i];
          const dx = cx + Math.cos(fp.angle + phase) * fp.dist * r;
          const dy = cy + Math.sin(fp.angle + phase) * fp.dist * r;
          const s = 14 + fp.size * 20;
          ctx.fillStyle = 'rgba(210, 180, 110, 0.42)';
          drawBlob(ctx, dx, dy, s, s * 0.6, fp.blobSeed, 8);
          ctx.fill();
        }
      }

      // Snow areas (beyond ice caps)
      if (has('snow') || has('ice')) {
        for (let i = 27; i < 31; i++) {
          const fp = featurePositions[i];
          const sx = cx + Math.cos(fp.angle + phase) * fp.dist * r;
          const sy = cy + Math.sin(fp.angle + phase) * fp.dist * r;
          const s = 12 + fp.size * 14;
          ctx.fillStyle = 'rgba(225, 240, 255, 0.38)';
          drawBlob(ctx, sx, sy, s, s * 0.7, fp.blobSeed, 7);
          ctx.fill();
        }
      }

      // Coastlines (ocean/island → visible boundary arcs)
      if (has('ocean') || has('island')) {
        for (let i = 31; i < 35; i++) {
          const fp = featurePositions[i];
          const ca = fp.angle + phase;
          ctx.strokeStyle = 'rgba(80, 170, 240, 0.28)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(cx, cy, fp.dist * r, ca, ca + 0.8);
          ctx.stroke();
        }
      }

      // Clouds
      if (atmosLevel > 0.01 || waterLevel > 0.08) {
        const cloudPhase = phase * 1.12;
        const cloudAlpha = clamp(0.05 + atmosLevel * 0.24 + waterLevel * 0.04, 0, 0.3);
        const numClouds = Math.floor(2 + atmosLevel * 8 + waterLevel * 3);
        for (let i = 0; i < numClouds && i < cloudPositions.length; i++) {
          const cp = cloudPositions[i];
          const ca = cp.angle + cloudPhase;
          const ccx = cx + Math.cos(ca) * cp.dist * r;
          const ccy = cy + Math.sin(ca) * cp.dist * r;
          const cs = 18 + cp.size * 30;
          ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`;
          drawBlob(ctx, ccx, ccy, cs, cs * 0.28, cp.blobSeed, 6);
          ctx.fill();
          // Wisp extension
          ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha * 0.55})`;
          drawBlob(ctx, ccx + cs * 0.5, ccy + cs * 0.04, cs * 0.5, cs * 0.18, cp.blobSeed + 1, 5);
          ctx.fill();
        }
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
        const numCities = Math.floor(4 + civLevel * 24);
        for (let i = 0; i < numCities; i++) {
          const angle = rng2() * Math.PI * 2 + phase;
          const dist = rng2() * r * 0.78;
          const lx = cx + Math.cos(angle) * dist;
          const ly = cy + Math.sin(angle) * dist;
          const citySize = 1.5 + rng2() * 2.5 * civLevel;
          // Warm glow
          const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, citySize * 3);
          glow.addColorStop(0, `rgba(255, 240, 140, ${0.4 + rng2() * 0.35})`);
          glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(lx, ly, citySize * 3, 0, Math.PI * 2);
          ctx.fill();
          // Bright core
          ctx.fillStyle = `rgba(255, 245, 180, ${0.55 + rng2() * 0.35})`;
          ctx.beginPath();
          ctx.arc(lx, ly, citySize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Landmark system (discovery-gated) ---
      const drawLandmark = (idx: number, drawFn: (x: number, y: number) => void) => {
        const lp = landmarkPositions[idx % landmarkPositions.length];
        const lx = cx + Math.cos(lp.angle + phase * 0.5) * lp.dist * r;
        const ly = cy + Math.sin(lp.angle + phase * 0.5) * lp.dist * r;
        drawFn(lx, ly);
      };

      // Castle (upgrades: castle → kingdom → empire)
      if (has('castle')) {
        const tier = has('kingdom') ? (has('city') ? 2 : 1) : 0;
        drawLandmark(0, (lx, ly) => {
          const s = 14 + tier * 6;
          ctx.fillStyle = 'rgba(170, 148, 105, 0.9)';
          ctx.fillRect(lx - s, ly - s * 0.5, s * 2, s);
          // Towers
          ctx.fillRect(lx - s, ly - s * 1.3, s * 0.45, s * 0.9);
          ctx.fillRect(lx + s * 0.55, ly - s * 1.3, s * 0.45, s * 0.9);
          if (tier >= 1) {
            ctx.fillRect(lx - s * 0.22, ly - s * 1.6, s * 0.44, s * 1.1);
            ctx.fillStyle = 'rgba(210, 50, 50, 0.85)';
            ctx.fillRect(lx + s * 0.22, ly - s * 1.6, s * 0.35, s * 0.3);
          }
          if (tier >= 2) {
            ctx.strokeStyle = 'rgba(140, 118, 85, 0.75)';
            ctx.lineWidth = 2;
            ctx.strokeRect(lx - s * 1.5, ly - s * 0.35, s * 3, s * 1.3);
          }
        });
      }

      // Pyramid (sphinx & obelisk near it)
      if (has('pyramid')) {
        drawLandmark(1, (lx, ly) => {
          const s = 22;
          ctx.fillStyle = 'rgba(215, 195, 125, 0.85)';
          ctx.beginPath();
          ctx.moveTo(lx, ly - s);
          ctx.lineTo(lx + s, ly + s * 0.5);
          ctx.lineTo(lx - s, ly + s * 0.5);
          ctx.closePath();
          ctx.fill();
          // Smaller pyramid behind
          ctx.fillStyle = 'rgba(205, 185, 115, 0.65)';
          ctx.beginPath();
          ctx.moveTo(lx + s * 1.2, ly - s * 0.5);
          ctx.lineTo(lx + s * 1.8, ly + s * 0.5);
          ctx.lineTo(lx + s * 0.6, ly + s * 0.5);
          ctx.closePath();
          ctx.fill();
        });
        // Sphinx near pyramid  
        if (has('sphinx')) {
          drawLandmark(2, (lx, ly) => {
            ctx.fillStyle = 'rgba(200, 178, 110, 0.8)';
            drawBlob(ctx, lx, ly, 14, 7, seed + 7777, 6);
            ctx.fill();
            // Head
            ctx.beginPath();
            ctx.arc(lx - 10, ly - 5, 5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        // Obelisk near pyramid
        if (has('obelisk')) {
          drawLandmark(3, (lx, ly) => {
            ctx.fillStyle = 'rgba(190, 190, 190, 0.85)';
            ctx.fillRect(lx - 2.5, ly - 20, 5, 20);
            ctx.beginPath();
            ctx.moveTo(lx, ly - 23);
            ctx.lineTo(lx + 3.5, ly - 20);
            ctx.lineTo(lx - 3.5, ly - 20);
            ctx.closePath();
            ctx.fill();
          });
        }
      }

      // Airport
      if (has('airplane')) {
        drawLandmark(4, (lx, ly) => {
          ctx.fillStyle = 'rgba(80, 80, 92, 0.8)';
          ctx.fillRect(lx - 28, ly - 3, 56, 6);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(lx - 24, ly);
          ctx.lineTo(lx + 24, ly);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(150, 150, 160, 0.7)';
          ctx.fillRect(lx - 8, ly + 5, 16, 8);
        });
      }

      // Space Station / Launch Pad
      if (has('rocket') || has('spaceship')) {
        drawLandmark(5, (lx, ly) => {
          ctx.fillStyle = 'rgba(105, 105, 115, 0.8)';
          ctx.beginPath();
          ctx.arc(lx, ly, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(210, 210, 220, 0.9)';
          ctx.fillRect(lx - 2.5, ly - 18, 5, 16);
          const flamePulse = 0.4 + 0.6 * Math.sin(t * 0.005);
          ctx.fillStyle = `rgba(255, 140, 30, ${0.6 * flamePulse})`;
          ctx.beginPath();
          ctx.moveTo(lx - 4, ly - 2);
          ctx.lineTo(lx + 4, ly - 2);
          ctx.lineTo(lx, ly + 6);
          ctx.closePath();
          ctx.fill();
        });
      }

      // House / Village
      if (has('house') || has('cottage') || has('hut') || has('village')) {
        drawLandmark(6, (lx, ly) => {
          const s = 12;
          ctx.fillStyle = 'rgba(185, 155, 115, 0.9)';
          ctx.fillRect(lx - s * 0.6, ly - s * 0.15, s * 1.2, s * 0.7);
          ctx.fillStyle = 'rgba(165, 55, 35, 0.85)';
          ctx.beginPath();
          ctx.moveTo(lx, ly - s * 0.7);
          ctx.lineTo(lx + s * 0.8, ly - s * 0.15);
          ctx.lineTo(lx - s * 0.8, ly - s * 0.15);
          ctx.closePath();
          ctx.fill();
        });
      }

      // City skyline
      if (has('city') || has('skyscraper')) {
        drawLandmark(7, (lx, ly) => {
          const s = 16;
          ctx.fillStyle = 'rgba(110, 120, 135, 0.85)';
          ctx.fillRect(lx - s, ly - s * 1.2, s * 0.35, s * 1.5);
          ctx.fillRect(lx - s * 0.35, ly - s * 0.8, s * 0.3, s * 1.1);
          ctx.fillRect(lx + s * 0.1, ly - s * 1.6, s * 0.28, s * 1.9);
          ctx.fillRect(lx + s * 0.5, ly - s * 0.6, s * 0.4, s * 0.9);
          ctx.fillStyle = 'rgba(255, 235, 110, 0.6)';
          const wRng = seededRandom(seed + 888);
          for (let w = 0; w < 10; w++) {
            ctx.fillRect(lx - s + wRng() * s * 1.8, ly - s * 1.4 + wRng() * s * 1.6, 1.5, 1.5);
          }
        });
      }

      // Lighthouse
      if (has('lighthouse')) {
        drawLandmark(8, (lx, ly) => {
          ctx.fillStyle = 'rgba(220, 220, 210, 0.9)';
          ctx.fillRect(lx - 3, ly - 20, 6, 20);
          ctx.fillStyle = 'rgba(200, 50, 40, 0.8)';
          ctx.fillRect(lx - 3, ly - 16, 6, 4);
          ctx.fillRect(lx - 3, ly - 8, 6, 4);
          const beamPulse = 0.3 + 0.7 * Math.sin(t * 0.004);
          ctx.fillStyle = `rgba(255, 250, 150, ${0.7 * beamPulse})`;
          ctx.beginPath();
          ctx.arc(lx, ly - 22, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Dam / Bridge
      if (has('dam') || has('bridge')) {
        drawLandmark(9, (lx, ly) => {
          ctx.fillStyle = 'rgba(160, 160, 155, 0.85)';
          ctx.fillRect(lx - 20, ly - 2, 40, 5);
          ctx.fillRect(lx - 18, ly - 8, 4, 8);
          ctx.fillRect(lx + 14, ly - 8, 4, 8);
          ctx.fillRect(lx - 2, ly - 6, 4, 6);
        });
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

      if (airAmount > 0.02) {
        const ringCount = Math.max(1, Math.floor(airAmount * 5));
        for (let i = 0; i < ringCount; i++) {
          const grow = 7 + i * 6;
          const alpha = Math.max(0.04, airAmount * 0.18 - i * 0.018);
          ctx.strokeStyle = `rgba(153, 194, 255, ${alpha})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r + grow, r + grow * 0.88, phase * 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
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

      if (brightnessLevel > 0.05) {
        const lightAura = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.25, cx, cy, r + 40);
        lightAura.addColorStop(0, `rgba(255, 244, 170, ${0.12 + brightnessLevel * 0.25})`);
        lightAura.addColorStop(1, 'transparent');
        ctx.fillStyle = lightAura;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 40, 0, Math.PI * 2);
        ctx.fill();
      }

      const rimGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.5, cx, cy, r);
      rimGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
      rimGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      rimGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.save();
      ctx.beginPath();
      tracePlanetPath(ctx, cx, cy, r, earthyAmount, phase);
      ctx.clip();
      ctx.fillStyle = rimGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

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
