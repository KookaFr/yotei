/* ======================================================================
   Réglages (gardés sur l'appareil)
   ====================================================================== */

const CLE_REGLAGES = 'yotei.reglages';
export const ONGLETS = ['jour', 'semaine', 'mois', 'etapes', 'recit'];
const DEFAUT = {
  ecriture: 'hiragana',   // hiragana | kanji (avec furigana)
  // L'heure, de trois façons (on ne sait pas encore laquelle il lit) : on peut en masquer.
  horloge: true,          // horloge à aiguilles, avec la part de temps qui reste
  chiffres: true,         // 9:50 et sa lecture en hiragana
  barre: true,            // une barre qui diminue (pas besoin de lire l'heure)
  format24: false,        // 15:30 au lieu de ごご 3:30
  annonces: true,         // dire « 〜の じかんだよ » quand une activité commence (appli ouverte)
  preavis: 5,             // minutes : « あと 5ふんで おわり » (0 : jamais)
  sons: true,
  vitesse: 0.9,
  voixGenre: 'femme',
  voixNom: '',
  eleve: 'deplacer',      // ce que l'élève peut changer : 'rien' | 'ajouter' | 'deplacer'
  photos: true,           // proposer une photo quand une activité est finie
  garderPhotos: 60,       // jours (0 : toujours)
  onglets: [...ONGLETS],
  feries: true,           // jours fériés japonais : journée « やすみ »
  dureeAppui: 0,          // ms : le doigt doit rester posé ce temps
  antiRebond: 300,        // ms : touchers suivants ignorés
  ecranAllume: false,     // empêcher l'écran de s'éteindre sur 「きょう」
  animationsReduites: false,
  toucherLire: true,      // toucher un texte le fait lire ; bouton 👆
  langue: (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'fr',
  version: 1,
};

function lireReglages() {
  try {
    const stocke = JSON.parse(localStorage.getItem(CLE_REGLAGES) || '{}');
    const r = { ...DEFAUT, ...stocke, version: DEFAUT.version };
    r.onglets = ONGLETS.filter((o) => (Array.isArray(r.onglets) ? r.onglets : ONGLETS).includes(o));
    if (!r.onglets.length) r.onglets = ['jour'];
    return r;
  } catch {
    return { ...DEFAUT };
  }
}

export let reglages = lireReglages();
export const reglagesParDefaut = () => ({ ...DEFAUT });

export function ecrireReglages(modifs) {
  reglages = { ...reglages, ...modifs };
  try { localStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages)); } catch { /* stockage indisponible */ }
}

export function remplacerReglages(r) {
  reglages = { ...DEFAUT, ...r, version: DEFAUT.version };
  ecrireReglages({});
}
