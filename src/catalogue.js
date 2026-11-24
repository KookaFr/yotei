/* ======================================================================
   Les cartes d'activités, les étapes (てじゅん) et l'emploi du temps d'exemple
   Une carte : { id, nom, emoji, lieu, recit, sansPhoto, routine, important }
   - lieu : 'gakko' (école, bleu), 'ie' (maison, orange), 'soto' (dehors, vert) ;
   - recit : la phrase du soir (ふりかえり), au passé ;
   - sansPhoto : on ne propose pas de photo (toilettes, bain…) ;
   - routine : les étapes à suivre (てじゅん) ;
   - important : à ne pas oublier (mis en avant dans la semaine) ;
   - verif : les questions possibles quand l'élève appuie sur 「おわった」 (une est tirée au hasard ;
     sans question, une question générale : messages.js) ;
   - libre : temps libre ou loisir (finir plus tôt n'est pas un problème : 「もう おわりに する？」) ;
   - trajet : un trajet (通学, 下校) : on peut arriver en avance, l'heure de fin n'est pas fixe ;
   - finFixe : l'heure de fin est fixe (par défaut : les cartes de l'école, sauf les trajets) ;
   - mochimono : les affaires à emporter ce jour-là [{ emoji, texte }] (semaine, きょう, 明日の 準備).
   Les parents peuvent modifier une carte (photo, nom) ou en créer : donnees.js les garde à part.
   ====================================================================== */

export const LIEUX = {
  gakko: { nom: '学校《がっこう》', fr: 'École', emoji: '🏫' },
  ie: { nom: '家《いえ》', fr: 'Maison', emoji: '🏠' },
  soto: { nom: '外《そと》', fr: 'Dehors', emoji: '🌳' },
};

const c = (id, lieu, emoji, nom, recit, options = {}) => ({ id, lieu, emoji, nom, recit, ...options });
const m = (emoji, texte) => ({ emoji, texte });

export const CARTES = [
  // --- École ---
  c('tsugaku', 'gakko', '🚌', '通学《つうがく》', '学校《がっこう》に 行《い》きました。', { trajet: true }),
  c('asanokai', 'gakko', '🌅', '朝《あさ》の 会《かい》', '朝《あさ》の 会《かい》に 出《で》ました。'),
  c('kokugo', 'gakko', '📖', '国語《こくご》', '国語《こくご》の 勉強《べんきょう》を しました。'),
  c('sugaku', 'gakko', '🔢', '数学《すうがく》', '数学《すうがく》の 勉強《べんきょう》を しました。'),
  c('sagyo', 'gakko', '🛠️', '作業《さぎょう》 学習《がくしゅう》', '作業《さぎょう》を しました。'),
  c('seikatsu', 'gakko', '🧺', '生活《せいかつ》 単元《たんげん》 学習《がくしゅう》', '生活《せいかつ》 単元《たんげん》 学習《がくしゅう》を しました。'),
  c('shokugyo', 'gakko', '💼', '職業《しょくぎょう》', '職業《しょくぎょう》の 勉強《べんきょう》を しました。'),
  c('taiiku', 'gakko', '🏃', '体育《たいいく》', '体育《たいいく》で 体《からだ》を 動《うご》かしました。', { mochimono: [m('👕', '体操服《たいそうふく》'), m('👟', '体育館《たいいくかん》シューズ')] }),
  c('ongaku', 'gakko', '🎵', '音楽《おんがく》', '音楽《おんがく》の 時間《じかん》が ありました。'),
  c('bijutsu', 'gakko', '🎨', '美術《びじゅつ》', '美術《びじゅつ》で 作品《さくひん》を 作《つく》りました。'),
  c('jiritsu', 'gakko', '🧩', '自立《じりつ》 活動《かつどう》', '自立《じりつ》 活動《かつどう》を しました。'),
  c('hr', 'gakko', '🗣️', 'ホームルーム', 'ホームルームが ありました。'),
  c('kyushoku', 'gakko', '🍱', '給食《きゅうしょく》', '給食《きゅうしょく》を 食《た》べました。'),
  c('hiruyasumi', 'gakko', '☀️', '昼休《ひるやす》み', '昼休《ひるやす》みを すごしました。'),
  c('souji', 'gakko', '🧹', '掃除《そうじ》', '掃除《そうじ》を しました。'),
  c('kaerinokai', 'gakko', '👋', '帰《かえ》りの 会《かい》', '帰《かえ》りの 会《かい》に 出《で》ました。'),
  c('gekou', 'gakko', '🚌', '下校《げこう》', '家《いえ》に 帰《かえ》りました。', { trajet: true }),
  c('bukatsu', 'gakko', '⚽', '部活動《ぶかつどう》', '部活動《ぶかつどう》を しました。'),
  c('jisshu', 'gakko', '🏭', '実習《じっしゅう》', '実習《じっしゅう》に 行《い》きました。', { important: true, mochimono: [m('🦺', '作業着《さぎょうぎ》'), m('🥤', '水筒《すいとう》')] }),
  c('ensoku', 'gakko', '🚍', '遠足《えんそく》', '遠足《えんそく》に 行《い》きました。', { important: true, mochimono: [m('🍱', 'お弁当《べんとう》'), m('🥤', '水筒《すいとう》')] }),
  c('undokai', 'gakko', '🏅', '運動会《うんどうかい》', '運動会《うんどうかい》に 出《で》ました。', { important: true, mochimono: [m('👕', '体操服《たいそうふく》'), m('🥤', '水筒《すいとう》')] }),
  c('bunkasai', 'gakko', '🎭', '文化祭《ぶんかさい》', '文化祭《ぶんかさい》に 出《で》ました。', { important: true }),
  c('shugaku', 'gakko', '🧳', '修学《しゅうがく》 旅行《りょこう》', '修学《しゅうがく》 旅行《りょこう》に 行《い》きました。', { important: true }),
  c('kenshin', 'gakko', '🩺', '健康《けんこう》 診断《しんだん》', '健康《けんこう》 診断《しんだん》を 受《う》けました。', { sansPhoto: true, important: true }),
  c('hinan', 'gakko', '🚨', '避難《ひなん》 訓練《くんれん》', '避難《ひなん》 訓練《くんれん》を しました。', { important: true }),
  c('shigyoshiki', 'gakko', '🌸', '始業式《しぎょうしき》', '始業式《しぎょうしき》に 出《で》ました。', { important: true }),
  c('shugyoshiki', 'gakko', '🎌', '終業式《しゅうぎょうしき》', '終業式《しゅうぎょうしき》に 出《で》ました。', { important: true }),
  // --- Maison ---
  c('okiru', 'ie', '⏰', '起《お》きる', '起《お》きました。', { sansPhoto: true, verif: ['ふとんから 出《で》た？', 'カーテンを あけた？'] }),
  c('asashitaku', 'ie', '🎒', '朝《あさ》の したく', '朝《あさ》の したくを しました。', { routine: 'asa' }),
  c('toire', 'ie', '🚽', 'トイレ', 'トイレに 行《い》きました。', { sansPhoto: true }),
  c('kao', 'ie', '💧', '顔《かお》を 洗《あら》う', '顔《かお》を 洗《あら》いました。', { sansPhoto: true }),
  c('kigae', 'ie', '👕', '着替《きが》える', '着替《きが》えました。', { sansPhoto: true, verif: ['ぬいだ 服《ふく》を かたづけた？', 'ボタンは ぜんぶ とめた？'] }),
  c('asagohan', 'ie', '🍚', '朝《あさ》ご飯《はん》', '朝《あさ》ご飯《はん》を 食《た》べました。', { verif: ['お皿《さら》を かたづけた？', '「ごちそうさま」を 言《い》った？', '口《くち》を ふいた？'] }),
  c('hirugohan', 'ie', '🍙', '昼《ひる》ご飯《はん》', '昼《ひる》ご飯《はん》を 食《た》べました。', { verif: ['お皿《さら》を かたづけた？', '「ごちそうさま」を 言《い》った？', '口《くち》を ふいた？'] }),
  c('bangohan', 'ie', '🍛', '晩《ばん》ご飯《はん》', '晩《ばん》ご飯《はん》を 食《た》べました。', { verif: ['お皿《さら》を かたづけた？', '「ごちそうさま」を 言《い》った？', '口《くち》を ふいた？'] }),
  c('hamigaki', 'ie', '🪥', '歯《は》みがき', '歯《は》を みがきました。', { sansPhoto: true, verif: ['歯《は》を ぜんぶ みがいた？', 'おくの 歯《は》も みがいた？', 'うがいを した？'] }),
  c('ittekimasu', 'ie', '🚪', 'いってきます', '家《いえ》を 出《で》ました。', { sansPhoto: true }),
  c('tadaima', 'ie', '🏠', 'ただいま', '家《いえ》に 帰《かえ》りました。', { sansPhoto: true, routine: 'kaeri' }),
  c('tearai', 'ie', '🧼', '手《て》を 洗《あら》う', '手《て》を 洗《あら》いました。', { sansPhoto: true, routine: 'te' }),
  c('renrakucho', 'ie', '📒', '連絡帳《れんらくちょう》', '連絡帳《れんらくちょう》を 出《だ》しました。', { verif: ['連絡帳《れんらくちょう》を お家《うち》の 人《ひと》に わたした？'] }),
  c('oyatsu', 'ie', '🍪', 'おやつ', 'おやつを 食《た》べました。', { verif: ['ごみを すてた？', '手《て》を ふいた？'] }),
  c('shukudai', 'ie', '✏️', '宿題《しゅくだい》', '宿題《しゅくだい》を しました。', { verif: ['宿題《しゅくだい》を お家《うち》の 人《ひと》に 見《み》せた？', '名前《なまえ》を 書《か》いた？', 'かばんに 入《い》れた？'] }),
  c('otetsudai', 'ie', '🍽️', 'お手伝《てつだ》い', 'お手伝《てつだ》いを しました。'),
  c('jiyu', 'ie', '😊', '自由《じゆう》 時間《じかん》', '好《す》きな ことを しました。', { libre: true, cadre: true, verif: ['つかった ものを かたづけた？'] }),
  c('game', 'ie', '🎮', 'ゲーム', 'ゲームを しました。', { verif: ['ゲームを かたづけた？'], libre: true }),
  c('terebi', 'ie', '📺', 'テレビ', 'テレビを 見《み》ました。', { verif: ['テレビを 消《け》した？'], libre: true }),
  c('douga', 'ie', '📱', '動画《どうが》', '動画《どうが》を 見《み》ました。', { verif: ['動画《どうが》を とめた？'], libre: true }),
  c('kiku', 'ie', '🎧', '音楽《おんがく》を 聞《き》く', '音楽《おんがく》を 聞《き》きました。', { libre: true }),
  c('ofuro', 'ie', '🛁', 'お風呂《ふろ》', 'お風呂《ふろ》に 入《はい》りました。', { sansPhoto: true, verif: ['体《からだ》を ふいた？', 'かみの 毛《け》を かわかした？'] }),
  c('kusuri', 'ie', '💊', '薬《くすり》', '薬《くすり》を 飲《の》みました。', { sansPhoto: true }),
  c('ashita', 'ie', '📋', '明日《あした》の 準備《じゅんび》', '明日《あした》の 準備《じゅんび》を しました。', { routine: 'mochimono' }),
  c('yorushitaku', 'ie', '🌙', '夜《よる》の したく', '夜《よる》の したくを しました。', { routine: 'yoru' }),
  c('neru', 'ie', '🛏️', '寝《ね》る', '', { sansPhoto: true, sommeil: true, verif: ['ふとんに 入《はい》った？', '電気《でんき》を 消《け》した？'] }),
  // --- Dehors ---
  c('dei', 'soto', '🏡', '放課後《ほうかご》 デイ', '放課後《ほうかご》 デイに 行《い》きました。'),
  c('sanpo', 'soto', '🚶', '散歩《さんぽ》', '散歩《さんぽ》を しました。', { libre: true }),
  c('kaimono', 'soto', '🛒', '買《か》い物《もの》', '買《か》い物《もの》に 行《い》きました。'),
  c('odekake', 'soto', '🚗', 'お出《で》かけ', 'お出《で》かけ しました。', { libre: true }),
  c('kouen', 'soto', '🌳', '公園《こうえん》', '公園《こうえん》に 行《い》きました。', { libre: true }),
  c('densha', 'soto', '🚃', '電車《でんしゃ》', '電車《でんしゃ》に 乗《の》りました。'),
  c('basu', 'soto', '🚌', 'バス', 'バスに 乗《の》りました。'),
  c('puru', 'soto', '🏊', 'プール', 'プールで 泳《およ》ぎました。', { mochimono: [m('🩱', '水着《みずぎ》'), m('🧢', '水泳《すいえい》ぼうし')] }),
  c('supotsu', 'soto', '⚽', 'スポーツ', 'スポーツを しました。'),
  c('naraigoto', 'soto', '🎹', '習《なら》い事《ごと》', '習《なら》い事《ごと》に 行《い》きました。'),
  c('byoin', 'soto', '🏥', '病院《びょういん》', '病院《びょういん》に 行《い》きました。', { sansPhoto: true, important: true, mochimono: [m('💳', '保険証《ほけんしょう》'), m('📕', 'お薬《くすり》手帳《てちょう》')] }),
  c('gaishoku', 'soto', '🍽️', '外食《がいしょく》', 'お店《みせ》で 食《た》べました。'),
  c('tomodachi', 'soto', '🤝', '友《とも》だちと 遊《あそ》ぶ', '友《とも》だちと 遊《あそ》びました。', { libre: true }),
  // 「だれと？」 : la personne se choisit en ajoutant (パパと すごす, けんたくんと すごす…).
  c('sugosu', 'soto', '👥', 'だれかと すごす', 'だれかと すごしました。', { important: true, avecQui: true }),
];

/* ----- Les personnes autour de lui (「だれと？」) : les parents les changent, il peut en ajouter ----- */
const pers = (id, emoji, nom) => ({ id, emoji, nom });
export const PERSONNES = [
  pers('papa', '👨', 'パパ'), pers('mama', '👩', 'ママ'),
  pers('jiji', '👴', 'おじいちゃん'), pers('baba', '👵', 'おばあちゃん'),
  pers('ani', '👦', 'お兄《にい》ちゃん'), pers('ane', '👧', 'お姉《ねえ》ちゃん'),
  pers('tomo', '🧑', '友《とも》だち'), pers('sensei', '🧑‍🏫', '先生《せんせい》'),
];

/* ----- Les étapes (une à la fois) ----- */
const e = (emoji, texte) => ({ emoji, texte });
export const ROUTINES = [
  { id: 'asa', nom: '朝《あさ》の したく', emoji: '🎒', etapes: [
    e('🚽', 'トイレに 行《い》く'), e('💧', '顔《かお》を 洗《あら》う'), e('👕', '着替《きが》える'), e('🍚', '朝《あさ》ご飯《はん》を 食《た》べる'),
    e('🪥', '歯《は》を みがく'), e('🎒', 'かばんを 持《も》つ'), e('👟', 'くつを はく'), e('🚪', 'いってきます！'),
  ] },
  { id: 'te', nom: '手《て》を 洗《あら》う', emoji: '🧼', etapes: [
    e('🚰', '水《みず》を 出《だ》す'), e('💧', '手《て》を ぬらす'), e('🧴', 'せっけんを つける'), e('👐', 'ごしごし 洗《あら》う'),
    e('💦', '水《みず》で 流《なが》す'), e('🚰', '水《みず》を 止《と》める'), e('🧻', '手《て》を ふく'),
  ] },
  { id: 'kaeri', nom: '帰《かえ》ったら', emoji: '🏠', etapes: [
    e('👟', 'くつを そろえる'), e('🧼', '手《て》を 洗《あら》う'), e('📒', '連絡帳《れんらくちょう》を 出《だ》す'),
    e('🥤', '水筒《すいとう》を 出《だ》す'), e('👕', '着替《きが》える'),
  ] },
  { id: 'mochimono', nom: '明日《あした》の 準備《じゅんび》', emoji: '📋', etapes: [
    e('📒', '連絡帳《れんらくちょう》を 入《い》れる'), e('🥤', '水筒《すいとう》を 用意《ようい》する'), e('🤧', 'ハンカチと ティッシュを 入《い》れる'),
    e('👕', '明日《あした》の 服《ふく》を 出《だ》す'), e('🎒', 'かばんを 玄関《げんかん》に おく'),
  ] },
  { id: 'yoru', nom: '夜《よる》の したく', emoji: '🌙', etapes: [
    e('🛁', 'お風呂《ふろ》に 入《はい》る'), e('👚', 'パジャマを 着《き》る'), e('🪥', '歯《は》を みがく'),
    e('🚽', 'トイレに 行《い》く'), e('🛏️', 'ふとんに 入《はい》る'),
  ] },
];

/* ----- L'emploi du temps d'exemple (à adapter par les parents) -----
   Une activité : { id, carte, debut, fin } (heures 'HH:MM', fin facultative). */
let n = 0;
const a = (carte, debut, fin = '') => ({ id: `x${(n++).toString(36)}`, carte, debut, fin });
const matin = () => [a('okiru', '06:30'), a('asashitaku', '06:35', '07:25'), a('ittekimasu', '07:25'), a('tsugaku', '07:30', '08:40'),
  a('asanokai', '08:40', '09:00')];
const soir = () => [a('kaerinokai', '15:00', '15:15'), a('gekou', '15:20', '16:20'), a('tadaima', '16:20'), a('renrakucho', '16:30'),
  a('oyatsu', '16:40', '17:00'), a('jiyu', '17:00', '18:30'), a('bangohan', '18:30', '19:15'), a('ofuro', '19:30', '20:00'),
  a('ashita', '20:00', '20:15'), a('jiyu', '20:15', '21:30'), a('hamigaki', '21:30'), a('neru', '22:00')];
const journeeEcole = (m1, m2, m3, m4) => [...matin(),
  a(m1, '09:10', '10:40'), a(m2, '10:50', '11:40'), a(m3, '11:50', '12:40'), a('kyushoku', '12:40', '13:30'),
  a('hiruyasumi', '13:30', '13:50'), a('souji', '13:50', '14:10'), a(m4, '14:15', '15:00'), ...soir()];
export const journeeRepos = (avecDemain = false) => [a('okiru', '07:30'), a('asagohan', '08:00', '08:30'), a('hamigaki', '08:30'),
  a('jiyu', '09:00', '12:00'), a('hirugohan', '12:00', '13:00'), a('odekake', '13:00', '15:00'), a('oyatsu', '15:00', '15:30'),
  a('jiyu', '15:30', '18:30'), a('bangohan', '18:30', '19:15'), a('ofuro', '19:30', '20:00'),
  ...(avecDemain ? [a('ashita', '20:00', '20:15')] : []), a('jiyu', '20:15', '21:30'), a('hamigaki', '21:30'), a('neru', '22:00')];

export const exempleSemaine = () => ({
  1: journeeEcole('sagyo', 'kokugo', 'taiiku', 'seikatsu'),
  2: journeeEcole('sagyo', 'sugaku', 'ongaku', 'jiritsu'),
  3: journeeEcole('sagyo', 'kokugo', 'bijutsu', 'hr'),
  4: journeeEcole('seikatsu', 'sugaku', 'taiiku', 'shokugyo'),
  5: journeeEcole('sagyo', 'kokugo', 'sugaku', 'hr'),
  6: journeeRepos(),
  7: journeeRepos(true),
});
