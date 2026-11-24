/* ======================================================================
   Le déroulement d'une journée : ce qui est fait, passé, en cours, à venir
   - une activité sans heure de fin finit quand commence la suivante qui a une heure ;
   - une activité sans heure reçoit une heure calculée d'après sa place (debutEff, finEff) ;
   - « いま » : la première activité ni faite ni passée (les cours passent seuls à l'heure,
     les activités de la maison sans heure attendent qu'on les coche) ;
   - si « いま » n'a pas encore commencé, on la montre comme « つぎ », avec le temps qui reste avant.
   ====================================================================== */

import {
  aujourdhui, cle, minutesMaintenant, versMinutes,
} from './heure.js';
import {
  carte, carteDe, journalDu, modeleHabituel, programmeDu, sorteDuJour,
} from './donnees.js';
import { lu } from './texte.js';

/* ----- Les moments de la journée, sur les repères de tous les jours :
   朝 jusqu'à midi (ごぜん), 昼 de 12 h à 14 h (déjeuner, pause), 午後 de 14 h à 18 h, 夜 après 18 h. ----- */
export const PERIODES = [
  { id: 'asa', nom: '朝《あさ》', emoji: '🌅', debut: 6 * 60, fin: 12 * 60 },
  { id: 'hiru', nom: '昼《ひる》', emoji: '☀️', debut: 12 * 60, fin: 14 * 60 },
  { id: 'gogo', nom: '午後《ごご》', emoji: '🌤️', debut: 14 * 60, fin: 18 * 60 },
  { id: 'yoru', nom: '夜《よる》', emoji: '🌙', debut: 18 * 60, fin: 24 * 60 },
];
export const DEBUT_JOUR = 6 * 60;
export const FIN_JOUR = 22 * 60;
// La place de chaque moment sur l'échelle 6 h – 22 h (la semaine) : 6fr 2fr 4fr 4fr.
export const colonnesMoments = () => PERIODES
  .map((p) => `minmax(0, ${(Math.min(p.fin, FIN_JOUR) - Math.max(p.debut, DEBUT_JOUR)) / 60}fr)`).join(' ');
// Les cours ont une heure de fin fixe : on ne les coche pas avant (cartes de l'école, sauf les trajets).
export const finFixe = (c) => (c.finFixe ?? (c.lieu === 'gakko' && !c.trajet));
export const AVANT_FIN = 5;
const PART_MIN = 15;
const PART_FIN = 30;
// Minutes avant la fin d'un cours (0 si on peut cocher).
export const coursEnCours = (dr, it) => (dr.aujourdhui && finFixe(it.carte) && it.fin !== null && !it.passe && !it.fait
  && it.fin - dr.maintenant > AVANT_FIN ? Math.ceil(it.fin - dr.maintenant) : 0);
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
      act, carte: carteDe(act), debut: versMinutes(act.debut), fin: versMinutes(act.fin), note, fait: Boolean(note && note.fait), index: i,
      loisirs: (act.loisirs || []).map((id) => carte(id)),
    };
  });
  // Fin effective d'une activité à heure : sa fin ; sinon le début de la suivante qui a une heure.
  const suivanteApres = (i, debut) => {
    for (let j = i + 1; j < items.length; j++) {
      const dj = items[j].debut;
      if (dj !== null && (debut === null || dj > debut)) return dj;
    }
    return null;
  };
  items.forEach((it, i) => {
    it.debutEff = it.debut;
    if (it.debut !== null) it.finEff = it.fin !== null ? it.fin : suivanteApres(i, it.debut);
  });
  // Une activité sans heure reçoit une heure calculée d'après sa place, pour suivre les mêmes règles que les
  // autres (いま / つぎ, pas de 「おわった」 plus de 15 minutes avant). Le temps entre l'activité à heure qui la
  // précède et la suivante est partagé : avec la précédente si elle n'a pas d'heure de fin, sinon après sa fin.
  // Des parts de 5 en 5 minutes, au moins 15 minutes ; 30 minutes après la dernière activité de la journée.
  for (let i = 0; i < items.length;) {
    if (items[i].debut !== null) { i += 1; continue; }
    let j = i;
    while (j < items.length && items[j].debut === null) j += 1;
    const groupe = items.slice(i, j);
    const a = i > 0 ? items[i - 1] : null;
    const b = suivanteApres(j - 1, a ? a.debut : null);
    let t = null;
    let part = PART_MIN;
    if (a) {
      const partage = a.fin === null;
      const depart = partage ? a.debut : a.fin;
      const parts = groupe.length + (partage ? 1 : 0);
      if (b === null) part = PART_FIN;
      else if (b > depart) part = Math.max(PART_MIN, Math.floor((b - depart) / parts / 5) * 5);
      t = depart;
      if (partage) { a.finEff = depart + part; t += part; }
    } else if (b !== null) {
      t = b - PART_MIN * groupe.length;   // tout au début de la liste : juste avant la première heure
    }
    groupe.forEach((it) => {
      it.debutEff = t;
      it.finEff = t === null ? null : t + part;
      if (t !== null) t += part;
    });
    const dernier = groupe[groupe.length - 1];
    if (b !== null && dernier.finEff !== null && dernier.finEff < b) dernier.finEff = b;
    i = j;
  }
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
  const commence = Boolean(actuel) && (actuel.debutEff === null || actuel.debutEff <= maintenant);
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

/* ----- Ce qu'on fait pendant un temps libre ----- */

// 「テレビ、 ゲーム」 (lu).
export const loisirsLus = (it) => it.loisirs.map((c) => lu(c.nom)).join('、 ');
// La phrase du soir : 「自由時間に テレビを 見ました。 ゲームを しました。」
export function recitDe(it) {
  const c = it.carte;
  if (!it.loisirs || !it.loisirs.length) return c.recit || '';
  const phrases = it.loisirs.map((l) => l.recit || `${l.nom}を しました。`);
  return `${c.nom}に ${phrases.join(' ')}`;
}

/* ----- Une activité longue (パパと すごす 10:00〜18:00) remplace ce qui était prévu pendant ce temps ----- */

// Les activités qui commencent dans [debut, fin[ (pas celles qui sont faites, ni 寝る).
export const activitesEntre = (items, debut, fin) => items
  .filter((it) => it.debutEff !== null && it.debutEff >= debut && it.debutEff < fin && !it.fait && !it.carte.sommeil);
