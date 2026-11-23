/* ======================================================================
   Espace parents (appui long sur 「おうちの人」), en français ou en japonais :
   la semaine type, les journées modifiées, le calendrier, les étapes, les cartes,
   les réglages, et la sauvegarde pour passer d'un appareil à l'autre.
   ====================================================================== */

import { CARTES, LIEUX } from './catalogue.js';
import { choisirCarte } from './choix-carte.js';
import {
  carte, enregistrer, enregistrerCarte, enregistrerJournal, etat, journal, modifierJour, nouvelleActivite, reinitialiser, remplacerEtat,
  retablirJour, supprimerCarte, trierParHeure,
} from './donnees.js';
import {
  ajouterJours, aujourdhui, cle, deCle, JOURS_SEMAINE, versMinutes, versTexte,
} from './heure.js';
import { $, copie, echapper, el, uid } from './outils.js';
import {
  chargerPhotos, nouvellePhoto, photosDepuisTexte, photosEnTexte, supprimerPhoto,
} from './photos.js';
import { plateforme } from './plateforme.js';
import {
  ecrireReglages, ONGLETS, reglages, remplacerReglages,
} from './reglages.js';
import { html, lu } from './texte.js';
import { fermerFeuille, ouvrirFeuille, visuel } from './ui.js';
import { parler, voixJa } from './voix.js';

const L = (fr, ja) => (reglages.langue === 'ja' ? ja : fr);
let surFermer = () => {};
let jourEdite = '1';          // '1'…'7', 'vacances', ou une date 'AAAA-MM-JJ'
const ouverts = new Set(['semaine']);

export function installerParents(fermer) {
  surFermer = fermer;
  $('btn-fermer-parents').addEventListener('click', () => surFermer());
}

const champ = (label, controle, aide = '') => el('label', { class: 'p-champ' },
  el('span', { class: 'p-label', text: label }), controle, aide ? el('small', { class: 'p-aide', text: aide }) : null);
const btnP = (texte, action, classe = 'btn btn-petit') => el('button', { type: 'button', class: classe, text: texte, onclick: action });

function section(id, titre, contenu) {
  const d = el('details', { class: 'p-section', open: ouverts.has(id) });
  d.addEventListener('toggle', () => { if (d.open) ouverts.add(id); else ouverts.delete(id); });
  d.append(el('summary', { text: titre }), contenu);
  return d;
}

export function rendreParents() {
  $('parents-titre').textContent = L('Espace parents', 'おうちの人の せってい');
  const langue = $('parents-langue');
  langue.replaceChildren(
    btnP('FR', () => { ecrireReglages({ langue: 'fr' }); rendreParents(); }, `btn btn-petit${reglages.langue === 'fr' ? ' btn-principal' : ''}`),
    btnP('日本語', () => { ecrireReglages({ langue: 'ja' }); rendreParents(); }, `btn btn-petit${reglages.langue === 'ja' ? ' btn-principal' : ''}`),
  );
  $('btn-fermer-parents').textContent = L('Fermer', 'とじる');
  const corps = $('parents-corps');
  const haut = corps.scrollTop;
  corps.replaceChildren();
  if (etat.exemple) {
    corps.append(el('p', { class: 'p-note p-note-forte', text: L(
      "L'emploi du temps actuel est un exemple. Remplacez-le jour par jour par celui de votre enfant (ou videz un jour pour repartir de zéro).",
      'いまの 予定は「れい」です。お子さんの 予定に 書きかえてください（「この日を からにする」で 1から 作れます）。',
    ) }));
  }
  corps.append(
    section('semaine', L('Semaine type (時間割)', '1週間の 予定（時間割）'), blocSemaine()),
    section('jours', L('Journées modifiées', '変えた 日'), blocJours()),
    section('calendrier', L('Calendrier : événements et vacances', 'カレンダー：行事と 休み'), blocCalendrier()),
    section('etapes', L('Étapes (てじゅん)', 'てじゅん'), blocRoutines()),
    section('cartes', L('Cartes et photos', 'カードと 写真'), blocCartes()),
    section('reglages', L('Réglages', 'せってい'), blocReglages()),
    section('sauvegarde', L('Sauvegarde, autre appareil', 'バックアップ・ほかの 機器へ'), blocSauvegarde()),
  );
  chargerPhotos(corps);
  corps.scrollTop = haut;
}

/* ----- Éditeur d'une liste d'activités (semaine type, vacances, une date) ----- */

function listeEditee() {
  if (jourEdite === 'vacances') return etat.vacances;
  if (/^\d{4}-/.test(jourEdite)) {
    if (!etat.jours[jourEdite]) etat.jours[jourEdite] = [];
    return etat.jours[jourEdite];
  }
  etat.semaine[jourEdite] = etat.semaine[jourEdite] || [];
  return etat.semaine[jourEdite];
}
function remplacerListe(liste) {
  if (jourEdite === 'vacances') etat.vacances = liste;
  else if (/^\d{4}-/.test(jourEdite)) etat.jours[jourEdite] = liste;
  else etat.semaine[jourEdite] = liste;
  etat.exemple = false;
  enregistrer();
}

function editeurListe() {
  const boite = el('div', { class: 'ed-liste' });
  const liste = listeEditee();
  if (!liste.length) boite.append(el('p', { class: 'p-aide', text: L('Aucune activité ce jour-là.', 'この日の 予定は ありません。') }));
  liste.forEach((act, i) => {
    const c = carte(act.carte);
    const ligne = el('div', { class: `ed-ligne lieu-${c.lieu}` });
    const debut = el('input', { type: 'time', value: act.debut || '', 'aria-label': L('Début', 'はじまり') });
    const fin = el('input', { type: 'time', value: act.fin || '', 'aria-label': L('Fin (facultatif)', 'おわり（なくても よい）') });
    const changerHeure = () => {
      act.debut = debut.value;
      act.fin = fin.value && (!debut.value || versMinutes(fin.value) > versMinutes(debut.value)) ? fin.value : '';
      remplacerListe(trierParHeure(liste));
      rendreParentsOuFeuille();
    };
    debut.addEventListener('change', changerHeure);
    fin.addEventListener('change', changerHeure);
    const bCarte = el('button', { type: 'button', class: 'ed-carte', html: `${visuel(c)}<span>${html(c.nom)}</span>` });
    bCarte.addEventListener('click', () => choisirCarte({
      titre: L('Changer l\'activité', 'カードを かえる'), confirmer: false, lieu: c.lieu,
      surChoix: (id) => { act.carte = id; remplacerListe(liste); rendreParentsOuFeuille(); },
    }));
    const outils = el('div', { class: 'ed-outils' },
      btnP('↑', () => { if (i > 0) { [liste[i - 1], liste[i]] = [liste[i], liste[i - 1]]; remplacerListe(liste); rendreParentsOuFeuille(); } }, 'btn btn-mini'),
      btnP('↓', () => { if (i < liste.length - 1) { [liste[i + 1], liste[i]] = [liste[i], liste[i + 1]]; remplacerListe(liste); rendreParentsOuFeuille(); } }, 'btn btn-mini'),
      btnP('✕', () => { liste.splice(i, 1); remplacerListe(liste); rendreParentsOuFeuille(); }, 'btn btn-mini btn-danger'));
    ligne.append(el('div', { class: 'ed-heures' }, debut, el('span', { text: '–' }), fin), bCarte, outils);
    if (act.parEleve) ligne.append(el('small', { class: 'ed-eleve', text: L('ajoutée par l\'enfant', '子どもが 入れた') }));
    boite.append(ligne);
  });
  boite.append(btnP(L('＋ Ajouter une activité', '＋ 予定を たす'), () => choisirCarte({
    titre: L('Ajouter', 'たす'), confirmer: false,
    surChoix: (id) => {
      const derniere = liste[liste.length - 1];
      const apres = derniere ? (versMinutes(derniere.fin) ?? ((versMinutes(derniere.debut) ?? 480) + 30)) : 480;
      liste.push(nouvelleActivite(id, versTexte(Math.min(apres, 23 * 60 + 30)), ''));
      remplacerListe(trierParHeure(liste));
      rendreParentsOuFeuille();
    },
  }), 'btn btn-principal'));
  return boite;
}

function blocSemaine() {
  const b = el('div');
  b.append(el('p', { class: 'p-aide', text: L(
    "Choisissez un jour, puis réglez les heures et les activités. La fin est facultative : sans fin, l'activité dure jusqu'à la suivante. « Repos » sert pour les jours fériés et les vacances.",
    '曜日を えらんで、時間と 予定を 決めます。おわりの 時間は なくても よいです（つぎの 予定まで つづきます）。「休み」は 祝日と 長い 休みの 日に 使います。',
  ) }));
  const jours = el('div', { class: 'p-jours' });
  [['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 0]].forEach(([k, js]) => {
    jours.append(btnP(lu(JOURS_SEMAINE[js].court).replace('よう', ''), () => { jourEdite = k; rendreParents(); },
      `btn btn-petit jour-${js}${jourEdite === k ? ' btn-principal' : ''}`));
  });
  jours.append(btnP(L('Repos', '休み'), () => { jourEdite = 'vacances'; rendreParents(); }, `btn btn-petit${jourEdite === 'vacances' ? ' btn-principal' : ''}`));
  if (/^\d{4}-/.test(jourEdite)) jourEdite = '1';
  b.append(jours, editeurListe());

  const copier = el('div', { class: 'p-copier' });
  const cases = [];
  [1, 2, 3, 4, 5, 6, 7].forEach((k) => {
    if (String(k) === jourEdite) return;
    const cb = el('input', { type: 'checkbox', value: String(k) });
    cases.push(cb);
    copier.append(el('label', { class: 'p-case' }, cb, el('span', { text: lu(JOURS_SEMAINE[k % 7].court) })));
  });
  copier.append(btnP(L('Copier vers les jours cochés', 'チェックした 曜日に コピー'), () => {
    const vers = cases.filter((x) => x.checked).map((x) => x.value);
    if (!vers.length) return;
    vers.forEach((k) => { etat.semaine[k] = listeEditee().map((a) => ({ ...copie(a), id: uid('a') })); });
    etat.exemple = false;
    enregistrer();
    rendreParents();
  }));
  b.append(el('p', { class: 'p-sous-titre', text: L('Copier ce jour', 'この 日を コピー') }), copier);
  b.append(btnP(L('Vider ce jour', 'この日を からにする'), () => {
    if (!window.confirm(L('Enlever toutes les activités de ce jour ?', 'この日の 予定を ぜんぶ けしますか？'))) return;
    remplacerListe([]);
    rendreParents();
  }, 'btn btn-petit btn-danger'));
  return b;
}

/* ----- Une date précise ----- */

function editerDate(k) {
  const d = deCle(k);
  // On part du programme prévu ce jour-là.
  if (!etat.jours[k]) modifierJour(d, () => {});
  ouvrirEditeurDate(k);
}
function ouvrirEditeurDate(k) {
  const precedent = jourEdite;
  jourEdite = k;
  const d = deCle(k);
  const contenu = el('div', { class: 'p-feuille' });
  const redessiner = () => { contenu.replaceChildren(editeurListe()); chargerPhotos(contenu); };
  const ancien = rendreParents;
  // Dans la feuille, chaque changement redessine la feuille (puis l'espace parents à la fermeture).
  enFeuille = redessiner;
  redessiner();
  ouvrirFeuille({
    titre: `${d.getMonth() + 1}/${d.getDate()}（${JOURS_SEMAINE[d.getDay()].court}）`, contenu, classe: 'feuille-haute feuille-parents',
    fermeture: () => { enFeuille = null; jourEdite = precedent; ancien(); },
  });
}
let enFeuille = null;
const rendreParentsOuFeuille = () => (enFeuille ? enFeuille() : rendreParents());

function blocJours() {
  const b = el('div');
  b.append(el('p', { class: 'p-aide', text: L(
    "Changer une seule date (sortie, rendez-vous, stage) sans toucher à la semaine type. Les activités que votre enfant ajoute apparaissent aussi ici.",
    '1日だけ 予定を 変えます（行事、通院、実習など）。1週間の 予定は 変わりません。子どもが 入れた 予定も ここに 出ます。',
  ) }));
  const choix = el('div', { class: 'p-ligne' });
  const date = el('input', { type: 'date', value: cle(ajouterJours(aujourdhui(), 1)) });
  choix.append(date, btnP(L('Modifier cette date', 'この日を 変える'), () => { if (date.value) editerDate(date.value); }, 'btn btn-petit btn-principal'));
  b.append(choix);
  const dates = Object.keys(etat.jours).filter((k) => k >= cle(ajouterJours(aujourdhui(), -7))).sort();
  if (!dates.length) b.append(el('p', { class: 'p-aide', text: L('Aucune date modifiée.', '変えた 日は ありません。') }));
  const ul = el('ul', { class: 'p-liste' });
  dates.forEach((k) => {
    const d = deCle(k);
    ul.append(el('li', {},
      el('span', { text: `${d.getMonth() + 1}/${d.getDate()}（${lu(JOURS_SEMAINE[d.getDay()].court)}） · ${etat.jours[k].length} ${L('activités', '件')}` }),
      btnP(L('Modifier', '変える'), () => editerDate(k)),
      btnP(L('Rétablir', 'もとに もどす'), () => { retablirJour(d); rendreParents(); }, 'btn btn-petit btn-danger')));
  });
  b.append(ul);
  return b;
}

/* ----- Calendrier ----- */

function blocCalendrier() {
  const b = el('div');
  b.append(el('p', { class: 'p-aide', text: L(
    "Les événements s'affichent dans 「こんげつ」 et dans 「きょう」 (« あと 3にち »). « Pas d'école » utilise la journée « Repos ». Les jours fériés japonais sont déjà comptés.",
    '行事は「こんげつ」と「きょう」（「あと 3日」）に 出ます。「学校は 休み」に すると、その日は「休み」の 予定に なります。祝日は 自動で 入ります。',
  ) }));
  const form = el('div', { class: 'p-form' });
  const date = el('input', { type: 'date', value: cle(aujourdhui()) });
  const fin = el('input', { type: 'date' });
  const nom = el('input', { type: 'text', placeholder: L('ex. 遠足《えんそく》 ou えんそく', '例：遠足《えんそく》、えんそく') });
  const emoji = el('input', { type: 'text', class: 'p-emoji', value: '⭐', maxlength: '8' });
  const sansEcole = el('input', { type: 'checkbox' });
  form.append(
    champ(L('Date', '日にち'), date),
    champ(L('Jusqu\'au (facultatif)', 'おわりの 日（なくても よい）'), fin),
    champ(L('Nom', '名前'), nom, L('Hiragana, ou kanji suivis de leur lecture : 遠足《えんそく》', 'ひらがな、または 漢字《よみ》の 形で')),
    champ(L('Émoji', '絵文字'), emoji),
    el('label', { class: 'p-case' }, sansEcole, el('span', { text: L("Pas d'école", '学校は 休み') })),
    btnP(L('Ajouter', 'たす'), () => {
      if (!date.value || !nom.value.trim()) return;
      etat.evenements.push({
        id: uid('e'), date: date.value, fin: fin.value && fin.value > date.value ? fin.value : '',
        nom: nom.value.trim(), emoji: emoji.value.trim() || '⭐', sansEcole: sansEcole.checked,
      });
      enregistrer();
      rendreParents();
    }, 'btn btn-principal'),
  );
  b.append(form);
  const ul = el('ul', { class: 'p-liste' });
  [...etat.evenements].sort((x, y) => x.date.localeCompare(y.date)).forEach((ev) => {
    const li = el('li', {},
      el('span', { html: `${echapper(ev.emoji || '⭐')} <b>${echapper(ev.date.slice(5).replace('-', '/'))}${ev.fin ? ` → ${echapper(ev.fin.slice(5).replace('-', '/'))}` : ''}</b> ${html(ev.nom)}${ev.sansEcole ? ` · ${L("pas d'école", '休み')}` : ''}` }));
    if (!ev.fin) li.append(btnP(L('Journée', '予定'), () => editerDate(ev.date)));
    li.append(btnP('✕', () => { etat.evenements = etat.evenements.filter((x) => x.id !== ev.id); enregistrer(); rendreParents(); }, 'btn btn-mini btn-danger'));
    ul.append(li);
  });
  b.append(ul);
  b.append(btnP(L('Ajouter les vacances scolaires habituelles de Tokyo (à vérifier)', '東京都の いつもの 長い 休みを 入れる（要確認）'), ajouterVacancesTokyo));
  b.append(el('small', { class: 'p-aide', text: L(
    "Dates habituelles des écoles publiques de Tokyo (printemps, été, hiver). Chaque école peut les changer : vérifiez avec le calendrier de l'école.",
    '都立学校の ふつうの 休み（春・夏・冬）です。学校によって ちがう ことが あるので、学校の 年間行事予定で たしかめてください。',
  ) }));
  return b;
}

function ajouterVacancesTokyo() {
  const a = aujourdhui().getFullYear();
  const debutAnnee = aujourdhui().getMonth() >= 3 ? a : a - 1;   // année scolaire (avril → mars)
  const p = [
    ['春休《はるやす》み', `${debutAnnee}-04-01`, `${debutAnnee}-04-05`, '🌸'],
    ['夏休《なつやす》み', `${debutAnnee}-07-21`, `${debutAnnee}-08-31`, '🌻'],
    ['冬休《ふゆやす》み', `${debutAnnee}-12-26`, `${debutAnnee + 1}-01-07`, '⛄'],
    ['春休《はるやす》み', `${debutAnnee + 1}-03-26`, `${debutAnnee + 1}-04-05`, '🌸'],
  ];
  p.forEach(([nom, date, fin, emoji]) => {
    if (etat.evenements.some((ev) => ev.date === date && ev.nom === nom)) return;
    etat.evenements.push({ id: uid('e'), date, fin, nom, emoji, sansEcole: true });
  });
  enregistrer();
  rendreParents();
}

/* ----- Étapes ----- */

function blocRoutines() {
  const b = el('div');
  b.append(el('p', { class: 'p-aide', text: L(
    "Une suite d'étapes montrées une à une. Reliez-la à une carte (section « Cartes ») pour qu'un bouton 「てじゅん」 apparaisse sur cette activité.",
    '1つずつ 見せる てじゅんです。カードに つなぐと、その 予定に「てじゅん」の ボタンが 出ます。',
  ) }));
  const ul = el('ul', { class: 'p-liste' });
  etat.routines.forEach((r) => {
    ul.append(el('li', {},
      el('span', { class: 'p-avec-visuel', html: `${visuel(r)} ${html(r.nom)} · ${r.etapes.length}` }),
      btnP(L('Modifier', '変える'), () => editerRoutine(r))));
  });
  b.append(ul, btnP(L('＋ Nouvelles étapes', '＋ あたらしい てじゅん'), () => {
    const r = { id: uid('r'), nom: 'てじゅん', emoji: '📋', etapes: [{ emoji: '1️⃣', texte: '' }] };
    etat.routines.push(r);
    enregistrer();
    editerRoutine(r);
  }, 'btn btn-principal'));
  return b;
}

function editerRoutine(r) {
  const contenu = el('div', { class: 'p-feuille' });
  const dessiner = () => {
    contenu.replaceChildren();
    const nom = el('input', { type: 'text', value: r.nom });
    nom.addEventListener('change', () => { r.nom = nom.value.trim() || 'てじゅん'; enregistrer(); });
    const emoji = el('input', { type: 'text', class: 'p-emoji', value: r.emoji || '', maxlength: '8' });
    emoji.addEventListener('change', () => { r.emoji = emoji.value.trim(); enregistrer(); });
    contenu.append(champ(L('Nom', '名前'), nom), champ(L('Émoji', '絵文字'), emoji));
    r.etapes.forEach((e, i) => {
      const ligne = el('div', { class: 'ed-etape' });
      const em = el('input', { type: 'text', class: 'p-emoji', value: e.emoji || '', maxlength: '8', 'aria-label': L('Émoji', '絵文字') });
      em.addEventListener('change', () => { e.emoji = em.value.trim(); enregistrer(); });
      const tx = el('input', { type: 'text', value: e.texte || '', placeholder: L('Ex. 手《て》を 洗《あら》う', '例：手《て》を 洗《あら》う') });
      tx.addEventListener('change', () => { e.texte = tx.value.trim(); enregistrer(); });
      const photo = el('span', { class: 'ed-photo', html: e.photo ? visuel(e) : '' });
      ligne.append(el('b', { text: `${i + 1}` }), em, tx, photo, el('div', { class: 'ed-outils' },
        btnP('📷', async () => {
          const id = await nouvellePhoto('galerie', 'carte');
          if (!id) return;
          if (e.photo) supprimerPhoto(e.photo);
          e.photo = id;
          enregistrer();
          dessiner();
        }, 'btn btn-mini'),
        e.photo ? btnP(L('sans photo', '写真なし'), () => { supprimerPhoto(e.photo); delete e.photo; enregistrer(); dessiner(); }, 'btn btn-mini') : null,
        btnP('↑', () => { if (i > 0) { [r.etapes[i - 1], r.etapes[i]] = [r.etapes[i], r.etapes[i - 1]]; enregistrer(); dessiner(); } }, 'btn btn-mini'),
        btnP('↓', () => { if (i < r.etapes.length - 1) { [r.etapes[i + 1], r.etapes[i]] = [r.etapes[i], r.etapes[i + 1]]; enregistrer(); dessiner(); } }, 'btn btn-mini'),
        btnP('✕', () => { r.etapes.splice(i, 1); enregistrer(); dessiner(); }, 'btn btn-mini btn-danger')));
      contenu.append(ligne);
    });
    contenu.append(el('div', { class: 'p-ligne' },
      btnP(L('＋ Étape', '＋ ステップ'), () => { r.etapes.push({ emoji: '', texte: '' }); enregistrer(); dessiner(); }, 'btn btn-principal'),
      btnP(L('Écouter', 'きく'), () => parler(r.etapes.map((e, i) => `${i + 1}。 ${lu(e.texte)}`).join(' '))),
      btnP(L('Supprimer ces étapes', 'この てじゅんを けす'), () => {
        if (!window.confirm(L('Supprimer ces étapes ?', 'この てじゅんを けしますか？'))) return;
        etat.routines = etat.routines.filter((x) => x.id !== r.id);
        enregistrer();
        fermerFeuille();
      }, 'btn btn-petit btn-danger')));
    chargerPhotos(contenu);
  };
  dessiner();
  ouvrirFeuille({ titre: L('Étapes', 'てじゅん'), contenu, classe: 'feuille-haute feuille-parents', fermeture: () => rendreParents() });
}

/* ----- Cartes ----- */

function blocCartes() {
  const b = el('div');
  b.append(el('p', { class: 'p-aide', text: L(
    "Créez vos cartes (avec une vraie photo : le bus de l'école, la classe, le centre de loisirs…), ou mettez une photo sur une carte existante.",
    'カードを 作れます（学校の バス、教室、デイサービスなど 本当の 写真で）。いまの カードに 写真を つける ことも できます。',
  ) }));
  const perso = etat.cartes;
  const ul = el('ul', { class: 'p-liste' });
  perso.forEach((x) => {
    const c = carte(x.id);
    ul.append(el('li', {},
      el('span', { class: 'p-avec-visuel', html: `${visuel(c)} ${html(c.nom)}${c.catalogue ? ` · ${L('modifiée', '変更')}` : ''}` }),
      btnP(L('Modifier', '変える'), () => editerCarte(c))));
  });
  b.append(ul, el('div', { class: 'p-ligne' },
    btnP(L('＋ Nouvelle carte', '＋ あたらしい カード'), () => editerCarte({ id: uid('c'), nom: '', emoji: '⭐', lieu: 'ie', recit: '', nouvelle: true }), 'btn btn-principal'),
    btnP(L('Modifier une carte existante', 'いまの カードを 変える'), () => choisirCarte({
      titre: L('Quelle carte ?', 'どの カード？'), confirmer: false, surChoix: (id) => editerCarte(carte(id)),
    }))));
  return b;
}

function editerCarte(c0) {
  const c = { ...c0 };
  const base = CARTES.find((x) => x.id === c.id);
  const contenu = el('div', { class: 'p-feuille' });
  const apercu = el('div', { class: 'p-apercu' });
  const majApercu = () => { apercu.innerHTML = `${visuel(c, 'grand')}<span>${html(c.nom || '…')}</span>`; chargerPhotos(apercu); };
  const nom = el('input', { type: 'text', value: c.nom || '' });
  nom.addEventListener('input', () => { c.nom = nom.value; majApercu(); });
  const emoji = el('input', { type: 'text', class: 'p-emoji', value: c.emoji || '', maxlength: '8' });
  emoji.addEventListener('input', () => { c.emoji = emoji.value.trim(); majApercu(); });
  const lieu = el('select', {});
  Object.entries(LIEUX).forEach(([k, l]) => lieu.append(el('option', { value: k, text: `${lu(l.nom)} · ${l.fr}`, selected: c.lieu === k })));
  lieu.addEventListener('change', () => { c.lieu = lieu.value; });
  const recit = el('input', { type: 'text', value: c.recit || '', placeholder: L('Ex. バスに 乗《の》りました。', '例：バスに 乗《の》りました。') });
  recit.addEventListener('input', () => { c.recit = recit.value; });
  const routineSel = el('select', {});
  routineSel.append(el('option', { value: '', text: L('— aucune —', '— なし —') }));
  etat.routines.forEach((r) => routineSel.append(el('option', { value: r.id, text: lu(r.nom), selected: c.routine === r.id })));
  routineSel.addEventListener('change', () => { c.routine = routineSel.value || undefined; });
  const sansPhoto = el('input', { type: 'checkbox', checked: Boolean(c.sansPhoto) });
  sansPhoto.addEventListener('change', () => { c.sansPhoto = sansPhoto.checked; });
  const important = el('input', { type: 'checkbox', checked: Boolean(c.important) });
  important.addEventListener('change', () => { c.important = important.checked; });
  const photoBtns = el('div', { class: 'p-ligne' });
  const majPhotoBtns = () => {
    photoBtns.replaceChildren(
      btnP(L('Prendre une photo', '写真を とる'), () => mettrePhoto('camera')),
      btnP(L('Choisir une photo', '写真を えらぶ'), () => mettrePhoto('galerie')),
      c.photo ? btnP(L('Enlever la photo', '写真を はずす'), () => { c.photo = ''; majApercu(); majPhotoBtns(); }, 'btn btn-petit btn-danger') : null,
    );
  };
  const mettrePhoto = async (source) => {
    const id = await nouvellePhoto(source, 'carte');
    if (!id) return;
    c.photo = id;
    majApercu();
    majPhotoBtns();
  };
  majApercu();
  majPhotoBtns();
  contenu.append(
    apercu,
    champ(L('Nom', '名前'), nom, L('En hiragana, ou kanji suivis de leur lecture : 作業《さぎょう》学習《がくしゅう》. Un espace entre les mots aide à lire.',
      'ひらがな、または 漢字《よみ》の 形で：作業《さぎょう》学習《がくしゅう》。ことばの あいだを あけると 読みやすく なります。')),
    champ(L('Émoji (si pas de photo)', '絵文字（写真が ない とき）'), emoji),
    el('div', { class: 'p-champ' }, el('span', { class: 'p-label', text: L('Photo', '写真') }), photoBtns),
    champ(L('Lieu (couleur)', '場所（色）'), lieu),
    champ(L('Phrase du soir (ふりかえり)', 'ふりかえりの 文'), recit, L('Au passé : ce que l\'enfant a fait.', '「〜しました」の 形で')),
    champ(L('Étapes liées', 'つなぐ てじゅん'), routineSel),
    el('label', { class: 'p-case' }, sansPhoto, el('span', { text: L('Ne pas proposer de photo (toilettes, bain…)', '写真を すすめない（トイレ、おふろなど）') })),
    el('label', { class: 'p-case' }, important, el('span', { text: L('Important, à ne pas oublier : mis en avant dans 「こんしゅう」', 'わすれては いけない 予定：「こんしゅう」で 目立たせる') })),
  );
  const actions = el('div', { class: 'p-ligne' });
  actions.append(btnP(L('Enregistrer', '保存'), () => {
    if (!c.nom.trim()) { nom.focus(); return; }
    const garder = { ...c };
    delete garder.catalogue;
    delete garder.nouvelle;
    // Carte du catalogue : on ne garde que ce qui change.
    if (base) Object.keys(garder).forEach((k) => { if (k !== 'id' && garder[k] === base[k]) delete garder[k]; });
    if (c0.photo && c0.photo !== c.photo) supprimerPhoto(c0.photo);
    enregistrerCarte(garder);
    fermerFeuille();
  }, 'btn btn-principal'));
  if (!c0.nouvelle && (base ? etat.cartes.some((x) => x.id === c.id) : true)) {
    actions.append(btnP(base ? L('Revenir à la carte d\'origine', 'もとの カードに もどす') : L('Supprimer la carte', 'カードを けす'), () => {
      if (!base && !window.confirm(L('Supprimer cette carte ? Elle disparaîtra des journées où elle est utilisée.', 'この カードを けしますか？'))) return;
      if (c0.photo) supprimerPhoto(c0.photo);
      supprimerCarte(c.id);
      fermerFeuille();
    }, 'btn btn-petit btn-danger'));
  }
  contenu.append(actions);
  ouvrirFeuille({ titre: L('Carte', 'カード'), contenu, classe: 'feuille-haute feuille-parents', fermeture: () => rendreParents() });
}

/* ----- Réglages ----- */

function choixRadio(nom, valeurs, actuelle, surChange) {
  const g = el('div', { class: 'p-radios', role: 'radiogroup' });
  valeurs.forEach(([v, t]) => {
    const r = el('input', { type: 'radio', name: nom, value: String(v), checked: String(actuelle) === String(v) });
    r.addEventListener('change', () => surChange(v));
    g.append(el('label', { class: 'p-case' }, r, el('span', { text: t })));
  });
  return g;
}
function caseR(cleR, texte) {
  const cb = el('input', { type: 'checkbox', checked: Boolean(reglages[cleR]) });
  cb.addEventListener('change', () => { ecrireReglages({ [cleR]: cb.checked }); appliquer(); });
  return el('label', { class: 'p-case' }, cb, el('span', { text: texte }));
}
function selectR(cleR, valeurs) {
  const s = el('select', {});
  valeurs.forEach(([v, t]) => s.append(el('option', { value: String(v), text: t, selected: String(reglages[cleR]) === String(v) })));
  s.addEventListener('change', () => {
    const v = valeurs.find(([x]) => String(x) === s.value)[0];
    ecrireReglages({ [cleR]: v });
    appliquer();
  });
  return s;
}
let appliquer = () => {};
export const definirAppliquer = (fn) => { appliquer = fn; };

function blocReglages() {
  const b = el('div', { class: 'p-reglages' });
  b.append(
    champ(L('Écriture', '文字'), choixRadio('ecriture', [['hiragana', L('Hiragana seuls', 'ひらがな')], ['kanji', L('Kanji avec furigana', '漢字（ふりがな つき）')]], reglages.ecriture,
      (v) => { ecrireReglages({ ecriture: v }); appliquer(); rendreParents(); })),
    el('p', { class: 'p-sous-titre', text: L("Montrer l'heure (on peut garder les trois)", '時間の 見せ方（3つ ぜんぶ でも よい）') }),
    caseR('horloge', L('Horloge à aiguilles, avec la part de temps qui reste (« ながい はりが 10に きたら おわり »)', 'とけい（のこりの 時間に 色）「ながい はりが 10に きたら おわり」')),
    caseR('chiffres', L("L'heure en chiffres et sa lecture (9:05, くじ ごふん)", '数字の 時こくと 読みかた')),
    caseR('barre', L('Une barre qui diminue (sans lire l\'heure)', 'へっていく バー（時計が 読めなくても わかる）')),
    caseR('format24', L('Heure sur 24 h (15:30 au lieu de ごご 3:30)', '24時間で 表示（15:30）')),
    el('p', { class: 'p-sous-titre', text: L('Annonces (quand l\'appli est ouverte)', 'お知らせ（アプリを 開いて いる とき）') }),
    caseR('annonces', L('Carillon et voix au début de chaque activité (« 〜の じかんだよ »)', '予定の はじめに チャイムと 声')),
    champ(L('Prévenir avant la fin', 'おわりの 前に 知らせる'), selectR('preavis', [[0, L('Jamais', 'しない')], [5, L('5 minutes avant', '5分前')], [10, L('10 minutes avant', '10分前')]])),
    caseR('ecranAllume', L("Garder l'écran allumé sur 「きょう」 (tablette posée)", '「きょう」で 画面を つけた ままに する')),
    el('p', { class: 'p-sous-titre', text: L('Ce que votre enfant peut changer', '子どもが 変えられる こと') }),
    choixRadio('eleve', [['rien', L('Rien : il suit et coche', '何も 変えない（見て、チェックする だけ）')],
      ['ajouter', L('Ajouter des activités à sa journée', '予定を 入れられる')],
      ['deplacer', L('Ajouter et déplacer les activités sans heure', '入れる ＋ 時間の ない 予定を 動かせる')]], reglages.eleve, (v) => ecrireReglages({ eleve: v })),
    el('p', { class: 'p-sous-titre', text: L('Photos de la journée (ふりかえり)', 'ふりかえりの 写真') }),
    caseR('photos', L('Proposer une photo quand une activité est finie', 'おわった ときに 写真を すすめる')),
    champ(L('Garder les photos de la journée', '写真を のこす 期間'), selectR('garderPhotos', [[30, L('30 jours', '30日')], [60, L('60 jours', '60日')], [180, L('6 mois', '6か月')], [0, L('Toujours', 'ずっと')]])),
    el('p', { class: 'p-sous-titre', text: L('Onglets visibles', '見せる タブ') }),
    blocOnglets(),
    caseR('feries', L('Jours fériés japonais : journée « Repos »', '祝日は「休み」の 予定に する')),
    el('p', { class: 'p-sous-titre', text: L('Voix', '声') }),
    caseR('sons', L('Sons', '音')),
    caseR('toucherLire', L('Toucher un texte le fait lire ; bouton 👆', '文字を さわると 読む（👆 ボタン）')),
    champ(L('Voix', '声'), selectR('voixGenre', [['femme', L('Femme', '女性')], ['homme', L('Homme', '男性')]])),
    champ(L('Voix précise', '声の えらび'), selectVoix()),
    champ(L('Vitesse', 'はやさ'), selectR('vitesse', [[0.7, L('Lente', 'ゆっくり')], [0.9, L('Normale', 'ふつう')], [1.1, L('Rapide', 'はやい')]])),
    btnP(L('Essayer la voix', '声を きく'), () => parler('いまは さぎょう がくしゅう。 あと にじゅうごふん。')),
    el('p', { class: 'p-sous-titre', text: L('Toucher', 'さわりかた') }),
    champ(L('Garder le doigt posé', 'おしつづける 時間'), selectR('dureeAppui', [[0, L('Non', 'なし')], [500, '0,5 s'], [1000, '1 s'], [1500, '1,5 s']])),
    champ(L('Ignorer les touchers répétés', 'つづけて さわっても 1回に する'), selectR('antiRebond', [[0, L('Non', 'なし')], [300, '0,3 s'], [500, '0,5 s'], [1000, '1 s']])),
    caseR('animationsReduites', L('Réduire les animations', 'うごきを へらす')),
  );
  return b;
}

function blocOnglets() {
  const noms = { jour: 'きょう', semaine: 'こんしゅう', mois: 'こんげつ', etapes: 'てじゅん', recit: 'ふりかえり' };
  const g = el('div', { class: 'p-radios' });
  ONGLETS.forEach((o) => {
    const cb = el('input', { type: 'checkbox', checked: reglages.onglets.includes(o), disabled: o === 'jour' });
    cb.addEventListener('change', () => {
      const liste = ONGLETS.filter((x) => (x === o ? cb.checked : reglages.onglets.includes(x)));
      ecrireReglages({ onglets: liste });
      appliquer();
    });
    g.append(el('label', { class: 'p-case' }, cb, el('span', { text: noms[o] })));
  });
  return g;
}

function selectVoix() {
  const s = el('select', {});
  s.append(el('option', { value: '', text: L('Automatique', '自動') }));
  voixJa().forEach((v) => s.append(el('option', { value: v.name, text: v.name, selected: reglages.voixNom === v.name })));
  s.addEventListener('change', () => ecrireReglages({ voixNom: s.value }));
  return s;
}

/* ----- Sauvegarde ----- */

function idsPhotosEtat() {
  const ids = new Set();
  etat.cartes.forEach((x) => { if (x.photo) ids.add(x.photo); });
  etat.routines.forEach((r) => {
    if (r.photo) ids.add(r.photo);
    r.etapes.forEach((e) => { if (e.photo) ids.add(e.photo); });
  });
  return [...ids];
}

function blocSauvegarde() {
  const b = el('div');
  b.append(el('p', { class: 'p-aide', text: L(
    "Les données restent sur cet appareil. Pour avoir le même emploi du temps sur le téléphone et sur l'iPad : « Enregistrer » ici, envoyez le fichier sur l'autre appareil (LINE, e-mail, AirDrop), puis « Ouvrir une sauvegarde » là-bas. Les photos des cartes et des étapes sont dans le fichier ; pas les photos de la journée.",
    'データは この 機器の 中だけに あります。スマホと iPad で 同じ 予定に するには：ここで「保存」→ ファイルを もう 1つの 機器に おくる（LINE、メール など）→ そこで「バックアップを 開く」。カードと てじゅんの 写真も 入ります（ふりかえりの 写真は 入りません）。',
  ) }));
  const entree = el('input', { type: 'file', accept: '.json,application/json', class: 'cache-visuel' });
  entree.addEventListener('change', async () => {
    const f = entree.files && entree.files[0];
    if (!f) return;
    try {
      const donnees = JSON.parse(await f.text());
      if (donnees.app !== 'yotei' || !donnees.etat) throw new Error('format');
      if (!window.confirm(L("Remplacer l'emploi du temps de cet appareil par celui du fichier ?", 'この 機器の 予定を ファイルの 予定に 入れかえますか？'))) return;
      await photosDepuisTexte(donnees.photos);
      remplacerEtat(donnees.etat);
      if (donnees.reglages) remplacerReglages({ ...donnees.reglages, langue: reglages.langue });
      window.alert(L('Sauvegarde ouverte.', 'バックアップを 開きました。'));
      location.reload();
    } catch {
      window.alert(L("Ce fichier n'est pas une sauvegarde de よてい.", 'これは よていの バックアップでは ありません。'));
    }
  });
  b.append(entree, el('div', { class: 'p-ligne' },
    btnP(L('Enregistrer une sauvegarde', '保存する'), async () => {
      const contenu = JSON.stringify({
        app: 'yotei', version: 1, date: new Date().toISOString(), etat, reglages, photos: await photosEnTexte(idsPhotosEtat()),
      });
      await plateforme.fichiers.enregistrer(`yotei-sauvegarde-${cle(aujourdhui())}.json`, contenu, 'application/json');
    }, 'btn btn-principal'),
    btnP(L('Ouvrir une sauvegarde', 'バックアップを 開く'), () => entree.click())));
  b.append(el('p', { class: 'p-sous-titre', text: L('Effacer', 'けす') }), el('div', { class: 'p-ligne' },
    btnP(L('Effacer les coches et photos de la journée', 'チェックと ふりかえりの 写真を けす'), async () => {
      if (!window.confirm(L('Effacer tout le journal (coches, photos, humeurs) ?', 'ぜんぶ けしますか？'))) return;
      const ids = Object.values(journal).flatMap((notes) => Object.values(notes).map((x) => x.photo).filter(Boolean));
      for (const id of ids) await supprimerPhoto(id);
      Object.keys(journal).forEach((k) => delete journal[k]);
      enregistrerJournal();
      rendreParents();
    }, 'btn btn-petit btn-danger'),
    btnP(L("Remettre l'emploi du temps d'exemple", '「れい」の 予定に もどす'), () => {
      if (!window.confirm(L("Remplacer tout l'emploi du temps (semaine, calendrier, étapes, cartes) par l'exemple ?", 'ぜんぶ「れい」に もどしますか？'))) return;
      reinitialiser();
      rendreParents();
    }, 'btn btn-petit btn-danger')));
  return b;
}

