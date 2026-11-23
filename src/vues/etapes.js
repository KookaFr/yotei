/* ======================================================================
   「てじゅん」 : les étapes d'une activité, une seule à la fois, en très grand,
   avec la frise pour se repérer ; 「できた」 passe à la suivante ; un « bravo » à la fin.
   ====================================================================== */

import { etat } from '../donnees.js';
import { ajouterJours, aujourdhui } from '../heure.js';
import { mochimonoDu } from '../journee.js';
import { el } from '../outils.js';
import { chargerPhotos } from '../photos.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, fermerPlein, ICONE_COCHE, ICONE_FERMER, ICONE_GAUCHE, ICONE_HP, ouvrirPlein, visuel,
} from '../ui.js';
import { lireElement, parler, sons } from '../voix.js';

export function rendreEtapes(conteneur, lancer) {
  const page = el('div', { class: 'page-etapes' });
  page.append(el('h2', { class: 'titre-liste', 'data-lire': 'てじゅん。 えらんでね。', html: html('てじゅん') }));
  const grille = el('div', { class: 'grille-routines' });
  etat.routines.forEach((r) => {
    const b = el('button', {
      type: 'button', class: 'tuile-routine', 'aria-label': lu(r.nom),
      html: `${visuel(r, 'grand')}<span class="tuile-nom">${html(r.nom)}</span><span class="tuile-nb">${r.etapes.length}</span>`,
    });
    activable(b, () => lancer(r.id));
    grille.append(b);
  });
  if (!etat.routines.length) grille.append(el('p', { class: 'vide', html: html('てじゅんは まだ ないよ。') }));
  page.append(grille);
  conteneur.replaceChildren(page);
  chargerPhotos(page);
}

// 「明日の 準備」 (et les étapes où les parents l'ont coché) : les もちもの du lendemain deviennent des étapes.
export const avecMochimono = (r) => (r.avecMochimono ?? r.id === 'mochimono');

// Le lecteur : une étape à la fois. fin() est appelé quand tout est fait.
export function lancerEtapes(idRoutine, fin = null, date = null) {
  const base = etat.routines.find((x) => x.id === idRoutine);
  if (!base || !base.etapes.length) return;
  let r = base;
  if (avecMochimono(base)) {
    const ajout = mochimonoDu(ajouterJours(date || aujourdhui(), 1)).map((a) => ({ emoji: a.emoji || '🎒', texte: `${a.texte}を かばんに 入《い》れる` }));
    if (ajout.length) {
      const etapes = [...base.etapes];
      etapes.splice(Math.max(0, etapes.length - 1), 0, ...ajout);
      r = { ...base, etapes };
    }
  }
  let i = 0;
  const ecran = el('section', { class: 'lecteur', 'aria-label': lu(r.nom) });
  const tete = el('header', { class: 'lecteur-tete' });
  const quitter = el('button', { type: 'button', class: 'btn-rond', 'aria-label': 'おわる', html: ICONE_FERMER });
  activable(quitter, fermerPlein, { garde: false });
  const titre = el('h2', { class: 'lecteur-titre', html: html(r.nom), 'data-lire': lu(r.nom) });
  const frise = el('ol', { class: 'frise', 'aria-label': 'すすみぐあい' });
  r.etapes.forEach(() => frise.append(el('li')));
  tete.append(quitter, titre);
  const corps = el('div', { class: 'lecteur-corps' });
  const pied = el('footer', { class: 'lecteur-pied' });
  const prec = bouton('もどる', () => { if (i > 0) { i -= 1; afficher(); } }, { classe: 'btn btn-large', icone: ICONE_GAUCHE });
  const ecouter = bouton('きく', () => lireElement(corps.querySelector('.etape'), corps.querySelector('.etape')?.dataset.lire), { classe: 'btn-rond btn-ecouter', icone: ICONE_HP, options: { garde: false } });
  const ok = bouton('できた', () => {
    sons.page();
    if (i < r.etapes.length - 1) { i += 1; afficher(); } else bravo();
  }, { classe: 'btn btn-principal btn-large btn-fait', icone: ICONE_COCHE });
  pied.append(prec, ecouter, ok);
  ecran.append(tete, frise, corps, pied);

  function afficher() {
    const e = r.etapes[i];
    frise.querySelectorAll('li').forEach((li, j) => {
      li.className = j < i ? 'fait' : (j === i ? 'actuel' : '');
    });
    frise.setAttribute('aria-label', `${r.etapes.length}の うち ${i + 1}`);
    const texte = `${i + 1}。 ${lu(e.texte)}`;
    corps.replaceChildren(el('div', {
      class: 'etape', 'data-lire': texte,
      html: `<p class="etape-num">${i + 1} / ${r.etapes.length}</p>${visuel(e, 'enorme')}<p class="etape-texte">${html(e.texte)}</p>`,
    }));
    chargerPhotos(corps);
    prec.disabled = i === 0;
    parler(texte);
  }

  function bravo() {
    sons.fin();
    frise.querySelectorAll('li').forEach((li) => { li.className = 'fait'; });
    corps.replaceChildren(el('div', {
      class: 'etape etape-bravo', 'data-lire': 'ぜんぶ できたね！',
      html: `<span class="visuel enorme" aria-hidden="true">🎉</span><p class="etape-texte">${html('ぜんぶ できたね！')}</p>`,
    }));
    pied.replaceChildren(bouton('おわる', () => { fermerPlein(); if (fin) fin(); }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE }));
    parler('ぜんぶ できたね！');
  }

  ouvrirPlein(ecran);
  afficher();
}
