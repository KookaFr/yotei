/* ======================================================================
   「こんしゅう」 : la semaine, du plus simple au plus détaillé.
   - Pour chaque jour, une barre des lieux de 6 h à 22 h (maison → école → maison), la même échelle
     pour tous les jours : on compare d'un coup d'œil. 朝・昼・午後・夜 et les heures repères au-dessus.
   - Dessous, seulement ce qu'il ne faut pas oublier : jour férié, événements, activités importantes
     ou inhabituelles (ajoutées ce jour-là, ou par l'élève).
   - Toucher un lieu : ses activités ; toucher le jour : son programme. 「くわしく」 : les images par moment.
   ====================================================================== */

import { LIEUX } from '../catalogue.js';
import { sorteDuJour } from '../donnees.js';
import {
  ajouterJours, aujourdhui, JOURS_SEMAINE, lundiDe, minutesMaintenant, yomiDate,
} from '../heure.js';
import {
  aRetenir, blocsLieux, DEBUT_JOUR, deroulement, FIN_JOUR, PERIODES,
} from '../journee.js';
import { nav } from '../nav.js';
import { el } from '../outils.js';
import { chargerPhotos } from '../photos.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, fermerFeuille, heureHtml, heureLue, ICONE_COCHE, ICONE_DROITE, ICONE_GAUCHE, nomHtml, nomLu, ouvrirFeuille,
  plageLue, visuel,
} from '../ui.js';
import { parler } from '../voix.js';
import { repereMoment } from './jour.js';

let decalage = 0;
let niveau = 'simple';   // 'simple' : lieux + à retenir ; 'detail' : les images par moment

const pos = (min) => ((Math.min(Math.max(min, DEBUT_JOUR), FIN_JOUR) - DEBUT_JOUR) / (FIN_JOUR - DEBUT_JOUR)) * 100;
const MAX_RETENIR = 4;

// La ligne d'échelle, alignée sur les barres : 朝 昼 午後 夜, avec l'heure repère (6じ〜, 10じ〜, 2じ〜, 6じ〜).
function echelle() {
  const e = el('div', { class: 'sem-echelle', 'aria-hidden': 'true' });
  const corps = el('div', { class: 'echelle-corps' });
  PERIODES.forEach((p) => corps.append(el('span', {
    class: 'echelle-moment', html: `<span><i>${p.emoji}</i>${html(p.nom, { mots: false })}</span><small>${repereMoment(p)}じ〜</small>`,
  })));
  e.append(el('span'), corps);
  return e;
}

function barreLieux(d, dr, nomJour) {
  const barre = el('div', { class: 'barre-lieux', role: 'group', 'aria-label': `${nomJour}の ばしょ` });
  [25, 50, 75].forEach((x) => barre.append(el('span', { class: 'tic', style: `left:${x}%` })));
  const blocs = blocsLieux(dr.items).filter((b) => b.fin > DEBUT_JOUR && b.debut < FIN_JOUR);
  blocs.forEach((b) => {
    const l = LIEUX[b.lieu];
    const x = pos(b.debut);
    const w = Math.max(1.5, pos(b.fin) - x);
    const lire = `${lu(l.nom)}。 ${heureLue(b.debut)}から ${heureLue(b.fin)}まで`;
    const bouton_ = el('button', {
      type: 'button', class: `bloc lieu-${b.lieu}${w < 7 ? ' bloc-etroit' : ''}`, style: `left:${x}%;width:${w}%`, 'aria-label': lire,
      html: `<i aria-hidden="true">${l.emoji}</i><span class="bloc-nom">${html(l.nom, { mots: false })}</span>`,
    });
    activable(bouton_, () => ouvrirBloc(d, b, nomJour));
    barre.append(bouton_);
  });
  if (dr.aujourdhui) {
    const m = minutesMaintenant();
    if (m >= DEBUT_JOUR && m <= FIN_JOUR) barre.append(el('span', { class: 'ligne-maintenant', style: `left:${pos(m)}%` }));
  }
  if (!blocs.length) barre.append(el('span', { class: 'barre-vide', html: html('予定《よてい》は ない') }));
  return barre;
}

function listeRetenir(d, dr) {
  const items = aRetenir(d, dr.items);
  if (!items.length) return null;
  const ul = el('ul', { class: 'a-retenir' });
  items.slice(0, MAX_RETENIR).forEach((x) => {
    ul.append(el('li', {
      class: `retenir retenir-${x.sorte}${x.it ? ` lieu-${x.it.carte.lieu}` : ''}`,
      'data-lire': `${lu(x.texte)}${x.debut !== undefined && x.debut !== null ? `。 ${heureLue(x.debut)}から` : ''}`,
      html: `<i aria-hidden="true">${x.emoji}</i><span>${html(x.texte)}</span>${x.debut !== undefined && x.debut !== null ? `<small>${heureHtml(x.debut)}</small>` : ''}`,
    }));
  });
  if (items.length > MAX_RETENIR) ul.append(el('li', { class: 'retenir retenir-plus', text: `＋${items.length - MAX_RETENIR}` }));
  return ul;
}

// 「くわしく」 : les images de chaque moment, sous la barre (mêmes colonnes que l'échelle).
function moments(dr) {
  const grille = el('div', { class: 'sem-moments' });
  PERIODES.forEach((p) => {
    const du = dr.items.filter((it) => it.periode === p.id);
    const cellule = el('ul', { class: 'sem-moment', 'aria-label': `${lu(p.nom)}： ${du.map((it) => nomLu(it.carte)).join('、 ')}` });
    du.forEach((it) => cellule.append(el('li', {
      class: `sem-item lieu-${it.carte.lieu} statut-${it.statut}`,
      html: `${visuel(it.carte)}<span class="sem-item-texte"><small>${it.debut !== null ? heureHtml(it.debut) : ''}</small>${nomHtml(it.carte)}</span>`
        + `${it.fait ? `<span class="sem-fait">${ICONE_COCHE}</span>` : ''}`,
    })));
    grille.append(cellule);
  });
  return grille;
}

export function rendreSemaine(conteneur) {
  const lundi = ajouterJours(lundiDe(aujourdhui()), decalage * 7);
  const dimanche = ajouterJours(lundi, 6);
  const page = el('div', { class: `page-semaine niveau-${niveau}` });

  const tete = el('div', { class: 'tete-periode' });
  const nom = decalage === 0 ? '今週《こんしゅう》' : (decalage === 1 ? '来週《らいしゅう》' : (decalage === -1 ? '先週《せんしゅう》' : ''));
  tete.append(
    bouton('まえの 週《しゅう》', () => { decalage -= 1; rendreSemaine(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_GAUCHE }),
    el('h2', {
      class: 'titre-periode',
      'data-lire': `${nom ? `${lu(nom)}。 ` : ''}${yomiDate(lundi)}から ${yomiDate(dimanche)}まで`,
      html: `${nom ? `<span class="periode-nom">${html(nom)}</span>` : ''}<span class="periode-dates">${lundi.getMonth() + 1}/${lundi.getDate()} 〜 ${dimanche.getMonth() + 1}/${dimanche.getDate()}</span>`,
    }),
    bouton('つぎの 週《しゅう》', () => { decalage += 1; rendreSemaine(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_DROITE }),
  );
  page.append(tete);

  const options = el('div', { class: 'filtres', role: 'group' });
  [['simple', 'かんたん'], ['detail', 'くわしく']].forEach(([n, t]) => {
    const b = bouton(t, () => { niveau = n; rendreSemaine(conteneur); parler(lu(t)); }, { classe: `chip ${niveau === n ? 'chip-on' : ''}`, options: { garde: false } });
    b.setAttribute('aria-pressed', String(niveau === n));
    options.append(b);
  });
  page.append(options);

  // Les couleurs des lieux.
  const legende = el('ul', { class: 'legende-lieux' });
  Object.entries(LIEUX).forEach(([k, l]) => legende.append(el('li', {
    class: `lieu-${k}`, 'data-lire': lu(l.nom), html: `<i aria-hidden="true">${l.emoji}</i>${html(l.nom, { mots: false })}`,
  })));
  page.append(legende, echelle());

  const semaine = el('div', { class: 'semaine' });
  for (let i = 0; i < 7; i++) {
    const d = ajouterJours(lundi, i);
    const { sansEcole } = sorteDuJour(d);
    const dr = deroulement(d);
    const estAuj = dr.aujourdhui;
    const js = JOURS_SEMAINE[d.getDay()];
    const jour = el('section', { class: `sem-jour jour-${d.getDay()}${estAuj ? ' aujourdhui' : ''}${dr.passe ? ' passe' : ''}${sansEcole ? ' sans-ecole' : ''}` });
    const entete = el('button', {
      type: 'button', class: 'sem-tete', 'aria-label': `${yomiDate(d)}。 よていを みる`,
      html: `<span class="sem-nom">${html(js.court, { mots: false })}</span><span class="sem-date">${d.getMonth() + 1}/${d.getDate()}</span>`
        + `${estAuj ? `<span class="sem-auj">${html('今日《きょう》')}</span>` : ''}`,
    });
    activable(entete, () => nav.jour(d));
    const corps = el('div', { class: 'sem-corps' });
    corps.append(barreLieux(d, dr, lu(js.court)));
    if (niveau === 'detail') corps.append(moments(dr));
    const retenir = listeRetenir(d, dr);
    if (retenir) corps.append(retenir);
    jour.append(entete, corps);
    semaine.append(jour);
  }
  page.append(semaine);
  conteneur.replaceChildren(page);
  chargerPhotos(page);
}

// Toucher un lieu : ce qu'on y fait, dans l'ordre.
function ouvrirBloc(d, b, nomJour) {
  const l = LIEUX[b.lieu];
  const contenu = el('div', { class: 'detail-bloc' });
  contenu.append(el('p', {
    class: `detail-bloc-heures lieu-${b.lieu}`, 'data-lire': `${heureLue(b.debut)}から ${heureLue(b.fin)}まで`,
    html: `<i aria-hidden="true">${l.emoji}</i>${heureHtml(b.debut)}<span class="kara">〜</span>${heureHtml(b.fin)}`,
  }));
  const ol = el('ol', { class: 'liste-jour' });
  b.items.forEach((it) => {
    ol.append(el('li', {
      class: `act statut-${it.statut} lieu-${it.carte.lieu}`,
      html: `<div class="act-btn" data-lire="${plageLue(it.act) ? `${plageLue(it.act)}。 ` : ''}${nomLu(it.carte)}">`
        + `<span class="act-heure">${it.debut !== null ? heureHtml(it.debut) : ''}</span>${visuel(it.carte)}`
        + `<span class="act-nom">${nomHtml(it.carte)}</span><span class="act-etat" aria-hidden="true">${it.fait ? ICONE_COCHE : ''}</span></div>`,
    }));
  });
  contenu.append(ol);
  const actions = el('div', { class: 'actions-feuille' });
  actions.append(bouton('この 日《ひ》の 予定《よてい》を 見《み》る', () => { fermerFeuille(); nav.jour(d); }, { classe: 'btn btn-principal' }));
  contenu.append(actions);
  const titre = `${nomJour}（${d.getMonth() + 1}/${d.getDate()}）・ ${l.nom}`;
  ouvrirFeuille({ titre, contenu, lire: `${nomJour}、 ${lu(l.nom)}。 ${b.items.map((it) => nomLu(it.carte)).join('、 ')}` });
  parler(`${lu(l.nom)}。 ${b.items.map((it) => nomLu(it.carte)).join('、 ')}`);
}

export const remettreSemaine = () => { decalage = 0; };

