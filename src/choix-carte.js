/* ======================================================================
   Choisir une carte d'activité (élève : 「よていを いれる」 ; parents : l'éditeur)
   Pour l'élève, un premier toucher dit le nom ; on confirme avec le grand bouton.
   Avec « quand », on choisit aussi le jour (きょう, あした, …) et le moment (つぎ, あさ, ひる, ごご, よる) :
   le bouton dit ce qui va se passer (「あしたの ごごに いれる」).
   ====================================================================== */

import { LIEUX } from './catalogue.js';
import { toutesLesCartes } from './donnees.js';
import {
  ajouterJours, aujourdhui, cle, JOURS_SEMAINE, minutesMaintenant,
} from './heure.js';
import { deroulement, PERIODES } from './journee.js';
import { el } from './outils.js';
import { chargerPhotos } from './photos.js';
import { activable } from './tactile.js';
import { html, lu } from './texte.js';
import {
  bouton, fermerFeuille, ICONE_COCHE, ouvrirFeuille, visuel,
} from './ui.js';
import { parler } from './voix.js';

let ongletChoisi = 'ie';

// 「きょう」, 「あした」, 「あさって」, puis le jour de la semaine (「もく」).
function nomJour(d, court = false) {
  const n = Math.round((d - aujourdhui()) / 86400000);
  if (n === 0) return '今日《きょう》';
  if (n === 1) return '明日《あした》';
  if (n === 2) return 'あさって';
  return JOURS_SEMAINE[d.getDay()][court ? 'court' : 'long'];
}

export function choisirCarte({
  titre = 'カードを えらぶ', surChoix, confirmer = true, lieu = null, quand = null,
}) {
  if (lieu) ongletChoisi = lieu;
  const contenu = el('div', { class: 'choix-carte' });
  const onglets = el('div', { class: 'choix-onglets', role: 'tablist' });
  const grille = el('div', { class: 'choix-grille' });
  const pied = el('div', { class: 'choix-pied' });
  let choisie = null;

  // Le jour et le moment (seulement pour l'élève).
  let jour = quand ? quand.date : null;
  let moment = null;
  const blocQuand = el('div', { class: 'choix-quand' });
  const momentsPossibles = () => {
    const auj = cle(jour) === cle(aujourdhui());
    const liste = [];
    if (auj && deroulement(jour).actuel) liste.push({ id: 'apres', nom: 'つぎ', emoji: '👉' });
    const m = minutesMaintenant();
    PERIODES.forEach((p) => { if (!auj || p.fin > m) liste.push({ id: p.id, nom: p.nom, emoji: p.emoji }); });
    return liste;
  };
  const texteQuand = () => {
    const mo = momentsPossibles().find((x) => x.id === moment);
    return mo ? `${nomJour(jour)}の ${mo.nom}` : '';
  };

  const ok = bouton('これに する', () => {
    if (!choisie || (quand && !moment)) return;
    fermerFeuille();
    if (quand) surChoix(choisie, { date: jour, moment, texte: texteQuand() });
    else surChoix(choisie);
  }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE });
  const majOk = () => {
    ok.disabled = !choisie || Boolean(quand && !moment);
    if (quand) {
      const t = moment ? `${texteQuand()}に 入《い》れる` : '何時《なんじ》ごろ？';
      ok.querySelector('span').innerHTML = html(t);
      ok.setAttribute('aria-label', lu(t));
    }
  };
  if (confirmer) pied.append(ok);

  const remplirQuand = () => {
    blocQuand.replaceChildren();
    const jours = el('div', { class: 'cq-chips', role: 'group', 'aria-label': 'いつ？' });
    const premier = aujourdhui();
    for (let i = 0; i < 7; i++) {
      const d = ajouterJours(premier, i);
      const nom = nomJour(d);
      const court = nomJour(d, true);
      const b = el('button', {
        type: 'button', class: `chip${cle(d) === cle(jour) ? ' chip-on' : ''} jour-${d.getDay()}`, 'aria-pressed': String(cle(d) === cle(jour)),
        'aria-label': lu(nom), html: `${html(court, { mots: false })}<small>${d.getMonth() + 1}/${d.getDate()}</small>`,
      });
      activable(b, () => {
        jour = d;
        if (!momentsPossibles().some((x) => x.id === moment)) moment = null;
        remplirQuand();
        majOk();
        parler(lu(nom));
      }, { garde: false });
      jours.append(b);
    }
    const moments = el('div', { class: 'cq-chips', role: 'group', 'aria-label': 'なんじごろ？' });
    momentsPossibles().forEach((mo) => {
      const b = el('button', {
        type: 'button', class: `chip${moment === mo.id ? ' chip-on' : ''}`, 'aria-pressed': String(moment === mo.id), 'aria-label': lu(mo.nom),
        html: `<span aria-hidden="true">${mo.emoji}</span>${html(mo.nom, { mots: false })}`,
      });
      activable(b, () => { moment = mo.id; remplirQuand(); majOk(); parler(lu(mo.nom)); }, { garde: false });
      moments.append(b);
    });
    blocQuand.append(
      el('p', { class: 'cq-label', 'data-lire': 'いつ？', html: html('いつ？') }), jours,
      el('p', { class: 'cq-label', 'data-lire': 'なんじごろ？', html: html('何時《なんじ》ごろ？') }), moments,
    );
  };
  if (quand) {
    // Aujourd'hui : juste après l'activité en cours, par défaut.
    moment = momentsPossibles().some((x) => x.id === 'apres') ? 'apres' : null;
    remplirQuand();
  }

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
        majOk();
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
  if (quand) contenu.append(blocQuand);
  contenu.append(onglets, grille, pied);
  ouvrirFeuille({ titre, contenu, classe: 'feuille-haute' });
  remplir();
  majOk();
}
