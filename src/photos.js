/* ======================================================================
   Photos (sur l'appareil seulement) : photo d'une carte, d'une étape,
   et photos de la journée (ふりかえり). Réduites à 1024 px avant d'être gardées.
   ====================================================================== */

import { $, uid } from './outils.js';
import { plateforme } from './plateforme.js';

const urls = new Map();

export async function urlPhoto(id) {
  if (!id) return null;
  if (urls.has(id)) return urls.get(id);
  const o = await plateforme.stockage.lire(id);
  if (!o || !o.blob) return null;
  const u = URL.createObjectURL(o.blob);
  urls.set(id, u);
  return u;
}

// Les <img data-photo="id"> d'un bloc reçoivent leur image (lue de façon asynchrone).
export function chargerPhotos(racine) {
  racine.querySelectorAll('img[data-photo]').forEach(async (img) => {
    const u = await urlPhoto(img.dataset.photo);
    if (u) img.src = u;
    else img.closest('.avec-photo')?.classList.remove('avec-photo');
  });
}

// Ouvre l'appareil photo ('camera') ou la galerie ('galerie') ; résout le fichier choisi, ou null.
export function choisirFichier(source = 'camera') {
  const input = $(source === 'camera' ? 'fichier-camera' : 'fichier-galerie');
  return new Promise((resoudre) => {
    input.value = '';
    input.onchange = () => resoudre(input.files && input.files[0] ? input.files[0] : null);
    input.oncancel = () => resoudre(null);
    input.click();
  });
}

function chargerImage(fichier) {
  return new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resoudre(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rejeter(new Error('image')); };
    img.src = url;
  });
}

export async function reduire(fichier, max = 1024, qualite = 0.8) {
  const img = await chargerImage(fichier);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const toile = document.createElement('canvas');
  toile.width = Math.max(1, Math.round(img.naturalWidth * k));
  toile.height = Math.max(1, Math.round(img.naturalHeight * k));
  toile.getContext('2d').drawImage(img, 0, 0, toile.width, toile.height);
  return new Promise((resoudre) => toile.toBlob((b) => resoudre(b || fichier), 'image/jpeg', qualite));
}

// Prend ou choisit une photo et la garde ; résout son identifiant (ou null).
export async function nouvellePhoto(source, sorte = 'journal') {
  const fichier = await choisirFichier(source);
  if (!fichier) return null;
  try {
    const blob = await reduire(fichier, sorte === 'journal' ? 1024 : 640);
    const id = uid(sorte === 'journal' ? 'pj' : 'pc');
    await plateforme.stockage.mettre({ id, blob, sorte, quand: Date.now() });
    return id;
  } catch {
    return null;
  }
}

export async function supprimerPhoto(id) {
  if (!id) return;
  await plateforme.stockage.enlever(id);
  if (urls.has(id)) {
    URL.revokeObjectURL(urls.get(id));
    urls.delete(id);
  }
}

/* ----- Sauvegarde : les photos des cartes et des étapes voyagent avec l'emploi du temps ----- */

const versDataUrl = (blob) => new Promise((resoudre) => {
  const r = new FileReader();
  r.onload = () => resoudre(r.result);
  r.onerror = () => resoudre(null);
  r.readAsDataURL(blob);
});

export async function photosEnTexte(ids) {
  const res = {};
  for (const id of ids) {
    const o = await plateforme.stockage.lire(id);
    if (o && o.blob) res[id] = await versDataUrl(o.blob);
  }
  return res;
}

export async function photosDepuisTexte(dico) {
  for (const [id, dataUrl] of Object.entries(dico || {})) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await plateforme.stockage.mettre({ id, blob, sorte: 'carte', quand: Date.now() });
    } catch { /* photo abîmée : on continue */ }
  }
}
