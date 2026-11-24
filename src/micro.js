/* ======================================================================
   🎤 La voix de l'élève : enregistrer une courte réponse (30 secondes au plus),
   la réécouter, la refaire. Gardée sur l'appareil (IndexedDB), avec les photos.
   ====================================================================== */

import { el, uid } from './outils.js';
import { plateforme } from './plateforme.js';
import { activable } from './tactile.js';
import { html } from './texte.js';
import { message } from './ui.js';
import { parler, taire } from './voix.js';

export const microPossible = () => Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
const DUREE_MAX = 30;

const typeAudio = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  .find((t) => window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(t)) || '';

let lecture = null;
export async function ecouterVoix(id) {
  const o = await plateforme.stockage.lire(id);
  if (!o || !o.blob) return;
  taire();
  if (lecture) lecture.pause();
  lecture = new Audio(URL.createObjectURL(o.blob));
  lecture.play().catch(() => {});
}
export const supprimerVoix = (id) => plateforme.stockage.enlever(id);
export async function fichierVoix(id, nom) {
  const o = await plateforme.stockage.lire(id);
  if (!o || !o.blob) return null;
  const ext = (o.blob.type || '').includes('mp4') ? 'm4a' : ((o.blob.type || '').includes('ogg') ? 'ogg' : 'webm');
  return new File([o.blob], `${nom}.${ext}`, { type: o.blob.type || 'audio/webm' });
}

// Le bouton 🎤 : 「こえで いう」 → 「とめる」 (avec le temps) → ▶ 「きく」 et 「もう いちど」.
// id : l'enregistrement déjà fait (ou null) ; surChange(nouvelId | null).
export function boutonMicro(id, surChange) {
  const boite = el('div', { class: 'micro' });
  let enregistreur = null;
  let flux = null;
  let minuteur = 0;
  let debut = 0;

  const arreterFlux = () => {
    clearInterval(minuteur);
    if (flux) flux.getTracks().forEach((t) => t.stop());
    flux = null;
  };

  const dessiner = (etat) => {
    boite.replaceChildren();
    if (etat === 'enregistre') {
      const stop = el('button', { type: 'button', class: 'btn btn-large micro-stop', 'aria-label': 'とめる', html: `<i aria-hidden="true">⏹</i><span>${html('とめる')}</span><small class="micro-temps">0</small>` });
      activable(stop, () => enregistreur && enregistreur.state !== 'inactive' && enregistreur.stop(), { garde: false });
      boite.append(stop);
      return;
    }
    if (id) {
      const ecouter = el('button', { type: 'button', class: 'btn micro-ecouter', 'aria-label': 'じぶんの こえを きく', html: `<i aria-hidden="true">▶️</i><span>${html('きく')}</span>` });
      activable(ecouter, () => ecouterVoix(id), { garde: false });
      const refaire = el('button', { type: 'button', class: 'btn micro-refaire', 'aria-label': 'もう いちど', html: `<i aria-hidden="true">🎤</i><span>${html('もう いちど')}</span>` });
      activable(refaire, demarrer, { garde: false });
      boite.append(ecouter, refaire);
      return;
    }
    const b = el('button', { type: 'button', class: 'btn btn-large micro-go', 'aria-label': 'こえで いう', html: `<i aria-hidden="true">🎤</i><span>${html('こえで いう')}</span>` });
    activable(b, demarrer, { garde: false });
    boite.append(b);
  };

  async function demarrer() {
    if (!microPossible()) { message('マイクが つかえないよ。'); return; }
    taire();
    try {
      flux = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      message('マイクが つかえないよ。');
      return;
    }
    const morceaux = [];
    const type = typeAudio();
    enregistreur = new MediaRecorder(flux, type ? { mimeType: type } : undefined);
    enregistreur.ondataavailable = (ev) => { if (ev.data && ev.data.size) morceaux.push(ev.data); };
    enregistreur.onstop = async () => {
      arreterFlux();
      const blob = new Blob(morceaux, { type: enregistreur.mimeType || type || 'audio/webm' });
      if (blob.size < 500) { dessiner(); return; }
      const nouveau = uid('voix');
      await plateforme.stockage.mettre({ id: nouveau, blob, sorte: 'voix', quand: Date.now() });
      if (id) supprimerVoix(id);
      id = nouveau;
      surChange(id);
      dessiner();
      parler('きいてみる？');
    };
    enregistreur.start();
    debut = Date.now();
    dessiner('enregistre');
    minuteur = setInterval(() => {
      const s = Math.floor((Date.now() - debut) / 1000);
      const t = boite.querySelector('.micro-temps');
      if (t) t.textContent = String(s);
      if (s >= DUREE_MAX && enregistreur.state !== 'inactive') enregistreur.stop();
    }, 250);
  }

  dessiner();
  return boite;
}
