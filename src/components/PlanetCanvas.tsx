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

/** Draw an organic blob shape using bezier curves — call ctx.fill()/stroke() after */
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

/** Rotate a point around center by a phase angle */
function rotPt(cx: number, cy: number, x: number, y: number, phase: number): [number, number] {
  const dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(phase) - dy * Math.sin(phase), cy + dx * Math.sin(phase) + dy * Math.cos(phase)];
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

    // ---------- PRE-GENERATE GEOMETRY ----------

    // 4-6 continent centers — asymmetric to show rotation
    const continentCount = 3 + Math.floor(rng() * 3);
    const continents: { x: number; y: number; rx: number; ry: number; blobSeed: number;
      subBlobs: { ox: number; oy: number; rx: number; ry: number; blobSeed: number }[] }[] = [];
    for (let i = 0; i < continentCount; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * r * 0.55;
      const baseRx = 55 + rng() * 65;
      const subs: typeof continents[0]['subBlobs'] = [];
      const subCount = 2 + Math.floor(rng() * 4);
      for (let j = 0; j < subCount; j++) {
        subs.push({
          ox: (rng() - 0.5) * baseRx * 1.2,
          oy: (rng() - 0.5) * baseRx * 0.8,
          rx: 20 + rng() * 50,
          ry: 15 + rng() * 40,
          blobSeed: Math.floor(rng() * 100000),
        });
      }
      continents.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        rx: baseRx,
        ry: baseRx * (0.5 + rng() * 0.5),
        blobSeed: Math.floor(rng() * 100000),
        subBlobs: subs,
      });
    }

    const starPositions: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 200; i++) {
      starPositions.push({ x: rng() * W, y: rng() * H, r: rng() * 1.5 });
    }

    // Feature positions for terrain features (lakes, forests etc.)
    const featurePositions: { angle: number; dist: number; size: number; blobSeed: number }[] = [];
    for (let i = 0; i < 40; i++) {
      featurePositions.push({
        angle: rng() * Math.PI * 2,
        dist: 0.15 + rng() * 0.6,
        size: 0.6 + rng() * 0.8,
        blobSeed: Math.floor(rng() * 100000),
      });
    }

    // Landmark positions
    const landmarkPositions: { angle: number; dist: number }[] = [];
    for (let i = 0; i < 12; i++) {
      landmarkPositions.push({
        angle: rng() * Math.PI * 2,
        dist: 0.18 + rng() * 0.52,
      });
    }

    // Cloud positions
    const cloudPositions: { angle: number; dist: number; size: number; blobSeed: number }[] = [];
    for (let i = 0; i < 12; i++) {
      cloudPositions.push({
        angle: rng() * Math.PI * 2,
        dist: 0.08 + rng() * 0.65,
        size: 0.5 + rng() * 1.0,
        blobSeed: Math.floor(rng() * 100000),
      });
    }

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    // ---------- DRAW LOOP ----------
    const draw = (t: number) => {
      const w = wiRef.current;
      const has = (id: string) => !!discoveredRef.current?.has(id);
      const phase = t * 0.0006; // ~10.5 seconds per revolution

      ctx.clearRect(0, 0, W, H);

      // Star field
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, W, H);
      for (const star of starPositions) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.0015 + star.x * 0.7);
        ctx.globalAlpha = twinkle * 0.75;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Clip to planet circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // --- Compute levels from live state ---
      const waterLvl = clamp(w.water / 32, 0, 1);
      const heatLvl = clamp(w.heat / 32, 0, 1);
      const coldLvl = clamp(w.cold / 32, 0, 1);
      const vegLvl = clamp(w.vegetation / 32, 0, 1);
      const pollLvl = clamp(w.pollution / 32, 0, 1);
      const civLvl = clamp(w.civilization / 32, 0, 1);
      const magicLvl = clamp(w.magic / 32, 0, 1);
      const lifeLvl = clamp(w.life / 32, 0, 1);
      const atmosLvl = clamp(w.atmosphere / 32, 0, 1);
      const brightLvl = clamp(w.brightness / 32, 0, 1);
      const earthLvl = clamp(w.earthy / 32, 0, 1);
      const airLvl = clamp(w.air / 32, 0, 1);

      // === LAYER 1: Ocean / Base ===
      // Water → deep blue ocean; no water → barren rock
      const oceanR = Math.round(14 + (1 - waterLvl) * 48 + heatLvl * 25);
      const oceanG = Math.round(25 + (1 - waterLvl) * 38 + waterLvl * 45);
      const oceanB = Math.round(60 + waterLvl * 130 + coldLvl * 30);
      ctx.fillStyle = `rgb(${clamp(oceanR, 0, 255)},${clamp(oceanG, 0, 255)},${clamp(oceanB, 0, 255)})`;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // Ocean depth shimmer (animated)
      if (waterLvl > 0.05) {
        const shimPhase = t * 0.0004;
        for (let i = 0; i < 5; i++) {
          const sa = shimPhase + i * 1.26;
          const sd = r * (0.5 + i * 0.06);
          const sx = cx + Math.cos(sa) * sd * 0.7;
          const sy = cy + Math.sin(sa) * sd * 0.5;
          ctx.fillStyle = `rgba(30, 80, 170, ${0.04 + waterLvl * 0.04})`;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 50 + i * 15, 20 + i * 8, sa, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Brightness/darkness
      if (brightLvl < 0.65) {
        ctx.fillStyle = `rgba(4, 6, 16, ${clamp(0.65 - brightLvl, 0, 0.7)})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // === LAYER 2: Continents ===
      // Land masses rotate with phase — asymmetric shapes create visible rotation
      const landR = Math.round(50 + brightLvl * 70 + heatLvl * 40 + vegLvl * 10);
      const landG = Math.round(58 + brightLvl * 55 + vegLvl * 80 - pollLvl * 15);
      const landB = Math.round(32 + brightLvl * 30 + coldLvl * 30 - heatLvl * 10);
      const landAlpha = 0.5 + earthLvl * 0.35 + lifeLvl * 0.15;

      for (const cont of continents) {
        const [rx, ry] = rotPt(cx, cy, cont.x, cont.y, phase);
        // Main continent body
        ctx.fillStyle = `rgba(${clamp(landR, 20, 220)},${clamp(landG, 30, 210)},${clamp(landB, 15, 140)},${clamp(landAlpha, 0.3, 1)})`;
        drawBlob(ctx, rx, ry, cont.rx, cont.ry, cont.blobSeed, 9);
        ctx.fill();

        // Sub-blobs for coastline variation
        for (const sub of cont.subBlobs) {
          const [sx, sy] = rotPt(cx, cy, cont.x + sub.ox, cont.y + sub.oy, phase);
          drawBlob(ctx, sx, sy, sub.rx, sub.ry, sub.blobSeed, 7);
          ctx.fill();
        }

        // Vegetation tint on continents
        if (vegLvl > 0.08) {
          const [gx, gy] = rotPt(cx, cy, cont.x, cont.y, phase);
          const vegGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, cont.rx * 0.8);
          vegGrad.addColorStop(0, `rgba(25, ${90 + Math.round(vegLvl * 70)}, 35, ${vegLvl * 0.35})`);
          vegGrad.addColorStop(1, 'rgba(25, 80, 30, 0)');
          ctx.fillStyle = vegGrad;
          drawBlob(ctx, gx, gy, cont.rx * 0.9, cont.ry * 0.85, cont.blobSeed + 1, 8);
          ctx.fill();
        }

        // Coastline highlights
        if (waterLvl > 0.05) {
          ctx.strokeStyle = `rgba(100, 180, 240, ${0.08 + waterLvl * 0.14})`;
          ctx.lineWidth = 1.5;
          drawBlob(ctx, rx, ry, cont.rx + 2, cont.ry + 2, cont.blobSeed, 9);
          ctx.stroke();
        }
      }

      // Mountain ridges (on continents)
      if (earthLvl > 0.08) {
        const ridgeCount = Math.floor(3 + earthLvl * 12);
        for (let i = 0; i < ridgeCount; i++) {
          const rr = seededRandom(seed + i * 31);
          const rawX = cx + (rr() - 0.5) * r * 1.2;
          const rawY = cy + (rr() - 0.5) * r * 1.0;
          const [px, py] = rotPt(cx, cy, rawX, rawY, phase);
          const size = 3 + rr() * (10 + earthLvl * 8);
          ctx.fillStyle = `rgba(118, 96, 74, ${0.12 + earthLvl * 0.18})`;
          ctx.beginPath();
          ctx.moveTo(px, py - size);
          ctx.lineTo(px + size * 0.8, py + size * 0.65);
          ctx.lineTo(px - size * 0.9, py + size * 0.55);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Ice caps
      if (coldLvl > 0.05) {
        const iceSize = coldLvl * 45;
        const iceAlpha = Math.min(0.85, coldLvl * 2);
        ctx.fillStyle = `rgba(220,235,255,${iceAlpha})`;
        drawBlob(ctx, cx, cy - r + iceSize * 0.6, r * 0.7, iceSize, seed + 9999, 10);
        ctx.fill();
        drawBlob(ctx, cx, cy + r - iceSize * 0.5, r * 0.6, iceSize * 0.7, seed + 9998, 10);
        ctx.fill();
      }

      // === LAYER 3: Discovery-gated terrain features ===
      // Lakes — gradient water with depth and specular
      if (has('lake')) {
        for (let i = 0; i < 4; i++) {
          const fp = featurePositions[i];
          const [lx, ly] = rotPt(cx, cy,
            cx + Math.cos(fp.angle) * fp.dist * r,
            cy + Math.sin(fp.angle) * fp.dist * r, phase);
          const s = 14 + fp.size * 22;
          const wg = ctx.createRadialGradient(lx - s * 0.1, ly - s * 0.1, 1, lx, ly, s * 0.8);
          wg.addColorStop(0, 'rgba(8, 38, 130, 0.7)');
          wg.addColorStop(0.5, 'rgba(18, 70, 165, 0.5)');
          wg.addColorStop(1, 'rgba(40, 115, 200, 0.08)');
          ctx.fillStyle = wg;
          drawBlob(ctx, lx, ly, s, s * 0.55, fp.blobSeed, 9);
          ctx.fill();
          // Sun glint
          const shimmer = 0.12 + 0.1 * Math.sin(t * 0.002 + i);
          ctx.fillStyle = `rgba(180, 220, 255, ${shimmer})`;
          ctx.beginPath();
          ctx.ellipse(lx - s * 0.15, ly - s * 0.12, s * 0.15, s * 0.04, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rivers
      if (has('river')) {
        for (let i = 4; i < 7; i++) {
          const fp = featurePositions[i];
          const [sx, sy] = rotPt(cx, cy,
            cx + Math.cos(fp.angle) * fp.dist * r * 0.4,
            cy + Math.sin(fp.angle) * fp.dist * r * 0.4, phase);
          const [ex, ey] = rotPt(cx, cy,
            cx + Math.cos(fp.angle + 0.6) * fp.dist * r * 1.1,
            cy + Math.sin(fp.angle + 0.6) * fp.dist * r * 1.1, phase);
          const mx1 = (sx * 2 + ex) / 3 + Math.cos(fp.angle + 1.0) * 22 * fp.size;
          const my1 = (sy * 2 + ey) / 3 + Math.sin(fp.angle + 1.0) * 22 * fp.size;
          const mx2 = (sx + ex * 2) / 3 + Math.cos(fp.angle + 1.8) * 18 * fp.size;
          const my2 = (sy + ey * 2) / 3 + Math.sin(fp.angle + 1.8) * 18 * fp.size;
          // Glow
          ctx.strokeStyle = 'rgba(25, 85, 190, 0.18)';
          ctx.lineWidth = 4 + fp.size * 2;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(mx1, my1, mx2, my2, ex, ey); ctx.stroke();
          // Core
          ctx.strokeStyle = 'rgba(30, 110, 210, 0.5)';
          ctx.lineWidth = 1.2 + fp.size;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(mx1, my1, mx2, my2, ex, ey); ctx.stroke();
        }
      }

      // Forest clusters — individual trees
      if (has('forest')) {
        for (let i = 7; i < 15; i++) {
          const fp = featurePositions[i];
          const [fx, fy] = rotPt(cx, cy,
            cx + Math.cos(fp.angle) * fp.dist * r,
            cy + Math.sin(fp.angle) * fp.dist * r, phase);
          const s = 12 + fp.size * 16;
          // Dark understory
          ctx.fillStyle = 'rgba(6, 38, 10, 0.4)';
          drawBlob(ctx, fx, fy, s, s * 0.8, fp.blobSeed, 7);
          ctx.fill();
          // Individual tree crowns
          const tRng = seededRandom(fp.blobSeed + 200);
          const treeCount = 8 + Math.floor(fp.size * 12);
          for (let j = 0; j < treeCount; j++) {
            const ox = (tRng() - 0.5) * s * 1.4;
            const oy = (tRng() - 0.5) * s;
            const tr = 2 + tRng() * 4.5;
            const g = 50 + Math.floor(tRng() * 100);
            ctx.fillStyle = `rgba(${5 + Math.floor(tRng() * 20)}, ${g}, ${8 + Math.floor(tRng() * 18)}, ${0.35 + tRng() * 0.3})`;
            ctx.beginPath();
            ctx.arc(fx + ox, fy + oy, tr, 0, Math.PI * 2);
            ctx.fill();
          }
          // Highlight
          ctx.fillStyle = 'rgba(60, 170, 70, 0.12)';
          drawBlob(ctx, fx - s * 0.2, fy - s * 0.15, s * 0.4, s * 0.3, fp.blobSeed + 1, 5);
          ctx.fill();
        }
      }

      // Mountains
      if (has('mountain')) {
        for (let i = 15; i < 20; i++) {
          const fp = featurePositions[i];
          const [mx, my] = rotPt(cx, cy,
            cx + Math.cos(fp.angle) * fp.dist * r,
            cy + Math.sin(fp.angle) * fp.dist * r, phase);
          const s = 14 + fp.size * 16;
          const mrng = seededRandom(fp.blobSeed);
          const peakCount = 3 + Math.floor(mrng() * 2);
          const rangeWidth = s * 2.5;
          const startX = mx - rangeWidth / 2;
          ctx.fillStyle = 'rgba(95, 78, 55, 0.55)';
          ctx.beginPath();
          ctx.moveTo(startX, my + s * 0.5);
          for (let p = 0; p < peakCount; p++) {
            const px = startX + (p + 0.5) * (rangeWidth / peakCount);
            const peakH = s * (0.6 + mrng() * 0.5);
            ctx.lineTo(px - s * 0.2, my + s * 0.1 * mrng());
            ctx.lineTo(px, my - peakH);
            ctx.lineTo(px + s * 0.2, my + s * 0.1 * mrng());
          }
          ctx.lineTo(startX + rangeWidth, my + s * 0.5);
          ctx.closePath();
          ctx.fill();
          // Snow caps
          ctx.fillStyle = 'rgba(235, 245, 255, 0.6)';
          const mrng2 = seededRandom(fp.blobSeed);
          for (let p = 0; p < peakCount; p++) {
            const px = startX + (p + 0.5) * (rangeWidth / peakCount);
            const peakH = s * (0.6 + mrng2() * 0.5);
            mrng2(); mrng2(); // consume same values
            const cap = s * 0.22;
            ctx.beginPath();
            ctx.moveTo(px, my - peakH);
            ctx.lineTo(px + cap * 0.35, my - peakH + cap);
            ctx.lineTo(px - cap * 0.35, my - peakH + cap);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Volcanoes
      if (has('volcano')) {
        for (let i = 20; i < 23; i++) {
          const fp = featurePositions[i];
          const [vx, vy] = rotPt(cx, cy,
            cx + Math.cos(fp.angle) * fp.dist * r,
            cy + Math.sin(fp.angle) * fp.dist * r, phase);
          const s = 10 + fp.size * 12;
          ctx.fillStyle = 'rgba(70, 45, 25, 0.6)';
          ctx.beginPath();
          ctx.moveTo(vx, vy - s);
          ctx.lineTo(vx + s * 0.9, vy + s * 0.5);
          ctx.lineTo(vx - s * 0.9, vy + s * 0.5);
          ctx.closePath();
          ctx.fill();
          const pulse = 0.4 + 0.6 * Math.sin(t * 0.003 + fp.angle);
          ctx.fillStyle = `rgba(255, 70, 15, ${0.45 * pulse})`;
          drawBlob(ctx, vx, vy - s * 0.6, s * 0.35, s * 0.25, fp.blobSeed, 5);
          ctx.fill();
        }
      }

      // Deserts
      if (has('desert')) {
        for (let i = 23; i < 27; i++) {
          const fp = featurePositions[i];
          const [dx, dy] = rotPt(cx, cy,
            cx + Math.cos(fp.angle) * fp.dist * r,
            cy + Math.sin(fp.angle) * fp.dist * r, phase);
          const s = 14 + fp.size * 18;
          ctx.fillStyle = 'rgba(215, 185, 115, 0.4)';
          drawBlob(ctx, dx, dy, s, s * 0.55, fp.blobSeed, 8);
          ctx.fill();
        }
      }

      // Snow patches
      if (has('snow') || has('ice')) {
        for (let i = 27; i < 31; i++) {
          const fp = featurePositions[i];
          const [sx, sy] = rotPt(cx, cy,
            cx + Math.cos(fp.angle) * fp.dist * r,
            cy + Math.sin(fp.angle) * fp.dist * r, phase);
          const s = 12 + fp.size * 12;
          ctx.fillStyle = 'rgba(230, 242, 255, 0.35)';
          drawBlob(ctx, sx, sy, s, s * 0.65, fp.blobSeed, 7);
          ctx.fill();
        }
      }

      // Coastline arcs
      if (has('ocean') || has('island')) {
        for (let i = 31; i < 35; i++) {
          const fp = featurePositions[i];
          ctx.strokeStyle = 'rgba(80, 170, 240, 0.25)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(cx, cy, fp.dist * r, fp.angle + phase, fp.angle + phase + 0.8);
          ctx.stroke();
        }
      }

      // === LAYER 4: Pollution & dust overlays ===
      if (pollLvl > 0.05) {
        ctx.fillStyle = `rgba(60, 52, 38, ${pollLvl * 0.5})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // === LAYER 5: Clouds (rotate slightly faster than surface) ===
      if (atmosLvl > 0.01 || waterLvl > 0.08) {
        const cloudPhase = phase * 1.15;
        const cloudAlpha = clamp(0.06 + atmosLvl * 0.2 + waterLvl * 0.04, 0, 0.28);
        const numClouds = Math.floor(2 + atmosLvl * 8 + waterLvl * 3);
        for (let i = 0; i < numClouds && i < cloudPositions.length; i++) {
          const cp = cloudPositions[i];
          const [ccx, ccy] = rotPt(cx, cy,
            cx + Math.cos(cp.angle) * cp.dist * r,
            cy + Math.sin(cp.angle) * cp.dist * r, cloudPhase);
          const cs = 20 + cp.size * 28;
          ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha})`;
          drawBlob(ctx, ccx, ccy, cs, cs * 0.25, cp.blobSeed, 6);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha * 0.5})`;
          drawBlob(ctx, ccx + cs * 0.4, ccy + 2, cs * 0.45, cs * 0.15, cp.blobSeed + 1, 5);
          ctx.fill();
        }
      }

      // === LAYER 6: City lights ===
      if (civLvl > 0.05) {
        const rng2 = seededRandom(seed + 42);
        const numCities = Math.floor(3 + civLvl * 18);
        for (let i = 0; i < numCities; i++) {
          const rawA = rng2() * Math.PI * 2;
          const rawD = rng2() * r * 0.78;
          const [lx, ly] = rotPt(cx, cy, cx + Math.cos(rawA) * rawD, cy + Math.sin(rawA) * rawD, phase);
          const citySize = 1.5 + rng2() * 2.5 * civLvl;
          const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, citySize * 4);
          glow.addColorStop(0, `rgba(255, 240, 140, ${0.3 + rng2() * 0.35})`);
          glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(lx, ly, citySize * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 248, 195, ${0.5 + rng2() * 0.3})`;
          ctx.beginPath();
          ctx.arc(lx, ly, citySize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === LAYER 7: Landmarks ===
      const drawLandmark = (idx: number, drawFn: (x: number, y: number) => void) => {
        const lp = landmarkPositions[idx % landmarkPositions.length];
        const [lx, ly] = rotPt(cx, cy,
          cx + Math.cos(lp.angle) * lp.dist * r,
          cy + Math.sin(lp.angle) * lp.dist * r, phase);
        drawFn(lx, ly);
      };

      // Castle
      if (has('castle')) {
        const tier = has('kingdom') ? (has('city') ? 2 : 1) : 0;
        drawLandmark(0, (lx, ly) => {
          const s = 14 + tier * 6;
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(lx - s + 2, ly - s * 0.45, s * 2, s);
          // Body
          ctx.fillStyle = 'rgba(175, 152, 110, 0.95)';
          ctx.fillRect(lx - s, ly - s * 0.5, s * 2, s);
          ctx.fillRect(lx - s, ly - s * 1.3, s * 0.45, s * 0.9);
          ctx.fillRect(lx + s * 0.55, ly - s * 1.3, s * 0.45, s * 0.9);
          if (tier >= 1) {
            ctx.fillRect(lx - s * 0.22, ly - s * 1.6, s * 0.44, s * 1.1);
            ctx.fillStyle = 'rgba(210, 50, 50, 0.9)';
            ctx.fillRect(lx + s * 0.22, ly - s * 1.6, s * 0.35, s * 0.3);
          }
          if (tier >= 2) {
            ctx.strokeStyle = 'rgba(145, 122, 88, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(lx - s * 1.5, ly - s * 0.35, s * 3, s * 1.3);
          }
        });
      }

      // Pyramid
      if (has('pyramid')) {
        drawLandmark(1, (lx, ly) => {
          const s = 22;
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath(); ctx.moveTo(lx + 3, ly - s + 3); ctx.lineTo(lx + s + 3, ly + s * 0.5 + 2); ctx.lineTo(lx - s + 3, ly + s * 0.5 + 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(218, 198, 130, 0.9)';
          ctx.beginPath(); ctx.moveTo(lx, ly - s); ctx.lineTo(lx + s, ly + s * 0.5); ctx.lineTo(lx - s, ly + s * 0.5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(205, 185, 115, 0.7)';
          ctx.beginPath(); ctx.moveTo(lx + s * 1.2, ly - s * 0.5); ctx.lineTo(lx + s * 1.8, ly + s * 0.5); ctx.lineTo(lx + s * 0.6, ly + s * 0.5); ctx.closePath(); ctx.fill();
        });
      }

      // Airport
      if (has('airplane')) {
        drawLandmark(4, (lx, ly) => {
          ctx.fillStyle = 'rgba(75, 75, 88, 0.85)';
          ctx.fillRect(lx - 28, ly - 3, 56, 6);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(lx - 24, ly); ctx.lineTo(lx + 24, ly); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(155, 155, 165, 0.7)';
          ctx.fillRect(lx - 8, ly + 5, 16, 8);
        });
      }

      // Rocket
      if (has('rocket')) {
        drawLandmark(5, (lx, ly) => {
          ctx.fillStyle = 'rgba(100, 100, 112, 0.85)';
          ctx.beginPath(); ctx.arc(lx, ly, 11, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(215, 215, 225, 0.95)';
          ctx.fillRect(lx - 2.5, ly - 18, 5, 16);
          const fp2 = 0.4 + 0.6 * Math.sin(t * 0.005);
          ctx.fillStyle = `rgba(255, 140, 30, ${0.6 * fp2})`;
          ctx.beginPath(); ctx.moveTo(lx - 4, ly - 2); ctx.lineTo(lx + 4, ly - 2); ctx.lineTo(lx, ly + 6); ctx.closePath(); ctx.fill();
        });
      }

      // Village/House
      if (has('village')) {
        drawLandmark(6, (lx, ly) => {
          const s = 12;
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(lx - s * 0.55, ly - s * 0.1, s * 1.2, s * 0.7);
          ctx.fillStyle = 'rgba(190, 160, 118, 0.95)';
          ctx.fillRect(lx - s * 0.6, ly - s * 0.15, s * 1.2, s * 0.7);
          ctx.fillStyle = 'rgba(170, 55, 35, 0.9)';
          ctx.beginPath(); ctx.moveTo(lx, ly - s * 0.7); ctx.lineTo(lx + s * 0.8, ly - s * 0.15); ctx.lineTo(lx - s * 0.8, ly - s * 0.15); ctx.closePath(); ctx.fill();
        });
      }

      // City skyline
      if (has('city')) {
        drawLandmark(7, (lx, ly) => {
          const s = 16;
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(lx - s + 2, ly - s * 1.55, s * 0.35, s * 1.9);
          ctx.fillStyle = 'rgba(105, 115, 132, 0.9)';
          ctx.fillRect(lx - s, ly - s * 1.2, s * 0.35, s * 1.5);
          ctx.fillRect(lx - s * 0.35, ly - s * 0.8, s * 0.3, s * 1.1);
          ctx.fillRect(lx + s * 0.1, ly - s * 1.6, s * 0.28, s * 1.9);
          ctx.fillRect(lx + s * 0.5, ly - s * 0.6, s * 0.4, s * 0.9);
          ctx.fillStyle = 'rgba(255, 240, 120, 0.65)';
          const wr = seededRandom(seed + 888);
          for (let ww = 0; ww < 12; ww++) {
            ctx.fillRect(lx - s + wr() * s * 1.8, ly - s * 1.4 + wr() * s * 1.6, 1.5, 1.5);
          }
        });
      }

      // Bridge
      if (has('bridge')) {
        drawLandmark(9, (lx, ly) => {
          ctx.fillStyle = 'rgba(155, 155, 150, 0.9)';
          ctx.fillRect(lx - 22, ly - 2, 44, 5);
          ctx.fillRect(lx - 20, ly - 9, 4, 9);
          ctx.fillRect(lx + 16, ly - 9, 4, 9);
          ctx.fillRect(lx - 2, ly - 7, 4, 7);
          // Cables
          ctx.strokeStyle = 'rgba(130,130,125,0.6)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(lx - 18, ly - 9); ctx.quadraticCurveTo(lx, ly - 3, lx + 18, ly - 9);
          ctx.stroke();
        });
      }

      // === LAYER 8: Day/Night terminator — makes rotation obvious ===
      const terminatorAngle = phase * 0.8 + Math.PI * 0.75;
      const nightGrad = ctx.createLinearGradient(
        cx + Math.cos(terminatorAngle) * r * 1.2,
        cy + Math.sin(terminatorAngle) * r * 1.2,
        cx - Math.cos(terminatorAngle) * r * 1.2,
        cy - Math.sin(terminatorAngle) * r * 1.2,
      );
      nightGrad.addColorStop(0, `rgba(0, 0, 15, 0)`);
      nightGrad.addColorStop(0.42, `rgba(0, 0, 15, 0)`);
      nightGrad.addColorStop(0.58, `rgba(0, 0, 15, ${0.25 + (1 - brightLvl) * 0.2})`);
      nightGrad.addColorStop(1, `rgba(0, 0, 15, ${0.45 + (1 - brightLvl) * 0.25})`);
      ctx.fillStyle = nightGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // === LAYER 9: Spherical lighting (3D) ===
      const sphereLight = ctx.createRadialGradient(
        cx - r * 0.32, cy - r * 0.32, r * 0.06,
        cx + r * 0.1, cy + r * 0.1, r
      );
      sphereLight.addColorStop(0, `rgba(255, 255, 240, ${0.08 + brightLvl * 0.1})`);
      sphereLight.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      sphereLight.addColorStop(1, `rgba(0, 0, 10, ${0.15 + (1 - brightLvl) * 0.1})`);
      ctx.fillStyle = sphereLight;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      ctx.restore(); // End planet clip

      // === POST-CLIP: Atmosphere halo ===
      if (atmosLvl > 0.01 || pollLvl > 0.05) {
        const haloColor = pollLvl > 0.15
          ? `rgba(120,80,20,${Math.min(0.35, atmosLvl * 0.25 + pollLvl * 0.15)})`
          : `rgba(90,145,255,${Math.min(0.28, atmosLvl * 0.22)})`;
        const haloGrad = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 16);
        haloGrad.addColorStop(0, haloColor);
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Air rings
      if (airLvl > 0.02) {
        const ringCount = Math.max(1, Math.floor(airLvl * 4));
        for (let i = 0; i < ringCount; i++) {
          const grow = 8 + i * 6;
          ctx.strokeStyle = `rgba(153, 194, 255, ${Math.max(0.03, airLvl * 0.14 - i * 0.015)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r + grow, r + grow * 0.88, phase * 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Magic glow
      if (magicLvl > 0.05) {
        const gp = 0.5 + 0.5 * Math.sin(t * 0.002);
        const mg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r + 20);
        mg.addColorStop(0, 'rgba(150,100,255,0)');
        mg.addColorStop(0.8, `rgba(150,100,255,${magicLvl * 0.18 * gp})`);
        mg.addColorStop(1, 'transparent');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Brightness aura
      if (brightLvl > 0.05) {
        const la = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.25, cx, cy, r + 35);
        la.addColorStop(0, `rgba(255, 244, 170, ${0.1 + brightLvl * 0.2})`);
        la.addColorStop(1, 'transparent');
        ctx.fillStyle = la;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 35, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rim light
      const rimGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.5, cx, cy, r);
      rimGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
      rimGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
      rimGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
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
