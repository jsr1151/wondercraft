import { useEffect, useRef } from 'react';
import type { WorldInfluence } from '../types';
import './PlanetCanvas.css';

interface PlanetCanvasProps {
  worldInfluence: WorldInfluence;
  seed: number;
  discoveredElements?: Set<string>;
  emojiMap?: Record<string, string>;
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

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function toLevel(value: number) {
  return clamp(value / 32, 0, 1);
}

function projectToSphere(
  cx: number, cy: number, radius: number,
  longitude: number, latitude: number,
  phase: number, yScale = 0.9,
): SurfacePoint {
  const lon = longitude + phase;
  const lat = clamp(latitude, -1.25, 1.25);
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const z = Math.cos(lon) * cosLat;
  const x = cx + Math.sin(lon) * cosLat * radius;
  const y = cy + sinLat * radius * yScale;
  const visible = z > -0.06;
  const alpha = clamp((z + 0.06) / 1.06, 0, 1);
  const scale = 0.45 + 0.55 * clamp((z + 1) / 2, 0, 1);
  return { x, y, z, alpha, scale, visible };
}

/** Organic blob using quadratic bezier curves */
function drawBlobPath(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  rx: number, ry: number,
  blobSeed: number, lobes = 7,
) {
  const rng = seededRandom(blobSeed);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const v = 0.72 + rng() * 0.56;
    pts.push({ x: px + Math.cos(a) * rx * v, y: py + Math.sin(a) * ry * v });
  }
  ctx.beginPath();
  const last = pts[lobes - 1];
  ctx.moveTo((pts[0].x + last.x) / 2, (pts[0].y + last.y) / 2);
  for (let i = 0; i < lobes; i++) {
    const next = pts[(i + 1) % lobes];
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + next.x) / 2, (pts[i].y + next.y) / 2);
  }
  ctx.closePath();
}

/** Draw a filled blob on the sphere surface */
function fillSphereBlob(
  ctx: CanvasRenderingContext2D, p: SurfacePoint,
  rx: number, ry: number, blobSeed: number, lobes = 7,
) {
  drawBlobPath(ctx, p.x, p.y, rx * p.scale, ry * p.scale, blobSeed, lobes);
  ctx.fill();
}

/** Draw a stroked blob on the sphere surface */
function strokeSphereBlob(
  ctx: CanvasRenderingContext2D, p: SurfacePoint,
  rx: number, ry: number, blobSeed: number, lobes = 7,
) {
  drawBlobPath(ctx, p.x, p.y, rx * p.scale, ry * p.scale, blobSeed, lobes);
  ctx.stroke();
}

/** Draw an emoji glyph on the sphere surface with shadow + depth fade */
function drawEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  p: SurfacePoint,
  baseSize: number,
) {
  if (!p.visible) return;
  const size = baseSize * p.scale;
  ctx.save();
  ctx.globalAlpha = p.alpha;
  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4 * p.scale;
  ctx.shadowOffsetX = 1.5 * p.scale;
  ctx.shadowOffsetY = 1.5 * p.scale;
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, p.x, p.y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();
}

export function PlanetCanvas({ worldInfluence: wi, seed, discoveredElements, emojiMap }: PlanetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const wiRef = useRef(wi);
  const discoveredRef = useRef(discoveredElements);
  const emojiMapRef = useRef(emojiMap);
  wiRef.current = wi;
  discoveredRef.current = discoveredElements;
  emojiMapRef.current = emojiMap;

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

    // ---------- PRE-GENERATE GEOMETRY ----------

    const stars = Array.from({ length: 140 }, () => ({
      x: rng() * W, y: rng() * H,
      radius: 0.3 + rng() * 1.3,
      twinkle: rng() * Math.PI * 2,
    }));

    // Continents with sub-blobs for coastline variation
    const continentCount = 3 + Math.floor(rng() * 4);
    const continents = Array.from({ length: continentCount }, () => {
      const lon = rng() * Math.PI * 2;
      const lat = (rng() - 0.5) * 1.8;
      const baseRx = 40 + rng() * 55;
      const baseRy = baseRx * (0.5 + rng() * 0.5);
      const blobSeed = Math.floor(rng() * 100000);
      const subCount = 2 + Math.floor(rng() * 4);
      const subBlobs = Array.from({ length: subCount }, () => ({
        lonOff: (rng() - 0.5) * 0.45,
        latOff: (rng() - 0.5) * 0.35,
        rx: 18 + rng() * 38,
        ry: 12 + rng() * 28,
        blobSeed: Math.floor(rng() * 100000),
      }));
      return { lon, lat, rx: baseRx, ry: baseRy, blobSeed, subBlobs };
    });

    // Terrain feature positions (lon/lat based)
    const featurePositions = Array.from({ length: 40 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.6,
      size: 0.6 + rng() * 0.8,
      blobSeed: Math.floor(rng() * 100000),
    }));

    // Landmark positions
    const landmarkPositions = Array.from({ length: 12 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.2,
    }));

    // Clouds with organic shapes
    const clouds = Array.from({ length: 16 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.4,
      rx: 20 + rng() * 44,
      ry: 8 + rng() * 16,
      drift: 0.4 + rng() * 0.8,
      blobSeed: Math.floor(rng() * 100000),
    }));

    // City lights
    const cityPoints = Array.from({ length: 36 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.2,
      strength: 0.5 + rng() * 0.9,
    }));

    // Mountain ridge positions (earthy-based, not discovery-gated)
    const ridgePositions = Array.from({ length: 18 }, () => ({
      lon: rng() * Math.PI * 2,
      lat: (rng() - 0.5) * 1.5,
      size: 3 + rng() * 12,
      angle: rng() * Math.PI,
    }));

    const has = (id: string) => !!discoveredRef.current?.has(id);
    const emoji = (id: string) => emojiMapRef.current?.[id] ?? '';

    // ---------- DRAW LOOP ----------
    const draw = (t: number) => {
      const w = wiRef.current;
      const water = toLevel(w.water);
      const heat = toLevel(w.heat);
      const cold = toLevel(w.cold);
      const veg = toLevel(w.vegetation);
      const earth = toLevel(w.earthy);
      const civ = toLevel(w.civilization);
      const pollution = toLevel(w.pollution);
      const bright = toLevel(w.brightness);
      const atmosphere = toLevel(w.atmosphere);
      const magic = toLevel(w.magic);
      const air = toLevel(w.air);

      const phase = t * 0.0002;
      const cloudPhase = phase * 1.25;

      ctx.clearRect(0, 0, W, H);

      // === BACKGROUND ===
      const bg = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.8);
      bg.addColorStop(0, '#08142b');
      bg.addColorStop(0.62, '#050b17');
      bg.addColorStop(1, '#020409');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const s of stars) {
        const twinkle = 0.35 + 0.65 * Math.sin(t * 0.001 + s.twinkle);
        ctx.globalAlpha = twinkle * 0.75;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // === PLANET CLIP ===
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // === OCEAN BASE ===
      const oceanR = Math.round(14 + (1 - water) * 48 + heat * 25);
      const oceanG = Math.round(25 + (1 - water) * 38 + water * 45);
      const oceanB = Math.round(60 + water * 130 + cold * 30);
      const bodyGrad = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.38, r * 0.14, cx, cy, r * 1.15);
      bodyGrad.addColorStop(0, `rgb(${clamp(oceanR + 20, 0, 255)},${clamp(oceanG + 24, 0, 255)},${clamp(oceanB + 28, 0, 255)})`);
      bodyGrad.addColorStop(0.62, `rgb(${oceanR},${oceanG},${oceanB})`);
      bodyGrad.addColorStop(1, `rgb(${Math.max(8, oceanR - 42)},${Math.max(12, oceanG - 36)},${Math.max(22, oceanB - 34)})`);
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // Ocean depth shimmer
      if (water > 0.05) {
        const shimPhase = t * 0.0004;
        for (let i = 0; i < 5; i++) {
          const sa = shimPhase + i * 1.26;
          const sp = projectToSphere(cx, cy, r * 0.85, sa, i * 0.3 - 0.6, phase * 0.3);
          if (!sp.visible) continue;
          ctx.fillStyle = `rgba(30, 80, 170, ${(0.04 + water * 0.04) * sp.alpha})`;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, (50 + i * 15) * sp.scale, (20 + i * 8) * sp.scale, sa, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Brightness/darkness overlay
      if (bright < 0.65) {
        ctx.fillStyle = `rgba(4, 6, 16, ${clamp(0.65 - bright, 0, 0.7)})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // === CONTINENTS (organic blob shapes with sub-blobs) ===
      const landR = Math.round(50 + bright * 70 + heat * 40 + veg * 10);
      const landG = Math.round(58 + bright * 55 + veg * 80 - pollution * 15);
      const landB = Math.round(32 + bright * 30 + cold * 30 - heat * 10);
      const landAlpha = 0.5 + earth * 0.35 + toLevel(w.life) * 0.15;

      for (const c of continents) {
        const p = projectToSphere(cx, cy, r * 0.98, c.lon, c.lat, phase);
        if (!p.visible) continue;

        // Main continent body (blob shape)
        ctx.fillStyle = `rgba(${clamp(landR, 20, 220)},${clamp(landG, 30, 210)},${clamp(landB, 15, 140)},${clamp(landAlpha * p.alpha, 0.1, 1)})`;
        fillSphereBlob(ctx, p, c.rx, c.ry, c.blobSeed, 9);

        // Sub-blobs for coastline variation
        for (const sub of c.subBlobs) {
          const sp = projectToSphere(cx, cy, r * 0.98, c.lon + sub.lonOff, c.lat + sub.latOff, phase);
          if (!sp.visible) continue;
          ctx.fillStyle = `rgba(${clamp(landR, 20, 220)},${clamp(landG, 30, 210)},${clamp(landB, 15, 140)},${clamp(landAlpha * sp.alpha, 0.1, 1)})`;
          fillSphereBlob(ctx, sp, sub.rx, sub.ry, sub.blobSeed, 7);
        }

        // Vegetation tint on continents
        if (veg > 0.08) {
          const vegGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, c.rx * p.scale * 0.8);
          vegGrad.addColorStop(0, `rgba(25, ${90 + Math.round(veg * 70)}, 35, ${veg * 0.35 * p.alpha})`);
          vegGrad.addColorStop(1, 'rgba(25, 80, 30, 0)');
          ctx.fillStyle = vegGrad;
          fillSphereBlob(ctx, p, c.rx * 0.9, c.ry * 0.85, c.blobSeed + 1, 8);
        }

        // Coastline highlight
        if (water > 0.05) {
          ctx.strokeStyle = `rgba(100, 180, 240, ${(0.08 + water * 0.14) * p.alpha})`;
          ctx.lineWidth = 1.5;
          strokeSphereBlob(ctx, p, c.rx + 2, c.ry + 2, c.blobSeed, 9);
        }
      }

      // === MOUNTAIN RIDGES (earthy-based, triangles) ===
      if (earth > 0.08) {
        const ridgeCount = Math.floor(3 + earth * 12);
        for (let i = 0; i < ridgeCount && i < ridgePositions.length; i++) {
          const rp = ridgePositions[i];
          const p = projectToSphere(cx, cy, r * 0.97, rp.lon, rp.lat, phase);
          if (!p.visible) continue;
          const s = rp.size * p.scale;
          ctx.fillStyle = `rgba(118, 96, 74, ${(0.12 + earth * 0.18) * p.alpha})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x + s * 0.8, p.y + s * 0.65);
          ctx.lineTo(p.x - s * 0.9, p.y + s * 0.55);
          ctx.closePath();
          ctx.fill();
        }
      }

      // === ICE CAPS (blob shapes at poles) ===
      if (cold > 0.05 || has('ice') || has('snow')) {
        const iceAlpha = Math.min(0.85, cold * 2);
        const iceSize = cold * 45;
        ctx.fillStyle = `rgba(220, 235, 255, ${iceAlpha})`;
        const north = projectToSphere(cx, cy, r * 0.98, 0, -1.12, 0);
        fillSphereBlob(ctx, north, r * 0.55, iceSize, seed + 9999, 10);
        const south = projectToSphere(cx, cy, r * 0.98, 0, 1.12, 0);
        fillSphereBlob(ctx, south, r * 0.5, iceSize * 0.7, seed + 9998, 10);
      }

      // === DISCOVERY-GATED TERRAIN FEATURES ===

      // Lakes — gradient water with depth and specular
      if (has('lake')) {
        for (let i = 0; i < 4; i++) {
          const fp = featurePositions[i];
          const p = projectToSphere(cx, cy, r * 0.97, fp.lon, fp.lat, phase);
          if (!p.visible) continue;
          const s = (14 + fp.size * 22) * p.scale;
          const wg = ctx.createRadialGradient(p.x - s * 0.1, p.y - s * 0.1, 1, p.x, p.y, s * 0.8);
          wg.addColorStop(0, `rgba(8, 38, 130, ${0.7 * p.alpha})`);
          wg.addColorStop(0.5, `rgba(18, 70, 165, ${0.5 * p.alpha})`);
          wg.addColorStop(1, `rgba(40, 115, 200, ${0.08 * p.alpha})`);
          ctx.fillStyle = wg;
          fillSphereBlob(ctx, p, 14 + fp.size * 22, (14 + fp.size * 22) * 0.55, fp.blobSeed, 9);
          // Sun glint
          const shimmer = (0.12 + 0.1 * Math.sin(t * 0.002 + i)) * p.alpha;
          ctx.fillStyle = `rgba(180, 220, 255, ${shimmer})`;
          ctx.beginPath();
          ctx.ellipse(p.x - s * 0.15, p.y - s * 0.12, s * 0.15, s * 0.04, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rivers — bezier curves between projected points
      if (has('river')) {
        for (let i = 4; i < 7; i++) {
          const fp = featurePositions[i];
          const ps = projectToSphere(cx, cy, r * 0.97, fp.lon, fp.lat, phase);
          const pe = projectToSphere(cx, cy, r * 0.97, fp.lon + 0.6, fp.lat + 0.25, phase);
          if (!ps.visible && !pe.visible) continue;
          const a = Math.max(ps.alpha, pe.alpha);
          const pm1 = projectToSphere(cx, cy, r * 0.97, fp.lon + 0.2, fp.lat + 0.08, phase);
          const pm2 = projectToSphere(cx, cy, r * 0.97, fp.lon + 0.4, fp.lat + 0.18, phase);
          // Glow
          ctx.strokeStyle = `rgba(25, 85, 190, ${0.18 * a})`;
          ctx.lineWidth = (4 + fp.size * 2) * ((ps.scale + pe.scale) / 2);
          ctx.beginPath(); ctx.moveTo(ps.x, ps.y); ctx.bezierCurveTo(pm1.x, pm1.y, pm2.x, pm2.y, pe.x, pe.y); ctx.stroke();
          // Core
          ctx.strokeStyle = `rgba(30, 110, 210, ${0.5 * a})`;
          ctx.lineWidth = (1.2 + fp.size) * ((ps.scale + pe.scale) / 2);
          ctx.beginPath(); ctx.moveTo(ps.x, ps.y); ctx.bezierCurveTo(pm1.x, pm1.y, pm2.x, pm2.y, pe.x, pe.y); ctx.stroke();
        }
      }

      // Forest clusters — emoji trees or fallback crowns
      if (has('forest')) {
        const treeEmoji = emoji('forest') || emoji('tree');
        for (let i = 7; i < 15; i++) {
          const fp = featurePositions[i];
          const p = projectToSphere(cx, cy, r * 0.97, fp.lon, fp.lat, phase);
          if (!p.visible) continue;
          const s = (12 + fp.size * 16) * p.scale;
          // Dark understory blob
          ctx.fillStyle = `rgba(6, 38, 10, ${0.4 * p.alpha})`;
          fillSphereBlob(ctx, p, 12 + fp.size * 16, (12 + fp.size * 16) * 0.8, fp.blobSeed, 7);
          if (treeEmoji) {
            // Scatter emoji trees across the cluster
            const tRng = seededRandom(fp.blobSeed + 200);
            const treeCount = 3 + Math.floor(fp.size * 5);
            for (let j = 0; j < treeCount; j++) {
              const ox = (tRng() - 0.5) * s * 1.2;
              const oy = (tRng() - 0.5) * s * 0.8;
              const tp: SurfacePoint = { ...p, x: p.x + ox, y: p.y + oy };
              drawEmoji(ctx, treeEmoji, tp, 10 + fp.size * 6);
            }
          } else {
            const tRng = seededRandom(fp.blobSeed + 200);
            const treeCount = 8 + Math.floor(fp.size * 12);
            for (let j = 0; j < treeCount; j++) {
              const ox = (tRng() - 0.5) * s * 1.4;
              const oy = (tRng() - 0.5) * s;
              const tr = (2 + tRng() * 4.5) * p.scale;
              const g = 50 + Math.floor(tRng() * 100);
              ctx.fillStyle = `rgba(${5 + Math.floor(tRng() * 20)}, ${g}, ${8 + Math.floor(tRng() * 18)}, ${(0.35 + tRng() * 0.3) * p.alpha})`;
              ctx.beginPath();
              ctx.arc(p.x + ox, p.y + oy, tr, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = `rgba(60, 170, 70, ${0.12 * p.alpha})`;
            const hp: SurfacePoint = { ...p, x: p.x - s * 0.2, y: p.y - s * 0.15 };
            fillSphereBlob(ctx, hp, (12 + fp.size * 16) * 0.4, (12 + fp.size * 16) * 0.3, fp.blobSeed + 1, 5);
          }
        }
      }

      // Mountain ranges — emoji or geometric peaks
      if (has('mountain')) {
        const mtEmoji = emoji('mountain');
        for (let i = 15; i < 20; i++) {
          const fp = featurePositions[i];
          const p = projectToSphere(cx, cy, r * 0.97, fp.lon, fp.lat, phase);
          if (!p.visible) continue;
          if (mtEmoji) {
            drawEmoji(ctx, mtEmoji, p, 22 + fp.size * 14);
          } else {
            const s = (14 + fp.size * 16) * p.scale;
            const mrng = seededRandom(fp.blobSeed);
            const peakCount = 3 + Math.floor(mrng() * 2);
            const rangeWidth = s * 2.5;
            const startX = p.x - rangeWidth / 2;
            ctx.fillStyle = `rgba(95, 78, 55, ${0.55 * p.alpha})`;
            ctx.beginPath();
            ctx.moveTo(startX, p.y + s * 0.5);
            for (let pk = 0; pk < peakCount; pk++) {
              const px = startX + (pk + 0.5) * (rangeWidth / peakCount);
              const peakH = s * (0.6 + mrng() * 0.5);
              ctx.lineTo(px - s * 0.2, p.y + s * 0.1 * mrng());
              ctx.lineTo(px, p.y - peakH);
              ctx.lineTo(px + s * 0.2, p.y + s * 0.1 * mrng());
            }
            ctx.lineTo(startX + rangeWidth, p.y + s * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = `rgba(235, 245, 255, ${0.6 * p.alpha})`;
            const mrng2 = seededRandom(fp.blobSeed);
            for (let pk = 0; pk < peakCount; pk++) {
              const px = startX + (pk + 0.5) * (rangeWidth / peakCount);
              const peakH = s * (0.6 + mrng2() * 0.5);
              mrng2(); mrng2();
              const cap = s * 0.22;
              ctx.beginPath();
              ctx.moveTo(px, p.y - peakH);
              ctx.lineTo(px + cap * 0.35, p.y - peakH + cap);
              ctx.lineTo(px - cap * 0.35, p.y - peakH + cap);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }

      // Volcanoes — emoji or geometric with animated lava
      if (has('volcano')) {
        const volEmoji = emoji('volcano');
        for (let i = 20; i < 23; i++) {
          const fp = featurePositions[i];
          const p = projectToSphere(cx, cy, r * 0.97, fp.lon, fp.lat, phase);
          if (!p.visible) continue;
          if (volEmoji) {
            // Lava glow behind emoji
            const pulse = 0.4 + 0.6 * Math.sin(t * 0.003 + fp.lon);
            const glowR = (16 + fp.size * 10) * p.scale;
            const glow = ctx.createRadialGradient(p.x, p.y - glowR * 0.3, 0, p.x, p.y, glowR);
            glow.addColorStop(0, `rgba(255, 80, 20, ${0.35 * pulse * p.alpha})`);
            glow.addColorStop(1, 'rgba(255, 40, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2); ctx.fill();
            drawEmoji(ctx, volEmoji, p, 22 + fp.size * 12);
          } else {
            const s = (10 + fp.size * 12) * p.scale;
            ctx.fillStyle = `rgba(70, 45, 25, ${0.6 * p.alpha})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - s);
            ctx.lineTo(p.x + s * 0.9, p.y + s * 0.5);
            ctx.lineTo(p.x - s * 0.9, p.y + s * 0.5);
            ctx.closePath();
            ctx.fill();
            const pulse = 0.4 + 0.6 * Math.sin(t * 0.003 + fp.lon);
            ctx.fillStyle = `rgba(255, 70, 15, ${0.45 * pulse * p.alpha})`;
            const lp: SurfacePoint = { ...p, y: p.y - s * 0.6 };
            fillSphereBlob(ctx, lp, 10 + fp.size * 12, (10 + fp.size * 12) * 0.6, fp.blobSeed, 5);
          }
        }
      }

      // Deserts — blob base + optional emoji cactus
      if (has('desert')) {
        const desertEmoji = emoji('desert');
        for (let i = 23; i < 27; i++) {
          const fp = featurePositions[i];
          const p = projectToSphere(cx, cy, r * 0.97, fp.lon, fp.lat, phase);
          if (!p.visible) continue;
          ctx.fillStyle = `rgba(215, 185, 115, ${0.4 * p.alpha})`;
          fillSphereBlob(ctx, p, 14 + fp.size * 18, (14 + fp.size * 18) * 0.55, fp.blobSeed, 8);
          if (desertEmoji) {
            drawEmoji(ctx, desertEmoji, p, 16 + fp.size * 8);
          }
        }
      }

      // Snow patches
      if (has('snow') || has('ice')) {
        for (let i = 27; i < 31; i++) {
          const fp = featurePositions[i];
          const p = projectToSphere(cx, cy, r * 0.97, fp.lon, fp.lat, phase);
          if (!p.visible) continue;
          ctx.fillStyle = `rgba(230, 242, 255, ${0.35 * p.alpha})`;
          fillSphereBlob(ctx, p, 12 + fp.size * 12, (12 + fp.size * 12) * 0.65, fp.blobSeed, 7);
        }
      }

      // Coastline arcs
      if (has('ocean') || has('island')) {
        for (let i = 31; i < 35; i++) {
          const fp = featurePositions[i];
          const p = projectToSphere(cx, cy, r * fp.size * 0.5, fp.lon, fp.lat, phase);
          if (!p.visible) continue;
          ctx.strokeStyle = `rgba(80, 170, 240, ${0.25 * p.alpha})`;
          ctx.lineWidth = 1.8 * p.scale;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 30 * p.scale, 0, 0.8);
          ctx.stroke();
        }
      }

      // === POLLUTION OVERLAY ===
      if (pollution > 0.05) {
        ctx.fillStyle = `rgba(60, 52, 38, ${pollution * 0.5})`;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // === CLOUDS (organic blobs) ===
      if (atmosphere > 0.01 || water > 0.08) {
        const cloudAlpha = clamp(0.06 + atmosphere * 0.2 + water * 0.04, 0, 0.28);
        const numClouds = Math.floor(2 + atmosphere * 10 + water * 4);
        for (let i = 0; i < numClouds && i < clouds.length; i++) {
          const cloud = clouds[i];
          const p = projectToSphere(cx, cy, r * 1.015, cloud.lon, cloud.lat, cloudPhase * cloud.drift, 0.92);
          if (!p.visible) continue;
          ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha * p.alpha})`;
          fillSphereBlob(ctx, p, cloud.rx, cloud.ry * 0.35, cloud.blobSeed, 6);
          // Secondary wisp
          ctx.fillStyle = `rgba(255, 255, 255, ${cloudAlpha * 0.5 * p.alpha})`;
          const wp: SurfacePoint = { ...p, x: p.x + cloud.rx * p.scale * 0.4, y: p.y + 2 * p.scale };
          fillSphereBlob(ctx, wp, cloud.rx * 0.45, cloud.ry * 0.2, cloud.blobSeed + 1, 5);
        }
      }

      // === CITY LIGHTS ===
      if (civ > 0.05) {
        const cityCount = Math.floor(3 + civ * 22);
        for (let i = 0; i < cityCount && i < cityPoints.length; i++) {
          const city = cityPoints[i];
          const p = projectToSphere(cx, cy, r * 0.985, city.lon, city.lat, phase);
          if (!p.visible) continue;
          const citySize = (1.5 + city.strength * 2.5 * civ) * p.scale;
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, citySize * 4);
          glow.addColorStop(0, `rgba(255, 240, 140, ${(0.3 + city.strength * 0.35) * p.alpha})`);
          glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, citySize * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 248, 195, ${(0.5 + city.strength * 0.3) * p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, citySize * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === LANDMARKS (emoji-based with glow effects) ===
      const drawLandmarkEmoji = (idx: number, elementId: string, fallbackEmoji: string, baseSize: number, glowRgb?: string) => {
        const lp = landmarkPositions[idx % landmarkPositions.length];
        const p = projectToSphere(cx, cy, r * 0.96, lp.lon, lp.lat, phase);
        if (!p.visible) return;
        const e = emoji(elementId) || fallbackEmoji;
        if (glowRgb) {
          const gr = baseSize * 0.6 * p.scale;
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr);
          glow.addColorStop(0, `rgba(${glowRgb}, ${0.3 * p.alpha})`);
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(p.x, p.y, gr, 0, Math.PI * 2); ctx.fill();
        }
        drawEmoji(ctx, e, p, baseSize);
      };

      if (has('castle'))   drawLandmarkEmoji(0, 'castle', '🏰', 28, '175,152,110');
      if (has('pyramid'))  drawLandmarkEmoji(1, 'pyramid', '🔺', 26, '218,198,130');
      if (has('airplane')) drawLandmarkEmoji(4, 'airplane', '✈️', 22, '120,130,150');
      if (has('rocket'))   drawLandmarkEmoji(5, 'rocket', '🚀', 24, '255,140,30');
      if (has('village'))  drawLandmarkEmoji(6, 'village', '🏘️', 24, '190,160,118');
      if (has('city'))     drawLandmarkEmoji(7, 'city', '🏙️', 28, '105,115,132');
      if (has('bridge'))   drawLandmarkEmoji(9, 'bridge', '🌉', 24, '155,155,150');
      if (has('lighthouse')) drawLandmarkEmoji(2, 'lighthouse', '🗼', 22, '255,240,140');
      if (has('hospital'))   drawLandmarkEmoji(3, 'hospital', '🏥', 22, '255,100,100');
      if (has('school'))     drawLandmarkEmoji(8, 'school', '🏫', 22, '150,120,90');
      if (has('factory'))    drawLandmarkEmoji(10, 'factory', '🏭', 24, '100,100,110');
      if (has('windmill'))   drawLandmarkEmoji(11, 'windmill', '🌬️', 22, '150,200,255');

      // === DAY/NIGHT TERMINATOR ===
      const terminator = phase + Math.PI * 0.72;
      const nightGrad = ctx.createLinearGradient(
        cx + Math.sin(terminator) * r * 1.2,
        cy + Math.cos(terminator) * r * 0.8,
        cx - Math.sin(terminator) * r * 1.2,
        cy - Math.cos(terminator) * r * 0.8,
      );
      nightGrad.addColorStop(0, 'rgba(0, 0, 16, 0)');
      nightGrad.addColorStop(0.42, 'rgba(0, 0, 16, 0)');
      nightGrad.addColorStop(0.58, `rgba(0, 0, 16, ${0.25 + (1 - bright) * 0.2})`);
      nightGrad.addColorStop(1, `rgba(0, 0, 16, ${0.45 + (1 - bright) * 0.25})`);
      ctx.fillStyle = nightGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // === SPHERICAL LIGHTING ===
      const sphereLight = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, r * 0.06, cx + r * 0.1, cy + r * 0.1, r);
      sphereLight.addColorStop(0, `rgba(255, 255, 240, ${0.08 + bright * 0.1})`);
      sphereLight.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      sphereLight.addColorStop(1, `rgba(0, 0, 10, ${0.15 + (1 - bright) * 0.1})`);
      ctx.fillStyle = sphereLight;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      ctx.restore(); // End planet clip

      // === RIM LIGHT ===
      const rimGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.5, cx, cy, r);
      rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
      rimGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = rimGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      // === ATMOSPHERE HALO ===
      if (atmosphere > 0.01 || pollution > 0.05) {
        const haloColor = pollution > 0.15
          ? `rgba(120, 80, 20, ${Math.min(0.35, atmosphere * 0.25 + pollution * 0.15)})`
          : `rgba(90, 145, 255, ${Math.min(0.28, atmosphere * 0.22)})`;
        const haloGrad = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 16);
        haloGrad.addColorStop(0, haloColor);
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Air rings
      if (air > 0.02) {
        const ringCount = Math.max(1, Math.floor(air * 4));
        for (let i = 0; i < ringCount; i++) {
          const grow = 8 + i * 6;
          ctx.strokeStyle = `rgba(153, 194, 255, ${Math.max(0.03, air * 0.14 - i * 0.015)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r + grow, (r + grow) * 0.88, phase * 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Magic glow
      if (magic > 0.05) {
        const gp = 0.5 + 0.5 * Math.sin(t * 0.002);
        const mg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r + 20);
        mg.addColorStop(0, 'rgba(150, 100, 255, 0)');
        mg.addColorStop(0.8, `rgba(150, 100, 255, ${magic * 0.18 * gp})`);
        mg.addColorStop(1, 'transparent');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Brightness aura
      if (bright > 0.05) {
        const la = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.25, cx, cy, r + 35);
        la.addColorStop(0, `rgba(255, 244, 170, ${0.1 + bright * 0.2})`);
        la.addColorStop(1, 'transparent');
        ctx.fillStyle = la;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 35, 0, Math.PI * 2);
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
