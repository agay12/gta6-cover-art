// main.js — wires the editor UI to the poster engine and handles PNG export.
import { drawPoster, GRADES, LAYOUTS } from './poster.js';

const canvas = document.getElementById('cover');
const photoInput = document.getElementById('photos');
const captionInput = document.getElementById('caption');
const badgeInput = document.getElementById('badge');
const layoutSel = document.getElementById('layout');
const gradeSel = document.getElementById('grade');
const exportBtn = document.getElementById('export');
const statusEl = document.getElementById('status');

const state = { photos: [], w: 1080, h: 1080, layout: 'hero3', grade: 'sunset' };

// setPhotos lets the screenshot script (and tests) load images without a file
// picker, going through exactly the same render path as a user's own photo.
export function setPhotos(imgs, label) {
  state.photos = imgs.slice(0, 8);
  if (label) statusEl.textContent = `Sample photo "${label}" loaded.`;
  render();
}

export function currentInputs() {
  return {
    caption: captionInput.value,
    badge: badgeInput.value,
    layout: layoutSel.value,
    grade: gradeSel.value,
  };
}

export function render() {
  const inp = currentInputs();
  drawPoster(canvas, state.photos, inp.caption, inp.badge, inp.layout, inp.grade);
}

async function fileToImage(file) {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    // keep the object URL alive for the canvas draw; revoked on export
  }
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function setSize(w, h) {
  state.w = w;
  state.h = h;
  canvas.width = w;
  canvas.height = h;
  render();
}

photoInput.addEventListener('change', async () => {
  const files = [...photoInput.files].slice(0, 8);
  state.photos = [];
  for (const f of files) {
    try { state.photos.push(await fileToImage(f)); } catch { /* skip unreadable */ }
  }
  if (!state.photos.length) statusEl.textContent = 'No readable photo — sample art is shown instead.';
  else statusEl.textContent = `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded.`;
  render();
});

captionInput.addEventListener('input', render);
badgeInput.addEventListener('input', render);
layoutSel.addEventListener('change', render);
gradeSel.addEventListener('change', render);

document.getElementById('sizes').addEventListener('click', (e) => {
  const btn = e.target.closest('.size');
  if (!btn) return;
  for (const b of document.querySelectorAll('.size')) b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
  setSize(+btn.dataset.w, +btn.dataset.h);
});

export async function exportPng() {
  render();
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-poster-${state.w}x${state.h}.png`;
  a.click();
  statusEl.textContent = `Exported ${state.w}×${state.h} PNG.`;
}
exportBtn.addEventListener('click', exportPng);

document.querySelector('.size').setAttribute('aria-pressed', 'true');
render();
