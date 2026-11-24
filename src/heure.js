/* ======================================================================
   Dates, heures et leur lecture en hiragana ; jours fériés japonais
   Une date est une clé 'AAAA-MM-JJ' (heure locale) ; une heure, des minutes depuis minuit.
   ====================================================================== */

const pad = (n) => String(n).padStart(2, '0');
export const cle = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const deCle = (k) => {
  const [a, m, j] = k.split('-').map(Number);
  return new Date(a, m - 1, j);
};
export const ajouterJours = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const aujourdhui = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
// 1 = lundi … 7 = dimanche (la semaine d'école commence le lundi).
export const jourIso = (d) => ((d.getDay() + 6) % 7) + 1;
export const lundiDe = (d) => ajouterJours(d, 1 - jourIso(d));
export const ecartJours = (a, b) => Math.round((deCle(cle(b)) - deCle(cle(a))) / 86400000);

// '08:50' ⇄ 530
export const versMinutes = (t) => {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const versTexte = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(Math.round(min % 60))}`;
export const minutesMaintenant = (d = new Date()) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

/* ----- Lectures ----- */

const UN = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const DIX = ['', 'じゅう', 'にじゅう', 'さんじゅう', 'よんじゅう', 'ごじゅう', 'ろくじゅう', 'ななじゅう', 'はちじゅう', 'きゅうじゅう'];
export const yomiNombre = (n) => (n === 0 ? 'ぜろ' : `${DIX[Math.floor(n / 10) % 10]}${UN[n % 10]}`);

// Les heures : よじ, しちじ, くじ.
const HEURES = ['れいじ', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ'];
export function yomiHeure(h) {
  if (h <= 12) return HEURES[h];
  if (h < 20) return `じゅう${HEURES[h - 10]}`;
  return h === 20 ? 'にじゅうじ' : `にじゅう${HEURES[h - 20]}`;
}
// Les minutes : いっぷん, にふん, さんぷん, よんぷん, ごふん, ろっぷん, ななふん, はっぷん, きゅうふん, じゅっぷん.
const MIN_UN = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん'];
export function yomiMinutes(m) {
  if (m === 0) return '';
  const d = Math.floor(m / 10);
  const u = m % 10;
  if (u === 0) return `${DIX[d].replace(/じゅう$/, 'じゅっ')}ぷん`;
  return `${DIX[d]}${MIN_UN[u]}`;
}
// Durée : いちじかん にじゅっぷん
const HEURES_DUREE = ['', 'いちじかん', 'にじかん', 'さんじかん', 'よじかん', 'ごじかん', 'ろくじかん', 'ななじかん', 'はちじかん', 'くじかん', 'じゅうじかん',
  'じゅういちじかん', 'じゅうにじかん'];
export function yomiDuree(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return [h ? (HEURES_DUREE[h] || `${yomiNombre(h)}じかん`) : '', yomiMinutes(m)].filter(Boolean).join(' ');
}
// Durée affichée : 1じかん 20ぷん, 5ふん
export function texteDuree(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  const minutes = m ? `${m}${[1, 3, 4, 6, 8, 0].includes(m % 10) ? 'ぷん' : 'ふん'}` : '';
  return [h ? `${h}じかん` : '', minutes].filter(Boolean).join(' ');
}

// L'heure affichée : { chiffres: '9:05', moment: 'ごぜん' } ; et lue : 「ごぜん くじ ごふん」.
export function affichageHeure(min, format24) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  if (format24) return { chiffres: `${h}:${pad(m)}`, moment: '' };
  return { chiffres: `${h % 12 === 0 && h >= 12 ? 12 : h % 12}:${pad(m)}`, moment: h < 12 ? 'ごぜん' : 'ごご' };
}
export function yomiHeureMinutes(min, format24) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  const heure = format24 ? yomiHeure(h) : `${h < 12 ? 'ごぜん' : 'ごご'} ${yomiHeure(h % 12 === 0 && h >= 12 ? 12 : h % 12)}`;
  return [heure, yomiMinutes(m)].filter(Boolean).join(' ');
}

// Les jours du mois : ついたち, ふつか… はつか.
const JOURS_MOIS = { 1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか',
  14: 'じゅうよっか', 20: 'はつか', 24: 'にじゅうよっか' };
export const yomiJourMois = (j) => JOURS_MOIS[j] || `${DIX[Math.floor(j / 10)]}${['', 'いち', 'に', 'さん', 'よっ', 'ご', 'ろく', 'しち', 'はち', 'く'][j % 10]}にち`;
const MOIS = ['', 'いちがつ', 'にがつ', 'さんがつ', 'しがつ', 'ごがつ', 'ろくがつ', 'しちがつ', 'はちがつ', 'くがつ', 'じゅうがつ', 'じゅういちがつ', 'じゅうにがつ'];
export const yomiMois = (m) => MOIS[m];
// Les jours de la semaine (index de getDay : 0 = dimanche).
export const JOURS_SEMAINE = [
  { court: '日《にち》', long: '日曜日《にちようび》', yomi: 'にちようび' },
  { court: '月《げつ》', long: '月曜日《げつようび》', yomi: 'げつようび' },
  { court: '火《か》', long: '火曜日《かようび》', yomi: 'かようび' },
  { court: '水《すい》', long: '水曜日《すいようび》', yomi: 'すいようび' },
  { court: '木《もく》', long: '木曜日《もくようび》', yomi: 'もくようび' },
  { court: '金《きん》', long: '金曜日《きんようび》', yomi: 'きんようび' },
  { court: '土《ど》', long: '土曜日《どようび》', yomi: 'どようび' },
];
export const yomiDate = (d) => `${yomiMois(d.getMonth() + 1)} ${yomiJourMois(d.getDate())}、 ${JOURS_SEMAINE[d.getDay()].yomi}`;
// « あと 3にち » : あした, あさって, あと Nにち.
// Un nombre de jours : ふつか, みっか… とおか, じゅうよっか, はつか, にじゅうよっか, さんじゅうよっか ; sinon 〜にち
// (じゅういちにち, さんじゅうごにち, ひゃくにち). Juste jusqu'à 999 jours.
const CENT = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'];
export function yomiNbJours(n) {
  if (n === 1) return 'いちにち';
  if (JOURS_MOIS[n]) return JOURS_MOIS[n];
  const c = CENT[Math.floor(n / 100) % 10];
  const d = DIX[Math.floor((n % 100) / 10)];
  const u = n % 10;
  if (u === 4) return `${c}${d}よっか`;
  return `${c}${d}${['', 'いち', 'に', 'さん', '', 'ご', 'ろく', 'しち', 'はち', 'く'][u]}にち`;
}
// Le même nombre écrit : ｜3日《みっか》 (la lecture entière sur « 3日 »), 11日《にち》.
export const texteNbJours = (n) => (yomiNbJours(n).endsWith('にち') ? `${n}日《にち》` : `｜${n}日《${yomiNbJours(n)}》`);
// « あと みっか » : きょう, あした, あさって, あと 〜.
export function yomiDans(n) {
  if (n <= 0) return 'きょう';
  if (n === 1) return 'あした';
  if (n === 2) return 'あさって';
  return `あと ${yomiNbJours(n)}`;
}
export function texteDans(n) {
  if (n <= 0) return '今日《きょう》';
  if (n === 1) return '明日《あした》';
  if (n === 2) return 'あさって';
  return `あと ${texteNbJours(n)}`;
}

/* ----- Jours fériés japonais (祝日法, règles en vigueur depuis 2020) ----- */

const lundiNumero = (a, mois, n) => {
  const premier = new Date(a, mois - 1, 1);
  return 1 + ((8 - premier.getDay()) % 7) + (n - 1) * 7;
};
const cacheFeries = new Map();
export function feriesDe(a) {
  if (cacheFeries.has(a)) return cacheFeries.get(a);
  const f = new Map();
  const mettre = (m, j, nom) => f.set(cle(new Date(a, m - 1, j)), nom);
  const k = a - 1980;
  mettre(1, 1, '元日《がんじつ》');
  mettre(1, lundiNumero(a, 1, 2), '成人《せいじん》の 日《ひ》');
  mettre(2, 11, '建国《けんこく》 記念《きねん》の 日《ひ》');
  mettre(2, 23, '天皇《てんのう》 誕生日《たんじょうび》');
  mettre(3, Math.floor(20.8431 + 0.242194 * k - Math.floor(k / 4)), '春分《しゅんぶん》の 日《ひ》');
  mettre(4, 29, '昭和《しょうわ》の 日《ひ》');
  mettre(5, 3, '憲法《けんぽう》記念日《きねんび》');
  mettre(5, 4, 'みどりの 日《ひ》');
  mettre(5, 5, 'こどもの 日《ひ》');
  mettre(7, lundiNumero(a, 7, 3), '海《うみ》の 日《ひ》');
  mettre(8, 11, '山《やま》の 日《ひ》');
  mettre(9, lundiNumero(a, 9, 3), '敬老《けいろう》の 日《ひ》');
  mettre(9, Math.floor(23.2488 + 0.242194 * k - Math.floor(k / 4)), '秋分《しゅうぶん》の 日《ひ》');
  mettre(10, lundiNumero(a, 10, 2), 'スポーツの 日《ひ》');
  mettre(11, 3, '文化《ぶんか》の 日《ひ》');
  mettre(11, 23, '勤労《きんろう》 感謝《かんしゃ》の 日《ひ》');
  // 国民の休日 : un jour ordinaire entre deux jours fériés (en septembre, certaines années).
  [...f.keys()].forEach((c) => {
    const d = deCle(c);
    const entre = ajouterJours(d, 1);
    if (!f.has(cle(entre)) && f.has(cle(ajouterJours(d, 2))) && entre.getDay() !== 0) f.set(cle(entre), '国民《こくみん》の 休日《きゅうじつ》');
  });
  // 振替休日 : un jour férié un dimanche → le jour suivant qui n'est pas férié.
  [...f.keys()].sort().forEach((c) => {
    const d = deCle(c);
    if (d.getDay() !== 0) return;
    let s = ajouterJours(d, 1);
    while (f.has(cle(s))) s = ajouterJours(s, 1);
    f.set(cle(s), '振替《ふりかえ》 休日《きゅうじつ》');
  });
  cacheFeries.set(a, f);
  return f;
}
export const ferie = (d) => feriesDe(d.getFullYear()).get(cle(d)) || null;
