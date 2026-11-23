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
import { carte, journalDu, programmeDu } from './donnees.js';

export function deroulement(d, maintenant = minutesMaintenant()) {
  const liste = programmeDu(d);
  const notes = journalDu(d);
  const k = cle(d);
  const kAuj = cle(aujourdhui());
  const items = liste.map((act, i) => {
    const debut = versMinutes(act.debut);
    const fin = versMinutes(act.fin);
    let finEff = fin;
    if (finEff === null) {
      for (let j = i + 1; j < liste.length; j++) {
        const dj = versMinutes(liste[j].debut);
        if (dj !== null && (debut === null || dj > debut)) { finEff = dj; break; }
      }
    }
    const note = notes[act.id] || null;
    return { act, carte: carte(act.carte), debut, fin, finEff, note, fait: Boolean(note && note.fait), index: i };
  });
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
