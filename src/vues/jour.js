/* ======================================================================
   「きょう」 : いま (en grand), つぎ, puis la liste de la journée.
   Une activité finie se coche 「おわった」 ; on peut alors prendre une photo pour la ふりかえり.
   La même vue montre aussi une autre date (depuis la semaine ou le mois).
   ====================================================================== */

import { choisirCarte } from '../choix-carte.js';
import {
  carte, changerLoisirs, estCadreLibre, estLoisir, estSommeil, evenementsDu, mettreDansLibre, modifierJour, noter, nouvelleActivite, oublier,
  prochainsEvenements, routine, sorteDuJour, toutesLesCartes, trierParHeure,
} from '../donnees.js';
import {
  ajouterJours, aujourdhui, cle, deCle, ecartJours, JOURS_SEMAINE, texteDans, texteDuree, versTexte, yomiDans, yomiDate, yomiDuree,
} from '../heure.js';
import { barre, repereGrandeAiguille, svgHorloge } from '../horloge.js';
import {
  AVANT_FIN as AVANT_FIN_COURS, coursEnCours, deroulement, loisirsLus, mochimonoDu, PERIODES,
} from '../journee.js';
import {
  categorieTemps, composer, liste, questionsCarte, tirer, varDuree,
} from '../messages.js';
import { nav } from '../nav.js';
import {
  aEnvoyer, lancerEcole, proposerEcole, remettreAPlusTard,
} from './ecole.js';
import { choisirPlace } from './placer.js';
import { el } from '../outils.js';
import { chargerPhotos, nouvellePhoto, supprimerPhoto } from '../photos.js';
import { reglages } from '../reglages.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, fermerFeuille, heureHtml, heureLue, ICONE_BAS, ICONE_COCHE, ICONE_ETAPES, ICONE_GALERIE, ICONE_GAUCHE, ICONE_HAUT,
  ICONE_DEPLACER, ICONE_FERMER, ICONE_HP, ICONE_PHOTO, ICONE_PLUS, ICONE_POUBELLE, ICONE_RETOUR, message, nomHtml, nomLu, ouvrirFeuille, plageHtml, plageLue,
  visuel,
} from '../ui.js';
import { lireElement, parler, sons } from '../voix.js';

// On ne peut pas cocher une activité qui commence dans plus de 15 minutes (la nuit, 「おきる」 à 6:30…).
// Une activité sans heure suit la même règle avec son heure calculée d'après sa place (debutEff).
const AVANCE_MAX = 15;
const tropTot = (dr, it) => (dr.aujourdhui && it.debutEff !== null && it.debutEff - dr.maintenant > AVANCE_MAX
  ? Math.ceil(it.debutEff - dr.maintenant) : 0);
const estNuit = (m) => m >= 21 * 60 || m < 5 * 60;

const peutAjouter = () => reglages.eleve === 'ajouter' || reglages.eleve === 'deplacer';
const peutDeplacer = () => reglages.eleve === 'deplacer';

// 「11がつ 23にち（にち）」
export const dateHtml = (d) => `<span class="mot">${d.getMonth() + 1}がつ</span> <span class="mot">${d.getDate()}にち</span>`
  + `<span class="mot jour-sem jour-${d.getDay()}">（${html(JOURS_SEMAINE[d.getDay()].court, { mots: false })}）</span>`;

// Ce qu'il a choisi de faire pendant un 自由時間 : 「📺 テレビ 🎮 ゲーム」.
const loisirsHtml = (it, classe = 'loisirs') => (it.loisirs && it.loisirs.length
  ? `<span class="${classe}">${it.loisirs.map((l) => `<span class="loisir"><i aria-hidden="true">${l.emoji || '⭐'}</i>${nomHtml(l)}</span>`).join('')}</span>` : '');

/* ----- La carte 「いま」 ----- */

function carteMaintenant(d, dr) {
  const art = el('article', { class: 'maintenant' });
  if (!dr.items.length) {
    art.classList.add('maintenant-vide');
    art.innerHTML = `<p class="m-fin" data-lire="きょうの よていは ないよ。">${html('今日《きょう》の 予定《よてい》は ないよ。')}</p>`;
    return art;
  }
  const { actuel, commence, maintenant } = dr;
  if (!actuel && dr.aujourdhui && estNuit(maintenant)) return carteNuit(d, art);
  if (!actuel) {
    art.classList.add('maintenant-fin');
    art.innerHTML = `<p class="m-etiquette">${html('おわり')}</p><p class="m-fin" data-lire="きょうの よていは ぜんぶ おわったよ。 おつかれさま！">`
      + `<span class="m-fin-emoji" aria-hidden="true">🌟</span>${html('今日《きょう》の 予定《よてい》は ぜんぶ おわったよ。 おつかれさま！')}</p>`;
    const actions = el('div', { class: 'm-actions' });
    actions.append(bouton('ふりかえり', () => nav.recit(d), { classe: 'btn btn-principal btn-large', icone: ICONE_PHOTO }));
    art.append(actions);
    return art;
  }
  const c = actuel.carte;
  art.classList.add(`lieu-${c.lieu}`);
  art.dataset.act = actuel.act.id;
  const fin = commence ? actuel.finEff : actuel.debutEff;
  const debutPart = commence ? (actuel.debutEff ?? maintenant) : maintenant;
  const reste = fin !== null ? Math.max(0, Math.ceil(fin - maintenant)) : null;
  const etiquette = commence ? 'いま' : 'つぎ';
  const plage = plageHtml(actuel.act);
  let parole = `${etiquette}は ${nomLu(c)}。`;
  if (actuel.loisirs.length) parole += ` ${loisirsLus(actuel)}。`;
  if (plage) parole += ` ${plageLue(actuel.act)}。`;

  const haut = el('div', { class: 'm-haut' });
  haut.innerHTML = `${visuel(c, 'grand')}<div class="m-titre"><p class="m-etiquette">${etiquette}</p>`
    + `<h2 class="m-nom">${nomHtml(c)}</h2>${loisirsHtml(actuel, 'loisirs m-loisirs')}${plage ? `<p class="m-heures">${plage}</p>` : ''}</div>`;
  art.append(haut);

  const temps = el('div', { class: 'm-temps' });
  if (reglages.horloge) temps.insertAdjacentHTML('beforeend', svgHorloge(maintenant, fin, { titre: `いま ${heureLue(Math.floor(maintenant))}` }));
  const infos = el('div', { class: 'm-reste' });
  if (reglages.chiffres) {
    infos.insertAdjacentHTML('beforeend', `<p class="m-heure-actuelle" data-lire="いま ${heureLue(Math.floor(maintenant))}"><small>いま</small>${heureHtml(Math.floor(maintenant))}`
      + `<span class="m-lecture">${heureLue(Math.floor(maintenant))}</span></p>`);
  }
  if (reste !== null) {
    const suite = commence ? '' : 'で はじまる';
    infos.insertAdjacentHTML('beforeend', `<p class="m-reste-texte" data-lire="あと ${yomiDuree(reste)}${suite}"><b>${html(`あと ${texteDuree(reste)}${suite}`)}</b></p>`);
    parole += ` あと ${yomiDuree(reste)}${suite}。`;
    if (reglages.barre && commence) infos.insertAdjacentHTML('beforeend', barre(reste, Math.max(1, fin - debutPart)));
    const repere = reglages.horloge ? repereGrandeAiguille(maintenant, fin) : null;
    if (repere) {
      const quand = commence ? 'おわり' : 'はじまり';
      infos.insertAdjacentHTML('beforeend', `<p class="m-indice" data-lire="ながい はりが ${repere}に きたら ${quand}。">${`${html('ながい はりが')} <b>${repere}</b>${html(`に きたら ${quand}`)}`}</p>`);
    }
  }
  temps.append(infos);
  art.append(temps);
  art.dataset.lire = parole;

  if (tropTot(dr, actuel)) {
    // Pas encore l'heure : rien à cocher. La nuit, on le dit.
    const nuit = estNuit(maintenant);
    const texte = nuit ? '今《いま》は 夜《よる》。 ゆっくり 休《やす》もう。' : 'まだ はじまって いないよ。';
    art.append(el('p', { class: `m-attente${nuit ? ' m-nuit' : ''}`, 'data-lire': lu(texte), html: `<i aria-hidden="true">${nuit ? '🌙' : '⏳'}</i><span>${html(texte)}</span>` }));
    art.dataset.lire = `${parole} ${lu(texte)}`;
    return art;
  }
  if (coursEnCours(dr, actuel)) {
    // Un cours : pas de 「おわった」 avant les 5 dernières minutes.
    const texte = 'おわりの 時間《じかん》に なったら チェック できるよ。';
    art.append(el('p', { class: 'm-attente m-cours', 'data-lire': lu(texte), html: `<i aria-hidden="true">🏫</i><span>${html(texte)}</span>` }));
    art.dataset.lire = `${parole} ${lu(texte)}`;
    return art;
  }
  const actions = el('div', { class: 'm-actions' });
  const r = c.routine && routine(c.routine);
  if (r) actions.append(bouton('てじゅん', () => lancerEtapes(d, actuel), { classe: 'btn btn-large', icone: ICONE_ETAPES }));
  if (estSommeil(c)) {
    // 寝る : pas 「おわった」 ; 「おやすみ」 quand il va au lit.
    const texte = 'ふとんに 入《はい》る 時間《じかん》だよ。';
    art.append(el('p', { class: 'm-attente m-nuit', 'data-lire': lu(texte), html: `<i aria-hidden="true">🌙</i><span>${html(texte)}</span>` }));
    art.dataset.lire = `${parole} ${lu(texte)}`;
    actions.append(bouton('おやすみ', () => demanderFin(d, actuel), { classe: 'btn btn-principal btn-large btn-fait btn-nuit', icone: '<i aria-hidden="true">🌙</i>' }));
  } else {
    actions.append(bouton('おわった', () => demanderFin(d, actuel), { classe: 'btn btn-principal btn-large btn-fait', icone: ICONE_COCHE }));
  }
  art.append(actions);
  return art;
}

// La nuit, une fois couché (ou la journée finie) : bonne nuit, et ce qui vient demain matin.
function carteNuit(d, art) {
  art.classList.add('maintenant-fin', 'maintenant-nuit');
  const demain = deroulement(ajouterJours(d, 1)).items.find((it) => it.debut !== null);
  let lire = 'おやすみなさい。 ゆっくり やすもう。';
  let suite = '';
  if (demain) {
    lire += ` あしたは ${heureLue(demain.debut)}に ${nomLu(demain.carte)}。`;
    suite = `<p class="m-demain" aria-hidden="true">${html('あしたは')} ${heureHtml(demain.debut)} ${visuel(demain.carte)} <b>${nomHtml(demain.carte)}</b></p>`;
  }
  art.innerHTML = `<p class="m-etiquette">${html('よる')}</p><p class="m-fin" data-lire="${lire}"><span class="m-fin-emoji" aria-hidden="true">🌙</span>`
    + `${html('おやすみなさい。 ゆっくり 休《やす》もう。')}</p>${suite}`;
  art.dataset.lire = lire;
  return art;
}

function carteSuivante(dr) {
  const s = dr.commence ? dr.suivant : null;
  if (!s) return null;
  const c = s.carte;
  const plage = s.debut !== null ? heureHtml(s.debut) : '';
  const p = el('div', {
    class: `suivante lieu-${c.lieu}`, 'data-act': s.act.id,
    'data-lire': `つぎは ${nomLu(c)}。${s.loisirs.length ? ` ${loisirsLus(s)}。` : ''}${s.debut !== null ? ` ${heureLue(s.debut)}から。` : ''}`,
    html: `<span class="s-etiquette">つぎ</span>${visuel(c)}<span class="s-nom">${nomHtml(c)}`
      + `${s.loisirs.length ? `<span class="s-loisirs" aria-hidden="true">${s.loisirs.map((l) => l.emoji || '⭐').join('')}</span>` : ''}</span>`
      + `${plage ? `<span class="s-heure">${plage}</span>` : ''}`,
  });
  return p;
}

/* ----- L'annonce des événements proches (« えんそく まで あと 3にち ») ----- */

function bandeauEvenements(d) {
  const blocs = [];
  const { ferie } = sorteDuJour(d);
  const aujourdhuiEvs = evenementsDu(d);
  if (ferie) blocs.push({ texte: `今日《きょう》は ${ferie}`, emoji: '🎌', lire: `きょうは ${lu(ferie)}` });
  aujourdhuiEvs.forEach((ev) => blocs.push({ texte: `今日《きょう》は ${ev.nom}！`, emoji: ev.emoji || '⭐', lire: `きょうは ${lu(ev.nom)}！` }));
  prochainsEvenements(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), 2, 14).forEach((ev) => {
    const n = ecartJours(d, deCle(ev.date));
    blocs.push({ texte: `${ev.nom}まで ${texteDans(n)}`, emoji: ev.emoji || '⭐', lire: `${lu(ev.nom)}まで ${yomiDans(n)}` });
  });
  if (!blocs.length) return null;
  const b = el('ul', { class: 'bandeau' });
  blocs.forEach((x) => b.append(el('li', { 'data-lire': x.lire, html: `<span aria-hidden="true">${x.emoji}</span> ${html(x.texte)}` })));
  return b;
}

/* ----- Les affaires à emporter : 「きょうの もちもの」 (jusqu'à l'activité), 「あしたの もちもの」 (dès 15 h) ----- */

function boiteMochimono(titre, liste) {
  const lire = `${lu(titre)}。 ${liste.map((a) => lu(a.texte)).join('、 ')}。`;
  const boite = el('section', { class: 'mochimono', 'data-lire': lire });
  boite.append(el('h3', { html: `<i aria-hidden="true">🎒</i>${html(titre)}` }));
  const ul = el('ul');
  liste.forEach((a) => ul.append(el('li', {
    html: `<i aria-hidden="true">${a.emoji || '•'}</i><span>${html(a.texte)}</span><small>${html(a.carte.nom)}</small>`,
  })));
  boite.append(ul);
  return boite;
}

function encadresMochimono(d, dr) {
  const res = [];
  if (dr.aujourdhui) {
    const auj = mochimonoDu(d, dr.items).filter((a) => !a.fini);
    if (auj.length) res.push(boiteMochimono('今日《きょう》の もちもの', auj));
    if (dr.maintenant >= 15 * 60) {
      const demain = mochimonoDu(ajouterJours(d, 1));
      if (demain.length) res.push(boiteMochimono('明日《あした》の もちもの', demain));
    }
  } else if (!dr.passe) {
    const liste = mochimonoDu(d, dr.items);
    if (liste.length) res.push(boiteMochimono('この 日《ひ》の もちもの', liste));
  }
  return res;
}

/* ----- La liste de la journée ----- */

function ligneActivite(d, it, { inerte = false } = {}) {
  const c = it.carte;
  const li = el('li', { class: `act statut-${it.statut} lieu-${c.lieu}`, 'data-act': it.act.id });
  const etat = { fait: 'おわった', maintenant: 'いま', passe: '', avenir: '' }[it.statut];
  const b = el('button', {
    type: 'button', class: 'act-btn',
    'aria-label': `${it.debut !== null ? `${heureLue(it.debut)}、 ` : ''}${nomLu(c)}${it.loisirs.length ? `（${loisirsLus(it)}）` : ''}${etat ? `、 ${etat}` : ''}`,
    html: `<span class="act-heure">${it.debut !== null ? heureHtml(it.debut) : ''}</span>${visuel(c)}`
      + `<span class="act-nom">${nomHtml(c)}${loisirsHtml(it, 'loisirs act-loisirs')}</span>`
      + `<span class="act-etat" aria-hidden="true">${it.fait ? ICONE_COCHE : ''}${it.note && it.note.photo ? '<i class="act-photo">📷</i>' : ''}`
      + `${!it.fait && c.mochimono && c.mochimono.length ? '<i class="act-photo">🎒</i>' : ''}</span>`,
  });
  // Pendant un déplacement, les lignes ne s'ouvrent pas : on touche seulement les cases 「＋ ここ」.
  if (inerte) { b.tabIndex = -1; b.classList.add('act-inerte'); } else activable(b, () => ouvrirActivite(d, it));
  li.append(b);
  return li;
}

let voirFinies = false;

// La liste groupée par moment de la journée (あさ, ひる, ごご, よる). Sans heure de début du moment :
// elle gênait la lecture à côté des heures des activités.
function listeParMoments(d, items) {
  const bloc = el('div', { class: 'moments' });
  PERIODES.forEach((p) => {
    const du = items.filter((it) => it.periode === p.id);
    if (!du.length) return;
    bloc.append(el('h3', {
      class: 'moment-titre', 'data-lire': lu(p.nom),
      html: `<span class="moment-emoji" aria-hidden="true">${p.emoji}</span>${html(p.nom)}`,
    }));
    const ol = el('ol', { class: 'liste-jour' });
    du.forEach((it) => ol.append(ligneActivite(d, it)));
    bloc.append(ol);
  });
  return bloc;
}

export function rendreJour(conteneur, d = aujourdhui(), { retour = null } = {}) {
  const dr = deroulement(d);
  const k = cle(d);
  const estAuj = dr.aujourdhui;
  const page = el('div', { class: 'page-jour' });

  if (retour) {
    const tete = el('div', { class: 'tete-sous-vue' });
    tete.append(bouton('もどる', retour, { classe: 'btn btn-petit', icone: ICONE_GAUCHE }));
    tete.append(el('h2', { class: 'titre-date', 'data-lire': yomiDate(d), html: dateHtml(d) }));
    page.append(tete);
  }
  // Mode « déplacement » : la liste à venir, avec les cases 「＋ ここ」.
  if (aDeplacer && aDeplacer.date === k) {
    const it = dr.items.find((x) => x.act.id === aDeplacer.id);
    if (it) {
      const tete = el('div', { class: `bandeau-deplacer lieu-${it.carte.lieu}`, 'data-lire': `${nomLu(it.carte)}を どこに うごかす？` });
      tete.innerHTML = `<div class="bd-haut">${visuel(it.carte)}<p class="bd-q"><span>${html(`${it.carte.nom}を どこに うごかす？`)}</span></p></div>`;
      const bas = el('div', { class: 'bd-bas', html: `<small>${html('「＋ ここ」を おしてね。')}</small>` });
      bas.append(bouton('やめる', arreterDeplacement, { classe: 'btn btn-petit', icone: ICONE_FERMER }));
      tete.append(bas);
      page.append(tete, listeDeplacement(d, dr));
      conteneur.replaceChildren(page);
      chargerPhotos(page);
      return page;
    }
    aDeplacer = null;
  }
  const bandeau = bandeauEvenements(d);
  if (bandeau) page.append(bandeau);
  // Le compte rendu de l'école est prêt mais pas encore envoyé : on le rappelle.
  if (dr.aujourdhui && aEnvoyer(d)) {
    const rappel = el('section', { class: 'invite-ecole', 'data-lire': 'がっこうの ふりかえりを おうちの ひとに おくろう！' });
    rappel.append(el('p', { html: `<i aria-hidden="true">📨</i><span>${html('学校《がっこう》の ふりかえりを お家《うち》の 人《ひと》に おくろう！')}</span>` }));
    const actions = el('div', { class: 'm-actions' });
    actions.append(bouton('おくる', () => lancerEcole(d, () => nav.rafraichir(), { depart: 'relire' }), { classe: 'btn btn-principal', icone: ICONE_COCHE }));
    rappel.append(actions);
    page.append(rappel);
  }
  // Au retour de l'école : 「がっこうの こと、 おしえて！」
  if (proposerEcole(d, dr)) {
    const invite = el('section', { class: 'invite-ecole', 'data-lire': 'がっこうの こと、 おしえて！' });
    invite.append(el('p', { html: `<i aria-hidden="true">🏫</i><span>${html('学校《がっこう》の こと、 おしえて！')}</span>` }));
    const actions = el('div', { class: 'm-actions' });
    actions.append(
      bouton('あとで', () => { remettreAPlusTard(d); nav.rafraichir(); }, { classe: 'btn' }),
      bouton('はじめる', () => lancerEcole(d, () => nav.rafraichir()), { classe: 'btn btn-principal', icone: ICONE_COCHE }),
    );
    invite.append(actions);
    page.append(invite);
  }

  if (estAuj) {
    page.append(carteMaintenant(d, dr));
    const s = carteSuivante(dr);
    if (s) page.append(s);
  }
  encadresMochimono(d, dr).forEach((b) => page.append(b));

  if (estAuj) {
    // Aujourd'hui : ce qui reste à faire d'abord ; ce qui est fini en dessous, replié.
    // Ce que montrent déjà les cartes 「いま」 et 「つぎ」 n'est pas répété dans la liste.
    const enHaut = new Set();
    if (dr.actuel) enHaut.add(dr.actuel.act.id);
    if (dr.commence && dr.suivant) enHaut.add(dr.suivant.act.id);
    const aVenir = dr.items.filter((it) => (it.statut === 'maintenant' || it.statut === 'avenir') && !enHaut.has(it.act.id));
    const finies = dr.items.filter((it) => it.statut === 'fait' || it.statut === 'passe');
    if (aVenir.length) {
      const titre = enHaut.size ? 'その あとの 予定《よてい》' : '今日《きょう》の 予定《よてい》';
      page.append(el('h2', { class: 'titre-liste', 'data-lire': lu(titre), html: html(titre) }), listeParMoments(d, aVenir));
    }
    if (finies.length) {
      // Journée finie : la liste de ce qui est fait s'ouvre (sauf la nuit, où l'écran dit bonne nuit).
      const ouvert = voirFinies || (!dr.actuel && !(estAuj && estNuit(dr.maintenant)));
      const b = el('button', {
        type: 'button', class: 'titre-finies', 'aria-expanded': String(ouvert), 'aria-label': `おわった こと、 ${finies.length}こ`,
        html: `${ICONE_COCHE}<span>${html('おわった こと')}</span><span class="nb-finies">${finies.length}</span>`
          + `<span class="fleche-finies" aria-hidden="true">${ouvert ? ICONE_HAUT : ICONE_BAS}</span>`,
      });
      activable(b, () => { voirFinies = !ouvert; nav.rafraichir(); }, { garde: false });
      page.append(b);
      if (ouvert) page.append(listeParMoments(d, finies));
    }
  } else {
    const titre = dr.passe ? 'この 日《ひ》に した こと' : 'この 日《ひ》の 予定《よてい》';
    page.append(el('h2', { class: 'titre-liste', 'data-lire': lu(titre), html: html(titre) }), listeParMoments(d, dr.items));
    if (!dr.items.length) page.append(el('p', { class: 'vide', html: html('予定《よてい》は ないよ。') }));
  }

  const pied = el('div', { class: 'pied-jour' });
  if (peutAjouter() && !dr.passe) {
    const texte = estAuj ? '今日《きょう》の 予定《よてい》を 入《い》れる' : 'この 日《ひ》の 予定《よてい》を 入《い》れる';
    pied.append(bouton(texte, () => ajouter(d), { classe: 'btn', icone: ICONE_PLUS }));
  }
  if (!dr.items.length || dr.passe || estAuj) {
    if (dr.items.some((it) => it.fait)) pied.append(bouton('ふりかえり', () => nav.recit(d), { classe: 'btn', icone: ICONE_PHOTO }));
  }
  if (pied.children.length) page.append(pied);

  conteneur.replaceChildren(page);
  chargerPhotos(page);
  page.dataset.date = k;
  return page;
}

/* ----- 「おわった」 : d'abord une réaction au temps mis, puis une question de vérification -----
   Les phrases sont tirées de listes (messages.js), selon le temps mis : avance, très tôt, tôt, à l'heure,
   après coup, sans heure. La question : celle de la carte, sinon une question générale (plus insistante
   quand c'est fini tôt). 「うん」 coche ; 「まだ」 ferme avec un encouragement.
   Une activité qui commence dans plus de 15 minutes ne peut pas être cochée (refuserFin). */

export function demanderFin(d, it) {
  const dr = deroulement(d);
  const courant = dr.items.find((x) => x.act.id === it.act.id) || it;
  const c = courant.carte;
  const m = dr.maintenant;
  const attente = tropTot(dr, courant);
  if (attente) { refuserFin(courant, attente, m); return; }
  const reste = coursEnCours(dr, courant);
  if (reste) { refuserCours(courant, reste, m); return; }
  if (estSommeil(c)) { demanderCoucher(d, courant); return; }
  if (!reglages.verifier) { marquerFait(d, it); return; }

  // Le temps mis, et les variables des phrases.
  const categorie = categorieTemps(courant, m, dr.aujourdhui);
  const vars = { nom: { html: nomHtml(c), lire: nomLu(c) } };
  if (courant.debutEff !== null) vars.debut = { html: heureHtml(courant.debutEff), lire: heureLue(courant.debutEff) };
  if (courant.finEff !== null) vars.fin = { html: heureHtml(courant.finEff), lire: heureLue(courant.finEff) };
  if (dr.aujourdhui && courant.finEff !== null && courant.finEff - m >= 1) vars.reste = varDuree(Math.ceil(courant.finEff - m));
  if (dr.aujourdhui && courant.debutEff !== null && m - courant.debutEff >= 1) vars.duree = varDuree(Math.floor(m - courant.debutEff));
  if (dr.aujourdhui && courant.finEff !== null && m - courant.finEff >= 1) vars.retard = varDuree(Math.floor(m - courant.finEff));
  const disponibles = Object.keys(vars);
  const reaction = composer(tirer(`r-${categorie}`, liste(categorie), disponibles) || 'おつかれさま！', vars);
  // Un 自由時間 avec des loisirs : les questions de ces loisirs (「テレビを 消した？」…), sinon les siennes.
  const desLoisirs = courant.loisirs.flatMap((l) => questionsCarte(l));
  const propres = desLoisirs.length ? desLoisirs : questionsCarte(c);
  const cleQ = desLoisirs.length ? `q-${c.id}-${courant.loisirs.map((l) => l.id).join('-')}` : `q-${c.id}`;
  let generale = categorie === 'avance' || categorie === 'tresTot' ? 'verifFort' : 'verifNormal';
  if (c.libre) generale = 'verifLibre';
  const modeleQ = (propres.length && categorie !== 'libreTot' ? tirer(cleQ, propres, disponibles) : null)
    || tirer(generale, liste(generale), disponibles) || 'おわった？';
  const question = composer(modeleQ, vars);

  const contenu = el('div', { class: 'verif' });
  contenu.append(el('div', { class: `verif-tete lieu-${c.lieu}`, html: `${visuel(c, 'grand')}<span class="verif-nom">${nomHtml(c)}${loisirsHtml(courant, 'loisirs verif-loisirs')}</span>` }));
  const bloc = el('div', { class: `verif-contexte verif-${categorie}`, 'data-lire': reaction.lire });
  const finHorloge = categorie === 'avance' ? courant.debutEff : courant.finEff;
  if (reglages.horloge && dr.aujourdhui && finHorloge !== null && ['avance', 'tresTot', 'tot', 'libreTot', 'aLheure'].includes(categorie)) {
    bloc.insertAdjacentHTML('beforeend', svgHorloge(m, finHorloge, { titre: reaction.lire }));
  } else {
    bloc.insertAdjacentHTML('beforeend', `<i class="verif-emoji" aria-hidden="true">${{ tard: '👍', sansHeure: '🌟' }[categorie] || '⏰'}</i>`);
  }
  bloc.append(el('p', { html: reaction.html }));
  contenu.append(bloc);
  contenu.append(el('p', { class: 'verif-question', 'data-lire': question.lire, html: question.html }));
  const actions = el('div', { class: 'verif-actions' });
  actions.append(
    bouton('まだ', () => {
      fermerFeuille();
      const listeMada = c.libre ? 'madaLibre' : 'mada';
      parler(composer(tirer(listeMada, liste(listeMada), disponibles) || 'わかった。', vars).lire);
    }, { classe: 'btn btn-large', icone: ICONE_RETOUR }),
    bouton('うん', () => { fermerFeuille(); marquerFait(d, courant); }, { classe: 'btn btn-large btn-fait', icone: ICONE_COCHE }),
  );
  contenu.append(actions);
  if (c.routine && routine(c.routine)) {
    contenu.append(bouton('てじゅんを 見《み》る', () => { fermerFeuille(); lancerEtapes(d, courant); }, { classe: 'btn verif-etapes', icone: ICONE_ETAPES }));
  }
  ouvrirFeuille({ titre: '', contenu, classe: 'feuille-verif' });
  parler(`${reaction.lire} ${question.lire}`);
}

// 寝る : pas de réaction au temps mis ; une question du soir (「ふとんに 入った？」), puis 「おやすみなさい」.
function demanderCoucher(d, it) {
  const c = it.carte;
  if (!reglages.verifier) { marquerFait(d, it, { proposer: false }); return; }
  const propres = questionsCarte(c);
  const question = composer((propres.length ? tirer(`q-${c.id}`, propres, ['nom']) : null) || 'ねる じゅんびは できた？', { nom: { html: nomHtml(c), lire: nomLu(c) } });
  const contenu = el('div', { class: 'verif' });
  contenu.append(el('div', { class: `verif-tete lieu-${c.lieu}`, html: `${visuel(c, 'grand')}<span class="verif-nom">${nomHtml(c)}</span>` }));
  const bloc = el('div', { class: 'verif-contexte verif-nuit', 'data-lire': 'おやすみの まえに。' });
  bloc.innerHTML = `<i class="verif-emoji" aria-hidden="true">🌙</i><p>${html('おやすみの まえに')}</p>`;
  contenu.append(bloc);
  contenu.append(el('p', { class: 'verif-question', 'data-lire': question.lire, html: question.html }));
  const actions = el('div', { class: 'verif-actions' });
  actions.append(
    bouton('まだ', () => { fermerFeuille(); parler('じゅんびが できたら おしてね。'); }, { classe: 'btn btn-large', icone: ICONE_RETOUR }),
    bouton('うん', () => { fermerFeuille(); marquerFait(d, it, { proposer: false }); }, { classe: 'btn btn-large btn-fait', icone: ICONE_COCHE }),
  );
  contenu.append(actions);
  ouvrirFeuille({ titre: '', contenu, classe: 'feuille-verif' });
  parler(`おやすみの まえに。 ${question.lire}`);
}

// Trop tôt : on explique, et on ne coche pas (un seul bouton 「わかった」).
function refuserFin(it, attente, m) {
  const c = it.carte;
  const nuit = estNuit(m);
  const lire = `${nomLu(c)}は まだ だよ。 ${heureLue(it.debutEff)}から。 あと ${yomiDuree(attente)}。${nuit ? ' いまは よる。 ゆっくり やすもう。' : ''}`;
  const contenu = el('div', { class: 'verif' });
  contenu.append(el('div', { class: `verif-tete lieu-${c.lieu}`, html: `${visuel(c, 'grand')}<span class="verif-nom">${nomHtml(c)}</span>` }));
  const bloc = el('div', { class: 'verif-contexte verif-avant', 'data-lire': lire });
  if (reglages.horloge) bloc.insertAdjacentHTML('beforeend', svgHorloge(m, attente <= 60 ? it.debutEff : null, { titre: lire }));
  bloc.append(el('p', {
    html: `${html('まだ だよ。')} ${heureHtml(it.debutEff)}${html('から。')} ${html(`（あと ${texteDuree(attente)}）`)}`,
  }));
  contenu.append(bloc);
  if (nuit) contenu.append(el('p', { class: 'verif-question', html: `<i class="verif-lune" aria-hidden="true">🌙</i> ${html('今《いま》は 夜《よる》。 ゆっくり 休《やす》もう。')}` }));
  contenu.append(bouton('わかった', fermerFeuille, { classe: 'btn btn-principal btn-large verif-ok' }));
  ouvrirFeuille({ titre: '', contenu, classe: 'feuille-verif' });
  parler(lire);
}

// Un cours pas encore fini : on explique (phrase tirée de la liste 「finFixe」), et on ne coche pas.
function refuserCours(it, reste, m) {
  const c = it.carte;
  const vars = {
    nom: { html: nomHtml(c), lire: nomLu(c) },
    fin: { html: heureHtml(it.fin), lire: heureLue(it.fin) },
    reste: varDuree(reste),
  };
  const texte = composer(tirer('finFixe', liste('finFixe'), Object.keys(vars)) || 'まだ だよ。', vars);
  const contenu = el('div', { class: 'verif' });
  contenu.append(el('div', { class: `verif-tete lieu-${c.lieu}`, html: `${visuel(c, 'grand')}<span class="verif-nom">${nomHtml(c)}</span>` }));
  const bloc = el('div', { class: 'verif-contexte verif-avant', 'data-lire': texte.lire });
  if (reglages.horloge) bloc.insertAdjacentHTML('beforeend', svgHorloge(m, it.fin, { titre: texte.lire }));
  bloc.append(el('p', { html: texte.html }));
  contenu.append(bloc, bouton('わかった', fermerFeuille, { classe: 'btn btn-principal btn-large verif-ok' }));
  ouvrirFeuille({ titre: '', contenu, classe: 'feuille-verif' });
  parler(texte.lire);
}

/* ----- Cocher, photographier ----- */

export function marquerFait(d, it, { proposer = true } = {}) {
  noter(d, it.act.id, { fait: true, a: versTexte(new Date().getHours() * 60 + new Date().getMinutes()) });
  sons.succes();
  const apres = deroulement(d);
  const suite = apres.actuel && apres.actuel.act.id !== it.act.id ? ` つぎは ${nomLu(apres.actuel.carte)}。` : '';
  parler(estSommeil(it.carte) ? 'おやすみなさい。' : `${nomLu(it.carte)}、 おわったね。${suite}`);
  nav.rafraichir();
  if (proposer && reglages.photos && !it.carte.sansPhoto) setTimeout(() => proposerPhoto(d, it), 700);
}

function proposerPhoto(d, it) {
  const contenu = el('div', { class: 'proposer-photo' });
  contenu.innerHTML = `<div class="pp-visuel">${visuel(it.carte, 'grand')}</div><p class="pp-question" data-lire="しゃしんを とる？">${html('写真《しゃしん》を とる？')}</p>`;
  const actions = el('div', { class: 'actions-feuille' });
  actions.append(
    bouton('とる', () => prendrePhoto(d, it, 'camera'), { classe: 'btn btn-principal btn-large', icone: ICONE_PHOTO }),
    bouton('えらぶ', () => prendrePhoto(d, it, 'galerie'), { classe: 'btn btn-large', icone: ICONE_GALERIE }),
    bouton('とらない', fermerFeuille, { classe: 'btn btn-large' }),
  );
  contenu.append(actions);
  ouvrirFeuille({ titre: `${it.carte.nom}、 おわった！`, contenu });
  parler('しゃしんを とる？');
}

async function prendrePhoto(d, it, source) {
  fermerFeuille();
  const id = await nouvellePhoto(source, 'journal');
  if (!id) return;
  const ancienne = it.note && it.note.photo;
  noter(d, it.act.id, { photo: id });
  if (ancienne) supprimerPhoto(ancienne);
  message('写真《しゃしん》を 入《い》れたよ。');
  parler('しゃしんを いれたよ。');
  nav.rafraichir();
}

function lancerEtapes(d, it) {
  nav.etapes(it.carte.routine, () => marquerFait(d, it), d);
}

/* ----- Le détail d'une activité (toucher une ligne) ----- */

function ouvrirActivite(d, it) {
  const c = it.carte;
  const dr = deroulement(d);
  const courant = dr.items.find((x) => x.act.id === it.act.id) || it;
  const contenu = el('div', { class: 'detail-activite' });
  let plage = plageHtml(courant.act);
  let plageDite = plageLue(courant.act);
  // Sans heure : l'heure calculée d'après sa place, 「だいたい」.
  if (!plage && courant.debutEff !== null && !dr.passe) {
    const fin = courant.finEff !== null ? courant.finEff : null;
    plage = `<small class="detail-environ">${html('だいたい')}</small>${heureHtml(courant.debutEff)}${fin !== null ? `<span class="kara">〜</span>${heureHtml(fin, { sansMoment: (courant.debutEff < 720) === (fin < 720) })}` : ''}`;
    plageDite = `だいたい ${heureLue(courant.debutEff)}から${fin !== null ? ` ${heureLue(fin)}まで` : ''}`;
  }
  const tete = el('div', { class: `detail-tete lieu-${c.lieu}`, 'data-lire': `${nomLu(c)}。 ${plageDite}` });
  tete.innerHTML = `${visuel(c, 'grand')}<div><p class="detail-nom">${nomHtml(c)}</p>${plage ? `<p class="detail-heures">${plage}</p>` : ''}</div>`;
  contenu.append(tete);
  if (courant.note && courant.note.photo) {
    contenu.append(el('div', { class: 'detail-photo avec-photo', html: `<img data-photo="${courant.note.photo}" alt="">` }));
  }
  if (c.mochimono && c.mochimono.length) contenu.append(boiteMochimono('もちもの', c.mochimono.map((a) => ({ ...a, carte: c }))));
  if (estCadreLibre(c) && (!dr.passe || courant.loisirs.length)) contenu.append(blocLoisirs(d, courant, !dr.passe && !courant.fait && peutAjouter()));
  const actions = el('div', { class: 'actions-feuille' });
  actions.append(bouton('きく', () => lireElement(tete), { classe: 'btn', icone: ICONE_HP, options: { garde: false } }));
  if (!dr.passe || courant.fait) {
    if (courant.fait) {
      actions.append(bouton('まだ', () => { oublierFait(d, courant); fermerFeuille(); }, { classe: 'btn', icone: ICONE_RETOUR }));
    } else if (dr.passe || (dr.aujourdhui && !tropTot(dr, courant) && !coursEnCours(dr, courant))) {
      actions.append(estSommeil(c)
        ? bouton('おやすみ', () => { fermerFeuille(); demanderFin(d, courant); }, { classe: 'btn btn-principal btn-nuit', icone: '<i aria-hidden="true">🌙</i>' })
        : bouton('おわった', () => { fermerFeuille(); demanderFin(d, courant); }, { classe: 'btn btn-principal', icone: ICONE_COCHE }));
    } else if (dr.aujourdhui) {
      // Pas encore cochable : on dit quand ce sera possible.
      const cours = coursEnCours(dr, courant);
      const quand = cours ? courant.fin - AVANT_FIN_COURS : courant.debutEff - AVANCE_MAX;
      const t = `${heureLue(quand)}から チェック できるよ。`;
      contenu.append(el('p', { class: 'detail-info', 'data-lire': t, html: `${heureHtml(quand)}${html('から チェック できるよ。')}` }));
    }
  }
  if (c.routine && routine(c.routine)) {
    actions.append(bouton('てじゅん', () => { fermerFeuille(); lancerEtapes(d, courant); }, { classe: 'btn', icone: ICONE_ETAPES }));
  }
  if (courant.fait && reglages.photos && !c.sansPhoto) {
    actions.append(bouton(courant.note && courant.note.photo ? '写真《しゃしん》を かえる' : '写真《しゃしん》', () => prendrePhoto(d, courant, 'camera'), { classe: 'btn', icone: ICONE_PHOTO }));
    actions.append(bouton('えらぶ', () => prendrePhoto(d, courant, 'galerie'), { classe: 'btn', icone: ICONE_GALERIE }));
  }
  if (!dr.passe && peutDeplacer() && (courant.debut === null || courant.act.parEleve)) {
    actions.append(bouton('うごかす', () => commencerDeplacement(d, courant), { classe: 'btn', icone: ICONE_DEPLACER }));
  }
  if (!dr.passe && peutAjouter() && courant.act.parEleve) {
    actions.append(bouton('けす', () => enlever(d, courant), { classe: 'btn btn-danger', icone: ICONE_POUBELLE }));
  }
  contenu.append(actions);
  ouvrirFeuille({ titre: '', contenu });
  lireElement(tete);
}

/* ----- 自由時間 : ce qu'il choisit d'y faire ----- */

function blocLoisirs(d, it, modifiable) {
  const bloc = el('div', { class: 'bloc-loisirs' });
  const titre = 'なにを する？';
  bloc.append(el('p', { class: 'bl-titre', 'data-lire': titre, html: html(titre) }));
  if (it.loisirs.length) {
    const ul = el('ul', { class: 'bl-liste' });
    it.loisirs.forEach((l) => {
      const li = el('li', { class: `bl-loisir lieu-${l.lieu}`, 'data-lire': nomLu(l), html: `${visuel(l)}<span>${nomHtml(l)}</span>` });
      if (modifiable) {
        const x = el('button', { type: 'button', class: 'btn-rond btn-mini-rond', 'aria-label': `${nomLu(l)}を はずす`, html: ICONE_FERMER });
        activable(x, () => {
          changerLoisirs(d, it.act.id, it.loisirs.filter((y) => y.id !== l.id).map((y) => y.id));
          parler(`${nomLu(l)}を はずしたよ。`);
          fermerFeuille();
          nav.rafraichir();
        }, { garde: false });
        li.append(x);
      }
      ul.append(li);
    });
    bloc.append(ul);
  } else {
    bloc.append(el('p', { class: 'bl-vide', 'data-lire': 'すきな ことを えらんでね。', html: html('好《す》きな ことを えらんでね。') }));
  }
  if (modifiable) bloc.append(bouton('えらぶ', () => choisirLoisirs(d, it), { classe: 'btn', icone: ICONE_PLUS }));
  return bloc;
}

// Une grille des loisirs : il touche ce qu'il veut faire (plusieurs possibles), puis 「これで いい」.
function choisirLoisirs(d, it) {
  const choisis = new Set(it.loisirs.map((l) => l.id));
  const contenu = el('div', { class: 'choix-carte choix-loisirs' });
  const grille = el('div', { class: 'choix-grille' });
  toutesLesCartes().filter(estLoisir).forEach((l) => {
    const b = el('button', {
      type: 'button', class: `tuile-carte lieu-${l.lieu}${choisis.has(l.id) ? ' choisie' : ''}`, 'aria-pressed': String(choisis.has(l.id)),
      'aria-label': lu(l.nom), 'data-lire': lu(l.nom), html: `${visuel(l)}<span class="tuile-nom">${html(l.nom)}</span>`,
    });
    activable(b, () => {
      if (choisis.has(l.id)) choisis.delete(l.id); else choisis.add(l.id);
      b.classList.toggle('choisie', choisis.has(l.id));
      b.setAttribute('aria-pressed', String(choisis.has(l.id)));
      parler(choisis.has(l.id) ? lu(l.nom) : `${lu(l.nom)}は やめる`);
    }, { garde: false });
    grille.append(b);
  });
  const ok = bouton('これで いい', () => {
    changerLoisirs(d, it.act.id, [...choisis]);
    sons.succes();
    fermerFeuille();
    fermerFeuille();
    nav.rafraichir();
    montrerActivite(it.act.id, { briller: true });
    parler(choisis.size ? `${[...choisis].map((id) => nomLu(carte(id))).join('と ')}を するんだね。` : 'わかった。');
  }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE });
  contenu.append(grille, el('div', { class: 'choix-pied' }, ok));
  ouvrirFeuille({ titre: `${it.carte.nom}に なにを する？`, contenu, classe: 'feuille-haute' });
}

function oublierFait(d, it) {
  const photo = it.note && it.note.photo;
  if (photo) noter(d, it.act.id, { fait: false });
  else oublier(d, it.act.id);
  nav.rafraichir();
}

/* ----- L'élève change sa journée ----- */

function ajouter(d) {
  ajouterAuJour(d);
}

// Ajouter une activité : d'abord quoi (la carte), puis quand et où (「いつ する？」).
// jourFixe : la date est déjà choisie (calendrier du mois) ; apres(date, idCarte) remplace l'affichage qui suit.
export function ajouterAuJour(d, { jourFixe = false, apres = null } = {}) {
  const titre = jourFixe ? `${d.getMonth() + 1}がつ ${d.getDate()}にちに 何《なに》を 入《い》れる？` : '何《なに》を 入《い》れる？';
  choisirCarte({
    titre, texteOk: 'つぎ',
    surChoix: (idCarte) => choisirPlace(d, idCarte, ({ date, apres: placeApres, avant, debut, dans, texte }) => {
      sons.succes();
      if (dans) {
        // Un loisir rangé dans un 自由時間 : il n'a pas d'heure à lui.
        mettreDansLibre(date, dans, idCarte);
        parler(`${nomLu(carte(idCarte))}を ${lu(texte)}に いれたよ。`);
      } else {
        inserer(date, idCarte, { apres: placeApres, avant, debut });
        parler(`${nomLu(carte(idCarte))}を ${lu(texte)}の よていに いれたよ。`);
      }
      if (apres) { apres(date, idCarte); return; }
      if (cle(date) !== cle(d)) message(dans ? `${texte}に 入《い》れたよ。` : `${texte}の 予定《よてい》に 入《い》れたよ。`);
      nav.rafraichir();
      if (dans && cle(date) === cle(d)) montrerActivite(dans, { briller: true });
    }, { jourFixe }),
  });
}

// Une activité de l'élève : à l'heure choisie (dans l'ordre des heures), ou après / avant une activité.
export function inserer(d, idCarte, { apres = null, avant = null, debut = '' } = {}) {
  modifierJour(d, (liste) => {
    const act = nouvelleActivite(idCarte, debut, '', true);
    if (debut) {
      liste.push(act);
      const triee = trierParHeure(liste);
      liste.splice(0, liste.length, ...triee);
      return;
    }
    let i = liste.length;
    if (apres) { const j = liste.findIndex((x) => x.id === apres); if (j >= 0) i = j + 1; } else if (avant) { const j = liste.findIndex((x) => x.id === avant); if (j >= 0) i = j; }
    liste.splice(i, 0, act);
  });
}

/* ----- Déplacer une activité : directement dans la liste, avec des cases 「＋ ここ」 ----- */

let aDeplacer = null;   // { date: 'AAAA-MM-JJ', id } pendant qu'on choisit la nouvelle place

function commencerDeplacement(d, it) {
  aDeplacer = { date: cle(d), id: it.act.id };
  fermerFeuille();
  nav.rafraichir();
  montrerActivite(it.act.id);
  parler(`${nomLu(it.carte)}を どこに うごかす？ プラスを おしてね。`);
}

function arreterDeplacement() {
  const id = aDeplacer && aDeplacer.id;
  aDeplacer = null;
  nav.rafraichir();
  montrerActivite(id);
}

// Faire voir une activité de la liste (au milieu de l'écran), et la faire briller un instant après un déplacement.
function montrerActivite(id, { briller = false } = {}) {
  if (!id) return;
  const li = document.querySelector(`.page-jour [data-act="${id}"]`);
  if (!li) return;
  try { li.scrollIntoView({ block: 'center', behavior: reglages.animationsReduites ? 'auto' : 'smooth' }); } catch { li.scrollIntoView(); }
  if (briller) li.classList.add('vient-de-bouger');
}

// Les cases : avant chaque activité à venir (pas juste autour de celle qu'on déplace, ni avant celle en cours), et à la fin.
function listeDeplacement(d, dr) {
  const items = dr.items.filter((it) => it.statut === 'maintenant' || it.statut === 'avenir' || it.act.id === aDeplacer.id);
  const iMoi = items.findIndex((it) => it.act.id === aDeplacer.id);
  const moi = items[iMoi];
  const loisir = estLoisir(moi.carte);
  const bloc = el('div', { class: 'moments liste-deplacement' });
  const caseIci = (cible, lire) => {
    const li = el('li', { class: 'place-case' });
    const b = el('button', { type: 'button', class: 'place', 'aria-label': lire, html: `<span aria-hidden="true">＋</span>${html('ここ')}` });
    activable(b, () => deplacerVers(d, moi, cible), { garde: false });
    li.append(b);
    return li;
  };
  let ol = null;
  let periode = null;
  items.forEach((it, k) => {
    if (it.periode !== periode) {
      periode = it.periode;
      const p = PERIODES.find((x) => x.id === periode);
      bloc.append(el('h3', { class: 'moment-titre', 'data-lire': lu(p.nom), html: `<span class="moment-emoji" aria-hidden="true">${p.emoji}</span>${html(p.nom)}` }));
      ol = el('ol', { class: 'liste-jour' });
      bloc.append(ol);
    }
    const inutile = k === iMoi || k === iMoi + 1 || it.statut === 'maintenant';
    if (!inutile) ol.append(caseIci({ avant: it.act.id }, `${nomLu(it.carte)}の まえ`));
    const li = ligneActivite(d, it, { inerte: true });
    if (k === iMoi) {
      li.classList.add('en-deplacement');
      li.querySelector('.act-etat').innerHTML = `<i class="act-ici">${ICONE_DEPLACER}</i>`;
    }
    ol.append(li);
    // Un loisir peut aussi entrer dans un 自由時間.
    if (loisir && k !== iMoi && estCadreLibre(it.carte) && !it.loisirs.some((l) => l.id === moi.carte.id)) {
      const lire = `${nomLu(it.carte)}に いれる`;
      const b = el('button', {
        type: 'button', class: `place place-dedans lieu-${it.carte.lieu}`, 'aria-label': lire,
        html: `<span aria-hidden="true">${moi.carte.emoji || '⭐'}</span>${html(`${it.carte.nom}に 入《い》れる`)}`,
      });
      activable(b, () => deplacerDans(d, moi, it), { garde: false });
      ol.append(el('li', { class: 'place-case place-case-dedans' }, b));
    }
  });
  if (iMoi !== items.length - 1 && ol) ol.append(caseIci({ fin: true }, 'さいご'));
  return bloc;
}

function deplacerVers(d, it, cible) {
  modifierJour(d, (liste) => {
    const i = liste.findIndex((x) => x.id === it.act.id);
    if (i < 0) return;
    const [act] = liste.splice(i, 1);
    // Une activité déplacée suit sa nouvelle place : elle n'a plus d'heure fixe.
    act.debut = '';
    act.fin = '';
    const j = cible.avant ? liste.findIndex((x) => x.id === cible.avant) : -1;
    if (j >= 0) liste.splice(j, 0, act);
    else liste.push(act);
  });
  aDeplacer = null;
  sons.succes();
  parler(`${nomLu(it.carte)}を うごかしたよ。`);
  nav.rafraichir();
  montrerActivite(it.act.id, { briller: true });
}

// Ranger un loisir (テレビ ajoutée à côté) dans un 自由時間 : il quitte la liste et entre dans le créneau.
function deplacerDans(d, it, cadre) {
  modifierJour(d, (liste) => {
    const i = liste.findIndex((x) => x.id === it.act.id);
    if (i >= 0) liste.splice(i, 1);
    const a = liste.find((x) => x.id === cadre.act.id);
    if (a) a.loisirs = [...new Set([...(a.loisirs || []), it.carte.id])];
  });
  aDeplacer = null;
  sons.succes();
  parler(`${nomLu(it.carte)}を ${nomLu(cadre.carte)}に いれたよ。`);
  nav.rafraichir();
  montrerActivite(cadre.act.id, { briller: true });
}

function enlever(d, it) {
  modifierJour(d, (liste) => {
    const i = liste.findIndex((x) => x.id === it.act.id);
    if (i >= 0) liste.splice(i, 1);
  });
  oublier(d, it.act.id);
  fermerFeuille();
  parler('けしたよ。');
  nav.rafraichir();
}

