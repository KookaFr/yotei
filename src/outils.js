/* ==========================================================================
   よてい — petits outils communs
   ========================================================================== */

export const $ = (id) => document.getElementById(id);
export const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Crée un élément : el('button', { class: 'btn', text: 'OK', onclick }, enfant1, enfant2…)
export function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === false) return;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  });
  enfants.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) e.append(c); });
  return e;
}

export const uid = (p = 'a') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export const copie = (o) => JSON.parse(JSON.stringify(o));
