/* ======================================================================
   「ふりかえり」 : le soir, revoir sa journée en images pour la raconter.
   Une activité finie à la fois : sa photo (ou son image), l'heure, une phrase au passé
   (« さぎょうを しました。 »), et comment c'était (たのしかった, ふつう, つかれた, いやだった).
   À la fin : une image de la journée à envoyer à la famille (LINE, e-mail…).
   ====================================================================== */

import { noter } from '../donnees.js';
import {
  ajouterJours, aujourdhui, cle, JOURS_SEMAINE, yomiDate,
} from '../heure.js';
import { deroulement, recitDe } from '../journee.js';
import { el } from '../outils.js';
import { chargerPhotos, nouvellePhoto, supprimerPhoto, urlPhoto } from '../photos.js';
import { plateforme } from '../plateforme.js';
import { reglages } from '../reglages.js';
import { activable } from '../tactile.js';
import { brut, html, lu } from '../texte.js';
import {
  bouton, fermerPlein, heureHtml, heureLue, ICONE_DROITE, ICONE_ENVOYER, ICONE_FERMER, ICONE_GALERIE, ICONE_GAUCHE, ICONE_HP,
  ICONE_PHOTO, message, nomHtml, nomLu, ouvrirPlein, visuel,
} from '../ui.js';
import { lireElement, parler, sons } from '../voix.js';
import { activitesEcole, ecoleDu, lancerEcole } from './ecole.js';
import { dateHtml } from './jour.js';

export const HUMEURS = [
  { id: 'tanoshii', emoji: '😄', texte: '楽《たの》しかった' },
  { id: 'futsu', emoji: '🙂', texte: 'ふつう' },
  { id: 'tsukareta', emoji: '😓', texte: 'つかれた' },
  { id: 'iya', emoji: '😣', texte: 'いやだった' },
];
const humeur = (id) => HUMEURS.find((h) => h.id === id) || null;

let dateRecit = null;
export const choisirDateRecit = (d) => { dateRecit = d; };

const faits = (d) => deroulement(d).items.filter((it) => it.fait);
// La phrase du soir (avec ce qu'il a fait pendant un 自由時間 : 「自由時間に テレビを 見ました。」).
const phrase = (it) => (recitDe(it) ? lu(recitDe(it)) : `${nomLu(it.carte)}。`);

export function rendreRecit(conteneur) {
  const d = dateRecit || aujourdhui();
  const page = el('div', { class: 'page-recit' });
  const tete = el('div', { class: 'tete-periode' });
  const auj = cle(d) === cle(aujourdhui());
  tete.append(
    bouton('まえの 日《ひ》', () => { dateRecit = ajouterJours(d, -1); rendreRecit(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_GAUCHE }),
    el('h2', { class: 'titre-periode', 'data-lire': `${auj ? 'きょう。 ' : ''}${yomiDate(d)}`, html: `${auj ? `<span class="periode-nom">${html('今日《きょう》')}</span>` : ''}<span class="periode-dates">${dateHtml(d)}</span>` }),
  );
  const suiv = bouton('つぎの 日《ひ》', () => { dateRecit = ajouterJours(d, 1); rendreRecit(conteneur); }, { classe: 'btn-rond btn-fleche', icone: ICONE_DROITE });
  suiv.disabled = auj;
  tete.append(suiv);
  page.append(tete);

  // Le retour de l'école de ce jour : le faire, ou relire ce qu'il a dit.
  if (activitesEcole(d).length && reglages.ecoleQuestions) {
    const fait = ecoleDu(d) && ecoleDu(d).fini;
    page.append(bouton(fait ? '学校《がっこう》の ふりかえり（もう いちど）' : '学校《がっこう》の ふりかえり',
      () => lancerEcole(d, () => rendreRecit(conteneur)), { classe: `btn btn-large${fait ? '' : ' btn-principal'} btn-ecole`, icone: '<i class="ecole-emoji" aria-hidden="true">🏫</i>' }));
  }
  const items = faits(d);
  if (!items.length) {
    page.append(el('p', { class: 'vide', 'data-lire': 'まだ おわった ことが ないよ。 きょうの よていで 「おわった」を おしてね。',
      html: html('まだ おわった ことが ないよ。 「今日《きょう》」で 「おわった」を おしてね。') }));
    conteneur.replaceChildren(page);
    return;
  }
  const actions = el('div', { class: 'actions-recit' });
  actions.append(
    bouton('はじめる', () => diaporama(d, 0), { classe: 'btn btn-principal btn-large', icone: ICONE_DROITE }),
    bouton('おくる', () => envoyer(d), { classe: 'btn btn-large', icone: ICONE_ENVOYER }),
  );
  page.append(actions);
  const grille = el('div', { class: 'grille-recit' });
  items.forEach((it, i) => {
    const h = humeur(it.note && it.note.humeur);
    const b = el('button', {
      type: 'button', class: `tuile-recit lieu-${it.carte.lieu}`,
      'aria-label': `${phrase(it)}${h ? ` ${lu(h.texte)}` : ''}`,
      html: `<span class="tr-image">${it.note && it.note.photo ? `<img data-photo="${it.note.photo}" alt="">` : visuel(it.carte, 'grand')}</span>`
        + `<span class="tr-legende"><span class="tr-heure">${it.debut !== null ? heureHtml(it.debut) : ''}</span><span class="tr-nom">${nomHtml(it.carte)}</span>`
        + `${h ? `<span class="tr-humeur" aria-hidden="true">${h.emoji}</span>` : ''}</span>`,
    });
    activable(b, () => diaporama(d, i));
    grille.append(b);
  });
  page.append(grille);
  conteneur.replaceChildren(page);
  chargerPhotos(page);
}

/* ----- Une activité à la fois ----- */

export function diaporama(d, depart = 0) {
  let i = depart;
  const ecran = el('section', { class: 'lecteur diaporama' });
  const tete = el('header', { class: 'lecteur-tete' });
  const quitter = el('button', { type: 'button', class: 'btn-rond', 'aria-label': 'おわる', html: ICONE_FERMER });
  activable(quitter, () => { fermerPlein(); rafraichirApres(); }, { garde: false });
  tete.append(quitter, el('h2', { class: 'lecteur-titre', html: `${dateHtml(d)}`, 'data-lire': yomiDate(d) }));
  const frise = el('ol', { class: 'frise' });
  const corps = el('div', { class: 'lecteur-corps' });
  const pied = el('footer', { class: 'lecteur-pied' });
  ecran.append(tete, frise, corps, pied);
  let items = faits(d);
  items.forEach(() => frise.append(el('li')));

  const afficher = () => {
    items = faits(d);
    const it = items[i];
    if (!it) { fin(); return; }
    frise.querySelectorAll('li').forEach((li, j) => { li.className = j < i ? 'fait' : (j === i ? 'actuel' : ''); });
    const photo = it.note && it.note.photo;
    const h = humeur(it.note && it.note.humeur);
    const parole = `${it.debut !== null ? `${heureLue(it.debut)}。 ` : ''}${phrase(it)}`;
    const carte = el('div', { class: `diapo lieu-${it.carte.lieu}` });
    carte.innerHTML = `<div class="diapo-image">${photo ? `<img data-photo="${photo}" alt="">` : visuel(it.carte, 'enorme')}</div>`
      + `<p class="diapo-heure">${it.debut !== null ? heureHtml(it.debut) : ''}</p>`
      + `<p class="diapo-phrase" data-lire="${parole}">${html(recitDe(it) || it.carte.nom)}</p>`;
    const sentiments = el('div', { class: 'humeurs', role: 'group', 'aria-label': 'どうだった？' });
    sentiments.append(el('p', { class: 'humeurs-question', 'data-lire': 'どうだった？', html: html('どうだった？') }));
    HUMEURS.forEach((x) => {
      const b = el('button', {
        type: 'button', class: `humeur${h && h.id === x.id ? ' choisie' : ''}`, 'aria-label': lu(x.texte), 'aria-pressed': String(Boolean(h && h.id === x.id)),
        html: `<span aria-hidden="true">${x.emoji}</span><small>${html(x.texte)}</small>`,
      });
      activable(b, () => {
        noter(d, it.act.id, { humeur: x.id });
        sons.page();
        // 「たのしかったね」, mais 「ふつうだったね」 (pas 「ふつうね」).
        parler(/[たい]$/.test(lu(x.texte)) ? `${lu(x.texte)}ね。` : `${lu(x.texte)}だったね。`);
        afficher();
      });
      sentiments.append(b);
    });
    carte.append(sentiments);
    if (!photo && reglages.photos && !it.carte.sansPhoto) {
      const ajout = el('div', { class: 'diapo-ajout' });
      ajout.append(
        bouton('写真《しゃしん》を とる', () => photographier(d, it, 'camera'), { classe: 'btn', icone: ICONE_PHOTO }),
        bouton('えらぶ', () => photographier(d, it, 'galerie'), { classe: 'btn', icone: ICONE_GALERIE }),
      );
      carte.append(ajout);
    }
    corps.replaceChildren(carte);
    chargerPhotos(corps);
    pied.replaceChildren(
      bouton('まえ', () => { if (i > 0) { i -= 1; afficher(); } }, { classe: 'btn btn-large', icone: ICONE_GAUCHE }),
      bouton('きく', () => lireElement(carte.querySelector('.diapo-phrase')), { classe: 'btn-rond btn-ecouter', icone: ICONE_HP, options: { garde: false } }),
      bouton('つぎ', () => { i += 1; if (i < items.length) afficher(); else fin(); }, { classe: 'btn btn-principal btn-large', icone: ICONE_DROITE }),
    );
    pied.firstChild.disabled = i === 0;
    parler(parole);
  };

  const photographier = async (dd, it, source) => {
    const id = await nouvellePhoto(source, 'journal');
    if (!id) return;
    const ancienne = it.note && it.note.photo;
    noter(dd, it.act.id, { photo: id });
    if (ancienne) supprimerPhoto(ancienne);
    afficher();
  };

  const fin = () => {
    sons.fin();
    frise.querySelectorAll('li').forEach((li) => { li.className = 'fait'; });
    const n = faits(d).length;
    corps.replaceChildren(el('div', {
      class: 'etape etape-bravo', 'data-lire': `きょうは ${n}こ できたね。 おうちの ひとに みせよう！`,
      html: `<span class="visuel enorme" aria-hidden="true">🌟</span><p class="etape-texte">${html(`${n}こ できたね。`)}</p>`
        + `<p class="etape-sous">${html('お家《うち》の 人《ひと》に 見《み》せよう！')}</p>`,
    }));
    pied.replaceChildren(
      bouton('おくる', () => envoyer(d), { classe: 'btn btn-large', icone: ICONE_ENVOYER }),
      bouton('おわる', () => { fermerPlein(); rafraichirApres(); }, { classe: 'btn btn-principal btn-large' }),
    );
    parler(`きょうは ${n}こ できたね。 おうちの ひとに みせよう！`);
  };

  ouvrirPlein(ecran);
  afficher();
}

let rafraichirApres = () => {};
export const definirRafraichir = (fn) => { rafraichirApres = fn; };

/* ----- L'image de la journée, à envoyer ----- */

const chargerImage = (url) => new Promise((resoudre) => {
  const img = new Image();
  img.onload = () => resoudre(img);
  img.onerror = () => resoudre(null);
  img.src = url;
});

function arrondi(cx, x, y, w, h, r) {
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.arcTo(x + w, y, x + w, y + h, r);
  cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r);
  cx.arcTo(x, y, x + w, y, r);
  cx.closePath();
}

const COULEURS = { gakko: '#2b62c4', ie: '#c8641a', soto: '#2b7d48' };
const POLICE = '"BIZ UDPGothic", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

export async function imageJournee(d) {
  const items = faits(d);
  try { await document.fonts.load(`700 40px ${POLICE}`); } catch { /* police système */ }
  const W = 1080;
  const marge = 48;
  const gap = 28;
  const tw = (W - 2 * marge - gap) / 2;
  const ih = Math.round(tw * 0.75);
  const lh = 120;
  const lignes = Math.max(1, Math.ceil(items.length / 2));
  const H = 190 + lignes * (ih + lh + gap) + 60;
  const toile = document.createElement('canvas');
  toile.width = W;
  toile.height = H;
  const cx = toile.getContext('2d');
  cx.fillStyle = '#fffdf6';
  cx.fillRect(0, 0, W, H);
  cx.fillStyle = '#1d2427';
  cx.font = `700 56px ${POLICE}`;
  cx.textBaseline = 'alphabetic';
  const titre = `${d.getMonth() + 1}がつ ${d.getDate()}にち（${brut(JOURS_SEMAINE[d.getDay()].court)}）の ふりかえり`;
  cx.fillText(titre, marge, 110, W - 2 * marge);
  for (let n = 0; n < items.length; n++) {
    const it = items[n];
    const x = marge + (n % 2) * (tw + gap);
    const y = 160 + Math.floor(n / 2) * (ih + lh + gap);
    cx.save();
    arrondi(cx, x, y, tw, ih + lh, 24);
    cx.fillStyle = '#ffffff';
    cx.fill();
    cx.lineWidth = 6;
    cx.strokeStyle = COULEURS[it.carte.lieu] || '#85908a';
    cx.stroke();
    cx.clip();
    const url = it.note && it.note.photo ? await urlPhoto(it.note.photo) : (it.carte.photo ? await urlPhoto(it.carte.photo) : null);
    const img = url ? await chargerImage(url) : null;
    if (img) {
      const k = Math.max(tw / img.naturalWidth, ih / img.naturalHeight);
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      cx.drawImage(img, x + (tw - w) / 2, y + (ih - h) / 2, w, h);
    } else {
      cx.fillStyle = '#f3f1ea';
      cx.fillRect(x, y, tw, ih);
      cx.font = `${Math.round(ih * 0.55)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillStyle = '#000';
      cx.fillText(it.carte.emoji || '⭐', x + tw / 2, y + ih / 2 + 8);
      cx.textAlign = 'left';
      cx.textBaseline = 'alphabetic';
    }
    cx.restore();
    cx.fillStyle = '#566164';
    cx.font = `700 30px ${POLICE}`;
    const heure = it.debut !== null ? `${Math.floor(it.debut / 60)}:${String(it.debut % 60).padStart(2, '0')}` : '';
    if (heure) cx.fillText(heure, x + 22, y + ih + 44);
    cx.fillStyle = '#1d2427';
    let taille = 40;
    const nom = `${brut(it.carte.nom)}${it.loisirs && it.loisirs.length ? ` ${it.loisirs.map((l) => l.emoji || '').join('')}` : ''}`;
    cx.font = `700 ${taille}px ${POLICE}`;
    while (cx.measureText(nom).width > tw - 110 && taille > 24) {
      taille -= 2;
      cx.font = `700 ${taille}px ${POLICE}`;
    }
    cx.fillText(nom, x + 22, y + ih + 96, tw - 110);
    const h = humeur(it.note && it.note.humeur);
    if (h) {
      cx.font = '64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      cx.fillText(h.emoji, x + tw - 86, y + ih + 92);
    }
  }
  cx.fillStyle = '#85908a';
  cx.font = `400 26px ${POLICE}`;
  cx.fillText('よてい', marge, H - 26);
  return new Promise((resoudre) => toile.toBlob((b) => resoudre(b), 'image/png'));
}

async function envoyer(d) {
  message('じゅんびして いるよ…');
  const blob = await imageJournee(d);
  if (!blob) return;
  const res = await plateforme.fichiers.partager(`yotei-${cle(d)}.png`, blob, 'ふりかえり');
  if (res === 'enregistre') message('画像《がぞう》を ほぞんしたよ。');
}
