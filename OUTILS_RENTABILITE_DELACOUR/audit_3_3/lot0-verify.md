# Vérification du lot 0 « plus aucune perte de données » (outil 3.3)

Vérificateur : lecture seule (aucune modification du dépôt, pas de commit, pas de build). Date : 2026-10-06, 18:40 à 19:35.
Dossier de travail : `scratchpad/audit/V0/` (scripts `*.mjs` / `*.ts`, sorties dans `V0/out/`, `V0/out_new/`, `V0/old_out/`). Les « avant » viennent des sorties de l'audit (`scratchpad/audit/M3/*.out`, `M1`, `M5`, `M6`, `M8`).

## 0. Ce qui a été testé, et sur quoi

| Élément | Détail |
|---|---|
| Fichier construit testé | copie de `livrable/pilotage.html` du 18:37 (1 951 948 octets, md5 `f56573e0…`), servie par `python3 -m http.server 8809` (pid 3836, fermé à la fin). Chromium sans interface via playwright-core. |
| Reconstruction du 19:10 | `livrable/pilotage.html` a été reconstruit à 19:10 (1 980 864 octets, md5 `faa5a471…`, lot 1 inclus). Les scripts clés ont été rejoués dessus (`V0/out_new/`) : mêmes résultats (tb_undo, tc_routine, tc2b, e2e_folder, ta_stale, td2, m3_delete, m2_removals, tp2, m6_mergefile, m6_mergefile_race). |
| Scripts du domaine | t1, t2, t4, t5 lancés à 18:39 sur la source vivante (aucun fichier `src` plus récent que le build à ce moment). Ensuite le lot 1 a modifié `maintenanceChecks.ts`, `maintenanceSpares.ts`, `types.ts`, `EqChecksTab.tsx` (et, plus tard, `maintenanceMerge.ts`) : j'ai figé une copie de `src` à 18:48 (`V0/snap/`), dans laquelle j'ai remis `MOVES_KEPT = 200` et `keepMoves = slice(-200)` pour retrouver le comportement du build. Les fichiers de fusion, de magasin et de migration (`maintenanceMerge.ts` 18:29, `flat.ts` 18:21, `migrate.ts` 18:22, `maintenance.ts` 18:36, `folder.ts`, `local.ts`, `StoreContext.tsx`) sont ceux du build. |
| Pas relancé | la suite vitest (le lot 1 modifie la source sous mes pieds : un rouge n'aurait rien prouvé sur le build). Aucun appareil réel. |
| Transitoire constaté | à 18:46-18:48 le lot 1 a laissé `maintenanceSpares.ts` en état cassé quelques minutes (`hoursOf is not defined`, vu en lançant `edge.ts`) ; corrigé depuis. |

Techniques : rejeu des scripts de l'audit adaptés (libellés : « Annuler ce signalement » est devenu une barre « Annuler » de 8 s ; « Reprendre » est devenu « Reprendre les réponses du JJ/MM/AAAA » ; `Retirer ce point`, etc.), scripts neufs, 10 392 mutations de types sur 7 enregistrements (`fuzz_normalize.ts`), tests de propriétés de `mergeEquipment` / `mergeSpare` / `revertEquipment` / `revertSpare` (`merge_props.ts`, 5 graines : 400 puis 4 × 600 itérations, équipement et pièce à chaque itération), scénarios `FolderSession` en mémoire (`folder_scen.ts`, `folder_typed.ts`), deux appareils sur dossier partagé simulé avec la vraie application (`e2e_folder.mjs`, `m3_typed_e2e.mjs`), parcours tactiles de l'audit M2 (`m2/parcours.mjs` : 9 parcours sans erreur).

## 1. Compte des verdicts

42 constats : **31 CORRIGÉ, 6 PARTIEL, 5 NON CORRIGÉ, 0 RÉGRESSION, 0 NON REJOUABLE.**
En plus : 14 nouveaux défauts (4 MAJEUR, 8 MINEUR, 2 CONFORT), section 3. Aucune régression d'un comportement qui marchait.

## 2. Tableau des verdicts

Légende preuve : script → sortie avant (audit) / après (V0).

| Constat | Verdict | Preuve (avant → après) |
|---|---|---|
| **M3-01** photos effacées par le dossier / la fusion | CORRIGÉ | `t1`: 9 références sur 9 devenaient `""` → les 9 gardées (équipement, plaque `~retouche`, point, document, anomalie, panne, rapport, pièce, rangement). `e2e_folder`: « B joined: photo refs 0 (A had 2) » → « 2 (A had 2) », Bob écrit puis Alice recharge : 0 → 2. `tg_backup` : fusion 2 → 2 références. |
| **M3-02** deux personnes, même fiche : un geste perdu | CORRIGÉ (gestes) | `t2 (b)`: inspections 0, stock 1/3 mouvements → 1 routine + 1 anomalie, stock 0 / 4 mouvements. `e2e_folder`: « A 1/3 B 1/3 » → « A 0/4 B 0/4 ». `folder_scen S1` (téléphone de poche, 3 personnes) : routine d'Alice, danger de Carol, arrêt et sortie de Bob toutes présentes. Le contenu tapé reste écrasé entre appareils : voir V-01 et M3-06. |
| **M3-03** tap pendant la lecture du dossier | CORRIGÉ | `e2e_folder (3)`: « right after tap 2/4, once the reading is over 1/3, folder 1/3 » → « 1/5, 1/5, folder 1/5, next reading 1/5 ». `folder_scen S6` (overlayChanges) : stock 0, 4 mouvements, routine d'autrui gardée, suppression locale gardée, nouvelle fiche locale gardée. |
| **M3-04** « Annuler » d'un geste de stock écrase les autres | CORRIGÉ | `tb_undo`: stock 2 / 2 mouvements, commande de P2 perdue → stock 1 / 3 mouvements ; commande de P2 gardée. `m3_undo2 A` : « Armoire comptée » annulée après un comptage ailleurs : toutes les autres pièces reviennent, la pièce comptée ailleurs garde son stock 5 (détail V-10). |
| **M3-05** « Annuler » d'une routine / arrêt / signalement efface la vie | CORRIGÉ | `tc_routine`: anomalies 0 → 1 (celle de P2 reste). `tc2b`: 9 s plus tard 0 routine / 0 arrêt / 0 panne → variante a (< 8 s) : routine 1, arrêt gardé, panne 1, anomalie retirée ; variante b (> 8 s) : plus de bouton. `m3_undo2 B` : arrêt annulé, anomalie d'un autre onglet gardée. |
| **M3-06** fiche ouverte : contenu tapé réécrit | PARTIEL | `ta_stale` / `tm_spare`: « ORIGINAL » / « Armoire de survie, tiroir 2 » → « CHANGE PAR P2 » / « TIROIR CHANGE PAR P2 » (deux onglets : corrigé). Entre appareils, via le dossier, un geste d'un poste périmé écrase encore le contenu tapé : `folder_typed.ts` et `m3_typed_e2e.mjs` (V-01). |
| **M3-07** fusion de fichier remplace les fiches récentes | CORRIGÉ | `tg_backup`: routine faite perdue (inspections 1 → 0, stock 3 → 9, « 2 élément(s) fusionné(s) ») → inspections 1 gardée, message « Rien de repris : 1 fiche(s) du fichier non reprises car déjà présentes et différentes ». `m6_mergefile` : routine du téléphone + danger local + 3 sorties = 1 routine, danger gardé, stock 0, 5 mouvements ; deuxième fusion : « Rien de nouveau ». Mais voir V-02 (concurrence). |
| **M3-08** brouillon de plusieurs jours repris et daté d'aujourd'hui | CORRIGÉ | `th_draft`: « 4 réponses sur 4 » + « Reprendre » direct → « Routine commencée le 19/09/2026 par Karim T. : ancienne », « Recommencer » principal, « Reprendre les réponses du 19/09/2026 » secondaire et avertissement. `stale_draft.ts` : 16 cas (12 h, période précédente, jour, mois, date illisible, changement d'heure) cohérents. Reste : la routine reprise volontairement garde la date d'aujourd'hui sans trace de l'âge des réponses (CONFORT). |
| **M3-09** un enregistrement incomplet bloque l'application | CORRIGÉ | `t5`: 7 plantages sur 9 cas → 9 « ok ». `tl_bad`: « L'application n'a pas pu s'afficher » sur 4 pages → les 4 s'affichent. `m9_incomplete` : 12 formes (équipement `{id}` / `null` / chaîne / sans nom, routine sans `results`, pièce `{id}` / `null` / sans listes, anomalies en objet) : accueil, 3.3, 1.1, Mes tâches sans plantage. Reste la fiche d'erreur racine sans export (V-04) et les trous imbriqués (V-06). |
| **M3-10** données illisibles = application vide, premier geste destructeur | CORRIGÉ | `tp2`: texte tronqué et `null` : bandeau « Les données de ce navigateur n'ont pas pu être lues. Une copie est gardée. », copie sous `DELACOUR_PILOTAGE_V2.corrupt-2026-10-06-HHMM`, téléchargement identique octet pour octet ; après « Voir un exemple » la copie reste (241 020 car.) et la clé principale est neuve ; avant : 397 633 → 397 619 car., tout écrasé sans message. Limites : V-03 (copie non restaurable), V-04, V-05. |
| **M3-11** écriture refusée : « Routine notée » | CORRIGÉ | `te_quota` : écran « Routine notée », 0 routine stockée → écran « Non enregistré : le navigateur est plein. La routine … n'est pas conservée sur cet appareil », barre rouge « Non enregistré » (capture `te_quota.png`). Le bandeau général reste sous la routine, mais la surface de saisie le dit. |
| **M3-12** « Supprimer » dit que rien n'est perdu | CORRIGÉ | `m3_delete`: « Rien d'autre n'est perdu » / pas d'Annuler → « Sont effacés : 5 points, 8 photos, 2 contrôles, 1 document, 2 intervenants. « Annuler » le remet pendant 8 secondes. », barre « Équipement supprimé : … Annuler », l'annulation remet la fiche (5 points) et son lien dans l'armoire. Pièce : « 1 photo, 1 emplacement, 1 fournisseur, 1 équipement servi », annulation OK. |
| **M3-13** équipement neuf non nommé accepte routine / arrêt | CORRIGÉ | `ti_delete 2`: « Rien à signaler » actif → désactivé ; `m3_misc` : « À l'arrêt » désactivé avec la raison dite. |
| **M3-14** deux barres « Annuler » superposées | NON CORRIGÉ | `tb2_bars`: mêmes `y = 840`, `elementFromPoint` renvoie la plus ancienne ; sortie identique avant / après. Une barre née dans un onglet de la fiche disparaît toujours quand on change d'onglet. |
| **M3-15** retrait d'un équipement à l'arrêt laisse la panne ouverte | CORRIGÉ | `t4`: « stoppedSince kept, breakdown still open, reinstated: stopped » → « stoppedSince undefined, open false, reinstated: service ». UI (`m2_removals`) : la fenêtre dit « l'arrêt est clos à la date du retrait, et ses heures comptées » ; panne 05/10 12:40 → 06/10 19:00, 30,3 h. |
| **M3-16** texte tapé à pagehide ; fenêtre « Signaler » en mémoire | PARTIEL | `td3_typed`: « David K. » après pagehide → « Zoé Lenoir » écrit à l'événement. `m3_quickclose` : champ tapé puis fermeture immédiate = écrit. Le brouillon de la fenêtre « Signaler » (photo, nature, gravité, mot) n'est toujours gardé nulle part avant « Signaler » (lecture de `EqReport.tsx`). |
| **M3-17** photo tardive remet un vieux tableau | CORRIGÉ | `tn`: libellé « Pression des pneus » (texte tapé effacé) → « LIBELLE TAPE PENDANT LA PHOTO » gardé (photo décodée après 6,9 s). |
| **M3-18** « Annuler » d'un retrait remet aussi la frappe | CORRIGÉ | `ts`: point 1 « Niveaux… » (frappe défaite) → « LIBELLE MODIFIE APRES LE RETRAIT » gardé, le point retiré revient à sa place. |
| **M3-19** « Nouvelle pièce » écrit une pièce vide | CORRIGÉ | `tk` / `m3_misc`: 13 pièces avant toute frappe, « Pièce sans nom » listée → 12 avant le nom, 13 après le nom, 13 (pas 14) après changement d'outil sans nom, plus de « Pièce sans nom ». |
| **M3-20** `__proto__`, `constructor`, `toString` dans l'adresse | CORRIGÉ | `td_addr`: « Cet outil n'a pas pu s'afficher » sur 7 adresses → 12 adresses (`__proto__`, `constructor`, `toString`, `station:`, `report:`, `spare:`, `…:issues`) : une seule fenêtre « Équipement introuvable » ou « Pièce introuvable », aucune erreur ; `#3.3~eq_unknown` dit aussi « introuvable ». |
| **M3-21** journal noyé | CORRIGÉ | `tj`: 6 réponses = 5 lignes → 1 ligne (regroupement 10 min par personne / fiche / nature). |
| **M3-22** « qui » = anonyme | NON CORRIGÉ | `tm_spare` : mouvement signé `anonyme` avant et après (pas dans le contrat du lot). |
| **M3-23** « Autre chose » fait disparaître la ligne | CORRIGÉ | `tr`: 9 → 8 lignes, focus perdu, cause perdue → 9 lignes, focus gardé, `["Cause extérieure","Autre chose"]` enregistré. |
| **M3-24** équipement supprimé ailleurs revient | NON CORRIGÉ | `td2 (5)` : « back? true » avant et après ; `folder_scen S2` : Bob modifie la fiche supprimée par Alice, elle revient pour tout le monde (avec la vie périmée de Bob). |
| **M3-25** photos retirées gardées pour toujours | NON CORRIGÉ | `tf_photo`: « IDB keys still: 2 (original of the removed photo stays) » avant et après (pas dans le contrat). |
| **M3-26** `equipment|__proto__` change le prototype | CORRIGÉ | `t2 (d)`: « proto polluted? true, name via inherited: X » → « false, undefined, spares ctor own? false ». |
| **M3-27** supprimer un équipement cité ailleurs | CORRIGÉ | `m3_delete`: défaut du bac rouge et action qui citent l'équipement : plus de bouton « Supprimer », « Pas de suppression : 1 défaut du bac rouge cite cet équipement. « Retirer du service » garde l'historique. » |
| **M3-28** aucun plafond sur routines / anomalies / pannes | PARTIEL | `m8_weight.ts` : routines de plus de 24 mois résumées (hebdomadaire sur 5 ans : 261 routines, 105 complètes, 156 résumées, 48 Ko au lieu de 83 Ko, soit 58 %). Quotidien sur 5 ans : 352 Ko par équipement (578 Ko sans résumé), 40 équipements = 14 Mo > 5 Mo : la croissance reste linéaire (100 car. par routine résumée), `ids` et `values` toujours écrits, anomalies et pannes sans plafond. Un résumé ne remplace jamais une copie complète à la fusion : V-09. Avertissement à 80 % présent (voir M8-05). |
| **M3-29** « n réponses sur N », épingle, raison du retrait | NON CORRIGÉ | `m3_misc`: « Routine commencée à 08:00 par Karim T. : 6 réponses sur 4 » ; `m2_removals` : « Remettre en service » efface `retiredNote` (`undefined`) ; placer l'épingle n'a pas d'« Annuler » (lecture de `EqSheet.set`, la masse ne compte que le retrait). |
| **M1-06** retrait d'un équipement à l'arrêt | CORRIGÉ | voir M3-15. |
| **M1-18** enregistrement incomplet fait tomber l'accueil | PARTIEL | Accueil et en-tête gardés (`safeBadge`), 12 formes sans plantage (`m9_incomplete`, build 18:37). Restent : `parts: [null]` fait lever `normalize` (bandeau « illisibles », application vide), `sopId` ou `supplierId` valant `__proto__` plantent 3.3, `label` de contrôle `null` ou ligne d'historique `null` plantent 3.3 et Mes tâches (`m9_incomplete2/3`, `normalize_parts.ts`). |
| **M5-02** mise à niveau masque un « Fait » saisi | CORRIGÉ | `m5/upgrade.ts S3 e` : « lastDoneOf 2025-10-26, nextDue 2026-10-26, state soon » → « 2026-10-05, 2027-10-05, ok », historique `2026-10-05, 2025-10-26, 2024-10-26`, deuxième `normalize` identique. |
| **M5-05** `normalize` lève, `loadLocal` avale | CORRIGÉ (3.3) | `fuzz_normalize.ts` : 10 392 mutations de types (équipements et pièces) : 0 exception de `normalize` (avant : plantage sur routine sans `results`). `loadLocal` ne répond plus « aucune donnée » : copie gardée + bandeau. Hors 3.3, `normalize` lève encore pour contacts, réclamations, fournisseurs, fiches de débit, réceptions abîmés (`fuzz_collections.ts`) : V-06. |
| **M5-06** `cp<index>` en double | CORRIGÉ | `m5/edge.ts E2` : « cp0,cp2,cp3,cp4,cp4 » → « cp0,cp2,cp3,cp4,pt_… », résultat du nouveau point `undefined`. |
| **M6-01** adresse piégée plante 3.3 / 5.1 | CORRIGÉ | `td_addr` + `m6_bacrouge`: `#5.1~new:equipment:constructor`, `…:__proto__`, `…:toString`, `new:sop:…` n'ouvrent plus de fiche « Object » ; `new:equipment:eq_demo_cnc` ouvre bien. |
| **M6-05** supprimer un équipement cité | CORRIGÉ | voir M3-27 / M3-12. |
| **M6-13** fusion de fichier : la vie écrite entre-temps disparaît | CORRIGÉ | `s5.out` : « MERGED inspections 12 anomalies 1 (danger kept? false) stock 1 » → `m6_mergefile` : routine du téléphone + danger du poste + 3 sorties conservés (voir M3-07). Concurrence : V-02. |
| **M2-06** pas de retour arrière | PARTIEL | `m2_removals`, `m2_removals2` : « Retirer cette routine » (dernière ou du jour : 11 → 10 puis Annuler → 11), « Retirer ce signalement » (3 → 2 → 3), « Retirer cette panne » (1 → 0 → 1), « Retirer la ligne du … » d'un historique de contrôle (4 → 3, `lastDone` recalculé, puis 4) : tous avec `gone` et « Annuler » 8 s. Reste : un contrôle retiré qui avait un historique garde son `checkLife` invisible (V-11). |
| **M8-05** plafond de 5 Mio sans avertissement | PARTIEL | `m8_quota`: bandeau ambre « Le navigateur est plein à 81 % : faire une sauvegarde » à 4 050 000 car., rien à 70 % (avant : bandeau seulement au premier refus). Compaction partielle (M3-28). |
| **M8-06** jauge « 0 Mo utilisés » à 99,99 % | CORRIGÉ | `m8_quota`: « 0 Mo utilisés sur 2 521 Mo » → « Données de l'application : 5 239 000 caractères sur 5 000 000 (100 %) : le navigateur va refuser d'enregistrer », barre rouge dès 80 %. Le bandeau peut afficher « 105 % » (non borné). |
| **M9-18** adresses `constructor` / `__proto__` | CORRIGÉ | voir M3-20. |
| **M9-19** équipement sans `name` / `operator` | CORRIGÉ | `fuzz_normalize`, `m9_incomplete`: accueil et Mes tâches sans plantage. |

## 3. Nouveaux défauts trouvés

Gravité sur l'échelle de l'audit. Effort S (< 1 h), M (< 1 j).

**V-01 [MAJEUR · M] Le contenu tapé d'une fiche est écrasé, entre appareils, par le moindre geste d'un poste dont la base est périmée.**
Preuve : `V0/folder_typed.ts` (vraie `FolderSession`) : Alice change titulaire, emplacement et ajoute une consigne ; Bob (base d'avant) note une routine et sort une pièce ; après lecture : routine et sortie de Bob présentes, `operator` = « Julien P. » (ancien), `location` = « Atelier principal » (ancien), consigne d'Alice absente, rangement de la pièce ancien. Même résultat avec la vraie application et deux navigateurs (`V0/m3_typed_e2e.mjs`) : « A after reload: location = "Cour, devant le quai" » après que le téléphone de Bob a noté « Rien à signaler ».
Cause : `mergeEquipment` / `mergeSpare` prennent le contenu tapé de la version la plus récente, et un geste écrit la fiche entière de l'appareil (`FolderSession.save` écrit les clés dont la valeur diffère de la base, donc toute la fiche). Le correctif 1.6 (clés tapées seulement) ne joue qu'à l'intérieur d'un navigateur.
Correction : à l'écriture d'une clé `equipment|` / `spare|`, relire les autres versions, replier, puis ne poser par-dessus que les champs tapés qui ont changé par rapport à la base de cet appareil (fusion à trois, champ par champ) ; à défaut, écrire les champs tapés sous leur propre clé.

**V-02 [MAJEUR · S] « Fusionner un fichier de saisies » applique un état calculé à partir du rendu : ce qui a changé ailleurs pendant la question est écrasé, puis publié.**
Preuve : `V0/m6_mergefile_race.mjs` : pendant que la question « Ajouter 0 fiche(s) … » est ouverte, un autre onglet écrit un danger et une action ; après la fusion : « anomaly … still there? false », « action of the other tab? false ». Sur un poste branché au dossier, le retour de focus du sélecteur de fichier déclenche `loadFromFolder` pendant `unpackPhotos` : même mécanique, et la version ancienne est ensuite écrite dans le dossier.
Cause : `SettingsData.mergeJson` calcule `mine = flatten(state)` (état du rendu), puis `update(d => Object.assign(d, next, …))` remplace tout `d`.
Correction : faire `flatten(d)`, `mergeFile` et `unflatten` à l'intérieur de `update(d => …)`, sur l'état courant.

**V-03 [MAJEUR · S] La « copie gardée » ne peut pas être remise par l'application.**
Preuve : `V0/m3_restore_copy.mjs` : le fichier téléchargé est l'état brut (`settings,timeline,processes,…`) ; « Restaurer une sauvegarde » répond « Ce fichier n'est pas une sauvegarde du tableau de pilotage. » (`importJson` exige `app: 'delacour-pilotage'` et `state.kpis`).
Correction : télécharger `{ app: 'delacour-pilotage', version: 2, state: <texte analysé> }` quand le texte est du JSON valide, et accepter aussi un état brut à l'import.

**V-04 [MAJEUR · S, déclencheur rare] Page blanche, sans message ni bouton, quand le texte stocké est un JSON valide sans structure racine.**
Preuve : `V0/tp2_unreadable.mjs` : `{}`, `[]`, `123`, objet sans `timeline`, `timeline: null` : corps vide, erreur « Cannot read properties of undefined (reading 'start') » (le `StoreProvider` est au-dessus de toute frontière d'erreur) ; `settings: null` : « L'application n'a pas pu s'afficher » avec le seul bouton « Revenir », sans export (`V0/root_boundary.mjs`) ; `timeline: {}` fait planter accueil et 1.1. Aucune donnée perdue, mais aucun chemin de sortie : la seule issue est de vider les données du site.
Correction : dans `loadLocal`, tenir pour illisible tout état dont `settings`, `timeline`, `kpis`, `processes` n'ont pas la bonne forme (même chemin que le texte tronqué) ; ajouter « Télécharger les données brutes » à la fiche d'erreur racine.

**V-05 [MINEUR · S] La copie illisible disparaît de l'écran au rechargement, n'est pas comptée, ne peut pas être supprimée.**
Preuve : `tp2` : « after reload: banner: 0 | copy still stored: 1 » ; `localSize()` ne mesure que `DELACOUR_PILOTAGE_V2`, la copie (jusqu'à plusieurs Mo) consomme le même quota de 5 Mo et « Repartir de zéro » ne la retire pas.
Correction : une ligne « Copie de données illisibles du JJ/MM : Télécharger, Supprimer » dans Réglages > Données, copies comptées dans la jauge.

**V-06 [MINEUR · S] `normalize` lève encore, et des trous imbriqués plantent 3.3 et Mes tâches.**
Preuve : `V0/normalize_parts.ts` : `parts: [null]` (ancien format des pièces par machine) → « Cannot read properties of null (reading 'ref') » dans `migrateParts` (le build affiche le bandeau « illisibles » et une application vide : `m9_incomplete2`). `V0/fuzz_collections.ts` : un enregistrement `null` / `{}` / chaîne dans contacts, réclamations, fournisseurs, fiches de débit, réceptions fait lever `normalize`. `V0/m9_incomplete3.mjs` : `tasks[0].label = null` ou une ligne d'historique de contrôle `null` : 3.3 et Mes tâches plantent (accueil et en-tête tiennent). `sopId` ou `supplierId` valant `__proto__` : 3.3 plante.
Correction : `try/catch` par enregistrement pour toutes les collections de `normalize`, `records()` sur `checkLife[*].history` et `reserves`, `label` par défaut des contrôles, `Object.hasOwn` pour `sopId` / `supplierId` / `riskId`.

**V-07 [MINEUR · S] Les routines fusionnées ne sont pas triées : `lastInspection` peut rendre une routine plus ancienne.**
Preuve : `V0/merge_order.ts` : routine de Bob à 14:00 (copie écrite plus tôt) et d'Alice à 08:00 (copie synchronisée plus tard), même jour → liste `Bob@14:00, Alice@08:00`, `lastInspection` = Alice@08:00. Touche « Dernière routine le … (par …) » et la règle « à surveiller deux fois de suite ».
Correction : trier par `date` puis `at` dans `mergeInspections`.

**V-08 [MINEUR · S] Une décision de retrait est défaite par un geste d'un poste périmé.**
Preuve : `V0/merge_edge.ts` : copie retirée (plus ancienne) + copie avec une routine (plus récente) → `retiredAt` indéfini. `retiredAt` et `retiredNote` sont dans `LIFE_KEYS` mais fusionnés comme du contenu tapé (version la plus récente).
Correction : le retrait le plus récent l'emporte tant qu'aucune remise en service plus récente n'existe (ajouter une date de remise en service).

**V-09 [MINEUR · M] La compaction des routines est défaite par la fusion avec toute copie complète.**
Preuve : `merge_edge.ts` : `merge(résumé, complet)` et `merge(complet, résumé)` gardent les 5 résultats (voulu : un résumé ne remplace jamais une routine complète). En dossier partagé, la fiche lue est de nouveau complète tant qu'un poste garde une ancienne copie complète de cette fiche (par exemple une personne partie) ; le navigateur reçoit donc l'état lourd à chaque lecture. Mesures de poids : M3-28.
Correction : écrire un marqueur `compactedBefore: <date>` et ignorer, à la fusion, les routines complètes plus anciennes.

**V-10 [MINEUR · S] « Annuler » compare par valeur, avec des horodatages à la minute.**
Preuve : `V0/m3_undo2.mjs A` : « Armoire comptée » à 19:02, puis comptage d'une pièce à 19:02 dans un autre onglet, puis Annuler : `countedAt` de cette pièce revient à `2026-09-24` (le stock 5 reste, le mouvement reste, la date du comptage plus récent est effacée).
Correction : comparer sur un identifiant de geste, ou écrire les secondes.

**V-11 [MINEUR · S] Retirer un contrôle qui a un historique laisse son `checkLife` orphelin.**
Preuve : `V0/m2_rmcheck.mjs` : 2 contrôles avec 2 lignes chacun, retrait du premier : `tasks` 1, `checkLife` 2 clés (1 orpheline, invisible). Conséquences : `canDelete` compte « 1 contrôle suivi » que personne ne voit, ses observations non levées sortent des tâches.
Correction : archiver le contrôle (champ `archivedAt`) au lieu de le retirer, ou retirer son `checkLife` avec offre d'« Annuler ».

**V-12 [MINEUR · S] Le détail d'une routine résumée est vide.**
Preuve : `V0/m8_compact_ui.mjs` : routine de 2023 résumée : colonne de « – Pas de réponse » et texte « Routine du 18/09/2023 (Julien P.) » ; le pire résultat `worst` n'est montré nulle part dans le tableau. Aucune erreur.
Correction : afficher `worst` dans le détail et dans la colonne.

**V-13 [CONFORT · S] `FolderSession.load` accepte une version qui n'est pas un enregistrement.**
Preuve : `folder_scen.ts S5` : une entrée `spare|…` de valeur `[1,2]` plus récente est « fusionnée » : la pièce perd son nom. Une chaîne est ignorée correctement.
Correction : ne plier que les versions qui sont des objets non tableaux.

**V-14 [CONFORT · S] Bandeau « plein à 105 % » non borné ; l'avertissement de 80 % est dans la page, sous la routine plein écran et les fenêtres.**
Preuve : `m8_quota` (99,9 % : « plein à 105 % ») ; `te_quota.png`. La personne au poste ne voit l'avertissement qu'en revenant à la liste.
Correction : `Math.min(100, …)` ; reprendre la ligne dans la barre de la routine.

**Heads-up lot 1 (hors lot 0) :** sur le build de 19:10, un contrôle sans `label` fait planter 3.3 et Mes tâches (`m9_incomplete3`, « task without label » : CRASH ; sur le build de 18:37 : ok), parce que la règle « sans date » en cours appelle `label.trim()`. À couvrir par le `label` par défaut de V-06.

## 4. Défauts des correctifs : ce qui a été éprouvé sans trouver de défaut

- Fusion de versions (`merge_props.ts`, 2 800 itérations sur 5 graines) : aucune perte de routine, d'anomalie, de panne, de ligne d'historique, d'observation ni de mouvement ; fusion idempotente ; associative en ensembles d'identifiants et en enregistrement complet pour trois versions ; une anomalie ne recule jamais ; `stoppedSince` cohérent avec la panne ouverte après fusion, retrait et annulation ; un élément dans `gone` ne revient pas (version ancienne comme récente).
  Un seul écart sur 2 800 itérations (pièce, stock 1 au lieu de 0, non associatif), non reproduit en 8 rejeux de la même graine : il vient d'une collision d'identifiants de mouvements tirés dans la même milliseconde (`newId` = heure en base 36 + 4 signes aléatoires), possible seulement dans un test qui crée des centaines de gestes par milliseconde.
- Versions étranges (`merge_edge.ts`) : `null`, `undefined`, chaîne, nombre, tableau, `{}`, tableaux absents ou de mauvais type, `gone` non tableau, éléments `null` : `mergeEquipment` / `mergeSpare` ne lèvent jamais ; seul `revertEquipment(null, …)` lève, jamais appelé sans vérification de l'existence.
- Pièce au plafond de 200 mouvements (temps croissants) : deux répliques de 200 mouvements, 20 + 15 sorties distinctes : stock 70 attendu 70 dans les deux sens, repli à 3 versions 69 attendu 69, annulation après fusion 70. Un équipement sans tableaux fusionne correctement. Fusion de 5 versions de 100 équipements de 700 routines : 323 ms au total.
- Annulations (`merge_props.ts` R1 à R7) : deux fois = identique ; jamais de retrait d'un élément d'un autre geste ; annuler tout de suite redonne la fiche (hors `gone`) ; dans le désordre, l'ordre change le résultat seulement quand un geste a été repris par une autre personne (comportement prudent voulu : un signalement pris en charge n'est pas retiré).
- Dossier : 6 cycles lecture-écriture de 3 postes sans rien changer : fichiers stables (330 114 / 1 018 octets à chaque cycle) ; suppression + écriture sans toucher la fiche : reste supprimée ; entrée illisible (chaîne) ignorée ; `equipment|__proto__` ignoré.
- Brouillon de routine périmé, suppression avec Annuler (équipement, pièce, lien dans l'armoire), quota à 80 %, `mergeFile` (idempotent), `overlayChanges` (tap, suppression, création locales), gestes tactiles de l'audit M2 (`m2/parcours.mjs` P1 à P9), ouverture de l'ancien état enregistré par l'ancien build (9 équipements, 12 pièces, 64 routines, aucune erreur sur 8 outils) : sans anomalie.

## 5. Limites de cette vérification

- Navigateur sans interface, dossier partagé simulé en mémoire : pas d'appareil réel, pas de vraie API File System Access, pas de OneDrive.
- Les scripts du domaine tournent sur la copie figée de 18:48 ; les écarts avec le build sont dans `maintenanceChecks.ts`, `maintenanceSpares.ts`, `types.ts` (lot 1). Les sites de plantage imbriqués de `fuzz_normalize.ts` (52) mêlent donc le lot 0 et des règles du lot 1 ; la liste ferme du build est celle de `m9_incomplete{2,3}.mjs`.
- Non testés : 2.2 (bouton 3.4, hors liste ; sur la copie de 18:48 il ajoute encore 8 contacts, 7 organisations, 14 réceptions et 2 fiches du bac rouge dans une entreprise qui a déjà des fiches mais aucune réception), 2.3 et suivants.

## 6. Où sont les preuves

Scripts : `scratchpad/audit/V0/*.mjs` (navigateur), `*.ts` (domaine, lancés par `cd V0/snap && npx vite-node ../<script>.ts`), sorties `V0/out/*.out` (build 18:37), `V0/out_new/*.out` (build 19:10), captures `V0/te_quota.png`, `V0/tb2_case1.png`. Avant : `scratchpad/audit/M3/*.out`, `M1/p8.out`, `M5/out_upgrade.txt`, `M6/s5.out`, `M8/out/quota.txt`.
