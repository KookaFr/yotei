/* ======================================================================
   Les données : emploi du temps, calendrier, étapes, cartes, journal
   Tout reste sur l'appareil (localStorage ; les photos dans IndexedDB, voir photos.js).
   ====================================================================== */

import {
  CARTES, exempleSemaine, journeeRepos, ROUTINES,
} from './catalogue.js';
import {
  ajouterJours, cle, deCle, ferie, jourIso, versMinutes,
} from './heure.js';
import { copie, uid } from './outils.js';
import { reglages } from './reglages.js';

const CLE = 'yotei.donnees';
const CLE_JOURNAL = 'yotei.journal';

const nouvelEtat = () => ({
  version: 1,
  semaine: exempleSemaine(),       // 1 = lundi … 7 = dimanche
  vacances: journeeRepos(),        // jours sans école (fériés, vacances)
  jours: {},                       // journées modifiées : { 'AAAA-MM-JJ': [activités] }
  evenements: [],                  // { id, date, fin, nom, emoji, sansEcole }
  routines: copie(ROUTINES),
  cartes: [],                      // cartes des parents, ou cartes du catalogue modifiées (même id)
  exemple: true,                   // l'emploi du temps est encore celui d'exemple
});

function lire(cleStockage, defaut) {
  try {
    const t = localStorage.getItem(cleStockage);
    return t ? JSON.parse(t) : defaut();
  } catch {
    return defaut();
  }
}

export let etat = lire(CLE, nouvelEtat);
export const journal = lire(CLE_JOURNAL, () => ({}));   // { date: { idActivité: { fait, a, photo, humeur } } }

const ecouteurs = new Set();
export const surChangement = (fn) => ecouteurs.add(fn);
export function enregistrer() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage plein ou indisponible */ }
  ecouteurs.forEach((fn) => fn());
}
export function enregistrerJournal() {
  try { localStorage.setItem(CLE_JOURNAL, JSON.stringify(journal)); } catch { /* idem */ }
  ecouteurs.forEach((fn) => fn());
}
export function remplacerEtat(nouveau) {
  etat = { ...nouvelEtat(), ...nouveau };
  enregistrer();
}
export function reinitialiser() {
  etat = nouvelEtat();
  enregistrer();
}

/* ----- Cartes ----- */

export function carte(id) {
  const base = CARTES.find((x) => x.id === id);
  const perso = etat.cartes.find((x) => x.id === id);
  if (base && perso) return { ...base, ...perso, catalogue: true };
  if (base) return { ...base, catalogue: true };
  if (perso) return perso;
  return { id, nom: '？', emoji: '❔', lieu: 'ie', recit: '' };
}
export const toutesLesCartes = () => [
  ...CARTES.map((x) => carte(x.id)),
  ...etat.cartes.filter((x) => !CARTES.some((b) => b.id === x.id)),
];
export function enregistrerCarte(c) {
  const i = etat.cartes.findIndex((x) => x.id === c.id);
  if (i >= 0) etat.cartes[i] = c;
  else etat.cartes.push(c);
  enregistrer();
}
export function supprimerCarte(id) {
  etat.cartes = etat.cartes.filter((x) => x.id !== id);
  enregistrer();
}

export const routine = (id) => etat.routines.find((r) => r.id === id) || null;

/* ----- Le programme d'une date ----- */

export const evenementsDu = (d) => {
  const k = cle(d);
  return etat.evenements.filter((ev) => ev.date <= k && k <= (ev.fin || ev.date));
};

// Quelle journée : 'modifiee' (les parents ou l'élève l'ont changée), 'vacances' (férié, vacances), ou le jour de la semaine.
export function sorteDuJour(d) {
  const k = cle(d);
  const nomFerie = reglages.feries ? ferie(d) : null;
  const evs = evenementsDu(d);
  const sansEcole = evs.find((ev) => ev.sansEcole);
  let sorte = String(jourIso(d));
  if (sansEcole || (nomFerie && jourIso(d) <= 5)) sorte = 'vacances';
  if (etat.jours[k]) sorte = 'modifiee';
  return { sorte, ferie: nomFerie, evenements: evs, sansEcole: Boolean(sansEcole) || Boolean(nomFerie) };
}

export function modeleDu(d) {
  const { sorte } = sorteDuJour(d);
  if (sorte === 'modifiee') return etat.jours[cle(d)];
  return modeleHabituel(d);
}
// Le programme habituel de ce jour (sans les changements de cette date) : pour repérer ce qui est inhabituel.
export function modeleHabituel(d) {
  const nomFerie = reglages.feries ? ferie(d) : null;
  if (evenementsDu(d).some((ev) => ev.sansEcole) || (nomFerie && jourIso(d) <= 5)) return etat.vacances;
  return etat.semaine[String(jourIso(d))] || [];
}

// Les activités d'une date, triées : celles qui ont une heure par heure, les autres gardent leur place.
export const programmeDu = (d) => modeleDu(d);

// Changer une seule journée : on part d'une copie de son modèle.
export function modifierJour(d, fn) {
  const k = cle(d);
  if (!etat.jours[k]) {
    etat.jours[k] = copie(modeleDu(d));
  }
  fn(etat.jours[k]);
  enregistrer();
}
export function retablirJour(d) {
  delete etat.jours[cle(d)];
  enregistrer();
}

// Une liste dont on a changé une heure : on la remet dans l'ordre des heures (les activités sans heure
// restent après celle qui les précède).
export function trierParHeure(liste) {
  const blocs = [];
  liste.forEach((act) => {
    if (versMinutes(act.debut) !== null || !blocs.length) blocs.push([act]);
    else blocs[blocs.length - 1].push(act);
  });
  blocs.sort((x, y) => (versMinutes(x[0].debut) ?? -1) - (versMinutes(y[0].debut) ?? -1));
  return blocs.flat();
}

/* ----- Le temps libre et ce qu'on y fait -----
   Un « créneau » (自由時間) peut contenir des loisirs choisis par l'enfant (テレビ, ゲーム…) :
   act.loisirs = ['terebi', 'game']. Ils n'ont pas d'heure à eux : ils se font pendant le créneau. */
export const estCadreLibre = (c) => Boolean(c && c.cadre);
export const estLoisir = (c) => Boolean(c && c.libre && !c.cadre);
// 寝る : on ne la « finit » pas ; le bouton est 「おやすみ」 (il va au lit), et la nuit l'écran dit bonne nuit.
export const estSommeil = (c) => Boolean(c && c.sommeil);

export function mettreDansLibre(d, idAct, idCarte) {
  modifierJour(d, (liste) => {
    const a = liste.find((x) => x.id === idAct);
    if (!a) return;
    a.loisirs = [...new Set([...(a.loisirs || []), idCarte])];
  });
}
export function changerLoisirs(d, idAct, loisirs) {
  modifierJour(d, (liste) => {
    const a = liste.find((x) => x.id === idAct);
    if (!a) return;
    if (loisirs.length) a.loisirs = [...new Set(loisirs)];
    else delete a.loisirs;
  });
}

export const nouvelleActivite = (idCarte, debut = '', fin = '', parEleve = false) => ({
  id: uid('a'), carte: idCarte, debut, fin, ...(parEleve ? { parEleve: true } : {}),
});

/* ----- Les événements à venir ----- */

export function prochainsEvenements(depuis, nb = 3, jours = 60) {
  const k = cle(depuis);
  const limite = cle(ajouterJours(depuis, jours));
  return etat.evenements
    .filter((ev) => (ev.fin || ev.date) >= k && ev.date <= limite)
    .sort((x, y) => x.date.localeCompare(y.date))
    .slice(0, nb);
}

/* ----- Le journal : ce qui est fait, les photos et les humeurs du soir ----- */

export const journalDu = (d) => journal[cle(d)] || {};
export function noter(d, idActivite, modifs) {
  const k = cle(d);
  journal[k] = journal[k] || {};
  journal[k][idActivite] = { ...(journal[k][idActivite] || {}), ...modifs };
  enregistrerJournal();
}
export function oublier(d, idActivite) {
  const k = cle(d);
  if (journal[k]) delete journal[k][idActivite];
  enregistrerJournal();
}
// Les journées anciennes : on garde le journal, mais les photos de plus de N jours sont effacées (photos.js).
export function photosAnciennes(avant) {
  const k = cle(avant);
  const ids = [];
  Object.entries(journal).forEach(([date, notes]) => {
    if (date >= k) return;
    Object.values(notes).forEach((note) => {
      if (note.photo) {
        ids.push(note.photo);
        delete note.photo;
      }
    });
  });
  if (ids.length) enregistrerJournal();
  return ids;
}
export const joursAvecPhotos = () => new Set(Object.entries(journal)
  .filter(([, notes]) => Object.values(notes).some((x) => x.photo)).map(([date]) => date));

export { deCle };
