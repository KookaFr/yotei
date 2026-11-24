/* ======================================================================
   「がっこうの ふりかえり」 : au retour de l'école, des questions courtes, une par écran,
   avec des choix en images (le téléphone ne sert pas à l'école : on raconte en rentrant).
   - comment c'était, ce qu'il a fait le matin, à midi, l'après-midi (les cours prévus, et 「ほかの こと」),
     ce qu'il a préféré, s'il y a eu un souci (quand, l'a-t-il dit à l'enseignant), ce qu'il rapporte ;
   - les cours choisis sont cochés (ils apparaissent le soir dans la ふりかえり) ;
   - un compte rendu pour les parents (japonais ou français), envoyé d'un seul bouton :
     e-mail déjà rempli, ou feuille de partage (LINE…). Pas de serveur : rien ne part sans ce bouton.
   ====================================================================== */

import { choisirCarte } from '../choix-carte.js';
import { carte, noter } from '../donnees.js';
import { aujourdhui, cle, JOURS_SEMAINE, minutesMaintenant } from '../heure.js';
import { deroulement, mochimonoDu, PERIODES } from '../journee.js';
import { el } from '../outils.js';
import { chargerPhotos } from '../photos.js';
import { plateforme } from '../plateforme.js';
import { reglages } from '../reglages.js';
import { activable } from '../tactile.js';
import { html, lu, segments } from '../texte.js';
import {
  bouton, fermerPlein, ICONE_COCHE, ICONE_DROITE, ICONE_ENVOYER, ICONE_FERMER, ICONE_GAUCHE, ICONE_HP, ICONE_PLUS, message,
  ouvrirPlein, visuel,
} from '../ui.js';
import {
  boutonMicro, ecouterVoix, fichierVoix, microPossible,
} from '../micro.js';
import { lireElement, parler, sons } from '../voix.js';
import { HUMEURS } from './recit.js';

/* ----- Les réponses, gardées sur l'appareil ----- */

const CLE = 'yotei.ecole';
let reponses = {};
try { reponses = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch { reponses = {}; }
const sauver = () => { try { localStorage.setItem(CLE, JSON.stringify(reponses)); } catch { /* rien */ } };
export const ecoleDu = (d) => reponses[cle(d)] || null;
export const historiqueEcole = () => Object.entries(reponses).sort(([a], [b]) => b.localeCompare(a));
export function effacerEcole() {
  reponses = {};
  sauver();
}

/* ----- Quand proposer les questions ----- */

// Les activités d'école de la journée (sans les trajets).
export const activitesEcole = (d, dr = deroulement(d)) => dr.items.filter((it) => it.carte.lieu === 'gakko' && !it.carte.trajet);

// La fin de l'école, trajet du retour compris (on pose les questions une fois rentré).
export function finEcole(d, dr = deroulement(d)) {
  const fins = dr.items.filter((it) => it.carte.lieu === 'gakko').map((it) => (it.finEff ?? (it.debut !== null ? it.debut + 30 : null))).filter((x) => x !== null);
  return fins.length ? Math.max(...fins) : null;
}

// Aujourd'hui, après la fin de l'école, si ce n'est pas encore fait.
export function proposerEcole(d, dr) {
  if (!reglages.ecoleQuestions || !dr.aujourdhui) return false;
  const r = ecoleDu(d);
  if (r && (r.fini || r.plusTard === cle(d))) return false;
  const fin = finEcole(d, dr);
  return fin !== null && minutesMaintenant() >= fin;
}
export function remettreAPlusTard(d) {
  reponses[cle(d)] = { ...(reponses[cle(d)] || {}), plusTard: cle(d) };
  sauver();
}

/* ----- Les questions ----- */

const SOUCI = [{ id: 'non', emoji: '🙆', texte: 'なかった' }, { id: 'oui', emoji: '😥', texte: 'あった' }];
const PROF = [{ id: 'oui', emoji: '🙋', texte: '言《い》った' }, { id: 'non', emoji: '🤐', texte: '言《い》って いない' }];
const QUAND_AUTRES = [
  { id: 'pause', emoji: '☀️', texte: '休《やす》み時間《じかん》' },
  { id: 'trajet', emoji: '🚌', texte: '行《い》き 帰《かえ》り' },
  { id: 'nsp', emoji: '🤔', texte: 'わからない' },
];
const RAPPORTE = [
  { id: 'purinto', emoji: '📄', texte: 'プリント' },
  { id: 'renrakucho', emoji: '📒', texte: '連絡帳《れんらくちょう》' },
  { id: 'sakuhin', emoji: '🎨', texte: '作品《さくひん》' },
  { id: 'bento', emoji: '🍱', texte: 'お弁当箱《べんとうばこ》' },
];

// Une option : { id, emoji | carte, texte }.
const optionActivite = (it) => ({ id: it.act.id, carte: it.carte, texte: it.carte.nom });

const voixActive = () => reglages.ecoleVoix !== false && microPossible();

export function lancerEcole(d, apres = () => {}, { depart = null } = {}) {
  const dr = deroulement(d);
  const ecole = activitesEcole(d, dr);
  const detail = reglages.ecoleDetail !== 'court';
  const ancien = ecoleDu(d) || {};
  const rep = {
    humeur: ancien.humeur || null,
    faits: [...(ancien.faits || [])],
    autres: [...(ancien.autres || [])],     // cartes ajoutées avec 「ほかの こと」 : { carte, periode }
    prefere: ancien.prefere || null,
    souci: ancien.souci || null,
    souciQuand: ancien.souciQuand || null,
    souciProf: ancien.souciProf || null,
    rapporte: [...(ancien.rapporte || [])],
    voix: { ...(ancien.voix || {}) },     // 🎤 enregistrements : { prefere, souci, message }
  };
  const faitsOptions = () => [
    ...ecole.filter((it) => rep.faits.includes(it.act.id)).map(optionActivite),
    ...rep.autres.map((a) => ({ id: `c:${a.carte}`, carte: carte(a.carte), texte: carte(a.carte).nom })),
  ];

  const moments = PERIODES.map((p) => ({ p, items: ecole.filter((it) => it.periode === p.id) })).filter((x) => x.items.length);
  const etapes = [
    { id: 'intro' },
    { id: 'humeur', q: '今日《きょう》の 学校《がっこう》は どうだった？', type: 'un', options: () => HUMEURS, cle: 'humeur' },
    ...(detail
      ? moments.map(({ p, items }) => ({
        id: `p-${p.id}`, q: `${p.nom}は 何《なに》を した？`, aide: 'した ことを ぜんぶ おしてね。', type: 'faits',
        options: () => items.map(optionActivite), emoji: p.emoji, periode: p.id,
      }))
      : [{
        id: 'faits', q: '学校《がっこう》で 何《なに》を した？', aide: 'した ことを ぜんぶ おしてね。', type: 'faits', periode: 'tout',
        options: () => ecole.map(optionActivite),
      }]),
    {
      id: 'prefere', si: () => detail && faitsOptions().length > 0, q: 'いちばん 楽《たの》しかった ことは？', type: 'un', cle: 'prefere',
      options: () => [...faitsOptions(), { id: 'aucun', emoji: '🤔', texte: 'とくに ない' }],
      micro: { cle: 'prefere', texte: 'どうして？ こえで おしえて。', si: () => rep.prefere && rep.prefere !== 'aucun' },
    },
    { id: 'souci', q: 'こまった ことや いやな ことは あった？', type: 'un', cle: 'souci', options: () => SOUCI },
    {
      id: 'souciQuand', si: () => detail && rep.souci === 'oui', q: 'それは いつ？', type: 'un', cle: 'souciQuand',
      options: () => [...faitsOptions(), ...QUAND_AUTRES],
      micro: { cle: 'souci', texte: '何《なに》が あったの？ こえで おしえて。' },
    },
    { id: 'souciProf', si: () => detail && rep.souci === 'oui', q: '先生《せんせい》に 言《い》った？', type: 'un', cle: 'souciProf', options: () => PROF },
    {
      id: 'rapporte', si: () => detail, q: '持《も》って 帰《かえ》った ものは ある？', aide: 'ぜんぶ おしてね。 なければ 「つぎ」。', type: 'plusieurs', cle: 'rapporte',
      options: () => {
        const duJour = mochimonoDu(d, dr.items).map((a) => ({ id: `m:${lu(a.texte)}`, emoji: a.emoji || '🎒', texte: a.texte }));
        return [...duJour, ...RAPPORTE.filter((x) => !duJour.some((y) => lu(y.texte) === lu(x.texte)))];
      },
    },
    {
      id: 'message', si: () => detail && voixActive(), q: 'お家《うち》の 人《ひと》に ほかに 言《い》いたい ことは ある？', type: 'micro',
      aide: 'あれば 「こえで いう」。 なければ 「つぎ」。', micro: { cle: 'message', texte: '' },
    },
    { id: 'relire' },
    { id: 'fin' },
  ];
  const actives = () => etapes.filter((e) => !e.si || e.si());

  let i = 0;
  let retourRelire = false;   // on corrige une réponse depuis la relecture : 「つぎ」 y ramène
  const ecran = el('section', { class: 'lecteur ecole' });
  const tete = el('header', { class: 'lecteur-tete' });
  const quitter = el('button', { type: 'button', class: 'btn-rond', 'aria-label': 'おわる', html: ICONE_FERMER });
  activable(quitter, () => { fermerPlein(); apres(); }, { garde: false });
  tete.append(quitter, el('h2', { class: 'lecteur-titre', 'data-lire': 'がっこうの ふりかえり', html: `<i class="ecole-emoji" aria-hidden="true">🏫</i>${html('学校《がっこう》の ふりかえり')}` }));
  const frise = el('ol', { class: 'frise' });
  const corps = el('div', { class: 'lecteur-corps' });
  const pied = el('footer', { class: 'lecteur-pied' });
  ecran.append(tete, frise, corps, pied);

  const aller = (n) => { i = Math.max(0, Math.min(actives().length - 1, n)); afficher(); };

  function afficher() {
    const liste = actives();
    const e = liste[i];
    frise.replaceChildren(...liste.map((_, j) => el('li', { class: j < i ? 'fait' : (j === i ? 'actuel' : '') })));
    if (e.id === 'intro') return intro();
    if (e.id === 'relire') return relire();
    if (e.id === 'fin') return fin();
    const zone = el('div', { class: 'ecole-question' });
    zone.append(el('p', { class: 'ecole-q', 'data-lire': lu(e.q), html: `${e.emoji ? `<i aria-hidden="true">${e.emoji}</i>` : ''}<span>${html(e.q)}</span>` }));
    if (e.aide) zone.append(el('p', { class: 'ecole-aide', 'data-lire': lu(e.aide), html: html(e.aide) }));
    const grille = el('div', { class: 'ecole-choix' });
    const options = e.options ? e.options() : [];
    const choisi = (o) => {
      if (e.type === 'faits') return rep.faits.includes(o.id);
      if (e.type === 'plusieurs') return rep[e.cle].includes(o.id);
      return rep[e.cle] === o.id;
    };
    options.forEach((o) => {
      const b = el('button', {
        type: 'button', class: `ecole-option${o.carte ? ` lieu-${o.carte.lieu}` : ''}${choisi(o) ? ' choisie' : ''}`,
        'aria-pressed': String(choisi(o)), 'aria-label': lu(o.texte),
        html: `${o.carte ? visuel(o.carte, 'grand') : `<span class="visuel grand" aria-hidden="true">${o.emoji}</span>`}<span class="ecole-option-texte">${html(o.texte)}</span>`
          + '<span class="ecole-coche" aria-hidden="true">✓</span>',
      });
      activable(b, () => {
        if (e.type === 'faits') {
          rep.faits = choisi(o) ? rep.faits.filter((x) => x !== o.id) : [...rep.faits, o.id];
        } else if (e.type === 'plusieurs') {
          rep[e.cle] = choisi(o) ? rep[e.cle].filter((x) => x !== o.id) : [...rep[e.cle], o.id];
        } else {
          rep[e.cle] = o.id;
        }
        sons.page();
        parler(lu(o.texte));
        afficher();
      });
      grille.append(b);
    });
    // 「ほかの こと」 : une autre carte de l'école (sortie, cours inhabituel…).
    if (e.type === 'faits') {
      rep.autres.filter((a) => a.periode === e.periode).forEach((a) => {
        const c = carte(a.carte);
        const b = el('button', {
          type: 'button', class: `ecole-option lieu-${c.lieu} choisie`, 'aria-pressed': 'true', 'aria-label': lu(c.nom),
          html: `${visuel(c, 'grand')}<span class="ecole-option-texte">${html(c.nom)}</span><span class="ecole-coche" aria-hidden="true">✓</span>`,
        });
        activable(b, () => { rep.autres = rep.autres.filter((x) => x !== a); afficher(); });
        grille.append(b);
      });
      const autre = el('button', {
        type: 'button', class: 'ecole-option ecole-autre', 'aria-label': 'ほかの こと',
        html: `<span class="visuel grand" aria-hidden="true">${ICONE_PLUS}</span><span class="ecole-option-texte">${html('ほかの こと')}</span>`,
      });
      activable(autre, () => choisirCarte({
        titre: '何《なに》を した？', lieu: 'gakko',
        surChoix: (id) => {
          if (!rep.autres.some((a) => a.carte === id && a.periode === e.periode)) rep.autres.push({ carte: id, periode: e.periode });
          afficher();
        },
      }));
      grille.append(autre);
    }
    if (options.length || e.type === 'faits') zone.append(grille);
    // 🎤 : la réponse avec sa voix (facultatif).
    if (e.micro && voixActive() && (!e.micro.si || e.micro.si())) {
      if (e.micro.texte) zone.append(el('p', { class: 'ecole-aide', 'data-lire': lu(e.micro.texte), html: html(e.micro.texte) }));
      zone.append(boutonMicro(rep.voix[e.micro.cle] || null, (id) => { rep.voix[e.micro.cle] = id; }));
    }
    corps.replaceChildren(zone);
    chargerPhotos(corps);
    const pret = e.type !== 'un' || rep[e.cle];
    const suivant = bouton('つぎ', () => {
      if (retourRelire) { retourRelire = false; aller(actives().findIndex((x) => x.id === 'relire')); } else aller(i + 1);
    }, { classe: 'btn btn-principal btn-large', icone: ICONE_DROITE });
    suivant.disabled = !pret;
    pied.replaceChildren(
      bouton('まえ', () => aller(i - 1), { classe: 'btn btn-large', icone: ICONE_GAUCHE }),
      bouton('きく', () => lireElement(zone.querySelector('.ecole-q')), { classe: 'btn-rond btn-ecouter', icone: ICONE_HP, options: { garde: false } }),
      suivant,
    );
    return null;
  }

  function intro() {
    corps.replaceChildren(el('div', {
      class: 'etape', 'data-lire': 'おかえり！ がっこうの こと、 おしえてね。',
      html: `<span class="visuel enorme" aria-hidden="true">🏫</span><p class="etape-texte">${html('おかえり！ 学校《がっこう》の こと、 おしえてね。')}</p>`,
    }));
    pied.replaceChildren(bouton('はじめる', () => aller(1), { classe: 'btn btn-principal btn-large', icone: ICONE_DROITE }));
    parler('おかえり！ がっこうの こと、 おしえてね。');
    return null;
  }

  // Relire avant d'envoyer : 「これで いい？」 ; 「なおす」 → quelle ligne → la question, puis retour ici.
  function relire() {
    const lignes = lignesResume(rep, ecole, 'enfant');
    const zone = el('div', { class: 'ecole-fin' });
    zone.append(el('p', { class: 'ecole-q', 'data-lire': 'これで いい？', html: `<i aria-hidden="true">🔎</i><span>${html('これで いい？')}</span>` }));
    const ul = el('ul', { class: 'ecole-resume' });
    lignes.forEach(([emoji, texte]) => ul.append(el('li', { 'data-lire': lu(texte), html: `<i aria-hidden="true">${emoji}</i><span>${html(texte)}</span>` })));
    zone.append(ul, ...boutonsVoix(rep));
    corps.replaceChildren(zone);
    pied.replaceChildren(
      bouton('なおす', () => choisirCorrection(lignes), { classe: 'btn btn-large', icone: ICONE_GAUCHE }),
      bouton('うん、 これで いい', () => aller(actives().findIndex((x) => x.id === 'fin')), { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE }),
    );
    parler(`${lignes.map(([, t]) => lu(t)).join('。 ')}。 これで いい？`);
    return null;
  }

  function choisirCorrection(lignes) {
    const zone = el('div', { class: 'ecole-fin' });
    zone.append(el('p', { class: 'ecole-q', 'data-lire': 'どこを なおす？', html: `<i aria-hidden="true">✏️</i><span>${html('どこを なおす？')}</span>` }));
    const choix = el('div', { class: 'ecole-lignes' });
    lignes.forEach(([emoji, texte, etape]) => {
      const cible = actives().findIndex((x) => x.id === etape);
      if (cible < 0) return;
      const b = el('button', { type: 'button', class: 'ecole-ligne', 'aria-label': lu(texte), html: `<i aria-hidden="true">${emoji}</i><span>${html(texte)}</span>` });
      activable(b, () => { retourRelire = true; aller(cible); });
      choix.append(b);
    });
    zone.append(choix);
    corps.replaceChildren(zone);
    pied.replaceChildren(bouton('もどる', () => relire(), { classe: 'btn btn-large', icone: ICONE_GAUCHE }));
    parler('どこを なおす？');
  }

  function fin() {
    // On garde les réponses ; les cours choisis sont cochés pour la ふりかえり du soir.
    reponses[cle(d)] = { ...rep, fini: true, a: new Date().toISOString(), envoye: (ecoleDu(d) || {}).envoye || null };
    sauver();
    rep.faits.forEach((id) => {
      const it = dr.items.find((x) => x.act.id === id);
      if (it && !it.fait) noter(d, id, { fait: true, ecole: true });
    });
    if (reglages.envoi === 'non') {
      sons.fin();
      corps.replaceChildren(el('div', { class: 'etape', 'data-lire': 'ありがとう！ よく おしえて くれたね。',
        html: `<span class="visuel enorme" aria-hidden="true">🌟</span><p class="etape-texte">${html('ありがとう！ よく おしえて くれたね。')}</p>` }));
      pied.replaceChildren(bouton('おわる', () => { fermerPlein(); apres(); }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE }));
      parler('ありがとう！ よく おしえて くれたね。');
      return null;
    }
    ecranEnvoi(d, corps, pied, () => { fermerPlein(); apres(); });
    return null;
  }

  ouvrirPlein(ecran);
  if (depart) {
    const j = actives().findIndex((x) => x.id === depart);
    if (j >= 0) i = j;
  }
  afficher();
}

/* ----- Envoyer : l'élève le fait lui-même ; au retour dans l'appli, 「おくれた？」 ----- */

const NOMS_ENVOI = { line: 'LINEで おくる', mail: 'メールで おくる', partage: 'おくる' };

// Combien de jours d'école de suite il a envoyé (jusqu'à d compris).
export function joursDeSuite(d) {
  let n = 0;
  for (const [k, r] of historiqueEcole()) {
    if (k > cle(d) || !r.fini) continue;
    if (!r.envoye) break;
    n += 1;
  }
  return n;
}

function ecranEnvoi(d, corps, pied, fermer) {
  const deja = ecoleDu(d) && ecoleDu(d).envoye;
  const zone = el('div', { class: 'etape' });
  const titre = deja ? 'もう おくったよ。 もう いちど おくる？' : 'お家《うち》の 人《ひと》に おくろう！';
  zone.innerHTML = `<span class="visuel enorme" aria-hidden="true">📨</span><p class="etape-texte">${html(titre)}</p>`;
  zone.dataset.lire = lu(titre);
  corps.replaceChildren(zone);
  const envoyer = bouton(NOMS_ENVOI[reglages.envoi] || 'おくる', async () => {
    const res = await envoyerCompteRendu(d);
    if (res === 'ouvert') attendreRetour(d, corps, pied, fermer);
    else if (res === 'envoye' || res === 'copie') bravoEnvoi(d, corps, pied, fermer, res === 'copie');
  }, { classe: 'btn btn-principal btn-large btn-line', icone: ICONE_ENVOYER });
  pied.replaceChildren(bouton('あとで', fermer, { classe: 'btn btn-large' }), envoyer);
  parler(`${lu(titre)} ${lu(NOMS_ENVOI[reglages.envoi] || 'おくる')}を おしてね。`);
}

// LINE ou l'e-mail se sont ouverts : quand il revient, on lui demande si c'est parti.
function attendreRetour(d, corps, pied, fermer) {
  const demander = () => {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', demander);
    clearTimeout(secours);
    const zone = el('div', { class: 'etape', 'data-lire': 'おくれた？' });
    zone.innerHTML = `<span class="visuel enorme" aria-hidden="true">📨</span><p class="etape-texte">${html('おくれた？')}</p>`;
    corps.replaceChildren(zone);
    pied.replaceChildren(
      bouton('まだ', () => ecranEnvoi(d, corps, pied, fermer), { classe: 'btn btn-large', icone: ICONE_GAUCHE }),
      bouton('うん、 おくった', () => { marquerEnvoye(d); bravoEnvoi(d, corps, pied, fermer); }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE }),
    );
    parler('おくれた？');
  };
  document.addEventListener('visibilitychange', demander);
  // Si l'appli ne s'est pas cachée (LINE ouvert dans une autre fenêtre, ordinateur…), on demande quand même.
  const secours = setTimeout(() => { if (!document.hidden) demander(); }, 4000);
}

function bravoEnvoi(d, corps, pied, fermer, copie = false) {
  if (!copie) marquerEnvoye(d);
  sons.fin();
  const n = joursDeSuite(d);
  const texte = copie ? 'コピーしたよ。 LINEに はって おくってね。' : (n >= 2 ? `やったね！ ${n}日《にち》 つづけて おくったよ！` : 'やったね！ おくったよ！');
  const zone = el('div', { class: 'etape', 'data-lire': lu(texte) });
  zone.innerHTML = `<span class="visuel enorme" aria-hidden="true">${copie ? '📋' : '🎉'}</span><p class="etape-texte">${html(texte)}</p>`;
  const r = ecoleDu(d) || {};
  const voix = Object.values(r.voix || {}).filter(Boolean);
  if (!copie && voix.length && navigator.canShare && !window.YOTEI_ARTIFACT) {
    zone.append(bouton('こえも おくる', () => partagerVoix(d), { classe: 'btn btn-large', icone: '<i aria-hidden="true">🎤</i>' }));
  }
  corps.replaceChildren(zone);
  pied.replaceChildren(bouton('おわる', fermer, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE }));
  parler(lu(texte));
}

async function partagerVoix(d) {
  const r = ecoleDu(d) || {};
  const fichiers = [];
  for (const [k, id] of Object.entries(r.voix || {})) {
    if (!id) continue;
    const f = await fichierVoix(id, `yotei-${cle(d)}-${k}`);
    if (f) fichiers.push(f);
  }
  if (!fichiers.length) return;
  try {
    if (navigator.canShare({ files: fichiers })) await navigator.share({ files: fichiers, title: 'こえの メッセージ' });
    else message('この スマホでは おくれないよ。');
  } catch { /* annulé */ }
}

// Les 🎤 de la relecture et de l'espace parents : ▶ pour chaque enregistrement.
const NOMS_VOIX = { prefere: '楽《たの》しかった こと', souci: 'こまった こと', message: 'メッセージ' };
function boutonsVoix(rep) {
  return Object.entries(rep.voix || {}).filter(([, id]) => id).map(([k, id]) => {
    const b = el('button', { type: 'button', class: 'btn micro-ecouter', 'aria-label': `${lu(NOMS_VOIX[k] || k)}、 こえを きく`,
      html: `<i aria-hidden="true">▶️</i><span>${html(`🎤 ${NOMS_VOIX[k] || k}`)}</span>` });
    activable(b, () => ecouterVoix(id), { garde: false });
    return b;
  });
}
export { boutonsVoix };

/* ----- Le résumé (pour l'enfant) et le compte rendu (pour les parents) ----- */

// Kanji sans espaces, pour un texte d'adulte : 作業《さぎょう》 学習《がくしゅう》 → 作業学習.
const enKanji = (t) => segments(t).map((s) => (typeof s === 'string' ? s : s.k)).join('').replace(/([^\x20-\x7e]) (?=[^\x20-\x7e])/g, '$1');

function nomsDe(ids, ecole, rep, f) {
  return ids.map((id) => {
    if (id.startsWith('c:')) return f(carte(id.slice(2)).nom);
    const it = ecole.find((x) => x.act.id === id);
    if (it) return f(it.carte.nom);
    const autre = [...QUAND_AUTRES, ...RAPPORTE].find((x) => x.id === id);
    if (autre) return f(autre.texte);
    return id.startsWith('m:') ? id.slice(2) : '';
  }).filter(Boolean);
}

const LIBELLES = {
  ja: {
    titre: '学校のふりかえり', humeur: '今日の学校', faits: 'したこと', prefere: 'いちばん楽しかったこと', aucun: 'とくにない',
    souci: '困ったこと・いやなこと', non: 'なかった', oui: 'あった', prof: '先生に', profOui: '言った', profNon: '言っていない',
    rapporte: '持って帰ったもの', rien: 'なし', pied: '（本人の答えです。アプリ「よてい」より）', sep: '、',
  },
  fr: {
    titre: "Retour de l'école", humeur: 'Journée', faits: 'Fait', prefere: 'Préféré', aucun: 'rien de particulier',
    souci: 'Souci', non: 'non', oui: 'oui', prof: "dit à l'enseignant", profOui: 'oui', profNon: 'non',
    rapporte: 'Rapporté à la maison', rien: 'rien', pied: '(Réponses de votre enfant, appli よてい)', sep: ', ',
  },
};
const HUMEURS_FR = { tanoshii: 'content', futsu: 'normal', tsukareta: 'fatigué', iya: 'pas content' };

// Lignes [emoji, texte, étape à corriger] ; pour 'enfant', le texte garde la notation (hiragana ou furigana à l'écran).
function lignesResume(rep, ecole, pour, langue = 'ja') {
  const L = LIBELLES[langue];
  const f = pour === 'enfant' ? (t) => t : enKanji;
  const lignes = [];
  const h = HUMEURS.find((x) => x.id === rep.humeur);
  const detail = reglages.ecoleDetail !== 'court';
  if (h) lignes.push([h.emoji, pour === 'enfant' ? h.texte : `${L.humeur}${langue === 'ja' ? '：' : ' : '}${langue === 'ja' ? enKanji(h.texte) : HUMEURS_FR[h.id]}`, 'humeur']);
  PERIODES.forEach((p) => {
    const ids = [...rep.faits.filter((id) => ecole.find((x) => x.act.id === id && x.periode === p.id)),
      ...rep.autres.filter((a) => a.periode === p.id).map((a) => `c:${a.carte}`)];
    const noms = nomsDe(ids, ecole, rep, f);
    if (noms.length) {
      const nomMoment = langue === 'fr' && pour !== 'enfant' ? { asa: 'Matin', hiru: 'Midi', gogo: 'Après-midi', yoru: 'Soir' }[p.id] : f(p.nom);
      lignes.push([p.emoji, `${nomMoment}${pour === 'enfant' ? '： ' : (langue === 'ja' ? '：' : ' : ')}${noms.join(pour === 'enfant' ? '、 ' : L.sep)}`, detail ? `p-${p.id}` : 'faits']);
    }
  });
  const enPlus = nomsDe(rep.autres.filter((a) => a.periode === 'tout').map((a) => `c:${a.carte}`), ecole, rep, f);
  if (enPlus.length) lignes.push(['➕', `${pour === 'enfant' ? 'ほかに' : (langue === 'fr' ? 'Aussi' : 'ほかに')}${pour === 'enfant' ? '： ' : (langue === 'ja' ? '：' : ' : ')}${enPlus.join(pour === 'enfant' ? '、 ' : L.sep)}`, 'faits']);
  if (rep.prefere) {
    const nom = rep.prefere === 'aucun' ? (pour === 'enfant' ? 'とくに ない' : L.aucun) : nomsDe([rep.prefere], ecole, rep, f)[0];
    lignes.push(['⭐', pour === 'enfant' ? `いちばん 楽《たの》しかった： ${nom}` : `${L.prefere}${langue === 'ja' ? '：' : ' : '}${nom}`, 'prefere']);
  }
  if (rep.souci) {
    let t = rep.souci === 'oui' ? L.oui : L.non;
    if (rep.souci === 'oui' && rep.souciQuand) t += `（${nomsDe([rep.souciQuand], ecole, rep, f)[0] || ''}）`;
    if (rep.souci === 'oui' && rep.souciProf) t += ` / ${L.prof}${langue === 'ja' ? '' : ' : '}${rep.souciProf === 'oui' ? L.profOui : L.profNon}`;
    lignes.push([rep.souci === 'oui' ? '😥' : '🙆', pour === 'enfant' ? `こまった こと： ${rep.souci === 'oui' ? 'あった' : 'なかった'}` : `${L.souci}${langue === 'ja' ? '：' : ' : '}${t}`, 'souci']);
  }
  if (rep.rapporte && (rep.rapporte.length || pour !== 'enfant')) {
    const noms = nomsDe(rep.rapporte, ecole, rep, f);
    if (noms.length || pour !== 'enfant') {
      lignes.push(['🎒', pour === 'enfant' ? `持《も》って 帰《かえ》った： ${noms.join('、 ')}` : `${L.rapporte}${langue === 'ja' ? '：' : ' : '}${noms.length ? noms.join(L.sep) : L.rien}`, 'rapporte']);
    }
  }
  const voix = Object.values(rep.voix || {}).filter(Boolean).length;
  if (voix && pour !== 'enfant') lignes.push(['🎤', langue === 'ja' ? `声のメッセージ：${voix}件（このあと 送ります）` : `Messages vocaux : ${voix} (envoyés à la suite)`, 'message']);
  return lignes;
}

export function texteCompteRendu(d, langue = 'ja') {
  const rep = ecoleDu(d);
  if (!rep) return null;
  const ecole = activitesEcole(d);
  const L = LIBELLES[langue];
  const date = langue === 'fr'
    ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${d.getMonth() + 1}月${d.getDate()}日（${enKanji(JOURS_SEMAINE[d.getDay()].court)}）`;
  const titre = langue === 'fr' ? `[よてい] ${L.titre} — ${date}` : `【よてい】${date} ${L.titre}`;
  const lignes = lignesResume(rep, ecole, 'parents', langue).map(([emoji, t]) => `${langue === 'fr' ? '•' : '・'} ${emoji} ${t}`);
  return { titre, corps: [...lignes, '', L.pied].join('\n') };
}

export function marquerEnvoye(d) {
  reponses[cle(d)] = { ...(reponses[cle(d)] || {}), envoye: new Date().toISOString() };
  sauver();
}
// Fini mais pas encore envoyé : 「きょう」 le rappelle.
export const aEnvoyer = (d) => reglages.envoi !== 'non' && Boolean(ecoleDu(d) && ecoleDu(d).fini && !ecoleDu(d).envoye);

// Un seul bouton. Résultat : 'ouvert' (LINE ou l'e-mail se sont ouverts : on demandera 「おくれた？」),
// 'envoye' (la feuille de partage a fini), 'copie' (texte copié, à coller), ou false.
export async function envoyerCompteRendu(d) {
  const cr = texteCompteRendu(d, reglages.envoiLangue || reglages.langue);
  if (!cr) return false;
  const texte = `${cr.titre}\n${cr.corps}`;
  if (reglages.envoi === 'line') {
    // LINE s'ouvre (dans une autre fenêtre : l'appli reste là pour demander 「おくれた？」) avec le texte écrit ;
    // il choisit la conversation et envoie.
    const url = `https://line.me/R/share?text=${encodeURIComponent(texte)}`;
    if (!window.open(url, '_blank')) window.location.href = url;
    return 'ouvert';
  }
  if (reglages.envoi === 'mail' && reglages.envoiMail) {
    window.location.href = `mailto:${reglages.envoiMail.split(/[,;\s]+/).filter(Boolean).map(encodeURIComponent).join(',')}`
      + `?subject=${encodeURIComponent(cr.titre)}&body=${encodeURIComponent(cr.corps)}`;
    return 'ouvert';
  }
  try {
    if (!window.YOTEI_ARTIFACT && navigator.share) {
      await navigator.share({ title: cr.titre, text: texte });
      return 'envoye';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false;
  }
  // Sinon : le texte est copié (à coller dans LINE).
  try {
    await navigator.clipboard.writeText(texte);
  } catch {
    await plateforme.fichiers.enregistrer(`yotei-ecole-${cle(d)}.txt`, texte, 'text/plain');
  }
  return 'copie';
}

export const ecoleAujourdhui = () => ecoleDu(aujourdhui());
