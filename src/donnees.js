/* ======================================================================
   Les données : emploi du temps, calendrier, étapes, cartes, journal
   Tout reste sur l'appareil (localStorage ; les photos dans IndexedDB, voir photos.js).
   ====================================================================== */

import {
  CARTES, exempleSemaine, journeeRepos, PERSONNES, ROUTINES,
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
  joursBase: {},                   // pour une date où l'élève a seulement ajouté : le programme habituel d'alors (JSON)
  evenements: [],                  // { id, date, fin, nom, emoji, sansEcole }
  routines: copie(ROUTINES),
  cartes: [],                      // cartes des parents, ou cartes du catalogue modifiées (même id)
  personnes: copie(PERSONNES),     // 「だれと？」 : { id, nom, emoji, photo }
  exemple: true,                   // l'emploi du temps est encore celui d'exemple
});

const estObjet = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

// Un stockage illisible n'est pas perdu : on le met de côté avant que l'exemple ne l'écrase.
function lire(cleStockage, defaut) {
  let t = null;
  try { t = localStorage.getItem(cleStockage); } catch { return defaut(); }
  if (!t) return defaut();
  try {
    const v = JSON.parse(t);
    if (estObjet(v)) return v;
  } catch { /* illisible : voir dessous */ }
  try { localStorage.setItem(`${cleStockage}.secours`, t); } catch { /* plus de place */ }
  return defaut();
}

// Les émoji viennent des parents ou d'une sauvegarde : jamais de balise (ils sont insérés dans la page).
function assainirEmoji(x) {
  if (Array.isArray(x)) x.forEach(assainirEmoji);
  else if (estObjet(x)) {
    Object.keys(x).forEach((k) => {
      if (k === 'emoji') x[k] = typeof x[k] === 'string' ? x[k].replace(/[<>&"'`]/g, '').slice(0, 16) : '';
      else assainirEmoji(x[k]);
    });
  }
  return x;
}

// Un état toujours complet et du bon type, quoi que contienne le stockage ou une sauvegarde importée
// (une liste à la place d'un objet donnait un écran blanc, espace parents compris).
export function normaliserEtat(brut) {
  const base = nouvelEtat();
  const e = { ...base, ...(estObjet(brut) ? brut : {}) };
  ['semaine', 'jours', 'joursBase'].forEach((k) => { if (!estObjet(e[k])) e[k] = base[k]; });
  ['vacances', 'evenements', 'routines', 'cartes', 'personnes'].forEach((k) => { if (!Array.isArray(e[k])) e[k] = base[k]; });
  for (let j = 1; j <= 7; j++) if (!Array.isArray(e.semaine[j])) e.semaine[j] = base.semaine[j] || [];
  Object.keys(e.jours).forEach((k) => { if (!Array.isArray(e.jours[k])) delete e.jours[k]; });
  e.evenements = e.evenements.filter((ev) => estObjet(ev) && typeof ev.date === 'string');
  return assainirEmoji(e);
}

export let etat = normaliserEtat(lire(CLE, nouvelEtat));
export const journal = lire(CLE_JOURNAL, () => ({}));   // { date: { idActivité: { fait, a, photo, humeur } } }

// L'appareil a refusé une écriture (stockage plein, navigation privée) : l'appli le dit, sinon les
// changements disparaîtraient sans prévenir au prochain démarrage.
let panne = false;
function ecrire(cleStockage, valeur) {
  try {
    localStorage.setItem(cleStockage, JSON.stringify(valeur));
    panne = false;
  } catch {
    if (!panne) window.dispatchEvent(new CustomEvent('yotei-stockage-plein'));
    panne = true;
  }
}

const ecouteurs = new Set();
export const surChangement = (fn) => ecouteurs.add(fn);
export function enregistrer() {
  ecrire(CLE, etat);
  ecouteurs.forEach((fn) => fn());
}
export function enregistrerJournal() {
  ecrire(CLE_JOURNAL, journal);
  ecouteurs.forEach((fn) => fn());
}
export function remplacerEtat(nouveau) {
  etat = normaliserEtat(nouveau);
  enregistrer();
}
export function reinitialiser() {
  etat = nouvelEtat();
  enregistrer();
}

/* ----- Les personnes (「だれと？」) ----- */
export const personne = (id) => etat.personnes.find((x) => x.id === id) || null;
export function ajouterPersonne(nom, emoji) {
  const p = { id: uid('p'), nom: nom.trim(), emoji: emoji || '🙂' };
  etat.personnes.push(p);
  enregistrer();
  return p.id;
}
// La carte d'une activité, avec les personnes choisies : 「パパと すごす」 (carte « avecQui »),
// ou la carte telle quelle avec act.avec et une phrase du soir 「パパと 公園に 行きました。」.
export function carteDe(act) {
  const base = carte(act.carte);
  const ps = (act.avec || []).map(personne).filter(Boolean);
  if (!ps.length) return base;
  const noms = ps.map((p) => p.nom).join('と ');
  if (base.avecQui) {
    return {
      ...base, nom: `${noms}と すごす`, emoji: ps[0].emoji || base.emoji, photo: ps[0].photo || '', recit: `${noms}と すごしました。`, avec: ps,
    };
  }
  return { ...base, recit: base.recit ? `${noms}と ${base.recit}` : '', avec: ps };
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
  if (sorte === 'modifiee') {
    suivreModele(d);
    return etat.jours[cle(d)];
  }
  return modeleHabituel(d);
}

/* Une date où l'élève a seulement AJOUTÉ des activités ne doit pas rester figée : si les parents changent
   ensuite la semaine type, ou déclarent ce jour « pas d'école », la date reprend le nouveau programme et
   garde les ajouts de l'élève (et ses loisirs rangés dans un 自由時間 qui existe encore).
   etat.joursBase[date] = le programme habituel au moment où la date a été copiée. Dès que la date est
   changée autrement (par les parents, ou par une activité longue qui remplace des cours), elle reste telle quelle. */
const sansLoisirs = (liste) => JSON.stringify(liste.map((a) => ({ ...a, loisirs: undefined })));
function suivreModele(d) {
  const k = cle(d);
  const base = etat.joursBase && etat.joursBase[k];
  if (!base) return;
  const modele = modeleHabituel(d);
  const actuel = JSON.stringify(modele);
  if (actuel === base) return;
  const liste = etat.jours[k];
  let ancien;
  try { ancien = JSON.parse(base); } catch { ancien = null; }
  if (!Array.isArray(ancien) || sansLoisirs(liste.filter((a) => !a.parEleve)) !== sansLoisirs(ancien)) {
    delete etat.joursBase[k];   // la date a été changée autrement : elle ne suit plus le modèle
    return;
  }
  const neuf = copie(modele);
  liste.forEach((a, i) => {
    if (!a.parEleve) {
      const meme = a.loisirs && neuf.find((x) => x.id === a.id);
      if (meme) meme.loisirs = [...a.loisirs];
      return;
    }
    // Un ajout sans heure reprend sa place après la même activité, si elle existe encore.
    const avant = !a.debut && i > 0 ? neuf.findIndex((x) => x.id === liste[i - 1].id) : -1;
    if (avant >= 0) { neuf.splice(avant + 1, 0, a); return; }
    // Sinon à la fin de la journée, mais avant 寝る (on n'ajoute rien après le coucher).
    const dernier = neuf[neuf.length - 1];
    const c = dernier && carteDe(dernier);
    if (!a.debut && c && c.sommeil) neuf.splice(neuf.length - 1, 0, a); else neuf.push(a);
  });
  etat.jours[k] = trierParHeure(neuf);
  etat.joursBase[k] = actuel;
  ecrire(CLE, etat);
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
    etat.joursBase[k] = JSON.stringify(modeleHabituel(d));
  }
  fn(etat.jours[k]);
  enregistrer();
}
export function retablirJour(d) {
  delete etat.jours[cle(d)];
  delete etat.joursBase[cle(d)];
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

// Enlever une activité ; si elle en remplaçait d'autres (activité longue), elles reviennent à leur place.
export function enleverActivite(d, idAct) {
  modifierJour(d, (liste) => {
    const i = liste.findIndex((x) => x.id === idAct);
    if (i < 0) return;
    const [act] = liste.splice(i, 1);
    restaurerRemplacees(liste, act);
  });
  // Revenue au programme habituel, la date n'est plus « modifiée » : elle suit de nouveau la semaine type,
  // les jours fériés et les « pas d'école » décidés ensuite par les parents.
  if (JSON.stringify(etat.jours[cle(d)]) === JSON.stringify(modeleHabituel(d))) retablirJour(d);
}

// Une activité longue qui s'en va (enlevée, déplacée, rangée dans un 自由時間) rend ce qu'elle avait pris.
// - remplacée ({ act, apres }) : elle revient à sa place d'origine, sauf si elle est déjà là ;
// - raccourcie ({ act, raccourcie }) : on ne lui rend que son heure de fin (ce qu'elle a reçu depuis, comme
//   des loisirs, reste), et si elle a été enlevée entre-temps elle ne revient pas.
export function restaurerRemplacees(liste, act) {
  if (!act.remplace) return;
  act.remplace.forEach((r) => {
    const j = liste.findIndex((x) => x.id === r.act.id);
    const raccourcie = r.raccourcie || !('apres' in r);
    if (raccourcie) {
      if (j >= 0) liste[j].fin = r.act.fin;
      return;
    }
    if (j >= 0) return;
    const k = r.apres ? liste.findIndex((x) => x.id === r.apres) : -1;
    if (k >= 0) liste.splice(k + 1, 0, r.act);
    else if (r.apres === null) liste.unshift(r.act);
    else liste.push(r.act);
  });
  delete act.remplace;
  liste.splice(0, liste.length, ...trierParHeure(liste));
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
