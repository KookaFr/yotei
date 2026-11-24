# よてい — emploi du temps visuel

Application web (PWA) en japonais pour les jeunes avec un retard intellectuel : savoir **ce qu'on fait maintenant, ce qui vient ensuite**, voir la semaine et le mois, suivre les étapes d'une activité, et raconter sa journée le soir avec des photos. Elle fonctionne sur téléphone Android (Samsung) et sur iPad, s'installe sur l'écran d'accueil et marche sans Internet. Aucun compte, aucune donnée envoyée : tout reste sur l'appareil.

Elle fait suite à くらべよう (https://kookafr.github.io/kurabe/) et reprend ses principes : grandes cibles, voix japonaise, toucher un texte pour l'entendre (bouton 👆), garde tactile, police BIZ UDPGothic, hiragana ou kanji avec furigana, espace parents en français ou en japonais.

## Ce que voit l'élève

| Onglet | Contenu |
|---|---|
| **きょう** | L'activité en cours en grand (「いま」), la suivante (「つぎ」), puis 「その あとの よてい」 (sans répéter les deux cartes du haut), regroupé par moment de la journée (朝, 昼, 午後, 夜). Ce qui est fini est rangé dessous, replié : 「おわった こと」. Le bouton 「おわった」 coche l'activité, puis propose une photo pour la ふりかえり. |
| **こんしゅう** | La semaine, du plus simple au plus détaillé. 「かんたん」 : pour chaque jour, une barre des lieux de 6 h à 22 h (maison orange, école bleu, dehors vert), la même échelle pour tous les jours (朝, 昼, 午後, 夜 au-dessus), et dessous seulement ce qu'il ne faut pas oublier (jour férié, événements, activités importantes ou inhabituelles). Toucher un lieu montre ses activités, toucher le jour ouvre son programme. 「くわしく」 ajoute les images de chaque moment. |
| **こんげつ** | Le calendrier du mois : dimanche et jours fériés en rouge, samedi en bleu ; les événements ; 「あと 3にち」 pour les prochains. |
| **てじゅん** | Les étapes d'une activité, une seule à la fois, avec la frise et un « bravo » à la fin (朝の したく, 手を 洗う, 明日の 準備…). |
| **ふりかえり** | Le soir : chaque activité faite, avec sa photo, l'heure, une phrase au passé (「作業を しました。」) et 「どうだった？」 (楽しかった, ふつう, つかれた, いやだった). À la fin, 「おくる」 fait une image de la journée à envoyer à la famille (LINE, e-mail). |

**L'heure, de trois façons** (on ne suppose pas qu'il sait la lire ; les parents peuvent en masquer) :
- une horloge à aiguilles avec une part rouge jusqu'à la fin, et la phrase de la classe : 「ながい はりが 8に きたら おわり」 ;
- l'heure en chiffres avec sa lecture en hiragana (「ごぜん じゅうじ にじゅうごふん」, 「あと 15ふん」) ;
- une barre qui diminue.

**「がっこうの ふりかえり」 (retour de l'école)** : le téléphone ne sert pas à l'école, alors on raconte en rentrant. Les jours d'école, une fois le trajet du retour fini, 「きょう」 propose 「がっこうの こと、 おしえて！」 (ou 「あとで」 ; aussi dans 「ふりかえり」). Des questions courtes, une par écran, avec des choix en images et la voix : comment c'était ; ce qu'il a fait le matin, à midi, l'après-midi (les cours prévus, plus 「ほかの こと」) ; ce qu'il a préféré ; s'il y a eu un souci (quand, l'a-t-il dit à l'enseignant) ; ce qu'il rapporte ; un message pour la maison. Les questions de suite rappellent sa réponse d'avant (「😥 こまった こと： あった」 → 「こまった ことや いやな ことが あったのは いつ？」), et la voix lit chaque question. 🎤 : il peut répondre avec sa voix (pourquoi c'était bien, ce qui s'est passé, le message). Les cours choisis sont cochés.

**C'est l'élève qui envoie le compte rendu**, pour en prendre l'habitude : l'appli lui relit ses réponses (「これで いい？」 ; 「なおす」 → la ligne à corriger → la question, puis retour à la relecture), puis 「LINEで おくる」 ouvre LINE avec le texte (en japonais avec kanji, ou en français) : il choisit la conversation et envoie. De retour dans l'appli : 「おくれた？」, puis 「やったね！ 3日 つづけて おくったよ！」. Tant que ce n'est pas envoyé, 「きょう」 le rappelle. Les messages vocaux suivent par le partage du téléphone (「こえも おくる」). Autres choix : e-mail déjà rempli, feuille de partage, ou ne pas envoyer. Pas de serveur : rien ne part sans lui. Les 14 derniers comptes rendus restent dans l'espace parents (texte, voix, envoyé ou non).

**Couleurs par lieu** : école en bleu, maison en orange, dehors en vert, partout (liste, semaine, image partagée).

**「おわった」 vérifie avant de cocher** : une activité qui commence dans plus de 15 minutes ne peut pas être cochée (pas de bouton ; la nuit, 「いまは よる。 ゆっくり やすもう。」). Un cours à l'école (carte 「がっこう」 avec une heure de fin, sauf les trajets 通学 et 下校) ne peut être coché que dans les 5 dernières minutes : la carte dit 「おわりの じかんに なったら チェック できるよ。」 (réglable carte par carte : « heure de fin fixe »). Sinon, une fenêtre montre deux choses :
1. **une réaction au temps mis**, selon la catégorie : pas encore commencée (moins de 15 min avant), très tôt (moins de la moitié du temps), un peu tôt (encore 10 min ou plus), à l'heure, après coup, sans heure de fin. « Tôt » ne vaut que pour une vraie heure de fin ;
2. **une question de vérification** : une des questions de la carte (「歯を ぜんぶ みがいた？」, 「おくの 歯も みがいた？」, 「うがいを した？」…), sinon une question générale, plus insistante quand c'est fini tôt.

**Les loisirs se rangent dans le 自由時間** : le temps libre est le créneau donné par les parents ; ce qu'il y fait, c'est lui qui le choisit. Quand il ajoute テレビ, ゲーム, 動画, 音楽, 散歩, 公園… et que le jour a un 自由時間 (pas encore fini), 「いつ する？」 propose d'abord 「じゆう じかんに いれる？」 avec les 自由時間 du jour (😊 ごご5:00〜6:30, celui en cours déjà choisi) ; 「べつの じかんに する」 garde le choix d'une place ou d'une heure (émission à heure fixe, jour sans temps libre). Le loisir n'a pas d'heure à lui : rien ne bouge dans la journée. On le voit sous le nom dans la liste (「じゆう じかん / 🎮 ゲーム」), dans la carte 「いま」 (📺 テレビ) et dans 「つぎ」. Dans la fenêtre du 自由時間, 「なにを する？」 montre ses choix (✕ pour en enlever) et 「えらぶ」 ouvre la grille des loisirs. Une テレビ déjà mise à côté se range avec 「うごかす」 : sous chaque 自由時間, une case 「📺 じゆう じかんに いれる」. À la fin, la question vient de ses loisirs (「テレビを 消した？」, 「動画を とめた？」), et la ふりかえり dit 「自由時間に テレビを 見ました。」.

**Activités sans heure** (ajoutées par l'élève, ou sans heure dans le programme) : elles reçoivent une heure calculée d'après leur place, et suivent les mêmes règles que les autres (いま / つぎ, pas de 「おわった」 plus de 15 minutes avant). Le temps entre l'activité à heure qui précède et la suivante est partagé : avec la précédente si elle n'a pas d'heure de fin, sinon après sa fin (parts de 5 en 5 minutes, au moins 15 minutes ; 30 minutes après la dernière activité de la journée). Exemple : 晩ごはん 18:30–19:15, puis テレビ sans heure, puis お風呂 19:30 → テレビ ≈ 19:15–19:30, cochable à partir de 19:00. La fenêtre de l'activité affiche 「だいたい 7:15 〜 7:30」 ; la liste, elle, ne montre que les heures fixées.

Le temps libre et les loisirs (自由時間, ゲーム, テレビ, 動画, 散歩, 公園…) ont leurs propres messages : s'arrêter avant la fin n'y est pas « trop vite » (「まだ じかんは あるよ。」 → 「もう おわりに する？」 ; 「まだ」 → 「ゆっくり たのしんでね。」).

Chaque catégorie a sa liste de phrases (`src/messages.js`) ; une phrase est tirée au hasard, jamais deux fois de suite la même, et une phrase dont une variable manque est sautée. Variables : {nom} {debut} {fin} {reste} {duree} {retard}. 「うん」 coche, 「まだ」 ferme avec un encouragement tiré lui aussi d'une liste. Les parents modifient toutes les listes et les questions de chaque carte (une par ligne) ; elles voyagent avec la sauvegarde.

**Annonces** (appli ouverte) : un carillon et 「〜の じかんだよ」 au début d'une activité, 「あと 5ふんで おわりだよ」 avant la fin.

## Ce que règlent les parents (appui long sur 「おうちの人」)

- **Semaine type (時間割)** : un programme par jour de la semaine, plus un programme « Repos » pour les jours fériés et les vacances. Heure de début, heure de fin facultative (sans fin, l'activité dure jusqu'à la suivante). Copier un jour vers d'autres.
- **Journées modifiées** : changer une seule date (sortie, rendez-vous, stage). Les activités que l'enfant ajoute y apparaissent.
- **Calendrier** : événements (avec « pas d'école »), jours fériés japonais calculés automatiquement, vacances habituelles des écoles de Tokyo en un bouton (à vérifier avec le calendrier de l'école).
- **Étapes** : créer et modifier les てじゅん, avec émoji ou photo pour chaque étape.
- **Cartes et photos** : créer des cartes avec une vraie photo (le bus de l'école, la デイサービス…), ou mettre une photo sur une carte existante ; choisir le lieu, la phrase du soir, les étapes liées, et ne pas proposer de photo (toilettes, bain…).
- **Ce que l'enfant peut changer** : rien, ajouter des activités, ou ajouter et déplacer les activités sans heure. Pour ajouter, il choisit d'abord la carte (「なにを いれる？」), puis 「いつ する？」 : le jour (きょう, あした, …), le moment (朝, 昼, 午後, 夜), et la place entre les activités de ce moment (cases 「＋ ここ」, avant ou après chacune) ; s'il sait lire l'heure, il peut aussi la fixer (− / ＋ par quarts d'heure). Pour déplacer une activité sans heure (ou une qu'il a ajoutée), il la touche puis 「うごかす」 : la liste de la journée reste affichée, avec en haut 「テレビを どこに うごかす？」, l'activité encadrée en pointillés et des cases 「＋ ここ」 entre les autres ; il touche la case voulue, l'activité s'y place et brille un instant (「やめる」 annule).
- **もちもの** : sur chaque carte, les affaires à emporter (体育 → 体操服, 体育館シューズ ; プール → 水着 ; 病院 → 保険証, お薬手帳…). Elles apparaissent dans la semaine (🎒), dans 「きょう」 (「きょうの もちもの」 le matin, 「あしたの もちもの」 dès 15 h), dans le détail de l'activité, et deviennent des étapes de 「明日の 準備」 la veille (「体操服を かばんに 入れる」).
- **Temps libre** : une case sur chaque carte, « Créneau de temps libre » (自由時間 l'est déjà) : l'enfant y range ses loisirs au lieu de les mettre avant ou après. Dans « Journées modifiées », ce qu'il a choisi apparaît sous le créneau (✕ pour l'enlever).
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

## Licence

© 2026 KookaFr. Ce logiciel est distribué sous la licence **PolyForm Noncommercial 1.0.0** (texte complet : `LICENSE.md`).

- **Permis, gratuitement** : l'usage personnel et familial ; l'usage par les écoles, associations, organismes publics, de santé ou de recherche, même financés.
- **Permis** : modifier le code et le partager pour un usage non commercial, en gardant cette licence et la ligne « Required Notice ».
- **Interdit sans accord écrit** : tout usage commercial (vente, intégration dans un produit ou un service payant…).
- Les polices BIZ UDPGothic (`polices/`) ne sont pas concernées : elles restent sous licence SIL Open Font License 1.1.

日本語：© 2026 KookaFr。個人・家庭、学校・福祉団体・公的機関などの非営利の利用は無料で自由です（改変・共有も、このライセンスを付ければ可）。営利目的の利用（販売、有料の製品やサービスへの組み込みなど）は、書面の許可なしには禁止します。全文は LICENSE.md（PolyForm Noncommercial 1.0.0）。フォント（BIZ UDPゴシック）は SIL Open Font License 1.1 のままです。
