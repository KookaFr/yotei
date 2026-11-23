# よてい — emploi du temps visuel

Application web (PWA) en japonais pour les jeunes avec un retard intellectuel : savoir **ce qu'on fait maintenant, ce qui vient ensuite**, voir la semaine et le mois, suivre les étapes d'une activité, et raconter sa journée le soir avec des photos. Elle fonctionne sur téléphone Android (Samsung) et sur iPad, s'installe sur l'écran d'accueil et marche sans Internet. Aucun compte, aucune donnée envoyée : tout reste sur l'appareil.

Elle fait suite à くらべよう (https://kookafr.github.io/kurabe/) et reprend ses principes : grandes cibles, voix japonaise, toucher un texte pour l'entendre (bouton 👆), garde tactile, police BIZ UDPGothic, hiragana ou kanji avec furigana, espace parents en français ou en japonais.

## Ce que voit l'élève

| Onglet | Contenu |
|---|---|
| **きょう** | L'activité en cours en grand (「いま」), la suivante (「つぎ」), puis 「これからの よてい」, regroupé par moment de la journée (朝 6じ〜, 昼 10じ〜, 午後 2じ〜, 夜 6じ〜). Ce qui est fini est rangé dessous, replié : 「おわった こと」. Le bouton 「おわった」 coche l'activité, puis propose une photo pour la ふりかえり. |
| **こんしゅう** | La semaine, du plus simple au plus détaillé. 「かんたん」 : pour chaque jour, une barre des lieux de 6 h à 22 h (maison orange, école bleu, dehors vert), la même échelle pour tous les jours, et dessous seulement ce qu'il ne faut pas oublier (jour férié, événements, activités importantes ou inhabituelles). Toucher un lieu montre ses activités, toucher le jour ouvre son programme. 「くわしく」 ajoute les images de chaque moment. |
| **こんげつ** | Le calendrier du mois : dimanche et jours fériés en rouge, samedi en bleu ; les événements ; 「あと 3にち」 pour les prochains. |
| **てじゅん** | Les étapes d'une activité, une seule à la fois, avec la frise et un « bravo » à la fin (朝の したく, 手を 洗う, 明日の 準備…). |
| **ふりかえり** | Le soir : chaque activité faite, avec sa photo, l'heure, une phrase au passé (「作業を しました。」) et 「どうだった？」 (楽しかった, ふつう, つかれた, いやだった). À la fin, 「おくる」 fait une image de la journée à envoyer à la famille (LINE, e-mail). |

**L'heure, de trois façons** (on ne suppose pas qu'il sait la lire ; les parents peuvent en masquer) :
- une horloge à aiguilles avec une part rouge jusqu'à la fin, et la phrase de la classe : 「ながい はりが 8に きたら おわり」 ;
- l'heure en chiffres avec sa lecture en hiragana (「ごぜん じゅうじ にじゅうごふん」, 「あと 15ふん」) ;
- une barre qui diminue.

**Couleurs par lieu** : école en bleu, maison en orange, dehors en vert, partout (liste, semaine, image partagée).

**Annonces** (appli ouverte) : un carillon et 「〜の じかんだよ」 au début d'une activité, 「あと 5ふんで おわりだよ」 avant la fin.

## Ce que règlent les parents (appui long sur 「おうちの人」)

- **Semaine type (時間割)** : un programme par jour de la semaine, plus un programme « Repos » pour les jours fériés et les vacances. Heure de début, heure de fin facultative (sans fin, l'activité dure jusqu'à la suivante). Copier un jour vers d'autres.
- **Journées modifiées** : changer une seule date (sortie, rendez-vous, stage). Les activités que l'enfant ajoute y apparaissent.
- **Calendrier** : événements (avec « pas d'école »), jours fériés japonais calculés automatiquement, vacances habituelles des écoles de Tokyo en un bouton (à vérifier avec le calendrier de l'école).
- **Étapes** : créer et modifier les てじゅん, avec émoji ou photo pour chaque étape.
- **Cartes et photos** : créer des cartes avec une vraie photo (le bus de l'école, la デイサービス…), ou mettre une photo sur une carte existante ; choisir le lieu, la phrase du soir, les étapes liées, et ne pas proposer de photo (toilettes, bain…).
- **Ce que l'enfant peut changer** : rien, ajouter des activités, ou ajouter et déplacer les activités sans heure. Pour ajouter, il choisit le jour (きょう, あした, …), le moment (つぎ, 朝, 昼, 午後, 夜) et la carte ; le bouton dit ce qui va se passer (「あしたの ごごに いれる」).
- **Activités importantes** : une case sur chaque carte (遠足, 実習, 病院… le sont déjà) ; elles ressortent dans la semaine, comme les activités ajoutées pour une seule date.
- **Sauvegarde** : un fichier `.json` pour passer le même emploi du temps du téléphone à l'iPad (photos des cartes et des étapes comprises).

Le texte japonais s'écrit en hiragana, ou en kanji suivis de leur lecture : `作業《さぎょう》 学習《がくしゅう》`. Un espace entre les mots aide à lire (分かち書き).

## Limites connues

- **Pas d'alarme quand l'appli est fermée** : une page web ne peut pas sonner seule sans serveur. Les annonces marchent quand l'appli est ouverte (option « garder l'écran allumé » pour une tablette posée).
- **Données par appareil** : le téléphone et l'iPad ont chacun leur emploi du temps ; la sauvegarde sert à les recopier. Les photos de la journée restent sur l'appareil où elles ont été prises (gardées 60 jours par défaut).
- L'emploi du temps de départ est un **exemple** à remplacer.

## Organisation

```
index.html, yotei.css, manifest.webmanifest, sw.js (hors ligne, barre « あたらしく する »)
src/app.js         onglets, temps qui passe, annonces, démarrage
src/donnees.js     emploi du temps, calendrier, étapes, cartes, journal (localStorage)
src/catalogue.js   cartes d'activités, étapes et semaine d'exemple
src/heure.js       dates, heures et leur lecture en hiragana, jours fériés japonais
src/journee.js     déroulement d'une journée (fait, passé, いま, つぎ)
src/horloge.js     horloge à aiguilles et barre
src/vues/          jour, semaine, mois, etapes, recit
src/parents.js     espace parents
src/photos.js      photos (IndexedDB), réduction, sauvegarde
```

## Vérifier et publier

```bash
npm run lint
npm test                 # 5 formats × 3 moments de la journée, parcours compris (Playwright)
npm run version-sw 2     # avant chaque mise en ligne
python3 outils/police.py # après avoir ajouté des kanji (pip install fonttools brotli)
```
