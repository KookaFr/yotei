/* ======================================================================
   「こんげつ」 : le calendrier du mois (dimanche en rouge, samedi en bleu, comme au Japon),
   les jours fériés, les événements, et « あと 3にち » pour les prochains.
   Dans chaque jour, en icônes, ce qu'il ne faut pas oublier : jour férié (🎌), événements du calendrier,
   activités marquées « importantes » (遠足, 実習, 病院…) — pas les activités ordinaires.
   Toucher un jour : ce qui s'y passe, et son programme (ou sa ふりかえり s'il est passé).
   ====================================================================== */

import {
  carte, journalDu, joursAvecPhotos, programmeDu, prochainsEvenements, sorteDuJour,
} from '../donnees.js';
import {
  ajouterJours, aujourdhui, cle, deCle, ecartJours, JOURS_SEMAINE, texteDans, versMinutes, yomiDans, yomiDate, yomiMois,
} from '../heure.js';
import { nav } from '../nav.js';
import { el } from '../outils.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, fermerFeuille, heureHtml, heureLue, ICONE_DROITE, ICONE_GAUCHE, ICONE_PHOTO, ouvrirFeuille, visuel,
} from '../ui.js';

let decalage = 0;

// Ce qu'il ne faut pas oublier ce jour-là (dans l'ordre : férié, événements, activités importantes).
function marquesDu(d, { ferie, evenements }) {
  const res = [];
  if (ferie) res.push({ emoji: '🎌', nom: ferie, sorte: 'ferie' });
  evenements.forEach((ev) => res.push({ emoji: ev.emoji || '⭐', nom: ev.nom, sorte: ev.sansEcole ? 'vacances' : 'evenement' }));
  programmeDu(d).forEach((a) => {
    const c = carte(a.carte);
    if (!c.important || res.some((x) => x.nom === c.nom)) return;
    res.push({ emoji: c.emoji || '⭐', nom: c.nom, sorte: 'activite', debut: versMinutes(a.debut), carte: c });
  });
  return res;
}
const MAX_ICONES = 4;

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

  // Les prochains événements, avec le nombre de jours (sous le calendrier).
  const prochains = prochainsEvenements(auj, 3, 120);
  let ulProchains = null;
  if (prochains.length) {
    const ul = el('ul', { class: 'prochains' });
    ulProchains = ul;
    prochains.forEach((ev) => {
      const d = deCle(ev.date);
      const n = Math.max(0, ecartJours(auj, d));
      ul.append(el('li', {
        'data-lire': `${lu(ev.nom)}。 ${yomiDate(d)}。 ${yomiDans(n)}`,
        html: `<span class="pr-emoji" aria-hidden="true">${ev.emoji || '⭐'}</span><span class="pr-nom">${html(ev.nom)}</span>`
          + `<span class="pr-date">${d.getMonth() + 1}/${d.getDate()}</span><span class="pr-dans">${html(texteDans(n))}</span>`,
      }));
    });
  }

  const grille = el('div', { class: 'mois', role: 'grid' });
  JOURS_SEMAINE.forEach((j, i) => grille.append(el('div', { class: `mois-js jour-${i}`, role: 'columnheader', html: html(j.court, { mots: false }) })));
  const debutGrille = ajouterJours(premier, -premier.getDay());
  const photos = joursAvecPhotos();
  const nbSemaines = Math.ceil((premier.getDay() + new Date(premier.getFullYear(), premier.getMonth() + 1, 0).getDate()) / 7);
  grille.style.setProperty('--semaines', nbSemaines);
  for (let i = 0; i < nbSemaines * 7; i++) {
    const d = ajouterJours(debutGrille, i);
    const horsMois = d.getMonth() !== premier.getMonth();
    const sorte = sorteDuJour(d);
    const { ferie, sansEcole } = sorte;
    const marques = horsMois ? [] : marquesDu(d, sorte);
    const k = cle(d);
    const estAuj = k === cle(auj);
    const classes = ['mois-jour', `jour-${d.getDay()}`];
    if (horsMois) classes.push('hors-mois');
    if (estAuj) classes.push('aujourdhui');
    if (ferie) classes.push('ferie');
    if (sansEcole) classes.push('sans-ecole');
    if (k < cle(auj)) classes.push('passe');
    // Au plus 4 icônes ; au-delà, 3 icônes et « +2 ».
    const montrees = marques.length > MAX_ICONES ? marques.slice(0, MAX_ICONES - 1) : marques;
    const reste = marques.length - montrees.length;
    const b = el('button', {
      type: 'button', class: classes.join(' '),
      'aria-label': `${yomiDate(d)}${marques.map((m) => `、 ${lu(m.nom)}`).join('')}`,
      html: `<span class="mj-num">${d.getDate()}</span>`
        + `<span class="mj-marques mj-n${Math.min(3, montrees.length + (reste ? 1 : 0))}">${montrees.map((m) => `<span class="mj-m mj-${m.sorte}"><i aria-hidden="true">${m.emoji}</i>`
          + `<span class="mj-m-nom">${html(m.nom)}</span></span>`).join('')}${reste ? `<span class="mj-plus">+${reste}</span>` : ''}</span>`
        + `${photos.has(k) ? '<span class="mj-photo" aria-hidden="true">📷</span>' : ''}`,
    });
    activable(b, () => ouvrirDate(d));
    grille.append(b);
  }
  page.append(grille);
  if (ulProchains) page.append(ulProchains);
  conteneur.replaceChildren(page);
}

function ouvrirDate(d) {
  const contenu = el('div', { class: 'detail-date' });
  const marques = marquesDu(d, sorteDuJour(d));
  if (marques.length) {
    const ul = el('ul', { class: 'detail-evs' });
    marques.forEach((m) => {
      const heure = m.debut !== null && m.debut !== undefined;
      ul.append(el('li', {
        class: `de-${m.sorte}${m.carte ? ` lieu-${m.carte.lieu}` : ''}`, 'data-lire': `${lu(m.nom)}${heure ? `。 ${heureLue(m.debut)}から` : ''}`,
        html: `${m.carte ? visuel(m.carte) : `<span class="de-emoji" aria-hidden="true">${m.emoji}</span>`}<span class="de-nom">${html(m.nom)}</span>`
          + `${heure ? `<span class="de-heure">${heureHtml(m.debut)}</span>` : ''}`,
      }));
    });
    contenu.append(ul);
  }
  const lignes = marques.map((m) => ({ t: m.nom }));
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
