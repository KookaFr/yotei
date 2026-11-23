/* ======================================================================
   Voix japonaise et sons
   ====================================================================== */

import { plateforme } from './plateforme.js';
import { reglages } from './reglages.js';

// L'API ne dit pas si une voix est d'homme ou de femme : on reconnaît les noms des voix japonaises
// d'homme connues (iPad : Otoya, Hattori ; Windows / Edge : Ichiro, Keita…).
export const VOIX_HOMME = /otoya|hattori|ichiro|keita|daichi|naoki|takumi|\bmale\b|男/i;
export const voixJa = () => plateforme.voix.voixDisponibles().filter((v) => /^ja/i.test(v.lang));
export function voixJaponaise() {
  const voix = voixJa();
  if (!voix.length) return null;
  if (reglages.voixNom) {
    const choisie = voix.find((v) => v.name === reglages.voixNom);
    if (choisie) return choisie;
  }
  const homme = reglages.voixGenre === 'homme';
  const duGenre = voix.filter((v) => VOIX_HOMME.test(v.name) === homme);
  const liste = duGenre.length ? duGenre : voix;
  return liste.find((v) => v.localService) || liste[0];
}
const voixGrave = () => reglages.voixGenre === 'homme' && !reglages.voixNom && !voixJa().some((v) => VOIX_HOMME.test(v.name));

// Dit un texte en hiragana (les kanji ont été remplacés par leur lecture : texte.lu).
export function parler(texte, fin) {
  if (!plateforme.voix.disponible || !String(texte || '').trim()) {
    if (fin) setTimeout(fin, 600);
    return;
  }
  try {
    plateforme.voix.parler(String(texte), {
      voix: voixJaponaise(),
      rate: Number(reglages.vitesse) || 0.9,
      pitch: voixGrave() ? 0.6 : 1,
      lang: 'ja-JP',
      onend: fin,
    });
  } catch {
    if (fin) setTimeout(fin, 1500);
  }
}
export const taire = () => plateforme.voix.annuler();

let elementLu = null;
export function lireElement(el, texte) {
  const t = String(texte || el.dataset.lire || el.getAttribute('aria-label') || el.textContent || '').trim();
  if (!t) return;
  if (elementLu) elementLu.classList.remove('en-lecture');
  elementLu = el;
  el.classList.add('en-lecture');
  parler(t, () => {
    el.classList.remove('en-lecture');
    if (elementLu === el) elementLu = null;
  });
}

export let modeLecture = false;
export const lectureActive = () => reglages.toucherLire !== false;

plateforme.voix.voixDisponibles();

/* ----- Sons ----- */

let contexteAudio = null;
function audio() {
  if (!contexteAudio) {
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte) return null;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    try { contexteAudio = new Contexte(); } catch { return null; }
  }
  if (contexteAudio.state === 'suspended') contexteAudio.resume().catch(() => {});
  return contexteAudio;
}

export function note(frequence, { duree = 0.3, type = 'sine', volume = 0.18, delai = 0 } = {}) {
  if (!reglages.sons) return;
  const a = audio();
  if (!a) return;
  const debut = a.currentTime + delai;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = frequence;
  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(volume, debut + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  osc.connect(gain).connect(a.destination);
  osc.start(debut);
  osc.stop(debut + duree + 0.05);
}

export const sons = {
  succes: () => [523.25, 659.25, 783.99].forEach((f, i) => note(f, { delai: i * 0.11, duree: 0.28 })),
  fin: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, { delai: i * 0.14, duree: 0.45 })),
  // Carillon de l'école (début d'une activité) et petit signal (bientôt fini).
  carillon: () => [659.25, 523.25, 587.33, 392].forEach((f, i) => note(f, { delai: i * 0.42, duree: 0.7, volume: 0.16 })),
  bientot: () => { note(880, { duree: 0.2, volume: 0.12 }); note(880, { duree: 0.2, volume: 0.12, delai: 0.3 }); },
  page: () => note(660, { duree: 0.12, volume: 0.08, type: 'triangle' }),
};

function debloquerAudio() {
  const a = audio();
  if (!a) return;
  try {
    const source = a.createBufferSource();
    source.buffer = a.createBuffer(1, 1, 22050);
    source.connect(a.destination);
    source.start(0);
  } catch { /* rien */ }
  ['pointerup', 'touchend', 'keydown'].forEach((t) => document.removeEventListener(t, debloquerAudio, true));
}
['pointerup', 'touchend', 'keydown'].forEach((t) => document.addEventListener(t, debloquerAudio, true));

/* ----- Bouton 👆 : toucher un bouton le fait lire au lieu de l'activer ----- */

export function basculerLecture() {
  modeLecture = !modeLecture;
  document.body.classList.toggle('mode-lecture', modeLecture);
  document.querySelectorAll('.btn-lire').forEach((b) => b.setAttribute('aria-pressed', String(modeLecture)));
  parler(modeLecture ? 'さわった ところを よむよ。 もう いちど おすと、 もとに もどるよ。' : 'もとに もどったよ。');
}
export function majBoutonsLire() {
  document.querySelectorAll('.btn-lire').forEach((b) => { b.hidden = !lectureActive(); });
  if (!lectureActive() && modeLecture) {
    modeLecture = false;
    document.body.classList.remove('mode-lecture');
  }
}

// Toucher un texte marqué data-lire : on l'entend (sans déclencher autre chose).
export function installerLectureAuToucher() {
  let depart = null;
  document.addEventListener('pointerdown', (ev) => { depart = { x: ev.clientX, y: ev.clientY, t: performance.now() }; }, true);
  document.addEventListener('pointerup', (ev) => {
    if (!depart || !lectureActive()) return;
    const bouge = Math.hypot(ev.clientX - depart.x, ev.clientY - depart.y) > 12 || performance.now() - depart.t > 1500;
    depart = null;
    if (bouge || !(ev.target instanceof Element)) return;
    if (ev.target.closest('button, [role="button"], a, input, label, select, textarea, #ecran-parents')) return;
    const bloc = ev.target.closest('[data-lire]');
    if (bloc) lireElement(bloc);
  }, true);
}
