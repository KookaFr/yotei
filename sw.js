/* よてい : fonctionnement hors ligne.
   VERSION change à chaque mise à jour (npm run version-sw) : le nouveau cache se remplit, puis la page
   propose « あたらしく する » ; l'ancienne version reste servie jusqu'à ce qu'on accepte. */
const VERSION = 'yotei-v4-17a5527';
const FICHIERS = [
  './index.html', './yotei.css', './manifest.webmanifest',
  './icone.svg', './icone-180.png', './icone-192.png', './icone-512.png', './icone-maskable-512.png',
  './polices/BIZUDPGothic-Regular.woff2', './polices/BIZUDPGothic-Bold.woff2',
  './src/app.js', './src/catalogue.js', './src/choix-carte.js', './src/donnees.js', './src/heure.js', './src/horloge.js',
  './src/journee.js', './src/nav.js', './src/outils.js', './src/parents.js', './src/photos.js', './src/plateforme.js',
  './src/reglages.js', './src/tactile.js', './src/texte.js', './src/ui.js', './src/voix.js',
  './src/vues/etapes.js', './src/vues/jour.js', './src/vues/mois.js', './src/vues/recit.js', './src/vues/semaine.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith('yotei-') && c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'activer') self.skipWaiting();
});

self.addEventListener('fetch', (ev) => {
  const requete = ev.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== self.location.origin) return;
  const cle = requete.mode === 'navigate' ? './index.html' : requete;
  ev.respondWith(caches.open(VERSION).then(async (cache) => {
    const enCache = await cache.match(cle, { ignoreSearch: true });
    if (enCache) return enCache;
    return fetch(requete).catch(() => Response.error());
  }));
});
