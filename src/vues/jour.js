/* ======================================================================
   「きょう」 : いま (en grand), つぎ, puis la liste de la journée.
   Une activité finie se coche 「おわった」 ; on peut alors prendre une photo pour la ふりかえり.
   La même vue montre aussi une autre date (depuis la semaine ou le mois).
   ====================================================================== */

import { choisirCarte } from '../choix-carte.js';
import {
  evenementsDu, modifierJour, noter, nouvelleActivite, oublier, prochainsEvenements,
  routine, sorteDuJour,
} from '../donnees.js';
import {
  aujourdhui, cle, deCle, ecartJours, JOURS_SEMAINE, texteDans, texteDuree, versTexte, yomiDans, yomiDate, yomiDuree, yomiHeure,
} from '../heure.js';
import { barre, repereGrandeAiguille, svgHorloge } from '../horloge.js';
import {
  deroulement, indexPeriode, PERIODES,
} from '../journee.js';
import { nav } from '../nav.js';
import { el } from '../outils.js';
import { chargerPhotos, nouvellePhoto, supprimerPhoto } from '../photos.js';
import { reglages } from '../reglages.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, fermerFeuille, heureHtml, heureLue, ICONE_BAS, ICONE_COCHE, ICONE_ETAPES, ICONE_GALERIE, ICONE_GAUCHE, ICONE_HAUT,
  ICONE_HP, ICONE_PHOTO, ICONE_PLUS, ICONE_POUBELLE, ICONE_RETOUR, message, nomHtml, nomLu, ouvrirFeuille, plageHtml, plageLue,
  visuel,
} from '../ui.js';
import { lireElement, parler, sons } from '../voix.js';

const peutAjouter = () => reglages.eleve === 'ajouter' || reglages.eleve === 'deplacer';
const peutDeplacer = () => reglages.eleve === 'deplacer';

// 「11がつ 23にち（にち）」
export const dateHtml = (d) => `<span class="mot">${d.getMonth() + 1}がつ</span> <span class="mot">${d.getDate()}にち</span>`
  + `<span class="mot jour-sem jour-${d.getDay()}">（${html(JOURS_SEMAINE[d.getDay()].court, { mots: false })}）</span>`;

/* ----- La carte 「いま」 ----- */

function carteMaintenant(d, dr) {
  const art = el('article', { class: 'maintenant' });
  if (!dr.items.length) {
    art.classList.add('maintenant-vide');
    art.innerHTML = `<p class="m-fin" data-lire="きょうの よていは ないよ。">${html('今日《きょう》の 予定《よてい》は ないよ。')}</p>`;
    return art;
  }
  const { actuel, commence, maintenant } = dr;
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
  const fin = commence ? actuel.finEff : actuel.debut;
  const debutPart = commence ? (actuel.debut ?? maintenant) : maintenant;
  const reste = fin !== null ? Math.max(0, Math.ceil(fin - maintenant)) : null;
  const etiquette = commence ? 'いま' : 'つぎ';
  const plage = plageHtml(actuel.act);
  let parole = `${etiquette}は ${nomLu(c)}。`;
  if (plage) parole += ` ${plageLue(actuel.act)}。`;

  const haut = el('div', { class: 'm-haut' });
  haut.innerHTML = `${visuel(c, 'grand')}<div class="m-titre"><p class="m-etiquette">${etiquette}</p>`
    + `<h2 class="m-nom">${nomHtml(c)}</h2>${plage ? `<p class="m-heures">${plage}</p>` : ''}</div>`;
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

  const actions = el('div', { class: 'm-actions' });
  const r = c.routine && routine(c.routine);
  if (r) actions.append(bouton('てじゅん', () => lancerEtapes(d, actuel), { classe: 'btn btn-large', icone: ICONE_ETAPES }));
  actions.append(bouton('おわった', () => marquerFait(d, actuel), { classe: 'btn btn-principal btn-large btn-fait', icone: ICONE_COCHE }));
  art.append(actions);
  return art;
}

function carteSuivante(dr) {
  const s = dr.commence ? dr.suivant : null;
  if (!s) return null;
  const c = s.carte;
  const plage = s.debut !== null ? heureHtml(s.debut) : '';
  const p = el('div', {
    class: `suivante lieu-${c.lieu}`,
    'data-lire': `つぎは ${nomLu(c)}。${s.debut !== null ? ` ${heureLue(s.debut)}から。` : ''}`,
    html: `<span class="s-etiquette">つぎ</span>${visuel(c)}<span class="s-nom">${nomHtml(c)}</span>${plage ? `<span class="s-heure">${plage}</span>` : ''}`,
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

/* ----- La liste de la journée ----- */

function ligneActivite(d, it) {
  const c = it.carte;
  const li = el('li', { class: `act statut-${it.statut} lieu-${c.lieu}` });
  const etat = { fait: 'おわった', maintenant: 'いま', passe: '', avenir: '' }[it.statut];
  const b = el('button', {
    type: 'button', class: 'act-btn',
    'aria-label': `${it.debut !== null ? `${heureLue(it.debut)}、 ` : ''}${nomLu(c)}${etat ? `、 ${etat}` : ''}`,
    html: `<span class="act-heure">${it.debut !== null ? heureHtml(it.debut) : ''}</span>${visuel(c)}`
      + `<span class="act-nom">${nomHtml(c)}</span>`
      + `<span class="act-etat" aria-hidden="true">${it.fait ? ICONE_COCHE : ''}${it.note && it.note.photo ? '<i class="act-photo">📷</i>' : ''}</span>`,
  });
  activable(b, () => ouvrirActivite(d, it));
  li.append(b);
  return li;
}

let voirFinies = false;

// L'heure repère d'un moment : 6じ, 10じ, 2じ (ou 14じ en 24 h).
export const repereMoment = (p) => {
  const h = p.debut / 60;
  return reglages.format24 ? h : (h % 12 || 12);
};

// La liste groupée par moment de la journée (あさ, ひる, ごご, よる), avec l'heure repère.
function listeParMoments(d, items) {
  const bloc = el('div', { class: 'moments' });
  PERIODES.forEach((p) => {
    const du = items.filter((it) => it.periode === p.id);
    if (!du.length) return;
    const h = repereMoment(p);
    bloc.append(el('h3', {
      class: 'moment-titre', 'data-lire': `${lu(p.nom)}。 ${yomiHeure(h)}から`,
      html: `<span class="moment-emoji" aria-hidden="true">${p.emoji}</span>${html(p.nom)}<small>${h}じ〜</small>`,
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
  const bandeau = bandeauEvenements(d);
  if (bandeau) page.append(bandeau);

  if (estAuj) {
    page.append(carteMaintenant(d, dr));
    const s = carteSuivante(dr);
    if (s) page.append(s);
  }

  if (estAuj) {
    // Aujourd'hui : ce qui reste à faire d'abord ; ce qui est fini en dessous, replié.
    const aVenir = dr.items.filter((it) => it.statut === 'maintenant' || it.statut === 'avenir');
    const finies = dr.items.filter((it) => it.statut === 'fait' || it.statut === 'passe');
    if (aVenir.length) {
      const titre = finies.length ? 'これからの 予定《よてい》' : '今日《きょう》の 予定《よてい》';
      page.append(el('h2', { class: 'titre-liste', 'data-lire': lu(titre), html: html(titre) }), listeParMoments(d, aVenir));
    }
    if (finies.length) {
      const ouvert = voirFinies || !aVenir.length;
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

/* ----- Cocher, photographier ----- */

export function marquerFait(d, it, { proposer = true } = {}) {
  noter(d, it.act.id, { fait: true, a: versTexte(new Date().getHours() * 60 + new Date().getMinutes()) });
  sons.succes();
  const apres = deroulement(d);
  const suite = apres.actuel && apres.actuel.act.id !== it.act.id ? ` つぎは ${nomLu(apres.actuel.carte)}。` : '';
  parler(`${nomLu(it.carte)}、 おわったね。${suite}`);
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
  nav.etapes(it.carte.routine, () => marquerFait(d, it));
}

/* ----- Le détail d'une activité (toucher une ligne) ----- */

function ouvrirActivite(d, it) {
  const c = it.carte;
  const dr = deroulement(d);
  const courant = dr.items.find((x) => x.act.id === it.act.id) || it;
  const contenu = el('div', { class: 'detail-activite' });
  const plage = plageHtml(courant.act);
  const tete = el('div', { class: `detail-tete lieu-${c.lieu}`, 'data-lire': `${nomLu(c)}。 ${plageLue(courant.act)}` });
  tete.innerHTML = `${visuel(c, 'grand')}<div><p class="detail-nom">${nomHtml(c)}</p>${plage ? `<p class="detail-heures">${plage}</p>` : ''}</div>`;
  contenu.append(tete);
  if (courant.note && courant.note.photo) {
    contenu.append(el('div', { class: 'detail-photo avec-photo', html: `<img data-photo="${courant.note.photo}" alt="">` }));
  }
  const actions = el('div', { class: 'actions-feuille' });
  actions.append(bouton('きく', () => lireElement(tete), { classe: 'btn', icone: ICONE_HP, options: { garde: false } }));
  if (!dr.passe || courant.fait) {
    if (courant.fait) {
      actions.append(bouton('まだ', () => { oublierFait(d, courant); fermerFeuille(); }, { classe: 'btn', icone: ICONE_RETOUR }));
    } else if (dr.aujourdhui || dr.passe) {
      actions.append(bouton('おわった', () => { fermerFeuille(); marquerFait(d, courant); }, { classe: 'btn btn-principal', icone: ICONE_COCHE }));
    }
  }
  if (c.routine && routine(c.routine)) {
    actions.append(bouton('てじゅん', () => { fermerFeuille(); lancerEtapes(d, courant); }, { classe: 'btn', icone: ICONE_ETAPES }));
  }
  if (courant.fait && reglages.photos && !c.sansPhoto) {
    actions.append(bouton(courant.note && courant.note.photo ? '写真《しゃしん》を かえる' : '写真《しゃしん》', () => prendrePhoto(d, courant, 'camera'), { classe: 'btn', icone: ICONE_PHOTO }));
    actions.append(bouton('えらぶ', () => prendrePhoto(d, courant, 'galerie'), { classe: 'btn', icone: ICONE_GALERIE }));
  }
  if (!dr.passe && peutDeplacer() && courant.debut === null) {
    actions.append(bouton('まえへ', () => deplacer(d, courant, -1), { classe: 'btn', icone: ICONE_HAUT }));
    actions.append(bouton('あとへ', () => deplacer(d, courant, 1), { classe: 'btn', icone: ICONE_BAS }));
  }
  if (!dr.passe && peutAjouter() && courant.act.parEleve) {
    actions.append(bouton('けす', () => enlever(d, courant), { classe: 'btn btn-danger', icone: ICONE_POUBELLE }));
  }
  contenu.append(actions);
  ouvrirFeuille({ titre: '', contenu });
  lireElement(tete);
}

function oublierFait(d, it) {
  const photo = it.note && it.note.photo;
  if (photo) noter(d, it.act.id, { fait: false });
  else oublier(d, it.act.id);
  nav.rafraichir();
}

/* ----- L'élève change sa journée ----- */

function ajouter(d) {
  choisirCarte({
    titre: '何《なに》を 入《い》れる？',
    quand: { date: d },
    surChoix: (idCarte, { date, moment, texte }) => {
      inserer(date, idCarte, moment);
      const c = deroulement(date).items.find((x) => x.act.parEleve && x.act.carte === idCarte);
      sons.succes();
      parler(`${c ? nomLu(c.carte) : ''}を ${lu(texte)}に いれたよ。`);
      if (cle(date) !== cle(d)) message(`${texte}に 入《い》れたよ。`);
      nav.rafraichir();
    },
  });
}

// Une activité de l'élève : juste après celle en cours (「つぎ」), ou à la fin d'un moment de la journée.
export function inserer(d, idCarte, moment) {
  const dr = deroulement(d);
  modifierJour(d, (liste) => {
    const act = nouvelleActivite(idCarte, '', '', true);
    const iActuel = dr.aujourdhui && dr.actuel ? liste.findIndex((x) => x.id === dr.actuel.act.id) : -1;
    let i;
    if (moment === 'apres') i = iActuel >= 0 ? iActuel + 1 : liste.length;
    else {
      const ip = indexPeriode(moment);
      const premier = dr.items.find((it) => indexPeriode(it.periode) > ip);
      i = premier ? liste.findIndex((x) => x.id === premier.act.id) : liste.length;
      if (iActuel >= 0 && i <= iActuel) i = iActuel + 1;
    }
    liste.splice(i, 0, act);
  });
}

function deplacer(d, it, sens) {
  modifierJour(d, (liste) => {
    const i = liste.findIndex((x) => x.id === it.act.id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
  });
  parler(sens < 0 ? 'まえに うごかしたよ。' : 'あとに うごかしたよ。');
  fermerFeuille();
  nav.rafraichir();
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

