// shots.js — screenshot automation for the entry's screenshots/ set.
// Query params: ?shot=cover|editor&photo=<sample>&caption=<text>&layout=&grade=&w=&h=
// Loads the named sample photo from app/samples/ through the same path a user
// photo takes, sets the editor fields, renders, and for cover shots triggers
// the export at the requested size so the screenshot shows the PNG the app writes.

import { render, loadImage, exportPng, setPhotos } from './main.js';

const SAMPLES = {
  pier: './samples/pier.jpg',
  boulevard: './samples/boulevard.jpg',
};

export async function runShots() {
  const q = new URLSearchParams(location.search);
  if (!q.has('shot')) return;
  const photoKey = q.get('photo');
  if (photoKey && SAMPLES[photoKey]) {
    try {
      const img = await loadImage(SAMPLES[photoKey]);
      setPhotos([img], photoKey);
    } catch {
      // leave the sample art the renderer draws on its own
    }
  }
  if (q.get('caption')) document.getElementById('caption').value = q.get('caption');
  if (q.get('badge')) document.getElementById('badge').value = q.get('badge');
  if (q.get('layout')) document.getElementById('layout').value = q.get('layout');
  if (q.get('grade')) document.getElementById('grade').value = q.get('grade');
  const w = +q.get('w') || 1080;
  const h = +q.get('h') || 1080;
  for (const b of document.querySelectorAll('.size')) {
    if (+b.dataset.w === w && +b.dataset.h === h) b.click();
  }
  render();
  if (q.get('shot') === 'cover') await exportPng();
}

runShots();
