/* ======================================================================
   Choisir une carte d'activité (élève : 「よていを いれる」 ; parents : l'éditeur)
   Pour l'élève, un premier toucher dit le nom ; on confirme avec le grand bouton.
   (Le jour et la place viennent ensuite : vues/placer.js.)
   ====================================================================== */

import { LIEUX } from './catalogue.js';
import { toutesLesCartes } from './donnees.js';
import { aujourdhui, JOURS_SEMAINE } from './heure.js';
import { el } from './outils.js';
import { chargerPhotos } from './photos.js';
import { activable } from './tactile.js';
import { html, lu } from './texte.js';
import {
  bouton, fermerFeuille, ICONE_COCHE, ouvrirFeuille, visuel,
} from './ui.js';
import { parler } from './voix.js';

let ongletChoisi = 'ie';

// 「きょう」, 「あした」, 「あさって」, puis le jour de la semaine (「もくようび」, ou 「もく」 en court).
export function nomJour(d, court = false) {
  const n = Math.round((d - aujourdhui()) / 86400000);
  if (n === 0) return '今日《きょう》';
  if (n === 1) return '明日《あした》';
  if (n === 2) return 'あさって';
  // Plus loin (depuis le calendrier du mois) : la date.
  if (n < 0 || n >= 7) return `${d.getMonth() + 1}がつ ${d.getDate()}にち`;
  return JOURS_SEMAINE[d.getDay()][court ? 'court' : 'long'];
}

export function choisirCarte({
  titre = 'カードを えらぶ', surChoix, confirmer = true, lieu = null, texteOk = 'これに する',
}) {
  if (lieu) ongletChoisi = lieu;
  const contenu = el('div', { class: 'choix-carte' });
  const onglets = el('div', { class: 'choix-onglets', role: 'tablist' });
  const grille = el('div', { class: 'choix-grille' });
  const pied = el('div', { class: 'choix-pied' });
  let choisie = null;

  const ok = bouton(texteOk, () => {
    if (!choisie) return;
    fermerFeuille();
    surChoix(choisie);
  }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE });
  ok.disabled = true;
  if (confirmer) pied.append(ok);

  const remplir = () => {
    onglets.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.lieu === ongletChoisi)));
    grille.replaceChildren();
    toutesLesCartes().filter((c) => c.lieu === ongletChoisi).forEach((c) => {
      const b = el('button', {
        type: 'button', class: `tuile-carte lieu-${c.lieu}${choisie === c.id ? ' choisie' : ''}`, 'aria-label': lu(c.nom), 'data-lire': lu(c.nom),
        html: `${visuel(c)}<span class="tuile-nom">${html(c.nom)}</span>`,
      });
      activable(b, () => {
        if (!confirmer) { fermerFeuille(); surChoix(c.id); return; }
        choisie = c.id;
        grille.querySelectorAll('.tuile-carte').forEach((t) => t.classList.toggle('choisie', t === b));
        ok.disabled = false;
        parler(lu(c.nom));
      });
      grille.append(b);
    });
    chargerPhotos(grille);
  };
  Object.entries(LIEUX).forEach(([k, l]) => {
    const b = el('button', { type: 'button', class: `choix-onglet lieu-${k}`, role: 'tab', 'data-lieu': k, html: html(l.nom), 'aria-label': lu(l.nom) });
    activable(b, () => { ongletChoisi = k; remplir(); parler(lu(l.nom)); }, { garde: false });
    onglets.append(b);
  });
  contenu.append(onglets, grille, pied);
  ouvrirFeuille({ titre, contenu, classe: 'feuille-haute' });
  remplir();
}
