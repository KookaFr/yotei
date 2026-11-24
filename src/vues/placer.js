/* ======================================================================
   「いつ する？」 : où mettre une activité que l'élève ajoute.
   Le jour (きょう, あした…), le moment (あさ, ひる, ごご, よる), puis la liste des activités
   de ce moment avec des cases 「＋ ここ」 entre elles : il touche la place (avant / après).
   S'il sait lire l'heure, il peut aussi fixer l'heure (− / ＋, par quarts d'heure).
   Un loisir (テレビ, ゲーム…) se range d'abord dans un 自由時間 de ce jour-là (「じゆう じかんに いれる？」) ;
   「べつの じかん」 garde le choix de la place (émission à heure fixe, jour sans temps libre).
   ====================================================================== */

import {
  ajouterPersonne, carte, carteDe, estCadreLibre, estLoisir, etat,
} from '../donnees.js';
import {
  affichageHeure, ajouterJours, aujourdhui, cle, JOURS_SEMAINE, minutesMaintenant, versTexte,
} from '../heure.js';
import {
  activitesEntre, deroulement, periodeDe, PERIODES,
} from '../journee.js';
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
  let fin = null;          // minutes : heure de fin (activité longue), ou null
  let dans = null;         // id du 自由時間 choisi (loisir)
  let autre = false;       // 「べつの じかん」 : choisir une place comme pour une autre activité
  let avec = [];           // ids des personnes (「だれと？」)
  let voirAvec = Boolean(carte(idCarte).avecQui);   // obligatoire pour 「だれかと すごす」, sinon sur demande
  let nouvelle = false;    // le petit formulaire 「ほかの 人」
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

  // Les heures rondes, à toucher (une rangée qui défile) : 「ごご 6:00」.
  const puces = (valeur, min, choisir) => {
    const rangee = el('div', { class: 'cq-chips puces-heures' });
    for (let h = Math.ceil(min / 60); h <= 23; h++) {
      const on = Math.floor(valeur / 60) === h;
      const b = el('button', {
        type: 'button', class: `chip${on ? ' chip-on' : ''}`, 'aria-pressed': String(on), 'aria-label': heureLue(h * 60), html: heureHtml(h * 60),
      });
      activable(b, () => choisir(h * 60), { garde: false });
      rangee.append(b);
    }
    return rangee;
  };
  const reglage = (valeur, choisir, lire) => el('div', { class: 'placer-reglage' },
    bouton('15ふん まえ', () => choisir(valeur - 15), { classe: 'btn-rond', icone: '<b aria-hidden="true">−</b>' }),
    el('span', { class: 'placer-heure-valeur', 'data-lire': `${lire} ${heureLue(valeur)}`, html: `${heureHtml(valeur)}<small>${heureLue(valeur)}</small>` }),
    bouton('15ふん あと', () => choisir(valeur + 15), { classe: 'btn-rond', icone: '<b aria-hidden="true">＋</b>' }));

  const fantome = () => el('span', { class: `place-fantome lieu-${c.lieu}`, html: `${visuel(c)}<span>${nomHtml(c)}</span>${heure !== null ? `<small>${heureHtml(heure)}</small>` : ''}` });
  const memePlace = (p) => place && p && ((p.apres && p.apres === place.apres) || (p.avant && p.avant === place.avant) || (p.fin && place.fin));

  function dessiner() {
    contenu.replaceChildren();
    const ce = carteDe({ carte: idCarte, avec });
    contenu.append(el('div', {
      class: `placer-carte lieu-${c.lieu}`,
      html: `${visuel(ce, 'grand')}<span class="placer-nom">${nomHtml(ce)}${!c.avecQui && ce.avec ? `<small class="placer-avec">${html(`${ce.avec.map((x) => x.nom).join('と ')}と`)}</small>` : ''}</span>`,
    }));
    dessinerAvec();

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
    const manqueQui = c.avecQui && !avec.length;
    const pret = !manqueQui && (cadre || (modePlace && (heure !== null || place)));
    const enChiffres = (m) => { const a = affichageHeure(m, reglages.format24); return `${a.moment ? `${a.moment} ` : ''}${a.chiffres}`; };
    let texte = heure !== null ? `${enChiffres(heure)}${fin !== null ? `〜${enChiffres(fin)}` : ''}に 入《い》れる` : (place ? 'ここに 入《い》れる' : 'どこに 入《い》れる？');
    if (cadre) texte = `${cadre.carte.nom}に 入《い》れる`;
    else if (!modePlace) texte = 'どれに 入《い》れる？';
    if (manqueQui) texte = 'だれと？';
    const ok = bouton(texte, () => {
      if (!pret) return;
      fermerFeuille();
      if (cadre) {
        surFin({ date: jour, dans: cadre.act.id, avec, texte: `${nomJour(jour)}の ${cadre.carte.nom}` });
        return;
      }
      const nom = heure !== null ? `${nomJour(jour)}の ${heureLue(heure)}${fin !== null ? `から ${heureLue(fin)}まで` : ''}` : `${nomJour(jour)}`;
      surFin({
        date: jour, apres: place && place.apres, avant: place && place.avant, debut: heure !== null ? versTexte(heure) : '',
        fin: heure !== null && fin !== null ? versTexte(fin) : '', avec, texte: nom,
      });
    }, { classe: 'btn btn-principal btn-large', icone: ICONE_COCHE });
    ok.disabled = !pret;
    contenu.append(el('div', { class: 'choix-pied' }, ok));
    chargerPhotos(contenu);
    centrer();
  }

  // 「だれと？」 : les personnes autour de lui (plusieurs possibles), et 「ほかの 人」 pour écrire un prénom.
  function dessinerAvec() {
    if (!voirAvec) {
      contenu.append(bouton('だれと？', () => { voirAvec = true; dessiner(); parler('だれと する？'); }, { classe: 'btn btn-petit placer-qui', icone: '<i aria-hidden="true">👥</i>' }));
      return;
    }
    contenu.append(el('p', { class: 'cq-label', 'data-lire': 'だれと？', html: html('だれと？') }));
    const rangee = el('div', { class: 'personnes' });
    etat.personnes.forEach((p) => {
      const on = avec.includes(p.id);
      const b = el('button', {
        type: 'button', class: `personne${on ? ' choisie' : ''}`, 'aria-pressed': String(on), 'aria-label': lu(p.nom),
        html: `${visuel(p)}<span>${html(p.nom)}</span>`,
      });
      activable(b, () => {
        avec = on ? avec.filter((x) => x !== p.id) : [...avec, p.id];
        dessiner();
        parler(on ? `${lu(p.nom)}は やめる` : `${lu(p.nom)}と`);
      }, { garde: false });
      rangee.append(b);
    });
    const plus = el('button', { type: 'button', class: 'personne personne-plus', 'aria-label': 'ほかの ひと', html: `<b aria-hidden="true">＋</b><span>${html('ほかの 人《ひと》')}</span>` });
    activable(plus, () => { nouvelle = !nouvelle; dessiner(); if (nouvelle) parler('なまえを かいてね。'); }, { garde: false });
    rangee.append(plus);
    contenu.append(rangee);
    if (nouvelle) {
      // Écrire un prénom (et choisir une image) : il est gardé dans la liste pour la prochaine fois.
      const form = el('div', { class: 'personne-form' });
      const champ = el('input', { type: 'text', class: 'personne-nom', placeholder: 'なまえ', maxlength: '20', 'aria-label': 'なまえ' });
      let emoji = '🙂';
      const emojis = el('div', { class: 'personne-emojis' });
      ['🙂', '👦', '👧', '🧒', '👨', '👩', '👴', '👵', '🧑‍🏫', '🐶'].forEach((e) => {
        const b = el('button', { type: 'button', class: `chip${e === emoji ? ' chip-on' : ''}`, 'aria-label': e, html: `<i aria-hidden="true">${e}</i>` });
        b.addEventListener('click', () => { emoji = e; emojis.querySelectorAll('.chip').forEach((x) => x.classList.toggle('chip-on', x === b)); });
        emojis.append(b);
      });
      const ok = bouton('いれる', () => {
        const nom = champ.value.trim();
        if (!nom) { champ.focus(); return; }
        const id = ajouterPersonne(nom, emoji);
        avec = [...avec, id];
        nouvelle = false;
        dessiner();
        parler(`${nom}と`);
      }, { classe: 'btn btn-principal btn-petit', icone: ICONE_COCHE });
      form.append(champ, emojis, ok);
      contenu.append(form);
      setTimeout(() => champ.focus(), 50);
    }
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
      activable(b, () => { moment = p.id; place = null; heure = null; fin = null; dessiner(); parler(lu(p.nom)); }, { garde: false });
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
        activable(b, () => { place = p; heure = null; fin = null; dessiner(); parler(`${lire}に いれるね。`); }, { garde: false });
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

      // L'heure, si on veut : des heures rondes à toucher (− / ＋ pour les quarts d'heure). Puis, si on veut, la fin
      // (activité longue : パパと すごす 10:00〜18:00 ; ce qui était prévu pendant ce temps est remplacé).
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
        const minDebut = auj() ? Math.ceil(minutesMaintenant() / 15) * 15 : 6 * 60;
        const changerDebut = (m) => {
          heure = Math.min(23 * 60 + 30, Math.max(minDebut, m));
          moment = periodeDe(heure).id;
          if (fin !== null && fin <= heure) fin = Math.min(23 * 60 + 45, heure + 60);
          dessiner();
          parler(heureLue(heure));
        };
        ligneHeure.append(
          el('p', { class: 'cq-label', 'data-lire': 'はじまり', html: html('はじまり') }),
          puces(heure, minDebut, changerDebut),
          reglage(heure, changerDebut, 'はじまり'),
          bouton('時間《じかん》なし', () => { heure = null; fin = null; dessiner(); }, { classe: 'btn btn-petit' }),
        );
        if (fin === null) {
          ligneHeure.append(bouton('おわりの 時間《じかん》も きめる', () => {
            fin = Math.min(23 * 60 + 45, heure + 60);
            dessiner();
            parler(`${heureLue(fin)}まで。`);
          }, { classe: 'btn placer-fin', icone: '<i aria-hidden="true">🏁</i>' }));
        } else {
          const changerFin = (m) => {
            fin = Math.min(23 * 60 + 45, Math.max(heure + 15, m));
            dessiner();
            parler(`${heureLue(fin)}まで。`);
          };
          ligneHeure.append(
            el('p', { class: 'cq-label', 'data-lire': 'おわり', html: html('おわり') }),
            puces(fin, heure + 15, changerFin),
            reglage(fin, changerFin, 'おわり'),
            bouton('おわり なし', () => { fin = null; dessiner(); }, { classe: 'btn btn-petit' }),
          );
          // Ce qui était prévu pendant ce temps : remplacé.
          const remplaces = activitesEntre(deroulement(jour).items, heure, fin);
          if (remplaces.length) {
            const boite = el('div', { class: 'placer-remplace', 'data-lire': `この あいだの よていは なくなるよ。 ${remplaces.map((it) => nomLu(it.carte)).join('、 ')}` });
            boite.append(el('p', { html: html('この あいだの 予定《よてい》は なくなるよ：') }));
            const ul = el('ul', {});
            remplaces.forEach((it) => ul.append(el('li', { class: `lieu-${it.carte.lieu}`, html: `${visuel(it.carte)}<span>${nomHtml(it.carte)}</span>` })));
            boite.append(ul);
            ligneHeure.append(boite);
          }
        }
        ligneHeure.append(el('p', { class: 'p-aide', html: html('時間《じかん》の じゅんばんに 入《はい》るよ。') }));
      }
      contenu.append(ligneHeure);
    }
  }

  // Les heures choisies au milieu de leur rangée.
  const centrer = () => requestAnimationFrame(() => contenu.querySelectorAll('.puces-heures .chip-on').forEach((b) => {
    const r = b.parentElement;
    r.scrollLeft = b.offsetLeft - r.offsetLeft - (r.clientWidth - b.offsetWidth) / 2;
  }));
  dessiner();
  ouvrirFeuille({ titre: 'いつ する？', contenu, classe: 'feuille-haute' });
  parler(`${nomLu(c)}は いつ する？`);
}
