/* ======================================================================
   「こんしゅう」 : la semaine (時間割). Par défaut, seulement l'école ;
   「ぜんぶ」 montre aussi la maison. Toucher un jour ouvre son programme.
   Grand écran : une colonne par jour. Téléphone : une ligne par jour, avec les images.
   ====================================================================== */

import { sorteDuJour } from '../donnees.js';
import {
  ajouterJours, aujourdhui, cle, JOURS_SEMAINE, lundiDe, yomiDate,
} from '../heure.js';
import { deroulement } from '../journee.js';
import { nav } from '../nav.js';
import { el } from '../outils.js';
import { chargerPhotos } from '../photos.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, heureHtml, ICONE_COCHE, ICONE_DROITE, ICONE_GAUCHE, nomHtml, nomLu, visuel,
} from '../ui.js';
import { parler } from '../voix.js';

let decalage = 0;
let filtre = 'gakko';

export function rendreSemaine(conteneur) {
  const lundi = ajouterJours(lundiDe(aujourdhui()), decalage * 7);
  const dimanche = ajouterJours(lundi, 6);
  const page = el('div', { class: 'page-semaine' });

  const tete = el('div', { class: 'tete-periode' });
  const prec = bouton('まえの 週《しゅう》', () => { decalage -= 1; rendreSemaine(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_GAUCHE });
  const suiv = bouton('つぎの 週《しゅう》', () => { decalage += 1; rendreSemaine(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_DROITE });
  const nom = decalage === 0 ? '今週《こんしゅう》' : (decalage === 1 ? '来週《らいしゅう》' : (decalage === -1 ? '先週《せんしゅう》' : ''));
  const titre = el('h2', {
    class: 'titre-periode',
    'data-lire': `${nom ? `${lu(nom)}。 ` : ''}${yomiDate(lundi)}から ${yomiDate(dimanche)}まで`,
    html: `${nom ? `<span class="periode-nom">${html(nom)}</span>` : ''}<span class="periode-dates">${lundi.getMonth() + 1}/${lundi.getDate()} 〜 ${dimanche.getMonth() + 1}/${dimanche.getDate()}</span>`,
  });
  tete.append(prec, titre, suiv);
  page.append(tete);

  const filtres = el('div', { class: 'filtres', role: 'group' });
  [['gakko', '学校《がっこう》だけ'], ['tout', 'ぜんぶ']].forEach(([f, t]) => {
    const b = bouton(t, () => { filtre = f; rendreSemaine(conteneur); parler(lu(t)); }, { classe: `chip ${filtre === f ? 'chip-on' : ''}`, options: { garde: false } });
    b.setAttribute('aria-pressed', String(filtre === f));
    filtres.append(b);
  });
  page.append(filtres);

  const grille = el('div', { class: 'semaine' });
  for (let i = 0; i < 7; i++) {
    const d = ajouterJours(lundi, i);
    const { ferie, evenements, sansEcole } = sorteDuJour(d);
    const dr = deroulement(d);
    const items = dr.items.filter((it) => filtre === 'tout' || it.carte.lieu === 'gakko');
    const estAuj = cle(d) === cle(aujourdhui());
    const col = el('section', { class: `sem-jour jour-${d.getDay()}${estAuj ? ' aujourdhui' : ''}${dr.passe ? ' passe' : ''}${sansEcole ? ' sans-ecole' : ''}` });
    const js = JOURS_SEMAINE[d.getDay()];
    const etiquettes = [
      ...(ferie ? [`<span class="pastille pastille-ferie">${html(ferie)}</span>`] : []),
      ...evenements.map((ev) => `<span class="pastille">${ev.emoji || '⭐'} ${html(ev.nom)}</span>`),
    ].join('');
    const entete = el('button', {
      type: 'button', class: 'sem-tete',
      'aria-label': `${yomiDate(d)}${ferie ? `、 ${lu(ferie)}` : ''}。 ${items.map((it) => nomLu(it.carte)).join('、 ')}`,
      html: `<span class="sem-nom">${html(js.court, { mots: false })}</span><span class="sem-date">${d.getMonth() + 1}/${d.getDate()}</span>`
        + `${estAuj ? `<span class="sem-auj">${html('今日《きょう》')}</span>` : ''}`,
    });
    activable(entete, () => nav.jour(d));
    col.append(entete);
    if (etiquettes) col.append(el('div', { class: 'sem-etiquettes', html: etiquettes }));
    const ul = el('ul', { class: 'sem-items', role: 'button', tabindex: '0', 'aria-label': entete.getAttribute('aria-label') });
    if (!items.length) {
      ul.append(el('li', { class: 'sem-vide', html: html(filtre === 'gakko' && sansEcole ? '休《やす》み' : (filtre === 'gakko' ? '学校《がっこう》は ない' : '―')) }));
    }
    items.forEach((it) => {
      const li = el('li', {
        class: `sem-item lieu-${it.carte.lieu} statut-${it.statut}`,
        html: `<span class="sem-heure">${it.debut !== null ? heureHtml(it.debut) : ''}</span>${visuel(it.carte)}<span class="sem-item-nom">${nomHtml(it.carte)}</span>`
          + `${it.fait ? `<span class="sem-fait">${ICONE_COCHE}</span>` : ''}`,
      });
      ul.append(li);
    });
    col.append(ul);
    // Téléphone : toute la ligne ouvre le jour.
    activable(ul, () => nav.jour(d));
    grille.append(col);
  }
  page.append(grille);
  conteneur.replaceChildren(page);
  chargerPhotos(page);
}

export const remettreSemaine = () => { decalage = 0; };
