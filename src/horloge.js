/* ======================================================================
   Montrer le temps sans savoir lire l'heure :
   - l'horloge à aiguilles, avec une part de couleur jusqu'à la fin de l'activité
     (comme on l'apprend en classe : « ながい はりが 10に きたら おわり ») ;
   - une barre qui diminue.
   ====================================================================== */

const R = 92;
const point = (angle, r) => {
  const a = (angle - 90) * Math.PI / 180;
  return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
};
const f = (n) => n.toFixed(1);

function secteur(a0, a1, r) {
  let d = a1 - a0;
  if (d <= 0) d += 360;
  if (d >= 359.9) return `<circle cx="100" cy="100" r="${r}"/>`;
  const [x0, y0] = point(a0, r);
  const [x1, y1] = point(a0 + d, r);
  return `<path d="M100 100 L${f(x0)} ${f(y0)} A${r} ${r} 0 ${d > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)} Z"/>`;
}

// maintenant, fin : minutes depuis minuit (fin peut être null).
export function svgHorloge(maintenant, fin, { titre = '' } = {}) {
  const m = maintenant % 60;
  const h = (maintenant / 60) % 12;
  const angleMin = m * 6;
  const angleH = h * 30;
  let part = '';
  let repere = '';
  if (fin !== null && fin !== undefined && fin > maintenant) {
    const reste = fin - maintenant;
    if (reste <= 60) {
      // Moins d'une heure : la part va de la grande aiguille à sa place à la fin (comme un minuteur).
      const aFin = (fin % 60) * 6;
      part = `<g class="h-part">${secteur(angleMin, reste >= 60 ? angleMin + 360 : aFin, R - 6)}</g>`;
      const [x, y] = point(aFin, R - 2);
      const [x2, y2] = point(aFin, R - 20);
      repere = `<line class="h-repere" x1="${f(x)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
    } else {
      // Plus d'une heure : la part va de la petite aiguille à sa place à la fin.
      const aFin = ((fin / 60) % 12) * 30;
      part = `<g class="h-part h-part-longue">${secteur(angleH, reste >= 720 ? angleH + 360 : aFin, R - 6)}</g>`;
    }
  }
  let graduations = '';
  for (let i = 0; i < 60; i++) {
    const grande = i % 5 === 0;
    const [x1, y1] = point(i * 6, R - 2);
    const [x2, y2] = point(i * 6, R - (grande ? 13 : 7));
    graduations += `<line class="${grande ? 'h-grad-g' : 'h-grad'}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  }
  let chiffres = '';
  for (let i = 1; i <= 12; i++) {
    const [x, y] = point(i * 30, R - 27);
    chiffres += `<text x="${f(x)}" y="${f(y + 7)}">${i}</text>`;
  }
  const [hx, hy] = point(angleH, 48);
  const [mx, my] = point(angleMin, 74);
  return `<svg class="horloge" viewBox="0 0 200 200" role="img" aria-label="${titre}">`
    + `<circle class="h-fond" cx="100" cy="100" r="${R}"/>${part}${graduations}${repere}<g class="h-chiffres">${chiffres}</g>`
    + `<line class="h-aiguille-h" x1="100" y1="100" x2="${f(hx)}" y2="${f(hy)}"/>`
    + `<line class="h-aiguille-m" x1="100" y1="100" x2="${f(mx)}" y2="${f(my)}"/>`
    + '<circle class="h-centre" cx="100" cy="100" r="6"/></svg>';
}

// « ながい はりが 10に きたら おわり » : seulement pour une fin à 5 minutes près, dans moins d'une heure.
export function repereGrandeAiguille(maintenant, fin) {
  if (fin === null || fin === undefined || fin <= maintenant || fin - maintenant > 60) return null;
  const m = fin % 60;
  if (m % 5) return null;
  return m === 0 ? 12 : m / 5;
}

export const barre = (reste, total) => {
  const p = total > 0 ? Math.max(0, Math.min(1, reste / total)) : 0;
  return `<div class="barre" role="presentation"><span style="width:${(p * 100).toFixed(1)}%"></span></div>`;
};
