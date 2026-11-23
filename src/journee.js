/* ======================================================================
   Le déroulement d'une journée : ce qui est fait, passé, en cours, à venir
   - une activité sans heure de fin finit quand commence la suivante qui a une heure ;
   - « いま » : la première activité ni faite ni passée (les cours passent seuls à l'heure,
     les activités de la maison sans heure attendent qu'on les coche) ;
   - si « いま » n'a pas encore commencé, on la montre comme « つぎ », avec le temps qui reste avant.
   ====================================================================== */

import {
  aujourdhui, cle, minutesMaintenant, versMinutes,
} from './heure.js';
import {
  carte, journalDu, modeleHabituel, programmeDu, sorteDuJour,
} from './donnees.js';
import { lu } from './texte.js';

/* ----- Les moments de la journée : 4 parts égales de 4 heures (6 h, 10 h, 14 h, 18 h, 22 h) ----- */
export const PERIODES = [
  { id: 'asa', nom: '朝《あさ》', emoji: '🌅', debut: 6 * 60, fin: 10 * 60 },
  { id: 'hiru', nom: '昼《ひる》', emoji: '☀️', debut: 10 * 60, fin: 14 * 60 },
  { id: 'gogo', nom: '午後《ごご》', emoji: '🌤️', debut: 14 * 60, fin: 18 * 60 },
  { id: 'yoru', nom: '夜《よる》', emoji: '🌙', debut: 18 * 60, fin: 22 * 60 },
];
export const DEBUT_JOUR = 6 * 60;
export const FIN_JOUR = 22 * 60;
export const periodeDe = (min) => PERIODES.find((p) => min < p.fin) || PERIODES[PERIODES.length - 1];
export const indexPeriode = (id) => PERIODES.findIndex((p) => p.id === id);

export function deroulement(d, maintenant = minutesMaintenant()) {
  const liste = programmeDu(d);
  const notes = journalDu(d);
  const k = cle(d);
  const kAuj = cle(aujourdhui());
  const items = liste.map((act, i) => {
    const note = notes[act.id] || null;
    return {
      act, carte: carte(act.carte), debut: versMinutes(act.debut), fin: versMinutes(act.fin), note, fait: Boolean(note && note.fait), index: i,
    };
  });
  // Fin effective : sa fin ; sinon le début de la suivante qui a une heure. Une activité sans heure (ajoutée par
  // l'élève) a au moins 15 minutes après la précédente, même si la suivante commence tout de suite.
  items.forEach((it, i) => {
    let suivante = null;
    for (let j = i + 1; j < items.length; j++) {
      const dj = items[j].debut;
      if (dj !== null && (it.debut === null || dj > it.debut)) { suivante = dj; break; }
    }
    if (it.fin !== null) it.finEff = it.fin;
    else if (it.debut !== null) it.finEff = suivante;
    else {
      const avant = i > 0 ? items[i - 1].finEff : null;
      it.finEff = suivante === null ? null : Math.max(suivante, avant !== null ? avant + 15 : suivante);
    }
  });
  // Le moment de chaque activité ; une activité sans heure suit la précédente.
  let periode = PERIODES[0];
  items.forEach((it) => {
    if (it.debut !== null) periode = periodeDe(it.debut);
    it.periode = periode.id;
  });
  // Ce qui n'est pas dans le programme habituel de ce jour (date modifiée, ajout de l'élève).
  if (sorteDuJour(d).sorte === 'modifiee') {
    const habituels = new Set(modeleHabituel(d).map((a) => a.id));
    items.forEach((it) => { it.inhabituel = !habituels.has(it.act.id); });
  }
  let iActuel = -1;
  if (k === kAuj) {
    items.forEach((it) => { it.passe = it.finEff !== null && it.finEff <= maintenant; });
    iActuel = items.findIndex((it) => !it.fait && !it.passe);
  } else {
    items.forEach((it) => { it.passe = k < kAuj; });
  }
  items.forEach((it, i) => {
    if (it.fait) it.statut = 'fait';
    else if (i === iActuel) it.statut = 'maintenant';
    else it.statut = it.passe ? 'passe' : 'avenir';
  });
  const actuel = iActuel >= 0 ? items[iActuel] : null;
  const commence = Boolean(actuel) && (actuel.debut === null || actuel.debut <= maintenant);
  const suivant = actuel ? items.slice(iActuel + 1).find((it) => !it.fait && !it.passe) || null : null;
  return { items, actuel, commence, suivant, maintenant, aujourdhui: k === kAuj, passe: k < kAuj };
}

/* ----- Les lieux de la journée, en blocs (maison → école → maison) ----- */
export function blocsLieux(items) {
  const blocs = [];
  let bloc = null;
  items.forEach((it) => {
    const lieu = it.carte.lieu;
    if (it.debut === null) {
      if (bloc && bloc.lieu === lieu) bloc.items.push(it);
      else {
        const debut = bloc ? bloc.fin : DEBUT_JOUR;
        bloc = { lieu, debut, fin: debut + 15, items: [it] };
        blocs.push(bloc);
      }
      return;
    }
    const fin = it.finEff !== null && it.finEff > it.debut ? it.finEff : it.debut + 30;
    if (bloc && bloc.lieu === lieu && it.debut - bloc.fin <= 30) {
      bloc.fin = Math.max(bloc.fin, fin);
      bloc.items.push(it);
    } else {
      if (bloc && bloc.fin > it.debut) bloc.fin = it.debut;
      bloc = { lieu, debut: it.debut, fin, items: [it] };
      blocs.push(bloc);
    }
  });
  return blocs;
}

/* ----- Ce qu'il ne faut pas oublier : jour férié, événements, activités importantes ou inhabituelles ----- */
export function aRetenir(d, items) {
  const { ferie, evenements } = sorteDuJour(d);
  const res = [];
  if (ferie) res.push({ emoji: '🎌', texte: ferie, sorte: 'ferie' });
  evenements.forEach((ev) => res.push({ emoji: ev.emoji || '⭐', texte: ev.nom, sorte: 'evenement' }));
  const affaires = mochimonoDu(d, items);
  if (affaires.length) res.push({ emoji: '🎒', texte: affaires.map((a) => a.texte).join('・'), sorte: 'mochimono', liste: affaires });
  items.filter((it) => it.carte.important || it.inhabituel || it.act.parEleve).forEach((it) => {
    if (res.some((x) => x.texte === it.carte.nom)) return;
    res.push({ emoji: it.carte.emoji || '⭐', texte: it.carte.nom, debut: it.debut, sorte: it.act.parEleve ? 'eleve' : 'activite', it });
  });
  return res;
}

/* ----- Les affaires à emporter (もちもの) : celles des cartes de la journée, sans doublon ----- */
export function mochimonoDu(d, items = deroulement(d).items) {
  const res = [];
  items.forEach((it) => (it.carte.mochimono || []).forEach((a) => {
    if (!a || !a.texte || res.some((x) => lu(x.texte) === lu(a.texte))) return;
    res.push({ ...a, carte: it.carte, debut: it.debut, fini: Boolean(it.passe || it.fait) });
  }));
  return res;
}
