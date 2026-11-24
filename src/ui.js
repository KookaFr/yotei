/* ======================================================================
   Morceaux d'interface communs : image d'une carte, heure, feuille (fenêtre du bas),
   écran plein (étapes, ふりかえり), petit message
   ====================================================================== */

import {
  affichageHeure, versMinutes, yomiHeureMinutes,
} from './heure.js';
import { $, echapper, el } from './outils.js';
import { chargerPhotos } from './photos.js';
import { reglages } from './reglages.js';
import { activable } from './tactile.js';
import { html, lu } from './texte.js';
import { taire } from './voix.js';

// L'image d'une carte : sa photo (si les parents en ont mis une), sinon son émoji.
export function visuel(c, classe = '') {
  if (c && c.photo) return `<span class="visuel avec-photo ${classe}" data-emoji="${echapper(c.emoji || '')}"><img data-photo="${echapper(c.photo)}" alt=""><b>${echapper(c.emoji || '')}</b></span>`;
  return `<span class="visuel ${classe}" aria-hidden="true">${echapper((c && c.emoji) || '❔')}</span>`;
}

// 9:05 (avec ごぜん / ごご en petit, sauf en 24 h).
export function heureHtml(min, { sansMoment = false } = {}) {
  if (min === null || min === undefined) return '';
  const { chiffres, moment } = affichageHeure(min, reglages.format24);
  return `<span class="heure">${moment && !sansMoment ? `<small>${moment}</small>` : ''}${chiffres}</span>`;
}
export const heureLue = (min) => (min === null || min === undefined ? '' : yomiHeureMinutes(min, reglages.format24));

// 9:10 〜 10:40, et sa lecture : 「ごぜん くじ じゅっぷんから ごぜん じゅうじ よんじゅっぷんまで」
export function plageHtml(act) {
  const d = versMinutes(act.debut);
  const f = versMinutes(act.fin);
  if (d === null) return '';
  // ごぜん / ごご une seule fois quand les deux heures sont dans la même moitié de la journée.
  const meme = f !== null && (d < 720) === (f < 720);
  return f === null ? `${heureHtml(d)}<span class="kara">から</span>` : `${heureHtml(d)}<span class="kara">〜</span>${heureHtml(f, { sansMoment: meme })}`;
}
export function plageLue(act) {
  const d = versMinutes(act.debut);
  const f = versMinutes(act.fin);
  if (d === null) return '';
  return f === null ? `${heureLue(d)}から` : `${heureLue(d)}から ${heureLue(f)}まで`;
}

export const nomHtml = (c) => html(c.nom);
export const nomLu = (c) => lu(c.nom);

/* ----- Feuille : une fenêtre qui monte du bas (choix, détails) ----- */

let surFermeture = null;
// Une feuille peut en ouvrir une autre (choisir une carte depuis l'éditeur d'une date) :
// à la fermeture, la précédente revient.
const pile = [];
export function ouvrirFeuille({ titre = '', contenu, classe = '', fermeture = null, lire = '' }) {
  const f = $('feuille');
  const boite = $('feuille-boite');
  if (!f.hidden) pile.push({ noeuds: [...boite.childNodes], classe: boite.className, fermeture: surFermeture });
  boite.className = `feuille-boite ${classe}`;
  boite.replaceChildren();
  boite.scrollTop = 0;
  const tete = el('div', { class: 'feuille-tete' });
  if (titre) tete.append(el('h2', { class: 'feuille-titre', html: html(titre), 'data-lire': lire || lu(titre) }));
  const fermer = el('button', { type: 'button', class: 'btn-rond btn-fermer', 'aria-label': 'とじる', 'data-lire': 'とじる', html: ICONE_FERMER });
  activable(fermer, fermerFeuille, { garde: false });
  tete.append(fermer);
  boite.append(tete, contenu);
  f.hidden = false;
  surFermeture = fermeture;
  chargerPhotos(boite);
  requestAnimationFrame(() => boite.classList.add('ouverte'));
  const premier = boite.querySelector('h2');
  if (premier) {
    premier.tabIndex = -1;
    try { premier.focus({ preventScroll: true }); } catch { /* rien */ }
  }
}
export function fermerFeuille() {
  const f = $('feuille');
  if (f.hidden) return;
  taire();
  if (pile.length) {
    const precedente = pile.pop();
    const fn = surFermeture;
    const boite = $('feuille-boite');
    boite.replaceChildren(...precedente.noeuds);
    boite.className = precedente.classe;
    surFermeture = precedente.fermeture;
    if (fn) fn();
    return;
  }
  f.hidden = true;
  $('feuille-boite').classList.remove('ouverte');
  const fn = surFermeture;
  surFermeture = null;
  if (fn) fn();
}
export const feuilleOuverte = () => !$('feuille').hidden;

/* ----- Écran plein (étapes une à une, ふりかえり) ----- */

export function ouvrirPlein(noeud) {
  const p = $('plein');
  p.replaceChildren(noeud);
  p.hidden = false;
  document.body.classList.add('avec-plein');
  chargerPhotos(p);
}
export function fermerPlein() {
  taire();
  $('plein').hidden = true;
  $('plein').replaceChildren();
  document.body.classList.remove('avec-plein');
}
export const pleinOuvert = () => !$('plein').hidden;

/* ----- Petit message en bas de l'écran ----- */

let minuteurMessage = 0;
export function message(texte) {
  const m = $('message');
  m.innerHTML = html(texte);
  m.hidden = false;
  clearTimeout(minuteurMessage);
  minuteurMessage = setTimeout(() => { m.hidden = true; }, 2600);
}

// Un bouton avec icône et texte japonais (le texte lu en mode 👆).
export function bouton(texte, action, { classe = 'btn', icone = '', lire = '', options = {} } = {}) {
  const b = el('button', { type: 'button', class: classe, html: `${icone}<span>${html(texte)}</span>`, 'aria-label': lire || lu(texte) });
  activable(b, action, options);
  return b;
}

export const ICONE_FERMER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
export const ICONE_COCHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';
export const ICONE_HP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
export const ICONE_GAUCHE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
export const ICONE_DROITE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
export const ICONE_PHOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>';
export const ICONE_GALERIE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8 8.5"/></svg>';
export const ICONE_ETAPES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5"/><circle cx="5" cy="18" r="1.6"/></svg>';
export const ICONE_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
export const ICONE_HAUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7"/></svg>';
export const ICONE_BAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>';
export const ICONE_POUBELLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>';
export const ICONE_RETOUR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';
export const ICONE_ENVOYER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12v7.5h14V12"/></svg>';
export const ICONE_DEPLACER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>';
