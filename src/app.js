/* ==========================================================================
   よてい — l'emploi du temps visuel
   --------------------------------------------------------------------------
   Pour les jeunes avec un retard intellectuel (Japon d'abord) :
   - 「きょう」 : ce qu'on fait maintenant (en grand), la suite, et la journée ;
   - 「こんしゅう」 : la semaine d'école (時間割) ;
   - 「こんげつ」 : le calendrier, les jours fériés, « あと 3にち » ;
   - 「てじゅん」 : les étapes d'une activité, une à la fois ;
   - 「ふりかえり」 : le soir, revoir sa journée en photos pour la raconter.
   L'heure se montre de trois façons (horloge, chiffres, barre) : on ne suppose pas qu'il sait la lire.
   Tout reste sur l'appareil : aucun compte, aucune donnée envoyée.
   ========================================================================== */

import { installerDessins } from './objets.js';
import {
  journalDu, photosAnciennes, sorteDuJour, surChangement,
} from './donnees.js';
import {
  ajouterJours, aujourdhui, cle, minutesMaintenant, yomiDate, yomiDuree,
} from './heure.js';
import { deroulement } from './journee.js';
import { nav } from './nav.js';
import { $, el } from './outils.js';
import { definirAppliquer, installerParents, rendreParents } from './parents.js';
import { supprimerPhoto } from './photos.js';
import { plateforme } from './plateforme.js';
import { reglages } from './reglages.js';
import { activable } from './tactile.js';
import { html, lu } from './texte.js';
import {
  fermerFeuille, fermerPlein, feuilleOuverte, nomLu, pleinOuvert,
} from './ui.js';
import {
  basculerLecture, installerLectureAuToucher, majBoutonsLire, parler, sons,
} from './voix.js';
import { purgerEcole } from './vues/ecole.js';
import { lancerEtapes, rendreEtapes } from './vues/etapes.js';
import { dateHtml, rendreJour } from './vues/jour.js';
import { remettreMois, rendreMois } from './vues/mois.js';
import {
  choisirDateRecit, definirRafraichir, diaporama, rendreRecit,
} from './vues/recit.js';
import { remettreSemaine, rendreSemaine } from './vues/semaine.js';

// Les pictogrammes dessinés remplacent les emoji du système dès le premier affichage.
installerDessins();

const ONGLETS = {
  jour: { nom: '今日《きょう》', icone: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>' },
  semaine: { nom: '今週《こんしゅう》', icone: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 9h18M8 9v10.5M13 9v10.5M18 9v10.5"/>' },
  mois: { nom: '今月《こんげつ》', icone: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h1M11.5 14h1M15.5 14h1M7.5 17h1M11.5 17h1"/>' },
  etapes: { nom: 'てじゅん', icone: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5"/><circle cx="5" cy="18" r="1.6"/>' },
  recit: { nom: 'ふりかえり', icone: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/>' },
};

let onglet = 'jour';
let sousVue = null;       // une autre date ouverte depuis la semaine ou le mois : { date, depuis }
const vue = $('vue');

/* ----- Rendu ----- */

function rendreHaut() {
  const d = aujourdhui();
  const { ferie } = sorteDuJour(d);
  const h = $('haut-date');
  h.innerHTML = `${dateHtml(d)}${ferie ? `<small class="haut-ferie">${html(ferie)}</small>` : ''}`;
  h.dataset.lire = `きょうは ${yomiDate(d)}${ferie ? `。 ${lu(ferie)}` : ''}。`;
}

function rendreOnglets() {
  const nav = $('onglets');
  nav.replaceChildren();
  const visibles = reglages.onglets.length > 1 ? reglages.onglets : [];
  nav.hidden = !visibles.length;
  visibles.forEach((id) => {
    const o = ONGLETS[id];
    const b = el('button', {
      type: 'button', class: 'onglet', 'aria-label': lu(o.nom),
      'aria-current': id === onglet && !sousVue ? 'page' : null,
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${o.icone}</svg><span>${html(o.nom, { mots: false })}</span>`,
    });
    activable(b, () => choisirOnglet(id), { garde: false });
    nav.append(b);
  });
}

function rendreVue({ garderDefilement = false } = {}) {
  const haut = vue.scrollTop;
  if (!reglages.onglets.includes(onglet)) onglet = 'jour';
  if (sousVue) {
    rendreJour(vue, sousVue.date, { retour: () => { sousVue = null; rendreTout(); } });
  } else if (onglet === 'jour') rendreJour(vue);
  else if (onglet === 'semaine') rendreSemaine(vue);
  else if (onglet === 'mois') rendreMois(vue);
  else if (onglet === 'etapes') rendreEtapes(vue, (id) => lancerEtapes(id));
  else if (onglet === 'recit') rendreRecit(vue);
  if (garderDefilement) vue.scrollTop = haut;
  else vue.scrollTop = 0;
  gererEcranAllume();
}

function rendreTout(options) {
  rendreHaut();
  rendreOnglets();
  rendreVue(options);
}

function choisirOnglet(id) {
  sousVue = null;
  if (id === 'semaine') remettreSemaine();
  if (id === 'mois') remettreMois();
  if (id === 'recit') choisirDateRecit(aujourdhui());
  onglet = id;
  rendreTout();
  parler(lu(ONGLETS[id].nom));
}

nav.rafraichir = () => rendreTout({ garderDefilement: true });
nav.jour = (d) => {
  if (cle(d) === cle(aujourdhui())) { sousVue = null; onglet = 'jour'; } else sousVue = { date: d };
  rendreTout();
  parler(cle(d) === cle(aujourdhui()) ? 'きょうの よてい' : `${yomiDate(d)}`);
};
nav.recit = (d) => {
  sousVue = null;
  choisirDateRecit(d);
  onglet = reglages.onglets.includes('recit') ? 'recit' : onglet;
  if (onglet !== 'recit') {
    diaporama(d, 0);
    return;
  }
  rendreTout();
};
nav.etapes = (id, fin, d) => lancerEtapes(id, fin, d);
definirRafraichir(() => nav.rafraichir());

/* ----- Le temps qui passe : l'horloge avance, les annonces ----- */

let derniereMinute = -1;
let derniereDate = cle(aujourdhui());
let annonceDebut = null;
let annoncePreavis = null;

function verifierAnnonces() {
  if (document.hidden || !$('ecran-parents').hidden) return;
  const dr = deroulement(aujourdhui());
  const a = dr.actuel;
  if (!a || !dr.commence) return;
  const id = `${cle(aujourdhui())}-${a.act.id}`;
  // On annonce le début seulement s'il vient d'avoir lieu (pas à l'ouverture de l'appli au milieu d'un cours).
  if (reglages.annonces && a.debut !== null && annonceDebut !== id && dr.maintenant - a.debut < 1.5 && dr.maintenant >= a.debut) {
    annonceDebut = id;
    sons.carillon();
    plateforme.retour.vibrer([200, 100, 200]);
    // 「つぎは 〜だよ」 : juste avec un nom (さぎょう) comme avec un verbe (おきる), ce que 「〜の じかん」 n'est pas.
    setTimeout(() => parler(`つぎは ${nomLu(a.carte)}だよ。`), 1900);
  }
  if (reglages.preavis && a.finEff !== null && annoncePreavis !== id) {
    const reste = a.finEff - dr.maintenant;
    // Pas de préavis pour une activité plus courte que lui : il couperait l'annonce du début.
    const assezLongue = a.debut === null || a.finEff - a.debut > reglages.preavis + 1;
    if (assezLongue && reste <= reglages.preavis && reste > reglages.preavis - 1) {
      annoncePreavis = id;
      sons.bientot();
      setTimeout(() => parler(`あと ${yomiDuree(reglages.preavis)}で おわりだよ。`), 800);
    }
  }
}

function tic() {
  const k = cle(aujourdhui());
  if (k !== derniereDate) {
    // Minuit : nouvelle journée.
    derniereDate = k;
    sousVue = null;
    rendreTout();
    return;
  }
  const m = Math.floor(minutesMaintenant());
  if (m !== derniereMinute) {
    derniereMinute = m;
    if ($('ecran-parents').hidden && !sousVue && (onglet === 'jour' || onglet === 'semaine')) rendreVue({ garderDefilement: true });
  }
  verifierAnnonces();
}
setInterval(tic, 10000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { derniereMinute = -1; tic(); gererEcranAllume(); } });

/* ----- Écran toujours allumé (tablette posée sur la table) ----- */

let verrou = null;
let demandeVerrou = false;   // une demande est en cours : pas de seconde (la première ne serait jamais relâchée)
async function gererEcranAllume() {
  const voulu = reglages.ecranAllume && onglet === 'jour' && !sousVue && $('ecran-parents').hidden && !document.hidden;
  try {
    if (voulu && !verrou && !demandeVerrou && navigator.wakeLock) {
      demandeVerrou = true;
      const v = await navigator.wakeLock.request('screen').finally(() => { demandeVerrou = false; });
      verrou = v;
      v.addEventListener('release', () => { if (verrou === v) verrou = null; });
      // Entre-temps on est peut-être passé dans l'espace parents : on revérifie.
      if (!(reglages.ecranAllume && onglet === 'jour' && !sousVue && $('ecran-parents').hidden && !document.hidden)) { await v.release(); verrou = null; }
    } else if (!voulu && verrou) {
      await verrou.release();
      verrou = null;
    }
  } catch { verrou = null; }
}

/* ----- Espace parents ----- */

function ouvrirParents() {
  fermerFeuille();
  fermerPlein();
  $('app').hidden = true;
  $('ecran-parents').hidden = false;
  document.documentElement.lang = reglages.langue === 'ja' ? 'ja' : 'fr';
  rendreParents();
  gererEcranAllume();
}
function fermerParents() {
  fermerFeuille();
  $('ecran-parents').hidden = true;
  $('app').hidden = false;
  document.documentElement.lang = 'ja';
  appliquerReglages();
  rendreTout();
}
installerParents(fermerParents);
activable($('btn-parents'), ouvrirParents, { duree: 2000, garde: false, lire: false });
activable($('btn-lire'), basculerLecture, { garde: false });

function appliquerReglages() {
  if (reglages.animationsReduites) document.documentElement.dataset.motion = 'reduce';
  else delete document.documentElement.dataset.motion;
  majBoutonsLire();
}
definirAppliquer(() => { appliquerReglages(); });

/* ----- Fermer avec Échap, ou en touchant le fond ----- */

$('feuille-fond').addEventListener('click', fermerFeuille);
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (feuilleOuverte()) fermerFeuille();
  else if (pleinOuvert()) { fermerPlein(); nav.rafraichir(); }
});
document.addEventListener('contextmenu', (ev) => {
  if (!ev.target.closest('input, textarea')) ev.preventDefault();
});

// Une nouvelle version : la barre « あたらしく する » (seulement sur 「きょう」, jamais pendant les étapes).
function proposerMiseAJour(activer) {
  const barre = $('maj');
  barre.hidden = false;
  $('maj-oui').onclick = () => { barre.hidden = true; activer(); };
  $('maj-non').onclick = () => { barre.hidden = true; };
}

/* ----- Démarrage ----- */

surChangement(() => {});
installerLectureAuToucher();
appliquerReglages();
rendreTout();

window.addEventListener('yotei-stockage-plein', () => {
  window.alert(reglages.langue === 'ja'
    ? 'この 端末に 保存できませんでした（空き容量が ありません）。「おうちの人」で 古い 写真を けしてください。'
    : "L'appareil a refusé d'enregistrer (stockage plein). Dans l'espace parents, effacez d'anciennes photos : sinon les changements seront perdus à la fermeture.");
});

(async () => {
  await plateforme.stockage.ouvrir();
  // Les photos de la journée trop anciennes sont effacées (réglage des parents).
  if (reglages.garderPhotos > 0) {
    const ids = photosAnciennes(ajouterJours(aujourdhui(), -reglages.garderPhotos));
    for (const id of ids) await supprimerPhoto(id);
    // Les comptes rendus de l'école et leurs messages vocaux suivent la même durée.
    await purgerEcole(ajouterJours(aujourdhui(), -reglages.garderPhotos));
  }
  rendreTout({ garderDefilement: true });
  if (plateforme.installation.possible) plateforme.installation.enregistrerServiceWorker(proposerMiseAJour);
  // Les tests et la page de démonstration lisent l'état ici.
  window.yotei = { journalDu, deroulement, aujourdhui };
})();
