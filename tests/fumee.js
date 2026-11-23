/* Test de fumée : chaque onglet sur cinq formats d'écran, à trois moments de la journée (école, après l'école,
   nuit), puis un parcours (cocher, étapes, ふりかえり). Vérifie : aucune erreur JavaScript, aucun débordement
   horizontal, aucun texte coupé dans un bouton. Lancer : npm test   (le serveur local démarre tout seul). */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 8126;
const URL = `http://localhost:${PORT}/index.html`;
const FORMATS = {
  ipad: { width: 1180, height: 820 },
  samsung: { width: 384, height: 780 },
  android: { width: 360, height: 740 },
  galaxy: { width: 320, height: 658 },
  paysage: { width: 780, height: 360 },
};
const MOMENTS = ['2026-11-25T10:25:00+09:00', '2026-11-25T16:35:00+09:00', '2026-11-23T23:10:00+09:00'];

function serveur() {
  const racine = path.join(__dirname, '..');
  const proc = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: racine, stdio: 'ignore' });
  return new Promise((ok, ko) => {
    let essais = 0;
    const tenter = () => http.get(URL, (r) => { r.resume(); ok(proc); }).on('error', () => (essais++ < 40 ? setTimeout(tenter, 100) : ko(new Error('serveur injoignable'))));
    tenter();
  });
}

const controler = (page) => page.evaluate(() => {
  const horizontal = document.documentElement.scrollWidth > window.innerWidth;
  const coupes = [...document.querySelectorAll('button')]
    .filter((b) => b.offsetParent !== null && b.scrollWidth > b.clientWidth + 4)
    .map((b) => `${b.className} « ${b.textContent.trim().slice(0, 24)} » ${b.scrollWidth}>${b.clientWidth}`);
  return { horizontal, coupes };
});

(async () => {
  const proc = await serveur();
  const navigateur = await chromium.launch();
  const problemes = [];
  let ecrans = 0;
  try {
    for (const [nom, taille] of Object.entries(FORMATS)) {
      for (const moment of MOMENTS) {
        const ctx = await navigateur.newContext({ viewport: taille, timezoneId: 'Asia/Tokyo', locale: 'ja-JP', hasTouch: true });
        const page = await ctx.newPage();
        page.on('pageerror', (e) => problemes.push(`${nom} ${moment} : ${e}`));
        await page.clock.install({ time: new Date(moment) });
        await page.goto(URL);
        await page.waitForTimeout(400);
        const verifier = async (ou) => {
          ecrans += 1;
          const r = await controler(page);
          if (r.horizontal) problemes.push(`${nom} ${moment} ${ou} : débordement horizontal`);
          r.coupes.forEach((c) => problemes.push(`${nom} ${moment} ${ou} : bouton coupé ${c}`));
        };
        await verifier('きょう');
        for (let i = 1; i < 5; i++) {
          await page.locator('.onglet').nth(i).click();
          await page.waitForTimeout(150);
          await verifier(`onglet ${i}`);
          if (i === 1) {
            await page.locator('.chip', { hasText: 'くわしく' }).click();
            await verifier('こんしゅう くわしく');
            await page.locator('.bloc').first().click();
            await page.waitForTimeout(200);
            await verifier('こんしゅう lieu');
            await page.keyboard.press('Escape');
            await page.locator('.chip', { hasText: 'かんたん' }).click();
          }
        }
        await page.locator('.onglet').first().click();
        const ajout = page.locator('.pied-jour .btn', { hasText: 'いれる' });
        if (await ajout.count()) {
          await ajout.click();
          await page.waitForTimeout(200);
          await verifier('いれる');
          await page.keyboard.press('Escape');
        }
        const fait = page.locator('.maintenant .btn-fait');
        if (await fait.count()) {
          await fait.click();
          await page.waitForTimeout(200);
          await verifier('おわった？');
          await page.locator('.verif-actions .btn-fait').click();
          await page.waitForTimeout(900);
          await verifier('photo ?');
          await page.keyboard.press('Escape');
          await page.locator('.onglet').nth(4).click();
          const debut = page.locator('.actions-recit .btn').first();
          if (await debut.count()) {
            await debut.click();
            await page.waitForTimeout(200);
            await verifier('ふりかえり');
            await page.keyboard.press('Escape');
          }
        }
        await page.locator('.onglet').nth(3).click();
        await page.locator('.tuile-routine').first().click();
        await page.waitForTimeout(150);
        await verifier('てじゅん');
        await ctx.close();
      }
    }
  } finally {
    await navigateur.close();
    proc.kill();
  }
  console.log(`${ecrans} écrans vérifiés.`);
  if (problemes.length) {
    console.log(problemes.join('\n'));
    process.exit(1);
  }
  console.log('Aucun problème.');
})();
