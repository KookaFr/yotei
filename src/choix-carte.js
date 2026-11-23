/* ======================================================================
   Choisir une carte d'activité (élève : 「よていを いれる」 ; parents : l'éditeur)
   Pour l'élève, un premier toucher dit le nom ; on confirme avec 「これに する」.
   ====================================================================== */

import { LIEUX } from './catalogue.js';
import { toutesLesCartes } from './donnees.js';
import { el } from './outils.js';
import { chargerPhotos } from './photos.js';
import { activable } from './tactile.js';
import { html, lu } from './texte.js';
import {
  bouton, fermerFeuille, ICONE_COCHE, ouvrirFeuille, visuel,
} from './ui.js';
import { parler } from './voix.js';

let ongletChoisi = 'ie';

export function choisirCarte({ titre = 'カードを えらぶ', surChoix, confirmer = true, lieu = null }) {
  if (lieu) ongletChoisi = lieu;
  const contenu = el('div', { class: 'choix-carte' });
  const onglets = el('div', { class: 'choix-onglets', role: 'tablist' });
  const grille = el('div', { class: 'choix-grille' });
  const pied = el('div', { class: 'choix-pied' });
  let choisie = null;
  const ok = bouton('これに する', () => { if (choisie) { fermerFeuille(); surChoix(choisie); } },
    { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE });
  ok.disabled = true;
  if (confirmer) pied.append(ok);

  const remplir = () => {
    onglets.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.lieu === ongletChoisi)));
    grille.replaceChildren();
    toutesLesCartes().filter((c) => c.lieu === ongletChoisi).forEach((c) => {
      const b = el('button', {
        type: 'button', class: `tuile-carte lieu-${c.lieu}`, 'aria-label': lu(c.nom), 'data-lire': lu(c.nom),
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
    activable(b, () => { ongletChoisi = k; choisie = null; ok.disabled = true; remplir(); parler(lu(l.nom)); }, { garde: false });
    onglets.append(b);
  });
  contenu.append(onglets, grille, pied);
  ouvrirFeuille({ titre, contenu, classe: 'feuille-haute' });
  remplir();
}
