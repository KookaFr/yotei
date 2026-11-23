/* ======================================================================
   Textes japonais : kanji avec furigana, ou hiragana seuls
   Les textes sont écrits avec leur lecture : 作業《さぎょう》学習《がくしゅう》,
   ou ｜朝ご飯《あさごはん》 pour un mot mêlé. Les parents écrivent de la même façon
   (ou en hiragana seuls, sans rien de plus).
   ====================================================================== */

import { echapper } from './outils.js';
import { reglages } from './reglages.js';

const MOTIF = /｜([^《｜]+)《([^》]+)》|([㐀-鿿々〆ヶ]+)《([^》]+)》/g;

// [{ k: '作業', y: 'さぎょう' }, 'の ', …]
export function segments(texte) {
  const s = String(texte ?? '');
  const res = [];
  let i = 0;
  s.replace(MOTIF, (m, k1, y1, k2, y2, pos) => {
    if (pos > i) res.push(s.slice(i, pos));
    res.push({ k: k1 || k2, y: y1 || y2 });
    i = pos + m.length;
    return m;
  });
  if (i < s.length) res.push(s.slice(i));
  return res;
}

const enKanji = () => reglages.ecriture === 'kanji';

// HTML affiché : ruby en mode kanji, hiragana seuls sinon. Chaque mot (séparé par une espace) reste sur une ligne.
export function html(texte, { mots = true } = {}) {
  const brut = segments(texte).map((s) => {
    if (typeof s === 'string') return echapper(s);
    return enKanji() ? `<ruby>${echapper(s.k)}<rt>${echapper(s.y)}</rt></ruby>` : echapper(s.y);
  }).join('');
  if (!mots) return brut;
  return brut.split(' ').filter(Boolean).map((m) => `<span class="mot">${m}</span>`).join(' ');
}
// Ce que dit la voix : toujours la lecture (les kanji seraient parfois mal lus).
export const lu = (texte) => segments(texte).map((s) => (typeof s === 'string' ? s : s.y)).join('');
// Texte sans balises (image partagée, titre de page) : kanji ou hiragana selon le réglage.
export const brut = (texte) => segments(texte).map((s) => (typeof s === 'string' ? s : (enKanji() ? s.k : s.y))).join('');
