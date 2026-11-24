/* ======================================================================
   Les messages de 「おわった」 : une réaction au temps mis, puis une question de vérification.
   - Le temps mis donne une catégorie (avance, très tôt, tôt, à l'heure, après coup, sans heure).
   - Chaque catégorie a sa liste de phrases ; on en tire une au hasard, sans redire la dernière.
   - La question : celle de la carte (s'il y en a), sinon une question générale, plus insistante
     quand l'activité est finie très tôt.
   Les phrases peuvent contenir des variables : {nom} {debut} {fin} {reste} {duree} {retard}.
   Les parents peuvent changer chaque liste (espace parents) ; elles voyagent avec la sauvegarde.
   ====================================================================== */

import { enregistrer, etat } from './donnees.js';
import { texteDuree, yomiDuree } from './heure.js';
import { html, lu } from './texte.js';

export const CATEGORIES = [
  {
    id: 'avance', groupe: 'reaction',
    fr: 'Pas encore commencée (moins de 15 min avant le début)', ja: 'まだ はじまって いない（15分前から）',
  },
  {
    id: 'tresTot', groupe: 'reaction',
    fr: 'Très tôt : moins de la moitié du temps, et 10 min ou plus restantes', ja: 'とても はやい（半分も たって いない）',
  },
  { id: 'tot', groupe: 'reaction', fr: 'Un peu tôt : encore 10 min ou plus', ja: 'すこし はやい（あと 10分 以上）' },
  { id: 'aLheure', groupe: 'reaction', fr: "À l'heure (moins de 10 min avant la fin, jusqu'à 5 min après)", ja: 'ちょうど いい じかん' },
  { id: 'tard', groupe: 'reaction', fr: 'Après coup (plus de 5 min après la fin)', ja: 'おわりの 時間を すぎて から' },
  { id: 'sansHeure', groupe: 'reaction', fr: 'Activité sans heure de fin', ja: 'おわりの 時間が ない 予定' },
  { id: 'verifFort', groupe: 'question', fr: 'Question générale, quand c\'est fini tôt', ja: 'はやく おわった ときの 質問' },
  { id: 'verifNormal', groupe: 'question', fr: 'Question générale, les autres fois', ja: 'ふつうの 質問' },
  { id: 'mada', groupe: 'mada', fr: 'Réponse à 「まだ」', ja: '「まだ」の あとの ことば' },
];

export const MESSAGES_DEFAUT = {
  avance: [
    'まだ {debut}に なって いないよ。 はやいね！',
    '{debut}からの 予定《よてい》だよ。 もう できたの？',
    'はじまる 前《まえ》に できたの？ すごいね。',
  ],
  tresTot: [
    'はやいね！ {fin}まで、 まだ {reste} あるよ。',
    'あれ？ まだ {reste} あるよ。',
    '{duree}で おわったの？ とても はやいね。',
    'すごく はやいね！ {fin}までの 予定《よてい》だよ。',
  ],
  tot: [
    'はやいね！ あと {reste} あるよ。',
    '{duree}で できたね。 よく がんばった！',
    '時間《じかん》より はやく おわったね。',
    'いい ちょうしだね！ まだ {reste} あるよ。',
  ],
  aLheure: [
    'ちょうど いい 時間《じかん》だね！',
    '時間《じかん》どおりだね。 すばらしい！',
    'ぴったりだね！',
    '{duree}、 よく がんばったね。',
    '時間《じかん》を まもれたね！',
  ],
  tard: [
    '{nom}、 おわって いたんだね。',
    'おしえて くれて ありがとう。',
    'あとから チェックしたね。 だいじょうぶ！',
  ],
  sansHeure: [
    'おつかれさま！',
    'よく がんばったね！',
    'やったね！',
  ],
  verifFort: [
    'ほんとうに 最後《さいご》まで できた？',
    'ちゃんと ぜんぶ できた？',
    'ほんとうに おわった？',
    'わすれた ことは ない？',
  ],
  verifNormal: [
    'おわった？',
    'ちゃんと できた？',
    '最後《さいご》まで できた？',
    'かたづけも できた？',
  ],
  mada: [
    'わかった。 おわったら また おしてね。',
    'だいじょうぶ。 ゆっくりで いいよ。',
    '最後《さいご》まで がんばろう！',
    'できたら おしえてね。',
  ],
};

export const VARIABLES = ['nom', 'debut', 'fin', 'reste', 'duree', 'retard'];

export function liste(id) {
  const perso = etat.messages && etat.messages[id];
  return Array.isArray(perso) && perso.length ? perso : MESSAGES_DEFAUT[id];
}
export function changerListe(id, phrases) {
  const propres = phrases.map((p) => p.trim()).filter(Boolean);
  etat.messages = etat.messages || {};
  if (!propres.length || JSON.stringify(propres) === JSON.stringify(MESSAGES_DEFAUT[id])) delete etat.messages[id];
  else etat.messages[id] = propres;
  enregistrer();
}

// Les questions d'une carte : une par ligne (ou une liste).
export function questionsCarte(c) {
  if (!c || !c.verif) return [];
  return (Array.isArray(c.verif) ? c.verif : String(c.verif).split('\n')).map((q) => q.trim()).filter(Boolean);
}

export const variablesDe = (p) => [...String(p).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

/* ----- Le tirage : au hasard, parmi les phrases dont on connaît les variables, sans redire la dernière ----- */

const CLE_DERNIERS = 'yotei.derniers';
let derniers = {};
try { derniers = JSON.parse(localStorage.getItem(CLE_DERNIERS) || '{}'); } catch { derniers = {}; }

export function tirer(cle, phrases, disponibles, hasard = Math.random) {
  const possibles = phrases.filter((p) => variablesDe(p).every((v) => disponibles.includes(v)));
  if (!possibles.length) return null;
  const sansRepeter = possibles.length > 1 ? possibles.filter((p) => p !== derniers[cle]) : possibles;
  const choix = sansRepeter[Math.floor(hasard() * sansRepeter.length)];
  derniers[cle] = choix;
  try { localStorage.setItem(CLE_DERNIERS, JSON.stringify(derniers)); } catch { /* rien */ }
  return choix;
}

// Une phrase avec ses variables → { html, lire }. vars : { nom: { html, lire }, … }
export function composer(modele, vars) {
  const morceaux = String(modele).split(/\{(\w+)\}/);
  let h = '';
  let l = '';
  morceaux.forEach((m, i) => {
    if (i % 2 === 0) {
      h += html(m, { mots: false });
      l += lu(m);
    } else if (vars[m]) {
      h += vars[m].html;
      l += vars[m].lire;
    }
  });
  return { html: h, lire: l };
}

// Une durée comme variable : 11ぷん / じゅういっぷん.
export const varDuree = (min) => ({ html: html(texteDuree(min), { mots: false }), lire: yomiDuree(min) });

/* ----- La catégorie du temps mis -----
   m : maintenant (minutes) ; it : l'activité (debut, fin, finEff, passe). */
export function categorieTemps(it, m, aujourdhui) {
  if (!aujourdhui) return it.passe ? 'tard' : 'sansHeure';
  if (it.debut !== null && it.debut > m) return 'avance';
  if (it.finEff === null) return it.passe ? 'tard' : 'sansHeure';
  const reste = it.finEff - m;
  // « Tôt » seulement pour une vraie heure de fin : sans elle, l'activité dure jusqu'à la suivante
  // (歯みがき à 21:30 avant 寝る à 22:00 n'est pas « fini 25 minutes trop tôt »).
  if (reste >= 10 && it.fin !== null) {
    const duree = it.debut !== null ? it.finEff - it.debut : null;
    const ecoule = it.debut !== null ? m - it.debut : null;
    return duree && ecoule !== null && ecoule < duree / 2 ? 'tresTot' : 'tot';
  }
  if (reste > -5) return 'aLheure';
  return 'tard';
}
