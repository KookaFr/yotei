/* ======================================================================
   「いつ する？」 : où mettre une activité que l'élève ajoute.
   Le jour (きょう, あした…), le moment (あさ, ひる, ごご, よる), puis la liste des activités
   de ce moment avec des cases 「＋ ここ」 entre elles : il touche la place (avant / après).
   S'il sait lire l'heure, il peut aussi fixer l'heure (− / ＋, par quarts d'heure).
   Un loisir (テレビ, ゲーム…) se range d'abord dans un 自由時間 de ce jour-là (「じゆう じかんに いれる？」) ;
   「べつの じかん」 garde le choix de la place (émission à heure fixe, jour sans temps libre).
   ====================================================================== */

import { carte, estCadreLibre, estLoisir } from '../donnees.js';
import {
  affichageHeure, ajouterJours, aujourdhui, cle, JOURS_SEMAINE, minutesMaintenant, versTexte,
} from '../heure.js';
import { deroulement, periodeDe, PERIODES } from '../journee.js';
import { el } from '../outils.js';
import { reglages } from '../reglages.js';
import { chargerPhotos } from '../photos.js';
import { activable } from '../tactile.js';
import { html, lu } from '../texte.js';
import {
  bouton, fermerFeuille, heureHtml, heureLue, ICONE_COCHE, nomHtml, nomLu, ouvrirFeuille, visuel,
} from '../ui.js';
import { parler } from '../voix.js';
import { nomJour } from '../choix-carte.js';

// surFin({ date, apres, avant, debut, dans, texte }) : apres / avant = id d'une activité ; debut = 'HH:MM' ou '' ;
// dans = id d'un 自由時間 où ranger le loisir.
// jourFixe : la date est déjà choisie (depuis le calendrier du mois) ; on ne montre pas les jours.
export function choisirPlace(dDepart, idCarte, surFin, { jourFixe = false } = {}) {
  const c = carte(idCarte);
  let jour = dDepart;
  let moment = null;
  let place = null;        // { apres } | { avant } | { fin: true }
  let heure = null;        // minutes, ou null (sans heure)
  let dans = null;         // id du 自由時間 choisi (loisir)
  let autre = false;       // 「べつの じかん」 : choisir une place comme pour une autre activité
  const contenu = el('div', { class: 'placer' });
  const loisir = estLoisir(c);

  const auj = () => cle(jour) === cle(aujourdhui());
  const momentsPossibles = () => PERIODES.filter((p) => !auj() || p.fin > minutesMaintenant());
  // Les activités du moment choisi (aujourd'hui : seulement celles qui ne sont pas passées).
  const activitesDuMoment = () => deroulement(jour).items
    .filter((it) => it.periode === moment && (!auj() || it.statut === 'maintenant' || it.statut === 'avenir'));

  // Les 自由時間 de ce jour (aujourd'hui : pas ceux qui sont finis).
  const cadres = () => (loisir ? deroulement(jour).items
    .filter((it) => estCadreLibre(it.carte) && (!auj() || it.statut === 'maintenant' || it.statut === 'avenir')) : []);
  const plageEff = (it) => (it.debutEff === null ? '' : `${heureHtml(it.debutEff)}${it.finEff !== null ? `<span class="kara">〜</span>${heureHtml(it.finEff, { sansMoment: (it.debutEff < 720) === (it.finEff < 720) })}` : ''}`);
  const contient = (it) => it.loisirs.some((l) => l.id === c.id);

  // Par défaut, aujourd'hui : dans le 自由時間 en cours (loisir), sinon juste après l'activité en cours.
  if (auj()) {
    const dr = deroulement(jour);
    if (loisir && dr.actuel && estCadreLibre(dr.actuel.carte) && !contient(dr.actuel)) dans = dr.actuel.act.id;
    if (dr.actuel) {
      moment = dr.actuel.periode;
      place = { apres: dr.actuel.act.id };
    } else moment = periodeDe(minutesMaintenant()).id;
  }

  const fantome = () => el('span', { class: `place-fantome lieu-${c.lieu}`, html: `${visuel(c)}<span>${nomHtml(c)}</span>${heure !== null ? `<small>${heureHtml(heure)}</small>` : ''}` });
  const memePlace = (p) => place && p && ((p.apres && p.apres === place.apres) || (p.avant && p.avant === place.avant) || (p.fin && place.fin));

  function dessiner() {
    contenu.replaceChildren();
    contenu.append(el('div', { class: `placer-carte lieu-${c.lieu}`, html: `${visuel(c, 'grand')}<span class="placer-nom">${nomHtml(c)}</span>` }));

    // Le jour (sauf si la date est déjà choisie).
    if (jourFixe) {
      const t = `${jour.getMonth() + 1}がつ ${jour.getDate()}にち（${JOURS_SEMAINE[jour.getDay()].court}）`;
      contenu.append(el('p', { class: `placer-date jour-${jour.getDay()}`, 'data-lire': lu(t), html: html(t, { mots: false }) }));
    } else {
      contenu.append(el('p', { class: 'cq-label', 'data-lire': 'いつ？', html: html('いつ？') }));
      const jours = el('div', { class: 'cq-chips' });
      for (let k = 0; k < 7; k++) {
        const d = ajouterJours(aujourdhui(), k);
        const b = el('button', {
          type: 'button', class: `chip jour-${d.getDay()}${cle(d) === cle(jour) ? ' chip-on' : ''}`, 'aria-pressed': String(cle(d) === cle(jour)),
          'aria-label': lu(nomJour(d)), html: `${html(nomJour(d, true), { mots: false })}<small>${d.getMonth() + 1}/${d.getDate()}</small>`,
        });
        activable(b, () => {
          jour = d;
          if (!momentsPossibles().some((p) => p.id === moment)) moment = null;
          place = null;
          dans = null;
          autre = false;
          dessiner();
          parler(lu(nomJour(d)));
        }, { garde: false });
        jours.append(b);
      }
      contenu.append(jours);
    }

    // Un loisir : d'abord les 自由時間 du jour.
    const libres = cadres();
    if (libres.length) {
      contenu.append(el('p', { class: 'cq-label', 'data-lire': 'じゆう じかんに いれる？', html: html('自由《じゆう》 時間《じかん》に 入《い》れる？') }));
      const boite = el('div', { class: 'places-libres' });
      libres.forEach((it) => {
        const deja = contient(it);
        const choisi = dans === it.act.id;
        const emojis = [...it.loisirs, ...(choisi ? [c] : [])].map((l) => l.emoji || '⭐').join('');
        const b = el('button', {
          type: 'button', class: `place-libre lieu-${it.carte.lieu}${choisi ? ' choisie' : ''}`, 'aria-pressed': String(choisi),
          'aria-label': `${it.debutEff !== null ? `${heureLue(it.debutEff)}からの ` : ''}${nomLu(it.carte)}${deja ? '。 もう はいって いるよ' : ''}`,
          html: `${visuel(it.carte)}<span class="pl-texte"><span class="pl-nom">${nomHtml(it.carte)}</span><span class="pl-heure">${plageEff(it)}</span></span>`
            + `<span class="pl-loisirs" aria-hidden="true">${emojis}</span>${choisi ? ICONE_COCHE : ''}`
            + `${deja ? `<small class="pl-deja">${html('もう 入《はい》って いるよ')}</small>` : ''}`,
        });
        if (deja) b.disabled = true;
        else {
          activable(b, () => {
            dans = it.act.id; place = null; heure = null; autre = false;
            dessiner();
            parler(`${it.debutEff !== null ? `${heureLue(it.debutEff)}からの ` : ''}${nomLu(it.carte)}に いれるね。`);
          }, { garde: false });
        }
        boite.append(b);
      });
      contenu.append(boite);
      if (!autre) {
        contenu.append(bouton('べつの 時間《じかん》に する', () => { autre = true; dans = null; dessiner(); parler('べつの じかんに するね。 いつ する？'); },
          { classe: 'btn placer-autre', icone: '<i aria-hidden="true">🕐</i>' }));
      }
    }

    const modePlace = !libres.length || autre;
    if (modePlace) dessinerPlace();

    // Valider.
    const cadre = dans ? libres.find((it) => it.act.id === dans) : null;
    const pret = cadre || (modePlace && (heure !== null || place));
    const enChiffres = (m) => { const a = affichageHeure(m, reglages.format24); return `${a.moment ? `${a.moment} ` : ''}${a.chiffres}`; };
    let texte = heure !== null ? `${enChiffres(heure)}に 入《い》れる` : (place ? 'ここに 入《い》れる' : 'どこに 入《い》れる？');
    if (cadre) texte = `${cadre.carte.nom}に 入《い》れる`;
    else if (!modePlace) texte = 'どれに 入《い》れる？';
    const ok = bouton(texte, () => {
      if (!pret) return;
      fermerFeuille();
      if (cadre) {
        surFin({ date: jour, dans: cadre.act.id, texte: `${nomJour(jour)}の ${cadre.carte.nom}` });
        return;
      }
      const nom = heure !== null ? `${nomJour(jour)}の ${heureLue(heure)}` : `${nomJour(jour)}`;
      surFin({
        date: jour, apres: place && place.apres, avant: place && place.avant, debut: heure !== null ? versTexte(heure) : '', texte: nom,
      });
    }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE });
    ok.disabled = !pret;
    contenu.append(el('div', { class: 'choix-pied' }, ok));
    chargerPhotos(contenu);
  }

  // Le moment, la place entre les activités, l'heure (comme pour toute activité).
  function dessinerPlace() {
    contenu.append(el('p', { class: 'cq-label', 'data-lire': 'なんじごろ？', html: html('何時《なんじ》ごろ？') }));
    const moments = el('div', { class: 'cq-chips' });
    momentsPossibles().forEach((p) => {
      const b = el('button', {
        type: 'button', class: `chip${moment === p.id ? ' chip-on' : ''}`, 'aria-pressed': String(moment === p.id), 'aria-label': lu(p.nom),
        html: `<span aria-hidden="true">${p.emoji}</span>${html(p.nom, { mots: false })}`,
      });
      activable(b, () => { moment = p.id; place = null; heure = null; dessiner(); parler(lu(p.nom)); }, { garde: false });
      moments.append(b);
    });
    contenu.append(moments);

    // La place : 「＋ ここ」 entre les activités du moment.
    if (moment) {
      contenu.append(el('p', { class: 'cq-label', 'data-lire': 'どこに いれる？ プラスを おしてね。', html: html('どこに 入《い》れる？ 「＋」を おしてね。') }));
      const liste = el('ol', { class: `places${heure !== null ? ' places-heure' : ''}` });
      const items = activitesDuMoment();
      const caseIci = (p, lire) => {
        const choisie = memePlace(p) && heure === null;
        const li = el('li', { class: 'place-case' });
        const b = el('button', {
          type: 'button', class: `place${choisie ? ' choisie' : ''}`, 'aria-label': lire,
          html: choisie ? '' : `<span aria-hidden="true">＋</span>${html('ここ')}`,
        });
        if (choisie) b.append(fantome());
        activable(b, () => { place = p; heure = null; dessiner(); parler(`${lire}に いれるね。`); }, { garde: false });
        li.append(b);
        return li;
      };
      if (!items.length) {
        // Rien à ce moment-là : avant la première activité d'un moment plus tard (sinon à la fin).
        const ip = PERIODES.findIndex((x) => x.id === moment);
        const ensuite = deroulement(jour).items.find((it) => PERIODES.findIndex((x) => x.id === it.periode) > ip);
        liste.append(caseIci(ensuite ? { avant: ensuite.act.id } : { fin: true }, 'ここ'));
      }
      items.forEach((it, k) => {
        if (k === 0 && it.statut !== 'maintenant') liste.append(caseIci({ avant: it.act.id }, `${nomLu(it.carte)}の まえ`));
        liste.append(el('li', {
          class: `place-act lieu-${it.carte.lieu}`, 'data-lire': `${it.debut !== null ? `${heureLue(it.debut)}、 ` : ''}${nomLu(it.carte)}`,
          html: `<span class="act-heure">${it.debut !== null ? heureHtml(it.debut) : ''}</span>${visuel(it.carte)}<span>${nomHtml(it.carte)}</span>`,
        }));
        liste.append(caseIci({ apres: it.act.id }, `${nomLu(it.carte)}の あと`));
      });
      contenu.append(liste);

      // L'heure, si on veut (par quarts d'heure).
      const ligneHeure = el('div', { class: 'placer-heure' });
      if (heure === null) {
        ligneHeure.append(bouton('時間《じかん》も きめる', () => {
          const p = PERIODES.find((x) => x.id === moment);
          heure = Math.max(p.debut, auj() ? Math.ceil(minutesMaintenant() / 15) * 15 : p.debut);
          place = null;
          dessiner();
          parler(`${heureLue(heure)}。`);
        }, { classe: 'btn', icone: '<i aria-hidden="true">🕐</i>' }));
      } else {
        const changer = (delta) => {
          const min = auj() ? Math.ceil(minutesMaintenant() / 15) * 15 : 0;
          heure = Math.min(23 * 60 + 45, Math.max(min, heure + delta));
          moment = periodeDe(heure).id;
          dessiner();
          parler(heureLue(heure));
        };
        ligneHeure.append(
          bouton('15ふん まえ', () => changer(-15), { classe: 'btn-rond', icone: '<b aria-hidden="true">−</b>' }),
          el('span', { class: 'placer-heure-valeur', 'data-lire': heureLue(heure), html: `${heureHtml(heure)}<small>${heureLue(heure)}</small>` }),
          bouton('15ふん あと', () => changer(15), { classe: 'btn-rond', icone: '<b aria-hidden="true">＋</b>' }),
          bouton('時間《じかん》なし', () => { heure = null; dessiner(); }, { classe: 'btn btn-petit' }),
        );
        ligneHeure.append(el('p', { class: 'p-aide', html: html('時間《じかん》の じゅんばんに 入《はい》るよ。') }));
      }
      contenu.append(ligneHeure);
    }
  }

  dessiner();
  ouvrirFeuille({ titre: 'いつ する？', contenu, classe: 'feuille-haute' });
  parler(`${nomLu(c)}は いつ する？`);
}
