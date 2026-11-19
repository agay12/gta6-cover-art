// poster.js — the Vice Poster Forge cover-art engine.
// Draws a multi-panel GTA 6-style poster: duotone-graded photo panels, a Vice
// sunset sky with a striped sun, a skyline and palm silhouettes, art-deco
// framing and stacked caption lettering. Everything is drawn on canvas, no
// network, no libraries.

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

export const LAYOUTS = {
  hero3: { name: 'Hero + 3 panels' },
  grid4: { name: 'Four panels' },
  twin: { name: 'Twin panels' },
  solo: { name: 'Single panel' },
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

// Photos are processed in place: a luminance-based gradient map re-colours the
// panel's image into the palette's duotone, then a soft grain layer adds a
// printed-poster texture.
function duotone(ctx, x, y, w, h, grade, grain) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const stops = grade.duo;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const t = lum * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) {
      const a = parseInt(stops[k].slice(1 + c * 2, 3 + c * 2), 16);
      const b = parseInt(stops[k + 1].slice(1 + c * 2, 3 + c * 2), 16);
      d[i + c] = a + (b - a) * f;
    }
    d[i + 3] = 255;
  }
  ctx.putImageData(img, x, y);
  if (grain > 0) {
    ctx.save();
    ctx.globalAlpha = grain;
    ctx.fillStyle = '#000';
    for (let gy = y; gy < y + h; gy += 3) {
      for (let gx = x + ((gy / 3) | 0) % 2 * 3; gx < x + w; gx += 6) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
    ctx.restore();
  }
}

function drawSun(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = makeGradient(ctx, cx, cy - r, cx, cy + r, [grade.sky[4], grade.accent, grade.sky[2]]);
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = grade.sky[1];
  const band = (r * 2) / (SUN_STRIPES * 2 + 1);
  for (let i = 0; i < SUN_STRIPES; i++) {
    const yy = cy + i * band * 2;
    ctx.globalAlpha = 0.55 + i * 0.08;
    ctx.fillRect(cx - r, yy, r * 2, band * (1 + i * 0.35));
  }
  ctx.restore();
}

export function drawPoster(canvas, photos, caption, badge, layout, gradeKey) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[gradeKey] ?? GRADES.sunset;
  ctx.clearRect(0, 0, W, H);

  // --- sky ---
  ctx.fillStyle = makeGradient(ctx, 0, 0, 0, H, grade.sky);
  ctx.fillRect(0, 0, W, H);
  drawSun(ctx, W * 0.5, H * 0.34, Math.min(W, H) * 0.17, grade);

  // --- photo panels ---
  const pad = Math.min(W, H) * 0.045;
  const frameW = W - pad * 2;
  const titleZone = H * 0.3;
  const panelTop = pad * 1.6;
  const panelH = H - panelTop - titleZone;
  const rects = panelRects(layout, pad, panelTop, frameW, panelH);

  rects.forEach((r, i) => {
    ctx.save();
    roundRectPath(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.clip();
    ctx.fillStyle = grade.duo[0];
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const ph = photos[i % Math.max(1, photos.length)];
    if (ph) {
      const f = fitRect(ph.width, ph.height, r.w, r.h);
      ctx.drawImage(ph, r.x + (r.w - f.w) / 2, r.y + (r.h - f.h) / 2, f.w, f.h);
    } else {
      ctx.fillStyle = makeGradient(ctx, r.x, r.y, r.x, r.y + r.h, [grade.sky[3], grade.sky[4]]);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    duotone(ctx, r.x, r.y, r.w, r.h, grade, 0.16);
    ctx.restore();
    // panel frame
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(2, W * 0.004);
    roundRectPath(ctx, r.x, r.y, r.w, r.h, r.r);
    ctx.stroke();
  });

  // --- skyline + palms on the title band ---
  skyline(ctx, 0, H - titleZone, W, titleZone, grade);
  palm(ctx, W * 0.12, H - titleZone, Math.min(W, H) * 0.16, grade.ink);
  palm(ctx, W * 0.88, H - titleZone, Math.min(W, H) * 0.19, grade.ink, -1);

  // --- deco frame ---
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(pad * 0.5, pad * 0.5, W - pad, H - pad);
  ctx.lineWidth = Math.max(1, W * 0.002);
  ctx.strokeRect(pad * 0.5 + ctx.lineWidth * 2, pad * 0.5 + ctx.lineWidth * 2, W - pad - ctx.lineWidth * 4, H - pad - ctx.lineWidth * 4);

  // --- lettering ---
  lettering(ctx, W, H, caption, badge, grade);

  return canvas;
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
    const w2 = (fw - gap) / 2, h2 = (fh - gap) / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
      rects.push(mk(pad + j * (w2 + gap), top + i * (h2 + gap), w2, h2, r));
  } else if (layout === 'twin') {
    const w2 = (fw - gap) / 2;
    rects.push(mk(pad, top, w2, fh, r), mk(pad + w2 + gap, top, w2, fh, r));
  } else {
    rects.push(mk(pad, top, fw, fh, r));
  }
  return rects;
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

function skyline(ctx, x, y, w, h, grade) {
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = grade.ink;
  let cx = x;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  while (cx < x + w) {
    const bw = w * (0.03 + rnd() * 0.06);
    const bh = h * (0.25 + rnd() * 0.6);
    ctx.fillRect(cx, y + h - bh, bw, bh);
    if (rnd() > 0.6) ctx.fillRect(cx + bw * 0.4, y + h - bh - bh * 0.18, bw * 0.2, bh * 0.18);
    cx += bw + w * 0.008;
  }
  ctx.restore();
}

function palm(ctx, x, baseY, size, ink, flip = 1) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + size * 0.06 * flip, baseY - size * 0.6, x + size * 0.1 * flip, baseY - size);
  ctx.lineWidth = size * 0.05;
  ctx.stroke();
  const topX = x + size * 0.1 * flip, topY = baseY - size;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.15 + (i / 6) * 1.1) * (flip > 0 ? 1 : -1) * -1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * size * 0.5,
      topY - Math.sin(a) * size * 0.35,
      topX + Math.cos(a) * size * 0.75,
      topY + size * 0.12,
    );
    ctx.lineWidth = size * 0.045;
    ctx.stroke();
  }
  ctx.restore();
}

function lettering(ctx, W, H, caption, badge, grade) {
  const zone = H * 0.3;
  const baseY = H - zone * 0.18;
  const words = String(caption || 'VICE EDITION').trim().toUpperCase().split(/\s+/);
  const lines = [];
  if (words.length > 2) { lines.push(words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')); }
  else lines.push(words.join(' '));
  const size = lines.length > 1 ? zone * 0.4 : zone * 0.52;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px PosterTitle, "Arial Black", sans-serif`;
  ctx.letterSpacing = `${Math.round(size * 0.02)}px`;
  lines.forEach((line, i) => {
    const y = baseY - (lines.length - 1 - i) * size * 0.95;
    ctx.lineWidth = size * 0.09;
    ctx.strokeStyle = grade.ink;
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = makeGradient(ctx, W * 0.2, y - size, W * 0.8, y, [grade.accent, '#ffffff', grade.accent]);
    ctx.fillText(line, W / 2, y);
  });
  if (badge) {
    const bs = Math.max(14, zone * 0.12);
    ctx.font = `${bs}px PosterTitle, "Arial Black", sans-serif`;
    const bw = ctx.measureText(badge.toUpperCase()).width + bs * 1.6;
    const bx = W / 2 - bw / 2, by = H - zone * 0.04 - bs * 1.9;
    ctx.fillStyle = grade.accent;
    roundRectPath(ctx, bx, by, bw, bs * 1.6, bs * 0.5);
    ctx.fill();
    ctx.fillStyle = grade.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(badge.toUpperCase(), W / 2, by + bs * 0.85);
  }
  ctx.restore();
}
