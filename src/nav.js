/* Navigation entre les vues : app.js remplit ces fonctions (évite les imports en boucle). */
export const nav = {
  rafraichir: () => {},          // redessiner la vue actuelle
  jour: (_d) => {},              // ouvrir le programme d'une date
  recit: (_d) => {},             // ouvrir la ふりかえり d'une date
  etapes: (_idRoutine, _fin, _date) => {},  // lancer des étapes ; fin() quand tout est fait
};
