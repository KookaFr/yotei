/* ======================================================================
   「こんげつ」 : le calendrier du mois (dimanche en rouge, samedi en bleu, comme au Japon),
   les jours fériés, les événements, et « あと 3にち » pour les prochains.
   Toucher un jour : ce qui s'y passe, et son programme (ou sa ふりかえり s'il est passé).
   ====================================================================== */

import {
  journalDu, joursAvecPhotos, prochainsEvenements, sorteDuJour,
} from '../donnees.js';
import {
  ajouterJours, aujourdhui, cle, deCle, ecartJours, JOURS_SEMAINE, texteDans, yomiDans, yomiDate, yomiMois,
} from '../heure.js';
import { nav } from '../nav.js';
import { el } from '../outils.js';
import { reglages } from '../reglages.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, fermerFeuille, ICONE_DROITE, ICONE_GAUCHE, ICONE_PHOTO, ouvrirFeuille,
} from '../ui.js';

let decalage = 0;

export function rendreMois(conteneur) {
  const auj = aujourdhui();
  const premier = new Date(auj.getFullYear(), auj.getMonth() + decalage, 1);
  const page = el('div', { class: 'page-mois' });

  const tete = el('div', { class: 'tete-periode' });
  tete.append(
    bouton('まえの 月《つき》', () => { decalage -= 1; rendreMois(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_GAUCHE }),
    el('h2', {
      class: 'titre-periode', 'data-lire': `${premier.getFullYear()}ねん ${yomiMois(premier.getMonth() + 1)}`,
      html: `<span class="periode-annee">${premier.getFullYear()}ねん</span><span class="periode-mois">${premier.getMonth() + 1}がつ</span>`,
    }),
    bouton('つぎの 月《つき》', () => { decalage += 1; rendreMois(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_DROITE }),
  );
  page.append(tete);

  // Les prochains événements, avec le nombre de jours.
  const prochains = prochainsEvenements(auj, 3, 120);
  if (prochains.length) {
    const ul = el('ul', { class: 'prochains' });
    prochains.forEach((ev) => {
      const d = deCle(ev.date);
      const n = Math.max(0, ecartJours(auj, d));
      ul.append(el('li', {
        'data-lire': `${lu(ev.nom)}。 ${yomiDate(d)}。 ${yomiDans(n)}`,
        html: `<span class="p-emoji" aria-hidden="true">${ev.emoji || '⭐'}</span><span class="p-nom">${html(ev.nom)}</span>`
          + `<span class="p-date">${d.getMonth() + 1}/${d.getDate()}</span><span class="p-dans">${html(texteDans(n))}</span>`,
      }));
    });
    page.append(ul);
  }

  const grille = el('div', { class: 'mois', role: 'grid' });
  JOURS_SEMAINE.forEach((j, i) => grille.append(el('div', { class: `mois-js jour-${i}`, role: 'columnheader', html: html(j.court, { mots: false }) })));
  const debutGrille = ajouterJours(premier, -premier.getDay());
  const photos = joursAvecPhotos();
  const nbSemaines = Math.ceil((premier.getDay() + new Date(premier.getFullYear(), premier.getMonth() + 1, 0).getDate()) / 7);
  for (let i = 0; i < nbSemaines * 7; i++) {
    const d = ajouterJours(debutGrille, i);
    const horsMois = d.getMonth() !== premier.getMonth();
    const { ferie, evenements, sansEcole } = sorteDuJour(d);
    const k = cle(d);
    const estAuj = k === cle(auj);
    const classes = ['mois-jour', `jour-${d.getDay()}`];
    if (horsMois) classes.push('hors-mois');
    if (estAuj) classes.push('aujourdhui');
    if (ferie) classes.push('ferie');
    if (sansEcole) classes.push('sans-ecole');
    if (k < cle(auj)) classes.push('passe');
    const b = el('button', {
      type: 'button', class: classes.join(' '),
      'aria-label': `${yomiDate(d)}${ferie ? `、 ${lu(ferie)}` : ''}${evenements.map((ev) => `、 ${lu(ev.nom)}`).join('')}`,
      html: `<span class="mj-num">${d.getDate()}</span>`
        + `<span class="mj-evs">${evenements.slice(0, 2).map((ev) => `<span class="mj-ev"><i aria-hidden="true">${ev.emoji || '⭐'}</i><span class="mj-ev-nom">${html(ev.nom)}</span></span>`).join('')}</span>`
        + `${ferie && !horsMois ? `<span class="mj-ferie">${html(ferie)}</span>` : ''}`
        + `${photos.has(k) ? '<span class="mj-photo" aria-hidden="true">📷</span>' : ''}`,
    });
    activable(b, () => ouvrirDate(d));
    grille.append(b);
  }
  page.append(grille);
  conteneur.replaceChildren(page);
}

function ouvrirDate(d) {
  const { ferie, evenements } = sorteDuJour(d);
  const contenu = el('div', { class: 'detail-date' });
  const lignes = [];
  if (ferie && reglages.feries) lignes.push({ e: '🎌', t: ferie });
  evenements.forEach((ev) => lignes.push({ e: ev.emoji || '⭐', t: ev.nom }));
  if (lignes.length) {
    const ul = el('ul', { class: 'detail-evs' });
    lignes.forEach((l) => ul.append(el('li', { 'data-lire': lu(l.t), html: `<span aria-hidden="true">${l.e}</span> ${html(l.t)}` })));
    contenu.append(ul);
  }
  const k = cle(d);
  const passe = k < cle(aujourdhui());
  const actions = el('div', { class: 'actions-feuille' });
  actions.append(bouton(passe ? 'この 日《ひ》に した こと' : '予定《よてい》を 見《み》る', () => { fermerFeuille(); nav.jour(d); }, { classe: 'btn btn-principal' }));
  if (Object.values(journalDu(d)).some((x) => x.fait)) {
    actions.append(bouton('ふりかえり', () => { fermerFeuille(); nav.recit(d); }, { classe: 'btn', icone: ICONE_PHOTO }));
  }
  contenu.append(actions);
  const lire = `${yomiDate(d)}。 ${lignes.map((l) => lu(l.t)).join('。 ')}`;
  ouvrirFeuille({ titre: dateHtmlTexte(d), contenu, lire });
}

const dateHtmlTexte = (d) => `${d.getMonth() + 1}がつ ${d.getDate()}にち（${JOURS_SEMAINE[d.getDay()].court}）`;

export const remettreMois = () => { decalage = 0; };
