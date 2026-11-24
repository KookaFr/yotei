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
const MOMENTS = ['2026-11-25T10:25:00+09:00', '2026-11-25T16:35:00+09:00', '2026-11-23T23:10:00+09:00', '2026-11-24T00:30:00+09:00'];

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

// Chaque module de src/ doit être dans la liste du service worker (sinon l'appli ne marche pas hors ligne).
const fs = require('fs');
function modulesManquants() {
  const racine = path.join(__dirname, '..');
  const sw = fs.readFileSync(path.join(racine, 'sw.js'), 'utf8');
  const lister = (d) => fs.readdirSync(path.join(racine, d), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? lister(`${d}/${e.name}`) : (e.name.endsWith('.js') ? [`${d}/${e.name}`] : [])));
  return lister('src').filter((f) => !sw.includes(`'./${f}'`));
}

// La feuille de style : une accolade en trop ou en moins fait ignorer la règle suivante par le navigateur
// (v19 : la grille de てじゅん avait disparu). On compte les blocs du fichier, puis les règles que le navigateur a lues.
function blocsCss() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'yotei.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  let niveau = 0;
  let blocs = 0;
  for (const ch of css) {
    if (ch === '{') { niveau += 1; blocs += 1; }
    if (ch === '}') { niveau -= 1; if (niveau < 0) return { erreur: 'accolade fermante en trop' }; }
  }
  if (niveau !== 0) return { erreur: `${niveau} accolade(s) non fermée(s)` };
  return { blocs };
}
const reglesLues = (page) => page.evaluate(() => {
  const compter = (regles) => [...regles].reduce((n, r) => n + 1 + (r.cssRules ? compter(r.cssRules) : 0), 0);
  const feuille = [...document.styleSheets].find((f) => f.href && f.href.includes('yotei.css'));
  return feuille ? compter(feuille.cssRules) : -1;
});

(async () => {
  const manquants = modulesManquants();
  if (manquants.length) {
    console.log(`Absents de sw.js : ${manquants.join(', ')}`);
    process.exit(1);
  }
  const css = blocsCss();
  if (css.erreur) {
    console.log(`yotei.css : ${css.erreur}`);
    process.exit(1);
  }
  let cssVerifiee = false;
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
        if (!cssVerifiee) {
          cssVerifiee = true;
          const lues = await reglesLues(page);
          if (lues !== css.blocs) problemes.push(`yotei.css : ${css.blocs} blocs dans le fichier, ${lues} règles lues par le navigateur (une règle est ignorée)`);
        }
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
        // Retour de l'école : les premières questions.
        const invite = page.locator('.invite-ecole .btn-principal');
        if (await invite.count()) {
          await invite.click();
          await page.locator('.lecteur-pied .btn').click();
          await verifier('がっこう : humeur');
          await page.locator('.ecole-option').first().click();
          await page.locator('.lecteur-pied .btn-principal').click();
          await verifier('がっこう : moment');
          await page.locator('.lecteur-tete .btn-rond').click();
        }
        const ajout = page.locator('.pied-jour .btn', { hasText: 'いれる' });
        if (await ajout.count()) {
          await ajout.click();
          await page.waitForTimeout(200);
          await verifier('いれる');
          // Ranger テレビ dans un 自由時間 (si ce jour-là en a encore un).
          await page.locator('.tuile-carte', { hasText: 'テレビ' }).click();
          await page.locator('.choix-pied .btn').click();
          await page.waitForTimeout(150);
          const libre = page.locator('.place-libre:not([disabled])');
          if (await libre.count()) {
            await libre.first().click();
            await verifier('いれる 自由時間');
            await page.locator('.placer .choix-pied .btn').click();
            await page.waitForTimeout(250);
            if (!(await page.locator('.page-jour .loisir').count())) problemes.push(`${nom} ${moment} : テレビ absente du 自由時間`);
          } else await page.keyboard.press('Escape');
          // Ajouter ゲーム à la fin du soir (「べつの じかん」), puis la déplacer dans la liste (mode 「うごかす」).
          await ajout.click();
          await page.waitForTimeout(200);
          await page.locator('.tuile-carte', { hasText: 'ゲーム' }).click();
          await page.locator('.choix-pied .btn').click();
          await page.waitForTimeout(150);
          const autre = page.locator('.placer-autre');
          if (await autre.count()) await autre.click();
          const yoru = page.locator('.placer .chip', { hasText: 'よる' });
          if (await yoru.count()) await yoru.click();
          await page.locator('.placer .place').last().click();
          await page.locator('.placer .choix-pied .btn').click();
          await page.waitForTimeout(250);
          const tele = page.locator('.liste-jour .act-btn', { hasText: 'ゲーム' });
          // En journée, ゲーム (le soir) est dans la liste à venir ; la nuit, elle est déjà passée.
          const journee = moment.includes('T10:') || moment.includes('T16:');
          if (journee && !(await tele.count())) problemes.push(`${nom} ${moment} : ゲーム absente de la liste`);
          if (await tele.count()) {
            await tele.first().click();
            await page.waitForTimeout(200);
            await page.locator('.actions-feuille .btn', { hasText: 'うごかす' }).click();
            await page.waitForTimeout(300);
            await verifier('うごかす');
            if (!(await page.locator('.bandeau-deplacer').count())) problemes.push(`${nom} ${moment} : pas de mode うごかす`);
            if (journee && !(await page.locator('.place-dedans').count())) problemes.push(`${nom} ${moment} : pas de case 「自由時間に 入れる」`);
            const cases = page.locator('.liste-deplacement .place');
            if (await cases.count()) {
              await cases.first().click();
              await page.waitForTimeout(300);
              if (await page.locator('.bandeau-deplacer').count()) problemes.push(`${nom} ${moment} : うごかす ne se ferme pas`);
            } else await page.locator('.bandeau-deplacer .btn').click();
          }
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
