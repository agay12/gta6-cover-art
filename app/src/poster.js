// poster.js — the Vice Poster Forge cover-art engine.
// Draws a multi-panel GTA 6-style poster: duotone-graded photo panels, a Vice
// sunset sky with a striped sun on the horizon, a skyline and palm silhouettes,
// art-deco framing and stacked caption lettering. Everything is canvas-drawn:
// no network, no libraries.

export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    sky: ['#2a0b6b', '#8b1e8f', '#ff2d78', '#ff8a3c', '#ffd166'],
    duo: ['#160a3a', '#7a1f7e', '#ff2d78', '#ffc36b'],
    ink: '#1b0630',
    accent: '#ffd166',
  },
  neon: {
    name: 'Neon Night',
    sky: ['#040417', '#10103f', '#2b1a7a', '#b41f8f', '#ff5fa2'],
    duo: ['#050514', '#23236e', '#b41f8f', '#7df9ff'],
    ink: '#03030f',
    accent: '#7df9ff',
  },
  pastel: {
    name: 'Miami Pastel',
    sky: ['#ffd3ec', '#ffb5c8', '#ff8f7e', '#7ec8ff', '#ffe9a8'],
    duo: ['#3a2a5e', '#c86fa8', '#ff9d9d', '#ffe6b0'],
    ink: '#40204a',
    accent: '#7ec8ff',
  },
  heist: {
    name: 'Heist Gold',
    sky: ['#120b04', '#3d1f08', '#8a4a10', '#e08a1e', '#ffd76a'],
    duo: ['#170d05', '#5c3410', '#e08a1e', '#ffe9b3'],
    ink: '#120a03',
    accent: '#ffd76a',
  },
};

const SUN_STRIPES = 6;

function makeGradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function fitRect(w, h, dw, dh) {
  const s = Math.max(dw / w, dh / h);
  return { w: w * s, h: h * s };
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A luminance-based gradient map re-colours a panel into the palette's
// duotone, then a fine grain pass gives the printed-poster texture.
function duotone(ctx, x, y, w, h, grade, grain) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const stops = grade.duo;
  const lut = { r: [], g: [], b: [] };
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const f = t - k;
    for (const [ci, key] of [[0, 'r'], [1, 'g'], [2, 'b']]) {
      const a = parseInt(stops[k].slice(1 + ci * 2, 3 + ci * 2), 16);
      const b = parseInt(stops[k + 1].slice(1 + ci * 2, 3 + ci * 2), 16);
      lut[key][i] = a + (b - a) * f;
    }
  }
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.max(0, Math.min(255, Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)));
    d[i] = lut.r[lum];
    d[i + 1] = lut.g[lum];
    d[i + 2] = lut.b[lum];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, x, y);
  if (grain > 0) {
    ctx.save();
    ctx.globalAlpha = grain;
    ctx.fillStyle = '#000';
    for (let gy = y; gy < y + h; gy += 4) {
      for (let gx = x + (((gy / 4) | 0) % 2) * 4; gx < x + w; gx += 8) ctx.fillRect(gx, gy, 2, 2);
    }
    ctx.restore();
  }
}

// The striped sun sits on the horizon inside the title band, so the lettering
// reads on top of it the way the poster style wants.
function drawSun(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = makeGradient(ctx, cx, cy - r, cx, cy + r, [grade.accent, grade.sky[3], grade.sky[2]]);
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = grade.sky[1];
  const band = (r * 2) / (SUN_STRIPES * 2 + 1);
  for (let i = 0; i < SUN_STRIPES; i++) {
    ctx.globalAlpha = 0.5 + i * 0.08;
    ctx.fillRect(cx - r, cy + i * band * 2, r * 2, band * (1 + i * 0.4));
  }
  ctx.restore();
  // soft bloom
  const g = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.9);
  g.addColorStop(0, 'rgba(255,180,90,.35)');
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
}

function panelRects(layout, pad, top, fw, fh) {
  const gap = pad * 0.35;
  const r = pad * 0.18;
  const mk = (x, y, w, h) => ({ x, y, w, h, r });
  const rects = [];
  if (layout === 'hero3') {
    const side = (fh - gap * 2) / 3;
    rects.push(mk(pad, top, fw - side - gap, fh, r));
    for (let i = 0; i < 3; i++) rects.push(mk(pad + fw - side, top + i * (side + gap), side, side, r));
  } else if (layout === 'grid4') {
    const w2 = (fw - gap) / 2;
    const h2 = (fh - gap) / 2;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) rects.push(mk(pad + j * (w2 + gap), top + i * (h2 + gap), w2, h2, r));
    }
  } else if (layout === 'twin') {
    const w2 = (fw - gap) / 2;
    rects.push(mk(pad, top, w2, fh, r), mk(pad + w2 + gap, top, w2, fh, r));
  } else {
    rects.push(mk(pad, top, fw, fh, r));
  }
  return rects;
}

function skyline(ctx, x, y, w, h, grade) {
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = grade.ink;
  let cx = x;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (cx < x + w) {
    const bw = w * (0.03 + rnd() * 0.05);
    const bh = h * (0.2 + rnd() * 0.75);
    ctx.fillRect(cx, y + h - bh, bw, bh);
    if (rnd() > 0.6) ctx.fillRect(cx + bw * 0.42, y + h - bh - bh * 0.2, bw * 0.16, bh * 0.2);
    cx += bw + w * 0.008;
  }
  ctx.restore();
}

// A palm: tapered trunk, a crown of filled drooping fronds.
function palm(ctx, x, baseY, size, ink, flip = 1) {
  const topX = x + size * 0.22 * flip;
  const topY = baseY - size * 0.92;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.05, baseY);
  ctx.quadraticCurveTo(x + size * 0.06 * flip, baseY - size * 0.5, topX - size * 0.02, topY);
  ctx.lineTo(topX + size * 0.045, topY);
  ctx.quadraticCurveTo(x + size * 0.16 * flip, baseY - size * 0.45, x + size * 0.06, baseY);
  ctx.closePath();
  ctx.fill();
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = (-170 + (i / (fronds - 1)) * 150) * Math.PI / 180;
    const droop = 0.55 + 0.12 * Math.abs(i - (fronds - 1) / 2);
    const len = size * (0.42 + 0.05 * Math.abs(i - 3));
    const mx = topX + Math.cos(a) * len * 0.55 * flip;
    const my = topY + Math.sin(a) * len * 0.35;
    const ex = topX + Math.cos(a) * len * flip;
    const ey = topY + Math.sin(a) * len * 0.18 + len * droop * 0.5;
    const wid = size * 0.11;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my - wid, ex, ey);
    ctx.quadraticCurveTo(mx, my + wid, topX, topY);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(topX, topY, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Title lettering: lines stacked, sized to fit the frame width, filled with a
// gradient and stroked in ink so it reads over the sun.
function lettering(ctx, W, H, caption, badge, grade, pad, titleH) {
  const maxW = W - pad * 3.4;
  const words = String(caption || 'VICE EDITION').trim().toUpperCase().split(/\s+/).filter(Boolean);
  const lines = [];
  if (words.length > 2) {
    const cut = Math.ceil(words.length / 2);
    lines.push(words.slice(0, cut).join(' '), words.slice(cut).join(' '));
  } else {
    lines.push(words.join(' '));
  }
  const baseY = H - titleH * (badge ? 0.78 : 0.62);
  let size = titleH * (lines.length > 1 ? 0.4 : 0.48);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const measure = (s) => {
    ctx.font = `${s}px PosterTitle, "Arial Black", sans-serif`;
    return Math.max(...lines.map((l) => ctx.measureText(l).width));
  };
  let widest = measure(size);
  while (widest > maxW && size > 12) {
    size *= 0.96;
    widest = measure(size);
  }
  ctx.font = `${size}px PosterTitle, "Arial Black", sans-serif`;
  lines.forEach((line, i) => {
    const y = baseY - (lines.length - 1 - i) * size * 1.02 + size * 0.86;
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.12;
    ctx.strokeStyle = grade.ink;
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = makeGradient(ctx, 0, y - size, 0, y, ['#ffffff', grade.accent]);
    ctx.fillText(line, W / 2, y);
  });
  if (badge) {
    const bs = Math.max(12, Math.min(size * 0.3, titleH * 0.14));
    ctx.font = `${bs}px PosterTitle, "Arial Black", sans-serif`;
    const bw = ctx.measureText(badge.toUpperCase()).width + bs * 1.8;
    const bh = bs * 1.7;
    const bx = W / 2 - bw / 2;
    const by = H - titleH * 0.06 - bh;
    ctx.fillStyle = grade.ink;
    roundRectPath(ctx, bx - 3, by - 3, bw + 6, bh + 6, bh / 2);
    ctx.fill();
    ctx.fillStyle = grade.accent;
    roundRectPath(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = grade.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(badge.toUpperCase(), W / 2, by + bh / 2 + 1);
  }
  ctx.restore();
  return lines;
}

export function drawPoster(canvas, photos, caption, badge, layout, gradeKey) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[gradeKey] ?? GRADES.sunset;
  ctx.clearRect(0, 0, W, H);

  // sky wash over the whole poster
  ctx.fillStyle = makeGradient(ctx, 0, 0, 0, H, grade.sky);
  ctx.fillRect(0, 0, W, H);

  const pad = Math.min(W, H) * 0.05;
  const titleH = H * 0.3;
  const panelTop = pad;
  const panelH = H - titleH - pad * 1.2;
  drawSun(ctx, W * 0.5, H - titleH * 0.55, Math.min(W, H) * 0.2, grade);

  // horizontal scanlines for the printed look
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();

  panelRects(layout, pad, panelTop, W - pad * 2, panelH).forEach((r, i) => {
    ctx.save();
    roundRectPath(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.clip();
    ctx.fillStyle = grade.duo[0];
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const ph = photos.length ? photos[i % photos.length] : null;
    if (ph) {
      const f = fitRect(ph.width, ph.height, r.w, r.h);
      ctx.drawImage(ph, r.x + (r.w - f.w) / 2, r.y + (r.h - f.h) / 2, f.w, f.h);
    } else {
      ctx.fillStyle = makeGradient(ctx, r.x, r.y, r.x, r.y + r.h, [grade.sky[3], grade.sky[4]]);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = grade.ink;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h * 0.42, Math.min(r.w, r.h) * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h * 1.05, Math.min(r.w, r.h) * 0.42, Math.PI, 0);
      ctx.fill();
    }
    duotone(ctx, r.x, r.y, r.w, r.h, grade, 0.18);
    ctx.restore();
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(2, W * 0.0035);
    roundRectPath(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.stroke();
  });

  // horizon silhouettes across the title band
  skyline(ctx, 0, H - titleH * 1.02, W, titleH * 0.5, grade);
  palm(ctx, W * 0.1, H - titleH * 0.55, Math.min(W, H) * 0.34, grade.ink);
  palm(ctx, W * 0.9, H - titleH * 0.55, Math.min(W, H) * 0.3, grade.ink, -1);

  // art-deco frame
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, W * 0.005);
  ctx.strokeRect(pad * 0.45, pad * 0.45, W - pad * 0.9, H - pad * 0.9);
  ctx.lineWidth = Math.max(1, W * 0.0018);
  const inset = pad * 0.45 + Math.max(6, W * 0.012);
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

  lettering(ctx, W, H, caption, badge, grade, pad, titleH);

  // corner vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  return canvas;
}
