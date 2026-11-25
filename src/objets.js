/* ======================================================================
   Les pictogrammes dessinés : les mêmes sur tous les appareils, dans le style de くらべよう
   (aplats, contour foncé). Ils remplacent à l'écran les emoji du système, qui changent de dessin
   entre l'iPad et le téléphone. Les données gardent l'emoji (cartes, sauvegardes, message envoyé par LINE) :
   seul l'affichage change. Un emoji sans dessin (choisi par les parents, par exemple) reste tel quel.
   Chaque dessin tient dans un carré de 64 × 64 et prend la taille du texte (1em).
   ====================================================================== */

const R = '#d93a2b';
const O = '#f08a24';
const J = '#f2b61f';
const V = '#2c7a45';
const VC = '#6fb04a';
const B = '#2f6fd0';
const BC = '#9fd0f2';
const VI = '#6a3fc0';
const RO = '#f08a9a';
const BR = '#9a5b2c';
const BOIS = '#d9a05b';
const BE = '#f3d9b1';
const PEAU = '#f6d2a8';
const G = '#b9c2c6';
const GF = '#7a8791';   // traits libres : lisibles sur fond clair et sombre
const AR = '#3b464d';   // ardoise (écrans, roues)
const N = '#1d2427';
const W = '#ffffff';
const VISAGE = '#f7c948';

const pt = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="none"/>`;
const oeil = (x, y, r = 2.5) => pt(x, y, r, N);
const yeux = `${oeil(23, 27, 3)}${oeil(41, 27, 3)}`;
const yeuxRieurs = '<path d="M18 28c2-4 7-4 9 0M37 28c2-4 7-4 9 0"/>';
const visage = (dedans) => `<circle cx="32" cy="32" r="26" fill="${VISAGE}"/>${dedans}`;
const goutte = (x, y, e = 1) => `<path transform="translate(${x} ${y}) scale(${e})" d="M0-9c4 6 7 9 7 13a7 7 0 01-14 0c0-4 3-7 7-13z" fill="#4ea3dc"/>`;
const etoile = (c) => `<path d="M32 5l8 17 19 2-14 13 4 19-17-10-17 10 4-19L5 24l19-2z" fill="${c}"/>`;
const main = `<path d="M20 34V14a4 4 0 018 0v14V8a4 4 0 018 0v20V12a4 4 0 018 0v20l4-8a4 4 0 017 4l-7 20c-2 6-8 10-16 10-10 0-18-6-20-16l-4-14a4 4 0 017-3z" fill="${PEAU}"/>`;
const maison = `<path d="M12 30v28h40V30z" fill="${BE}"/><path d="M5 32L32 8l27 24z" fill="${R}"/><rect x="27" y="42" width="10" height="16" fill="${BR}"/>`;
const tshirt = (c) => `<path d="M22 8L6 18l6 12 8-4v30h24V26l8 4 6-12L42 8c-2 5-6 7-10 7s-8-2-10-7z" fill="${c}"/>`;
const bus = `<rect x="4" y="11" width="56" height="38" rx="6" fill="${J}"/><path d="M10 19h10v10H10zM24 19h10v10H24zM38 19h10v10H38z" fill="${BC}"/><path d="M4 36h56"/><circle cx="17" cy="50" r="6" fill="${AR}"/><circle cx="47" cy="50" r="6" fill="${AR}"/>${pt(17, 50, 2, W)}${pt(47, 50, 2, W)}`;
const fleur = (petale, coeur, r) => `${[[32, 14], [49, 26], [43, 46], [21, 46], [15, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${petale}"/>`).join('')}<circle cx="32" cy="32" r="${r}" fill="${coeur}"/>`;
const drapeau = (dedans) => `<rect x="12" y="8" width="44" height="30" fill="${W}"/>${dedans}<path d="M12 4v56" style="stroke-width:4"/>`;
const cahier = (c, dos) => `<rect x="13" y="6" width="40" height="52" rx="4" fill="${c}"/><path d="M13 10a4 4 0 014-4h5v52h-5a4 4 0 01-4-4z" fill="${dos}"/><path d="M29 20h17M29 29h17M29 38h11"/>`;
const reveil = `<circle cx="32" cy="36" r="22" fill="${W}" stroke="${R}" style="stroke-width:4"/><path d="M32 24v12l8 6M13 12l-7 7M51 12l7 7M17 56l-4 5M47 56l4 5"/>`;

// Une personne : cheveux (couleur), coupe ('court', 'long', 'cotes' pour un crâne dégarni, 'chignon'), couleur du haut.
function personne(cheveux, coupe, haut) {
  const corps = `<path d="M12 61c0-12 8-18 20-18s20 6 20 18z" fill="${haut}"/>`;
  const tete = `<circle cx="32" cy="25" r="16" fill="${PEAU}"/>`;
  const traits = `${oeil(26, 28, 2)}${oeil(38, 28, 2)}<path d="M27 34c3 2 7 2 10 0"/>`;
  const frange = `<path d="M16 23c0-11 8-17 16-17s16 6 16 17c-6-2-10-5-12-9-4 5-12 8-20 9z" fill="${cheveux}"/>`;
  if (coupe === 'long') return `<path d="M13 44V22C13 11 21 4 32 4s19 7 19 18v22z" fill="${cheveux}"/>${corps}${tete}${frange}${traits}`;
  if (coupe === 'chignon') return `<circle cx="32" cy="7" r="6" fill="${cheveux}"/>${corps}${tete}${frange}${traits}`;
  if (coupe === 'cotes') return `${corps}${tete}<path d="M16 26c-2-8 1-14 5-17-1 6-1 11-1 17zM48 26c2-8-1-14-5-17 1 6 1 11 1 17z" fill="${cheveux}"/>${traits}`;
  return `${corps}${tete}${frange}${traits}`;
}

const DESSINS = {
  // Lieux et moments de la journée
  '🏫': `<rect x="8" y="26" width="48" height="32" fill="${BE}"/><path d="M24 26V12h16v14z" fill="${BE}"/><path d="M21 13l11-9 11 9z" fill="${R}"/><circle cx="32" cy="19" r="4" fill="${W}"/><rect x="27" y="44" width="10" height="14" fill="${BR}"/><rect x="13" y="32" width="8" height="8" fill="${BC}"/><rect x="43" y="32" width="8" height="8" fill="${BC}"/>`,
  '🏠': `${maison}<rect x="40" y="38" width="8" height="8" fill="${BC}"/>`,
  '🏡': `${maison}<circle cx="52" cy="50" r="9" fill="${VC}"/>`,
  '🌳': `<rect x="28" y="40" width="8" height="20" fill="${BR}"/><circle cx="32" cy="24" r="20" fill="${V}"/>`,
  '🏭': `<path d="M6 56V30l14 8v-8l14 8v-8l14 8V8h8v48z" fill="${G}"/><rect x="14" y="44" width="8" height="8" fill="${BC}"/><rect x="28" y="44" width="8" height="8" fill="${BC}"/><rect x="42" y="44" width="8" height="8" fill="${BC}"/>`,
  '🏥': `<rect x="10" y="10" width="44" height="48" fill="${W}"/><rect x="26" y="44" width="12" height="14" fill="${BC}"/><path d="M32 17v16M24 25h16" stroke="${R}" style="stroke-width:6"/>`,
  '🌅': `<path d="M12 44a20 20 0 0140 0z" fill="${O}"/><path d="M4 44h56M12 54h40"/><path d="M32 8v8M10 22l5 5M54 22l-5 5" stroke="${O}" style="stroke-width:4"/>`,
  '☀️': `<path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M52 12l-6 6M12 52l6-6" stroke="${O}" style="stroke-width:4"/><circle cx="32" cy="32" r="13" fill="${J}"/>`,
  '🌤️': `<path d="M22 4v5M5 21h5M10 9l4 4M34 9l-4 4" stroke="${O}" style="stroke-width:4"/><circle cx="22" cy="22" r="10" fill="${J}"/><path d="M20 56a10 10 0 010-20 14 14 0 0126-2 11 11 0 012 22z" fill="${W}"/>`,
  '🌙': `<path d="M40 6a26 26 0 1018 44A22 22 0 0140 6z" fill="${J}"/>`,
  '⭐': etoile(J),
  '🌟': `${etoile(J)}<path d="M54 4v8M50 8h8M8 46v6M5 49h6" stroke="${O}"/>`,
  // École
  '🚌': bus,
  '🚍': bus,
  '📖': `<path d="M32 16c-8-6-18-6-26-2v38c8-4 18-4 26 2 8-6 18-6 26-2V14c-8-4-18-4-26 2z" fill="${W}"/><path d="M32 16v38M12 24c5-1 10-1 14 1M12 33c5-1 10-1 14 1M38 25c4-2 9-2 14-1M38 34c4-2 9-2 14-1"/>`,
  '🔢': `<rect x="6" y="6" width="52" height="52" rx="8" fill="${B}"/><text x="32" y="41" text-anchor="middle" style="font-size:23px;font-weight:700" fill="${W}" stroke="none">123</text>`,
  '🛠️': `<path d="M8 58l30-30" stroke="${BR}" style="stroke-width:9"/><path d="M8 58l30-30" stroke="${BOIS}" style="stroke-width:4"/><rect x="24" y="6" width="36" height="20" rx="4" transform="rotate(45 42 16)" fill="${G}"/>`,
  '🧺': `<path d="M18 28c0-14 28-14 28 0" stroke="${BR}"/><path d="M8 28h48l-6 28H14z" fill="${BOIS}"/><path d="M11 40h42M24 28v28M40 28v28"/>`,
  '💼': `<path d="M24 20v-7h16v7"/><rect x="6" y="20" width="52" height="34" rx="5" fill="${BR}"/><path d="M6 34h52"/><rect x="28" y="30" width="8" height="8" fill="${J}"/>`,
  '🏃': `<path d="M36 22l-8 16 10 8-4 14M28 38l-12 6M34 26l-12 2M36 24l12 8" stroke="${B}" style="stroke-width:6"/><circle cx="40" cy="11" r="7" fill="${PEAU}"/>`,
  '🚶': `<path d="M32 20v20M32 40l-8 18M32 40l8 18M32 26l-10 10M32 26l10 8" stroke="${V}" style="stroke-width:6"/><circle cx="32" cy="10" r="7" fill="${PEAU}"/>`,
  '🏊': `<path d="M28 30l24-9" stroke="${PEAU}" style="stroke-width:6"/><circle cx="20" cy="27" r="7" fill="${PEAU}"/><path d="M4 42c5-6 9-6 14 0s9 6 14 0 9-6 14 0 9 6 14 0M4 54c5-6 9-6 14 0s9 6 14 0 9-6 14 0 9 6 14 0" stroke="${B}" style="stroke-width:4"/>`,
  '👕': tshirt(BC),
  '👚': tshirt(RO),
  '👟': `<path d="M6 30l16-10 12 14 20 4c4 1 6 4 6 8H6z" fill="${B}"/><path d="M6 46h54v7H6z" fill="${W}"/><path d="M24 27l6-4M28 32l6-4"/>`,
  '🎵': `<path d="M24 46V12l28-6v34M24 22l28-6" stroke="${VI}" style="stroke-width:4"/><ellipse cx="17" cy="47" rx="8" ry="6" fill="${VI}"/><ellipse cx="45" cy="41" rx="8" ry="6" fill="${VI}"/>`,
  '🎨': `<path d="M32 6C16 6 6 18 6 32s10 26 24 26c6 0 6-6 2-9-4-4 0-9 6-9h8c8 0 12-6 12-12C58 16 46 6 32 6z" fill="#e2b07a"/>${pt(19, 25, 5, R)}${pt(32, 17, 5, J)}${pt(46, 23, 5, B)}${pt(16, 39, 5, V)}`,
  '🧩': `<path d="M10 22h14a6 6 0 1112 0h14v14a6 6 0 100 12v10H10z" fill="${V}"/>`,
  '🗣️': `<path d="M8 10h48a4 4 0 014 4v26a4 4 0 01-4 4H28L14 56V44H8a4 4 0 01-4-4V14a4 4 0 014-4z" fill="${W}"/><path d="M16 22h32M16 31h22"/>`,
  '🍱': `<rect x="6" y="12" width="52" height="40" rx="6" fill="${AR}"/><rect x="11" y="17" width="20" height="30" fill="${W}"/><rect x="35" y="17" width="18" height="13" fill="${VC}"/><rect x="35" y="34" width="18" height="13" fill="${O}"/>${pt(21, 32, 4, R)}`,
  '🧹': `<path d="M50 5L28 36" stroke="${BR}" style="stroke-width:5"/><path d="M18 30l16 12-10 16H6z" fill="${J}"/><path d="M15 44l-4 12M22 47l-4 11"/>`,
  '👋': main,
  '👐': main,
  '✋': main,
  '⚽': `<circle cx="32" cy="32" r="26" fill="${W}"/><path d="M32 21l10 7-4 12H26l-4-12z" fill="${N}"/><path d="M32 21V7M42 28l14-5M38 40l8 13M26 40l-8 13M22 28L8 23"/>`,
  '🦺': `<path d="M20 6L8 14v44h20V24l4-8 4 8v34h20V14L44 6 32 18z" fill="${O}"/><path d="M8 40h20M36 40h20" stroke="${J}" style="stroke-width:4"/>`,
  '🥤': `<path d="M34 20l6-16h8" stroke="${R}" style="stroke-width:4"/><path d="M16 20h32l-4 38H20z" fill="${BC}"/><path d="M12 20h40"/>`,
  '🏅': `<path d="M20 4l12 22L44 4z" fill="${B}"/><circle cx="32" cy="40" r="18" fill="${J}"/><circle cx="32" cy="40" r="9" fill="#ffd966"/>`,
  '🎭': `<path d="M10 10h44v22c0 14-10 24-22 24S10 46 10 32z" fill="${W}"/><path d="M18 24c2-4 8-4 10 0M36 24c2-4 8-4 10 0M22 38c6 8 14 8 20 0"/>`,
  '🧳': `<path d="M24 18V8h16v10"/><rect x="12" y="18" width="40" height="38" rx="5" fill="${B}"/><path d="M22 18v38M42 18v38"/>${pt(20, 59, 3, AR)}${pt(44, 59, 3, AR)}`,
  '🩺': `<path d="M16 6v16a12 12 0 0024 0V6M28 34v8a12 12 0 0024 0v-4" stroke="${GF}" style="stroke-width:4"/><circle cx="52" cy="32" r="6" fill="${G}"/>`,
  '🚨': `<path d="M32 3v6M8 13l5 5M56 13l-5 5" stroke="${O}" style="stroke-width:4"/><path d="M16 46V30a16 16 0 0132 0v16z" fill="${R}"/><rect x="10" y="46" width="44" height="10" rx="3" fill="${G}"/>`,
  '🌸': fleur(RO, J, 7),
  '🌻': fleur(J, BR, 11),
  '🎌': drapeau(pt(34, 23, 9, R)),
  '🏁': drapeau([[12, 8], [34, 8], [23, 18], [45, 18], [12, 28], [34, 28]].map(([x, y]) => `<rect x="${x}" y="${y}" width="11" height="10" fill="${N}" stroke="none"/>`).join('')),
  '🎒': `<path d="M22 14v-4a10 10 0 0120 0v4"/><rect x="12" y="14" width="40" height="44" rx="12" fill="${R}"/><rect x="20" y="34" width="24" height="16" rx="4" fill="#f0705f"/><path d="M12 28h40"/>`,
  // Maison
  '🚽': `<rect x="14" y="6" width="14" height="26" rx="3" fill="${W}"/><path d="M14 32h40c0 12-8 18-18 18H24c-6 0-10-6-10-18z" fill="${W}"/><path d="M26 50v8h14v-8"/>`,
  '💧': goutte(32, 34, 3),
  '💦': `${goutte(18, 22, 1.5)}${goutte(42, 26, 1.8)}${goutte(26, 48, 1.5)}`,
  '🍚': `<path d="M12 30a20 16 0 0140 0z" fill="${W}"/><path d="M6 30h52c0 16-10 26-26 26S6 46 6 30z" fill="${R}"/>`,
  '🍙': `<path d="M32 6c6 0 26 34 24 44-1 6-8 8-24 8S9 56 8 50C6 40 26 6 32 6z" fill="${W}"/><path d="M22 40h20v18c-7 .500-13 .500-20 0z" fill="${AR}"/>`,
  '🍛': `<ellipse cx="32" cy="40" rx="28" ry="16" fill="${W}"/><path d="M32 28c10 0 20 4 20 12s-10 10-20 10z" fill="${BR}"/><path d="M32 28c-10 0-20 4-20 12s10 10 20 10z" fill="#f4f6f7"/>`,
  '🍪': `<circle cx="32" cy="32" r="26" fill="${BOIS}"/>${[[22, 22, 4], [40, 20, 3.5], [44, 36, 4], [26, 40, 4], [36, 48, 3], [32, 30, 3]].map(([x, y, r]) => pt(x, y, r, BR)).join('')}`,
  '🍽️': `<circle cx="32" cy="32" r="27" fill="${W}"/><circle cx="32" cy="32" r="16" fill="#e3eaed"/>`,
  '🪥': `<g transform="rotate(-30 32 32)"><rect x="2" y="28" width="60" height="9" rx="4.500" fill="${B}"/><rect x="40" y="14" width="18" height="14" fill="${W}"/><path d="M46 14v14M52 14v14"/></g>`,
  '🚪': `<rect x="14" y="4" width="36" height="56" fill="${BR}"/><rect x="20" y="10" width="24" height="18" fill="#b97a45"/>${pt(43, 36, 3, J)}`,
  '🧼': `<rect x="8" y="28" width="48" height="28" rx="10" fill="${RO}"/><circle cx="18" cy="16" r="6" fill="${W}"/><circle cx="32" cy="10" r="4" fill="${W}"/><circle cx="45" cy="17" r="7" fill="${W}"/>`,
  '🧴': `<path d="M26 8h18v5"/><rect x="26" y="12" width="12" height="12" fill="${W}"/><rect x="18" y="24" width="28" height="36" rx="6" fill="${BC}"/>`,
  '🚰': `<path d="M22 20V9M14 9h16"/><path d="M8 20h28a10 10 0 0110 10v8H36v-6H8z" fill="${G}"/>${goutte(41, 52, 1.2)}`,
  '🧻': `<path d="M40 30h14v26H40z" fill="${W}"/><path d="M8 20v28c0 6 7 10 16 10s16-4 16-10V20z" fill="${W}"/><ellipse cx="24" cy="20" rx="16" ry="10" fill="${W}"/><ellipse cx="24" cy="20" rx="5" ry="3" fill="${G}"/>`,
  '🛁': `<path d="M12 30V14a6 6 0 0112 0M15 54l-2 6M49 54l2 6"/><path d="M4 30h56v6c0 12-8 18-18 18H22C12 54 4 48 4 36z" fill="${W}"/><circle cx="40" cy="22" r="5" fill="${BC}"/><circle cx="50" cy="16" r="4" fill="${BC}"/>`,
  '💊': `<g transform="rotate(-45 32 32)"><rect x="6" y="20" width="52" height="24" rx="12" fill="${W}"/><path d="M32 20h14a12 12 0 010 24H32z" fill="${R}"/></g>`,
  '🛏️': `<path d="M6 14v44M58 48v10"/><rect x="6" y="34" width="52" height="14" rx="3" fill="${B}"/><rect x="10" y="25" width="16" height="10" rx="4" fill="${W}"/>`,
  '📒': cahier(J, O),
  '📕': `<rect x="12" y="6" width="40" height="52" rx="4" fill="${R}"/><path d="M20 6v52"/><rect x="26" y="16" width="20" height="10" rx="2" fill="${W}"/>`,
  '📋': `<rect x="10" y="10" width="44" height="50" rx="4" fill="${BOIS}"/><rect x="16" y="18" width="32" height="36" fill="${W}"/><rect x="24" y="4" width="16" height="12" rx="3" fill="${G}"/><path d="M22 28h20M22 36h20M22 44h12"/>`,
  '📄': `<path d="M14 5h26l12 12v42H14z" fill="${W}"/><path d="M40 5v12h12M22 28h22M22 36h22M22 44h14"/>`,
  '✏️': `<g transform="rotate(-45 32 32)"><rect x="-2" y="24" width="12" height="16" rx="4" fill="${RO}"/><rect x="10" y="24" width="7" height="16" fill="${G}"/><rect x="17" y="24" width="34" height="16" fill="${J}"/><path d="M51 24l15 8-15 8z" fill="${BE}"/><path d="M60 28.800l6 3.200-6 3.200z" fill="${N}"/></g>`,
  // Loisirs
  '🎮': `<path d="M14 20h36c8 0 12 10 12 22 0 8-8 8-12 0l-2-4H16l-2 4c-4 8-12 8-12 0 0-12 4-22 12-22z" fill="${AR}"/><path d="M15 30h10M20 25v10" stroke="${W}"/>${pt(44, 27, 3, R)}${pt(50, 33, 3, BC)}`,
  '📺': `<path d="M22 56h20M32 48v8"/><rect x="6" y="12" width="52" height="36" rx="5" fill="${AR}"/><rect x="11" y="17" width="42" height="26" fill="${BC}"/>`,
  '📱': `<rect x="16" y="4" width="32" height="56" rx="6" fill="${AR}"/><rect x="20" y="10" width="24" height="38" fill="${BC}"/>${pt(32, 54, 2.5, W)}`,
  '🎧': `<path d="M10 40V30a22 22 0 0144 0v10" stroke="${GF}" style="stroke-width:4"/><rect x="6" y="36" width="12" height="20" rx="5" fill="${VI}"/><rect x="46" y="36" width="12" height="20" rx="5" fill="${VI}"/>`,
  '🎹': `<rect x="6" y="14" width="52" height="36" rx="4" fill="${W}"/><path d="M19 14v36M32 14v36M45 14v36"/>${[15, 28, 41].map((x) => `<rect x="${x}" y="14" width="8" height="20" fill="${N}" stroke="none"/>`).join('')}`,
  '🛒': `<path d="M4 10h8l8 30h30"/><path d="M15 18h41l-6 22H20z" fill="${BC}"/><circle cx="24" cy="52" r="5" fill="${AR}"/><circle cx="46" cy="52" r="5" fill="${AR}"/>`,
  '🚗': `<path d="M5 45V34l9-4 6-12h22l8 12 9 4v11z" fill="${R}"/><path d="M22 22h8v8H18zM34 22h7l5 8H34z" fill="${BC}"/><circle cx="18" cy="46" r="7" fill="${AR}"/><circle cx="46" cy="46" r="7" fill="${AR}"/>${pt(18, 46, 2.5, W)}${pt(46, 46, 2.5, W)}`,
  '🚃': `<path d="M18 50l-8 10M46 50l8 10M14 56h36"/><rect x="8" y="6" width="48" height="44" rx="8" fill="${VC}"/><rect x="14" y="14" width="36" height="14" fill="${BC}"/>${pt(20, 40, 3, J)}${pt(44, 40, 3, J)}`,
  '🩱': `<path d="M22 6v9c0 6-6 9-6 17l4 22c8-4 16-4 24 0l4-22c0-8-6-11-6-17V6h-5v8c0 5-10 5-10 0V6z" fill="${B}"/>`,
  '🧢': `<path d="M10 40a22 22 0 0144 0z" fill="${B}"/><path d="M10 40h50c0 6-10 8-24 8-10 0-22-2-26-8z" fill="${R}"/>`,
  '💳': `<rect x="4" y="14" width="56" height="36" rx="5" fill="${B}"/><path d="M4 26h56" style="stroke-width:6"/><rect x="10" y="36" width="14" height="8" fill="${J}"/>`,
  '🎉': `<path d="M8 56l12-34 22 22z" fill="${J}"/><path d="M36 14c2-4 6-6 10-4M48 30c4-2 8 0 10 4M40 4v6" stroke="${GF}"/>${pt(30, 10, 3, R)}${pt(54, 20, 3, B)}${pt(52, 44, 3, V)}${pt(44, 18, 2.5, VI)}`,
  '⛄': `<circle cx="32" cy="44" r="16" fill="${W}"/><circle cx="32" cy="20" r="12" fill="${W}"/>${oeil(28, 17, 2)}${oeil(36, 17, 2)}<path d="M32 21l8 3-8 2z" fill="${O}"/>${pt(32, 38, 2, N)}${pt(32, 46, 2, N)}`,
  // Personnes
  '🧒': personne(BR, 'court', B),
  '👦': personne(N, 'court', VC),
  '👧': personne(BR, 'long', RO),
  '🧑': personne(BR, 'court', O),
  '👨': personne(N, 'court', V),
  '👩': personne(N, 'long', R),
  '👴': personne(G, 'cotes', GF),
  '👵': personne(G, 'chignon', VI),
  '👥': `<circle cx="44" cy="24" r="9" fill="${VC}"/><path d="M30 56c0-10 6-16 14-16s16 6 16 16z" fill="${VC}"/><circle cx="22" cy="22" r="10" fill="${B}"/><path d="M4 56c0-12 8-18 18-18s18 6 18 18z" fill="${B}"/>`,
  '🤝': `<path d="M4 24l14-4 14 8 14-8 14 4v18l-12 2-16 10-16-10-12-2z" fill="${PEAU}"/><path d="M32 28l-8 8M32 28l8 8"/>`,
  '🐶': `<path d="M13 15c-7 4-9 17-5 26l9-7z" fill="${BR}"/><path d="M51 15c7 4 9 17 5 26l-9-7z" fill="${BR}"/><path d="M32 9c14 0 20 10 20 25 0 14-9 22-20 22S12 48 12 34C12 19 18 9 32 9z" fill="#e2b07a"/><ellipse cx="32" cy="43" rx="10" ry="8" fill="${W}"/>${oeil(24, 30)}${oeil(40, 30)}<path d="M28 38h8l-4 4z" fill="${N}"/><path d="M32 42v3M27 47c3 2 7 2 10 0"/>`,
  // Humeurs et réponses
  '🙂': visage(`${yeux}<path d="M22 40c6 6 14 6 20 0"/>`),
  '😊': visage(`${yeuxRieurs}<path d="M22 40c6 6 14 6 20 0"/>${pt(15, 38, 4, RO)}${pt(49, 38, 4, RO)}`),
  '😄': visage(`${yeuxRieurs}<path d="M18 36h28c0 10-6 16-14 16s-14-6-14-16z" fill="${W}"/>`),
  '😓': visage(`${yeux}<path d="M22 46c6-5 14-5 20 0"/>${goutte(51, 18, 1)}`),
  '😣': visage('<path d="M17 23l9 5-9 5M47 23l-9 5 9 5M22 45c3-3 6 3 10 0s7 3 10 0"/>'),
  '😥': visage(`${yeux}<path d="M17 21l9-3M47 21l-9-3M22 46c6-5 14-5 20 0"/>${goutte(50, 36, 0.9)}`),
  '🤔': visage(`${yeux}<path d="M36 19l11-3M24 44h14"/>`),
  '🤐': visage(`${yeux}<path d="M18 42h28M24 39v6M30 39v6M36 39v6M42 39v6"/>`),
  '🤧': visage(`${yeuxRieurs}<path d="M22 38h20v15H22z" fill="${W}"/>`),
  '🙆': `<path d="M9 40C5 2 59 2 55 40" stroke="${PEAU}" style="stroke-width:7"/><g transform="translate(8 16) scale(.75)">${visage(`${yeuxRieurs}<path d="M22 40c6 6 14 6 20 0"/>`)}</g>`,
  '🙋': `<path d="M54 40V8" stroke="${PEAU}" style="stroke-width:9"/><g transform="translate(2 16) scale(.75)">${visage(`${yeux}<path d="M22 40c6 6 14 6 20 0"/>`)}</g>`,
  '👍': `<path d="M22 28l8-18c5 0 7 4 6 8l-2 8h14c4 0 6 3 5 6l-4 18c-1 4-3 6-7 6H22z" fill="${PEAU}"/><rect x="8" y="28" width="14" height="28" rx="3" fill="${B}"/>`,
  '❔': `<circle cx="32" cy="32" r="26" fill="${W}"/><text x="32" y="44" text-anchor="middle" style="font-size:34px;font-weight:700" fill="${GF}" stroke="none">?</text>`,
  // Divers
  '📨': `<rect x="6" y="14" width="52" height="38" rx="4" fill="${W}"/><path d="M6 18l26 20 26-20"/>`,
  '⏰': reveil,
  '🕐': reveil,
  '🎤': `<path d="M16 28a16 16 0 0032 0M32 44v12M22 58h20" stroke="${GF}" style="stroke-width:4"/><rect x="24" y="6" width="16" height="30" rx="8" fill="${G}"/>`,
  '📷': `<path d="M22 18l4-8h12l4 8z" fill="${AR}"/><rect x="6" y="18" width="52" height="36" rx="6" fill="${AR}"/><circle cx="32" cy="36" r="11" fill="${BC}"/>`,
  '🖼️': `<rect x="6" y="10" width="52" height="44" fill="${BR}"/><rect x="12" y="16" width="40" height="32" fill="${BC}"/><path d="M12 48l12-14 8 8 8-12 12 18z" fill="${VC}"/>`,
};

const CADRE = `fill="none" stroke="${N}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
const sansVariante = (e) => e.replace(/️/g, '');
const PAR_CLE = new Map(Object.entries(DESSINS).map(([e, d]) => [sansVariante(e), d]));
const echapperRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UN = [...PAR_CLE.keys()].sort((a, b) => b.length - a.length).map(echapperRegex).join('|');
const QUE_DES_DESSINS = new RegExp(`^\\s*(?:(?:${UN})\\uFE0F?\\s*)+$`, 'u');
const CHAQUE = new RegExp(`(${UN})\\uFE0F?`, 'gu');

export const svgObjet = (emoji) => {
  const d = PAR_CLE.get(sansVariante(emoji));
  return d ? `<svg class="objet-dessin" viewBox="0 0 64 64" ${CADRE} aria-hidden="true">${d}</svg>` : '';
};

// Un texte fait seulement d'emoji connus (🏫, ou « 🎮📺 ») devient ses dessins ; tout autre texte ne change pas.
function dessinerTexte(noeud) {
  const texte = noeud.nodeValue;
  if (!texte || texte.length > 40 || !QUE_DES_DESSINS.test(texte)) return;
  const parent = noeud.parentNode;
  if (!parent || parent.closest('svg, textarea, [contenteditable], .sans-dessin')) return;
  const modele = document.createElement('template');
  modele.innerHTML = texte.replace(CHAQUE, (m, e) => svgObjet(e)).trim();
  noeud.replaceWith(modele.content);
}

function dessinerDans(racine) {
  if (racine.nodeType === Node.TEXT_NODE) { dessinerTexte(racine); return; }
  if (racine.nodeType !== Node.ELEMENT_NODE) return;
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  const noeuds = [];
  while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
  noeuds.forEach(dessinerTexte);
}

// À appeler une fois au démarrage : tout ce qui s'affiche ensuite est dessiné avant d'être peint.
export function installerDessins() {
  dessinerDans(document.body);
  new MutationObserver((mutations) => {
    mutations.forEach((mu) => {
      if (mu.type === 'characterData') dessinerTexte(mu.target);
      else mu.addedNodes.forEach(dessinerDans);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
